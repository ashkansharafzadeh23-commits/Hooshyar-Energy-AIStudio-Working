import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { verifyAuthToken, requireAuth } from './auth.js';
import {
  getFileStorageService,
  validateBinaryFile,
  sanitizeOriginalFilename,
  generateStorageKey,
  validateStorageKey,
  handleMultipartUpload,
  FileValidationError
} from '../storage/index.js';
import { organizationRepository } from '../repositories/organizationRepository.js';
import { vendorRepository } from '../repositories/vendorRepository.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { db } from '../db/index.js';

const partnersRouter = express.Router();

/**
 * Helper to dynamically generate short-lived signed URLs for storage keys.
 * Never persists signed URLs in database.
 */
export async function signMediaItem(keyOrUrl?: string | null): Promise<string> {
  if (!keyOrUrl || typeof keyOrUrl !== 'string') return '';
  if (keyOrUrl.startsWith('data:') || keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }
  if (!validateStorageKey(keyOrUrl)) {
    return keyOrUrl;
  }

  const storageService = getFileStorageService();
  if (storageService && storageService.isConfigured()) {
    try {
      return await storageService.getSignedDownloadUrl({ key: keyOrUrl, expiresInSeconds: 300 });
    } catch (e) {
      console.error('Failed to sign media URL for key:', keyOrUrl, e);
      return `/api/partners/media/file?key=${encodeURIComponent(keyOrUrl)}`;
    }
  }
  return `/api/partners/media/file?key=${encodeURIComponent(keyOrUrl)}`;
}

/**
 * Sign an array of storage keys or URLs
 */
export async function signMediaArray(items?: string[] | null): Promise<string[]> {
  if (!items || !Array.isArray(items)) return [];
  return Promise.all(items.map(item => signMediaItem(item)));
}

/**
 * Helper to resolve the authenticated contractor organization
 */
export function getContractorOrgForUser(user: any): any {
  if (!user) return null;
  const orgs = organizationRepository.findAll?.() || [];
  
  // 1. Direct owner match
  let matched = orgs.find((o: any) => o.createdById === user.id);
  if (matched) return matched;

  // 2. Member match
  for (const org of orgs) {
    const members = organizationRepository.getMembers?.(org.id) || [];
    if (members.some((m: any) => m.userId === user.id && (m.role === 'OWNER' || m.role === 'ADMIN'))) {
      return org;
    }
  }

  // 3. Fallback: If user has role CONTRACTOR or EPC, create an organization automatically
  const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
  if (roles.includes('CONTRACTOR') || roles.includes('EPC') || roles.includes('contractor') || roles.includes('epc')) {
    const created = organizationRepository.create({
      legalName: user.name || 'شرکت مهندسی و پیمانکاری',
      tradeName: user.name || 'شرکت مهندسی و پیمانکاری',
      type: 'EPC_CONTRACTOR',
      verificationStatus: 'NOT_VERIFIED',
      phone: user.phone || '',
      createdById: user.id
    });
    return created;
  }

  return null;
}

/**
 * Helper to resolve the authenticated vendor
 */
export function getVendorForUser(user: any): any {
  if (!user) return null;
  const vendors = vendorRepository.findAll?.() || [];

  // 1. Match by userId or id
  let matched = vendors.find((v: any) => v.userId === user.id || v.id === user.id);
  if (matched) return matched;

  // 2. Match by phone
  if (user.phone) {
    matched = vendors.find((v: any) => (v.phones || []).some((p: any) => p.number === user.phone));
    if (matched) return matched;
  }

  // 3. Match by name
  if (user.name) {
    matched = vendors.find((v: any) => v.companyName === user.name);
    if (matched) return matched;
  }

  // 4. Auto-create if user has VENDOR role
  const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
  if (roles.includes('VENDOR') || roles.includes('vendor')) {
    const created = vendorRepository.create({
      userId: user.id,
      companyName: user.name || 'فروشگاه تجهیزات انرژی',
      logoUrl: '',
      aboutUs: '',
      categories: ['پنل و تجهیزات خورشیدی'],
      address: '',
      city: '',
      phones: [{ label: 'اصلی', number: user.phone || '' }],
      workingHours: '۸:۰۰ الی ۱۷:۰۰',
      website: ''
    });
    return created;
  }

  return null;
}

/**
 * Helper to resolve the authenticated professional (technician)
 */
