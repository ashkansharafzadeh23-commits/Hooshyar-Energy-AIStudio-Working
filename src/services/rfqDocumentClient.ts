import { RFQDocument, BidDocument, BidDocumentCategory } from '../types/rfq.js';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export class RFQDocumentError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'RFQDocumentError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function handleResponseError(res: Response, defaultMessage: string): Promise<never> {
  let errorMessage = defaultMessage;
  let code: string | undefined;
  try {
    const data = await res.json();
    if (data?.error) errorMessage = data.error;
    if (data?.code) code = data.code;
  } catch {
    // If body is not JSON, use default/status messages
  }

  if (res.status === 401) {
    errorMessage = 'احراز هویت انجام نشده یا نشست کاربری منقضی شده است. لطفاً مجدداً وارد شوید.';
  } else if (res.status === 403) {
    errorMessage = errorMessage || 'شما مجوز دسترسی به این سند یا انجام این عملیات را ندارید.';
  } else if (res.status === 404) {
    errorMessage = errorMessage || 'استعلام، پیشنهاد یا سند مورد نظر یافت نشد.';
  } else if (res.status === 413) {
    errorMessage = errorMessage || 'حجم فایل ارسالی بیش از سقف مجاز است (PDF حداکثر ۱۵ مگابایت، تصویر حداکثر ۵ مگابایت).';
  } else if (res.status === 415) {
    errorMessage = errorMessage || 'فرمت فایل مجاز نیست. تنها اسناد PDF و تصاویر JPG، PNG، WebP پشتیبانی می‌شوند.';
  } else if (res.status === 502 || res.status === 503) {
    errorMessage = errorMessage || 'فضای ذخیره‌سازی ابری در دسترس نیست یا عملیات با خطا مواجه شد.';
  }

  throw new RFQDocumentError(errorMessage, res.status, code);
}

