import crypto from 'crypto';
import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { alertService } from './alertService.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { isCaseAssignedToTechnician, areTechnicianIdentitiesEquivalent } from './technicianIdentityService.js';
import {
  MaintenanceCase,
  MaintenanceCaseStatus,
  MaintenanceCasePriority,
  MaintenanceCategory,
  MaintenanceAction,
  SparePartUsage,
  MaintenanceHistorySummary,
  MaintenanceAssignmentHistory
} from '../types/maintenance.js';
import { validateStoredRialAmount } from '../db/index.js';

/**
 * Shared authoritative acceptance validator for the current assignment cycle.
 * Verifies whether the currently assigned technician has formally accepted
 * the CURRENT assignment cycle.
 * 
 * Invariants:
 * 1. Must have an assigned technician.
 * 2. An ACCEPTED record must belong to the currently assigned technician (using symmetric identity equivalence).
 * 3. The ACCEPTED record must belong to the latest assignment cycle (must be after the latest ASSIGNED event
 *    establishing the current technician's assignment).
 * 4. Stale ACCEPTED records from previous assignment cycles (e.g. A -> B -> A) do not authorize the current cycle.
 * 5. Rejection, cancellation, or subsequent reassignment invalidates previous acceptance.
 */
export function hasCurrentCycleAcceptance(
  mCase: { id?: string; assignedTechnicianId?: string | null; status?: string },
  histories?: MaintenanceAssignmentHistory[],
  options?: { requireExecutionStatusForModern?: boolean }
): boolean {
  if (!mCase || !mCase.id || !mCase.assignedTechnicianId) {
    return false;
  }

  // Fail-closed terminal and unassigned status guard:
  // Before evaluating any history records or past acceptances, verify that the case itself
  // is in a legitimate active status that permits active execution and technician authorization.
  let caseStatus = (mCase as any).status;
  if (!caseStatus && mCase.id) {
    const fullCase = maintenanceRepository.getCaseById(mCase.id);
    if (fullCase) {
      caseStatus = fullCase.status;
    }
  }

  const unassignedOrTerminalStatuses: string[] = [
    'CANCELLED',
    'CLOSED',
    'OPEN',
    'DRAFT',
    'DIAGNOSING',
    'AWAITING_ASSIGNMENT'
  ];
  if (caseStatus && unassignedOrTerminalStatuses.includes(caseStatus)) {
    return false;
  }

  const assignedTechId = mCase.assignedTechnicianId;
  const list = histories || maintenanceRepository.getAssignmentHistories(mCase.id) || [];
  if (list.length === 0) {
    return false;
  }

  // Find the index of the latest ASSIGNED event in history
  let latestAssignedIdx = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].status === 'ASSIGNED') {
      latestAssignedIdx = i;
      break;
    }
  }

  if (latestAssignedIdx !== -1) {
    const latestAssigned = list[latestAssignedIdx];
    // The latest assignment event MUST be for the currently assigned technician
    if (!areTechnicianIdentitiesEquivalent(latestAssigned.technicianId, assignedTechId)) {
      return false;
    }

    // Now look for an ACCEPTED event that occurred strictly AFTER latestAssignedIdx
    for (let i = latestAssignedIdx + 1; i < list.length; i++) {
      const h = list[i];
      if (h.status === 'ACCEPTED' && areTechnicianIdentitiesEquivalent(h.technicianId, assignedTechId)) {
        // Ensure no subsequent reassignment, rejection, or cancellation after this acceptance
        const hasSubsequentInvalidation = list.slice(i + 1).some(sub => 
          sub.status === 'ASSIGNED' || sub.status === 'REJECTED' || sub.status === 'CANCELLED'
        );
        if (!hasSubsequentInvalidation) {
          // If execution status is explicitly required for modern cycles (e.g. for technician authorization):
          // The case must have reached an active execution state (IN_PROGRESS, AWAITING_VERIFICATION, etc.)
          // An orphaned ACCEPTED record on an ASSIGNED or SCHEDULED case fails closed.
          if (options?.requireExecutionStatusForModern) {
            const executionStatuses = ['IN_PROGRESS', 'AWAITING_VERIFICATION', 'PENDING_VERIFICATION', 'VERIFIED', 'COMPLETED'];
            if (!caseStatus || !executionStatuses.includes(caseStatus)) {
              return false;
            }
          }
          return true;
        }
      }
    }
    return false;
  }

  // If there are NO 'ASSIGNED' records in history (legacy data),
  // apply strict fail-closed validation:
  // 1. Unambiguous technician identity check & status purity:
  // EVERY record in history must belong strictly to the currently assigned technician.
  // Any record belonging to a different/foreign technician makes the history ambiguous -> fail closed!
  //
  // In a trusted legacy history without ASSIGNED boundaries, EVERY record must strictly be 'ACCEPTED'.
  // Any record with status REJECTED, CANCELLED, or any status other than ACCEPTED
  // renders the legacy history ambiguous or invalid -> fail closed!
  const hasAmbiguityOrInvalidation = list.some(h => 
    !areTechnicianIdentitiesEquivalent(h.technicianId, assignedTechId) ||
    h.status !== 'ACCEPTED'
  );
  if (hasAmbiguityOrInvalidation) {
    return false;
  }

  // 3. Must contain at least one valid ACCEPTED record
  return list.length > 0;
}

/**
 * Validates financial Rial amount.
 * - Rejects undefined, null, boolean, objects, arrays.
 * - Rejects NaN, Infinity.
 * - Rejects negative values.
 * - Rejects non-numeric strings.
 * - Rejects values exceeding MAX_SAFE_INTEGER or 10^13.
 * - Enforces integer-rial rule (rejects fractional/decimal amounts).
 */
export function validateFinancialAmount(value: any, fieldName: string): number {
  if (value === undefined || value === null) {
    throw new Error(`مقدار ${fieldName} الزامی است.`);
  }

  if (typeof value === 'boolean' || (typeof value !== 'number' && typeof value !== 'string')) {
    throw new Error(`نوع داده فیلد ${fieldName} نامعتبر است.`);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new Error(`مقدار ${fieldName} باید یک عدد معتبر باشد.`);
    }
  }

  const num = Number(value);

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error(`مقدار ${fieldName} نامعتبر یا بی‌نهایت است.`);
  }

  if (num < 0) {
    throw new Error(`مقدار ${fieldName} نمی‌تواند منفی باشد.`);
  }

  if (num > Number.MAX_SAFE_INTEGER || num > 1e13) {
    throw new Error(`مقدار ${fieldName} فراتر از حد مجاز محاسبات امن است.`);
  }

  if (!Number.isInteger(num)) {
    throw new Error(`مقدار ${fieldName} بر حسب ریال باید یک عدد صحیح باشد (مبالغ اعشاری ریالی مجاز نیستند).`);
  }

  return num;
}

