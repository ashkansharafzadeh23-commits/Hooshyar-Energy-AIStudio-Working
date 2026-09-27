import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  UploadCloud, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  FileCheck,
  Plus
} from 'lucide-react';
import { ProjectDocument, ProjectDocumentType } from '../../types/project';
import { formatJalaliDate } from '../../utils/formatters';

interface ProjectDocumentCenterProps {
  projectId: string;
}

interface DocumentCategoryGroup {
  id: string;
  title: string;
  types: ProjectDocumentType[];
}

const DOCUMENT_GROUPS: DocumentCategoryGroup[] = [
  { id: 'all', title: 'همه اسناد', types: [] },
  { id: 'design', title: 'مطالعات و طراحی', types: ['ENGINEERING', 'FINANCIAL_MODEL', 'PERMIT', 'LAND_DEED', 'GRID_DOCUMENT'] },
  { id: 'rfq', title: 'استعلام و پیشنهادها', types: ['RFQ', 'BID'] },
  { id: 'contract', title: 'قراردادها', types: ['CONTRACT'] },
  { id: 'finance', title: 'تأمین مالی و صورت‌حساب', types: ['INVOICE', 'FINANCIAL_MODEL'] },
  { id: 'procurement', title: 'خرید و تجهیزات', types: ['EQUIPMENT_DATASHEET'] },
  { id: 'construction', title: 'اجرا و نظارت', types: ['INSPECTION'] },
  { id: 'commissioning', title: 'راه‌اندازی و تست', types: ['COMMISSIONING'] },
  { id: 'operation', title: 'بهره‌برداری و سایر', types: ['OTHER'] },
];

export const ProjectDocumentCenter: React.FC<ProjectDocumentCenterProps> = ({ projectId }) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<ProjectDocumentType>('ENGINEERING');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [projectId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;
    setUploading(true);
    setUploadError('');

    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: uploadType,
          fileUrl: uploadUrl.trim(),
          version: 1
        })
      });

      if (res.ok) {
        setUploadUrl('');
        setShowUploadModal(false);
        await fetchDocs();
      } else {
        const data = await res.json();
        setUploadError(data.error || 'خطا در بارگذاری سند');
      }
    } catch (err: any) {
      setUploadError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setUploading(false);
    }
  };

  // Filtering
  const filteredDocuments = documents.filter((doc) => {
    // Group filter
    if (selectedGroup !== 'all') {
      const grp = DOCUMENT_GROUPS.find(g => g.id === selectedGroup);
      if (grp && !grp.types.includes(doc.type)) {
        return false;
      }
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        doc.type.toLowerCase().includes(q) ||
        doc.fileUrl.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getDocTypeTitle = (type: ProjectDocumentType): string => {
    switch (type) {
      case 'LAND_DEED': return 'سند مالکیت / اجاره‌نامه زمین';
      case 'GRID_DOCUMENT': return 'مجوز اتصال به شبکه (توانیر/توزیع)';
      case 'PERMIT': return 'پروانه احداث و مجوزهای قانونی';
      case 'ENGINEERING': return 'نقشه‌ها و مستندات مهندسی As-Built';
      case 'FINANCIAL_MODEL': return 'مدل مالی و امکان‌سنجی';
      case 'RFQ': return 'اسناد استعلام قیمت (RFQ)';
      case 'BID': return 'پیشنهاد فنی و مالی پیمانکار';
      case 'CONTRACT': return 'قرارداد احداث / EPC';
      case 'INVOICE': return 'صورت‌حساب و اسناد پرداخت';
      case 'EQUIPMENT_DATASHEET': return 'دیتاشیت و کاتالوگ تجهیزات';
      case 'INSPECTION': return 'گزارش نظارت کارگاهی';
      case 'COMMISSIONING': return 'تأییدیه آزمون‌های راه‌اندازی';
      default: return 'سایر مستندات فنی';
    }
  };

  const renderStatusBadge = (status: ProjectDocument['verificationStatus']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تأیید شده
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            در حال بررسی
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            رد شده
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            بررسی‌نشده
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" />
            مرکز اسناد پروژه (Document Center)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            آرشیو امن، دسته‌بندی‌شده و قابل ممیزی اسناد و گواهی‌نامه‌های پروژه
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
        >
          <UploadCloud className="w-4 h-4" />
          <span>ثبت سند جدید</span>
        </button>
      </div>

      {/* Main content: Sidebar Categories + Document List */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Filter Column (RTL right column) */}
        <div className="space-y-2">
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی سند..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs space-y-1">
            {DOCUMENT_GROUPS.map((grp) => {
              const isActive = selectedGroup === grp.id;
              const count = grp.id === 'all' 
                ? documents.length 
                : documents.filter(d => grp.types.includes(d.type)).length;

              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setSelectedGroup(grp.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{grp.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                    isActive ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right List Column */}
        <div className="md:col-span-3 space-y-3">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">در حال دریافت اسناد پروژه...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-700 text-sm">
                هیچ سندی در این دسته‌بندی یافت نشد
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                اسناد فنی، قراردادها و مجوزهای پروژه پس از ثبت در این بخش قابل دسترسی خواهند بود.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {getDocTypeTitle(doc.type)}
                      </h4>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>نسخه: {doc.version}</span>
                        <span>•</span>
                        <span>تاریخ ثبت: {formatJalaliDate(doc.createdAt)}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400 truncate max-w-[200px]" dir="ltr">
                          {doc.fileUrl}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {renderStatusBadge(doc.verificationStatus)}
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                    >
                      مشاهده
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Simple Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">بارگذاری و ثبت سند جدید</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نوع سند
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as ProjectDocumentType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ENGINEERING">نقشه‌ها و مستندات مهندسی (ENGINEERING)</option>
                  <option value="FINANCIAL_MODEL">مدل مالی و امکان‌سنجی (FINANCIAL_MODEL)</option>
                  <option value="PERMIT">پروانه احداث و مجوزها (PERMIT)</option>
                  <option value="LAND_DEED">سند زمین (LAND_DEED)</option>
                  <option value="GRID_DOCUMENT">مجوز اتصال به شبکه (GRID_DOCUMENT)</option>
                  <option value="RFQ">اسناد استعلام قیمت (RFQ)</option>
                  <option value="BID">پیشنهاد پیمانکار (BID)</option>
                  <option value="CONTRACT">قرارداد رسمی (CONTRACT)</option>
                  <option value="INVOICE">اسناد مالی و فاکتور (INVOICE)</option>
                  <option value="EQUIPMENT_DATASHEET">دیتاشیت تجهیزات (EQUIPMENT_DATASHEET)</option>
                  <option value="INSPECTION">گزارش نظارت کارگاهی (INSPECTION)</option>
                  <option value="COMMISSIONING">تأییدیه راه‌اندازی (COMMISSIONING)</option>
                  <option value="OTHER">سایر مدارک (OTHER)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نشانی / پیوند فایل سند
                </label>
                <input
                  type="text"
                  placeholder="https://... یا /documents/doc.pdf"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  dir="ltr"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 text-left"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>ثبت سند</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
