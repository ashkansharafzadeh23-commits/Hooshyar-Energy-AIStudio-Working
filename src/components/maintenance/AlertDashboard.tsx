import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw, 
  FileText, 
  ArrowRight,
  Zap,
  Cpu,
  Eye,
  Check,
  XCircle,
  Stethoscope
} from 'lucide-react';
import { AssetAlert, AlertSeverity, AlertStatus } from '../../types/maintenance';

interface AlertDashboardProps {
  alerts: AssetAlert[];
  loading: boolean;
  selectedAlert: AssetAlert | null;
  onSelectAlert: (alert: AssetAlert) => void;
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  onDiagnose: (alert: AssetAlert) => void;
  onCreateCase: (alert: AssetAlert) => void;
  onRefresh: () => void;
}

export const AlertDashboard: React.FC<AlertDashboardProps> = ({
  alerts,
  loading,
  selectedAlert,
  onSelectAlert,
  onAcknowledge,
  onDismiss,
  onDiagnose,
  onCreateCase,
  onRefresh
}) => {
  const [severityFilter, setSeverityFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ACTIVE');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter !== 'ALL' && alert.severity !== severityFilter) return false;
    if (statusFilter === 'ACTIVE' && (alert.status !== 'TRIGGERED' && alert.status !== 'ACKNOWLEDGED')) return false;
    if (statusFilter === 'RESOLVED' && alert.status !== 'RESOLVED') return false;
    if (statusFilter === 'DISMISSED' && alert.status !== 'DISMISSED') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = alert.title.toLowerCase().includes(q);
      const matchDesc = alert.description?.toLowerCase().includes(q);
      const matchCode = alert.alertCode?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCode) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">بحرانی</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">بالا</span>;
      case 'WARNING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">هشدار</span>;
      case 'INFO':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">اطلاعیه</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{sev}</span>;
    }
  };

  const getStatusBadge = (st: AlertStatus) => {
    switch (st) {
      case 'TRIGGERED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">فعال (صادر شده)</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">در حال بررسی</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">رفع شده</span>;
      case 'DISMISSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">نادیده گرفته شده</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{st}</span>;
    }
  };

  return (
    <div className="space-y-6" id="maintenance-alert-dashboard">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="جستجو در هشدارها، کد یا شرح..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">شدت:</span>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none"
            >
              <option value="ALL">همه سطوح</option>
              <option value="CRITICAL">بحرانی (Critical)</option>
              <option value="HIGH">بالا (High)</option>
              <option value="WARNING">هشدار (Warning)</option>
              <option value="INFO">اطلاعیه (Info)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">وضعیت:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none"
            >
              <option value="ACTIVE">هشدارهای فعال</option>
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="RESOLVED">رفع شده</option>
              <option value="DISMISSED">رد شده</option>
            </select>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          بروزرسانی وضعیت
        </button>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={24} />
            </div>
            <h4 className="text-base font-bold text-slate-800">هیچ هشداری در این فیلتر یافت نشد</h4>
            <p className="text-xs text-slate-500 mt-1">تجهیزات و متغیرهای نیروگاه در شرایط مطلوب پایش می‌شوند.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const isSelected = selectedAlert?.id === alert.id;
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-sm hover:shadow-md ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getSeverityBadge(alert.severity)}
                      {getStatusBadge(alert.status)}
                      <span className="text-xs font-mono font-medium text-slate-400">{alert.alertCode}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(alert.detectedAt).toLocaleString('fa-IR')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle
                        size={18}
                        className={
                          alert.severity === 'CRITICAL'
                            ? 'text-red-500'
                            : alert.severity === 'HIGH'
                            ? 'text-orange-500'
                            : 'text-amber-500'
                        }
                      />
                      {alert.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{alert.description}</p>

                    {/* Metric comparison chip */}
                    {(alert.observedValue !== undefined || alert.thresholdValue !== undefined) && (
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                        {alert.observedValue !== undefined && (
                          <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                            مقدار ثبت‌شده:{' '}
                            <span className="font-bold text-slate-900 font-mono">
                              {alert.observedValue.toLocaleString()} {alert.metricType || ''}
                            </span>
                          </div>
                        )}
                        {alert.thresholdValue !== undefined && (
                          <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                            حد آستانه مجاز:{' '}
                            <span className="font-bold text-slate-900 font-mono">
                              {alert.thresholdValue.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {alert.deviationPercent !== undefined && (
                          <div
                            className={`px-2.5 py-1 rounded-lg font-bold font-mono ${
                              Math.abs(alert.deviationPercent) > 20
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            انحراف: {alert.deviationPercent > 0 ? '+' : ''}
                            {alert.deviationPercent}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                    {alert.status === 'TRIGGERED' && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1"
                      >
                        <Check size={14} />
                        تایید بررسی
                      </button>
                    )}

                    {(alert.status === 'TRIGGERED' || alert.status === 'ACKNOWLEDGED') && (
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1"
                      >
                        <XCircle size={14} />
                        نادیده گرفتن
                      </button>
                    )}

                    <button
                      onClick={() => onDiagnose(alert)}
                      className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Stethoscope size={14} />
                      تشخیص و گارانتی
                    </button>

                    {!alert.maintenanceCaseId ? (
                      <button
                        onClick={() => onCreateCase(alert)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <FileText size={14} />
                        ایجاد پرونده تعمیراتی
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <CheckCircle size={14} />
                        پرونده ثبت شد
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
