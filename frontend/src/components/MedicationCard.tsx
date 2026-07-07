import React from 'react';
import type { MedicationStatus } from '../types';
import { useApp } from '../context/AppContext';
import { Calendar, ChevronRight } from 'lucide-react';
import { Badge } from './ui/Badge';

interface MedicationCardProps {
  medication: MedicationStatus;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({ medication }) => {
  const { changeTab } = useApp();

  // Helper to format "20:00:00" to "8:00 PM"
  const formatTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const isTaken = medication.status === 'Taken';

  return (
    <button
      type="button"
      onClick={() => changeTab('medication-guide', medication)}
      aria-label={`View step-by-step injection guide for ${medication.name}, dosage ${medication.dosage}, currently ${medication.status}`}
      className={`w-full text-left glass-panel rounded-xl p-[18px] cursor-pointer flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-lavender ${
        isTaken ? 'opacity-85 border-sage-soft bg-gradient-to-b from-white to-sage/5' : ''
      }`}
    >
      <div className="flex items-center gap-4 text-left w-full">
        {/* Medication visual representation (fallback or generic placeholder colored circle) */}
        <div className="w-[56px] h-[56px] rounded-lg bg-navy-10 flex items-center justify-center overflow-hidden flex-none">
          <span className="text-xl font-heading font-bold text-lavender-dark">
            {medication.name.charAt(0)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-heading text-base font-bold text-navy leading-tight truncate">
            {medication.name}
          </h4>
          <p className="font-data text-[13px] font-medium text-navy-55 mt-1 flex items-center gap-1.5">
            <span className="bg-lavender-soft text-lavender-dark px-1.5 py-0.5 rounded text-[11px] font-bold">
              {medication.dosage}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 stroke-[1.8]" />
              {formatTime(medication.scheduled_time)}
            </span>
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex-none flex items-center gap-2">
          <Badge status={medication.syncPending ? 'Sync Pending' : medication.status} />
          <ChevronRight className="w-5 h-5 text-navy-55" />
        </div>
      </div>
    </button>
  );
};