export function getProfessionalForUser(user: any): any {
  if (!user) return null;
  let pro = professionalRepository.getProfessionalByUserId?.(user.id);
  if (pro) return pro;

  const pros = professionalRepository.getProfessionals?.() || [];
  pro = pros.find((p: any) => p.userId === user.id || (user.phone && p.phone === user.phone));
  if (pro) return pro;

  const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
  if (roles.includes('TECHNICIAN') || roles.includes('technician')) {
    pro = professionalRepository.createProfessional({
      userId: user.id,
      fullName: user.name || 'متخصص خورشیدی',
      phone: user.phone || '',
      specialties: ['متخصص سیستم‌های فتوولتائیک و پنل'],
      serviceCities: [],
      yearsExperience: 0,
      bio: '',
      profileImageUrl: '',
      certifications: [],
      rating: null
    });
    return pro;
  }

  return null;
}

// =========================================================================
// 1. SECURE MEDIA UPLOAD & SIGNED URLS
// =========================================================================

/**
 * POST /api/partners/media/upload
 * Multi-role secure media upload with magic-byte validation, size limits, and S3-compatible storage.
 * Requires authenticated user. Anonymous upload strictly prohibited.
 */
partnersRouter.post(
  '/media/upload',
  verifyAuthToken,
  requireAuth,
  handleMultipartUpload,
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', error: 'دسترسی غیرمجاز. ورود به حساب الزامی است.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ code: 'FILE_MISSING', error: 'فایلی ارسال نشده است.' });
    }

    const rawType = (req.body.entityType || '').toUpperCase();
    const entityType = rawType === 'TECHNICIAN_CERT' ? 'TECHNICIAN_CERTIFICATE' :
                       rawType === 'TECHNICIAN_AVATAR' ? 'TECHNICIAN_PHOTO' : rawType;

    const validEntityTypes = [
      'EPC_LOGO',
      'EPC_PORTFOLIO',
      'EPC_PRODUCT',
      'VENDOR_LOGO',
      'VENDOR_PRODUCT',
      'TECHNICIAN_PHOTO',
      'TECHNICIAN_CERTIFICATE',
      'TECHNICIAN_WORK'
    ];

    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        code: 'INVALID_ENTITY_TYPE',
        error: 'نوع موجودیت رسانه نامعتبر است.'
      });
    }

    // Role-based boundary verification
    const isCertificate = entityType === 'TECHNICIAN_CERTIFICATE';
    const validationOptions = isCertificate
      ? { allowedTypes: ['PDF', 'IMAGE'] as ('PDF' | 'IMAGE')[], maxImageSizeBytes: 5 * 1024 * 1024, maxPdfSizeBytes: 15 * 1024 * 1024 }
      : { allowedTypes: ['IMAGE'] as ('PDF' | 'IMAGE')[], maxImageSizeBytes: 5 * 1024 * 1024 };

    let validationResult;
    try {
      validationResult = validateBinaryFile(file.buffer, file.originalname, file.mimetype, validationOptions);
    } catch (err: any) {
      if (err instanceof FileValidationError) {
        return res.status(err.statusCode || 400).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(400).json({
        code: 'FILE_VALIDATION_ERROR',
        error: err.message || 'اعتبارسنجی فایل ناموفق بود.'
      });
    }

    // Determine storage scope
    let scope: 'contractors' | 'vendors' | 'technicians' = 'contractors';
    if (entityType.startsWith('VENDOR')) scope = 'vendors';
    else if (entityType.startsWith('TECHNICIAN')) scope = 'technicians';

    const storageKey = generateStorageKey({
      scope,
      entityId: user.id,
      category: entityType.toLowerCase(),
      extension: validationResult.extension
    });

    const sanitizedFilename = validationResult.sanitizedFilename || sanitizeOriginalFilename(file.originalname);

    const storageService = getFileStorageService();
    if (!storageService.isConfigured()) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return res.status(503).json({
        code: 'STORAGE_NOT_CONFIGURED',
        error: 'سرویس ذخیره‌سازی ابری پیکربندی نشده است.'
      });
    }

    try {
      await storageService.putObject({
        key: storageKey,
        body: file.buffer,
        contentType: validationResult.detectedMimeType,
        contentLength: validationResult.sizeBytes,
        metadata: {
          uploadedByUserId: user.id,
          entityType,
          originalFilename: sanitizedFilename,
          sha256: validationResult.checksumSha256
        }
      });
    } catch (err: any) {
      console.error('Storage putObject failed:', err);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(502).json({
        code: 'STORAGE_UPLOAD_FAILED',
        error: 'خطا در بارگذاری فایل در فضای ذخیره‌سازی ابری.'
      });
    }

    // Generate short-lived signed download URL
    let downloadUrl = '';
    try {
      downloadUrl = await storageService.getSignedDownloadUrl({ key: storageKey, expiresInSeconds: 300 });
    } catch (e) {
      downloadUrl = `/api/partners/media/file?key=${encodeURIComponent(storageKey)}`;
    }

    return res.status(201).json({
      id: crypto.randomUUID(),
      storageKey,
      filename: sanitizedFilename,
      mimeType: validationResult.detectedMimeType,
      sizeBytes: validationResult.sizeBytes,
      checksumSha256: validationResult.checksumSha256,
      downloadUrl,
      uploadedAt: new Date().toISOString()
    });
  }
);

