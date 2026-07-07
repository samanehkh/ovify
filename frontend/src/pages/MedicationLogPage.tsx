import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Check, Play, Clock, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export const MedicationLogPage: React.FC = () => {
  const { selectedMedication, changeTab, submitDose, user, setToastMessage } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Offline logging states
  const [isOfflineLog, setIsOfflineLog] = useState(false);
  const [offlineTime, setOfflineTime] = useState('20:00'); // default scheduled time standard

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
      let actualTimeStr: string | undefined = undefined;
      if (isOfflineLog) {
        // Format offlineTime (HH:MM) to HH:MM:SS
        actualTimeStr = `${offlineTime}:00`;
      }
      await submitDose(selectedMedication.id, actualTimeStr);
      // Return to dashboard after successful logging
      changeTab('dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm dose. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4 px-5 pb-24 overflow-y-auto no-scrollbar">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => changeTab('dashboard')}
          className="w-10 h-10 rounded-full bg-white border border-navy-10 flex items-center justify-center text-navy cursor-pointer hover:bg-navy-10/40 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <div>
          <span className="font-data text-[11px] font-bold text-navy-55 tracking-wider uppercase">
            Step-by-step Guide
          </span>
          <h3 className="font-heading text-lg font-bold text-navy leading-tight">
            {selectedMedication.name} Injection
          </h3>
        </div>
      </div>

      {/* Medication image visual */}
      <div className="w-full h-44 rounded-xl overflow-hidden mb-6 border border-navy-10/50 bg-white flex items-center justify-center relative shadow-sm">
        <img 
          src={getMedicationImage(selectedMedication.name)} 
          alt={selectedMedication.name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.src = `${API_BASE_URL}/static/injection_guide.png`;
          }}
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-md text-[12px] font-bold font-data text-lavender-dark shadow-sm border border-white/20">
          Dosage: {selectedMedication.dosage}
        </div>
      </div>

      {/* Video Guide Tutorial Container */}
      {user?.injection_comfort === 'Experienced' ? (
        <details className="glass-panel rounded-xl p-4 mb-6 text-left group">
          <summary className="font-heading text-sm font-bold text-navy cursor-pointer list-none flex justify-between items-center select-none focus:outline-none focus:ring-2 focus:ring-lavender rounded">
            <span>Video Tutorial</span>
            <span className="text-xs text-lavender-dark font-bold font-data group-open:hidden">Show Video (1:45)</span>
            <span className="text-xs text-navy-55 font-bold font-data hidden group-open:inline">Hide Video</span>
          </summary>
          <div className="w-full h-40 rounded-lg bg-navy/90 relative overflow-hidden flex items-center justify-center mt-3 shadow-inner">
            <img 
              src={`${API_BASE_URL}/static/video_poster.jpg`} 
              alt="Video Poster" 
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            <button 
              type="button"
              onClick={() => {
                setToastMessage("Video playback is a placeholder.");
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="w-14 h-14 rounded-full bg-lavender/90 hover:bg-lavender flex items-center justify-center text-white cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg z-10 focus:ring-2 focus:ring-lavender"
            >
              <Play className="w-6 h-6 stroke-[2.5] fill-current translate-x-0.5" />
            </button>
            <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold font-data text-white">
              1:45 mins
            </span>
          </div>
        </details>
      ) : (
        <div className="glass-panel rounded-xl p-5 mb-6">
          <h4 className="font-heading text-sm font-bold text-navy mb-3 text-left">Video Tutorial</h4>
          <div className="w-full h-40 rounded-lg bg-navy/90 relative overflow-hidden flex items-center justify-center group shadow-inner">
            <img 
              src={`${API_BASE_URL}/static/video_poster.jpg`} 
              alt="Video Poster" 
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            <button 
              type="button"
              onClick={() => {
                setToastMessage("Video playback is a placeholder.");
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="w-14 h-14 rounded-full bg-lavender/90 hover:bg-lavender flex items-center justify-center text-white cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg z-10 focus:ring-2 focus:ring-lavender"
            >
              <Play className="w-6 h-6 stroke-[2.5] fill-current translate-x-0.5" />
            </button>
            <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold font-data text-white">
              1:45 mins
            </span>
          </div>
        </div>
      )}

      {/* Preparation Checklist (Personalized) */}
      {user?.injection_comfort === 'Experienced' ? (
        <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-xl p-5 mb-6 shadow-sm text-left">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-heading text-sm font-bold text-navy">Preparation Guidelines</h4>
            <span className="bg-lavender-soft text-lavender-dark px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Experienced Mode
            </span>
          </div>
          <p className="font-body text-xs text-navy-55 mb-4 leading-relaxed">
            Detailed walkthrough steps are collapsed for your comfort. Please confirm basic hygiene checklist:
          </p>
          
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2.5 font-body text-xs text-navy cursor-pointer select-none">
              <input type="checkbox" defaultChecked className="w-4.5 h-4.5 text-lavender border-navy-10 rounded focus:ring-lavender" />
              Wash hands thoroughly and prepare clean workspace
            </label>
            <label className="flex items-center gap-2.5 font-body text-xs text-navy cursor-pointer select-none">
              <input type="checkbox" defaultChecked className="w-4.5 h-4.5 text-lavender border-navy-10 rounded focus:ring-lavender" />
              Sanitize abdominal site and prep injection device ({selectedMedication.dosage})
            </label>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-xl p-5 mb-6 shadow-sm">
          <h4 className="font-heading text-sm font-bold text-navy mb-4 text-left">Preparation Guidelines</h4>
          
          <div className="flex flex-col gap-3.5">
            {/* Step 1 */}
            <div className="flex items-start gap-3.5 p-3 rounded-lg border bg-white border-navy-10/40 select-none">
              <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none">
                <Check className="w-3.5 h-3.5 stroke-[3.5]" />
              </div>
              <div className="text-left">
                <p className="font-heading text-sm font-bold text-navy">1. Wash hands thoroughly</p>
                <p className="font-body text-xs text-navy-55 mt-0.5">Use soap and warm water for at least 20 seconds.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3.5 p-3 rounded-lg border bg-white border-navy-10/40 select-none">
              <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none">
                <Check className="w-3.5 h-3.5 stroke-[3.5]" />
              </div>
              <div className="text-left">
                <p className="font-heading text-sm font-bold text-navy">2. Clean injection site</p>
                <p className="font-body text-xs text-navy-55 mt-0.5">Wipe the abdomen area with an alcohol swab and let dry.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3.5 p-3 rounded-lg border bg-white border-navy-10/40 select-none">
              <div className="w-5 h-5 rounded-full bg-sage-soft text-sage flex items-center justify-center mt-0.5 flex-none">
                <Check className="w-3.5 h-3.5 stroke-[3.5]" />
              </div>
              <div className="text-left">
                <p className="font-heading text-sm font-bold text-navy">3. Prepare the injection device</p>
                <p className="font-body text-xs text-navy-55 mt-0.5">
                  {selectedMedication.name.toLowerCase().includes('gonal') 
                    ? 'Attach new needle and dial dosage to 150 IU.'
                    : 'Mix the powder vial with solvent as instructed.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-due-soft border border-due/30 rounded-lg text-due font-body text-xs font-semibold text-left flex items-start gap-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Logging flow controls */}
      {isTaken ? (
        <div className="glass-panel bg-sage-soft/10 border-sage-soft rounded-xl p-5 text-center shadow-sm">
          <span className="inline-flex w-10 h-10 rounded-full bg-sage-soft text-sage items-center justify-center mb-3">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </span>
          <h4 className="font-heading text-sm font-bold text-navy">Injection Completed Today</h4>
          <p className="font-body text-xs text-navy-55 mt-1">
            Logged {selectedMedication.log_status === 'On Time' ? 'on-time' : 'late'} at{' '}
            {selectedMedication.logged_at ? new Date(selectedMedication.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Offline logging toggle input */}
          {isOfflineLog && (
            <div className="p-4 bg-navy-10/40 rounded-xl border border-navy-10/60 flex items-center justify-between text-left animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-navy-70">
                <Clock className="w-4 h-4" />
                <span className="font-data text-xs font-bold">Report Actual Injection Time:</span>
              </div>
              <input 
                type="time" 
                value={offlineTime}
                onChange={(e) => setOfflineTime(e.target.value)}
                className="bg-white border border-navy-10 rounded px-2 py-1 text-sm font-data font-bold text-navy outline-none focus:border-lavender"
              />
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirmDose}
            disabled={submitting}
            className={`w-full py-4 rounded-xl font-heading text-sm font-bold text-white transition-all duration-300 shadow-md cursor-pointer
              ${!submitting
                ? 'bg-lavender-dark hover:bg-lavender hover:-translate-y-0.5 hover:shadow-lg' 
                : 'bg-navy-55/40 cursor-not-allowed shadow-none'
              }`}
          >
            {submitting ? 'Submitting Dose Log...' : 'Confirm Injection Completed'}
          </button>

          {/* Offline Logging Toggle Link */}
          <button
            onClick={() => setIsOfflineLog(!isOfflineLog)}
            className="self-center font-data text-xs font-bold text-lavender-dark hover:text-navy hover:underline cursor-pointer transition-colors focus:ring-2 focus:ring-lavender focus:outline-none"
          >
            {isOfflineLog ? 'Cancel Offline Logging' : 'Log offline (saves locally if network is offline)'}
          </button>
        </div>
      )}
    </div>
  );
};
