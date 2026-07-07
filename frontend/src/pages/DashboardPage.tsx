import React from 'react';
import { useApp } from '../context/AppContext';
import { ProgressRing } from '../components/ProgressRing';
import { MoodSelector } from '../components/MoodSelector';
import { MedicationCard } from '../components/MedicationCard';
import { Sparkles, AlertTriangle, Info, Phone } from 'lucide-react';
import { updatePartnerConsent } from '../services/api';
import { i18nContent } from '../content/i18n';

export const DashboardPage: React.FC = () => {
  const { user, medications, loading, error, refetchData, language } = useApp();
  const t = i18nContent[language];
  const [partnerPhone, setPartnerPhone] = React.useState(user?.partner_phone || '');
  const [partnerConsent, setPartnerConsent] = React.useState(user?.partner_consent || false);
  const [savingConsent, setSavingConsent] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [infoModalText, setInfoModalText] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setPartnerPhone(user.partner_phone || '');
      setPartnerConsent(user.partner_consent || false);
    }
  }, [user]);

  const handleSaveSharing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingConsent(true);
    setSaveSuccess(false);
    try {
      await updatePartnerConsent(user.id, partnerPhone, partnerConsent);
      setSaveSuccess(true);
      await refetchData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setInfoModalText("Network error updating partner sharing settings.");
    } finally {
      setSavingConsent(false);
    }
  };

  // Determine time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Dynamically calculate stimulation days from active prescriptions
  const getStimulationProgress = () => {
    if (medications.length === 0) {
      return null;
    }
    const firstMed = medications[0];
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const start = new Date(firstMed.start_date);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(firstMed.end_date);
      end.setHours(0, 0, 0, 0);

      const diffTimeCurrent = today.getTime() - start.getTime();
      const currentDay = Math.floor(diffTimeCurrent / (1000 * 60 * 60 * 24)) + 1;
      
      const diffTimeTotal = end.getTime() - start.getTime();
      const totalDays = Math.floor(diffTimeTotal / (1000 * 60 * 60 * 24)) + 1;

      return {
        current: Math.max(1, currentDay),
        total: Math.max(1, totalDays)
      };
    } catch (e) {
      return null;
    }
  };

  const progress = getStimulationProgress();

  const [callbackRequested, setCallbackRequested] = React.useState(false);

  if (user && user.cycle_outcome === 'Failed') {
    return (
      <div className="flex-1 flex flex-col pt-4 px-5 pb-24 overflow-y-auto no-scrollbar">
        {/* Header Greeting */}
        <div className="flex flex-col items-center text-center mt-2 mb-8">
          <span className="font-data text-[12px] font-bold text-navy-55 tracking-widest uppercase">
            Thinking of you
          </span>
          <h2 className="font-heading text-2xl font-bold text-navy mt-1">
            {user.name}
          </h2>
        </div>

        {/* Empathy Message Card */}
        <div className="mb-6 p-6 rounded-3xl bg-white border border-navy-10 shadow-sm text-left">
          <h3 className="font-heading text-sm font-bold text-navy mb-3 uppercase tracking-wider">{t.recoveryTitle}</h3>
          <p className="font-body text-sm text-navy-55 leading-relaxed mb-4">
            {t.recoveryText}
          </p>
          <div className="flex gap-2 items-start border-t border-navy-10/40 pt-3 font-body text-xs text-navy-55/80 leading-relaxed">
            <Info className="w-4 h-4 flex-none text-navy-55/70 mt-0.5" aria-hidden="true" />
            <span>All injection alarms and daily schedules have been automatically paused. No protocol actions are required of you today.</span>
          </div>
        </div>

        {/* Content Unlock: Recovery Guides */}
        <div className="mb-6">
          <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-3">{t.recoveryGuidelineHeader}</h4>
          <div className="space-y-3">
            {t.recoverySteps.map((step, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white border border-navy-10 hover:border-lavender/50 hover:shadow-sm transition-all text-left flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none font-bold text-[10px]">
                  {idx + 1}
                </div>
                <p className="font-body text-xs text-navy-55 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nurse Callback Booking Button */}
        <div className="mb-6 bg-lavender/10 border border-lavender/25 rounded-3xl p-5 text-center">
          <h4 className="font-heading text-xs font-bold text-lavender-dark uppercase tracking-wider mb-2">Speak with a Clinic Nurse</h4>
          <p className="font-body text-xs text-navy-55 leading-relaxed mb-4">
            If you need supportive advice or want to coordinate cycle logs, click below. A clinic coordinator will call you back.
          </p>
          
          <button
            onClick={() => setCallbackRequested(true)}
            disabled={callbackRequested}
            className={`w-full py-3.5 rounded-xl font-heading text-xs font-bold shadow-md transition-all duration-300 flex items-center justify-center gap-2 ${
              callbackRequested
                ? 'bg-sage text-white shadow-none cursor-default'
                : 'bg-navy hover:bg-navy-80 text-white hover:shadow-lg cursor-pointer'
            }`}
          >
            {callbackRequested ? (
              <span>✓ Callback Requested (Within 24 Hours)</span>
            ) : (
              <>
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>Request Nurse Callback</span>
              </>
            )}
          </button>
        </div>

        {/* CalmSeed Mood Check-in stays active */}
        <div className="mb-8">
          <MoodSelector />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-4 border-lavender border-t-transparent animate-spin mb-4" />
        <p className="font-body text-sm text-navy-55">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-data text-due font-bold mb-2">Failed to load data</p>
        <p className="font-body text-sm text-navy-55 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pt-4 px-5 pb-24 overflow-y-auto no-scrollbar">
      {/* Greeting and Header */}
      <div className="flex flex-col items-center text-center mt-2 mb-8">
        <span className="font-data text-[12px] font-bold text-navy-55 tracking-widest uppercase">
          {getGreeting()}
        </span>
        <h2 className="font-heading text-2xl font-bold text-navy mt-1">
          {user ? user.name : 'Sarah'}
        </h2>
      </div>

      {/* Clinic Coordinator Alert Banner */}
      {user && user.active_status === 'Action Required' && (
        <div className="mb-6 p-4 rounded-2xl bg-blush-10 border border-blush/25 text-left flex gap-3.5 shadow-sm animate-pulse">
          <AlertTriangle className="w-5 h-5 flex-none text-due mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="font-heading text-xs font-bold text-due uppercase tracking-wider mb-0.5">
              Clinic Alert: Action Required
            </h4>
            <p className="font-body text-xs text-navy-55 leading-relaxed">
              We detected a missed or late injection schedule today. Your clinic coordinator has been notified to check in and support your protocol.
            </p>
          </div>
        </div>
      )}

      {/* Progress Circle Card */}
      {progress !== null ? (
        <>
          <div className="flex justify-center mb-8">
            <ProgressRing currentDay={progress.current} totalDays={progress.total} />
          </div>

          {/* Stimulation Protocol Status Label */}
          <div className="self-center flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm font-data text-[13px] font-semibold text-navy mb-8 border border-navy-10/40">
            <span className="w-2.5 h-2.5 rounded-full bg-lavender animate-pulse" />
            Ovarian Stimulation Protocol
          </div>
        </>
      ) : (
        <div className="mb-8 p-6 rounded-3xl bg-white border border-navy-10 shadow-sm text-center">
          <p className="font-body text-sm text-navy font-bold">No Active Stimulation Protocol</p>
          <p className="font-body text-xs text-navy-55 mt-1 leading-relaxed">Please check in with your clinic coordinator to load your protocol details.</p>
        </div>
      )}

      {/* Today's Tasks Injection Cards */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <h3 className="font-heading text-lg font-bold text-navy">Today's Injections</h3>
          <span className="font-data text-[12px] font-bold text-lavender-dark uppercase tracking-wider">
            {medications.filter(m => m.status === 'Taken').length}/{medications.length} Done
          </span>
        </div>
        
        {medications.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-center">
            <p className="font-body text-sm text-navy-55">No injections scheduled for today.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {medications.map((med) => (
              <MedicationCard key={med.id} medication={med} />
            ))}
          </div>
        )}
      </div>

      {/* CalmSeed Check-in */}
      <MoodSelector />

      {/* Partner Sharing & Consent Settings (Health Data Law Gated) */}
      <div className="mb-6 p-5 rounded-3xl bg-white border border-navy-10 shadow-sm text-left">
        <h3 className="font-heading text-sm font-bold text-navy mb-3 uppercase tracking-wider">Partner Sharing & Consent</h3>
        
        <form onSubmit={handleSaveSharing} className="space-y-4">
          <div>
            <label className="block font-heading text-[10px] font-bold text-navy-55 mb-1.5 uppercase">Partner Phone Number</label>
            <input
              type="tel"
              value={partnerPhone}
              onChange={(e) => setPartnerPhone(e.target.value)}
              placeholder="e.g. +971509999999"
              className="w-full px-4 py-3 rounded-xl border border-navy-10 font-data text-sm text-navy placeholder-navy-10 focus:outline-none focus:border-lavender bg-[#F8F5F1]/30"
              required
            />
          </div>

          <div className="flex gap-3 items-start border-t border-navy-10/40 pt-3">
            <input
              type="checkbox"
              id="partnerConsentToggle"
              checked={partnerConsent}
              onChange={(e) => setPartnerConsent(e.target.checked)}
              className="mt-1 w-4.5 h-4.5 text-lavender border-navy-10 rounded focus:ring-lavender cursor-pointer"
            />
            <label htmlFor="partnerConsentToggle" className="font-body text-xs text-navy-55 leading-relaxed cursor-pointer select-none">
              <strong>Granular Consent Grant:</strong> I hereby consent to sharing my real-time cycle stimulation progress, active medication schedule, and today's emotional symptom log with my registered partner number. I understand I can revoke this consent at any time by unchecking this box.
            </label>
          </div>

          <button
            type="submit"
            disabled={savingConsent}
            className={`w-full py-3 rounded-xl font-heading text-xs font-bold focus:ring-2 focus:ring-lavender focus:outline-none transition-all duration-300 ${
              saveSuccess
                ? 'bg-sage text-white shadow-none cursor-default'
                : 'bg-navy hover:bg-navy-80 text-white cursor-pointer hover:shadow-md'
            }`}
          >
            {savingConsent ? 'Saving Preferences...' : saveSuccess ? '✓ Sharing Settings Saved!' : 'Save Sharing Preferences'}
          </button>
        </form>
      </div>

      {/* Ask Ovify AI Shortcut */}
      <button 
        onClick={() => setInfoModalText("Ask Ovify AI is in Phase 2 development.")}
        className="w-full py-4 rounded-xl glass-panel bg-gradient-to-r from-lavender/10 to-blush/10 hover:border-lavender hover:shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-lavender focus:outline-none"
      >
        <Sparkles className="w-4 h-4 text-lavender-dark stroke-[2]" />
        <span className="font-heading text-sm font-bold text-navy">Ask Ovify AI</span>
      </button>

      {/* Accessible Custom Modal instead of alert() */}
      {infoModalText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-5" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <div className="bg-white border border-navy-10 rounded-3xl p-6 shadow-xl max-w-sm w-full text-center relative">
            <h4 id="modalTitle" className="font-heading text-base font-bold text-navy mb-2">Notice</h4>
            <p className="font-body text-xs text-navy-55 leading-relaxed mb-6">{infoModalText}</p>
            <button
              onClick={() => setInfoModalText(null)}
              className="w-full py-3 bg-navy hover:bg-navy-80 text-white font-heading text-xs font-bold rounded-xl cursor-pointer shadow-md focus:ring-2 focus:ring-lavender focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
