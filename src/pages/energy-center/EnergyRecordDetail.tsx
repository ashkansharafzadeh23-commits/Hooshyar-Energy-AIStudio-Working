import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ExternalLink, 
  FileText, 
  Tag, 
  Users, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Scale, 
  Share2, 
  Sparkles,
  Inbox
} from 'lucide-react';
import { 
  EnergyInformationRecord, 
  CONTENT_TYPE_LABELS, 
  REGULATORY_STATUS_LABELS, 
  STAKEHOLDER_LABELS 
} from '../../types/energyCenter';
import { SourceProvenanceBadge } from '../../components/energy-center/SourceProvenanceBadge';
import { FutureAiImpactHook } from '../../components/energy-center/FutureAiImpactHook';

interface EnergyRecordDetailProps {
  records?: EnergyInformationRecord[];
}

export default function EnergyRecordDetail({ records = [] }: EnergyRecordDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const record = records.find(r => r.id === id || r.slug === id);

  if (!record) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-950 font-sans" dir="rtl">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8 sm:p-12 text-center max-w-lg space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
            <Inbox size={28} />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">
            سند یا گزارش مورد نظر یافت نشد
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ممکن است این رکورد هنوز تأیید نشده باشد یا شناسه واردشده معتبر نباشد. تمام سوابق پس از تطبیق رسمی در دسترس قرار می‌گیرند.
          </p>
          <div className="pt-2">
            <Link
              to="/energy-center"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold hover:bg-[#0369A1] transition-colors"
            >
              <ArrowRight size={16} />
              <span>بازگشت به مرکز اطلاعات انرژی</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const typeMeta = CONTENT_TYPE_LABELS[record.contentType] || {
    label: 'سند',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const regStatusMeta = record.regulatoryStatus 
    ? REGULATORY_STATUS_LABELS[record.regulatoryStatus]
    : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans pb-24 text-slate-900 dark:text-slate-100" dir="rtl">
      
      {/* Top Breadcrumb & Header Bar */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <Link
              to="/energy-center"
              className="inline-flex items-center gap-1.5 font-bold text-slate-500 hover:text-[#0284C7] dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowRight size={16} />
              <span>مرکز اطلاعات انرژی ایران</span>
            </Link>

            <span className="text-slate-400 font-mono text-[11px]">
              کد پیگیری: {record.slug || record.id}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${typeMeta.badgeClass}`}>
                {typeMeta.label}
              </span>

              {/* Conditional Regulatory Status — strictly only rendered when present in verified data */}
              {regStatusMeta && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${regStatusMeta.badgeClass}`}>
                  <Scale size={13} />
                  <span>وضعیت حقوقی: {regStatusMeta.label}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight">
              {record.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 mt-8">
        
        {/* Source Provenance Box */}
        <SourceProvenanceBadge provenance={record.provenance} />

        {/* Executive Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            خلاصه مدیریتی
          </h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {record.summary}
          </p>
        </div>

        {/* Future AI Impact Hook */}
        <FutureAiImpactHook topicTitle={record.title} />

        {/* Key Points / Bullet Points (if available) */}
        {record.keyPoints && record.keyPoints.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#0284C7]" />
              <span>نکات کلیدی و محورهای مهم سند</span>
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {record.keyPoints.map((kp, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] mt-2 shrink-0" />
                  <span className="leading-relaxed">{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full Description / Body */}
        {record.body && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              شرح تفصیلی و متن سند
            </h3>
            <div className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
              {record.body}
            </div>
          </div>
        )}

        {/* Affected Stakeholders */}
        {record.affectedStakeholders && record.affectedStakeholders.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Users size={14} />
              <span>گروه‌های مخاطب و ذی‌نفعان تحت تأثیر</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {record.affectedStakeholders.map((sh, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {STAKEHOLDER_LABELS[sh] || sh}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Topic Tags */}
        {record.topics && record.topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-bold text-slate-400">موضوعات مرتبط:</span>
            {record.topics.map((t, idx) => (
              <span 
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <Tag size={12} className="opacity-50" />
                <span>{t}</span>
              </span>
            ))}
          </div>
        )}

        {/* Navigation Return */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <Link
            to="/energy-center"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#0284C7] hover:underline"
          >
            <ArrowRight size={14} />
            <span>بازگشت به فهرست اسناد و گزارش‌ها</span>
          </Link>

          {record.provenance.sourceUrl && (
            <a
              href={record.provenance.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
            >
              <span>مشاهده سند اصلی در سایت مأخذ</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
