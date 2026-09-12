import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
// openai/gpt-oss-20b is fast, free-tier friendly, and reliable at
// following the "JSON only" instruction — unlike some free reasoning
// models that print their chain-of-thought before the JSON.
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// Debug: confirms the key loaded from .env without printing the full secret.
const keyPreview = GROQ_API_KEY
  ? `${GROQ_API_KEY.slice(0, 10)}... (length ${GROQ_API_KEY.length})`
  : "MISSING — .env not loaded or GROQ_API_KEY not set";
console.log("Loaded Groq key:", keyPreview);
console.log("Using model:", MODEL);

// The "Understand" step. This prompt is the core of the AI implementation:
// it does NOT answer the trading question — it only structures it, and it
// is explicitly told to flag anything it can't safely infer rather than
// invent a value. That flag is what drives the CLARIFY step on the frontend.
const SYSTEM_PROMPT = `You are the parsing engine inside an AI-native trading research platform.
Your ONLY job: read a natural-language trading question and convert it into a structured experiment definition. You do NOT answer the trading question itself, and you do NOT run any analysis.

Return ONLY valid JSON (no markdown fences, no prose) matching exactly this shape:

{
  "summary": "one plain-language sentence restating what the user is trying to find out",
  "instrument": { "value": string|null, "note": string },
  "timeframe": { "value": string|null, "note": string },
  "entry_condition": { "value": string|null, "note": string },
  "exit_condition": { "value": string|null, "note": string },
  "holding_period": { "value": string|null, "note": string },
  "test_period": { "value": string|null, "note": string },
  "filters": [string],
  "hypothesis_question": string,
  "missing_required": [string]
}

Rules:
- "value" must ONLY be filled if the user's question actually implies it (directly, or via a reasonably standard trading interpretation, e.g. "sharp fall" implying a % drop). If you fill it from an implication rather than an explicit number/word, still put the value, but explain the interpretation in "note" and ALSO add that field's key to "missing_required" (because the exact threshold still needs user confirmation).
- If a required field (instrument, timeframe, entry_condition, exit_condition, holding_period, test_period) cannot be reasonably inferred at all, set "value" to null, put your best-guess suggested default inside "note" (prefixed with "Suggested: "), and add its key to "missing_required".
- "filters" is an array of extra conditions mentioned (e.g. "high volatility") — empty array if none.
- Never silently invent exit_condition or holding_period without flagging them in missing_required — these are almost always missing in real questions.
- Keep every "note" under 20 words.
- Output raw JSON only. Do not wrap it in markdown code fences.`;

app.post("/api/parse-question", async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "A non-empty 'question' string is required." });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is missing on the server." });
  }

  try {
    async function callGroq(withResponseFormat) {
      return fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: question },
          ],
          ...(withResponseFormat ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    }

    let response = await callGroq(true);
    if (!response.ok && response.status === 400) {
      console.warn("Retrying without response_format (model may not support it)");
      response = await callGroq(false);
    }

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Groq error:", response.status, errBody);
      return res.status(response.status).json({ error: `Groq returned ${response.status}: ${errBody}` });
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content || "")
      .replace(/```json|```/g, "")
      .trim();

    console.log("Raw model output:", raw);

    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error("parse-question error:", err.message);
    res.status(500).json({ error: `Failed to parse the question: ${err.message}` });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
