import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
  active?: boolean;
}

interface AppContextBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const AppContextBreadcrumb: React.FC<AppContextBreadcrumbProps> = ({
  items,
  className = ''
}) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="مسیر راهنما (Breadcrumb)"
      dir="rtl"
      className={`flex items-center flex-wrap gap-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 ${className}`}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const displayLabel = item.label?.trim() || 'بدون عنوان';

        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <ChevronLeft
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0 select-none"
                aria-hidden="true"
              />
            )}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors py-1 px-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 line-clamp-1 max-w-[160px] sm:max-w-[220px]"
                title={displayLabel}
              >
                {displayLabel}
              </Link>
            ) : (
              <span
                className={`line-clamp-1 max-w-[180px] sm:max-w-[280px] px-1 py-0.5 ${
                  isLast || item.active
                    ? 'font-bold text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title={displayLabel}
                aria-current={isLast ? 'page' : undefined}
              >
                {displayLabel}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default AppContextBreadcrumb;
