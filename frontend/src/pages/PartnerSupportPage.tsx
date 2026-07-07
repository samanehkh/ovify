import React, { useState, useEffect } from 'react';
import { Heart, Lock, LogOut, RefreshCw, Smile, Lightbulb, Activity, Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { loginPartner, fetchPartnerDashboard } from '../services/api';

export const PartnerSupportPage: React.FC = () => {
  const [partnerPhone, setPartnerPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoModalText, setInfoModalText] = useState<string | null>(null);
  
  // Dashboard details
  const [dashboardData, setDashboardData] = useState<import('../services/api').PartnerDashboardData | null>(null);
  const [consentError, setConsentError] = useState<boolean>(false);
  const [linkError, setLinkError] = useState<boolean>(false);
  const [supporterRole, setSupporterRole] = useState<'Partner' | 'Support'>('Partner');

  useEffect(() => {
    const cachedPhone = localStorage.getItem('partner_phone');
    const cachedRole = localStorage.getItem('partner_role') as 'Partner' | 'Support';
    if (cachedPhone) {
      setPartnerPhone(cachedPhone);
      if (cachedRole) {
        setSupporterRole(cachedRole);
      }
      setIsLoggedIn(true);
      fetchDashboard(cachedPhone);
    }
  }, []);

  const fetchDashboard = async (phone: string) => {
    setLoading(true);
    setError(null);
    setConsentError(false);
    setLinkError(false);
    try {
      const data = await fetchPartnerDashboard(phone);
      setDashboardData(data);
    } catch (err: any) {
      if (err.message.includes('consent') || err.message.includes('revoked')) {
        setConsentError(true);
      } else if (err.message.includes('link') || err.message.includes('not found') || err.message.includes('404')) {
        setLinkError(true);
      } else {
        setError(err.message || 'Network error fetching dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await loginPartner(partnerPhone, otp, supporterRole);
      localStorage.setItem('partner_phone', data.partner_phone);
      localStorage.setItem('partner_role', data.supporter_type);
      if (data.token) {
        localStorage.setItem('partner_token', data.token);
      }
      setIsLoggedIn(true);
      fetchDashboard(data.partner_phone);
    } catch (err: any) {
      setError(err.message || 'Login failed. Enter mock code 123456.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('partner_phone');
    localStorage.removeItem('partner_role');
    localStorage.removeItem('partner_token');
    setIsLoggedIn(false);
    setDashboardData(null);
    setConsentError(false);
    setLinkError(false);
    setOtp('');
  };

  // Login Form Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8F5F1] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-navy-10 rounded-3xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-lavender/10 flex items-center justify-center mx-auto mb-6 text-lavender-dark">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          
          <h2 className="font-heading text-xl font-bold text-navy mb-1">Partner Support Companion</h2>
          <p className="font-body text-xs text-navy-55 mb-6">
            Log in to view real-time emotional logs, stimulation timelines, and coaching advice for your partner's IVF cycle.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block font-heading text-[10px] font-bold text-navy-55 mb-1.5 uppercase">Your Phone Number</label>
              <input
                type="tel"
                value={partnerPhone}
                onChange={(e) => setPartnerPhone(e.target.value)}
                placeholder="e.g. +971509999999"
                className="w-full px-4 py-3 rounded-xl border border-navy-10 font-data text-sm text-navy placeholder-navy-10 focus:outline-none focus:border-lavender bg-[#F8F5F1]/30"
                required
              />
            </div>

            <div>
              <label className="block font-heading text-[10px] font-bold text-navy-55 mb-1.5 uppercase">Your Supporter Role</label>
              <div className="flex gap-4 mt-1 bg-[#F8F5F1]/30 p-3 rounded-xl border border-navy-10/40">
                <label className="flex items-center gap-2 font-body text-xs text-navy cursor-pointer select-none">
                  <input
                    type="radio"
                    name="supporterRole"
                    value="Partner"
                    checked={supporterRole === 'Partner'}
                    onChange={() => setSupporterRole('Partner')}
                    className="w-4.5 h-4.5 text-lavender focus:ring-lavender cursor-pointer"
                  />
                  Spouse / Partner
                </label>
                <label className="flex items-center gap-2 font-body text-xs text-navy cursor-pointer select-none">
                  <input
                    type="radio"
                    name="supporterRole"
                    value="Support"
                    checked={supporterRole === 'Support'}
                    onChange={() => setSupporterRole('Support')}
                    className="w-4.5 h-4.5 text-lavender focus:ring-lavender cursor-pointer"
                  />
                  Friend / Family
                </label>
              </div>
            </div>

            <div>
              <label className="block font-heading text-[10px] font-bold text-navy-55 mb-1.5 uppercase">Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter mock code 123456"
                className="w-full px-4 py-3 rounded-xl border border-navy-10 font-data text-sm text-navy placeholder-navy-10 focus:outline-none focus:border-lavender focus:ring-2 focus:ring-lavender/50 bg-[#F8F5F1]/30"
                required
              />
            </div>

            {error && (
              <div role="status" aria-live="polite" className="flex items-center gap-1.5 justify-center font-body text-xs text-due bg-blush-10 py-2 rounded-lg border border-blush/20">
                <AlertTriangle className="w-4 h-4 text-due flex-none" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-navy hover:bg-navy-80 text-white font-heading text-xs font-bold transition-all duration-300 shadow-md hover:shadow-lg focus:ring-2 focus:ring-lavender focus:outline-none cursor-pointer"
            >
              {loading ? 'Logging in...' : 'Sign In as Support Partner'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 1. Consent Gated Revoked Screen (403)
  if (consentError) {
    return (
      <div className="min-h-screen bg-[#F8F5F1] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-navy-10 rounded-3xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-blush-10 flex items-center justify-center mx-auto mb-6 text-due">
            <Lock className="w-8 h-8" />
          </div>
          
          <h2 className="font-heading text-lg font-bold text-navy mb-2">Awaiting Sharing Consent</h2>
          <p className="font-body text-xs text-navy-55 leading-relaxed mb-6">
            To comply with Health Data Law guidelines, sharing medical cycle detail logs is gated behind granular, revocable consent.
          </p>
          
          <div className="bg-[#F8F5F1] border border-navy-10 rounded-2xl p-4 text-left mb-6 font-body text-[11px] text-navy-55 leading-relaxed">
            ℹ️ <strong>Action Required:</strong> Ask Sarah to check the <strong>"Partner Sharing & Consent"</strong> checkbox under the settings section on her patient app dashboard to grant you access.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => fetchDashboard(partnerPhone)}
              className="flex-1 py-3 border border-navy-10 hover:bg-[#F8F5F1] text-navy font-heading text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Check
            </button>
            
            <button
              onClick={handleLogout}
              className="px-4 py-3 border border-[#F4A0A0]/30 hover:bg-blush-10 text-due font-heading text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unlinked Phone Error Screen (404)
  if (linkError) {
    return (
      <div className="min-h-screen bg-[#F8F5F1] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-navy-10 rounded-3xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-blush-10 flex items-center justify-center mx-auto mb-6 text-due">
            <Activity className="w-8 h-8" />
          </div>
          
          <h2 className="font-heading text-lg font-bold text-navy mb-2">No Active Patient Link</h2>
          <p className="font-body text-xs text-navy-55 leading-relaxed mb-6">
            Your phone number <strong>{partnerPhone}</strong> has not been linked to any patient profile.
          </p>
          
          <div className="bg-[#F8F5F1] border border-navy-10 rounded-2xl p-4 text-left mb-6 font-body text-[11px] text-navy-55 leading-relaxed">
            ℹ️ <strong>Instructions:</strong> Please ask Sarah to type your exact number (<code>{partnerPhone}</code>) under the "Partner Phone Number" input field in her app.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => fetchDashboard(partnerPhone)}
              className="flex-1 py-3 border border-navy-10 hover:bg-[#F8F5F1] text-navy font-heading text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Link Check
            </button>
            
            <button
              onClick={handleLogout}
              className="px-4 py-3 border border-[#F4A0A0]/30 hover:bg-blush-10 text-due font-heading text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-[#F8F5F1] flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-lavender border-t-transparent animate-spin mb-4" />
        <p className="font-body text-xs text-navy-55">Connecting to companion registry...</p>
      </div>
    );
  }

  // Determine mood styling
  const getMoodBadgeStyle = (mood: string) => {
    switch (mood) {
      case 'Amazing': return 'bg-sage-10 text-sage border border-sage/20 shadow-sm';
      case 'Good': return 'bg-sage-10/50 text-sage-dark border border-sage/10';
      case 'Normal': return 'bg-[#9E8CEF]/10 text-lavender-dark border border-[#9E8CEF]/20';
      case 'Low': return 'bg-blush-10/50 text-due border border-blush/10';
      case 'Anxious': return 'bg-blush-10 text-due border border-blush/25 shadow-sm animate-pulse';
      default: return 'bg-[#F8F5F1] text-navy-55 border border-navy-10';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F1] flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-md bg-white border border-navy-10 rounded-3xl p-6 shadow-sm flex flex-col flex-1 relative pb-24">
        {/* Header bar */}
        <div className="flex justify-between items-center mb-8 border-b border-[#F8F5F1] pb-4">
          <div className="flex items-center gap-2 text-left">
            <div className="w-9 h-9 rounded-xl bg-[#9E8CEF]/15 flex items-center justify-center text-lavender-dark">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-data text-[9px] font-bold text-navy-55 tracking-widest uppercase">Support Companion</span>
              <h3 className="font-heading text-sm font-bold text-navy">{dashboardData.patient_name}'s IVF Cycle</h3>
            </div>
          </div>
          <button
            onClick={() => fetchDashboard(partnerPhone)}
            className="w-8 h-8 rounded-full border border-navy-10 flex items-center justify-center text-navy-55 hover:text-navy cursor-pointer hover:bg-navy-10/40 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic recovery or cycle progress card */}
        {dashboardData.cycle_outcome === 'Failed' ? (
          <div className="mb-6 p-5 rounded-2xl bg-blush-10 border border-blush/25 text-left">
            <h4 className="font-heading text-xs font-bold text-due uppercase tracking-wider mb-2">Cycle Recovery Active</h4>
            <p className="font-body text-xs text-navy-55 leading-relaxed">
              Sarah's clinic coordinator has marked this cycle as unsuccessful. Injection schedules are paused. 
              Remember to offer comfort and gentle emotional support during her recovery.
            </p>
          </div>
        ) : (
          <div className="mb-6 p-5 rounded-2xl bg-lavender/10 border border-lavender/25 text-left flex justify-between items-center">
            <div>
              <h4 className="font-heading text-xs font-bold text-lavender-dark uppercase tracking-wider mb-1">Ovarian Stimulation Progress</h4>
              <p className="font-body text-xs text-navy-55">
                {dashboardData.cycle_type} Protocol
              </p>
            </div>
            <div className="font-data text-xl font-black text-navy">
              Day {dashboardData.stim_day} <span className="text-xs font-normal text-navy-55">/ {dashboardData.total_days}</span>
            </div>
          </div>
        )}

        {/* Sarah's Mood State */}
        <div className="mb-6 p-5 bg-[#F8F5F1]/55 border border-navy-10 rounded-2xl text-left">
          <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-3">Sarah's Today's Mood Check-in</h4>
          {dashboardData.mood ? (
            <div className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-navy-55" />
              <span className={`px-3 py-1.5 rounded-full font-heading text-xs font-bold uppercase ${getMoodBadgeStyle(dashboardData.mood)}`}>
                {dashboardData.mood}
              </span>
            </div>
          ) : (
            <p className="font-body text-xs text-navy-55 italic">
              Sarah has not completed her mood check-in today.
            </p>
          )}
        </div>

        {/* Tailored Coaching Guidance Prompts */}
        <div className="mb-8 p-5 bg-navy text-white rounded-2xl text-left shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Lightbulb className="w-24 h-24 stroke-[2]" />
          </div>
          <div className="flex gap-2 items-center mb-3">
            <Lightbulb className="w-4 h-4 text-lavender stroke-[2.5]" />
            <h4 className="font-heading text-[10px] font-bold text-lavender uppercase tracking-wider">💡 Tailored Partner Prompts</h4>
          </div>
          <p className="font-body text-xs leading-relaxed">
            {dashboardData.support_prompt}
          </p>
        </div>

        {/* Trigger & Semen Timing Alerts (Spouse/Partner-only) */}
        {supporterRole === 'Partner' && (
          <div className="mb-6 p-5 bg-[#F8F5F1] border border-[#F4A0A0]/30 rounded-2xl text-left shadow-sm">
            <h4 className="font-heading text-xs font-bold text-[#F4A0A0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4" aria-hidden="true" />
              Trigger & Semen Timing Alert
            </h4>
            <p className="font-body text-xs text-navy-55 leading-relaxed">
              As Sarah's spouse/partner, you are required to observe a 2-to-5 day abstinence window prior to egg collection. Your target drop-off window is:
            </p>
            <div className="mt-3 p-3 bg-white rounded-xl border border-navy-10 font-data text-xs text-navy flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-navy-55" aria-hidden="true" />
                Drop-off Target:
              </span>
              <span className="font-bold text-navy">July 12 at 08:30 AM</span>
            </div>
          </div>
        )}

        {/* Financial & Billing Gateway (Spouse/Partner-only) */}
        {supporterRole === 'Partner' && (
          <div className="mb-6 p-5 bg-[#F8F5F1] border border-navy-10 rounded-2xl text-left shadow-sm">
            <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-navy-55" aria-hidden="true" />
              Clinic Financial Gateway
            </h4>
            <p className="font-body text-xs text-navy-55 leading-relaxed mb-3">
              Manage shared invoices and payment installments for Sarah's current IVF cycle:
            </p>
            <div className="p-3 bg-white rounded-xl border border-navy-10 font-data text-xs text-navy flex justify-between items-center mb-3">
              <div>
                <div className="font-bold">IVF Cycle Installment #2</div>
                <div className="text-[10px] text-navy-55">Due: July 15, 2026</div>
              </div>
              <div className="font-bold text-due">$1,250.00</div>
            </div>
            <button
              onClick={() => setInfoModalText("Payment gateway integration is in Phase 2.")}
              className="w-full py-2.5 bg-navy hover:bg-navy-80 text-white font-heading text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md focus:ring-2 focus:ring-lavender focus:outline-none"
            >
              Pay Outstanding Balance
            </button>
          </div>
        )}

        {/* Support Checklist Tips */}
        <div className="text-left mb-6">
          <h4 className="font-heading text-xs font-bold text-navy-55 uppercase tracking-wider mb-3">Stimulation Phase Care Tips</h4>
          <ul className="space-y-3.5 font-body text-xs text-navy-55">
            <li className="flex gap-2">
              <span className="text-lavender-dark font-bold">1.</span>
              <span>Keep Sarah well hydrated. Ovarian stimulation causes high water demand; stock coconut water or mineral electrolyte drinks.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-lavender-dark font-bold">2.</span>
              <span>Offer physical comfort. Help prep ice packs or warm heating pads for the abdomen after daily injection pokes.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-lavender-dark font-bold">3.</span>
              <span>Manage household details. Reduce Sarah's cognitive load by handling heavy meals, groceries, and cycle calendar alerts.</span>
            </li>
          </ul>
        </div>

        {/* Footer Logout */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-center border-t border-[#F8F5F1] pt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 font-heading text-xs font-bold text-due hover:text-[#A93C46] focus:ring-2 focus:ring-due focus:outline-none cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout Support Session
          </button>
        </div>
      </div>

      {/* Accessible Custom Modal instead of alert() */}
      {infoModalText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-5" role="dialog" aria-modal="true" aria-labelledby="partnerModalTitle">
          <div className="bg-white border border-navy-10 rounded-3xl p-6 shadow-xl max-w-sm w-full text-center relative">
            <h4 id="partnerModalTitle" className="font-heading text-base font-bold text-navy mb-2">Notice</h4>
            <p className="font-body text-xs text-navy-70 leading-relaxed mb-6">{infoModalText}</p>
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
