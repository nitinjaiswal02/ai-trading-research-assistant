# AI Trading Research Assistant — Mini Prototype

A small prototype that takes a natural-language trading question and turns it into a
structured, testable experiment — asking the user to confirm anything it can't safely
infer, instead of guessing silently.

**Example:** `"Does buying NIFTY after a 1% fall work better during high-volatility periods?"`
becomes a structured `EXPERIMENT` object (instrument, timeframe, entry, exit, holding period,
filters, test period, hypothesis), with any missing fields surfaced as explicit
confirm-or-edit prompts before the experiment is marked "ready."

## What this does (and deliberately doesn't do)

This builds one slice of the larger vision (`Understand → Structure → Test → Explain → Remember`):
the **Understand** and **Structure** steps, plus the **ambiguity-handling** layer around them.
It does not run a real backtest, store history across sessions, or answer the trading
question itself — that's out of scope per the assignment brief.

## Architecture

```
trading-assistant/
├── client/     React + Vite frontend — input, clarify flow, structured experiment view
└── server/     Express backend — the only thing that talks to the LLM API
```

**Why a separate backend instead of calling the LLM directly from the browser?**
Calling an LLM API straight from client-side code means shipping the API key to every
visitor's browser — a real security problem the moment this is deployed. A thin Express
proxy (`POST /api/parse-question`) keeps the key server-side and gives a single place to
change the extraction prompt, add rate-limiting, or swap providers later, without
touching the UI.

**Flow:**
1. User types a question → `POST /api/parse-question`
2. Server sends it to the LLM with a strict system prompt (see `server/index.js`) that
   asks for a fixed JSON schema, not free text
3. LLM returns structured fields **plus** a `missing_required` list — fields it could
   not responsibly fill in
4. Frontend shows a **CLARIFY** step only for those fields, each with the model's
   suggested default pre-filled but editable — the user confirms or overrides, never
   a silent assumption
5. Once every required field has a value, the experiment locks into a final, clean
   **EXPERIMENT** card

## Why this counts as real AI use, not a chatbot wrapper

The model is never asked "does this strategy work?" — that would just be an LLM guessing
at a trading answer with no data behind it, which is the "chatbot wrapper" failure mode
the brief warns against. Instead the model has one narrow, checkable job: **structured
extraction with explicit uncertainty flagging**. Its output is JSON that maps directly to
form fields, and the one place it's allowed to "reason" (interpreting a phrase like
"sharp fall" as an approximate % threshold) is required to flag itself as an assumption
rather than presenting itself as a fact. That flagging is what drives the whole
CLARIFY step — it's the actual product mechanism, not a UI nicety.

## Technologies used

- **Frontend:** React 18, Vite, `lucide-react` for icons
- **Backend:** Node.js, Express, native `fetch` to Groq's OpenAI-compatible chat completions API
- **LLM:** [Groq](https://groq.com) running Llama 3.3 70B (configurable via `GROQ_MODEL`),
  called with a fixed JSON-schema system prompt and `response_format: json_object` — no
  chat history, no free-form chat UI, single-purpose extraction call
- **No database** for this slice — there's nothing to persist yet (see "Remember" below)

## Key decisions

- **JSON-only model output, validated by parsing it** — if the model ever returns
  something that isn't valid JSON, the request fails loudly instead of silently
  showing a broken experiment.
- **`missing_required` is populated by the model itself, not by a separate rules
  engine.** This keeps ambiguity detection tied to the model's actual confidence about
  the specific question, rather than a fixed checklist that would treat every question
  the same way.
- **Assumptions are never hidden.** Any field the model filled by interpretation (not
  explicit user wording) is *still* routed through the clarify step, with the model's
  reasoning shown, so the user always sees what was assumed and why.
- **No chat interface.** The brief warns against a "chatbot wrapper" — this is a
  single-purpose form-like flow (ask → clarify → structured result), which matches how
  a researcher would actually want to work: define an experiment once, precisely, not
  converse about it.
- **Groq over a free general-purpose router.** An earlier version routed through
  OpenRouter's free-model pool, but the model it landed on printed its full chain-of-thought
  before the JSON, breaking the parser. Groq's hosted Llama 3.3 70B follows the
  "JSON only" instruction reliably and has a generous free tier, so it's a better fit
  for a pipeline that depends on strict, parseable output.

## What I'd improve with more time

- **Remember:** persist confirmed experiments (MongoDB) so recurring question patterns
  (e.g. "NIFTY after an N% fall") get faster, more targeted clarifying questions next time.
- **Test:** wire the finalized JSON into a real or mock backtesting endpoint (the
  brief's optional bonus) to close the loop from question to evidence.
- **Multi-turn clarification:** currently all missing fields are asked at once; a
  genuinely conversational version would ask one at a time and let earlier answers
  narrow later suggestions (e.g. instrument choice affecting realistic holding periods).
- **Validation:** add lightweight sanity checks (e.g. flag a holding period longer than
  the test period) before marking an experiment "ready."

