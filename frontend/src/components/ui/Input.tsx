import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  id,
  className = '',
  ...props
}) => {
  const baseInputStyle = "w-full px-4 py-3 rounded-xl border border-navy-10 font-data text-sm text-navy placeholder-navy-10/60 focus:outline-none focus:border-lavender focus:ring-2 focus:ring-lavender/50 bg-[#F8F5F1]/30 transition-all duration-200";
  const checkboxStyle = "w-4.5 h-4.5 text-lavender border-navy-10 rounded focus:ring-lavender cursor-pointer";

  const isCheckbox = props.type === 'checkbox';

  if (isCheckbox) {
    return (
      <div className="flex gap-2.5 items-start">
        <input
          id={id}
          className={`${checkboxStyle} ${className}`}
          {...props}
        />
        {label && (
          <label htmlFor={id} className="font-body text-xs text-navy-55 leading-relaxed cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="w-full text-left space-y-1.5">
      {label && (
        <label htmlFor={id} className="block font-heading text-[10px] font-bold text-navy-55 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`${baseInputStyle} ${className}`}
        {...props}
      />
      {helperText && (
        <p className="font-body text-[11px] text-navy-55 mt-1">{helperText}</p>
      )}
    </div>
  );
};
