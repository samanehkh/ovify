export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  sleep_time?: string;
  injection_comfort?: string;
  onboarded: boolean;
  active_status: string;
  cycle_outcome?: string;
  partner_phone?: string;
  partner_consent?: boolean;
  created_at: string;
  // Bearer token, present only on the /verify-otp login response
  token?: string;
}

export interface MedicationStatus {
  id: number; // Prescription ID
  name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  start_date: string;
  end_date: string;
  status: 'Due' | 'Taken' | 'Missed';
  log_status?: 'On Time' | 'Late' | 'Missed' | null;
  logged_at?: string | null;
  syncPending?: boolean;
}

export interface DoseLog {
  id: number;
  user_id: number;
  prescription_id: number;
  logged_at: string;
  scheduled_date: string;
  status: 'On Time' | 'Late';
}

export interface SymptomLog {
  id: number;
  user_id: number;
  log_date: string;
  symptom_type: string;
  value: string;
}