/**
 * GET /api/partners/media/signed-url
 * Issues a fresh short-lived signed URL for an existing storageKey.
 */
partnersRouter.get('/media/signed-url', async (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key || !validateStorageKey(key)) {
    return res.status(400).json({ error: 'کلید رسانه نامعتبر است.' });
  }

  const storageService = getFileStorageService();
  if (!storageService.isConfigured()) {
    return res.status(503).json({ error: 'سرویس ذخیره‌سازی ابری در دسترس نیست.' });
  }

  try {
    const downloadUrl = await storageService.getSignedDownloadUrl({ key, expiresInSeconds: 300 });
    return res.json({ key, downloadUrl, expiresInSeconds: 300 });
  } catch (err: any) {
    return res.status(500).json({ error: 'خطا در صدور پیوند موقت دانلود.' });
  }
});

/**
 * DELETE /api/partners/media
 * Removes an object from storage if user owns it.
 */
partnersRouter.delete('/media', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const key = req.body.key || (req.query.key as string);
  if (!key || !validateStorageKey(key)) {
    return res.status(400).json({ error: 'کلید فایل نامعتبر است.' });
  }

  // IDOR check: Key format is {scope}/{entityId}/{category}/...
  const parts = key.split('/');
  if (parts.length < 2 || (parts[1] !== req.user.id && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'شما اجازه حذف این فایل را ندارید.' });
  }

  const storageService = getFileStorageService();
  if (storageService.isConfigured()) {
    try {
      await storageService.deleteObject(key);
    } catch (e) {
      console.error('Failed to delete object from storage:', e);
    }
  }

  return res.json({ message: 'حذف انجام شد' });
});

/**
 * GET /api/partners/media/file
 * Fallback media file streaming route for local storage or fallback URLs
 */
partnersRouter.get('/media/file', async (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key || !validateStorageKey(key)) {
    return res.status(400).json({ error: 'کلید فایل نامعتبر است.' });
  }

  const storageService = getFileStorageService();
  if (storageService && storageService.isConfigured()) {
    try {
      const signedUrl = await storageService.getSignedDownloadUrl({ key, expiresInSeconds: 300 });
      return res.redirect(signedUrl);
    } catch (e) {
      console.error('Failed to get signed download URL in /media/file:', e);
    }
  }

  return res.status(404).json({ error: 'فایل یافت نشد یا در دسترس نیست.' });
});

// =========================================================================
// 2. EPC CONTRACTOR PROFILE, PORTFOLIO & OPTIONAL PRODUCTS
// =========================================================================

/**
 * GET /api/partners/contractor/profile
 */
partnersRouter.get('/contractor/profile', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const org = getContractorOrgForUser(req.user);
  if (!org) {
    return res.status(404).json({ error: 'پروفایل شرکت پیمانکاری یافت نشد.' });
  }

  const signedLogoUrl = org.logoKey ? await signMediaItem(org.logoKey) : (org.logoUrl || '');

  // Enrich portfolio with signed image URLs
  const portfolio = await Promise.all(
    (org.projectPortfolio || []).map(async (p: any) => ({
      ...p,
      images: await signMediaArray(p.images)
    }))
  );

  // Retrieve optional products for this contractor
  const allProducts = db.getProducts?.() || [];
  const rawProducts = allProducts.filter((p: any) => p.contractorId === org.id || p.ownerId === org.id);
  const products = await Promise.all(
    rawProducts.map(async (p: any) => ({
      ...p,
      images: await signMediaArray(p.images)
    }))
  );

  return res.json({
    contractor: {
      ...org,
      logoUrl: signedLogoUrl,
      projectPortfolio: portfolio,
      products
    }
  });
});

/**
 * PUT /api/partners/contractor/profile
 */
