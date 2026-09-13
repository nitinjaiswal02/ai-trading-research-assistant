## Quick Links
- [Live Demo](https://ai-trading-research-assistant-five.vercel.app)
- [AI Usage Note](./AI_USAGE_NOTE.md)
- [Thinking Note](./THINKING_NOTE.md)

# AI Trading Research Assistant — README

A prototype that converts a natural-language trading question into a structured, testable experiment — flagging anything it can't safely infer instead of assuming it.

## Architecture

- `client/` (React + Vite) — question input, clarify step, structured experiment view.
- `server/` (Express) — the only part that holds the API key; exposes `POST /api/parse-question`.

**Flow:** question → server sends it to the LLM with a strict JSON-schema system prompt → LLM returns structured fields plus a `missing_required` list → frontend shows a Clarify step only for those fields (pre-filled, editable) → once confirmed, the experiment locks into a final read-only card.

## Technology Choices

- **Frontend:** React 18 + Vite — fast dev loop, no framework overhead needed for a single-flow UI.
- **Backend:** Node.js + Express — thin proxy so the LLM key never reaches the browser (a direct browser call was tried first and blocked by CORS, which confirmed why a server is necessary, not just safer).
- **LLM:** Groq (Llama 3.3 / gpt-oss), called with `response_format: json_object` and a fixed schema — chosen after a free-tier router model broke JSON parsing by printing its chain-of-thought first.
- **Database:** None for this slice — nothing needs persisting yet; see "Improve Next."

## Key Assumptions

- The brief's examples center on Indian index trading (NIFTY/BANKNIFTY); the extraction logic is written generically but was only tested against that domain.
- "Structure the experiment" was scoped to six required fields — instrument, timeframe, entry, exit, holding period, test period — since these are the fields the brief's own example experiment lists.
- Any field the model fills only by interpretation (e.g. reading "sharp fall" as an approximate %) is still treated as unconfirmed and routed to the Clarify step, not accepted as final.
- Running a real backtest, persisting experiments, and multi-turn conversation were treated as explicitly out of scope, per the brief's "do not build a full platform" instruction.

## How to Run the Project

```bash
# 1. Server
cd server
cp .env.example .env   # add your GROQ_API_KEY
npm install
npm start               # http://localhost:5050

# 2. Client (second terminal)
cd client
npm install
npm run dev              # http://localhost:5173, proxies /api to the server
```

## AI Tools Used

Claude (claude.ai) was used to scaffold the client/server structure, design the extraction prompt, and debug three real integration failures (CORS on a direct browser call, a free model's chain-of-thought breaking JSON parsing, and a deprecated model returning 404). Full breakdown in `AI_USAGE_NOTE.md`.

## What I Would Improve Next

- Persist confirmed experiments (MongoDB) so recurring question patterns get faster, better-targeted clarifying questions.
- Connect the finalized JSON to a real or mock backtesting endpoint (the brief's optional bonus) to close the loop from question to evidence.
- Ask missing fields one at a time instead of all at once, letting earlier answers narrow later suggestions.
- Add sanity validation (e.g. flag a holding period longer than the test period) before marking an experiment "ready."