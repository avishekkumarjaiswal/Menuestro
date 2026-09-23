import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  badge,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 ${className}`}>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] sm:text-[32px] font-bold text-[#101828] tracking-tight leading-[1.2]">
            {title}
          </h1>
          {badge}
        </div>
        <p className="text-sm text-[#667085] mt-1 font-normal leading-relaxed">
          {description}
        </p>
      </div>
      {action && (
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          {action}
        </div>
      )}
    </div>
  );
};
