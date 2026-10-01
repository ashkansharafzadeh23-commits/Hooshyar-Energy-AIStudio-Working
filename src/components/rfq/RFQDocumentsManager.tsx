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
  Image as ImageIcon 
} from 'lucide-react';
import { RFQDocument } from '../../types/rfq.js';
import { rfqDocumentClient } from '../../services/rfqDocumentClient.js';
import { formatFileSize, validateClientFile } from '../../utils/documentPresentation.js';
import { formatPersianDate } from '../../utils/formatters.js';
import { PersianConfirmModal } from '../common/PersianConfirmModal.js';

interface RFQDocumentsManagerProps {
  rfqId: string;
  isOwner: boolean;
  requiredDocuments?: string[];
}

export const RFQDocumentsManager: React.FC<RFQDocumentsManagerProps> = ({
  rfqId,
  isOwner,
  requiredDocuments = []
}) => {
  const [documents, setDocuments] = useState<RFQDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<RFQDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [rfqId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await rfqDocumentClient.getRfqDocuments(rfqId);
      setDocuments(docs);
    } catch (err: any) {
      console.error('Error fetching RFQ documents:', err);
      // Don't show loud error on initial load if 404/empty
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setMessage(null);
    const fileList = Array.from(files);
    e.target.value = ''; // Reset input

    for (const file of fileList) {
      const clientValidation = validateClientFile(file);
      if (!clientValidation.isValid) {
        setMessage({ type: 'error', text: clientValidation.error || 'فایل نامعتبر است.' });
        return;
      }
    }

    setUploading(true);
    let successCount = 0;
    let lastError = '';

    for (const file of fileList) {
      try {
        await rfqDocumentClient.uploadRfqDocument(rfqId, file);
        successCount++;
      } catch (err: any) {
        console.error('Upload failed for file:', file.name, err);
        lastError = err.message || 'خطا در بارگذاری فایل.';
      }
    }

    setUploading(false);
    await loadDocuments();

    if (successCount === fileList.length) {
      setMessage({
        type: 'success',
        text: fileList.length === 1 
          ? 'فایل با موفقیت بارگذاری شد.' 
          : `${successCount} فایل با موفقیت بارگذاری شد.`
      });
    } else if (successCount > 0) {
      setMessage({
        type: 'error',
        text: `${successCount} فایل بارگذاری شد، اما بارگذاری برخی فایل‌ها با خطا مواجه شد: ${lastError}`
      });
    } else {
      setMessage({
        type: 'error',
        text: lastError || 'بارگذاری فایل انجام نشد. دوباره تلاش کنید.'
      });
    }
  };

  const handleDownload = async (doc: RFQDocument) => {
    setDownloadingId(doc.id);
    setMessage(null);
    try {
      const downloadUrl = await rfqDocumentClient.downloadRfqDocument(rfqId, doc.id);
      // Ephemeral navigation: opens download URL without storing it
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
      await rfqDocumentClient.deleteRfqDocument(rfqId, docToDelete.id);
      setMessage({ type: 'success', text: `سند «${docToDelete.name}» با موفقیت حذف گردید.` });
      setDocToDelete(null);
      await loadDocuments();
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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6" dir="rtl">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-blue-600 shrink-0" />
            فایل‌ها و مستندات درخواست پیشنهاد (RFQ)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            اسناد فنی، مشخصات طرح، نقشه‌ها و مدارک مهندسی پیوست این استعلام
          </p>
        </div>

        {/* OWNER UPLOAD BUTTON */}
        {isOwner && (
          <div>
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm ${
              uploading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}>
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>در حال بارگذاری...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>بارگذاری سند جدید</span>
                </>
              )}
              <input 
                type="file" 
                className="hidden" 
                multiple 
                disabled={uploading}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        )}
      </div>

      {/* ALERT MESSAGE */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 shrink-0" />
          )}
          <span className="text-xs font-bold">{message.text}</span>
        </div>
      )}

      {/* SEPARATE REQUIRED DOCUMENTS CHECKLIST */}
      {requiredDocuments.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
          <h4 className="text-xs font-black text-amber-900 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            مدارک موردنیاز از پیمانکاران (چک‌لیست استعلام):
          </h4>
          <div className="flex flex-wrap gap-2">
            {requiredDocuments.map((reqName, idx) => (
              <span key={idx} className="bg-white text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                {reqName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENT LIST */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 font-bold text-xs flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          در حال بارگذاری اسناد پیوست...
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <FileText size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-bold text-gray-500">
            هنوز فایلی برای این درخواست پیشنهاد بارگذاری نشده است.
          </p>
          {isOwner && (
            <p className="text-[11px] text-gray-400 mt-1">
              فرمت‌های مجاز: PDF (حداکثر ۱۵ مگابایت)، تصاویر JPG، PNG، WebP (حداکثر ۵ مگابایت)
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documents.map((doc) => {
            const isImg = isImage(doc.mimeType, doc.name);
            const isDownloading = downloadingId === doc.id;

            return (
              <div 
                key={doc.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isImg ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {isImg ? <ImageIcon size={20} /> : <File size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-gray-800 truncate" title={doc.name}>
                      {doc.name}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
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
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                    title="دانلود امن سند"
                  >
                    {isDownloading ? (
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                    ) : (
                      <Download size={16} />
                    )}
                    <span className="hidden sm:inline">دانلود</span>
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف سند"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <PersianConfirmModal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isSubmitting={isDeleting}
        variant="danger"
        title="حذف سند استعلام"
        message={`آیا از حذف سند «${docToDelete?.name || ''}» اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="بله، حذف شود"
        cancelText="انصراف"
      />
    </div>
  );
};
