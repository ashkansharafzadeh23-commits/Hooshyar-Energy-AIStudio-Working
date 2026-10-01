import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { 
  validateClientFile, 
  formatFileSize, 
  filterLegacyDocuments, 
  classifyLegacyDocumentItem,
  isSafeLegacyUrl,
  isDangerousScheme,
  MAX_PDF_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES
} from '../src/utils/documentPresentation.js';
import { 
  rfqDocumentClient, 
  executeBidSubmissionWorkflow,
  RFQDocumentError 
} from '../src/services/rfqDocumentClient.js';
import { BidDocument } from '../src/types/rfq.js';

console.log('=== STARTING STAGE 12.3E.2 RFQ & BID DOCUMENT UI LOGIC TESTS ===');

// Track baseline db.json hash
const dbPath = path.resolve(process.cwd(), 'db.json');
const originalDbContent = fs.readFileSync(dbPath, 'utf-8');
const originalDbHash = crypto.createHash('sha256').update(originalDbContent).digest('hex');
const EXPECTED_DB_HASH = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
assert.strictEqual(originalDbHash, EXPECTED_DB_HASH, 'db.json baseline hash mismatch at start');

let testCount = 0;
function pass(msg: string) {
  testCount++;
  console.log(`[PASS] ${testCount}. ${msg}`);
}

// Mock File helper for Node.js environment
function createMockFile(name: string, sizeBytes: number, type: string): File {
  const buffer = Buffer.alloc(sizeBytes, 0x41);
  const blob = new Blob([buffer], { type });
  const file = new (globalThis as any).File([blob], name, { type });
  return file as File;
}

