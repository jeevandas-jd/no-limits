import asyncio
import os
import json
import httpx
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = FastAPI(title="NeuroTrace Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

LANGFLOW_API_URL = os.getenv("LANGFLOW_API_URL", "http://localhost:7860")
_FLOW_ID_RAW = os.getenv("LANGFLOW_FLOW_ID", "")
LANGFLOW_API_KEY = os.getenv("LANGFLOW_API_KEY", "")

# Strip any leading path so LANGFLOW_FLOW_ID can be either
# "284e7b53-..." or "/api/v1/run/284e7b53-..."
LANGFLOW_FLOW_ID = _FLOW_ID_RAW.split("/")[-1] if _FLOW_ID_RAW else ""

# Haiku analysis agents + Sonnet report composer + PubMed lookups
LANGFLOW_TIMEOUT = float(os.getenv("LANGFLOW_TIMEOUT", "300"))


def _langflow_url() -> str:
    return f"{LANGFLOW_API_URL}/api/v1/run/{LANGFLOW_FLOW_ID}"


def _langflow_headers() -> dict:
    h = {"Content-Type": "application/json"}
    if LANGFLOW_API_KEY:
        h["x-api-key"] = LANGFLOW_API_KEY
    return h


# Maps brain region name fragments → BiomarkerScores domain key
_REGION_TO_DOMAIN: dict[str, str] = {
    "broca":    "lexical",
    "wernicke": "semantic",
    "sma":      "prosody",
    "dlpfc":    "syntax",
    "amygdala": "affective",
}

# Biomarker mapper "agent" field → BiomarkerScores domain key
_AGENT_TO_DOMAIN: dict[str, str] = {
    "lexical":   "lexical",
    "semantic":  "semantic",
    "prosody":   "prosody",
    "syntax":    "syntax",
    "sentiment": "affective",
    "affective": "affective",
}

_DOMAIN_SUB_KEYS: dict[str, list[str]] = {
    "lexical":   ["ttr", "density", "filler_rate", "overall"],
    "semantic":  ["coherence", "idea_density", "tangentiality", "overall"],
    "prosody":   ["speech_rate", "pause_freq", "hesitation", "overall"],
    "syntax":    ["mlu", "clause_depth", "passive_ratio", "overall"],
    "affective": ["valence", "arousal", "certainty", "overall"],
}


def _build_domain_scores(activation: float, domain: str) -> dict[str, float]:
    """Expand a single activation value into a full domain sub-object."""
    keys = _DOMAIN_SUB_KEYS.get(domain, ["overall"])
    return {k: round(activation, 4) for k in keys}


def _fallback_scores() -> dict:
    """Return neutral mid-range BiomarkerScores when pipeline produces nothing."""
    return {
        domain: _build_domain_scores(0.5, domain)
        for domain in _DOMAIN_SUB_KEYS
    }



def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` fences."""
    t = text.strip()
    if not t.startswith("```"):
        return t
    lines = t.split("\n")
    if lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines)


def _scores_from_highlights(highlights: list) -> dict:
    """Build full BiomarkerScores from report highlights array."""
    synth: dict[str, float] = {}
    for h in highlights:
        rname = h.get("region", "").lower()
        for fragment, domain in _REGION_TO_DOMAIN.items():
            if fragment in rname:
                synth[domain] = float(h.get("activation", 0.5))
                break
    if not synth:
        return {}
    return {
        domain: _build_domain_scores(synth.get(domain, 0.5), domain)
        for domain in _DOMAIN_SUB_KEYS
    }


def _scores_from_regions(regions: list) -> dict:
    """Build full BiomarkerScores from biomarker mapper regions array."""
    synth: dict[str, float] = {}
    for r in regions:
        agent_key = r.get("agent", "").lower()
        domain = _AGENT_TO_DOMAIN.get(agent_key, "")
        if domain:
            synth[domain] = float(r.get("activation", 0.5))
    if not synth:
        return {}
    return {
        domain: _build_domain_scores(synth.get(domain, 0.5), domain)
        for domain in _DOMAIN_SUB_KEYS
    }


def _try_parse_json_blob(text: str) -> Optional[dict]:
    """Attempt to parse JSON, including text with markdown fences."""
    if not text:
        return None
    try:
        return json.loads(_strip_markdown_fences(text))
    except (json.JSONDecodeError, ValueError):
        pass
    # Try to find a JSON object anywhere in the text
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except (json.JSONDecodeError, ValueError):
            pass
    return None


