# NeuroTrace — Langflow Pipeline Setup

Internal doc for the team on how the 7-agent biomarker pipeline is wired up in Langflow, and how to reproduce/extend it.

---

## 1. Overview

The pipeline takes a speech transcript and runs it through:

1. **4 parallel domain agents** (Lexical, Semantic, Prosody, Syntax)
2. **1 merge/mapper agent** — combines the 4 outputs into a single normalized JSON (`BiomarkerScores`)
3. **1 report composer agent** — writes a short plain-language cognitive summary from the scores

This mirrors the architecture in the main project README (`langflow.json` in the repo is the exported version of this flow).

```
Chat Input
    │
    ├──▶ Lexical Prompt   ──▶ Lexical LLM   ──┐
    ├──▶ Semantic Prompt  ──▶ Semantic LLM  ──┤
    ├──▶ Prosody Prompt   ──▶ Prosody LLM   ──┼──▶ Merge Prompt ──▶ Mapper LLM ──▶ Report Prompt ──▶ Report LLM ──▶ Chat Output
    └──▶ Syntax Prompt    ──▶ Syntax LLM    ──┘
```

---

## 2. Local Model Provider Setup (Ollama)

We're running local models via Ollama rather than a paid API for development.

**Problem we hit:** Langflow's built-in Assistant / model picker shows Ollama models directly, but the backend provider registry doesn't recognize `"Ollama"` as a provider name — this throws `Unknown provider: Ollama`.

**Fix:** Register Ollama as an **OpenAI Compatible** provider instead (Ollama exposes an OpenAI-compatible API).

1. Settings → **Model Providers** → Add **OpenAI Compatible**
   - Base URL: `http://localhost:11434/v1`
   - API Key: leave blank
2. If it fails to save/connect, Langflow's SSRF protection is blocking localhost. Set this env var and restart Langflow:
   ```bash
   export LANGFLOW_SSRF_ALLOWED_HOSTS=localhost,127.0.0.1
   ```
3. Once saved, Langflow should auto-discover local models (`llama3.2:3b`, `qwen2.5:1.5b`, etc.) under the OpenAI Compatible provider — use those in your Language Model nodes, not any raw "Ollama" entry.

**Note:** if you don't have permission to add providers (org/shared instance), skip the global registry and instead set the base URL directly on each **Language Model** component's fields.

---

## 3. Building the Flow in the Canvas

Starting from a basic working chain (`Chat Input → Prompt Template → Language Model → Chat Output`):

1. **Duplicate the Prompt Template + Language Model pair 4×** (copy/paste in canvas). Connect the same `Chat Input` output to all 4 Prompt Templates — one output can fan out to multiple nodes.
2. **Edit each Prompt Template** with the domain-specific prompt (see Section 4).
3. **Add a Merge Prompt Template** with 4 variables (`{lexical}`, `{semantic}`, `{prosody}`, `{syntax}`) — Langflow auto-generates an input handle per variable. Connect each domain agent's LLM output to the matching handle.
4. **Add the Mapper LLM** downstream of the merge prompt — instructed to output strict JSON (`BiomarkerScores` schema).
5. **Add the Report Composer** (Prompt Template + LLM) downstream of the mapper, using `{scores}` as its variable.
6. **Wire the final LLM output into `Chat Output`.** Optionally add a second `Chat Output` connected directly to the Mapper LLM if you also want to see raw JSON scores.
7. **Test with a short (1–2 sentence) transcript first.** With a local 3B model this pipeline involves 6 LLM calls (4 parallel + 2 sequential) — expect 10–40s per call depending on hardware.

---

## 4. Agent Prompts

### Lexical Agent
```
You are a linguistic analyst. Analyze the transcript below for lexical biomarkers only.

Report:
- Type-token ratio (vocabulary diversity): low/medium/high, with brief reasoning
- Lexical density (content words vs. total words): low/medium/high
- Filler word rate (um, uh, like, you know): count and rate

End with a single line: "Lexical overall: X.XX" where X.XX is your estimate from 0.00 (severe impairment) to 1.00 (no concern).

Transcript: {input}
```

### Semantic Agent
```
You are a linguistic analyst. Analyze the transcript below for semantic biomarkers only.

Report:
- Coherence between sentences/ideas: low/medium/high
- Idea density (information per clause): low/medium/high
- Tangentiality (off-topic drift): none/mild/severe

End with a single line: "Semantic overall: X.XX" where X.XX is your estimate from 0.00 (severe impairment) to 1.00 (no concern).

Transcript: {input}
```

### Prosody Agent
```
You are a speech analyst. Analyze the transcript below for prosodic biomarkers only, based on the text and any pause/timing information given.

Report:
- Estimated speech rate: slow/normal/fast
- Pause frequency: low/medium/high
- Hesitation ratio (false starts, restarts, repeated words): low/medium/high

End with a single line: "Prosody overall: X.XX" where X.XX is your estimate from 0.00 (severe impairment) to 1.00 (no concern).

Transcript: {input}
```

### Syntax Agent
```
You are a linguistic analyst. Analyze the transcript below for syntactic biomarkers only.

Report:
- Mean length of utterance: short/medium/long
- Clause depth / sentence complexity: low/medium/high
- Passive voice ratio: low/medium/high

End with a single line: "Syntax overall: X.XX" where X.XX is your estimate from 0.00 (severe impairment) to 1.00 (no concern).

Transcript: {input}
```

### Merge / Biomarker Mapper
```
You will receive four domain analyses. Convert them into a single JSON object and output ONLY the JSON — no prose, no markdown fences, no explanation before or after.

Schema:
{
  "lexical": {"overall": 0.0},
  "semantic": {"overall": 0.0},
  "prosody": {"overall": 0.0},
  "syntax": {"overall": 0.0},
  "affective": {"overall": 0.0}
}

Extract the "overall" score each analysis already stated. For affective, estimate 0.0-1.0 based on emotional tone/valence implied across all four analyses (default 0.7 if no signal).

Lexical analysis: {lexical}

Semantic analysis: {semantic}

Prosody analysis: {prosody}

Syntax analysis: {syntax}
```

### Report Composer
```
You are writing a short cognitive-communication summary for a non-clinical audience (e.g. a family member or general user), based on the JSON scores below.

Rules:
- Plain language, no jargon
- 3-5 sentences total
- Mention which domain(s) scored lowest and what that domain generally relates to (vocabulary, coherence, speech rhythm, sentence structure)
- End with: "This is not a medical diagnosis. Consult a healthcare professional for clinical evaluation."

Scores: {scores}
```

---

## 5. Known Limitations / Watch-outs

- **JSON reliability:** llama3.2:3b / qwen2.5:1.5b often don't strictly follow "output only JSON" instructions. If the Mapper agent's output breaks downstream parsing, either:
  - Swap just that node to an API model (Claude/OpenAI) — cheap since it's a single small call, or
  - Look for a **Structured Output** component in Langflow's sidebar for that node instead of a raw Prompt+LLM pair.
- **Speed:** 6 LLM calls per run (4 parallel + 2 sequential) is slow on local hardware. Fine for demo-length transcripts, not for long recordings during dev/testing.
- **This flow is a stand-in for the real NLP sidecar.** Per the project README's "what's next," the long-term plan is to replace these LLM-based domain agents with actual computed features from spaCy + sentence-transformers, and only use an LLM for the final report composition step.
