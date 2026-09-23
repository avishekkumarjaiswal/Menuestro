import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'default';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-[#EAF8F1] text-[#078A55] border-[#D1EEDC]',
    secondary: 'bg-[#EEF1F5] text-[#344054] border-[#E4E7EC]',
    success: 'bg-[#EAF8F1] text-[#078A55] border-[#D1EEDC]',
    warning: 'bg-[#FFF7DB] text-[#D97706] border-[#FDE68A]',
    danger: 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]',
    neutral: 'bg-[#F7F9FC] text-[#667085] border-[#E4E7EC]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full font-semibold',
    default: 'text-xs px-2.5 py-1 rounded-full font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 border border-solid ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-[#E4E7EC] whitespace-nowrap flex-nowrap select-none ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => {
              onChange(tab.id);
              (e.currentTarget as HTMLElement).scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
              });
            }}
            className={`inline-flex items-center gap-2 py-2.5 px-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 -mb-[1px] ${
              isActive
                ? 'border-[#078A55] text-[#078A55]'
                : 'border-transparent text-[#667085] hover:text-[#101828] hover:border-[#D0D5DD]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                  isActive
                    ? 'bg-[#EAF8F1] text-[#078A55]'
                    : 'bg-[#EEF1F5] text-[#667085]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
