# Spec-Kit Agent Swarm Constitution
This constitution defines the mandatory architectural rules, regulatory constraints, and safety guardrails that all autonomous agents must adhere to during the SDLC process for **Ovify**.

---

## 1. Technical & Architectural Boundaries

* **Frontend Framework:** Plain HTML/JS/CSS (Vanilla) or TailwindCSS (if explicitly requested). Keep components clean, lightweight, and structured as a Progressive Web App (PWA).
* **Backend Framework:** FastAPI (Python) or serverless backend APIs.
* **Database Engine:** **Azure Database for PostgreSQL (Flexible Server)**. 
  * Relational tables must be used for scheduling cycle protocols, dose logs, and timing windows.
  * *Rule:* Do not write document-store or NoSQL schemas (e.g. Cosmos DB) unless explicitly authorized by a human architect.
* **Infrastructure Provisioning:** **Terraform**. All cloud resources must be declared as Infrastructure as Code. No manual resources may be created in the Azure portal.

---

## 2. Regulatory & Compliance Gating (UAE MOHAP/DHA)

* **Data Residency:** All database instances and storage holding user records must reside within the **UAE Azure Region (UAE North - Dubai)** to comply with UAE Federal Decree-Law No. 2 of 2019 (Health Data Law).
* **PII/PHI Shield:** No real patient health records, names, Emirates IDs, or medical files may be committed to the repository or included in testing fixtures.
  * All agents must run synthetic data checks. 
  * Prompt payloads containing application logs must pass through the local PII regex scrubber before being sent to the Gemini API.

---

## 3. Security Guardrails

* **Credential Management:** Raw cloud credentials (such as Azure Client Secrets, passwords, or connection strings) must **never** be written into code, config files, or GitHub repository variables.
* **Authentication:** Ephemeral runners must authenticate with Azure keylessly using **OpenID Connect (OIDC)** federated trust.
* **Merge Gate:** The Developer Agent must only open Pull Requests (PRs). Under no circumstances may an agent attempt to push code directly to `main` or merge a PR without human authorization.
* **Infrastructure Scans:** Before any Terraform deployment is executed, the SecOps Agent must scan the workspace files using **Checkov** or **Trivy**. Any high or critical severity finding blocks deployment automatically.

---

## 4. Cost & Execution Discipline

* **Model Routing:** 
  * High-reasoning tasks (spec analysis, architecture plan generation) are routed to **Gemini Pro**.
  * File generation, unit test creation, linting fixes, and QA analysis are routed to **Gemini Flash**.
* **Loop Limits:** 
  * Dev-QA loop iteration limit is capped at `max_iterations = 3`.
  * LLM JSON parsing auto-fix retry is capped at `max_parse_retries = 2`.
* **Resource Optimization:** Keep database tiers on the Burstable (B1ms) tier in non-production environments to minimize cloud spending.

---

## 5. UI/UX Style & Brand Consistency (Ovify Patient PWA)

To prevent fragmented designs across multiple screens, all future UI/UX creations must strictly conform to these exact visual design tokens:
* **Color Palette:**
  * Background: Ivory `#F8F5F1`
  * Card Surfaces: White `#FFFFFF`
  * Text/Navy Card Bases: Navy `#13233C` (and its opacities: `--navy-70`, `--navy-55`, `--navy-10`)
  * Accents: Lavender `#9E8CEF` (`--lav-dark: #6F5AD1`, `--lav-mid: #7E6BD3`, `--lav-soft: rgba(158,140,239,0.13)`)
  * Secondary Accents: Blush `#F4A0A0` (`--blush-soft: rgba(244,160,160,0.16)`)
  * Status (Taken/Green): Sage `#3E8E6E` (`--sage-soft: rgba(62,142,110,0.13)`)
  * Alert (Due/Red): Red `#C24C57` (`--due-soft: rgba(194,76,87,0.12)`)
* **Typography:**
  * Headings (`h1`, `h2`, `h3`): `DM Sans` (Weights 400, 500, 600, 700)
  * Body Text: `Manrope` (Weights 400, 500, 600)
  * Data/Labels/Timestamps: `Inter` (Weights 400, 500, 600, 700)
* **Visual Theme & Assets:**
  * Logo mark: Must load the official logo from `/static/logo.png`.
  * Cards: Border radius is set to 24px (`--r-xl`), 18px (`--r-lg`), and 12px (`--r-md`).
  * Tabbar / sticky headers: Frosted glass theme using `backdrop-filter: blur(14px)` with high-contrast text.
  * Accessibility: Maintain high contrast (e.g. no light lavender text directly on white/ivory surfaces), full ARIA labels on buttons, and active media queries honoring `prefers-reduced-motion` to neutralize count-ups or loops for motion-sensitive users.

---

## 6. Directory Isolation & Website Restriction

* **Only the App (FastAPI backend and root-level PWA files) may be modified by autonomous agents.**
* **CRITICAL RULE:** Do not make any edits, deletions, or additions to files in the `website/` folder. All marketing homepage elements are locked; any changes to the public website require prior explicit approval from the Product Owner.
