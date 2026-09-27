import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Filter, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertOctagon,
  Sparkles 
} from 'lucide-react';
import { AssetAlert, AlertSeverity, AlertStatus, MaintenanceDiagnosis } from '../../types/maintenance';
import { AlertCard } from './AlertCard';
import { AlertDetails } from './AlertDetails';
import { AlertEmptyState } from './AlertEmptyState';
import { AnomalyCard } from './AnomalyCard';
import { toPersianDigits } from '../../utils/formatters';

export type AlertFilterCategory = 'ALL' | 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED';

export interface AlertCenterProps {
  alerts: AssetAlert[];
  diagnoses?: Record<string, MaintenanceDiagnosis>;
  componentMap?: Record<string, string>;
  loading?: boolean;
  onRefresh?: () => void;
  onInvestigate?: (alertId: string, note?: string) => Promise<void>;
  onFlagMaintenance?: (alertId: string) => Promise<void>;
  onResolve?: (alertId: string, resolutionNote: string) => Promise<void>;
  onDismiss?: (alertId: string, reason: string) => Promise<void>;
  onDiagnose?: (alert: AssetAlert) => void;
  onCreateCase?: (alert: AssetAlert) => void;
  onViewCase?: (caseId: string) => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  alerts,
  diagnoses = {},
  componentMap = {},
  loading = false,
  onRefresh,
  onInvestigate,
  onFlagMaintenance,
  onResolve,
  onDismiss,
  onDiagnose,
  onCreateCase,
  onViewCase,
}) => {
  const [filterCategory, setFilterCategory] = useState<AlertFilterCategory>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'CARDS' | 'ANOMALIES'>('CARDS');

  // Filter alerts strictly according to backend states
  const filteredAlerts = alerts.filter((alert) => {
    // 1. Severity filter
    if (severityFilter !== 'ALL' && alert.severity !== severityFilter) {
      return false;
    }

    // 2. Status category filter
    if (filterCategory === 'ACTIVE') {
      const activeStatuses: AlertStatus[] = ['TRIGGERED', 'OPEN', 'ACKNOWLEDGED'];
      if (!activeStatuses.includes(alert.status)) return false;
    } else if (filterCategory === 'INVESTIGATING') {
      const invStatuses: AlertStatus[] = ['UNDER_INVESTIGATION', 'MAINTENANCE_REQUIRED', 'CASE_CREATED'];
      if (!invStatuses.includes(alert.status)) return false;
    } else if (filterCategory === 'RESOLVED') {
      const resStatuses: AlertStatus[] = ['RESOLVED', 'DISMISSED', 'SUPPRESSED'];
      if (!resStatuses.includes(alert.status)) return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = alert.title.toLowerCase().includes(q);
      const descMatch = alert.description?.toLowerCase().includes(q);
      const codeMatch = alert.alertCode?.toLowerCase().includes(q);
      const compName = alert.componentId ? componentMap[alert.componentId] : undefined;
      const compMatch = compName?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !codeMatch && !compMatch) return false;
    }

    return true;
  });

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || null;

  // Counts based on actual backend data
  const activeCount = alerts.filter((a) => ['TRIGGERED', 'OPEN', 'ACKNOWLEDGED'].includes(a.status)).length;
  const investigatingCount = alerts.filter((a) => ['UNDER_INVESTIGATION', 'MAINTENANCE_REQUIRED', 'CASE_CREATED'].includes(a.status)).length;
  const resolvedCount = alerts.filter((a) => ['RESOLVED', 'DISMISSED', 'SUPPRESSED'].includes(a.status)).length;

  return (
    <div className="space-y-5">
      {/* Top Bar with Filters and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>مرکز مدیریت هشدارها و ناهنجاری‌ها</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              رصد هشدارهای عملیاتی، انحرافات تله‌متری و عیب‌یابی تجهیزات
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'CARDS'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                فهرست هشدارها
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ANOMALIES')}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'ANOMALIES'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>نمای ناهنجاری و شواهد</span>
              </button>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="به‌روزرسانی"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Status Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterCategory('ACTIVE')}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterCategory === 'ACTIVE'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>هشدارهای فعال</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200/60 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                {toPersianDigits(activeCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('INVESTIGATING')}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterCategory === 'INVESTIGATING'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>در حال بررسی / اقدام</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200/60 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {toPersianDigits(investigatingCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('RESOLVED')}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterCategory === 'RESOLVED'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>حل‌شده / بایگانی</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200/60 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                {toPersianDigits(resolvedCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('ALL')}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterCategory === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>همه</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {toPersianDigits(alerts.length)}
              </span>
            </button>
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 min-h-[36px]"
            >
              <option value="ALL">همه سطوح بحرانیت</option>
              <option value="CRITICAL">فقط بحرانی (CRITICAL)</option>
              <option value="HIGH">سطح بالا (HIGH)</option>
              <option value="WARNING">هشدار (WARNING)</option>
              <option value="INFO">اطلاعیه (INFO)</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، شرح، شناسه هشدار یا تجهیز..."
            className="w-full text-xs pr-9 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Selected Alert Details Drawer/Modal */}
      {selectedAlert && (
        <AlertDetails
          alert={selectedAlert}
          componentName={selectedAlert.componentId ? componentMap[selectedAlert.componentId] : undefined}
          onClose={() => setSelectedAlertId(null)}
          onInvestigate={onInvestigate}
          onFlagMaintenance={onFlagMaintenance}
          onResolve={onResolve}
          onDismiss={onDismiss}
          onDiagnose={onDiagnose}
          onCreateCase={onCreateCase}
          onViewCase={onViewCase}
        />
      )}

      {/* Main Alert Listing */}
      {filteredAlerts.length === 0 ? (
        <AlertEmptyState filtered={alerts.length > 0} />
      ) : viewMode === 'ANOMALIES' ? (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <AnomalyCard
              key={alert.id}
              alert={alert}
              diagnosis={diagnoses[alert.id]}
              componentName={alert.componentId ? componentMap[alert.componentId] : undefined}
              onCreateCase={onCreateCase}
              onViewCase={onViewCase}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              componentName={alert.componentId ? componentMap[alert.componentId] : undefined}
              isSelected={selectedAlertId === alert.id}
              onSelect={(a) => setSelectedAlertId(a.id)}
              onDiagnose={onDiagnose}
              onCreateCase={onCreateCase}
              onViewCase={onViewCase}
            />
          ))}
        </div>
      )}
    </div>
  );
};
