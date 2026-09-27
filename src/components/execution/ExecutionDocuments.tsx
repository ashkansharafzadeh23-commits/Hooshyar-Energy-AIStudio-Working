import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, Clock, Eye, Plus, Filter, ShieldCheck, AlertCircle } from 'lucide-react';

export interface ExecutionDoc {
  id: string;
  name?: string;
  title?: string;
  fileName?: string;
  type?: string;
  documentType?: string;
  category?: string;
  fileUrl?: string;
  url?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  createdAt?: string;
  verificationStatus?: string; // 'VERIFIED' | 'PENDING' | 'REJECTED'
  verifiedBy?: string;
}

interface ExecutionDocumentsProps {
  documents: ExecutionDoc[];
  loading?: boolean;
  onUpload?: () => void;
  canUpload?: boolean;
  className?: string;
}

export const ExecutionDocuments: React.FC<ExecutionDocumentsProps> = ({
  documents,
  loading = false,
  onUpload,
  canUpload = true,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const getDocCategory = (doc: ExecutionDoc): string => {
    const t = (doc.type || doc.documentType || doc.category || '').toUpperCase();
    if (t.includes('AS_BUILT') || t.includes('DRAWING') || t.includes('ENGINEERING')) return 'AS_BUILT';
    if (t.includes('CONTRACT') || t.includes('AGREEMENT') || t.includes('REVISION')) return 'CONTRACT';
    if (t.includes('COMMISSIONING') || t.includes('TEST') || t.includes('INSPECTION')) return 'TEST';
    if (t.includes('DATASHEET') || t.includes('MANUAL') || t.includes('WARRANTY')) return 'EQUIPMENT';
    return 'OTHER';
  };

  const filteredDocs = documents.filter((d) => {
    if (selectedCategory === 'ALL') return true;
    return getDocCategory(d) === selectedCategory;
  });

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
      case 'APPROVED':
        return {
          label: 'تأیید شده',
          icon: CheckCircle2,
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'REJECTED':
        return {
          label: 'نیاز به اصلاح',
          icon: AlertCircle,
          className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'PENDING':
      default:
        return {
          label: 'در حال بررسی',
          icon: Clock,
          className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>مدارک و اسناد کارگاهی و اجرایی ({documents.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            اسناد و مدارک ثبت‌شده کارگاهی و فنی پروژه
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              همه ({documents.length})
            </button>
            <button
              onClick={() => setSelectedCategory('AS_BUILT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] whitespace-nowrap ${
                selectedCategory === 'AS_BUILT'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              نقشه‌های As-Built
            </button>
            <button
              onClick={() => setSelectedCategory('TEST')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] whitespace-nowrap ${
                selectedCategory === 'TEST'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              آزمون‌ها و راه‌اندازی
            </button>
            <button
              onClick={() => setSelectedCategory('EQUIPMENT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] whitespace-nowrap ${
                selectedCategory === 'EQUIPMENT'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              تجهیزات و گارانتی
            </button>
          </div>

          {canUpload && onUpload && (
            <button
              onClick={onUpload}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>بارگذاری مدرک</span>
            </button>
          )}
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری اسناد کارگاهی...
        </div>
      ) : documents.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800">
          <FileText className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            هیچ مدرک اجرایی ثبت نشده است.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            نقشه‌های چون‌ساخت، صورت‌جلسات تحویل و تأییدیه‌های مهندسی در این قسمت ذخیره می‌شوند.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredDocs.map((doc) => {
            const badge = getStatusBadge(doc.verificationStatus);
            const BadgeIcon = badge.icon;
            const docName = doc.name || doc.title || doc.fileName || 'سند اجرایی بدون عنوان';
            const docUrl = doc.fileUrl || doc.url || '#';

            return (
              <div
                key={doc.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all min-h-[44px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 line-clamp-1">
                        {docName}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {doc.type || doc.documentType || 'مدرک پیوست'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${badge.className}`}>
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                  <span>
                    {doc.uploadedAt || doc.createdAt
                      ? new Date(doc.uploadedAt || doc.createdAt!).toLocaleDateString('fa-IR')
                      : 'تاریخ ثبت نشده'}
                  </span>

                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline min-h-[44px] px-2"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>مشاهده فایل</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
