# Agentic SDLC Pipeline Component Diagram
This document contains the component diagram representing the logical structure, interfaces, dependencies, and step-by-step connectivity of the Agentic SDLC pipeline.

---

## 1. Component & Connectivity Diagram

The diagram below details the interfaces and connectivity between each system block, color-coded by architectural layer. Connector lines are annotated with the corresponding execution step number (1–23):

```mermaid
graph TD
    %% Subgraphs & Layers
    subgraph Layer1 ["💻 Layer 1: Developer Workstation"]
        DevIDE["IDE [Code/Spec Editor]"]
        SpecCLI["Spec-Kit CLI [specify-cli]"]
        LocalGit["Git Client [Git Client CLI]"]
    end

    subgraph Layer2 ["🐙 Layer 2: GitHub Cloud Control Plane"]
        Repo["GitHub Repo [PRs & Branches]"]
        gitleaks["gitleaks [Secret Scanner]"]
        Dependabot["Dependabot [CVE Auditor]"]
        BranchProt["Branch Rules [Merge Blocker]"]
        
        subgraph RunnerVM ["🤖 Actions Runner VM"]
            VM_Shell["Runner Shell [Bash/Python]"]
            StatePersistence["State Manager [Artifacts Store]"]
            OrchNode["LangGraph Engine [orchestrator.py]"]
            
            subgraph Agents ["🤖 Agent Swarm Nodes"]
                ArchAgent["Architecture Agent [Plan Maker]"]
                DevAgent["Developer Agent [Code Writer]"]
                QAAgent["QA/Critic Agent [Validator]"]
                SecOpsAgent["SecOps Agent [IaC Auditor]"]
            end
        end

        EnvGate["Environment Gate [OIDC Gate]"]
    end

    subgraph Layer3 ["🧠 Layer 3: LLM & Guardrail Services"]
        PII_Scrub["PII Redactor [Regex DLP]"]
        GeminiPro["Gemini Pro [AI Planning]"]
        GeminiFlash["Gemini Flash [AI Code/QA]"]
        PydanticGuard["Pydantic Guard [JSON Validator]"]
    end

    subgraph Layer4 ["☁️ Layer 4: Azure Target Deployments"]
        OIDC_Auth["OIDC Authenticator [Federated Trust]"]
        Terraform["Terraform [IaC Engine]"]
        SWA["Azure SWA [Static Web App]"]
        Postgres["Azure Postgres [Relational DB]"]
        Vault["Azure Key Vault [Secret Store]"]
    end

    subgraph Layer5 ["📊 Layer 5: Observability & Memory — PHASE 2 / OPTIONAL"]
        Langfuse["Langfuse [Trace + Token/Cost Tracker]"]
        CostGuard["Budget Guard [per-run token cap → abort]"]
        VectorMem["Vector Store [Semantic Memory · RAG · Chroma/LanceDB]"]
        EpisodicMem["Episodic Log [past runs / failures]"]
    end

    %% Component Stylings
    style Layer1 fill:#F5F3FF,stroke:#8B5CF6,stroke-width:2px,color:#2E1065
    style Layer2 fill:#FFFBEB,stroke:#D97706,stroke-width:2px,color:#78350F
    style Layer3 fill:#F0FDF4,stroke:#16A34A,stroke-width:2px,color:#14532D
    style Layer4 fill:#EFF6FF,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    style Layer5 fill:#FAF5FF,stroke:#9333EA,stroke-dasharray: 6 4,stroke-width:2px,color:#581C87

    classDef comp fill:#DDD6FE,stroke:#6D28D9,stroke-width:2px,color:#2E1065;
    classDef ghComp fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef agentComp fill:#ECFDF5,stroke:#059669,stroke-width:2px,color:#064E3B;
    classDef llmComp fill:#E0F2FE,stroke:#0369A1,stroke-width:2px,color:#0C4A6E;
    classDef azureComp fill:#FFEDD5,stroke:#EA580C,stroke-width:2px,color:#7C2D12;
    classDef futureComp fill:#F3E8FF,stroke:#9333EA,stroke-dasharray: 5 3,stroke-width:2px,color:#581C87;

    class DevIDE,SpecCLI,LocalGit comp;
    class Repo,gitleaks,Dependabot,BranchProt,VM_Shell,StatePersistence ghComp;
    class OrchNode,ArchAgent,DevAgent,QAAgent,SecOpsAgent agentComp;
    class PII_Scrub,GeminiPro,GeminiFlash,PydanticGuard llmComp;
    class OIDC_Auth,Terraform,SWA,Postgres,Vault azureComp;
    class Langfuse,CostGuard,VectorMem,EpisodicMem futureComp;

    %% Dependencies and Steps (Connectivity)
    DevIDE -->|1. spec.md file| SpecCLI
    SpecCLI -->|2. specify validate| LocalGit
    LocalGit -->|3. git push| Repo
    
    Repo -->|4. Webhook Trigger| VM_Shell
    Repo -->|5. Static Audits| gitleaks & Dependabot
    Repo --- BranchProt
    
    VM_Shell -->|6. git checkout / env setup| StatePersistence
    StatePersistence -->|7. Load checkpointer| OrchNode
    
    OrchNode -->|8. Manage Lifecycle| ArchAgent & DevAgent & QAAgent & SecOpsAgent
    
    ArchAgent -->|9. Raw prompt| PII_Scrub
    DevAgent -->|9. Raw prompt| PII_Scrub
    QAAgent -->|9. Raw prompt| PII_Scrub
    SecOpsAgent -->|9. Raw prompt| PII_Scrub
    
    PII_Scrub -->|10. Clean prompt| GeminiPro
    PII_Scrub -->|11. Clean prompt| GeminiFlash
    
    GeminiPro & GeminiFlash -->|12. Raw JSON| PydanticGuard
    PydanticGuard -->|13. Typed Dict| OrchNode
    
    QAAgent -->|14. Execute CLI tests| VM_Shell
    VM_Shell -->|15. Check iteration| OrchNode
    OrchNode -->|16. Retry feedback| DevAgent
    
    DevAgent -->|17. Create PR| Repo
    SecOpsAgent -->|18. Checkov logs| EnvGate
    
    EnvGate -->|19. OIDC exchange request| OIDC_Auth
    OIDC_Auth -->|20. Fetch config secrets| Vault
    OIDC_Auth -->|21. terraform apply| Terraform
    Terraform -->|22. API deploy call| SWA & Postgres
    
    OrchNode -->|23. Save State file| StatePersistence

    %% Phase 2 / Optional connectivity (dashed = not in MVP)
    GeminiPro -.->|24. Emit token+cost trace| Langfuse
    GeminiFlash -.->|24. Emit token+cost trace| Langfuse
    Langfuse -.->|25. Running cost total| CostGuard
    CostGuard -.->|26. Abort run if over budget| OrchNode
    VectorMem -.->|27. Inject codebase context| ArchAgent
    EpisodicMem -.->|28. 'last time this failed...'| QAAgent
    OrchNode -.->|29. Append run summary| EpisodicMem
```

