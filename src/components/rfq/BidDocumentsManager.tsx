import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  File, 
  Image as ImageIcon, 
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';
import { BidDocument, BidDocumentCategory } from '../../types/rfq.js';
import { rfqDocumentClient } from '../../services/rfqDocumentClient.js';
import { 
  formatFileSize, 
  validateClientFile, 
  filterLegacyDocuments,
  classifyLegacyDocumentItem
} from '../../utils/documentPresentation.js';
import { formatPersianDate } from '../../utils/formatters.js';
import { PersianConfirmModal } from '../common/PersianConfirmModal.js';

interface BidDocumentsManagerProps {
  rfqId: string;
  bidId: string;
  isBidOwner: boolean;
  canModify?: boolean;
  legacyTechnical?: string[];
  legacyCommercial?: string[];
  onDocumentChange?: () => void;
}

export const BidDocumentsManager: React.FC<BidDocumentsManagerProps> = ({
  rfqId,
  bidId,
  isBidOwner,
  canModify = true,
  legacyTechnical = [],
  legacyCommercial = [],
  onDocumentChange
}) => {
  const [documents, setDocuments] = useState<BidDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCategory, setUploadingCategory] = useState<BidDocumentCategory | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<BidDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [rfqId, bidId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await rfqDocumentClient.getBidDocuments(rfqId, bidId);
      setDocuments(docs);
    } catch (err: any) {
      console.error('Error fetching bid documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (category: BidDocumentCategory, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setMessage(null);
    const fileList = Array.from(files);

    for (const file of fileList) {
      const clientValidation = validateClientFile(file);
      if (!clientValidation.isValid) {
        setMessage({ type: 'error', text: clientValidation.error || 'فایل نامعتبر است.' });
        return;
      }
    }

    setUploadingCategory(category);
    let successCount = 0;
    let lastError = '';

    for (const file of fileList) {
      try {
        await rfqDocumentClient.uploadBidDocument(rfqId, bidId, category, file);
        successCount++;
      } catch (err: any) {
        console.error('Upload failed for bid doc:', file.name, err);
        lastError = err.message || 'خطا در بارگذاری فایل.';
      }
    }

    setUploadingCategory(null);
    await loadDocuments();
    if (onDocumentChange) onDocumentChange();

    if (successCount === fileList.length) {
      setMessage({
        type: 'success',
        text: fileList.length === 1 
          ? 'سند با موفقیت به پیشنهاد الصاق گردید.' 
          : `${successCount} سند با موفقیت بارگذاری شد.`
      });
    } else if (successCount > 0) {
      setMessage({
        type: 'error',
        text: `${successCount} فایل بارگذاری شد، اما برخی با خطا مواجه شدند: ${lastError}`
      });
    } else {
      setMessage({
        type: 'error',
        text: lastError || 'بارگذاری فایل انجام نشد. دوباره تلاش کنید.'
      });
    }
  };

  const handleDownload = async (doc: BidDocument) => {
    setDownloadingId(doc.id);
    setMessage(null);
    try {
      const downloadUrl = await rfqDocumentClient.downloadBidDocument(rfqId, bidId, doc.id);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'خطا در دریافت لینک دانلود امن.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    setMessage(null);
    try {
      await rfqDocumentClient.deleteBidDocument(rfqId, bidId, docToDelete.id);
      setMessage({ type: 'success', text: `سند «${docToDelete.name}» با موفقیت حذف گردید.` });
      setDocToDelete(null);
      await loadDocuments();
      if (onDocumentChange) onDocumentChange();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'خطا در حذف سند.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const isImage = (mime?: string, name?: string) => {
    if (mime?.startsWith('image/')) return true;
    const lower = (name || '').toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
  };

  // Group secure documents by category
  const technicalDocs = documents.filter(d => d.category === 'TECHNICAL');
  const commercialDocs = documents.filter(d => d.category === 'COMMERCIAL');

  // Duplicate display suppression: filter out legacy strings whose exact name exists in secure documents of the same category
  const filteredLegacyTech = filterLegacyDocuments(legacyTechnical, technicalDocs);
  const filteredLegacyComm = filterLegacyDocuments(legacyCommercial, commercialDocs);

  const renderCategoryBlock = (
    title: string,
    category: BidDocumentCategory,
    secureList: BidDocument[],
    legacyList: string[],
    badgeColor: string
  ) => {
    const isUploadingThis = uploadingCategory === category;
    const hasAnyDocs = secureList.length > 0 || legacyList.length > 0;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${badgeColor}`}></span>
            <h4 className="text-xs font-black text-gray-900">{title}</h4>
            <span className="text-[10px] text-gray-400 font-bold">
              ({secureList.length + legacyList.length} سند)
            </span>
          </div>

          {isBidOwner && canModify && (
            <div>
              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                isUploadingThis
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
              }`}>
                {isUploadingThis ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>در حال بارگذاری...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>افزودن {category === 'TECHNICAL' ? 'سند فنی' : 'سند تجاری'}</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  multiple
                  disabled={isUploadingThis}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={e => {
                    handleFileUpload(category, e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {!hasAnyDocs ? (
          <p className="text-[11px] text-gray-400 py-3 text-center border border-dashed border-gray-100 rounded-lg">
            سندی در این بخش ثبت نشده است.
          </p>
        ) : (
          <div className="space-y-2">
            {/* 1. Secure S3 Documents */}
            {secureList.map(doc => {
              const isImg = isImage(doc.mimeType, doc.name);
              const isDownloading = downloadingId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isImg ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {isImg ? <ImageIcon size={16} /> : <File size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{formatFileSize(doc.sizeBytes)}</span>
                        <span>•</span>
                        <span>{formatPersianDate(doc.uploadedAt, true)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="دانلود امن"
                    >
                      {isDownloading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      <span className="hidden sm:inline">دانلود</span>
                    </button>

                    {isBidOwner && canModify && (
                      <button
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف سند"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 2. Legacy Document Strings (Safe presentation) */}
            {legacyList.map((legacyItem, idx) => {
              const item = classifyLegacyDocumentItem(legacyItem);

              return (
                <div
                  key={`legacy-${idx}`}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-gray-100 bg-amber-50/30 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-amber-600 shrink-0" />
                    <span className="truncate text-gray-700 font-medium" title={legacyItem}>
                      {item.displayText}
                    </span>
                  </div>

                  {item.isClickable && item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1 shrink-0 px-2 py-1 bg-white rounded border border-amber-200"
                    >
                      <ExternalLink size={12} />
                      پیوند خارجی
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* ALERT MESSAGE */}
      {message && (
        <div className={`p-3 rounded-xl flex items-center gap-2 border ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          )}
          <span className="text-xs font-bold">{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-gray-400 font-bold text-xs flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-amber-600" />
          در حال بارگذاری مدارک پیشنهاد...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderCategoryBlock('اسناد فنی (Technical Proposal)', 'TECHNICAL', technicalDocs, filteredLegacyTech, 'bg-blue-500')}
          {renderCategoryBlock('اسناد تجاری و مالی (Commercial Offer)', 'COMMERCIAL', commercialDocs, filteredLegacyComm, 'bg-emerald-500')}
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <PersianConfirmModal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isSubmitting={isDeleting}
        variant="danger"
        title="حذف سند پیشنهاد"
        message={`آیا از حذف سند «${docToDelete?.name || ''}» از این پیشنهاد اطمینان دارید؟`}
        confirmText="بله، حذف شود"
        cancelText="انصراف"
      />
    </div>
  );
};
