import React, { useState } from 'react';

interface TriageTabProps {
  triageResponse: any;
  privacyMode: boolean;
  handleOpenPatientChart: (patientId: number) => void;
  handleResolveAlert: (userId: number) => void;
  handleUpdateOutcome: (userId: number, outcome: string) => void;
}

export const TriageTab: React.FC<TriageTabProps> = ({
  triageResponse,
  privacyMode,
  handleOpenPatientChart,
  handleResolveAlert,
  handleUpdateOutcome
}) => {
  const [revealedAiInsightIds, setRevealedAiInsightIds] = useState<number[]>([]);
  const [patientToMarkFailed, setPatientToMarkFailed] = useState<number | null>(null);

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
      ? 'border-due/30 hover:border-due hover:shadow-due/5' 
      : isAmber 
        ? 'border-blush hover:border-blush-dark hover:shadow-blush/5' 
        : 'border-sage/20 hover:border-sage hover:shadow-sage/5';

    return (
      <div 
        key={pt.patient_id}
        onClick={() => handleOpenPatientChart(pt.patient_id)}
        className={`p-5 rounded-2xl bg-white border shadow-sm transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${borderStyle} min-h-[120px] flex flex-col justify-between`}
      >
        <div>
          <div className="flex justify-between items-start gap-2">
            <div className="text-left">
              <h5 className="font-heading text-sm font-bold text-navy hover:text-lavender transition-colors">
                {maskLastName(pt.name)}
              </h5>
              <span className="text-[10px] text-navy-70 font-data tracking-wider uppercase block mt-0.5">{pt.cycle_type}</span>
            </div>
            <span className={`text-[9px] font-data font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isUrgent ? 'bg-due-soft text-due border border-due/20' : isAmber ? 'bg-blush-soft text-[#D07070] border border-blush/20' : 'bg-sage-soft text-sage border border-sage/20'
            }`}>
              {pt.status}
            </span>
          </div>

          <p className="font-body text-xs text-navy-70 mt-3.5 leading-relaxed bg-bg-ivory/40 p-3.5 rounded-xl border border-navy-10 text-left">
            {pt.reason}
          </p>

          {pt.action_taken && (
            <div className="flex items-center gap-2 text-[10px] font-data font-semibold text-navy-70 mt-2.5 bg-lavender-soft px-3 py-2 rounded-lg border border-lavender/10">
              <span>💬</span>
              <span>{pt.action_taken}</span>
            </div>
          )}

          {pt.ai_insight && (
            <div className="mt-3.5 p-3.5 bg-lavender-soft/40 border border-lavender/20 rounded-xl text-left">
              <span className="block text-[8px] font-bold text-lavender-dark tracking-wider uppercase mb-1 flex items-center gap-1">
                <span>🤖</span> AI Adherence Warning
              </span>
              {privacyMode && !revealedAiInsightIds.includes(pt.patient_id) ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRevealedAiInsightIds([...revealedAiInsightIds, pt.patient_id]);
                  }}
                  className="text-[10px] font-bold text-lavender-dark hover:text-lavender hover:underline flex items-center gap-1 min-h-[48px]"
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
        </div>

        <div className="flex justify-end items-center gap-3 mt-4 pt-3.5 border-t border-navy-10" onClick={(e) => e.stopPropagation()}>
          {pt.status !== 'On Track' && (
            <button
              onClick={() => handleResolveAlert(pt.patient_id)}
              className="px-4 py-2 text-[10px] font-heading font-bold text-white bg-navy hover:bg-navy-70 rounded-xl transition-all shadow-sm hover:shadow min-h-[48px] flex items-center active:scale-[0.98]"
            >
              Resolve Alert
            </button>
          )}
          {pt.cycle_outcome === 'Failed' ? (
            <span className="text-[10px] font-data font-bold text-due bg-due-soft border border-due/10 px-3 py-2 rounded-xl">Recovery Active</span>
          ) : (
            <button
              onClick={() => setPatientToMarkFailed(pt.patient_id)}
              className="px-4 py-2 text-[10px] font-heading font-bold text-due border border-due/30 hover:bg-due-soft rounded-xl transition-all min-h-[48px] flex items-center active:scale-[0.98]"
            >
              Mark Failed
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl bg-white/70 backdrop-blur-md border border-navy-10 rounded-3xl p-8 shadow-md">
      <div className="mb-8 text-left">
        <h3 className="font-heading text-base font-bold text-navy uppercase tracking-wider mb-2">IVF Patient Triage Grid</h3>
        <p className="font-body text-xs text-navy-70 leading-relaxed">
          Real-time clinical monitoring of compliance. Patients with missing logs escalate through priority tiers to prevent dropouts.
        </p>
      </div>

      {/* Urgency Summary Counts Row (US-J8-01) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <div className="p-6 rounded-2xl bg-white border border-[#E6F4EF] shadow-sm flex items-center justify-between text-left transition-all duration-300 hover:shadow-md">
          <div>
            <span className="block text-[10px] font-bold text-navy-70 uppercase tracking-wider">On Track</span>
            <p className="font-heading text-3xl font-extrabold text-sage mt-1">{triageResponse?.counts?.on_track ?? 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#E6F4EF] text-sage flex items-center justify-center font-bold text-base shadow-sm">✓</div>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-[#FEF6E9] shadow-sm flex items-center justify-between text-left transition-all duration-300 hover:shadow-md">
          <div>
            <span className="block text-[10px] font-bold text-navy-70 uppercase tracking-wider">Needs Attention</span>
            <p className="font-heading text-3xl font-extrabold text-[#E2A93E] mt-1">{triageResponse?.counts?.needs_attention ?? 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#FEF6E9] text-[#E2A93E] flex items-center justify-center font-bold text-base shadow-sm">!</div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-due-soft shadow-sm flex items-center justify-between text-left transition-all duration-300 hover:shadow-md">
          <div>
            <span className="block text-[10px] font-bold text-navy-70 uppercase tracking-wider">Urgent Alerts</span>
            <p className="font-heading text-3xl font-extrabold text-due mt-1">{triageResponse?.counts?.urgent ?? 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-due-soft text-due flex items-center justify-center font-bold text-base shadow-sm">🚨</div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-navy-10 shadow-sm flex items-center justify-between text-left transition-all duration-300 hover:shadow-md">
          <div>
            <span className="block text-[10px] font-bold text-navy-70 uppercase tracking-wider">Total Active</span>
            <p className="font-heading text-3xl font-extrabold text-navy mt-1">{triageResponse?.counts?.total_active ?? 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-bg-ivory text-navy flex items-center justify-center font-bold text-base shadow-sm">👥</div>
        </div>
      </div>

      {/* Three-Deck Triage Horizontal Rows (US-J8-01) */}
      <div className="flex flex-col gap-6 mb-8 text-left">
        {/* Urgent Alerts Row */}
        <div className="p-6 rounded-2xl bg-due-soft/20 border border-due/10 flex flex-col gap-4">
          <h4 className="font-heading text-xs font-bold text-due uppercase tracking-wider flex items-center gap-2 border-b border-due/10 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-due animate-pulse" />
            Urgent Alerts ({triageResponse?.urgent?.length ?? 0})
          </h4>
          {triageResponse?.urgent?.length === 0 ? (
            <p className="text-xs text-navy-55 italic p-1">No urgent alerts</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triageResponse?.urgent?.map((pt: any) => renderPatientTriageCard(pt, 'red'))}
            </div>
          )}
        </div>

        {/* Needs Attention Row */}
        <div className="p-6 rounded-2xl bg-[#FEF6E9]/20 border border-[#FEF6E9]/35 flex flex-col gap-4">
          <h4 className="font-heading text-xs font-bold text-[#E2A93E] uppercase tracking-wider flex items-center gap-2 border-b border-[#FEF6E9]/50 pb-3">
            <span className="w-2.5 h-2.5 bg-[#E2A93E] rounded-full" />
            Needs Attention ({triageResponse?.needs_attention?.length ?? 0})
          </h4>
          {triageResponse?.needs_attention?.length === 0 ? (
            <p className="text-xs text-navy-55 italic p-1">No attention flags</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triageResponse?.needs_attention?.map((pt: any) => renderPatientTriageCard(pt, 'amber'))}
            </div>
          )}
        </div>

        {/* On Track Row */}
        <div className="p-6 rounded-2xl bg-[#E6F4EF]/15 border border-[#E6F4EF]/35 flex flex-col gap-4">
          <h4 className="font-heading text-xs font-bold text-sage uppercase tracking-wider flex items-center gap-2 border-b border-[#E6F4EF]/50 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-sage" />
            On Track ({triageResponse?.on_track?.length ?? 0})
          </h4>
          {triageResponse?.on_track?.length === 0 ? (
            <p className="text-xs text-navy-55 italic p-1">No active compliant patients</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triageResponse?.on_track?.map((pt: any) => renderPatientTriageCard(pt, 'green'))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Mark Failed */}
      {patientToMarkFailed && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-navy-10 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <span className="text-4xl">⚠️</span>
            <h4 className="font-heading text-lg font-bold text-navy mt-4 mb-2">Activate Cycle Recovery Mode?</h4>
            <p className="font-body text-xs text-navy-70 leading-relaxed mb-6">
              This will update the cycle status to Failed and unlock the non-alarmist emotional Recovery Mode interface for the patient.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPatientToMarkFailed(null)}
                className="flex-1 py-3 border border-navy-10 rounded-xl font-heading text-xs font-bold text-navy hover:bg-bg-ivory transition-all min-h-[48px] active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdateOutcome(patientToMarkFailed, 'Failed');
                  setPatientToMarkFailed(null);
                }}
                className="flex-1 py-3 bg-due hover:bg-due/90 text-white rounded-xl font-heading text-xs font-bold transition-all min-h-[48px] active:scale-[0.98]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
