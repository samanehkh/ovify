import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Smartphone } from 'lucide-react';

export const OnboardingWizardPage: React.FC = () => {
  const { user, onboard } = useApp();
  const [step, setStep] = useState(1);
  const [sleepTime, setSleepTime] = useState('10:00 PM - 12:00 AM');
  const [comfortLevel, setComfortLevel] = useState('First time');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = () => {
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      await onboard(sleepTime, comfortLevel);
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8 bg-gradient-to-b from-bg-ivory via-bg-ivory/80 to-bg-ivory/40 min-h-screen">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">
        {/* Progress Tracker dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-lavender' : 'w-2.5 bg-navy-10'
              }`}
            />
          ))}
        </div>

        {/* Wizard Card */}
        <div className="w-full bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-navy-10 shadow-xl relative overflow-hidden transition-all duration-300 min-h-[420px] flex flex-col justify-between">
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-blush-10 border border-blush/25 text-blush text-xs font-body">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold text-navy tracking-tight mb-2">
                  Welcome, {user.name}!
                </h2>
                <p className="font-body text-sm text-navy-55 mb-6 leading-relaxed">
                  Let's personalize your care companion. First, what is your typical sleep window? We use this to timing-optimize your medication notifications.
                </p>

                <div className="space-y-3">
                  {[
                    '9:00 PM - 11:00 PM',
                    '10:00 PM - 12:00 AM',
                    '11:00 PM - 1:00 AM',
                    'Other / Dynamic',
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSleepTime(option)}
                      className={`w-full text-left px-5 py-4 rounded-xl border font-body text-sm transition-all duration-200 flex items-center justify-between ${
                        sleepTime === option
                          ? 'border-lavender bg-lavender-10 text-navy font-semibold ring-2 ring-lavender/5'
                          : 'border-navy-10 bg-white hover:border-navy-20 text-navy-55'
                      }`}
                    >
                      <span>{option}</span>
                      {sleepTime === option && <span className="text-lavender text-base">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="py-3.5 px-6 bg-navy hover:bg-navy-80 text-white font-heading text-xs font-bold rounded-xl shadow-md transition-all duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold text-navy tracking-tight mb-2">
                  Injection Comfort
                </h2>
                <p className="font-body text-sm text-navy-55 mb-6 leading-relaxed">
                  Have you self-administered hormone injection devices (like Gonal-F or Menopur pens) before?
                </p>

                <div className="space-y-3">
                  {[
                    { label: 'First time', desc: 'I would like detailed guides and reassurance.' },
                    { label: 'Experienced', desc: 'I know the drill, just show me minimal instructions.' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setComfortLevel(option.label)}
                      className={`w-full text-left px-5 py-4 rounded-xl border font-body text-sm transition-all duration-200 flex flex-col gap-0.5 ${
                        comfortLevel === option.label
                          ? 'border-lavender bg-lavender-10 text-navy font-semibold ring-2 ring-lavender/5'
                          : 'border-navy-10 bg-white hover:border-navy-20 text-navy-55'
                      }`}
                    >
                      <div className="flex justify-between w-full items-center">
                        <span className="font-semibold text-navy">{option.label}</span>
                        {comfortLevel === option.label && <span className="text-lavender text-base">✓</span>}
                      </div>
                      <span className="text-xs text-navy-55 font-normal">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="font-heading text-xs font-bold text-navy hover:underline"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="py-3.5 px-6 bg-navy hover:bg-navy-80 text-white font-heading text-xs font-bold rounded-xl shadow-md transition-all duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold text-navy tracking-tight mb-2">
                  Install Companion App
                </h2>
                <p className="font-body text-sm text-navy-55 mb-5 leading-relaxed">
                  For daily reminder pings and fast logs, install Ovify on your phone:
                </p>

                <div className="p-4 rounded-2xl bg-sage-10 border border-sage/20 flex gap-3.5 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-sage/15 flex items-center justify-center text-sage">
                    <Smartphone className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-heading text-xs font-bold text-navy mb-0.5">Quick PWA Installation</h4>
                    <p className="font-body text-xs text-navy-55 leading-relaxed">
                      Tap your browser's share icon <span className="font-semibold">Share</span> and select <span className="font-semibold">Add to Home Screen</span> to download instantly.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start mt-6 border-t border-navy-10/40 pt-4 text-left">
                  <input
                    type="checkbox"
                    id="healthConsentCheckbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 text-lavender border-navy-10 rounded focus:ring-lavender cursor-pointer"
                  />
                  <label htmlFor="healthConsentCheckbox" className="font-body text-xs text-navy-55 leading-relaxed cursor-pointer select-none">
                    <strong>Health Data Law Consent:</strong> I explicitly authorize the storage of my health data on secure servers within the UAE in compliance with UAE Decree-Law No. 2 of 2019, and consent to sharing my cycle compliance logs with my clinic coordinator.
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center w-full">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="font-heading text-xs font-bold text-navy hover:underline"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading || !consentAccepted}
                  onClick={handleCompleteOnboarding}
                  className="py-3.5 px-6 bg-navy hover:bg-navy-80 text-white font-heading text-xs font-bold rounded-xl shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Launch Companion</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
