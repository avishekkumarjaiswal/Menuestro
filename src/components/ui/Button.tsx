import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'default',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styling: 8px spacing, 10px radius, font-semibold
    const baseStyles =
      'inline-flex items-center justify-center font-semibold text-sm transition-all select-none cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#078A55] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap';

    const variants: Record<string, string> = {
      primary:
        'bg-[#078A55] hover:bg-[#067548] text-white shadow-xs border border-[#078A55]',
      secondary:
        'bg-white hover:bg-[#F7F9FC] text-[#344054] border border-[#E4E7EC] shadow-xs hover:border-[#D0D5DD]',
      ghost:
        'bg-transparent hover:bg-[#F7F9FC] text-[#475467] hover:text-[#101828]',
      danger:
        'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs border border-[#DC2626]',
      outline:
        'bg-transparent border border-[#078A55] text-[#078A55] hover:bg-[#EAF8F1]',
    };

    const sizes: Record<string, string> = {
      default: 'h-[44px] px-5 rounded-[10px] gap-2',
      sm: 'h-[36px] px-3.5 text-xs rounded-[10px] gap-1.5',
      lg: 'h-[48px] px-6 text-base rounded-[10px] gap-2.5',
      icon: 'w-[40px] h-[40px] p-0 rounded-[10px] flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            {size !== 'icon' && children && <span>{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
