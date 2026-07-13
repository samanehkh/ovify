import React, { useState } from 'react';
import {
  fetchTriageResponse,
  fetchPatientChart,
  savePatientChart,
  fetchPatientDirectory,
  resolveTriageAlert,
  updateCycleOutcome,
  registerPatient,
  loginClinician
} from '../services/api';
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

export const ClinicianPortalPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'intake' | 'triage' | 'directory'>('intake');

  // Clinician session state — token lives in localStorage
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
  
  // Demographics Form State (US-J1-01)
  const [firstName, setFirstName] = useState('Sarah');
  const [lastName, setLastName] = useState('Khan');
  const [phone, setPhone] = useState('+971 50 777 7777');
  const [email, setEmail] = useState('sarah.khan.new@example.com');
  const [dob, setDob] = useState('1992-05-15');
  const [cycleStartDate, setCycleStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [currentCycleNumber, setCurrentCycleNumber] = useState<number>(1);
  const [treatmentPackage, setTreatmentPackage] = useState('3-Cycle Egg/Embryo Accumulation');
  const [customPackageName, setCustomPackageName] = useState('');
  
  // Support Supporter Contacts (US-J1-01)
  const [partnerName, setPartnerName] = useState('Ahmed Khan');
  const [partnerPhone, setPartnerPhone] = useState('+971 50 999 9999');
  const [partnerRelationship, setPartnerRelationship] = useState('Spouse/Partner');

  // Next Scan Appointment (US-J1-01)
  const [nextAppointmentDate, setNextAppointmentDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 4);
    return future.toISOString().split('T')[0];
  });
  const [nextAppointmentTime, setNextAppointmentTime] = useState('09:00');

  // Modal Dialog toggles
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isPreviewPopupOpen, setIsPreviewPopupOpen] = useState(false);


  // Stimulation Protocol Builder state (US-J1-01)
  const [prescriptions, setPrescriptions] = useState<ParsedMed[]>([]);
  const [medSearchQuery, setMedSearchQuery] = useState('');

  const handleAddMedication = (medName: string) => {
    const newMed: ParsedMed = {
      name: medName,
      dosage: '150 IU',
      route: 'Subcutaneous',
      scheduled_time: '19:00',
      start_date: cycleStartDate,
      end_date: cycleStartDate,
      flagged: false
    };
    setPrescriptions([...prescriptions, newMed]);
    setMedSearchQuery('');
  };

  const handleRemoveMedication = (index: number) => {
    setPrescriptions(prescriptions.filter((_, idx) => idx !== index));
  };

  const handleUpdateMedication = (index: number, key: keyof ParsedMed, value: any) => {
    const updated = prescriptions.map((med, idx) => {
      if (idx === index) {
        return { ...med, [key]: value };
      }
      return med;
    });
    setPrescriptions(updated);
  };

  const FORMULARY_SUGGESTIONS = ['Gonal-F', 'Menopur', 'Cetrotide', 'Ovitrelle', 'Lupron', 'Rekovelle', 'Progynova', 'Clexane'];

  // Seeding State
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Triage Dashboard State (US-J8-01)
  const [triageResponse, setTriageResponse] = useState<any>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [revealedAiInsightIds, setRevealedAiInsightIds] = useState<number[]>([]);
  const [patientToMarkFailed, setPatientToMarkFailed] = useState<number | null>(null);

  // Detailed Patient Chart Drawer State (US-J8-02)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [savingChart, setSavingChart] = useState(false);

  // Patient Directory State (US-J8-03)
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryDate, setDirectoryDate] = useState('');
  const [directoryPackage, setDirectoryPackage] = useState('All Packages');
  const [directoryPatients, setDirectoryPatients] = useState<any[]>([]);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const directoryLimit = 20;
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  const fetchDirectoryData = async () => {
    setLoadingDirectory(true);
    try {
      const data = await fetchPatientDirectory(
        directorySearch,
        directoryDate,
        directoryPackage,
        directoryPage,
        directoryLimit
      );
      setDirectoryPatients(data.patients);
      setDirectoryTotal(data.total_count);
    } catch (err: any) {
      console.error("Failed to fetch directory data", err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  // Reset page when filters change
  React.useEffect(() => {
    setDirectoryPage(1);
  }, [directorySearch, directoryDate, directoryPackage]);

  React.useEffect(() => {
    if (clinicianToken && activeSubTab === 'directory') {
      fetchDirectoryData();
    }
  }, [clinicianToken, activeSubTab, directorySearch, directoryDate, directoryPackage, directoryPage]);



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
        next_appointment_datetime: patientDetails.next_appointment_datetime,
        prescriptions: patientDetails.prescriptions
      };
      await savePatientChart(patientDetails.id, payload);
      setSuccessMessage('Patient chart updated successfully.');
      setSelectedPatientId(null);
      setPatientDetails(null);
      fetchTriageData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save patient chart');
    } finally {
      setSavingChart(false);
    }
  };

  React.useEffect(() => {
    if (clinicianToken) {
      fetchTriageData();
      
      // Background polling sync every 30 minutes (US-J8-01)
      const interval = setInterval(() => {
        fetchTriageData();
      }, 30 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeSubTab, clinicianToken]);

  // Submit Patient Registration (US-J1-01)
  const handleRegisterPatient = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const nextAppointmentDatetime = `${nextAppointmentDate}T${nextAppointmentTime}:00Z`;
      // Map scheduled_time to standard format if needed (e.g. HH:MM:SS)
      const formattedPrescriptions = prescriptions.map(p => ({
        ...p,
        scheduled_time: p.scheduled_time.includes(':') && p.scheduled_time.split(':').length === 2 
          ? `${p.scheduled_time}:00` 
          : p.scheduled_time
      }));
      await registerPatient({
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        dob,
        cycle_start_date: cycleStartDate,
        current_cycle_number: currentCycleNumber,
        treatment_package: treatmentPackage,
        custom_package_name: treatmentPackage === 'Other (Custom)' ? customPackageName : undefined,
        partner_name: partnerName,
        partner_phone: partnerPhone,
        partner_relationship: partnerRelationship,
        next_appointment_datetime: nextAppointmentDatetime,
        prescriptions: formattedPrescriptions
      });
      setSuccessMessage(`${firstName} ${lastName} registered successfully. SMS invite sent.`);
      // Clear forms
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setPrescriptions([]);
      setCustomPackageName('');
      setPartnerName('');
      setPartnerPhone('');
      // Redirect to dashboard (US-J1-01)
      setActiveSubTab('triage');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = () => {
    setFirstName('Sarah');
    setLastName('Khan');
    setPhone('+971 50 777 7777');
    setEmail('sarah.khan.new@example.com');
    setDob('1992-05-15');
    setTreatmentPackage('3-Cycle Egg/Embryo Accumulation');
    setCustomPackageName('');
    setPartnerName('Ahmed Khan');
    setPartnerPhone('+971 50 999 9999');
    setPartnerRelationship('Spouse/Partner');
    setPrescriptions([]);
    setIsCancelConfirmOpen(false);
    // Redirect to dashboard (US-J1-01)
    setActiveSubTab('triage');
  };

  // Login gate: no clinician session — ask for clinician credentials
  if (!clinicianToken) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#F8F5F1] px-6">
        <div className="w-full max-w-sm bg-white border border-navy-10 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <img src="/static/logo.png" alt="Ovify Logo" className="w-10 h-10 object-contain rounded-xl bg-white p-1 border border-navy-10" />
            <div>
              <h1 className="font-heading text-lg font-bold tracking-tight text-navy">Ovify Portal</h1>
              <span className="text-[10px] font-data font-bold text-lavender-dark tracking-wider uppercase">Clinician Console</span>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-blush-10 border border-blush/25 text-due text-xs font-body font-semibold" role="alert">
              {loginError}
            </div>
          )}

          <form onSubmit={handleClinicianLogin} className="space-y-5">
            <div>
              <label htmlFor="clinicianEmail" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <input
                id="clinicianEmail"
                type="email"
                autoComplete="email"
                value={clinicianEmail}
                onChange={(e) => setClinicianEmail(e.target.value)}
                placeholder="mona.nurse@clinic.ae"
                required
                className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white font-data focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
              />
              <p className="mt-2 text-[11px] font-body text-navy-55 leading-relaxed">
                Registered clinic staff email address.
              </p>
            </div>
            <div>
              <label htmlFor="password" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white font-data focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
              />
              <p className="mt-2 text-[11px] font-body text-navy-55 leading-relaxed">
                Passwords are case sensitive. Sessions expire after 24 hours.
              </p>
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 bg-navy hover:bg-navy-80 text-white font-heading text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {loggingIn ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const maskLastName = (fullName: string) => {
    if (!privacyMode) return fullName;
    const parts = fullName.split(' ');
    if (parts.length <= 1) return fullName;
    return `${parts[0]} ${parts[1][0]}.`;
  };

  const renderPatientTriageCard = (pt: any, color: 'red' | 'amber' | 'green') => {
    const isUrgent = color === 'red';
    const isAmber = color === 'amber';
    const borderStyle = isUrgent 
      ? 'border-[#FDF2F3] hover:border-[#C24C57]' 
      : isAmber 
        ? 'border-[#FEF6E9] hover:border-[#E2A93E]' 
        : 'border-[#E6F4EF] hover:border-[#3E8E6E]';

    return (
      <div 
        key={pt.patient_id}
        onClick={() => handleOpenPatientChart(pt.patient_id)}
        className={`p-4 rounded-xl bg-white border shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md ${borderStyle}`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="text-left">
            <h5 className="font-heading text-xs font-bold text-navy hover:underline">
              {maskLastName(pt.name)}
            </h5>
            <span className="text-[9px] text-navy-55 font-data block mt-0.5">{pt.cycle_type}</span>
          </div>
          <span className={`text-[8px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isUrgent ? 'bg-[#FDF2F3] text-[#C24C57]' : isAmber ? 'bg-[#FEF6E9] text-[#E2A93E]' : 'bg-[#E6F4EF] text-[#3E8E6E]'
          }`}>
            {pt.status}
          </span>
        </div>

        <p className="font-body text-[11px] text-navy-70 mt-2.5 leading-relaxed bg-[#F8F5F1]/30 p-2 rounded-lg border border-navy-10/40 text-left">
          {pt.reason}
        </p>

        {pt.action_taken && (
          <div className="flex items-center gap-1.5 text-[9px] font-data font-bold text-navy-55 mt-2 bg-[#F3F1FE] px-2 py-1 rounded-md border border-[#F3F1FE]/30">
            <span>💬</span>
            <span>{pt.action_taken}</span>
          </div>
        )}

        {pt.ai_insight && (
          <div className="mt-3 p-3 bg-lavender-soft border border-lavender/30 rounded-xl text-left">
            <span className="block text-[8px] font-bold text-lavender-dark tracking-wider uppercase mb-1">🤖 AI Retention Warning</span>
            {privacyMode && !revealedAiInsightIds.includes(pt.patient_id) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRevealedAiInsightIds([...revealedAiInsightIds, pt.patient_id]);
                }}
                className="text-[10px] font-bold text-lavender-dark hover:underline flex items-center gap-1"
              >
                👁️ Tap to reveal AI Insight
              </button>
            ) : (
              <p className="font-body text-[10px] text-navy-70 leading-relaxed font-medium">
                {pt.ai_insight}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-navy-10/40" onClick={(e) => e.stopPropagation()}>
          {pt.status !== 'On Track' && (
            <button
              onClick={() => handleResolveAlert(pt.patient_id)}
              className="px-2.5 py-1 text-[9px] font-heading font-bold text-white bg-navy hover:bg-navy-80 rounded-lg transition-colors"
            >
              Resolve Alert
            </button>
          )}
          {pt.cycle_outcome === 'Failed' ? (
            <span className="text-[9px] font-data font-bold text-[#C24C57] bg-[#FDF2F3] px-2 py-1 rounded-md">Recovery Active</span>
          ) : (
            <button
              onClick={() => setPatientToMarkFailed(pt.patient_id)}
              className="px-2.5 py-1 text-[9px] font-heading font-bold text-[#C24C57] border border-[#C24C57] hover:bg-[#FDF2F3] rounded-lg transition-colors"
            >
              Mark Failed
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F8F5F1] font-body text-navy">

      {/* 1. Left Sidebar Navigation (Desktop/Tablet Design) */}
      <aside className="w-64 bg-navy text-white flex flex-col justify-between p-6 shrink-0 shadow-lg border-r border-r-navy-80">
        <div className="space-y-8">
          {/* Logo Mark Header */}
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

          {/* Active Staff Greeting */}
          <div className="px-4 py-2 bg-navy-80 rounded-xl border border-navy-10/20 text-xs font-body font-bold text-lavender">
            Staff: {localStorage.getItem('clinician_name') || 'Mona'}
          </div>

          {/* Registration Trigger Highlighted Button */}
          <button
            onClick={() => setActiveSubTab('intake')}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-heading text-xs font-bold tracking-wide transition-all duration-200 ${
              activeSubTab === 'intake'
                ? 'bg-sage text-white shadow-md'
                : 'bg-lavender text-white hover:bg-lavender/90 shadow-sm'
            }`}
          >
            <span>➕</span>
            <span>Register New Patient</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSubTab('triage')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-heading text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeSubTab === 'triage'
                  ? 'bg-navy-80 text-white'
                  : 'text-navy-30 hover:bg-navy-80 hover:text-white'
              }`}
            >
              <span>🚨</span>
              <span>Dashboard / Triage</span>
            </button>
            <button
              onClick={() => setActiveSubTab('directory')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-heading text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeSubTab === 'directory'
                  ? 'bg-navy-80 text-white'
                  : 'text-navy-30 hover:bg-navy-80 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>List of Patients</span>
            </button>
            <button
              disabled
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-heading text-xs font-semibold tracking-wide text-navy-30/40 cursor-not-allowed opacity-50"
            >
              <span>📈</span>
              <span>Clinic Predictions</span>
            </button>
            <button
              disabled
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-heading text-xs font-semibold tracking-wide text-navy-30/40 cursor-not-allowed opacity-50"
            >
              <span>⚙️</span>
              <span>Formulary Setup</span>
            </button>
            <button
              disabled
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-heading text-xs font-semibold tracking-wide text-navy-30/40 cursor-not-allowed opacity-50"
            >
              <span>👥</span>
              <span>Clinician Management</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="border-t border-navy-80 pt-4 flex flex-col gap-2 text-[10px] text-navy-30 font-data uppercase">
          <div>Clinic ID: DXB-IVF-01</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
            <span>Connection Secure</span>
          </div>
          <button
            onClick={handleClinicianLogout}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-navy-80 text-navy-30 hover:bg-navy-80 hover:text-white font-heading text-[10px] font-semibold tracking-wide transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* 2. Main Content Frame (Widescreen Spacious Area) */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Panel */}
        <header className="h-16 border-b border-navy-10 bg-white/70 backdrop-blur-md px-8 flex items-center justify-between z-10 shrink-0">
          <div>
            <h2 className="font-heading text-sm font-bold text-navy">
              {activeSubTab === 'intake' ? 'Patient Intake & Protocol Builder' : activeSubTab === 'directory' ? 'Patient Directory' : 'Patient Triage Console'}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-navy-55 font-data">
            <button
              onClick={() => setActiveSubTab('intake')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lavender/10 text-lavender hover:bg-lavender/20 font-heading text-xs font-bold transition-all"
            >
              <span>+</span> New Patient
            </button>
            <div className="flex items-center gap-2 mr-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={privacyMode} 
                  onChange={(e) => setPrivacyMode(e.target.checked)}
                  className="w-4 h-4 text-lavender border-navy-10 rounded focus:ring-lavender"
                />
                <span className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider">Privacy Mode</span>
              </label>
            </div>
            <div className="w-px h-4 bg-navy-10" />
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
            <div className="max-w-4xl bg-white border border-navy-10 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider">Patient Bio & Registration</h3>
                  <span className="px-2.5 py-1 rounded-full bg-navy-10 text-navy font-data text-[10px] font-bold">Cycle ID: NEW</span>
                </div>
                
                <div className="space-y-5">
                  {/* Section 1: Patient Biological Profile */}
                  <div className="border-b border-navy-10 pb-4 mb-4">
                    <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-3">1. Biological Profile</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="firstName" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">First Name</label>
                        <input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Last Name</label>
                        <input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="phone" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Phone Number</label>
                        <input
                          id="phone"
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Email Address</label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label htmlFor="dob" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Date of Birth</label>
                        <input
                          id="dob"
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Treatment & Cycle Setup */}
                  <div className="border-b border-navy-10 pb-4 mb-4">
                    <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-3">2. Treatment & Cycle Setup</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="cycleStartDate" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Cycle Start Date</label>
                        <input
                          id="cycleStartDate"
                          type="date"
                          value={cycleStartDate}
                          onChange={(e) => setCycleStartDate(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                      <div>
                        <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Current Cycle Number</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setCurrentCycleNumber(prev => Math.max(1, prev - 1))}
                            className="w-10 h-10 flex items-center justify-center border border-navy-10 rounded-xl bg-white text-navy font-bold hover:bg-[#F8F5F1] transition-all text-sm font-heading"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-bold font-data text-navy">{currentCycleNumber}</span>
                          <button
                            type="button"
                            onClick={() => setCurrentCycleNumber(prev => Math.min(3, prev + 1))}
                            className="w-10 h-10 flex items-center justify-center border border-navy-10 rounded-xl bg-white text-navy font-bold hover:bg-[#F8F5F1] transition-all text-sm font-heading"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label htmlFor="treatmentPackage" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Treatment Package</label>
                        <select
                          id="treatmentPackage"
                          value={treatmentPackage}
                          onChange={(e) => setTreatmentPackage(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                        >
                          <option value="Single IVF/ICSI Cycle (Fresh)">Single IVF/ICSI Cycle (Fresh)</option>
                          <option value="Frozen Embryo Transfer (FET) Cycle">Frozen Embryo Transfer (FET) Cycle</option>
                          <option value="3-Cycle Egg/Embryo Accumulation">3-Cycle Egg/Embryo Accumulation</option>
                          <option value="Social Egg Freezing (Oocyte Vitrification)">Social Egg Freezing (Oocyte Vitrification)</option>
                          <option value="IUI (Intrauterine Insemination)">IUI (Intrauterine Insemination)</option>
                          <option value="Other (Custom)">Other (Custom)</option>
                        </select>
                      </div>
                      
                      {treatmentPackage === 'Other (Custom)' && (
                        <div className="animate-fadeIn">
                          <label htmlFor="customPackageName" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Custom Package Name</label>
                          <input
                            id="customPackageName"
                            type="text"
                            value={customPackageName}
                            onChange={(e) => setCustomPackageName(e.target.value)}
                            placeholder="Enter custom package name"
                            className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Escalation Support Contact */}
                  <div className="border-b border-navy-10 pb-4 mb-4">
                    <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-3">3. Escalation Support Contact</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="partnerName" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Supporter Name</label>
                        <input
                          id="partnerName"
                          type="text"
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="partnerPhone" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Supporter Phone</label>
                        <input
                          id="partnerPhone"
                          type="text"
                          value={partnerPhone}
                          onChange={(e) => setPartnerPhone(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Relationship Role</span>
                        <div className="flex gap-2">
                          {['Spouse/Partner', 'Family', 'Friend'].map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setPartnerRelationship(role)}
                              className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${
                                partnerRelationship === role
                                  ? 'bg-lavender border-lavender text-white shadow-sm'
                                  : 'bg-white border-navy-10 text-navy hover:bg-[#F8F5F1]/50'
                              }`}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Next Scan Appointment */}
                  <div className="border-b border-navy-10 pb-4 mb-4">
                    <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-3">4. Next Scan Appointment</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nextAppointmentDate" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Scan Date</label>
                        <input
                          id="nextAppointmentDate"
                          type="date"
                          value={nextAppointmentDate}
                          onChange={(e) => setNextAppointmentDate(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="nextAppointmentTime" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Scan Time</label>
                        <input
                          id="nextAppointmentTime"
                          type="time"
                          value={nextAppointmentTime}
                          onChange={(e) => setNextAppointmentTime(e.target.value)}
                          className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Stimulation Protocol Builder (US-J1-01) */}
                  <div className="pt-2">
                    <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-3">5. Stimulation Protocol Builder</h4>
                    
                    {/* Search & Suggestions */}
                    <div className="mb-4 relative">
                      <label htmlFor="medSearch" className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Search or Select Medication</label>
                      <input
                        id="medSearch"
                        type="text"
                        value={medSearchQuery}
                        onChange={(e) => setMedSearchQuery(e.target.value)}
                        placeholder="Search medication name (e.g. Rekovelle)..."
                        className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/10 focus:border-lavender transition-all"
                      />
                      
                      {/* Auto-suggest dropdown when searching */}
                      {medSearchQuery && (
                        <div className="absolute left-0 right-0 mt-1 border border-navy-10 rounded-xl bg-white shadow-lg overflow-hidden max-h-40 overflow-y-auto z-20">
                          {FORMULARY_SUGGESTIONS.filter(med => med.toLowerCase().includes(medSearchQuery.toLowerCase())).map((med, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddMedication(med)}
                              className="w-full text-left px-4 py-2 text-sm text-navy hover:bg-lavender/10 transition-colors"
                            >
                              {med}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick card select grid */}
                    <div className="mb-6">
                      <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-2">Quick Add common medications:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {['Gonal-F', 'Menopur', 'Cetrotide', 'Ovitrelle', 'Lupron'].map((med) => (
                          <button
                            key={med}
                            type="button"
                            onClick={() => handleAddMedication(med)}
                            className="py-2.5 px-3 bg-[#F8F5F1] hover:bg-lavender/15 hover:text-lavender border border-navy-10 rounded-xl text-xs font-semibold text-navy transition-all"
                          >
                            + {med}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Manual Prescription cards list */}
                    <div className="space-y-4">
                      <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">Prescribed Stim Timeline:</span>
                      {prescriptions.length === 0 ? (
                        <div className="py-8 text-center text-navy-30 font-body text-xs border border-dashed border-navy-10 rounded-xl">
                          No medications added yet. Search or click a quick-add button to build the protocol.
                        </div>
                      ) : (
                        prescriptions.map((med, idx) => (
                          <div key={idx} className="p-5 rounded-2xl bg-white border border-navy-10 flex flex-col gap-4 shadow-sm relative text-left">
                            <button
                              type="button"
                              onClick={() => handleRemoveMedication(idx)}
                              className="absolute top-4 right-4 text-due hover:text-due-dark text-xs p-1 px-2.5 border border-blush/20 hover:bg-blush-10 rounded-lg transition-colors"
                              aria-label="Delete Medication"
                            >
                              🗑️ Delete
                            </button>
                            <div className="font-heading text-sm font-bold text-navy pr-16">{med.name}</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1">Dosage</label>
                                <select
                                  value={med.dosage}
                                  onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                                  className="w-full px-3 py-2 border border-navy-10 rounded-xl text-xs text-navy bg-white focus:outline-none"
                                >
                                  <option value="75 IU">75 IU</option>
                                  <option value="150 IU">150 IU</option>
                                  <option value="225 IU">225 IU</option>
                                  <option value="300 IU">300 IU</option>
                                  <option value="0.25mg">0.25mg</option>
                                  <option value="250 mcg">250 mcg</option>
                                  <option value="Custom">Custom</option>
                                </select>
                              </div>
                              <div>
                                <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1">Route</label>
                                <select
                                  value={med.route}
                                  onChange={(e) => handleUpdateMedication(idx, 'route', e.target.value)}
                                  className="w-full px-3 py-2 border border-navy-10 rounded-xl text-xs text-navy bg-white focus:outline-none"
                                >
                                  <option value="Subcutaneous">Subcutaneous</option>
                                  <option value="Intramuscular">Intramuscular</option>
                                </select>
                              </div>
                              <div>
                                <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1">Time</label>
                                <input
                                  type="time"
                                  value={med.scheduled_time}
                                  onChange={(e) => handleUpdateMedication(idx, 'scheduled_time', e.target.value)}
                                  className="w-full px-3 py-2 border border-navy-10 rounded-xl text-xs text-navy bg-white focus:outline-none font-data"
                                />
                              </div>
                              <div>
                                <label className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1">Start Date</label>
                                <input
                                  type="date"
                                  value={med.start_date}
                                  onChange={(e) => handleUpdateMedication(idx, 'start_date', e.target.value)}
                                  className="w-full px-3 py-2 border border-navy-10 rounded-xl text-xs text-navy bg-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="mt-8 pt-4 border-t border-navy-10 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="flex-1 py-3.5 border border-blush text-due hover:bg-blush-10 font-heading text-sm font-semibold rounded-xl transition-colors duration-200"
                >
                  Cancel Draft
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsPreviewPopupOpen(true)}
                  className="flex-1 py-3.5 bg-navy hover:bg-navy-80 text-white font-heading text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <span>Register Patient</span>
                  )}
                </button>
              </div>
            </div>
          ) : activeSubTab === 'directory' ? (
            <div className="max-w-7xl bg-white border border-navy-10 rounded-3xl p-8 shadow-sm">
              <div className="mb-6 text-left">
                <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider mb-2">Patient Directory</h3>
                <p className="font-body text-xs text-navy-55 leading-relaxed">
                  Search, filter, and inspect demographics or stimulation protocols for registered patients.
                </p>
              </div>

              {/* Header Toolbar (Search & Filters) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-left">
                <div>
                  <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Search Patients</label>
                  <input
                    type="text"
                    placeholder="Search by name, email or phone..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Registration Date (From)</label>
                  <input
                    type="date"
                    value={directoryDate}
                    onChange={(e) => setDirectoryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Treatment Package</label>
                  <select
                    value={directoryPackage}
                    onChange={(e) => setDirectoryPackage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl bg-white"
                  >
                    <option value="All Packages">All Packages</option>
                    <option value="3-Cycle Egg/Embryo Accumulation">3-Cycle Accumulation</option>
                    <option value="Single Cycle IVF">Single Cycle IVF</option>
                    <option value="Other (Custom)">Other (Custom)</option>
                  </select>
                </div>
              </div>

              {/* Table View */}
              <div className="overflow-x-auto text-left">
                {loadingDirectory ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-lavender border-t-transparent animate-spin" />
                    <span className="font-heading text-xs font-bold text-navy-55 mt-2">Loading Directory...</span>
                  </div>
                ) : directoryPatients.length === 0 ? (
                  <div className="py-8 text-center text-navy-55 text-xs">
                    No patients found matching your search criteria. Try adjusting your filters.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-navy-10 text-[10px] font-heading font-bold text-navy-55 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Patient Details</th>
                        <th className="py-3.5 px-4">Contact Info</th>
                        <th className="py-3.5 px-4">Active Status</th>
                        <th className="py-3.5 px-4">Assigned Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="font-body">
                      {directoryPatients.map((pt) => (
                        <tr 
                          key={pt.patient_id} 
                          onClick={() => handleOpenPatientChart(pt.patient_id)}
                          className="border-b border-navy-10 hover:bg-[#F8F5F1]/30 transition-all duration-150 cursor-pointer hover:translate-x-1"
                        >
                          <td className="py-4 px-4">
                            <div className="font-bold text-navy">{maskLastName(pt.name)}</div>
                            <div className="text-[10px] text-navy-55 font-data mt-0.5">
                              Registered: {pt.created_at ? new Date(pt.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs font-data">
                            <div className="text-navy">{pt.phone}</div>
                            <div className="text-navy-55">{pt.email}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-[8px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                              pt.status === 'Stimulation' ? 'bg-lavender/10 text-lavender' : pt.status === 'Recovery Active' ? 'bg-[#FDF2F3] text-[#C24C57]' : 'bg-navy-10 text-navy-55'
                            }`}>
                              {pt.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-navy-70">
                            {pt.cycle_type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls Footer (US-J8-03) */}
              {!loadingDirectory && directoryPatients.length > 0 && (
                <div className="mt-6 pt-4 border-t border-navy-10 flex justify-between items-center text-xs">
                  <div className="font-data font-bold text-navy-55">
                    Showing {Math.min((directoryPage - 1) * directoryLimit + 1, directoryTotal)} - {Math.min(directoryPage * directoryLimit, directoryTotal)} of {directoryTotal} patients
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDirectoryPage(p => Math.max(p - 1, 1))}
                      disabled={directoryPage === 1}
                      className="px-3.5 py-1.5 border border-navy-10 rounded-xl font-heading font-bold text-navy hover:bg-[#F8F5F1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setDirectoryPage(p => p + 1)}
                      disabled={directoryPage * directoryLimit >= directoryTotal}
                      className="px-3.5 py-1.5 border border-navy-10 rounded-xl font-heading font-bold text-navy hover:bg-[#F8F5F1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-7xl bg-white border border-navy-10 rounded-3xl p-8 shadow-sm">
              <div className="mb-6 flex justify-between items-center text-left">
                <div>
                  <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider mb-2">IVF Patient Triage Grid</h3>
                  <p className="font-body text-xs text-navy-55 leading-relaxed">
                    Real-time clinical monitoring of compliance. Patients with missing logs escalate through priority tiers to prevent dropouts.
                  </p>
                </div>
              </div>

              {/* Urgency Summary Counts Row (US-J8-01) */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-5 rounded-2xl bg-white border border-[#E6F4EF] shadow-sm flex items-center justify-between text-left">
                  <div>
                    <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">On Track</span>
                    <p className="font-heading text-3xl font-extrabold text-[#3E8E6E] mt-1.5">{triageResponse?.counts?.on_track ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#E6F4EF] text-[#3E8E6E] flex items-center justify-center font-bold text-sm">✓</div>
                </div>
                
                <div className="p-5 rounded-2xl bg-white border border-[#FEF6E9] shadow-sm flex items-center justify-between text-left">
                  <div>
                    <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">Needs Attention</span>
                    <p className="font-heading text-3xl font-extrabold text-[#E2A93E] mt-1.5">{triageResponse?.counts?.needs_attention ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#FEF6E9] text-[#E2A93E] flex items-center justify-center font-bold text-sm">!</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#FDF2F3] shadow-sm flex items-center justify-between text-left">
                  <div>
                    <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">Urgent Alerts</span>
                    <p className="font-heading text-3xl font-extrabold text-[#C24C57] mt-1.5">{triageResponse?.counts?.urgent ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#FDF2F3] text-[#C24C57] flex items-center justify-center font-bold text-sm">🚨</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-navy-10 shadow-sm flex items-center justify-between text-left">
                  <div>
                    <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">Total Active</span>
                    <p className="font-heading text-3xl font-extrabold text-navy mt-1.5">{triageResponse?.counts?.total_active ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-navy-10 text-navy flex items-center justify-center font-bold text-sm">👥</div>
                </div>
              </div>

              {/* Three-Deck Triage Horizontal Rows (US-J8-01) */}
              <div className="flex flex-col gap-6 mb-16 text-left">
                {/* Urgent Alerts Row */}
                <div className="p-5 rounded-2xl bg-[#FDF2F3]/30 border border-[#FDF2F3] flex flex-col gap-4">
                  <h4 className="font-heading text-xs font-bold text-[#C24C57] uppercase tracking-wider flex items-center gap-2 border-b border-[#FDF2F3] pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C24C57] animate-pulse" />
                    Urgent Alerts ({triageResponse?.urgent?.length ?? 0})
                  </h4>
                  {triageResponse?.urgent?.length === 0 ? (
                    <p className="text-[10px] text-navy-55 italic p-1">No urgent alerts</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {triageResponse?.urgent?.map((pt: any) => renderPatientTriageCard(pt, 'red'))}
                    </div>
                  )}
                </div>

                {/* Needs Attention Row */}
                <div className="p-5 rounded-2xl bg-[#FEF6E9]/30 border border-[#FEF6E9] flex flex-col gap-4">
                  <h4 className="font-heading text-xs font-bold text-[#E2A93E] uppercase tracking-wider flex items-center gap-2 border-b border-[#FEF6E9] pb-2">
                    <span className="w-2 h-2 bg-[#E2A93E] rounded-full" />
                    Needs Attention ({triageResponse?.needs_attention?.length ?? 0})
                  </h4>
                  {triageResponse?.needs_attention?.length === 0 ? (
                    <p className="text-[10px] text-navy-55 italic p-1">No attention flags</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {triageResponse?.needs_attention?.map((pt: any) => renderPatientTriageCard(pt, 'amber'))}
                    </div>
                  )}
                </div>

                {/* On Track Row */}
                <div className="p-5 rounded-2xl bg-[#E6F4EF]/30 border border-[#E6F4EF] flex flex-col gap-4">
                  <h4 className="font-heading text-xs font-bold text-[#3E8E6E] uppercase tracking-wider flex items-center gap-2 border-b border-[#E6F4EF] pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3E8E6E]" />
                    On Track ({triageResponse?.on_track?.length ?? 0})
                  </h4>
                  {triageResponse?.on_track?.length === 0 ? (
                    <p className="text-[10px] text-navy-55 italic p-1">No active compliant patients</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {triageResponse?.on_track?.map((pt: any) => renderPatientTriageCard(pt, 'green'))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Summary Stats Bar (US-J8-01) */}
        {!clinicianToken ? null : (
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

      {/* Helper function to render triage cards */}
      {(() => {
        // Define helper elements in scope
        (window as any).maskLastName = maskLastName;
      })()}

      {/* Patient Detailed Chart drawer slide-over (US-J8-02) */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-navy/25 backdrop-blur-sm transition-opacity"
            onClick={() => { setSelectedPatientId(null); setPatientDetails(null); }}
          />
          <div className="relative w-[500px] h-full bg-white shadow-2xl flex flex-col z-10 border-l border-navy-10 animate-in slide-in-from-right duration-300">
            {loadingChart ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-lavender border-t-transparent animate-spin" />
                <span className="font-heading text-xs font-bold text-navy-55 mt-3">Loading Patient Chart...</span>
              </div>
            ) : patientDetails ? (
              <>
                <div className="p-6 border-b border-navy-10 flex justify-between items-center bg-[#F8F5F1]/30">
                  <div className="text-left">
                    <h3 className="font-heading text-base font-bold text-navy">
                      {maskLastName(patientDetails.first_name + ' ' + patientDetails.last_name)}
                    </h3>
                    <span className={`text-[8px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mt-1 ${
                      patientDetails.dropout_risk.includes('Elevated') ? 'bg-[#FEF6E9] text-[#E2A93E]' : patientDetails.dropout_risk.includes('Critical') ? 'bg-[#FDF2F3] text-[#C24C57]' : 'bg-[#E6F4EF] text-[#3E8E6E]'
                    }`}>
                      Risk Status: {patientDetails.dropout_risk}
                    </span>
                  </div>
                  <button 
                    onClick={() => { setSelectedPatientId(null); setPatientDetails(null); }}
                    className="w-8 h-8 rounded-full bg-white border border-navy-10 flex items-center justify-center text-navy font-bold hover:bg-navy-10/40 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                  {/* Section 1: Biological Profile */}
                  <div className="space-y-3 pb-5 border-b border-navy-10 text-left">
                    <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">1. Biological Profile</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">First Name</label>
                        <input 
                          type="text" 
                          value={patientDetails.first_name}
                          onChange={(e) => setPatientDetails({ ...patientDetails, first_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Last Name</label>
                        <input 
                          type="text" 
                          value={patientDetails.last_name}
                          onChange={(e) => setPatientDetails({ ...patientDetails, last_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Email</label>
                        <input 
                          type="email" 
                          value={patientDetails.email}
                          onChange={(e) => setPatientDetails({ ...patientDetails, email: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Phone</label>
                        <input 
                          type="text" 
                          value={patientDetails.phone}
                          onChange={(e) => setPatientDetails({ ...patientDetails, phone: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        value={patientDetails.dob}
                        onChange={(e) => setPatientDetails({ ...patientDetails, dob: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data"
                      />
                    </div>
                  </div>

                  {/* Section 2: IVF Details & Cycle Info */}
                  <div className="space-y-3 pb-5 border-b border-navy-10 text-left">
                    <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">2. IVF Details & Cycle Info</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Cycle Number</label>
                        <input 
                          type="number" 
                          value={patientDetails.current_cycle_number}
                          onChange={(e) => setPatientDetails({ ...patientDetails, current_cycle_number: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Cycle Start Date</label>
                        <input 
                          type="date" 
                          value={patientDetails.cycle_start_date}
                          onChange={(e) => setPatientDetails({ ...patientDetails, cycle_start_date: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Treatment Package</label>
                      <input 
                        type="text" 
                        value={patientDetails.treatment_package}
                        onChange={(e) => setPatientDetails({ ...patientDetails, treatment_package: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Section 3: Supporter Details & Consent */}
                  <div className="space-y-3 pb-5 border-b border-navy-10 text-left">
                    <h4 className="font-heading text-[11px] font-bold text-navy uppercase tracking-wider">3. Supporter Details & Consent</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Partner Name</label>
                        <input 
                          type="text" 
                          value={patientDetails.partner_name}
                          onChange={(e) => setPatientDetails({ ...patientDetails, partner_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-navy-55 uppercase tracking-wider mb-1">Partner Phone</label>
                        <input 
                          type="text" 
                          value={patientDetails.partner_phone}
                          onChange={(e) => setPatientDetails({ ...patientDetails, partner_phone: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-navy-10 rounded-xl font-data"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-[#F8F5F1]/30 p-3 rounded-xl border border-navy-10 mt-3">
                      <div>
                        <span className="block text-[10px] font-bold text-navy">Data Sharing Consent</span>
                        <span className="text-[9px] text-navy-55">Permits SMS logs forwarding to partner</span>
                      </div>
                      <button
                        onClick={() => setPatientDetails({ ...patientDetails, partner_consent: !patientDetails.partner_consent })}
                        className={`px-3 py-1.5 rounded-full font-heading text-[9px] font-bold uppercase transition-colors ${
                          patientDetails.partner_consent ? 'bg-[#E6F4EF] text-[#3E8E6E]' : 'bg-[#FEF6E9] text-[#E2A93E]'
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
                        className="text-[10px] font-bold text-lavender-dark hover:underline"
                      >
                        + Add Medication
                      </button>
                    </div>

                    <div className="space-y-3">
                      {patientDetails.prescriptions.map((presc: any, pIdx: number) => (
                        <div key={pIdx} className="p-4 rounded-xl border border-navy-10/70 bg-white relative space-y-2 text-left">
                          <button 
                            onClick={() => {
                              const updatedPrescs = patientDetails.prescriptions.filter((_: any, idx: number) => idx !== pIdx);
                              setPatientDetails({ ...patientDetails, prescriptions: updatedPrescs });
                            }}
                            className="absolute top-2 right-2 text-due hover:text-due/80 text-[10px] font-bold"
                          >
                            🗑️ Delete
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-navy-55 uppercase tracking-wider">Name</label>
                              <input 
                                type="text" 
                                value={presc.name}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, name: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2 py-1 text-xs border border-navy-10 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-navy-55 uppercase tracking-wider">Dosage</label>
                              <input 
                                type="text" 
                                value={presc.dosage}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, dosage: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2 py-1 text-xs border border-navy-10 rounded-lg"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-navy-55 uppercase tracking-wider">Route</label>
                              <input 
                                type="text" 
                                value={presc.route}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, route: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2 py-1 text-xs border border-navy-10 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-navy-55 uppercase tracking-wider">Scheduled Time</label>
                              <input 
                                type="time" 
                                value={presc.scheduled_time.slice(0, 5)}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, scheduled_time: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2 py-1 text-xs border border-navy-10 rounded-lg font-data"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-navy-55 uppercase tracking-wider">Start Date</label>
                              <input 
                                type="date" 
                                value={presc.start_date}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, start_date: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2 py-1 text-xs border border-navy-10 rounded-lg font-data"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-navy-55 uppercase tracking-wider">End Date</label>
                              <input 
                                type="date" 
                                value={presc.end_date}
                                onChange={(e) => {
                                  const updated = patientDetails.prescriptions.map((p: any, idx: number) => idx === pIdx ? { ...p, end_date: e.target.value } : p);
                                  setPatientDetails({ ...patientDetails, prescriptions: updated });
                                }}
                                className="w-full px-2 py-1 text-xs border border-navy-10 rounded-lg font-data"
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
                      <p className="text-[10px] text-navy-55">No logs recorded yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {patientDetails.dose_logs.map((log: any, lIdx: number) => (
                          <div key={lIdx} className="flex justify-between items-center p-3 rounded-xl bg-[#F8F5F1]/30 border border-navy-10 text-xs">
                            <div>
                              <span className="font-bold text-navy block">{log.name}</span>
                              <span className="text-[9px] text-navy-55 font-data mt-0.5">Target: {log.scheduled_time.slice(0, 5)}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[8px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                                log.status === 'On Time' ? 'bg-[#E6F4EF] text-[#3E8E6E]' : 'bg-[#FEF6E9] text-[#E2A93E]'
                              }`}>
                                {log.status}
                              </span>
                              {log.logged_at && (
                                <span className="block text-[9px] text-navy-55 font-data mt-1">
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
                    <div className="p-4 rounded-xl bg-lavender-soft border border-lavender/30 text-xs">
                      <span className="block font-bold text-lavender-dark mb-1">Clinic Analytics Risk Rating</span>
                      <p className="font-body text-navy-70 leading-relaxed font-medium">
                        This patient is classified as having {patientDetails.dropout_risk} dropout likelihood based on cycle logs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-navy-10 flex gap-3 bg-[#F8F5F1]/20">
                  <button
                    onClick={() => { setSelectedPatientId(null); setPatientDetails(null); }}
                    className="flex-1 py-3 border border-navy-10 rounded-xl font-heading text-xs font-semibold text-navy hover:bg-navy-10/40 transition-colors"
                  >
                    Close Drawer
                  </button>
                  <button
                    onClick={handleSavePatientChart}
                    disabled={savingChart}
                    className="flex-1 py-3 bg-navy hover:bg-navy-80 text-white rounded-xl font-heading text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
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

      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title="Discard Registration Draft?"
      >
        <p className="font-body text-xs text-navy-70 leading-relaxed mb-6">
          Discard patient registration draft? All unsaved data will be lost.
        </p>
        <div className="flex gap-3">
          <Button
            variant="due"
            fullWidth
            onClick={handleCancelRegistration}
          >
            Yes, Discard
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => setIsCancelConfirmOpen(false)}
          >
            Keep Editing
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isPreviewPopupOpen}
        onClose={() => setIsPreviewPopupOpen(false)}
        title="Review Patient Registration"
      >
        <div className="space-y-4 text-left max-h-[500px] overflow-y-auto pr-1">
          <div className="border-b border-navy-10 pb-2.5">
            <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">Patient Name</span>
            <span className="text-sm font-semibold text-navy">{firstName} {lastName}</span>
          </div>
          <div className="border-b border-navy-10 pb-2.5">
            <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">Email & Phone</span>
            <span className="text-sm font-semibold text-navy">{email} · {phone}</span>
          </div>
          <div className="border-b border-navy-10 pb-2.5">
            <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">Date of Birth</span>
            <span className="text-sm font-semibold text-navy">{dob}</span>
          </div>
          <div className="border-b border-navy-10 pb-2.5">
            <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">Cycle Details</span>
            <span className="text-sm font-semibold text-navy">
              Start: {cycleStartDate} · Cycle #{currentCycleNumber} · {treatmentPackage === 'Other (Custom)' ? customPackageName : treatmentPackage}
            </span>
          </div>
          <div className="border-b border-navy-10 pb-2.5">
            <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">Support Partner</span>
            <span className="text-sm font-semibold text-navy">{partnerName} ({partnerPhone}) · {partnerRelationship}</span>
          </div>
          <div className="border-b border-navy-10 pb-2.5">
            <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">Next Scan Appointment</span>
            <span className="text-sm font-semibold text-navy">{nextAppointmentDate} at {nextAppointmentTime}</span>
          </div>
          <div>
            <span className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider mb-1.5">Stimulation Protocol</span>
            {prescriptions.length === 0 ? (
              <span className="text-xs text-navy-30 italic">No medications prescribed</span>
            ) : (
              <div className="space-y-2">
                {prescriptions.map((med, idx) => (
                  <div key={idx} className="p-3 bg-[#F8F5F1] rounded-xl border border-navy-10 text-xs">
                    <div className="font-bold text-navy">{med.name}</div>
                    <div className="text-navy-55">
                      {med.dosage} · {med.route} · Daily at {med.scheduled_time} · Starts {med.start_date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button
            variant="primary"
            fullWidth
            disabled={loading}
            onClick={async () => {
              setIsPreviewPopupOpen(false);
              await handleRegisterPatient();
            }}
          >
            {loading ? 'Confirming...' : 'Confirm Registration'}
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => setIsPreviewPopupOpen(false)}
          >
            Back to Edit
          </Button>
        </div>
      </Modal>
    </div>
  );
};
