import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'due';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyle = "py-3 px-6 rounded-xl font-heading text-xs font-bold transition-all duration-300 focus:ring-2 focus:ring-lavender focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md flex items-center justify-center gap-2 cursor-pointer";
  
  const variants = {
    primary: "bg-navy hover:bg-navy-80 text-white",
    secondary: "bg-lavender-dark hover:bg-lavender text-white",
    outline: "border border-navy-10 hover:bg-bg-ivory text-navy",
    due: "bg-due hover:bg-[#A93C46] text-white focus:ring-due"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
