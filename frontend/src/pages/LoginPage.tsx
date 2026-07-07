import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await login(phone, otp);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

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
              // Fallback text if logo fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
          <h2 className="font-heading text-2xl font-bold text-navy tracking-tight mb-2">Welcome to Ovify</h2>
          <p className="font-body text-sm text-navy-55">Your personalized Ovarian Stimulation Companion</p>
        </div>

        {/* Auth Box Container */}
        <div className="w-full bg-white/70 backdrop-blur-md rounded-3xl p-8 border border-navy-10 shadow-xl relative overflow-hidden transition-all duration-300">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-blush-10 border border-blush/25 text-blush text-xs font-body leading-relaxed flex items-center gap-2 animate-pulse">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block font-heading text-xs font-semibold text-navy uppercase tracking-wider mb-2">
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
                    className="w-full px-4 py-3.5 rounded-xl border border-navy-20 bg-white font-data text-sm text-navy placeholder-navy-30 focus:border-lavender focus:ring-2 focus:ring-lavender/10 focus:outline-none transition-all duration-200"
                  />
                </div>
                <p className="mt-2 text-[11px] font-body text-navy-55 leading-relaxed">
                  Enter the phone number registered by your clinic to load your treatment schedule.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 bg-navy hover:bg-navy-80 text-white font-heading text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
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
                  <label htmlFor="otp" className="block font-heading text-xs font-semibold text-navy uppercase tracking-wider">
                    Enter Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="font-body text-xs text-lavender hover:underline"
                  >
                    Edit Phone
                  </button>
                </div>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3.5 rounded-xl border border-navy-20 bg-white font-data text-center text-lg font-semibold tracking-[0.4em] text-navy placeholder-navy-20 focus:border-lavender focus:ring-2 focus:ring-lavender/10 focus:outline-none transition-all duration-200"
                />
                <p className="mt-2 text-[11px] font-body text-navy-55 leading-relaxed">
                  A verification code has been simulated. Use code <span className="font-semibold text-lavender font-data">123456</span> to log in.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 bg-navy hover:bg-navy-80 text-white font-heading text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
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
