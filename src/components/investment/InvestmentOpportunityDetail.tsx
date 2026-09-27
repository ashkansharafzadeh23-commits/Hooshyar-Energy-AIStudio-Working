import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Zap, 
  Coins, 
  ShieldCheck, 
  Layers, 
  FileText, 
  Share2, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { InvestmentOpportunity, ProjectReadinessScore } from '../../types/investment';
import { InvestmentReadiness } from './InvestmentReadiness';
import { InvestmentDataRoomSummary } from './InvestmentDataRoomSummary';
import { InvestmentMatchExplanation } from './InvestmentMatchExplanation';
import { formatSolarCapacity } from '../../utils/formatters';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface InvestmentOpportunityDetailProps {
  opportunity: InvestmentOpportunity;
  readiness?: ProjectReadinessScore | null;
  matchScore?: number;
  matchReasons?: string[];
  onBack?: () => void;
  onDeclareInterest?: () => void;
  isInterested?: boolean;
}

export const InvestmentOpportunityDetail: React.FC<InvestmentOpportunityDetailProps> = ({
  opportunity,
  readiness,
  matchScore,
  matchReasons,
  onBack,
  onDeclareInterest,
  isInterested = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'readiness' | 'dataroom'>('overview');
  const [copied, setCopied] = useState(false);

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

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 mb-4 cursor-pointer min-h-[44px]"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به فهرست فرصت‌ها</span>
          </button>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                {opportunity.opportunityCode}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                مرحله: {opportunity.projectStage}
              </span>
              <DataTruthBadge provenance="VERIFIED_SOURCE" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-2">
              {opportunity.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              {opportunity.summary || 'خلاصه طرح ثبت نشده است.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-50 cursor-pointer min-h-[44px]"
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'کپی شد' : 'اشتراک‌گذاری'}</span>
            </button>

            {onDeclareInterest && (
              <button
                type="button"
                onClick={onDeclareInterest}
                disabled={isInterested}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer min-h-[44px] ${
                  isInterested
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isInterested ? 'علاقه‌مندی شما ثبت شد' : 'اعلام علاقه‌مندی به بررسی'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Factual Key Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
            <span className="text-[11px] text-slate-400 block mb-1">موقعیت ساختگاه:</span>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{opportunity.location.province}، {opportunity.location.city}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
            <span className="text-[11px] text-slate-400 block mb-1">ظرفیت هدف:</span>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{opportunity.targetCapacityKw ? formatSolarCapacity(opportunity.targetCapacityKw) : 'ثبت نشده'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
            <span className="text-[11px] text-slate-400 block mb-1">سرمایه مورد نیاز:</span>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
              <Coins className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{formatMoney(opportunity.capitalRequirement?.capitalRequired || opportunity.minimumPartnerCapital)}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
            <span className="text-[11px] text-slate-400 block mb-1">وضعیت زمین ساختگاه:</span>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
              <Layers className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{opportunity.landStatus || 'در حال بررسی'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 space-x-reverse border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          مشخصات کلی و انطباق
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('readiness')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'readiness'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          ارزیابی آمادگی پروژه
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dataroom')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'dataroom'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          اتاق اسناد و مدارک (Data Room)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Match Explanation if match exists */}
          {matchReasons && matchReasons.length > 0 && (
            <InvestmentMatchExplanation
              reasons={matchReasons}
              opportunityContext={{
                province: opportunity.location.province,
                stage: opportunity.projectStage,
                requiredCapital: opportunity.capitalRequirement?.capitalRequired,
                capacityKw: opportunity.targetCapacityKw
              }}
            />
          )}

          {/* Capital Requirement Breakdown */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-zinc-800">
              <Coins className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                برآورد نیازمندی‌های سرمایه‌ای و ساختار مالی طرح
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[11px] text-slate-400 block mb-1">کل هزینه سرمایه‌گذاری (CAPEX):</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                  {formatMoney(opportunity.capitalRequirement?.totalProjectCapex)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[11px] text-slate-400 block mb-1">آورده نقدی/غیرنقدی کارفرما:</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                  {formatMoney(opportunity.capitalRequirement?.ownerEquity)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <span className="text-[11px] text-blue-600 dark:text-blue-300 block mb-1">سرمایه موردنیاز از شریک:</span>
                <span className="text-sm font-black text-blue-900 dark:text-blue-100">
                  {formatMoney(opportunity.capitalRequirement?.capitalRequired || opportunity.minimumPartnerCapital)}
                </span>
              </div>
            </div>
          </div>

          {/* Legal and Technical Readiness Overview */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 pb-3 border-b border-slate-200 dark:border-zinc-800">
              وضعیت مجوزها، اتصال شبکه و شبیه‌سازی
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-slate-400 block mb-1">مجوز احداث:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{opportunity.permitStatus || 'در حال پیگیری'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-slate-400 block mb-1">اتصال به شبکه برق:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{opportunity.gridConnectionStatus || 'درخواست شده'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-slate-400 block mb-1">مدل مهندسی تابش:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{opportunity.engineeringStatus || 'انجام‌شده'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-slate-400 block mb-1">وضعیت پیمانکار EPC:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{opportunity.epcStatus || 'ثبت نشده'}</span>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed text-justify">
            <strong>سلب مسئولیت قانونی:</strong> سامانه هوشیار انرژی به عنوان بستر زیرساخت دیجیتال پروژه‌های خورشیدی فعالیت دارد و نهاد مالی، بانک، صندوق سرمایه‌گذاری یا بازار اوراق بهادار نمی‌باشد. اطلاعات فوق بر مبنای اظهار کارفرما و شبیه‌سازی مهندسی ثبت شده و هرگونه انعقاد قرارداد منوط به ارزیابی موشکافانه (Due Diligence) طرفین خواهد بود.
          </div>
        </div>
      )}

      {activeTab === 'readiness' && (
        <InvestmentReadiness readiness={readiness} projectStatus={opportunity.projectStage} />
      )}

      {activeTab === 'dataroom' && (
        <InvestmentDataRoomSummary />
      )}
    </div>
  );
};
