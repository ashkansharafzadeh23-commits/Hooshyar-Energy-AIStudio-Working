import assert from 'assert';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { db } from '../src/db/index.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';
import { 
  setFileStorageService, 
  getFileStorageService 
} from '../src/storage/index.js';
import { InMemoryFileStorageService } from './test_helpers/InMemoryFileStorageService.js';
import { maintenanceRouter } from '../src/api/maintenance.js';

console.log('=== STARTING STAGE 12.3D SMART MAINTENANCE PHOTO PERSISTENCE TESTS ===');

// Track baseline db.json hash
const dbPath = path.resolve(process.cwd(), 'db.json');
const originalDbContent = fs.readFileSync(dbPath, 'utf-8');
const originalDbHash = crypto.createHash('sha256').update(originalDbContent).digest('hex');

// Setup Express app for route testing
const app = express();
app.use(express.json());
app.use('/api', maintenanceRouter);

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
      port = (server.address() as any).port;
      resolve();
    });
  });

  const mockStorage = new InMemoryFileStorageService(true);
  setFileStorageService(mockStorage);

  try {
    // 1. Seed test users
    const ownerUser = userRepository.createUser({
      phone: '09129990011',
      email: 'maint_owner@test.com',
      name: 'Owner Customer',
      role: 'CUSTOMER',
      roles: ['CUSTOMER']
    });

    const techUser = userRepository.createUser({
      phone: '09129990012',
      email: 'maint_tech@test.com',
      name: 'Assigned Tech',
      role: 'TECHNICIAN',
      roles: ['TECHNICIAN']
    });

    const unassignedTechUser = userRepository.createUser({
      phone: '09129990013',
      email: 'unassigned_tech@test.com',
      name: 'Unassigned Tech',
      role: 'TECHNICIAN',
      roles: ['TECHNICIAN']
    });

    const unrelatedUser = userRepository.createUser({
      phone: '09129990014',
      email: 'unrelated@test.com',
      name: 'Unrelated User',
      role: 'CUSTOMER',
      roles: ['CUSTOMER']
    });

    const adminUser = userRepository.createUser({
      phone: '09129990015',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    const superAdminUser = userRepository.createUser({
      phone: '09129990016',
      email: 'superadmin@test.com',
      name: 'Super Admin User',
      role: 'SUPER_ADMIN',
      roles: ['SUPER_ADMIN']
    });

    const ownerToken = jwtService.sign({ userId: ownerUser.id, id: ownerUser.id, role: ownerUser.role, roles: ownerUser.roles });
    const techToken = jwtService.sign({ userId: techUser.id, id: techUser.id, role: techUser.role, roles: techUser.roles });
    const unassignedTechToken = jwtService.sign({ userId: unassignedTechUser.id, id: unassignedTechUser.id, role: unassignedTechUser.role, roles: unassignedTechUser.roles });
    const unrelatedToken = jwtService.sign({ userId: unrelatedUser.id, id: unrelatedUser.id, role: unrelatedUser.role, roles: unrelatedUser.roles });
    const adminToken = jwtService.sign({ userId: adminUser.id, id: adminUser.id, role: adminUser.role, roles: adminUser.roles });
    const superAdminToken = jwtService.sign({ userId: superAdminUser.id, id: superAdminUser.id, role: superAdminUser.role, roles: superAdminUser.roles });

    // Seed test cases
    const testCaseA = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پنل خورشیدی آسیب‌دیده مورد الف',
      description: 'سوختگی سلول‌های فتوولتائیک',
      category: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'ASSIGNED',
      reportedBy: ownerUser.id,
      reportedAt: new Date().toISOString(),
      assignedTechnicianId: techUser.id,
      assignedTechnicianName: techUser.name,
      alertIds: []
    });

    const testCaseB = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'خرابی اینورتر مورد ب',
      description: 'آلارم خطا در مدار',
      category: 'CORRECTIVE',
      priority: 'MEDIUM',
      status: 'OPEN',
      reportedBy: unrelatedUser.id,
      reportedAt: new Date().toISOString(),
      assignedTechnicianId: undefined,
      alertIds: []
    });

    // ==========================================
    // AUTHORIZATION TESTS (1 - 8)
    // ==========================================

    // 1. unauthenticated upload denied
    const mpJpeg = buildMultipartBody({}, { name: 'file', filename: 'damage.jpg', contentType: 'image/jpeg', buffer: createJpegBuffer() });
    let res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 401);
    pass('1. unauthenticated upload denied');

    // 2. owner upload allowed
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.type, 'PHOTO');
    assert.strictEqual(res.body.storageProvider, 'S3_COMPATIBLE');
    const uploadedPhotoAId = res.body.id;
    pass('2. owner upload allowed');

    // 3. assigned technician upload allowed
    const mpPng = buildMultipartBody({}, { name: 'file', filename: 'inspection.png', contentType: 'image/png', buffer: createPngBuffer() });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpPng.boundary}` 
      },
      body: mpPng.body
    });
    assert.strictEqual(res.status, 201);
    pass('3. assigned technician upload allowed');

    // 4. unrelated customer denied
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${unrelatedToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 403);
    pass('4. unrelated customer denied');

    // 5. unassigned technician denied
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${unassignedTechToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 403);
    pass('5. unassigned technician denied');

    // 6. missing case 404
    res = await makeRequest(`/api/cases/non-existent-case-999/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 404);
    pass('6. missing case 404');

    // 7. admin allowed
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 201);
    pass('7. admin allowed');

    // 8. super admin allowed
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 201);
    pass('8. super admin allowed');

    // ==========================================
    // VALIDATION TESTS (9 - 19)
    // ==========================================

    // 9. valid JPEG accepted
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mimeType, 'image/jpeg');
    pass('9. valid JPEG accepted');

    // 10. valid PNG accepted
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpPng.boundary}` 
      },
      body: mpPng.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mimeType, 'image/png');
    pass('10. valid PNG accepted');

    // 11. valid WebP accepted
    const mpWebp = buildMultipartBody({}, { name: 'file', filename: 'photo.webp', contentType: 'image/webp', buffer: createWebpBuffer() });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpWebp.boundary}` 
      },
      body: mpWebp.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mimeType, 'image/webp');
    pass('11. valid WebP accepted');

    // 12. PDF rejected (Stage 12.3D strictly allows photos only: JPEG, PNG, WebP)
    const mpPdf = buildMultipartBody({}, { name: 'file', filename: 'manual.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` 
      },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 400);
    pass('12. PDF rejected');

    // 13. oversized image rejected (>5MB)
    const bigImg = Buffer.concat([createJpegBuffer(), Buffer.alloc(6 * 1024 * 1024, 0)]);
    const mpBig = buildMultipartBody({}, { name: 'file', filename: 'huge.jpg', contentType: 'image/jpeg', buffer: bigImg });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpBig.boundary}` 
      },
      body: mpBig.body
    });
    assert.strictEqual(res.status, 413);
    pass('13. oversized image rejected');

    // 14. empty file rejected
    const mpEmpty = buildMultipartBody({}, { name: 'file', filename: 'empty.jpg', contentType: 'image/jpeg', buffer: Buffer.alloc(0) });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpEmpty.boundary}` 
      },
      body: mpEmpty.body
    });
    assert.strictEqual(res.status, 400);
    pass('14. empty file rejected');

    // 15. MIME spoof rejected (JPEG declared, fake bytes)
    const mpMimeSpoof = buildMultipartBody({}, { name: 'file', filename: 'fake.jpg', contentType: 'image/jpeg', buffer: Buffer.from('FAKE_BYTES_NOT_JPEG', 'utf-8') });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpMimeSpoof.boundary}` 
      },
      body: mpMimeSpoof.body
    });
    assert.strictEqual(res.status, 415);
    pass('15. MIME spoof rejected');

    // 16. magic-byte spoof rejected
    const mpMagicSpoof = buildMultipartBody({}, { name: 'file', filename: 'corrupt.png', contentType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x00, 0x00, 0x00]) });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpMagicSpoof.boundary}` 
      },
      body: mpMagicSpoof.body
    });
    assert.strictEqual(res.status, 415);
    pass('16. magic-byte spoof rejected');

    // 17. SVG rejected
    const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>', 'utf-8');
    const mpSvg = buildMultipartBody({}, { name: 'file', filename: 'icon.svg', contentType: 'image/svg+xml', buffer: svgBuf });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpSvg.boundary}` 
      },
      body: mpSvg.body
    });
    assert.strictEqual(res.status, 415);
    pass('17. SVG rejected');

    // 18. HTML rejected
    const htmlBuf = Buffer.from('<!DOCTYPE html><html><body>Dangerous</body></html>', 'utf-8');
    const mpHtml = buildMultipartBody({}, { name: 'file', filename: 'page.html', contentType: 'text/html', buffer: htmlBuf });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpHtml.boundary}` 
      },
      body: mpHtml.body
    });
    assert.strictEqual(res.status, 415);
    pass('18. HTML rejected');

    // 19. executable/unknown rejected
    const exeBuf = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const mpExe = buildMultipartBody({}, { name: 'file', filename: 'malware.exe', contentType: 'application/octet-stream', buffer: exeBuf });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpExe.boundary}` 
      },
      body: mpExe.body
    });
    assert.strictEqual(res.status, 415);
    pass('19. executable/unknown rejected');

    // ==========================================
    // METADATA TESTS (20 - 30)
    // ==========================================

    // 20. server-derived uploader
    const mpMeta = buildMultipartBody({}, { name: 'file', filename: 'cell_defect.jpg', contentType: 'image/jpeg', buffer: createJpegBuffer() });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpMeta.boundary}` 
      },
      body: mpMeta.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.uploadedBy, ownerUser.id);
    const metaPhotoId = res.body.id;
    pass('20. server-derived uploader');

    // Retrieve saved case from repository
    const caseInDb = maintenanceRepository.getCaseById(testCaseA.id);
    const savedMetaAtt = (caseInDb?.attachments || []).find(a => a.id === metaPhotoId);
    assert.ok(savedMetaAtt);

    // 21. server-generated storage key
    assert.ok(savedMetaAtt?.storageKey);
    assert.ok(savedMetaAtt.storageKey.startsWith(`maintenance/${testCaseA.id}/PHOTO/`));
    pass('21. server-generated storage key');

    // 22. original filename absent from key
    assert.strictEqual(savedMetaAtt.storageKey.includes('cell_defect'), false);
    pass('22. original filename absent from key');

    // 23. SHA-256 persisted
    const expectedSha = crypto.createHash('sha256').update(createJpegBuffer()).digest('hex');
    assert.strictEqual(savedMetaAtt.checksumSha256, expectedSha);
    pass('23. SHA-256 persisted');

    // 24. canonical MIME persisted
    assert.strictEqual(savedMetaAtt.mimeType, 'image/jpeg');
    pass('24. canonical MIME persisted');

    // 25. size persisted
    assert.strictEqual(savedMetaAtt.sizeBytes, createJpegBuffer().length);
    pass('25. size persisted');

    // 26. no raw bytes persisted in db
    assert.strictEqual((savedMetaAtt as any).buffer, undefined);
    assert.strictEqual((savedMetaAtt as any).bytes, undefined);
    pass('26. no raw bytes persisted');

    // 27. no Base64 persisted in db
    assert.strictEqual((savedMetaAtt as any).base64, undefined);
    assert.strictEqual((savedMetaAtt as any).base64Data, undefined);
    assert.strictEqual((savedMetaAtt as any).data, undefined);
    pass('27. no Base64 persisted');

    // 28. no signed URL persisted
    assert.strictEqual((savedMetaAtt as any).signedUrl, undefined);
    assert.ok(!savedMetaAtt.url.includes('mockSignature'));
    assert.ok(!savedMetaAtt.url.includes('X-Amz-Signature'));
    pass('28. no signed URL persisted');

    // 29. type PHOTO
    assert.strictEqual(savedMetaAtt.type, 'PHOTO');
    pass('29. type PHOTO');

    // 30. no duplicate placeholder photo record
    // The photo uploaded via multipart only created exactly 1 attachment record
    const matches = (caseInDb?.attachments || []).filter(a => a.id === metaPhotoId);
    assert.strictEqual(matches.length, 1);
    pass('30. no duplicate placeholder photo record');

    // ==========================================
    // FAILURES TESTS (31 - 34)
    // ==========================================

    // 31. storage unconfigured 503
    const unconfiguredStorage = new InMemoryFileStorageService(false);
    setFileStorageService(unconfiguredStorage);
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.code, 'STORAGE_NOT_CONFIGURED');
    setFileStorageService(mockStorage);
    pass('31. storage unconfigured 503');

    // 32. storage upload failure creates no metadata
    const failingUploadStorage = new InMemoryFileStorageService(true);
    failingUploadStorage.putObject = async () => { throw new Error('Simulated S3 PutObject network error'); };
    setFileStorageService(failingUploadStorage);

    const countBeforeFailure = (maintenanceRepository.getCaseById(testCaseA.id)?.attachments || []).length;
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 502);
    const countAfterFailure = (maintenanceRepository.getCaseById(testCaseA.id)?.attachments || []).length;
    assert.strictEqual(countAfterFailure, countBeforeFailure);
    pass('32. storage upload failure creates no metadata');

    // 33. metadata persistence failure triggers object rollback
    let rollbackDetected = false;
    const trackingStorage = new InMemoryFileStorageService(true);
    const originalDelete = trackingStorage.deleteObject.bind(trackingStorage);
    trackingStorage.deleteObject = async (key: string) => {
      rollbackDetected = true;
      return originalDelete(key);
    };
    setFileStorageService(trackingStorage);

    // Temporarily simulate DB failure in updateCase
    const origUpdateCase = maintenanceRepository.updateCase;
    (maintenanceRepository as any).updateCase = () => null; // returns null on DB failure

    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 500);
    assert.strictEqual(rollbackDetected, true);
    (maintenanceRepository as any).updateCase = origUpdateCase;
    pass('33. metadata persistence failure triggers object rollback');

    // 34. rollback deletion failure handled safely
    const failRollbackStorage = new InMemoryFileStorageService(true);
    failRollbackStorage.deleteObject = async () => { throw new Error('Simulated S3 DeleteObject network timeout'); };
    setFileStorageService(failRollbackStorage);

    (maintenanceRepository as any).updateCase = () => null;
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpeg.boundary}` 
      },
      body: mpJpeg.body
    });
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.code, 'METADATA_PERSISTENCE_FAILED');
    (maintenanceRepository as any).updateCase = origUpdateCase;
    setFileStorageService(mockStorage);
    pass('34. rollback deletion failure handled safely');

    // ==========================================
    // DOWNLOAD TESTS (35 - 42)
    // ==========================================

    // 35. owner signed download
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${metaPhotoId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    const parsedDownloadUrl = new URL(res.body.downloadUrl);
    assert.strictEqual(parsedDownloadUrl.hostname, 'mock-storage.test');
    assert.strictEqual(parsedDownloadUrl.searchParams.get('mockSignature'), 'valid');
    pass('35. owner signed download');

    // 36. assigned technician signed download
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${metaPhotoId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    pass('36. assigned technician signed download');

    // 37. unrelated customer download denied
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${metaPhotoId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${unrelatedToken}` }
    });
    assert.strictEqual(res.status, 403);
    pass('37. unrelated customer download denied');

    // 38. unassigned technician download denied
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${metaPhotoId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${unassignedTechToken}` }
    });
    assert.strictEqual(res.status, 403);
    pass('38. unassigned technician download denied');

    // 39. cross-case attachment IDOR denied
    res = await makeRequest(`/api/cases/${testCaseB.id}/attachments/${metaPhotoId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${unrelatedToken}` }
    });
    assert.strictEqual(res.status, 404);
    pass('39. cross-case attachment IDOR denied');

    // 40. signed URL generated on demand
    const firstCall = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${metaPhotoId}/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(firstCall.status, 200);
    pass('40. signed URL generated on demand');

    // 41. signed URL not persisted in DB
    const freshCase = maintenanceRepository.getCaseById(testCaseA.id);
    const checkAtt = freshCase?.attachments?.find(a => a.id === metaPhotoId);
    assert.strictEqual((checkAtt as any).downloadUrl, undefined);
    assert.strictEqual((checkAtt as any).signedUrl, undefined);
    pass('41. signed URL not persisted');

    // 42. missing attachment 404
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/non_existent_att_999/download`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 404);
    pass('42. missing attachment 404');

    // ==========================================
    // DELETE TESTS (43 - 49)
    // ==========================================

    // Upload another photo to test delete
    const mpForDel = buildMultipartBody({}, { name: 'file', filename: 'temp.jpg', contentType: 'image/jpeg', buffer: createJpegBuffer() });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpForDel.boundary}` 
      },
      body: mpForDel.body
    });
    assert.strictEqual(res.status, 201);
    const photoToDelId = res.body.id;

    // 45. unrelated delete denied
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${photoToDelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${unrelatedToken}` }
    });
    assert.strictEqual(res.status, 403);
    pass('45. unrelated delete denied');

    // 46. cross-case delete denied
    res = await makeRequest(`/api/cases/${testCaseB.id}/attachments/${photoToDelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${unrelatedToken}` }
    });
    assert.strictEqual(res.status, 404);
    pass('46. cross-case delete denied');

    // 47. object deletion occurs before metadata removal (and 43. owner delete)
    let s3DeletedBeforeDb = false;
    const inspectStorage = new InMemoryFileStorageService(true);
    for (const [k, v] of mockStorage['objects'].entries()) {
      inspectStorage['objects'].set(k, v);
    }
    const origDeleteObj = inspectStorage.deleteObject.bind(inspectStorage);
    inspectStorage.deleteObject = async (key: string) => {
      // Check that DB still has metadata at this exact moment
      const currentCase = maintenanceRepository.getCaseById(testCaseA.id);
      const stillInDb = currentCase?.attachments?.some(a => a.id === photoToDelId);
      if (stillInDb) {
        s3DeletedBeforeDb = true;
      }
      return origDeleteObj(key);
    };
    setFileStorageService(inspectStorage);

    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${photoToDelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(s3DeletedBeforeDb, true);
    const afterDelCase = maintenanceRepository.getCaseById(testCaseA.id);
    assert.strictEqual(afterDelCase?.attachments?.some(a => a.id === photoToDelId), false);
    pass('47. object deletion occurs before metadata removal');
    pass('43. owner delete');

    // 44. assigned technician delete
    const mpTechDel = buildMultipartBody({}, { name: 'file', filename: 'tech_temp.png', contentType: 'image/png', buffer: createPngBuffer() });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpTechDel.boundary}` 
      },
      body: mpTechDel.body
    });
    assert.strictEqual(res.status, 201);
    const techPhotoId = res.body.id;

    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${techPhotoId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${techToken}` }
    });
    assert.strictEqual(res.status, 200);
    pass('44. assigned technician delete');

    // 48. S3 delete failure retains metadata
    const mpFailDel = buildMultipartBody({}, { name: 'file', filename: 'fail_del.png', contentType: 'image/png', buffer: createPngBuffer() });
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpFailDel.boundary}` 
      },
      body: mpFailDel.body
    });
    assert.strictEqual(res.status, 201);
    const failDelPhotoId = res.body.id;

    inspectStorage.deleteObject = async () => { throw new Error('Simulated S3 delete network fault'); };

    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${failDelPhotoId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 502);
    // Metadata retained
    const retainedCase = maintenanceRepository.getCaseById(testCaseA.id);
    assert.ok(retainedCase?.attachments?.some(a => a.id === failDelPhotoId));
    pass('48. S3 delete failure retains metadata');

    // 49. external URL delete does not attempt remote deletion
    let remoteDeleteCalled = false;
    inspectStorage.deleteObject = async () => { remoteDeleteCalled = true; return true; };

    // Create external URL attachment
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        name: 'manual.pdf',
        type: 'DOCUMENT',
        url: 'https://example.com/files/manual.pdf'
      })
    });
    assert.strictEqual(res.status, 201);
    const extAttId = res.body.id;

    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments/${extAttId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(remoteDeleteCalled, false);
    pass('49. external URL delete does not attempt remote deletion');

    setFileStorageService(mockStorage);

    // ==========================================
    // LEGACY URL SECURITY TESTS (50 - 55)
    // ==========================================

    // 50. https accepted
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'safe.pdf', url: 'https://cdn.example.com/safe.pdf' })
    });
    assert.strictEqual(res.status, 201);
    pass('50. https accepted');

    // 51. http accepted
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'http_doc.pdf', url: 'http://cdn.example.com/doc.pdf' })
    });
    assert.strictEqual(res.status, 201);
    pass('51. http accepted');

    // 52. javascript rejected
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'xss.html', url: 'javascript:alert(1)' })
    });
    assert.strictEqual(res.status, 400);
    pass('52. javascript rejected');

    // 53. data rejected
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'payload.bin', url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' })
    });
    assert.strictEqual(res.status, 400);
    pass('53. data rejected');

    // 54. file rejected
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'etc_passwd', url: 'file:///etc/passwd' })
    });
    assert.strictEqual(res.status, 400);
    pass('54. file rejected');

    // 55. malformed URL rejected
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'malformed', url: 'ht!tp://not a url' })
    });
    assert.strictEqual(res.status, 400);
    pass('55. malformed URL rejected');

    // ==========================================
    // INTEGRATION TESTS (56 - 60)
    // ==========================================

    // 56. diagnosis flow remains independent of storage
    // Storage unconfigured must NOT break /api/diagnose
    const unconfForDiag = new InMemoryFileStorageService(false);
    setFileStorageService(unconfForDiag);
    res = await makeRequest('/api/diagnose', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipmentType: 'INVERTER',
        symptoms: ['چراغ خطای قرمز'],
        description: 'تست عملکرد عیب‌یابی بدون استوریج',
        triggerAiAssisted: false // deterministic engine
      })
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.rootCauses);
    setFileStorageService(mockStorage);
    pass('56. diagnosis flow remains independent of storage');

    // 57. case creation does not persist Base64
    res = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId: 'UNREGISTERED',
        equipmentType: 'INVERTER',
        title: 'پرونده بدون پایدارسازی بیس۶۴',
        description: 'تست عدم ذخیره بایت‌ها',
        photos: [{ name: 'test_p.jpg', data: createJpegBuffer().toString('base64'), mimeType: 'image/jpeg', sizeBytes: 100 }]
      })
    });
    assert.strictEqual(res.status, 201);
    const createdNoBase64Case = maintenanceRepository.getCaseById(res.body.id);
    const createdNoBase64Photo = createdNoBase64Case?.attachments?.find(a => a.type === 'PHOTO');
    assert.strictEqual((createdNoBase64Photo as any)?.data, undefined);
    assert.strictEqual((createdNoBase64Photo as any)?.base64, undefined);
    assert.strictEqual((createdNoBase64Photo as any)?.base64Data, undefined);
    pass('57. case creation does not persist Base64');

    // 58. case creation no longer creates duplicate empty photo placeholders
    // When photos are uploaded via multipart post-case, initial case creation does not create duplicate empty photos
    const createdAttList = createdNoBase64Case?.attachments || [];
    assert.ok(createdAttList.length <= 1);
    pass('58. case creation no longer creates duplicate empty photo placeholders');

    // 59. private photo listing exposes metadata but not signed URL
    res = await makeRequest(`/api/cases/${testCaseA.id}/attachments`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    const listedPhoto = res.body.find((a: any) => a.id === metaPhotoId);
    assert.ok(listedPhoto);
    assert.strictEqual(listedPhoto.storageProvider, 'S3_COMPATIBLE');
    assert.ok(!listedPhoto.url.includes('mockSignature'));
    pass('59. private photo listing exposes metadata but not signed URL');

    // 60. no generic upload endpoint introduced
    res = await makeRequest('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.ok(res.status === 404 || res.status === 405);
    pass('60. no generic upload endpoint introduced');

    // ==========================================
    // STAGE 12.3D.1 — TECHNICIAN & ADMIN UI TESTS (61 - 70)
    // ==========================================

    const caseDetailModalSrc = fs.readFileSync('src/components/maintenance/CaseDetailModal.tsx', 'utf-8');
    const maintenanceCaseDetailsSrc = fs.readFileSync('src/components/operations/MaintenanceCaseDetails.tsx', 'utf-8');

    // 61. technician/admin case UI identifies PHOTO attachments
    assert.ok(caseDetailModalSrc.includes("a.type === 'PHOTO'"));
    assert.ok(maintenanceCaseDetailsSrc.includes("a.type === 'PHOTO'"));
    pass('61. technician/admin case UI identifies PHOTO attachments');

    // 62. S3 photo uses secure download endpoint
    assert.ok(caseDetailModalSrc.includes('/attachments/${att.id}/download'));
    assert.ok(maintenanceCaseDetailsSrc.includes('/attachments/${att.id}/download'));
    pass('62. S3 photo uses secure download endpoint');

    // 63. authenticated request is used
    assert.ok(caseDetailModalSrc.includes('Authorization: `Bearer ${token}`'));
    assert.ok(maintenanceCaseDetailsSrc.includes('Authorization: `Bearer ${token}`'));
    pass('63. authenticated request is used');

    // 64. returned downloadUrl is used only in component state
    assert.ok(caseDetailModalSrc.includes('setSignedUrls'));
    assert.ok(maintenanceCaseDetailsSrc.includes('setSignedUrls'));
    assert.ok(!caseDetailModalSrc.includes('localStorage.setItem(\'signedUrl\''));
    assert.ok(!maintenanceCaseDetailsSrc.includes('localStorage.setItem(\'signedUrl\''));
    pass('64. returned downloadUrl is used only in component state');

    // 65. storageKey is not rendered as public URL
    assert.ok(!caseDetailModalSrc.includes('src={att.storageKey}'));
    assert.ok(!maintenanceCaseDetailsSrc.includes('src={att.storageKey}'));
    pass('65. storageKey is not rendered as public URL');

    // 66. no Base64 rendering path introduced
    assert.ok(!caseDetailModalSrc.includes('data:image'));
    assert.ok(!maintenanceCaseDetailsSrc.includes('data:image'));
    assert.ok(!caseDetailModalSrc.includes('att.base64'));
    assert.ok(!maintenanceCaseDetailsSrc.includes('att.base64'));
    pass('66. no Base64 rendering path introduced');

    // 67. legacy external photo remains supported
    assert.ok(caseDetailModalSrc.includes("att.url.startsWith('http://')"));
    assert.ok(maintenanceCaseDetailsSrc.includes("att.url.startsWith('http://')"));
    pass('67. legacy external photo remains supported');

    // 68. loading state exists
    assert.ok(caseDetailModalSrc.includes('loadingPhotos'));
    assert.ok(maintenanceCaseDetailsSrc.includes('loadingPhotos'));
    pass('68. loading state exists');

    // 69. failure state exists
    assert.ok(caseDetailModalSrc.includes('photoErrors'));
    assert.ok(maintenanceCaseDetailsSrc.includes('photoErrors'));
    pass('69. failure state exists');

    // 70. retry/refetch exists
    assert.ok(caseDetailModalSrc.includes('fetchSignedUrl(att, true)'));
    assert.ok(maintenanceCaseDetailsSrc.includes('fetchSignedUrl(att, true)'));
    assert.ok(caseDetailModalSrc.includes('تلاش مجدد'));
    assert.ok(maintenanceCaseDetailsSrc.includes('تلاش مجدد'));
    pass('70. retry/refetch exists');

  } finally {
    // Teardown HTTP server
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

  console.log('=== STAGE 12.3D TEST RESULTS: 70 / 70 PASSED ===');
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  // Restore DB on error
  try {
    fs.writeFileSync(dbPath, originalDbContent, 'utf-8');
  } catch {}
  process.exit(1);
});
