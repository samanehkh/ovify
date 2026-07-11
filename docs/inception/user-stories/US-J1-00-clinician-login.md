# US-J1-00: Clinician Authentication (Tablet)

| Field | Value |
|---|---|
| **Journey** | J1 — Clinic Patient Registration |
| **Persona(s)** | P3 Mona (primary) |
| **Primary intent** | Log into the B2B portal using unique credentials to secure session actions. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-11 |

## 1. User story
> As **Mona (the clinic nurse)**, I want to **securely log into the Ovify B2B portal on our clinic tablet using my personal email and password**, so that **all my patient registrations and dashboard updates are logged under my name for clinical audit compliance.**

## 2. Context & entry
- **Entry point:** App boot or when a session expires. Displays a full-screen card on the tablet.
- **Preconditions:** Active internet connectivity.
- **Exit:** Redirects to the Triage Dashboard (`US-J8-01`).

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Successful clinician login
  Given Mona is on the Clinician Login Screen
  When she inputs her registered email "mona.nurse@clinic.ae" and password "SecurePassword123"
  And taps "Login"
  Then the system validates her credentials
  And sets her clinician session header key (X-Clinician-Key)
  And redirects her to the Triage Dashboard
  And greets her: "Welcome back, Mona"

Scenario: Invalid credentials entered
  Given Mona inputs an incorrect password
  When she taps "Login"
  Then the system denies access (HTTP 401)
  And shows an inline error: "Invalid email or password. Please try again."
  And clears the password field

Scenario: Session auto-locks after inactivity
  Given Mona has been inactive on the tablet for 30 minutes
  When the app background worker checks activity
  Then the session is cleared
  And the app locks and redirects to the Login screen with message: "Session expired for security. Please log in again."
```

## 4. Screen states
| State | Trigger | What the user sees |
|---|---|---|
| **ready / default** | Default load | Clinic Logo (`/static/logo.png`), Email and Password text inputs, "Login" button. |
| **submitting** | Login tapped | Button shows spinner + "Authenticating..."; inputs disabled. |
| **success** | 2xx validated | Brief slide-out transition to the Triage Dashboard. |
| **error (recoverable)** | 401 Unauthorized | Inline warning: "Invalid email or password. Please try again." |
| **offline / error** | No connectivity | "You must be online to access the clinician portal. Please check your clinic Wi-Fi." |

## 5. Data contract
- **Endpoint:** `POST /api/clinician/login` — auth: **none (public B2B)**.
- **Request:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response 200:**
  ```json
  {
    "token": "string",
    "nurse_name": "Mona",
    "role": "coordinator"
  }
  ```
- **Error Responses:**
  *   `401` -> Show invalid credentials error.
  *   `500` -> "Server unreachable. Please try again."

## 6. Field-level detail
| Field | Kind | Type / format | Required | Validation | Empty / fallback |
|---|---|---|---|---|---|
| Email | input | email string | Y | standard email regex | — |
| Password | input | password string | Y | min 8 chars | — |
| Login | action | button | — | disabled if fields are empty | — |

## 7. Components
- Shared `Input`, `Button`, `AlertBanner`.

## 8. Design tokens & layout
- Widescreen/Tablet landscape. Ivory background (`#F8F5F1`), Navy text (`#13233C`), Card surface (`#FFFFFF`).
- Rounded corners `18px` (`--r-lg`).

## 9. Copy (EN)
| Key | String |
|---|---|
| title | "Clinic Portal Login" |
| email_label | "Email address" |
| password_label | "Password" |
| login_btn | "Login" |
| login_btn_busy | "Authenticating..." |
| error_invalid | "Invalid email or password. Please try again." |
| error_offline | "You must be online to access the clinician portal. Please check your clinic Wi-Fi." |

## 10. Interaction & motion
- Fade-in on load. Touch button grows slightly on press (scale 1.02) to match tablet haptic cues.

## 11. Accessibility & Definition of Done
- [x] WCAG AA contrast (navy text on white card surfaces satisfies 4.5:1)
- [x] Keyboard reachable (for tablet cases/stands with physical keyboards)
- [x] All screen states defined in §4 implemented

## 12. Out of scope / non-goals
- **Self-registration for nurses** is out of scope; credentials are provisioned by the clinic administrator.

## 13. Open questions
```
Q1. Do we need MFA (Multi-Factor Authentication) for clinic tablets?
[Answer]: Deferred to Phase 2 for speed of MVP delivery.
```

## 14. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J1
- **Endpoints:** `api/clinician.py`
