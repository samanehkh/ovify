# Agentic SDLC Pipeline Sequence Diagram
This document contains the sequence diagram representing the runtime interactions and security boundaries of the Agentic SDLC pipeline.

---

## 1. Sequence Flow Diagram

The diagram below details the communication flow between the **Human Developer**, **Local CLI**, **GitHub Runner Control Plane**, **LangGraph Swarm Nodes**, **Gemini API**, and **Azure Deploy Target**:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as 💻 Human Developer
    participant Local as 🛠️ Spec-Kit CLI
    participant GH as 🐙 GitHub Repo / Workflow
    participant Orch as 🤖 LangGraph Orchestrator
    actor Arch as 📐 Architecture Agent (Pro)
    actor Coder as 💻 Developer Agent (Flash)
    actor QA as 🔎 QA / Critic Agent (Flash)
    actor SecOps as 🛡️ SecOps Agent (Flash)
    participant Azure as ☁️ Azure Cloud Target

    %% Phase 1: Local Loop (Purple Background)
    rect rgb(245, 243, 255)
        Note over Dev, Local: Phase 1: Local Specification
        Dev->>Local: Write spec.md & run `specify validate`
        Local-->>Dev: "Spec structure validated (OK)"
        Dev->>GH: "git push (Staging branch & PR)"
    end

    %% Phase 2: Swarm Launch (Amber Background)
    rect rgb(255, 251, 235)
        Note over GH, Orch: Phase 2: Workflow Trigger & Swarm Init
        GH->>GH: "Trigger Actions Runner VM (timeout-minutes guard active)"
        GH->>GH: "Run gitleaks & Dependabot scans (fail-fast on secret/CVE)"
        GH->>Orch: Restore SDLCState & Launch Python process
        Orch->>Orch: "Initialise per-run token/cost budget (abort if exceeded)"
    end
    
    %% Phase 3: Planning (Light Green Background)
    rect rgb(240, 253, 244)
        Note over Orch, Arch: Phase 3: Architectural Planning
        Orch->>Arch: "Trigger Architecture Node (Passes spec.md)"
        Arch->>Arch: Scrub PII from payload
        Arch->>Arch: Query Gemini Pro & Parse JSON with Pydantic
        Arch-->>Orch: Returns plan.md & tasks.md
    end
    
    %% Phase 4: Implementation Loop (Mint/Teal Background)
    rect rgb(236, 253, 245)
        Note over Orch, QA: Phase 4: Iterative Implementation & QA Loop
        loop "Dev-QA Cycle (until passed OR iteration >= max_iterations=3)"
            Orch->>Coder: "Trigger Developer Node (Passes ONLY relevant slice of tasks.md)"
            Note right of Coder: Input guard: PII scrub + token-budget check
            Coder->>Coder: "Query Gemini Flash (temp≈0.2)"
            Coder-->>Orch: "Returns code (Pydantic-validated; bad JSON → auto-fix, max 2)"
            Orch->>QA: "Trigger QA Node (Passes code & test scripts)"
            QA->>QA: "Execute pytest & eslint in VM Shell (temp=0)"
            alt Tests Fail AND iteration < max
                QA-->>Orch: "Returns logs, critic_feedback, iteration++"
                Orch->>Coder: Route back to Developer Agent for fix
            else Tests Fail AND iteration == max
                QA-->>Orch: "status='failed' — halt gracefully, persist logs for human"
            else Tests Pass
                QA-->>Orch: "Returns Success (passed: true)"
            end
        end
    end
    
    %% Phase 5: Gating & Deploy (Blue Background)
    rect rgb(239, 246, 255)
        Note over Orch, Azure: Phase 5: Security Gates & Azure Deployment
        Coder->>GH: Open Pull Request with approved code
        Orch->>SecOps: "Trigger SecOps Node (Passes Terraform IaC)"
        SecOps->>SecOps: Run Checkov static analysis scan
        SecOps-->>Orch: IaC validation passed
        Orch->>GH: Pause run & request Human Environment Approval
        Dev->>GH: Approve production environment deployment
        GH->>Azure: "OIDC handshake (exchange JWT for Azure token)"
        GH->>Azure: "Run `terraform apply` (Deploy SWA & PostgreSQL)"
        Azure-->>GH: Cloud infrastructure provisioned successfully
        Orch->>GH: Persist final SDLCState to Workflow Artifacts
        GH-->>Dev: "PR marked ready for merge (Status: green)"
    end
```

---

## 2. Phase-by-Phase Technical Details

### Phase 1: Local Specification (Purple Block)
* **Goal:** Verify specification syntax prior to executing cloud resources.
* **Flow:** The developer writes functional requirements in `.spec-kit/spec.md`. The local CLI (`specify validate`) checks alignment against `.spec-kit/constitution.md`. Committing code triggers the PR.

### Phase 2: Workflow Trigger & Swarm Init (Amber Block)
* **Goal:** Spin up build containers and enforce early security checks.
* **Flow:** GitHub triggers the runner VM, executes static checks (`gitleaks` and `Dependabot`), pulls down the last cached state of the `SDLCState` dict from GitHub artifacts, and initializes the Python orchestrator script.

### Phase 3: Architectural Planning (Green Block)
* **Goal:** Establish implementation blueprints.
* **Flow:** The Orchestrator calls the Architecture node. Prompt content is filtered for PII before calling **Gemini Pro**. The output is validated against Pydantic models and saved as `plan.md` and `tasks.md`.

### Phase 4: Iterative Dev-QA Loop (Teal Block)
* **Goal:** Write code and verify logic stability.
* **Flow:** The Coder node writes code using **Gemini Flash**. The QA node executes tests in the runner environment. Errors route back to the Coder for up to `max_iterations` (3) attempts.
* **Guardrails active here:** input PII scrub + token-budget check before each call; Pydantic validation (with capped auto-fix) on output; separation of duties (QA cannot edit code); on the final failed iteration the graph **halts gracefully with logs** rather than being killed by the wall-clock timeout. See [`agents_and_guardrails.md`](agents_and_guardrails.md) §3–§4.

### Phase 5: Gating & Azure Deployment (Blue Block)
* **Goal:** Securely deploy verified code to target services.
* **Flow:** Developer Agent submits a PR. SecOps Agent scans IaC using Checkov. GitHub Actions blocks execution at the protected Environment Gate until manually approved by a human. The runner uses Federated OIDC tokens to deploy SWA and PostgreSQL via Terraform, saves the final state, and marks the workflow complete.
