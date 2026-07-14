import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check, Play, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

// Premium style inject for guide interactions
const UI_STYLE_INJECT = `
@keyframes pulseGlow {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(158, 140, 239, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(158, 140, 239, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(158, 140, 239, 0); }
}
.play-btn-glow {
  animation: pulseGlow 2.5s infinite;
}
.timeline-card {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.timeline-card:hover {
  transform: translateX(4px);
  border-color: rgba(158, 140, 239, 0.4);
  background-color: rgba(255, 255, 255, 0.9);
}
.btn-spring {
  transition: transform 0.1s ease;
}
.btn-spring:active {
  transform: scale(0.98);
}
`;

export const MedicationLogPage: React.FC = () => {
  const { selectedMedication, changeTab, submitDose } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedMedication) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-body text-sm text-navy-55 mb-4">No medication selected.</p>
        <button 
          onClick={() => changeTab('dashboard')}
          className="px-4 py-2 bg-lavender-dark text-white rounded-lg font-data text-sm font-semibold min-h-[48px] active:scale-95"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isTaken = selectedMedication.status === 'Taken';

  const getMedicationImage = (name: string) => {
    const cleanName = name.toLowerCase();
    if (cleanName.includes('gonal')) {
      return `${API_BASE_URL}/static/gonal_f_clean.jpg`;
    }
    if (cleanName.includes('menopur')) {
      return `${API_BASE_URL}/static/menopur_clean.jpg`;
    }
    return `${API_BASE_URL}/static/injection_guide.png`;
  };

  const handleConfirmDose = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitDose(selectedMedication.id);
      changeTab('dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm dose. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4 px-5 pb-24 overflow-y-auto no-scrollbar relative">
      <style>{UI_STYLE_INJECT}</style>

      {/* Top Navigation Bar */}
      <div className="flex items-center gap-3.5 mb-6">
        <button 
          onClick={() => changeTab('dashboard')}
          aria-label="Back to Home Dashboard"
          className="w-10 h-10 rounded-full bg-white border border-navy-10 flex items-center justify-center text-navy cursor-pointer hover:bg-navy-10/40 transition-all active:scale-90 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div className="text-left">
          <h3 className="font-heading text-base font-bold text-navy leading-tight">
            {selectedMedication.name}
          </h3>
        </div>
      </div>

      {/* 1. Device Graphic Header */}
      <div className="w-full h-44 rounded-2xl overflow-hidden mb-6 border border-navy-10 bg-white flex items-center justify-center relative shadow-sm">
        <img 
          src={getMedicationImage(selectedMedication.name)} 
          alt={`${selectedMedication.name} device`} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = `${API_BASE_URL}/static/injection_guide.png`;
          }}
        />
        {/* Stylized Glass-Pill Badge */}
        <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold font-data text-navy shadow-sm border border-white/40">
          Dosage: {selectedMedication.dosage}
        </div>
      </div>

      {/* 2. Video Demonstration Block */}
      <div className="mb-6">
        <div className="w-full h-40 rounded-2xl bg-navy/90 relative overflow-hidden flex items-center justify-center shadow-inner border border-navy-10/30">
          <img 
            src={`${API_BASE_URL}/static/video_poster.jpg`} 
            alt="Video Demonstration Guide Preview" 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <button 
            type="button"
            aria-label="Play demonstration video guide"
            className="w-14 h-14 rounded-full bg-lavender flex items-center justify-center text-white cursor-pointer play-btn-glow shadow-lg z-10 border border-white/20 transition-transform duration-300 active:scale-95"
          >
            <Play className="w-5 h-5 stroke-[2.5] fill-current translate-x-0.5" />
          </button>
          
          <span className="absolute bottom-3 left-3 bg-navy/65 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold font-data text-white">
            1:45 mins
          </span>
        </div>
      </div>

      {/* 3. Preparation Guidelines List */}
      <div className="space-y-3 mb-6">
        <h4 className="font-heading text-[10px] font-bold text-navy uppercase tracking-wider text-left pl-1">
          Preparation guidelines
        </h4>
        
        {/* Step 1 */}
        <div className="timeline-card p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-navy-10 text-left flex items-start gap-4 shadow-sm border-l-4 border-l-lavender">
          <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none" aria-hidden="true">
            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
          </div>
          <p className="font-body text-xs text-navy-70 leading-relaxed font-semibold">
            1. Wash your hands thoroughly with soap and water.
          </p>
        </div>

        {/* Step 2 */}
        <div className="timeline-card p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-navy-10 text-left flex items-start gap-4 shadow-sm border-l-4 border-l-lavender">
          <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none" aria-hidden="true">
            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
          </div>
          <p className="font-body text-xs text-navy-70 leading-relaxed font-semibold">
            2. Clean the injection site with an alcohol swab and let it air dry.
          </p>
        </div>

        {/* Step 3 */}
        <div className="timeline-card p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-navy-10 text-left flex items-start gap-4 shadow-sm border-l-4 border-l-lavender">
          <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none" aria-hidden="true">
            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
          </div>
          <p className="font-body text-xs text-navy-70 leading-relaxed font-semibold">
            3. Prepare the injection device and select your prescribed dose.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-due-soft border border-due/30 rounded-xl text-due font-body text-xs font-semibold text-left flex items-start gap-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Bottom Action Panel */}
      {isTaken ? (
        <div className="bg-sage-soft/10 border-sage/20 border rounded-2xl p-5 text-center shadow-sm">
          <span className="inline-flex w-10 h-10 rounded-full bg-sage-soft text-sage items-center justify-center mb-3 border border-sage/20 shadow-inner">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </span>
          <h4 className="font-heading text-sm font-bold text-navy uppercase tracking-wider">Injection Completed Today</h4>
          <p className="font-body text-xs text-navy-70 mt-1 font-semibold">
            Dose has been successfully logged.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          <button
            onClick={handleConfirmDose}
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-heading text-sm font-bold text-white transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2 btn-spring min-h-[48px] active:scale-[0.98]
              ${!submitting
                ? 'bg-navy hover:bg-navy-70' 
                : 'bg-navy/40 cursor-not-allowed shadow-none'
              }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Logging injection...</span>
              </>
            ) : (
              <span>Confirm Injection Completed</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
