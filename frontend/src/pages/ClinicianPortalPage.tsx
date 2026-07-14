import React, { useState, useEffect } from 'react';
import {
  fetchTriageResponse,
  fetchPatientChart,
  savePatientChart,
  resolveTriageAlert,
  updateCycleOutcome,
  loginClinician
} from '../services/api';
import { IntakeTab } from '../components/clinician/IntakeTab';
import { TriageTab } from '../components/clinician/TriageTab';
import { DirectoryTab } from '../components/clinician/DirectoryTab';

export const ClinicianPortalPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'intake' | 'triage' | 'directory'>('intake');

  // Clinician session state
  const [clinicianToken, setClinicianToken] = useState<string | null>(() => localStorage.getItem('clinician_token'));
  const [clinicianEmail, setClinicianEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleClinicianLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const data = await loginClinician(clinicianEmail.trim(), password);
      localStorage.setItem('clinician_token', data.token);
      localStorage.setItem('clinician_name', data.clinician_name);
      setClinicianToken(data.token);
      setClinicianEmail('');
      setPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleClinicianLogout = () => {
    localStorage.removeItem('clinician_token');
    localStorage.removeItem('clinician_name');
    setClinicianToken(null);
  };

  // Seeding State
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Triage Dashboard State
  const [triageResponse, setTriageResponse] = useState<any>(null);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Detailed Patient Chart Drawer State
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [savingChart, setSavingChart] = useState(false);

  const fetchTriageData = async () => {
    try {
      const data = await fetchTriageResponse();
      setTriageResponse(data);
    } catch (err: any) {
      console.error("Failed to fetch triage data", err);
      if (!localStorage.getItem('clinician_token')) {
        setClinicianToken(null);
      }
    }
  };

  useEffect(() => {
    if (clinicianToken && activeSubTab === 'triage') {
      fetchTriageData();
    }
  }, [clinicianToken, activeSubTab]);

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

  const handleOpenPatientChart = async (patientId: number) => {
    setSelectedPatientId(patientId);
    setLoadingChart(true);
    setErrorMessage(null);
    try {
      const data = await fetchPatientChart(patientId);
      setPatientDetails(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch patient chart');
      setSelectedPatientId(null);
    } finally {
      setLoadingChart(false);
    }
  };

  const handleSavePatientChart = async () => {
    if (!patientDetails) return;
    setSavingChart(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = {
        first_name: patientDetails.first_name,
        last_name: patientDetails.last_name,
        dob: patientDetails.dob,
        email: patientDetails.email,
        phone: patientDetails.phone,
        cycle_start_date: patientDetails.cycle_start_date,
        current_cycle_number: patientDetails.current_cycle_number,
        treatment_package: patientDetails.treatment_package,
        partner_name: patientDetails.partner_name,
        partner_phone: patientDetails.partner_phone,
        partner_relationship: patientDetails.partner_relationship,
        partner_consent: patientDetails.partner_consent,
        prescriptions: patientDetails.prescriptions,
        next_appointment_datetime: patientDetails.next_appointment_datetime
      };
      const res = await savePatientChart(selectedPatientId!, payload);
      setSuccessMessage(res.message || 'Patient chart saved successfully.');
      // Refresh active data
      if (activeSubTab === 'triage') fetchTriageData();
      setSelectedPatientId(null);
      setPatientDetails(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save patient chart.');
    } finally {
      setSavingChart(false);
    }
  };

  const maskLastName = (fullName: string) => {
    if (!privacyMode) return fullName;
    const parts = fullName.split(' ');
    if (parts.length <= 1) return fullName;
    return `${parts[0]} ${parts[1][0]}.`;
  };

  // Login gate: no clinician session
  if (!clinicianToken) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-bg-ivory px-6">
        <div className="w-full max-w-sm bg-white border border-navy-10 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <img src="/static/logo.png" alt="Ovify Logo" className="w-10 h-10 object-contain rounded-xl bg-white p-1 border border-navy-10" />
            <div>
              <h1 className="font-heading text-lg font-bold tracking-tight text-navy">Ovify Portal</h1>
              <span className="text-[10px] font-data font-bold text-lavender tracking-wider uppercase">Clinician Console</span>
            </div>
          </div>

          <form onSubmit={handleClinicianLogin} className="space-y-4 text-left">
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Clinic Email</label>
              <input
                id="email"
                type="email"
                required
                value={clinicianEmail}
                onChange={(e) => setClinicianEmail(e.target.value)}
                className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm focus:ring-2 focus:ring-lavender/25 focus:border-lavender min-h-[48px]"
                placeholder="coordinator@clinic.ae"
              />
            </div>
            <div>
              <label htmlFor="accessKey" className="block text-[10px] font-bold text-navy uppercase tracking-wider mb-1">Access Key</label>
              <input
                id="accessKey"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm focus:ring-2 focus:ring-lavender/25 focus:border-lavender min-h-[48px]"
                placeholder="••••••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3.5 bg-due-soft border border-due/20 text-due text-xs rounded-xl font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 bg-navy hover:bg-navy-70 text-white font-heading text-sm font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98]"
            >
              {loggingIn ? 'Accessing...' : 'Access Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-ivory font-body text-navy">
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 bg-navy text-white flex flex-col justify-between p-6 shrink-0 shadow-lg border-r border-r-navy-80">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <img 
              src="/static/logo.png" 
              alt="Ovify Logo" 
              className="w-10 h-10 object-contain rounded-xl bg-white p-1"
            />
            <div>
              <h1 className="font-heading text-lg font-bold tracking-tight">Ovify</h1>
              <span className="text-[10px] font-data font-bold text-lavender tracking-wider uppercase">Clinician Console</span>
            </div>
          </div>

          <div className="px-4 py-2 bg-navy-80 rounded-xl border border-navy-10/20 text-xs font-body font-bold text-lavender">
            Staff: {localStorage.getItem('clinician_name') || 'Mona'}
          </div>

          <button
            onClick={() => setActiveSubTab('intake')}
            className="w-full py-3 bg-lavender hover:bg-lavender-dark text-white rounded-xl font-heading text-xs font-bold uppercase tracking-wider shadow-md hover:translate-y-[-1px] transition-all min-h-[48px] active:scale-[0.98]"
          >
            Register New Patient
          </button>

          <nav className="flex flex-col gap-1 text-left">
            <button
              onClick={() => setActiveSubTab('triage')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all min-h-[48px] ${
                activeSubTab === 'triage'
                  ? 'bg-navy-80 text-white border border-navy-10/20 shadow-inner'
                  : 'text-navy-30 hover:text-white hover:bg-navy-80/50'
              }`}
            >
              <span>📋</span>
              <span>Dashboard / Triage</span>
            </button>
            
            <button
              onClick={() => setActiveSubTab('directory')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all min-h-[48px] ${
                activeSubTab === 'directory'
                  ? 'bg-navy-80 text-white border border-navy-10/20 shadow-inner'
                  : 'text-navy-30 hover:text-white hover:bg-navy-80/50'
              }`}
            >
              <span>👥</span>
              <span>List of Patients</span>
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 text-xs text-navy-30">
            <span className="font-semibold">Privacy Mode</span>
            <button 
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`w-10 h-6 rounded-full transition-colors relative focus:outline-none ${privacyMode ? 'bg-lavender' : 'bg-navy-80'}`}
              aria-label="Toggle Privacy Mode"
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${privacyMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
          
          <button
            onClick={handleClinicianLogout}
            className="w-full py-2.5 border border-white/20 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-xs font-heading font-semibold transition-all min-h-[48px]"
          >
            Log Out Session
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative pb-16 bg-gradient-to-br from-bg-ivory to-bg-ivory/80">
        <header className="h-16 border-b border-navy-10 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
          <h2 className="font-heading text-sm font-bold text-navy uppercase tracking-wider">
            {activeSubTab === 'intake' ? 'Patient Intake & Protocol Builder' : activeSubTab === 'directory' ? 'Patient Directory' : 'Patient Triage Console'}
          </h2>
        </header>

        <div className="p-8 overflow-y-auto flex-1">
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-sage-soft border border-sage/20 text-sage text-xs font-body font-semibold flex items-center justify-between max-w-4xl shadow-sm animate-in fade-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-sm font-bold ml-4 p-1 hover:opacity-70">✕</button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-due-soft border border-due/20 text-due text-xs font-body font-semibold flex items-center justify-between max-w-4xl shadow-sm animate-in fade-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-sm font-bold ml-4 p-1 hover:opacity-70">✕</button>
            </div>
          )}

          {activeSubTab === 'intake' ? (
            <IntakeTab 
              onSuccess={(msg) => {
                setSuccessMessage(msg);
                fetchTriageData();
              }}
              onError={setErrorMessage} 
              setActiveSubTab={setActiveSubTab} 
            />
          ) : activeSubTab === 'directory' ? (
            <DirectoryTab 
              privacyMode={privacyMode} 
              handleOpenPatientChart={handleOpenPatientChart} 
              clinicianToken={clinicianToken} 
            />
          ) : (
            <TriageTab 
              triageResponse={triageResponse} 
              privacyMode={privacyMode} 
              handleOpenPatientChart={handleOpenPatientChart} 
              handleResolveAlert={handleResolveAlert} 
              handleUpdateOutcome={handleUpdateOutcome} 
            />
          )}
        </div>

        {/* Bottom Summary Stats Bar */}
        {clinicianToken && triageResponse && (
          <footer className="fixed bottom-0 left-64 right-0 h-12 bg-white/80 backdrop-blur-md border-t border-navy-10 px-8 flex items-center justify-between text-[11px] font-data font-bold text-navy-55 z-20">
            <div className="flex items-center gap-1.5">
              <span>📅</span>
              <span>Adherence Today: <span className="text-navy">{triageResponse?.summary_stats?.adherence_today_pct ?? 92}%</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>❓</span>
              <span>AI Questions Today: <span className="text-navy">{triageResponse?.summary_stats?.ai_questions_today ?? 14}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>⏱️</span>
              <span>Avg Confirmation Delay: <span className="text-navy">{triageResponse?.summary_stats?.avg_confirm_delay_mins ?? 8} mins</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>🤝</span>
              <span>Partner Engagement Rate: <span className="text-navy">{triageResponse?.summary_stats?.partner_engagement_pct ?? 67}%</span></span>
            </div>
          </footer>
        )}
      </main>

      {/* Patient Detailed Chart drawer slide-over */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-navy/25 backdrop-blur-sm transition-opacity"
            onClick={() => { setSelectedPatientId(null); setPatientDetails(null); }}
          />
          <div className="relative w-[500px] h-full bg-white shadow-2xl flex flex-col z-10 border-l border-navy-10 animate-in slide-in-from-right duration-300">
            {loadingChart ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-bg-ivory/30">
                <div className="w-8 h-8 rounded-full border-4 border-lavender border-t-transparent animate-spin" />
                <span className="font-heading text-xs font-bold text-navy-70 mt-3">Loading Patient Chart...</span>
              </div>
            ) : patientDetails ? (
              <>
                <div className="p-6 border-b border-navy-10 flex justify-between items-center bg-bg-ivory/50">
                  <div className="text-left">
                    <h3 className="font-heading text-base font-bold text-navy">
                      {maskLastName(patientDetails.first_name + ' ' + patientDetails.last_name)}
                    </h3>
                    <span className={`text-[8px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mt-1 ${
                      patientDetails.dropout_risk.includes('Elevated') ? 'bg-[#FEF6E9] text-[#E2A93E]' : patientDetails.dropout_risk.includes('Critical') ? 'bg-due-soft text-due' : 'bg-sage-soft text-sage'
                    }`}>
                      Risk Status: {patientDetails.dropout_risk}
                    </span>
                  </div>
                  <button 
                    onClick={() => { setSelectedPatientId(null); setPatientDetails(null); }}
                    className="w-8 h-8 rounded-full bg-white border border-navy-10 flex items-center justify-center text-navy font-bold hover:bg-bg-ivory transition-colors active:scale-95 shadow-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-bg-ivory/10">
                  {/* Section 1: Biological Profile */}
                  <div className="space-y-3 pb-5 border-b border-navy-10 text-left">
                    <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">1. Biological Profile</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">First Name</label>
                        <input 
                          type="text" 
                          value={patientDetails.first_name}
                          onChange={(e) => setPatientDetails({ ...patientDetails, first_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-lavender"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Last Name</label>
                        <input 
                          type="text" 
                          value={patientDetails.last_name}
                          onChange={(e) => setPatientDetails({ ...patientDetails, last_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-lavender"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Email</label>
                        <input 
                          type="email" 
                          value={patientDetails.email}
                          onChange={(e) => setPatientDetails({ ...patientDetails, email: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Phone</label>
                        <input 
                          type="text" 
                          value={patientDetails.phone}
                          onChange={(e) => setPatientDetails({ ...patientDetails, phone: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        value={patientDetails.dob}
                        onChange={(e) => setPatientDetails({ ...patientDetails, dob: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                      />
                    </div>
                  </div>

                  {/* Section 2: IVF Details & Cycle Info */}
                  <div className="space-y-3 pb-5 border-b border-navy-10 text-left">
                    <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">2. IVF Details & Cycle Info</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Cycle Number</label>
                        <input 
                          type="number" 
                          value={patientDetails.current_cycle_number}
                          onChange={(e) => setPatientDetails({ ...patientDetails, current_cycle_number: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Cycle Start Date</label>
                        <input 
                          type="date" 
                          value={patientDetails.cycle_start_date}
                          onChange={(e) => setPatientDetails({ ...patientDetails, cycle_start_date: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Treatment Package</label>
                      <input 
                        type="text" 
                        value={patientDetails.treatment_package}
                        onChange={(e) => setPatientDetails({ ...patientDetails, treatment_package: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-lavender"
                      />
                    </div>
                  </div>

                  {/* Section 3: Supporter Details & Consent */}
                  <div className="space-y-3 pb-5 border-b border-navy-10 text-left">
                    <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">3. Supporter Details & Consent</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Partner Name</label>
                        <input 
                          type="text" 
                          value={patientDetails.partner_name}
                          onChange={(e) => setPatientDetails({ ...patientDetails, partner_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-lavender"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Partner Phone</label>
                        <input 
                          type="text" 
                          value={patientDetails.partner_phone}
                          onChange={(e) => setPatientDetails({ ...patientDetails, partner_phone: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white border border-navy-10 p-4 rounded-xl mt-3 shadow-inner">
                      <div>
                        <span className="block text-[10px] font-bold text-navy">Data Sharing Consent</span>
                        <span className="text-[9px] text-navy-70">Permits SMS logs forwarding to partner</span>
                      </div>
                      <button
                        onClick={() => setPatientDetails({ ...patientDetails, partner_consent: !patientDetails.partner_consent })}
                        className={`px-4 py-2 rounded-xl font-heading text-[9px] font-bold uppercase transition-colors border ${
                          patientDetails.partner_consent ? 'bg-sage-soft text-sage border-sage/20' : 'bg-due-soft text-due border-due/20'
                        }`}
                      >
                        {patientDetails.partner_consent ? 'Consent Granted' : 'Consent Pending'}
                      </button>
                    </div>
                  </div>

                  {/* Section 4: Active Stimulation Protocol Editor */}
                  <div className="space-y-3 pb-5 border-b border-navy-10 text-left">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">4. Active Stimulation Protocol</h4>
                      <button 
                        onClick={() => {
                          const newPresc = {
                            name: 'Gonal-F',
                            dosage: '150 IU',
                            route: 'Subcutaneous',
                            scheduled_time: '20:00',
                            start_date: patientDetails.cycle_start_date,
                            end_date: patientDetails.cycle_start_date
                          };
                          setPatientDetails({
                            ...patientDetails,
                            prescriptions: [...patientDetails.prescriptions, newPresc]
                          });
                        }}
                        className="text-[10px] font-bold text-lavender hover:text-lavender-dark"
                      >
                        + Add Medication
                      </button>
                    </div>

                    <div className="space-y-3">
                      {patientDetails.prescriptions.map((presc: any, pIdx: number) => (
                        <div key={pIdx} className="p-4 rounded-xl border border-navy-10 bg-white relative space-y-2.5 text-left hover:border-lavender/30 hover:shadow-sm transition-all duration-155">
                          <button 
                            onClick={() => {
                              const updatedPrescs = patientDetails.prescriptions.filter((_: any, idx: number) => idx !== pIdx);
                              setPatientDetails({ ...patientDetails, prescriptions: updatedPrescs });
                            }}
                            className="absolute top-2.5 right-2.5 text-due hover:text-white hover:bg-due p-1 px-2 border border-due/20 rounded-lg text-[9px] font-bold transition-all"
                          >
                            🗑️ Delete
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-navy uppercase tracking-wider">Name</label>
                              <input 
                                type="text" 
                                value={presc.name}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, name: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2.5 py-1 text-xs border border-navy-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-lavender"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-navy uppercase tracking-wider">Dosage</label>
                              <input 
                                type="text" 
                                value={presc.dosage}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, dosage: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2.5 py-1 text-xs border border-navy-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-lavender"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-navy uppercase tracking-wider">Route</label>
                              <input 
                                type="text" 
                                value={presc.route}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, route: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2.5 py-1 text-xs border border-navy-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-lavender"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-navy uppercase tracking-wider">Scheduled Time</label>
                              <input 
                                type="time" 
                                value={presc.scheduled_time.slice(0, 5)}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, scheduled_time: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2.5 py-1 text-xs border border-navy-10 rounded-lg font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-navy uppercase tracking-wider">Start Date</label>
                              <input 
                                type="date" 
                                value={presc.start_date}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, start_date: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2.5 py-1 text-xs border border-navy-10 rounded-lg font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-navy uppercase tracking-wider">End Date</label>
                              <input 
                                type="date" 
                                value={presc.end_date}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, end_date: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2.5 py-1 text-xs border border-navy-10 rounded-lg font-data focus:outline-none focus:ring-1 focus:ring-lavender"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 5: Dose Log History Timeline */}
                  <div className="space-y-3 pb-5 border-b border-navy-10 text-left">
                    <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">5. Dose Log History Timeline</h4>
                    {patientDetails.dose_logs.length === 0 ? (
                      <p className="text-[10px] text-navy-70 italic font-semibold">No logs recorded yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {patientDetails.dose_logs.map((log: any, lIdx: number) => (
                          <div key={lIdx} className="flex justify-between items-center p-3.5 rounded-xl bg-white border border-navy-10 text-xs shadow-sm">
                            <div>
                              <span className="font-bold text-navy block">{log.name}</span>
                              <span className="text-[9px] text-navy-70 font-data mt-0.5 font-semibold">Target: {log.scheduled_time.slice(0, 5)}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[8px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block border ${
                                log.status === 'On Time' ? 'bg-sage-soft text-sage border-sage/20' : 'bg-due-soft text-due border-due/20'
                              }`}>
                                {log.status}
                              </span>
                              {log.logged_at && (
                                <span className="block text-[9px] text-navy-70 font-data font-semibold mt-1">
                                  Logged: {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 6: AI Compliance & Risk Assessments */}
                  <div className="space-y-3 text-left">
                    <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">6. AI Compliance & Risk Assessments</h4>
                    <div className="p-4 rounded-xl bg-lavender-soft/40 border border-lavender/30 text-xs shadow-sm">
                      <span className="block font-bold text-lavender-dark mb-1">Clinic Analytics Risk Rating</span>
                      <p className="font-body text-navy-70 leading-relaxed font-semibold">
                        This patient is classified as having {patientDetails.dropout_risk} dropout likelihood based on cycle logs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-navy-10 flex gap-3 bg-bg-ivory/50">
                  <button
                    onClick={() => { setSelectedPatientId(null); setPatientDetails(null); }}
                    className="flex-1 py-3 border border-navy-10 rounded-xl font-heading text-xs font-semibold text-navy hover:bg-bg-ivory transition-colors min-h-[48px]"
                  >
                    Close Drawer
                  </button>
                  <button
                    onClick={handleSavePatientChart}
                    disabled={savingChart}
                    className="flex-1 py-3 bg-navy hover:bg-navy-70 text-white rounded-xl font-heading text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 min-h-[48px]"
                  >
                    {savingChart ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
