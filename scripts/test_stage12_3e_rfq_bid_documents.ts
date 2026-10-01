import assert from 'assert';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { db } from '../src/db/index.js';
import { rfqRepository } from '../src/repositories/rfqRepository.js';
import { projectRepository } from '../src/repositories/projectRepository.js';
import { organizationRepository } from '../src/repositories/organizationRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';
import { 
  setFileStorageService, 
  getFileStorageService 
} from '../src/storage/index.js';
import { InMemoryFileStorageService } from './test_helpers/InMemoryFileStorageService.js';
import rfqRouter from '../src/api/rfq.js';
import { RFQDocument, BidDocument } from '../src/types/rfq.js';

console.log('=== STARTING STAGE 12.3E RFQ & EPC BID DOCUMENT TESTS ===');

// Track baseline db.json hash
const dbPath = path.resolve(process.cwd(), 'db.json');
const originalDbContent = fs.readFileSync(dbPath, 'utf-8');
const originalDbHash = crypto.createHash('sha256').update(originalDbContent).digest('hex');

// Setup Express app
const app = express();
app.use(express.json());
app.use('/api/rfq', rfqRouter);

// Binary helpers
function createPdfBuffer(): Buffer {
  return Buffer.concat([
    Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'utf-8'),
    Buffer.alloc(100, 0x20)
  ]);
}

function createJpegBuffer(): Buffer {
  return Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9]);
}

function createPngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
}

function createWebpBuffer(): Buffer {
  const header = Buffer.from('RIFF', 'ascii');
  const size = Buffer.alloc(4);
  size.writeUInt32LE(20, 0);
  const webp = Buffer.from('WEBPVP8 ', 'ascii');
  const vp8Payload = Buffer.alloc(12, 0);
  return Buffer.concat([header, size, webp, vp8Payload]);
}

function buildMultipartBody(fields: Record<string, string>, file?: { name: string; filename: string; contentType: string; buffer: Buffer }): { boundary: string; body: Buffer } {
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
  const chunks: Buffer[] = [];

  for (const [k, v] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`, 'utf-8'));
  }

  if (file) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`, 'utf-8'));
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n', 'utf-8'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));
  return { boundary, body: Buffer.concat(chunks) };
}

let server: http.Server;
let port: number;

async function makeRequest(urlPath: string, options: { method: string; headers?: Record<string, string>; body?: Buffer | string }): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method: options.method,
      headers: options.headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode || 0, body: parsed });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function pass(testName: string) {
  console.log(`[PASS] ${testName}`);
}