/**
 * Safely calculates accumulated cost of recorded spare parts in IRR.
 * - Rejects non-array values if defined.
 * - Invariant: Quantity zero produces exactly zero cost (0 * cost = 0, never 1 * cost).
 * - Rejects corrupt stored values (negative, NaN, Infinity, non-integer, boolean, non-numeric strings).
 * - Compatible with legitimate legacy records where quantity was omitted (defaults to 1 unit).
 * - Enforces safe integer bounds on line items and cumulative total (<= 1e14).
 * - Never mutates historical spare-parts records.
 */
export function calculateRecordedPartsCost(spareParts: any[] | undefined | null): number {
  if (spareParts === undefined || spareParts === null) {
    return 0;
  }
  if (!Array.isArray(spareParts)) {
    throw new Error('فهرست قطعات یدکی مصرفی پرونده نامعتبر یا فاسد است.');
  }
  if (spareParts.length === 0) {
    return 0;
  }

  let totalCost = 0;

  for (let i = 0; i < spareParts.length; i++) {
    const p = spareParts[i];
    if (!p || typeof p !== 'object' || Array.isArray(p)) {
      throw new Error(`رکورد قطعه یدکی ردیف ${i + 1} نامعتبر یا فاسد است.`);
    }

    // Evaluate quantity
    let quantity = 1;
    if (p.quantity === undefined || p.quantity === null) {
      // Legitimate legacy records may lack quantity field -> 1 unit
      quantity = 1;
    } else {
      if (typeof p.quantity === 'boolean') {
        throw new Error(`تعداد قطعه یدکی در ردیف ${i + 1} نمی‌تواند مقدار بولی باشد.`);
      }
      if (typeof p.quantity === 'string') {
        const trimmed = p.quantity.trim();
        if (trimmed === '' || !/^-?\d+$/.test(trimmed)) {
          throw new Error(`تعداد قطعه یدکی در ردیف ${i + 1} (${p.quantity}) نامعتبر است.`);
        }
      }
      const qNum = Number(p.quantity);
      if (Number.isNaN(qNum) || !Number.isFinite(qNum) || !Number.isInteger(qNum)) {
        throw new Error(`تعداد قطعه یدکی در ردیف ${i + 1} (${p.quantity}) نامعتبر یا اعشاری است.`);
      }
      if (qNum < 0) {
        throw new Error(`تعداد قطعه یدکی در ردیف ${i + 1} نمی‌تواند منفی باشد.`);
      }
      if (qNum > 100000) {
        throw new Error(`تعداد قطعه یدکی در ردیف ${i + 1} فراتر از حد مجاز است.`);
      }
      quantity = qNum;
    }

    // Evaluate costIrr
    let unitCost = 0;
    if (p.costIrr === undefined || p.costIrr === null) {
      unitCost = 0;
    } else {
      if (typeof p.costIrr === 'boolean') {
        throw new Error(`هزینه واحد قطعه یدکی در ردیف ${i + 1} نمی‌تواند مقدار بولی باشد.`);
      }
      if (typeof p.costIrr === 'string') {
        const trimmed = p.costIrr.trim();
        if (trimmed === '' || !/^-?\d+$/.test(trimmed)) {
          throw new Error(`هزینه واحد قطعه یدکی در ردیف ${i + 1} (${p.costIrr}) نامعتبر است.`);
        }
      }
      const cNum = Number(p.costIrr);
      if (Number.isNaN(cNum) || !Number.isFinite(cNum) || !Number.isInteger(cNum)) {
        throw new Error(`هزینه واحد قطعه یدکی در ردیف ${i + 1} (${p.costIrr}) نامعتبر یا اعشاری است.`);
      }
      if (cNum < 0) {
        throw new Error(`هزینه واحد قطعه یدکی در ردیف ${i + 1} نمی‌تواند منفی باشد.`);
      }
      if (cNum > Number.MAX_SAFE_INTEGER || cNum > 1e13) {
        throw new Error(`هزینه واحد قطعه یدکی در ردیف ${i + 1} فراتر از حد مجاز محاسبات امن است.`);
      }
      unitCost = cNum;
    }

    // Safe multiplication
    const lineCost = quantity * unitCost;
    if (!Number.isSafeInteger(lineCost) || lineCost > 1e14) {
      throw new Error(`هزینه کل قطعه یدکی در ردیف ${i + 1} فراتر از حد مجاز محاسبات امن است.`);
    }

    totalCost += lineCost;
    if (!Number.isSafeInteger(totalCost) || totalCost > 1e14) {
      throw new Error('مجموع هزینه قطعات یدکی فراتر از حد مجاز محاسبات امن است.');
    }
  }

  return totalCost;
}

/**
 * Validates a newly submitted spare-part usage item:
 * - Reject non-object or array.
 * - Require non-empty partName (length <= 200).
 * - Require integer quantity >= 1 (rejects zero quantity, negative quantity, fractional, NaN, Infinity, boolean).
 *   Policy: For newly consumed parts, quantity 0 is prohibited as it has no physical business meaning.
 * - Require non-negative integer Rial costIrr (or 0 if omitted/null).
 * - Safe multiplication bound check.
 */
export function validateSparePartItem(part: any, index: number = 0): SparePartUsage & { clientRequestId?: string } {
  if (!part || typeof part !== 'object' || Array.isArray(part)) {
    throw new Error(`اطلاعات قطعه یدکی در ردیف ${index + 1} نامعتبر است.`);
  }

  if (typeof part.partName !== 'string' || part.partName.trim() === '') {
    throw new Error(`نام قطعه یدکی در ردیف ${index + 1} الزامی است.`);
  }
  const partName = part.partName.trim();
  if (partName.length > 200) {
    throw new Error(`نام قطعه یدکی در ردیف ${index + 1} نمی‌تواند بیش از ۲۰۰ کاراکتر باشد.`);
  }

  if (part.quantity === undefined || part.quantity === null) {
    throw new Error(`تعداد قطعه یدکی (${partName}) الزامی است.`);
  }
  if (typeof part.quantity === 'boolean') {
    throw new Error(`تعداد قطعه یدکی (${partName}) نمی‌تواند مقدار بولی باشد.`);
  }
  if (typeof part.quantity === 'string') {
    const trimmed = part.quantity.trim();
    if (trimmed === '' || !/^-?\d+$/.test(trimmed)) {
      throw new Error(`تعداد قطعه یدکی (${partName}) باید یک عدد صحیح معتبر باشد.`);
    }
  }
  const qNum = Number(part.quantity);
  if (Number.isNaN(qNum) || !Number.isFinite(qNum) || !Number.isInteger(qNum)) {
    throw new Error(`تعداد قطعه یدکی (${partName}) باید یک عدد صحیح معتبر باشد.`);
  }
  if (qNum === 0) {
    throw new Error(`تعداد قطعه یدکی (${partName}) نمی‌تواند صفر باشد (تعداد باید حداقل ۱ باشد).`);
  }
  if (qNum < 0) {
    throw new Error(`تعداد قطعه یدکی (${partName}) نمی‌تواند منفی باشد.`);
  }
  if (qNum > 100000) {
    throw new Error(`تعداد قطعه یدکی (${partName}) فراتر از حد مجاز است.`);
  }

  let unitCost: number | undefined = undefined;
  if (part.costIrr !== undefined && part.costIrr !== null) {
    unitCost = validateFinancialAmount(part.costIrr, `هزینه واحد قطعه یدکی (${partName})`);
  } else {
    unitCost = 0;
  }

  const lineCost = qNum * unitCost;
  if (!Number.isSafeInteger(lineCost) || lineCost > 1e14) {
    throw new Error(`هزینه کل قطعه یدکی (${partName}) فراتر از حد مجاز محاسبات امن است.`);
  }

  const result: SparePartUsage & { clientRequestId?: string } = {
    partName,
    quantity: qNum,
    costIrr: unitCost
  };

  if (part.partNumber && typeof part.partNumber === 'string' && part.partNumber.trim()) {
    result.partNumber = part.partNumber.trim();
  }
  if (part.replacedComponentId && typeof part.replacedComponentId === 'string' && part.replacedComponentId.trim()) {
    result.replacedComponentId = part.replacedComponentId.trim();
  }
  if (part.clientRequestId) {
    result.clientRequestId = validateClientRequestId(part.clientRequestId);
  }

  return result;
}

