# Ovify UI/UX Designer Agent — the operationalized version

This is the piece that was missing. `SDLC_design/` **described** a "UI/UX designer
agent" as a persona. A described agent builds nothing. This folder gives that agent
the four things it needed to actually do the work — the same loop you and Claude Code
were running by hand.

| Missing piece | What it was | Where it lives now |
|---|---|---|
| **Hands** | ability to write files | `render()` + `html_path.write_text(...)` |
| **Eyes** | ability to *see* the render | headless-Chrome screenshot → fed to Gemini **vision** |
| **A spec** | the brand/token rules | reads `.spec-kit/constitution.md` (per constitution §5) |
| **A loop** | generate → critique → refine | the `for i in range(MAX_ITERS)` orchestrator, capped |

## How it maps to your SDLC design

```
Architect node   →  load constitution + brief          (requirements)
Developer node   →  Gemini generates / refines HTML     (text)
QA / Critic node →  render + Gemini VISION judges it     ← the loop you were missing
Human gate       →  you open agents/output/ and approve  (your own "agents propose, humans approve" rule)
```

The `Developer ⇄ Critic` cycle is exactly the cyclic edge your LangGraph design
exists to express. It's a plain Python loop here because for a *single* agent that's
clearer; swap in LangGraph when you add more agents (Architect, SecOps, etc.).

It also honours two guardrails straight from your design:
- **`max_iterations`** cap (default 4) so a stubborn critic can't loop forever / drain quota.
- **Human approval gate** — the agent never ships; it hands you the best `agents/output/screen_vN.html`.

## Run it

```bash
pip install -r agents/requirements.txt
export GEMINI_API_KEY=...        # FREE tier: https://aistudio.google.com  (NOT your Google AI Pro app)
python agents/ui_designer_agent.py --brief "Patient home: greeting, cycle-day ring, \
    today's medications with status, optional emotional check-in, bottom tab bar."
```

No key yet? See the wiring without spending anything:

```bash
python agents/ui_designer_agent.py --dry-run
```

## What you get

`agents/output/screen_v1.html`, `screen_v2.html`, … plus a `.png` per iteration — so
you can literally watch the agent's taste improve as the critic pushes it. The console
prints each critic verdict + score; the final APPROVED (or best-scoring) file is yours
to review and drop into the app.

## Config (env vars)

| Var | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | required (free AI Studio key) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | vision-capable, cheap |
| `UI_AGENT_MAX_ITERS` | `4` | loop guardrail |
| `CHROME_BIN` | macOS Chrome path | headless renderer |

## The honest caveat

This closes the *mechanical* gap (hands, eyes, spec, loop). It does **not** replace
your **taste and brand context** — the critic is only as good as the constitution you
feed it. That's why the human approval gate stays. Sharpen the constitution → the agent
gets better. This is the correct division of labour: the agent iterates, you judge.