partnersRouter.put('/contractor/profile', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const org = getContractorOrgForUser(req.user);
  if (!org) {
    return res.status(404).json({ error: 'پروفایل شرکت پیمانکاری یافت نشد.' });
  }

  const { tradeName, legalName, city, address, phone, bio, specialties, logoUrl, logoKey } = req.body;

  const updates: any = {};
  if (tradeName !== undefined) updates.tradeName = tradeName;
  if (legalName !== undefined) updates.legalName = legalName;
  if (city !== undefined) updates.city = city;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  if (bio !== undefined) updates.bio = bio;
  if (specialties !== undefined) updates.specialties = specialties;
  if (logoKey !== undefined) updates.logoKey = logoKey;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl;

  const updated = organizationRepository.update(org.id, updates);
  const signedLogo = updated?.logoKey ? await signMediaItem(updated.logoKey) : (updated?.logoUrl || '');

  return res.json({
    message: 'اطلاعات پروفایل شرکت با موفقیت به‌روزرسانی شد.',
    contractor: {
      ...updated,
      logoUrl: signedLogo
    }
  });
});

/**
 * POST /api/partners/contractor/portfolio
 */
partnersRouter.post('/contractor/portfolio', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const org = getContractorOrgForUser(req.user);
  if (!org) {
    return res.status(404).json({ error: 'پروفایل پیمانکاری یافت نشد.' });
  }

  const { title, projectType, province, city, installedCapacityKw, completionYear, description, images } = req.body;
  if (!title || !projectType) {
    return res.status(400).json({ error: 'عنوان و نوع پروژه الزامی است.' });
  }

  const newProject = {
    id: `port_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    title,
    projectType,
    province: province || '',
    city: city || '',
    installedCapacityKw: installedCapacityKw ? Number(installedCapacityKw) : null,
    completionYear: completionYear || null,
    description: description || '',
    images: Array.isArray(images) ? images : [],
    createdAt: new Date().toISOString()
  };

  const currentPortfolio = Array.isArray(org.projectPortfolio) ? org.projectPortfolio : [];
  const updatedPortfolio = [newProject, ...currentPortfolio];

  organizationRepository.update(org.id, { projectPortfolio: updatedPortfolio });

  const signedProject = {
    ...newProject,
    images: await signMediaArray(newProject.images)
  };

  return res.status(201).json({
    message: 'نمونه‌پروژه با موفقیت ثبت شد.',
    project: signedProject
  });
});

/**
 * PUT /api/partners/contractor/portfolio/:projectId
 */
partnersRouter.put('/contractor/portfolio/:projectId', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const org = getContractorOrgForUser(req.user);
  if (!org) {
    return res.status(404).json({ error: 'پروفایل پیمانکاری یافت نشد.' });
  }

  const { projectId } = req.params;
  const currentPortfolio = Array.isArray(org.projectPortfolio) ? org.projectPortfolio : [];
  const projectIdx = currentPortfolio.findIndex((p: any) => p.id === projectId);

  if (projectIdx === -1) {
    return res.status(404).json({ error: 'پروژه مورد نظر در این شرکت یافت نشد.' });
  }

  const { title, projectType, province, city, installedCapacityKw, completionYear, description, images } = req.body;

  const existing = currentPortfolio[projectIdx];
  const updatedProject = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    projectType: projectType !== undefined ? projectType : existing.projectType,
    province: province !== undefined ? province : existing.province,
    city: city !== undefined ? city : existing.city,
    installedCapacityKw: installedCapacityKw !== undefined ? (installedCapacityKw ? Number(installedCapacityKw) : null) : existing.installedCapacityKw,
    completionYear: completionYear !== undefined ? completionYear : existing.completionYear,
    description: description !== undefined ? description : existing.description,
    images: images !== undefined ? (Array.isArray(images) ? images : []) : existing.images
  };

  currentPortfolio[projectIdx] = updatedProject;
  organizationRepository.update(org.id, { projectPortfolio: currentPortfolio });

  return res.json({
    message: 'نمونه‌پروژه به‌روزرسانی شد.',
    project: {
      ...updatedProject,
      images: await signMediaArray(updatedProject.images)
    }
  });
});

/**
 * DELETE /api/partners/contractor/portfolio/:projectId
 */
partnersRouter.delete('/contractor/portfolio/:projectId', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const org = getContractorOrgForUser(req.user);
  if (!org) {
    return res.status(404).json({ error: 'پروفایل پیمانکاری یافت نشد.' });
  }

  const { projectId } = req.params;
  const currentPortfolio = Array.isArray(org.projectPortfolio) ? org.projectPortfolio : [];
  const project = currentPortfolio.find((p: any) => p.id === projectId);

  if (!project) {
    return res.status(404).json({ error: 'پروژه در سبد پروژه‌های این شرکت یافت نشد.' });
  }

  const filtered = currentPortfolio.filter((p: any) => p.id !== projectId);
  organizationRepository.update(org.id, { projectPortfolio: filtered });

  return res.json({ message: 'حذف انجام شد' });
});

/**
 * POST /api/partners/contractor/products (Optional EPC products)
 */
partnersRouter.post('/contractor/products', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const org = getContractorOrgForUser(req.user);
  if (!org) {
    return res.status(404).json({ error: 'پروفایل پیمانکاری یافت نشد.' });
  }

  const { name, category, brand, model, description, specs, price, images } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'نام و دسته‌بندی تجهیز الزامی است.' });
  }

  const numPrice = price && Number(price) > 0 ? Number(price) : undefined;

  const newProduct = db.createProduct({
    contractorId: org.id,
    ownerId: org.id,
    ownerType: 'CONTRACTOR',
    name,
    category,
    brand: brand || '',
    model: model || '',
    description: description || '',
    specs: specs || {},
    price: numPrice,
    images: Array.isArray(images) ? images : [],
    inStock: true,
    availability: 'AVAILABLE',
    warrantyYears: 0
  } as any);

  return res.status(201).json({
    message: 'محصول با موفقیت اضافه شد',
    product: {
      ...newProduct,
      images: await signMediaArray(newProduct.images)
    }
  });
});

/**
 * PUT /api/partners/contractor/products/:productId
 */
partnersRouter.put('/contractor/products/:productId', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const org = getContractorOrgForUser(req.user);
  if (!org) {
    return res.status(404).json({ error: 'پروفایل پیمانکاری یافت نشد.' });
  }

  const { productId } = req.params;
  const product = db.getProductById?.(productId);
  if (!product) {
    return res.status(404).json({ error: 'تجهیز مورد نظر یافت نشد.' });
  }

  // IDOR check
  if (product.contractorId !== org.id && product.ownerId !== org.id) {
    return res.status(403).json({ error: 'شما اجازه ویرایش این محصول را ندارید.' });
  }

  const { name, category, brand, model, description, specs, price, images } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (brand !== undefined) updates.brand = brand;
  if (model !== undefined) updates.model = model;
  if (description !== undefined) updates.description = description;
  if (specs !== undefined) updates.specs = specs;
  if (price !== undefined) updates.price = price && Number(price) > 0 ? Number(price) : undefined;
  if (images !== undefined) updates.images = Array.isArray(images) ? images : [];

  const updated = db.updateProduct(productId, updates);

  return res.json({
    message: 'تجهیز به‌روزرسانی شد.',
    product: {
      ...updated,
      images: await signMediaArray(updated?.images)
    }
  });
});

/**
 * DELETE /api/partners/contractor/products/:productId
 */
partnersRouter.delete('/contractor/products/:productId', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const org = getContractorOrgForUser(req.user);
  if (!org) {
    return res.status(404).json({ error: 'پروفایل پیمانکاری یافت نشد.' });
  }

  const { productId } = req.params;
  const product = db.getProductById?.(productId);
  if (!product) {
    return res.status(404).json({ error: 'محصول یافت نشد.' });
  }

  // IDOR check
  if (product.contractorId !== org.id && product.ownerId !== org.id) {
    return res.status(403).json({ error: 'شما اجازه حذف این محصول را ندارید.' });
  }

  db.deleteProduct(productId);
  return res.json({ message: 'حذف انجام شد' });
});

// =========================================================================
// 3. VENDOR PROFILE, PRODUCT CATALOG & AVAILABILITY STATUS
// =========================================================================

/**
 * GET /api/partners/vendor/profile
 */
partnersRouter.get('/vendor/profile', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const vendor = getVendorForUser(req.user);
  if (!vendor) {
    return res.status(404).json({ error: 'پروفایل فروشگاه یافت نشد.' });
  }

  const signedLogo = vendor.logoKey ? await signMediaItem(vendor.logoKey) : (vendor.logoUrl || '');

  const allProducts = db.getProducts?.() || [];
  const vendorProducts = allProducts.filter((p: any) => p.vendorId === vendor.id);
  const products = await Promise.all(
    vendorProducts.map(async (p: any) => ({
      ...p,
      availability: p.availability || (p.inStock === false ? 'UNAVAILABLE' : 'AVAILABLE'),
      images: await signMediaArray(p.images)
    }))
  );

  return res.json({
    vendor: {
      ...vendor,
      logoUrl: signedLogo,
      products
    }
  });
});

/**
 * PUT /api/partners/vendor/profile
 */
partnersRouter.put('/vendor/profile', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const vendor = getVendorForUser(req.user);
  if (!vendor) {
    return res.status(404).json({ error: 'پروفایل فروشگاه یافت نشد.' });
  }

  const { companyName, aboutUs, address, city, workingHours, website, categories, phones, logoUrl, logoKey } = req.body;

  const updates: any = {};
  if (companyName !== undefined) updates.companyName = companyName;
  if (aboutUs !== undefined) updates.aboutUs = aboutUs;
  if (address !== undefined) updates.address = address;
  if (city !== undefined) updates.city = city;
  if (workingHours !== undefined) updates.workingHours = workingHours;
  if (website !== undefined) updates.website = website;
  if (categories !== undefined) updates.categories = categories;
  if (phones !== undefined) updates.phones = phones;
  if (logoKey !== undefined) updates.logoKey = logoKey;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl;

  const updated = vendorRepository.update(vendor.id, updates);
  const signedLogo = updated?.logoKey ? await signMediaItem(updated.logoKey) : (updated?.logoUrl || '');

  return res.json({
    message: 'مشخصات فروشگاه با موفقیت به‌روزرسانی شد.',
    vendor: {
      ...updated,
      logoUrl: signedLogo
    }
  });
});

/**
 * GET /api/partners/vendor/products
 */
partnersRouter.get('/vendor/products', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const vendor = getVendorForUser(req.user);
  if (!vendor) {
    return res.status(404).json({ error: 'فروشگاه یافت نشد.' });
  }

  const allProducts = db.getProducts?.() || [];
  const rawProducts = allProducts.filter((p: any) => p.vendorId === vendor.id);

  const products = await Promise.all(
    rawProducts.map(async (p: any) => ({
      ...p,
      availability: p.availability || (p.inStock === false ? 'UNAVAILABLE' : 'AVAILABLE'),
      images: await signMediaArray(p.images)
    }))
  );

  return res.json({ products });
});

/**
 * POST /api/partners/vendor/products
 */
partnersRouter.post('/vendor/products', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const vendor = getVendorForUser(req.user);
  if (!vendor) {
    return res.status(404).json({ error: 'فروشگاه یافت نشد.' });
  }

  const { name, category, brand, model, description, specs, price, images, availability, inStock, warrantyYears } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'نام و دسته‌بندی کالا الزامی است.' });
  }

  const resolvedAvailability = availability === 'UNAVAILABLE' || inStock === false ? 'UNAVAILABLE' : 'AVAILABLE';
  const resolvedInStock = resolvedAvailability === 'AVAILABLE';

  const newProduct = db.createProduct({
    vendorId: vendor.id,
    ownerId: vendor.id,
    ownerType: 'VENDOR',
    name,
    category,
    brand: brand || '',
    model: model || '',
    description: description || '',
    specs: specs || {},
    price: price !== undefined && Number(price) >= 0 ? Number(price) : undefined,
    currency: 'IRR',
    images: Array.isArray(images) ? images : [],
    inStock: resolvedInStock,
    availability: resolvedAvailability,
    warrantyYears: warrantyYears || 0
  } as any);

  return res.status(201).json({
    message: 'محصول با موفقیت اضافه شد',
    product: {
      ...newProduct,
      images: await signMediaArray(newProduct.images)
    }
  });
});

/**
 * PUT /api/partners/vendor/products/:productId
 */
partnersRouter.put('/vendor/products/:productId', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const vendor = getVendorForUser(req.user);
  if (!vendor) {
    return res.status(404).json({ error: 'فروشگاه یافت نشد.' });
  }

  const { productId } = req.params;
  const product = db.getProductById?.(productId);
  if (!product) {
    return res.status(404).json({ error: 'محصول یافت نشد.' });
  }

  // IDOR check: Vendor A cannot edit Vendor B's product
  if (product.vendorId !== vendor.id && product.ownerId !== vendor.id) {
    return res.status(403).json({ error: 'شما اجازه ویرایش این محصول را ندارید.' });
  }

  const { name, category, brand, model, description, specs, price, images, availability, inStock, warrantyYears } = req.body;

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (brand !== undefined) updates.brand = brand;
  if (model !== undefined) updates.model = model;
  if (description !== undefined) updates.description = description;
  if (specs !== undefined) updates.specs = specs;
  if (price !== undefined) updates.price = price !== undefined && Number(price) >= 0 ? Number(price) : undefined;
  if (images !== undefined) updates.images = Array.isArray(images) ? images : [];
  if (warrantyYears !== undefined) updates.warrantyYears = Number(warrantyYears) || 0;

  if (availability !== undefined || inStock !== undefined) {
    const resolvedAvailability = availability === 'UNAVAILABLE' || inStock === false ? 'UNAVAILABLE' : 'AVAILABLE';
    updates.availability = resolvedAvailability;
    updates.inStock = resolvedAvailability === 'AVAILABLE';
  }

  const updated = db.updateProduct(productId, updates);

  return res.json({
    message: 'محصول به‌روزرسانی شد.',
    product: {
      ...updated,
      images: await signMediaArray(updated?.images)
    }
  });
});

/**
 * PATCH /api/partners/vendor/products/:productId/availability
 * Explicit vendor control over product availability: AVAILABLE («موجود») vs UNAVAILABLE («ناموجود»)
 * Strictly enforces vendor ownership (IDOR).
 */
partnersRouter.patch('/vendor/products/:productId/availability', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const vendor = getVendorForUser(req.user);
  if (!vendor) {
    return res.status(404).json({ error: 'فروشگاه یافت نشد.' });
  }

  const { productId } = req.params;
  const product = db.getProductById?.(productId);
  if (!product) {
    return res.status(404).json({ error: 'محصول یافت نشد.' });
  }

  // IDOR check: Vendor A cannot change Vendor B's product availability
  if (product.vendorId !== vendor.id && product.ownerId !== vendor.id) {
    return res.status(403).json({ error: 'شما اجازه تغییر وضعیت موجودی این محصول را ندارید.' });
  }

  const targetAvailability = (req.body.availability || (req.body.inStock ? 'AVAILABLE' : 'UNAVAILABLE')).toUpperCase();
  const valid = targetAvailability === 'AVAILABLE' || targetAvailability === 'UNAVAILABLE';

  if (!valid) {
    return res.status(400).json({ error: 'وضعیت نامعتبر است. وضعیت باید موجود (AVAILABLE) یا ناموجود (UNAVAILABLE) باشد.' });
  }

  const updated = db.updateProduct(productId, {
    availability: targetAvailability as 'AVAILABLE' | 'UNAVAILABLE',
    inStock: targetAvailability === 'AVAILABLE'
  });

  return res.json({
    message: `وضعیت محصول با موفقیت به ${targetAvailability === 'AVAILABLE' ? 'موجود' : 'ناموجود'} تغییر یافت.`,
    product: updated
  });
});

/**
 * DELETE /api/partners/vendor/products/:productId
 */
partnersRouter.delete('/vendor/products/:productId', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const vendor = getVendorForUser(req.user);
  if (!vendor) {
    return res.status(404).json({ error: 'فروشگاه یافت نشد.' });
  }

  const { productId } = req.params;
  const product = db.getProductById?.(productId);
  if (!product) {
    return res.status(404).json({ error: 'محصول یافت نشد.' });
  }

  // IDOR check
  if (product.vendorId !== vendor.id && product.ownerId !== vendor.id) {
    return res.status(403).json({ error: 'شما اجازه حذف این محصول را ندارید.' });
  }

  db.deleteProduct(productId);
  return res.json({ message: 'حذف انجام شد' });
});

// =========================================================================
// 4. TECHNICIAN PROFILE, CERTIFICATES & WORK SAMPLES
// =========================================================================

/**
 * GET /api/partners/technician/profile
 */
partnersRouter.get('/technician/profile', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const pro = getProfessionalForUser(req.user);
  if (!pro) {
    return res.status(404).json({ error: 'پروفایل کارشناس یافت نشد.' });
  }

  const signedPhoto = pro.profileImageKey ? await signMediaItem(pro.profileImageKey) : (pro.profileImageUrl || '');

  // Sign certificates
  const certifications = await Promise.all(
    (pro.certifications || []).map(async (c: any) => ({
      ...c,
      imageUrl: c.fileKey ? await signMediaItem(c.fileKey) : (c.imageUrl || '')
    }))
  );

  // Sign work samples
  const workSamples = await Promise.all(
    (pro.workSamples || []).map(async (w: any) => ({
      ...w,
      images: await signMediaArray(w.images)
    }))
  );

  return res.json({
    technician: {
      ...pro,
      profileImageUrl: signedPhoto,
      certifications,
      workSamples
    }
  });
});

/**
 * PUT /api/partners/technician/profile
 */
partnersRouter.put('/technician/profile', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const pro = getProfessionalForUser(req.user);
  if (!pro) {
    return res.status(404).json({ error: 'پروفایل کارشناس یافت نشد.' });
  }

  const { fullName, phone, specialties, serviceCities, yearsExperience, bio, profileImageUrl, profileImageKey } = req.body;

  const updates: any = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (specialties !== undefined) updates.specialties = specialties;
  if (serviceCities !== undefined) updates.serviceCities = serviceCities;
  if (yearsExperience !== undefined) updates.yearsExperience = Number(yearsExperience) || 0;
  if (bio !== undefined) updates.bio = bio;
  if (profileImageKey !== undefined) updates.profileImageKey = profileImageKey;
  if (profileImageUrl !== undefined) updates.profileImageUrl = profileImageUrl;

  const updated = professionalRepository.updateProfessional(pro.id, updates);
  const signedPhoto = updated?.profileImageKey ? await signMediaItem(updated.profileImageKey) : (updated?.profileImageUrl || '');

  return res.json({
    message: 'پروفایل کارشناس با موفقیت به‌روزرسانی شد.',
    technician: {
      ...updated,
      profileImageUrl: signedPhoto
    }
  });
});

/**
 * POST /api/partners/technician/certificates
 */
partnersRouter.post(['/technician/certificates', '/technician/certifications'], verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const pro = getProfessionalForUser(req.user);
  if (!pro) {
    return res.status(404).json({ error: 'پروفایل کارشناس یافت نشد.' });
  }

  const { title, issuingOrg, issueYear, description, fileKey, imageUrl, mimeType } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'عنوان گواهینامه یا مدرک الزامی است.' });
  }

  const newCert = {
    id: `cert_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    title,
    issuingOrg: issuingOrg || '',
    issueYear: issueYear || '',
    description: description || '',
    fileKey: fileKey || '',
    imageUrl: imageUrl || '',
    mimeType: mimeType || 'image/jpeg',
    verified: false,
    createdAt: new Date().toISOString()
  };

  const currentCerts = Array.isArray(pro.certifications) ? pro.certifications : [];
  const updatedCerts = [newCert, ...currentCerts];

  professionalRepository.updateProfessional(pro.id, { certifications: updatedCerts });

  const signedCert = {
    ...newCert,
    imageUrl: newCert.fileKey ? await signMediaItem(newCert.fileKey) : newCert.imageUrl
  };

  return res.status(201).json({
    message: 'مدرک یا گواهینامه با موفقیت ثبت شد.',
    certificate: signedCert
  });
});

