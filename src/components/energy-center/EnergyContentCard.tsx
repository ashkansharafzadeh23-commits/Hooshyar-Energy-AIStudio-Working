import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Tag, FileText } from 'lucide-react';
import { 
  EnergyInformationRecord, 
  CONTENT_TYPE_LABELS, 
  REGULATORY_STATUS_LABELS 
} from '../../types/energyCenter';
import { SourceProvenanceBadge } from './SourceProvenanceBadge';

interface EnergyContentCardProps {
  record: EnergyInformationRecord;
  className?: string;
}

export const EnergyContentCard: React.FC<EnergyContentCardProps> = ({
  record,
  className = ''
}) => {
  const typeMeta = CONTENT_TYPE_LABELS[record.contentType] || {
    label: 'مطلب',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const regStatusMeta = record.regulatoryStatus 
    ? REGULATORY_STATUS_LABELS[record.regulatoryStatus]
    : null;

  return (
    <article 
      className={`group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 hover:shadow-md transition-all duration-200 flex flex-col justify-between ${className}`}
      dir="rtl"
    >
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeMeta.badgeClass}`}>
              {typeMeta.label}
            </span>

            {regStatusMeta && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${regStatusMeta.badgeClass}`}>
                وضعیت: {regStatusMeta.label}
              </span>
            )}
          </div>

          <SourceProvenanceBadge provenance={record.provenance} compact />
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-[#0284C7] dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
          <Link to={`/energy-center/${record.id}`}>
            {record.title}
          </Link>
        </h3>

        {/* Summary */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
          {record.summary}
        </p>

        {/* Topics */}
        {record.topics && record.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {record.topics.map((t, idx) => (
              <span 
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <Tag size={10} className="opacity-50" />
                <span>{t}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer & Action */}
      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          شناسه مرجع: {record.slug || record.id}
        </span>

        <Link
          to={`/energy-center/${record.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:text-[#0369A1] dark:text-blue-400 group-hover:translate-x-[-2px] transition-transform"
        >
          <span>مشاهده جزئیات و متن کامل</span>
          <ArrowLeft size={14} />
        </Link>
      </div>
    </article>
  );
};
