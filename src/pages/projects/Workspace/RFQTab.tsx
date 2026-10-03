import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Check, 
  ShieldCheck, 
  Zap, 
  Users,
  Eye,
  MapPin,
  HelpCircle,
  FileCheck2,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { ProjectRFQ, RFQStatus } from '../../../types/rfq.js';
import { Organization } from '../../../types/organization.js';
import { RFQDocumentsManager } from '../../../components/rfq/RFQDocumentsManager.js';
import { PersianConfirmModal } from '../../../components/common/PersianConfirmModal.js';
import { formatJalaliDate, formatSolarCapacity } from '../../../utils/formatters.js';

interface RFQTabProps {
  projectId: string;
  project: any;
  onNavigateToBids?: () => void;
  onProjectUpdate?: () => void;
  previewMode?: boolean;
  initialRfq?: ProjectRFQ | null;
}

export default function RFQTab({ 
  projectId, 
  project, 
  onNavigateToBids, 
  onProjectUpdate,
  previewMode = false,
  initialRfq = null
}: RFQTabProps) {
  const [rfq, setRfq] = useState<ProjectRFQ | null>(initialRfq);
  const [bidsCount, setBidsCount] = useState<number>(0);
  const [loading, setLoading] = useState(!previewMode);
  const [epcOrgs, setEpcOrgs] = useState<Organization[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // RFQ Creation Form State
  const [title, setTitle] = useState(`استعلام احداث و اجرای EPC نیروگاه خورشیدی ${project?.title || ''}`);
  const [scopeDescription, setScopeDescription] = useState('طراحی مهندسی، تأمین تجهیزات استاندارد Tier 1، نصب، تست، راه‌اندازی و اتصال به شبکه سراسری بر اساس استانداردهای ساتبا و توانیر.');
  const [deadlineDays, setDeadlineDays] = useState(21);
  const [minWarrantyYears, setMinWarrantyYears] = useState(5);
  const [requiredGuarantees, setRequiredGuarantees] = useState('ضمانت‌نامه بانکی حسن انجام کار ۵٪ و ضمانت راندمان تولید انرژی سالیانه (PR)');

  useEffect(() => {
    if (previewMode) {
      if (initialRfq) setRfq(initialRfq);
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId, previewMode, initialRfq]);

  const loadData = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 1. Fetch project RFQ
      const rfqRes = await fetch(`/api/rfq/project/${projectId}`, { headers });
      if (rfqRes.ok) {
        const rfqs = await rfqRes.json();
        if (Array.isArray(rfqs) && rfqs.length > 0) {
          const currentRfq = rfqs[0];
          setRfq(currentRfq);

          // Fetch bids count
          try {
            const bidsRes = await fetch(`/api/rfq/${currentRfq.id}/bids`, { headers });
            if (bidsRes.ok) {
              const bidsData = await bidsRes.json();
              setBidsCount(Array.isArray(bidsData) ? bidsData.length : 0);
            }
          } catch {
            setBidsCount(0);
          }
        } else {
          setRfq(null);
          setBidsCount(0);
        }
      }

      // 2. Fetch verified EPC organizations
      const orgRes = await fetch(`/api/rfq/organizations/epc`, { headers });
      if (orgRes.ok) {
        const orgs = await orgRes.json();
        setEpcOrgs(Array.isArray(orgs) ? orgs : []);
      }
    } catch (err) {
      console.error('Error loading RFQ data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + Number(deadlineDays));

      const payload = {
        projectId,
        title,
        scopeDescription,
        submissionDeadline: deadline.toISOString(),
        requiredGuarantees: requiredGuarantees.split('\n').filter(Boolean),
        commercialTerms: {
          minWarrantyYears: Number(minWarrantyYears),
          penaltyPerDayLateIRR: 50000000
        },
        technicalRequirements: {
          minPanelEfficiencyPercent: 21.0,
          inverterType: 'STRING' as const,
          monitoringSystemRequired: true
        }
      };

      const res = await fetch('/api/rfq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newRfq = await res.json();
        setRfq(newRfq);
        setIsCreating(false);
        setActionMessage({ type: 'success', text: `استعلام با کد رسمی ${newRfq.rfqCode} با موفقیت در حالت پیش‌نویس ایجاد شد.` });
        if (onProjectUpdate) onProjectUpdate();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'خطا در ایجاد استعلام' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishRFQ = async () => {
    if (!rfq) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rfq/${rfq.id}/publish`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const updated = await res.json();
        setRfq(updated);
        setActionMessage({ type: 'success', text: 'استعلام با موفقیت منتشر شد و در انتظار دریافت پیشنهادات پیمانکاران است.' });
        if (onProjectUpdate) onProjectUpdate();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'خطا در انتشار استعلام' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطا در ارتباط با سرور' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRFQConfirm = async () => {
    if (!rfq) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rfq/${rfq.id}/close`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const updated = await res.json();
        setRfq(updated);
        setIsCloseModalOpen(false);
        setActionMessage({ type: 'success', text: 'استعلام بسته شد. پیشنهادات دریافتی آماده ارزیابی و انتخاب نهایی هستند.' });
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'خطا در بستن استعلام' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطا در ارتباط با سرور' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteEPC = async (orgId: string) => {
    if (!rfq) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rfq/${rfq.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ organizationId: orgId })
      });

      if (res.ok) {
        const updated = await res.json();
        setRfq(updated);
        setActionMessage({ type: 'success', text: 'دعوت‌نامه رسمی مناقصه برای پیمانکار ارسال گردید.' });
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'خطا در ارسال دعوت‌نامه' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطا در ارتباط با سرور' });
    }
  };

  // Human-readable Persian mapping for RFQ statuses (never expose raw enums)
  const getStatusBadge = (status: RFQStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            پیش‌نویس (منتشر نشده)
          </span>
        );
      case 'PUBLISHED':
      case 'OPEN':
        return (
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-50 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse" />
            منتشر شده (در حال دریافت پیشنهاد)
          </span>
        );
      case 'CLOSED':
        return (
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
            بسته شده (پایان مهلت)
          </span>
        );
      case 'AWARDED':
        return (
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            مجری انتخاب شده
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            لغو شده
          </span>
        );
      default:
        return (
          <span className="text-xs px-3 py-1 rounded-full font-bold bg-slate-100 text-slate-700">
            نامشخص
          </span>
        );
    }
  };

  const locationText = project?.location?.city 
    ? (project.location.province ? `${project.location.province}، ${project.location.city}` : project.location.city)
    : (project?.location?.address || 'ثبت نشده');

  const capacityText = project?.targetCapacityKw 
    ? formatSolarCapacity(project.targetCapacityKw)
    : 'ثبت نشده';

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center font-bold text-slate-500">
        در حال بارگذاری اطلاعات استعلام...
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'}`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
          <span className="text-sm font-bold">{actionMessage.text}</span>
        </div>
      )}

      {/* NO RFQ CREATED YET */}
      {!rfq && !isCreating && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm text-center py-16">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">هنوز استعلام قیمتی (RFQ) برای این پروژه ایجاد نشده است</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            برای دریافت پیشنهادات فنی و مالی از پیمانکاران EPC تایید صلاحیت شده، اسناد استعلام پروژه را تنظیم و منتشر فرمایید.
          </p>
          <button 
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md inline-flex items-center gap-2 min-h-[44px] cursor-pointer"
          >
            <Plus size={18} />
            تنظیم و صدور استعلام EPC
          </button>
        </div>
      )}

      {/* CREATE RFQ FORM */}
      {!rfq && isCreating && (
        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-zinc-800 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">صدور استعلام قیمت و صلاحیت EPC (RFQ)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">مشخصات فنی و شرایط حقوقی مناقصه را تکمیل فرمایید.</p>
            </div>
            <button 
              type="button" 
              onClick={() => setIsCreating(false)} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold min-h-[44px] px-3 flex items-center"
            >
              انصراف
            </button>
          </div>

          <form onSubmit={handleCreateRFQ} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">عنوان استعلام</label>
              <input 
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-[#0284C7] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">شرح محدوده خدمات (Scope of Work)</label>
              <textarea 
                rows={3}
                required
                value={scopeDescription}
                onChange={e => setScopeDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-[#0284C7] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none text-sm leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">مهلت دریافت پیشنهادات (روز)</label>
                <input 
                  type="number"
                  min={5}
                  max={90}
                  value={deadlineDays}
                  onChange={e => setDeadlineDays(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-[#0284C7] outline-none text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">حداقل گارانتی مورد نیاز (سال)</label>
                <input 
                  type="number"
                  min={1}
                  max={25}
                  value={minWarrantyYears}
                  onChange={e => setMinWarrantyYears(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-[#0284C7] outline-none text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">ظرفیت مدنظر پروژه</label>
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700">
                  {capacityText}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">تضامین و شرایط حقوقی الزامی</label>
              <textarea 
                rows={2}
                value={requiredGuarantees}
                onChange={e => setRequiredGuarantees(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-[#0284C7] outline-none text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)} 
                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold text-sm min-h-[44px]"
              >
                انصراف
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-md text-sm disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {submitting ? 'در حال ثبت...' : 'ثبت و صدور استعلام (پیش‌نویس)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE RFQ VIEW */}
      {rfq && (
        <div className="space-y-6">
          {/* 1. RFQ OVERVIEW HEADER */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5 mb-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                    {rfq.rfqCode}
                  </span>
                  {getStatusBadge(rfq.status)}
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin size={13} className="text-slate-400" />
                    <span>موقعیت: {locationText}</span>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 pt-1">
                  {rfq.title}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  پروژه: <strong className="text-slate-700 dark:text-slate-300 font-bold">{project.title || 'بدون عنوان'}</strong>
                  <span className="mx-2">•</span>
                  ظرفیت هدف: <strong className="text-slate-700 dark:text-slate-300 font-bold">{capacityText}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {rfq.status === 'DRAFT' && (
                  <button 
                    type="button"
                    onClick={handlePublishRFQ}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-xs sm:text-sm shadow-sm flex items-center gap-2 min-h-[44px] cursor-pointer"
                  >
                    <Send size={16} />
                    <span>انتشار رسمی استعلام</span>
                  </button>
                )}

                {(rfq.status === 'PUBLISHED' || rfq.status === 'OPEN') && (
                  <button 
                    type="button"
                    onClick={() => setIsCloseModalOpen(true)}
                    disabled={submitting}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold transition-colors text-xs min-h-[44px] cursor-pointer"
                  >
                    بستن دریافت پیشنهاد
                  </button>
                )}

                {onNavigateToBids && (
                  <button 
                    type="button"
                    onClick={onNavigateToBids}
                    className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-xs sm:text-sm flex items-center gap-2 shadow-sm min-h-[44px] cursor-pointer"
                  >
                    <Eye size={16} />
                    <span>مشاهده پیشنهادها ({bidsCount > 0 ? `${bidsCount} پیشنهاد` : 'بدون پیشنهاد'})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Lifecycle Stages Progress Bar */}
            <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">
                چرخه حیات استعلام و فرآیند انتخاب مجری:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  rfq.status === 'DRAFT' 
                    ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 font-bold' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                }`}>
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>۱. تنظیم پیش‌نویس</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  rfq.status === 'PUBLISHED' || rfq.status === 'OPEN'
                    ? 'bg-blue-50 border-blue-300 text-[#0284C7] dark:bg-blue-950/30 dark:text-blue-200 font-bold'
                    : (rfq.status === 'CLOSED' || rfq.status === 'AWARDED')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-slate-400'
                }`}>
                  <Clock size={15} className="shrink-0" />
                  <span>۲. دریافت پیشنهادات</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  rfq.status === 'CLOSED'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 font-bold'
                    : rfq.status === 'AWARDED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-slate-400'
                }`}>
                  <FileCheck2 size={15} className="shrink-0" />
                  <span>۳. ارزیابی تطبیقی</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  rfq.status === 'AWARDED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 font-bold'
                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-slate-400'
                }`}>
                  <Check size={15} className="shrink-0" />
                  <span>۴. انتخاب رسمی مجری</span>
                </div>
              </div>
            </div>

            {/* Key Authoritative Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl mb-6 border border-slate-100 dark:border-zinc-800 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1 font-bold">مهلت ارسال پیشنهاد</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock size={15} className="text-[#0284C7]" />
                  {rfq.submissionDeadline ? formatJalaliDate(rfq.submissionDeadline) : 'مهلت مشخص نشده است'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1 font-bold">پیشنهادهای دریافتی</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users size={15} className="text-emerald-600" />
                  {bidsCount > 0 ? `${bidsCount} پیشنهاد ثبت‌شده` : 'هنوز پیشنهادی دریافت نشده است'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1 font-bold">حداقل گارانتی الزامی</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-amber-500" />
                  {rfq.commercialTerms?.minWarrantyYears ? `${rfq.commercialTerms.minWarrantyYears} سال` : 'ثبت نشده'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1 font-bold">تعداد شرکت‌های دعوت‌شده</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 size={15} className="text-indigo-500" />
                  {rfq.invitedContractorIds && rfq.invitedContractorIds.length > 0 
                    ? `${rfq.invitedContractorIds.length} شرکت EPC` 
                    : 'عمومی (همه پیمانکاران معتبر)'}
                </span>
              </div>
            </div>

            {/* Scope and Requirements */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">شرح خدمات و الزامات مهندسی پروژه</h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-750 p-3.5 rounded-xl">
                  {rfq.scope || rfq.scopeDescription || rfq.description || 'ثبت نشده'}
                </p>
              </div>

              {rfq.requiredGuarantees && rfq.requiredGuarantees.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">تضامین و شرایط حقوقی الزامی</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-750 p-3.5 rounded-xl">
                    {rfq.requiredGuarantees.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 2. SECURE RFQ DOCUMENTS & REQUIRED DOCUMENTS */}
          <RFQDocumentsManager 
            rfqId={rfq.id}
            isOwner={true}
            requiredDocuments={rfq.requiredDocuments || []}
          />

          {/* 3. EPC CONTRACTOR INVITATIONS */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 size={20} className="text-[#0284C7]" />
                  پیمانکاران EPC احراز صلاحیت شده هوشیار انرژی
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  می‌توانید شرکت‌های رتبه‌بندی شده توسط سامانه را مستقیماً به شرکت در این استعلام دعوت نمایید.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {epcOrgs.map((epc) => {
                const isInvited = rfq.invitedContractorIds?.includes(epc.id);

                return (
                  <div key={epc.id} className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3 bg-white dark:bg-zinc-850 hover:border-blue-200 transition-colors text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800 flex items-center gap-1 text-[11px]">
                          <Check size={12} />
                          EPC تایید صلاحیت شده
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">شناسه: {epc.nationalId || '—'}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">{epc.tradeName || epc.legalName}</h4>
                      <p className="text-slate-500 dark:text-slate-400 line-clamp-1">{epc.legalName}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">ثبت: {epc.registrationNumber || '—'}</span>
                      {isInvited ? (
                        <span className="text-xs font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          دعوت شده
                        </span>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleInviteEPC(epc.id)}
                          className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] cursor-pointer"
                        >
                          ارسال دعوت‌نامه
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Closing RFQ (Zero Native confirm) */}
      <PersianConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={handleCloseRFQConfirm}
        title="بستن مهلت دریافت پیشنهادات استعلام"
        message="آیا از بستن این استعلام اطمینان دارید؟ پس از بستن، پیمانکاران دیگر امکان ارسال پیشنهاد جدید نخواهند داشت و پیشنهادات فعلی وارد فرآیند ارزیابی نهایی خواهند شد."
        confirmText="تایید و بستن استعلام"
        cancelText="انصراف"
        variant="warning"
        isSubmitting={submitting}
      />
    </div>
  );
}
