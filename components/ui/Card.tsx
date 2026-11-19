import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, subtitle, action, children, className = '' }) => {
  return (
    <section
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

export default Card;
