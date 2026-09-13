# AI Usage Note

## Which AI tools did I use?
Claude (claude.ai) — used throughout, for scaffolding, prompt design, and debugging every integration issue hit while getting the prototype to actually run.

## What did I use them for?
Generating the initial client/server scaffold and the JSON-schema extraction prompt; drafting the first pass of the README; debugging three separate real failures end-to-end (see below).

## What did I personally design?
- The client/server split so the API key never reaches the browser — confirmed as necessary after hitting a CORS error on a direct-from-browser version.
- The required-field list (instrument, timeframe, entry, exit, holding period, test period) and which of them trigger a Clarify step.
- The rule that even an "interpreted" value (e.g. "sharp fall" → an approximate %) must be confirmed, never presented as fact.

## What did I review or modify?
Tested the prototype against real questions before trusting it. Found: (1) a direct browser call to the LLM hit CORS the moment it left a sandboxed demo — fixed with an Express proxy; (2) a free-tier router model printed its full chain-of-thought before the JSON, breaking the parser — diagnosed as a reasoning-model behavior and switched providers; (3) the next model (`llama-3.3-70b-versatile`) returned `404 model_not_found` — it had been deprecated, so I switched to a currently supported model and made it configurable via `.env`.

## Did I reject or modify any AI-generated suggestions? Why?
Yes — the first suggestion (call the LLM directly from React) is the fastest way to prototype and I initially kept it, but rejected it once I hit the CORS error myself, which is what justified the client/server split rather than a quicker workaround. For both the chain-of-thought issue and the model deprecation, I asked why the failure was happening before applying a fix, rather than accepting a black-box change.

## What part of the solution am I most proud of?
Not the extraction prompt — the fact that the pipeline now fails loudly and specifically (a bad model, a bad key, or malformed JSON each surface as a distinct, readable error) instead of silently. That came directly from refusing to move on until each of the three real failures was understood.