/**
 * DELETE /api/partners/technician/certificates/:certId
 */
partnersRouter.delete(['/technician/certificates/:certId', '/technician/certifications/:certId'], verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const pro = getProfessionalForUser(req.user);
  if (!pro) {
    return res.status(404).json({ error: 'پروفایل کارشناس یافت نشد.' });
  }

  const { certId } = req.params;
  const currentCerts = Array.isArray(pro.certifications) ? pro.certifications : [];
  const cert = currentCerts.find((c: any) => c.id === certId);

  if (!cert) {
    return res.status(404).json({ error: 'مدرک در سوابق این کارشناس یافت نشد.' });
  }

  const filtered = currentCerts.filter((c: any) => c.id !== certId);
  professionalRepository.updateProfessional(pro.id, { certifications: filtered });

  return res.json({ message: 'حذف انجام شد' });
});

/**
 * POST /api/partners/technician/work-samples
 */
partnersRouter.post('/technician/work-samples', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const pro = getProfessionalForUser(req.user);
  if (!pro) {
    return res.status(404).json({ error: 'پروفایل کارشناس یافت نشد.' });
  }

  const { title, description, images } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'عنوان نمونه‌کار الزامی است.' });
  }

  const newSample = {
    id: `work_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    title,
    description: description || '',
    images: Array.isArray(images) ? images : [],
    createdAt: new Date().toISOString()
  };

  const currentSamples = Array.isArray(pro.workSamples) ? pro.workSamples : [];
  const updatedSamples = [newSample, ...currentSamples];

  professionalRepository.updateProfessional(pro.id, { workSamples: updatedSamples });

  const signedSample = {
    ...newSample,
    images: await signMediaArray(newSample.images)
  };

  return res.status(201).json({
    message: 'نمونه‌کار فنی با موفقیت ثبت شد.',
    workSample: signedSample
  });
});

/**
 * DELETE /api/partners/technician/work-samples/:sampleId
 */
partnersRouter.delete('/technician/work-samples/:sampleId', verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const pro = getProfessionalForUser(req.user);
  if (!pro) {
    return res.status(404).json({ error: 'پروفایل کارشناس یافت نشد.' });
  }

  const { sampleId } = req.params;
  const currentSamples = Array.isArray(pro.workSamples) ? pro.workSamples : [];
  const sample = currentSamples.find((s: any) => s.id === sampleId);

  if (!sample) {
    return res.status(404).json({ error: 'نمونه‌کار در سوابق این کارشناس یافت نشد.' });
  }

  const filtered = currentSamples.filter((s: any) => s.id !== sampleId);
  professionalRepository.updateProfessional(pro.id, { workSamples: filtered });

  return res.json({ message: 'حذف انجام شد' });
});

export default partnersRouter;
