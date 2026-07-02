# Ovify Module Specification

## 1. Introduction
This document outlines the features and requirements for the Ovify module, a system designed to help users track and manage their ovulation cycles.

## 2. User Stories

### User Story 1: Cycle Tracking
As a user, I want to be able to log the start and end dates of my menstrual periods so that I can track my cycle length and predict future periods.

**Acceptance Criteria:**
*   Users can input the start date of their period.
*   Users can input the end date of their period.
*   The system calculates and displays the cycle length based on logged periods.
*   The system predicts the next period start date based on historical data.

### User Story 2: Ovulation Prediction
As a user, I want the system to predict my ovulation window so that I can identify my fertile days.

**Acceptance Criteria:**
*   The system predicts the ovulation window based on the user's cycle data.
*   The system displays the predicted fertile window.

### User Story 3: Symptom Logging
As a user, I want to be able to log symptoms (e.g., mood, discharge, basal body temperature) so that I can gain insights into my cycle patterns.

**Acceptance Criteria:**
*   Users can log various symptoms with associated dates.
*   The system stores and displays logged symptoms.

## 3. Features

*   **Period Logging:** Record start and end dates of menstrual periods.
*   **Cycle Length Calculation:** Automatically calculate cycle length.
*   **Period Prediction:** Predict upcoming period dates.
*   **Ovulation Window Prediction:** Identify and display the fertile window.
*   **Symptom Tracking:** Allow users to log and view various symptoms.

## 4. Technical Considerations

*   **Frontend:** HTML/JS/CSS (Vanilla)
*   **Backend:** FastAPI (Python)
*   **Database:** Azure Database for PostgreSQL (Flexible Server)
*   **Data Residency:** UAE Azure Region (UAE North - Dubai)
*   **Security:** PII/PHI Shield, OIDC for authentication.
*   **Testing:** Write unit tests in `tests/test_cycle.py` using pytest to verify that the period prediction and fertile window calculations work correctly.
