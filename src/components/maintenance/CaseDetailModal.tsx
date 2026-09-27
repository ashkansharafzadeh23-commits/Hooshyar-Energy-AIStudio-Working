import React, { useState } from 'react';
import { 
  X, 
  Wrench, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ShieldCheck, 
  Plus, 
  Send,
  Loader2,
  FileCheck
} from 'lucide-react';
import { MaintenanceCase, MaintenanceAction, MaintenanceActionType } from '../../types/maintenance';

interface CaseDetailModalProps {
  mCase: MaintenanceCase | null;
  actions: MaintenanceAction[];
  loading: boolean;
  onClose: () => void;
  onAddAction: (caseId: string, actionData: any) => Promise<void>;
  onVerifyCase: (caseId: string) => Promise<void>;
  onCloseCase: (caseId: string, closeData: any) => Promise<void>;
  onRefresh: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  mCase,
  actions,
  loading,
  onClose,
  onAddAction,
  onVerifyCase,
  onCloseCase,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACTIONS' | 'VERIFY' | 'CLOSE'>('OVERVIEW');

  // Add Action Form
  const [actionType, setActionType] = useState<string>('REPAIR');
  const [description, setDescription] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [laborHours, setLaborHours] = useState<number>(1);
  const [costIrr, setCostIrr] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Close Case Form
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [downtimeMinutes, setDowntimeMinutes] = useState<number>(60);
  const [finalLaborCost, setFinalLaborCost] = useState<number>(0);
  const [finalPartsCost, setFinalPartsCost] = useState<number>(0);
  const [submittingClose, setSubmittingClose] = useState(false);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);

  if (!mCase) return null;

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmittingAction(true);
    try {
      await onAddAction(mCase.id, {
        actionType,
        description,
        performedBy: performedBy.trim() || 'تکنسین فنی',
        laborHours: Number(laborHours),
        costIrr: Number(costIrr),
        notes
      });
      setDescription('');
      setNotes('');
      setActiveTab('ACTIONS');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerifyCase(mCase.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) return;
    setSubmittingClose(true);
    try {
      await onCloseCase(mCase.id, {
        resolutionSummary,
        downtimeMinutes: Number(downtimeMinutes),
        laborCost: Number(finalLaborCost),
        partsCost: Number(finalPartsCost)
      });
      onClose();
    } finally {
      setSubmittingClose(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {mCase.caseNumber}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {mCase.status}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                {new Date(mCase.createdAt).toLocaleString('fa-IR')}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{mCase.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 border-b-2 transition-all ${
              activeTab === 'OVERVIEW'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            اطلاعات کلی و تشخیص
          </button>
          <button
            onClick={() => setActiveTab('ACTIONS')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ACTIONS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            اقدامات انجام‌شده ({actions.length})
          </button>
          <button
            onClick={() => setActiveTab('VERIFY')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'VERIFY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            ارزیابی تله‌متری پس از تعمیر
          </button>
          {mCase.status !== 'CLOSED' && (
            <button
              onClick={() => setActiveTab('CLOSE')}
              className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'CLOSE'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent hover:text-emerald-700 text-emerald-600'
              }`}
            >
              مختومه کردن پرونده
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500">شرح خرابی یا ایراد:</span>
                  <p className="text-xs text-slate-800 leading-relaxed">{mCase.description}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500">مشخصات ارجاع و انتساب:</span>
                  <div className="text-xs text-slate-700 space-y-1">
                    <div>تکنسین مسئول: <span className="font-bold">{mCase.assignedTechnicianId || 'تخصیص داده نشده'}</span></div>
                    <div>سازمان خدمات‌دهنده: <span className="font-bold">{mCase.assignedOrganizationId || 'تیم داخلی'}</span></div>
                    <div>اولویت: <span className="font-bold text-amber-700">{mCase.priority}</span></div>
                    <div>منبع ثبت: <span className="font-bold">{mCase.reportedBy || 'اتوماسیون پایش'}</span></div>
                  </div>
                </div>
              </div>

              {mCase.rootCause && (
                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-800 block mb-1">علت ریشه‌ای ثبت‌شده:</span>
                  <p className="text-xs text-amber-900 leading-relaxed">{mCase.rootCause}</p>
                </div>
              )}

              {/* Financial & Time Aggregation */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">مجموع زمان صرف‌شده</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {mCase.totalLaborHours || 0} ساعت
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">مجموع هزینه‌ها</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    {(mCase.totalCostIrr || mCase.totalCost || 0).toLocaleString()} ریال
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">مدت توقف (Downtime)</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {mCase.downtimeMinutes || 0} دقیقه
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ACTIONS' && (
            <div className="space-y-6">
              {/* Existing Actions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700">اقدامات ثبت‌شده برای این پرونده:</h4>
                {actions.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border text-center">
                    هنوز اقدامی ثبت نشده است. از فرم زیر برای ثبت عملیات سرویس، تعویض یا بازرسی استفاده نمایید.
                  </p>
                ) : (
                  actions.map(act => (
                    <div key={act.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Wrench size={14} className="text-blue-600" />
                          نوع اقدام: {act.actionType}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {new Date(act.performedAt).toLocaleString('fa-IR')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">{act.description}</p>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200">
                        <span>انجام‌شده توسط: <strong className="text-slate-700">{act.performedBy}</strong></span>
                        {act.notes && <span>یادداشت: {act.notes}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Action Form */}
              {mCase.status !== 'CLOSED' && (
                <form onSubmit={handleCreateAction} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Plus size={15} /> ثبت اقدام یا تعویض قطعه جدید
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">نوع عملیات:</label>
                      <select
                        value={actionType}
                        onChange={e => setActionType(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="INSPECTION">بازرسی فنی (Inspection)</option>
                        <option value="CLEANING">شستشو و تمیزکاری (Cleaning)</option>
                        <option value="REPAIR">تعمیر تخصصی (Repair)</option>
                        <option value="PART_REPLACEMENT">تعویض قطعه (Part Replacement)</option>
                        <option value="RESET">راه‌اندازی مجدد و ریست (Reset)</option>
                        <option value="CONFIGURATION">پیکربندی نرم‌افزاری (Config)</option>
                        <option value="TEST">تست و کالیبراسیون (Test)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">تکنسین مجری:</label>
                      <input
                        type="text"
                        placeholder="نام تکنسین..."
                        value={performedBy}
                        onChange={e => setPerformedBy(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">ساعت کارکرد (ساعت):</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={laborHours}
                        onChange={e => setLaborHours(Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">هزینه اقدام (ریال):</label>
                      <input
                        type="number"
                        min="0"
                        step="100000"
                        value={costIrr}
                        onChange={e => setCostIrr(Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">شرح دقیق اقدام اجرا شده:</label>
                    <textarea
                      required
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="توضیح دهید چه کارهایی برای رفع عیب یا تعویض قطعه انجام شد..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white h-18 resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingAction}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submittingAction ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      ثبت اقدام و اعمال در پرونده
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'VERIFY' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity size={16} className="text-indigo-600" />
                  ارزیابی وضعیت توان و تولید پس از اقدام تعمیراتی
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  سیستم هوشمند به مقایسه داده‌های تله‌متری قبل و بعد از زمان شروع تعمیرات می‌پردازد تا بازگشت شرایط به حالت نرمال یا افزایش راندمان را راستی‌آزمایی نماید.
                </p>

                {mCase.postMaintenanceCheck && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">وضعیت تله‌متری ارزیابی‌شده:</span>
                      <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {mCase.postMaintenanceCheck.status}
                      </span>
                    </div>
                    {mCase.postMaintenanceCheck.notes && (
                      <p className="text-slate-600">{mCase.postMaintenanceCheck.notes}</p>
                    )}
                    <span className="text-[11px] text-slate-400 block">
                      زمان ارزیابی: {new Date(mCase.postMaintenanceCheck.evaluatedAt).toLocaleString('fa-IR')}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    محاسبه و ارزیابی تله‌متری
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CLOSE' && (
            <form onSubmit={handleClose} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-4">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <FileCheck size={16} /> تایید رفع نقص و بستن نهایی پرونده تعمیراتی
              </h4>
              <p className="text-xs text-emerald-800">
                با بستن پرونده، هشدارهای مرتبط رفع تلقی شده و سوابق در بایگانی نگهداری دائمی ثبت خواهد گردید.
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">خلاصه نتیجه‌گیری و راه‌حل نهایی:</label>
                <textarea
                  required
                  value={resolutionSummary}
                  onChange={e => setResolutionSummary(e.target.value)}
                  placeholder="مثال: تست اتصال کابل DC اینورتر انجام و قطعه تعویض گردید، توان تولیدی به سطح نرمال بازگشت..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">دقیقه توقف کل:</label>
                  <input
                    type="number"
                    min="0"
                    value={downtimeMinutes}
                    onChange={e => setDowntimeMinutes(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">هزینه دستمزد (ریال):</label>
                  <input
                    type="number"
                    min="0"
                    value={finalLaborCost}
                    onChange={e => setFinalLaborCost(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">هزینه قطعات (ریال):</label>
                  <input
                    type="number"
                    min="0"
                    value={finalPartsCost}
                    onChange={e => setFinalPartsCost(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingClose}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingClose ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  تایید نهایی و بستن پرونده
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
