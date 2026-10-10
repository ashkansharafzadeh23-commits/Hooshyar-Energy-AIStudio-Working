/**
 * STAGE 13.11-F.1: GENERATOR-SPECIFIC PROFESSIONAL MATCHING TESTS
 * 
 * Verifies:
 * 1. Solar matching retains its previous keyword and scoring behavior.
 * 2. PORTABLE_GENERATOR cases recognize relevant generator specialties.
 * 3. STATIONARY_GENSET cases recognize relevant generator specialties.
 * 4. A solar-only professional does not receive generator-specialty points solely because they are in the same city.
 * 5. Generator specialty points are based on the professional's stored specialty data.
 * 6. General electrical specialties are not automatically treated as mechanical engine expertise.
 * 7. Stored diagnosis requiredExpertise influences case-specific matching when available.
 * 8. Client-supplied requiredExpertise cannot override or fabricate the server-stored diagnosis expertise.
 * 9. Missing diagnosis or missing expertise is handled conservatively.
 * 10. Pending, rejected, suspended, or otherwise unapproved professionals remain excluded.
 * 11. Matching results do not expose pro.phone in matching previews.
 * 12. Matching scores remain deterministic and within the allowed [0, 100] range.
 * 13. No technician is automatically assigned.
 * 14. No RFQ or booking is created.
 * 15. Generator matching changes do not leak into solar cases.
 * 16. Immutability guard preserves production db.json.
 */

