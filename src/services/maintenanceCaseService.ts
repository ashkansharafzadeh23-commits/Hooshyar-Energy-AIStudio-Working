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

      if (!isReassignment) {
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
   * Adds an action log to a maintenance case
   */
  addAction: (
    caseId: string,
    action: {
      actionType: string;
      description: string;
      performedBy: string;
      resultStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      notes?: string;
      laborHours?: number;
      costIrr?: number;
    }
  ): MaintenanceAction => {
    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) {
      throw new Error('پرونده تعمیراتی یافت نشد.');
    }

    if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
      throw new Error('امکان ثبت اقدام برای پرونده‌های لغو شده یا بسته شده وجود ندارد.');
    }

    const created = maintenanceRepository.createAction({
      maintenanceCaseId: caseId,
      actionType: action.actionType,
      description: action.description,
      performedBy: action.performedBy,
      performedAt: new Date().toISOString(),
      resultStatus: action.resultStatus,
      notes: action.notes
    });

    // Update totals if provided
    const totalLaborHours = (mCase.totalLaborHours || 0) + (action.laborHours || 0);
    const totalCostIrr = (mCase.totalCostIrr || 0) + (action.costIrr || 0);
    maintenanceRepository.updateCase(caseId, {
      totalLaborHours,
      totalCostIrr
    });

    return created;
  },

  /**
   * Adds spare parts usage to a maintenance case
   */
  addSpareParts: (caseId: string, parts: SparePartUsage[]): MaintenanceCase => {
    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) {
      throw new Error('پرونده تعمیراتی یافت نشد.');
    }

    if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
      throw new Error('امکان ثبت قطعات یدکی برای پرونده‌های لغو شده یا بسته شده وجود ندارد.');
    }

    const existingParts = mCase.sparePartsUsed || [];
    const updatedParts = [...existingParts, ...parts];

    const partsTotalCost = parts.reduce((sum, p) => sum + (p.costIrr || 0) * (p.quantity || 1), 0);
    const totalCostIrr = (mCase.totalCostIrr || 0) + partsTotalCost;

    const updated = maintenanceRepository.updateCase(caseId, {
      sparePartsUsed: updatedParts,
      totalCostIrr
    });

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
