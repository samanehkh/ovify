import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';
import { Bell, BellOff, CheckCircle2 } from 'lucide-react';

// Step labels (US-J1-03 §4)
const SLEEP_OPTIONS = [
  { label: 'Early Bird', value: '9:00 PM - 11:00 PM', time: '9:00 PM – 11:00 PM' },
  { label: 'Standard',   value: '10:00 PM - 12:00 AM', time: '10:00 PM – 12:00 AM' },
  { label: 'Night Owl',  value: '11:00 PM - 1:00 AM',  time: '11:00 PM – 1:00 AM' },
];

const COMFORT_OPTIONS = [
  { value: 'First time',  label: 'First time', desc: 'Show me detailed video guides' },
  { value: 'Experienced', label: 'Experienced', desc: 'Show me quick checklists' },
];

const OFFSET_OPTIONS = [
  { value: 0,  label: 'At scheduled time' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
];

export const OnboardingWizardPage: React.FC = () => {
  const { user, onboard } = useApp();

  // Step 1 — Sleep window (US-J1-03 §4 Step 1)
  const [sleepTime, setSleepTime] = useState('10:00 PM - 12:00 AM');

  // Step 2 — Comfort & reminder offset (US-J1-03 §4 Step 2)
  const [comfortLevel, setComfortLevel] = useState('First time');
  const [reminderOffset, setReminderOffset] = useState(30);

  // Step 3 — Consent & notifications (US-J1-03 §4 Step 3)
  const [partnerConsent, setPartnerConsent] = useState(true);
  const [notifStatus, setNotifStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  // UI state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  // ── Helpers ──────────────────────────────────────────────────
  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('granted'); // silently pass on unsupported browsers
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result === 'granted' ? 'granted' : 'denied');
  };

  const handleStartCycle = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Save preferences  (US-J1-03 §5 endpoint 1)
      await onboard(sleepTime, comfortLevel, reminderOffset);

      // 2. Save partner consent  (US-J1-03 §5 endpoint 2)
      if (user.partner_phone) {
        await api.updatePartnerConsent(user.id, user.partner_phone, partnerConsent);
      }
    } catch (err: any) {
      setError(err.message || "We couldn't save your preferences. Please check your connection and try again.");
      setLoading(false);
    }
  };

  // ── Progress bar ─────────────────────────────────────────────
  const ProgressBar = () => (
    <div className="w-full flex items-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
            s <= step ? 'bg-lavender' : 'bg-navy-10'
          }`}
        />
      ))}
    </div>
  );

  // ── Selection button shared styles ───────────────────────────
  const selBtn = (active: boolean) =>
    `w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
      active
        ? 'border-lavender bg-[#F3F1FE] text-navy font-semibold ring-2 ring-lavender/20'
        : 'border-navy-10 bg-white hover:border-lavender/40 text-navy-55'
    }`;

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10 bg-gradient-to-b from-[#F8F5F1] via-[#F8F5F1]/80 to-[#F8F5F1]/40 min-h-screen">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">

        {/* Logo */}
        <img
          src="/static/logo.png"
          alt="Ovify"
          className="w-10 h-10 object-contain rounded-2xl shadow-sm mb-6"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />

        <ProgressBar />

        {/* Card */}
        <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl border border-navy-10 shadow-xl overflow-hidden">
          <div className="p-7 flex flex-col gap-6">

            {/* Error banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[#C24C57]/10 border border-[#C24C57]/25 text-[#C24C57] text-xs font-body leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            {/* ── STEP 1: Sleep Window ─────────────────────────── */}
            {step === 1 && (
              <div className="flex flex-col gap-5 animate-fade-in">
                <div>
                  <span className="font-data text-[10px] font-bold text-lavender tracking-widest uppercase">
                    Step 1 of 3 · Customise your schedule
                  </span>
                  <h2 className="font-heading text-xl font-bold text-navy mt-1">
                    When do you usually go to bed?
                  </h2>
                  <p className="font-body text-xs text-navy-55 mt-1 leading-relaxed">
                    We use this to schedule your daily injection reminders outside your sleep window.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {SLEEP_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSleepTime(opt.value)}
                      className={selBtn(sleepTime === opt.value)}
                    >
                      <div>
                        <span className="block font-semibold text-sm text-navy">{opt.label}</span>
                        <span className="block text-[11px] text-navy-55 font-normal font-data mt-0.5">{opt.time}</span>
                      </div>
                      {sleepTime === opt.value && (
                        <CheckCircle2 className="w-5 h-5 text-lavender flex-none" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-3.5 px-7 bg-navy hover:bg-navy/85 text-white font-heading text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Comfort & Reminder Offset ───────────── */}
            {step === 2 && (
              <div className="flex flex-col gap-5 animate-fade-in">
                <div>
                  <span className="font-data text-[10px] font-bold text-lavender tracking-widest uppercase">
                    Step 2 of 3 · Injection guidelines
                  </span>
                  <h2 className="font-heading text-xl font-bold text-navy mt-1">
                    Is this your first IVF cycle?
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {COMFORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setComfortLevel(opt.value)}
                      className={selBtn(comfortLevel === opt.value)}
                    >
                      <div>
                        <span className="block font-semibold text-sm text-navy">{opt.label}</span>
                        <span className="block text-[11px] text-navy-55 font-normal mt-0.5">{opt.desc}</span>
                      </div>
                      {comfortLevel === opt.value && (
                        <CheckCircle2 className="w-5 h-5 text-lavender flex-none" />
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <p className="font-heading text-xs font-bold text-navy uppercase tracking-wider mb-2.5">
                    When should we remind you before an injection?
                  </p>
                  <div className="flex gap-2">
                    {OFFSET_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setReminderOffset(opt.value)}
                        className={`flex-1 py-3 rounded-xl border text-center text-xs font-heading font-bold transition-all duration-200 ${
                          reminderOffset === opt.value
                            ? 'border-lavender bg-[#F3F1FE] text-lavender ring-2 ring-lavender/20'
                            : 'border-navy-10 bg-white text-navy-55 hover:border-lavender/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="font-heading text-xs font-bold text-navy-55 hover:text-navy transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="py-3.5 px-7 bg-navy hover:bg-navy/85 text-white font-heading text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Consent & Push Notifications ─────────── */}
            {step === 3 && (
              <div className="flex flex-col gap-5 animate-fade-in">
                <div>
                  <span className="font-data text-[10px] font-bold text-lavender tracking-widest uppercase">
                    Step 3 of 3 · Secure data sharing &amp; notifications
                  </span>
                  <h2 className="font-heading text-xl font-bold text-navy mt-1">
                    Stay connected
                  </h2>
                </div>

                {/* Partner consent toggle */}
                {user.partner_phone && (
                  <div className="p-4 rounded-2xl bg-[#F8F5F1] border border-navy-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-heading text-xs font-bold text-navy mb-1">Share my progress</p>
                        <p className="font-body text-[11px] text-navy-55 leading-relaxed">
                          Share my cycle compliance logs and support prompts with{' '}
                          <span className="font-semibold text-navy">
                            {user.partner_name || 'my partner'}
                          </span>{' '}
                          ({user.partner_phone})
                        </p>
                        <p className="font-body text-[10px] text-navy-55/70 mt-1.5 leading-relaxed">
                          We only share your daily injection check-in status and support tips. We never share raw clinical files or doctors' notes.
                        </p>
                      </div>
                      {/* Toggle switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={partnerConsent}
                        onClick={() => setPartnerConsent((v) => !v)}
                        className={`relative inline-flex h-6 w-11 flex-none cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-lavender focus:ring-offset-2 ${
                          partnerConsent ? 'bg-lavender' : 'bg-navy-20'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            partnerConsent ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Push notifications pre-permission card */}
                <div className="p-4 rounded-2xl border border-navy-10 bg-white">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${
                      notifStatus === 'granted' ? 'bg-[#E6F4EF]' : 'bg-[#EEF1F6]'
                    }`}>
                      {notifStatus === 'granted'
                        ? <Bell className="w-4 h-4 text-[#3E8E6E]" />
                        : <BellOff className="w-4 h-4 text-navy-55" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="font-heading text-xs font-bold text-navy mb-0.5">Enable notifications</p>
                      <p className="font-body text-[11px] text-navy-55 leading-relaxed">
                        Ovify needs your permission to send daily injection alarms. Missed alarms may lead to cycle cancellation.
                      </p>
                    </div>
                  </div>

                  {notifStatus === 'granted' ? (
                    <div className="mt-3 flex items-center gap-1.5 text-[#3E8E6E] text-xs font-heading font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Notifications enabled
                    </div>
                  ) : notifStatus === 'denied' ? (
                    <p className="mt-3 text-[11px] text-[#C24C57] font-body">
                      Permission denied. You can enable notifications in your browser settings.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestNotifications}
                      className="mt-3 w-full py-2.5 rounded-xl border border-lavender text-lavender font-heading text-xs font-bold hover:bg-lavender/5 transition-all"
                    >
                      Enable Notifications
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="font-heading text-xs font-bold text-navy-55 hover:text-navy transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={loading || notifStatus === 'idle'}
                    onClick={handleStartCycle}
                    className="py-3.5 px-7 bg-navy hover:bg-navy/85 text-white font-heading text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Personalising…</span>
                      </>
                    ) : (
                      <span>Start My Cycle →</span>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
