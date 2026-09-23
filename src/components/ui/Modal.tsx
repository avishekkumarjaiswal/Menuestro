import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-[440px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[640px]',
    xl: 'max-w-[760px]',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/55 backdrop-blur-[4px] flex items-center justify-center p-3.5 sm:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full ${widthClasses[maxWidth]} bg-white rounded-[18px] sm:rounded-[20px] shadow-[0_24px_48px_rgba(16,24,40,0.18)] border border-[#E4E7EC] overflow-hidden flex flex-col max-h-[90dvh] max-h-[90vh] animate-in zoom-in-95 duration-150`}
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#E4E7EC] flex items-center justify-between shrink-0 bg-white z-10">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-base sm:text-lg font-bold text-[#101828] tracking-tight truncate">{title}</h2>
            {description && (
              <p className="text-xs sm:text-sm text-[#667085] mt-0.5 font-normal truncate">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-[8px] text-[#98A2B3] hover:text-[#101828] hover:bg-[#F7F9FC] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-[#101828] text-sm overscroll-contain">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-white border-t border-[#EEF1F5] flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
