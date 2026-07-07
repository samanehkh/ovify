import React from 'react';

type BadgeStatus = 'Due' | 'Taken' | 'Missed' | 'Red Alert' | 'Yellow Attention' | 'On Track' | 'Recovery Active' | 'Sync Pending';

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const baseStyle = "px-3 py-1.5 rounded-full font-data text-[11px] font-bold inline-flex items-center gap-1.5 uppercase tracking-wider select-none";

  const styles: Record<BadgeStatus, string> = {
    'Taken': "bg-sage-soft text-sage",
    'Due': "bg-due-soft text-due",
    'Missed': "bg-due-soft text-due border border-due/20",
    'Red Alert': "bg-due-soft text-due border border-due/30 animate-pulse",
    'Yellow Attention': "bg-[#F8F5F1] text-lavender-dark border border-lavender/30",
    'On Track': "bg-sage-soft text-sage border border-sage/20",
    'Recovery Active': "bg-[#F8F5F1] text-navy-55 border border-navy-10",
    'Sync Pending': "bg-[#FEF3C7] text-[#D97706] border border-[#F59E0B]/30 animate-pulse"
  };

  const indicatorColors: Record<BadgeStatus, string> = {
    'Taken': "bg-sage",
    'Due': "bg-due",
    'Missed': "bg-due",
    'Red Alert': "bg-due",
    'Yellow Attention': "bg-lavender",
    'On Track': "bg-sage",
    'Recovery Active': "bg-navy-55",
    'Sync Pending': "bg-[#D97706]"
  };

  return (
    <span className={`${baseStyle} ${styles[status]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${indicatorColors[status]} ${status === 'Red Alert' ? 'animate-ping' : ''}`} aria-hidden="true" />
      {status}
    </span>
  );
};
