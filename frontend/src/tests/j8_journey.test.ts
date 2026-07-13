import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTriageResponse, fetchPatientChart, savePatientChart, fetchPatientDirectory } from '../services/api';

const mockFetch = (status: number, data: any) => {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    } as Response)
  );
  return spy;
};

describe('US-J8-01 & US-J8-02: Clinician Dashboard & Patient Chart CRUD API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('clinician_token', 'mock-clinician-jwt');
  });

  it('fetchTriageResponse returns grouped triage data and counts', async () => {
    const payload = {
      counts: { on_track: 32, needs_attention: 2, urgent: 2, total_active: 36 },
      urgent: [{ patient_id: 1, name: "Sarah Khan", status: "Red Alert", reason: "Missed dose" }],
      needs_attention: [],
      on_track: [],
      summary_stats: { adherence_today_pct: 92, ai_questions_today: 14, avg_confirm_delay_mins: 8, partner_engagement_pct: 67 }
    };
    const fetchSpy = mockFetch(200, payload);
    const result = await fetchTriageResponse();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/clinician/triage'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-clinician-jwt'
        })
      })
    );
    expect(result.counts.total_active).toBe(36);
    expect(result.urgent[0].name).toBe("Sarah Khan");
  });

  it('fetchPatientChart returns bio and stimulation prescriptions details', async () => {
    const payload = {
      id: 1,
      first_name: "Sarah",
      last_name: "Khan",
      dob: "1992-05-15",
      prescriptions: [{ id: 12, name: "Gonal-F", dosage: "150 IU" }]
    };
    const fetchSpy = mockFetch(200, payload);
    const result = await fetchPatientChart(1);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/clinician/patients/1'),
      expect.any(Object)
    );
    expect(result.first_name).toBe("Sarah");
    expect(result.prescriptions[0].name).toBe("Gonal-F");
  });

  it('savePatientChart submits edit payload to backend', async () => {
    const fetchSpy = mockFetch(200, { message: "Patient chart updated successfully." });
    const payload = {
      first_name: "Sarah",
      last_name: "Khan-Edited",
      dob: "1992-05-15",
      email: "sarah@example.com",
      phone: "+971501234567",
      cycle_start_date: "2026-07-12",
      current_cycle_number: 1,
      treatment_package: "3-Cycle Egg/Embryo Accumulation",
      partner_name: "Ahmed Khan",
      partner_phone: "+971509999999",
      partner_relationship: "Spouse",
      partner_consent: true,
      next_appointment_datetime: "2026-07-15T09:00:00Z",
      prescriptions: []
    };
    const result = await savePatientChart(1, payload);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/clinician/patients/1'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload)
      })
    );
    expect(result.message).toContain("updated successfully");
  });

  it('fetchPatientDirectory queries patient registry with filters', async () => {
    const payload = {
      total_count: 1,
      page: 1,
      limit: 20,
      patients: [
        { patient_id: 1, name: "Sarah Khan", email: "sarah@example.com", phone: "+971501234567", cycle_type: "IVF", created_at: "2026-07-07", status: "Stimulation" }
      ]
    };
    const fetchSpy = mockFetch(200, payload);
    const result = await fetchPatientDirectory("Sarah", "2026-07-01", "IVF");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/clinician/patients?search=Sarah&registration_date=2026-07-01&package=IVF'),
      expect.any(Object)
    );
    expect(result.patients[0].name).toBe("Sarah Khan");
  });
});
