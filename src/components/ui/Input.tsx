import React from 'react';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-[#344054]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-[#98A2B3] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-[44px] bg-white border rounded-[10px] text-sm text-[#101828] placeholder-[#98A2B3] transition-all focus:outline-hidden ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightElement ? 'pr-12' : 'pr-3.5'} ${
              error
                ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
                : 'border-[#D0D5DD] hover:border-[#98A2B3] focus:border-[#078A55] focus:ring-2 focus:ring-[#078A55]/20'
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3.5 flex items-center">{rightElement}</div>
          )}
        </div>
        {error ? (
          <p className="text-xs font-medium text-[#DC2626]">{error}</p>
        ) : helperText ? (
          <p className="text-[13px] text-[#98A2B3]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-[#344054]">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={`w-full min-h-[100px] p-3.5 bg-white border rounded-[10px] text-sm text-[#101828] placeholder-[#98A2B3] transition-all focus:outline-hidden ${
            error
              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
              : 'border-[#D0D5DD] hover:border-[#98A2B3] focus:border-[#078A55] focus:ring-2 focus:ring-[#078A55]/20'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs font-medium text-[#DC2626]">{error}</p>
        ) : helperText ? (
          <p className="text-[13px] text-[#98A2B3]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, placeholder = 'Search...', className = '', ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        <div className="absolute left-3.5 text-[#98A2B3] pointer-events-none flex items-center">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-[44px] bg-white border border-[#D0D5DD] hover:border-[#98A2B3] rounded-[10px] pl-10 pr-9 text-sm text-[#101828] placeholder-[#98A2B3] transition-all focus:outline-hidden focus:border-[#078A55] focus:ring-2 focus:ring-[#078A55]/20 ${className}`}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 text-[#98A2B3] hover:text-[#101828] p-1 rounded-md transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';
