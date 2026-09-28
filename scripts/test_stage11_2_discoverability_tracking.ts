import fs from 'fs';
import path from 'path';
import http from 'http';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

// Setup strict test database isolation before loading any modules
const isolation = setupTestDatabaseIsolation('stage11_2_discoverability');

import express, { Request, Response, NextFunction } from 'express';
import { db } from '../src/db/index.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { professionalRepository } from '../src/repositories/professionalRepository.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { jwtService } from '../src/security/jwtService.js';
import { isCaseAssignedToTechnician, resolveTechnicianProfile } from '../src/services/technicianIdentityService.js';

function createToken(payload: { userId: string; role?: string; roles?: string[] }): string {
  return jwtService.sign(payload);
}

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

async function runTests() {
  console.log('========================================================================');
  console.log('HOOSHYAR ENERGY — STAGE 11.2 DISCOVERABILITY & TRACKING REGRESSION TEST');
  console.log('========================================================================');

  // [1] STATIC FILE & DISCOVERABILITY AUDIT
  console.log('\n[1] Testing Discoverability & Navigation Configurations:');

  const landingSrc = fs.readFileSync('src/pages/Landing.tsx', 'utf8');
  assert(landingSrc.includes('تعمیرات و نگهداری هوشمند'), 'Landing page contains exact Persian title «تعمیرات و نگهداری هوشمند»');
  assert(landingSrc.includes('ثبت خرابی تجهیزات، بارگذاری تصویر، عیبیابی هوشمند و ارتباط با تعمیرکار متخصص'), 'Landing page contains required exact description');
  assert(landingSrc.includes('to="/smart-maintenance"'), 'Landing page includes link to /smart-maintenance');

  const desktopHeaderSrc = fs.readFileSync('src/components/navigation/DesktopHeader.tsx', 'utf8');
  assert(desktopHeaderSrc.includes('تعمیرات هوشمند') || desktopHeaderSrc.includes('تعمیرات و نگهداری هوشمند'), 'Desktop header contains Smart Maintenance navigation label');
  assert(desktopHeaderSrc.includes('/smart-maintenance'), 'Desktop header links to /smart-maintenance');

  const mobileNavSrc = fs.readFileSync('src/components/navigation/MobileBottomNav.tsx', 'utf8');
  assert(mobileNavSrc.includes('/smart-maintenance'), 'Mobile navigation includes /smart-maintenance action');
  assert(mobileNavSrc.includes('تعمیرات و نگهداری هوشمند'), 'Mobile action sheet contains exact Persian title');

  const dashboardHeaderSrc = fs.readFileSync('src/components/dashboard/DashboardHeader.tsx', 'utf8');
  assert(dashboardHeaderSrc.includes('/smart-maintenance'), 'Customer/Plant-owner Dashboard header provides Smart Maintenance entry point');

  const customerReqSrc = fs.readFileSync('src/components/maintenance/CustomerMaintenanceRequest.tsx', 'utf8');
  assert(customerReqSrc.includes('UNREGISTERED'), 'Customer maintenance request handles UNREGISTERED standalone equipment');
  assert(customerReqSrc.includes('ورود به حساب کاربری جهت ثبت نهایی') || customerReqSrc.includes('ورود به حساب کاربری'), 'Unauthenticated customer sees Persian login prompt before submission');

  // [2] RUNTIME HTTP ISOLATED SERVER SETUP
  console.log('\n[2] Setting Up Isolated In-Memory Runtime & Server:');

  // Temp DB already set up before import

  const app = express();
  app.use(express.json());
  app.use('/api', maintenanceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // Seed users directly into db
    const customerA = (db as any).createUser({
      phone: '09121111111',
      name: 'کارفرما الف',
      role: 'CUSTOMER',
      roles: ['CUSTOMER'],
      activeSubscriptionId: null
    });

    const customerB = (db as any).createUser({
      phone: '09122222222',
      name: 'کارفرما ب',
      role: 'CUSTOMER',
      roles: ['CUSTOMER'],
      activeSubscriptionId: null
    });

    const technicianDan = (db as any).createUser({
      phone: '09123333333',
      name: 'تکنسین دان',
      role: 'TECHNICIAN',
      roles: ['TECHNICIAN'],
      activeSubscriptionId: null
    });

    const adminSuper = (db as any).createUser({
      phone: '09124444444',
      name: 'مدیر کل سامانه',
      role: 'ADMIN',
      roles: ['ADMIN'],
      activeSubscriptionId: null
    });

    const proDan = professionalRepository.createProfessional({
      userId: technicianDan.id,
      fullName: 'مهندس دان',
      phone: technicianDan.phone,
      specialties: ['اینورتر'],
      serviceCities: ['تهران']
    });
    professionalRepository.updateProfessionalStatus(proDan.id, 'approved');

    const tokenA = createToken({ userId: customerA.id, role: 'CUSTOMER' });
    const tokenB = createToken({ userId: customerB.id, role: 'CUSTOMER' });
    const tokenDan = createToken({ userId: technicianDan.id, role: 'TECHNICIAN' });
    const tokenAdmin = createToken({ userId: adminSuper.id, role: 'ADMIN' });

    // [3] STANDALONE MAINTENANCE REQUEST CREATION (CUSTOMER_DIRECT / UNREGISTERED)
    console.log('\n[3] Testing Standalone Equipment Request (CUSTOMER_DIRECT / UNREGISTERED):');

    const caseA = maintenanceRepository.createCase({
      alertIds: [],
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      caseNumber: 'MC-2026-7788',
      maintenanceCode: 'MC-2026-7788',
      title: 'خرابی اینورتر متصل به شبکه ویلا',
      description: 'دستگاه خطای Grid Fault نمایش می‌دهد',
      priority: 'HIGH',
      status: 'ASSIGNED',
      category: 'CORRECTIVE',
      assignedTechnicianId: proDan.id,
      assignedTechnicianName: proDan.fullName,
      reportedBy: customerA.id
    });

    assert(Boolean(caseA.id), 'Standalone case created successfully');
    assert(caseA.projectId === 'CUSTOMER_DIRECT', 'Case registered with CUSTOMER_DIRECT');
    assert(caseA.assetId === 'UNREGISTERED', 'Case registered with UNREGISTERED asset');
    assert(caseA.caseNumber === 'MC-2026-7788', 'Case has human-readable caseNumber MC-2026-7788');

    // [4] LOOKUP BY INTERNAL CASE ID & HUMAN-READABLE CODES
    console.log('\n[4] Testing Lookup by Internal ID and Human-Readable Code:');

    // 4.1 Lookup by internal UUID by owner customer A
    const resIdA = await fetch(`${baseUrl}/maintenance/${caseA.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(resIdA.status === 200, 'Customer A can lookup case by internal UUID (200 OK)');
    const bodyIdA = await resIdA.json();
    assert(bodyIdA.id === caseA.id, 'Returned case ID matches internal UUID');

    // 4.2 Lookup by human-readable caseNumber / maintenanceCode
    const resCodeA = await fetch(`${baseUrl}/maintenance/MC-2026-7788`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const bodyCodeText = await resCodeA.text();
    let bodyCodeA: any = null;
    try { bodyCodeA = JSON.parse(bodyCodeText); } catch {}
    if (resCodeA.status !== 200) {
      console.log('DEBUG resCodeA status:', resCodeA.status, bodyCodeText);
    }
    assert(resCodeA.status === 200, 'Customer A can lookup case by human-readable tracking code (200 OK)');
        assert(bodyCodeA.id === caseA.id, 'Lookup by tracking code resolves to exact canonical case');
    assert(bodyCodeA.caseNumber === 'MC-2026-7788', 'Case number correctly returned in payload');

    // Case-insensitive lookup test
    const resCodeLower = await fetch(`${baseUrl}/maintenance/mc-2026-7788`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(resCodeLower.status === 200, 'Case-insensitive lookup by tracking code succeeds (200 OK)');

    // [5] ANTI-ENUMERATION & STRICT REJECTION OF UNAUTHORIZED CROSS-CUSTOMER ACCESS
    console.log('\n[5] Testing Strict Security & Anti-Enumeration Protections:');

    // 5.1 Unauthenticated visitor knowing the human-readable tracking code
    const resUnauth = await fetch(`${baseUrl}/maintenance/MC-2026-7788`);
    assert(resUnauth.status === 401, 'Unauthenticated visitor knowing tracking code is REJECTED with 401');

    // 5.2 Customer B (different account) knowing the human-readable tracking code
    const resCrossCode = await fetch(`${baseUrl}/maintenance/MC-2026-7788`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(resCrossCode.status === 403, 'Cross-customer knowing tracking code is REJECTED with 403 Forbidden');

    // 5.3 Customer B trying lookup by UUID
    const resCrossId = await fetch(`${baseUrl}/maintenance/${caseA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(resCrossId.status === 403, 'Cross-customer knowing internal UUID is REJECTED with 403 Forbidden');

    // 5.4 Invalid non-existent tracking code
    const resInvalid = await fetch(`${baseUrl}/maintenance/NON-EXISTENT-CODE-9999`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(resInvalid.status === 404, 'Invalid/non-existent tracking code returns 404 Not Found');

    // [6] ASSIGNED TECHNICIAN & ADMIN WORKFLOWS
    console.log('\n[6] Testing Assigned Technician & Admin Access Compatibility:');

    // 6.1 Assigned technician Dan can access via human-readable code
    const resTechDan = await fetch(`${baseUrl}/maintenance/MC-2026-7788`, {
      headers: { Authorization: `Bearer ${tokenDan}` }
    });
    assert(resTechDan.status === 200, 'Assigned technician Dan can lookup case by tracking code (200 OK)');

    // 6.2 Administrator can access via human-readable code
    const resAdmin = await fetch(`${baseUrl}/maintenance/MC-2026-7788`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert(resAdmin.status === 200, 'Administrator can lookup case by tracking code (200 OK)');

    // [7] STAGE 11.1 TECHNICIAN IDENTITY REGRESSION GUARANTEE
    console.log('\n[7] Verifying Stage 11.1 Technician Identity Resolution Integrity:');

    // Pro Dan resolved strictly via userId
    const resolvedProDan = resolveTechnicianProfile(technicianDan.id);
    assert(resolvedProDan !== null && resolvedProDan.id === proDan.id, 'Technician profile resolved strictly via verified userId');

    // Collision protection
    const fakePro = { id: 'usr-customer-alpha', userId: 'usr-different-guy' };
    (db as any).getProfessionals().push(fakePro);
    const resolvedFake = resolveTechnicianProfile('usr-customer-alpha');
    assert(resolvedFake === null, 'Colliding pro.id === userId is NEVER resolved as user profile');

    const assignedCheck = isCaseAssignedToTechnician(caseA.assignedTechnicianId, technicianDan.id);
    assert(assignedCheck === true, 'Assigned technician identity verified via pro.id');

    const wrongAssignedCheck = isCaseAssignedToTechnician(caseA.assignedTechnicianId, customerB.id);
    assert(wrongAssignedCheck === false, 'Other user cannot be authorized as assigned technician');

  } finally {
    server.close();
    isolation.cleanup();
  }

  console.log('\n========================================================================');
  console.log(`STAGE 11.2 SUITE RESULT: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('========================================================================');
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running Stage 11.2 tests:', err);
  process.exit(1);
});
