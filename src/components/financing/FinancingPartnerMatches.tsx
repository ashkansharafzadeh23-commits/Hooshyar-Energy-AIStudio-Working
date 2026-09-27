import React, { useState } from 'react';
import { Users, Filter, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { FinancialPartnerProfile, PartnerMatchingResult, FinancingRequest } from '../../types/financing';
import { FinancingPartnerCard } from './FinancingPartnerCard';
import { FinancingEmptyState } from './FinancingEmptyState';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingPartnerMatchesProps {
  requestId: string;
  partners: (FinancialPartnerProfile | any)[];
  matchingResults?: PartnerMatchingResult[];
  submittedPartnerIds?: string[];
  onSubmitToPartner: (partnerId: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const FinancingPartnerMatches: React.FC<FinancingPartnerMatchesProps> = ({
  requestId,
  partners,
  matchingResults = [],
  submittedPartnerIds = [],
  onSubmitToPartner,
  isSubmitting = false
}) => {
  const [submittingPartnerId, setSubmittingPartnerId] = useState<string | null>(null);
  const [filterOnlyEligible, setFilterOnlyEligible] = useState(false);

  const handleSubmit = async (partnerId: string) => {
    setSubmittingPartnerId(partnerId);
    try {
      await onSubmitToPartner(partnerId);
    } finally {
      setSubmittingPartnerId(null);
    }
  };

  const displayedPartners = partners.filter((p) => {
    if (!filterOnlyEligible) return true;
    const match = matchingResults.find((m) => m.partnerId === p.id);
    return match ? (match.eligibilityStatus === 'ELIGIBLE' || (match as any).eligibility === 'ELIGIBLE') : true;
  });

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                نهادهای مالی همکار و تطابق ضوابط اعتباری
              </h3>
              <DataTruthBadge provenance="CALCULATED" />
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              ارزیابی خودکار تطابق سقف تسهیلات، حوزه جغرافیایی و مرحله تکوین طرح با خط‌مشی نهادهای مالی
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFilterOnlyEligible(!filterOnlyEligible)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[44px] ${
                filterOnlyEligible
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>فقط نهادهای منطبق با شرایط</span>
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <span>
            ارسال پرونده به نهاد مالی به منزله آغاز رسمی بررسی مدارک اعتباری و شبیه‌سازی مهندسی است. اطلاعات صرفاً در چارچوب محرمانگی بانکی و با مجوز شما به نهاد مربوطه منتقل خواهد شد.
          </span>
        </div>
      </div>

      {/* Grid of Partners */}
      {displayedPartners.length === 0 ? (
        <FinancingEmptyState
          type="NO_MATCHES"
          actionText={filterOnlyEligible ? 'نمایش همه نهادها' : undefined}
          onAction={() => setFilterOnlyEligible(false)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedPartners.map((partner) => {
            const match = matchingResults.find((m) => m.partnerId === partner.id);
            const isSubmitted = submittedPartnerIds.includes(partner.id);
            const isThisSubmitting = submittingPartnerId === partner.id;

            return (
              <FinancingPartnerCard
                key={partner.id}
                partner={partner}
                matchingResult={match}
                isSubmitted={isSubmitted}
                isSubmitting={isThisSubmitting}
                onSubmitToPartner={() => handleSubmit(partner.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
