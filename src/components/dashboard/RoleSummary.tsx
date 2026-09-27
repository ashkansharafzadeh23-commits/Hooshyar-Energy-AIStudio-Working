import React from 'react';
import { BarChart3, TrendingUp, ShieldCheck, Zap, Layers, FileSpreadsheet, Briefcase, Wrench } from 'lucide-react';
import { DashboardMetric } from './types';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { formatRoleLabel } from '../../utils/formatters';

interface RoleSummaryProps {
  activeRole: string;
  metrics: DashboardMetric[];
  className?: string;
}

export const RoleSummary: React.FC<RoleSummaryProps> = ({
  activeRole,
  metrics,
  className = ''
}) => {
  // STRICT RULE: Maximum 4 metrics, and only render metrics with valid known values
  const validMetrics = metrics.filter(m => m.value !== undefined && m.value !== null && m.value !== '').slice(0, 4);

  if (validMetrics.length === 0) {
    return null;
  }

  const getSectionTitle = () => {
    const role = (activeRole || '').toUpperCase();
    switch (role) {
      case 'PROJECT_OWNER':
      case 'CUSTOMER':
      case 'OWNER':
        return 'وضعیت و شاخص‌های پروژه‌های من';
      case 'INVESTOR':
        return 'خلاصه شاخص‌های سرمایه‌گذاری';
      case 'EPC':
      case 'EPC_CONTRACTOR':
        return 'استعلام‌ها و ظرفیت‌های اجرایی';
      case 'VENDOR':
        return 'درخواست‌ها و وضعیت تأمین تجهیزات';
      case 'TECHNICIAN':
        return 'ماموریت‌ها و تجهیزات تحت نگهداری';
      case 'FINANCE':
      case 'FINANCIAL_PARTNER':
        return 'پرونده‌ها و تسهیلات تأمین مالی';
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'خلاصه وضعیت پلتفرم و سازمان‌ها';
      default:
        return 'خلاصه وضعیت و شاخص‌ها';
    }
  };

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby="role-summary-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <BarChart3 size={18} strokeWidth={2.2} />
          </div>
          <h2 id="role-summary-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            {getSectionTitle()}
          </h2>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          شاخص‌های مستند شده ({formatRoleLabel(activeRole)})
        </span>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(validMetrics.length, 4)} gap-3`}>
        {validMetrics.map((metric) => {
          const MetricIcon = metric.icon || Zap;
          return (
            <div
              key={metric.id}
              className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {metric.label}
                </span>
                <DataTruthBadge type={metric.provenance} size="sm" />
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {metric.value}
                </span>
                {metric.unit && (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {metric.unit}
                  </span>
                )}
              </div>

              {metric.subtext && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  {metric.subtext}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