def _extract_text_and_scores(
    data: dict,
) -> tuple[str, Optional[dict], Optional[dict]]:
    """
    Pull message text, BiomarkerScores, and full report out of a Langflow response.

    Walks ALL outputs (not just outputs[0][0]) so it catches whichever node
    the pipeline actually routes to ChatOutput.  Falls back gracefully at
    every level — never raises.
    """
    message_text = ""
    scores: Optional[dict] = None
    report: Optional[dict] = None

    try:
        # Collect every candidate message text from the output tree
        candidates: list[str] = []
        for top_out in data.get("outputs", []):
            for inner_out in top_out.get("outputs", []):
                results = inner_out.get("results", {})
                msg = results.get("message", {})
                if isinstance(msg, dict):
                    t = msg.get("text", "")
                elif isinstance(msg, str):
                    t = msg
                else:
                    t = ""
                if t:
                    candidates.append(t)
                # Also check artifacts
                artifacts = inner_out.get("artifacts", {})
                if isinstance(artifacts, dict):
                    if "scores" in artifacts and scores is None:
                        scores = artifacts["scores"]
                    if "report" in artifacts and report is None:
                        report = artifacts["report"]

        # Prefer the longest text (likely the report composer output)
        if candidates:
            message_text = max(candidates, key=len)

        # Try to parse JSON from each candidate — stop at first win
        for cand in sorted(candidates, key=len, reverse=True):
            parsed = _try_parse_json_blob(cand)
            if not isinstance(parsed, dict):
                continue

            # Report composer output: {"report": {...}}
            if "report" in parsed and report is None:
                report = parsed["report"]
                if scores is None:
                    highlights = report.get("highlights", [])
                    if highlights:
                        scores = _scores_from_highlights(highlights)

            # Biomarker mapper output: {"regions": [...]}
            if "regions" in parsed and scores is None:
                scores = _scores_from_regions(parsed["regions"])

            # Direct BiomarkerScores structure
            if scores is None and any(
                k in parsed for k in ("lexical", "semantic", "prosody", "syntax", "affective")
            ):
                scores = parsed

            if scores is not None and report is not None:
                break

    except Exception:
        pass

    # Always return a valid scores object — never leave the frontend with null
    if scores is None:
        scores = _fallback_scores()

    return message_text, scores, report


# ── Request models ────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    input_value: Optional[str] = None
    transcript: Optional[str] = None
    pause_map: Optional[list[float]] = None
    session_id: Optional[str] = None


class LangFlowRequest(BaseModel):
    input_value: str
    session_id: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

AGENT_STEPS = [
    "STT preprocessor",
    "Lexical agent",
    "Semantic agent",
    "Prosody agent",
    "Syntax agent",
    "Biomarker mapper",
    "Report composer",
]


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    message = req.input_value or req.transcript or ""
    if not message:
        raise HTTPException(status_code=400, detail="No input provided")

    if not LANGFLOW_FLOW_ID:
        raise HTTPException(status_code=500, detail="LANGFLOW_FLOW_ID not configured")

    payload: dict = {
        "input_value": message,
        "output_type": "chat",
        "input_type": "chat",
        "stream": False,
    }
    if req.session_id:
        payload["session_id"] = req.session_id
    if req.pause_map:
        payload["tweaks"] = {"pause_map": req.pause_map}

    async def generate():
        # ── 1. Emit initial step status ───────────────────────────────────────
        for i, step in enumerate(AGENT_STEPS):
            status = "running" if i == 0 else "pending"
            yield json.dumps({"type": "step", "step": {"name": step, "status": status}}).encode() + b"\n"

        # ── 2. Fire the Langflow call in a background task ────────────────────
        loop = asyncio.get_event_loop()
        langflow_task = loop.create_task(_call_langflow_async(payload))

        # ── 3. Simulate per-agent progress while waiting ──────────────────────
        # Fixed 2 s between steps regardless of total timeout — pure visual pacing
        step_delay = 2.0
        for i in range(1, len(AGENT_STEPS)):
            try:
                await asyncio.wait_for(asyncio.shield(langflow_task), timeout=step_delay)
                break
            except asyncio.TimeoutError:
                pass
            if langflow_task.done():
                break
            yield json.dumps({"type": "step", "step": {"name": AGENT_STEPS[i - 1], "status": "done"}}).encode() + b"\n"
            yield json.dumps({"type": "step", "step": {"name": AGENT_STEPS[i], "status": "running"}}).encode() + b"\n"

        # ── 4. Await result and emit end / error ──────────────────────────────
        try:
            resp_data, error = await langflow_task
        except Exception as exc:
            yield json.dumps({"type": "error", "message": str(exc)}).encode() + b"\n"
            return

        if error:
            yield json.dumps({"type": "error", "message": error}).encode() + b"\n"
            return

        # Mark all steps done
        for step in AGENT_STEPS:
            yield json.dumps({"type": "step", "step": {"name": step, "status": "done"}}).encode() + b"\n"

        message_text, scores, report = _extract_text_and_scores(resp_data)
        session_id = resp_data.get("session_id") or req.session_id or str(uuid.uuid4())

        yield json.dumps({
            "type": "end",
            "message": message_text,
            "scores": scores,
            "report": report,
            "session_id": session_id,
        }).encode() + b"\n"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _call_langflow_async(payload: dict) -> tuple[dict, Optional[str]]:
    """Returns (response_data, error_message). One of them will be None."""
    async with httpx.AsyncClient(timeout=LANGFLOW_TIMEOUT) as client:
        resp = await client.post(_langflow_url(), json=payload, headers=_langflow_headers())
        if resp.status_code >= 400:
            return {}, f"Langflow error {resp.status_code}: {resp.text[:500]}"
        return resp.json(), None


@app.post("/langflow-test")
async def langflow_test(req: LangFlowRequest):
    """Simple non-streaming endpoint for testing the Langflow connection."""
    if not LANGFLOW_FLOW_ID:
        raise HTTPException(status_code=500, detail="LANGFLOW_FLOW_ID not configured")

    payload = {
        "output_type": "chat",
        "input_type": "chat",
        "input_value": req.input_value,
        "session_id": req.session_id or str(uuid.uuid4()),
    }

    try:
        async with httpx.AsyncClient(timeout=LANGFLOW_TIMEOUT) as client:
            resp = await client.post(_langflow_url(), json=payload, headers=_langflow_headers())
            resp.raise_for_status()
            data = resp.json()
            message_text, scores, report = _extract_text_and_scores(data)
            return {
                "response": message_text,
                "scores": scores,
                "report": report,
                "raw": data,
            }
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
