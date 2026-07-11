import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check, Play, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

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
          className="px-4 py-2 bg-lavender-dark text-white rounded-lg font-data text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isTaken = selectedMedication.status === 'Taken';

  // Map medication name to image asset path on backend
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
    <div className="flex-1 flex flex-col pt-4 px-5 pb-24 overflow-y-auto no-scrollbar">
      {/* Top Navigation Bar */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => changeTab('dashboard')}
          aria-label="Back to Home Dashboard"
          className="w-10 h-10 rounded-full bg-white border border-navy-10 flex items-center justify-center text-navy cursor-pointer hover:bg-navy-10/40 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <div>
          <h3 className="font-heading text-base font-bold text-navy leading-tight">
            Step-by-step Guide: {selectedMedication.name}
          </h3>
        </div>
      </div>

      {/* 1. Device Graphic Header */}
      <div className="w-full h-44 rounded-xl overflow-hidden mb-6 border border-navy-10/50 bg-white flex items-center justify-center relative shadow-sm">
        <img 
          src={getMedicationImage(selectedMedication.name)} 
          alt={`${selectedMedication.name} device`} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = `${API_BASE_URL}/static/injection_guide.png`;
          }}
        />
        {/* Dosage Overlay Badge */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold font-data text-navy shadow-sm border border-navy-10/40">
          Dosage: {selectedMedication.dosage}
        </div>
      </div>

      {/* 2. Video Demonstration Block */}
      <div className="mb-6">
        <div className="w-full h-40 rounded-xl bg-navy/90 relative overflow-hidden flex items-center justify-center shadow-inner">
          <img 
            src={`${API_BASE_URL}/static/video_poster.jpg`} 
            alt="Video Demonstration Guide Preview" 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          {/* Visual Play Icon Button Overlay */}
          <button 
            type="button"
            aria-label="Play demonstration video guide"
            className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-md hover:bg-white/40 flex items-center justify-center text-white cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg z-10 border border-white/20"
          >
            <Play className="w-6 h-6 stroke-[2.5] fill-current translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* 3. Preparation Guidelines List */}
      <div className="bg-white border border-navy-10 rounded-2xl p-5 mb-6 shadow-sm">
        <h4 className="font-heading text-sm font-bold text-navy mb-4 text-left">Preparation guidelines</h4>
        
        <div className="flex flex-col gap-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3.5">
            <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none" aria-hidden="true">
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </div>
            <p className="font-body text-xs text-navy-55 text-left leading-relaxed">
              1. Wash your hands thoroughly with soap and water.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3.5">
            <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none" aria-hidden="true">
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </div>
            <p className="font-body text-xs text-navy-55 text-left leading-relaxed">
              2. Clean the injection site with an alcohol swab and let it air dry.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3.5">
            <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none" aria-hidden="true">
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </div>
            <p className="font-body text-xs text-navy-55 text-left leading-relaxed">
              3. Prepare the injection device and select your prescribed dose.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-due-soft border border-due/30 rounded-lg text-due font-body text-xs font-semibold text-left flex items-start gap-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Bottom Action Panel */}
      {isTaken ? (
        <div className="bg-sage-soft/10 border-sage-soft border rounded-2xl p-5 text-center shadow-sm">
          <span className="inline-flex w-10 h-10 rounded-full bg-sage-soft text-sage items-center justify-center mb-3">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </span>
          <h4 className="font-heading text-sm font-bold text-navy">Injection Completed Today</h4>
          <p className="font-body text-xs text-navy-55 mt-1">
            Dose has been successfully logged.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          <button
            onClick={handleConfirmDose}
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-heading text-sm font-bold text-white transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2
              ${!submitting
                ? 'bg-navy hover:bg-navy-80 hover:-translate-y-0.5 hover:shadow-lg' 
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
