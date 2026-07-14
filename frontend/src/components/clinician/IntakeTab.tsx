import React, { useState } from 'react';
import { registerPatient } from '../../services/api';

interface ParsedMed {
  name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  start_date: string;
  end_date: string;
  flagged: boolean;
}

interface IntakeTabProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  setActiveSubTab: (tab: 'intake' | 'triage' | 'directory') => void;
}

export const IntakeTab: React.FC<IntakeTabProps> = ({
  onSuccess,
  onError,
  setActiveSubTab
}) => {
  // Form state
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
  
  // Support Supporter Contacts
  const [partnerName, setPartnerName] = useState('Ahmed Khan');
  const [partnerPhone, setPartnerPhone] = useState('+971 50 999 9999');
  const [partnerRelationship, setPartnerRelationship] = useState('Spouse/Partner');

  // Next Scan Appointment
  const [nextAppointmentDate, setNextAppointmentDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 4);
    return future.toISOString().split('T')[0];
  });
  const [nextAppointmentTime, setNextAppointmentTime] = useState('09:00');

  // Stimulation Protocol Builder state
  const [prescriptions, setPrescriptions] = useState<ParsedMed[]>([]);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isPreviewPopupOpen, setIsPreviewPopupOpen] = useState(false);

  const FORMULARY_SUGGESTIONS = ['Gonal-F', 'Menopur', 'Cetrotide', 'Ovitrelle', 'Lupron', 'Rekovelle', 'Progynova', 'Clexane'];

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

  const handleRegisterPatient = async () => {
    setLoading(true);
    setIsPreviewPopupOpen(false);
    try {
      const nextAppointmentDatetime = `${nextAppointmentDate}T${nextAppointmentTime}:00Z`;
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

      onSuccess(`${firstName} ${lastName} registered successfully. SMS invite sent.`);
      // Clear forms
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setPrescriptions([]);
      setCustomPackageName('');
      setPartnerName('');
      setPartnerPhone('');
      setActiveSubTab('triage');
    } catch (err: any) {
      onError(err.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = () => {
    setIsCancelConfirmOpen(false);
    setActiveSubTab('triage');
  };

  return (
    <div className="max-w-4xl bg-white/70 backdrop-blur-md border border-navy-10 rounded-3xl p-8 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-navy-10">
          <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider">Patient Bio & Registration</h3>
          <span className="px-3 py-1 rounded-full bg-navy-10 text-navy font-data text-[10px] font-bold">Cycle ID: NEW</span>
        </div>
        
        <div className="space-y-6">
          {/* Section 1: Patient Biological Profile */}
          <div className="bg-white/50 p-6 rounded-2xl border border-navy-10/40">
            <h4 className="font-heading text-xs font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-lavender rounded-full" />
              1. Biological Profile
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="firstName" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="phone" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="dob" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Date of Birth</label>
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Treatment & Cycle Setup */}
          <div className="bg-white/50 p-6 rounded-2xl border border-navy-10/40">
            <h4 className="font-heading text-xs font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-lavender rounded-full" />
              2. Treatment & Cycle Setup
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="cycleStartDate" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Cycle Start Date</label>
                <input
                  id="cycleStartDate"
                  type="date"
                  value={cycleStartDate}
                  onChange={(e) => setCycleStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
              <div>
                <span className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Current Cycle Number</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentCycleNumber(prev => Math.max(1, prev - 1))}
                    className="w-12 h-12 flex items-center justify-center border border-navy-10 rounded-xl bg-white text-navy font-bold hover:bg-bg-ivory hover:border-lavender/30 transition-all text-sm font-heading min-h-[48px] active:scale-[0.96]"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-bold font-data text-navy">{currentCycleNumber}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentCycleNumber(prev => Math.min(3, prev + 1))}
                    className="w-12 h-12 flex items-center justify-center border border-navy-10 rounded-xl bg-white text-navy font-bold hover:bg-bg-ivory hover:border-lavender/30 transition-all text-sm font-heading min-h-[48px] active:scale-[0.96]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="treatmentPackage" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Treatment Package</label>
                <select
                  id="treatmentPackage"
                  value={treatmentPackage}
                  onChange={(e) => setTreatmentPackage(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
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
                  <label htmlFor="customPackageName" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Custom Package Name</label>
                  <input
                    id="customPackageName"
                    type="text"
                    value={customPackageName}
                    onChange={(e) => setCustomPackageName(e.target.value)}
                    placeholder="Enter custom package name"
                    className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px]"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Escalation Support Contact */}
          <div className="bg-white/50 p-6 rounded-2xl border border-navy-10/40">
            <h4 className="font-heading text-xs font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-lavender rounded-full" />
              3. Escalation Support Contact
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="partnerName" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Supporter Name</label>
                <input
                  id="partnerName"
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
              <div>
                <label htmlFor="partnerPhone" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Supporter Phone</label>
                <input
                  id="partnerPhone"
                  type="text"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <span className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Relationship Role</span>
                <div className="flex gap-2.5">
                  {['Spouse/Partner', 'Family', 'Friend'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setPartnerRelationship(role)}
                      className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all min-h-[48px] active:scale-[0.98] ${
                        partnerRelationship === role
                          ? 'bg-lavender border-lavender text-white shadow-md'
                          : 'bg-white border-navy-10 text-navy hover:bg-bg-ivory hover:border-lavender/25'
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
          <div className="bg-white/50 p-6 rounded-2xl border border-navy-10/40">
            <h4 className="font-heading text-xs font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-lavender rounded-full" />
              4. Next Scan Appointment
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nextAppointmentDate" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Scan Date</label>
                <input
                  id="nextAppointmentDate"
                  type="date"
                  value={nextAppointmentDate}
                  onChange={(e) => setNextAppointmentDate(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
              <div>
                <label htmlFor="nextAppointmentTime" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Scan Time</label>
                <input
                  id="nextAppointmentTime"
                  type="time"
                  value={nextAppointmentTime}
                  onChange={(e) => setNextAppointmentTime(e.target.value)}
                  className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 5: Stimulation Protocol Builder */}
          <div className="bg-white/50 p-6 rounded-2xl border border-navy-10/40">
            <h4 className="font-heading text-xs font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-lavender rounded-full" />
              5. Stimulation Protocol Builder
            </h4>
            
            {/* Search & Suggestions */}
            <div className="mb-4 relative">
              <label htmlFor="medSearch" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-1.5">Search or Select Medication</label>
              <input
                id="medSearch"
                type="text"
                value={medSearchQuery}
                onChange={(e) => setMedSearchQuery(e.target.value)}
                placeholder="Search medication name (e.g. Rekovelle)..."
                className="w-full px-4 py-3 border border-navy-10 rounded-xl text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-lavender/20 focus:border-lavender transition-all min-h-[48px] shadow-inner"
              />
              
              {/* Auto-suggest dropdown */}
              {medSearchQuery && (
                <div className="absolute left-0 right-0 mt-1.5 border border-navy-10 rounded-xl bg-white shadow-xl overflow-hidden max-h-40 overflow-y-auto z-20">
                  {FORMULARY_SUGGESTIONS.filter(med => med.toLowerCase().includes(medSearchQuery.toLowerCase())).map((med, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddMedication(med)}
                      className="w-full text-left px-4 py-3 text-sm text-navy hover:bg-lavender-soft transition-colors min-h-[48px]"
                    >
                      {med}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick card select grid */}
            <div className="mb-6">
              <span className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Quick Add common medications:</span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {['Gonal-F', 'Menopur', 'Cetrotide', 'Ovitrelle', 'Lupron'].map((med) => (
                  <button
                    key={med}
                    type="button"
                    onClick={() => handleAddMedication(med)}
                    className="py-3 px-3 bg-bg-ivory hover:bg-lavender hover:text-white border border-navy-10 rounded-xl text-xs font-bold text-navy transition-all min-h-[48px] hover:shadow active:scale-[0.96]"
                  >
                    + {med}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Prescription cards list */}
            <div className="space-y-4">
              <span className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider">Prescribed Stim Timeline:</span>
              {prescriptions.length === 0 ? (
                <div className="py-10 text-center text-navy-70 font-body text-xs border-2 border-dashed border-navy-10 rounded-xl bg-bg-ivory/20">
                  No medications added yet. Search or click a quick-add button to build the protocol.
                </div>
              ) : (
                prescriptions.map((med, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white border border-navy-10 flex flex-col gap-4 shadow-sm relative text-left hover:border-lavender/35 hover:shadow-md transition-all duration-200">
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(idx)}
                      className="absolute top-4 right-4 text-due hover:text-white text-xs p-2 px-3 border border-due/30 hover:bg-due rounded-xl transition-all min-h-[48px]"
                      aria-label="Delete Medication"
                    >
                      🗑️ Delete
                    </button>
                    <div className="font-heading text-sm font-bold text-navy pr-20">{med.name}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-heading text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Dosage</label>
                        <select
                          value={med.dosage}
                          onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                          className="w-full px-3 py-2.5 border border-navy-10 rounded-xl text-xs text-navy bg-white focus:outline-none focus:ring-1 focus:ring-lavender/30 focus:border-lavender min-h-[38px] transition-all"
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
                        <label className="block font-heading text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Route</label>
                        <select
                          value={med.route}
                          onChange={(e) => handleUpdateMedication(idx, 'route', e.target.value)}
                          className="w-full px-3 py-2.5 border border-navy-10 rounded-xl text-xs text-navy bg-white focus:outline-none focus:ring-1 focus:ring-lavender/30 focus:border-lavender min-h-[38px] transition-all"
                        >
                          <option value="Subcutaneous">Subcutaneous</option>
                          <option value="Intramuscular">Intramuscular</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-heading text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Time</label>
                        <input
                          type="time"
                          value={med.scheduled_time}
                          onChange={(e) => handleUpdateMedication(idx, 'scheduled_time', e.target.value)}
                          className="w-full px-3 py-2 border border-navy-10 rounded-xl text-xs text-navy bg-white focus:outline-none font-data min-h-[38px] focus:ring-1 focus:ring-lavender/30 focus:border-lavender transition-all"
                        />
                      </div>
                      <div>
                        <label className="block font-heading text-[9px] font-bold text-navy uppercase tracking-wider mb-1">Start Date</label>
                        <input
                          type="date"
                          value={med.start_date}
                          onChange={(e) => handleUpdateMedication(idx, 'start_date', e.target.value)}
                          className="w-full px-3 py-2 border border-navy-10 rounded-xl text-xs text-navy bg-white focus:outline-none min-h-[38px] focus:ring-1 focus:ring-lavender/30 focus:border-lavender transition-all"
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

      {/* Action Bar */}
      <div className="mt-8 pt-6 border-t border-navy-10 flex gap-4">
        <button
          type="button"
          onClick={() => setIsCancelConfirmOpen(true)}
          className="flex-1 py-3.5 border border-due text-due hover:bg-due-soft font-heading text-sm font-bold rounded-xl transition-all duration-200 min-h-[48px] active:scale-[0.98]"
        >
          Cancel Draft
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setIsPreviewPopupOpen(true)}
          className="flex-1 py-3.5 bg-navy hover:bg-navy-70 text-white font-heading text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 min-h-[48px] active:scale-[0.98]"
        >
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <span>Register Patient</span>
          )}
        </button>
      </div>

      {/* Confirmation Modal for Cancel */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-navy-10 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <span className="text-3xl">❓</span>
            <h4 className="font-heading text-base font-bold text-navy mt-4 mb-2">Discard Registration Draft?</h4>
            <p className="font-body text-xs text-navy-70 leading-relaxed mb-6">
              All entered details for this patient and protocol will be permanently lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCancelConfirmOpen(false)}
                className="flex-1 py-3 border border-navy-10 rounded-xl font-heading text-xs font-bold text-navy hover:bg-bg-ivory transition-colors min-h-[48px]"
              >
                No, Keep Editing
              </button>
              <button
                onClick={handleCancelRegistration}
                className="flex-1 py-3 bg-due hover:bg-due/90 text-white rounded-xl font-heading text-xs font-bold transition-colors min-h-[48px]"
              >
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Preview Popup (US-J1-01) */}
      {isPreviewPopupOpen && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full border border-navy-10 shadow-2xl text-left overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <h4 className="font-heading text-base font-bold text-navy mb-4">Review Patient Registration</h4>
            <p className="font-body text-xs text-navy-70 mb-6">
              Please double check all clinical and contact details before confirming. An onboarding invitation SMS will be sent immediately.
            </p>
            
            <div className="space-y-4 font-body text-xs text-navy mb-6">
              <div className="grid grid-cols-2 gap-4 border-b border-navy-10 pb-3">
                <div>
                  <span className="block text-[9px] font-bold text-navy uppercase tracking-wider">Patient Name</span>
                  <span className="font-semibold text-sm text-navy">{firstName} {lastName}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-navy uppercase tracking-wider">Cycle Number</span>
                  <span className="font-semibold text-sm text-navy">Cycle #{currentCycleNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-navy-10 pb-3">
                <div>
                  <span className="block text-[9px] font-bold text-navy uppercase tracking-wider">Phone / Email</span>
                  <div className="font-medium">{phone}</div>
                  <div className="text-navy-70 font-medium">{email}</div>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-navy uppercase tracking-wider">Date of Birth</span>
                  <div className="font-medium">{dob}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-navy-10 pb-3">
                <div>
                  <span className="block text-[9px] font-bold text-navy uppercase tracking-wider">Treatment Package</span>
                  <div className="font-semibold">{treatmentPackage === 'Other (Custom)' ? customPackageName : treatmentPackage}</div>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-navy uppercase tracking-wider">Cycle Start Date</span>
                  <div className="font-medium">{cycleStartDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-navy-10 pb-3">
                <div>
                  <span className="block text-[9px] font-bold text-navy uppercase tracking-wider">Supporter Person</span>
                  <div className="font-medium">{partnerName} ({partnerPhone})</div>
                  <div className="text-[10px] text-navy-70 font-semibold">Role: {partnerRelationship}</div>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-navy uppercase tracking-wider">Next Scan Appointment</span>
                  <div className="font-medium">{nextAppointmentDate} at {nextAppointmentTime}</div>
                </div>
              </div>

              <div>
                <span className="block text-[9px] font-bold text-navy uppercase tracking-wider mb-2">Stimulation Protocol ({prescriptions.length} medications)</span>
                {prescriptions.length === 0 ? (
                  <div className="text-navy-70 italic font-medium">No medications prescribed.</div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {prescriptions.map((med, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-bg-ivory border border-navy-10 flex justify-between items-center text-[11px] shadow-sm">
                        <div>
                          <span className="font-bold text-navy">{med.name}</span>
                          <span className="text-navy-70 ml-2">({med.route})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-data font-bold bg-navy-10 text-navy px-2 py-0.5 rounded-lg border border-navy-10/20">{med.dosage}</span>
                          <span className="text-navy-70 ml-2 font-data font-semibold">{med.scheduled_time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsPreviewPopupOpen(false)}
                className="flex-1 py-3 border border-navy-10 rounded-xl font-heading text-xs font-bold text-navy hover:bg-bg-ivory transition-colors min-h-[48px] active:scale-[0.98]"
              >
                Go Back
              </button>
              <button
                onClick={handleRegisterPatient}
                className="flex-1 py-3 bg-navy hover:bg-navy-70 text-white rounded-xl font-heading text-xs font-bold transition-all min-h-[48px] active:scale-[0.98] shadow-sm"
              >
                Confirm Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
