# US-J1-02: Patient Activation & PWA Installation (PWA)

| Field | Value |
|---|---|
| **Journey** | J1 — Clinic Patient Registration |
| **Persona(s)** | P1 Sarah (primary) |
| **Primary intent** | Authenticate identity via OTP and install the PWA to the mobile home screen using the official logo icon. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-11 |

## 1. User story
> As **Sarah (the patient)**, I want to **tap the link in my registration SMS, verify my identity via OTP, and install the Ovify PWA to my phone's home screen**, so that **I can securely access my personal daily companion app with the official launcher icon.**

## 2. Context & entry
- **Entry point:** Taps the deep link inside the registration SMS:
  `https://patient.ovify.app/login?invite=true&phone=%2B971501234567`
- **Preconditions:** Patient was registered on the clinic tablet (`US-J1-01`); internet connection active.
- **Exit:** Launches the PWA from the home screen, loading the Onboarding Personalization Wizard (`US-J1-03`).

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Tap SMS link and verify OTP
  Given Sarah receives the onboarding SMS containing her deep link
  When she taps the link
  Then her mobile browser opens to the OTP Verification page
  And her phone number "+971 50 123 4567" is pre-filled in the input field
  When she taps "Send Verification Code"
  And inputs the code "123456"
  Then the system validates the code
  And generates her secure patient JWT session token
  And loads the PWA installation instruction screen

Scenario: PWA installation on iOS (Safari)
  Given Sarah is on an iPhone using Safari
  When her OTP is verified
  Then she sees a visual custom modal pointing to the Safari navigation bar
  And instructing her: "1. Tap the Share icon. 2. Select 'Add to Home Screen'."
  And showing the official brand logo mark that will display on her home screen

Scenario: PWA installation on Android (Chrome)
  Given Sarah is on an Android device using Chrome
  When her OTP is verified
  Then the browser triggers the native "Add Ovify to Home Screen" prompt
  And Sarah taps "Add" to install the app with the official launcher icon
```

## 4. Screen states
| State | Trigger | What the user sees |
|---|---|---|
| **ready / phone-entry**| URL loaded with query param | Pre-filled phone number. "Send Verification Code" button. |
| **ready / otp-entry** | Verification clicked | 6-digit text boxes. Link to "Resend Code" (with voice fallback). |
| **submitting** | Code entered | Disabled buttons, "Verifying...". |
| **install-ios** | 2xx validated on iOS | Interactive graphic demonstrating the iOS Share menu + official logo icon. |
| **install-android** | 2xx validated on Android | Native Chrome install prompt triggers. |
| **in-app webview error** | Opened in Instagram/Gmail | Warning banner: "Please copy this link and open in Safari (iOS) or Chrome (Android) to install the app." |

## 5. Data contract
- **Endpoint:** `POST /api/users/verify-otp` — auth: **none**.
- **Request:**
  ```json
  {
    "phone": "string",
    "otp": "string"
  }
  ```
- **Response 200:**
  ```json
  {
    "id": 1,
    "name": "Sarah Khan",
    "email": "sarah@example.com",
    "phone": "+971501234567",
    "token": "jwt-session-token",
    "onboarded": false
  }
  ```
- **Error Responses:**
  *   `400 "Invalid OTP code"` -> Highlight inputs in red, show "Incorrect code. Please try again."

## 6. Field-level detail
| Field | Kind | Type / format | Required | Validation | Empty / fallback |
|---|---|---|---|---|---|
| phone | input | +971... | Y | normalized numeric | from URL query param |
| otp | input | 6-digit code | Y | numeric | — |
| send_code | action | button | — | disabled if phone invalid | — |
| verify_code | action | button | — | disabled if < 6 digits | — |

## 7. Components
- Shared `OTPInput`, `Button`, iOS `PWAInstallOverlay`.

## 8. Design tokens & layout
- Responsive mobile-first screen. Ivory background (`#F8F5F1`), Navy text (`#13233C`), Card surface (`#FFFFFF`).
- **Brand Consistency:** The PWA homescreen icon configuration in `manifest.webmanifest` must point to `/static/logo.png` (scaled to 192x192px and 512x512px) to guarantee the identical logo mark displays on the patient's phone.

## 9. Copy (EN)
| Key | String |
|---|---|
| login_title | "Verify your account" |
| phone_label | "Phone number" |
| send_btn | "Send Verification Code" |
| otp_title | "Enter verification code" |
| verify_btn | "Verify & Continue" |
| ios_install_title | "Install Ovify" |
| ios_install_step1 | "1. Tap the Share icon in Safari." |
| ios_install_step2 | "2. Select 'Add to Home Screen' from the menu." |
| webview_warning | "In-app browsers do not support installation. Please open this link in Safari or Chrome." |

## 10. Interaction & motion
- Slide transitions between the phone-entry, OTP-entry, and install screens.

## 11. Accessibility & Definition of Done
- [x] WCAG AA contrast (navy text on white/ivory background)
- [x] Input autocomplete set to `one-time-code` for automatic SMS verification extraction
- [x] Webmanifest configuration verified with `/static/logo.png`
- [x] Screen states in §4 implemented

## 12. Out of scope / non-goals
- **Auto-verification without OTP** is excluded for security reasons.

## 13. Open questions
```
Q1. What is the expiration window for the verification OTP?
[Answer]: Codes expire after 5 minutes of generation.
```

## 14. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J1, J2
- **Endpoints:** `api/users.py` (`verify_otp`)
- **Frontend:** `frontend/src/pages/LoginPage.tsx`
