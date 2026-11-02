/**
 * Stage 13.11-F.5 Phase P2-A: PostgreSQL Maintenance Adapter Offline Unit Tests (Security Hardened)
 *
 * Verifies:
 * 1. Financial precision and safe Rial integer conversions.
 * 2. Data mapping and strict fail-closed data integrity validation.
 * 3. Privilege escalation defense (isUserAdmin returns false, spoofed roles/flags strictly rejected).
 * 4. Strict allowlist privacy projections (no leakage of private photos, documents, bills, actionsTaken, or attachments).
 * 5. Authoritative A -> B -> A cycle isolation, duplicate acceptances, orphaned records, and terminal privacy.
 * 6. Assignment history authorization, role-specific history privacy, and former technician denial.
 * 7. Actual adapter behavior on unauthenticated contexts, invalid IDs, and database unavailable errors.
 */

import {
  pgNumericToRial,
  mapPgCaseToDomain,
  mapPgHistoryToDomain,
  validateListCaseFilter,
  evaluateCaseAccess,
  evaluateCurrentCycleAcceptance,
  evaluateAndProjectCasesForCaller,
  projectCaseForCaller,
  projectTechnicalAllowlistCase,
  projectAcceptedTechnicianCase,
  formatTechnicalDisplayTitle,
  APPROVED_EQUIPMENT_LABELS,
  APPROVED_CATEGORY_LABELS,
  sanitizeAcceptedAttachment,
  sanitizeSparePart,
  sanitizePostMaintenanceCheck,
  projectSafeAssignmentHistory,
  resolveAuthorizedTechnicianIds,
  isUserAdmin,
  isTechnicianRole,
  maintenancePostgresAdapter,
  MaintenanceAuthError,
  MaintenanceAccessDeniedError,
  PostgresUnavailableError,
  DataIntegrityError,
  FinancialPrecisionError,
  MaintenanceAuthContext
} from '../src/database/postgres/maintenancePostgresAdapter.js';
import type {
  MaintenanceCase,
  MaintenanceAssignmentHistory
} from '../src/types/maintenance.js';
import { professionalRepository } from '../src/repositories/professionalRepository.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runOfflineTests() {
  console.log('================================================================');
  console.log('PHASE P2-A: POSTGRESQL MAINTENANCE ADAPTER OFFLINE UNIT TESTS');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Financial Precision & Numeric Conversion
  // ---------------------------------------------------------------------------
  console.log('--- 1. Financial Precision & Numeric Conversion ---');

  assert(pgNumericToRial('15000000') === 15000000, 'Integer string converts to safe integer Rial amount');
  assert(pgNumericToRial(500000) === 500000, 'Integer number passes through correctly');
  assert(pgNumericToRial('0') === 0, 'Zero string converts to 0');
  assert(pgNumericToRial(0) === 0, 'Zero number converts to 0');
  assert(pgNumericToRial(null) === null, 'Null converts to null');
  assert(pgNumericToRial(undefined) === null, 'Undefined converts to null');
  assert(pgNumericToRial('   ') === null, 'Empty whitespace converts to null');

  // Negative rejection
  let threwNegative = false;
  try {
    pgNumericToRial('-500000');
  } catch (err: any) {
    threwNegative = err instanceof FinancialPrecisionError && err.message.includes('negative');
  }
  assert(threwNegative, 'pgNumericToRial strictly rejected negative value with FinancialPrecisionError');

  // Decimal / float rejection
  let threwDecimal = false;
  try {
    pgNumericToRial('15000.75');
  } catch (err: any) {
    threwDecimal = err instanceof FinancialPrecisionError && err.message.includes('fractional');
  }
  assert(threwDecimal, 'pgNumericToRial strictly rejected decimal fractional value');

  // Overflow beyond MAX_SAFE_INTEGER rejection
  let threwOverflow = false;
  try {
    pgNumericToRial('9007199254740992'); // MAX_SAFE_INTEGER + 1
  } catch (err: any) {
    threwOverflow = err instanceof FinancialPrecisionError && err.message.includes('MAX_SAFE_INTEGER');
  }
  assert(threwOverflow, 'pgNumericToRial strictly rejected unsafe integer overflow');

  // Non-numeric string rejection
  let threwNonNumeric = false;
  try {
    pgNumericToRial('invalid_rial_amount');
  } catch (err: any) {
    threwNonNumeric = err instanceof FinancialPrecisionError;
  }
  assert(threwNonNumeric, 'Non-numeric string strictly rejected with FinancialPrecisionError');

  // Infinity rejection
  let threwInfinity = false;
  try {
    pgNumericToRial(Infinity);
  } catch (err: any) {
    threwInfinity = err instanceof FinancialPrecisionError;
  }
  assert(threwInfinity, 'Infinity strictly rejected with FinancialPrecisionError');

  // Boolean rejection
  let threwBoolean = false;
  try {
    pgNumericToRial(true);
  } catch (err: any) {
    threwBoolean = err instanceof FinancialPrecisionError;
  }
  assert(threwBoolean, 'Boolean value strictly rejected with FinancialPrecisionError');

  // ---------------------------------------------------------------------------
  // 2. Data Mapping & Domain Integrity
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Data Mapping & Domain Integrity ---');

  const validCaseRow = {
    id: 'case-test-uuid-001',
    maintenanceCode: 'MNT-HSE-000042',
    caseNumber: 'MC-2026-0042',
    projectId: 'CUSTOMER_DIRECT',
    assetId: 'UNREGISTERED',
    componentId: 'comp-inv-01',
    equipmentType: 'INVERTER',
    symptoms: ['NO_OUTPUT', 'OVERHEAT'],
    alertIds: ['ALT-001', 'ALT-002'],
    title: 'خرابی اینورتر مرکزی',
    description: 'اینورتر در ساعات اوج تابش قطع می‌شود',
    category: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    reportedBy: 'customer-user-123',
    reportedAt: new Date('2026-10-15T08:30:00.000Z'),
    contactName: 'مهندس رضایی',
    contactPhone: '09121112233',
    diagnosisId: 'diag-001',
    assignedTechnicianId: 'tech-user-456',
    assignedTechnicianName: 'مهندس حسینی',
    assignedTechnicianPhone: '09124445566',
    assignedOrganizationId: 'org-partner-01',
    scheduledDate: '1403/08/15',
    totalLaborHours: 3.5,
    laborCost: '15000000',
    partsCost: '8500000',
    totalCost: '23500000',
    totalCostIrr: '23500000',
    currency: 'IRR',
    photos: ['/uploads/photo1.jpg'],
    documents: ['/uploads/doc1.pdf'],
    actionsTaken: [{ note: 'Inspected inverter terminal' }],
    attachments: [
      {
        id: 'att-01',
        maintenanceCaseId: 'case-test-uuid-001',
        name: 'thermal_scan.jpg',
        type: 'PHOTO',
        url: '/api/cases/case-test-uuid-001/attachments/att-01/download',
        uploadedBy: 'tech-user-456',
        uploadedAt: '2026-10-15T10:00:00.000Z',
        data: 'base64rawdatabuffer...',
        storageKey: 's3://internal-bucket/cases/att-01.jpg',
        storageProvider: 'S3_COMPATIBLE',
        checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        extractedData: {
          customerPhone: '09121112233',
          customerName: 'مهندس رضایی',
          hotspotCelsius: 78,
          extractedDetails: { fullAddress: 'Tehran, Valiasr St', gatePin: '9988' },
          internalNotes: 'Customer is VIP, priority expedite',
          rawAiMetadata: { confidence: 0.99, tokenLogits: [0.12, 0.45] }
        }
      } as any
    ],
    billDoc: {
      name: 'power_bill.pdf',
      url: '/api/cases/case-test-uuid-001/bill/download',
      extractedData: {
        customerPhone: '09121112233',
        billIdentifier: 'BILL-998877',
        kwhTotal: 450
      }
    },
    createdAt: new Date('2026-10-15T08:30:00.000Z'),
    updatedAt: new Date('2026-10-15T09:00:00.000Z')
  };

  const domainCase = mapPgCaseToDomain(validCaseRow);
  assert(domainCase.id === 'case-test-uuid-001', 'Case ID mapped accurately');
  assert(domainCase.maintenanceCode === 'MNT-HSE-000042', 'Maintenance code preserved');
  assert(domainCase.projectId === 'CUSTOMER_DIRECT', 'CUSTOMER_DIRECT sentinel preserved');
  assert(domainCase.assetId === 'UNREGISTERED', 'UNREGISTERED sentinel preserved');
  assert(domainCase.priority === 'HIGH', 'Priority mapped accurately');
  assert(domainCase.status === 'IN_PROGRESS', 'Status mapped accurately');
  assert(domainCase.laborCost === 15000000, 'laborCost converted to safe integer Rial');
  assert(domainCase.partsCost === 8500000, 'partsCost converted to safe integer Rial');
  assert(domainCase.totalCost === 23500000, 'totalCost converted to safe integer Rial');
  assert(domainCase.totalLaborHours === 3.5, 'totalLaborHours mapped as number');
  assert(domainCase.reportedAt === '2026-10-15T08:30:00.000Z', 'reportedAt timestamp preserved');
  assert(domainCase.createdAt === '2026-10-15T08:30:00.000Z', 'createdAt timestamp preserved');
  assert(domainCase.scheduledDate === '1403/08/15', 'Jalali scheduledDate preserved verbatim');
  assert(Array.isArray(domainCase.symptoms) && domainCase.symptoms.length === 2, 'Symptoms array preserved');
  assert(Array.isArray(domainCase.alertIds) && domainCase.alertIds.length === 2, 'alertIds array preserved');

  // Mandatory fields missing checks
  let threwMissingId = false;
  try {
    mapPgCaseToDomain({ ...validCaseRow, id: '' });
  } catch (err: any) {
    threwMissingId = err instanceof DataIntegrityError;
  }
  assert(threwMissingId, 'Missing id throws DataIntegrityError');

  let threwMissingCode = false;
  try {
    mapPgCaseToDomain({ ...validCaseRow, maintenanceCode: undefined });
  } catch (err: any) {
    threwMissingCode = err instanceof DataIntegrityError;
  }
  assert(threwMissingCode, 'Missing maintenanceCode throws DataIntegrityError');

  let threwMissingReportedBy = false;
  try {
    mapPgCaseToDomain({ ...validCaseRow, reportedBy: null });
  } catch (err: any) {
    threwMissingReportedBy = err instanceof DataIntegrityError;
  }
  assert(threwMissingReportedBy, 'Missing reportedBy throws DataIntegrityError');

  let threwInvalidStatus = false;
  try {
    mapPgCaseToDomain({ ...validCaseRow, status: 'SUBMITTED' }); // SUBMITTED is not a valid status
  } catch (err: any) {
    threwInvalidStatus = err instanceof DataIntegrityError && err.message.includes('Invalid maintenance status');
  }
  assert(threwInvalidStatus, 'Invalid status "SUBMITTED" strictly rejected with DataIntegrityError');

  let threwInvalidPriority = false;
  try {
    mapPgCaseToDomain({ ...validCaseRow, priority: 'SUPER_URGENT' });
  } catch (err: any) {
    threwInvalidPriority = err instanceof DataIntegrityError;
  }
  assert(threwInvalidPriority, 'Invalid priority strictly rejected with DataIntegrityError');

  let threwInvalidTimestamp = false;
  try {
    mapPgCaseToDomain({ ...validCaseRow, reportedAt: 'corrupt-date-string' });
  } catch (err: any) {
    threwInvalidTimestamp = err instanceof DataIntegrityError;
  }
  assert(threwInvalidTimestamp, 'Corrupt reportedAt timestamp strictly rejected without new Date() fallback');

  // Assignment History Mapping
  const validHistoryRow = {
    id: 'hist-001',
    maintenanceCaseId: 'case-test-uuid-001',
    technicianId: 'tech-user-456',
    organizationId: 'org-partner-01',
    assignedBy: 'customer-user-123',
    assignedAt: new Date('2026-10-15T09:00:00.000Z'),
    status: 'ACCEPTED',
    notes: 'پذیرش مسئولیت تعمیر'
  };

  const domainHistory = mapPgHistoryToDomain(validHistoryRow);
  assert(domainHistory.id === 'hist-001', 'History ID mapped');
  assert(domainHistory.maintenanceCaseId === 'case-test-uuid-001', 'maintenanceCaseId correctly mapped (not caseId)');
  assert(domainHistory.technicianId === 'tech-user-456', 'Technician ID mapped');
  assert(domainHistory.status === 'ACCEPTED', 'History status mapped');
  assert(domainHistory.assignedAt === '2026-10-15T09:00:00.000Z', 'assignedAt timestamp mapped to ISO string');

  let threwMissingMaintCaseId = false;
  try {
    mapPgHistoryToDomain({ ...validHistoryRow, maintenanceCaseId: '' });
  } catch (err: any) {
    threwMissingMaintCaseId = err instanceof DataIntegrityError;
  }
  assert(threwMissingMaintCaseId, 'Missing maintenanceCaseId throws DataIntegrityError');

  let threwInvalidHistoryStatus = false;
  try {
    mapPgHistoryToDomain({ ...validHistoryRow, status: 'INVALID_STATUS' });
  } catch (err: any) {
    threwInvalidHistoryStatus = err instanceof DataIntegrityError;
  }
  assert(threwInvalidHistoryStatus, 'Invalid assignment history status strictly rejected');

  // ---------------------------------------------------------------------------
  // 3. Privilege Escalation Defense (isUserAdmin & Scoped Filter Enforcement)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Privilege Escalation Defense ---');

  // isUserAdmin strictly returns false in isolated adapter
  assert(isUserAdmin({ userId: 'u-1', isAdmin: true }) === false, 'isUserAdmin rejects auth.isAdmin === true');
  assert(isUserAdmin({ userId: 'u-2', role: 'ADMIN' }) === false, 'isUserAdmin rejects caller-supplied role: ADMIN');
  assert(isUserAdmin({ userId: 'u-3', role: 'SUPER_ADMIN' }) === false, 'isUserAdmin rejects caller-supplied role: SUPER_ADMIN');
  assert(isUserAdmin({ userId: 'u-4', roles: ['ADMIN', 'SUPER_ADMIN'] }) === false, 'isUserAdmin rejects caller-supplied roles array');
  assert(isUserAdmin(undefined) === false, 'isUserAdmin rejects undefined auth context');

  // Unauthenticated caller in filter validation
  let threwNoAuth = false;
  try {
    validateListCaseFilter({}, undefined as any);
  } catch (err: any) {
    threwNoAuth = err instanceof MaintenanceAuthError;
  }
  assert(threwNoAuth, 'validateListCaseFilter rejected unauthenticated caller with MaintenanceAuthError');

  // Empty userId
  let threwEmptyUser = false;
  try {
    validateListCaseFilter({}, { userId: '  ' });
  } catch (err: any) {
    threwEmptyUser = err instanceof MaintenanceAuthError;
  }
  assert(threwEmptyUser, 'validateListCaseFilter rejected whitespace userId with MaintenanceAuthError');

  // Spoofed admin trying unscoped query
  let threwSpoofedAdminUnscoped = false;
  try {
    validateListCaseFilter({}, { userId: 'attacker', role: 'ADMIN', isAdmin: true });
  } catch (err: any) {
    threwSpoofedAdminUnscoped = err instanceof MaintenanceAccessDeniedError;
  }
  assert(threwSpoofedAdminUnscoped, 'Unscoped query with spoofed role: ADMIN strictly rejected with MaintenanceAccessDeniedError');

  let threwSuperAdminUnscoped = false;
  try {
    validateListCaseFilter({}, { userId: 'attacker', roles: ['SUPER_ADMIN'] });
  } catch (err: any) {
    threwSuperAdminUnscoped = err instanceof MaintenanceAccessDeniedError;
  }
  assert(threwSuperAdminUnscoped, 'Unscoped query with spoofed roles: [SUPER_ADMIN] strictly rejected');

  // Cross-technician filtering
  let threwCrossTech = false;
  try {
    validateListCaseFilter(
      { assignedTechnicianId: 'other-tech-id' },
      { userId: 'tech-user-1', role: 'TECHNICIAN' }
    );
  } catch (err: any) {
    threwCrossTech = err instanceof MaintenanceAccessDeniedError;
  }
  assert(threwCrossTech, 'Technician querying another technician identity rejected with MaintenanceAccessDeniedError');

  // Customer querying by projectId alone without reportedBy ownership
  let threwCustomerProjectAlone = false;
  try {
    validateListCaseFilter(
      { projectId: 'project-999' },
      { userId: 'customer-1', role: 'CUSTOMER' }
    );
  } catch (err: any) {
    threwCustomerProjectAlone = err instanceof MaintenanceAccessDeniedError;
  }
  assert(threwCustomerProjectAlone, 'Customer querying projectId alone without reportedBy ownership rejected');

  // Valid scoped queries
  let customerFilterOk = false;
  try {
    validateListCaseFilter(
      { reportedBy: 'customer-1' },
      { userId: 'customer-1', role: 'CUSTOMER' }
    );
    customerFilterOk = true;
  } catch {
    customerFilterOk = false;
  }
  assert(customerFilterOk, 'Customer filtering by own reportedBy accepted');

  let techFilterOk = false;
  try {
    validateListCaseFilter(
      { assignedTechnicianId: 'tech-user-1' },
      { userId: 'tech-user-1', role: 'TECHNICIAN' }
    );
    techFilterOk = true;
  } catch {
    techFilterOk = false;
  }
  assert(techFilterOk, 'Technician filtering by own assignedTechnicianId accepted');

  // Technician identity equivalence (userId <-> professionalId) in validateListCaseFilter & evaluateCaseAccess
  const originalGetProByUserId = professionalRepository.getProfessionalByUserId;
  const originalGetProById = professionalRepository.getProfessionalById;
  try {
    (professionalRepository as any).getProfessionalByUserId = (uid: string) => {
      if (uid === 'tech-user-1') return { id: 'pro-tech-profile-1', userId: 'tech-user-1' };
      return undefined;
    };
    (professionalRepository as any).getProfessionalById = (pid: string) => {
      if (pid === 'pro-tech-profile-1') return { id: 'pro-tech-profile-1', userId: 'tech-user-1' };
      return undefined;
    };

    const resolvedIds = resolveAuthorizedTechnicianIds({ userId: 'tech-user-1', role: 'TECHNICIAN' });
    assert(
      resolvedIds.includes('tech-user-1') && resolvedIds.includes('pro-tech-profile-1'),
      'resolveAuthorizedTechnicianIds establishes both user account and professional profile identities'
    );

    // Technician filtering by legitimate professionalId succeeds
    let techProFilterOk = false;
    try {
      validateListCaseFilter(
        { assignedTechnicianId: 'pro-tech-profile-1' },
        { userId: 'tech-user-1', role: 'TECHNICIAN' }
      );
      techProFilterOk = true;
    } catch {
      techProFilterOk = false;
    }
    assert(techProFilterOk, 'Technician filtering by equivalent professionalId accepted in validateListCaseFilter');

    // Case access evaluation when case is assigned to professionalId
    const caseAssignedToPro: MaintenanceCase = {
      ...domainCase,
      assignedTechnicianId: 'pro-tech-profile-1'
    };
    const evalProAccess = evaluateCaseAccess(caseAssignedToPro, { userId: 'tech-user-1', role: 'TECHNICIAN' });
    assert(
      evalProAccess.allowed === true && evalProAccess.isAssignedTech === true,
      'evaluateCaseAccess authorizes technician via equivalent professional profile ID'
    );

    // Case assigned to foreign professional profile is strictly denied
    const caseAssignedToForeignPro: MaintenanceCase = {
      ...domainCase,
      assignedTechnicianId: 'pro-foreign-expert-99'
    };
    const evalForeignPro = evaluateCaseAccess(caseAssignedToForeignPro, { userId: 'tech-user-1', role: 'TECHNICIAN' });
    assert(
      evalForeignPro.allowed === false && evalForeignPro.isAssignedTech === false,
      'evaluateCaseAccess strictly denies technician on case assigned to foreign professional ID'
    );
  } finally {
    (professionalRepository as any).getProfessionalByUserId = originalGetProByUserId;
    (professionalRepository as any).getProfessionalById = originalGetProById;
  }

  // resolveAuthorizedTechnicianIds fails closed on unauthenticated / empty userId
  let threwAuthIdsNoUser = false;
  try {
    resolveAuthorizedTechnicianIds({ userId: '   ' });
  } catch (err: any) {
    threwAuthIdsNoUser = err instanceof MaintenanceAuthError;
  }
  assert(threwAuthIdsNoUser, 'resolveAuthorizedTechnicianIds strictly rejects whitespace userId with MaintenanceAuthError');

  // ---------------------------------------------------------------------------
  // 4. Strict Allowlist Privacy Projections (Pre-acceptance & Terminal States)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Strict Allowlist Privacy Projections ---');

  const baseCase: MaintenanceCase = {
    ...domainCase,
    status: 'ASSIGNED',
    title: 'خرابی اینورتر مرکزی - تماس فوری 09121112233 کد ورود 4455 مهندس رضایی',
    description: 'تماس با خانم علوی ۰۹۱۲۱۱۱۴۴۵۵ - کد درب ورودی ۸۸۹۹ جهت ورود تکنسین',
    symptoms: ['صدای وزوز در ساعت ۱۰ شب', 'مشتری: با شماره 09121112233 تماس بگیرید'],
    alertIds: ['ALT-001', 'ALT-002'],
    closureNotes: 'مبلغ پرداختی نقدی توسط صاحبخانه تایید شد',
    resolutionSummary: 'کابل فاز آسیب دیده تعویض شد',
    rootCause: 'سیم‌کشی نامناسب قبلی توسط مستاجر',
    sparePartsUsed: [{ partName: 'کابل مسی ۴ متری', quantity: 1, costIrr: 500000, supplierMarginSecret: '30%' } as any],
    postMaintenanceCheck: {
      status: 'IMPROVED',
      evaluatedAt: '2026-10-15T12:00:00.000Z',
      notes: 'تست ولتاژ با رضایت مشتری به شماره 09123334455 انجام شد'
    },
    laborCost: 15000000,
    partsCost: 8500000,
    totalCost: 23500000,
    photos: ['/private/roof_photo.jpg'],
    documents: ['/private/customer_contract.pdf'],
    actionsTaken: [{ note: 'Called customer 09121112233', rawAuditLog: 'unredacted' } as any],
    diagnosisId: 'diag-unreviewed-ai-001'
  };

  // Inject unanticipated arbitrary properties to test anti-spread defense
  (baseCase as any).customerNationalCode = '0011223344';
  (baseCase as any).confidentialGatePin = '4321';
  (baseCase as any).rawAiInternalReasoning = { hiddenWeights: [0.1, 0.9] };

  const techAuth: MaintenanceAuthContext = { userId: 'tech-user-456', role: 'TECHNICIAN' };
  const customerAuth: MaintenanceAuthContext = { userId: 'customer-user-123', role: 'CUSTOMER' };
  const otherCustomerAuth: MaintenanceAuthContext = { userId: 'unrelated-customer', role: 'CUSTOMER' };

  // Pre-acceptance: Assigned technician prior to formal acceptance
  const unacceptedHistories: MaintenanceAssignmentHistory[] = [
    {
      id: 'h-1',
      maintenanceCaseId: baseCase.id,
      technicianId: 'tech-user-456',
      assignedBy: 'customer-user-123',
      assignedAt: '2026-10-15T09:00:00.000Z',
      status: 'ASSIGNED'
    }
  ];

  const preAcceptAccess = evaluateCaseAccess(baseCase, techAuth, unacceptedHistories);
  assert(preAcceptAccess.allowed === true, 'Assigned technician has case access');
  assert(preAcceptAccess.isFormallyAccepted === false, 'isFormallyAccepted is false on ASSIGNED status');

  const projectedPreAccept = projectCaseForCaller(baseCase, preAcceptAccess);

  // Verify explicit allowlist behavior (zero leakage of sensitive/free-text fields)
  assert(projectedPreAccept.description === '', 'Free-text description is scrubbed to empty string in pre-acceptance');
  assert(Array.isArray(projectedPreAccept.symptoms) && projectedPreAccept.symptoms.length === 0, 'Symptoms array is strictly empty in pre-acceptance');
  assert(projectedPreAccept.closureNotes === undefined, 'closureNotes is undefined in pre-acceptance');
  assert(projectedPreAccept.resolutionSummary === undefined, 'resolutionSummary is undefined in pre-acceptance');
  assert(projectedPreAccept.rootCause === undefined, 'rootCause is undefined in pre-acceptance');
  assert(Array.isArray(projectedPreAccept.sparePartsUsed) && projectedPreAccept.sparePartsUsed.length === 0, 'sparePartsUsed is empty array in pre-acceptance');
  assert(projectedPreAccept.postMaintenanceCheck === undefined, 'postMaintenanceCheck is undefined in pre-acceptance');
  assert(Array.isArray(projectedPreAccept.alertIds) && projectedPreAccept.alertIds.length === 0, 'alertIds is empty array in pre-acceptance');
  assert(projectedPreAccept.reportedBy === '', 'reportedBy is empty string in pre-acceptance');
  assert(projectedPreAccept.contactName === undefined, 'contactName strictly masked via allowlist in pre-acceptance');
  assert(projectedPreAccept.contactPhone === undefined, 'contactPhone strictly masked via allowlist in pre-acceptance');
  assert(projectedPreAccept.assignedTechnicianPhone === undefined, 'assignedTechnicianPhone is undefined in pre-acceptance');
  assert(Array.isArray(projectedPreAccept.photos) && projectedPreAccept.photos.length === 0, 'photos array is strictly empty allowlist');
  assert(Array.isArray(projectedPreAccept.documents) && projectedPreAccept.documents.length === 0, 'documents array is strictly empty allowlist');
  assert(projectedPreAccept.billDoc === undefined, 'billDoc is strictly undefined');
  assert(projectedPreAccept.actionsTaken === undefined, 'actionsTaken is strictly undefined');
  assert(projectedPreAccept.diagnosisId === undefined, 'diagnosisId is strictly undefined');
  assert(Array.isArray(projectedPreAccept.attachments) && projectedPreAccept.attachments.length === 0, 'attachments array is strictly empty allowlist');
  assert(projectedPreAccept.laborCost === undefined, 'laborCost is undefined prior to acceptance');
  assert(projectedPreAccept.totalCost === undefined, 'totalCost is undefined prior to acceptance');
  assert(projectedPreAccept.downtimeMinutes === undefined, 'downtimeMinutes is undefined prior to acceptance');

  // Verify anti-spread: Unanticipated arbitrary properties are strictly stripped
  assert((projectedPreAccept as any).customerNationalCode === undefined, 'Unanticipated customerNationalCode strictly omitted in pre-acceptance');
  assert((projectedPreAccept as any).confidentialGatePin === undefined, 'Unanticipated confidentialGatePin strictly omitted in pre-acceptance');
  assert((projectedPreAccept as any).rawAiInternalReasoning === undefined, 'Unanticipated rawAiInternalReasoning strictly omitted in pre-acceptance');

  // Verify genuine minimum necessary technical fields are preserved for assignment review (BLOCKER 1 FIX)
  assert(projectedPreAccept.id === baseCase.id, 'Allowlist preserves case id');
  assert(projectedPreAccept.maintenanceCode === baseCase.maintenanceCode, 'Allowlist preserves maintenanceCode');
  assert(
    projectedPreAccept.title === formatTechnicalDisplayTitle(baseCase.category, baseCase.equipmentType, baseCase.maintenanceCode),
    'Pre-acceptance title projected as safe generic technical display label'
  );
  assert(
    !projectedPreAccept.title.includes('09121112233') && !projectedPreAccept.title.includes('4455') && !projectedPreAccept.title.includes('رضایی'),
    'Pre-acceptance title strictly scrubbed of embedded PII (phone number, gate code, customer name)'
  );
  assert(projectedPreAccept.equipmentType === 'INVERTER', 'Allowlist preserves equipmentType');
  assert(projectedPreAccept.category === baseCase.category, 'Allowlist preserves category');
  assert(projectedPreAccept.priority === 'HIGH', 'Allowlist preserves priority');
  assert(projectedPreAccept.status === 'ASSIGNED', 'Allowlist preserves status');
  assert(projectedPreAccept.scheduledDate === '1403/08/15', 'Allowlist preserves scheduledDate');
  assert(projectedPreAccept.currency === 'IRR', 'Allowlist preserves currency');

  // Direct helper test
  const directAllowlist = projectTechnicalAllowlistCase(baseCase);
  assert(directAllowlist.description === '' && directAllowlist.contactName === undefined && directAllowlist.photos?.length === 0, 'projectTechnicalAllowlistCase enforces strict allowlist');
  assert((directAllowlist as any).customerNationalCode === undefined, 'projectTechnicalAllowlistCase does not spread arbitrary properties');
  assert(
    directAllowlist.title === formatTechnicalDisplayTitle(baseCase.category, baseCase.equipmentType, baseCase.maintenanceCode),
    'projectTechnicalAllowlistCase produces safe generic technical title'
  );

  // Assigned technician after formal acceptance in active execution (IN_PROGRESS)
  const acceptedCase: MaintenanceCase = { ...baseCase, status: 'IN_PROGRESS' };
  const acceptedHistories: MaintenanceAssignmentHistory[] = [
    ...unacceptedHistories,
    {
      id: 'h-2',
      maintenanceCaseId: baseCase.id,
      technicianId: 'tech-user-456',
      assignedBy: 'tech-user-456',
      assignedAt: '2026-10-15T09:30:00.000Z',
      status: 'ACCEPTED'
    }
  ];

  const postAcceptAccess = evaluateCaseAccess(acceptedCase, techAuth, acceptedHistories);
  assert(postAcceptAccess.isFormallyAccepted === true, 'isFormallyAccepted is true after valid acceptance in IN_PROGRESS');

  const projectedPostAccept = projectCaseForCaller(acceptedCase, postAcceptAccess);
  assert(projectedPostAccept.contactName === 'مهندس رضایی', 'contactName unmasked for technician after formal acceptance');
  assert(projectedPostAccept.contactPhone === '09121112233', 'contactPhone unmasked for technician after formal acceptance');
  assert(projectedPostAccept.description === baseCase.description, 'description accessible during active execution');
  assert(projectedPostAccept.symptoms?.length === 2, 'symptoms accessible during active execution');
  assert(projectedPostAccept.sparePartsUsed?.length === 1, 'sparePartsUsed accessible during active execution');
  assert(projectedPostAccept.postMaintenanceCheck !== undefined, 'postMaintenanceCheck accessible during active execution');
  assert(projectedPostAccept.attachments?.[0]?.url !== undefined, 'Attachment download URL accessible after acceptance');
  assert(projectedPostAccept.billDoc === undefined, 'billDoc remains undefined even after acceptance for technicians');
  assert(projectedPostAccept.diagnosisId === undefined, 'diagnosisId remains undefined for technicians');

  // CRITICAL ANTI-SPREAD & NESTED DATA ALLOWLIST IN ACCEPTED STATE (BLOCKER 2 FIX)
  assert((projectedPostAccept as any).customerNationalCode === undefined, 'Explicit allowlist prevents leaking customerNationalCode in accepted state');
  assert((projectedPostAccept as any).confidentialGatePin === undefined, 'Explicit allowlist prevents leaking confidentialGatePin in accepted state');
  assert((projectedPostAccept as any).rawAiInternalReasoning === undefined, 'Explicit allowlist prevents leaking rawAiInternalReasoning in accepted state');

  // Attachment nested allowlist
  assert(projectedPostAccept.attachments?.[0]?.storageKey === undefined, 'Attachment storageKey strictly undefined for technician');
  assert(projectedPostAccept.attachments?.[0]?.data === undefined, 'Attachment raw base64 data buffer strictly undefined for technician');
  assert((projectedPostAccept.attachments?.[0] as any)?.storageProvider === undefined, 'Attachment storageProvider strictly undefined for technician');
  assert((projectedPostAccept.attachments?.[0] as any)?.checksumSha256 === undefined, 'Attachment checksumSha256 strictly undefined for technician');
  assert(projectedPostAccept.attachments?.[0]?.uploadedBy === 'SYSTEM_VERIFIED', 'Attachment uploader identity masked to SYSTEM_VERIFIED');
  assert((projectedPostAccept.attachments?.[0] as any)?.extractedData?.customerPhone === undefined, 'Attachment extractedData customerPhone strictly stripped');
  assert((projectedPostAccept.attachments?.[0] as any)?.extractedData?.extractedDetails === undefined, 'Attachment raw extractedDetails strictly stripped');
  assert((projectedPostAccept.attachments?.[0] as any)?.extractedData?.internalNotes === undefined, 'Attachment internalNotes strictly stripped');
  assert((projectedPostAccept.attachments?.[0] as any)?.extractedData?.rawAiMetadata === undefined, 'Attachment rawAiMetadata strictly stripped');
  assert((projectedPostAccept.attachments?.[0] as any)?.extractedData?.hotspotCelsius === 78, 'Attachment safe technical telemetry measurement preserved');

  // Spare parts nested allowlist
  assert((projectedPostAccept.sparePartsUsed?.[0] as any)?.supplierMarginSecret === undefined, 'Spare parts used strips arbitrary vendor margin properties');

  // Actions taken nested allowlist
  assert((projectedPostAccept.actionsTaken?.[0] as any)?.rawAuditLog === undefined, 'Actions taken strips unallowlisted raw audit logs');

  // Direct projectAcceptedTechnicianCase test
  const directAccepted = projectAcceptedTechnicianCase(acceptedCase);
  assert((directAccepted as any).customerNationalCode === undefined, 'projectAcceptedTechnicianCase does not spread arbitrary properties');
  assert(directAccepted.billDoc === undefined, 'projectAcceptedTechnicianCase leaves billDoc undefined');

  // Terminal state privacy protection (CLOSED or CANCELLED)
  const closedCase: MaintenanceCase = { ...acceptedCase, status: 'CLOSED' };
  const closedAccess = evaluateCaseAccess(closedCase, techAuth, acceptedHistories);
  assert(closedAccess.isFormallyAccepted === false, 'isFormallyAccepted is false on CLOSED case');

  const projectedClosed = projectCaseForCaller(closedCase, closedAccess);
  assert(projectedClosed.description === '', 'description scrubbed to empty string on CLOSED case');
  assert(projectedClosed.symptoms?.length === 0, 'symptoms strictly empty on CLOSED case');
  assert(projectedClosed.closureNotes === undefined, 'closureNotes strictly undefined on CLOSED case');
  assert(projectedClosed.sparePartsUsed?.length === 0, 'sparePartsUsed strictly empty on CLOSED case');
  assert(projectedClosed.postMaintenanceCheck === undefined, 'postMaintenanceCheck strictly undefined on CLOSED case');
  assert(projectedClosed.contactName === undefined, 'contactName strictly masked on CLOSED case');
  assert(projectedClosed.contactPhone === undefined, 'contactPhone strictly masked on CLOSED case');
  assert(projectedClosed.photos?.length === 0, 'photos strictly empty on CLOSED case');
  assert(projectedClosed.documents?.length === 0, 'documents strictly empty on CLOSED case');
  assert(projectedClosed.attachments?.length === 0, 'attachments strictly empty on CLOSED case');
  assert((projectedClosed as any).customerNationalCode === undefined, 'Arbitrary properties scrubbed on CLOSED case');
  assert(
    projectedClosed.title === formatTechnicalDisplayTitle(closedCase.category, closedCase.equipmentType, closedCase.maintenanceCode),
    'Closed case title projected as safe generic technical display label'
  );
  assert(
    !projectedClosed.title.includes('09121112233') && !projectedClosed.title.includes('4455'),
    'Closed case title scrubbed of embedded customer PII'
  );

  const cancelledCase: MaintenanceCase = { ...acceptedCase, status: 'CANCELLED' };
  const cancelledAccess = evaluateCaseAccess(cancelledCase, techAuth, acceptedHistories);
  const projectedCancelled = projectCaseForCaller(cancelledCase, cancelledAccess);
  assert(projectedCancelled.description === '', 'description scrubbed to empty string on CANCELLED case');
  assert(projectedCancelled.symptoms?.length === 0, 'symptoms strictly empty on CANCELLED case');
  assert(projectedCancelled.contactName === undefined, 'contactName strictly masked on CANCELLED case');
  assert(projectedCancelled.attachments?.length === 0, 'attachments strictly empty on CANCELLED case');
  assert((projectedCancelled as any).customerNationalCode === undefined, 'Arbitrary properties scrubbed on CANCELLED case');
  assert(
    projectedCancelled.title === formatTechnicalDisplayTitle(cancelledCase.category, cancelledCase.equipmentType, cancelledCase.maintenanceCode),
    'Cancelled case title projected as safe generic technical display label'
  );
  assert(
    !projectedCancelled.title.includes('09121112233') && !projectedCancelled.title.includes('4455'),
    'Cancelled case title scrubbed of embedded customer PII'
  );

  // Owner customer access
  const ownerAccess = evaluateCaseAccess(baseCase, customerAuth);
  assert(ownerAccess.allowed === true && ownerAccess.isReporter === true, 'Case owner has full access');
  const projectedOwner = projectCaseForCaller(baseCase, ownerAccess);
  assert(projectedOwner.contactName === 'مهندس رضایی', 'Owner sees full contactName');
  assert(projectedOwner.contactPhone === '09121112233', 'Owner sees full contactPhone');
  assert(projectedOwner.photos?.length === 1, 'Owner sees full photos');
  assert(projectedOwner.documents?.length === 1, 'Owner sees full documents');

  // Cross-customer access denial
  const crossCustomerAccess = evaluateCaseAccess(baseCase, otherCustomerAuth);
  assert(crossCustomerAccess.allowed === false, 'Unrelated customer strictly denied access to CUSTOMER_DIRECT case');

  // ---------------------------------------------------------------------------
  // 5. Authoritative Current-Cycle Acceptance & A -> B -> A Cycle Isolation
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Authoritative Current-Cycle Acceptance & A -> B -> A Cycle Isolation ---');

  const caseId = 'case-aba-001';
  const techA = 'technician-A';
  const techB = 'technician-B';

  const abaHistories: MaintenanceAssignmentHistory[] = [
    // Cycle 1: Tech A assigned and accepted
    {
      id: 'aba-1',
      maintenanceCaseId: caseId,
      technicianId: techA,
      assignedBy: 'customer-1',
      assignedAt: '2026-10-01T08:00:00.000Z',
      status: 'ASSIGNED'
    },
    {
      id: 'aba-2',
      maintenanceCaseId: caseId,
      technicianId: techA,
      assignedBy: techA,
      assignedAt: '2026-10-01T08:15:00.000Z',
      status: 'ACCEPTED'
    },
    // Cycle 2: Reassigned to Tech B
    {
      id: 'aba-3',
      maintenanceCaseId: caseId,
      technicianId: techB,
      assignedBy: 'customer-1',
      assignedAt: '2026-10-02T09:00:00.000Z',
      status: 'ASSIGNED'
    },
    {
      id: 'aba-4',
      maintenanceCaseId: caseId,
      technicianId: techB,
      assignedBy: techB,
      assignedAt: '2026-10-02T09:15:00.000Z',
      status: 'ACCEPTED'
    },
    // Cycle 3: Reassigned back to Tech A (NOT accepted yet)
    {
      id: 'aba-5',
      maintenanceCaseId: caseId,
      technicianId: techA,
      assignedBy: 'customer-1',
      assignedAt: '2026-10-03T10:00:00.000Z',
      status: 'ASSIGNED'
    }
  ];

  const caseCycle3Assigned = {
    id: caseId,
    assignedTechnicianId: techA,
    status: 'ASSIGNED'
  };

  // Cycle 1 acceptance must NOT authorize Cycle 3!
  const isCycle3AcceptedPre = evaluateCurrentCycleAcceptance(caseCycle3Assigned, abaHistories);
  assert(
    isCycle3AcceptedPre === false,
    'A -> B -> A cycle isolation: Prior Cycle 1 acceptance strictly does NOT authorize Cycle 3'
  );

  // Orphaned ACCEPTED record test: ACCEPTED present but case remains ASSIGNED (failed transition)
  const abaHistoriesOrphanedAccepted: MaintenanceAssignmentHistory[] = [
    ...abaHistories,
    {
      id: 'aba-6',
      maintenanceCaseId: caseId,
      technicianId: techA,
      assignedBy: techA,
      assignedAt: '2026-10-03T10:30:00.000Z',
      status: 'ACCEPTED'
    }
  ];
  const isOrphanedAccepted = evaluateCurrentCycleAcceptance(caseCycle3Assigned, abaHistoriesOrphanedAccepted);
  assert(
    isOrphanedAccepted === false,
    'Orphaned ACCEPTED record on ASSIGNED case fails closed without active execution state'
  );

  // Now case transitions to IN_PROGRESS
  const caseCycle3InProgress = {
    id: caseId,
    assignedTechnicianId: techA,
    status: 'IN_PROGRESS'
  };

  const isCycle3AcceptedPost = evaluateCurrentCycleAcceptance(caseCycle3InProgress, abaHistoriesOrphanedAccepted);
  assert(
    isCycle3AcceptedPost === true,
    'Cycle 3 formal acceptance authorizes execution status for Tech A when IN_PROGRESS'
  );

  // Duplicate acceptances in same cycle: multiple ACCEPTED events do not conflict
  const abaHistoriesDuplicateAcceptance: MaintenanceAssignmentHistory[] = [
    ...abaHistoriesOrphanedAccepted,
    {
      id: 'aba-6b',
      maintenanceCaseId: caseId,
      technicianId: techA,
      assignedBy: techA,
      assignedAt: '2026-10-03T10:31:00.000Z',
      status: 'ACCEPTED'
    }
  ];
  assert(
    evaluateCurrentCycleAcceptance(caseCycle3InProgress, abaHistoriesDuplicateAcceptance) === true,
    'Duplicate idempotent acceptance records maintain valid acceptance'
  );

  // Subsequent cancellation invalidates acceptance
  const abaHistoriesCancelled: MaintenanceAssignmentHistory[] = [
    ...abaHistoriesOrphanedAccepted,
    {
      id: 'aba-7',
      maintenanceCaseId: caseId,
      technicianId: techA,
      assignedBy: 'admin-1',
      assignedAt: '2026-10-03T11:00:00.000Z',
      status: 'CANCELLED'
    }
  ];

  const isCancelledInvalidated = evaluateCurrentCycleAcceptance(caseCycle3InProgress, abaHistoriesCancelled);
  assert(
    isCancelledInvalidated === false,
    'Subsequent CANCELLED assignment history invalidates current-cycle acceptance'
  );

  // Legacy history compatibility (no ASSIGNED records)
  const legacyAllAccepted: MaintenanceAssignmentHistory[] = [
    {
      id: 'leg-1',
      maintenanceCaseId: caseId,
      technicianId: techA,
      assignedBy: 'system',
      assignedAt: '2025-01-01T00:00:00.000Z',
      status: 'ACCEPTED'
    }
  ];
  assert(
    evaluateCurrentCycleAcceptance({ id: caseId, assignedTechnicianId: techA, status: 'IN_PROGRESS' }, legacyAllAccepted) === true,
    'Legacy all-accepted history passes'
  );

  const legacyAmbiguousTech: MaintenanceAssignmentHistory[] = [
    ...legacyAllAccepted,
    {
      id: 'leg-2',
      maintenanceCaseId: caseId,
      technicianId: 'foreign-tech',
      assignedBy: 'system',
      assignedAt: '2025-01-01T01:00:00.000Z',
      status: 'ACCEPTED'
    }
  ];
  assert(
    evaluateCurrentCycleAcceptance({ id: caseId, assignedTechnicianId: techA, status: 'IN_PROGRESS' }, legacyAmbiguousTech) === false,
    'Legacy history with foreign technician fails closed on ambiguity'
  );

  // ---------------------------------------------------------------------------
  // 6. Assignment History Authorization & Privacy
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Assignment History Authorization & Privacy ---');

  // Former technician access denial
  const formerTechAuth: MaintenanceAuthContext = { userId: techB, role: 'TECHNICIAN' };
  const formerTechCaseAccess = evaluateCaseAccess(
    { ...domainCase, assignedTechnicianId: techA },
    formerTechAuth
  );
  assert(
    formerTechCaseAccess.allowed === false,
    'Former technician (Tech B) after reassignment to Tech A strictly denied access (allowed === false)'
  );

  // Unassigned technician access denial
  const unassignedTechAuth: MaintenanceAuthContext = { userId: 'stranger-tech', role: 'TECHNICIAN' };
  const unassignedCaseAccess = evaluateCaseAccess(domainCase, unassignedTechAuth);
  assert(
    unassignedCaseAccess.allowed === false,
    'Unassigned technician strictly denied access to unassigned case'
  );

  // Cross-user assignment history notes privacy (BLOCKER 2 FIX)
  const crossUserHistory: MaintenanceAssignmentHistory = {
    id: 'hist-priv-1',
    maintenanceCaseId: 'case-test-uuid-001',
    technicianId: 'tech-user-456',
    organizationId: 'org-partner-01',
    assignedBy: 'dispatcher-user-88',
    assignedAt: '2026-10-15T08:00:00.000Z',
    status: 'ASSIGNED',
    notes: 'Customer gate code 5566, call 09123334455 before arrival'
  };

  const techAuthContext: MaintenanceAuthContext = { userId: 'tech-user-456', role: 'TECHNICIAN' };
  const reporterAuthContext: MaintenanceAuthContext = { userId: 'customer-user-123', role: 'CUSTOMER' };

  // Reporter sees complete notes on their own case
  const reporterHistView = projectSafeAssignmentHistory(crossUserHistory, reporterAuthContext, true);
  assert(reporterHistView.notes === 'Customer gate code 5566, call 09123334455 before arrival', 'Reporter sees full assignment history notes');
  assert(reporterHistView.assignedBy === 'dispatcher-user-88', 'Reporter sees true assignedBy identity');

  // Assigned technician receives masked note for cross-user dispatch
  const techHistView = projectSafeAssignmentHistory(crossUserHistory, techAuthContext, false);
  assert(techHistView.notes === 'Status transition: ASSIGNED', 'Technician receives safe generic status transition note for cross-user dispatch');
  assert(!techHistView.notes?.includes('5566') && !techHistView.notes?.includes('09123334455'), 'Cross-user notes masked from technician');
  assert(techHistView.assignedBy === 'DISPATCHER', 'Dispatcher user identity masked to generic role');

  // Technician sees own authored history notes verbatim
  const techOwnHistory: MaintenanceAssignmentHistory = {
    id: 'hist-priv-2',
    maintenanceCaseId: 'case-test-uuid-001',
    technicianId: 'tech-user-456',
    organizationId: 'org-partner-01',
    assignedBy: 'tech-user-456',
    assignedAt: '2026-10-15T08:30:00.000Z',
    status: 'ACCEPTED',
    notes: 'Accepted assignment and loaded replacement fuse into vehicle'
  };
  const techOwnHistView = projectSafeAssignmentHistory(techOwnHistory, techAuthContext, false);
  assert(techOwnHistView.notes === 'Accepted assignment and loaded replacement fuse into vehicle', 'Technician sees own authored notes verbatim');
  assert(techOwnHistView.assignedBy === 'tech-user-456', 'Technician sees own user ID on own authored history');

  // ---------------------------------------------------------------------------
  // 7. Actual Adapter Behavior & Database Unavailable Errors
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Actual Adapter Behavior & Database Unavailable Errors ---');

  // Unauthenticated caller on actual adapter methods
  let threwUnauthGet = false;
  try {
    await maintenancePostgresAdapter.getCaseById('some-id', undefined as any);
  } catch (err: any) {
    threwUnauthGet = err instanceof MaintenanceAuthError;
  }
  assert(threwUnauthGet, 'adapter.getCaseById rejects unauthenticated caller with MaintenanceAuthError');

  let threwUnauthList = false;
  try {
    await maintenancePostgresAdapter.listCases({ reportedBy: 'cust-1' }, undefined as any);
  } catch (err: any) {
    threwUnauthList = err instanceof MaintenanceAuthError;
  }
  assert(threwUnauthList, 'adapter.listCases rejects unauthenticated caller with MaintenanceAuthError');

  let threwUnauthHist = false;
  try {
    await maintenancePostgresAdapter.getAssignmentHistories('some-id', undefined as any);
  } catch (err: any) {
    threwUnauthHist = err instanceof MaintenanceAuthError;
  }
  assert(threwUnauthHist, 'adapter.getAssignmentHistories rejects unauthenticated caller with MaintenanceAuthError');

  // Empty ID on getCaseById returns null without querying DB
  const nullIdResult = await maintenancePostgresAdapter.getCaseById('   ', customerAuth);
  assert(nullIdResult === null, 'adapter.getCaseById with empty whitespace ID safely returns null');

  // Empty ID on getAssignmentHistories returns [] without querying DB
  const emptyHistResult = await maintenancePostgresAdapter.getAssignmentHistories('   ', customerAuth);
  assert(Array.isArray(emptyHistResult) && emptyHistResult.length === 0, 'adapter.getAssignmentHistories with empty ID returns empty array');

  // Spoofed admin on listCases rejected before DB call
  let threwSpoofedList = false;
  try {
    await maintenancePostgresAdapter.listCases({}, { userId: 'attacker', role: 'ADMIN', isAdmin: true });
  } catch (err: any) {
    threwSpoofedList = err instanceof MaintenanceAccessDeniedError;
  }
  assert(threwSpoofedList, 'adapter.listCases rejects spoofed admin unscoped query with MaintenanceAccessDeniedError');

  // When PostgreSQL is not available in environment:
  let threwDbUnavailableGet = false;
  try {
    await maintenancePostgresAdapter.getCaseById('some-case-id', customerAuth);
  } catch (err: any) {
    threwDbUnavailableGet = err instanceof PostgresUnavailableError;
  }
  assert(threwDbUnavailableGet, 'getCaseById throws PostgresUnavailableError when DB pool unavailable');

  let threwDbUnavailableList = false;
  try {
    await maintenancePostgresAdapter.listCases({ reportedBy: 'customer-user-123' }, customerAuth);
  } catch (err: any) {
    threwDbUnavailableList = err instanceof PostgresUnavailableError;
  }
  assert(threwDbUnavailableList, 'listCases throws PostgresUnavailableError when DB pool unavailable');

  let threwDbUnavailableHist = false;
  try {
    await maintenancePostgresAdapter.getAssignmentHistories('some-case-id', customerAuth);
  } catch (err: any) {
    threwDbUnavailableHist = err instanceof PostgresUnavailableError;
  }
  assert(threwDbUnavailableHist, 'getAssignmentHistories throws PostgresUnavailableError when DB pool unavailable');

  // ---------------------------------------------------------------------------
  // 8. Dedicated Title PII Neutralization Regression Suite (Blocker 1)
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Dedicated Title PII Neutralization Tests (Blocker 1) ---');

  const sensitiveTitles = [
    { title: 'Inverter failure at Apt 4B call 09123456789 Gate Code 1234 Mr Ahmadi', cat: 'CORRECTIVE', equip: 'INVERTER', code: 'MNT-001' },
    { title: 'شماره تماس 09129998877 کد ملی 0019876543 آدرس زعفرانیه پلاک ۴', cat: 'PREVENTIVE', equip: 'PANEL', code: 'MNT-002' },
    { title: 'Emergency shutdown contact Mrs Alavi 09351234567 pin 9999', cat: 'EMERGENCY', equip: 'BATTERY', code: 'MNT-003' },
    { title: 'Routine inspection for Mr Hosseini at Tehran North Blvd Apt 12', cat: 'INSPECTION', equip: 'TRANSFORMER', code: 'MNT-004' }
  ];

  for (const item of sensitiveTitles) {
    const rawCaseWithPiiTitle: MaintenanceCase = {
      ...baseCase,
      title: item.title,
      category: item.cat,
      equipmentType: item.equip,
      maintenanceCode: item.code
    };
    const projected = projectTechnicalAllowlistCase(rawCaseWithPiiTitle);
    const expectedLabel = formatTechnicalDisplayTitle(item.cat, item.equip, item.code);
    assert(projected.title === expectedLabel, `Safe display label generated for category ${item.cat}`);
    assert(!projected.title.includes('0912') && !projected.title.includes('0935'), `Phone number stripped from title for ${item.cat}`);
    assert(!projected.title.includes('Ahmadi') && !projected.title.includes('Alavi') && !projected.title.includes('Hosseini'), `Customer name stripped from title for ${item.cat}`);
    assert(!projected.title.includes('1234') && !projected.title.includes('9999'), `Access PIN stripped from title for ${item.cat}`);
    assert(!projected.title.includes('زعفرانیه') && !projected.title.includes('Tehran'), `Address stripped from title for ${item.cat}`);
  }

  // Direct formatTechnicalDisplayTitle coverage across categories
  assert(formatTechnicalDisplayTitle('CORRECTIVE', 'INVERTER', 'MNT-100') === 'Corrective Maintenance — INVERTER [MNT-100]', 'formatTechnicalDisplayTitle CORRECTIVE');
  assert(formatTechnicalDisplayTitle('PREVENTIVE', 'PANEL', 'MNT-101') === 'Preventive Service — PANEL [MNT-101]', 'formatTechnicalDisplayTitle PREVENTIVE');
  assert(formatTechnicalDisplayTitle('PREDICTIVE', 'BATTERY') === 'Predictive Service — BATTERY', 'formatTechnicalDisplayTitle PREDICTIVE');
  assert(formatTechnicalDisplayTitle('EMERGENCY', undefined, 'MNT-102') === 'Emergency Intervention — SYSTEM [MNT-102]', 'formatTechnicalDisplayTitle EMERGENCY default system');
  assert(formatTechnicalDisplayTitle('INSPECTION') === 'Routine Inspection — SYSTEM', 'formatTechnicalDisplayTitle INSPECTION default');
  assert(formatTechnicalDisplayTitle('UPGRADE') === 'System Upgrade — SYSTEM', 'formatTechnicalDisplayTitle UPGRADE default');
  assert(formatTechnicalDisplayTitle('UNKNOWN_CUSTOM') === 'Technical Service — SYSTEM', 'formatTechnicalDisplayTitle fallback');

  // DEFECT 2 FIX NEGATIVE TESTS: Untrusted Technical Label Inputs
  // 1. Untrusted equipmentType containing customer PII or arbitrary text
  const piiEquipTitle = formatTechnicalDisplayTitle('CORRECTIVE', 'INVERTER 09121112233 Gate 4455', 'MNT-100');
  assert(piiEquipTitle === 'Corrective Maintenance — EQUIPMENT [MNT-100]', 'Untrusted equipmentType with PII falls back to safe EQUIPMENT label');
  assert(!piiEquipTitle.includes('09121112233'), 'Customer phone number stripped from equipmentType');
  assert(!piiEquipTitle.includes('4455'), 'Gate code stripped from equipmentType');

  const xssEquipTitle = formatTechnicalDisplayTitle('PREVENTIVE', 'PANEL <script>alert(1)</script>', 'MNT-101');
  assert(xssEquipTitle === 'Preventive Service — EQUIPMENT [MNT-101]', 'Malformed equipmentType with script tags falls back to EQUIPMENT');

  // 2. Untrusted category containing customer PII or arbitrary SQL injection
  const piiCategoryTitle = formatTechnicalDisplayTitle('CORRECTIVE 09121112233', 'PANEL', 'MNT-102');
  assert(piiCategoryTitle === 'Technical Service — PANEL [MNT-102]', 'Untrusted category with PII falls back to safe Technical Service label');
  assert(!piiCategoryTitle.includes('09121112233'), 'Customer phone number stripped from category');

  const sqlCategoryTitle = formatTechnicalDisplayTitle("CORRECTIVE'; DROP TABLE cases;--", 'BATTERY', 'MNT-103');
  assert(sqlCategoryTitle === 'Technical Service — BATTERY [MNT-103]', 'SQL injection attempt in category falls back to Technical Service');

  // 3. Untrusted or malformed maintenanceCode containing customer PII or invalid characters
  const piiCodeTitle = formatTechnicalDisplayTitle('CORRECTIVE', 'INVERTER', 'MNT-01 call 09121112233');
  assert(piiCodeTitle === 'Corrective Maintenance — INVERTER', 'Malformed maintenanceCode with spaces and PII is strictly omitted');
  assert(!piiCodeTitle.includes('['), 'Bracketed code omitted when maintenanceCode fails validation');
  assert(!piiCodeTitle.includes('09121112233'), 'Customer phone number stripped from maintenanceCode');

  const overflowCode = 'MNT-CODE-LONGER-THAN-THIRTY-CHARS-OVERFLOW-TEST';
  const overflowCodeTitle = formatTechnicalDisplayTitle('EMERGENCY', 'GENERATOR', overflowCode);
  assert(overflowCodeTitle === 'Emergency Intervention — GENERATOR', 'Oversized maintenanceCode exceeding 30 characters is strictly omitted');

  // 4. Approved label dictionary mappings verification
  assert(APPROVED_EQUIPMENT_LABELS['INVERTER'] === 'INVERTER', 'APPROVED_EQUIPMENT_LABELS INVERTER mapped');
  assert(APPROVED_EQUIPMENT_LABELS['SOLAR_PANEL'] === 'PANEL', 'APPROVED_EQUIPMENT_LABELS SOLAR_PANEL mapped to PANEL');
  assert(APPROVED_EQUIPMENT_LABELS['STORAGE'] === 'BATTERY', 'APPROVED_EQUIPMENT_LABELS STORAGE mapped to BATTERY');
  assert(APPROVED_EQUIPMENT_LABELS['GENSET'] === 'GENSET', 'APPROVED_EQUIPMENT_LABELS GENSET mapped');
  assert(APPROVED_EQUIPMENT_LABELS['STATIONARY_GENSET'] === 'STATIONARY GENSET', 'APPROVED_EQUIPMENT_LABELS STATIONARY_GENSET mapped');
  assert(APPROVED_EQUIPMENT_LABELS['PORTABLE_GENERATOR'] === 'PORTABLE GENERATOR', 'APPROVED_EQUIPMENT_LABELS PORTABLE_GENERATOR mapped');
  assert(APPROVED_CATEGORY_LABELS['CORRECTIVE'] === 'Corrective Maintenance', 'APPROVED_CATEGORY_LABELS CORRECTIVE mapped');
  assert(APPROVED_CATEGORY_LABELS['PREVENTIVE'] === 'Preventive Service', 'APPROVED_CATEGORY_LABELS PREVENTIVE mapped');
  assert(APPROVED_CATEGORY_LABELS['EMERGENCY'] === 'Emergency Intervention', 'APPROVED_CATEGORY_LABELS EMERGENCY mapped');
  assert(APPROVED_CATEGORY_LABELS['INSPECTION'] === 'Routine Inspection', 'APPROVED_CATEGORY_LABELS INSPECTION mapped');
  assert(APPROVED_CATEGORY_LABELS['PREDICTIVE'] === 'Predictive Service', 'APPROVED_CATEGORY_LABELS PREDICTIVE mapped');
  assert(APPROVED_CATEGORY_LABELS['UPGRADE'] === 'System Upgrade', 'APPROVED_CATEGORY_LABELS UPGRADE mapped');
  assert(APPROVED_CATEGORY_LABELS['OTHER'] === 'Technical Service', 'APPROVED_CATEGORY_LABELS OTHER mapped');

  // 5. Verification that projectAcceptedTechnicianCase preserves necessary operational fields
  const sampleAcceptedCase: MaintenanceCase = {
    ...baseCase,
    title: 'Customer stated short circuit',
    description: 'Detailed operational diagnosis: replace fuse and test current',
    closureNotes: 'Operational completion confirmed with inverter test run',
    resolutionSummary: 'Replaced 50A fuse and recalibrated MPPT controller',
    rootCause: 'Grid overvoltage spike damaged upstream branch fuse',
    actionsTaken: [{ note: 'Tested resistance', actionType: 'DIAGNOSTIC' }]
  };
  const projectedAccepted = projectAcceptedTechnicianCase(sampleAcceptedCase);
  assert(projectedAccepted.description === 'Detailed operational diagnosis: replace fuse and test current', 'projectAcceptedTechnicianCase preserves operational description');
  assert(projectedAccepted.closureNotes === 'Operational completion confirmed with inverter test run', 'projectAcceptedTechnicianCase preserves operational closureNotes');
  assert(projectedAccepted.resolutionSummary === 'Replaced 50A fuse and recalibrated MPPT controller', 'projectAcceptedTechnicianCase preserves operational resolutionSummary');
  assert(projectedAccepted.rootCause === 'Grid overvoltage spike damaged upstream branch fuse', 'projectAcceptedTechnicianCase preserves operational rootCause');
  assert(projectedAccepted.actionsTaken?.length === 1 && projectedAccepted.actionsTaken[0].note === 'Tested resistance', 'projectAcceptedTechnicianCase preserves actionsTaken');


  // ---------------------------------------------------------------------------
  // 9. Dedicated Nested Data Allowlist Tests (Blocker 2)
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Dedicated Nested Data Allowlist Tests (Blocker 2) ---');

  // sanitizeAcceptedAttachment unit tests with malicious arbitrary properties
  const maliciousAttachment: any = {
    id: 'att-mal-01',
    maintenanceCaseId: 'case-99',
    name: 'roof.jpg',
    type: 'PHOTO',
    url: 'https://cdn.example.com/roof.jpg',
    data: 'RAW_BINARY_DATA_BUFFER',
    storageKey: 's3://internal-credentials/bucket/roof.jpg',
    storageProvider: 'S3_COMPATIBLE',
    checksumSha256: 'deadbeef12345678',
    uploadedBy: 'customer-secret-id',
    uploadedAt: '2026-10-15T10:00:00.000Z',
    sizeBytes: 2048,
    mimeType: 'image/jpeg',
    status: 'PROCESSED',
    arbitraryBackdoorField: 'malicious_content',
    extractedData: {
      customerPhone: '09121112233',
      phone: '09121112233',
      customerName: 'John Doe',
      nationalId: '1234567890',
      address: 'Private Villa 4',
      extractedDetails: { gatePin: '7788', alarmCode: '1122' },
      internalNotes: 'VIP client, confidential billing',
      rawAiMetadata: { model: 'gpt-ocr', confidence: 0.99 },
      hotspotCelsius: 82.5,
      temperature: 45.2,
      voltage: 380,
      current: 16.5,
      kwhTotal: 1250
    }
  };

  const cleanAttachment = sanitizeAcceptedAttachment(maliciousAttachment);
  assert(cleanAttachment.id === 'att-mal-01', 'sanitizeAcceptedAttachment preserves attachment id');
  assert(cleanAttachment.name === 'roof.jpg', 'sanitizeAcceptedAttachment preserves attachment name');
  assert(cleanAttachment.url === 'https://cdn.example.com/roof.jpg', 'sanitizeAcceptedAttachment preserves url');
  assert(cleanAttachment.uploadedBy === 'SYSTEM_VERIFIED', 'sanitizeAcceptedAttachment masks uploader identity');
  assert((cleanAttachment as any).data === undefined, 'sanitizeAcceptedAttachment strips raw data buffer');
  assert((cleanAttachment as any).storageKey === undefined, 'sanitizeAcceptedAttachment strips storageKey');
  assert((cleanAttachment as any).storageProvider === undefined, 'sanitizeAcceptedAttachment strips storageProvider');
  assert((cleanAttachment as any).checksumSha256 === undefined, 'sanitizeAcceptedAttachment strips checksumSha256');
  assert((cleanAttachment as any).arbitraryBackdoorField === undefined, 'sanitizeAcceptedAttachment strips arbitrary unknown fields');
  assert(cleanAttachment.extractedData?.customerPhone === undefined, 'sanitizeAcceptedAttachment strips customerPhone');
  assert(cleanAttachment.extractedData?.customerName === undefined, 'sanitizeAcceptedAttachment strips customerName');
  assert(cleanAttachment.extractedData?.nationalId === undefined, 'sanitizeAcceptedAttachment strips nationalId');
  assert(cleanAttachment.extractedData?.address === undefined, 'sanitizeAcceptedAttachment strips address');
  assert(cleanAttachment.extractedData?.extractedDetails === undefined, 'sanitizeAcceptedAttachment strips extractedDetails');
  assert(cleanAttachment.extractedData?.internalNotes === undefined, 'sanitizeAcceptedAttachment strips internalNotes');
  assert(cleanAttachment.extractedData?.rawAiMetadata === undefined, 'sanitizeAcceptedAttachment strips rawAiMetadata');
  assert(cleanAttachment.extractedData?.hotspotCelsius === 82.5, 'sanitizeAcceptedAttachment preserves hotspotCelsius telemetry');
  assert(cleanAttachment.extractedData?.voltage === 380, 'sanitizeAcceptedAttachment preserves voltage telemetry');
  assert(cleanAttachment.extractedData?.temperature === 45.2, 'sanitizeAcceptedAttachment preserves temperature telemetry');
  assert(cleanAttachment.extractedData?.current === 16.5, 'sanitizeAcceptedAttachment preserves current telemetry');
  assert(cleanAttachment.extractedData?.kwhTotal === 1250, 'sanitizeAcceptedAttachment preserves kwhTotal telemetry');

  // sanitizeSparePart unit tests
  const maliciousPart: any = {
    partName: 'Inverter Fuse 50A',
    partNumber: 'FUSE-50A-X',
    quantity: 2,
    costIrr: 1200000,
    replacedComponentId: 'comp-01',
    costUsdWholesale: 10,
    distributorSupplierId: 'SUP-SECRET-99'
  };
  const cleanPart = sanitizeSparePart(maliciousPart);
  assert(cleanPart.partName === 'Inverter Fuse 50A', 'sanitizeSparePart preserves partName');
  assert(cleanPart.quantity === 2 && cleanPart.costIrr === 1200000, 'sanitizeSparePart preserves quantity and safe Rial cost');
  assert((cleanPart as any).costUsdWholesale === undefined, 'sanitizeSparePart strips costUsdWholesale');
  assert((cleanPart as any).distributorSupplierId === undefined, 'sanitizeSparePart strips distributorSupplierId');

  // sanitizePostMaintenanceCheck unit tests
  const rawPostCheck: any = {
    status: 'IMPROVED',
    preGenerationKwh: 120,
    postGenerationKwh: 145,
    evaluatedAt: '2026-10-15T12:00:00.000Z',
    notes: 'Inverter output normalized',
    internalCustomerCreditScore: 780
  };
  const cleanPostCheck = sanitizePostMaintenanceCheck(rawPostCheck);
  assert(cleanPostCheck?.status === 'IMPROVED', 'sanitizePostMaintenanceCheck preserves status');
  assert(cleanPostCheck?.preGenerationKwh === 120 && cleanPostCheck?.postGenerationKwh === 145, 'sanitizePostMaintenanceCheck preserves generation kWh metrics');
  assert((cleanPostCheck as any)?.internalCustomerCreditScore === undefined, 'sanitizePostMaintenanceCheck strips internal properties');

  // ---------------------------------------------------------------------------
  // 10. Dedicated List Cases Acceptance History & Batch Evaluation (Defect 1)
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Dedicated List Cases Acceptance History & Batch Evaluation (Defect 1) ---');

  // Setup cases for evaluateAndProjectCasesForCaller test
  const acceptedCaseId = 'case-list-acc-01';
  const unacceptedCaseId = 'case-list-unacc-02';
  const cancelledCaseId = 'case-list-canc-03';
  const closedCaseId = 'case-list-clos-04';
  const recycledCaseId = 'case-list-recyc-05';

  const caseAccepted: MaintenanceCase = {
    ...baseCase,
    id: acceptedCaseId,
    status: 'IN_PROGRESS',
    assignedTechnicianId: techAuthContext.userId,
    contactName: 'Customer Ali',
    contactPhone: '09123456789',
    description: 'Operational inverter repair in progress',
    title: 'Customer provided title for inverter'
  };

  const caseUnaccepted: MaintenanceCase = {
    ...baseCase,
    id: unacceptedCaseId,
    status: 'ASSIGNED',
    assignedTechnicianId: techAuthContext.userId,
    contactName: 'Customer Sara',
    contactPhone: '09129876543',
    description: 'Pending dispatch review',
    title: 'Customer provided title for panel'
  };

  const caseCancelled: MaintenanceCase = {
    ...baseCase,
    id: cancelledCaseId,
    status: 'CANCELLED',
    assignedTechnicianId: techAuthContext.userId,
    contactName: 'Customer Reza',
    contactPhone: '09121113333',
    description: 'Cancelled due to customer request',
    title: 'Customer provided title for cancelled'
  };

  const caseClosed: MaintenanceCase = {
    ...baseCase,
    id: closedCaseId,
    status: 'CLOSED',
    assignedTechnicianId: techAuthContext.userId,
    contactName: 'Customer Maryam',
    contactPhone: '09124445555',
    description: 'Closed successfully last week',
    title: 'Customer provided title for closed'
  };

  const caseRecycled: MaintenanceCase = {
    ...baseCase,
    id: recycledCaseId,
    status: 'IN_PROGRESS',
    assignedTechnicianId: techAuthContext.userId,
    contactName: 'Customer Kaveh',
    contactPhone: '09127778888',
    description: 'Recycled cycle 3 assignment',
    title: 'Customer provided title for recycled'
  };

  // Histories lookup map
  const mockHistoriesMap = new Map<string, MaintenanceAssignmentHistory[]>();

  // Accepted case has valid ASSIGNED -> ACCEPTED history
  mockHistoriesMap.set(acceptedCaseId, [
    {
      id: 'h-acc-1',
      maintenanceCaseId: acceptedCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: 'dispatcher-1',
      assignedAt: '2026-10-10T08:00:00.000Z',
      status: 'ASSIGNED'
    },
    {
      id: 'h-acc-2',
      maintenanceCaseId: acceptedCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: techAuthContext.userId,
      assignedAt: '2026-10-10T08:15:00.000Z',
      status: 'ACCEPTED'
    }
  ]);

  // Unaccepted case only has ASSIGNED history
  mockHistoriesMap.set(unacceptedCaseId, [
    {
      id: 'h-unacc-1',
      maintenanceCaseId: unacceptedCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: 'dispatcher-1',
      assignedAt: '2026-10-11T09:00:00.000Z',
      status: 'ASSIGNED'
    }
  ]);

  // Cancelled and Closed cases have ACCEPTED history from earlier
  mockHistoriesMap.set(cancelledCaseId, [
    {
      id: 'h-canc-1',
      maintenanceCaseId: cancelledCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: 'dispatcher-1',
      assignedAt: '2026-10-09T08:00:00.000Z',
      status: 'ASSIGNED'
    },
    {
      id: 'h-canc-2',
      maintenanceCaseId: cancelledCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: techAuthContext.userId,
      assignedAt: '2026-10-09T08:30:00.000Z',
      status: 'ACCEPTED'
    }
  ]);

  mockHistoriesMap.set(closedCaseId, [
    {
      id: 'h-clos-1',
      maintenanceCaseId: closedCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: 'dispatcher-1',
      assignedAt: '2026-10-08T08:00:00.000Z',
      status: 'ASSIGNED'
    },
    {
      id: 'h-clos-2',
      maintenanceCaseId: closedCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: techAuthContext.userId,
      assignedAt: '2026-10-08T08:20:00.000Z',
      status: 'ACCEPTED'
    }
  ]);

  // Recycled case has A (cycle 1 accepted) -> B (cycle 2 re-assigned to other) -> A (cycle 3 re-assigned, not yet accepted)
  mockHistoriesMap.set(recycledCaseId, [
    {
      id: 'h-rec-1',
      maintenanceCaseId: recycledCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: techAuthContext.userId,
      assignedAt: '2026-10-01T08:00:00.000Z',
      status: 'ACCEPTED'
    },
    {
      id: 'h-rec-2',
      maintenanceCaseId: recycledCaseId,
      technicianId: 'other-tech-id-999',
      assignedBy: 'dispatcher-1',
      assignedAt: '2026-10-02T08:00:00.000Z',
      status: 'ASSIGNED'
    },
    {
      id: 'h-rec-3',
      maintenanceCaseId: recycledCaseId,
      technicianId: techAuthContext.userId,
      assignedBy: 'dispatcher-1',
      assignedAt: '2026-10-03T08:00:00.000Z',
      status: 'ASSIGNED'
    }
  ]);

  const projectedBatch = evaluateAndProjectCasesForCaller(
    [caseAccepted, caseUnaccepted, caseCancelled, caseClosed, caseRecycled],
    techAuthContext,
    mockHistoriesMap
  );

  assert(projectedBatch.length === 5, 'evaluateAndProjectCasesForCaller returns all authorized cases');

  // Check case 1: accepted
  const pAcc = projectedBatch.find(c => c.id === acceptedCaseId);
  assert(pAcc !== undefined, 'Accepted case present in projected list');
  assert(pAcc?.contactName === 'Customer Ali', 'Accepted technician receives authorized contactName in list query');
  assert(pAcc?.contactPhone === '09123456789', 'Accepted technician receives authorized contactPhone in list query');
  assert(pAcc?.description === 'Operational inverter repair in progress', 'Accepted technician receives authorized description in list query');
  assert(pAcc?.title === 'Customer provided title for inverter', 'Accepted technician receives case title');

  // Check case 2: unaccepted
  const pUnacc = projectedBatch.find(c => c.id === unacceptedCaseId);
  assert(pUnacc !== undefined, 'Unaccepted case present in projected list');
  assert(pUnacc?.contactName === undefined, 'Unaccepted technician has contactName masked in list query');
  assert(pUnacc?.contactPhone === undefined, 'Unaccepted technician has contactPhone masked in list query');
  assert(pUnacc?.description === '', 'Unaccepted technician has description masked in list query');
  assert(pUnacc?.title === formatTechnicalDisplayTitle(caseUnaccepted.category, caseUnaccepted.equipmentType, caseUnaccepted.maintenanceCode), 'Unaccepted technician receives safe allowlist title');

  // Check case 3: cancelled
  const pCanc = projectedBatch.find(c => c.id === cancelledCaseId);
  assert(pCanc !== undefined, 'Cancelled case present in projected list');
  assert(pCanc?.contactName === undefined, 'Cancelled case has contactName masked in list query');
  assert(pCanc?.contactPhone === undefined, 'Cancelled case has contactPhone masked in list query');
  assert(pCanc?.description === '', 'Cancelled case has description masked in list query');

  // Check case 4: closed
  const pClos = projectedBatch.find(c => c.id === closedCaseId);
  assert(pClos !== undefined, 'Closed case present in projected list');
  assert(pClos?.contactName === undefined, 'Closed case has contactName masked in list query');
  assert(pClos?.contactPhone === undefined, 'Closed case has contactPhone masked in list query');
  assert(pClos?.description === '', 'Closed case has description masked in list query');

  // Check case 5: recycled A -> B -> A cycle 3
  const pRecyc = projectedBatch.find(c => c.id === recycledCaseId);
  assert(pRecyc !== undefined, 'Recycled case present in projected list');
  assert(pRecyc?.contactName === undefined, 'Historical cycle 1 acceptance cannot authorize cycle 3 in list query: contactName masked');
  assert(pRecyc?.contactPhone === undefined, 'Historical cycle 1 acceptance cannot authorize cycle 3 in list query: contactPhone masked');
  assert(pRecyc?.description === '', 'Historical cycle 1 acceptance cannot authorize cycle 3 in list query: description masked');

  // Check reporter query receives full case data
  const reporterProjected = evaluateAndProjectCasesForCaller(
    [caseAccepted],
    reporterAuthContext,
    mockHistoriesMap
  );
  assert(reporterProjected[0]?.contactName === 'Customer Ali', 'Reporter receives complete unmasked contact data');
  assert(reporterProjected[0]?.description === 'Operational inverter repair in progress', 'Reporter receives full description');

  // Test maintenancePostgresAdapter.listCases with mock database
  const mockPgCases = [
    {
      id: acceptedCaseId,
      maintenanceCode: 'MNT-001',
      caseNumber: 'CASE-001',
      projectId: 'PRJ-1',
      assetId: 'ASSET-01',
      equipmentType: 'INVERTER',
      category: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      title: 'Untrusted title',
      description: 'Replace faulty diode',
      reportedBy: 'cust-1',
      reportedAt: '2026-10-10T08:00:00.000Z',
      contactName: 'Customer Ali',
      contactPhone: '09123456789',
      assignedTechnicianId: techAuthContext.userId,
      assignedTechnicianName: 'Tech Person',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-10T08:30:00.000Z'
    },
    {
      id: unacceptedCaseId,
      maintenanceCode: 'MNT-002',
      caseNumber: 'CASE-002',
      projectId: 'PRJ-1',
      assetId: 'ASSET-02',
      equipmentType: 'PANEL',
      category: 'PREVENTIVE',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      title: 'Untrusted title 2',
      description: 'Routine check',
      reportedBy: 'cust-1',
      reportedAt: '2026-10-11T09:00:00.000Z',
      contactName: 'Customer Sara',
      contactPhone: '09129876543',
      assignedTechnicianId: techAuthContext.userId,
      assignedTechnicianName: 'Tech Person',
      createdAt: '2026-10-11T09:00:00.000Z',
      updatedAt: '2026-10-11T09:00:00.000Z'
    },
    {
      id: closedCaseId,
      maintenanceCode: 'MNT-003',
      caseNumber: 'CASE-003',
      projectId: 'PRJ-1',
      assetId: 'ASSET-03',
      equipmentType: 'BATTERY',
      category: 'PREDICTIVE',
      priority: 'LOW',
      status: 'CLOSED',
      title: 'Untrusted title 3',
      description: 'Replaced cells',
      reportedBy: 'cust-1',
      reportedAt: '2026-10-08T08:00:00.000Z',
      contactName: 'Customer Maryam',
      contactPhone: '09124445555',
      assignedTechnicianId: techAuthContext.userId,
      assignedTechnicianName: 'Tech Person',
      createdAt: '2026-10-08T08:00:00.000Z',
      updatedAt: '2026-10-08T12:00:00.000Z'
    }
  ];

  const mockPgHistories = [
    {
      id: 'h-acc-1',
      maintenanceCaseId: acceptedCaseId,
      technicianId: techAuthContext.userId,
      organizationId: 'org-1',
      assignedBy: 'disp-1',
      assignedAt: '2026-10-10T08:00:00.000Z',
      status: 'ASSIGNED',
      notes: null
    },
    {
      id: 'h-acc-2',
      maintenanceCaseId: acceptedCaseId,
      technicianId: techAuthContext.userId,
      organizationId: 'org-1',
      assignedBy: techAuthContext.userId,
      assignedAt: '2026-10-10T08:15:00.000Z',
      status: 'ACCEPTED',
      notes: 'Accepted'
    },
    {
      id: 'h-unacc-1',
      maintenanceCaseId: unacceptedCaseId,
      technicianId: techAuthContext.userId,
      organizationId: 'org-1',
      assignedBy: 'disp-1',
      assignedAt: '2026-10-11T09:00:00.000Z',
      status: 'ASSIGNED',
      notes: null
    }
  ];

  let queriedHistoryTable = false;
  const mockDbSuccess = {
    select: () => ({
      from: (table: any) => ({
        where: (cond: any) => ({
          limit: (l: number) => ({
            offset: (o: number) => Promise.resolve(mockPgCases)
          }),
          orderBy: (order: any) => {
            queriedHistoryTable = true;
            return Promise.resolve(mockPgHistories);
          }
        })
      })
    })
  };

  const listResults = await maintenancePostgresAdapter.listCases(
    { assignedTechnicianId: techAuthContext.userId },
    techAuthContext,
    mockDbSuccess
  );

  assert(queriedHistoryTable, 'adapter.listCases executed batched assignment history query for active technician cases');
  assert(listResults.length === 3, 'adapter.listCases returned all 3 cases');

  const lrAcc = listResults.find(c => c.id === acceptedCaseId);
  assert(lrAcc?.contactName === 'Customer Ali', 'adapter.listCases: accepted technician receives authorized contactName');
  assert(lrAcc?.contactPhone === '09123456789', 'adapter.listCases: accepted technician receives authorized contactPhone');
  assert(lrAcc?.description === 'Replace faulty diode', 'adapter.listCases: accepted technician receives operational description');

  const lrUnacc = listResults.find(c => c.id === unacceptedCaseId);
  assert(lrUnacc?.contactName === undefined, 'adapter.listCases: unaccepted technician receives masked contactName');
  assert(lrUnacc?.description === '', 'adapter.listCases: unaccepted technician receives empty description');

  const lrClosed = listResults.find(c => c.id === closedCaseId);
  assert(lrClosed?.contactName === undefined, 'adapter.listCases: closed case permanently masks contactName');
  assert(lrClosed?.description === '', 'adapter.listCases: closed case permanently masks description');

  // Fail-closed test: database error during history batch query throws PostgresUnavailableError
  const mockDbHistError = {
    select: () => ({
      from: (table: any) => ({
        where: (cond: any) => ({
          limit: (l: number) => ({
            offset: (o: number) => Promise.resolve(mockPgCases)
          }),
          orderBy: (order: any) => Promise.reject(new Error('Connection lost'))
        })
      })
    })
  };

  let threwHistDbErr = false;
  try {
    await maintenancePostgresAdapter.listCases(
      { assignedTechnicianId: techAuthContext.userId },
      techAuthContext,
      mockDbHistError
    );
  } catch (err: any) {
    threwHistDbErr = err instanceof PostgresUnavailableError;
  }
  assert(threwHistDbErr, 'adapter.listCases fails closed with PostgresUnavailableError if history batch query fails');

  // Fail-closed test: data integrity error during history batch query throws DataIntegrityError
  const mockDbHistCorrupt = {
    select: () => ({
      from: (table: any) => ({
        where: (cond: any) => ({
          limit: (l: number) => ({
            offset: (o: number) => Promise.resolve(mockPgCases)
          }),
          orderBy: (order: any) => Promise.resolve([
            { id: 'corrupt-hist', maintenance_case_id: '', technician_id: '' }
          ])
        })
      })
    })
  };

  let threwHistCorruptErr = false;
  try {
    await maintenancePostgresAdapter.listCases(
      { assignedTechnicianId: techAuthContext.userId },
      techAuthContext,
      mockDbHistCorrupt
    );
  } catch (err: any) {
    threwHistCorruptErr = err instanceof DataIntegrityError;
  }
  assert(threwHistCorruptErr, 'adapter.listCases fails closed with DataIntegrityError if history record is corrupt');

  console.log('\n================================================================');
  console.log(`PHASE P2-A OFFLINE TEST RESULT: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runOfflineTests().catch(err => {
  console.error('Fatal offline test runner error:', err);
  process.exit(1);
});
