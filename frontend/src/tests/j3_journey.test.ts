import { describe, it, expect, vi, beforeEach } from 'vitest';
import { confirmDose } from '../services/api';

// Helper to mock global fetch
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

describe('US-J3-01: Injection Guide & Dose Confirmation API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('auth_token', 'mock-patient-jwt');
  });

  it('Reflects a successful dose logging confirmation request', async () => {
    const responsePayload = {
      id: 42,
      prescription_id: 12,
      status: 'Taken',
      scheduled_date: '2026-07-11',
      logged_at: '2026-07-11T19:05:00Z',
    };
    
    const fetchSpy = mockFetch(200, responsePayload);
    const result = await confirmDose(12);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/medications/12/confirm'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-patient-jwt',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result.status).toBe('Taken');
    expect(result.prescription_id).toBe(12);
  });

  it('Handles failed log response with error rejection', async () => {
    mockFetch(400, { detail: 'Dose confirmation time cannot be in the future' });
    await expect(confirmDose(12)).rejects.toThrow();
  });
});
