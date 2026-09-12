# AI Usage Note

## Which AI tools did I use?
- Claude (via claude.ai) — used extensively, for scaffolding the prototype, designing
  the extraction prompt, and debugging every real integration issue I hit while getting
  it to actually run on my machine.
- No other AI coding tools for this one — I kept everything in one thread so the
  reasoning behind each fix stayed connected to the fix itself.

## What did I use them for?
- Generating the initial client (React/Vite) + server (Express) scaffold, and the
  JSON-schema system prompt used for extraction.
- Drafting the first pass of the README and architecture write-up.
- Debugging three separate integration failures end-to-end (see below) — not just
  "fix this error," but understanding *why* each one happened before moving on.

## What did I personally design?
- The decision to split client and server so the API key never touches the browser —
  I only actually understood *why* this mattered once I hit a CORS error trying the
  direct-from-browser version first, which made the security reason concrete instead
  of theoretical.
- The exact required-field list (instrument, timeframe, entry, exit, holding period,
  test period) and which of them should force a Clarify step.
- The rule that even an "interpreted" value — like reading "sharp fall" as an
  approximate percentage — still has to be confirmed by me/the user, never presented
  as a settled fact.

## What did I review or modify?
- I ran the prototype against real questions before trusting it, and the first version
  broke immediately: a direct browser call to the LLM API hit a CORS error the moment
  it left the sandboxed demo environment. I chose the Express-proxy fix over any
  workaround because it solved the key-exposure problem at the same time.
- After moving to a free-tier model router (to avoid API costs while testing), I fed it
  the NIFTY example question and the response wasn't JSON at all — it was the model's
  full chain-of-thought ("Here's a thinking process: 1. Analyze user input...") printed
  before ever reaching the JSON. I diagnosed this as a reasoning-model behavior, not a
  prompt bug, and switched providers rather than trying to regex my way around it.
- The next model I picked (llama-3.3-70b-versatile on Groq) returned a clean
  `404 model_not_found` — turned out it had been deprecated. I looked up the current
  supported models and switched to `openai/gpt-oss-20b`, and made the model name
  configurable via `.env` so this doesn't require a code change again.
- I added a fallback in the server (retry without `response_format` if a model rejects
  the param) after realizing free/rotating models don't all support it consistently —
  this was my own addition once I understood the pattern across the earlier failures.

## Did I reject or modify any AI-generated suggestions? Why?
- Yes — the first working suggestion (call the LLM directly from the React component)
  is genuinely the fastest way to prototype, and I initially kept it. I rejected it once
  I ran it outside the demo sandbox and got the CORS error myself; that's what pushed me
  to insist on the client/server split rather than accepting the simpler version.
- I also didn't just accept "switch providers" as a black-box fix each time — for the
  OpenRouter chain-of-thought issue and the Groq deprecation, I asked *why* the error
  was happening before applying the suggested change, because I wanted to be able to
  explain both failures on my own, not just paste a working diff.

## What part of the solution am I most proud of?
Honestly, not the extraction prompt itself — it's the part that took the least
back-and-forth. I'm most proud of the fact that the pipeline now fails *loudly and
specifically* instead of silently: a bad model, a bad key, or malformed JSON all
surface as a distinct, readable error rather than a blank screen. That came directly
out of hitting three real failures in a row and refusing to move on until I understood
each one.
