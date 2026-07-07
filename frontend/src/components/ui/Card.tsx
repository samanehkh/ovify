import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'white';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  className = '',
  ...props
}) => {
  const styles = {
    glass: "glass-panel rounded-3xl p-6 shadow-sm border border-[#E9E4DC] backdrop-blur-md bg-white/40",
    white: "p-6 rounded-3xl bg-white border border-[#E9E4DC] shadow-sm"
  };

  return (
    <div
      className={`${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