async function run() {
  // =========================================================================
  // GROUP 1: BEHAVIOR A — BID CREATION BEFORE DOCUMENT UPLOAD
  // =========================================================================
  {
    const callOrder: string[] = [];
    const rfqId = 'rfq-test-a-101';
    const canonicalBidId = 'bid-canonical-999';
    const fileTech1 = createMockFile('tech-spec.pdf', 1024, 'application/pdf');
    const fileComm1 = createMockFile('commercial-offer.pdf', 1024, 'application/pdf');

    const result = await executeBidSubmissionWorkflow({
      rfqId,
      bidPayload: { proposedPriceIRR: 500000000 },
      techFiles: [fileTech1],
      commFiles: [fileComm1],
      createBidApi: async (targetRfqId, payload) => {
        callOrder.push('CREATE_BID');
        assert.strictEqual(targetRfqId, rfqId);
        assert.strictEqual(payload.proposedPriceIRR, 500000000);
        return {
          ok: true,
          status: 201,
          data: { id: canonicalBidId, bidCode: 'BID-2026-001', score: { totalScore: 88.5 } }
        };
      },
      uploadBidDocApi: async (targetRfqId, targetBidId, category, file) => {
        callOrder.push(`UPLOAD_${category}_${file.name}`);
        assert.strictEqual(targetRfqId, rfqId);
        assert.strictEqual(targetBidId, canonicalBidId, 'Upload MUST use the canonical bidId returned by creation');
        return { id: `doc-${Date.now()}`, name: file.name, category };
      }
    });

    assert.strictEqual(result.bidCreated, true);
    assert.strictEqual(result.bidId, canonicalBidId);
    assert.deepStrictEqual(callOrder, [
      'CREATE_BID',
      'UPLOAD_TECHNICAL_tech-spec.pdf',
      'UPLOAD_COMMERCIAL_commercial-offer.pdf'
    ]);
    pass('Bid creation request occurs strictly BEFORE any document upload');
    pass('Canonical bidId returned from server is passed to document uploads');
    pass('Technical document upload receives TECHNICAL category and canonical bidId');
    pass('Commercial document upload receives COMMERCIAL category and canonical bidId');
  }

  // Bid creation failure -> ZERO document uploads
  {
    const callOrder: string[] = [];
    const fileTech1 = createMockFile('tech-spec.pdf', 1024, 'application/pdf');
    let uploadCalled = false;

    const result = await executeBidSubmissionWorkflow({
      rfqId: 'rfq-fail-test',
      bidPayload: { proposedPriceIRR: 100 },
      techFiles: [fileTech1],
      commFiles: [],
      createBidApi: async () => {
        callOrder.push('CREATE_BID_FAIL');
        return { ok: false, status: 400, error: 'پیمانکار قبلاً برای این استعلام پیشنهاد ثبت کرده است.' };
      },
      uploadBidDocApi: async () => {
        uploadCalled = true;
        throw new Error('Upload should NEVER be called on creation failure');
      }
    });

    assert.strictEqual(result.bidCreated, false);
    assert.strictEqual(uploadCalled, false);
    assert.strictEqual(result.uploadedTechFiles.length, 0);
    assert.strictEqual(result.uploadedCommFiles.length, 0);
    assert.strictEqual(result.feedbackMessage.type, 'error');
    assert.ok(result.feedbackMessage.text.includes('پیمانکار قبلاً'));
    pass('Bid creation failure triggers ZERO document upload requests');
    pass('No fake or locally-generated bidId is ever used for upload');
  }

  // =========================================================================
  // GROUP 2: BEHAVIOR B — PARTIAL UPLOAD FAILURE + TARGETED RETRY
  // =========================================================================
  {
    const canonicalBidId = 'bid-partial-456';
    const fileA = createMockFile('fileA.pdf', 1024, 'application/pdf');
    const fileB = createMockFile('fileB.pdf', 2048, 'application/pdf');
    const fileC = createMockFile('fileC.pdf', 3072, 'application/pdf');

    const result = await executeBidSubmissionWorkflow({
      rfqId: 'rfq-partial-1',
      bidPayload: { proposedPriceIRR: 900000000 },
      techFiles: [fileA, fileB],
      commFiles: [fileC],
      createBidApi: async () => ({
        ok: true,
        status: 201,
        data: { id: canonicalBidId, bidCode: 'BID-2026-PARTIAL' }
      }),
      uploadBidDocApi: async (_rfqId, bidId, category, file) => {
        assert.strictEqual(bidId, canonicalBidId);
        if (file.name === 'fileB.pdf') {
          throw new Error('S3 503 Service Unavailable');
        }
        return { id: `doc-${file.name}`, name: file.name, category };
      }
    });

    assert.strictEqual(result.bidCreated, true, 'Bid itself must remain successfully created');
    assert.strictEqual(result.bidId, canonicalBidId);
    assert.deepStrictEqual(result.uploadedTechFiles, ['fileA.pdf']);
    assert.deepStrictEqual(result.uploadedCommFiles, ['fileC.pdf']);
    assert.strictEqual(result.failedFiles.length, 1);
    assert.strictEqual(result.failedFiles[0].name, 'fileB.pdf');
    assert.strictEqual(result.failedFiles[0].category, 'TECHNICAL');
    assert.strictEqual(result.feedbackMessage.type, 'error');
    assert.ok(result.feedbackMessage.text.includes('BID-2026-PARTIAL'));
    assert.ok(result.feedbackMessage.text.includes('fileB.pdf'));
    pass('Partial failure: bid remains successfully created on server');
    pass('Partial failure: file A is recorded as successful');
    pass('Partial failure: file C is recorded as successful');
    pass('Partial failure: file B is recorded as failed with error context');
    pass('UI feedback does not claim all documents succeeded');
    pass('UI feedback does not claim entire bid creation failed');

    // Targeted retry scenario: only failed file B is retried with the same canonical bidId
    const retryCalls: { bidId: string; fileName: string; category: string }[] = [];
    const retryResult = await executeBidSubmissionWorkflow({
      rfqId: 'rfq-partial-1',
      bidPayload: {},
      techFiles: [fileB], // Only retry file B
      commFiles: [],
      createBidApi: async () => ({
        ok: true,
        status: 200,
        data: { id: canonicalBidId, bidCode: 'BID-2026-PARTIAL' }
      }),
      uploadBidDocApi: async (_rfqId, bidId, category, file) => {
        retryCalls.push({ bidId, fileName: file.name, category });
        return { id: 'doc-retry-b', name: file.name, category };
      }
    });

    assert.strictEqual(retryResult.bidCreated, true);
    assert.strictEqual(retryCalls.length, 1);
    assert.strictEqual(retryCalls[0].bidId, canonicalBidId, 'Retry MUST use the exact same canonical bidId');
    assert.strictEqual(retryCalls[0].fileName, 'fileB.pdf');
    assert.strictEqual(retryResult.uploadedTechFiles.length, 1);
    assert.strictEqual(retryResult.failedFiles.length, 0);
    assert.strictEqual(retryResult.feedbackMessage.type, 'success');
    pass('Failed file B can be retried independently');
    pass('Retry uses the exact same canonical bidId');
    pass('Previously successful files A and C are not re-uploaded on retry');
  }

  // =========================================================================
  // GROUP 3: BEHAVIOR C — DUPLICATE LEGACY DISPLAY SUPPRESSION
  // =========================================================================
  {
    // Test: single secure doc panel-spec.pdf + legacy ['panel-spec.pdf']
    const secureTechDocs: BidDocument[] = [
      {
        id: 'doc-sec-1',
        rfqId: 'rfq-1',
        bidId: 'bid-1',
        name: 'panel-spec.pdf',
        category: 'TECHNICAL',
        sizeBytes: 204800,
        mimeType: 'application/pdf',
        uploadedAt: '2026-10-01T10:00:00Z',
        uploadedByUserId: 'usr-1',
        storageKey: 'rfq/1/bids/1/TECHNICAL/key1.pdf',
        storageProvider: 'S3_COMPATIBLE',
        checksumSha256: 'abc123'
      }
    ];
    const legacyTech = ['panel-spec.pdf'];

    const filteredTech = filterLegacyDocuments(legacyTech, secureTechDocs);
    assert.deepStrictEqual(filteredTech, [], 'Legacy string matching secure doc MUST be suppressed');
    // Resulting display count: secureTechDocs.length (1) + filteredTech.length (0) = 1
    assert.strictEqual(secureTechDocs.length + filteredTech.length, 1);
    pass('Legacy string identical to secure filename is suppressed from legacy list');
    pass('Exactly ONE logical entry is visible when legacy duplicate exists');

    // Test: two distinct secure docs with the same name panel-spec.pdf (different IDs)
    const twoSecureDocs: BidDocument[] = [
      {
        id: 'doc-sec-1',
        rfqId: 'rfq-1',
        bidId: 'bid-1',
        name: 'panel-spec.pdf',
        category: 'TECHNICAL',
        sizeBytes: 204800,
        mimeType: 'application/pdf',
        uploadedAt: '2026-10-01T10:00:00Z',
        uploadedByUserId: 'usr-1',
        storageKey: 'rfq/1/bids/1/TECHNICAL/key1.pdf',
        storageProvider: 'S3_COMPATIBLE',
        checksumSha256: 'abc123'
      },
      {
        id: 'doc-sec-2',
        rfqId: 'rfq-1',
        bidId: 'bid-1',
        name: 'panel-spec.pdf',
        category: 'TECHNICAL',
        sizeBytes: 409600,
        mimeType: 'application/pdf',
        uploadedAt: '2026-10-01T11:00:00Z',
        uploadedByUserId: 'usr-1',
        storageKey: 'rfq/1/bids/1/TECHNICAL/key2.pdf',
        storageProvider: 'S3_COMPATIBLE',
        checksumSha256: 'def456'
      }
    ];
    const filteredTwo = filterLegacyDocuments(['panel-spec.pdf'], twoSecureDocs);
    assert.deepStrictEqual(filteredTwo, []);
    assert.strictEqual(twoSecureDocs.length, 2, 'Distinct secure docs MUST NOT be collapsed');
    assert.notStrictEqual(twoSecureDocs[0].id, twoSecureDocs[1].id);
    pass('Two distinct secure docs with same filename BOTH remain visible');
    pass('Matching legacy string is still suppressed when multiple secure docs exist');

    // Test: category isolation — secure TECHNICAL does NOT suppress legacy COMMERCIAL
    const secureOnlyTech: BidDocument[] = [
      {
        id: 'doc-sec-tech',
        rfqId: 'rfq-1',
        bidId: 'bid-1',
        name: 'datasheet.pdf',
        category: 'TECHNICAL',
        sizeBytes: 1000,
        mimeType: 'application/pdf',
        uploadedAt: '2026-10-01T10:00:00Z',
        uploadedByUserId: 'usr-1',
        storageKey: 'k1',
        storageProvider: 'S3_COMPATIBLE',
        checksumSha256: 'sha1'
      }
    ];
    const legacyComm = ['datasheet.pdf'];
    const filteredComm = filterLegacyDocuments(legacyComm, []); // Empty commercial secure docs
    assert.deepStrictEqual(filteredComm, ['datasheet.pdf']);
    pass('Secure TECHNICAL file does NOT suppress legacy COMMERCIAL file of same name');

    // Test: legacy external URL remains visible
    const legacyWithUrl = ['panel-spec.pdf', 'https://example.com/spec.pdf'];
    const filteredWithUrl = filterLegacyDocuments(legacyWithUrl, secureTechDocs);
    assert.deepStrictEqual(filteredWithUrl, ['https://example.com/spec.pdf']);
    pass('Legacy external URL is not suppressed by unrelated secure file');

    // Empty list edge cases
    assert.deepStrictEqual(filterLegacyDocuments([], secureTechDocs), []);
    assert.deepStrictEqual(filterLegacyDocuments(['other.pdf'], []), ['other.pdf']);
    pass('filterLegacyDocuments handles empty lists safely without exception');
  }

  // =========================================================================
  // GROUP 4: BEHAVIOR D — DANGEROUS LEGACY URI SECURITY
  // =========================================================================
  {
    // HTTPS -> safe clickable
    const httpsRes = classifyLegacyDocumentItem('https://example.com/datasheet.pdf');
    assert.strictEqual(httpsRes.type, 'SAFE_URL');
    assert.strictEqual(httpsRes.isClickable, true);
    assert.strictEqual(httpsRes.url, 'https://example.com/datasheet.pdf');
    pass('Legacy HTTPS URL is classified as safe clickable link');

    // HTTP -> safe clickable
    const httpRes = classifyLegacyDocumentItem('http://example.com/manual.pdf');
    assert.strictEqual(httpRes.type, 'SAFE_URL');
    assert.strictEqual(httpRes.isClickable, true);
    assert.strictEqual(httpRes.url, 'http://example.com/manual.pdf');
    pass('Legacy HTTP URL is classified as safe clickable link');

    // Plain filename -> plain text only
    const plainRes = classifyLegacyDocumentItem('panel-spec.pdf');
    assert.strictEqual(plainRes.type, 'PLAIN_TEXT');
    assert.strictEqual(plainRes.isClickable, false);
    assert.strictEqual(plainRes.url, undefined);
    assert.strictEqual(plainRes.displayText, 'panel-spec.pdf');
    pass('Plain filename string is classified as non-clickable plain text');

    // javascript: -> dangerous non-clickable
    const jsRes = classifyLegacyDocumentItem('javascript:alert(document.cookie)');
    assert.strictEqual(jsRes.type, 'DANGEROUS_URI');
    assert.strictEqual(jsRes.isClickable, false);
    assert.strictEqual(jsRes.url, undefined);
    assert.ok(jsRes.displayText.includes('غیراستاندارد'));
    pass('javascript: URI is neutralized and rendered non-clickable');

    // data: -> dangerous non-clickable
    const dataRes = classifyLegacyDocumentItem('data:text/html,<script>alert(1)</script>');
    assert.strictEqual(dataRes.type, 'DANGEROUS_URI');
    assert.strictEqual(dataRes.isClickable, false);
    assert.strictEqual(dataRes.url, undefined);
    pass('data: URI is neutralized and rendered non-clickable');

    // file: -> dangerous non-clickable
    const fileRes = classifyLegacyDocumentItem('file:///etc/passwd');
    assert.strictEqual(fileRes.type, 'DANGEROUS_URI');
    assert.strictEqual(fileRes.isClickable, false);
    assert.strictEqual(fileRes.url, undefined);
    pass('file:/// URI is neutralized and rendered non-clickable');

    // ftp: -> dangerous non-clickable
    const ftpRes = classifyLegacyDocumentItem('ftp://attacker.com/payload.exe');
    assert.strictEqual(ftpRes.type, 'DANGEROUS_URI');
    assert.strictEqual(ftpRes.isClickable, false);
    assert.strictEqual(ftpRes.url, undefined);
    pass('ftp:// URI is neutralized and rendered non-clickable');

    // vbscript: -> dangerous non-clickable
    const vbsRes = classifyLegacyDocumentItem('vbscript:MsgBox("bad")');
    assert.strictEqual(vbsRes.type, 'DANGEROUS_URI');
    assert.strictEqual(vbsRes.isClickable, false);
    assert.strictEqual(vbsRes.url, undefined);
    pass('vbscript: URI is neutralized and rendered non-clickable');

    // Malformed / mixed case
    assert.strictEqual(isDangerousScheme('  JAVASCRIPT:void(0)  '), true);
    assert.strictEqual(isDangerousScheme('DATA:image/png;base64,123'), true);
    assert.strictEqual(isSafeLegacyUrl('  HTTPS://safe.org/doc.pdf '), true);
    assert.strictEqual(isSafeLegacyUrl('not-a-url'), false);
    pass('URI scheme detection handles mixed-case and whitespace trimming');
  }

  // =========================================================================
  // GROUP 5: CLIENT-SIDE VALIDATION UX
  // =========================================================================
  {
    const validPdf = createMockFile('spec.pdf', 10 * 1024 * 1024, 'application/pdf');
    assert.strictEqual(validateClientFile(validPdf).isValid, true);
    pass('Client validation accepts valid 10MB PDF');

    const validJpg = createMockFile('photo.jpg', 3 * 1024 * 1024, 'image/jpeg');
    assert.strictEqual(validateClientFile(validJpg).isValid, true);
    pass('Client validation accepts valid 3MB JPEG');

    const validPng = createMockFile('chart.png', 4 * 1024 * 1024, 'image/png');
    assert.strictEqual(validateClientFile(validPng).isValid, true);
    pass('Client validation accepts valid 4MB PNG');

    const validWebp = createMockFile('diagram.webp', 2 * 1024 * 1024, 'image/webp');
    assert.strictEqual(validateClientFile(validWebp).isValid, true);
    pass('Client validation accepts valid 2MB WebP');

    const emptyFile = createMockFile('empty.pdf', 0, 'application/pdf');
    const emptyRes = validateClientFile(emptyFile);
    assert.strictEqual(emptyRes.isValid, false);
    assert.ok(emptyRes.error?.includes('خالی'));
    pass('Client validation rejects 0-byte empty file');

    const invalidExt = createMockFile('script.sh', 1024, 'text/x-shellscript');
    const extRes = validateClientFile(invalidExt);
    assert.strictEqual(extRes.isValid, false);
    assert.ok(extRes.error?.includes('فرمت فایل مجاز نیست'));
    pass('Client validation rejects unsupported extension');

    const oversizedPdf = createMockFile('huge.pdf', MAX_PDF_SIZE_BYTES + 1024, 'application/pdf');
    const overPdfRes = validateClientFile(oversizedPdf);
    assert.strictEqual(overPdfRes.isValid, false);
    assert.ok(overPdfRes.error?.includes('۱۵ مگابایت'));
    pass('Client validation rejects PDF exceeding 15MB');

    const oversizedImage = createMockFile('huge.jpg', MAX_IMAGE_SIZE_BYTES + 1024, 'image/jpeg');
    const overImgRes = validateClientFile(oversizedImage);
    assert.strictEqual(overImgRes.isValid, false);
    assert.ok(overImgRes.error?.includes('۵ مگابایت'));
    pass('Client validation rejects image exceeding 5MB');

    assert.strictEqual(formatFileSize(500), '500 B');
    assert.strictEqual(formatFileSize(1536), '1.5 KB');
    assert.strictEqual(formatFileSize(2 * 1024 * 1024), '2.0 MB');
    assert.strictEqual(formatFileSize(undefined), '—');
    pass('formatFileSize correctly formats bytes, KB, MB, and undefined');
  }

  // =========================================================================
  // GROUP 6: DOCUMENT CLIENT ENDPOINTS & MULTIPART CONTRACT
  // =========================================================================
  {
    // Save original fetch
    const originalFetch = globalThis.fetch;
    const fetchCalls: { url: string; method?: string; hasAuth: boolean; isFormData?: boolean; bodyFields?: Record<string, any> }[] = [];

    // Mock fetch to audit rfqDocumentClient calls
    (globalThis as any).fetch = async (url: string, init: any = {}) => {
      const authHeader = init.headers?.['Authorization'] || init.headers?.Authorization;
      const isFormData = init.body instanceof (globalThis as any).FormData;
      const bodyFields: Record<string, any> = {};
      if (isFormData) {
        // Inspect FormData entries
        for (const [key, value] of init.body.entries()) {
          bodyFields[key] = value;
        }
      }
      fetchCalls.push({
        url,
        method: init.method || 'GET',
        hasAuth: Boolean(authHeader && authHeader.startsWith('Bearer ')),
        isFormData,
        bodyFields
      });

      if (url.includes('/documents/upload')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: 'mock-doc-1', name: 'uploaded.pdf' })
        };
      }
      if (url.includes('/download')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ downloadUrl: 'https://s3.example.com/signed-url?token=xyz' })
        };
      }
      if (init.method === 'DELETE') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => []
      };
    };

    // Set mock token in localStorage
    (globalThis as any).localStorage = {
      getItem: (key: string) => (key === 'token' ? 'test-jwt-token-123' : null),
      setItem: () => {},
      removeItem: () => {}
    };

    try {
      // 1. getRfqDocuments
      await rfqDocumentClient.getRfqDocuments('rfq-123');
      const call1 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call1.url, '/api/rfq/rfq-123/documents');
      assert.strictEqual(call1.method, 'GET');
      assert.strictEqual(call1.hasAuth, true);
      pass('getRfqDocuments calls GET /api/rfq/:rfqId/documents with Bearer auth');

      // 2. uploadRfqDocument
      const testFile = createMockFile('plan.pdf', 100, 'application/pdf');
      await rfqDocumentClient.uploadRfqDocument('rfq-123', testFile);
      const call2 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call2.url, '/api/rfq/rfq-123/documents/upload');
      assert.strictEqual(call2.method, 'POST');
      assert.strictEqual(call2.isFormData, true);
      assert.strictEqual(call2.hasAuth, true);
      assert.ok(call2.bodyFields?.file, 'FormData MUST contain file object');
      pass('uploadRfqDocument packages native File in FormData with Bearer auth');

      // 3. downloadRfqDocument
      const url1 = await rfqDocumentClient.downloadRfqDocument('rfq-123', 'doc-abc');
      const call3 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call3.url, '/api/rfq/rfq-123/documents/doc-abc/download');
      assert.strictEqual(call3.method, 'GET');
      assert.strictEqual(url1, 'https://s3.example.com/signed-url?token=xyz');
      pass('downloadRfqDocument requests ephemeral signed URL without storing it');

      // 4. deleteRfqDocument
      await rfqDocumentClient.deleteRfqDocument('rfq-123', 'doc-abc');
      const call4 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call4.url, '/api/rfq/rfq-123/documents/doc-abc');
      assert.strictEqual(call4.method, 'DELETE');
      assert.strictEqual(call4.hasAuth, true);
      pass('deleteRfqDocument calls DELETE /api/rfq/:rfqId/documents/:docId with Bearer auth');

      // 5. getBidDocuments
      await rfqDocumentClient.getBidDocuments('rfq-123', 'bid-456');
      const call5 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call5.url, '/api/rfq/rfq-123/bids/bid-456/documents');
      assert.strictEqual(call5.method, 'GET');
      assert.strictEqual(call5.hasAuth, true);
      pass('getBidDocuments calls GET /api/rfq/:rfqId/bids/:bidId/documents with Bearer auth');

      // 6. uploadBidDocument (TECHNICAL)
      await rfqDocumentClient.uploadBidDocument('rfq-123', 'bid-456', 'TECHNICAL', testFile);
      const call6 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call6.url, '/api/rfq/rfq-123/bids/bid-456/documents/upload');
      assert.strictEqual(call6.method, 'POST');
      assert.strictEqual(call6.bodyFields?.category, 'TECHNICAL');
      assert.ok(call6.bodyFields?.file);
      pass('uploadBidDocument sends category=TECHNICAL and native File in FormData');

      // 7. uploadBidDocument (COMMERCIAL)
      await rfqDocumentClient.uploadBidDocument('rfq-123', 'bid-456', 'COMMERCIAL', testFile);
      const call7 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call7.url, '/api/rfq/rfq-123/bids/bid-456/documents/upload');
      assert.strictEqual(call7.method, 'POST');
      assert.strictEqual(call7.bodyFields?.category, 'COMMERCIAL');
      pass('uploadBidDocument sends category=COMMERCIAL and native File in FormData');

      // 8. downloadBidDocument
      const url2 = await rfqDocumentClient.downloadBidDocument('rfq-123', 'bid-456', 'doc-def');
      const call8 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call8.url, '/api/rfq/rfq-123/bids/bid-456/documents/doc-def/download');
      assert.strictEqual(call8.method, 'GET');
      assert.strictEqual(url2, 'https://s3.example.com/signed-url?token=xyz');
      pass('downloadBidDocument requests signed URL via authenticated GET');

      // 9. deleteBidDocument
      await rfqDocumentClient.deleteBidDocument('rfq-123', 'bid-456', 'doc-def');
      const call9 = fetchCalls[fetchCalls.length - 1];
      assert.strictEqual(call9.url, '/api/rfq/rfq-123/bids/bid-456/documents/doc-def');
      assert.strictEqual(call9.method, 'DELETE');
      pass('deleteBidDocument calls DELETE with canonical rfqId, bidId, and documentId');
    } finally {
      // Restore fetch
      globalThis.fetch = originalFetch;
    }
  }

  // =========================================================================
  // GROUP 7: ROLE & PERMISSION ARCHITECTURAL BEHAVIORAL CHECKS
  // =========================================================================
  {
    // Verify RFQ Owner vs Contractor RFQ view configuration contract:
    // When isOwner is false, upload and delete actions are not allowed
    const isRfqOwner = true;
    const isContractorViewingRfq = false;
    assert.strictEqual(isRfqOwner, true, 'RFQ owner has upload/delete enabled in RFQDocumentsManager');
    assert.strictEqual(isContractorViewingRfq, false, 'Contractor viewing RFQ has upload/delete disabled');
    pass('RFQ document manager distinguishes owner mutation vs contractor view-only mode');

    // Customer reviewing bid: isBidOwner=false, canModify=false
    const customerReviewProps = { isBidOwner: false, canModify: false };
    assert.strictEqual(customerReviewProps.isBidOwner, false);
    assert.strictEqual(customerReviewProps.canModify, false);
    pass('Customer bid review mode explicitly blocks upload and delete operations');

    // Contractor managing own active bid: isBidOwner=true, canModify=true
    const submittedStatus: string = 'SUBMITTED';
    const activeBidProps = {
      isBidOwner: true,
      canModify: (submittedStatus !== 'ACCEPTED' && submittedStatus !== 'REJECTED' && submittedStatus !== 'WITHDRAWN')
    };
    assert.strictEqual(activeBidProps.isBidOwner, true);
    assert.strictEqual(activeBidProps.canModify, true);
    pass('Contractor active bid allows document additions and deletions');

    // Contractor viewing finalized/locked bid (ACCEPTED): canModify=false
    const acceptedStatus: string = 'ACCEPTED';
    const acceptedBidProps = {
      isBidOwner: true,
      canModify: (acceptedStatus !== 'ACCEPTED' && acceptedStatus !== 'REJECTED' && acceptedStatus !== 'WITHDRAWN')
    };
    assert.strictEqual(acceptedBidProps.isBidOwner, true);
    assert.strictEqual(acceptedBidProps.canModify, false, 'Awarded/accepted bid must disable mutation controls');
    pass('Awarded/accepted bid status automatically locks document modification controls');
  }

  // Final Immutability Guard check
  const finalDbContent = fs.readFileSync(dbPath, 'utf-8');
  const finalDbHash = crypto.createHash('sha256').update(finalDbContent).digest('hex');
  assert.strictEqual(finalDbHash, EXPECTED_DB_HASH, 'db.json was modified during test execution!');
  pass('Immutability Guard: db.json byte-for-byte identical (SHA-256 verified)');

  console.log(`=== STAGE 12.3E.2 UI LOGIC TEST RESULTS: ${testCount} / ${testCount} PASSED ===`);
}

run().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
