import React, { useState } from 'react';
import {
  fetchTriagePatients,
  resolveTriageAlert,
  updateCycleOutcome,
  parseProtocolText,
  registerPatient
} from '../services/api';
import type { TriagePatient } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

interface ParsedMed {
  name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  start_date: string;
  end_date: string;
  flagged: boolean;
}

interface UnrecognizedMed {
  text: string;
  message: string;
}

export const ClinicianPortalPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'intake' | 'triage'>('intake');
  
  // Demographics Form State
  const [name, setName] = useState('Sarah Khan');
  const [phone, setPhone] = useState('+971 50 123 4567');
  const [email, setEmail] = useState('sarah.khan@example.com');
  const [dob, setDob] = useState('1992-05-15');
  const [cycleType, setCycleType] = useState('Fresh IVF');
  const [protocolText, setProtocolText] = useState(
    'Patient starts Gonal-F 150 IU daily at 7 PM starting tomorrow, and Cetrotide 0.25mg daily at 8 AM starting Day 6'
  );

  // Parsing & Seeding State
  const [loading, setLoading] = useState(false);
  const [parsedMeds, setParsedMeds] = useState<ParsedMed[]>([]);
  const [unrecognizedMeds, setUnrecognizedMeds] = useState<UnrecognizedMed[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Triage Dashboard State
  const [triageData, setTriageData] = useState<TriagePatient[]>([]);
  const [patientToMarkFailed, setPatientToMarkFailed] = useState<number | null>(null);

  const fetchTriageData = async () => {
    try {
      const data = await fetchTriagePatients();
      setTriageData(data);
    } catch (err) {
      console.error("Failed to fetch triage data", err);
    }
  };

  const handleResolveAlert = async (userId: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const data = await resolveTriageAlert(userId);
      setSuccessMessage(data.message);
      fetchTriageData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resolving alert');
    }
  };

  const handleUpdateOutcome = async (userId: number, outcome: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateCycleOutcome(userId, outcome);
      setSuccessMessage('Patient outcome updated successfully.');
      fetchTriageData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating cycle outcome');
    }
  };

  React.useEffect(() => {
    fetchTriageData();
  }, [activeSubTab]);

  // NLP Parser trigger
  const handleParseProtocol = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const data = await parseProtocolText(protocolText);
      // Map to local parsed state with expected keys
      const mapped = data.prescriptions.map(p => ({
        name: p.name,
        dosage: p.dosage,
        route: p.route,
        scheduled_time: p.scheduled_time,
        start_date: p.start_date,
        end_date: p.end_date,
        flagged: p.flagged
      }));
      setParsedMeds(mapped);
      setUnrecognizedMeds(data.unrecognized_meds);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse protocol text');
    } finally {
      setLoading(false);
    }
  };

  // Submit Patient Registration
  const handleRegisterPatient = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await registerPatient({
        name,
        phone,
        email,
        dob,
        cycle_type: cycleType,
        prescriptions: parsedMeds
      });
      setSuccessMessage('Patient registered successfully.');
      // Clear forms
      setParsedMeds([]);
      setUnrecognizedMeds([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F5F1] font-body text-navy">
      
      {/* 1. Left Sidebar Navigation (Desktop/Tablet Design) */}
      <aside className="w-64 bg-navy text-white flex flex-col justify-between p-6 shrink-0 shadow-lg border-r border-navy-80">
        <div className="space-y-8">
          {/* Logo Mark Header */}
          <div className="flex items-center gap-3">
            <img 
              src="/static/logo.png" 
              alt="Ovify Logo" 
              className="w-10 h-10 object-contain rounded-xl bg-white p-1"
            />
            <div>
              <h1 className="font-heading text-lg font-bold tracking-tight">Ovify Portal</h1>
              <span className="text-[10px] font-data font-bold text-lavender tracking-wider uppercase">Clinician Console</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveSubTab('intake')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-heading text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeSubTab === 'intake'
                  ? 'bg-lavender text-white shadow-md'
                  : 'text-navy-30 hover:bg-navy-80 hover:text-white'
              }`}
            >
              <span className="text-sm">➕</span>
              <span>Patient Intake (J1)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('triage')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-heading text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeSubTab === 'triage'
                  ? 'bg-lavender text-white shadow-md'
                  : 'text-navy-30 hover:bg-navy-80 hover:text-white'
              }`}
            >
              <span className="text-sm">🚨</span>
              <span>Triage Command (J8)</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="border-t border-navy-80 pt-4 flex flex-col gap-1 text-[10px] text-navy-30 font-data uppercase">
          <div>Clinic ID: DXB-IVF-01</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
            <span>Connection Secure</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Frame (Widescreen Spacious Area) */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Panel */}
        <header className="h-16 border-b border-navy-10 bg-white/70 backdrop-blur-md px-8 flex items-center justify-between z-10 shrink-0">
          <div>
            <h2 className="font-heading text-sm font-bold text-navy">
              {activeSubTab === 'intake' ? 'Patient Intake & AI Protocol Parsing' : 'Patient Triage Console'}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-navy-55 font-data">
            <div>Tuesday, 7 July 2026</div>
            <div className="w-px h-4 bg-navy-10" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-lavender flex items-center justify-center font-bold text-white uppercase">N</div>
              <span>Nurse Console</span>
            </div>
          </div>
        </header>

        {/* Main Scrolling Body */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-sage-10 border border-sage/25 text-sage text-xs font-body font-semibold flex items-center gap-2 animate-fadeIn max-w-4xl shadow-sm">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-blush-10 border border-blush/25 text-blush text-xs font-body font-semibold flex items-center gap-2 max-w-4xl shadow-sm">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {activeSubTab === 'intake' ? (
            <div className="max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Form Input Card (7 columns wide) */}
              <div className="lg:col-span-7 bg-white border border-navy-10 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider">Patient Demographics</h3>
                    <span className="px-2.5 py-1 rounded-full bg-navy-10 text-navy font-data text-[10px] font-bold">Cycle ID: NEW</span>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Phone Number</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                        />
                      </div>
                      <div>
                        <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Date of Birth</label>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                        />
                      </div>
                      <div>
                        <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">IVF Cycle Type</label>
                        <input
                          type="text"
                          value={cycleType}
                          onChange={(e) => setCycleType(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">Protocol Dictation Note / Copy-Paste</label>
                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setProtocolText('Patient starts Gonal-F 150 IU daily at 7 PM starting tomorrow, and Cetrotide 0.25mg daily at 8 AM starting Day 6')}
                            className="text-[10px] text-lavender hover:underline font-semibold"
                          >
                            Happy Path Test
                          </button>
                          <button 
                            type="button"
                            onClick={() => setProtocolText('Patient starts Gonal-X 150 IU daily starting tomorrow')}
                            className="text-[10px] text-blush hover:underline font-semibold"
                          >
                            Unrecognized Test
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        value={protocolText}
                        onChange={(e) => setProtocolText(e.target.value)}
                        className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white font-body leading-relaxed focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleParseProtocol}
                    className="w-full py-4 bg-navy hover:bg-navy-80 text-white font-heading text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Processing Protocol Text...</span>
                      </>
                    ) : (
                      <span>🤖 Run AI Onboarding Parser</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Medication Table display (5 columns wide) */}
              <div className="lg:col-span-5 bg-white border border-navy-10 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider mb-6">Parsed Medication Timeline</h3>
                  
                  {/* Unrecognized warning alert */}
                  {unrecognizedMeds.map((med, idx) => (
                    <div key={idx} className="mb-4 p-4 rounded-2xl bg-blush-10 border border-blush/25 text-left flex gap-3 text-xs text-blush leading-relaxed">
                      <span className="select-none">⚠️</span>
                      <div>
                        <span className="font-bold text-due">{med.text}</span> — {med.message}
                      </div>
                    </div>
                  ))}

                  {parsedMeds.length === 0 && unrecognizedMeds.length === 0 ? (
                    <div className="py-24 text-center text-navy-55 font-body text-sm border-2 border-dashed border-navy-10/70 rounded-2xl flex flex-col items-center justify-center px-6">
                      <span className="text-3xl mb-3 opacity-60">📋</span>
                      <span>Run the AI Parser to automatically pre-fill the digital medication timeline from clinical notes.</span>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                      {parsedMeds.map((med, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-[#F8F5F1]/30 border border-navy-10 flex flex-col gap-1 shadow-sm">
                          <div className="flex justify-between items-center border-b border-navy-10/40 pb-2 mb-2">
                            <span className="font-heading text-sm font-bold text-navy">{med.name}</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-navy-10 text-navy font-data text-[10px] font-bold uppercase">
                              {med.dosage}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-body text-navy-55">
                            <div><span className="font-semibold text-navy">Time:</span> {med.scheduled_time}</div>
                            <div><span className="font-semibold text-navy">Route:</span> {med.route}</div>
                            <div><span className="font-semibold text-navy">Start:</span> {med.start_date}</div>
                            <div><span className="font-semibold text-navy">End:</span> {med.end_date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {parsedMeds.length > 0 && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRegisterPatient}
                    className="w-full py-4 bg-sage hover:bg-sage-80 text-white font-heading text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 mt-6"
                  >
                    Register Patient & Send Invite
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-7xl bg-white border border-navy-10 rounded-3xl p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider mb-2">IVF Patient Triage Grid</h3>
                <p className="font-body text-xs text-navy-55 leading-relaxed">
                  Real-time clinical monitoring of compliance. Patients with missing logs escalate through priority tiers to prevent dropouts.
                </p>
              </div>

              {/* Desktop Table View */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-navy-10 text-[10px] font-heading font-bold text-navy-55 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Patient Details</th>
                      <th className="py-3.5 px-4">Compliance Status</th>
                      <th className="py-3.5 px-4">Alert Reason</th>
                      <th className="py-3.5 px-4">Active Protocol</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="font-body">
                    {triageData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-navy-55 text-xs">
                          No triage patient records found.
                        </td>
                      </tr>
                    ) : (
                      triageData.map((patient) => (
                        <tr key={patient.id} className="border-b border-navy-10 hover:bg-[#F8F5F1]/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-semibold text-navy">{patient.name}</div>
                            <div className="text-xs text-navy-55">{patient.email}</div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge status={patient.status as any} />
                          </td>
                          <td className="py-4 px-4 text-navy-55 leading-relaxed">
                            {patient.reason}
                          </td>
                          <td className="py-4 px-4 text-xs font-data">
                            {patient.cycle_type}
                          </td>
                          <td className="py-4 px-4 text-right flex justify-end items-center gap-2">
                            {patient.status !== 'On Track' && (
                              <Button
                                onClick={() => handleResolveAlert(patient.id)}
                                className="px-2.5 py-1.5 h-8 font-heading text-[10px]"
                              >
                                Resolve Alert
                              </Button>
                            )}
                            {patient.cycle_outcome === 'Failed' ? (
                              <Badge status="Recovery Active" />
                            ) : (
                              <Button
                                variant="outline"
                                onClick={() => setPatientToMarkFailed(patient.id)}
                                className="px-2.5 py-1 text-due border-due hover:bg-blush-10 focus:ring-due h-8"
                              >
                                Mark Failed
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={patientToMarkFailed !== null}
        onClose={() => setPatientToMarkFailed(null)}
        title="Confirm Failed Cycle"
      >
        <p className="font-body text-xs text-navy-70 leading-relaxed mb-6">Are you sure you want to mark this cycle as unsuccessful and activate patient Recovery Mode?</p>
        <div className="flex gap-3">
          <Button
            variant="due"
            fullWidth
            onClick={() => {
              if (patientToMarkFailed !== null) {
                handleUpdateOutcome(patientToMarkFailed, 'Failed');
                setPatientToMarkFailed(null);
              }
            }}
          >
            Yes, Mark Failed
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => setPatientToMarkFailed(null)}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};
