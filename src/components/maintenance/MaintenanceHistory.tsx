import React from 'react';
import { 
  History, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Calendar,
  Layers,
  Wrench
} from 'lucide-react';
import { MaintenanceCase, MaintenanceAssignmentHistory } from '../../types/maintenance';

interface MaintenanceHistoryProps {
  cases: MaintenanceCase[];
  historyLogs: MaintenanceAssignmentHistory[];
  loading: boolean;
}

export const MaintenanceHistory: React.FC<MaintenanceHistoryProps> = ({
  cases,
  historyLogs,
  loading
}) => {
  const closedCases = cases.filter(c => c.status === 'CLOSED');

  const totalDowntimeMinutes = cases.reduce((acc, c) => acc + (c.downtimeMinutes || 0), 0);
  const totalCostIrr = cases.reduce((acc, c) => acc + (c.totalCostIrr || c.totalCost || 0), 0);
  const totalLaborHours = cases.reduce((acc, c) => acc + (c.totalLaborHours || 0), 0);
  const resolutionRate = cases.length > 0 ? Math.round((closedCases.length / cases.length) * 100) : 100;

  return (
    <div className="space-y-6" id="maintenance-history-view">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">کل پرونده‌های ثبت‌شده</span>
            <FileText size={18} className="text-blue-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{cases.length}</span>
            <span className="text-xs text-slate-400 mr-1.5">پرونده</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">مجموع توقف سیستم (Downtime)</span>
            <Clock size={18} className="text-orange-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {(totalDowntimeMinutes / 60).toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 mr-1.5">ساعت</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">مجموع هزینه‌های نگهداری</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-emerald-700 font-mono">
              {totalCostIrr.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 mr-1.5">ریال</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">نرخ حل و بستن پرونده‌ها</span>
            <CheckCircle2 size={18} className="text-teal-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-teal-700 font-mono">
              {resolutionRate}%
            </span>
            <span className="text-xs text-slate-400 mr-1.5">مختومه</span>
          </div>
        </div>
      </div>

      {/* Closed Cases Archive */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
          <History size={18} className="text-blue-600" />
          آرشیو سوابق پرونده‌های مختومه‌شده (Closed Cases Archive)
        </h3>

        {closedCases.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            هنوز پرونده‌ای به وضعیت مختومه انتقال نیافته است.
          </div>
        ) : (
          <div className="space-y-3">
            {closedCases.map(c => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 bg-white px-2 py-0.5 rounded border">
                      {c.caseNumber}
                    </span>
                    <span className="font-bold text-slate-900">{c.title}</span>
                  </div>
                  <span className="text-slate-400">
                    بسته شده در {new Date(c.updatedAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>

                {c.resolutionSummary && (
                  <div className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">
                    <strong>شرح راه‌حل نهایی:</strong> {c.resolutionSummary}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-slate-500 pt-1">
                  <span>مدت توقف: <strong>{c.downtimeMinutes || 0} دقیقه</strong></span>
                  <span>کارکرد: <strong>{c.totalLaborHours || 0} ساعت</strong></span>
                  <span>
                    هزینه کل:{' '}
                    <strong className="font-mono text-emerald-700">
                      {(c.totalCostIrr || c.totalCost || 0).toLocaleString()} ریال
                    </strong>
                  </span>
                  {c.verificationPassed && (
                    <span className="text-teal-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> راستی‌آزمایی تله‌متری با موفقیت پاس شد
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Audit Trail */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
          <Layers size={18} className="text-indigo-600" />
          ردیابی و لاگ مأموریت‌های تکنسین‌ها (Assignment Audit Log)
        </h3>

        {historyLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            هیچ لاگ انتساب مأموریتی ثبت نشده است.
          </div>
        ) : (
          <div className="space-y-2">
            {historyLogs.map(log => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">
                    ارجاع پرونده به تکنسین با شناسه: <span className="font-mono">{log.technicianId}</span>
                  </div>
                  {log.notes && <p className="text-slate-500">{log.notes}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white text-indigo-700 border">
                    {log.status}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1">
                    {new Date(log.assignedAt).toLocaleString('fa-IR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