> **Dashed Layer 5 = Phase 2 / optional.** Build the solid path (steps 1–23) first. Add token/cost tracking (24–26) early — it is cheap and high-value. Add memory (27–29) only when context cost or repeated failures justify it (see [`agents_and_guardrails.md`](agents_and_guardrails.md) §6).

---

## 2. Component Interface Definitions

### Layer 1: Developer Workstation
* **Developer IDE:** Main text interface (VS Code / Cursor) where developer writes specifications in `.spec-kit/spec.md`.
* **Spec-Kit CLI:** Command Line executable that parses the local spec, compares it against `/constitution.md` schemas, and blocks commit triggers if specs are malformed.
* **Local Git Client:** Handles SSH pushes to GitHub repository.

### Layer 2: GitHub Cloud Control Plane
* **GitHub Repository:** The central host for PR triggers, branch controls, and pipeline logs.
* **GitHub Actions Runner VM:** Ephemeral container host executing tasks, installing dependencies, and compiling logs.
* **LangGraph Engine:** Python state chart manager (`orchestrator.py`) maintaining graph boundaries and routing loop execution.
* **Agent Nodes:** Stateless Python execution functions defining task behavior for each individual SDLC role.
* **State Manager:** Integrates with GitHub Runner artifacts (or Azure Blob Store) to load and save `SDLCState` JSON snapshots.

### Layer 3: LLM & Guardrail Services
* **PII Redactor:** Sanitization pipeline running string replacement regex rules on LLM payloads to prevent data leakage.
* **Gemini Pro Model:** Advanced planning model accessed via the Google Generative AI SDK, handling architectural decisions.
* **Gemini Flash Model:** High-throughput model handling direct code writing, compilation debug analysis, and QA logs parsing.
* **Pydantic Guard:** Validation script executing type assertions and checking for JSON injection issues.

### Layer 4: Azure Target Deployments
* **OIDC Authenticator:** Establishes trusted keyless identity federation via OpenID Connect to provision credentials dynamically.
* **Terraform Engine:** System provisioning compiler executing `terraform plan` and `apply`.
* **Target Services (SWA, PostgreSQL):** Live production application hosting database connections and Progressive Web App endpoints.

### Layer 5: Observability & Memory (Phase 2 / Optional)
*Dashed in the diagram — not part of the MVP pipeline. See [`agents_and_guardrails.md`](agents_and_guardrails.md) §5–§6.*
* **Langfuse:** Traces every LLM call with token counts and cost; the foundation for cost management and debugging the swarm. *Add early — cheap, high value.*
* **Budget Guard:** Reads the running cost total and **aborts the run** if a per-run token/$ budget is exceeded — the cost equivalent of the `max_iterations` guard.
* **Vector Store (Semantic Memory):** RAG index of the codebase (conventions, structure, glossary) so agents don't re-learn the project every run. *Add when context cost grows.*
* **Episodic Log:** Summaries of past runs/failures so agents avoid repeating mistakes. *Add when failures recur.*
