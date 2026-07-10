#!/usr/bin/env python3
"""
Ovify UI/UX Designer Agent — the *operationalized* version.

This is the thing that was missing. Your SDLC design described a "UI/UX designer
agent" as a persona. A described agent builds nothing. This script gives that
agent the four things it actually needs to do the work:

    1. HANDS  — it writes real .html files.
    2. EYES   — it renders the HTML with headless Chrome and *sees* the screenshot.
    3. A SPEC — it reads docs/constitution.md (your brand/token rules) + a brief.
    4. A LOOP — generate -> render -> critique the screenshot -> refine, capped.

It maps 1:1 onto the nodes in SDLC_design/ :

    Architect  -> load constitution + brief            (the requirements)
    Developer  -> generate / refine the HTML           (Gemini, text)
    QA / Critic-> render + judge the screenshot        (Gemini, VISION)  <-- the piece you were missing
    Human gate -> you review agents/output/ and approve

Why a plain loop and not LangGraph? For a single agent this is clearer and teaches
the concept better. The Dev<->Critic loop below is exactly the cyclic edge your
LangGraph design exists to express — swap in LangGraph when you add more agents.

------------------------------------------------------------------------------
RUN IT
------------------------------------------------------------------------------
    pip install -r agents/requirements.txt
    export GEMINI_API_KEY=...           # free tier: https://aistudio.google.com
    python agents/ui_designer_agent.py --brief "Patient home screen: greeting, \
        cycle-day progress, today's medications with real product photos, \
        an emotional check-in, and a bottom tab bar."

Output: agents/output/screen_v1.html, screen_v2.html ... + a .png per iteration,
so you can watch the agent's taste improve. The last APPROVED (or best) file wins.

No key yet? Run with --dry-run to see the whole pipeline wiring without calling
the API.
"""

import os
import re
import sys
import json
import argparse
import subprocess
from pathlib import Path

# ------------------------------------------------------------------ config
ROOT          = Path(__file__).resolve().parent.parent
CONSTITUTION  = ROOT / "docs" / "constitution.md"
OUT_DIR       = Path(__file__).resolve().parent / "output"
MODEL         = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")   # vision-capable, free tier
MAX_ITERS     = int(os.environ.get("UI_AGENT_MAX_ITERS", "4"))       # your loop guardrail
RENDER_WIDTH  = 430
CHROME        = os.environ.get(
    "CHROME_BIN",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
)


# ------------------------------------------------------------------ tools (HANDS + EYES)
def render(html_path: Path, png_path: Path) -> bool:
    """EYES: rasterise the HTML with headless Chrome so the agent can see its own work."""
    cmd = [
        CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=2",
        f"--window-size={RENDER_WIDTH},1600",
        f"--screenshot={png_path}", f"file://{html_path}",
    ]
    try:
        subprocess.run(cmd, capture_output=True, timeout=60)
        return png_path.exists()
    except Exception as e:
        print(f"  ! render failed: {e}")
        return False


def strip_fence(text: str) -> str:
    """Pull the HTML out of a ```html ... ``` fence if the model wrapped it."""
    m = re.search(r"```(?:html)?\s*(.*?)```", text, re.S)
    return (m.group(1) if m else text).strip()


def extract_json(text: str) -> dict:
    """Tolerant JSON extraction from the critic's reply."""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return {"verdict": "REFINE", "score": 0, "fix_instructions": text[:500]}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {"verdict": "REFINE", "score": 0, "fix_instructions": text[:500]}


# ------------------------------------------------------------------ the model (BRAIN)
def get_client():
    from google import genai
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("Set GEMINI_API_KEY (free tier: https://aistudio.google.com) or use --dry-run.")
    return genai.Client(api_key=key)


def developer_generate(client, constitution: str, brief: str, prev_html: str, critique: str) -> str:
    """DEVELOPER node: write (or refine) a single self-contained HTML screen."""
    if prev_html:
        prompt = f"""You are a senior digital-health UI engineer. Refine the HTML screen below.

BRAND + TOKEN RULES (non-negotiable — obey exactly):
{constitution}

SCREEN BRIEF:
{brief}

A design critic reviewed your last render and returned this feedback. FIX ALL OF IT:
{critique}

Return ONLY the full, updated, self-contained HTML document. Requirements:
- One file. Inline <style>. No external CSS/JS. Use inline SVG for icons (no image files).
- Mobile-first, max-width ~390px phone frame.
- Honour the palette, fonts, radii and accessibility rules above verbatim.
Return the HTML in a ```html code block."""
    else:
        prompt = f"""You are a senior digital-health UI engineer. Design ONE mobile screen.

BRAND + TOKEN RULES (non-negotiable — obey exactly):
{constitution}

SCREEN BRIEF:
{brief}

Return ONLY a full, self-contained HTML document. Requirements:
- One file. Inline <style>. No external CSS/JS. Use inline SVG for icons (no image files).
- Mobile-first, max-width ~390px phone frame, calm and premium (this is an anxious IVF patient).
- Honour the palette, fonts, radii and accessibility rules above verbatim.
Return the HTML in a ```html code block."""
    resp = client.models.generate_content(model=MODEL, contents=[prompt])
    return strip_fence(resp.text)


