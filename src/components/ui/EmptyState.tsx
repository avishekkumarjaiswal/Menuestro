import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`p-6 sm:p-8 text-center flex flex-col items-center justify-center max-w-sm mx-auto my-4 ${className}`}
    >
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>{actionText}</Button>
        </div>
      )}
    </div>
  );
};
