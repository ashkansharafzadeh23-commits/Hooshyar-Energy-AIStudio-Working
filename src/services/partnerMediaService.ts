/**
 * Partner Media & Professional Profile Client Service
 * Strictly interfaces with authenticated partner media endpoints:
 * - /api/partners/media/upload (multipart, magic-byte validated)
 * - /api/partners/contractor/* (EPC profile, portfolio, optional products)
 * - /api/partners/vendor/* (Vendor profile, products, availability)
 * - /api/partners/technician/* (Technician profile, certifications, work samples)
 */

export type PartnerMediaEntityType =
  | 'EPC_LOGO'
  | 'EPC_PORTFOLIO'
  | 'EPC_PRODUCT'
  | 'VENDOR_LOGO'
  | 'VENDOR_PRODUCT'
  | 'TECHNICIAN_PHOTO'
  | 'TECHNICIAN_CERTIFICATE'
  | 'TECHNICIAN_WORK';

export interface UploadMediaResult {
  id: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  downloadUrl: string;
  uploadedAt: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Safely parse JSON from a fetch Response without throwing SyntaxError / DOMException
 * when the server or reverse proxy returns non-JSON bodies (e.g. HTML error pages).
 */
async function parseResponseJsonSafe(res: Response): Promise<any> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (err) {
    console.warn('[PartnerMedia] Non-JSON or unparseable response:', err);
    return null;
  }
}

/**
 * Normalizes HTTP response errors into explicit, truthful Persian messages.
 * Maps operational codes like 503 (storage not configured) or 413 (file too large)
 * so that raw browser errors are NEVER presented to users.
 */
async function handleResponseError(res: Response, defaultMessage: string): Promise<never> {
  const data = await parseResponseJsonSafe(res);

  if (res.status === 401) {
    throw new Error('نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد حساب کاربری خود شوید.');
  }
  if (res.status === 403) {
    throw new Error('شما دسترسی مجاز برای این عملیات را ندارید.');
  }
  if (res.status === 404) {
    throw new Error('اطلاعات یا منبع درخواستی یافت نشد.');
  }
  if (res.status === 413) {
    throw new Error('حجم فایل ارسالی بیش از سقف مجاز است (حداکثر ۵ مگابایت برای تصاویر، ۱۵ مگابایت برای مدارک).');
  }
  if (res.status === 415) {
    throw new Error('فرمت فایل نامعتبر است. تنها تصاویر JPG، PNG، WebP و مدارک PDF مجاز هستند.');
  }
  if (res.status === 503 || data?.code === 'STORAGE_NOT_CONFIGURED') {
    throw new Error('سرویس ذخیره‌سازی فایل در این محیط پیکربندی نشده است.');
  }
  if (data?.error && typeof data.error === 'string') {
    throw new Error(data.error);
  }
  if (data?.message && typeof data.message === 'string') {
    throw new Error(data.message);
  }
  throw new Error(defaultMessage);
}

/**
 * Intercepts any unexpected runtime or DOMExceptions (such as Safari's
 * "The string did not match the expected pattern.") and converts them
 * into user-friendly Persian error messages.
 */
export function formatPartnerMediaError(err: any, fallbackMessage: string): string {
  if (!err) return fallbackMessage;
  const msg = typeof err === 'string' ? err : err.message || '';

  // Return existing Persian messages unchanged
  if (msg && /[\u0600-\u06FF]/.test(msg)) {
    return msg;
  }

  // Intercept WebKit/Safari DOMException (SyntaxError) or JSON errors
  if (
    msg.includes('The string did not match the expected pattern') ||
    msg.includes('SyntaxError') ||
    msg.includes('Unexpected token') ||
    msg.includes('JSON')
  ) {
    console.error('[PartnerMedia] Browser syntax/DOMException intercepted:', err);
    return 'بارگذاری تصویر انجام نشد. لطفاً دوباره تلاش کنید.';
  }

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
    return 'خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
  }

  return fallbackMessage;
}

/**
 * Upload a media item (image or PDF for certificate) to the secure S3-compatible partner storage.
 * Enforces authenticated session and returns storage key + signed download URL.
 */