/**
 * Validates financial consistency of stored maintenance case totals.
 * - Rejects corrupt stored amounts via validateStoredRialAmount.
 * - Fails closed on contradictory stored totals (e.g. laborCost + partsCost !== totalCost).
 * - Fails closed on totalCost !== totalCostIrr divergence.
 * - Fails closed if stored partsCost is less than the calculated recordedPartsCost floor.
 * - Preserves valid sparse legacy records where individual fields may be absent.
 */
export function validateCaseFinancialConsistency(targetCase: {
  laborCost?: any;
  partsCost?: any;
  totalCost?: any;
  totalCostIrr?: any;
  sparePartsUsed?: any[];
}): void {
  const l = validateStoredRialAmount(targetCase.laborCost, 'laborCost');
  const p = validateStoredRialAmount(targetCase.partsCost, 'partsCost');
  const t = validateStoredRialAmount(targetCase.totalCost, 'totalCost');
  const tIrr = validateStoredRialAmount(targetCase.totalCostIrr, 'totalCostIrr');

  // String check: reject whitespace-only or non-numeric strings that might slip past Number()
  for (const [val, name] of [
    [targetCase.laborCost, 'laborCost'],
    [targetCase.partsCost, 'partsCost'],
    [targetCase.totalCost, 'totalCost'],
    [targetCase.totalCostIrr, 'totalCostIrr']
  ] as const) {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '' || !/^-?\d+$/.test(trimmed)) {
        throw new Error(`مقدار ذخیره‌شده ${name} در پرونده (${val}) نامعتبر یا فاسد است.`);
      }
    }
  }

  if (l !== undefined && p !== undefined && t !== undefined) {
    if (l + p !== t) {
      throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: مجموع دستمزد (${l}) و قطعات (${p}) با هزینه کل (${t}) برابر نیست.`);
    }
  }

  if (l !== undefined && p !== undefined && tIrr !== undefined) {
    if (l + p !== tIrr) {
      throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: مجموع دستمزد (${l}) و قطعات (${p}) با هزینه کل ریالی (${tIrr}) برابر نیست.`);
    }
  }

  if (t !== undefined && tIrr !== undefined) {
    if (t !== tIrr) {
      throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: مقدار totalCost (${t}) با totalCostIrr (${tIrr}) مطابقت ندارد.`);
    }
  }

  if (t !== undefined && p !== undefined && t < p) {
    throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: هزینه کل (${t}) کمتر از هزینه قطعات (${p}) است.`);
  }

  if (tIrr !== undefined && p !== undefined && tIrr < p) {
    throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: هزینه کل ریالی (${tIrr}) کمتر از هزینه قطعات (${p}) است.`);
  }

  if (t !== undefined && l !== undefined && t < l) {
    throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: هزینه کل (${t}) کمتر از هزینه دستمزد (${l}) است.`);
  }

  if (tIrr !== undefined && l !== undefined && tIrr < l) {
    throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: هزینه کل ریالی (${tIrr}) کمتر از هزینه دستمزد (${l}) است.`);
  }

  if (Array.isArray(targetCase.sparePartsUsed)) {
    const recordedPartsCost = calculateRecordedPartsCost(targetCase.sparePartsUsed);
    if (p !== undefined && p < recordedPartsCost) {
      throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: هزینه قطعات (${p}) کمتر از بهای قطعات یدکی مصرفی ثبت‌شده (${recordedPartsCost}) است.`);
    }
    if (t !== undefined && t < recordedPartsCost) {
      throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: هزینه کل (${t}) کمتر از بهای قطعات یدکی مصرفی ثبت‌شده (${recordedPartsCost}) است.`);
    }
    if (tIrr !== undefined && tIrr < recordedPartsCost) {
      throw new Error(`تناقض در مبالغ مالی ذخیره‌شده پرونده: هزینه کل ریالی (${tIrr}) کمتر از بهای قطعات یدکی مصرفی ثبت‌شده (${recordedPartsCost}) است.`);
    }
  }
}

/**
 * Validates labor hours:
 * - Must be a non-negative finite number between 0 and 10,000.
 * - Allows fractional hours (e.g. 1.5).
 */
export function validateLaborHours(value: any): number {
  if (value === undefined || value === null) return 0;

  if (typeof value === 'boolean' || (typeof value !== 'number' && typeof value !== 'string')) {
    throw new Error('نوع داده ساعات کارکرد نامعتبر است.');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new Error('مقدار ساعات کارکرد باید عددی معتبر باشد.');
    }
  }

  const num = Number(value);

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error('مقدار ساعات کارکرد نامعتبر یا بی‌نهایت است.');
  }

  if (num < 0) {
    throw new Error('ساعات کارکرد نمی‌تواند منفی باشد.');
  }

  if (num > 10000) {
    throw new Error('ساعات کارکرد نمی‌تواند بیش از ۱۰۰۰۰ ساعت باشد.');
  }

  return num;
}

/**
 * Validates individual action labor hours (hoursSpent):
 * - Must be a finite non-negative number between 0 and 1,000.
 * - Allows fractional hours (e.g. 2.5).
 * - Rejects explicit null, boolean, array, object, NaN, Infinity, negative, and excessive values.
 */
export function validateActionLaborHours(value: any): number {
  if (value === undefined || value === null) {
    throw new Error('مقدار ساعات کارکرد نمی‌تواند خالی یا null باشد.');
  }

  if (typeof value === 'boolean' || (typeof value !== 'number' && typeof value !== 'string')) {
    throw new Error('نوع داده ساعات کارکرد نامعتبر است.');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new Error('مقدار ساعات کارکرد باید عددی معتبر باشد.');
    }
  }

  const num = Number(value);

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error('مقدار ساعات کارکرد نامعتبر یا بی‌نهایت است.');
  }

  if (num < 0) {
    throw new Error('ساعات کارکرد نمی‌تواند منفی باشد.');
  }

  if (num > 1000) {
    throw new Error('ساعات کارکرد یک اقدام نمی‌تواند بیش از ۱۰۰۰ ساعت باشد.');
  }

  return num;
}

/**
 * Validates partsReplaced:
 * - Must be an array of strings.
 * - Trims each string and rejects empty strings.
 * - Max array length: 50. Max item length: 200.
 */
export function validatePartsReplaced(value: any): string[] {
  if (value === undefined || value === null) {
    throw new Error('فهرست قطعات تعویضی نمی‌تواند null باشد.');
  }

  if (!Array.isArray(value)) {
    throw new Error('فهرست قطعات تعویضی باید به صورت آرایه‌ای از رشته‌های متنی باشد.');
  }

  if (value.length > 50) {
    throw new Error('تعداد قطعات تعویضی نمی‌تواند بیش از ۵۰ مورد باشد.');
  }

  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== 'string') {
      throw new Error(`آیتم شماره ${i + 1} در فهرست قطعات تعویضی باید رشته متنی باشد.`);
    }
    const trimmed = item.trim();
    if (trimmed === '') {
      throw new Error(`نام قطعه تعویضی در ردیف ${i + 1} نمی‌تواند خالی باشد.`);
    }
    if (trimmed.length > 200) {
      throw new Error(`نام قطعه تعویضی در ردیف ${i + 1} نمی‌تواند بیش از ۲۰۰ کاراکتر باشد.`);
    }
    result.push(trimmed);
  }

  return result;
}

/**
 * Validates clientRequestId:
 * - Must be a non-empty string between 8 and 128 characters matching /^[A-Za-z0-9_-]+$/.
 */
export function validateClientRequestId(key: any): string | undefined {
  if (key === undefined || key === null) return undefined;

  if (typeof key !== 'string') {
    throw new Error('شناسه درخواست (clientRequestId) باید یک رشته متنی باشد.');
  }

  const trimmed = key.trim();
  if (trimmed === '') return undefined;

  if (trimmed.length < 8 || trimmed.length > 128) {
    throw new Error('طول شناسه درخواست باید بین ۸ تا ۱۲۸ کاراکتر باشد.');
  }

  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new Error('فرمت شناسه درخواست نامعتبر است. تنها کاراکترهای الفبایی-عددی، خط فاصله و زیرخط مجاز هستند.');
  }

  return trimmed;
}

/**
 * Computes canonical payload hash for an action.
 * Excludes server-generated timestamps and IDs.
 */
export function computeActionPayloadHash(payload: {
  actionType: string;
  description: string;
  componentId?: string;
  replacedComponentId?: string;
  newComponentSerial?: string;
  newComponentModel?: string;
  notes?: string;
  laborCost?: number | null;
  partsCost?: number | null;
  costIrr?: number | null;
  laborHours?: number | null;
  hoursSpent?: number | null;
  partsReplaced?: string[] | null;
}): string {
  const hours = payload.hoursSpent !== undefined && payload.hoursSpent !== null
    ? Number(payload.hoursSpent)
    : (payload.laborHours !== undefined && payload.laborHours !== null ? Number(payload.laborHours) : null);

  const parts = Array.isArray(payload.partsReplaced)
    ? payload.partsReplaced.map(p => String(p).trim()).filter(Boolean)
    : null;

  const canonicalObj = {
    actionType: String(payload.actionType || '').trim().toUpperCase(),
    componentId: payload.componentId ? String(payload.componentId).trim() : null,
    costIrr: payload.costIrr !== undefined && payload.costIrr !== null ? Number(payload.costIrr) : null,
    description: String(payload.description || '').trim(),
    laborCost: payload.laborCost !== undefined && payload.laborCost !== null ? Number(payload.laborCost) : null,
    laborHours: hours,
    newComponentModel: payload.newComponentModel ? String(payload.newComponentModel).trim() : null,
    newComponentSerial: payload.newComponentSerial ? String(payload.newComponentSerial).trim() : null,
    notes: payload.notes ? String(payload.notes).trim() : null,
    partsCost: payload.partsCost !== undefined && payload.partsCost !== null ? Number(payload.partsCost) : null,
    partsReplaced: parts,
    replacedComponentId: payload.replacedComponentId ? String(payload.replacedComponentId).trim() : null
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonicalObj)).digest('hex');
}

export const maintenanceCaseService = {
  /**
   * Creates a new maintenance case, linking any specified alerts
   */
  createCase: (
    data: {
      projectId?: string;
      assetId?: string;
      alertIds?: string[];
      componentId?: string;
      equipmentType?: string;
      symptoms?: string[];
      title: string;
      description: string;
      priority?: MaintenanceCasePriority;
      category?: MaintenanceCategory;
      diagnosisId?: string;
      assignedTechnicianId?: string;
      assignedTechnicianName?: string;
      assignedTechnicianPhone?: string;
      scheduledDate?: string;
      contactName?: string;
      contactPhone?: string;
      photos?: string[];
      documents?: string[];
      billDoc?: any;
      attachments?: any[];
    },
    userId: string
  ): MaintenanceCase => {
    let projectId = data.projectId;
    let assetId = data.assetId;
    const isUnregistered = !data.assetId || data.assetId === 'UNREGISTERED' || data.assetId === 'STANDALONE';

    if (!isUnregistered && data.assetId) {
      const asset = assetRepository.getAssetById(data.assetId);
      if (!asset) {
        throw new Error('دارایی انرژی انتخاب شده یافت نشد.');
      }
      projectId = asset.projectId;
      assetId = asset.id;
    } else {
      projectId = projectId || 'CUSTOMER_DIRECT';
      assetId = 'UNREGISTERED';
    }

    const alertIds = data.alertIds || [];

    const initialStatus: MaintenanceCaseStatus = data.assignedTechnicianId ? 'ASSIGNED' : 'OPEN';

    const newCase = maintenanceRepository.createCase({
      projectId: projectId!,
      assetId: assetId!,
      alertIds,
      componentId: data.componentId,
      equipmentType: data.equipmentType,
      symptoms: data.symptoms || [],
      title: data.title,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      status: initialStatus,
      category: data.category || 'CORRECTIVE',
      diagnosisId: data.diagnosisId,
      assignedTechnicianId: data.assignedTechnicianId,
      assignedTechnicianName: data.assignedTechnicianName,
      assignedTechnicianPhone: data.assignedTechnicianPhone,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      scheduledDate: data.scheduledDate,
      photos: data.photos || [],
      documents: data.documents || [],
      billDoc: data.billDoc,
      attachments: data.attachments || [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0,
      reportedBy: userId,
      reportedAt: new Date().toISOString()
    });

    // Mark associated alerts as CASE_CREATED
    for (const alertId of alertIds) {
      const alert = maintenanceRepository.getAlertById(alertId);
      if (alert) {
        maintenanceRepository.updateAlert(alertId, {
          status: 'CASE_CREATED',
          maintenanceCaseId: newCase.id
        });
      }
    }

    // Log project activity if linked to real project
    if (projectId && projectId !== 'CUSTOMER_DIRECT') {
      try {
        projectRepository.addActivity({
          projectId,
          userId,
          type: 'MAINTENANCE_CASE_CREATED',
          description: `ثبت تیکت تعمیرات و نگهداری (${newCase.caseNumber}): ${newCase.title}`
        });
      } catch (e) {
        // ignore
      }
    }

    return newCase;
  },

  /**
   * Transitions case status with strict state machine verification
   */
  transitionCaseStatus: (
    caseId: string,
    newStatus: MaintenanceCaseStatus,
    actorUserId: string,
    payload?: {
      technicianId?: string;
      technicianName?: string;
      technicianPhone?: string;
      scheduledDate?: string;
      closureNotes?: string;
      verificationNotes?: string;
      rejectionReason?: string;
      notes?: string;
      rootCause?: string;
      actionsTaken?: any;
      laborCost?: number | null;
      partsCost?: number | null;
      totalCost?: number | null;
      totalCostIrr?: number;
    }
  ): MaintenanceCase => {
    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) {
      throw new Error('پرونده تعمیراتی مورد نظر یافت نشد.');
    }

    const currentStatus = mCase.status;

    if (currentStatus === newStatus) {
      // If status is ASSIGNED and a different technician is provided in payload,
      // this is a genuine reassignment within ASSIGNED status. Do NOT early-return!
      const isReassignment = newStatus === 'ASSIGNED' &&
        payload?.technicianId &&
        (!mCase.assignedTechnicianId || !areTechnicianIdentitiesEquivalent(mCase.assignedTechnicianId, payload.technicianId));

      const isVerificationUpdate = (newStatus === 'AWAITING_VERIFICATION' || newStatus === 'PENDING_VERIFICATION') &&
        Boolean(payload?.notes || payload?.rootCause || payload?.laborCost !== undefined || payload?.partsCost !== undefined);

      if (!isReassignment && !isVerificationUpdate) {
        return mCase;
      }
    }

    // Cancellation is allowed from any active status
    if (newStatus === 'CANCELLED') {
      if (currentStatus === 'CLOSED') {
        throw new Error('امکان لغو پرونده بسته شده وجود ندارد.');
      }
      if (currentStatus === 'CANCELLED') {
        // Idempotent cancellation: do not create duplicate history or overwrite notes
        return mCase;
      }

      const previousCaseSnapshot: Partial<MaintenanceCase> = {
        ...mCase,
        status: mCase.status,
        closureNotes: mCase.closureNotes,
        updatedAt: mCase.updatedAt
      };

      const closureNotes = payload?.closureNotes || 'پرونده لغو شد.';
      const updated = maintenanceRepository.updateCase(caseId, {
        status: 'CANCELLED',
        closureNotes
      });
      if (!updated) {
        throw new Error('خطا در بروزرسانی وضعیت پرونده به لغو شده.');
      }

      // Persist exactly one CANCELLED assignment-history event if an assigned technician was present
      if (mCase.assignedTechnicianId) {
        try {
          maintenanceRepository.createAssignmentHistory({
            maintenanceCaseId: caseId,
            technicianId: mCase.assignedTechnicianId,
            assignedBy: actorUserId || 'SYSTEM',
            status: 'CANCELLED',
            notes: closureNotes
          });
        } catch (histErr: any) {
          // Compensating Rollback
          let rollbackVerified = false;
          try {
            const restored = maintenanceRepository.updateCase(caseId, previousCaseSnapshot);
            if (restored && restored.status === previousCaseSnapshot.status) {
              rollbackVerified = true;
            }
          } catch (rbErr) {
            rollbackVerified = false;
          }
          if (rollbackVerified) {
            throw new Error('خطا در ثبت تاریخچه لغو تخصیص - تغییرات پرونده بازگردانده شد.');
          } else {
            throw new Error('خطا در ثبت تاریخچه لغو تخصیص و عدم موفقیت در بازگردانی وضعیت پرونده. یکپارچگی نیازمند بررسی مدیر سامانه است.');
          }
        }
      }

      return updated;
    }

    // State Machine Validation (Canonical F.3 Transition Map)
    switch (currentStatus) {
      case 'DRAFT':
        if (newStatus !== 'OPEN') {
          throw new Error(`انتقال نامعتبر از وضعیت پیش‌نویس به ${newStatus}`);
        }
        break;

      case 'OPEN':
        if (newStatus !== 'ASSIGNED') {
          throw new Error(`پرونده باز باید ابتدا به تکنسین تخصیص یابد (ASSIGNED). انتقال به ${newStatus} مجاز نیست.`);
        }
        break;

      case 'ASSIGNED':
        if (newStatus !== 'SCHEDULED' && newStatus !== 'IN_PROGRESS' && newStatus !== 'OPEN' && newStatus !== 'ASSIGNED') {
          throw new Error(`پرونده تخصیص یافته تنها می‌تواند زمان‌بندی شود (SCHEDULED)، شروع شود (IN_PROGRESS)، بازگردانده شود (OPEN) یا مجدداً تخصیص یابد (ASSIGNED).`);
        }
        if (newStatus === 'IN_PROGRESS') {
          // Central Service Security Barrier:
          // Moving from ASSIGNED to IN_PROGRESS requires formal technician acceptance
          // evidenced by an authoritative persisted assignment history (status === 'ACCEPTED')
          // belonging strictly to the currently assigned technician for the CURRENT assignment cycle.
          if (!mCase.assignedTechnicianId) {
            throw new Error('پرونده فاقد تکنسین تخصیص یافته است.');
          }
          if (!hasCurrentCycleAcceptance(mCase)) {
            throw new Error('شروع و اجرای پرونده از وضعیت تخصیص‌یافته مستلزم پذیرش رسمی تکنسین است. سابقه پذیرش معتبر برای دور جاری تخصیص یافت نشد.');
          }
        }
        break;

      case 'SCHEDULED':
        if (newStatus !== 'IN_PROGRESS' && newStatus !== 'ASSIGNED') {
          throw new Error(`پرونده زمان‌بندی شده تنها می‌تواند شروع شود (IN_PROGRESS) یا به تخصیص اولیه بازگردد (ASSIGNED).`);
        }
        if (newStatus === 'IN_PROGRESS') {
          // Central Service Security Barrier:
          // SCHEDULED alone does NOT imply acceptance. Moving from SCHEDULED to IN_PROGRESS
          // requires formal technician acceptance evidenced by an authoritative persisted assignment history for the CURRENT assignment cycle.
          if (!mCase.assignedTechnicianId) {
            throw new Error('پرونده فاقد تکنسین تخصیص یافته است.');
          }
          if (!hasCurrentCycleAcceptance(mCase)) {
            throw new Error('شروع و اجرای پرونده از وضعیت زمان‌بندی‌شده مستلزم پذیرش رسمی تکنسین است. سابقه پذیرش معتبر برای دور جاری تخصیص یافت نشد.');
          }
        }
        break;

      case 'IN_PROGRESS':
        if (newStatus !== 'AWAITING_VERIFICATION' && newStatus !== 'PENDING_VERIFICATION' && newStatus !== 'ASSIGNED') {
          throw new Error(`پس از اتمام کار، پرونده باید جهت بازبینی ارسال شود (AWAITING_VERIFICATION).`);
        }
        if (newStatus === 'AWAITING_VERIFICATION' || newStatus === 'PENDING_VERIFICATION') {
          const actions = maintenanceRepository.getActions(caseId);
          if (actions.length === 0 && (!mCase.actionsTaken || mCase.actionsTaken.length === 0)) {
            throw new Error('جهت ارسال به مرحله تایید، باید حداقل یک اقدام سرویس و تعمیراتی (Action) ثبت شده باشد.');
          }
        }
        break;

      case 'AWAITING_VERIFICATION':
      case 'PENDING_VERIFICATION':
        if (newStatus !== 'VERIFIED' && newStatus !== 'COMPLETED' && newStatus !== 'IN_PROGRESS') {
          throw new Error(`پرونده در انتظار تایید فقط می‌تواند تایید شود (VERIFIED/COMPLETED) یا جهت اصلاح بازگردانده شود (IN_PROGRESS).`);
        }
        break;

      case 'VERIFIED':
      case 'COMPLETED':
        if (newStatus !== 'CLOSED') {
          throw new Error(`پرونده تایید شده تنها می‌تواند بسته و بایگانی شود (CLOSED).`);
        }
        break;

      case 'CLOSED':
        throw new Error('پرونده بسته شده است و امکان تغییر وضعیت مجدد آن وجود ندارد.');

      case 'CANCELLED':
        throw new Error('پرونده لغو شده است و امکان تغییر وضعیت مجدد آن وجود ندارد.');

      default:
        throw new Error(`وضعیت فعلی ${currentStatus} اجازه تغییر وضعیت نمی‌دهد.`);
    }

    const updates: Partial<MaintenanceCase> = { status: newStatus };

    // Handle return to OPEN: clear active assignment metadata
    if (newStatus === 'OPEN') {
      updates.assignedTechnicianId = undefined;
      updates.assignedTechnicianName = undefined;
      updates.assignedTechnicianPhone = undefined;
      updates.scheduledDate = undefined;
      updates.scheduledAt = undefined;
      updates.startedAt = undefined;
    }

    // Handle assignments
    if (newStatus === 'ASSIGNED') {
      const techId = payload?.technicianId || mCase.assignedTechnicianId;
      if (!techId) {
        throw new Error('جهت تخصیص پرونده، مشخصات تکنسین الزامی است.');
      }

      let techName = payload?.technicianName;
      let techPhone = payload?.technicianPhone;

      if (!techName || !techPhone) {
        const pro = professionalRepository.getProfessionalById?.(techId) ||
          professionalRepository.getProfessionalByUserId?.(techId) ||
          (professionalRepository.getProfessionals?.() || []).find((p: any) => p.id === techId || p.userId === techId);
        if (pro) {
          if (!techName) techName = pro.fullName || pro.name;
          if (!techPhone && pro.phone) techPhone = pro.phone;
        }
        if (!techPhone || !techName) {
          const user = userRepository.getUserById?.(techId);
          if (user) {
            if (!techName && user.name) techName = user.name;
            if (!techPhone && user.phone) techPhone = user.phone;
          }
        }
      }

      if (!techName) {
        techName = mCase.assignedTechnicianName || 'تکنسین تخصصی';
      }

      updates.assignedTechnicianId = techId;
      updates.assignedTechnicianName = techName;

      // Detect if reassigning to a genuinely different technician
      const isDifferentTech = Boolean(
        mCase.assignedTechnicianId && !areTechnicianIdentitiesEquivalent(mCase.assignedTechnicianId, techId)
      );

      if (isDifferentTech) {
        // Reset startedAt, schedule, and phone for new technician
        updates.startedAt = undefined;
        if (payload?.scheduledDate) {
          updates.scheduledDate = payload.scheduledDate;
          updates.scheduledAt = payload.scheduledDate;
        } else {
          updates.scheduledDate = undefined;
          updates.scheduledAt = undefined;
        }
        if (techPhone && techPhone.trim().length > 0) {
          updates.assignedTechnicianPhone = techPhone.trim();
        } else {
          updates.assignedTechnicianPhone = undefined;
        }
      } else {
        // Same technician / initial assignment
        if (techPhone !== undefined) {
          updates.assignedTechnicianPhone = techPhone && techPhone.trim().length > 0
            ? techPhone.trim()
            : undefined;
        }
        if (payload?.scheduledDate) {
          updates.scheduledDate = payload.scheduledDate;
        }
        if (currentStatus === 'IN_PROGRESS') {
          updates.startedAt = undefined;
        }
      }
    }

    // Handle scheduling
    if (newStatus === 'SCHEDULED') {
      if (payload?.scheduledDate) updates.scheduledDate = payload.scheduledDate;
      if (payload?.notes) updates.closureNotes = payload.notes;
    }

    // Handle in_progress start
    if (newStatus === 'IN_PROGRESS' && !mCase.startedAt) {
      updates.startedAt = new Date().toISOString();
    }

    // Handle verification submission
    if (newStatus === 'AWAITING_VERIFICATION' || newStatus === 'PENDING_VERIFICATION') {
      if (payload?.notes) updates.resolutionSummary = payload.notes;
      if (payload?.rootCause) updates.rootCause = payload.rootCause;
      if (payload?.actionsTaken) updates.actionsTaken = payload.actionsTaken;
      if (payload?.laborCost !== undefined) updates.laborCost = payload.laborCost;
      if (payload?.partsCost !== undefined) updates.partsCost = payload.partsCost;
      if (payload?.totalCost !== undefined) updates.totalCost = payload.totalCost;
      if (payload?.totalCostIrr !== undefined) updates.totalCostIrr = payload.totalCostIrr;
    }

    // Handle verification approval
    if (newStatus === 'VERIFIED' || newStatus === 'COMPLETED') {
      updates.verifiedBy = actorUserId;
      updates.verifiedAt = new Date().toISOString();
      updates.verificationPassed = true;
      if (payload?.verificationNotes) updates.verificationNotes = payload.verificationNotes;
    }

    // Handle closure
    if (newStatus === 'CLOSED') {
      updates.completedDate = new Date().toISOString();
      updates.closureNotes = payload?.closureNotes || 'پرونده با موفقیت بسته و تحویل گردید.';

      // Automatically resolve associated alerts
      for (const alertId of mCase.alertIds) {
        try {
          alertService.resolveAlert(alertId, `حل شده از طریق پرونده تعمیراتی ${mCase.caseNumber}`, actorUserId);
        } catch (e) {
          // ignore already resolved
        }
      }
    }

    const updated = maintenanceRepository.updateCase(caseId, updates);

    if (mCase.projectId && mCase.projectId !== 'CUSTOMER_DIRECT') {
      try {
        projectRepository.addActivity({
          projectId: mCase.projectId,
          userId: actorUserId,
          type: 'MAINTENANCE_STATUS_CHANGED',
          description: `تغییر وضعیت پرونده تعمیرات ${mCase.caseNumber} به ${newStatus}`
        });
      } catch (e) {
        // ignore
      }
    }

    return updated!;
  },

  /**
   * Adds an action log to a maintenance case using safe single-write persistence and idempotency
   */
  addAction: (
    caseId: string,
    action: {
      actionType: string;
      description: string;
      performedBy: string;
      resultStatus?: 'SUCCESS' | 'PARTIAL' | 'FAILED' | string;
      notes?: string;
      laborHours?: number;
      hoursSpent?: number;
      partsReplaced?: string[];
      costIrr?: number;
      clientRequestId?: string;
    }
  ): MaintenanceAction => {
    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) {
      throw new Error('پرونده تعمیراتی یافت نشد.');
    }

    if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
      throw new Error('امکان ثبت اقدام برای پرونده‌های لغو شده یا بسته شده وجود ندارد.');
    }

    // Explicit null policy for incoming inputs
    if (action.laborHours === null || action.hoursSpent === null) {
      throw new Error('مقدار ساعات کارکرد نمی‌تواند null باشد. در صورت عدم نیاز، مقدار را حذف کنید.');
    }
    if (action.costIrr === null) {
      throw new Error('مقدار هزینه ریالی نمی‌تواند null باشد. در صورت عدم نیاز، مقدار را حذف کنید.');
    }
    if (action.partsReplaced === null) {
      throw new Error('مقدار قطعات تعویضی نمی‌تواند null باشد. در صورت عدم نیاز، مقدار را حذف کنید.');
    }

    // Validate inputs if provided
    let laborHours: number | undefined = undefined;
    const rawHours = action.hoursSpent !== undefined ? action.hoursSpent : action.laborHours;
    if (rawHours !== undefined) {
      laborHours = validateActionLaborHours(rawHours);
    }

    let partsReplaced: string[] | undefined = undefined;
    if (action.partsReplaced !== undefined) {
      partsReplaced = validatePartsReplaced(action.partsReplaced);
    }

    let costIrr: number | undefined = undefined;
    if (action.costIrr !== undefined) {
      costIrr = validateFinancialAmount(action.costIrr, 'هزینه ریالی اقدام');
    }

    const clientRequestId = validateClientRequestId(action.clientRequestId);
    const payloadHash = computeActionPayloadHash({
      actionType: action.actionType,
      description: action.description,
      notes: action.notes,
      laborHours,
      hoursSpent: laborHours,
      partsReplaced,
      costIrr
    });

    const result = maintenanceRepository.recordCaseAction(
      caseId,
      {
        actionType: action.actionType,
        description: action.description,
        performedBy: action.performedBy,
        resultStatus: action.resultStatus || 'SUCCESS',
        notes: action.notes,
        hoursSpent: laborHours,
        partsReplaced,
        clientRequestId,
        payloadHash
      },
      {
        mode: 'INCREMENTAL',
        deltaLaborHours: laborHours,
        deltaCostIrr: costIrr
      }
    );

    if (!result.success) {
      if ((result as any).actorMismatch) {
        throw new Error((result as any).message || 'شناسه درخواست متعلق به کاربر دیگری است و امکان استفاده مجدد از آن وجود ندارد.');
      }
      if ((result as any).conflict) {
        throw new Error((result as any).message || 'شناسه درخواست تکراری با محتوای متفاوت.');
      }
      throw new Error((result as any).message || 'خطا در ثبت اقدام تعمیراتی.');
    }

    return (result as any).action;
  },

  /**
   * Adds spare parts usage to a maintenance case with safe calculation,
   * stored consistency validation, bounds enforcement, duplicate retry protection,
   * and safe sparse legacy financial reconstruction.
   */
  addSpareParts: (
    caseId: string,
    parts: SparePartUsage[],
    options?: { clientRequestId?: string }
  ): MaintenanceCase => {
    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) {
      throw new Error('پرونده تعمیراتی یافت نشد.');
    }

    if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
      throw new Error('امکان ثبت قطعات یدکی برای پرونده‌های لغو شده یا بسته شده وجود ندارد.');
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error('فهرست قطعات یدکی الزامی است و باید حداقل شامل یک قطعه باشد.');
    }

    // Resolve clientRequestId if provided for retry/idempotency
    const clientRequestId = validateClientRequestId(
      options?.clientRequestId || (parts as any)?.[0]?.clientRequestId
    );

    const existingParts = mCase.sparePartsUsed || [];

    // Validate and sanitize each newly incoming spare part
    const validatedNewParts: (SparePartUsage & { clientRequestId?: string })[] = [];
    let partsDeltaCost = 0;

    for (let i = 0; i < parts.length; i++) {
      const validatedItem = validateSparePartItem(parts[i], i);
      if (clientRequestId) {
        validatedItem.clientRequestId = clientRequestId;
      }
      validatedNewParts.push(validatedItem);
      const lineCost = validatedItem.quantity * (validatedItem.costIrr || 0);
      partsDeltaCost += lineCost;
      if (!Number.isSafeInteger(partsDeltaCost) || partsDeltaCost > 1e14) {
        throw new Error('مجموع هزینه قطعات یدکی جدید فراتر از حد مجاز محاسبات امن است.');
      }
    }

    // Defect A Fix: Idempotency conflict & identical replay verification
    if (clientRequestId && existingParts.length > 0) {
      const matchingExisting = existingParts.filter((p: any) => p.clientRequestId === clientRequestId);
      if (matchingExisting.length > 0) {
        let isConflict = matchingExisting.length !== validatedNewParts.length;

        if (!isConflict) {
          for (let i = 0; i < matchingExisting.length; i++) {
            const ex = matchingExisting[i];
            const inPart = validatedNewParts[i];

            // If legacy entry lacks essential fields needed to prove equivalence, fail closed
            if (ex.partName === undefined || ex.quantity === undefined) {
              isConflict = true;
              break;
            }

            const exName = String(ex.partName || '').trim();
            const inName = inPart.partName;
            if (exName !== inName) {
              isConflict = true;
              break;
            }

            const exQty = Number(ex.quantity);
            const inQty = inPart.quantity;
            if (Number.isNaN(exQty) || exQty !== inQty) {
              isConflict = true;
              break;
            }

            const exCost = ex.costIrr !== undefined && ex.costIrr !== null ? Number(ex.costIrr) : 0;
            const inCost = inPart.costIrr || 0;
            if (Number.isNaN(exCost) || exCost !== inCost) {
              isConflict = true;
              break;
            }

            const exPartNum = ex.partNumber !== undefined && ex.partNumber !== null ? String(ex.partNumber).trim() : undefined;
            const inPartNum = inPart.partNumber;
            if (exPartNum !== inPartNum) {
              isConflict = true;
              break;
            }

            const exComp = ex.replacedComponentId !== undefined && ex.replacedComponentId !== null ? String(ex.replacedComponentId).trim() : undefined;
            const inComp = inPart.replacedComponentId;
            if (exComp !== inComp) {
              isConflict = true;
              break;
            }
          }
        }

        if (isConflict) {
          const conflictErr: any = new Error('شناسه درخواست تکراری با محتوای متفاوت. امکان تغییر داده‌های قطعات ثبت‌شده با این شناسه وجود ندارد.');
          conflictErr.code = 'IDEMPOTENCY_PAYLOAD_CONFLICT';
          conflictErr.statusCode = 409;
          conflictErr.clientRequestId = clientRequestId;
          throw conflictErr;
        }

        // Validate stored case financial consistency before returning successful identical replay
        validateCaseFinancialConsistency(mCase);

        // Exact identical replay: return existing case without duplicating parts or charges
        return mCase;
      }
    }

    // Validate stored case financial consistency before modifying
    validateCaseFinancialConsistency(mCase);

    // Defect B Fix: Safe sparse legacy financial totals resolution
    const existingRecordedPartsCost = calculateRecordedPartsCost(existingParts);

    // 1. Determine baseline partsCost
    let basePartsCost: number;
    if (mCase.partsCost !== undefined && mCase.partsCost !== null) {
      basePartsCost = mCase.partsCost;
    } else if (existingRecordedPartsCost > 0) {
      basePartsCost = existingRecordedPartsCost;
    } else {
      basePartsCost = 0;
    }

    // 2. Determine baseline laborCost if present
    const baseLaborCost = (mCase.laborCost !== undefined && mCase.laborCost !== null)
      ? mCase.laborCost
      : undefined;

    // 3. Determine baseline totalCost and totalCostIrr
    let baseTotalCost: number;
    const hasTotalCost = mCase.totalCost !== undefined && mCase.totalCost !== null;
    const hasTotalCostIrr = mCase.totalCostIrr !== undefined && mCase.totalCostIrr !== null;

    if (hasTotalCost || hasTotalCostIrr) {
      const storedTotal = hasTotalCost ? mCase.totalCost! : mCase.totalCostIrr!;

      // Consistency check against known components
      if (storedTotal === 0 && ((baseLaborCost ?? 0) > 0 || basePartsCost > 0)) {
        throw new Error('تناقض در مبالغ مالی پرونده: مجموع کل صفر ذخیره شده در حالی که اجزای دستمزد یا قطعات دارای مبلغ هستند.');
      }
      if (baseLaborCost !== undefined && storedTotal !== ((baseLaborCost ?? 0) + basePartsCost)) {
        throw new Error('تناقض در مبالغ مالی پرونده: مجموع کل با جمع دستمزد و قطعات همخوانی ندارد.');
      }
      if (storedTotal < basePartsCost) {
        throw new Error('تناقض در مبالغ مالی پرونده: مجموع کل کمتر از هزینه قطعات ذخیره‌شده است.');
      }

      baseTotalCost = storedTotal;
    } else {
      // Both totals are absent (sparse legacy record)
      // Reconstruct baseline total from reliable components
      baseTotalCost = (baseLaborCost ?? 0) + basePartsCost;
    }

    // 4. Calculate new totals
    const newPartsCost = basePartsCost + partsDeltaCost;
    if (!Number.isSafeInteger(newPartsCost) || newPartsCost > 1e14) {
      throw new Error('مجموع هزینه قطعات پرونده فراتر از حد مجاز محاسبات امن است.');
    }

    const newTotalCost = baseTotalCost + partsDeltaCost;
    if (!Number.isSafeInteger(newTotalCost) || newTotalCost > 1e14) {
      throw new Error('مجموع کل هزینه پرونده فراتر از حد مجاز محاسبات امن است.');
    }

    const updatedParts = [...existingParts, ...validatedNewParts];

    const caseUpdates: Partial<MaintenanceCase> = {
      sparePartsUsed: updatedParts,
      partsCost: newPartsCost,
      totalCost: newTotalCost,
      totalCostIrr: newTotalCost
    };

    const updated = maintenanceRepository.updateCase(caseId, caseUpdates);
    return updated!;
  },

  /**
   * Aggregates maintenance history for an asset
   */
  getMaintenanceHistory: (assetId: string): MaintenanceHistorySummary => {
    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      throw new Error('دارایی انرژی یافت نشد.');
    }

    const cases = maintenanceRepository.getCases(undefined, assetId);
    const resolvedCases = cases.filter(c => c.status === 'CLOSED' || c.status === 'VERIFIED');

    const totalCostIrr = cases.reduce((sum, c) => sum + (c.totalCostIrr || 0), 0);
    const totalLaborHours = cases.reduce((sum, c) => sum + (c.totalLaborHours || 0), 0);

    // Group common failure causes / issues
    const causeCounts: Record<string, number> = {};
    for (const c of cases) {
      const cause = c.title || 'سایر ایرادات';
      causeCounts[cause] = (causeCounts[cause] || 0) + 1;
    }

    const commonFailureCauses = Object.entries(causeCounts)
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count);

    return {
      assetId,
      projectId: asset.projectId,
      totalCases: cases.length,
      resolvedCases: resolvedCases.length,
      totalCostIrr,
      totalLaborHours,
      commonFailureCauses,
      cases
    };
  }
};
