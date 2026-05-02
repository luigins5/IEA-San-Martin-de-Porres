
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  const hasPaddingOverride = className.includes('p-0') || className.includes('p-1') || className.includes('p-2') || className.includes('p-3') || className.includes('p-4') || className.includes('p-5') || className.includes('p-6');
  const defaultPadding = hasPaddingOverride ? '' : 'p-6';

  return (
    <div className={`bg-white rounded-xl shadow-card border border-slate-100/50 ${defaultPadding} ${className} dark:bg-slate-900 dark:border-slate-800 dark:shadow-none transition-all duration-200`}>
      {children}
    </div>
  );
};

export default Card;