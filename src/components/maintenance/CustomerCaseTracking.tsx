import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Phone,
  Wrench,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  ExternalLink,
  Loader2,
  Calendar,
  Check,
  Camera,
  Image as ImageIcon,
  Download,
  XCircle,
  FileCheck2,
  Activity
} from 'lucide-react';
import { MaintenanceCase, MaintenanceAction, CaseAttachment } from '../../types/maintenance';
import { Link } from 'react-router-dom';

interface CustomerCaseTrackingProps {
  caseId: string;
  onBack: () => void;
  onCaseUpdated?: (updated: MaintenanceCase) => void;
}

export const CustomerCaseTracking: React.FC<CustomerCaseTrackingProps> = ({
  caseId,
  onBack,
  onCaseUpdated
}) => {
  const [mCase, setMCase] = useState<MaintenanceCase | null>(null);
  const [actions, setActions] = useState<MaintenanceAction[]>([]);
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyActionPass, setVerifyActionPass] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${caseId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        throw new Error('پرونده تعمیراتی یافت نشد یا دسترسی مجاز نیست.');
      }
      const data = await res.json();
      setMCase(data);
      if (Array.isArray(data.actions)) {
        setActions(data.actions);
      } else {
        const actRes = await fetch(`/api/maintenance/${caseId}/actions`, { headers: getAuthHeaders() });
        if (actRes.ok) {
          const actData = await actRes.json();
          setActions(Array.isArray(actData) ? actData : []);
        }
      }

      if (Array.isArray(data.attachments)) {
        setAttachments(data.attachments);
      } else {
        const attRes = await fetch(`/api/maintenance/${caseId}/attachments`, { headers: getAuthHeaders() });
        if (attRes.ok) {
          const attData = await attRes.json();
          setAttachments(Array.isArray(attData) ? attData : []);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در بارگذاری پرونده تعمیراتی');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCase = async (passed: boolean) => {
    if (!mCase) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${mCase.id}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verificationPassed: passed,
          verificationNotes: verifyNotes || (passed ? 'تایید حسن انجام کار و تحویل بدون نقص' : 'عدم تایید؛ بازگشت جهت بررسی تکمیلی')
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ثبت تاییدیه کارشناس');
      }
      const updated = await res.json();
      setMCase(updated);
      setShowVerifyModal(false);
      setVerifyNotes('');
      setActionSuccessMsg(passed ? 'عملیات با موفقیت تایید شد. اکنون می‌توانید پرونده را ببندید.' : 'عدم تایید ثبت شد؛ پرونده به تکنسین عودت داده شد.');
      if (onCaseUpdated) {
        onCaseUpdated(updated);
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در فرآیند بررسی و تایید');
    } finally {
      setVerifying(false);
    }
  };

  const handleCloseCase = async () => {
    if (!mCase) return;
    setClosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${mCase.id}/close`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          closureNotes: 'تأیید نهایی رضایت کارفرما و بستن رسمی پرونده در شناسنامه دارایی'
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در بستن پرونده');
      }
      const updated = await res.json();
      setMCase(updated);
      setActionSuccessMsg('پرونده با موفقیت نهایی و بایگانی شد و سوابق به شناسنامه دارایی پیوست گردید.');
      if (onCaseUpdated) {
        onCaseUpdated(updated);
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در بستن پرونده');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-700">در حال دریافت آخرین وضعیت پرونده و گزارش اقدامات...</p>
      </div>
    );
  }

  if (error || !mCase) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
        <AlertTriangle size={36} className="text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">عدم دسترسی یا عدم وجود پرونده</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'پرونده مورد نظر یافت نشد.'}</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
        >
          بازگشت به فهرست پرونده‌ها
        </button>
      </div>
    );
  }

  // Lifecycle steps calculation
  const statusLevels: Record<string, number> = {
    REPORTED: 1,
    OPEN: 1,
    ASSIGNED: 2,
    SCHEDULED: 2,
    IN_PROGRESS: 3,
    PENDING_VERIFICATION: 4,
    AWAITING_VERIFICATION: 4,
    VERIFIED: 4,
    COMPLETED: 5,
    RESOLVED: 5,
    CLOSED: 5
  };
  const currentLevel = statusLevels[mCase.status] || 1;

  const stepsDef = [
    { level: 1, label: 'ثبت و ارزیابی' },
    { level: 2, label: 'تخصیص متخصص' },
    { level: 3, label: 'اقدامات سرویس' },
    { level: 4, label: 'بررسی و تایید' },
    { level: 5, label: 'تکمیل و بایگانی' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
        >
          <ArrowRight size={16} />
          <span>بازگشت به فهرست پرونده‌ها</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">کد پیگیری:</span>
          <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {mCase.caseNumber || mCase.maintenanceCode || mCase.id}
          </span>
        </div>
      </div>

      {/* Main Status & Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {mCase.status === 'CLOSED' ? 'تکمیل و بایگانی‌شده' : mCase.status === 'IN_PROGRESS' ? 'در حال سرویس و اقدام' : mCase.status === 'ASSIGNED' ? 'تخصیص‌یافته به متخصص' : 'ثبت‌شده در صف بررسی'}
              </span>
              <span className="text-xs text-slate-400">
                تاریخ ثبت: {new Date(mCase.createdAt || mCase.reportedAt).toLocaleDateString('fa-IR')}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900">{mCase.title}</h1>
            <p className="text-xs text-slate-500 mt-1">{mCase.description}</p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(mCase.status === 'AWAITING_VERIFICATION' || mCase.status === 'PENDING_VERIFICATION') && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVerifyActionPass(true);
                    setShowVerifyModal(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>تأیید حسن انجام کار</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyActionPass(false);
                    setShowVerifyModal(true);
                  }}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <XCircle size={14} />
                  <span>عدم تایید / رفع نقص</span>
                </button>
              </div>
            )}

            {(mCase.status === 'COMPLETED' || mCase.status === 'VERIFIED') && (
              <button
                type="button"
                disabled={closing}
                onClick={handleCloseCase}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                {closing ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={14} />}
                <span>بستن نهایی پرونده و بایگانی در شناسنامه</span>
              </button>
            )}

            {mCase.status === 'CLOSED' && (
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>پرونده بایگانی شده</span>
              </span>
            )}
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* 5-Step Progress Stepper */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-700 block">گردش کار و وضعیت پیشرفت رسیدگی:</span>
          <div className="grid grid-cols-5 gap-2">
            {stepsDef.map(s => {
              const isPast = s.level < currentLevel;
              const isCurrent = s.level === currentLevel;
              return (
                <div key={s.level} className="text-center space-y-1.5">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isPast
                        ? 'bg-emerald-500'
                        : isCurrent
                          ? 'bg-blue-600 ring-2 ring-blue-300'
                          : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className={`text-[11px] block font-bold truncate ${
                      isCurrent ? 'text-blue-700' : isPast ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Technician & Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Assigned Technician */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <UserCheck size={16} className="text-blue-600" />
            <span>متخصص O&M مسئول پرونده</span>
          </h3>

          {mCase.assignedTechnicianName ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {mCase.assignedTechnicianName.substring(0, 1)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <span>{mCase.assignedTechnicianName}</span>
                    <ShieldCheck size={14} className="text-emerald-600" />
                  </div>
                  <span className="text-[11px] text-slate-400">متخصص دارای پروانه صلاحیت فنی</span>
                </div>
              </div>

              {mCase.assignedTechnicianPhone ? (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">شماره تماس مستقیم:</span>
                  <a
                    href={`tel:${mCase.assignedTechnicianPhone}`}
                    className="font-mono font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Phone size={12} />
                    <span>{mCase.assignedTechnicianPhone}</span>
                  </a>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200 text-slate-400 text-[11px]">
                  هماهنگی بازدید از طریق مرکز پشتیبانی هوشیار انجام می‌شود.
                </div>
              )}

              {mCase.assignedTechnicianId && (
                <div className="pt-2">
                  <Link
                    to={`/professionals/${mCase.assignedTechnicianId}`}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-center block transition-colors"
                  >
                    مشاهده پروفایل و سوابق متخصص
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              تکنسین تخصیص داده نشده است.
              <p className="text-[10px] text-slate-400 mt-1">پرونده در صف ارجاع و انطباق قرار دارد.</p>
            </div>
          )}

          {/* Asset Passport Link Notice */}
          {mCase.assetId && mCase.assetId !== 'UNREGISTERED' && (
            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                <Info size={14} className="text-blue-600 shrink-0" />
                <span>اتصال به شناسنامه دارایی (Asset Passport)</span>
              </div>
              <p className="text-[11px] text-blue-800">
                این پرونده به دارایی انرژی متصل است. سوابق اقدامات و قطعات مصرفی به دفترچه شناسنامه اضافه خواهد شد.
              </p>
              <Link
                to={`/solar-assets/${mCase.assetId}`}
                className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1 pt-1"
              >
                <span>مشاهده شناسنامه فنی دارایی</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* Column 2 & 3: Actions Timeline & Service Log */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Wrench size={16} className="text-blue-600" />
              <span>لاگ و سوابق اقدامات فنی ثبت‌شده ({actions.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">ثبت‌شده توسط متخصص اعزامی</span>
          </div>

          {actions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-1">
              <Clock size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">هنوز اقدام فنی ثبت نشده است.</p>
              <p className="text-[11px]">با شروع بازرسی میدانی یا تست تجهیز، گزارش‌ها در این بخش درج می‌گردد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((act, idx) => (
                <div key={act.id || idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{act.description}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(act.performedAt || (act as any).createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>نوع اقدام: <strong className="text-slate-700">{act.actionType}</strong></span>
                    {act.resultStatus && (
                      <span>نتیجه: <strong className="text-emerald-700">{act.resultStatus === 'SUCCESS' ? 'موفق' : act.resultStatus}</strong></span>
                    )}
                    {act.newComponentSerial && (
                      <span className="font-mono">سریال قطعه جدید: {act.newComponentSerial}</span>
                    )}
                  </div>

                  {act.notes && (
                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                      {act.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Evidence Attachments Gallery */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ImageIcon size={16} className="text-blue-600" />
            <span>مدارک و شواهد پیوست‌شده (تصاویر، قبوض و گزارش‌ها) ({attachments.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">شواهد ثبت‌شده در پرونده</span>
        </div>

        {attachments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-1">
            <Camera size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">پیوست تصویری یا سندی ثبت نشده است.</p>
            <p className="text-[11px]">تصاویر آپلودشده توسط مشتری یا گزارش‌های بازرسی تکنسین در این بخش بایگانی می‌گردند.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.map((att, idx) => {
              const isPhoto = att.type === 'PHOTO' || (att.name && att.name.match(/\.(jpg|jpeg|png|webp)$/i));
              const isBill = att.type === 'BILL';
              const hasUrl = !!(att.url || att.data);

              return (
                <div key={att.id || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isPhoto ? (
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} />
                        </div>
                      ) : isBill ? (
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-slate-800 block truncate">{att.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString('fa-IR') : 'ثبت‌شده'}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isBill
                        ? att.status === 'EXTRACTION_AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isBill
                        ? att.status === 'EXTRACTION_AVAILABLE'
                          ? 'استخراج داده موفق'
                          : 'قبض تاییدنشده'
                        : att.type === 'PHOTO'
                          ? 'تصویر تجهیز'
                          : 'سند فنی'}
                    </span>
                  </div>

                  {/* Thumbnail if photo has url/data */}
                  {isPhoto && hasUrl && (
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-200 border border-slate-200">
                      <img
                        src={att.url || att.data}
                        alt={att.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Download / View link */}
                  {hasUrl && (
                    <a
                      href={att.url || att.data}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-end pt-1"
                    >
                      <span>مشاهده فایل</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 3: Post-Maintenance Telemetry Evaluation Check (if present) */}
      {mCase.postMaintenanceCheck && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Activity size={16} className="text-emerald-600" />
              <span>ارزیابی عملکرد و تزریق توان پس از تعمیرات (Post-Maintenance Telemetry Check)</span>
            </h3>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              mCase.postMaintenanceCheck.status === 'IMPROVED'
                ? 'bg-emerald-100 text-emerald-800'
                : mCase.postMaintenanceCheck.status === 'DEGRADED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
            }`}>
              {mCase.postMaintenanceCheck.status === 'IMPROVED'
                ? 'بهبود شاخص عملکرد'
                : mCase.postMaintenanceCheck.status === 'DEGRADED'
                  ? 'افت عملکرد پس از سرویس'
                  : mCase.postMaintenanceCheck.status === 'UNCHANGED'
                    ? 'عملکرد بدون تغییر'
                    : 'داده ناکافی'}
            </span>
          </div>

          <p className="text-xs text-slate-600">{mCase.postMaintenanceCheck.notes}</p>

          {(mCase.postMaintenanceCheck.preGenerationKwh !== undefined || mCase.postMaintenanceCheck.postGenerationKwh !== undefined) && (
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block">میانگین تولید قبل از سرویس:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{mCase.postMaintenanceCheck.preGenerationKwh ?? '—'} کیلووات</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block">میانگین تولید پس از سرویس:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">{mCase.postMaintenanceCheck.postGenerationKwh ?? '—'} کیلووات</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl text-right animate-fadeIn" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {verifyActionPass ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>تأیید حسن انجام کار و تحویل پروژه</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-rose-600" />
                    <span>ثبت عدم تأیید و بازگشت پرونده جهت رفع نقص</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {verifyActionPass
                ? 'با تأیید حسن انجام کار، عملیات تعمیرات و سرویس توسط کارفرما تایید شده و پرونده آماده بایگانی نهایی در شناسنامه دارایی می‌شود.'
                : 'در صورت وجود هرگونه ایراد یا عدم انطباق با استانداردهای O&M، علت عدم تایید را بنویسید تا جهت اصلاح به متخصص ارجاع گردد.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                توضیحات و یادداشت تاییدیه (اختیاری):
              </label>
              <textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                rows={3}
                placeholder={verifyActionPass ? 'مثال: تجهیز با موفقیت تست شد و خطا برطرف گردید.' : 'دلایل عدم تایید یا نقص‌های مشاهده‌شده را شرح دهید...'}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                انصراف
              </button>

              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerifyCase(verifyActionPass)}
                className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                  verifyActionPass ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {verifying && <Loader2 size={14} className="animate-spin" />}
                <span>{verifyActionPass ? 'تایید نهایی' : 'ثبت عدم تایید'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
