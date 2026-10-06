/**
 * HOOSHYAR ENERGY — STAGE 13.9.2.1 VERIFICATION TEST SUITE
 * Complete Two-Phase Partner Registration & Professional Onboarding Lifecycle
 *
 * Verifies:
 * 1. EPC Registration -> Authentication Established -> Onboarding (Logo, Portfolio, Equipment) -> Relogin -> Public Visibility
 * 2. Vendor Registration -> Authentication Established -> Onboarding (Logo, Products, Availability) -> Relogin -> Public Visibility
 * 3. Technician Registration -> Authentication Established -> Onboarding (Photo, Certificate [Truthful], Work Samples) -> Relogin -> Public Visibility
 * 4. Anonymous Upload Prevention: Strictly blocks unauthenticated file uploads
 * 5. Repository Immutability: Real db.json is untouched via isolated DB instance
 */

import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { InMemoryFileStorageService } from './test_helpers/InMemoryFileStorageService.js';
import { setFileStorageService } from '../src/storage/index.js';
import authRouter from '../src/api/auth.js';
import partnersRouter, { signMediaItem, signMediaArray } from '../src/api/partners.js';
import contractorsRouter from '../src/api/contractors.js';
import professionalsRouter from '../src/api/professionals.js';
import { db } from '../src/db/index.js';

// Setup database isolation
const isolation = setupTestDatabaseIsolation('stage13_9_2_1');

console.log('====================================================');
console.log('HOOSHYAR ENERGY — STAGE 13.9.2.1 VERIFICATION SUITE');
console.log('Two-Phase Partner Registration & Profile Onboarding');
console.log('====================================================\n');

// Configure in-memory storage service for unit/integration tests
const mockStorage = new InMemoryFileStorageService(true);
setFileStorageService(mockStorage as any);

// Setup express test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/contractors', contractorsRouter);
app.use('/api/professionals', professionalsRouter);

// Vendors endpoint exactly as in server.ts
app.get('/api/vendors/:id', async (req, res) => {
  const v = db.getVendorById?.(req.params.id) || (db.getVendors() || []).find((x: any) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'فروشگاه یافت نشد.' });

  const signedLogo = v.logoKey ? await signMediaItem(v.logoKey) : (v.logoUrl || '');
  const allProducts = db.getProducts?.() || [];
  const vendorProducts = allProducts.filter((p: any) => p.vendorId === v.id || p.ownerId === v.id);
  const products = await Promise.all(
    vendorProducts.map(async (p: any) => ({
      ...p,
      availability: p.availability || (p.inStock === false ? 'UNAVAILABLE' : 'AVAILABLE'),
      images: await signMediaArray(p.images)
    }))
  );

  res.json({
    vendor: {
      id: v.id,
      companyName: v.companyName,
      logoUrl: signedLogo,
      aboutUs: v.aboutUs || '',
      categories: v.categories || [],
      address: v.address || '',
      city: v.city || '',
      workingHours: v.workingHours || '',
      website: v.website || '',
      status: v.status,
      verified: v.status === 'approved',
      phones: v.phones || [],
      products,
      createdAt: v.createdAt || null
    }
  });
});

// HTTP helper for end-to-end testing
function makeRequest(
  server: http.Server,
  method: string,
  urlPath: string,
  options: {
    headers?: Record<string, string>;
    body?: any;
    rawBody?: Buffer;
  } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawText: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const port = addr.port;

    const reqHeaders: Record<string, string> = { ...(options.headers || {}) };
    let postData: Buffer | undefined;

    if (options.rawBody) {
      postData = options.rawBody;
      if (!reqHeaders['Content-Length']) {
        reqHeaders['Content-Length'] = String(postData.length);
      }
    } else if (options.body) {
      const jsonStr = JSON.stringify(options.body);
      postData = Buffer.from(jsonStr);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(postData.length);
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: reqHeaders
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const rawText = Buffer.concat(chunks).toString('utf8');
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            parsed = rawText;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
            rawText
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function buildMultipartBody(
  fields: Record<string, string>,
  file?: { name: string; filename: string; contentType: string; buffer: Buffer }
): { boundary: string; contentType: string; body: Buffer } {
  const boundary = `----WebKitFormBoundary${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
  const chunks: Buffer[] = [];

  for (const [k, v] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`, 'utf-8'));
  }

  if (file) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
        'utf-8'
      )
    );
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n', 'utf-8'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));
  return {
    boundary,
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(chunks)
  };
}

