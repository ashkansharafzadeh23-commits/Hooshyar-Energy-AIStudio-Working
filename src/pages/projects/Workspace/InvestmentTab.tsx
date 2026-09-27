import React, { useState, useEffect } from 'react';
import { EnergyProject } from '../../../types/project';
import { InvestmentOpportunity, ProjectReadinessScore } from '../../../types/investment';
import { 
  Loader2, 
  Coins, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Plus,
  Building2,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { InvestmentReadiness } from '../../../components/investment/InvestmentReadiness';
import { InvestmentDataRoomSummary } from '../../../components/investment/InvestmentDataRoomSummary';
import { DataTruthBadge } from '../../../components/common/DataTruthBadge';

interface InvestmentTabProps {
  project: EnergyProject;
}

export const InvestmentTab: React.FC<InvestmentTabProps> = ({ project }) => {
  const [opportunity, setOpportunity] = useState<InvestmentOpportunity | null>(null);
  const [readiness, setReadiness] = useState<ProjectReadinessScore | null>(null);
  const [financialModel, setFinancialModel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Form states - strictly user entered or prefilled from genuine sources, no fake numbers
  const [partnerEquityGapPercent, setPartnerEquityGapPercent] = useState<number | ''>('');
  const [minCapitalMillionToman, setMinCapitalMillionToman] = useState<number | ''>('');
  const [partnerType, setPartnerType] = useState<string>('شرکت سرمایه‌گذاری یا شریک صنعتی');
  const [oppTitle, setOppTitle] = useState<string>(project.title ? `فرصت سرمایه‌گذاری: ${project.title}` : '');
  const [oppSummary, setOppSummary] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchInvestmentData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch opportunity
      const oppRes = await fetch(`/api/investment/projects/${project.id}/opportunity`, { headers });
      if (oppRes.ok) {
        const oppData = await oppRes.json();
        setOpportunity(oppData);
        if (oppData.title) setOppTitle(oppData.title);
        if (oppData.summary) setOppSummary(oppData.summary);
      }

      // 2. Fetch readiness
      const readyRes = await fetch(`/api/investment/projects/${project.id}/readiness`, { headers });
      if (readyRes.ok) {
        setReadiness(await readyRes.json());
      }

      // 3. Fetch financial model for capex
      const finRes = await fetch(`/api/projects/${project.id}/financial-models`, { headers });
      if (finRes.ok) {
        const finData = await finRes.json();
        if (finData.length > 0) {
          setFinancialModel(finData[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestmentData();
  }, [project.id]);

  const handlePublishOpportunity = async () => {
    setFormError(null);
    if (!oppTitle.trim()) {
      setFormError('لطفاً عنوان فرصت سرمایه‌گذاری را وارد نمایید.');
      return;
    }
    if (partnerEquityGapPercent === '' || Number(partnerEquityGapPercent) <= 0 || Number(partnerEquityGapPercent) > 100) {
      setFormError('لطفاً درصد تأمین سرمایه از شریک را به درستی تعیین نمایید (بین ۱ تا ۱۰۰).');
      return;
    }
    if (minCapitalMillionToman === '' || Number(minCapitalMillionToman) <= 0) {
      setFormError('لطفاً حداقل سرمایه پذیرفته‌شده از هر شریک را مشخص نمایید.');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const totalCapexToman = financialModel?.results?.totalCapex?.amount 
        || (project.estimatedBudget?.amount ? project.estimatedBudget.amount / 10 : (project.estimatedBudgetIRR ? project.estimatedBudgetIRR / 10 : undefined));
      
      const capitalRequired = totalCapexToman ? Math.round(totalCapexToman * (Number(partnerEquityGapPercent) / 100)) : undefined;
      const ownerEquity = (totalCapexToman && capitalRequired) ? totalCapexToman - capitalRequired : undefined;

      const oppPayload: Record<string, any> = {
        title: oppTitle.trim(),
        summary: oppSummary.trim() || undefined,
        type: 'PROJECT_SEEKING_CAPITAL',
        status: 'PUBLISHED',
        visibility: 'PUBLIC_SUMMARY',
        projectStage: project.status,
        targetCapacityKw: project.targetCapacityKw,
        location: {
          province: project.location?.province || 'نامشخص',
          city: project.location?.city || 'نامشخص'
        },
        landStatus: project.site?.type ? 'OWNED' : 'UNKNOWN',
        permitStatus: 'IN_PROGRESS',
        gridConnectionStatus: project.energyRequirement?.gridConnected ? 'APPROVED' : 'REQUESTED',
        engineeringStatus: 'IN_PROGRESS',
        financialModelStatus: financialModel ? 'COMPLETE' : 'IN_PROGRESS',
        epcStatus: project.status === 'EPC_SELECTED' ? 'SELECTED' : 'NOT_STARTED',
        capitalRequirement: totalCapexToman ? {
          totalProjectCapex: totalCapexToman,
          ownerEquity: ownerEquity,
          capitalRequired: capitalRequired
        } : undefined,
        minimumPartnerCapital: Number(minCapitalMillionToman) ? Number(minCapitalMillionToman) * 1000000 : undefined,
        preferredPartnerType: partnerType
      };

      const res = await fetch(`/api/investment/projects/${project.id}/opportunity`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(oppPayload)
      });

      if (res.ok) {
        setShowSetupModal(false);
        await fetchInvestmentData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (val?: number) => {
    if (val === undefined || val === null || val <= 0) return 'ثبت نشده';
    if (val >= 1000000000) {
      return `${(val / 1000000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد تومان`;
    }
    if (val >= 1000000) {
      return `${(val / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} میلیون تومان`;
    }
    return `${val.toLocaleString('fa-IR')} تومان`;
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center font-Vazirmatn">
        <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
        <p className="text-xs text-slate-500">در حال دریافت اطلاعات سرمایه‌گذاری طرح...</p>
      </div>
    );
  }

  const totalCapex = opportunity?.capitalRequirement?.totalProjectCapex 
    || financialModel?.results?.totalCapex?.amount;
  
  const capitalRequired = opportunity?.capitalRequirement?.capitalRequired;
  const ownerEquity = opportunity?.capitalRequirement?.ownerEquity;

  return (
    <div className="space-y-6 font-Vazirmatn py-2">
      {/* Top Banner Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-2xs border border-slate-200 dark:border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
              هاب سرمایه‌گذاری و جذب شریک تجاری
            </h2>
            {opportunity ? (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg flex items-center gap-1">
                <CheckCircle2 size={14} />
                <span>منتشر شده در بازار فرصت‌ها ({opportunity.opportunityCode})</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg">
                هنوز در بازار منتشر نشده است
              </span>
            )}
            <DataTruthBadge provenance="VERIFIED_SOURCE" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            ارزیابی آمادگی پروژه، ساختار سرمایه‌گذاری و معرفی به سرمایه‌گذاران معتبر صنعتی و نهادی
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer min-h-[44px]"
          >
            {opportunity ? 'ویرایش شرایط جذب سرمایه' : 'انتشار پروژه در بازار سرمایه‌گذاری'}
          </button>
          
          <Link
            to="/investment-hub"
            className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-200 flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700 min-h-[44px]"
          >
            <ExternalLink size={16} />
            <span>مشاهده هاب سرمایه‌گذاری</span>
          </Link>
        </div>
      </div>

      {/* Financial Capital Structure */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <Coins className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
            ساختار سرمایه و شکاف تأمین مالی طرح
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
            <span className="text-[11px] text-slate-400 block mb-1">کل هزینه برآورد شده (CAPEX):</span>
            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {formatMoney(totalCapex)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
            <span className="text-[11px] text-slate-400 block mb-1">آورده متقاضی (سهم کارفرما):</span>
            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {formatMoney(ownerEquity)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <span className="text-[11px] text-blue-600 dark:text-blue-300 block mb-1">سرمایه مورد نیاز از شریک:</span>
            <span className="text-sm font-black text-blue-950 dark:text-blue-100 font-mono">
              {formatMoney(capitalRequired)}
            </span>
          </div>
        </div>
      </div>

      {/* Investment Readiness Component */}
      <InvestmentReadiness readiness={readiness} projectStatus={project.status} />

      {/* Data Room Summary */}
      <InvestmentDataRoomSummary />

      {/* Setup / Edit Opportunity Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-Vazirmatn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {opportunity ? 'ویرایش مشخصات انتشار سرمایه‌گذاری' : 'تنظیم و انتشار فرصت در بازار B2B'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold">
                {formError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  عنوان فرصت سرمایه‌گذاری *
                </label>
                <input
                  type="text"
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  placeholder="مثال: فرصت مشارکت در احداث نیروگاه خورشیدی ۱۰ مگاواتی"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  شرح و خلاصه طرح (اختیاری)
                </label>
                <textarea
                  rows={2}
                  value={oppSummary}
                  onChange={(e) => setOppSummary(e.target.value)}
                  placeholder="توضیحات تکمیلی پیرامون وضعیت و جذابیت‌های طرح..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  درصد تأمین سرمایه از شریک (از کل CAPEX) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="مثال: ۶۰"
                    value={partnerEquityGapPercent}
                    onChange={(e) => setPartnerEquityGapPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 font-mono text-xs"
                  />
                  <span className="font-mono font-bold text-sm text-slate-600 dark:text-zinc-400">٪</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  حداقل سرمایه پذیرفته‌شده از هر شریک (میلیون تومان) *
                </label>
                <input
                  type="number"
                  placeholder="مثال: ۵۰۰"
                  value={minCapitalMillionToman}
                  onChange={(e) => setMinCapitalMillionToman(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  نوع شریک مدنظر
                </label>
                <select
                  value={partnerType}
                  onChange={(e) => setPartnerType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs"
                >
                  <option value="شرکت سرمایه‌گذاری یا شریک صنعتی">شرکت سرمایه‌گذاری یا شریک صنعتی</option>
                  <option value="سرمایه‌گذار حقیقی معتبر">سرمایه‌گذار حقیقی معتبر</option>
                  <option value="صندوق پژوهش و فناوری">صندوق پژوهش و فناوری</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handlePublishOpportunity}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer min-h-[44px]"
              >
                {saving ? 'در حال ثبت...' : 'انتشار در بازار فرصت‌ها'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
