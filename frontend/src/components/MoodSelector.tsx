import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Heart } from 'lucide-react';

const moods = [
  { name: 'Awful', emoji: '😞', color: 'hover:border-red-300' },
  { name: 'Bad', emoji: '🙁', color: 'hover:border-orange-300' },
  { name: 'Meh', emoji: '😐', color: 'hover:border-yellow-300' },
  { name: 'Good', emoji: '🙂', color: 'hover:border-green-300' },
  { name: 'Amazing', emoji: '😊', color: 'hover:border-lavender' },
];

export const MoodSelector: React.FC = () => {
  const { todaysMood, moodReassurance, submitMood, user } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const handleMoodSelect = async (moodName: string) => {
    if (submitting) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      await submitMood(moodName);
    } catch (err: any) {
      setLocalError('Failed to log mood. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-xl p-6 shadow-[0_12px_32px_rgba(19,35,60,0.04)] mb-8 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(19,35,60,0.07)]">
      <div className="flex items-center gap-4 text-left">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-lavender-soft to-blush-soft flex items-center justify-center text-lavender-dark">
          <Heart className="w-6 h-6 stroke-2 fill-none" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-navy leading-tight">CalmSeed</h3>
          <p className="font-body text-[13px] font-medium text-navy-55">How are you feeling today, {user?.name || 'there'}?</p>
        </div>
      </div>

      <div className="flex gap-2.5 mt-6">
        {moods.map((m) => {
          const isActive = todaysMood === m.name;
          return (
            <button
              key={m.name}
              onClick={() => handleMoodSelect(m.name)}
              disabled={submitting}
              className={`flex-1 flex flex-col items-center py-3 rounded-lg border transition-all duration-300 transform cursor-pointer
                ${isActive 
                  ? 'bg-lavender-dark text-white border-lavender-dark -translate-y-1 shadow-[0_8px_20px_rgba(111,90,209,0.3)]' 
                  : 'bg-white text-navy-70 border-navy-10 hover:bg-white hover:-translate-y-1 hover:border-lavender/40 hover:shadow-sm'
                }`}
            >
              <span className="text-xl mb-1">{m.emoji}</span>
              <span className="font-data text-[11px] font-semibold">{m.name}</span>
            </button>
          );
        })}
      </div>

      {localError && (
        <p className="text-[12px] font-semibold text-due mt-3 text-left">{localError}</p>
      )}

      {/* Reassurance Message Panel */}
      {todaysMood && moodReassurance && (
        <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-lavender font-body text-sm font-medium text-navy leading-relaxed text-left animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          {moodReassurance}
        </div>
      )}
    </div>
  );
};
