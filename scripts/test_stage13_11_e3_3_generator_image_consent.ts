/**
 * STAGE 13.11-E.3.3 — TARGETED SAFETY & PRIVACY REGRESSION TESTS
 * 
 * Verifies:
 * 1. Consent enforcement:
 *    - Missing consent (undefined) blocks generator image transmission to external AI.
 *    - Explicit false consent blocks generator image transmission to external AI.
 *    - Explicit true consent permits image transmission through authorized flow.
 *    - Text-only diagnosis remains functional without image consent.
 *    - Intercepts actual outgoing Gemini API payload to assert contents.
 * 2. Generator safety:
 *    - Critical deterministic warnings survive AI failures, timeouts, and contradictory AI responses.
 *    - AI output never downgrades critical safety escalation (ACTION_RECOMMENDED preserved).
 *    - Generator diagnosis does not fabricate numerical confidence or root-cause probabilities (0 or qualitative).
 * 3. UI safety contracts:
 *    - Generator photography safety warning is present in intake rendering path.
 *    - Generator image-analysis disclaimer is present in diagnosis display path.
 * 4. Solar isolation:
 *    - Generator consent rules do not disable existing solar maintenance diagnosis.
 *    - No automatic technician assignment or RFQ creation occurs.
 * 5. Data isolation:
 *    - Isolated temporary database via setupTestDatabaseIsolation.
 *    - Repository db.json byte-for-byte immutability asserted.
 */

