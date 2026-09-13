# 📈 AI Trading Research Assistant

*A mini prototype that turns a natural-language trading question into a structured, testable experiment — and asks before it assumes.*

> **Example:** *"Does buying NIFTY after a 1% fall work better during high-volatility periods?"* → gets converted into a clean `EXPERIMENT` object with instrument, timeframe, entry, exit, holding period, and filters. Anything the system can't safely infer (like exit rule or holding period) is flagged for you to confirm — never silently guessed.

---

## 🔗 Quick Links

-  **Live Demo:** [ai-trading-research-assistant-five.vercel.app](https://ai-trading-research-assistant-five.vercel.app)
- 🧠 **[Thinking Note](./THINKING_NOTE.md)**
- 🤖 **[AI Usage Note](./AI_USAGE_NOTE.md)**

> ⚠️ **Note on the live demo:** the backend is hosted on Render's free tier, which "sleeps" after inactivity. The **first request after a while may take 20–30 seconds** to respond while the server wakes up — that's a hosting quirk, not a bug. Subsequent requests are fast.

---

## ✨ What It Does

| Step | What happens |
|---|---|
| **Understand** | Reads your plain-English question and extracts instrument, timeframe, entry, exit, holding period, and filters |
| **Structure** | Converts it into a clean, fixed `EXPERIMENT` schema — no free-text guessing |
| **Clarify** | If something important is missing (it almost always is — exit rule, holding period), it asks you to confirm instead of assuming |
| **Present** | Shows the final, locked-in experiment in a clean card, ready to be copied as JSON |

This deliberately covers only the **Understand → Structure** slice of the larger vision (`Understand → Structure → Test → Explain → Remember`) — no backtest execution, no chat interface, no history. Just this one part, done properly.

---

## 🏗️ Architecture

```
trading-assistant/
├── client/   → React + Vite frontend (deployed on Vercel)
└── server/   → Express backend (deployed on Render)
```

```
User types question
       │
       ▼
POST /api/parse-question  ──────►  Groq LLM (strict JSON-schema prompt)
       │                                   │
       ▼                                   ▼
  missing_required[]  ◄──────────  structured fields + notes
       │
       ▼
Frontend shows a CLARIFY step only for missing fields
       │
       ▼
Final EXPERIMENT card (locked, copyable as JSON)
```

**Why a separate backend?** Calling the LLM directly from the browser means shipping the API key to every visitor — a real security hole. The Express server is the only thing that ever sees the key.

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, `lucide-react` |
| Backend | Node.js, Express |
| LLM | [Groq](https://groq.com) (`openai/gpt-oss-20b`) — chosen for reliably returning clean JSON |
| Hosting | Vercel (client) · Render (server) |

---

## 🤔 Key Assumptions

- Examples center on Indian indices (NIFTY/BANKNIFTY), though the extraction logic is written generically.
- "Structure the experiment" is scoped to six required fields: instrument, timeframe, entry, exit, holding period, test period.
- Any field the model fills only by *interpretation* (e.g. "sharp fall" → an approximate %) is still routed through the Clarify step, never accepted as final without confirmation.
- Real backtesting, persistence, and multi-turn conversation are explicitly out of scope for this slice.

---

## 🚀 Run It Locally

```bash
# 1. Server
cd server
cp .env.example .env      # add your GROQ_API_KEY
npm install
npm start                  # → http://localhost:5050

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # → http://localhost:5173
```

---

## 🤖 AI Tools Used

Built with **Claude** — used for scaffolding, prompt design, and debugging three real integration failures along the way (CORS on a direct browser call, a free model breaking JSON output with its own chain-of-thought, and a deprecated model returning 404). Full story in **[AI_USAGE_NOTE.md](./AI_USAGE_NOTE.md)**.

---

## 🔮 What I'd Improve Next

- [ ] Persist confirmed experiments so recurring questions get smarter clarifying prompts over time
- [ ] Connect the finalized JSON to a real/mock backtesting endpoint (the brief's optional bonus)
- [ ] Ask missing fields one at a time instead of all at once
- [ ] Add sanity validation (e.g. flag a holding period longer than the test period)