export const rfqDocumentClient = {
  // 1. Fetch RFQ Documents
  async getRfqDocuments(rfqId: string): Promise<RFQDocument[]> {
    const res = await fetch(`/api/rfq/${encodeURIComponent(rfqId)}/documents`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      await handleResponseError(res, 'خطا در دریافت لیست اسناد استعلام');
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // 2. Upload RFQ Document
  async uploadRfqDocument(rfqId: string, file: File): Promise<RFQDocument> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`/api/rfq/${encodeURIComponent(rfqId)}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });

    if (!res.ok) {
      await handleResponseError(res, 'خطا در بارگذاری سند استعلام');
    }

    return await res.json();
  },

  // 3. Download RFQ Document
  async downloadRfqDocument(rfqId: string, documentId: string): Promise<string> {
    const res = await fetch(`/api/rfq/${encodeURIComponent(rfqId)}/documents/${encodeURIComponent(documentId)}/download`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      await handleResponseError(res, 'خطا در دریافت لینک امن دانلود');
    }

    const data = await res.json();
    if (!data?.downloadUrl) {
      throw new RFQDocumentError('آدرس دانلود از سرور دریافت نشد.', 500);
    }
    return data.downloadUrl;
  },

  // 4. Delete RFQ Document
  async deleteRfqDocument(rfqId: string, documentId: string): Promise<boolean> {
    const res = await fetch(`/api/rfq/${encodeURIComponent(rfqId)}/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      await handleResponseError(res, 'خطا در حذف سند استعلام');
    }

    return true;
  },

  // 5. Fetch Bid Documents
  async getBidDocuments(rfqId: string, bidId: string): Promise<BidDocument[]> {
    const res = await fetch(`/api/rfq/${encodeURIComponent(rfqId)}/bids/${encodeURIComponent(bidId)}/documents`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      await handleResponseError(res, 'خطا در دریافت لیست اسناد پیشنهاد');
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // 6. Upload Bid Document
  async uploadBidDocument(rfqId: string, bidId: string, category: BidDocumentCategory, file: File): Promise<BidDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const res = await fetch(`/api/rfq/${encodeURIComponent(rfqId)}/bids/${encodeURIComponent(bidId)}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });

    if (!res.ok) {
      await handleResponseError(res, 'خطا در بارگذاری سند پیشنهاد');
    }

    return await res.json();
  },

  // 7. Download Bid Document
  async downloadBidDocument(rfqId: string, bidId: string, documentId: string): Promise<string> {
    const res = await fetch(`/api/rfq/${encodeURIComponent(rfqId)}/bids/${encodeURIComponent(bidId)}/documents/${encodeURIComponent(documentId)}/download`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      await handleResponseError(res, 'خطا در دریافت لینک امن دانلود');
    }

    const data = await res.json();
    if (!data?.downloadUrl) {
      throw new RFQDocumentError('آدرس دانلود از سرور دریافت نشد.', 500);
    }
    return data.downloadUrl;
  },

  // 8. Delete Bid Document
  async deleteBidDocument(rfqId: string, bidId: string, documentId: string): Promise<boolean> {
    const res = await fetch(`/api/rfq/${encodeURIComponent(rfqId)}/bids/${encodeURIComponent(bidId)}/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      await handleResponseError(res, 'خطا در حذف سند پیشنهاد');
    }

    return true;
  }
};

export interface BidSubmissionWorkflowParams {
  rfqId: string;
  bidPayload: any;
  techFiles: File[];
  commFiles: File[];
  createBidApi: (rfqId: string, payload: any) => Promise<{ ok: boolean; status: number; data?: any; error?: string }>;
  uploadBidDocApi: (rfqId: string, bidId: string, category: BidDocumentCategory, file: File) => Promise<any>;
}

export interface BidSubmissionWorkflowResult {
  bidCreated: boolean;
  bidId?: string;
  bidCode?: string;
  score?: any;
  uploadedTechFiles: string[];
  uploadedCommFiles: string[];
  failedFiles: { name: string; category: BidDocumentCategory; error: string }[];
  feedbackMessage: {
    type: 'success' | 'error';
    text: string;
  };
}

/**
 * Orchestrates creating a bid first and then uploading selected documents with the real canonical bidId.
 * Guarantees zero document uploads if bid creation fails, and tracks per-file upload results.
 */
export async function executeBidSubmissionWorkflow(
  params: BidSubmissionWorkflowParams
): Promise<BidSubmissionWorkflowResult> {
  const { rfqId, bidPayload, techFiles, commFiles, createBidApi, uploadBidDocApi } = params;

  // 1. Create bid first
  const createRes = await createBidApi(rfqId, bidPayload);
  if (!createRes.ok || !createRes.data?.id) {
    return {
      bidCreated: false,
      uploadedTechFiles: [],
      uploadedCommFiles: [],
      failedFiles: [],
      feedbackMessage: {
        type: 'error',
        text: createRes.error || 'خطا در ثبت پیشنهاد'
      }
    };
  }

  const newBid = createRes.data;
  const canonicalBidId = newBid.id;
  const uploadedTechFiles: string[] = [];
  const uploadedCommFiles: string[] = [];
  const failedFiles: { name: string; category: BidDocumentCategory; error: string }[] = [];

  // 2. Sequentially upload technical files using real canonicalBidId
  for (const file of techFiles) {
    try {
      await uploadBidDocApi(rfqId, canonicalBidId, 'TECHNICAL', file);
      uploadedTechFiles.push(file.name);
    } catch (err: any) {
      failedFiles.push({ name: file.name, category: 'TECHNICAL', error: err?.message || 'خطا در بارگذاری' });
    }
  }

  // 3. Sequentially upload commercial files using real canonicalBidId
  for (const file of commFiles) {
    try {
      await uploadBidDocApi(rfqId, canonicalBidId, 'COMMERCIAL', file);
      uploadedCommFiles.push(file.name);
    } catch (err: any) {
      failedFiles.push({ name: file.name, category: 'COMMERCIAL', error: err?.message || 'خطا در بارگذاری' });
    }
  }

  const hasErrors = failedFiles.length > 0;
  const feedbackMessage = hasErrors
    ? {
        type: 'error' as const,
        text: `پیشنهاد شما با کد رسمی ${newBid.bidCode} ثبت شد، اما بارگذاری برخی فایل‌ها (${failedFiles.map(f => f.name).join('، ')}) کامل نشد. می‌توانید از بخش «پیشنهادات من» اسناد را مجدداً الصاق نمایید.`
      }
    : {
        type: 'success' as const,
        text: `پیشنهاد شما با کد رسمی ${newBid.bidCode} با موفقیت ثبت شد! امتیاز اولیه: ${newBid.score?.totalScore?.toFixed(1) || '-'}/۱۰۰`
      };

  return {
    bidCreated: true,
    bidId: canonicalBidId,
    bidCode: newBid.bidCode,
    score: newBid.score,
    uploadedTechFiles,
    uploadedCommFiles,
    failedFiles,
    feedbackMessage
  };
}

