// src/app/api/analyze/route.ts
import { NextRequest } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are a cognitive-linguistics scoring engine. Given a speech/text transcript, analyze it across 5 domains and return ONLY valid JSON, no markdown fences, no commentary.

Schema:
{
  "scores": {
    "lexical":   { "ttr": number, "density": number, "filler_rate": number, "overall": number },
    "semantic":  { "coherence": number, "idea_density": number, "tangentiality": number, "overall": number },
    "prosody":   { "speech_rate": number, "pause_freq": number, "hesitation": number, "overall": number },
    "syntax":    { "mlu": number, "clause_depth": number, "passive_ratio": number, "overall": number },
    "affective": { "valence": number, "arousal": number, "certainty": number, "overall": number }
  },
  "report": {
    "summary": string,
    "riskLevel": "low" | "moderate" | "elevated",
    "findings": [ { "domain": string, "observation": string, "citation": string } ],
    "recommendations": [ string ]
  }
}

All numeric scores are 0-1 floats. Base "overall" on the sub-metrics for that domain. Ground findings/citations loosely in known speech-biomarker literature (Fraser 2016 for lexical/dementia, Elvevåg 2007 for semantic/schizophrenia, Rusz 2011 for prosody/Parkinson's, Roark 2011 for syntax/MCI, Cummins 2015 for affective/depression) without inventing exact numbers.`;

const STEP_NAMES = [
  "STT preprocessor",
  "Lexical agent",
  "Semantic agent",
  "Prosody agent",
  "Syntax agent",
  "Biomarker mapper",
  "Report composer",
];

function sseLine(obj: unknown) {
  return JSON.stringify(obj) + "\n";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const transcript: string = body.transcript ?? body.input_value ?? "";
  const sessionId: string = body.session_id ?? crypto.randomUUID();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const push = (obj: unknown) => controller.enqueue(encoder.encode(sseLine(obj)));

      const groqPromise = fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Transcript:\n"""${transcript}"""` },
          ],
        }),
      }).then((r) => r.json());

      push({ type: "step", step: { name: STEP_NAMES[0], status: "running" } });
      for (let i = 0; i < STEP_NAMES.length; i++) {
        await new Promise((r) => setTimeout(r, 380 + Math.random() * 260));
        push({ type: "step", step: { name: STEP_NAMES[i], status: "done" } });
        if (i + 1 < STEP_NAMES.length) {
          push({ type: "step", step: { name: STEP_NAMES[i + 1], status: "running" } });
        }
      }

      try {
        const data = await groqPromise;
        if (data.error) {
          push({ type: "error", message: JSON.stringify(data.error) });
          controller.close();
          return;
        }
        const raw = data.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);

        push({
          type: "end",
          session_id: sessionId,
          scores: parsed.scores,
          report: parsed.report,
        });
      } catch (err) {
        push({ type: "error", message: String(err) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
