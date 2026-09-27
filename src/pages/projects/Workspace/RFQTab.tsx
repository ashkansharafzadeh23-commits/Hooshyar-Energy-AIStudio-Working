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
  ExternalLink
} from 'lucide-react';
import { ProjectRFQ } from '../../../types/rfq.js';
import { Organization } from '../../../types/organization.js';

interface RFQTabProps {
  projectId: string;
  project: any;
  onNavigateToBids?: () => void;
  onProjectUpdate?: () => void;
}

export default function RFQTab({ projectId, project, onNavigateToBids, onProjectUpdate }: RFQTabProps) {
  const [rfq, setRfq] = useState<ProjectRFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [epcOrgs, setEpcOrgs] = useState<Organization[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // RFQ Creation Form State
  const [title, setTitle] = useState(`استعلام احداث و اجرای EPC نیروگاه خورشیدی ${project.title || ''}`);
  const [scopeDescription, setScopeDescription] = useState('طراحی مهندسی، تأمین تجهیزات استاندارد Tier 1، نصب، تست، راه‌اندازی و اتصال به شبکه سراسری بر اساس استانداردهای ساتبا و توانیر.');
  const [deadlineDays, setDeadlineDays] = useState(21);
  const [minWarrantyYears, setMinWarrantyYears] = useState(5);
  const [requiredGuarantees, setRequiredGuarantees] = useState('ضمانت‌نامه بانکی حسن انجام کار ۵٪ و ضمانت راندمان تولید انرژی سالیانه (PR)');

  useEffect(() => {
    loadData();
  }, [projectId]);

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
          setRfq(rfqs[0]);
        } else {
          setRfq(null);
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
        setActionMessage({ type: 'success', text: 'استعلام با موفقیت منتشر شد و پروژه به وضعیت «استعلام فعال (RFQ_OPEN)» منتقل شد.' });
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

  const handleCloseRFQ = async () => {
    if (!rfq) return;
    if (!confirm('آیا از بستن مهلت دریافت پیشنهادات اطمینان دارید؟')) return;
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
        setActionMessage({ type: 'success', text: 'استعلام بسته شد. پیشنهادات دریافتی آماده ارزیابی نهایی هستند.' });
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

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center font-bold text-gray-500">
        در حال بارگذاری اطلاعات استعلام...
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
          <span className="text-sm font-bold">{actionMessage.text}</span>
        </div>
      )}

      {/* NO RFQ CREATED YET */}
      {!rfq && !isCreating && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center py-16">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={40} />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">هنوز استعلام قیمتی (RFQ) ایجاد نشده است</h3>
          <p className="text-gray-500 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            برای دریافت پیشنهادات فنی و مالی از پیمانکاران EPC تایید صلاحیت شده، اسناد استعلام پروژه را تنظیم و منتشر کنید.
          </p>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md inline-flex items-center gap-2"
          >
            <Plus size={18} />
            تنظیم و صدور استعلام EPC
          </button>
        </div>
      )}

      {/* CREATE RFQ FORM */}
      {!rfq && isCreating && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900">صدور استعلام قیمت و صلاحیت EPC (RFQ)</h2>
              <p className="text-xs text-gray-500 mt-1">مشخصات فنی و شرایط حقوقی مناقصه را تکمیل فرمایید.</p>
            </div>
            <button 
              type="button" 
              onClick={() => setIsCreating(false)} 
              className="text-gray-400 hover:text-gray-600 text-sm font-bold"
            >
              انصراف
            </button>
          </div>

          <form onSubmit={handleCreateRFQ} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">عنوان استعلام</label>
              <input 
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">شرح محدوده خدمات (Scope of Work)</label>
              <textarea 
                rows={3}
                required
                value={scopeDescription}
                onChange={e => setScopeDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">مهلت دریافت پیشنهادات (روز)</label>
                <input 
                  type="number"
                  min={5}
                  max={90}
                  value={deadlineDays}
                  onChange={e => setDeadlineDays(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">حداقل گارانتی مورد نیاز (سال)</label>
                <input 
                  type="number"
                  min={1}
                  max={25}
                  value={minWarrantyYears}
                  onChange={e => setMinWarrantyYears(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">ظرفیت مدنظر پروژه</label>
                <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-bold text-gray-700 border border-gray-200">
                  {project.targetCapacityKw ? `${project.targetCapacityKw} کیلووات` : 'طبق تحلیل اولیه'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">تضامین و شرایط حقوقی الزامی</label>
              <textarea 
                rows={2}
                value={requiredGuarantees}
                onChange={e => setRequiredGuarantees(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)} 
                className="px-5 py-2.5 text-gray-600 rounded-xl hover:bg-gray-100 font-bold text-sm"
              >
                انصراف
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md text-sm disabled:opacity-50"
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
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                    {rfq.rfqCode}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                    rfq.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    rfq.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {rfq.status === 'PUBLISHED' ? 'منتشر شده (در حال دریافت پیشنهاد)' :
                     rfq.status === 'DRAFT' ? 'پیش‌نویس (منتشر نشده)' :
                     rfq.status === 'CLOSED' ? 'بسته شده' : rfq.status}
                  </span>
                </div>
                <h2 className="text-xl font-black text-gray-900 pt-1">{rfq.title}</h2>
              </div>

              <div className="flex items-center gap-2">
                {rfq.status === 'DRAFT' && (
                  <button 
                    onClick={handlePublishRFQ}
                    disabled={submitting}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm shadow-sm flex items-center gap-2"
                  >
                    <Send size={16} />
                    انتشار رسمی استعلام
                  </button>
                )}
                {rfq.status === 'PUBLISHED' && (
                  <button 
                    onClick={handleCloseRFQ}
                    disabled={submitting}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm"
                  >
                    بستن دریافت پیشنهاد
                  </button>
                )}
                {onNavigateToBids && (
                  <button 
                    onClick={onNavigateToBids}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 shadow-sm"
                  >
                    <Eye size={16} />
                    مشاهده پیشنهادها
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl mb-6">
              <div>
                <span className="text-xs text-gray-400 block mb-1 font-bold">مهلت ارسال پیشنهاد</span>
                <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                  <Clock size={16} className="text-blue-500" />
                  {new Date(rfq.submissionDeadline).toLocaleDateString('fa-IR')}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1 font-bold">تعداد دعوت‌شدگان</span>
                <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                  <Users size={16} className="text-emerald-500" />
                  {rfq.invitedContractorIds?.length || 0} شرکت EPC
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1 font-bold">حداقل گارانتی الزامی</span>
                <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-amber-500" />
                  {rfq.commercialTerms?.minWarrantyYears || 5} سال
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1 font-bold">راندمان پنل Tier 1</span>
                <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                  <Zap size={16} className="text-indigo-500" />
                  حداقل ۲۱٪
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-1">شرح خدمات و الزامات پروژه</h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-white border border-gray-100 p-3 rounded-xl">
                  {rfq.scope || rfq.scopeDescription || rfq.description}
                </p>
              </div>

              {rfq.requiredGuarantees && rfq.requiredGuarantees.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-1.5">تضامین و شرایط حقوقی</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-600 bg-white border border-gray-100 p-3 rounded-xl">
                    {rfq.requiredGuarantees.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* EPC CONTRACTOR INVITATIONS */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Building2 size={20} className="text-blue-600" />
                  پیمانکاران EPC احراز صلاحیت شده هوشیار
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  می‌توانید شرکت‌های رتبه‌بندی شده را مستقیماً به شرکت در این استعلام دعوت نمایید.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {epcOrgs.map((epc) => {
                const isInvited = rfq.invitedContractorIds?.includes(epc.id);

                return (
                  <div key={epc.id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between gap-4 bg-white hover:border-blue-200 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                          <Check size={12} />
                          EPC تایید شده
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">شناسه: {epc.nationalId}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{epc.tradeName || epc.legalName}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{epc.legalName}</p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">شماره ثبت: {epc.registrationNumber}</span>
                      {isInvited ? (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          دعوت شده
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleInviteEPC(epc.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                        >
                          دعوت به استعلام
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
    </div>
  );
}
