# Ovify — Patient PWA Spec: Homepage Dashboard

## User Story

**As an IVF patient,** I want to open the Ovify app on my phone and immediately see my today's treatment status, today's injection task, and a reassuring emotional check-in — so that I feel supported, informed, and know exactly what to do without calling my clinic.

---

## Acceptance Criteria

*   The homepage loads within 2 seconds on mobile with no additional navigation required.
*   The patient sees their **first name and a warm greeting** based on time of day (e.g., "Good morning, Sara").
*   The **Today's Task card** is prominently visible and shows today's injection name, dosage, and time.
*   A large, single **"Mark as Done"** button allows one-tap injection confirmation.
*   A **Treatment Progress Bar** shows which stimulation day the patient is currently on (e.g., "Day 5 of 12").
*   The **CalmSeed Emotional Check-in strip** appears below the task card with a soft prompt (e.g., "How are you feeling today?") and 5 selectable mood options.
*   A **"Ask Ovify AI"** shortcut button is visible at the bottom for quick questions.
*   The layout is mobile-first, single-column, and requires **zero horizontal scrolling**.
*   All text must render in **English** (Arabic bilingual support is Phase 2).

---

## Visual Design Requirements

*   **Color Palette:**
    *   Background: Ivory `#FDFDFB` (light, soft, non-clinical)
    *   Primary accent: Lavender `#9E8CEF`
    *   Secondary accent: Blush `#FFA8A8`
    *   Text: Dark Navy `#13233C`
    *   Muted text: `#6B7A99`

*   **Typography:**
    *   Headings: `DM Sans` (700 weight)
    *   Body text: `Manrope` (400–500 weight)
    *   Data/labels: `Inter` (400–600 weight)
    *   All three loaded from Google Fonts.

*   **Component Style:**
    *   Cards use glassmorphism: `rgba(255,255,255,0.65)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.65)`, `border-radius: 20px`.
    *   Lavender glow on interactive elements: `box-shadow: 0 8px 32px rgba(158,140,239,0.18)`.
    *   Hover transitions: `transform: translateY(-3px)`, `transition: all 0.3s cubic-bezier(0.16,1,0.3,1)`.
    *   Background: layered radial gradients in lavender and blush at low opacity (6–10%) over ivory.

*   **Header:**
    *   Ovify logo (top-left), small avatar/initials (top-right).
    *   Greeting: large DM Sans heading (H1).

*   **Today's Task Card:**
    *   Full-width, glassmorphism card with a lavender left-border accent stripe.
    *   Injection name + dosage in bold Inter font.
    *   Scheduled time shown in muted text below.
    *   Large full-width "Mark as Done" button — gradient fill: `linear-gradient(135deg, #9E8CEF, #FFA8A8)`, dark navy text.

*   **Treatment Progress Bar:**
    *   Labelled "Stimulation Day X of Y".
    *   Lavender filled progress bar, blush animated pulse on the progress indicator dot.

*   **CalmSeed Check-in Strip:**
    *   Soft blush-tinted card with 5 mood buttons labelled: Sad, Low, Okay, Good, Great.
    *   Tapping a mood option selects it (lavender outline highlight) and shows a brief warm message.

*   **Ask Ovify AI Button:**
    *   Fixed or sticky bottom-center.
    *   Pill-shaped, lavender background, white text: "Ask Ovify AI".

---

## Technical Considerations

*   **Frontend:** Single HTML file (`index.html`) with vanilla CSS and vanilla JS. No frameworks.
*   **Backend:** FastAPI (Python) — serves the HTML file at the root `/` route.
*   **Database:** Not required for this UI story — use hardcoded mock data to demonstrate the layout.
*   **Testing:** No backend tests required for this story. Visual verification only (open in browser and confirm all components render correctly on a 390px wide mobile viewport).
*   **No API calls required** for this story — all data is mocked inline in the JS.
