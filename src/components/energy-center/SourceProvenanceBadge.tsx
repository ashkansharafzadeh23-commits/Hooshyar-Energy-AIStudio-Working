import React from 'react';
import { ShieldCheck, ExternalLink, Calendar, Clock } from 'lucide-react';
import { EnergyProvenance } from '../../types/energyCenter';

interface SourceProvenanceBadgeProps {
  provenance: EnergyProvenance;
  className?: string;
  compact?: boolean;
}

export const SourceProvenanceBadge: React.FC<SourceProvenanceBadgeProps> = ({
  provenance,
  className = '',
  compact = false
}) => {
  const formatDate = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const publishedDate = formatDate(provenance.publishedAt);
  const verifiedDate = formatDate(provenance.verifiedAt);

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ${className}`} dir="rtl">
        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
          {provenance.isOfficialSource && (
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          )}
          <span>منبع: {provenance.sourceName}</span>
        </span>
        {publishedDate && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">• {publishedDate}</span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 p-3.5 space-y-2 text-xs ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {provenance.isOfficialSource ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
              <ShieldCheck size={13} />
              <span>منبع رسمی و مستند</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span>گزارش صنعتی</span>
            </span>
          )}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {provenance.sourceName}
          </span>
        </div>

        {provenance.sourceUrl && (
          <a
            href={provenance.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284C7] hover:text-[#0369A1] dark:text-blue-400 hover:underline transition-colors"
          >
            <span>مشاهده در تارنمای مبدأ</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
        {publishedDate && (
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-slate-400" />
            <span>تاریخ انتشار: {publishedDate}</span>
          </span>
        )}
        {verifiedDate && (
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <Clock size={12} />
            <span>آخرین تطبیق با مأخذ: {verifiedDate}</span>
          </span>
        )}
      </div>
    </div>
  );
};
