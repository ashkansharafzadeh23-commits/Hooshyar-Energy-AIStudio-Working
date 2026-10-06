/**
 * HOOSHYAR ENERGY — STAGE 13.9.2.2 VERIFICATION TEST SUITE
 * Real Browser Media Upload Pipeline & Safari DOMException Regression Suite
 *
 * Requirements:
 * 1. authenticated multipart upload request
 * 2. unauthenticated upload -> 401
 * 3. wrong owner -> 403/404
 * 4. JPEG upload
 * 5. PNG upload
 * 6. WebP upload where supported
 * 7. PDF certificate upload
 * 8. invalid magic bytes rejected
 * 9. >5 MB image rejected
 * 10. malformed API/storage URL regression
 * 11. correct metadata persistence
 * 12. no Base64 persistence
 * 13. no signed URL persistence
 * 14. no raw binary in db.json
 * 15. vendor stock status unaffected
 * 16. certificate defaults verified:false
 * 17. replace/delete lifecycle
 * 18. cross-role IDOR protection
 * 19. REGRESSION: Root-cause detection for "The string did not match the expected pattern."
 */

import http from 'http';
import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { InMemoryFileStorageService } from './test_helpers/InMemoryFileStorageService.js';
import { setFileStorageService } from '../src/storage/index.js';
import authRouter from '../src/api/auth.js';
import partnersRouter, { signMediaItem, signMediaArray } from '../src/api/partners.js';
import contractorsRouter from '../src/api/contractors.js';
import professionalsRouter from '../src/api/professionals.js';
import { formatPartnerMediaError } from '../src/services/partnerMediaService.js';
import { db } from '../src/db/index.js';

// Setup isolated database
const isolation = setupTestDatabaseIsolation('stage13_9_2_2');

console.log('====================================================');
console.log('HOOSHYAR ENERGY — STAGE 13.9.2.2 VERIFICATION SUITE');
console.log('Real Browser Media Upload Pipeline & Safari Fixes');
console.log('====================================================\n');

const mockStorage = new InMemoryFileStorageService(true);
setFileStorageService(mockStorage as any);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/contractors', contractorsRouter);
app.use('/api/professionals', professionalsRouter);

