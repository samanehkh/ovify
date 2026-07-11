/**
 * J1 Journey — Frontend Unit Tests
 * ==================================
 * Covers US-J1-00 (Clinician Auth), US-J1-01 (Register Patient),
 * US-J1-02 (Patient OTP Activation), US-J1-03 (Onboarding Wizard).
 *
 * Tests the API service layer (api.ts) with mocked fetch.
 * Happy paths ✅ and Unhappy paths ❌ both covered.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loginClinician,
  requestOTP,
  verifyOTP,
  confirmOnboard,
  updatePartnerConsent,
  registerPatient,
} from '../services/api';

// ── fetch mock helpers ─────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function mockFetchError() {
  return vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
}

beforeEach(() => {
  localStorage.clear();
  // Seed a patient token for auth-required API calls
  localStorage.setItem('auth_token', 'mock-patient-jwt');
  localStorage.setItem('clinician_token', 'mock-clinician-jwt');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// US-J1-00 · Clinician Authentication — API layer
// ══════════════════════════════════════════════════════════════════════════════

describe('US-J1-00 · loginClinician()', () => {
  it('✅ valid credentials: resolves with token and clinician_name', async () => {
    mockFetch(200, { token: 'jwt-abc', clinician_name: 'Mona' });
    const result = await loginClinician('mona.nurse@clinic.ae', 'SecurePassword123');
    expect(result.token).toBe('jwt-abc');
    expect(result.clinician_name).toBe('Mona');
  });

  it('✅ sends correct email and password in request body', async () => {
    const spy = mockFetch(200, { token: 'jwt-abc', clinician_name: 'Mona' });
    await loginClinician('mona.nurse@clinic.ae', 'SecurePassword123');
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.email).toBe('mona.nurse@clinic.ae');
    expect(body.password).toBe('SecurePassword123');
  });

  it('✅ POSTs to /api/clinician/login endpoint', async () => {
    const spy = mockFetch(200, { token: 'jwt-abc', clinician_name: 'Mona' });
    await loginClinician('mona.nurse@clinic.ae', 'SecurePassword123');
    expect((spy.mock.calls[0][0] as string)).toContain('/api/clinician/login');
  });

  it('❌ wrong password: throws error with server detail', async () => {
    mockFetch(401, { detail: 'Invalid email or password. Please try again.' });
    await expect(loginClinician('mona.nurse@clinic.ae', 'wrong')).rejects.toThrow(
      'Invalid email or password'
    );
  });

  it('❌ unknown email: throws error', async () => {
    mockFetch(401, { detail: 'Invalid email or password. Please try again.' });
    await expect(loginClinician('ghost@clinic.ae', 'SecurePassword123')).rejects.toThrow();
  });

  it('❌ network error: throws error', async () => {
    mockFetchError();
    await expect(loginClinician('mona.nurse@clinic.ae', 'SecurePassword123')).rejects.toThrow(
      'Network error'
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// US-J1-01 · Register Patient — API layer
// ══════════════════════════════════════════════════════════════════════════════

describe('US-J1-01 · registerPatient()', () => {
  const basePayload = {
    first_name: 'Layla',
    last_name: 'Hassan',
    phone: '+971 50 777 7777',
    email: 'layla@example.com',
    dob: '1990-03-20',
    cycle_start_date: '2026-07-12',
    current_cycle_number: 1,
    treatment_package: 'Single IVF/ICSI Cycle (Fresh)',
    partner_name: 'Omar',
    partner_phone: '+971 50 888 8888',
    partner_relationship: 'Spouse/Partner',
    next_appointment_datetime: '2026-07-15T10:00:00Z',
    prescriptions: [
      {
        name: 'Gonal-F',
        dosage: '150 IU',
        route: 'Subcutaneous',
        scheduled_time: '20:00:00',
        start_date: '2026-07-12',
        end_date: '2026-07-24',
        flagged: false,
      },
    ],
  };

  it('✅ valid payload: resolves with user_id and success message', async () => {
    mockFetch(200, { message: 'Patient registered successfully.', user_id: 42 });
    const result = await registerPatient(basePayload);
    expect(result.user_id).toBe(42);
    expect(result.message).toContain('successfully');
  });

  it('✅ sends clinician auth token in request headers', async () => {
    const spy = mockFetch(200, { message: 'Patient registered successfully.', user_id: 42 });
    await registerPatient(basePayload);
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toContain('Bearer mock-clinician-jwt');
  });

  it('✅ POSTs to /api/clinician/register endpoint', async () => {
    const spy = mockFetch(200, { message: 'ok', user_id: 1 });
    await registerPatient(basePayload);
    expect((spy.mock.calls[0][0] as string)).toContain('/api/clinician/register');
  });

  it('✅ multiple prescriptions are included in the request body', async () => {
    const payloadWithTwo = {
      ...basePayload,
      prescriptions: [
        ...basePayload.prescriptions,
        { name: 'Menopur', dosage: '75 IU', route: 'Subcutaneous',
          scheduled_time: '20:00:00', start_date: '2026-07-12', end_date: '2026-07-24', flagged: false },
      ],
    };
    const spy = mockFetch(200, { message: 'ok', user_id: 1 });
    await registerPatient(payloadWithTwo);
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.prescriptions).toHaveLength(2);
  });

  it('❌ duplicate phone: throws error with detail message', async () => {
    mockFetch(400, { detail: 'Phone number already registered.' });
    await expect(registerPatient(basePayload)).rejects.toThrow('Phone number already registered');
  });

  it('❌ duplicate email: throws error', async () => {
    mockFetch(400, { detail: 'Email already registered.' });
    await expect(registerPatient(basePayload)).rejects.toThrow('Email already registered');
  });

  it('❌ unapproved medication: throws formulary error', async () => {
    mockFetch(400, { detail: 'Medication not in formulary: Gonal-X' });
    await expect(registerPatient(basePayload)).rejects.toThrow('formulary');
  });

  it('❌ network error: throws error', async () => {
    mockFetchError();
    await expect(registerPatient(basePayload)).rejects.toThrow('Network error');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// US-J1-02 · Patient Activation (OTP) — API layer
// ══════════════════════════════════════════════════════════════════════════════

describe('US-J1-02 · requestOTP()', () => {
  it('✅ registered phone: resolves with otp_sent=true', async () => {
    mockFetch(200, { message: 'OTP sent successfully', otp_sent: true });
    const result = await requestOTP('+971501234567');
    expect(result.otp_sent).toBe(true);
  });

  it('✅ POSTs to /users/request-otp', async () => {
    const spy = mockFetch(200, { otp_sent: true });
    await requestOTP('+971501234567');
    expect((spy.mock.calls[0][0] as string)).toContain('/users/request-otp');
  });

  it('❌ unregistered phone: throws not registered error', async () => {
    mockFetch(404, { detail: "Phone number '+971500000000' not registered with any patient chart." });
    await expect(requestOTP('+971500000000')).rejects.toThrow('not registered');
  });

  it('❌ network error: throws error', async () => {
    mockFetchError();
    await expect(requestOTP('+971501234567')).rejects.toThrow('Network error');
  });
});

describe('US-J1-02 · verifyOTP()', () => {
  const mockUser = {
    id: 1,
    name: 'Sarah Khan',
    email: 'sarah@example.com',
    phone: '+971501234567',
    onboarded: false,
    partner_phone: '+971509999999',
    token: 'jwt-patient-token',
    active_status: 'Pending',
    created_at: '2026-07-01T00:00:00Z',
  };

  it('✅ correct OTP: resolves with full user object + token', async () => {
    mockFetch(200, mockUser);
    const result = await verifyOTP('+971501234567', '123456');
    expect(result.name).toBe('Sarah Khan');
    expect((result as any).token).toBe('jwt-patient-token');
    expect(result.onboarded).toBe(false);
  });

  it('✅ includes partner_phone in response for onboarding consent step', async () => {
    mockFetch(200, mockUser);
    const result = await verifyOTP('+971501234567', '123456');
    expect(result.partner_phone).toBe('+971509999999');
  });

  it('✅ POSTs to /users/verify-otp', async () => {
    const spy = mockFetch(200, mockUser);
    await verifyOTP('+971501234567', '123456');
    expect((spy.mock.calls[0][0] as string)).toContain('/users/verify-otp');
  });

  it('✅ sends phone and otp in request body', async () => {
    const spy = mockFetch(200, mockUser);
    await verifyOTP('+971501234567', '123456');
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.phone).toBe('+971501234567');
    expect(body.otp).toBe('123456');
  });

  it('❌ wrong OTP code: throws Invalid OTP error', async () => {
    mockFetch(400, { detail: 'Invalid OTP code.' });
    await expect(verifyOTP('+971501234567', '999999')).rejects.toThrow('Invalid OTP');
  });

  it('❌ unregistered phone: throws error', async () => {
    mockFetch(404, { detail: 'Phone number not registered.' });
    await expect(verifyOTP('+971500000001', '123456')).rejects.toThrow();
  });

  it('❌ network error: throws error', async () => {
    mockFetchError();
    await expect(verifyOTP('+971501234567', '123456')).rejects.toThrow('Network error');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// US-J1-03 · Onboarding Wizard — API layer
// ══════════════════════════════════════════════════════════════════════════════

describe('US-J1-03 · confirmOnboard()', () => {
  const mockOnboardedUser = {
    id: 1,
    name: 'Sarah Khan',
    onboarded: true,
    active_status: 'On Track',
    sleep_time: '10:00 PM - 12:00 AM',
    injection_comfort: 'First time',
    reminder_offset_minutes: 30,
  };

  it('✅ first-time patient: resolves with onboarded=true and On Track status', async () => {
    mockFetch(200, mockOnboardedUser);
    const result = await confirmOnboard(1, '10:00 PM - 12:00 AM', 'First time', 30);
    expect(result.onboarded).toBe(true);
    expect(result.active_status).toBe('On Track');
  });

  it('✅ sends correct sleep_time, injection_comfort, reminder_offset_minutes', async () => {
    const spy = mockFetch(200, mockOnboardedUser);
    await confirmOnboard(1, '9:00 PM - 11:00 PM', 'Experienced', 15);
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.sleep_time).toBe('9:00 PM - 11:00 PM');
    expect(body.injection_comfort).toBe('Experienced');
    expect(body.reminder_offset_minutes).toBe(15);
  });

  it('✅ POSTs to /users/{id}/onboard', async () => {
    const spy = mockFetch(200, mockOnboardedUser);
    await confirmOnboard(1, '10:00 PM - 12:00 AM', 'First time', 30);
    expect((spy.mock.calls[0][0] as string)).toContain('/users/1/onboard');
  });

  it('✅ attaches patient Bearer token in Authorization header', async () => {
    const spy = mockFetch(200, mockOnboardedUser);
    await confirmOnboard(1, '10:00 PM - 12:00 AM', 'First time', 30);
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer mock-patient-jwt');
  });

  it('✅ reminder_offset=0 (at scheduled time) is accepted', async () => {
    const spy = mockFetch(200, { ...mockOnboardedUser, reminder_offset_minutes: 0 });
    await confirmOnboard(1, '10:00 PM - 12:00 AM', 'Experienced', 0);
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.reminder_offset_minutes).toBe(0);
  });

  it('❌ server error: throws with message', async () => {
    mockFetch(500, { detail: 'Internal Server Error' });
    await expect(confirmOnboard(1, '10:00 PM - 12:00 AM', 'First time', 30)).rejects.toThrow();
  });

  it('❌ 403 cross-user access: throws error', async () => {
    mockFetch(403, { detail: 'Forbidden: You cannot access another patient\'s data' });
    await expect(confirmOnboard(1, '10:00 PM - 12:00 AM', 'First time', 30)).rejects.toThrow();
  });

  it('❌ network error: throws error', async () => {
    mockFetchError();
    await expect(confirmOnboard(1, '10:00 PM - 12:00 AM', 'First time', 30)).rejects.toThrow(
      'Network error'
    );
  });
});

describe('US-J1-03 · updatePartnerConsent()', () => {
  const mockUser = {
    id: 1,
    name: 'Sarah Khan',
    partner_phone: '+971509999999',
    partner_consent: true,
    onboarded: true,
    active_status: 'On Track',
  };

  it('✅ consent=true: resolves and returns updated user', async () => {
    mockFetch(200, mockUser);
    const result = await updatePartnerConsent(1, '+971509999999', true);
    expect(result.partner_consent).toBe(true);
  });

  it('✅ consent=false: partner sharing disabled', async () => {
    mockFetch(200, { ...mockUser, partner_consent: false });
    const result = await updatePartnerConsent(1, '+971509999999', false);
    expect(result.partner_consent).toBe(false);
  });

  it('✅ sends partner_phone and partner_consent in body', async () => {
    const spy = mockFetch(200, mockUser);
    await updatePartnerConsent(1, '+971509999999', true);
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.partner_phone).toBe('+971509999999');
    expect(body.partner_consent).toBe(true);
  });

  it('✅ POSTs to /users/{id}/partner-consent', async () => {
    const spy = mockFetch(200, mockUser);
    await updatePartnerConsent(1, '+971509999999', true);
    expect((spy.mock.calls[0][0] as string)).toContain('/users/1/partner-consent');
  });

  it('✅ attaches patient Bearer token', async () => {
    const spy = mockFetch(200, mockUser);
    await updatePartnerConsent(1, '+971509999999', true);
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer mock-patient-jwt');
  });

  it('❌ 403 cross-user: throws error', async () => {
    mockFetch(403, { detail: 'Forbidden' });
    await expect(updatePartnerConsent(1, '+971509999999', true)).rejects.toThrow();
  });

  it('❌ network error: throws error', async () => {
    mockFetchError();
    await expect(updatePartnerConsent(1, '+971509999999', true)).rejects.toThrow('Network error');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Phone normalizer utility (shared across all J1 stories)
// ══════════════════════════════════════════════════════════════════════════════

describe('Phone number formatting (used in OTP pre-fill from SMS link)', () => {
  it('strips spaces from phone string for API calls', () => {
    const phone = '+971 50 123 4567';
    const normalized = phone.replace(/\s/g, '');
    expect(normalized).toBe('+97150123456  7'.replace(/\s/g, ''));
  });

  it('encodes phone for URL query param (SMS deep link)', () => {
    const phone = '+971501234567';
    const encoded = encodeURIComponent(phone);
    expect(encoded).toBe('%2B971501234567');
  });

  it('decodes phone from URL query param correctly', () => {
    const encoded = '%2B971501234567';
    expect(decodeURIComponent(encoded)).toBe('+971501234567');
  });
});
