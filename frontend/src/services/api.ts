import type { User, MedicationStatus, DoseLog, SymptomLog } from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000';

// Helper to get patient authorization headers
function getPatientHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

// Helper to get partner authorization headers
function getPartnerHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  const token = localStorage.getItem('partner_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

// Helper to get clinician authorization headers.
// The clinic access key is NEVER embedded here — the nurse enters it at login
// and we only ever hold the short-lived bearer token issued by the server.
function getClinicianHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  const token = localStorage.getItem('clinician_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

// Shared response guard for clinician calls: a 401 means the token expired
// or was revoked — clear it so the portal falls back to the login screen.
async function assertClinicianOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) {
    localStorage.removeItem('clinician_token');
    throw new Error('Clinic session expired. Please sign in again.');
  }
  const errorData = await res.json().catch(() => ({ detail: fallback }));
  throw new Error(errorData.detail || fallback);
}

export interface ClinicianLoginResponse {
  token: string;
  clinician_name: string;
}

export async function loginClinician(accessKey: string, clinicianName: string): Promise<ClinicianLoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/clinician/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // clinician_name is required — it becomes the actor identity on the audit trail
    body: JSON.stringify({ access_key: accessKey, clinician_name: clinicianName }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(errorData.detail || 'Invalid clinic access key');
  }
  return res.json();
}

export async function fetchUser(userId: number): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    headers: getPatientHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }
  return res.json();
}

export async function fetchMedications(userId: number): Promise<MedicationStatus[]> {
  const res = await fetch(`${API_BASE_URL}/api/medications?user_id=${userId}`, {
    headers: getPatientHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch medications');
  }
  return res.json();
}

export async function confirmDose(
  prescriptionId: number,
  userId: number,
  actualTime?: string
): Promise<DoseLog> {
  let url = `${API_BASE_URL}/api/medications/${prescriptionId}/confirm?user_id=${userId}`;
  if (actualTime) {
    url += `&actual_time=${encodeURIComponent(actualTime)}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: getPatientHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to confirm dose' }));
    // Carry the HTTP status so offline-sync can tell a server rejection (4xx,
    // don't retry) apart from a transient network/server failure (retry later)
    const err = new Error(errorData.detail || 'Failed to confirm dose') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function logSymptom(
  userId: number,
  symptomType: string,
  value: string
): Promise<SymptomLog> {
  const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const res = await fetch(`${API_BASE_URL}/symptoms/log`, {
    method: 'POST',
    headers: getPatientHeaders(),
    body: JSON.stringify({
      user_id: userId,
      log_date: todayStr,
      symptom_type: symptomType,
      value: value,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to log symptom');
  }
  return res.json();
}

export async function fetchSymptoms(userId: number, dateStr: string): Promise<SymptomLog[]> {
  const res = await fetch(`${API_BASE_URL}/symptoms/log/${userId}?log_date=${dateStr}`, {
    headers: getPatientHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch symptoms');
  }
  return res.json();
}

export async function requestOTP(phone: string): Promise<{ otp_sent: boolean }> {
  const res = await fetch(`${API_BASE_URL}/users/request-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Phone number not registered.' }));
    throw new Error(data.detail || 'Failed to request OTP');
  }
  return res.json();
}

export async function verifyOTP(phone: string, otp: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone, otp }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Invalid OTP code.' }));
    throw new Error(data.detail || 'Failed to verify OTP');
  }
  return res.json();
}

export async function confirmOnboard(
  userId: number,
  sleepTime: string,
  comfortLevel: string
): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/onboard`, {
    method: 'POST',
    headers: getPatientHeaders(),
    body: JSON.stringify({
      sleep_time: sleepTime,
      injection_comfort: comfortLevel,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to save onboarding selections');
  }
  return res.json();
}

export async function updatePartnerConsent(
  userId: number,
  partnerPhone: string,
  partnerConsent: boolean
): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/partner-consent`, {
    method: 'POST',
    headers: getPatientHeaders(),
    body: JSON.stringify({
      partner_phone: partnerPhone,
      partner_consent: partnerConsent,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to update partner consent');
  }
  return res.json();
}

export async function requestNurseCallback(userId: number): Promise<{ message: string; callback_id: number; status: string }> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/callback-request`, {
    method: 'POST',
    headers: getPatientHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to request callback' }));
    throw new Error(errorData.detail || 'Failed to request callback');
  }
  return res.json();
}

export interface PartnerLoginResponse {
  token: string;
  partner_phone: string;
  patient_name: string;
  patient_id: number;
  partner_consent: boolean;
  supporter_type: string;
}

export async function loginPartner(
  phone: string,
  otp: string,
  supporterType: string
): Promise<PartnerLoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/partner/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone, otp, supporter_type: supporterType }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(errorData.detail || 'Login failed');
  }
  return res.json();
}

export interface PartnerDashboardData {
  patient_name: string;
  cycle_type: string;
  stim_day: number;
  total_days: number;
  mood: string | null;
  support_prompt: string;
  cycle_outcome: string | null;
}

export async function fetchPartnerDashboard(partnerPhone: string): Promise<PartnerDashboardData> {
  const res = await fetch(`${API_BASE_URL}/api/partner/dashboard?partner_phone=${encodeURIComponent(partnerPhone)}`, {
    headers: getPartnerHeaders(),
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Sharing consent revoked');
    }
    if (res.status === 404) {
      throw new Error('Supporter link not found');
    }
    throw new Error('Failed to fetch partner dashboard');
  }
  return res.json();
}

export interface TriagePatient {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  reason: string;
  cycle_type: string;
  cycle_outcome: string | null;
  callback_requested: boolean;
}

export async function fetchTriagePatients(): Promise<TriagePatient[]> {
  const res = await fetch(`${API_BASE_URL}/api/clinician/triage`, {
    headers: getClinicianHeaders(),
  });
  await assertClinicianOk(res, 'Failed to fetch triage patients');
  return res.json();
}

export async function resolveTriageAlert(userId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/clinician/resolve-alert/${userId}`, {
    method: 'POST',
    headers: getClinicianHeaders(),
  });
  await assertClinicianOk(res, 'Failed to resolve alert');
  return res.json();
}

export async function updateCycleOutcome(userId: number, outcome: string | null): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/clinician/update-outcome/${userId}`, {
    method: 'POST',
    headers: getClinicianHeaders(),
    body: JSON.stringify({ cycle_outcome: outcome }),
  });
  await assertClinicianOk(res, 'Failed to update cycle outcome');
  return res.json();
}

export interface ParsedMedication {
  name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  start_date: string;
  end_date: string;
  flagged: boolean;
}

// Field names must match the backend ProtocolParseResponse schema exactly
export interface ParseProtocolResponse {
  parsed_medications: ParsedMedication[];
  unrecognized_medications: Array<{
    text: string;
    message: string;
  }>;
}

export async function parseProtocolText(text: string): Promise<ParseProtocolResponse> {
  const res = await fetch(`${API_BASE_URL}/api/clinician/parse-protocol`, {
    method: 'POST',
    headers: getClinicianHeaders(),
    body: JSON.stringify({ protocol_text: text }),
  });
  await assertClinicianOk(res, 'Failed to parse protocol text');
  return res.json();
}

export async function registerPatient(patientData: {
  name: string;
  phone: string;
  email: string;
  dob: string;
  cycle_type: string;
  prescriptions: ParsedMedication[];
}): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/clinician/register`, {
    method: 'POST',
    headers: getClinicianHeaders(),
    body: JSON.stringify(patientData),
  });
  await assertClinicianOk(res, 'Registration failed');
  return res.json();
}
