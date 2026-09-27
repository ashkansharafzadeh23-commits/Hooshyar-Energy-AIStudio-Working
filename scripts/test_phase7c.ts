/**
 * HOOSHYAR ENERGY — PHASE 7-C FINAL ACCEPTANCE & SECURITY AUDIT TEST SUITE
 * 
 * Comprehensive audit verifying:
 * 1. Isolated temporary database (os.tmpdir) ensuring production db.json is untouched
 * 2. API-Level Authentication & Authorization (401, 403, 404)
 * 3. Monitoring & Telemetry IDOR Protection (prevent cross-project ingestion & query)
 * 4. Alert & Maintenance Case IDOR Protection & Identity Tampering Prevention
 * 5. Technician Authorization, Profile Approval & Matching
 * 6. Alert Deduplication & Occurrence Tracking (firstObservedAt, lastObservedAt)
 * 7. Diagnosis Safety (FACT, INFERENCE, RECOMMENDATION separation; INSUFFICIENT_DATA fallback)
 * 8. Warranty Validation (Strict dates, no auto claim approval, no invented coverage)
 * 9. Maintenance Cost Integrity (Deterministic summation, no invented costs)
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';

import { db } from '../src/db/index.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { monitoringRepository } from '../src/repositories/monitoringRepository.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { monitoringService } from '../src/services/monitoringService.js';
import { alertService } from '../src/services/alertService.js';
import { diagnosisService } from '../src/services/diagnosisService.js';
import { maintenanceCaseService } from '../src/services/maintenanceCaseService.js';
import { technicianMatchingService } from '../src/services/technicianMatchingService.js';
import monitoringRouter from '../src/api/monitoring.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import authRouter, { verifyAuthToken } from '../src/api/auth.js';
import { jwtService } from '../src/security/jwtService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('HOOSHYAR ENERGY — PHASE 7-C AUDIT & SECURITY TEST SUITE (ISOLATED)');
  console.log('================================================================');

  // Step 1: Isolate Database Storage
  const originalDbPath = db.getDBPath();
  const originalDbContent = fs.readFileSync(originalDbPath, 'utf8');
  const tempDbPath = path.join(os.tmpdir(), `hooshyar_phase7c_audit_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);

  console.log(`[ISOLATION] Setting isolated temporary DB: ${tempDbPath}`);
  db.setDBPath(tempDbPath);
  assert(db.getDBPath() === tempDbPath, 'Database redirected to temporary isolated file');

  // Step 2: Spin up Ephemeral HTTP Express Server for API Verification
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api', monitoringRouter);
  app.use('/api', maintenanceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[HTTP TEST SERVER] Running on ${baseUrl}`);

  try {
    // Helper to generate JWT tokens
    const generateToken = (userId: string) => jwtService.sign({ userId });

    // Seed Test Entities
    console.log('\n--- 1. SEEDING TEST USERS & PROJECTS ---');
    const adminUser = db.createUser({
      name: 'مدیر کل سیستم',
      email: 'admin@hooshyar.energy',
      role: 'ADMIN',
      phone: '09120000001'
    });

    const ownerA = db.createUser({
      name: 'کارفرما الف (نیروگاه یزد)',
      email: 'ownerA@hooshyar.energy',
      role: 'PROJECT_OWNER',
      phone: '09120000002'
    });

    const ownerB = db.createUser({
      name: 'کارفرما ب (نیروگاه فارس)',
      email: 'ownerB@hooshyar.energy',
      role: 'PROJECT_OWNER',
      phone: '09120000003'
    });

    const techUser1 = db.createUser({
      name: 'مهندس حسینی (تکنسین اینورتر)',
      email: 'tech1@hooshyar.energy',
      role: 'EXPERT',
      phone: '09120000004'
    });

    const techUser2 = db.createUser({
      name: 'مهندس رضایی (تکنسین بدون تایید)',
      email: 'tech2@hooshyar.energy',
      role: 'EXPERT',
      phone: '09120000005'
    });

    // Seed approved technician profile
    const techProfile1 = maintenanceRepository.createTechnicianProfile({
      userId: techUser1.id,
      name: techUser1.name,
      phone: techUser1.phone,
      email: techUser1.email,
      skills: ['SOLAR_PV', 'INVERTER', 'ELECTRICAL_MV'],
      certifications: [
        { title: 'گواهینامه تخصصی اینورترهای متصل به شبکه SMA', issuer: 'SMA Solar Academy', issueDate: '2023-01-01', expiryDate: '2027-01-01', verificationStatus: 'VERIFIED' }
      ],
      serviceLocations: ['یزد', 'کرمان', 'اصفهان'],
      activeCasesCount: 0,
      rating: 4.9,
      isAvailable: true,
      approvalStatus: 'APPROVED'
    });

    // Seed unapproved technician profile
    const techProfile2 = maintenanceRepository.createTechnicianProfile({
      userId: techUser2.id,
      name: techUser2.name,
      phone: techUser2.phone,
      email: techUser2.email,
      skills: ['CIVIL'],
      certifications: [],
      serviceLocations: ['تهران'],
      activeCasesCount: 0,
      rating: 3.5,
      isAvailable: true,
      approvalStatus: 'PENDING'
    });

    const adminToken = generateToken(adminUser.id);
    const ownerAToken = generateToken(ownerA.id);
    const ownerBToken = generateToken(ownerB.id);
    const tech1Token = generateToken(techUser1.id);
    const tech2Token = generateToken(techUser2.id);

    // Projects
    const projectA = db.createProject({
      name: 'نیروگاه خورشیدی ۱۰ مگاوات یزد',
      type: 'SOLAR',
      capacityKw: 10000,
      userId: ownerA.id,
      status: 'OPERATIONAL',
      province: 'یزد',
      city: 'یزد'
    });

    const projectB = db.createProject({
      name: 'نیروگاه خورشیدی ۵ مگاوات شیراز',
      type: 'SOLAR',
      capacityKw: 5000,
      userId: ownerB.id,
      status: 'OPERATIONAL',
      province: 'فارس',
      city: 'شیراز'
    });

    // Assets
    const assetA = assetRepository.createAsset({
      projectId: projectA.id,
      name: 'بخش فتوولتائیک فاز ۱ یزد',
      assetType: 'SOLAR_PV',
      installedCapacityKw: 5000,
      operationalStatus: 'OPERATIONAL',
      gridConnectionStatus: 'CONNECTED'
    });

    const assetB = assetRepository.createAsset({
      projectId: projectB.id,
      name: 'بخش فتوولتائیک فاز ۱ شیراز',
      assetType: 'SOLAR_PV',
      installedCapacityKw: 5000,
      operationalStatus: 'OPERATIONAL',
      gridConnectionStatus: 'CONNECTED'
    });

    // Telemetry Sources
    const sourceA = monitoringRepository.createTelemetrySource({
      projectId: projectA.id,
      assetId: assetA.id,
      name: 'اینورتر مرکزی ۱ یزد',
      sourceType: 'INVERTER',
      protocol: 'MODBUS_TCP',
      status: 'ACTIVE'
    });

    const sourceB = monitoringRepository.createTelemetrySource({
      projectId: projectB.id,
      assetId: assetB.id,
      name: 'اینورتر مرکزی ۱ شیراز',
      sourceType: 'INVERTER',
      protocol: 'MODBUS_TCP',
      status: 'ACTIVE'
    });

    // Baseline for Asset A
    assetRepository.createAssetPerformanceBaseline({
      assetId: assetA.id,
      monthlyExpectedKwh: { '09': 750000 },
      expectedDailyAverageKwh: 25000,
      expectedPrPercent: 82,
      dataSource: 'PVsyst Simulation Report v7.2'
    });

    // Warranties for Asset A (Active) and Asset B (Expired)
    const validWarrantyA = assetRepository.createEquipmentWarranty({
      assetId: assetA.id,
      projectId: projectA.id,
      equipmentType: 'INVERTER',
      warrantyType: 'MANUFACTURER',
      provider: 'SMA Solar Technology AG',
      startDate: '2024-01-01',
      endDate: '2029-01-01',
      status: 'ACTIVE',
      coverageSummary: 'پوشش کامل ۵ ساله تعویض برد و قطعات قدرت اینورتر',
      claimProcedure: 'ثبت درخواست گارانتی در پورتال SMA و تحویل کارت حافظه لاگ'
    });

    const expiredWarrantyB = assetRepository.createEquipmentWarranty({
      assetId: assetB.id,
      projectId: projectB.id,
      equipmentType: 'INVERTER',
      warrantyType: 'MANUFACTURER',
      provider: 'Sungrow Power',
      startDate: '2018-01-01',
      endDate: '2022-01-01',
      status: 'EXPIRED',
      coverageSummary: 'گارانتی اولیه ۲ ساله منقضی شده',
      claimProcedure: 'پایان دوره تعهدات'
    });

    assert(Boolean(projectA && projectB), 'Seeded projects A and B with distinct owners');
    assert(Boolean(assetA && assetB), 'Seeded assets A and B');
    assert(Boolean(sourceA && sourceB), 'Seeded telemetry sources A and B');
    assert(Boolean(validWarrantyA && expiredWarrantyB), 'Seeded active warranty for A and expired for B');

    // ==========================================
    // 2. API-LEVEL AUTHENTICATION TESTS (401)
    // ==========================================
    console.log('\n--- 2. API-LEVEL AUTHENTICATION TESTS (401) ---');

    // 2.1 Missing Token -> 401
    const resNoToken = await fetch(`${baseUrl}/api/assets/${assetA.id}/telemetry`);
    assert(resNoToken.status === 401, 'Unauthenticated request without token receives 401 Unauthorized');

    // 2.2 Invalid Token -> 401
    const resInvalidToken = await fetch(`${baseUrl}/api/assets/${assetA.id}/telemetry`, {
      headers: { Authorization: 'Bearer totally_invalid_token_xyz' }
    });
    assert(resInvalidToken.status === 401, 'Request with forged/malformed token receives 401 Unauthorized');

    // 2.3 Unauthenticated POST to ingest -> 401
    const resNoTokenPost = await fetch(`${baseUrl}/api/assets/${assetA.id}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metricType: 'POWER_KW', value: 120 })
    });
    assert(resNoTokenPost.status === 401, 'Unauthenticated telemetry ingestion receives 401');

    // ==========================================
    // 3. MONITORING & TELEMETRY IDOR TESTS (403 & 404)
    // ==========================================
    console.log('\n--- 3. MONITORING & TELEMETRY IDOR TESTS (403 & 404) ---');

    // 3.1 Non-existent Asset -> 404
    const res404Asset = await fetch(`${baseUrl}/api/assets/non-existent-asset-uuid/telemetry`, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(res404Asset.status === 404, 'Querying non-existent asset receives 404 Not Found');

    // 3.2 Cross-Tenant Query: Owner B querying Asset A -> 403
    const resCrossTenantQuery = await fetch(`${baseUrl}/api/assets/${assetA.id}/telemetry`, {
      headers: { Authorization: `Bearer ${ownerBToken}` }
    });
    assert(resCrossTenantQuery.status === 403, 'Cross-project telemetry query by Owner B rejected with 403 Forbidden');

    // 3.3 Cross-Tenant Ingestion: Owner B posting telemetry to Asset A -> 403
    const resCrossTenantIngest = await fetch(`${baseUrl}/api/assets/${assetA.id}/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`
      },
      body: JSON.stringify({
        sourceId: sourceA.id,
        metricType: 'ACTIVE_POWER_KW',
        value: 450,
        unit: 'kW',
        timestamp: new Date().toISOString()
      })
    });
    assert(resCrossTenantIngest.status === 403, 'Cross-project telemetry ingestion by Owner B rejected with 403 Forbidden');

    // 3.4 Valid Authorized Ingestion by Owner A -> 201
    const resValidIngest = await fetch(`${baseUrl}/api/assets/${assetA.id}/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`
      },
      body: JSON.stringify({
        sourceId: sourceA.id,
        metricType: 'ACTIVE_POWER_KW',
        value: 450,
        unit: 'kW',
        timestamp: new Date().toISOString()
      })
    });
    assert(resValidIngest.status === 201, 'Authorized telemetry ingestion by Owner A succeeds with 201 Created');

    // 3.5 Telemetry Source Ingestion Tampering: Ingest reading with source belonging to Project B on Asset A
    const resTamperedSource = await fetch(`${baseUrl}/api/assets/${assetA.id}/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`
      },
      body: JSON.stringify({
        sourceId: sourceB.id, // Mismatched source
        metricType: 'ACTIVE_POWER_KW',
        value: 450,
        unit: 'kW',
        timestamp: new Date().toISOString()
      })
    });
    assert(resTamperedSource.status === 400, 'Ingesting reading with foreign sourceId rejected with 400');

    // 3.6 Telemetry Source Registration: Strictly derives projectId from stored asset
    const resRegisterSource = await fetch(`${baseUrl}/api/assets/${assetA.id}/telemetry-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`
      },
      body: JSON.stringify({
        name: 'دیتالاگر هواشناسی یزد',
        sourceType: 'WEATHER_STATION',
        projectId: projectB.id // Attempt to hijack project ownership!
      })
    });
    assert(resRegisterSource.status === 201, 'Telemetry source registered with 201');
    const createdSource = await resRegisterSource.json();
    assert(createdSource.projectId === projectA.id, 'Source projectId strictly derives from Asset, ignoring spoofed projectId');

    // 3.7 Telemetry Source Update: Mutation of assetId/projectId in PATCH is ignored
    const resPatchSource = await fetch(`${baseUrl}/api/telemetry-sources/${createdSource.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`
      },
      body: JSON.stringify({
        name: 'دیتالاگر هواشناسی یزد (ویرایش)',
        projectId: projectB.id, // Spoofed
        assetId: assetB.id       // Spoofed
      })
    });
    assert(resPatchSource.status === 200, 'Telemetry source PATCH succeeded with 200');
    const patchedSource = monitoringRepository.getSourceById(createdSource.id);
    assert(patchedSource?.name === 'دیتالاگر هواشناسی یزد (ویرایش)', 'Source name updated');
    assert(patchedSource?.projectId === projectA.id, 'Source projectId parent identity preserved');
    assert(patchedSource?.assetId === assetA.id, 'Source assetId parent identity preserved');

    // ==========================================
    // 4. ALERT & DIAGNOSIS IDOR TESTS
    // ==========================================
    console.log('\n--- 4. ALERT & DIAGNOSIS IDOR TESTS ---');

    // Create a test alert on Asset A
    const alertA = maintenanceRepository.createAlert({
      projectId: projectA.id,
      assetId: assetA.id,
      title: 'خطای اضافه ولتاژ اینورتر شماره ۱',
      description: 'ولتاژ ورودی DC به ۶۵۰ ولت رسیده است.',
      severity: 'HIGH',
      status: 'TRIGGERED',
      metricType: 'V_DC',
      metricValue: 650,
      thresholdValue: 600,
      firstObservedAt: new Date().toISOString(),
      lastObservedAt: new Date().toISOString()
    });

    // 4.1 Cross-Tenant Alert Acknowledge: Owner B attempting to acknowledge Alert A -> 403
    const resCrossAck = await fetch(`${baseUrl}/api/alerts/${alertA.id}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerBToken}` }
    });
    assert(resCrossAck.status === 403, 'Cross-tenant alert acknowledge rejected with 403 Forbidden');

    // 4.2 Cross-Tenant Alert Resolve: Owner B attempting to resolve Alert A -> 403
    const resCrossResolve = await fetch(`${baseUrl}/api/alerts/${alertA.id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`
      },
      body: JSON.stringify({ resolutionNote: 'رفع هشدار بدون مجوز' })
    });
    assert(resCrossResolve.status === 403, 'Cross-tenant alert resolve rejected with 403 Forbidden');

    // 4.3 Authorized Alert Update & Identity Tamper Protection (PATCH /api/alerts/:id)
    const resPatchAlert = await fetch(`${baseUrl}/api/alerts/${alertA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`
      },
      body: JSON.stringify({
        title: 'خطای اضافه ولتاژ اینورتر شماره ۱ (بررسی شد)',
        projectId: projectB.id, // Attacker trying to reassign alert to project B
        assetId: assetB.id,     // Attacker trying to reassign alert to asset B
        alertCode: 'HACKED-CODE'
      })
    });
    assert(resPatchAlert.status === 200, 'Alert PATCH succeeded with 200');
    const storedAlertA = maintenanceRepository.getAlertById(alertA.id);
    assert(storedAlertA?.title === 'خطای اضافه ولتاژ اینورتر شماره ۱ (بررسی شد)', 'Alert title safely updated');
    assert(storedAlertA?.projectId === projectA.id, 'Alert projectId tampering strictly prevented');
    assert(storedAlertA?.assetId === assetA.id, 'Alert assetId tampering strictly prevented');
    assert(storedAlertA?.alertCode === alertA.alertCode, 'Alert code tampering strictly prevented');

    // 4.4 Diagnosis Generation: Owner B cannot trigger diagnosis on Alert A -> 403
    const resCrossDiag = await fetch(`${baseUrl}/api/alerts/${alertA.id}/diagnose`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerBToken}` }
    });
    assert(resCrossDiag.status === 403, 'Cross-tenant alert diagnosis rejected with 403 Forbidden');

    // ==========================================
    // 5. MAINTENANCE CASE LIFECYCLE & IDOR TESTS
    // ==========================================
    console.log('\n--- 5. MAINTENANCE CASE LIFECYCLE & IDOR TESTS ---');

    // 5.1 Case Creation: Cross-Tenant creation rejected (Owner B on Asset A) -> 403
    const resCrossCreateCase = await fetch(`${baseUrl}/api/assets/${assetA.id}/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`
      },
      body: JSON.stringify({
        title: 'تیکت غیرمجاز',
        description: 'تلاش برای ایجاد پرونده در پروژه رقیب'
      })
    });
    assert(resCrossCreateCase.status === 403, 'Cross-tenant maintenance case creation rejected with 403 Forbidden');

    // 5.2 Case Creation: Owner A creates case with spoofed projectId in body
    const resValidCreateCase = await fetch(`${baseUrl}/api/assets/${assetA.id}/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`
      },
      body: JSON.stringify({
        title: 'تعمیر اینورتر فاز ۱ یزد',
        description: 'رفع عیب اضافه ولتاژ و تعویض فیوز',
        priority: 'HIGH',
        category: 'CORRECTIVE',
        projectId: projectB.id, // Spoofed!
        alertIds: [alertA.id]
      })
    });
    assert(resValidCreateCase.status === 201, 'Maintenance case created with 201 Created');
    const createdCase = await resValidCreateCase.json();
    assert(createdCase.projectId === projectA.id, 'Case projectId strictly derived from Asset record, ignoring body spoofing');
    assert(createdCase.status === 'OPEN', 'Initial case status is OPEN');

    // 5.3 Case Query: Owner B cannot retrieve Case A -> 403
    const resCrossGetCase = await fetch(`${baseUrl}/api/maintenance/${createdCase.id}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` }
    });
    assert(resCrossGetCase.status === 403, 'Cross-tenant maintenance case query rejected with 403 Forbidden');

    // 5.4 Case Update (PATCH): Ignores tampering with projectId or assetId
    const resPatchCase = await fetch(`${baseUrl}/api/maintenance/${createdCase.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`
      },
      body: JSON.stringify({
        priority: 'CRITICAL',
        projectId: projectB.id,
        assetId: assetB.id
      })
    });
    assert(resPatchCase.status === 200, 'Case PATCH succeeded with 200');
    const storedCase = maintenanceRepository.getCaseById(createdCase.id);
    assert(storedCase?.priority === 'CRITICAL', 'Case priority updated');
    assert(storedCase?.projectId === projectA.id, 'Case projectId preserved against tampering');
    assert(storedCase?.assetId === assetA.id, 'Case assetId preserved against tampering');

    // ==========================================
    // 6. TECHNICIAN AUTHORIZATION & MATCHING TESTS
    // ==========================================
    console.log('\n--- 6. TECHNICIAN AUTHORIZATION & MATCHING TESTS ---');

    // 6.1 Technician Profile Approval: Non-admin cannot approve technician -> 403
    const resTechApproveForbidden = await fetch(`${baseUrl}/api/maintenance/technicians/${techProfile2.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(resTechApproveForbidden.status === 403, 'Non-admin cannot approve technician profile (403)');

    // 6.2 Admin approves technician profile -> 200
    const resTechApproveAdmin = await fetch(`${baseUrl}/api/maintenance/technicians/${techProfile2.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(resTechApproveAdmin.status === 200, 'Admin successfully approves technician profile (200)');

    // 6.3 Smart Technician Matching
    const matches = technicianMatchingService.matchTechnicians({
      skillsRequired: ['INVERTER'],
      location: 'یزد',
      province: 'یزد',
      equipmentType: 'INVERTER'
    });
    assert(matches.length > 0, 'Matching returns certified candidates');
    assert(matches[0].profile.userId === techUser1.id, 'Top candidate is مهندس حسینی (certified SMA in Yazd)');
    assert(matches[0].matchScore >= 80, 'Top candidate score is high (>=80)');

    // 6.4 Assign Technician to Case
    const resAssign = await fetch(`${baseUrl}/api/maintenance/${createdCase.id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`
      },
      body: JSON.stringify({
        technicianId: techUser1.id,
        notes: 'ارجاع به کارشناس ارشد'
      })
    });
    assert(resAssign.status === 200, 'Assigned technician to case (200)');
    const assignedCase = await resAssign.json();
    assert(assignedCase.status === 'ASSIGNED', 'Case status transitioned to ASSIGNED');

    // 6.5 Access Control: Unassigned technician (techUser2) cannot view Case A -> 403
    const resUnassignedTechGet = await fetch(`${baseUrl}/api/maintenance/${createdCase.id}`, {
      headers: { Authorization: `Bearer ${tech2Token}` }
    });
    assert(resUnassignedTechGet.status === 403, 'Unassigned technician denied access to case (403)');

    // 6.6 Assigned technician (techUser1) CAN view Case A -> 200
    const resAssignedTechGet = await fetch(`${baseUrl}/api/maintenance/${createdCase.id}`, {
      headers: { Authorization: `Bearer ${tech1Token}` }
    });
    assert(resAssignedTechGet.status === 200, 'Assigned technician granted access to case (200)');

    // 6.7 Service Execution: Assigned technician accepts case -> IN_PROGRESS
    const resAccept = await fetch(`${baseUrl}/api/maintenance/${createdCase.id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tech1Token}` }
    });
    assert(resAccept.status === 200, 'Assigned technician accepts case');
    const inProgressCase = maintenanceRepository.getCaseById(createdCase.id);
    assert(inProgressCase?.status === 'IN_PROGRESS', 'Case status transitioned to IN_PROGRESS');

    // 6.8 Log Action: Unassigned technician cannot log actions -> 403
    const resUnassignedAction = await fetch(`${baseUrl}/api/maintenance/${createdCase.id}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tech2Token}`
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تلاش غیرمجاز برای ثبت گزارش کار',
        laborCost: 5000000
      })
    });
    assert(resUnassignedAction.status === 403, 'Unassigned technician cannot log actions on case (403)');

    // 6.9 Log Action: Assigned technician logs valid action with cost integrity
    const resAssignedAction = await fetch(`${baseUrl}/api/maintenance/${createdCase.id}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tech1Token}`
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تست میگر و تعویض فیوز DC استرینگ',
        laborCost: 15000000,
        partsCost: 8000000
      })
    });
    assert(resAssignedAction.status === 200, 'Assigned technician logs action with costs (200)');
    const updatedCaseCost = maintenanceRepository.getCaseById(createdCase.id);
    assert(updatedCaseCost?.laborCost === 15000000, 'Labor cost recorded accurately: 15,000,000 IRR');
    assert(updatedCaseCost?.partsCost === 8000000, 'Parts cost recorded accurately: 8,000,000 IRR');
    assert(updatedCaseCost?.totalCost === 23000000, 'Total cost mathematically aggregated: 23,000,000 IRR');

    // ==========================================
    // 7. ALERT DEDUPLICATION & OCCURRENCE TRACKING
    // ==========================================
    console.log('\n--- 7. ALERT DEDUPLICATION & OCCURRENCE TRACKING ---');

    // Configure a verified threshold rule for Asset A
    const rule = maintenanceRepository.createRule({
      projectId: projectA.id,
      assetId: assetA.id,
      name: 'آستانه هشدار فرکانس شبکه',
      ruleType: 'THRESHOLD',
      metricType: 'GRID_FREQ',
      operator: '>',
      thresholdValue: 51.5,
      severity: 'WARNING',
      enabled: true,
      cooldownMinutes: 30
    });

    // Ingest first reading exceeding threshold -> triggers alert
    const firstReadingTime = '2026-09-14T08:00:00.000Z';
    const alerts1 = alertService.evaluateTelemetryReading({
      id: 'r-1',
      assetId: assetA.id,
      projectId: projectA.id,
      sourceId: sourceA.id,
      metricType: 'GRID_FREQ',
      value: 52.1,
      unit: 'Hz',
      quality: 'GOOD',
      timestamp: firstReadingTime,
      receivedAt: firstReadingTime
    });

    assert(alerts1.length === 1, 'First reading exceeding rule threshold triggers 1 alert');
    const freqAlert = alerts1[0];
    assert(freqAlert.firstObservedAt === firstReadingTime, 'firstObservedAt accurately set on initial trigger');
    assert(freqAlert.lastObservedAt === firstReadingTime, 'lastObservedAt accurately set on initial trigger');

    // Ingest duplicate reading 10 minutes later -> deduplicated!
    const secondReadingTime = '2026-09-14T08:10:00.000Z';
    const alerts2 = alertService.evaluateTelemetryReading({
      id: 'r-2',
      assetId: assetA.id,
      projectId: projectA.id,
      sourceId: sourceA.id,
      metricType: 'GRID_FREQ',
      value: 52.4,
      unit: 'Hz',
      quality: 'GOOD',
      timestamp: secondReadingTime,
      receivedAt: secondReadingTime
    });

    assert(alerts2.length === 0, 'Duplicate reading does not spawn a new alert (deduplicated)');
    const deduplicatedAlert = maintenanceRepository.getAlertById(freqAlert.id);
    assert(deduplicatedAlert?.firstObservedAt === firstReadingTime, 'firstObservedAt remains original trigger time');
    assert(deduplicatedAlert?.lastObservedAt === secondReadingTime, 'lastObservedAt updated to latest occurrence timestamp');
    assert(deduplicatedAlert?.metricValue === 52.4, 'Latest metricValue updated on existing alert');

    // ==========================================
    // 8. DIAGNOSIS SAFETY & WARRANTY VALIDATION
    // ==========================================
    console.log('\n--- 8. DIAGNOSIS SAFETY & WARRANTY VALIDATION ---');

    // 8.1 Asset with Active Warranty (Asset A)
    const diagnosisA = await diagnosisService.generateDiagnosis({
      assetId: assetA.id,
      alertId: alertA.id,
      triggerAiAssisted: false
    });

    assert(Boolean(diagnosisA.id), 'Diagnosis generated successfully');
    assert(diagnosisA.facts && diagnosisA.facts.length > 0, 'Deterministic FACTS strictly distinguished');
    assert(diagnosisA.inferences && diagnosisA.inferences.length > 0, 'Analytical INFERENCES strictly distinguished');
    assert(diagnosisA.actions && diagnosisA.actions.length > 0, 'RECOMMENDATIONS formulated');
    assert(diagnosisA.warrantyImpact?.hasWarrantyCoverage === true, 'Valid warranty correctly identified as covered');
    assert(diagnosisA.warrantyImpact?.warrantyStatus === 'ACTIVE', 'Warranty status is ACTIVE');
    assert(diagnosisA.warrantyImpact?.claimProcedure?.includes('منوط به بررسی'), 'Procedure explicitly clarifies claim is subject to manufacturer verification (no automatic approval)');

    // 8.2 Asset with Expired Warranty (Asset B)
    const diagnosisB = await diagnosisService.generateDiagnosis({
      assetId: assetB.id,
      triggerAiAssisted: false
    });
    assert(diagnosisB.warrantyImpact?.hasWarrantyCoverage === false, 'Expired warranty correctly flagged as not covered');
    assert(diagnosisB.warrantyImpact?.warrantyStatus === 'EXPIRED', 'Warranty status correctly marked EXPIRED');

    // 8.3 Insufficient Data fallback: Asset with no telemetry and no alerts
    const emptyAsset = assetRepository.createAsset({
      projectId: projectA.id,
      name: 'دارایی جدید فاقد تله‌متری',
      assetType: 'SOLAR_PV',
      installedCapacityKw: 1000,
      operationalStatus: 'COMMISSIONING',
      gridConnectionStatus: 'PENDING'
    });

    const diagnosisEmpty = await diagnosisService.generateDiagnosis({
      assetId: emptyAsset.id,
      triggerAiAssisted: false
    });

    assert(diagnosisEmpty.diagnosisStatus === 'INSUFFICIENT_DATA', 'Diagnosis status is INSUFFICIENT_DATA when evidence is missing');
    assert(diagnosisEmpty.confidenceScore <= 20, 'Confidence score is conservative (<=20) on insufficient data');

    // ==========================================
    // 9. CLEANUP & PRODUCTION DB INTEGRITY VERIFICATION
    // ==========================================
    console.log('\n--- 9. CLEANUP & STORAGE INTEGRITY VERIFICATION ---');

    // Close HTTP test server
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log('[HTTP TEST SERVER] Ephemeral server closed.');

    // Restore DB
    db.setDBPath(originalDbPath);
    console.log(`[ISOLATION] Restored DB path to: ${originalDbPath}`);

    // Remove temp file
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
      console.log(`[ISOLATION] Temporary test DB file deleted.`);
    }

    // Verify original production db.json was 100% untouched
    const currentDbContent = fs.readFileSync(originalDbPath, 'utf8');
    assert(originalDbContent === currentDbContent, 'CRITICAL: Original production db.json was 100% UNTOUCHED');

    console.log('\n================================================================');
    console.log(`PHASE 7-C AUDIT COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('\n[FATAL AUDIT ERROR]', err);
    // Ensure cleanup happens even on failure
    try {
      server.close();
      db.setDBPath(originalDbPath);
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    } catch {}
    process.exit(1);
  }
}

runAudit();