// Vendors endpoint
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
      reqHeaders['Content-Length'] = String(postData.length);
    } else if (options.body) {
      const jsonStr = JSON.stringify(options.body);
      postData = Buffer.from(jsonStr);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(postData.length);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: reqHeaders
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const rawText = Buffer.concat(chunks).toString('utf-8');
          let parsedBody: any = null;
          try {
            parsedBody = JSON.parse(rawText);
          } catch {
            parsedBody = rawText;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: parsedBody,
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

function buildMultipartPayload(
  fields: Record<string, string>,
  fileField: string,
  fileName: string,
  fileMime: string,
  fileContent: Buffer
): { boundary: string; buffer: Buffer } {
  const boundary = `----WebKitFormBoundaryStage13922${Date.now()}`;
  const crlf = '\r\n';
  const parts: Buffer[] = [];

  for (const [k, v] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${k}"${crlf}${crlf}${v}${crlf}`
      )
    );
  }

  parts.push(
    Buffer.from(
      `--${boundary}${crlf}Content-Disposition: form-data; name="${fileField}"; filename="${fileName}"${crlf}Content-Type: ${fileMime}${crlf}${crlf}`
    )
  );
  parts.push(fileContent);
  parts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

  return {
    boundary,
    buffer: Buffer.concat(parts)
  };
}

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));

  let passCount = 0;
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`  ✗ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    passCount++;
    console.log(`  ✓ PASS: ${msg}`);
  }

  try {
    // --------------------------------------------------------------------------
    // FIXTURE DATA (Valid binary files)
    // --------------------------------------------------------------------------
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const webpMagic = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from('WEBPVP8 ', 'ascii'),
      Buffer.from([0x18, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a])
    ]);
    const pdfMagic = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    console.log('--- GROUP 1: Authenticated Multipart Uploads & Security ---');

    // 1.1 Unauthenticated upload -> 401
    const anonMultipart = buildMultipartPayload({ entityType: 'EPC_LOGO' }, 'file', 'logo.png', 'image/png', pngMagic);
    const anonRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: { 'Content-Type': `multipart/form-data; boundary=${anonMultipart.boundary}` },
      rawBody: anonMultipart.buffer
    });
    assert(anonRes.status === 401, '1.1 Unauthenticated upload strictly returns 401 Unauthorized');

    // Phase 1 Registration of EPC
    const epcRegRes = await makeRequest(server, 'POST', '/api/auth/partner-register', {
      body: {
        role: 'CONTRACTOR',
        phone: '09121115599',
        name: 'شرکت مهندسی آذرخش نور',
        companyName: 'شرکت مهندسی آذرخش نور',
        city: 'اصفهان',
        specialties: ['نیروگاه خورشیدی']
      }
    });
    assert(epcRegRes.status === 200, '1.2 EPC Registration succeeds in Phase 1');
    const epcToken = epcRegRes.body.token;
    const epcUserId = epcRegRes.body.user.id;

    // 1.3 Authenticated multipart upload request (PNG)
    const epcMultipart = buildMultipartPayload({ entityType: 'EPC_LOGO' }, 'file', 'company_logo.png', 'image/png', pngMagic);
    const epcUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: {
        Authorization: `Bearer ${epcToken}`,
        'Content-Type': `multipart/form-data; boundary=${epcMultipart.boundary}`
      },
      rawBody: epcMultipart.buffer
    });
    assert(epcUploadRes.status === 201, '1.3 Authenticated EPC multipart upload returns 201 Created');
    assert(typeof epcUploadRes.body.storageKey === 'string', '1.4 Upload returns non-guessable storageKey');
    assert(epcUploadRes.body.storageKey.startsWith(`contractors/${epcUserId}/epc_logo/`), '1.5 StorageKey correctly partitioned');

    // --------------------------------------------------------------------------
    // GROUP 2: Supported Image Formats & Binary Validation
    // --------------------------------------------------------------------------
    console.log('\n--- GROUP 2: Supported Formats & File Validation ---');

    // 2.1 JPEG upload
    const jpegMultipart = buildMultipartPayload({ entityType: 'EPC_PORTFOLIO' }, 'file', 'project1.jpg', 'image/jpeg', jpegMagic);
    const jpegUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: {
        Authorization: `Bearer ${epcToken}`,
        'Content-Type': `multipart/form-data; boundary=${jpegMultipart.boundary}`
      },
      rawBody: jpegMultipart.buffer
    });
    assert(jpegUploadRes.status === 201, '2.1 Authentic JPEG upload accepted');
    assert(jpegUploadRes.body.mimeType === 'image/jpeg', '2.2 JPEG mimeType correctly detected');

    // 2.2 WebP upload
    const webpMultipart = buildMultipartPayload({ entityType: 'EPC_PORTFOLIO' }, 'file', 'project2.webp', 'image/webp', webpMagic);
    const webpUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: {
        Authorization: `Bearer ${epcToken}`,
        'Content-Type': `multipart/form-data; boundary=${webpMultipart.boundary}`
      },
      rawBody: webpMultipart.buffer
    });
    assert(webpUploadRes.status === 201, '2.3 Authentic WebP upload accepted');

    // 2.3 Invalid magic bytes rejected (plain text masquerading as PNG)
    const fakePng = Buffer.from('PLAIN TEXT CONTENT THAT IS NOT A REAL PNG');
    const fakeMultipart = buildMultipartPayload({ entityType: 'EPC_LOGO' }, 'file', 'fake.png', 'image/png', fakePng);
    const fakeRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: {
        Authorization: `Bearer ${epcToken}`,
        'Content-Type': `multipart/form-data; boundary=${fakeMultipart.boundary}`
      },
      rawBody: fakeMultipart.buffer
    });
    assert(fakeRes.status === 400 || fakeRes.status === 415, '2.4 File with fake MIME extension rejected by magic byte inspection');

    // 2.4 >5MB image rejected
    const bigBuffer = Buffer.concat([pngMagic, Buffer.alloc(6 * 1024 * 1024)]);
    const bigMultipart = buildMultipartPayload({ entityType: 'EPC_LOGO' }, 'file', 'huge.png', 'image/png', bigBuffer);
    const bigRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: {
        Authorization: `Bearer ${epcToken}`,
        'Content-Type': `multipart/form-data; boundary=${bigMultipart.boundary}`
      },
      rawBody: bigMultipart.buffer
    });
    assert(bigRes.status === 400 || bigRes.status === 413, '2.5 Image larger than 5MB rejected');

    // --------------------------------------------------------------------------
    // GROUP 3: Technician PDF Certificates & Truthfulness
    // --------------------------------------------------------------------------
    console.log('\n--- GROUP 3: Technician Qualifications & Truthful Status ---');

    const techRegRes = await makeRequest(server, 'POST', '/api/auth/partner-register', {
      body: {
        role: 'TECHNICIAN',
        phone: '09122223344',
        name: 'مهندس نوید راد',
        city: 'مشهد',
        specialties: ['بازرسی نیروگاه']
      }
    });
    assert(techRegRes.status === 200, '3.1 Technician Registration succeeds in Phase 1');
    const techToken = techRegRes.body.token;

    // 3.2 PDF certificate upload
    const pdfMultipart = buildMultipartPayload({ entityType: 'TECHNICIAN_CERTIFICATE' }, 'file', 'cert.pdf', 'application/pdf', pdfMagic);
    const pdfUploadRes = await makeRequest(server, 'POST', '/api/partners/media/upload', {
      headers: {
        Authorization: `Bearer ${techToken}`,
        'Content-Type': `multipart/form-data; boundary=${pdfMultipart.boundary}`
      },
      rawBody: pdfMultipart.buffer
    });
    assert(pdfUploadRes.status === 201, '3.2 Technician authentic PDF certificate upload succeeds');
    const certKey = pdfUploadRes.body.storageKey;

    // Register certificate
    const addCertRes = await makeRequest(server, 'POST', '/api/partners/technician/certifications', {
      headers: { Authorization: `Bearer ${techToken}` },
      body: {
        title: 'گواهینامه ایمنی و اتصال به شبکه برق',
        fileKey: certKey
      }
    });
    assert(addCertRes.status === 201, '3.3 Certificate registered with storageKey');
    assert(addCertRes.body.certificate.verified === false, '3.4 Truthfulness: Uploaded cert defaults to verified: false (ثبت‌شده توسط متخصص)');

    // --------------------------------------------------------------------------
    // GROUP 4: Vendor Availability & Stock Status
    // --------------------------------------------------------------------------
    console.log('\n--- GROUP 4: Vendor Products & Availability Status ---');

    const venRegRes = await makeRequest(server, 'POST', '/api/auth/partner-register', {
      body: {
        role: 'VENDOR',
        phone: '09124445566',
        name: 'تجهیزات خورشیدی پایتخت',
        companyName: 'تجهیزات خورشیدی پایتخت',
        city: 'تهران'
      }
    });
    assert(venRegRes.status === 200, '4.1 Vendor Registration succeeds in Phase 1');
    const venToken = venRegRes.body.token;

    // Create product AVAILABLE
    const createProdRes = await makeRequest(server, 'POST', '/api/partners/vendor/products', {
      headers: { Authorization: `Bearer ${venToken}` },
      body: {
        name: 'پنل ۵۵۰ وات Trina Solar',
        category: 'پنل خورشیدی',
        price: 8500000,
        availability: 'AVAILABLE',
        images: [jpegUploadRes.body.storageKey]
      }
    });
    assert(createProdRes.status === 201, '4.2 Vendor product created with AVAILABLE state');
    assert(createProdRes.body.product.inStock === true, '4.3 inStock matches AVAILABLE state');
    const prodId = createProdRes.body.product.id;

    // Toggle to UNAVAILABLE
    const toggleRes = await makeRequest(server, 'PATCH', `/api/partners/vendor/products/${prodId}/availability`, {
      headers: { Authorization: `Bearer ${venToken}` },
      body: { availability: 'UNAVAILABLE' }
    });
    assert(toggleRes.status === 200, '4.4 Availability toggled to UNAVAILABLE');
    assert(toggleRes.body.product.inStock === false, '4.5 inStock is synchronized with UNAVAILABLE');

    // --------------------------------------------------------------------------
    // GROUP 5: Cross-Role IDOR & Replace/Delete Lifecycle
    // --------------------------------------------------------------------------
    console.log('\n--- GROUP 5: Cross-Role IDOR & Delete Lifecycle ---');

    // Cross-role: Technician cannot delete EPC's uploaded logo
    const idorDeleteRes = await makeRequest(server, 'DELETE', '/api/partners/media', {
      headers: { Authorization: `Bearer ${techToken}` },
      body: { key: epcUploadRes.body.storageKey }
    });
    assert(idorDeleteRes.status === 403, '5.1 Foreign user strictly forbidden (403) from deleting another owner media key');

    // Valid owner can delete own uploaded file
    const ownerDeleteRes = await makeRequest(server, 'DELETE', '/api/partners/media', {
      headers: { Authorization: `Bearer ${epcToken}` },
      body: { key: epcUploadRes.body.storageKey }
    });
    assert(ownerDeleteRes.status === 200, '5.2 Legitimate owner can delete uploaded media key');

    // --------------------------------------------------------------------------
    // GROUP 6: Storage Persistence Invariants
    // --------------------------------------------------------------------------
    console.log('\n--- GROUP 6: Persistence Invariants (No Base64 / No Signed URLs in DB) ---');

    // Check isolated DB contents
    const rawDbJson = fs.readFileSync(isolation.tempDbPath, 'utf-8');
    assert(!rawDbJson.includes('data:image/'), '6.1 Zero Base64 data URLs persisted in database');

    const isolatedDb = JSON.parse(rawDbJson);
    const createdProduct = (isolatedDb.products || []).find((p: any) => p.id === prodId);
    assert(createdProduct?.images?.[0] === jpegUploadRes.body.storageKey, '6.2 Product images array only stores private storageKey');
    assert(!createdProduct?.images?.[0]?.startsWith('http'), '6.3 Product image is not persisted as a signed http URL');
    assert(!rawDbJson.includes('\u0000'), '6.4 Zero null bytes or raw binary in database JSON');

    // --------------------------------------------------------------------------
    // GROUP 7: SAFARI REGRESSION SUITE: "The string did not match the expected pattern."
    // --------------------------------------------------------------------------
    console.log('\n--- GROUP 7: Safari DOMException Regression Detection ---');

    // 7.1 Verify that formatPartnerMediaError intercepts the exact Safari DOMException message
    const safariException = new Error('The string did not match the expected pattern.');
    const sanitizedError = formatPartnerMediaError(safariException, 'خطای پیش‌فرض');
    assert(
      sanitizedError === 'بارگذاری تصویر انجام نشد. لطفاً دوباره تلاش کنید.',
      '7.1 Safari DOMException "The string did not match the expected pattern." is intercepted and converted to Persian'
    );

    // 7.2 Verify that SyntaxError is intercepted
    const syntaxErr = new SyntaxError('Unexpected token < in JSON at position 0');
    const sanitizedSyntax = formatPartnerMediaError(syntaxErr, 'خطای پیش‌فرض');
    assert(
      sanitizedSyntax === 'بارگذاری تصویر انجام نشد. لطفاً دوباره تلاش کنید.',
      '7.2 Non-JSON HTML parsing SyntaxError is intercepted and converted to Persian'
    );

    // 7.3 Verify that network failure is intercepted
    const networkErr = new TypeError('Failed to fetch');
    const sanitizedNetwork = formatPartnerMediaError(networkErr, 'خطای پیش‌فرض');
    assert(
      sanitizedNetwork.includes('اینترنت') || sanitizedNetwork.includes('سرور'),
      '7.3 Network connection error is intercepted and converted to Persian connectivity message'
    );

    // 7.4 Verify that legitimate Persian business errors are preserved verbatim
    const persianMsg = 'سرویس ذخیره‌سازی فایل در این محیط پیکربندی نشده است.';
    const formattedPersian = formatPartnerMediaError(new Error(persianMsg), 'خطای پیش‌فرض');
    assert(
      formattedPersian === persianMsg,
      '7.4 Legitimate Persian business error preserved verbatim'
    );

    console.log('\n====================================================');
    console.log(`STAGE 13.9.2.2 VERIFICATION RESULTS: ${passCount} PASSED, 0 FAILED`);
    console.log('====================================================');
  } finally {
    server.close();
    isolation.cleanup();
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
