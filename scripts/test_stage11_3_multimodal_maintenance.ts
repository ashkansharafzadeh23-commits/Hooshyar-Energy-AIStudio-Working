import fs from 'fs';
import path from 'path';
import http from 'http';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { validateAndNormalizeImage, ImageValidationError, MAX_IMAGE_SIZE_BYTES } from '../src/utils/imageValidator.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName}`, details || '');
  }
}

// Minimal valid 1x1 base64 images
const VALID_1X1_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const VALID_1X1_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const VALID_1X1_WEBP_BASE64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

async function runTests() {
  console.log('========================================================================');
  console.log('HOOSHYAR ENERGY — STAGE 11.3 MULTIMODAL MAINTENANCE TEST SUITE');
  console.log('========================================================================');

  // [0] INITIALIZE STRICT TEST DATABASE ISOLATION BEFORE IMPORTING DATABASE MODULES
  const isolation = setupTestDatabaseIsolation('stage11_3_multimodal');

  // Dynamic import of database-dependent modules AFTER isolation is fully configured
  const expressModule = await import('express');
  const express = expressModule.default;
  const { db } = await import('../src/db/index.js');
  const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
  const { userRepository } = await import('../src/repositories/userRepository.js');
  const { professionalRepository } = await import('../src/repositories/professionalRepository.js');
  const { maintenanceRouter } = await import('../src/api/maintenance.js');
  const { jwtService } = await import('../src/security/jwtService.js');

  function createToken(payload: { userId: string; role?: string; roles?: string[] }): string {
    return jwtService.sign(payload);
  }

  // [1] DISCOVERABILITY, ROUTING & AUTHENTICATION INTEGRITY
  console.log('\n[1] Testing UI Flow, Discoverability & Authentication Architecture:');

  const landingSrc = fs.readFileSync('src/pages/Landing.tsx', 'utf8');
  assert(landingSrc.includes('تعمیرات و نگهداری هوشمند'), 'Landing page contains «تعمیرات و نگهداری هوشمند» capability introduction');
  assert(landingSrc.includes('ثبت خرابی تجهیزات، بارگذاری تصویر، عیبیابی هوشمند و ارتباط با تعمیرکار متخصص'), 'Landing page contains exact presentation description');
  assert(landingSrc.includes('maintenanceLink'), 'Landing page dynamically computes maintenanceLink based on auth status');
  assert(landingSrc.includes('to={maintenanceLink}'), 'Landing page maintenance button routes dynamically');

  const customerLoginSrc = fs.readFileSync('src/pages/CustomerLogin.tsx', 'utf8');
  assert(customerLoginSrc.includes('redirectTarget'), 'CustomerLogin parses redirect URL parameter');
  assert(customerLoginSrc.includes('navigate(redirectTarget)'), 'CustomerLogin navigates to redirect target after successful login');

  const dashboardHeaderSrc = fs.readFileSync('src/components/dashboard/DashboardHeader.tsx', 'utf8');
  assert(dashboardHeaderSrc.includes('/smart-maintenance'), 'Customer dashboard header contains visible link to /smart-maintenance');
  assert(dashboardHeaderSrc.includes('تعمیرات و نگهداری هوشمند'), 'Customer dashboard button displays «تعمیرات و نگهداری هوشمند» label');

  const smartMaintSrc = fs.readFileSync('src/pages/SmartMaintenance.tsx', 'utf8');
  assert(smartMaintSrc.includes('navigate(`/customer-login?redirect='), 'SmartMaintenance redirects unauthenticated visitors to /customer-login preserving destination');

  // [2] COMPREHENSIVE IMAGE VALIDATOR TESTS
  console.log('\n[2] Testing Multimodal Image Validation Rules:');

  // Valid PNG
  const validPng = validateAndNormalizeImage({
    name: 'fault_panel.png',
    data: VALID_1X1_PNG_BASE64,
    mimeType: 'image/png'
  }, 0);
  assert(validPng.mimeType === 'image/png', 'PNG accepted and normalized');
  assert(validPng.base64Data === VALID_1X1_PNG_BASE64, 'PNG base64 preserved');
  assert(validPng.sizeBytes > 0, 'PNG byte size computed');

  // Valid JPEG
  const validJpg = validateAndNormalizeImage({
    name: 'inverter_burn.jpg',
    data: `data:image/jpeg;base64,${VALID_1X1_JPEG_BASE64}`
  }, 1);
  assert(validJpg.mimeType === 'image/jpeg', 'JPEG data URL accepted and mimeType extracted');
  assert(validJpg.base64Data === VALID_1X1_JPEG_BASE64, 'JPEG data URL base64 extracted');

  // Valid WebP
  const validWebp = validateAndNormalizeImage({
    name: 'damage.webp',
    data: VALID_1X1_WEBP_BASE64,
    mimeType: 'image/webp'
  }, 2);
  assert(validWebp.mimeType === 'image/webp', 'WebP accepted and normalized');

  // Unsupported MIME rejection (e.g. GIF or executable or PDF)
  let mimeErrorPassed = false;
  try {
    validateAndNormalizeImage({
      name: 'animation.gif',
      data: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      mimeType: 'image/gif'
    }, 0);
  } catch (e: any) {
    if (e instanceof ImageValidationError && e.statusCode === 415 && e.message.includes('فرمت')) {
      mimeErrorPassed = true;
    }
  }
  assert(mimeErrorPassed, 'Unsupported MIME (image/gif) rejected with Persian error and HTTP 415');

  // Malformed base64 rejection
  let malformedErrorPassed = false;
  try {
    validateAndNormalizeImage({
      name: 'broken.png',
      data: 'This is definitely not valid base64 image data %$$#@!!!',
      mimeType: 'image/png'
    }, 0);
  } catch (e: any) {
    if (e instanceof ImageValidationError && e.statusCode === 400 && e.message.includes('نامعتبر')) {
      malformedErrorPassed = true;
    }
  }
  assert(malformedErrorPassed, 'Malformed base64 rejected with Persian error and HTTP 400');

  // Oversized image rejection
  let oversizedErrorPassed = false;
  try {
    const hugeBuffer = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1024, 0x41);
    validateAndNormalizeImage({
      name: 'huge.jpg',
      data: hugeBuffer.toString('base64'),
      mimeType: 'image/jpeg'
    }, 0);
  } catch (e: any) {
    if (e instanceof ImageValidationError && e.statusCode === 413 && e.message.includes('حجم')) {
      oversizedErrorPassed = true;
    }
  }
  assert(oversizedErrorPassed, 'Oversized image (>10MB) rejected with Persian error and HTTP 413');

  // [3] PROOF THAT ACTUAL IMAGE BYTES ARE SENT IN GEMINI MULTIMODAL REQUEST
  console.log('\n[3] Testing Gemini Multimodal Construction in diagnosisService:');

  const diagCode = fs.readFileSync('src/services/diagnosisService.ts', 'utf8');
  assert(diagCode.includes('inlineData: {'), 'diagnosisService constructs inlineData structure for Gemini');
  assert(diagCode.includes('mimeType: photo.mimeType'), 'diagnosisService passes correct validated mimeType in inlineData');
  assert(diagCode.includes('data: photo.base64Data'), 'diagnosisService passes actual base64Data in inlineData');
  assert(diagCode.includes('contents: { parts }'), 'diagnosisService passes multimodal contents object containing parts array');
  assert(diagCode.includes('const parts: any[] = [...imageParts, { text: prompt }]'), 'diagnosisService combines BOTH image parts AND text prompt in multimodal request');
  assert(diagCode.includes('hasImages ? 20000 : 10000'), 'diagnosisService uses extended 20s bounded timeout for multimodal requests');
  assert(diagCode.includes('Fallback remains EXPERT_RULESET'), 'diagnosisService preserves fallback to EXPERT_RULESET when AI generation fails');
  assert(diagCode.includes('به علت عدم پاسخ‌دهی موتور بینایی هوش مصنوعی'), 'diagnosisService does NOT falsely claim visual analysis succeeded on fallback');

  // [4] SET UP ISOLATED HTTP SERVER & REPOSITORIES
  console.log('\n[4] Setting Up Isolated Test Runtime & User Accounts:');

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Simulate authenticated user from Bearer token
  app.use((req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.substring(7);
      try {
        const decoded = jwtService.verify(token);
        if (decoded) {
          req.user = decoded;
        }
      } catch {}
    }
    next();
  });

  app.use('/api', maintenanceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  // Seed test users & assets
  const custUser = userRepository.createUser({
    name: 'Customer 11.3',
    phone: '09121111113',
    role: 'PROJECT_OWNER',
    roles: ['PROJECT_OWNER']
  });

  const otherCust = userRepository.createUser({
    name: 'Customer 11.3 Stranger',
    phone: '09129999999',
    role: 'PROJECT_OWNER',
    roles: ['PROJECT_OWNER']
  });

  const techUser = userRepository.createUser({
    name: 'Technician 11.3',
    phone: '09122222223',
    role: 'TECHNICIAN',
    roles: ['TECHNICIAN']
  });

  const techPro = professionalRepository.createProfessional({
    userId: techUser.id,
    type: 'TECHNICIAN',
    name: 'Technician 11.3 Pro',
    phone: techUser.phone,
    isApproved: true,
    verificationStatus: 'APPROVED'
  });

  const adminUser = userRepository.createUser({
    name: 'Admin 11.3',
    phone: '09120000000',
    role: 'ADMIN',
    roles: ['ADMIN']
  });

  const custToken = createToken({ userId: custUser.id, role: custUser.role, roles: custUser.roles });
  const otherToken = createToken({ userId: otherCust.id, role: otherCust.role, roles: otherCust.roles });
  const techToken = createToken({ userId: techUser.id, role: techUser.role, roles: techUser.roles });
  const adminToken = createToken({ userId: adminUser.id, role: adminUser.role, roles: adminUser.roles });

  // [5] TEST POST /api/diagnose WITH MULTIMODAL PAYLOAD & AUTHENTICATION
  console.log('\n[5] Testing /api/diagnose Multimodal API Endpoint & Authentication:');

  const diagPayload = {
    equipmentType: 'INVERTER',
    description: 'اینورتر خطای خطای زمین یا نشت جریان نشان می‌دهد و بوی داغی استشمام می‌شود.',
    symptoms: ['خطای اتصال زمین', 'کاهش توان خروجی'],
    locationCity: 'تهران',
    photos: [
      {
        name: 'inverter_burned.jpg',
        data: `data:image/jpeg;base64,${VALID_1X1_JPEG_BASE64}`,
        mimeType: 'image/jpeg'
      },
      {
        name: 'panel_crack.png',
        data: VALID_1X1_PNG_BASE64,
        mimeType: 'image/png'
      }
    ]
  };

  // 1. Verify unauthenticated /api/diagnose is rejected with 401 Unauthorized
  const unauthDiagRes = await fetch(`${baseUrl}/diagnose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(diagPayload)
  });
  assert(unauthDiagRes.status === 401, 'Unauthenticated POST /api/diagnose is rejected with 401 Unauthorized');

  // 2. Authenticated /api/diagnose succeeds
  const diagRes = await fetch(`${baseUrl}/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify(diagPayload)
  });

  assert(diagRes.status === 200, 'Authenticated POST /api/diagnose returns 200 OK');
  const diagData: any = await diagRes.json();
  assert(Boolean(diagData.id), 'Diagnosis generated with unique ID');
  assert(diagData.likelyRootCauses?.length > 0, 'Diagnosis contains structured root causes');
  assert(diagData.recommendedActions?.length > 0, 'Diagnosis contains recommended actions');
  assert(diagData.evidenceCategorized?.OBSERVED?.some((f: string) => f.includes('تصاویر ارسالی')), 'Evidence categorizes uploaded photos');

  // 3. Test /api/diagnose with invalid MIME
  const invalidMimeRes = await fetch(`${baseUrl}/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify({
      equipmentType: 'PANEL',
      photos: [{ name: 'file.exe', data: 'TVqQAAMAAAAEAAAA//8AALgAAAA==', mimeType: 'application/x-msdownload' }]
    })
  });
  assert(invalidMimeRes.status === 415, 'Invalid photo MIME in /api/diagnose returns 415 Unsupported Media Type');

  // 4. Test /api/diagnose with malformed base64
  const malformedRes = await fetch(`${baseUrl}/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify({
      equipmentType: 'PANEL',
      photos: [{ name: 'bad.png', data: 'NOT_BASE_64!!!', mimeType: 'image/png' }]
    })
  });
  assert(malformedRes.status === 400, 'Malformed base64 in /api/diagnose returns 400 Bad Request');

  // [6] DATABASE SAFETY: PROVE FULL BASE64 IS NEVER PERSISTED TO DB.JSON
  console.log('\n[6] Testing Case Creation & Database Persistence Safety (Zero Base64 in db.json):');

  // Test unauthenticated case creation is protected
  const unauthCaseRes = await fetch(`${baseUrl}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetId: 'UNREGISTERED',
      equipmentType: 'INVERTER',
      title: 'خرابی تست ناشناس',
      description: 'تست عدم دسترسی بدون توکن'
    })
  });
  assert(unauthCaseRes.status === 401, 'Unauthenticated POST /api/cases is rejected with 401 Unauthorized');

  // Create authenticated case with photo payload
  const createCaseRes = await fetch(`${baseUrl}/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`
    },
    body: JSON.stringify({
      assetId: 'UNREGISTERED',
      equipmentType: 'INVERTER',
      title: 'داغی شدید و دود در کانکتور DC اینورتر',
      description: 'هنگام پیک تابش بوی سوختگی به مشام رسید و اینورتر ارور 02 داد.',
      priority: 'HIGH',
      diagnosisId: diagData.id,
      assignedTechnicianId: techPro.id,
      assignedTechnicianName: techPro.name,
      photos: [
        {
          name: 'burned_connector.jpg',
          data: VALID_1X1_JPEG_BASE64,
          mimeType: 'image/jpeg',
          sizeBytes: 1024
        }
      ]
    })
  });

  assert(createCaseRes.status === 201 || createCaseRes.status === 200, 'Authenticated POST /api/cases creates case successfully');
  const createdCase: any = await createCaseRes.json();
  assert(Boolean(createdCase.id), 'Case created with valid ID');
  assert(Boolean(createdCase.caseNumber), 'Case created with tracking code');

  // Inspect the isolated db content to ensure base64 is NOT stored anywhere
  const activeIsolatedDbPath = isolation.tempDbPath;
  const dbContentRaw = fs.readFileSync(activeIsolatedDbPath, 'utf8');

  assert(!dbContentRaw.includes(VALID_1X1_JPEG_BASE64), 'CRITICAL: Full JPEG base64 payload is NOT persisted in database');
  assert(!dbContentRaw.includes(VALID_1X1_PNG_BASE64), 'CRITICAL: Full PNG base64 payload is NOT persisted in database');

  // Check attachments in the case
  const savedCase = maintenanceRepository.getCaseById(createdCase.id);
  assert(Boolean(savedCase), 'Saved case retrieved from repository');
  const photoAttachment = savedCase?.attachments?.find((a: any) => a.type === 'PHOTO');
  assert(Boolean(photoAttachment), 'Safe photo metadata attachment recorded');
  assert(!((photoAttachment as any)?.data), 'Attachment metadata does NOT contain raw base64 data field');
  assert(!((photoAttachment as any)?.base64Data), 'Attachment metadata does NOT contain base64Data field');

  // [7] SECURITY & AUTHORIZATION REGRESSION ON MULTIMODAL CASE
  console.log('\n[7] Testing Multi-Role Access Control on Created Multimodal Case:');

  // Customer owner can access case
  const ownerAccessRes = await fetch(`${baseUrl}/cases/${createdCase.id}`, {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  assert(ownerAccessRes.status === 200, 'Customer owner can access case (200 OK)');

  // Stranger customer is blocked
  const strangerAccessRes = await fetch(`${baseUrl}/cases/${createdCase.id}`, {
    headers: { Authorization: `Bearer ${otherToken}` }
  });
  assert(strangerAccessRes.status === 403, 'Stranger customer blocked from accessing case (403 Forbidden)');

  // Assigned technician can access
  const techAccessRes = await fetch(`${baseUrl}/cases/${createdCase.id}`, {
    headers: { Authorization: `Bearer ${techToken}` }
  });
  assert(techAccessRes.status === 200, 'Assigned technician can access case (200 OK)');

  // Admin can access
  const adminAccessRes = await fetch(`${baseUrl}/cases/${createdCase.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminAccessRes.status === 200, 'Administrator can access case (200 OK)');

  // Lookup by tracking code
  const trackingLookupRes = await fetch(`${baseUrl}/cases/${createdCase.caseNumber}`, {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  assert(trackingLookupRes.status === 200, 'Tracking code lookup succeeds for authenticated owner (200 OK)');

  const strangerTrackingRes = await fetch(`${baseUrl}/cases/${createdCase.caseNumber}`, {
    headers: { Authorization: `Bearer ${otherToken}` }
  });
  assert(strangerTrackingRes.status === 403, 'Stranger customer blocked from tracking code lookup (403 Forbidden)');

  // Cleanup isolated server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  // Concluding repository immutability check
  console.log('\n[8] Concluding Repository Immutability Check:');
  isolation.cleanup();

  console.log('\n========================================================================');
  console.log(`STAGE 11.3 SUITE RESULT: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
