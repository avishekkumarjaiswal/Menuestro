import React from 'react';
import { TrendingUp } from 'lucide-react';

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
    compact: 'p-4 rounded-lg',
    default: 'p-5 sm:p-6 rounded-xl',
    large: 'p-6 sm:p-8 rounded-xl',
  };

  return (
    <div
      className={`bg-white border border-slate-200 shadow-xs transition-all ${sizeClasses[size]} ${className}`}
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
  <h3 className={`text-sm font-semibold text-slate-900 tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-slate-500 font-normal ${className}`} {...props}>
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
  <div className={`mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between ${className}`} {...props}>
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
  iconBgColor = 'bg-emerald-50',
  iconColor = 'text-[#078A55]',
  trend,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/50' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div
          className={`w-8 h-8 rounded-lg ${iconBgColor} ${iconColor} flex items-center justify-center shrink-0`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-1 text-xs font-medium text-[#078A55]">
            <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
};
