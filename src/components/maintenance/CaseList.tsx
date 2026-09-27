import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  CheckCircle2, 
  ArrowLeft,
  Wrench,
  DollarSign,
  UserPlus
} from 'lucide-react';
import { MaintenanceCase, MaintenanceStatus, MaintenancePriority } from '../../types/maintenance';

interface CaseListProps {
  cases: MaintenanceCase[];
  loading: boolean;
  onSelectCase: (mCase: MaintenanceCase) => void;
  onAssignTechnician: (mCase: MaintenanceCase) => void;
  onNewCase: () => void;
}

export const CaseList: React.FC<CaseListProps> = ({
  cases,
  loading,
  onSelectCase,
  onAssignTechnician,
  onNewCase
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredCases = cases.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = c.caseNumber?.toLowerCase().includes(q);
      const matchCode = c.maintenanceCode?.toLowerCase().includes(q);
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      if (!matchNum && !matchCode && !matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">باز</span>;
      case 'DIAGNOSING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">در حال بررسی</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">در حال اجرا</span>;
      case 'PENDING_VERIFICATION':
      case 'AWAITING_VERIFICATION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">در انتظار تایید</span>;
      case 'VERIFIED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">تایید شده</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">مختومه (بسته)</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">لغو شده</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: MaintenancePriority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-100 text-red-700">فوری (Urgent)</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-700">بالا (High)</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">متوسط (Medium)</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">عادی (Low)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">{priority}</span>;
    }
  };

  return (
    <div className="space-y-6" id="maintenance-case-list">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="جستجو بر اساس شماره پرونده، عنوان، شرح..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">وضعیت:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="OPEN">باز</option>
              <option value="DIAGNOSING">در حال بررسی</option>
              <option value="PENDING_ACTION">در انتظار اقدام</option>
              <option value="IN_PROGRESS">در حال اجرا</option>
              <option value="PENDING_VERIFICATION">در انتظار تایید</option>
              <option value="VERIFIED">تایید شده</option>
              <option value="CLOSED">مختومه (بسته شده)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">اولویت:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none"
            >
              <option value="ALL">همه اولویت‌ها</option>
              <option value="URGENT">فوری</option>
              <option value="HIGH">بالا</option>
              <option value="MEDIUM">متوسط</option>
              <option value="LOW">عادی</option>
            </select>
          </div>
        </div>

        <button
          onClick={onNewCase}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <FileText size={15} />
          ثبت پرونده تعمیراتی جدید
        </button>
      </div>

      {/* Case Grid / Cards */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FileText size={36} className="text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">هیچ پرونده تعمیراتی یافت نشد</h4>
            <p className="text-xs text-slate-500 mt-1">
              در صورت بروز هرگونه عیب یا دریافت هشدار، پرونده تعمیراتی جدید ثبت نمایید.
            </p>
          </div>
        ) : (
          filteredCases.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(c.status)}
                  {getPriorityBadge(c.priority)}
                  <span className="text-xs font-mono font-bold text-blue-600">{c.caseNumber}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">
                    ثبت در {new Date(c.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  {c.assignedTechnicianId ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                      <UserCheck size={13} /> تکنسین مسئول تخصیص یافته
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded">
                      <AlertCircle size={13} /> فاقد تکنسین تخصیص‌یافته
                    </span>
                  )}

                  {c.totalLaborHours !== undefined && c.totalLaborHours > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> کارکرد: {c.totalLaborHours} ساعت
                    </span>
                  )}

                  {c.totalCostIrr !== undefined && c.totalCostIrr > 0 && (
                    <span className="flex items-center gap-1 font-mono text-slate-700">
                      هزینه: {c.totalCostIrr.toLocaleString()} ریال
                    </span>
                  )}

                  {(c.scheduledAt || c.scheduledDate) && (
                    <span className="text-xs text-slate-400">
                      زمان‌بندی: {new Date(c.scheduledAt || c.scheduledDate || '').toLocaleDateString('fa-IR')}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions on Case */}
              <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                {!c.assignedTechnicianId && c.status !== 'CLOSED' && (
                  <button
                    onClick={() => onAssignTechnician(c)}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-1"
                  >
                    <UserPlus size={14} />
                    تخصیص تکنسین
                  </button>
                )}

                <button
                  onClick={() => onSelectCase(c)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all flex items-center gap-1"
                >
                  <Wrench size={14} />
                  جزییات و ثبت اقدامات
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
