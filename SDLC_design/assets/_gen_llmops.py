#!/usr/bin/env python3
"""Hero diagram: LLMOps + Agentic AI landscape (three pillars + defense-in-depth + agentic ladder)."""
W, H = 1680, 1180
P = []
def esc(s): return s.replace("&","and").replace("<","(").replace(">",")")
def rect(x,y,w,h,fill,stroke,rx=14,sw=2,dash=None):
    d=f' stroke-dasharray="{dash}"' if dash else ""
    P.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>')
def text(x,y,s,size=15,fill="#0f172a",weight="400",anchor="start"):
    P.append(f'<text x="{x}" y="{y}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{esc(s)}</text>')
def card(x,y,w,h,title,sub,fill,stroke,tcol,badge=None):
    rect(x,y,w,h,fill,stroke)
    if badge:
        P.append(f'<circle cx="{x+18}" cy="{y+18}" r="12" fill="{stroke}"/>')
        text(x+18,y+22,badge,size=12,fill="#fff",weight="700",anchor="middle")
    text(x+(34 if badge else 14),y+24,title,size=15,fill=tcol,weight="700")
    if sub: text(x+14,y+45,sub,size=11.5,fill=tcol)
def arrow(x1,y1,x2,y2,color="#475569",dash=None):
    d=f' stroke-dasharray="{dash}"' if dash else ""
    P.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2.5"{d} marker-end="url(#a)"/>')

P.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
P.append('<defs><marker id="a" markerWidth="11" markerHeight="11" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>')
rect(0,0,W,H,"#FDFDFB","#FDFDFB",rx=0,sw=0)
text(50,52,"LLMOps & Agentic AI — The Map",size=30,fill="#13233C",weight="800")
text(50,80,"The model is the easy part. Value + safety live in Context, Constraints, Measurement, and Visibility.",size=15,fill="#64748B")

# Three pillars
text(50,128,"THE THREE PILLARS OF LLMOps",size=17,fill="#13233C",weight="800")
card(50,145,510,110,"1 · EVALUATION","How you replace 'assert ==' for non-deterministic output.","#DBEAFE","#2563EB","#1E3A8A")
text(64,225,"eval sets · LLM-as-judge · Ragas · promptfoo",size=12,fill="#1E3A8A")
card(585,145,510,110,"2 · GUARDRAILS","Deterministic checks wrapped around a stochastic core.","#FEE2E2","#DC2626","#7F1D1D")
text(599,225,"input · output · action layers (defense in depth)",size=12,fill="#7F1D1D")
card(1120,145,510,110,"3 · OBSERVABILITY","See every call, token, cost, and error.","#F3E8FF","#9333EA","#581C87")
text(1134,225,"traces · spans · Langfuse · OpenTelemetry",size=12,fill="#581C87")

# Agentic ladder
text(50,300,"THE AGENTIC LADDER  (climb only as high as the task needs)",size=17,fill="#13233C",weight="800")
ld=[("L0","Prompt","one call"),("L1","Chain","fixed steps"),("L2","Router","model branches"),("L3","Agent","tool loop + reflect"),("L4","Swarm","expert roles collaborate")]
x=50
for i,(lv,nm,sb) in enumerate(ld):
    card(x,320,300,86,f"{lv} · {nm}",sb,"#FEF3C7","#D97706","#78350F")
    if i<4: arrow(x+300,363,x+316,363)
    x+=316
text(50,430,"↑ higher = more capable, more cost, less predictable.  Ovify SDLC = L4 swarm; each node kept as low as possible.",size=12.5,fill="#64748B")

# Defense in depth (guardrail layers)
text(50,478,"GUARDRAILS — DEFENSE IN DEPTH",size=17,fill="#13233C",weight="800")
gl=[("App","auth · rate limit","6"),("Input","PII scrub · injection filter","9"),("Model","system prompt · low temp","10"),("Output","schema · grounding · toxicity","13"),("Action","tool scope · human gate","18")]
x=50
for i,(nm,sb,_) in enumerate(gl):
    card(x,498,300,86,nm,sb,"#FECACA","#B91C1C","#7F1D1D")
    if i<4: arrow(x+300,541,x+316,541)
    x+=316

# RAG mini-flow
text(50,628,"RAG — GROUNDING (the anti-hallucination + private-knowledge pattern)",size=17,fill="#13233C",weight="800")
rg=[("Docs","guidelines / code"),("Chunk+Embed","→ vectors"),("Vector DB","store"),("Retrieve+Rerank","top-k"),("LLM","grounded + cited answer")]
x=50
for i,(nm,sb) in enumerate(rg):
    card(x,648,300,86,nm,sb,"#DCFCE7","#16A34A","#14532D")
    if i<4: arrow(x+300,691,x+316,691)
    x+=316

# Cost levers + decision
text(50,778,"COST LEVERS (in order of impact)",size=17,fill="#13233C",weight="800")
cl=["1 · Model routing (cheap-first, escalate rarely)","2 · Minimise context (input = most of the bill)","3 · Prompt caching (stable prefixes)","4 · Cap loops + per-run budget abort","5 · Batch / fewer calls","6 · Self-host open-weight at volume"]
rect(50,790,760,180,"#F0FDF4","#16A34A",rx=14,sw=2)
yy=820
for c in cl:
    text(64,yy,"• "+c,size=13.5,fill="#14532D"); yy+=25

text(850,778,"BUILD DECISION  (prompt → RAG → fine-tune)",size=17,fill="#13233C",weight="800")
rect(850,790,780,180,"#FFFBEB","#D97706",rx=14,sw=2)
text(864,820,"Need private/fresh facts?  →  RAG",size=14,fill="#78350F",weight="700")
text(864,850,"Need a new skill/style instructions can't give?  →  Fine-tune (last resort)",size=14,fill="#78350F")
text(864,880,"Otherwise  →  Prompt engineering (start here: free, instant)",size=14,fill="#78350F")
text(864,918,"For knowledge: RAG beats fine-tuning — cheaper, updatable, citable.",size=12.5,fill="#92400E")
text(864,940,"Don't use an agent where a chain will do.",size=12.5,fill="#92400E",weight="700")

# OWASP callout
text(50,1010,"TOP 2 AGENTIC RISKS (OWASP LLM):",size=15,fill="#7F1D1D",weight="800")
text(360,1010,"LLM01 Prompt Injection  ·  LLM08 Excessive Agency  →  contained by least-privilege tools + human gates + no auto-merge/deploy.",size=13.5,fill="#7F1D1D")
text(50,1050,"Pillars + ladder + guardrails + RAG + cost discipline = LLMOps. See llmops_deep_dive.md for the full guide.",size=13,fill="#475569",weight="600")
P.append("</svg>")
open("llmops_map.svg","w").write("\n".join(P))
print("ok")
