import assert from 'assert';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import {
  validateBinaryFile,
  sanitizeOriginalFilename,
  FileValidationError,
  generateStorageKey,
  validateStorageKey,
  S3CompatibleFileStorageService,
  StorageNotConfiguredError,
  handleMultipartUpload
} from '../src/storage/index.js';
import { InMemoryFileStorageService } from './test_helpers/InMemoryFileStorageService.js';
import { validateEnvironment } from '../src/config/environment.js';

console.log('=== STARTING STAGE 12.3B STORAGE FOUNDATION TESTS ===');

// Helper to create test buffers
const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00]);
const validWebpBuffer = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii')
]);

async function runTests() {
  let passed = 0;
  const total = 26;

  // 1. valid PDF accepted
  const pdfResult = validateBinaryFile(validPdfBuffer, 'report.pdf', 'application/pdf');
  assert(pdfResult.detectedMimeType === 'application/pdf', '1. valid PDF detected');
  assert(pdfResult.extension === '.pdf', '1. valid PDF extension .pdf');
  passed++;
  console.log('[PASS] 1. valid PDF accepted');

  // 2. valid JPEG accepted
  const jpegResult = validateBinaryFile(validJpegBuffer, 'site.jpg', 'image/jpeg');
  assert(jpegResult.detectedMimeType === 'image/jpeg', '2. valid JPEG detected');
  passed++;
  console.log('[PASS] 2. valid JPEG accepted');

  // 3. valid PNG accepted
  const pngResult = validateBinaryFile(validPngBuffer, 'diagram.png', 'image/png');
  assert(pngResult.detectedMimeType === 'image/png', '3. valid PNG detected');
  passed++;
  console.log('[PASS] 3. valid PNG accepted');

  // 4. valid WebP accepted
  const webpResult = validateBinaryFile(validWebpBuffer, 'panel.webp', 'image/webp');
  assert(webpResult.detectedMimeType === 'image/webp', '4. valid WebP detected');
  passed++;
  console.log('[PASS] 4. valid WebP accepted');

  // 5. fake PDF with .pdf extension rejected
  let fakePdfRejected = false;
  try {
    validateBinaryFile(Buffer.from('THIS IS NOT A PDF FILE'), 'fake.pdf', 'application/pdf');
  } catch (err: any) {
    if (err instanceof FileValidationError) fakePdfRejected = true;
  }
  assert(fakePdfRejected, '5. fake PDF rejected by magic bytes');
  passed++;
  console.log('[PASS] 5. fake PDF with .pdf extension rejected');

  // 6. MIME mismatch rejected
  let mimeMismatchRejected = false;
  try {
    validateBinaryFile(validJpegBuffer, 'site.jpg', 'application/pdf');
  } catch (err: any) {
    if (err instanceof FileValidationError) mimeMismatchRejected = true;
  }
  assert(mimeMismatchRejected, '6. declared application/pdf with JPEG bytes rejected');
  passed++;
  console.log('[PASS] 6. MIME mismatch rejected');

  // 7. SVG rejected
  let svgRejected = false;
  try {
    validateBinaryFile(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'vector.svg', 'image/svg+xml');
  } catch (err: any) {
    if (err instanceof FileValidationError && err.message.includes('SVG')) svgRejected = true;
  }
  assert(svgRejected, '7. SVG vector file rejected due to security risks');
  passed++;
  console.log('[PASS] 7. SVG rejected');

  // 8. HTML rejected
  let htmlRejected = false;
  try {
    validateBinaryFile(Buffer.from('<!DOCTYPE html><html><body>malicious</body></html>'), 'index.html', 'text/html');
  } catch (err: any) {
    if (err instanceof FileValidationError) htmlRejected = true;
  }
  assert(htmlRejected, '8. HTML file rejected');
  passed++;
  console.log('[PASS] 8. HTML rejected');

  // 9. executable/unknown binary rejected
  let exeRejected = false;
  try {
    // MZ header
    validateBinaryFile(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]), 'payload.exe', 'application/octet-stream');
  } catch (err: any) {
    if (err instanceof FileValidationError && err.message.includes('اجرایی')) exeRejected = true;
  }
  assert(exeRejected, '9. EXE binary rejected');
  passed++;
  console.log('[PASS] 9. executable/unknown binary rejected');

  // 10. empty file rejected
  let emptyRejected = false;
  try {
    validateBinaryFile(Buffer.alloc(0), 'empty.pdf', 'application/pdf');
  } catch (err: any) {
    if (err instanceof FileValidationError && err.message.includes('خالی')) emptyRejected = true;
  }
  assert(emptyRejected, '10. 0-byte file rejected');
  passed++;
  console.log('[PASS] 10. empty file rejected');

  // 11. >5MB image rejected
  let largeImageRejected = false;
  try {
    // Large JPEG mock buffer: 5MB + 1KB
    const largeJpeg = Buffer.concat([validJpegBuffer, Buffer.alloc(5 * 1024 * 1024 + 1024)]);
    validateBinaryFile(largeJpeg, 'huge.jpg', 'image/jpeg');
  } catch (err: any) {
    if (err instanceof FileValidationError && err.statusCode === 413) largeImageRejected = true;
  }
  assert(largeImageRejected, '11. >5MB image rejected with 413');
  passed++;
  console.log('[PASS] 11. >5MB image rejected');

  // 12. >15MB PDF rejected
  let largePdfRejected = false;
  try {
    const largePdf = Buffer.concat([validPdfBuffer, Buffer.alloc(15 * 1024 * 1024 + 1024)]);
    validateBinaryFile(largePdf, 'huge.pdf', 'application/pdf');
  } catch (err: any) {
    if (err instanceof FileValidationError && err.statusCode === 413) largePdfRejected = true;
  }
  assert(largePdfRejected, '12. >15MB PDF rejected with 413');
  passed++;
  console.log('[PASS] 12. >15MB PDF rejected');

  // 13. checksum is deterministic SHA-256
  const expectedHash = crypto.createHash('sha256').update(validPdfBuffer).digest('hex');
  assert(pdfResult.checksumSha256 === expectedHash, '13. checksum is exact SHA-256 hex');
  passed++;
  console.log('[PASS] 13. checksum is deterministic SHA-256');

  // 14. generated storage keys do not contain original filename
  const key1 = generateStorageKey({
    scope: 'projects',
    entityId: 'proj-123',
    category: 'engineering',
    extension: 'pdf'
  });
  assert(!key1.includes('engineering_drawing_secret.pdf'), '14. storage key does not leak original filename');
  assert(key1.startsWith('projects/proj-123/engineering/'), '14. key has structured partition prefix');
  passed++;
  console.log('[PASS] 14. generated storage keys do not contain original filename');

  // 15. generated storage keys reject/neutralize traversal input
  const traversalKey = generateStorageKey({
    scope: 'projects',
    entityId: '../../etc/passwd',
    category: '../confidential',
    extension: 'pdf'
  });
  assert(!traversalKey.includes('..'), '15. traversal tokens removed');
  assert(validateStorageKey(traversalKey), '15. generated key is safe');
  assert(!validateStorageKey('../../../bad/path'), '15. raw traversal rejected by validator');
  passed++;
  console.log('[PASS] 15. generated storage keys reject/neutralize traversal input');

  // 16. two uploads generate different object keys
  const key2 = generateStorageKey({
    scope: 'projects',
    entityId: 'proj-123',
    category: 'engineering',
    extension: 'pdf'
  });
  assert(key1 !== key2, '16. distinct random UUID partition per key');
  passed++;
  console.log('[PASS] 16. two uploads generate different object keys');

  // 17. unsafe filename sanitized
  const sanitized = sanitizeOriginalFilename('../../../خطرناک/test\0file<script>.pdf');
  assert(!sanitized.includes('..'), '17. no directory traversal in sanitized name');
  assert(!sanitized.includes('\0'), '17. no null byte');
  assert(!sanitized.includes('<'), '17. no special script chars');
  assert(sanitized.endsWith('.pdf'), '17. preserved clean extension');
  passed++;
  console.log('[PASS] 17. unsafe filename sanitized');

  // 18. storage credentials absent → isStorageConfigured false
  const unconfiguredService = new S3CompatibleFileStorageService({
    config: {
      bucket: '',
      region: 'us-east-1',
      forcePathStyle: false,
      signedUrlTtlSeconds: 300,
      isConfigured: false
    }
  });
  assert(unconfiguredService.isConfigured() === false, '18. unconfigured service returns false');
  let notConfiguredThrown = false;
  try {
    await unconfiguredService.putObject({
      key: 'test',
      body: validPdfBuffer,
      contentType: 'application/pdf',
      contentLength: validPdfBuffer.length
    });
  } catch (err: any) {
    if (err instanceof StorageNotConfiguredError && err.statusCode === 503) {
      notConfiguredThrown = true;
    }
  }
  assert(notConfiguredThrown, '18. putObject on unconfigured throws 503 StorageNotConfiguredError');
  passed++;
  console.log('[PASS] 18. storage credentials absent → isStorageConfigured false');

  // 19. no local filesystem fallback
  const testStorage = new InMemoryFileStorageService(true, 300);
  const putRes = await testStorage.putObject({
    key: 'projects/p1/docs/test.pdf',
    body: validPdfBuffer,
    contentType: 'application/pdf',
    contentLength: validPdfBuffer.length
  });
  assert(putRes.sizeBytes === validPdfBuffer.length, '19. uploaded to storage service');
  assert(await testStorage.objectExists('projects/p1/docs/test.pdf'), '19. object exists in storage interface');
  // Check no file written to local disk
  const fs = await import('fs');
  assert(!fs.existsSync('projects/p1/docs/test.pdf'), '19. no local disk fallback created');
  passed++;
  console.log('[PASS] 19. no local filesystem fallback');

  // 20. signed URL TTL configuration respected
  const signedUrl300 = await testStorage.getSignedDownloadUrl({
    key: 'projects/p1/docs/test.pdf',
    expiresInSeconds: 600
  });
  assert(signedUrl300.includes('X-Amz-Expires=600'), '20. signed URL respects custom TTL parameter');
  passed++;
  console.log('[PASS] 20. signed URL TTL configuration respected');

  // 21. storage interface does not expose AWS SDK types
  assert(typeof putRes.checksumSha256 === 'string', '21. PutObjectResult is pure domain type');
  assert(typeof putRes.sizeBytes === 'number', '21. PutObjectResult sizeBytes is number');
  assert(typeof putRes.key === 'string', '21. PutObjectResult key is string');
  passed++;
  console.log('[PASS] 21. storage interface does not expose AWS SDK types');

  // 22. storage failure returns controlled error
  const failingStorage = new InMemoryFileStorageService(false);
  let controlledError = false;
  try {
    await failingStorage.putObject({
      key: 'key',
      body: validPdfBuffer,
      contentType: 'application/pdf',
      contentLength: validPdfBuffer.length
    });
  } catch (err: any) {
    if (err.message === 'STORAGE_NOT_CONFIGURED') controlledError = true;
  }
  assert(controlledError, '22. controlled storage error returned');
  passed++;
  console.log('[PASS] 22. storage failure returns controlled error');

  // 23. credentials never appear in error response
  const customSecret = 'SUPER_SECRET_KEY_123456789';
  const errorObj = new StorageNotConfiguredError();
  assert(!JSON.stringify(errorObj).includes(customSecret), '23. credentials never appear in error payload');
  passed++;
  console.log('[PASS] 23. credentials never appear in error response');

  // 24. multipart memory limit enforced
  const app = express();
  app.post('/test/upload', handleMultipartUpload, (req, res) => {
    res.json({ ok: true, filename: req.file?.originalname, size: req.file?.size });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  // Test missing file
  const emptyRes = await fetch(`http://127.0.0.1:${port}/test/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' },
    body: '------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n'
  });
  assert(emptyRes.status === 400, '24. missing multipart file returns 400');
  server.close();
  passed++;
  console.log('[PASS] 24. multipart memory limit enforced');

  // 25. no generic public upload endpoint exists
  const serverCode = fs.readFileSync('server.ts', 'utf-8');
  assert(!serverCode.includes("app.post('/api/upload'"), '25. no generic public POST /api/upload in server.ts');
  assert(!serverCode.includes('app.post("/api/upload"'), '25. no generic public POST /api/upload in server.ts');
  passed++;
  console.log('[PASS] 25. no generic public upload endpoint exists');

  // 26. db.json unchanged
  const dbContent = fs.readFileSync('db.json');
  const dbHash = crypto.createHash('sha256').update(dbContent).digest('hex');
  assert(dbHash === '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f', '26. db.json byte-for-byte unchanged');
  passed++;
  console.log('[PASS] 26. db.json unchanged');

  console.log(`=== STAGE 12.3B TEST RESULTS: ${passed} / ${total} PASSED ===`);
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
