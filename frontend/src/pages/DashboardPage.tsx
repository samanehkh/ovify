import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';
import { Sparkles, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Heart, Calendar } from 'lucide-react';

// Premium style inject for the CSS Breathing Bubble & micro-interactions
const UI_STYLE_INJECT = `
@keyframes breathe {
  0% { transform: scale(1); opacity: 0.35; box-shadow: 0 0 0 0 rgba(158, 140, 239, 0.4); }
  50% { transform: scale(1.3); opacity: 0.8; box-shadow: 0 0 0 20px rgba(158, 140, 239, 0); }
  100% { transform: scale(1); opacity: 0.35; box-shadow: 0 0 0 0 rgba(158, 140, 239, 0); }
}
.breathing-bubble {
  animation: breathe 5s infinite ease-in-out;
}
.glow-pill-card {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.glow-pill-card:hover {
  transform: translateY(-2px) scale(1.015);
  box-shadow: 0 12px 24px -10px rgba(19, 35, 60, 0.08), 0 0 0 1px rgba(158, 140, 239, 0.25);
}
`;

export const DashboardPage: React.FC = () => {
  const { user, refetchData, changeTab } = useApp();

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<api.DashboardResponseData | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Guide accordion toggles (for Pre-cycle first-timers)
  const [expandedSection, setExpandedSection] = useState<string | null>('scan');

  // Confirmation modal states
  const [showDay1Modal, setShowDay1Modal] = useState(false);
  const [reportingDay1, setReportingDay1] = useState(false);
  const [infoModalText, setInfoModalText] = useState<string | null>(null);

  // Load dashboard on boot
  const loadDashboard = async () => {
    if (!user) return;
    setDbLoading(true);
    setDbError(null);
    try {
      const data = await api.fetchUserDashboard(user.id);
      setDashboardData(data);
    } catch (err: any) {
      setDbError(err.message || 'Failed to load cycle dashboard.');
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  // Determine time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleReportDay1 = async () => {
    if (!user) return;
    setReportingDay1(true);
    try {
      await api.reportDay1(user.id);
      setShowDay1Modal(false);
      setInfoModalText("Your Day 1 has been reported. The clinic team will contact you to schedule your baseline scan.");
      loadDashboard();
      refetchData();
    } catch (err: any) {
      setInfoModalText(err.message || "Failed to notify the clinic. Please call them directly.");
    } finally {
      setReportingDay1(false);
    }
  };

  if (dbLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 rounded-full border-4 border-lavender border-t-transparent animate-spin mb-4" />
        <p className="font-heading text-xs font-semibold text-navy tracking-wider uppercase">Loading your timeline...</p>
      </div>
    );
  }

  if (dbError || !dashboardData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-blush mb-3" />
        <p className="font-heading text-sm font-bold text-navy mb-1">Could not sync timeline</p>
        <p className="font-body text-xs text-navy-55 mb-5 max-w-xs">{dbError}</p>
        <button
          onClick={loadDashboard}
          className="py-2.5 px-5 bg-navy text-white font-heading text-xs font-bold rounded-xl shadow-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isPreCycle = dashboardData.cycle_status === 'Pre-Cycle';

  return (
    <div className="flex-1 flex flex-col pt-4 px-5 pb-24 overflow-y-auto no-scrollbar relative">
      <style>{UI_STYLE_INJECT}</style>

      {/* Greeting Header */}
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <span className="font-data text-[10px] font-bold text-navy-55 tracking-widest uppercase">
            {getGreeting()}
          </span>
          <h2 className="font-heading text-xl font-bold text-navy leading-tight mt-0.5">
            {user?.name || 'Sarah'}
          </h2>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-white border border-navy-10 shadow-sm font-data text-[10px] font-bold text-navy-55 uppercase tracking-wide">
          {dashboardData.cycle_status}
        </div>
      </div>

      {/* Clinic Coordinator Action Required Alert Banner */}
      {user && user.active_status === 'Action Required' && (
        <div className="mb-5 p-4 rounded-2xl bg-[#C24C57]/10 border border-[#C24C57]/20 text-left flex gap-3 shadow-sm animate-pulse">
          <AlertTriangle className="w-5 h-5 flex-none text-[#C24C57] mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="font-heading text-xs font-bold text-[#C24C57] uppercase tracking-wider mb-0.5">
              Protocol Action Required
            </h4>
            <p className="font-body text-[11px] text-navy-55 leading-relaxed">
              We flagged a missed dose. Mona has been updated to follow up with your schedule.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. MAIN GRAPHIC CARD (Circular Ring OR Period Report Card)
          ───────────────────────────────────────────────────────────── */}
      {!isPreCycle ? (
        <>
          {/* ACTIVE CYCLE: SVG Circular Progress Ring */}
          <div className="mb-6 p-6 rounded-3xl bg-white border border-navy-10 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
            {/* Subtle glowing backdrop */}
            <div className="absolute inset-0 bg-radial-gradient from-lavender/5 to-transparent pointer-events-none" />
            
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* SVG Progress Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="#EEF1F6"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  stroke="#9E8CEF"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={402}
                  // Mock active cycle day progress (say day 5 of 12)
                  strokeDashoffset={402 - (402 * Math.min(dashboardData.cycle_day || 1, 12)) / 12}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-data text-[10px] text-navy-55 font-bold uppercase tracking-widest">Day</span>
                <span className="font-heading text-3xl font-extrabold text-navy leading-none mt-1">
                  {dashboardData.cycle_day || 1}
                </span>
                <span className="font-body text-[10px] text-navy-55/70 mt-1">of 12</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 px-3 py-1 bg-sage-soft rounded-full font-data text-[11px] font-bold text-sage">
              <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
              ON TRACK · CLINIC SYNCED
            </div>
          </div>

          {/* Next Scan Appointment Card */}
          {dashboardData.next_appointment_datetime && (
            <div className="mb-6 p-5 rounded-2xl bg-white border border-navy-10 shadow-sm flex items-start gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-[#F3F1FE] flex items-center justify-center text-lavender-mid flex-none">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">Scheduled Check</span>
                <p className="font-heading text-xs font-bold text-navy mt-1">
                  Next scan appointment: {(() => {
                    try {
                      const d = new Date(dashboardData.next_appointment_datetime!);
                      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                      const dayNum = d.getDate();
                      const monthName = d.toLocaleDateString('en-US', { month: 'long' });
                      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      return `${dayName}, ${dayNum} ${monthName} at ${timeStr}`;
                    } catch (e) {
                      return dashboardData.next_appointment_datetime;
                    }
                  })()}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        // PRE-CYCLE: Awaiting Cycle Start and Next Scan cards
        <div className="space-y-4 mb-6 text-left">
          {/* Awaiting Cycle Start Card */}
          <div className="p-6 rounded-3xl bg-white border border-lavender shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-lavender/5 to-transparent pointer-events-none" />
            <h3 className="font-heading text-base font-extrabold text-navy flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lavender animate-pulse" />
              Awaiting Cycle Start
            </h3>
            <p className="font-body text-xs text-navy-55 mt-2.5 leading-relaxed">
              Your clinic has registered your profile. Your daily medication timeline will go live here once your cycle starts.
            </p>
          </div>

          {/* Next Scan Appointment Card */}
          {dashboardData.next_appointment_datetime && (
            <div className="p-5 rounded-2xl bg-white border border-navy-10 shadow-sm flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F3F1FE] flex items-center justify-center text-lavender-mid flex-none">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="block text-[10px] font-bold text-navy-55 uppercase tracking-wider">Scheduled Check</span>
                <p className="font-heading text-xs font-bold text-navy mt-1">
                  Next scan appointment: {(() => {
                    try {
                      const d = new Date(dashboardData.next_appointment_datetime!);
                      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                      const dayNum = d.getDate();
                      const monthName = d.toLocaleDateString('en-US', { month: 'long' });
                      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      return `${dayName}, ${dayNum} ${monthName} at ${timeStr}`;
                    } catch (e) {
                      return dashboardData.next_appointment_datetime;
                    }
                  })()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. MEDICATIONS OR PROTOCOL FEED
          ───────────────────────────────────────────────────────────── */}
      {!isPreCycle && (
        <div className="mb-6">
          <div className="flex justify-between items-baseline mb-3">
            <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider">Today's Injections</h3>
            <span className="font-data text-[11px] text-navy-55 font-bold">
              {dashboardData.today_schedule.filter(m => m.status === 'Taken').length}/{dashboardData.today_schedule.length} Done
            </span>
          </div>

          <div className="space-y-3">
            {dashboardData.today_schedule.map((med) => {
              const isTaken = med.status === 'Taken' || med.status === 'Late';
              return (
                <div
                  key={med.medication_id}
                  onClick={() => {
                    if (!isTaken) {
                      changeTab('medications', {
                        id: med.medication_id,
                        name: med.name,
                        dosage: med.dosage,
                        route: med.route,
                        scheduled_time: med.scheduled_time,
                        status: med.status,
                      } as any);
                    }
                  }}
                  className={`glow-pill-card p-4 rounded-2xl border text-left flex justify-between items-center ${
                    isTaken 
                      ? 'bg-white border-navy-10/40 opacity-75' 
                      : 'bg-white border-lavender cursor-pointer'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading text-sm font-bold text-navy truncate">{med.name}</h4>
                      <span className={`text-[9px] font-data font-bold px-2 py-0.5 rounded-full ${
                        isTaken ? 'bg-[#E6F4EF] text-[#3E8E6E]' : 'bg-[#F3F1FE] text-lavender'
                      }`}>
                        {med.status}
                      </span>
                    </div>
                    <p className="font-body text-[11px] text-navy-55 mt-1">
                      {med.dosage} · {med.route}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-none">
                    <span className="font-data text-xs text-navy font-bold">{med.scheduled_time.slice(0, 5)}</span>
                    <span className="text-[10px] text-navy-55/70 mt-0.5 font-body">Target</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. SUPPORT TOOLS GRID (CalmSeed Companion + Ask Me Anything)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 mb-6">
        {/* CalmSeed somatic breathing card */}
        <div className="p-4 rounded-3xl bg-white border border-navy-10 shadow-sm flex flex-col justify-between items-center text-center relative overflow-hidden h-[155px]">
          <div className="relative w-12 h-12 flex items-center justify-center mt-1">
            <div className="absolute w-8 h-8 rounded-full bg-lavender/30 breathing-bubble" />
            <Heart className="w-5 h-5 text-lavender-dark z-10" />
          </div>
          <div>
            <h4 className="font-heading text-xs font-bold text-navy">CalmSeed</h4>
            <p className="font-body text-[10px] text-navy-55 mt-0.5 leading-tight">Breathing cycle</p>
          </div>
        </div>

        {/* Ask Me Anything (FAQ link) */}
        <div
          onClick={() => setInfoModalText("Ask Ovify AI is in Phase 2 development.")}
          className="p-4 rounded-3xl bg-white border border-navy-10 shadow-sm flex flex-col justify-between items-center text-center h-[155px] cursor-pointer hover:border-lavender/50 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-[#F3F1FE] flex items-center justify-center text-lavender-dark mt-2">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-heading text-xs font-bold text-navy">Ask Me Anything</h4>
            <p className="font-body text-[10px] text-navy-55 mt-0.5 leading-tight">Search clinic FAQs</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. ADAPTIVE BASELINE GUIDE (Pre-Cycle Only)
          ───────────────────────────────────────────────────────────── */}
      {isPreCycle && (
        <div className="mb-6 text-left">
          <h3 className="font-heading text-sm font-bold text-navy uppercase tracking-wider mb-3">Follicle scan preparation</h3>
          
          {user?.injection_comfort === 'First time' ? (
            // Expanded accordion view for first timers
            <div className="space-y-2">
              <div className="p-4 rounded-2xl bg-white border border-navy-10">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'scan' ? null : 'scan')}
                  className="w-full flex justify-between items-center text-left font-heading text-xs font-bold text-navy uppercase tracking-wider"
                >
                  <span>1. Ultrasound follicular scan</span>
                  {expandedSection === 'scan' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSection === 'scan' && (
                  <p className="font-body text-xs text-navy-55 leading-relaxed mt-2.5 pt-2 border-t border-navy-10/40">
                    Your baseline scan will occur on Day 2 or 3 of your period. This checks your ovaries before starting daily hormone injections.
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white border border-navy-10">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'blood' ? null : 'blood')}
                  className="w-full flex justify-between items-center text-left font-heading text-xs font-bold text-navy uppercase tracking-wider"
                >
                  <span>2. Blood hormone check</span>
                  {expandedSection === 'blood' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSection === 'blood' && (
                  <p className="font-body text-xs text-navy-55 leading-relaxed mt-2.5 pt-2 border-t border-navy-10/40">
                    We check estrogen, progesterone, and LH levels to confirm your body is fully ready for stimulation.
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Streamlined checklist for experienced patients
            <div className="p-4 rounded-2xl bg-white border border-navy-10 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-lavender flex-none mt-0.5" />
              <div className="flex-1">
                <p className="font-heading text-xs font-bold text-navy">Baseline Check Reminder</p>
                <p className="font-body text-xs text-navy-55 mt-1 leading-relaxed">
                  Book scan on Day 2 or 3 of menstruation. Remember to bring your prescription sheets.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODALS & DIALOGS
          ───────────────────────────────────────────────────────────── */}
      {/* Day 1 period report confirmation modal */}
      {showDay1Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-5" role="dialog" aria-modal="true">
          <div className="bg-white border border-navy-10 rounded-3xl p-6 shadow-xl max-w-sm w-full text-center relative animate-fade-in">
            <h4 className="font-heading text-base font-bold text-navy mb-2">Report Day 1?</h4>
            <p className="font-body text-xs text-navy-55 leading-relaxed mb-6">
              Please confirm that you have started your period today. We will notify your clinic team to book your baseline scan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={reportingDay1}
                onClick={handleReportDay1}
                className="flex-1 py-3 bg-navy hover:bg-navy-80 text-white font-heading text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {reportingDay1 ? 'Notifying...' : 'Confirm Flow'}
              </button>
              <button
                type="button"
                onClick={() => setShowDay1Modal(false)}
                className="flex-1 py-3 border border-navy-10 bg-white hover:bg-navy-10/10 text-navy font-heading text-xs font-bold rounded-xl transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info notice dialog */}
      {infoModalText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-5" role="dialog" aria-modal="true">
          <div className="bg-white border border-navy-10 rounded-3xl p-6 shadow-xl max-w-sm w-full text-center relative">
            <h4 className="font-heading text-base font-bold text-navy mb-2">Cycle Notice</h4>
            <p className="font-body text-xs text-navy-55 leading-relaxed mb-6">{infoModalText}</p>
            <button
              onClick={() => setInfoModalText(null)}
              className="w-full py-3 bg-navy hover:bg-navy-80 text-white font-heading text-xs font-bold rounded-xl shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
