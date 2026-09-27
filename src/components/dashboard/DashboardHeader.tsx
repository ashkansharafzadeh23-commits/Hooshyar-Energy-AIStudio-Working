import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, Sun, ExternalLink } from 'lucide-react';
import { UserProfile, UserOrganization } from '../../context/AuthContext';
import { formatRoleLabel } from '../../utils/formatters';

interface DashboardHeaderProps {
  user: UserProfile | null;
  activeRole: string;
  activeOrganization: UserOrganization | null;
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  activeRole,
  activeOrganization,
  className = ''
}) => {
  const displayName = user?.name?.trim() || 'کاربر گرامی';
  const roleLabel = formatRoleLabel(activeRole);

  // Determine role-based quick action link
  const getRoleQuickAction = () => {
    const role = (activeRole || '').toUpperCase();
    switch (role) {
      case 'PROJECT_OWNER':
      case 'CUSTOMER':
      case 'OWNER':
        return {
          label: 'تحلیل و ایجاد پروژه جدید',
          to: '/target-select',
          icon: Plus,
          primary: true
        };
      case 'INVESTOR':
        return {
          label: 'فرصت‌های سرمایه‌گذاری',
          to: '/investment-hub/opportunities',
          icon: ArrowLeft,
          primary: true
        };
      case 'EPC':
      case 'EPC_CONTRACTOR':
        return {
          label: 'مشاهده استعلام‌های قیمت (RFQ)',
          to: '/contractors',
          icon: ArrowLeft,
          primary: true
        };
      case 'VENDOR':
      case 'SUPPLIER':
        return {
          label: 'ورود به پرتال تأمین‌کنندگان',
          to: '/vendor-portal',
          icon: ExternalLink,
          primary: true
        };
      case 'TECHNICIAN':
        return {
          label: 'سامانه پایش و نگهداری',
          to: '/smart-maintenance',
          icon: Sun,
          primary: true
        };
      case 'FINANCE':
      case 'FINANCIAL_PARTNER':
        return {
          label: 'پورتفوی مالی و سرمایه‌گذاری',
          to: '/enterprise/portfolio',
          icon: ArrowLeft,
          primary: true
        };
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return {
          label: 'مدیریت کلان پلتفرم',
          to: '/enterprise/portfolio',
          icon: ArrowLeft,
          primary: false
        };
      default:
        return {
          label: 'محاسبه پتانسیل خورشیدی',
          to: '/target-select',
          icon: Plus,
          primary: true
        };
    }
  };

  const quickAction = getRoleQuickAction();
  const ActionIcon = quickAction.icon;

  return (
    <header className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 ${className}`}>
      {/* Greeting & Context */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            سلام، {displayName}
          </h1>

          {/* Subtly show active role */}
          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {roleLabel}
          </span>

          {/* Subtly show organization ONLY if it comes from verified auth data */}
          {activeOrganization?.name && (
            <span className="inline-flex items-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1.5" />
              سازمان: {activeOrganization.name}
            </span>
          )}
        </div>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
          امروز چه چیزی نیاز به توجه شما دارد؟
        </p>
      </div>

      {/* Role-Aware Primary Quick Action */}
      <div className="flex items-center gap-2 pt-1 md:pt-0">
        <Link
          to={quickAction.to}
          className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-xs min-h-[44px] ${
            quickAction.primary
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 dark:bg-amber-400 dark:hover:bg-amber-500'
              : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900'
          }`}
        >
          <ActionIcon size={18} strokeWidth={2} />
          <span>{quickAction.label}</span>
        </Link>
      </div>
    </header>
  );
};