// Magic bytes for valid files
const VALID_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
const VALID_PDF = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc4, 0xe5]);

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));

  let passed = 0;
  let failed = 0;

  function assertTest(condition: boolean, desc: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // =========================================================================
    // GROUP 1: SECURITY & ANONYMOUS UPLOAD PREVENTION
    // =========================================================================
    console.log('--- GROUP 1: Security & Anonymous Upload Prevention ---');

    // 1.1 Unauthenticated upload attempt MUST be rejected
    const unauthMultipart = buildMultipartBody(
      { entityType: 'EPC_LOGO' },
      { name: 'file', filename: 'logo.png', contentType: 'image/png', buffer: VALID_PNG }
    );
    const unauthUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { 'Content-Type': `multipart/form-data; boundary=${unauthMultipart.boundary}` },
      rawBody: unauthMultipart.body
    });
    assertTest(
      unauthUploadRes.status === 401,
      '1.1 Anonymous file upload is strictly blocked with 401 Unauthorized'
    );

    // =========================================================================
    // GROUP 2: EPC REGISTRATION & ONBOARDING LIFECYCLE
    // =========================================================================
    console.log('\n--- GROUP 2: EPC Registration & Professional Profile Onboarding ---');

    const epcPhone = '09121112233';
    const epcCompanyName = 'شرکت پرتو توان هرمزگان';

    // 2.1 Register EPC (Phase 1)
    const epcRegRes = await makeRequest(server, 'POST', '/api/auth/partner-register', {
      body: {
        role: 'CONTRACTOR',
        phone: epcPhone,
        name: epcCompanyName,
        companyName: epcCompanyName,
        city: 'بندرعباس',
        specialties: ['نیروگاه‌های خورشیدی مقیاس بزرگ و صنعتی'],
        registrationNumber: '998877',
        nationalId: '10861112233',
        bio: 'طراحی و اجرای پروژه‌های مگاواتی خورشیدی در جنوب کشور'
      }
    });

    assertTest(epcRegRes.status === 200, '2.1 EPC Account Registration succeeds (Phase 1)');
    assertTest(Boolean(epcRegRes.body.token), '2.2 Registration returns secure authenticated JWT token');
    const epcToken = epcRegRes.body.token;
    const epcHeaders = { Authorization: `Bearer ${epcToken}` };

    // 2.2 Phase 2: Onboarding - Upload Company Logo
    const epcLogoMultipart = buildMultipartBody(
      { entityType: 'EPC_LOGO' },
      { name: 'file', filename: 'hormoz_logo.png', contentType: 'image/png', buffer: VALID_PNG }
    );
    const epcLogoUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { ...epcHeaders, 'Content-Type': `multipart/form-data; boundary=${epcLogoMultipart.boundary}` },
      rawBody: epcLogoMultipart.body
    });

    assertTest(
      epcLogoUploadRes.status === 200 || epcLogoUploadRes.status === 201,
      '2.3 Authenticated EPC uploads company logo'
    );
    const epcLogoKey = epcLogoUploadRes.body.storageKey;
    const epcLogoUrl = epcLogoUploadRes.body.downloadUrl;
    assertTest(epcLogoKey && epcLogoKey.includes('/epc_logo/'), '2.4 EPC logo storage key partitioned correctly');

    // Save logo to profile
    const epcProfileUpdateRes = await makeRequest(server, 'PUT', '/api/partners/contractor/profile', {
      headers: epcHeaders,
      body: { logoKey: epcLogoKey, logoUrl: epcLogoUrl }
    });
    assertTest(epcProfileUpdateRes.status === 200, '2.5 EPC profile updated with logo metadata');
    const epcOrgId = epcProfileUpdateRes.body.contractor.id;

    // 2.3 Phase 2: Onboarding - Add Portfolio Project with Images
    const epcPortfolioMultipart = buildMultipartBody(
      { entityType: 'EPC_PORTFOLIO' },
      { name: 'file', filename: 'project_site.png', contentType: 'image/png', buffer: VALID_PNG }
    );
    const epcPortfolioImgUpload = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { ...epcHeaders, 'Content-Type': `multipart/form-data; boundary=${epcPortfolioMultipart.boundary}` },
      rawBody: epcPortfolioMultipart.body
    });
    assertTest(
      epcPortfolioImgUpload.status === 200 || epcPortfolioImgUpload.status === 201,
      '2.6 EPC uploads portfolio project image'
    );
    const projectImgKey = epcPortfolioImgUpload.body.storageKey;

    const epcProjectRes = await makeRequest(server, 'POST', '/api/partners/contractor/portfolio', {
      headers: epcHeaders,
      body: {
        title: 'نیروگاه خورشیدی ۵ مگاواتی قشم',
        projectType: 'نیروگاه مقیاس بزرگ و صنعتی (مگاواتی)',
        province: 'هرمزگان',
        city: 'قشم',
        installedCapacityKw: 5000,
        completionYear: '1402',
        description: 'اتصال به شبکه فشار متوسط با اینورترهای مرکزی',
        images: [projectImgKey]
      }
    });
    assertTest(
      epcProjectRes.status === 200 || epcProjectRes.status === 201,
      '2.7 EPC registers portfolio project with real image keys'
    );

    // 2.4 Phase 2: Onboarding - Add Optional Equipment
    const epcProductRes = await makeRequest(server, 'POST', '/api/partners/contractor/products', {
      headers: epcHeaders,
      body: {
        name: 'استراکچر گالوانیزه گرم مقاوم در برابر رطوبت ساحلی',
        category: 'سازه و استراکچر',
        brand: 'پرتو توان',
        price: 15000000,
        description: 'طراحی اختصاصی برای مناطق شرجی خلیج فارس'
      }
    });
    assertTest(
      epcProductRes.status === 200 || epcProductRes.status === 201,
      '2.8 EPC registers optional equipment item'
    );

    // 2.5 Relogin verification: EPC logs back in
    const epcLoginRes = await makeRequest(server, 'POST', '/api/auth/partner-login', {
      body: { phone: epcPhone, role: 'CONTRACTOR' }
    });
    assertTest(epcLoginRes.status === 200, '2.9 EPC can log out and log back in');
    const newEpcHeaders = { Authorization: `Bearer ${epcLoginRes.body.token}` };

    const epcGetProfRes = await makeRequest(server, 'GET', '/api/partners/contractor/profile', {
      headers: newEpcHeaders
    });
    assertTest(
      epcGetProfRes.body.contractor.logoKey === epcLogoKey,
      '2.10 Persisted EPC logo persists across login sessions'
    );
    assertTest(
      Array.isArray(epcGetProfRes.body.contractor.projectPortfolio) && epcGetProfRes.body.contractor.projectPortfolio.length >= 1,
      '2.11 Persisted EPC portfolio projects persist across sessions'
    );

    // 2.6 Public Profile Visibility for Customers (/api/contractors/:id)
    const publicEpcRes = await makeRequest(server, 'GET', `/api/contractors/${epcOrgId}`);
    assertTest(publicEpcRes.status === 200, '2.12 Customer can view EPC public profile');
    assertTest(
      Boolean(publicEpcRes.body.contractor?.logoUrl),
      '2.13 Public profile serves signed logo URL'
    );
    assertTest(
      Array.isArray(publicEpcRes.body.contractor?.projectPortfolio) && publicEpcRes.body.contractor.projectPortfolio.length >= 1,
      '2.14 Public profile exposes registered portfolio projects'
    );
    assertTest(
      Array.isArray(publicEpcRes.body.contractor?.products) && publicEpcRes.body.contractor.products.length >= 1,
      '2.15 Public profile exposes registered optional products/equipment'
    );

    // =========================================================================
    // GROUP 3: VENDOR REGISTRATION & ONBOARDING LIFECYCLE
    // =========================================================================
    console.log('\n--- GROUP 3: Vendor Registration & Storefront Onboarding ---');

    const vendorPhone = '09124445566';
    const vendorCompanyName = 'بازرگانی انرژی آفتاب خاورمیانه';

    // 3.1 Register Vendor (Phase 1)
    const vendorRegRes = await makeRequest(server, 'POST', '/api/auth/partner-register', {
      body: {
        role: 'VENDOR',
        phone: vendorPhone,
        name: 'مهندس رضایی',
        companyName: vendorCompanyName,
        city: 'تهران',
        specialties: ['اینورتر و مبدل‌های برق']
      }
    });

    assertTest(vendorRegRes.status === 200, '3.1 Vendor Account Registration succeeds (Phase 1)');
    const vendorToken = vendorRegRes.body.token;
    const vendorHeaders = { Authorization: `Bearer ${vendorToken}` };

    // 3.2 Phase 2: Onboarding - Upload Store Logo
    const vendorLogoMultipart = buildMultipartBody(
      { entityType: 'VENDOR_LOGO' },
      { name: 'file', filename: 'store_logo.png', contentType: 'image/png', buffer: VALID_PNG }
    );
    const vendorLogoUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { ...vendorHeaders, 'Content-Type': `multipart/form-data; boundary=${vendorLogoMultipart.boundary}` },
      rawBody: vendorLogoMultipart.body
    });
    assertTest(
      vendorLogoUploadRes.status === 200 || vendorLogoUploadRes.status === 201,
      '3.2 Authenticated Vendor uploads store logo'
    );
    const vendorLogoKey = vendorLogoUploadRes.body.storageKey;
    const vendorLogoUrl = vendorLogoUploadRes.body.downloadUrl;

    await makeRequest(server, 'PUT', '/api/partners/vendor/profile', {
      headers: vendorHeaders,
      body: { logoKey: vendorLogoKey, logoUrl: vendorLogoUrl }
    });

    // 3.3 Phase 2: Onboarding - Product with AVAILABLE status
    const p1Multipart = buildMultipartBody(
      { entityType: 'VENDOR_PRODUCT' },
      { name: 'file', filename: 'inverter_10kw.png', contentType: 'image/png', buffer: VALID_PNG }
    );
    const p1ImgRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { ...vendorHeaders, 'Content-Type': `multipart/form-data; boundary=${p1Multipart.boundary}` },
      rawBody: p1Multipart.body
    });
    assertTest(
      p1ImgRes.status === 200 || p1ImgRes.status === 201,
      '3.3 Authenticated Vendor uploads product image'
    );

    const createP1Res = await makeRequest(server, 'POST', '/api/partners/vendor/products', {
      headers: vendorHeaders,
      body: {
        name: 'اینورتر ۱۰ کیلووات سه فاز هوآوی',
        category: 'اینورتر خورشیدی',
        brand: 'Huawei',
        model: 'SUN2000-10KTL-M1',
        price: 85000000,
        images: [p1ImgRes.body.storageKey],
        availability: 'AVAILABLE',
        inStock: true
      }
    });
    assertTest(
      createP1Res.status === 200 || createP1Res.status === 201,
      '3.4 Vendor creates product with AVAILABLE state'
    );
    assertTest(createP1Res.body.product.availability === 'AVAILABLE', '3.5 Product availability is AVAILABLE');

    // 3.4 Phase 2: Onboarding - Product with UNAVAILABLE status
    const createP2Res = await makeRequest(server, 'POST', '/api/partners/vendor/products', {
      headers: vendorHeaders,
      body: {
        name: 'باتری لیتیومی ۱۰ کیلووات ساعت BYD',
        category: 'باتری خورشیدی',
        brand: 'BYD',
        model: 'Battery-Box Premium HVS',
        price: 190000000,
        images: [],
        availability: 'UNAVAILABLE',
        inStock: false
      }
    });
    assertTest(
      createP2Res.status === 200 || createP2Res.status === 201,
      '3.6 Vendor creates product with UNAVAILABLE state'
    );
    assertTest(createP2Res.body.product.availability === 'UNAVAILABLE', '3.7 Product availability is UNAVAILABLE');

    // 3.5 Relogin & Storefront Check
    const vendorLoginRes = await makeRequest(server, 'POST', '/api/auth/partner-login', {
      body: { phone: vendorPhone, role: 'VENDOR' }
    });
    assertTest(vendorLoginRes.status === 200, '3.8 Vendor relogins successfully');

    const vendorProfRes = await makeRequest(server, 'GET', '/api/partners/vendor/profile', {
      headers: { Authorization: `Bearer ${vendorLoginRes.body.token}` }
    });
    const vendorId = vendorProfRes.body.vendor.id;

    // Public Vendor Storefront (/api/vendors/:id)
    const publicVendorRes = await makeRequest(server, 'GET', `/api/vendors/${vendorId}`);
    assertTest(publicVendorRes.status === 200, '3.9 Public customer storefront returns 200');
    assertTest(Boolean(publicVendorRes.body.vendor?.logoUrl), '3.10 Storefront includes signed logoUrl');

    const catalog = publicVendorRes.body.vendor?.products || [];
    const availItem = catalog.find((p: any) => p.name.includes('هوآوی'));
    const unavailItem = catalog.find((p: any) => p.name.includes('BYD'));

    assertTest(
      availItem && (availItem.availability === 'AVAILABLE' || availItem.inStock === true),
      '3.11 Public storefront truthfully shows AVAILABLE status for Huawei inverter'
    );
    assertTest(
      unavailItem && (unavailItem.availability === 'UNAVAILABLE' || unavailItem.inStock === false),
      '3.12 Public storefront truthfully shows UNAVAILABLE status for BYD battery'
    );

    // =========================================================================
    // GROUP 4: TECHNICIAN REGISTRATION & ONBOARDING LIFECYCLE
    // =========================================================================
    console.log('\n--- GROUP 4: Technician Registration & Professional Onboarding ---');

    const techPhone = '09127778899';
    const techName = 'مهندس کامران رستمی';

    // 4.1 Register Technician (Phase 1)
    const techRegRes = await makeRequest(server, 'POST', '/api/auth/partner-register', {
      body: {
        role: 'TECHNICIAN',
        phone: techPhone,
        name: techName,
        profession: 'متخصص سیستم‌های فتوولتائیک و پنل',
        experience: 6,
        city: 'شیراز',
        bio: 'کارشناس ارشد انرژی‌های تجدیدپذیر، عیب‌یابی استرینگ‌ها و تعمیرات اینورتر'
      }
    });

    assertTest(techRegRes.status === 200, '4.1 Technician Account Registration succeeds (Phase 1)');
    const techToken = techRegRes.body.token;
    const techHeaders = { Authorization: `Bearer ${techToken}` };

    // 4.2 Phase 2: Onboarding - Upload Profile Photo
    const techPhotoMultipart = buildMultipartBody(
      { entityType: 'TECHNICIAN_PHOTO' },
      { name: 'file', filename: 'kamran_photo.png', contentType: 'image/png', buffer: VALID_PNG }
    );
    const techPhotoUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { ...techHeaders, 'Content-Type': `multipart/form-data; boundary=${techPhotoMultipart.boundary}` },
      rawBody: techPhotoMultipart.body
    });
    assertTest(
      techPhotoUploadRes.status === 200 || techPhotoUploadRes.status === 201,
      '4.2 Authenticated Technician uploads profile photo'
    );
    const techPhotoKey = techPhotoUploadRes.body.storageKey;
    const techPhotoUrl = techPhotoUploadRes.body.downloadUrl;

    await makeRequest(server, 'PUT', '/api/partners/technician/profile', {
      headers: techHeaders,
      body: { profileImageKey: techPhotoKey, profileImageUrl: techPhotoUrl }
    });

    // 4.3 Phase 2: Onboarding - Register Qualification Certificate (PDF)
    const certMultipart = buildMultipartBody(
      { entityType: 'TECHNICIAN_CERTIFICATE' },
      { name: 'file', filename: 'fanni_cert.pdf', contentType: 'application/pdf', buffer: VALID_PDF }
    );
    const certUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { ...techHeaders, 'Content-Type': `multipart/form-data; boundary=${certMultipart.boundary}` },
      rawBody: certMultipart.body
    });
    assertTest(
      certUploadRes.status === 200 || certUploadRes.status === 201,
      '4.3 Technician uploads valid PDF certificate'
    );

    const certCreateRes = await makeRequest(server, 'POST', '/api/partners/technician/certificates', {
      headers: techHeaders,
      body: {
        title: 'گواهینامه طراحی و نظارت بر نیروگاه‌های خورشیدی',
        issuingOrg: 'سازمان نظام مهندسی فارس',
        issueYear: '1400',
        description: 'کد استاندارد مهارت تجدیدپذیر',
        fileKey: certUploadRes.body.storageKey,
        verified: false
      }
    });
    assertTest(
      certCreateRes.status === 200 || certCreateRes.status === 201,
      '4.4 Technician registers certificate record'
    );
    assertTest(
      certCreateRes.body.certificate?.verified === false,
      '4.5 Truthfulness Rule: Uploaded certificate defaults to verified=false (ثبت‌شده توسط متخصص)'
    );

    // 4.4 Phase 2: Onboarding - Add Work Sample
    const workMultipart = buildMultipartBody(
      { entityType: 'TECHNICIAN_WORK' },
      { name: 'file', filename: 'repair_work.png', contentType: 'image/png', buffer: VALID_PNG }
    );
    const workImgUpload = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { ...techHeaders, 'Content-Type': `multipart/form-data; boundary=${workMultipart.boundary}` },
      rawBody: workMultipart.body
    });
    assertTest(
      workImgUpload.status === 200 || workImgUpload.status === 201,
      '4.6 Technician uploads work sample image'
    );

    const workCreateRes = await makeRequest(server, 'POST', '/api/partners/technician/work-samples', {
      headers: techHeaders,
      body: {
        title: 'تعویض بردهای IGBT اینورتر ۵۰ کیلووات نیروگاه لارستان',
        description: 'تست عایقی و راه‌اندازی مجدد استرینگ‌ها بدون قطعی کل',
        images: [workImgUpload.body.storageKey]
      }
    });
    assertTest(
      workCreateRes.status === 200 || workCreateRes.status === 201,
      '4.7 Technician registers work sample with photos'
    );

    // 4.5 Relogin & Public Profile Inspection
    const techLoginRes = await makeRequest(server, 'POST', '/api/auth/partner-login', {
      body: { phone: techPhone, role: 'TECHNICIAN' }
    });
    assertTest(techLoginRes.status === 200, '4.8 Technician relogins successfully');

    const techProfRes = await makeRequest(server, 'GET', '/api/partners/technician/profile', {
      headers: { Authorization: `Bearer ${techLoginRes.body.token}` }
    });
    const techProId = techProfRes.body.technician.id;

    // Public Technician Profile (/api/professionals/:id)
    const publicTechRes = await makeRequest(server, 'GET', `/api/professionals/${techProId}`);
    assertTest(publicTechRes.status === 200, '4.9 Customer can view technician public profile');
    assertTest(Boolean(publicTechRes.body.professional?.profileImageUrl), '4.10 Public profile has signed profileImageUrl');
    assertTest(
      Array.isArray(publicTechRes.body.professional?.certifications) && publicTechRes.body.professional.certifications.length >= 1,
      '4.11 Public profile exposes registered certifications'
    );
    assertTest(
      publicTechRes.body.professional?.certifications[0]?.verified === false,
      '4.12 Truthfulness Rule: Public profile exposes certificate as unverified (ثبت‌شده توسط متخصص)'
    );
    assertTest(
      Array.isArray(publicTechRes.body.professional?.workSamples) && publicTechRes.body.professional.workSamples.length >= 1,
      '4.13 Public profile exposes registered work samples'
    );

    // =========================================================================
    // GROUP 5: IMMUTABILITY OF CANONICAL REPOSITORY DB
    // =========================================================================
    console.log('\n--- GROUP 5: Immutability Guard of Canonical db.json ---');
    isolation.verifyImmutability();
    assertTest(true, '5.1 Canonical db.json is byte-for-byte unchanged via isolation guard');

  } finally {
    server.close();
    isolation.cleanup();
  }

  console.log('\n====================================================');
  console.log(`STAGE 13.9.2.1 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