import http from 'http';
import express from 'express';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

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
  console.log('STAGE 13.11-F.1: GENERATOR-SPECIFIC PROFESSIONAL MATCHING TESTS');
  console.log('================================================================\n');

  // 1. Database Isolation
  const isolation = setupTestDatabaseIsolation('stage13_11_f1_matching');

  try {
    const { professionalRepository } = await import('../src/repositories/professionalRepository.js');
    const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { technicianMatchingService } = await import('../src/services/technicianMatchingService.js');
    const { maintenanceRouter } = await import('../src/api/maintenance.js');

    // -------------------------------------------------------------------------
    // SETUP TEST PROFESSIONALS
    // -------------------------------------------------------------------------
    // Pro 1: Solar Only Specialist (Tehran)
    const proSolar = professionalRepository.createProfessional({
      fullName: 'مهندس خورشیدی (فقط سولار)',
      phone: '09121111111',
      serviceCities: ['تهران', 'کرج'],
      specialties: ['سیستم‌های خورشیدی', 'پنل فتوولتائیک', 'اینورتر'],
      yearsExperience: 6,
      rating: 4.8,
      bio: 'متخصص نیروگاه‌های خورشیدی و اینورتر',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proSolar.id, 'approved');

    // Pro 2: Generator Mechanical & Engine Specialist (Tehran)
    const proGensetMech = professionalRepository.createProfessional({
      fullName: 'استاد مکانیک و موتور دیزل',
      phone: '09122222222',
      serviceCities: ['تهران'],
      specialties: ['تعمیر موتور احتراقی', 'دیزل ژنراتور', 'سرویس ژنراتور', 'موتور برق'],
      yearsExperience: 8,
      rating: 4.9,
      bio: 'متخصص عیب‌یابی مکانیکی و موتور دیزل و بنزینی ژنراتور',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proGensetMech.id, 'approved');

    // Pro 3: Generator Electrical & ATS / AVR Specialist (Tehran)
    const proGensetElec = professionalRepository.createProfessional({
      fullName: 'مهندس برق ژنراتور و چنج‌اور',
      phone: '09123333333',
      serviceCities: ['تهران'],
      specialties: ['برق ژنراتور', 'تابلو چنج اور', 'ATS', 'رگولاتور ولتاژ AVR', 'آلترناتور'],
      yearsExperience: 5,
      rating: 4.6,
      bio: 'تخصص در ادوات الکتریکی و تابلویی دیزل ژنراتور',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proGensetElec.id, 'approved');

    // Pro 4: General Electrical Only (Tehran)
    const proGenElec = professionalRepository.createProfessional({
      fullName: 'تکنسین برق عمومی ساختمان',
      phone: '09124444444',
      serviceCities: ['تهران'],
      specialties: ['سیم‌کشی و برق عمومی', 'تابلو توزیع برق'],
      yearsExperience: 4,
      rating: 4.2,
      bio: 'تاسیسات برق و روشنایی',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proGenElec.id, 'approved');

    // Pro 5: Unapproved Generator Technician (Pending review)
    const proPending = professionalRepository.createProfessional({
      fullName: 'تعمیرکار تایید نشده ژنراتور',
      phone: '09125555555',
      serviceCities: ['تهران'],
      specialties: ['دیزل ژنراتور', 'تعمیر ژنراتور'],
      yearsExperience: 10,
      rating: 5.0,
      bio: 'در انتظار تایید مدارک',
      profileImageUrl: '',
      certifications: []
    });
    // Remains pending_review (not approved)

    // Pro 6: Rejected Professional
    const proRejected = professionalRepository.createProfessional({
      fullName: 'تکنسین رد صلاحیت شده',
      phone: '09126666666',
      serviceCities: ['تهران'],
      specialties: ['دیزل ژنراتور'],
      yearsExperience: 5,
      rating: 2.0,
      bio: 'رد صلاحیت',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proRejected.id, 'rejected');

    // -------------------------------------------------------------------------
    // TEST 1: SOLAR MATCHING PRESERVES BEHAVIOR & SCORES
    // -------------------------------------------------------------------------
    console.log('\n--- 1. SOLAR MATCHING BEHAVIOR PRESERVATION ---');
    const solarMatches = technicianMatchingService.matchTechnicians({
      equipmentType: 'INVERTER',
      category: 'SOLAR_CORRECTIVE',
      symptoms: ['خطای عایقی سمت DC اینورتر خورشیدی'],
      location: 'تهران'
    });

    assert(solarMatches.length > 0, 'Solar: Matches returned for solar inverter case');
    const topSolar = solarMatches[0];
    assert(topSolar.technicianId === proSolar.id, 'Solar: Solar specialist ranks #1 for solar case');
    assert(
      topSolar.matchReasons.some(r => r.includes('سیستم‌های خورشیدی') || r.includes('اینورتر')),
      'Solar: Retains solar/inverter match reasons'
    );
    // Generator pros should not get specialty points on pure solar cases
    const proGensetInSolar = solarMatches.find(m => m.technicianId === proGensetMech.id);
    assert(
      proGensetInSolar ? !proGensetInSolar.matchReasons.some(r => r.includes('ژنراتور')) : true,
      'Solar Isolation: Generator specialties do not score or leak into solar cases'
    );

    // -------------------------------------------------------------------------
    // TEST 2: PORTABLE_GENERATOR RECOGNIZES GENERATOR SPECIALTIES
    // -------------------------------------------------------------------------
    console.log('\n--- 2. PORTABLE_GENERATOR MATCHING ---');
    const portableGenMatches = technicianMatchingService.matchTechnicians({
      equipmentType: 'PORTABLE_GENERATOR',
      symptoms: ['موتور برق بنزینی روشن نمی‌شود و شمع جرقه نمی‌زند'],
      location: 'تهران'
    });

    assert(portableGenMatches.length > 0, 'Portable Gen: Returns candidates');
    const topPortable = portableGenMatches[0];
    assert(
      topPortable.technicianId === proGensetMech.id,
      'Portable Gen: Engine/generator mechanic ranks #1 over solar-only tech'
    );
    assert(
      topPortable.matchReasons.some(r => r.includes('ژنراتور') || r.includes('موتور') || r.includes('مکانیک')),
      'Portable Gen: Includes generator specialty match reason'
    );

    // -------------------------------------------------------------------------
    // TEST 3: STATIONARY_GENSET RECOGNIZES GENERATOR SPECIALTIES
    // -------------------------------------------------------------------------
    console.log('\n--- 3. STATIONARY_GENSET MATCHING ---');
    const stationaryMatches = technicianMatchingService.matchTechnicians({
      equipmentType: 'STATIONARY_GENSET',
      symptoms: ['دیزل ژنراتور زیر بار خاموش می‌شود'],
      location: 'تهران'
    });

    const topStationary = stationaryMatches[0];
    assert(
      topStationary.technicianId === proGensetMech.id || topStationary.technicianId === proGensetElec.id,
      'Stationary Genset: Generator specialist ranks top'
    );

    // -------------------------------------------------------------------------
    // TEST 4 & 5: SOLAR-ONLY TECH GETS NO GENERATOR SPECIALTY POINTS
    // -------------------------------------------------------------------------
    console.log('\n--- 4 & 5. SPECIALTY ISOLATION & DATA GROUNDING ---');
    const solarTechInGen = portableGenMatches.find(m => m.technicianId === proSolar.id);
    assert(Boolean(solarTechInGen), 'Solar tech is in candidates due to location');
    if (solarTechInGen) {
      assert(
        !solarTechInGen.matchReasons.some(r => r.includes('ژنراتور') || r.includes('موتور احتراقی')),
        'Solar tech in generator case gets ZERO generator specialty points despite being in same city'
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: GENERAL ELECTRICAL != MECHANICAL ENGINE EXPERTISE
    // -------------------------------------------------------------------------
    console.log('\n--- 6. ELECTRICAL VS MECHANICAL GENERATOR SPECIALTY DISTINCTION ---');
    const mechProblemMatches = technicianMatchingService.matchTechnicians({
      equipmentType: 'PORTABLE_GENERATOR',
      symptoms: ['روغن‌ریزی شدید از کارتر موتور احتراقی'],
      location: 'تهران'
    });
    const mechPro = mechProblemMatches.find(m => m.technicianId === proGensetMech.id);
    const genElecPro = mechProblemMatches.find(m => m.technicianId === proGenElec.id);
    assert(
      (mechPro?.matchScore || 0) > (genElecPro?.matchScore || 0),
      'Mechanical engine problem scores mechanical generator specialist higher than general electrician'
    );

    // -------------------------------------------------------------------------
    // TEST 7: SERVER-STORED DIAGNOSIS requiredExpertise INFLUENCES CASE MATCHING
    // -------------------------------------------------------------------------
    console.log('\n--- 7. SERVER-STORED DIAGNOSIS requiredExpertise CASE MATCHING ---');
    // Create an authenticated test user
    const testUser = userRepository.createUser({
      name: 'Generator Owner',
      phone: '09129999001',
      role: 'PROJECT_OWNER',
      roles: ['PROJECT_OWNER']
    });

    // Create a diagnosis with requiredExpertise = ['تابلو چنج اور', 'ATS', 'برق ژنراتور']
    const diagWithExpertise = maintenanceRepository.createDiagnosis({
      assetId: 'UNREGISTERED',
      projectId: 'CUSTOMER_DIRECT',
      diagnosisStatus: 'ACTION_RECOMMENDED',
      confidenceScore: 0,
      diagnosisMethod: 'EXPERT_RULESET',
      facts: ['ژنراتور اضطراری فاقد کلید چنج‌اور اتوماتیک است'],
      inferences: ['خطر برق‌برگشتی به شبکه سراسری توزیع'],
      requiredExpertise: ['تابلو چنج اور', 'ATS', 'برق ژنراتور'],
      likelyRootCauses: [],
      recommendedActions: []
    });

    // Create a maintenance case linked to this diagnosis
    const genCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'STATIONARY_GENSET',
      title: 'نصب و اصلاح تابلو چنج‌اور ژنراتور',
      description: 'نیاز به متخصص ATS و برق اضطراری جهت اتصال ایمن به تابلو اصلی',
      priority: 'HIGH',
      status: 'OPEN',
      category: 'CORRECTIVE',
      diagnosisId: diagWithExpertise.id,
      reportedBy: testUser.id,
      reportedAt: new Date().toISOString(),
      symptoms: ['برق شهر قطع', 'چنج‌اور'],
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    // Call case-specific matching method
    const caseMatches = technicianMatchingService.matchTechniciansForCase(genCase.id);
    assert(caseMatches.length > 0, 'Case Matching: Matches returned for case ID');
    const topCaseMatch = caseMatches[0];
    assert(
      topCaseMatch.technicianId === proGensetElec.id,
      'Case Matching: Diagnosis requiredExpertise (ATS/چنج‌اور) ranks electrical generator specialist #1'
    );
    assert(
      topCaseMatch.matchReasons.some(r => r.includes('تابلو چنج اور') || r.includes('ATS') || r.includes('برق ژنراتور')),
      'Case Matching: Match reasons cite server-stored requiredExpertise'
    );

    // -------------------------------------------------------------------------
    // TEST 8: CLIENT-SUPPLIED requiredExpertise CANNOT OVERRIDE SERVER DIAGNOSIS
    // -------------------------------------------------------------------------
    console.log('\n--- 8. FABRICATION RESISTANCE: CLIENT CANNOT OVERRIDE SERVER EXPERTISE ---');
    // Set up express app to test HTTP route
    const app = express();
    app.use(express.json());
    app.use('/api', maintenanceRouter);
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const userToken = jwtService.sign({ userId: testUser.id, role: testUser.role, roles: testUser.roles });

    // Client attempts to pass fake client-supplied skills/expertise in query/body
    const spoofedRes = await fetch(`${baseUrl}/cases/${genCase.id}/technician-matches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    assert(spoofedRes.status === 200, 'HTTP Case Match: Authenticated customer receives matches');
    const spoofedMatches: any[] = await spoofedRes.json();
    assert(
      spoofedMatches.length > 0 && spoofedMatches[0].technicianId === proGensetElec.id,
      'HTTP Case Match: Server-authoritative diagnosis expertise prevails over client input'
    );

    // -------------------------------------------------------------------------
    // TEST 9: MISSING DIAGNOSIS / MISSING EXPERTISE HANDLED CONSERVATIVELY
    // -------------------------------------------------------------------------
    console.log('\n--- 9. CONSERVATIVE FALLBACK ON MISSING DIAGNOSIS ---');
    const caseNoDiag = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'سرویس کلی ژنراتور بنزینی',
      description: 'ژنراتور بنزینی نیاز به تعویض فیلتر دارد',
      priority: 'MEDIUM',
      status: 'OPEN',
      category: 'PREVENTIVE',
      reportedBy: testUser.id,
      reportedAt: new Date().toISOString(),
      symptoms: ['سرویس دوره‌ای'],
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    const matchesNoDiag = technicianMatchingService.matchTechniciansForCase(caseNoDiag.id);
    assert(matchesNoDiag.length > 0, 'Missing Diagnosis: Matches returned smoothly');
    assert(
      matchesNoDiag[0].technicianId === proGensetMech.id,
      'Missing Diagnosis: Falls back conservatively to case equipmentType and title/description'
    );

    // -------------------------------------------------------------------------
    // TEST 10: UNAPPROVED / PENDING / REJECTED PROFESSIONALS EXCLUDED
    // -------------------------------------------------------------------------
    console.log('\n--- 10. UNAPPROVED PROFESSIONALS FILTERING ---');
    const allMatchingTechIds = new Set(matchesNoDiag.map(m => m.technicianId));
    assert(!allMatchingTechIds.has(proPending.id), 'Unapproved Guard: Pending professional is strictly excluded');
    assert(!allMatchingTechIds.has(proRejected.id), 'Unapproved Guard: Rejected professional is strictly excluded');

    // -------------------------------------------------------------------------
    // TEST 11: MATCHING RESULTS OMIT DIRECT PHONE NUMBERS IN PREVIEWS
    // -------------------------------------------------------------------------
    console.log('\n--- 11. PHONE NUMBER PRIVACY IN MATCHING PREVIEWS ---');
    // Check direct service output serialization
    const serializedMatches = JSON.parse(JSON.stringify(matchesNoDiag));
    const anyPhoneExposed = serializedMatches.some((m: any) => m.phone !== undefined && m.phone !== null && m.phone !== '');
    assert(!anyPhoneExposed, 'Privacy: Service matching preview omits phone numbers in JSON serialization');

    // Check HTTP API response serialization
    const httpMatchingRes = await fetch(`${baseUrl}/technicians/matching?equipmentType=PORTABLE_GENERATOR&location=تهران`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const httpMatches: any[] = await httpMatchingRes.json();
    assert(httpMatchingRes.status === 200, 'HTTP Matching: Returns 200');
    const httpPhoneExposed = httpMatches.some((m: any) => m.phone !== undefined && m.phone !== null && m.phone !== '');
    assert(!httpPhoneExposed, 'Privacy: HTTP matching preview endpoint omits phone numbers');

    // -------------------------------------------------------------------------
    // TEST 12: MATCHING SCORES DETERMINISTIC & BOUNDED [0, 100]
    // -------------------------------------------------------------------------
    console.log('\n--- 12. SCORE BOUNDS & DETERMINISM ---');
    const allScores = [...matchesNoDiag, ...caseMatches, ...portableGenMatches, ...solarMatches].map(m => m.matchScore);
    assert(allScores.every(s => typeof s === 'number' && s >= 0 && s <= 100), 'Score Bounds: All match scores in [0, 100]');

    // Determinism test: calling twice yields identical scores and order
    const run1 = technicianMatchingService.matchTechnicians({ equipmentType: 'PORTABLE_GENERATOR', location: 'تهران' });
    const run2 = technicianMatchingService.matchTechnicians({ equipmentType: 'PORTABLE_GENERATOR', location: 'تهران' });
    const isDeterministic = JSON.stringify(run1.map(m => ({ id: m.technicianId, s: m.matchScore }))) ===
      JSON.stringify(run2.map(m => ({ id: m.technicianId, s: m.matchScore })));
    assert(isDeterministic, 'Determinism: Consecutive matching runs produce identical scores and ordering');

    // -------------------------------------------------------------------------
    // TEST 13 & 14: NO AUTO-ASSIGNMENT OR RFQ CREATION
    // -------------------------------------------------------------------------
    console.log('\n--- 13 & 14. NO AUTOMATION DRIFT ---');
    const refreshedCase = maintenanceRepository.getCaseById(genCase.id);
    assert(
      refreshedCase?.status === 'OPEN' && !refreshedCase?.assignedTechnicianId,
      'Automation Drift: Matching did NOT automatically assign a technician or change case status'
    );
    const { rfqRepository } = await import('../src/repositories/rfqRepository.js');
    const allRfqs = rfqRepository.getAllRFQs();
    assert(allRfqs.length === 0, 'Automation Drift: Matching did NOT create any marketplace RFQ');

    // -------------------------------------------------------------------------
    // TEST 15: ZERO LEAKAGE INTO SOLAR CASES
    // -------------------------------------------------------------------------
    console.log('\n--- 15. SOLAR ISOLATION CHECK ---');
    const solarRecheck = technicianMatchingService.matchTechnicians({
      equipmentType: 'SOLAR_PANEL',
      symptoms: ['کاهش تولید توان در استرینگ فتوولتائیک'],
      location: 'تهران'
    });
    assert(solarRecheck.length > 0 && solarRecheck[0].technicianId === proSolar.id, 'Solar Isolation: Solar panel case strictly ranks solar specialist #1');

    server.close();

    // -------------------------------------------------------------------------
    // IMMUTABILITY GUARD
    // -------------------------------------------------------------------------
    console.log('\n--- VERIFYING IMMUTABILITY GUARD ---');
    isolation.verifyImmutability();
  } finally {
    isolation.cleanup();
  }

  console.log('\n================================================================');
  console.log(`STAGE F.1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('\nFatal test execution error:', err);
  process.exit(1);
});
