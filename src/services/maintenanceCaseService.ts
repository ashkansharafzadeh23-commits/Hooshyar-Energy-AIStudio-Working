import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { alertService } from './alertService.js';
import { projectRepository } from '../repositories/projectRepository.js';
import {
  MaintenanceCase,
  MaintenanceCaseStatus,
  MaintenanceCasePriority,
  MaintenanceCategory,
  MaintenanceAction,
  SparePartUsage,
  MaintenanceHistorySummary
} from '../types/maintenance.js';

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
      return mCase;
    }

    // Cancellation is allowed from any active status
    if (newStatus === 'CANCELLED') {
      if (currentStatus === 'CLOSED') {
        throw new Error('امکان لغو پرونده بسته شده وجود ندارد.');
      }
      const updated = maintenanceRepository.updateCase(caseId, {
        status: 'CANCELLED',
        closureNotes: payload?.closureNotes || 'پرونده لغو شد.'
      });
      return updated!;
    }

    // State Machine Validation
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
        if (newStatus !== 'IN_PROGRESS' && newStatus !== 'OPEN') {
          throw new Error(`پرونده تخصیص یافته فقط می‌تواند شروع شود (IN_PROGRESS) یا تخصیص آن لغو گردد.`);
        }
        break;

      case 'IN_PROGRESS':
        if (newStatus !== 'PENDING_VERIFICATION' && newStatus !== 'ASSIGNED') {
          throw new Error(`پس از اتمام کار، پرونده باید جهت بازبینی ارسال شود (PENDING_VERIFICATION).`);
        }
        if (newStatus === 'PENDING_VERIFICATION') {
          const actions = maintenanceRepository.getActions(caseId);
          if (actions.length === 0 && (!mCase.actionsTaken || mCase.actionsTaken.length === 0)) {
            throw new Error('جهت ارسال به مرحله تایید، باید حداقل یک اقدام سرویس و تعمیراتی (Action) ثبت شده باشد.');
          }
        }
        break;

      case 'PENDING_VERIFICATION':
        if (newStatus !== 'VERIFIED' && newStatus !== 'IN_PROGRESS') {
          throw new Error(`پرونده در انتظار تایید فقط می‌تواند تایید شود (VERIFIED) یا جهت اصلاح بازگردانده شود (IN_PROGRESS).`);
        }
        break;

      case 'VERIFIED':
        if (newStatus !== 'CLOSED') {
          throw new Error(`پرونده تایید شده تنها می‌تواند بسته و بایگانی شود (CLOSED).`);
        }
        break;

      case 'CLOSED':
        throw new Error('پرونده بسته شده است و امکان تغییر وضعیت مجدد آن وجود ندارد.');

      default:
        throw new Error(`وضعیت فعلی ${currentStatus} اجازه تغییر وضعیت نمی‌دهد.`);
    }

    const updates: Partial<MaintenanceCase> = { status: newStatus };

    // Handle assignments
    if (newStatus === 'ASSIGNED') {
      const techId = payload?.technicianId || mCase.assignedTechnicianId;
      const techName = payload?.technicianName || mCase.assignedTechnicianName;
      if (!techId || !techName) {
        throw new Error('جهت تخصیص پرونده، مشخصات تکنسین الزامی است.');
      }
      updates.assignedTechnicianId = techId;
      updates.assignedTechnicianName = techName;
      if (payload?.technicianPhone) updates.assignedTechnicianPhone = payload.technicianPhone;
      if (payload?.scheduledDate) updates.scheduledDate = payload.scheduledDate;
    }

    // Handle verification
    if (newStatus === 'VERIFIED') {
      updates.verifiedBy = actorUserId;
      updates.verifiedAt = new Date().toISOString();
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
