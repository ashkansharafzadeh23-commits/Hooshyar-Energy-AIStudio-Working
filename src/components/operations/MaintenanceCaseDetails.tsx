import React, { useState } from 'react';
import { 
  X, 
  Wrench, 
  Clock, 
  User, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Check,
  Send,
  Plus,
  FileCheck2,
  FileText
} from 'lucide-react';
import { MaintenanceCase, TechnicianMatch } from '../../types/maintenance';
import { formatCurrencyIRR, formatPersianNumber, toPersianDigits } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';
import { getMaintenancePriorityConfig, getMaintenanceStatusLabel, getMaintenanceCategoryLabel } from './MaintenanceCaseCard';
import { MaintenanceTimeline } from './MaintenanceTimeline';
import { TechnicianMatchList } from './TechnicianMatchList';
import { TechnicianAssignmentReview } from './TechnicianAssignmentReview';

export interface MaintenanceCaseDetailsProps {
  maintenanceCase: MaintenanceCase;
  componentName?: string;
  technicianMatches?: TechnicianMatch[];
  isLoadingMatches?: boolean;
  onClose: () => void;
  onAssignTechnician?: (technicianId: string, notes?: string) => Promise<void>;
  onAcceptCase?: () => Promise<void>;
  onScheduleCase?: (scheduledDate: string) => Promise<void>;
  onStartCase?: () => Promise<void>;
  onLogAction?: (actionData: { actionType: string; description: string; partsReplaced?: string[]; laborHours?: number; cost?: number }) => Promise<void>;
  onSubmitVerification?: (summary: { resolutionSummary: string; partsCost?: number; laborCost?: number }) => Promise<void>;
  onVerifyCase?: (verificationNotes: string, approved: boolean) => Promise<void>;
  onCloseCase?: () => Promise<void>;
  isActionLoading?: boolean;
}

