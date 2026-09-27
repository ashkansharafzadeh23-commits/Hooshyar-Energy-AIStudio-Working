import React, { useState } from 'react';
import { FileText, Download, ExternalLink, Calendar, Tag, ShieldCheck } from 'lucide-react';

export interface AssetDocument {
  id: string;
  name?: string;
  title?: string;
  category?: string;
  documentType?: string;
  fileUrl?: string;
  url?: string;
  createdAt?: string;
  uploadedAt?: string;
  uploadDate?: string;
  fileSizeBytes?: number;
  fileSize?: string;
  size?: number;
  status?: string;
}

interface AssetDocumentRegistryProps {
  documents: AssetDocument[];
  loading?: boolean;
  className?: string;
}

export const AssetDocumentRegistry: React.FC<AssetDocumentRegistryProps> = ({
  documents,
  loading = false,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'همه اسناد' },
    { id: 'AS_BUILT', label: 'چون‌ساخت (As-Built)' },
    { id: 'SINGLE_LINE', label: 'تک‌خطی (SLD)' },
    { id: 'COMMISSIONING_REPORT', label: 'گزارش راه‌اندازی' },
    { id: 'WARRANTY_CERTIFICATE', label: 'ضمانت‌نامه' },
    { id: 'OPERATION_MANUAL', label: 'دفترچه بهره‌برداری' },
    { id: 'OTHER', label: 'سایر' }
  ];

  const filteredDocs = selectedCategory === 'ALL'
    ? documents
    : documents.filter(d => (d.category || d.documentType) === selectedCategory);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'APPROVED':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">تأیید شده</span>;
      case 'SUBMITTED':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">ثبت‌شده</span>;
      case 'REJECTED':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200">رد شده</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>اسناد و مدارک دارایی</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            اسناد و مدارک ثبت‌شده مرتبط با این دارایی
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
          تعداد اسناد: {documents.length}
        </div>
      </div>

      {/* Category Filter */}
      {documents.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800">
          <FileText className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            {documents.length === 0
              ? 'سندی برای این دارایی ثبت نشده است.'
              : 'سندی در این دسته‌بندی یافت نشد.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate">
                    {doc.title || doc.name || 'سند ثبت‌شده'}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    <span>دسته‌بندی: {doc.category || doc.documentType || 'عمومی'}</span>
                    {doc.fileSize && <span>حجم: {doc.fileSize}</span>}
                    <span>تاریخ: {formatDate(doc.createdAt || doc.uploadDate)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {getStatusBadge(doc.status)}
                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="مشاهده سند"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
