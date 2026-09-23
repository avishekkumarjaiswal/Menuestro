import React from 'react';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'large' | 'compact';
}

export const Card: React.FC<CardProps> = ({
  children,
  size = 'default',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    compact: 'p-4 sm:p-5 rounded-[12px]',
    default: 'p-6 rounded-[16px]',
    large: 'p-6 sm:p-8 rounded-[16px]',
  };

  return (
    <div
      className={`bg-white border border-[#E4E7EC] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`flex items-center justify-between gap-3 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base font-semibold text-[#101828] tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-sm text-[#667085] font-normal ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mt-6 pt-4 border-t border-[#EEF1F5] flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  trend?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  iconBgColor = 'bg-[#EAF8F1]',
  iconColor = 'text-[#078A55]',
  trend,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#E4E7EC] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-[#D0D5DD] hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)] group' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#667085]">{label}</span>
        <div
          className={`w-10 h-10 rounded-[10px] ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0 transition-transform ${
            onClick ? 'group-hover:scale-105' : ''
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[40px] font-bold text-[#101828] leading-none tracking-[-0.03em]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-[#078A55]">
            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
};
