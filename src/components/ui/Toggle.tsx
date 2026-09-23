import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'default';
  id?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'default',
  id,
}) => {
  const toggleId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const isSmall = size === 'sm';
  const trackWidth = isSmall ? 'w-9 h-5' : 'w-11 h-6';
  const thumbSize = isSmall ? 'w-4 h-4' : 'w-5 h-5';
  const thumbTranslate = isSmall ? (checked ? 'translate-x-4' : 'translate-x-0.5') : (checked ? 'translate-x-5' : 'translate-x-0.5');

  return (
    <label
      htmlFor={toggleId}
      className={`inline-flex items-center gap-2.5 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex ${trackWidth} items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#078A55] focus-visible:ring-offset-2 ${
          checked ? 'bg-[#078A55]' : 'bg-[#D0D5DD]'
        }`}
      >
        <span
          className={`inline-block ${thumbSize} transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${thumbTranslate}`}
        />
      </button>
      {label && <span className="text-sm font-semibold text-[#344054]">{label}</span>}
    </label>
  );
};
