# LLMOps & Agentic AI — Deep Dive (Learning Guide)

A from-scratch, opinionated teaching guide to the AI side of the Ovify Agentic SDLC: **LLMOps, agentic patterns, RAG, memory, guardrails, evaluation, security, cost, and tooling.** Examples are tied to Ovify (the SDLC pipeline *and* the clinical product) so the abstractions stay concrete.

> **How to read this:** each section is *concept → diagram → real example → tools → what to consider.* Skim the diagrams first; they carry the structure.

![LLMOps and Agentic AI — the map](assets/llmops_map.png)

**Contents**
1. [LLMOps vs MLOps vs DevOps](#1)
2. [The LLMOps Lifecycle](#2)
3. [The Agentic Ladder: prompt → chain → agent → swarm](#3)
4. [Anatomy of an Agentic System](#4)
5. [Core AI Building Blocks](#5) — models, prompting, RAG, memory, tools, fine-tune-vs-RAG
6. [Guardrails — the deep dive](#6)
7. [Evaluation & Testing LLMs](#7)
8. [Observability & Tracing](#8)
9. [Security — OWASP LLM Top 10](#9)
10. [Cost / FinOps for LLMs](#10)
11. [Serving & Deployment](#11)
12. [Real-World Worked Examples](#12)
13. [Considerations Checklist](#13)
14. [Tool Landscape](#14)
15. [Learning Path](#15)

---

<a name="1"></a>
## 1. LLMOps vs MLOps vs DevOps

**The one-sentence version:** DevOps ships *code*, MLOps ships *trained models*, **LLMOps ships *prompts, context, and behaviour* around models you usually didn't train.**

```mermaid
graph LR
    classDef a fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A;
    classDef b fill:#DCFCE7,stroke:#16A34A,color:#14532D;
    classDef c fill:#F3E8FF,stroke:#9333EA,color:#581C87;
    D["DevOps<br/>unit = code<br/>deterministic<br/>tests pass/fail"]:::a
    M["MLOps<br/>unit = trained model<br/>data + weights<br/>accuracy metrics"]:::b
    L["LLMOps<br/>unit = prompt + context + policy<br/>non-deterministic<br/>eval scores + human judgement"]:::c
    D --> M --> L
```

| Dimension | DevOps | MLOps | LLMOps |
|---|---|---|---|
| Core artifact | Code | Model weights + dataset | Prompts, RAG context, tool defs, policies |
| Determinism | Deterministic | Statistical | **Non-deterministic** (same input → different output) |
| "Correct"? | Tests pass | Metric threshold | **Eval suite + human review** (no single truth) |
| Main failure | Bug | Drift / bad data | **Hallucination, jailbreak, cost blow-up** |
| Versioning | Git | Model registry (MLflow) | **Prompt + eval versioning** |
| You train it? | n/a | Usually yes | **Usually no** — you orchestrate a foundation model |

**Why this matters:** because output is non-deterministic, you cannot rely on `assert output == expected`. The entire discipline shifts to **evaluation, guardrails, and observability** — the three pillars this doc keeps returning to.

**Ovify example:** the SDLC's Developer Agent may emit *different* code for the same `tasks.md` on two runs. DevOps thinking ("it's broken, the output changed") is wrong here; LLMOps thinking ("does it still pass the eval suite and the QA gate?") is right.

---

<a name="2"></a>
## 2. The LLMOps Lifecycle

LLMOps is a loop, not a line. The feedback arrows are the whole point.

```mermaid
graph TD
    classDef s fill:#EDE9FE,stroke:#6D28D9,color:#2E1065;
    A["1 · Define task + success criteria"]:::s
    B["2 · Choose model + pattern<br/>(prompt / RAG / agent)"]:::s
    C["3 · Engineer prompt + context"]:::s
    D["4 · Add guardrails"]:::s
    E["5 · Build eval set"]:::s
    F["6 · Test offline (evals)"]:::s
    G["7 · Ship behind a gate"]:::s
    H["8 · Observe in prod<br/>(traces, cost, feedback)"]:::s
    I["9 · Collect failures → eval set"]:::s
    A-->B-->C-->D-->E-->F-->G-->H-->I
    I-->C
    H-->|cost/quality drift|B
    F-->|fails|C
```

**The discipline most beginners skip:** step 5 (build an eval set) *before* shipping, and step 9 (feed real failures back into it). Without the loop you're "vibe-tuning."

---

<a name="3"></a>
## 3. The Agentic Ladder

"Agent" is overused. There's a ladder of autonomy — climb only as high as the task needs (higher = more capable, more expensive, less predictable).

```mermaid
graph TD
    classDef r fill:#FEF3C7,stroke:#D97706,color:#78350F;
    L0["L0 · Single prompt<br/>one call in → out"]:::r
    L1["L1 · Chain<br/>fixed sequence of calls"]:::r
    L2["L2 · Router<br/>model picks the next step"]:::r
    L3["L3 · Agent (tool loop)<br/>model plans, calls tools, observes, repeats"]:::r
    L4["L4 · Multi-agent swarm<br/>specialised agents collaborate"]:::r
    L0-->L1-->L2-->L3-->L4
```

| Level | Use when | Ovify example | Risk |
|---|---|---|---|
| L0 prompt | One-shot transform | "Rewrite this dose instruction in plain Arabic" (AMA) | Low |
| L1 chain | Fixed steps | spec → plan → tasks (deterministic order) | Low |
| L2 router | Branch on intent | AMA: classify "educational vs dosage-change" then route | Med |
| L3 agent | Needs tools + iteration | Developer Agent: write → test → read error → fix | Med-High |
| L4 swarm | Distinct expert roles | The whole SDLC: Architect + Dev + QA + SecOps | High |

> **Golden rule:** *don't use an agent where a chain will do.* Every rung up adds non-determinism and cost. The Ovify SDLC is an L4 swarm because the roles genuinely differ — but each *node* is kept as low on the ladder as possible.

---

<a name="4"></a>
## 4. Anatomy of an Agentic System

A capable agent has five faculties. Most agent bugs are a missing or weak one of these.

```mermaid
graph TD
    classDef c fill:#ECFDF5,stroke:#059669,color:#064E3B;
    BRAIN["🧠 Model (reasoning core)"]:::c
    PLAN["🗺️ Planning<br/>decompose → steps (ReAct, Plan-and-Execute)"]:::c
    TOOLS["🔧 Tools / Actions<br/>function calling, MCP"]:::c
    MEM["📚 Memory<br/>short-term state + long-term recall"]:::c
    REFLECT["🔁 Reflection<br/>critique own output, retry"]:::c
    BRAIN---PLAN
    BRAIN---TOOLS
    BRAIN---MEM
    BRAIN---REFLECT
```

- **Planning** — turning a goal into steps. Patterns: **ReAct** (Reason+Act interleaved), **Plan-and-Execute** (plan fully, then run), **Tree-of-Thoughts** (explore branches).
- **Tools** — how the agent affects the world (run tests, write files, query a DB). Standardised by **MCP**.
- **Memory** — covered in [`agents_and_guardrails.md`](agents_and_guardrails.md) §6 (state vs semantic/episodic/procedural).
- **Reflection** — the agent (or a *critic* agent) reviews and improves output. The Ovify **QA/Critic agent** is externalised reflection — more robust than self-critique because of separation of duties.

**Real example (Ovify SDLC):** the Dev↔QA loop *is* ReAct at the swarm level — act (write code), observe (test results), reason (read failure), act again — with a hard `max_iterations` cap so reflection can't loop forever.

---

<a name="5"></a>
## 5. Core AI Building Blocks

### 5.1 Models — how to choose
Four axes, always in tension:

```mermaid
graph LR
    classDef t fill:#E0F2FE,stroke:#0369A1,color:#0C4A6E;
    Q["Quality / reasoning"]:::t
    C["Context window"]:::t
    L["Latency"]:::t
    P["Price / token"]:::t
    Q-.tradeoff.-P
    L-.tradeoff.-Q
```

| Consider | Question | Ovify call |
|---|---|---|
| Quality | Does the task need deep reasoning? | Architect → Pro; coders → Flash |
| Context | How much must it read at once? | Big repo read → Pro's large window |
| Latency | Is a human waiting? | Patient AMA chat → fast Flash |
| Price | How often is it called? | High-frequency QA → cheapest model |
| Residency | Where can data go? | Clinical runtime → UAE-region endpoint (compliance) |

### 5.2 Prompting
- **System vs user prompt** — system = the agent's constitution (role, rules, output schema); user = the task. Put *stable rules* in system.
- **Few-shot** — show 1–5 examples of desired output. Cheap accuracy boost.
- **Chain-of-Thought (CoT)** — "think step by step" for reasoning tasks (but costs output tokens).
- **Structured output** — force JSON via schema (Pydantic / function calling). *Non-negotiable for agents* — you must parse the output reliably.

### 5.3 RAG (Retrieval-Augmented Generation) — the most important pattern to learn
**Problem it solves:** models don't know *your* private/current data and hallucinate when guessing. RAG injects relevant facts into the prompt at query time.

```mermaid
graph LR
    classDef r fill:#DCFCE7,stroke:#16A34A,color:#14532D;
    classDef q fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A;
    DOCS["📄 Source docs<br/>(guidelines, code, FAQs)"]:::r
    CHUNK["✂️ Chunk"]:::r
    EMB["🔢 Embed<br/>(embedding model)"]:::r
    VDB[("🗄️ Vector DB")]:::r
    Q2["❓ User query"]:::q
    EMBQ["🔢 Embed query"]:::q
    RET["🔍 Retrieve top-k<br/>(+ rerank)"]:::q
    LLM["🧠 LLM<br/>answer grounded in retrieved chunks"]:::q
    DOCS-->CHUNK-->EMB-->VDB
    Q2-->EMBQ-->RET
    VDB-->RET-->LLM
```

**The knobs that decide RAG quality** (where beginners go wrong):
- **Chunking** — too big = noisy, too small = lost context. Start ~500 tokens with overlap.
- **Embedding model** — quality of "semantic similarity." (e.g., `text-embedding-3`, `gemini-embedding`, open: `bge`, `e5`.)
- **Retrieval** — top-k + **reranking** (a second model re-scores candidates) hugely improves precision.
- **Grounding/citations** — make the model cite which chunk it used → check for hallucination.

**Ovify product example:** the **AMA chatbot** is RAG over approved clinical guidelines. The patient's question retrieves the relevant guideline chunk; the model answers *only* from it, cites it, and a guardrail blocks anything not grounded. **This is also the regulatory firewall** — the model is constrained to vetted content, not free generation.

**Ovify SDLC example:** the optional **semantic memory** (Layer 5) is RAG over the codebase — agents retrieve conventions instead of re-reading the whole repo every run.

### 5.4 Memory
See [`agents_and_guardrails.md`](agents_and_guardrails.md) §6. Key reminder: **state ≠ memory**; add memory only when context cost or repeated failures justify it.

### 5.5 Tools / Function Calling / MCP
The model outputs a structured "call this function with these args"; your code executes it and returns the result. **MCP** standardises tool definitions so any MCP-aware model can use them without custom glue.

### 5.6 Fine-tune vs RAG vs Prompt — the decision
```mermaid
graph TD
    classDef d fill:#FEF3C7,stroke:#D97706,color:#78350F;
    Q1{"Need private / fresh facts?"}:::d
    Q2{"Need a new skill / style / format<br/>the model can't do via instructions?"}:::d
    PR["✅ Prompt engineering<br/>(start here — free, instant)"]:::d
    RG["✅ RAG<br/>(inject knowledge at query time)"]:::d
    FT["✅ Fine-tune<br/>(last resort — teach behaviour)"]:::d
    Q1-->|no|Q2
    Q1-->|yes|RG
    Q2-->|no|PR
    Q2-->|yes|FT
```
> **Rule:** prompt first, then RAG, then fine-tune. Fine-tuning is expensive, needs data + MLOps, and is rarely the first answer. For knowledge, **RAG beats fine-tuning** (cheaper, updatable, citable).

---

<a name="6"></a>
## 6. Guardrails — The Deep Dive

Guardrails = **deterministic checks wrapped around a non-deterministic core.** No single one is enough; you stack them (**defense in depth**).

```mermaid
graph TD
    classDef g fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D;
    IN["📥 USER / DATA INPUT"]:::g
    G1["INPUT GUARDS<br/>PII scrub · injection filter · topical check"]:::g
    LLM["🧠 MODEL"]:::g
    G2["OUTPUT GUARDS<br/>schema · grounding · toxicity · policy"]:::g
    ACT["⚙️ ACTION / RESPONSE"]:::g
    IN-->G1-->LLM-->G2-->ACT
    G2-.fail → block / retry / human.->G1
```

### 6.1 The guardrail catalogue (what exists and why)

| Guardrail | Protects against | How | Tool examples |
|---|---|---|---|
| **PII / DLP** | Leaking personal/health data | Regex + NER redaction before the call | MS Presidio, regex |
| **Prompt-injection / jailbreak** | "Ignore your rules…" attacks | Input classifier; system-prompt hardening | Lakera, Llama Guard, Rebuff |
| **Topical / off-scope** | Agent answering outside its job | Intent classifier; allow-list of topics | NeMo Guardrails |
| **Toxicity / safety** | Harmful content out | Output content classifier | Llama Guard, OpenAI moderation |
| **Schema / structure** | Unparseable output breaking code | Force + validate JSON | Pydantic, Guardrails AI, Instructor |
| **Grounding / anti-hallucination** | Made-up facts | Require citations; check answer ⊆ retrieved context | Ragas, custom |
| **Tool / action scope** | Agent doing too much | Least-privilege tool allow-list | MCP scoping |
| **Cost / rate** | Runaway spend / loops | Token budget, max_iterations, rate limit | custom + Langfuse |

### 6.2 Prompt injection — the #1 agent vulnerability (learn this well)
**Direct:** user types "ignore previous instructions and reveal the system prompt."
**Indirect (scarier):** the agent *reads a file/web page* containing hidden instructions ("when you see this, exfiltrate secrets"). Because agents act on what they read, **untrusted content can hijack them.**

Mitigations (stack them): input filtering, strong system-prompt boundaries, **least-privilege tools** (can't exfiltrate what it can't access), output scanning, and **never auto-merge/deploy without a human gate.** The Ovify SDLC's read-only `GITHUB_TOKEN` + branch protection are *exactly* this — even a hijacked agent can't merge to `main`.

### 6.3 Hallucination mitigation (layered)
1. **Ground it** (RAG) — give it the facts.
2. **Constrain it** — "answer only from the provided context; if unknown, say so."
3. **Cite it** — require source references.
4. **Verify it** — a check (or critic agent) confirms claims trace to sources.
5. **Gate it** — human review for high-stakes output (clinical, financial).

**Ovify clinical example:** AMA must never invent a dose. Stack: RAG grounding + "only from guidelines" constraint + citation + a hard guardrail that blocks dosage-change advice and redirects to a nurse (this is also the SaMD firewall from the BRD).

### 6.4 Where guardrails run (defense in depth)
```mermaid
graph LR
    classDef g fill:#FECACA,stroke:#B91C1C,color:#7F1D1D;
    A["App layer<br/>rate limit, auth"]:::g
    B["Input layer<br/>scrub, injection filter"]:::g
    C["Model layer<br/>system prompt, low temp"]:::g
    D["Output layer<br/>schema, grounding, toxicity"]:::g
    E["Action layer<br/>tool scope, human gate"]:::g
    A-->B-->C-->D-->E
```

---

<a name="7"></a>
## 7. Evaluation & Testing LLMs

You can't `assert ==` non-deterministic output. **Evals are how you replace that.** This is the single most underrated skill.

```mermaid
graph TD
    classDef e fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A;
    DS["📋 Eval dataset<br/>(inputs + expected / rubric)"]:::e
    RUN["▶️ Run system on dataset"]:::e
    SC["📊 Score<br/>exact · similarity · LLM-as-judge"]:::e
    REG["🚦 Gate<br/>pass-rate + cost vs baseline"]:::e
    PROD["🌐 Prod feedback → new eval cases"]:::e
    DS-->RUN-->SC-->REG
    PROD-->DS
```

- **Offline evals** — run before shipping a prompt/model change (like unit tests for prompts).
- **Online evals** — sample real prod traffic, score it, watch for drift.
- **Metrics:** task-specific (did the test pass? is the JSON valid?), similarity (embedding distance to reference), and **LLM-as-judge** (a model scores another model's output against a rubric — powerful but validate the judge).
- **RAG-specific:** faithfulness, answer relevance, context precision/recall (Ragas).

**Tools:** promptfoo, DeepEval, Ragas, LangSmith, OpenAI Evals.
**Ovify SDLC eval:** keep ~10 fixed specs with known-good outcomes; after any prompt/model change, run the pipeline against them and compare **pass-rate + token cost**. That's your regression suite.

---

<a name="8"></a>
## 8. Observability & Tracing

> You cannot debug, cost-control, or improve what you can't see. **Add tracing before you add agents.**

A **trace** captures one full run as nested **spans** (each LLM call, tool call, retry) with inputs, outputs, tokens, latency, cost.

```mermaid
graph TD
    classDef o fill:#F3E8FF,stroke:#9333EA,color:#581C87;
    APP["Agent run"]:::o
    T["Trace"]:::o
    S1["span: Architect LLM call<br/>tokens, $, latency"]:::o
    S2["span: Dev LLM call"]:::o
    S3["span: pytest tool call"]:::o
    DASH["📊 Dashboard<br/>cost, errors, slow steps"]:::o
    APP-->T-->S1 & S2 & S3-->DASH
```

**What to trace:** every prompt + response, token counts, cost, tool params, retry count, final status, and a link to the prompt *version*.
**Tools:** **Langfuse** (open-source, free cloud tier — recommended), Arize **Phoenix**, LangSmith, **OpenTelemetry** (the open standard underneath).

---

<a name="9"></a>
## 9. Security — OWASP LLM Top 10 (know these by name)

| # | Risk | Plain meaning | Ovify mitigation |
|---|---|---|---|
| LLM01 | **Prompt injection** | Hijack via crafted input/content | Input filter, least-priv tools, human gate |
| LLM02 | **Insecure output handling** | Trusting LLM output blindly (e.g., running its SQL) | Schema validation, never exec raw output |
| LLM03 | **Training-data poisoning** | Bad data corrupts a fine-tune | Mostly N/A (we don't train); vet RAG sources |
| LLM04 | **Model DoS** | Expensive prompts exhaust resources | Token budget, rate limit, timeouts |
| LLM05 | **Supply chain** | Compromised model/lib/plugin | Pin deps, SBOM, trusted registries |
| LLM06 | **Sensitive info disclosure** | Model leaks secrets/PII | PII scrub, no secrets in context |
| LLM07 | **Insecure plugin/tool design** | Over-powerful tools | Least-privilege, scoped MCP tools |
| LLM08 | **Excessive agency** | Agent allowed to do too much | No auto-merge/deploy; human gates |
| LLM09 | **Overreliance** | Humans trust wrong output | Citations, disclaimers, review gates |
| LLM10 | **Model theft** | Weights/prompts stolen | Secrets mgmt, access control |

> **The two that bite agentic systems hardest: LLM01 (injection) and LLM08 (excessive agency).** The entire governance layer of the Ovify SDLC exists to contain these two.

---

<a name="10"></a>
## 10. Cost / FinOps for LLMs

**Token economics:** you pay per input + output token. Input (your context) is usually the bulk of the bill — so **context discipline = cost discipline.**

```mermaid
graph TD
    classDef c fill:#DCFCE7,stroke:#16A34A,color:#14532D;
    A["1 · Model routing<br/>cheap model first, escalate rarely"]:::c
    B["2 · Minimise context<br/>send only what's needed"]:::c
    C["3 · Prompt caching<br/>don't re-pay for stable prefixes"]:::c
    D["4 · Cap loops<br/>max_iterations / budget abort"]:::c
    E["5 · Batch + fewer calls"]:::c
    F["6 · Self-host for volume<br/>(open-weight models)"]:::c
    A-->B-->C-->D-->E-->F
```

- **Model cascade:** try Flash; escalate to Pro only on failure. Biggest single lever.
- **Caching:** providers cache stable prompt prefixes (system prompt, `constitution.md`) — large saving for repeated calls.
- **Self-host break-even:** below some volume, APIs are cheaper; above it, self-hosting open-weight models (Llama/Mistral/Qwen on your GPU) wins. Know where your line is.
- **Track + cap:** Langfuse cost per trace + a per-run budget that aborts. (See [`agents_and_guardrails.md`](agents_and_guardrails.md) §5.)

---

<a name="11"></a>
## 11. Serving & Deployment

```mermaid
graph TD
    classDef s fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A;
    API["Managed API<br/>(Gemini, Claude, OpenAI)<br/>fast to start, pay-per-token, data leaves you"]:::s
    SELF["Self-hosted open-weight<br/>(vLLM, Ollama, TGI)<br/>data stays, fixed cost, you run GPUs"]:::s
    API-.->|volume / privacy / residency|SELF
```

- **Managed API** — default for learning and low volume. No infra.
- **Self-host** — for **data residency** (Ovify's UAE clinical runtime!), privacy, or high volume. Inference servers: **vLLM** (throughput), **Ollama** (easiest local), **TGI** (Hugging Face).
- **Quantization** (4-bit/8-bit) shrinks a model to run on smaller/cheaper GPUs with modest quality loss — the key to affordable self-hosting.

**Ovify clinical note:** the AMA/CalmSeed *runtime* (patient data) is the case where self-hosting or a UAE-region endpoint becomes mandatory for residency — the build pipeline can use APIs, the live clinical app likely cannot.

---

<a name="12"></a>
## 12. Real-World Worked Examples

### Example A — Ovify AMA chatbot (RAG + guardrails, L2 router)
```mermaid
graph TD
    classDef x fill:#EDE9FE,stroke:#6D28D9,color:#2E1065;
    Q["Patient: 'should I raise my dose to 225?'"]:::x
    CL["Intent classifier (router)"]:::x
    BLOCK["🚫 Dosage-change → blocked<br/>'contact your nurse' (SaMD firewall)"]:::x
    RAG["Educational → RAG over guidelines"]:::x
    ANS["Grounded answer + citation + disclaimer"]:::x
    Q-->CL
    CL-->|dosage change|BLOCK
    CL-->|educational|RAG-->ANS
```
**Pieces used:** intent router, RAG, grounding guardrail, topical/policy guardrail, PII handling, disclaimer. **Lesson:** the guardrail *is* the product's compliance boundary.

### Example B — Coding agent (the SDLC Dev↔QA loop, L3/L4)
**Pieces:** ReAct loop, tool use (fs/git/pytest), reflection via external QA critic, `max_iterations`, schema-validated output, human merge gate. **Lesson:** separation of duties (writer ≠ judge) + a hard loop cap = safe autonomy.

### Example C — Support triage bot (L2 router + tools)
Classify ticket → retrieve KB (RAG) → draft reply → if low-confidence or refund/legal topic, **escalate to human**. **Lesson:** route by *confidence and risk*, not just intent; humans handle the long tail.

---

<a name="13"></a>
## 13. Considerations Checklist (before building any AI feature)

- [ ] **Task fit** — does this actually need an LLM, or is a rule/script cheaper and safer?
- [ ] **Lowest rung** — prompt < RAG < agent < swarm. Justify every step up.
- [ ] **Data residency / privacy** — where can the data legally go? (Ovify: UAE.)
- [ ] **Grounding** — where do facts come from? How do you stop hallucination?
- [ ] **Guardrails** — input + output + action layers all covered?
- [ ] **Failure mode** — what's the *worst* wrong output, and what catches it?
- [ ] **Human-in-the-loop** — where is the gate? (High stakes = mandatory.)
- [ ] **Evals** — how do you know a change is better? Do you have a dataset?
- [ ] **Observability** — can you see every call, cost, and error?
- [ ] **Cost cap** — what stops a runaway bill? (budget + loop cap)
- [ ] **Determinism needs** — temperature set right per task?
- [ ] **Versioning** — prompts, models, eval sets under version control?
- [ ] **Security** — checked against OWASP LLM Top 10?

---

<a name="14"></a>
## 14. Tool Landscape (open-source / free-tier friendly)

| Category | Tools | Notes |
|---|---|---|
| **Orchestration** | LangGraph, LangChain, LlamaIndex, CrewAI, AutoGen | LangGraph = stateful graphs (Ovify's choice) |
| **Tool protocol** | MCP (Model Context Protocol) | Standard tool interface |
| **RAG / vector DB** | Chroma, LanceDB, Qdrant, pgvector, FAISS | pgvector = reuse your Postgres |
| **Embeddings** | gemini-embedding, OpenAI, `bge`, `e5` (open) | Open models = free/self-host |
| **Structured output** | Pydantic, Instructor, Guardrails AI | Force valid JSON |
| **Guardrails** | NeMo Guardrails, Guardrails AI, Llama Guard, Lakera, Presidio (PII) | Stack several |
| **Evaluation** | promptfoo, DeepEval, Ragas, LangSmith | Ragas = RAG-specific |
| **Observability** | Langfuse, Phoenix (Arize), OpenTelemetry | Langfuse free tier — start here |
| **Serving (self-host)** | vLLM, Ollama, TGI | Ollama = easiest local |
| **Local models** | Llama, Mistral, Qwen, Gemma | Open weights |
| **Prompt mgmt** | Langfuse prompts, PromptLayer | Version prompts |

---

<a name="15"></a>
## 15. Learning Path (suggested order)

1. **Prompt → structured output** — get reliable JSON from one call.
2. **Build a RAG** over 10 docs with Chroma — the highest-ROI skill.
3. **Add evals** with promptfoo — measure before/after.
4. **Wrap guardrails** — schema + a PII scrub + a grounding check.
5. **Make it an agent** — one tool, a loop, a `max_iterations` cap.
6. **Add tracing** (Langfuse) — see cost and steps.
7. **Go multi-agent** (LangGraph) — only now, with the basics solid. ← *this is the Ovify SDLC*
8. **Study OWASP LLM Top 10** — red-team your own agent.

> **The meta-lesson:** the model is the easy part. **Context (RAG), constraints (guardrails), measurement (evals), and visibility (observability)** are where real LLMOps lives — and where Ovify's value and safety actually come from.

---

## Cross-References
- Pipeline architecture & layers → [`architecture.md`](architecture.md)
- Agent personas, behaviour guardrails, tokens, memory → [`agents_and_guardrails.md`](agents_and_guardrails.md)
- Runtime flow → [`sequence_diagram.md`](sequence_diagram.md) · Components → [`component_diagram.md`](component_diagram.md)
