import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [searchParams] = useSearchParams();
  
  // 1. Deep linking phone pre-fill
  const invitePhone = searchParams.get('phone') || '';
  const [phone, setPhone] = useState(invitePhone);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification & Installation view state
  const [isVerified, setIsVerified] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Standalone check
  const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  };

  // Platform and Browser detection
  const getPlatform = () => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isWebView = /instagram|fbav|fb_iab|messenger|gsa|line/.test(ua) || (isIOS && !/safari/.test(ua));
    
    if (isWebView) return 'webview';
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'desktop';
  };

  // Android Chrome beforeinstallprompt event listener
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter your registered phone number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.requestOTP(phone);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please contact your clinic.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the 6-digit access code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Validate OTP with backend
      await api.verifyOTP(phone, otp);
      
      // If already standalone (PWA installed), bypass instructions and login
      if (isStandalone()) {
        await login(phone, otp);
      } else {
        setIsVerified(true);
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivation = async () => {
    setLoading(true);
    try {
      await login(phone, otp);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAndroidPrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
    }
  };

  const platform = getPlatform();

  // If successfully verified and not standalone, show PWA installation guide screen
  if (isVerified) {
    return (
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-gradient-to-b from-bg-ivory via-bg-ivory/80 to-bg-ivory/40 min-h-screen">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center animate-in fade-in duration-300">
          <div className="mb-8 text-center flex flex-col items-center">
            <img 
              src="/static/logo.png" 
              alt="Ovify Logo" 
              className="w-20 h-20 object-contain rounded-3xl shadow-lg mb-4 animate-pulse"
            />
            <h2 className="font-heading text-xl font-bold text-navy tracking-tight mb-2 uppercase">Install Ovify App</h2>
            <p className="font-body text-xs text-navy-55 font-semibold">Add to your home screen to access your companion app.</p>
          </div>

          <div className="w-full bg-white rounded-3xl p-7 border border-navy-10 shadow-xl space-y-6">
            {platform === 'webview' && (
              <div className="p-4 rounded-2xl bg-due-soft border border-due/25 text-left text-xs text-due space-y-2">
                <p className="font-bold">⚠️ WebView Detected</p>
                <p className="font-semibold leading-relaxed">In-app browsers do not support installation. Please copy this link and open in Safari (iOS) or Chrome (Android) to install the app.</p>
                <div className="bg-bg-ivory p-2.5 rounded-xl border border-navy-10 font-data select-all break-all overflow-hidden text-[10px] font-bold">
                  {window.location.href}
                </div>
              </div>
            )}

            {platform === 'ios' && (
              <div className="text-left space-y-4">
                <div className="p-5 rounded-2xl bg-lavender-soft border border-lavender/25 shadow-sm">
                  <h3 className="font-heading text-xs font-bold text-navy uppercase tracking-wider mb-3">Safari (iPhone/iPad) Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-2.5 text-xs font-body text-navy-70 font-semibold leading-relaxed">
                    <li>Tap the <strong>Share</strong> icon (square with arrow up) in Safari's bottom toolbar.</li>
                    <li>Scroll down and select <strong>"Add to Home Screen"</strong> from the menu.</li>
                    <li>Tap <strong>"Add"</strong> in the top-right corner to complete installation.</li>
                  </ol>
                </div>
                <div className="flex justify-center py-2 animate-bounce">
                  <span className="text-3xl">🗳️</span>
                </div>
              </div>
            )}

            {platform === 'android' && (
              <div className="text-left space-y-4">
                <div className="p-4 rounded-2xl bg-sage-soft border border-sage/25 text-xs text-navy-70 font-semibold leading-relaxed">
                  <p>Tap the button below to prompt Chrome's native installer and add Ovify to your home screen.</p>
                </div>
                {deferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleAndroidPrompt}
                    className="w-full py-4 bg-sage hover:bg-sage/90 text-white font-heading text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98]"
                  >
                    <span>📲</span> Install Ovify App
                  </button>
                ) : (
                  <div className="p-3.5 bg-bg-ivory rounded-xl text-center text-xs text-navy-55 italic border border-navy-10 font-semibold">
                    Native prompt already triggered. Check your system toolbar or settings.
                  </div>
                )}
              </div>
            )}

            {platform === 'desktop' && (
              <div className="text-left space-y-4">
                <div className="p-4 rounded-2xl bg-navy-10 border border-navy-20 text-xs text-navy-70 font-semibold leading-relaxed">
                  <p>Please open this link on your mobile phone to install the daily companion application, or install it via your browser's address bar installer icon.</p>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleCompleteActivation}
              className="w-full py-4 bg-navy hover:bg-navy-70 text-white font-heading text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <span>Continue to Onboarding</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-gradient-to-b from-bg-ivory via-bg-ivory/80 to-bg-ivory/40 min-h-screen">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">
        {/* Animated App Logo Header */}
        <div className="mb-10 text-center flex flex-col items-center">
          <img 
            src="/static/logo.png" 
            alt="Ovify Logo" 
            className="w-16 h-16 object-contain rounded-2xl shadow-md mb-4 hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h2 className="font-heading text-2xl font-bold text-navy tracking-tight mb-2 uppercase">Welcome to Ovify</h2>
          <p className="font-body text-sm text-navy-55 font-semibold">Your personalized Ovarian Stimulation Companion</p>
        </div>

        {/* Auth Box Container */}
        <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-navy-10 shadow-xl relative overflow-hidden transition-all duration-300">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-due-soft border border-due/25 text-due text-xs font-body leading-relaxed flex items-center gap-2 animate-pulse font-semibold">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider mb-2">
                  Registered Phone Number
                </label>
                <div className="relative">
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+971 50 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3.5 rounded-xl border border-navy-20 bg-white font-data text-sm text-navy placeholder-navy-30 focus:border-lavender focus:ring-2 focus:ring-lavender/10 focus:outline-none transition-all duration-200 min-h-[48px] shadow-inner font-semibold"
                  />
                </div>
                <p className="mt-2.5 text-[11px] font-body text-navy-55 leading-relaxed font-semibold">
                  Enter the phone number registered by your clinic to load your treatment schedule.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 bg-navy hover:bg-navy-70 text-white font-heading text-sm font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <span>Request Access Code</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="otp" className="block font-heading text-[10px] font-bold text-navy uppercase tracking-wider">
                    Enter Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="font-body text-xs text-lavender font-bold hover:underline"
                  >
                    Edit Phone
                  </button>
                </div>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3.5 rounded-xl border border-navy-20 bg-white font-data text-center text-lg font-bold tracking-[0.4em] text-navy placeholder-navy-20 focus:border-lavender focus:ring-2 focus:ring-lavender/10 focus:outline-none transition-all duration-200 min-h-[48px] shadow-inner"
                />
                <p className="mt-2.5 text-[11px] font-body text-navy-55 leading-relaxed font-semibold">
                  A verification code has been simulated. Use code <span className="font-semibold text-lavender font-data">123456</span> to log in.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 bg-navy hover:bg-navy-70 text-white font-heading text-sm font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Code & Access</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
