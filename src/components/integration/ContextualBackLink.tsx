import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ContextualBackLinkProps {
  to: string;
  label: string;
  className?: string;
}

export const ContextualBackLink: React.FC<ContextualBackLinkProps> = ({
  to,
  label,
  className = ''
}) => {
  return (
    <Link
      to={to}
      dir="rtl"
      className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors p-1.5 -mr-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] ${className}`}
    >
      <ArrowRight className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
};

export default ContextualBackLink;