export const MaintenanceCaseDetails: React.FC<MaintenanceCaseDetailsProps> = ({
  maintenanceCase,
  componentName,
  technicianMatches = [],
  isLoadingMatches = false,
  onClose,
  onAssignTechnician,
  onAcceptCase,
  onScheduleCase,
  onStartCase,
  onLogAction,
  onSubmitVerification,
  onVerifyCase,
  onCloseCase,
  isActionLoading = false,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<TechnicianMatch | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showLogActionModal, setShowLogActionModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form states
  const [actionType, setActionType] = useState('REPAIR');
  const [actionDesc, setActionDesc] = useState('');
  const [actionLaborHours, setActionLaborHours] = useState('');
  const [actionCost, setActionCost] = useState('');
  const [actionParts, setActionParts] = useState('');

  const [resolutionSummary, setResolutionSummary] = useState('');
  const [finalPartsCost, setFinalPartsCost] = useState('');
  const [finalLaborCost, setFinalLaborCost] = useState('');

  const [verifyNotes, setVerifyNotes] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  const prioConfig = getMaintenancePriorityConfig(maintenanceCase.priority);
  const statusConfig = getMaintenanceStatusLabel(maintenanceCase.status);
  const categoryLabel = getMaintenanceCategoryLabel(maintenanceCase.category);

  const hasCost = typeof maintenanceCase.totalCost === 'number' && !isNaN(maintenanceCase.totalCost);

  // Submissions
  const handleLogActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLogAction) return;
    await onLogAction({
      actionType,
      description: actionDesc,
      partsReplaced: actionParts ? actionParts.split(',').map((p) => p.trim()) : undefined,
      laborHours: actionLaborHours ? parseFloat(actionLaborHours) : undefined,
      cost: actionCost ? parseFloat(actionCost) : undefined,
    });
    setShowLogActionModal(false);
    setActionDesc('');
  };

  const handleSubmitVerificationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitVerification) return;
    await onSubmitVerification({
      resolutionSummary,
      partsCost: finalPartsCost ? parseFloat(finalPartsCost) : undefined,
      laborCost: finalLaborCost ? parseFloat(finalLaborCost) : undefined,
    });
    setShowSubmitModal(false);
  };

  const handleVerifyForm = async (approved: boolean) => {
    if (!onVerifyCase) return;
    await onVerifyCase(verifyNotes, approved);
    setShowVerifyModal(false);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onScheduleCase || !scheduleDateTime) return;
    await onScheduleCase(new Date(scheduleDateTime).toISOString());
    setShowScheduleModal(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                {maintenanceCase.maintenanceCode || ''}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${prioConfig.className}`}>
                {prioConfig.label}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {maintenanceCase.title}
            </h3>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>دسته‌بندی: {categoryLabel}</span>
              {componentName && (
                <>
                  <span>•</span>
                  <span>تجهیز: {componentName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Grid: Info + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              شرح پرونده و دستور کار:
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              {maintenanceCase.description}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Technician */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block">تکنسین مسئول:</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {maintenanceCase.assignedTechnicianName || 'تکنسین تخصیص داده نشده است'}
                </span>
                {!maintenanceCase.assignedTechnicianId && onAssignTechnician && (
                  <button
                    type="button"
                    onClick={() => setShowMatchModal(true)}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    انتخاب تکنسین
                  </button>
                )}
              </div>
              {maintenanceCase.assignedTechnicianPhone && (
                <div className="text-[11px] text-slate-500 font-mono">
                  {toPersianDigits(maintenanceCase.assignedTechnicianPhone)}
                </div>
              )}
            </div>

            {/* Financial Details */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block">هزینه عملیات نگهداری:</span>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {hasCost ? formatCurrencyIRR(maintenanceCase.totalCost) : 'هزینه ثبت نشده است'}
              </div>
              {(typeof maintenanceCase.laborCost === 'number' || typeof maintenanceCase.partsCost === 'number') && (
                <div className="text-[10px] text-slate-400 flex items-center gap-3">
                  {typeof maintenanceCase.laborCost === 'number' && (
                    <span>دستمزد: {formatCurrencyIRR(maintenanceCase.laborCost)}</span>
                  )}
                  {typeof maintenanceCase.partsCost === 'number' && (
                    <span>قطعات: {formatCurrencyIRR(maintenanceCase.partsCost)}</span>
                  )}
                </div>
              )}
            </div>

            {/* Resolution Summary */}
            <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block">نتیجه و خلاصه اقدامات انجام‌شده:</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {maintenanceCase.resolutionSummary || 'نتیجه تعمیر ثبت نشده است'}
              </p>
            </div>

            {/* Post-Maintenance Verification Snapshot */}
            {maintenanceCase.postMaintenanceCheck && (
              <div className="sm:col-span-2 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>راستی‌آزمایی عملکرد پسا‌تعمیرات:</span>
                </span>
                <div className="text-xs text-emerald-800 dark:text-emerald-300">
                  وضعیت سنجش: <strong className="font-bold">{maintenanceCase.postMaintenanceCheck.status}</strong>
                  {typeof maintenanceCase.postMaintenanceCheck.preGenerationKwh === 'number' && typeof maintenanceCase.postMaintenanceCheck.postGenerationKwh === 'number' && (
                    <span className="mr-2">
                      (تولید پیشین: {formatPersianNumber(maintenanceCase.postMaintenanceCheck.preGenerationKwh, 1)} kWh • تولید پسین: {formatPersianNumber(maintenanceCase.postMaintenanceCheck.postGenerationKwh, 1)} kWh)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logged Actions */}
          {((maintenanceCase as any).actions ?? maintenanceCase.actionsTaken) && ((maintenanceCase as any).actions ?? maintenanceCase.actionsTaken).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                اقدامات و گزارش‌های میدانی تکنسین:
              </h4>
              <div className="space-y-2">
                {(((maintenanceCase as any).actions ?? maintenanceCase.actionsTaken) as any[]).map((act, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{act.actionType}</span>
                      {act.performedAt && (
                        <span className="text-[10px] text-slate-400">{formatPersianDateTime(act.performedAt)}</span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{act.description}</p>
                    {act.partsReplaced && act.partsReplaced.length > 0 && (
                      <div className="text-[11px] text-slate-500">
                        قطعات تعویضی: {act.partsReplaced.join('، ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline Column */}
        <div className="bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>روند پیشرفت پرونده</span>
          </h4>
          <MaintenanceTimeline maintenanceCase={maintenanceCase} />
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Action buttons based on real status */}
          {!maintenanceCase.assignedTechnicianId && onAssignTechnician && (
            <button
              type="button"
              onClick={() => setShowMatchModal(true)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
            >
              <User className="w-4 h-4" />
              <span>تخصیص تکنسین</span>
            </button>
          )}

          {maintenanceCase.status === 'ASSIGNED' && onAcceptCase && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={onAcceptCase}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>پذیرش پرونده (تکنسین)</span>
            </button>
          )}

          {((maintenanceCase.status as any) === 'ACCEPTED' || maintenanceCase.status === 'ASSIGNED') && onScheduleCase && (
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>زمان‌بندی مراجعه</span>
            </button>
          )}

          {(maintenanceCase.status === 'SCHEDULED' || (maintenanceCase.status as any) === 'ACCEPTED' || maintenanceCase.status === 'ASSIGNED') && onStartCase && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={onStartCase}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>شروع عملیات اجرایی</span>
            </button>
          )}

          {maintenanceCase.status === 'IN_PROGRESS' && onLogAction && (
            <button
              type="button"
              onClick={() => setShowLogActionModal(true)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت اقدام / قطعه</span>
            </button>
          )}

          {maintenanceCase.status === 'IN_PROGRESS' && onSubmitVerification && (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-500 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>ثبت اتمام کار و ارسال برای تأیید</span>
            </button>
          )}

          {maintenanceCase.status === 'COMPLETED' && onVerifyCase && (
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>راستی‌آزمایی و ارزیابی کارفرما</span>
            </button>
          )}

          {maintenanceCase.status === 'VERIFIED' && onCloseCase && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={onCloseCase}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>بستن نهایی پرونده</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          بازگشت به فهرست
        </button>
      </div>

      {/* Modal: Match List */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                انتخاب و تخصیص تکنسین مجاز
              </h3>
              <button
                type="button"
                onClick={() => setShowMatchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <TechnicianMatchList
              matches={technicianMatches}
              loading={isLoadingMatches}
              onAssignTechnician={(m) => {
                setSelectedMatch(m);
                setShowMatchModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal: Assignment Review Confirmation */}
      {selectedMatch && (
        <TechnicianAssignmentReview
          maintenanceCase={maintenanceCase}
          match={selectedMatch}
          loading={isActionLoading}
          onConfirm={async (notes) => {
            if (onAssignTechnician) {
              await onAssignTechnician(selectedMatch.technicianId, notes);
            }
            setSelectedMatch(null);
          }}
          onCancel={() => setSelectedMatch(null)}
        />
      )}

      {/* Modal: Schedule Case */}
      {showScheduleModal && (
        <form onSubmit={handleScheduleSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
            تعیین زمان‌بندی مراجعه به نیروگاه
          </h5>
          <input
            type="datetime-local"
            required
            value={scheduleDateTime}
            onChange={(e) => setScheduleDateTime(e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="text-xs px-3 py-1 text-slate-500"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white"
            >
              ثبت زمان‌بندی
            </button>
          </div>
        </form>
      )}

      {/* Modal: Log Action */}
      {showLogActionModal && (
        <form onSubmit={handleLogActionSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
            ثبت اقدام فنی یا تعویض قطعه
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                نوع اقدام:
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="REPAIR">تعمیر فنی</option>
                <option value="REPLACE">تعویض قطعه</option>
                <option value="CLEANING">شستشو / تمیزکاری</option>
                <option value="CALIBRATION">کالیبراسیون سنسور</option>
                <option value="FIRMWARE_UPDATE">به‌روزرسانی نرم‌افزار</option>
                <option value="INSPECTION">بازرسی ظاهری</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ساعت کارکرد (اختیاری):
              </label>
              <input
                type="number"
                step="0.5"
                value={actionLaborHours}
                onChange={(e) => setActionLaborHours(e.target.value)}
                placeholder="مثلاً ۲٫۵"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              شرح اقدام:
            </label>
            <textarea
              required
              rows={2}
              value={actionDesc}
              onChange={(e) => setActionDesc(e.target.value)}
              placeholder="شرح جزئیات تست، تعویض یا آچارکشی انجام‌شده..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              قطعات تعویضی (با کاما جدا کنید):
            </label>
            <input
              type="text"
              value={actionParts}
              onChange={(e) => setActionParts(e.target.value)}
              placeholder="مثلاً: فیوز ۱۰ آمپر DC، کانکتور MC4"
              className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowLogActionModal(false)}
              className="text-xs px-3 py-1 text-slate-500"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950"
            >
              ثبت اقدام
            </button>
          </div>
        </form>
      )}

      {/* Modal: Submit for verification */}
      {showSubmitModal && (
        <form onSubmit={handleSubmitVerificationForm} className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl space-y-3">
          <h5 className="text-xs font-bold text-teal-950 dark:text-teal-200">
            ثبت اتمام عملیات و ارسال جهت بررسی و راستی‌آزمایی
          </h5>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              خلاصه اقدامات نهایی و نتیجه تست:
            </label>
            <textarea
              required
              rows={2}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="خلاصه نحوه رفع مشکل و نتیجه راه‌اندازی مجدد..."
              className="w-full text-xs p-2.5 rounded-lg border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                هزینه قطعات (تومان):
              </label>
              <input
                type="number"
                value={finalPartsCost}
                onChange={(e) => setFinalPartsCost(e.target.value)}
                placeholder="اختیاری"
                className="w-full text-xs p-2 rounded-lg border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                هزینه دستمزد (تومان):
              </label>
              <input
                type="number"
                value={finalLaborCost}
                onChange={(e) => setFinalLaborCost(e.target.value)}
                placeholder="اختیاری"
                className="w-full text-xs p-2 rounded-lg border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="text-xs px-3 py-1 text-slate-500"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white"
            >
              ارسال برای تأیید
            </button>
          </div>
        </form>
      )}

      {/* Modal: Verify Case (Owner / EPC) */}
      {showVerifyModal && (
        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
          <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
            راستی‌آزمایی و ارزیابی کیفیت تعمیرات توسط کارفرما / مهندس ناظر
          </h5>
          <textarea
            rows={2}
            value={verifyNotes}
            onChange={(e) => setVerifyNotes(e.target.value)}
            placeholder="یادداشت ارزیابی عملکرد و بررسی صحت سنجش تله‌متری پسا‌تعمیر..."
            className="w-full text-xs p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="text-xs px-3 py-1 text-slate-500"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => handleVerifyForm(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200"
            >
              عدم تأیید (نیاز به بازنگری)
            </button>
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => handleVerifyForm(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
            >
              تأیید صحت تعمیرات
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
