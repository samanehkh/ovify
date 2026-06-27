#!/usr/bin/env python3
"""Generate a detailed SVG of the Ovify Agentic SDLC pipeline, then it is rendered to PNG via headless Chrome."""

W, H = 1680, 1840
parts = []

def esc(s):
    return s.replace("&", "and").replace("<", "(").replace(">", ")")

def rect(x, y, w, h, fill, stroke, rx=14, sw=2, dash=None, opacity=1):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
                 f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d} opacity="{opacity}"/>')

def text(x, y, s, size=15, fill="#0f172a", weight="400", anchor="start", family="Segoe UI, Helvetica, Arial, sans-serif"):
    parts.append(f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" '
                 f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{esc(s)}</text>')

def card(x, y, w, h, title, sub, fill, stroke, tcol, badge=None, sub2=None):
    rect(x, y, w, h, fill, stroke)
    if badge:
        parts.append(f'<circle cx="{x+18}" cy="{y+18}" r="13" fill="{stroke}"/>')
        text(x+18, y+23, badge, size=13, fill="#ffffff", weight="700", anchor="middle")
    text(x+(36 if badge else 16), y+24, title, size=15.5, fill=tcol, weight="700")
    if sub:
        text(x+16, y+46, sub, size=12.5, fill=tcol)
    if sub2:
        text(x+16, y+64, sub2, size=12.5, fill=tcol)

def arrow(x1, y1, x2, y2, label="", color="#475569", dash=None, lx=None, ly=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
                 f'stroke-width="2.5"{d} marker-end="url(#arrow)"/>')
    if label:
        text(lx or (x1+x2)//2, ly or (y1+y2)//2, label, size=12, fill=color, weight="600", anchor="middle")

# defs
parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
parts.append('<defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto">'
             '<path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>')
rect(0, 0, W, H, "#FDFDFB", "#FDFDFB", rx=0, sw=0)

# Title
text(50, 52, "Ovify — Agentic SDLC Pipeline", size=30, fill="#13233C", weight="800")
text(50, 80, "Spec-driven, guardrailed, cost-capped. Control plane on GitHub runners; Azure is the deploy target only.",
     size=15, fill="#64748B")

MAIN_L, MAIN_R = 50, 1180   # main column
RAIL_L, RAIL_R = 1210, 1630 # guardrail rail

# ---------- LAYER BANDS ----------
def band(y, h, title, fill, stroke):
    rect(MAIN_L, y, MAIN_R-MAIN_L, h, fill, stroke, rx=18, sw=2.5)
    text(MAIN_L+22, y+30, title, size=18, fill=stroke, weight="800")

# Layer 1
L1y, L1h = 110, 175
band(L1y, L1h, "LAYER 1  ·  Local Workstation (Developer Loop)", "#F5F3FF", "#8B5CF6")
card(90,  L1y+55, 300, 95, "Developer + IDE", "Writes .spec-kit/spec.md", "#EDE9FE", "#6D28D9", "#2E1065", "1")
card(430, L1y+55, 300, 95, "Spec-Kit CLI", "specify validate", "#EDE9FE", "#6D28D9", "#2E1065", "2",
     sub2="GATE: blocks push if spec malformed")
card(770, L1y+55, 320, 95, "Local MCP Host", "fs · git · shell (free local loop)", "#EDE9FE", "#6D28D9", "#2E1065")

# Layer 2
L2y, L2h = 330, 470
band(L2y, L2h, "LAYER 2  ·  GitHub Control Plane (Ephemeral Runner — the brain runs here)", "#FFFBEB", "#D97706")
card(90,  L2y+50, 300, 80, "GitHub Repo", "PRs + branches", "#FEF3C7", "#D97706", "#78350F", "3")
card(430, L2y+50, 300, 80, "gitleaks + Dependabot", "secret + CVE scan (fail-fast)", "#FEF3C7", "#D97706", "#78350F", "5")
card(770, L2y+50, 320, 80, "Branch Protection", "agent opens PR — never merges", "#FEF3C7", "#D97706", "#78350F")

# Runner inner box
RVx, RVy, RVw, RVh = 90, L2y+150, 1000, 215
rect(RVx, RVy, RVw, RVh, "#FFFDF5", "#B45309", rx=14, sw=2, dash="7 5")
text(RVx+16, RVy+26, "GitHub-Hosted Runner VM  (timeout guard active · per-run token budget)", size=14, fill="#92400E", weight="700")
card(RVx+20, RVy+45, 300, 70, "LangGraph Orchestrator", "state machine · max_iterations cap", "#ECFDF5", "#059669", "#064E3B", "4")
# agents row
ay = RVy+130
card(RVx+20,  ay, 230, 70, "Architecture Agent", "Gemini PRO · plans", "#ECFDF5", "#059669", "#064E3B")
card(RVx+265, ay, 230, 70, "Developer Agent", "Flash · writes code", "#ECFDF5", "#059669", "#064E3B")
card(RVx+510, ay, 230, 70, "QA / Critic Agent", "Flash · runs tests", "#ECFDF5", "#059669", "#064E3B")
card(RVx+755, ay, 225, 70, "SecOps Agent", "Flash · scans IaC", "#ECFDF5", "#059669", "#064E3B")
# loop arrow Dev<->QA
arrow(RVx+495, ay+35, RVx+510, ay+35, "", "#DC2626")
arrow(RVx+510, ay+58, RVx+495, ay+58, "loop x3", "#DC2626", lx=RVx+503, ly=ay+78)

# Layer 3
L3y, L3h = 830, 175
band(L3y, L3h, "LAYER 3  ·  LLM Reasoning + Guardrails (every call passes through here)", "#F0FDF4", "#16A34A")
card(90,  L3y+55, 250, 95, "PII / Health Scrub", "regex DLP before any call", "#DCFCE7", "#15803D", "#14532D", "9")
card(360, L3y+55, 250, 95, "Gemini PRO", "big context · planning", "#DCFCE7", "#15803D", "#14532D", "10")
card(630, L3y+55, 250, 95, "Gemini FLASH", "cheap · code + QA", "#DCFCE7", "#15803D", "#14532D", "11")
card(900, L3y+55, 190, 95, "Pydantic Guard", "schema check (auto-fix x2)", "#DCFCE7", "#15803D", "#14532D", "13")

# Layer 4
L4y, L4h = 1050, 175
band(L4y, L4h, "LAYER 4  ·  Azure Target (passive deploy recipient — Role 3)", "#EFF6FF", "#2563EB")
card(90,  L4y+55, 210, 95, "Env Gate", "Required Reviewer (human)", "#DBEAFE", "#1D4ED8", "#1E3A8A", "18")
card(320, L4y+55, 200, 95, "OIDC Auth", "keyless · short-lived token", "#DBEAFE", "#1D4ED8", "#1E3A8A", "19")
card(540, L4y+55, 190, 95, "Terraform", "plan + apply (IaC)", "#DBEAFE", "#1D4ED8", "#1E3A8A", "21")
card(750, L4y+55, 160, 95, "Azure SWA", "frontend PWA", "#DBEAFE", "#1D4ED8", "#1E3A8A", "22")
card(930, L4y+55, 160, 95, "PostgreSQL", "relational data", "#DBEAFE", "#1D4ED8", "#1E3A8A", "22")

# Layer 5 (optional/dashed)
L5y, L5h = 1270, 175
rect(MAIN_L, L5y, MAIN_R-MAIN_L, L5h, "#FAF5FF", "#9333EA", rx=18, sw=2.5, dash="8 5")
text(MAIN_L+22, L5y+30, "LAYER 5  ·  Observability & Memory  —  PHASE 2 / OPTIONAL (dashed = build later)", size=18, fill="#7E22CE", weight="800")
card(90,  L5y+55, 250, 95, "Langfuse", "token + cost tracing", "#F3E8FF", "#7E22CE", "#581C87", "24")
card(360, L5y+55, 250, 95, "Budget Guard", "abort run if over $/token cap", "#F3E8FF", "#7E22CE", "#581C87", "26")
card(630, L5y+55, 250, 95, "Vector Store", "semantic memory (RAG)", "#F3E8FF", "#7E22CE", "#581C87", "27")
card(900, L5y+55, 190, 95, "Episodic Log", "past runs / failures", "#F3E8FF", "#7E22CE", "#581C87", "29")

# ---------- FLOW ARROWS between layers ----------
cx = 615
arrow(cx, L1y+L1h, cx, L2y, "git push → PR triggers runner (3-4)", "#475569", lx=cx, ly=L1y+L1h+18)
arrow(cx, L2y+L2h, cx, L3y, "agents call models through guards (8-13)", "#475569", lx=cx, ly=L2y+L2h+18)
arrow(cx+220, L3y, cx+220, L2y+L2h, "typed result back to loop", "#16A34A", dash="5 4", lx=cx+330, ly=L3y-8)
arrow(cx, L3y+L3h, cx, L4y, "PR + human approval → OIDC deploy (17-22)", "#475569", lx=cx, ly=L3y+L3h+18)
arrow(cx, L4y+L4h, cx, L5y, "emit traces / cost (24-29)", "#9333EA", dash="6 4", lx=cx, ly=L4y+L4h+18)

# ---------- GUARDRAIL RAIL ----------
rect(RAIL_L, 110, RAIL_R-RAIL_L, L5y+L5h-110, "#FFF1F2", "#E11D48", rx=18, sw=2.5)
text(RAIL_L+20, 144, "🛡️ GUARDRAILS", size=19, fill="#9F1239", weight="800")
text(RAIL_L+20, 168, "(layered — each is cheap + deterministic)", size=12.5, fill="#9F1239")

def grp(y, head, items, head_col="#9F1239"):
    text(RAIL_L+20, y, head, size=15, fill=head_col, weight="800")
    yy = y+24
    for it in items:
        text(RAIL_L+28, yy, "• " + it, size=12.8, fill="#7F1D1D")
        yy += 22
    return yy+10

y = 205
y = grp(y, "1 · INPUT", ["PII / health-data scrub", "Prompt-injection filter", "Context trimming (token save)"])
y = grp(y, "2 · BEHAVIOUR", ["System-prompt constraints", "Tool allow-list (least priv.)", "Read-only GITHUB_TOKEN", "Filesystem jail"])
y = grp(y, "3 · OUTPUT", ["Pydantic schema validation", "Jailbreak / policy scan", "Diff sanity check"])
y = grp(y, "4 · COST / RUNTIME", ["max_iterations = 3-5", "max_parse_retries = 2", "timeout-minutes (30)", "per-run token / $ budget"])
y = grp(y, "5 · PLATFORM GATES", ["Branch protection (no merge)", "Environment + Reviewer (deploy)", "Checkov / Trivy (IaC)", "OIDC keyless auth"])
y = grp(y, "MODEL ROUTING", ["PRO = Architect (rare)", "FLASH = Dev/QA/SecOps (cheap)", "→ biggest cost lever"], head_col="#7E22CE")

# ---------- LEGEND / footer ----------
fy = L5y+L5h+30
text(50, fy, "Numbered badges = execution step order.  Solid arrows = MVP flow.  Dashed = Phase-2 / optional.",
     size=13, fill="#475569", weight="600")
text(50, fy+24, "Primary loop guard = max_iterations (logical, keeps logs).  Wall-clock timeout = backstop only.",
     size=13, fill="#475569")

parts.append("</svg>")

svg = "\n".join(parts)
with open("sdlc_layers.svg", "w") as f:
    f.write(svg)
print("SVG written:", len(svg), "bytes")