def critic_review(client, png_path: Path, constitution: str, brief: str) -> dict:
    """QA/CRITIC node: LOOK at the screenshot and judge it against the constitution."""
    from PIL import Image
    img = Image.open(png_path)
    prompt = f"""You are a UI/UX design critic specialised in digital-health apps.
You are looking at a SCREENSHOT of a rendered screen. Judge it honestly.

It must satisfy this brief:
{brief}

And obey these brand/token rules:
{constitution}

Assess: visual hierarchy, spacing, contrast/AA legibility, palette + font adherence,
whether it looks premium/calm (not "AI slop"), and whether the brief is fully met.

Return STRICT JSON only:
{{"verdict": "PASS" or "REFINE",
  "score": <0-100>,
  "issues": ["short, specific problems"],
  "fix_instructions": "concrete, actionable instructions for the developer to fix every issue"}}
PASS only if score >= 85 and there are no serious hierarchy/contrast/brand violations."""
    resp = client.models.generate_content(model=MODEL, contents=[prompt, img])
    return extract_json(resp.text)


# ------------------------------------------------------------------ the loop (ORCHESTRATOR)
def run(brief: str, dry_run: bool):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    constitution = CONSTITUTION.read_text() if CONSTITUTION.exists() else "(no constitution found)"

    print(f"\n🎨 Ovify UI/UX Designer Agent")
    print(f"   model: {MODEL} | max_iterations: {MAX_ITERS} | render: {RENDER_WIDTH}px")
    print(f"   spec:  {CONSTITUTION.relative_to(ROOT) if CONSTITUTION.exists() else 'MISSING'}")
    print(f"   brief: {brief}\n")

    if dry_run:
        print("DRY RUN — pipeline wiring (no API calls):")
        print("  Architect  → loaded constitution + brief")
        print("  Developer  → would call Gemini to generate HTML")
        print("  render()   → would screenshot it with headless Chrome  (EYES)")
        print("  Critic     → would call Gemini VISION on the screenshot")
        print("  loop       → refine until PASS or max_iterations, then human approves")
        print("\nSet GEMINI_API_KEY and drop --dry-run to actually build.")
        return

    client = get_client()
    html, critique, best = "", "", None

    for i in range(1, MAX_ITERS + 1):
        print(f"── iteration {i}/{MAX_ITERS}")
        # DEVELOPER
        html = developer_generate(client, constitution, brief, html, critique)
        html_path = OUT_DIR / f"screen_v{i}.html"
        png_path = OUT_DIR / f"screen_v{i}.png"
        html_path.write_text(html)                      # HANDS: wrote the file
        print(f"  developer → {html_path.relative_to(ROOT)}")

        # EYES
        if not render(html_path, png_path):
            print("  ! could not render; stopping.")
            break
        print(f"  rendered  → {png_path.relative_to(ROOT)}")

        # CRITIC (vision)
        review = critic_review(client, png_path, constitution, brief)
        score = review.get("score", 0)
        verdict = review.get("verdict", "REFINE")
        print(f"  critic    → {verdict} (score {score})")
        for issue in review.get("issues", [])[:5]:
            print(f"              • {issue}")
        best = (html_path, png_path, score) if (best is None or score > best[2]) else best

        if verdict == "PASS":
            print(f"\n✅ Approved on iteration {i}. Human review: {html_path.relative_to(ROOT)}")
            return
        critique = review.get("fix_instructions", "")

    # loop guardrail hit — surface the best attempt for the human gate
    if best:
        print(f"\n⏹  Max iterations reached. Best attempt (score {best[2]}): "
              f"{best[0].relative_to(ROOT)} — over to you for the human approval gate.")


# ------------------------------------------------------------------ cli
if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Operationalized Ovify UI/UX designer agent.")
    ap.add_argument("--brief", default="A calm patient home screen for an IVF adherence app: "
                    "greeting, cycle-day progress ring, today's medications, an optional "
                    "emotional check-in, and a bottom tab bar.",
                    help="What screen to design.")
    ap.add_argument("--dry-run", action="store_true", help="Show the wiring without calling the API.")
    args = ap.parse_args()
    run(args.brief, args.dry_run)
