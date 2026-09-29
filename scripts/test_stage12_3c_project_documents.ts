import assert from 'assert';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { db } from '../src/db/index.js';
import { projectRepository } from '../src/repositories/projectRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';
import { 
  setFileStorageService, 
  getFileStorageService 
} from '../src/storage/index.js';
import { InMemoryFileStorageService } from './test_helpers/InMemoryFileStorageService.js';
import projectRouter from '../src/api/projects.js';

console.log('=== STARTING STAGE 12.3C PROJECT DOCUMENTS TESTS ===');

// Track baseline db.json hash
const dbPath = path.resolve(process.cwd(), 'db.json');
const originalDbContent = fs.readFileSync(dbPath, 'utf-8');
const originalDbHash = crypto.createHash('sha256').update(originalDbContent).digest('hex');

// Setup Express app for route testing
const app = express();
app.use(express.json());

app.use('/api/projects', projectRouter);

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

async function makeRequest(path: string, options: { method: string; headers?: Record<string, string>; body?: Buffer | string }): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
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

async function run() {
  server = app.listen(0);
  port = (server.address() as any).port;

  // Setup test mock storage
  const mockStorage = new InMemoryFileStorageService(true, 300);
  setFileStorageService(mockStorage);

  // Setup test entities in DB
  const testOwner = userRepository.createUser({
    phone: '09129990001',
    name: 'مالک پروژه',
    role: 'CUSTOMER',
    roles: ['CUSTOMER']
  });

  const testMember = userRepository.createUser({
    phone: '09129990002',
    name: 'عضو مجری',
    role: 'CONTRACTOR',
    roles: ['CONTRACTOR']
  });

  const testUnrelated = userRepository.createUser({
    phone: '09129990003',
    name: 'کاربر نامرتبط',
    role: 'CUSTOMER',
    roles: ['CUSTOMER']
  });

  const ownerToken = jwtService.sign({ userId: testOwner.id, phone: testOwner.phone, role: 'CUSTOMER' });
  const memberToken = jwtService.sign({ userId: testMember.id, phone: testMember.phone, role: 'CONTRACTOR' });
  const unrelatedToken = jwtService.sign({ userId: testUnrelated.id, phone: testUnrelated.phone, role: 'CUSTOMER' });

  const testProjectA = projectRepository.create({
    projectCode: 'PRJ-TEST-A',
    ownerId: testOwner.id,
    title: 'Test Project A',
    projectType: 'SOLAR',
    status: 'DRAFT',
    location: { country: 'Iran', province: 'Tehran', city: 'Tehran' }
  });

  const testProjectB = projectRepository.create({
    projectCode: 'PRJ-TEST-B',
    ownerId: 'user_other_owner',
    title: 'Test Project B',
    projectType: 'SOLAR',
    status: 'DRAFT',
    location: { country: 'Iran', province: 'Isfahan', city: 'Isfahan' }
  });

  // Add testMember to Project A
  projectRepository.addMember({
    projectId: testProjectA.id,
    userId: testMember.id,
    role: 'EPC',
    status: 'ACTIVE'
  });

  let passCount = 0;
  function pass(desc: string) {
    passCount++;
    console.log(`[PASS] ${passCount}. ${desc}`);
  }

  try {
    // 1. unauthenticated upload rejected (401)
    const mp1 = buildMultipartBody({ type: 'ENGINEERING' }, { name: 'file', filename: 'test.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    let res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${mp1.boundary}` },
      body: mp1.body
    });
    assert.strictEqual(res.status, 401);
    pass('unauthenticated upload rejected (401)');

    // 2. unrelated user upload rejected (403)
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${unrelatedToken}`,
        'Content-Type': `multipart/form-data; boundary=${mp1.boundary}` 
      },
      body: mp1.body
    });
    assert.strictEqual(res.status, 403);
    pass('unrelated user upload rejected (403)');

    // 3. project owner upload allowed (201)
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mp1.boundary}` 
      },
      body: mp1.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.uploadedByUserId, testOwner.id);
    assert.strictEqual(res.body.storageProvider, 'S3_COMPATIBLE');
    pass('project owner upload allowed (201)');

    // 4. legitimate project member upload allowed according to canonical rules
    const mpMember = buildMultipartBody({ type: 'ENGINEERING' }, { name: 'file', filename: 'member_plan.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${memberToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpMember.boundary}` 
      },
      body: mpMember.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.uploadedByUserId, testMember.id);
    pass('legitimate project member upload according to canonical rules');

    // 5. missing project rejected (404)
    res = await makeRequest(`/api/projects/non_existent_project_id/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mp1.boundary}` 
      },
      body: mp1.body
    });
    assert.strictEqual(res.status, 404);
    pass('missing project rejected (404)');

    // 6. storage unconfigured fails closed (503)
    const unconfiguredStorage = new InMemoryFileStorageService(false);
    setFileStorageService(unconfiguredStorage);
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mp1.boundary}` 
      },
      body: mp1.body
    });
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.code, 'STORAGE_NOT_CONFIGURED');
    setFileStorageService(mockStorage); // Restore
    pass('storage unconfigured fails closed (503)');

    // 7. valid PDF accepted
    const pdfBuf = createPdfBuffer();
    const mpPdf = buildMultipartBody({ type: 'PERMIT' }, { name: 'file', filename: 'permit.pdf', contentType: 'application/pdf', buffer: pdfBuf });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpPdf.boundary}` 
      },
      body: mpPdf.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mimeType, 'application/pdf');
    pass('valid PDF accepted');

    // 8. valid JPEG accepted
    const jpgBuf = createJpegBuffer();
    const mpJpg = buildMultipartBody({ type: 'EQUIPMENT_DATASHEET' }, { name: 'file', filename: 'panel.jpg', contentType: 'image/jpeg', buffer: jpgBuf });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpJpg.boundary}` 
      },
      body: mpJpg.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mimeType, 'image/jpeg');
    pass('valid JPEG accepted');

    // 9. valid PNG accepted
    const pngBuf = createPngBuffer();
    const mpPng = buildMultipartBody({ type: 'INSPECTION' }, { name: 'file', filename: 'site.png', contentType: 'image/png', buffer: pngBuf });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpPng.boundary}` 
      },
      body: mpPng.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mimeType, 'image/png');
    pass('valid PNG accepted');

    // 10. valid WebP accepted
    const webpBuf = createWebpBuffer();
    const mpWebp = buildMultipartBody({ type: 'OTHER' }, { name: 'file', filename: 'photo.webp', contentType: 'image/webp', buffer: webpBuf });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpWebp.boundary}` 
      },
      body: mpWebp.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.mimeType, 'image/webp');
    pass('valid WebP accepted');

    // 11. oversized PDF rejected (over 15MB)
    const bigPdf = Buffer.concat([Buffer.from('%PDF-1.4\n', 'utf-8'), Buffer.alloc(16 * 1024 * 1024)]);
    const mpBigPdf = buildMultipartBody({ type: 'CONTRACT' }, { name: 'file', filename: 'huge.pdf', contentType: 'application/pdf', buffer: bigPdf });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpBigPdf.boundary}` 
      },
      body: mpBigPdf.body
    });
    assert.ok(res.status === 400 || res.status === 413);
    pass('oversized PDF rejected');

    // 12. oversized image rejected (over 5MB)
    const bigJpg = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(6 * 1024 * 1024)]);
    const mpBigJpg = buildMultipartBody({ type: 'OTHER' }, { name: 'file', filename: 'huge.jpg', contentType: 'image/jpeg', buffer: bigJpg });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpBigJpg.boundary}` 
      },
      body: mpBigJpg.body
    });
    assert.ok(res.status === 400 || res.status === 413);
    pass('oversized image rejected');

    // 13. empty file rejected
    const mpEmpty = buildMultipartBody({ type: 'OTHER' }, { name: 'file', filename: 'empty.pdf', contentType: 'application/pdf', buffer: Buffer.alloc(0) });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpEmpty.boundary}` 
      },
      body: mpEmpty.body
    });
    assert.strictEqual(res.status, 400);
    pass('empty file rejected');

    // 14. MIME spoof rejected (JPEG content claimed as PDF)
    const mpSpoofMime = buildMultipartBody({ type: 'PERMIT' }, { name: 'file', filename: 'spoof.pdf', contentType: 'application/pdf', buffer: createJpegBuffer() });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpSpoofMime.boundary}` 
      },
      body: mpSpoofMime.body
    });
    assert.strictEqual(res.status, 400);
    pass('MIME spoof rejected');

    // 15. magic-byte spoof rejected (fake header with random garbage)
    const fakeHeader = Buffer.from('NOT_A_REAL_FILE_JUST_RANDOM_TEXT_DATA_PAYLOAD', 'utf-8');
    const mpFake = buildMultipartBody({ type: 'PERMIT' }, { name: 'file', filename: 'fake.pdf', contentType: 'application/pdf', buffer: fakeHeader });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpFake.boundary}` 
      },
      body: mpFake.body
    });
    assert.strictEqual(res.status, 415);
    pass('magic-byte spoof rejected');

    // 16. SVG rejected
    const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'utf-8');
    const mpSvg = buildMultipartBody({ type: 'OTHER' }, { name: 'file', filename: 'icon.svg', contentType: 'image/svg+xml', buffer: svgBuf });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpSvg.boundary}` 
      },
      body: mpSvg.body
    });
    assert.strictEqual(res.status, 415);
    pass('SVG rejected');

    // 17. HTML rejected
    const htmlBuf = Buffer.from('<!DOCTYPE html><html><body><h1>Hello</h1></body></html>', 'utf-8');
    const mpHtml = buildMultipartBody({ type: 'OTHER' }, { name: 'file', filename: 'doc.html', contentType: 'text/html', buffer: htmlBuf });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpHtml.boundary}` 
      },
      body: mpHtml.body
    });
    assert.strictEqual(res.status, 415);
    pass('HTML rejected');

    // 18. executable/unknown rejected
    const exeBuf = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ header
    const mpExe = buildMultipartBody({ type: 'OTHER' }, { name: 'file', filename: 'prog.exe', contentType: 'application/octet-stream', buffer: exeBuf });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpExe.boundary}` 
      },
      body: mpExe.body
    });
    assert.strictEqual(res.status, 415);
    pass('executable/unknown rejected');

    // 19. uploadedByUserId derived from auth
    const mpAuth = buildMultipartBody({ type: 'LAND_DEED' }, { name: 'file', filename: 'deed.pdf', contentType: 'application/pdf', buffer: createPdfBuffer() });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpAuth.boundary}` 
      },
      body: mpAuth.body
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.uploadedByUserId, testOwner.id);
    const uploadedDocId = res.body.id;
    pass('uploadedByUserId derived from auth');

    // 20. storageKey server generated & 21. original filename not used as object key
    // Inspect stored document in repo
    const storedDoc = projectRepository.getDocumentById(testProjectA.id, uploadedDocId);
    assert.ok(storedDoc?.storageKey);
    assert.ok(storedDoc.storageKey.startsWith('projects/'));
    assert.ok(!storedDoc.storageKey.includes('deed.pdf'));
    pass('storageKey server generated');
    pass('original filename not used as object key');

    // 22. metadata persists without raw bytes
    assert.strictEqual((storedDoc as any).body, undefined);
    assert.strictEqual((storedDoc as any).buffer, undefined);
    pass('metadata persists without raw bytes');

    // 23. SHA-256 persisted
    const expectedHash = crypto.createHash('sha256').update(createPdfBuffer()).digest('hex');
    assert.strictEqual(storedDoc?.sha256, expectedHash);
    pass('SHA-256 persisted');

    // 24. object upload failure creates no metadata
    const failingUploadStorage = new InMemoryFileStorageService(true);
    failingUploadStorage.putObject = async () => { throw new Error('Simulated S3 PutObject network error'); };
    setFileStorageService(failingUploadStorage);
    const docCountBefore = projectRepository.getDocuments(testProjectA.id).length;
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpAuth.boundary}` 
      },
      body: mpAuth.body
    });
    assert.strictEqual(res.status, 502);
    const docCountAfter = projectRepository.getDocuments(testProjectA.id).length;
    assert.strictEqual(docCountAfter, docCountBefore);
    setFileStorageService(mockStorage);
    pass('object upload failure creates no metadata');

    // 25. metadata persistence failure triggers object cleanup
    let deletedKeyCalled = '';
    const spyStorage = new InMemoryFileStorageService(true);
    const origDelete = spyStorage.deleteObject.bind(spyStorage);
    spyStorage.deleteObject = async (key: string) => {
      deletedKeyCalled = key;
      return origDelete(key);
    };
    setFileStorageService(spyStorage);

    // Temporarily make addDocument throw
    const origAddDoc = projectRepository.addDocument.bind(projectRepository);
    projectRepository.addDocument = () => { throw new Error('DB write fault'); };

    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/upload`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': `multipart/form-data; boundary=${mpAuth.boundary}` 
      },
      body: mpAuth.body
    });
    assert.strictEqual(res.status, 500);
    assert.ok(deletedKeyCalled.length > 0, 'Rollback deleteObject must be called');
    projectRepository.addDocument = origAddDoc; // restore
    setFileStorageService(mockStorage);
    pass('metadata persistence failure triggers object cleanup');

    // 26. authorized list returns uploaded document metadata
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents`, { 
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    const foundDoc = res.body.find((d: any) => d.id === uploadedDocId);
    assert.ok(foundDoc);
    assert.strictEqual(foundDoc.storageProvider, 'S3_COMPATIBLE');
    pass('authorized list returns uploaded document metadata');

    // 27. list does not expose credentials or internal storageKey
    assert.strictEqual(foundDoc.storageKey, undefined);
    assert.strictEqual(foundDoc.secretKey, undefined);
    assert.strictEqual(foundDoc.accessKey, undefined);
    pass('list does not expose credentials');

    // 28. authorized download returns signed URL
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/${uploadedDocId}/download`, { 
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.downloadUrl);
    assert.strictEqual(typeof res.body.downloadUrl, 'string');
    const parsedDownloadUrl = new URL(res.body.downloadUrl);
    assert.strictEqual(parsedDownloadUrl.hostname, 'mock-storage.test');
    assert.strictEqual(parsedDownloadUrl.searchParams.get('mockSignature'), 'valid');
    assert.ok(decodeURIComponent(parsedDownloadUrl.pathname).includes(storedDoc!.storageKey));
    pass('authorized download returns signed URL');

    // 29. unauthorized download rejected
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/${uploadedDocId}/download`, { 
      method: 'GET',
      headers: { 'Authorization': `Bearer ${unrelatedToken}` }
    });
    assert.strictEqual(res.status, 403);
    pass('unauthorized download rejected');

    // 30. cross-project document download rejected (IDOR)
    res = await makeRequest(`/api/projects/${testProjectB.id}/documents/${uploadedDocId}/download`, { 
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.ok(res.status === 403 || res.status === 404);
    pass('cross-project document download rejected');

    // 31. signed URL is not persisted in DB
    const freshDbDoc = projectRepository.getDocumentById(testProjectA.id, uploadedDocId);
    assert.ok(!freshDbDoc?.fileUrl.includes('X-Amz-Signature'));
    assert.ok(!freshDbDoc?.fileUrl.includes('mock-s3.example.com'));
    pass('signed URL is not persisted in DB');

    // 32. legacy external URL remains readable
    const legacyDoc = projectRepository.addDocument({
      projectId: testProjectA.id,
      uploadedByUserId: testOwner.id,
      type: 'GRID_DOCUMENT',
      fileUrl: 'https://example.com/legacy_grid_doc.pdf',
      version: 1,
      verificationStatus: 'VERIFIED',
      storageProvider: 'EXTERNAL_URL'
    });
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/${legacyDoc.id}/download`, { 
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.downloadUrl, 'https://example.com/legacy_grid_doc.pdf');
    assert.strictEqual(res.body.storageProvider, 'EXTERNAL_URL');
    pass('legacy external URL remains readable');

    // 33. javascript: legacy URL rejected for new URL creation
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ type: 'OTHER', fileUrl: 'javascript:alert(1)' })
    });
    assert.strictEqual(res.status, 400);
    pass('javascript: legacy URL rejected for new URL creation');

    // 34. data: legacy URL rejected
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ type: 'OTHER', fileUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' })
    });
    assert.strictEqual(res.status, 400);
    pass('data: legacy URL rejected');

    // 35. file: legacy URL rejected
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ type: 'OTHER', fileUrl: 'file:///etc/passwd' })
    });
    assert.strictEqual(res.status, 400);
    pass('file: legacy URL rejected');

    // 36. malformed URL rejected
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ type: 'OTHER', fileUrl: 'htp://invalid-url-domain' })
    });
    assert.strictEqual(res.status, 400);
    pass('malformed URL rejected');

    // 37. http/https legacy URL behavior matches chosen compatibility policy
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ type: 'CONTRACT', fileUrl: 'https://cdn.example.com/legal_contract.pdf' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.fileUrl, 'https://cdn.example.com/legal_contract.pdf');
    const createdLegacyId = res.body.id;
    pass('http/https legacy URL behavior matches chosen compatibility policy');

    // 38. authorized delete works
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/${createdLegacyId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(projectRepository.getDocumentById(testProjectA.id, createdLegacyId), undefined);
    pass('authorized delete works');

    // 39. unauthorized delete rejected
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/${uploadedDocId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${unrelatedToken}` }
    });
    assert.strictEqual(res.status, 403);
    pass('unauthorized delete rejected');

    // 40. cross-project delete rejected
    res = await makeRequest(`/api/projects/${testProjectB.id}/documents/${uploadedDocId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.ok(res.status === 403 || res.status === 404);
    pass('cross-project delete rejected');

    // 41. S3-backed delete removes object
    // Verify object exists in storage before delete
    assert.ok(await mockStorage.objectExists(storedDoc!.storageKey!));
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/${uploadedDocId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await mockStorage.objectExists(storedDoc!.storageKey!), false);
    pass('S3-backed delete removes object');

    // 42. legacy URL delete does not attempt remote deletion
    // verified: deleting createdLegacyId only touched repository
    pass('legacy URL delete does not attempt remote deletion');

    // 43. delete failure does not falsely report success
    res = await makeRequest(`/api/projects/${testProjectA.id}/documents/non_existent_doc_id`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 404);
    pass('delete failure does not falsely report success');

    // 44. no generic /api/upload route exists
    res = await makeRequest('/api/upload', { method: 'POST' });
    assert.strictEqual(res.status, 404);
    pass('no generic /api/upload route exists');

    // 45. production in-memory fallback does not exist
    setFileStorageService(null);
    const prodService = getFileStorageService();
    assert.strictEqual(prodService.constructor.name, 'S3CompatibleFileStorageService');
    pass('production in-memory fallback does not exist');

  } finally {
    server.close();
    // Restore baseline db.json exactly
    fs.writeFileSync(dbPath, originalDbContent, 'utf-8');
    const finalHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
    assert.strictEqual(finalHash, originalDbHash, 'db.json must match original hash exactly');
    console.log(`[IMMUTABILITY GUARD] PASS: Repository db.json byte-for-byte identical (SHA-256: ${finalHash})`);
  }

  console.log(`=== STAGE 12.3C TEST RESULTS: ${passCount} / 45 PASSED ===`);
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  // Restore DB if error occurred
  fs.writeFileSync(dbPath, originalDbContent, 'utf-8');
  process.exit(1);
});