export async function uploadPartnerMedia(
  file: File,
  entityType: PartnerMediaEntityType
): Promise<UploadMediaResult> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('برای بارگذاری فایل، ابتدا باید وارد حساب کاربری خود شوید.');
  }

  // File size pre-check: 15MB for PDF certs, 5MB for images
  const isCert = entityType === 'TECHNICIAN_CERTIFICATE';
  const maxSize = isCert ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(
      isCert
        ? 'حجم فایل مدرک بیش از سقف مجاز (۱۵ مگابایت) است.'
        : 'حجم تصویر انتخابی بیش از سقف مجاز (۵ مگابایت) است.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', entityType);

  let res: Response;
  try {
    res = await fetch('/api/partners/media/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
  } catch (networkErr: any) {
    console.error('[uploadPartnerMedia] Network fetch error:', networkErr);
    throw new Error('خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
  }

  if (!res.ok) {
    await handleResponseError(res, 'بارگذاری تصویر انجام نشد. لطفاً دوباره تلاش کنید.');
  }

  const data = await parseResponseJsonSafe(res);
  if (!data || !data.storageKey) {
    console.error('[uploadPartnerMedia] Invalid response payload from server:', data);
    throw new Error('بارگذاری تصویر انجام نشد. لطفاً دوباره تلاش کنید.');
  }

  return data as UploadMediaResult;
}

/**
 * Request a fresh short-lived signed URL for an existing storage key.
 */
export async function getSignedMediaUrl(key: string): Promise<string> {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('data:')) {
    return key;
  }

  try {
    const res = await fetch(`/api/partners/media/signed-url?key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      return key;
    }
    const data = await parseResponseJsonSafe(res);
    return data?.downloadUrl || key;
  } catch (err) {
    console.warn('[getSignedMediaUrl] Failed to fetch signed URL:', err);
    return key;
  }
}

/**
 * Delete an object from partner storage if user owns it.
 */
export async function deletePartnerMedia(key: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/partners/media', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ key })
    });
  } catch (networkErr: any) {
    console.error('[deletePartnerMedia] Network error:', networkErr);
    throw new Error('خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
  }

  if (!res.ok) {
    await handleResponseError(res, 'خطا در حذف فایل.');
  }
}

// =========================================================================
// 1. EPC CONTRACTOR PROFILE & PORTFOLIO
// =========================================================================

export interface EpcPortfolioProject {
  id: string;
  title: string;
  projectType: string;
  province?: string;
  city?: string;
  installedCapacityKw?: number | null;
  completionYear?: string | number | null;
  description?: string;
  images: string[];
  createdAt?: string;
}

export interface EpcContractorProfile {
  id: string;
  legalName?: string;
  tradeName?: string;
  name?: string;
  nationalId?: string;
  phone?: string;
  city?: string;
  address?: string;
  bio?: string;
  specialties?: string[];
  logoKey?: string;
  logoUrl?: string;
  verificationStatus?: string;
  projectPortfolio: EpcPortfolioProject[];
  products: any[];
}

export async function getContractorProfile(): Promise<EpcContractorProfile> {
  const res = await fetch('/api/partners/contractor/profile', {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در دریافت پروفایل پیمانکار.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.contractor || null;
}

export async function updateContractorProfile(updates: Partial<EpcContractorProfile>): Promise<EpcContractorProfile> {
  const res = await fetch('/api/partners/contractor/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در به‌روزرسانی پروفایل پیمانکار.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.contractor || null;
}

export async function createContractorPortfolioProject(project: Omit<EpcPortfolioProject, 'id'>): Promise<EpcPortfolioProject> {
  const res = await fetch('/api/partners/contractor/portfolio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(project)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در ثبت نمونه‌پروژه.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.project || null;
}

export async function updateContractorPortfolioProject(projectId: string, project: Partial<EpcPortfolioProject>): Promise<EpcPortfolioProject> {
  const res = await fetch(`/api/partners/contractor/portfolio/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(project)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در به‌روزرسانی نمونه‌پروژه.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.project || null;
}

export async function deleteContractorPortfolioProject(projectId: string): Promise<void> {
  const res = await fetch(`/api/partners/contractor/portfolio/${projectId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در حذف نمونه‌پروژه.');
  }
}

export async function createContractorProduct(product: any): Promise<any> {
  const res = await fetch('/api/partners/contractor/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(product)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در ثبت تجهیز پیمانکار.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.product || null;
}

export async function updateContractorProduct(productId: string, product: any): Promise<any> {
  const res = await fetch(`/api/partners/contractor/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(product)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در به‌روزرسانی تجهیز.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.product || null;
}

export async function deleteContractorProduct(productId: string): Promise<void> {
  const res = await fetch(`/api/partners/contractor/products/${productId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در حذف تجهیز.');
  }
}

// =========================================================================
// 2. VENDOR PROFILE & PRODUCTS
// =========================================================================

export interface VendorProfile {
  id: string;
  companyName: string;
  aboutUs?: string;
  address?: string;
  city?: string;
  workingHours?: string;
  website?: string;
  categories?: string[];
  phones?: { label?: string; number: string }[];
  logoKey?: string;
  logoUrl?: string;
  status?: string;
  products?: VendorProductItem[];
}

export interface VendorProductItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  description?: string;
  specs?: any;
  price?: number;
  currency?: string;
  images: string[];
  inStock: boolean;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  warrantyYears?: number;
}

export async function getVendorProfile(): Promise<VendorProfile> {
  const res = await fetch('/api/partners/vendor/profile', {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در دریافت اطلاعات فروشگاه.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.vendor || null;
}

export async function updateVendorProfile(updates: Partial<VendorProfile>): Promise<VendorProfile> {
  const res = await fetch('/api/partners/vendor/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در به‌روزرسانی مشخصات فروشگاه.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.vendor || null;
}

export async function getVendorProducts(): Promise<VendorProductItem[]> {
  const res = await fetch('/api/partners/vendor/products', {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در دریافت لیست محصولات.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.products || [];
}

export async function createVendorProduct(product: Partial<VendorProductItem>): Promise<VendorProductItem> {
  const res = await fetch('/api/partners/vendor/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(product)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در ثبت محصول جدید.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.product || null;
}

export async function updateVendorProduct(productId: string, updates: Partial<VendorProductItem>): Promise<VendorProductItem> {
  const res = await fetch(`/api/partners/vendor/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در ویرایش محصول.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.product || null;
}

export async function updateVendorProductAvailability(
  productId: string,
  availability: 'AVAILABLE' | 'UNAVAILABLE'
): Promise<VendorProductItem> {
  const res = await fetch(`/api/partners/vendor/products/${productId}/availability`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ availability })
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در تغییر وضعیت موجودی محصول.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.product || null;
}

export async function deleteVendorProduct(productId: string): Promise<void> {
  const res = await fetch(`/api/partners/vendor/products/${productId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در حذف محصول.');
  }
}

// =========================================================================
// 3. TECHNICIAN PROFILE, CERTIFICATES & WORK SAMPLES
// =========================================================================

export interface TechnicianCertificate {
  id: string;
  title: string;
  issuingOrg?: string;
  issueYear?: string | number;
  description?: string;
  fileKey?: string;
  imageUrl?: string;
  mimeType?: string;
  verified: boolean;
  createdAt?: string;
}

export interface TechnicianWorkSample {
  id: string;
  title: string;
  description?: string;
  images: string[];
  createdAt?: string;
}

export interface TechnicianProfile {
  id: string;
  fullName: string;
  phone: string;
  specialties: string[];
  serviceCities: string[];
  yearsExperience?: number;
  bio?: string;
  profileImageKey?: string;
  profileImageUrl?: string;
  certifications: TechnicianCertificate[];
  workSamples: TechnicianWorkSample[];
}

export async function getTechnicianProfile(): Promise<TechnicianProfile> {
  const res = await fetch('/api/partners/technician/profile', {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در دریافت پروفایل کارشناس.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.technician || null;
}

export async function updateTechnicianProfile(updates: Partial<TechnicianProfile>): Promise<TechnicianProfile> {
  const res = await fetch('/api/partners/technician/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در به‌روزرسانی مشخصات کارشناس.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.technician || null;
}

export async function createTechnicianCertificate(cert: Partial<TechnicianCertificate>): Promise<TechnicianCertificate> {
  const res = await fetch('/api/partners/technician/certificates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(cert)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در ثبت مدرک یا گواهینامه.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.certificate || null;
}

export async function deleteTechnicianCertificate(certId: string): Promise<void> {
  const res = await fetch(`/api/partners/technician/certificates/${certId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در حذف مدرک.');
  }
}

export async function createTechnicianWorkSample(sample: Partial<TechnicianWorkSample>): Promise<TechnicianWorkSample> {
  const res = await fetch('/api/partners/technician/work-samples', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(sample)
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در ثبت نمونه‌کار.');
  }
  const data = await parseResponseJsonSafe(res);
  return data?.workSample || null;
}

export async function deleteTechnicianWorkSample(sampleId: string): Promise<void> {
  const res = await fetch(`/api/partners/technician/work-samples/${sampleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    await handleResponseError(res, 'خطا در حذف نمونه‌کار.');
  }
}