import * as fs from 'fs';
import * as path from 'path';
import http from 'http';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import {
  GENERATOR_PHOTO_SAFETY_WARNING_FA,
  GENERATOR_IMAGE_ANALYSIS_DISCLAIMER_FA
} from '../src/types/generatorMaintenance.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STAGE 13.11-E.3.3: GENERATOR IMAGE CONSENT & SAFETY REGRESSION');
  console.log('================================================================\n');

  // 1. Data Isolation Guard
  const isolation = setupTestDatabaseIsolation('stage13_11_e3_3_consent');
  const repoDbPath = path.resolve(process.cwd(), 'db.json');

  if (!fs.existsSync(repoDbPath)) {
    throw new Error(`Repository db.json not found at: ${repoDbPath}`);
  }
  if (!isolation.tempDbPath || path.resolve(isolation.tempDbPath) === repoDbPath) {
    throw new Error('FATAL: Database isolation could not be established.');
  }

  // Set fake GEMINI_API_KEY so getGeminiClient() initializes the client
  process.env.GEMINI_API_KEY = 'test-fake-key-for-payload-interception';

  // Intercept GoogleGenAI models module prototype to capture actual outgoing payloads
  let capturedAiCalls: any[] = [];
  let aiBehavior: 'normal' | 'error' | 'contradictory' = 'normal';

  const dummyClient = new GoogleGenAI({ apiKey: 'init-probe' });
  const modelsProto = Object.getPrototypeOf(dummyClient.models);
  const originalGenerateInternal = modelsProto.generateContentInternal;

  modelsProto.generateContentInternal = async function (req: any) {
    capturedAiCalls.push(req);
    if (aiBehavior === 'error') {
      throw new Error('Gemini upstream network timeout 504');
    }
    if (aiBehavior === 'contradictory') {
      return {
        text: 'دستگاه کاملاً سالم است و مشکلی ندارد و آماده کار بدون خطر می‌باشد.'
      };
    }
    return {
      text: 'تحلیل فنی: بررسی شمع و فیلتر هوا با رعایت کامل نکات ایمنی توصیه می‌شود.'
    };
  };

  // Dynamically import database-dependent modules
  const { diagnosisService } = await import('../src/services/diagnosisService.js');
  const { maintenanceRouter } = await import('../src/api/maintenance.js');
  const { userRepository } = await import('../src/repositories/userRepository.js');
  const { jwtService } = await import('../src/security/jwtService.js');

  const samplePhoto = {
    base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    mimeType: 'image/png'
  };

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: CONSENT ENFORCEMENT & PAYLOAD INTERCEPTION
    // -------------------------------------------------------------------------
    console.log('\n--- 1. CONSENT ENFORCEMENT & GEMINI PAYLOAD INTERCEPTION ---');

    // 1.1 Missing consent (undefined) -> Image transmission blocked
    capturedAiCalls = [];
    aiBehavior = 'normal';
    const resMissingConsent = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      symptoms: ['استارت می‌خورد ولی موتور روشن نمی‌شود'],
      photos: [samplePhoto],
      aiImageConsent: undefined,
      triggerAiAssisted: true
    });

    assert(capturedAiCalls.length === 1, 'Missing consent: Gemini API was called with text prompt fallback');
    if (capturedAiCalls.length > 0) {
      const parts = capturedAiCalls[0]?.contents?.parts || [];
      const imageParts = parts.filter((p: any) => p.inlineData);
      assert(imageParts.length === 0, 'Missing consent: Payload contains ZERO image parts');
      const textParts = parts.filter((p: any) => p.text);
      assert(textParts.length > 0, 'Missing consent: Text prompt was transmitted for text-only diagnosis');
    }
    assert(
      resMissingConsent.facts.some(f => f.includes('عدم تایید ارسال تصاویر')),
      'Missing consent: Audit fact explicitly records withholding photos from external AI'
    );

    // 1.2 Explicit false consent -> Image transmission blocked
    capturedAiCalls = [];
    aiBehavior = 'normal';
    const resFalseConsent = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      equipmentType: 'STATIONARY_GENSET',
      symptoms: ['نوسان دور موتور'],
      photos: [samplePhoto],
      aiImageConsent: false,
      triggerAiAssisted: true
    });

    assert(capturedAiCalls.length === 1, 'Explicit false consent: Gemini API was called');
    if (capturedAiCalls.length > 0) {
      const parts = capturedAiCalls[0]?.contents?.parts || [];
      const imageParts = parts.filter((p: any) => p.inlineData);
      assert(imageParts.length === 0, 'Explicit false consent: ZERO image parts transmitted');
    }
    assert(
      resFalseConsent.facts.some(f => f.includes('عدم تایید ارسال تصاویر')),
      'Explicit false consent: Audit fact explicitly records withholding photos'
    );

    // 1.3 Explicit true consent -> Image transmission permitted
    capturedAiCalls = [];
    aiBehavior = 'normal';
    const resTrueConsent = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      symptoms: ['دود سیاه'],
      photos: [samplePhoto],
      aiImageConsent: true,
      triggerAiAssisted: true
    });

    assert(capturedAiCalls.length === 1, 'Explicit true consent: Gemini API was called');
    if (capturedAiCalls.length > 0) {
      const parts = capturedAiCalls[0]?.contents?.parts || [];
      const imageParts = parts.filter((p: any) => p.inlineData);
      assert(imageParts.length === 1, 'Explicit true consent: Image parts successfully transmitted to external AI');
      assert(imageParts[0].inlineData.mimeType === 'image/png', 'Explicit true consent: Preserved correct mimeType');
    }
    assert(
      resTrueConsent.safetyGuidance?.includes(GENERATOR_IMAGE_ANALYSIS_DISCLAIMER_FA) ?? false,
      'Explicit true consent: Generator image analysis disclaimer included in safety guidance'
    );

    // 1.4 Text-only diagnosis functional without any photos
    capturedAiCalls = [];
    aiBehavior = 'normal';
    const resTextOnly = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      symptoms: ['داغ شدن بیش از حد بدنه ژنراتور'],
      photos: [],
      aiImageConsent: false,
      triggerAiAssisted: true
    });

    assert(capturedAiCalls.length === 1, 'Text-only diagnosis: Gemini API was executed for text context');
    assert(resTextOnly.rootCauses.length > 0, 'Text-only diagnosis: Produced valid engineering root causes');
    assert(resTextOnly.recommendedActions.length > 0, 'Text-only diagnosis: Produced recommended actions');

    // 1.5 Strict Boolean Consent Boundary: HTTP API Request Boundary Tests
    // Set up isolated HTTP express app with maintenanceRouter
    const testUser = userRepository.createUser({
      name: 'Consent Security Tester',
      phone: '09120000002',
      role: 'CUSTOMER',
      roles: ['CUSTOMER']
    });
    const authToken = jwtService.sign({ userId: testUser.id, role: testUser.role, roles: testUser.roles });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api', maintenanceRouter);
    const testServer = http.createServer(testApp);
    await new Promise<void>((resolve) => testServer.listen(0, resolve));
    const testPort = (testServer.address() as any).port;
    const testBaseUrl = 'http://127.0.0.1:' + testPort + '/api';

    try {
      // Test all 9 non-boolean invalid inputs at HTTP API boundary:
      // "false", "true", 1, 0, "1", "0", [], {}, null
      const invalidConsentTestCases = [
        { label: 'String "false"', value: 'false' },
        { label: 'String "true"', value: 'true' },
        { label: 'Number 1', value: 1 },
        { label: 'Number 0', value: 0 },
        { label: 'String "1"', value: '1' },
        { label: 'String "0"', value: '0' },
        { label: 'Array []', value: [] },
        { label: 'Object {}', value: {} },
        { label: 'Null', value: null }
      ];

      for (const tc of invalidConsentTestCases) {
        capturedAiCalls = [];
        const res = await fetch(testBaseUrl + '/diagnose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify({
            equipmentType: 'PORTABLE_GENERATOR',
            symptoms: ['روشن نشدن ژنراتور'],
            photos: [{ data: samplePhoto.base64Data, type: samplePhoto.mimeType }],
            aiImageConsent: tc.value
          })
        });

        assert(
          res.status === 400,
          'HTTP API Boundary: ' + tc.label + ' rejected with HTTP 400 (Status: ' + res.status + ')'
        );
        const data = await res.json();
        assert(
          data?.error === 'INVALID_AI_IMAGE_CONSENT' || data?.error?.includes?.('aiImageConsent') || data?.message?.includes?.('boolean'),
          'HTTP API Boundary: ' + tc.label + ' returns clear invalid consent error structure'
        );
        assert(
          capturedAiCalls.length === 0,
          'HTTP API Boundary: ' + tc.label + ' resulted in ZERO external AI calls and ZERO image transmission'
        );
      }

      // Verify legitimate boolean true via HTTP API
      capturedAiCalls = [];
      const resTrueApi = await fetch(testBaseUrl + '/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({
          equipmentType: 'PORTABLE_GENERATOR',
          symptoms: ['روشن نشدن ژنراتور'],
          photos: [{ data: samplePhoto.base64Data, type: samplePhoto.mimeType }],
          aiImageConsent: true
        })
      });
      assert(resTrueApi.status === 200, 'HTTP API Boundary: Boolean true accepted with HTTP 200');
      assert(capturedAiCalls.length === 1, 'HTTP API Boundary: Boolean true triggers external AI call');
      if (capturedAiCalls.length > 0) {
        const parts = capturedAiCalls[0]?.contents?.parts || [];
        const imgParts = parts.filter((p: any) => p.inlineData);
        assert(imgParts.length === 1, 'HTTP API Boundary: Boolean true successfully authorizes image transmission');
      }

      // Verify legitimate boolean false via HTTP API
      capturedAiCalls = [];
      const resFalseApi = await fetch(testBaseUrl + '/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({
          equipmentType: 'PORTABLE_GENERATOR',
          symptoms: ['روشن نشدن ژنراتور'],
          photos: [{ data: samplePhoto.base64Data, type: samplePhoto.mimeType }],
          aiImageConsent: false
        })
      });
      assert(resFalseApi.status === 200, 'HTTP API Boundary: Boolean false accepted with HTTP 200');
      assert(capturedAiCalls.length === 1, 'HTTP API Boundary: Boolean false proceeds with text-only AI analysis');
      if (capturedAiCalls.length > 0) {
        const parts = capturedAiCalls[0]?.contents?.parts || [];
        const imgParts = parts.filter((p: any) => p.inlineData);
        assert(imgParts.length === 0, 'HTTP API Boundary: Boolean false blocks image transmission (ZERO image parts)');
      }

      // Verify omitted consent (undefined) via HTTP API
      capturedAiCalls = [];
      const resOmittedApi = await fetch(testBaseUrl + '/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({
          equipmentType: 'PORTABLE_GENERATOR',
          symptoms: ['روشن نشدن ژنراتور'],
          photos: [{ data: samplePhoto.base64Data, type: samplePhoto.mimeType }]
        })
      });
      assert(resOmittedApi.status === 200, 'HTTP API Boundary: Omitted consent accepted with HTTP 200 (fallback)');
      assert(capturedAiCalls.length === 1, 'HTTP API Boundary: Omitted consent proceeds with text-only AI analysis');
      if (capturedAiCalls.length > 0) {
        const parts = capturedAiCalls[0]?.contents?.parts || [];
        const imgParts = parts.filter((p: any) => p.inlineData);
        assert(imgParts.length === 0, 'HTTP API Boundary: Omitted consent blocks image transmission (ZERO image parts)');
      }
    } finally {
      testServer.close();
    }

    // TEST SECTION 2: GENERATOR SAFETY ESCALATION & HAZARD PRESERVATION
    // -------------------------------------------------------------------------
    console.log('\n--- 2. GENERATOR SAFETY & ZERO NUMERICAL CONFIDENCE ---');

    // 2.1 Critical hazard (fuel leak trigger key: 'fuel_or_oil_leak') with AI error/timeout
    capturedAiCalls = [];
    aiBehavior = 'error';

    const resAiFailure = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      symptoms: ['fuel_or_oil_leak', 'نشتی بنزین'],
      triggerAiAssisted: true
    });

    assert(
      resAiFailure.diagnosisStatus === 'ACTION_RECOMMENDED',
      'AI Failure: Critical safety status ACTION_RECOMMENDED is preserved'
    );
    assert(
      resAiFailure.safetyGuidance.some(s => s.includes('خطر اشتعال') || s.includes('سوخت') || s.includes('آتش‌سوزی')),
      'AI Failure: Deterministic critical safety guidance survives AI timeout/error'
    );
    assert(
      resAiFailure.confidenceScore === 0,
      'AI Failure: Generator confidence score remains strictly 0 (no fabrication)'
    );

    // 2.2 Critical hazard (backfeed trigger: 'برق شهر قطع', 'پریز') with contradictory AI response
    capturedAiCalls = [];
    aiBehavior = 'contradictory';

    const resContradictoryAi = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      symptoms: ['برق شهر قطع', 'پریز'],
      triggerAiAssisted: true
    });

    assert(
      resContradictoryAi.diagnosisStatus === 'ACTION_RECOMMENDED',
      'Contradictory AI: AI hallucination CANNOT downgrade critical safety escalation'
    );
    assert(
      resContradictoryAi.safetyGuidance.some(s => s.includes('برق‌برگشتی') || s.includes('چنج‌اور') || s.includes('توزیع')),
      'Contradictory AI: Backfeed safety guidance strictly preserved against AI contradiction'
    );
    assert(
      resContradictoryAi.confidenceScore === 0,
      'Contradictory AI: Generator confidence score remains strictly 0'
    );

    // 2.3 Verify generator root causes do not fabricate fake numerical probabilities
    for (const rc of resContradictoryAi.rootCauses) {
      assert(
        rc.probability === 0 || rc.probability === undefined,
        `Generator root cause [${rc.cause}] probability is not fabricated (value: ${rc.probability})`
      );
    }

    // -------------------------------------------------------------------------
    // TEST SECTION 3: UI SAFETY STRINGS & CONTRACT VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 3. UI SAFETY WARNINGS & DISCLAIMER INTEGRITY ---');

    // Read the pending UI component files to verify mandatory warning and disclaimer rendering paths
    const customerReqFile = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/maintenance/CustomerMaintenanceRequest.tsx'),
      'utf8'
    );
    const diagnosisViewFile = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/maintenance/DiagnosisView.tsx'),
      'utf8'
    );

    // 3.1 CustomerMaintenanceRequest: Photography safety warning is rendered in generator branch
    assert(
      customerReqFile.includes('GENERATOR_PHOTO_SAFETY_WARNING_FA') &&
      customerReqFile.includes('هشدار حیاتی ایمنی عکس‌برداری از ژنراتور:'),
      'Intake UI: Generator photo safety warning is present in the intake rendering path'
    );
    assert(
      customerReqFile.includes('aiImageConsent') &&
      customerReqFile.includes('موافقت اختیاری با تحلیل تصویر توسط ارائه‌دهنده خارجی هوش مصنوعی'),
      'Intake UI: Explicit opt-in checkbox for external AI image consent exists in UI'
    );

    // 3.2 DiagnosisView: Image analysis disclaimer is rendered
    assert(
      diagnosisViewFile.includes('GENERATOR_IMAGE_ANALYSIS_DISCLAIMER_FA'),
      'Diagnosis UI: Image-analysis disclaimer is present in the visual diagnosis rendering path'
    );
    assert(
      diagnosisViewFile.includes('ارزیابی کیفی اولیه (نیازمند بازرسی)'),
      'Diagnosis UI: Visual display uses qualitative evaluation label when confidence is 0'
    );

    // 3.3 Confirm constants themselves contain stringent safety language
    assert(
      GENERATOR_PHOTO_SAFETY_WARNING_FA.includes('نشتی سوخت') &&
      GENERATOR_PHOTO_SAFETY_WARNING_FA.includes('نزدیک نشوید') &&
      GENERATOR_PHOTO_SAFETY_WARNING_FA.includes('ایمنی شما از ثبت تصویر مهم‌تر است'),
      'Safety Constant: GENERATOR_PHOTO_SAFETY_WARNING_FA prioritizes human life and warns against proximity to hazards'
    );
    assert(
      GENERATOR_IMAGE_ANALYSIS_DISCLAIMER_FA.includes('کمکی و مقدماتی') &&
      GENERATOR_IMAGE_ANALYSIS_DISCLAIMER_FA.includes('عکس‌ها هرگز نمی‌توانند نبود خطرات الکتریکی، نشتی پنهان سوخت') &&
      GENERATOR_IMAGE_ANALYSIS_DISCLAIMER_FA.includes('اثبات کنند'),
      'Safety Constant: GENERATOR_IMAGE_ANALYSIS_DISCLAIMER_FA explicitly disclaims safety proof'
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 4: SOLAR ISOLATION & NO UNINTENDED SIDE-EFFECTS
    // -------------------------------------------------------------------------
    console.log('\n--- 4. SOLAR MAINTENANCE ISOLATION & NO AUTOMATION DRIFT ---');

    // 4.1 Solar maintenance diagnosis works normally
    capturedAiCalls = [];
    aiBehavior = 'normal';
    const solarDiagnosis = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      equipmentType: 'INVERTER',
      symptoms: ['خطای عایقی سمت DC و خطای ایزولاسیون زمین'],
      triggerAiAssisted: false
    });

    assert(
      solarDiagnosis.rootCauses.length > 0,
      'Solar Isolation: Solar inverter diagnosis functions without hindrance from generator consent rules'
    );
    assert(
      solarDiagnosis.confidenceScore !== undefined && solarDiagnosis.confidenceScore > 0,
      'Solar Isolation: Solar diagnosis retains calibrated confidence scoring (> 0)'
    );

    // 4.2 Verify no technician auto-assignment or RFQ creation occurred
    const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
    const cases = maintenanceRepository.getAllCases();
    assert(
      cases.length === 0,
      'Safety/Isolation: No automatic maintenance cases or technician assignments were created'
    );

    console.log('\n--- VERIFYING IMMUTABILITY GUARD ---');
    isolation.verifyImmutability();

  } finally {
    // Restore GoogleGenAI prototype
    modelsProto.generateContentInternal = originalGenerateInternal;
    isolation.cleanup();
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});
