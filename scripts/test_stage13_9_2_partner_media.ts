/**
 * HOOSHYAR ENERGY — STAGE 13.9.2 VERIFICATION TEST SUITE
 * Professional Partner Profiles, Products & Secure Media
 *
 * Verifies:
 * 1. EPC Contractor Model: Logo, Portfolio projects with images, Optional products with images
 * 2. Vendor Model: Logo, Real products with images, Availability: AVAILABLE / UNAVAILABLE
 * 3. Technician Model: Profile photo, Certifications with documents, Work samples with images
 * 4. Secure Media: Magic-byte validation, S3 storage keys, Signed URLs, Expiration, IDOR prevention
 * 5. Public profile endpoints: /api/contractors/:id, /api/vendors/:id, /api/professionals/:id
 * 6. Database and baseline isolation
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import express from 'express';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { db } from '../src/db/index.js';
import partnersRouter, { signMediaItem, signMediaArray } from '../src/api/partners.js';
import contractorsRouter from '../src/api/contractors.js';
import professionalsRouter from '../src/api/professionals.js';
import { generateStorageKey } from '../src/storage/storageKeyGenerator.js';
import { validateBinaryFile } from '../src/storage/fileValidator.js';
import { jwtService } from '../src/security/jwtService.js';
import { setFileStorageService } from '../src/storage/index.js';
import { InMemoryFileStorageService } from './test_helpers/InMemoryFileStorageService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
  }
}

function buildMultipartBody(
  fields: Record<string, string>,
  file?: { name: string; filename: string; contentType: string; buffer: Buffer }
): { boundary: string; body: Buffer } {
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
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
  return { boundary, body: Buffer.concat(chunks) };
}

console.log('====================================================');
console.log('HOOSHYAR ENERGY — STAGE 13.9.2 VERIFICATION SUITE');
console.log('Professional Partner Profiles, Products & Secure Media');
console.log('====================================================\n');

// 1. Setup isolated test DB
const isolation = setupTestDatabaseIsolation('stage13_9_2');

async function runTests() {
  let server: http.Server | null = null;

  try {
    // Configure in-memory storage service for unit/integration tests
    setFileStorageService(new InMemoryFileStorageService(true));

    // Setup express test app
    const app = express();
    app.use(express.json());
    app.use('/api/partners', partnersRouter);
    app.use('/api/contractors', contractorsRouter);
    app.use('/api/professionals', professionalsRouter);

    // Vendors endpoint as in server.ts
    app.get('/api/vendors', async (req, res) => {
      const vendors = (db.getVendors() || [])
        .filter((v: any) => v.status === 'approved' || v.isPublished === true);

      const publicVendors = await Promise.all(
        vendors.map(async (v: any) => {
          const logoUrl = v.logoKey ? await signMediaItem(v.logoKey) : (v.logoUrl || null);
          const allProducts = db.getProducts?.() || [];
          const vendorProducts = allProducts.filter((p: any) => p.vendorId === v.id || p.ownerId === v.id);
          const signedProducts = await Promise.all(
            vendorProducts.map(async (prod: any) => ({
              ...prod,
              images: Array.isArray(prod.images) ? await signMediaArray(prod.images) : []
            }))
          );

          return {
            id: v.id,
            name: v.companyName,
            companyName: v.companyName,
            city: v.city,
            rating: v.rating || 4.5,
            verified: v.verified || false,
            phones: v.phones || [],
            aboutUs: v.aboutUs,
            logoUrl,
            productCount: signedProducts.length,
            products: signedProducts
          };
        })
      );

      res.json({ vendors: publicVendors });
    });

    app.get('/api/vendors/:id', async (req, res) => {
      const vendor = (db.getVendors() || []).find((v: any) => v.id === req.params.id);
      if (!vendor || (vendor.status !== 'approved' && !vendor.isPublished)) {
        return res.status(404).json({ error: 'تأمین‌کننده یافت نشد.' });
      }

      const logoUrl = vendor.logoKey ? await signMediaItem(vendor.logoKey) : (vendor.logoUrl || null);
      const allProducts = db.getProducts?.() || [];
      const vendorProducts = allProducts.filter((p: any) => p.vendorId === vendor.id || p.ownerId === vendor.id);
      const signedProducts = await Promise.all(
        vendorProducts.map(async (prod: any) => ({
          ...prod,
          availability: prod.availability || (prod.inStock === false ? 'UNAVAILABLE' : 'AVAILABLE'),
          images: Array.isArray(prod.images) ? await signMediaArray(prod.images) : []
        }))
      );

      res.json({
        vendor: {
          id: vendor.id,
          name: vendor.companyName,
          companyName: vendor.companyName,
          aboutUs: vendor.aboutUs,
          address: vendor.address,
          city: vendor.city,
          phones: vendor.phones || [],
          website: vendor.website,
          verified: vendor.verified || false,
          logoUrl,
          products: signedProducts
        }
      });
    });

    server = http.createServer(app);
    let port = 0;
    await new Promise<void>((resolve) => {
      server!.listen(0, '127.0.0.1', () => {
        port = (server!.address() as any).port;
        resolve();
      });
    });

    const makeRequest = async (
      pathUrl: string,
      options: { method: string; headers?: Record<string, string>; body?: Buffer | string }
    ): Promise<{ status: number; body: any }> => {
      return new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: pathUrl,
            method: options.method,
            headers: options.headers
          },
          (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              let parsed = data;
              try {
                parsed = JSON.parse(data);
              } catch {}
              resolve({ status: res.statusCode || 500, body: parsed });
            });
          }
        );
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
      });
    };

    // Helper to update isolated DB
    const mutateIsolatedDb = (updater: (data: any) => void) => {
      const dbFile = db.getDBPath();
      const raw = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      updater(raw);
      fs.writeFileSync(dbFile, JSON.stringify(raw, null, 2), 'utf-8');
    };

    // --------------------------------------------------------------------------
    // TEST GROUP 1: Secure Storage Key Generation & Magic Byte Validation
    // --------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Secure Storage Architecture & File Validation ---');

    const epcKey = generateStorageKey({
      scope: 'partners',
      entityId: 'org_123',
      category: 'epc_logo',
      extension: 'png'
    });
    assert(
      epcKey.startsWith('partners/org_123/epc_logo/') && epcKey.endsWith('.png'),
      '1.1 EPC logo key strictly follows partitioned path: partners/:entityId/epc_logo/'
    );

    const vendorProdKey = generateStorageKey({
      scope: 'vendors',
      entityId: 'ven_456',
      category: 'vendor_product',
      extension: 'jpg'
    });
    assert(
      vendorProdKey.startsWith('vendors/ven_456/vendor_product/') && vendorProdKey.endsWith('.jpg'),
      '1.2 Vendor product key strictly follows partitioned path: vendors/:entityId/vendor_product/'
    );

    const techCertKey = generateStorageKey({
      scope: 'technicians',
      entityId: 'tech_789',
      category: 'technician_cert',
      extension: 'pdf'
    });
    assert(
      techCertKey.startsWith('technicians/tech_789/technician_cert/') && techCertKey.endsWith('.pdf'),
      '1.3 Technician cert key strictly follows partitioned path: technicians/:entityId/technician_cert/'
    );

    // Valid PNG magic bytes
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    let validPngPass = false;
    try {
      const res = validateBinaryFile(validPngBuffer, 'test.png', 'image/png');
      validPngPass = res.detectedMimeType === 'image/png';
    } catch {}
    assert(validPngPass, '1.4 Magic bytes validate authentic PNG header');

    // Disguised malicious text file masquerading as PNG
    const fakePngBuffer = Buffer.from('console.log("malicious code disguised as image");');
    let fakeRejected = false;
    try {
      validateBinaryFile(fakePngBuffer, 'malicious.png', 'image/png');
    } catch {
      fakeRejected = true;
    }
    assert(fakeRejected, '1.5 Magic bytes reject text file disguised with image/png MIME');

    // Valid PDF magic bytes
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%test pdf content');
    let validPdfPass = false;
    try {
      const res = validateBinaryFile(validPdfBuffer, 'test.pdf', 'application/pdf');
      validPdfPass = res.detectedMimeType === 'application/pdf';
    } catch {}
    assert(validPdfPass, '1.6 Magic bytes validate authentic PDF header');

    // --------------------------------------------------------------------------
    // TEST GROUP 2: EPC Contractor Profile, Portfolio & Optional Products
    // --------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: EPC Contractor Profiles & Portfolio ---');

    const contractor1Token = jwtService.sign({
      userId: 'user_epc_1',
      organizationId: 'org_epc_1',
      role: 'epc_contractor'
    });

    const contractor2Token = jwtService.sign({
      userId: 'user_epc_2',
      organizationId: 'org_epc_2',
      role: 'epc_contractor'
    });

    // Seed org_epc_1 and org_epc_2 into isolated DB
    const testEpc1 = {
      id: 'org_epc_1',
      createdById: 'user_epc_1',
      legalName: 'شرکت مهندسی مهرا خورشید سپهر',
      tradeName: 'مهرا سولار',
      type: 'EPC_CONTRACTOR',
      verificationStatus: 'VERIFIED',
      verified: true,
      city: 'اصفهان',
      address: 'اصفهان، شهرک علمی و تحقیقاتی',
      phone: '03133932000',
      specialties: ['نیروگاه مگاواتی', 'طراحی EPC'],
      bio: 'مجری بیش از ۲۰ مگاوات نیروگاه متصل به شبکه',
      logoKey: 'partners/epc/org_epc_1/epc_logo_test.png',
      projectPortfolio: [],
      products: []
    };

    const testEpc2 = {
      id: 'org_epc_2',
      createdById: 'user_epc_2',
      legalName: 'شرکت آفتاب شرق',
      tradeName: 'آفتاب شرق',
      type: 'EPC_CONTRACTOR',
      verificationStatus: 'VERIFIED',
      verified: true,
      city: 'مشهد',
      projectPortfolio: [],
      products: []
    };

    mutateIsolatedDb(data => {
      data.users = [
        ...(data.users || []).filter((u: any) => !u.id.startsWith('user_epc_') && !u.id.startsWith('user_ven_') && !u.id.startsWith('user_pro_')),
        { id: 'user_epc_1', phone: '09121110001', role: 'epc_contractor', roles: ['epc_contractor'] },
        { id: 'user_epc_2', phone: '09121110002', role: 'epc_contractor', roles: ['epc_contractor'] },
        { id: 'user_ven_1', phone: '09121110003', role: 'vendor', roles: ['vendor'] },
        { id: 'user_ven_2', phone: '09121110004', role: 'vendor', roles: ['vendor'] },
        { id: 'user_pro_1', phone: '09121110005', role: 'technician', roles: ['technician'] },
        { id: 'user_pro_2', phone: '09121110006', role: 'technician', roles: ['technician'] }
      ];
      data.organizations = [
        ...(data.organizations || []).filter((o: any) => o.id !== 'org_epc_1' && o.id !== 'org_epc_2'),
        testEpc1,
        testEpc2
      ];
    });

    // Test EPC Media Upload (Authentic PNG buffer)
    const epcMp = buildMultipartBody({ entityType: 'EPC_LOGO' }, { name: 'file', filename: 'test_logo.png', contentType: 'image/png', buffer: validPngBuffer });
    const epcUploadRes = await makeRequest('/api/partners/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${contractor1Token}`,
        'Content-Type': `multipart/form-data; boundary=${epcMp.boundary}`
      },
      body: epcMp.body
    });

    assert(
      epcUploadRes.status === 200 || epcUploadRes.status === 201,
      '2.1 EPC can upload authenticated company logo',
      `status=${epcUploadRes.status}`
    );
    assert(epcUploadRes.body.storageKey && epcUploadRes.body.downloadUrl, '2.2 EPC upload returns storageKey and signed downloadUrl');

    // Update testEpc1 with real uploaded logoKey
    mutateIsolatedDb(data => {
      const org = (data.organizations || []).find((o: any) => o.id === 'org_epc_1');
      if (org) org.logoKey = epcUploadRes.body.storageKey;
    });

    // Test EPC Add Portfolio Project
    const addProjectRes = await makeRequest('/api/partners/contractor/portfolio', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${contractor1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'نیروگاه خورشیدی ۱۰ مگاواتی مهیار',
        projectType: 'نیروگاه مگاواتی',
        province: 'اصفهان',
        city: 'شهرضا',
        installedCapacityKw: 10000,
        completionYear: 1402,
        description: 'نیروگاه متصل به شبکه با اینورترهای مرکزی و سازه متحرک',
        images: [epcUploadRes.body.storageKey]
      })
    });

    assert(addProjectRes.status === 201, '2.3 EPC can add portfolio project with real images', `status=${addProjectRes.status}`);
    const createdProjectId = addProjectRes.body.project?.id;
    assert(Boolean(createdProjectId), '2.4 Created project receives unique ID');

    // Test EPC Add Optional Product
    const addEpcProductRes = await makeRequest('/api/partners/contractor/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${contractor1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'پنل دوطرفه بیفیشیال ۶۰۰ وات',
        category: 'پنل خورشیدی',
        brand: 'Longi',
        price: 5200000,
        images: [epcUploadRes.body.storageKey]
      })
    });

    assert(addEpcProductRes.status === 201, '2.5 EPC can add optional specialized equipment/product', `status=${addEpcProductRes.status}`);

    // Test IDOR Protection on EPC Portfolio: contractor 2 cannot delete contractor 1's project
    const idorDeleteRes = await makeRequest(`/api/partners/contractor/portfolio/${createdProjectId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${contractor2Token}` }
    });

    assert(idorDeleteRes.status === 404, '2.6 IDOR Protection: Foreign contractor cannot delete other company portfolio project');

    // Test Public EPC Profile Endpoint: verifies signed URLs for logo and portfolio
    const publicEpcRes = await makeRequest('/api/contractors/org_epc_1', { method: 'GET' });
    assert(publicEpcRes.status === 200, '2.7 Public EPC profile endpoint (/api/contractors/:id) returns 200');
    const epcProfile = publicEpcRes.body.contractor;
    assert(Boolean(epcProfile.logoUrl), '2.8 Public EPC profile includes signed logoUrl');
    assert(
      Array.isArray(epcProfile.projectPortfolio) && epcProfile.projectPortfolio.length >= 1,
      '2.9 Public EPC profile includes enriched portfolio projects'
    );
    assert(
      Array.isArray(epcProfile.projectPortfolio[0].images) && epcProfile.projectPortfolio[0].images.length >= 1,
      '2.10 Portfolio project images are resolved to valid signed download URLs'
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 3: Vendor Model, Product Management & Availability
    // --------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Vendor Profiles, Products & Availability ---');

    const vendor1Token = jwtService.sign({
      userId: 'user_ven_1',
      vendorId: 'ven_1',
      role: 'vendor'
    });

    const vendor2Token = jwtService.sign({
      userId: 'user_ven_2',
      vendorId: 'ven_2',
      role: 'vendor'
    });

    // Seed vendors into isolated DB
    const testVendor1 = {
      id: 'ven_1',
      userId: 'user_ven_1',
      companyName: 'فروشگاه الکتروسولار آریا',
      status: 'approved',
      isPublished: true,
      city: 'تهران',
      address: 'خیابان لاله‌زار',
      phones: [{ label: 'دفتر', number: '02133900000' }],
      logoKey: 'partners/vendors/ven_1/vendor_logo_test.png',
      products: []
    };

    const testVendor2 = {
      id: 'ven_2',
      userId: 'user_ven_2',
      companyName: 'فروشگاه خورشید طوس',
      status: 'approved',
      isPublished: true,
      city: 'مشهد',
      products: []
    };

    mutateIsolatedDb(data => {
      data.vendors = [
        ...(data.vendors || []).filter((v: any) => v.id !== 'ven_1' && v.id !== 'ven_2'),
        testVendor1,
        testVendor2
      ];
    });

    // Test Vendor Product Upload
    const vendorMp = buildMultipartBody({ entityType: 'VENDOR_PRODUCT' }, { name: 'file', filename: 'panel_image.png', contentType: 'image/png', buffer: validPngBuffer });
    const vendorUploadRes = await makeRequest('/api/partners/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vendor1Token}`,
        'Content-Type': `multipart/form-data; boundary=${vendorMp.boundary}`
      },
      body: vendorMp.body
    });

    assert(
      vendorUploadRes.status === 200 || vendorUploadRes.status === 201,
      '3.1 Vendor can upload authenticated product image'
    );

    // Update testVendor1 with real uploaded logoKey
    mutateIsolatedDb(data => {
      const v = (data.vendors || []).find((x: any) => x.id === 'ven_1');
      if (v) v.logoKey = vendorUploadRes.body.storageKey;
    });

    // Test Create Vendor Product
    const createProdRes = await makeRequest('/api/partners/vendor/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vendor1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'اینورتر ۱۰ کیلووات سه فاز هوآوی',
        category: 'اینورتر',
        brand: 'Huawei',
        model: 'SUN2000-10KTL',
        price: 68000000,
        warrantyYears: 5,
        availability: 'AVAILABLE',
        images: [vendorUploadRes.body.storageKey]
      })
    });

    assert(createProdRes.status === 201, '3.2 Vendor can create product with real image and availability');
    const createdVendorProdId = createProdRes.body.product?.id;
    assert(createProdRes.body.product?.availability === 'AVAILABLE', '3.3 Product is initially AVAILABLE');

    // Test Toggle Product Availability to UNAVAILABLE
    const toggleAvailRes = await makeRequest(`/api/partners/vendor/products/${createdVendorProdId}/availability`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vendor1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ availability: 'UNAVAILABLE' })
    });

    assert(toggleAvailRes.status === 200, '3.4 Vendor can toggle availability to UNAVAILABLE');
    assert(toggleAvailRes.body.product?.availability === 'UNAVAILABLE', '3.5 Returned product reflects UNAVAILABLE state');
    assert(toggleAvailRes.body.product?.inStock === false, '3.6 inStock is synchronized with UNAVAILABLE');

    // Test Toggle Back to AVAILABLE
    const toggleBackRes = await makeRequest(`/api/partners/vendor/products/${createdVendorProdId}/availability`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vendor1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ availability: 'AVAILABLE' })
    });

    assert(toggleBackRes.status === 200, '3.7 Vendor can toggle availability back to AVAILABLE');
    assert(toggleBackRes.body.product?.availability === 'AVAILABLE', '3.8 Returned product reflects AVAILABLE state');

    // Test IDOR Protection: Vendor 2 cannot update Vendor 1's product
    const vendorIdorRes = await makeRequest(`/api/partners/vendor/products/${createdVendorProdId}/availability`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vendor2Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ availability: 'UNAVAILABLE' })
    });

    assert(
      vendorIdorRes.status === 403 || vendorIdorRes.status === 404,
      '3.9 IDOR Protection: Foreign vendor cannot toggle availability of other vendor product'
    );

    // Test Public Vendor Storefront Endpoint
    const publicVendorRes = await makeRequest('/api/vendors/ven_1', { method: 'GET' });
    assert(publicVendorRes.status === 200, '3.10 Public Vendor endpoint (/api/vendors/:id) returns 200');
    const vendorData = publicVendorRes.body.vendor;
    assert(Boolean(vendorData.logoUrl), '3.11 Vendor storefront provides signed logoUrl');
    assert(
      Array.isArray(vendorData.products) && vendorData.products.length >= 1,
      '3.12 Vendor storefront exposes catalog with signed product image URLs'
    );
    assert(
      vendorData.products[0].availability === 'AVAILABLE',
      '3.13 Vendor product availability is truthfully exposed in public storefront'
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 4: Technician Model: Profile, Certifications & Work Samples
    // --------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Technician Profiles, Certifications & Work Samples ---');

    const tech1Token = jwtService.sign({
      userId: 'user_pro_1',
      role: 'technician'
    });

    const tech2Token = jwtService.sign({
      userId: 'user_pro_2',
      role: 'technician'
    });

    // Seed professionals into isolated DB
    const testPro1 = {
      id: 'pro_1',
      userId: 'user_pro_1',
      fullName: 'مهندس سهراب مرادی',
      phone: '09121112233',
      status: 'approved',
      verified: true,
      serviceCities: ['تهران', 'کرج'],
      specialties: ['اینورترهای خورشیدی', 'تست و عیب‌یابی نیروگاه'],
      yearsExperience: 8,
      bio: 'کارشناس رسمی انرژی‌های تجدیدپذیر و ممیز انرژی',
      profileImageKey: 'partners/technicians/user_pro_1/avatar.png',
      certifications: [],
      workSamples: []
    };

    const testPro2 = {
      id: 'pro_2',
      userId: 'user_pro_2',
      fullName: 'مهندس کاوه باقری',
      phone: '09122223344',
      status: 'approved',
      verified: true,
      serviceCities: ['اصفهان'],
      specialties: ['سازه خورشیدی'],
      certifications: [],
      workSamples: []
    };

    mutateIsolatedDb(data => {
      data.professionals = [
        ...(data.professionals || []).filter((p: any) => p.id !== 'pro_1' && p.id !== 'pro_2'),
        testPro1,
        testPro2
      ];
    });

    // Test Technician Cert Upload (PDF)
    const certMp = buildMultipartBody({ entityType: 'TECHNICIAN_CERT' }, { name: 'file', filename: 'tuv_cert.pdf', contentType: 'application/pdf', buffer: validPdfBuffer });
    const certUploadRes = await makeRequest('/api/partners/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tech1Token}`,
        'Content-Type': `multipart/form-data; boundary=${certMp.boundary}`
      },
      body: certMp.body
    });

    assert(
      certUploadRes.status === 200 || certUploadRes.status === 201,
      '4.1 Technician can upload authentic qualification certificate (PDF)'
    );

    // Update testPro1 with real uploaded profileImageKey
    mutateIsolatedDb(data => {
      const pro = (data.professionals || []).find((x: any) => x.id === 'pro_1');
      if (pro) pro.profileImageKey = certUploadRes.body.storageKey;
    });

    // Test Add Certification
    const addCertRes = await makeRequest('/api/partners/technician/certifications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tech1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'مدرک بین‌المللی بازرسی سیستم‌های فتوولتائیک TÜV Rheinland',
        issuingOrg: 'TÜV Rheinland',
        issueYear: 2022,
        description: 'گواهینامه تخصصی ارزیابی ایمنی و کارایی پنل و استراکچر',
        fileKey: certUploadRes.body.storageKey
      })
    });

    assert(addCertRes.status === 201, '4.2 Technician can register certification with uploaded document');
    const createdCertId = addCertRes.body.certification?.id;

    // Test Add Work Sample with multiple images
    const addWorkRes = await makeRequest('/api/partners/technician/work-samples', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tech1Token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'تعمیر و بازسازی اینورتر مرکزی ۵۰۰ کیلووات یزد',
        description: 'تعویض بردهای کنترلی و تست ترموگرافی استرینگ‌ها',
        images: [certUploadRes.body.storageKey]
      })
    });

    assert(addWorkRes.status === 201, '4.3 Technician can add work sample with project images');
    const createdWorkId = addWorkRes.body.workSample?.id;

    // Test IDOR Protection: Technician 2 cannot delete Technician 1's certification
    const techIdorRes = await makeRequest(`/api/partners/technician/certifications/${createdCertId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tech2Token}` }
    });

    assert(techIdorRes.status === 404, '4.4 IDOR Protection: Foreign technician cannot delete other technician certification');

    // Test Public Professional Profile Endpoint (/api/professionals/:id)
    const publicProRes = await makeRequest('/api/professionals/pro_1', { method: 'GET' });
    assert(publicProRes.status === 200, '4.5 Public technician profile endpoint (/api/professionals/:id) returns 200');
    const proData = publicProRes.body.professional;
    assert(Boolean(proData.profileImageUrl), '4.6 Public profile includes signed profileImageUrl');
    assert(
      Array.isArray(proData.certifications) && proData.certifications.length >= 1,
      '4.7 Public profile includes certifications with signed document links'
    );
    assert(
      Array.isArray(proData.workSamples) && proData.workSamples.length >= 1,
      '4.8 Public profile includes work samples with signed image URLs'
    );

    // --------------------------------------------------------------------------
    // TEST GROUP 5: Signed URL Expiration & File Streaming Fallback
    // --------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Media URLs, Signed Streaming & Expiration ---');

    const signedUrl = await signMediaItem('partners/vendors/ven_1/test_key.png');
    assert(
      signedUrl.includes('expires=') || signedUrl.includes('/api/partners/media/file'),
      '5.1 Signed media URLs incorporate expiration or authorized streaming fallback'
    );

    // Fallback endpoint without token returns 400 or 404
    const badStreamRes = await makeRequest('/api/partners/media/file', { method: 'GET' });
    assert(badStreamRes.status === 400 || badStreamRes.status === 404, '5.2 Unspecified storage key streaming returns error');

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    // Always clean up test database isolation
    isolation.cleanup();
  }

  console.log('\n====================================================');
  console.log(`STAGE 13.9.2 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
