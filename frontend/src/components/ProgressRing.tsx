import React, { useEffect, useState } from 'react';

interface ProgressRingProps {
  currentDay: number;
  totalDays: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ currentDay, totalDays }) => {
  const radius = 90;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // Approx 565.48
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    // Calculate progress fraction
    const progress = Math.min(Math.max(currentDay / totalDays, 0), 1);
    const progressOffset = circumference - progress * circumference;
    // Set a tiny timeout to trigger the smooth slide transition on mount
    const timer = setTimeout(() => {
      setOffset(progressOffset);
    }, 150);
    return () => clearTimeout(timer);
  }, [currentDay, totalDays, circumference]);

  return (
    <div className="relative w-[220px] height-[220px] flex items-center justify-center">
      <svg className="w-[220px] h-[220px] -rotate-90 drop-shadow-[0_8px_24px_rgba(158,140,239,0.25)]">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9E8CEF" />
            <stop offset="100%" stopColor="#F4A0A0" />
          </linearGradient>
        </defs>
        {/* Track circle */}
        <circle
          className="fill-none stroke-white"
          strokeWidth={strokeWidth}
          cx="110"
          cy="110"
          r={radius}
        />
        {/* Progress circle */}
        <circle
          className="fill-none stroke-[url(#ringGrad)] transition-all duration-[1.8s] ease-[cubic-bezier(0.2,1,0.3,1)]"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          cx="110"
          cy="110"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Centered Content */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="font-heading text-[44px] font-bold leading-none tracking-tight text-navy">
          Day {currentDay}
        </span>
        <span className="font-data text-[12px] font-bold tracking-widest text-lavender-dark uppercase mt-2">
          of {totalDays} days
        </span>
      </div>
    </div>
  );
};