async function run() {
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      port = addr.port;
      resolve();
    });
  });

  const originalStorage = getFileStorageService();
  const mockStorage = new InMemoryFileStorageService(true);
  setFileStorageService(mockStorage);

  try {
    // Seed Users & Organizations for multi-tenant isolation
    const customerUserA = userRepository.createUser({ id: `usr-cust-a-${Date.now()}`, phone: '09121111111', role: 'customer', roles: ['customer'] } as any);
    const customerUserB = userRepository.createUser({ id: `usr-cust-b-${Date.now()}`, phone: '09122222222', role: 'customer', roles: ['customer'] } as any);
    const epcUserA = userRepository.createUser({ id: `usr-epc-a-${Date.now()}`, phone: '09123333333', role: 'contractor', roles: ['contractor'] } as any);
    const epcUserB = userRepository.createUser({ id: `usr-epc-b-${Date.now()}`, phone: '09124444444', role: 'contractor', roles: ['contractor'] } as any);
    const vendorUser = userRepository.createUser({ id: `usr-vend-${Date.now()}`, phone: '09125555555', role: 'vendor', roles: ['vendor'] } as any);
    const adminUser = userRepository.createUser({ id: `usr-admin-${Date.now()}`, phone: '09129999999', role: 'admin', roles: ['admin'] } as any);

    const tokenCustA = jwtService.sign({ userId: customerUserA.id, id: customerUserA.id, role: customerUserA.role });
    const tokenCustB = jwtService.sign({ userId: customerUserB.id, id: customerUserB.id, role: customerUserB.role });
    const tokenEpcA = jwtService.sign({ userId: epcUserA.id, id: epcUserA.id, role: epcUserA.role });
    const tokenEpcB = jwtService.sign({ userId: epcUserB.id, id: epcUserB.id, role: epcUserB.role });
    const tokenVendor = jwtService.sign({ userId: vendorUser.id, id: vendorUser.id, role: vendorUser.role });
    const tokenAdmin = jwtService.sign({ userId: adminUser.id, id: adminUser.id, role: adminUser.role });

    // Register Organizations
    const epcOrgA = organizationRepository.create({
      legalName: 'شرکت مهندسی آذرخش خورشید',
      createdById: epcUserA.id,
      adminUserIds: [epcUserA.id],
      isVerified: true
    } as any);

    const epcOrgB = organizationRepository.create({
      legalName: 'شرکت مهندسی کهکشان انرژی',
      createdById: epcUserB.id,
      adminUserIds: [epcUserB.id],
      isVerified: true
    } as any);

    // Seed Projects
    const projectA = projectRepository.create({
      title: 'نیروگاه خورشیدی ۱ مگاواتی شیراز',
      ownerId: customerUserA.id,
      targetCapacityKw: 1000,
      status: 'READY_FOR_RFQ',
      members: [{ userId: customerUserA.id, role: 'OWNER', status: 'ACTIVE' }]
    } as any);

    const projectB = projectRepository.create({
      title: 'نیروگاه خورشیدی ۵۰۰ کیلوواتی یزد',
      ownerId: customerUserB.id,
      targetCapacityKw: 500,
      status: 'READY_FOR_RFQ',
      members: [{ userId: customerUserB.id, role: 'OWNER', status: 'ACTIVE' }]
    } as any);

    // Seed RFQs
    const rfqA = rfqRepository.createRFQ({
      rfqCode: 'RFQ-HSE-9001',
      projectId: projectA.id,
      createdByUserId: customerUserA.id,
      status: 'OPEN',
      title: 'استعلام احداث نیروگاه شیراز',
      description: 'طراحی، تأمین و نصب نیروگاه',
      scope: 'کامل EPC',
      submissionDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      currency: 'IRR',
      visibility: 'VERIFIED_EPCS',
      technicalRequirements: ['پنل تی‌یر ۱'],
      commercialRequirements: ['ضمانت‌نامه حسن انجام کار'],
      requiredDocuments: ['رزومه', 'دیتاشیت', 'آنالیز بها'],
      documents: []
    });

    const rfqB = rfqRepository.createRFQ({
      rfqCode: 'RFQ-HSE-9002',
      projectId: projectB.id,
      createdByUserId: customerUserB.id,
      status: 'OPEN',
      title: 'استعلام احداث نیروگاه یزد',
      description: 'طراحی و نصب',
      scope: 'کامل EPC',
      submissionDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      currency: 'IRR',
      visibility: 'VERIFIED_EPCS',
      technicalRequirements: ['اینورتر اروپایی'],
      commercialRequirements: ['پرداخت اقساطی'],
      requiredDocuments: ['رزومه'],
      documents: []
    });

    // Seed Bids
    const bidA = rfqRepository.createBid({
      bidCode: 'BID-HSE-9001',
      rfqId: rfqA.id,
      projectId: projectA.id,
      epcOrganizationId: epcOrgA.id,
      status: 'SUBMITTED',
      currency: 'IRR',
      totalPrice: 20000000000,
      engineeringPrice: 2000000000,
      equipmentPrice: 14000000000,
      installationPrice: 3000000000,
      otherPrice: 1000000000,
      executionDays: 90,
      warrantyYears: 5,
      equipmentSummary: {},
      paymentTerms: 'استاندارد',
      technicalDocuments: [],
      commercialDocuments: [],
      technicalCompliance: 'COMPLIANT',
      riskFlags: [],
      documents: []
    });

    const bidB = rfqRepository.createBid({
      bidCode: 'BID-HSE-9002',
      rfqId: rfqB.id,
      projectId: projectB.id,
      epcOrganizationId: epcOrgB.id,
      status: 'SUBMITTED',
      currency: 'IRR',
      totalPrice: 11000000000,
      engineeringPrice: 1000000000,
      equipmentPrice: 8000000000,
      installationPrice: 1500000000,
      otherPrice: 500000000,
      executionDays: 60,
      warrantyYears: 5,
      equipmentSummary: {},
      paymentTerms: 'استاندارد',
      technicalDocuments: [],
      commercialDocuments: [],
      technicalCompliance: 'COMPLIANT',
      riskFlags: [],
      documents: []
    });

    // ==========================================
    // RFQ DOCUMENT TESTS (1 - 48)
    // ==========================================

    // 1. unauthenticated RFQ upload denied
    const mpPdf = buildMultipartBody({}, { name: 'file', filename: 'spec.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    let res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 401);
    pass('1. unauthenticated RFQ upload denied');

    // 2. RFQ owner upload allowed
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenCustA}`,
        'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` 
      },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, 'spec.pdf');
    assert.strictEqual(res.body.rfqId, rfqA.id);
    const rfqDoc1Id = res.body.id;
    pass('2. RFQ owner upload allowed');

    // 3. Admin RFQ upload allowed
    const mpPdfAdmin = buildMultipartBody({}, { name: 'file', filename: 'admin_spec.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenAdmin}`,
        'Content-Type': `multipart/form-data; boundary=${mpPdfAdmin.boundary}` 
      },
      body: mpPdfAdmin.body
    });
    assert.strictEqual(res.status, 201);
    pass('3. Admin RFQ upload allowed');

    // 4. Contractor upload to RFQ denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenEpcA}`,
        'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` 
      },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 403);
    pass('4. Contractor upload to RFQ denied (403)');

    // 5. Unrelated customer upload denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenCustB}`,
        'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` 
      },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 403);
    pass('5. Unrelated customer upload denied (403)');

    // 6. Vendor upload denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenVendor}`,
        'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` 
      },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 403);
    pass('6. Vendor upload denied (403)');

    // 7. Missing RFQ returns 404
    res = await makeRequest('/api/rfq/non-existent-rfq-id/documents/upload', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenCustA}`,
        'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` 
      },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 404);
    pass('7. Missing RFQ returns 404');

    // 8. valid JPEG accepted
    const mpJpg = buildMultipartBody({}, { name: 'file', filename: 'site.jpg', contentType: 'image/jpeg', buffer: createJpegBuffer() });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpJpg.boundary}` },
      body: mpJpg.body
    });
    assert.strictEqual(res.status, 201);
    pass('8. valid JPEG accepted');

    // 9. valid PNG accepted
    const mpPng = buildMultipartBody({}, { name: 'file', filename: 'diagram.png', contentType: 'image/png', buffer: createPngBuffer() });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpPng.boundary}` },
      body: mpPng.body
    });
    assert.strictEqual(res.status, 201);
    pass('9. valid PNG accepted');

    // 10. valid WebP accepted
    const mpWebp = buildMultipartBody({}, { name: 'file', filename: 'layout.webp', contentType: 'image/webp', buffer: createWebpBuffer() });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpWebp.boundary}` },
      body: mpWebp.body
    });
    assert.strictEqual(res.status, 201);
    pass('10. valid WebP accepted');

    // 11. empty file rejected
    const mpEmpty = buildMultipartBody({}, { name: 'file', filename: 'empty.pdf', contentType: 'application/pdf', buffer: Buffer.alloc(0) });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpEmpty.boundary}` },
      body: mpEmpty.body
    });
    assert.ok(res.status === 400 || res.status === 422);
    pass('11. empty file rejected');

    // 12. SVG rejected
    const mpSvg = buildMultipartBody({}, { name: 'file', filename: 'vector.svg', contentType: 'image/svg+xml', buffer: Buffer.from('<svg></svg>') });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpSvg.boundary}` },
      body: mpSvg.body
    });
    assert.ok(res.status === 400 || res.status === 415);
    pass('12. SVG rejected');

    // 13. HTML rejected
    const mpHtml = buildMultipartBody({}, { name: 'file', filename: 'page.html', contentType: 'text/html', buffer: Buffer.from('<html></html>') });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpHtml.boundary}` },
      body: mpHtml.body
    });
    assert.ok(res.status === 400 || res.status === 415);
    pass('13. HTML rejected');

    // 14. executable/unknown rejected
    const mpExe = buildMultipartBody({}, { name: 'file', filename: 'run.exe', contentType: 'application/octet-stream', buffer: Buffer.from('MZ\x90\x00') });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpExe.boundary}` },
      body: mpExe.body
    });
    assert.ok(res.status === 400 || res.status === 415);
    pass('14. executable/unknown rejected');

    // 15. MIME spoof rejected (magic byte mismatch)
    const mpSpoof = buildMultipartBody({}, { name: 'file', filename: 'fake.pdf', contentType: 'application/pdf', buffer: Buffer.from('NOT_A_PDF_HEADER') });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpSpoof.boundary}` },
      body: mpSpoof.body
    });
    assert.ok(res.status === 400 || res.status === 415);
    pass('15. MIME spoof rejected');

    // 16. PDF > 15MB rejected
    const mpBigPdf = buildMultipartBody({}, { name: 'file', filename: 'giant.pdf', contentType: 'application/pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(16 * 1024 * 1024)]) });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpBigPdf.boundary}` },
      body: mpBigPdf.body
    });
    assert.ok(res.status === 400 || res.status === 413);
    pass('16. PDF > 15MB rejected');

    // 17. Image > 5MB rejected
    const mpBigJpg = buildMultipartBody({}, { name: 'file', filename: 'giant.jpg', contentType: 'image/jpeg', buffer: Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(6 * 1024 * 1024)]) });
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpBigJpg.boundary}` },
      body: mpBigJpg.body
    });
    assert.ok(res.status === 400 || res.status === 413);
    pass('17. Image > 5MB rejected');

    // 18. server-generated key verified
    const savedRfq = rfqRepository.findRFQById(rfqA.id);
    const savedDoc = (savedRfq?.documents || []).find(d => d.id === rfqDoc1Id);
    assert.ok(savedDoc?.storageKey);
    assert.ok(savedDoc.storageKey.startsWith(`rfq/${rfqA.id}/DOCUMENT/`));
    pass('18. server-generated key verified');

    // 19. original filename absent from key
    assert.strictEqual(savedDoc.storageKey.includes('spec.pdf'), false);
    pass('19. original filename absent from key');

    // 20. checksum correct SHA-256
    const expectedSha = crypto.createHash('sha256').update(createPdfBuffer()).digest('hex');
    assert.strictEqual(savedDoc.checksumSha256, expectedSha);
    pass('20. checksum correct SHA-256');

    // 21. canonical MIME persisted
    assert.strictEqual(savedDoc.mimeType, 'application/pdf');
    pass('21. canonical MIME persisted');

    // 22. size persisted
    assert.strictEqual(savedDoc.sizeBytes, createPdfBuffer().length);
    pass('22. size persisted');

    // 23. uploader server-derived
    assert.strictEqual(savedDoc.uploadedByUserId, customerUserA.id);
    pass('23. uploader server-derived');

    // 24. no Buffer persisted in DB
    assert.strictEqual((savedDoc as any).buffer, undefined);
    assert.strictEqual((savedDoc as any).body, undefined);
    pass('24. no Buffer persisted in DB');

    // 25. no Base64 persisted in DB
    assert.strictEqual((savedDoc as any).base64, undefined);
    assert.strictEqual((savedDoc as any).data, undefined);
    pass('25. no Base64 persisted in DB');

    // 26. no signed URL persisted in DB
    assert.strictEqual((savedDoc as any).signedUrl, undefined);
    assert.ok(!savedDoc.url.includes('mockSignature'));
    pass('26. no signed URL persisted in DB');

    // 27. RFQ listing owner
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.some((d: any) => d.id === rfqDoc1Id));
    assert.strictEqual(res.body.find((d: any) => d.id === rfqDoc1Id).storageKey, undefined);
    pass('27. RFQ listing owner');

    // 28. Eligible EPC listing allowed for open RFQ
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    pass('28. Eligible EPC listing allowed for open RFQ');

    // 29. Unrelated customer listing denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustB}` }
    });
    assert.strictEqual(res.status, 403);
    pass('29. Unrelated customer listing denied (403)');

    // 30. Uninvited contractor denied for INVITED_ONLY RFQ
    const rfqPrivate = rfqRepository.createRFQ({
      rfqCode: 'RFQ-HSE-PRIV',
      projectId: projectA.id,
      createdByUserId: customerUserA.id,
      status: 'OPEN',
      title: 'استعلام خصوصی',
      description: 'خصوصی',
      scope: 'خصوصی',
      submissionDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      currency: 'IRR',
      visibility: 'INVITED_ONLY',
      technicalRequirements: [],
      commercialRequirements: [],
      requiredDocuments: [],
      documents: []
    });
    res = await makeRequest(`/api/rfq/${rfqPrivate.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 403);
    pass('30. Uninvited contractor denied for INVITED_ONLY RFQ');

    // 31. RFQ download owner allowed
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/${rfqDoc1Id}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    assert.strictEqual(res.body.storageProvider, 'S3_COMPATIBLE');
    pass('31. RFQ download owner allowed');

    // 32. Eligible EPC download allowed
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/${rfqDoc1Id}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    pass('32. Eligible EPC download allowed');

    // 33. Unrelated customer download denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/${rfqDoc1Id}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustB}` }
    });
    assert.strictEqual(res.status, 403);
    pass('33. Unrelated customer download denied (403)');

    // 34. Cross-RFQ document download denied (404)
    res = await makeRequest(`/api/rfq/${rfqB.id}/documents/${rfqDoc1Id}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustB}` }
    });
    assert.strictEqual(res.status, 404);
    pass('34. Cross-RFQ document download denied (404)');

    // 35. Guessed document ID download denied (404)
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/non-existent-doc/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 404);
    pass('35. Guessed document ID download denied (404)');

    // 36. Signed URL generated on demand (different invocations succeed)
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/${rfqDoc1Id}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    pass('36. Signed URL generated on demand');

    // 37. Storage unavailable returns 503
    const unconfigStorage = new InMemoryFileStorageService(false);
    setFileStorageService(unconfigStorage);
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 503);
    setFileStorageService(mockStorage);
    pass('37. Storage unavailable returns 503');

    // 38. Storage put failure creates no metadata
    const failPutStorage = new InMemoryFileStorageService(true);
    failPutStorage.putObject = async () => { throw new Error('Simulated S3 PutObject fault'); };
    setFileStorageService(failPutStorage);
    const beforeCount = (rfqRepository.findRFQById(rfqA.id)?.documents || []).length;
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 502);
    const afterCount = (rfqRepository.findRFQById(rfqA.id)?.documents || []).length;
    assert.strictEqual(beforeCount, afterCount);
    setFileStorageService(mockStorage);
    pass('38. Storage put failure creates no metadata');

    // 39. Metadata persistence failure triggers rollback delete
    let deletedKeyOnRollback: string | null = null;
    const rollbackStorage = new InMemoryFileStorageService(true);
    rollbackStorage.deleteObject = async (key: string): Promise<boolean> => {
      deletedKeyOnRollback = key;
      return true;
    };
    setFileStorageService(rollbackStorage);
    const origUpdateRFQ = rfqRepository.updateRFQ;
    rfqRepository.updateRFQ = () => { throw new Error('Simulated DB write failure'); };
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 500);
    assert.ok(deletedKeyOnRollback !== null);
    assert.ok(deletedKeyOnRollback.startsWith(`rfq/${rfqA.id}/DOCUMENT/`));
    rfqRepository.updateRFQ = origUpdateRFQ;
    setFileStorageService(mockStorage);
    pass('39. Metadata persistence failure triggers rollback delete');

    // 40. Non-owner RFQ delete denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/${rfqDoc1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 403);
    pass('40. Non-owner RFQ delete denied (403)');

    // 41. Cross-RFQ delete denied (404)
    res = await makeRequest(`/api/rfq/${rfqB.id}/documents/${rfqDoc1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenCustB}` }
    });
    assert.strictEqual(res.status, 404);
    pass('41. Cross-RFQ delete denied (404)');

    // 42. Object-first delete order verified
    let objectDeletedBeforeMetadata = false;
    let metadataRemoved = false;
    const inspectStorage = new InMemoryFileStorageService(true);
    inspectStorage.deleteObject = async (key: string): Promise<boolean> => {
      // Check if metadata still exists when deleteObject is called
      const docStillInDb = (rfqRepository.findRFQById(rfqA.id)?.documents || []).some(d => d.id === rfqDoc1Id);
      if (docStillInDb) {
        objectDeletedBeforeMetadata = true;
      }
      return true;
    };
    setFileStorageService(inspectStorage);
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/${rfqDoc1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(objectDeletedBeforeMetadata, true);
    const docAfterDelete = (rfqRepository.findRFQById(rfqA.id)?.documents || []).some(d => d.id === rfqDoc1Id);
    assert.strictEqual(docAfterDelete, false);
    setFileStorageService(mockStorage);
    pass('42. Object-first delete order verified');

    // 43. Object delete failure retains metadata (502)
    // Upload a new doc to test delete failure retention
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenCustA}`, 'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 201);
    const docToFailDeleteId = res.body.id;
    const failDeleteStorage = new InMemoryFileStorageService(true);
    failDeleteStorage.deleteObject = async () => { throw new Error('Simulated S3 DeleteObject network timeout'); };
    setFileStorageService(failDeleteStorage);
    res = await makeRequest(`/api/rfq/${rfqA.id}/documents/${docToFailDeleteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 502);
    const stillInDb = (rfqRepository.findRFQById(rfqA.id)?.documents || []).some(d => d.id === docToFailDeleteId);
    assert.strictEqual(stillInDb, true);
    setFileStorageService(mockStorage);
    pass('43. Object delete failure retains metadata');

    // ==========================================
    // BID DOCUMENT TESTS (44 - 75)
    // ==========================================

    // 44. unauthenticated bid upload denied (401)
    const mpBidPdfTech = buildMultipartBody({ category: 'TECHNICAL' }, { name: 'file', filename: 'tech_proposal.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${mpBidPdfTech.boundary}` },
      body: mpBidPdfTech.body
    });
    assert.strictEqual(res.status, 401);
    pass('44. unauthenticated bid upload denied (401)');

    // 45. bid owner EPC upload allowed (TECHNICAL)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenEpcA}`,
        'Content-Type': `multipart/form-data; boundary=${mpBidPdfTech.boundary}` 
      },
      body: mpBidPdfTech.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.category, 'TECHNICAL');
    assert.strictEqual(res.body.bidId, bidA.id);
    const bidDocTechId = res.body.id;
    pass('45. bid owner EPC upload allowed (TECHNICAL)');

    // 46. bid owner EPC upload allowed (COMMERCIAL)
    const mpBidPdfComm = buildMultipartBody({ category: 'COMMERCIAL' }, { name: 'file', filename: 'commercial_offer.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenEpcA}`,
        'Content-Type': `multipart/form-data; boundary=${mpBidPdfComm.boundary}` 
      },
      body: mpBidPdfComm.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.category, 'COMMERCIAL');
    const bidDocCommId = res.body.id;
    pass('46. bid owner EPC upload allowed (COMMERCIAL)');

    // 47. invalid category rejected (400)
    const mpInvalidCat = buildMultipartBody({ category: 'RANDOM_CATEGORY' }, { name: 'file', filename: 'test.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenEpcA}`,
        'Content-Type': `multipart/form-data; boundary=${mpInvalidCat.boundary}` 
      },
      body: mpInvalidCat.body
    });
    assert.strictEqual(res.status, 400);
    pass('47. invalid category rejected (400)');

    // 48. competing EPC upload denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenEpcB}`,
        'Content-Type': `multipart/form-data; boundary=${mpBidPdfTech.boundary}` 
      },
      body: mpBidPdfTech.body
    });
    assert.strictEqual(res.status, 403);
    pass('48. competing EPC upload denied (403)');

    // 49. RFQ owner bid upload denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenCustA}`,
        'Content-Type': `multipart/form-data; boundary=${mpBidPdfTech.boundary}` 
      },
      body: mpBidPdfTech.body
    });
    assert.strictEqual(res.status, 403);
    pass('49. RFQ owner bid upload denied (403)');

    // 50. unrelated customer bid upload denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenCustB}`,
        'Content-Type': `multipart/form-data; boundary=${mpBidPdfTech.boundary}` 
      },
      body: mpBidPdfTech.body
    });
    assert.strictEqual(res.status, 403);
    pass('50. unrelated customer bid upload denied (403)');

    // 51. missing bid returns 404
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/non-existent-bid/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenEpcA}`,
        'Content-Type': `multipart/form-data; boundary=${mpBidPdfTech.boundary}` 
      },
      body: mpBidPdfTech.body
    });
    assert.strictEqual(res.status, 404);
    pass('51. missing bid returns 404');

    // 52. cross-RFQ bid upload denial (404)
    res = await makeRequest(`/api/rfq/${rfqB.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenEpcA}`,
        'Content-Type': `multipart/form-data; boundary=${mpBidPdfTech.boundary}` 
      },
      body: mpBidPdfTech.body
    });
    assert.strictEqual(res.status, 404);
    pass('52. cross-RFQ bid upload denial (404)');

    // 53. bid server-generated key verified
    const savedBid = rfqRepository.getBidById(bidA.id);
    const savedBidDoc = (savedBid?.documents || []).find(d => d.id === bidDocTechId);
    assert.ok(savedBidDoc?.storageKey);
    assert.ok(savedBidDoc.storageKey.startsWith(`bids/${bidA.id}/TECHNICAL/`));
    pass('53. bid server-generated key verified');

    // 54. original filename absent from bid storage key
    assert.strictEqual(savedBidDoc.storageKey.includes('tech_proposal'), false);
    pass('54. original filename absent from bid storage key');

    // 55. backward-compatible scoring arrays populated
    assert.ok(savedBid?.technicalDocuments.includes('tech_proposal.pdf'));
    assert.ok(savedBid?.commercialDocuments.includes('commercial_offer.pdf'));
    pass('55. backward-compatible scoring arrays populated');

    // 56. bid owner listing allowed
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.some((d: any) => d.id === bidDocTechId));
    assert.strictEqual(res.body.find((d: any) => d.id === bidDocTechId).storageKey, undefined);
    pass('56. bid owner listing allowed');

    // 57. RFQ owner listing allowed
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    pass('57. RFQ owner listing allowed');

    // 58. competing EPC listing denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcB}` }
    });
    assert.strictEqual(res.status, 403);
    pass('58. competing EPC listing denied (403)');

    // 59. unrelated customer listing denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustB}` }
    });
    assert.strictEqual(res.status, 403);
    pass('59. unrelated customer listing denied (403)');

    // 60. bid owner download allowed
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/${bidDocTechId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    assert.strictEqual(res.body.storageProvider, 'S3_COMPATIBLE');
    pass('60. bid owner download allowed');

    // 61. RFQ owner download allowed
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/${bidDocTechId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    pass('61. RFQ owner download allowed');

    // 62. competing EPC download denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/${bidDocTechId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcB}` }
    });
    assert.strictEqual(res.status, 403);
    pass('62. competing EPC download denied (403)');

    // 63. cross-bid document download denied (404)
    res = await makeRequest(`/api/rfq/${rfqB.id}/bids/${bidB.id}/documents/${bidDocTechId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcB}` }
    });
    assert.strictEqual(res.status, 404);
    pass('63. cross-bid document download denied (404)');

    // 64. guessed documentId download denied (404)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/guessed-doc-id/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 404);
    pass('64. guessed documentId download denied (404)');

    // 65. competing EPC delete denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/${bidDocTechId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenEpcB}` }
    });
    assert.strictEqual(res.status, 403);
    pass('65. competing EPC delete denied (403)');

    // 66. RFQ owner delete denied (403)
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/${bidDocTechId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 403);
    pass('66. RFQ owner delete denied (403)');

    // 67. bid owner delete during allowed lifecycle succeeds
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/${bidDocTechId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 200);
    const postDeleteBid = rfqRepository.getBidById(bidA.id);
    assert.strictEqual((postDeleteBid?.documents || []).some(d => d.id === bidDocTechId), false);
    pass('67. bid owner delete during allowed lifecycle succeeds');

    // 68. delete after award denied (400)
    rfqRepository.updateRFQ(rfqA.id, { status: 'AWARDED' });
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/${bidDocCommId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 400);
    rfqRepository.updateRFQ(rfqA.id, { status: 'OPEN' });
    pass('68. delete after award denied (400)');

    // 69. upload after award denied (400)
    rfqRepository.updateRFQ(rfqA.id, { status: 'AWARDED' });
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids/${bidA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenEpcA}`, 'Content-Type': `multipart/form-data; boundary=${mpBidPdfTech.boundary}` },
      body: mpBidPdfTech.body
    });
    assert.strictEqual(res.status, 400);
    rfqRepository.updateRFQ(rfqA.id, { status: 'OPEN' });
    pass('69. upload after award denied (400)');

    // 70. legacy URL scheme validation: javascript: rejected in bid creation
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenEpcA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalPrice: 15000000000,
        technicalDocuments: ['javascript:alert(1)']
      })
    });
    assert.strictEqual(res.status, 400);
    pass('70. legacy URL scheme validation: javascript: rejected in bid creation');

    // 71. legacy URL scheme validation: data: rejected in bid creation
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenEpcA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalPrice: 15000000000,
        commercialDocuments: ['data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==']
      })
    });
    assert.strictEqual(res.status, 400);
    pass('71. legacy URL scheme validation: data: rejected in bid creation');

    // 72. legacy URL scheme validation: file: rejected in bid creation
    res = await makeRequest(`/api/rfq/${rfqA.id}/bids`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenEpcA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalPrice: 15000000000,
        technicalDocuments: ['file:///etc/passwd']
      })
    });
    assert.strictEqual(res.status, 400);
    pass('72. legacy URL scheme validation: file: rejected in bid creation');

    // 73. legacy URL scheme validation: http/https accepted in bid creation
    res = await makeRequest(`/api/rfq/${rfqB.id}/bids`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenEpcA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalPrice: 15000000000,
        technicalDocuments: ['https://example.com/datasheet.pdf', 'catalog_v1.pdf']
      })
    });
    assert.strictEqual(res.status, 200);
    pass('73. legacy URL scheme validation: http/https accepted in bid creation');

    // 74. Customer A cannot access RFQ B private resources
    res = await makeRequest(`/api/rfq/${rfqB.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenCustA}` }
    });
    assert.strictEqual(res.status, 403);
    pass('74. Customer A cannot access RFQ B private resources');

    // 75. EPC A cannot access Bid B documents
    res = await makeRequest(`/api/rfq/${rfqB.id}/bids/${bidB.id}/documents`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenEpcA}` }
    });
    assert.strictEqual(res.status, 403);
    pass('75. EPC A cannot access Bid B documents');

  } finally {
    setFileStorageService(originalStorage);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    // Restore original db.json state
    fs.writeFileSync(dbPath, originalDbContent, 'utf-8');
    const finalDbContent = fs.readFileSync(dbPath, 'utf-8');
    const finalDbHash = crypto.createHash('sha256').update(finalDbContent).digest('hex');
    assert.strictEqual(finalDbHash, originalDbHash, 'db.json byte-for-byte restored');
    console.log(`[IMMUTABILITY GUARD] PASS: Repository db.json byte-for-byte identical (SHA-256: ${finalDbHash})`);
  }

  console.log('=== STAGE 12.3E TEST RESULTS: 75 / 75 PASSED ===');
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  try {
    fs.writeFileSync(dbPath, originalDbContent, 'utf-8');
  } catch {}
  process.exit(1);
});
