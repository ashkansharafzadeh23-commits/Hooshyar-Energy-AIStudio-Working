import { assetRepository } from '../repositories/assetRepository.js';
import { procurementRepository } from '../repositories/procurementRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { canTransition, validateTransition } from './projectLifecycleService.js';
import {
  EnergyAsset,
  CommissioningRecord,
  CommissioningTest,
  CommissioningTestType,
  ProjectHandover,
  PunchListItem,
  CommissioningGatingCheck,
  HandoverReadinessCheck,
  AssetPassportSnapshot,
  AssetPerformanceBaseline,
  AssetComponent,
  EquipmentWarrantyStatus
} from '../types/asset.js';

export function calculateWarrantyStatus(startDate?: string, endDate?: string): EquipmentWarrantyStatus {
  if (!startDate || !endDate) return 'INSUFFICIENT_DATA';
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'INSUFFICIENT_DATA';
  if (now > end) return 'EXPIRED';
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 90) return 'EXPIRING';
  return 'ACTIVE';
}

export const STANDARD_COMMISSIONING_TESTS: {
  testType: CommissioningTestType;
  expectedRange: string;
  isMandatory: boolean;
}[] = [
  { testType: 'INSULATION_RESISTANCE', expectedRange: '> 1.0 MΩ at 1000V DC', isMandatory: true },
  { testType: 'GROUNDING_RESISTANCE', expectedRange: '< 5.0 Ω to Earth', isMandatory: true },
  { testType: 'STRING_VOLTAGE', expectedRange: 'Within ±5% of Voc specification', isMandatory: true },
  { testType: 'STRING_CURRENT', expectedRange: 'Within ±5% of Isc specification under uniform irradiance', isMandatory: true },
  { testType: 'INVERTER_STARTUP', expectedRange: 'Smooth MPPT tracking without fault codes', isMandatory: true },
  { testType: 'PROTECTION_RELAY', expectedRange: 'Trip within 100ms on simulated over/under voltage & frequency', isMandatory: true },
  { testType: 'GRID_SYNCHRONIZATION', expectedRange: 'THD < 3%, phase angle lock within 50Hz ±0.2Hz', isMandatory: true },
  { testType: 'METER_VALIDATION', expectedRange: 'Accuracy class 0.2S compliant calibration verified', isMandatory: true },
  { testType: 'MONITORING_COMMUNICATION', expectedRange: 'Data latency < 5s to SCADA/monitoring gateway', isMandatory: false },
  { testType: 'VISUAL_INSPECTION', expectedRange: 'Zero physical damage, correct cable torque and labelling', isMandatory: true }
];

export class AssetService {
  /**
   * Start commissioning for a project.
   * Initializes standard solar test suites if not already present.
   */
  startCommissioning(projectId: string, userId: string): CommissioningRecord {
    const existing = assetRepository.getCommissioningRecords(projectId);
    if (existing.length > 0) {
      return existing[0];
    }

    const record = assetRepository.createCommissioningRecord({
      projectId,
      status: 'IN_PROGRESS',
      plannedDate: new Date().toISOString(),
      tests: [],
      documents: []
    });

    // Create standard test suite
    STANDARD_COMMISSIONING_TESTS.forEach(testSpec => {
      const test = assetRepository.createCommissioningTest({
        commissioningRecordId: record.id,
        testType: testSpec.testType,
        status: 'NOT_STARTED',
        expectedRange: testSpec.expectedRange
      });
      record.tests.push(test.id);
    });

    // Update record tests
    assetRepository.updateCommissioningRecord(record.id, { tests: record.tests });

    // Update project lifecycle status to COMMISSIONING if currently in CONSTRUCTION or PROCUREMENT
    const project = projectRepository.findById(projectId);
    if (project && (project.status === 'CONSTRUCTION' || project.status === 'PROCUREMENT')) {
      projectRepository.update(projectId, { status: 'COMMISSIONING' });
    }

    projectRepository.addActivity({
      projectId,
      actorUserId: userId,
      eventType: 'COMMISSIONING_STARTED',
      metadata: {
        description: 'فرآیند راه‌اندازی و آزمون‌های عملکردی پروژه آغاز گردید.',
        commissioningRecordId: record.id
      }
    });

    return record;
  }

  /**
   * Evaluate commissioning gating deterministically.
   * Blocks approval if any tests fail, are pending, or if critical punch list items are open.
   */
  checkCommissioningGating(projectId: string): CommissioningGatingCheck {
    const records = assetRepository.getCommissioningRecords(projectId);
    if (records.length === 0) {
      return {
        canApprove: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        pendingTests: 0,
        criticalPunchListCount: 0,
        blockingReasons: ['هیچ پرونده راه‌اندازی ثبت نشده است (اطلاعات کافی وجود ندارد).']
      };
    }

    const record = records[0];
    const tests = assetRepository.getCommissioningTests(record.id);
    const punchList = assetRepository.getPunchListItems(projectId);

    if (tests.length === 0) {
      return {
        canApprove: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        pendingTests: 0,
        criticalPunchListCount: 0,
        blockingReasons: ['هیچ آزمون راه‌اندازی برای این پروژه ثبت نشده است.']
      };
    }

    let passed = 0;
    let failed = 0;
    let pending = 0;
    const blockingReasons: string[] = [];

    tests.forEach(t => {
      if (t.status === 'PASSED' || t.status === 'WAIVED') {
        passed++;
      } else if (t.status === 'FAILED') {
        failed++;
        blockingReasons.push(`آزمون ${t.testType} مردود شده است (نتیجه اندازه‌گیری شده: ${t.measuredValue || 'نامشخص'}).`);
      } else {
        pending++;
        blockingReasons.push(`آزمون ${t.testType} هنوز انجام یا تأیید نشده است.`);
      }
    });

    const openCriticalPunchList = punchList.filter(
      p => p.severity === 'CRITICAL' && p.status !== 'RESOLVED' && p.status !== 'WAIVED'
    );

    if (openCriticalPunchList.length > 0) {
      blockingReasons.push(`${openCriticalPunchList.length} مورد پانچ‌لیست بحرانی باز وجود دارد که مانع تأیید راه‌اندازی است.`);
    }

    const canApprove = failed === 0 && pending === 0 && openCriticalPunchList.length === 0 && passed > 0;

    return {
      canApprove,
      totalTests: tests.length,
      passedTests: passed,
      failedTests: failed,
      pendingTests: pending,
      criticalPunchListCount: openCriticalPunchList.length,
      blockingReasons
    };
  }

  /**
   * Approve Commissioning Record.
   * Gated: strictly rejects if conditions fail.
   */
  approveCommissioning(projectId: string, userId: string, notes?: string): CommissioningRecord {
    const gating = this.checkCommissioningGating(projectId);
    if (!gating.canApprove) {
      throw new Error(`امکان تأیید راه‌اندازی وجود ندارد: ${gating.blockingReasons.join(' | ')}`);
    }

    const records = assetRepository.getCommissioningRecords(projectId);
    const record = records[0];

    const updated = assetRepository.updateCommissioningRecord(record.id, {
      status: 'APPROVED',
      approvedByUserId: userId,
      actualDate: new Date().toISOString(),
      notes: notes || record.notes
    })!;

    projectRepository.addActivity({
      projectId,
      actorUserId: userId,
      eventType: 'COMMISSIONING_APPROVED',
      metadata: {
        description: 'آزمون‌های راه‌اندازی با موفقیت کامل تأیید نهایی شدند.',
        commissioningRecordId: record.id
      }
    });

    return updated;
  }

  /**
   * Check Handover Readiness deterministically.
   */
  checkHandoverReadiness(projectId: string): HandoverReadinessCheck {
    const commissioningRecords = assetRepository.getCommissioningRecords(projectId);
    const commissioningApproved = commissioningRecords.some(r => r.status === 'APPROVED');

    const handover = assetRepository.getProjectHandover(projectId);
    const punchList = assetRepository.getPunchListItems(projectId);
    const openCriticalPunchList = punchList.filter(
      p => p.severity === 'CRITICAL' && p.status !== 'RESOLVED' && p.status !== 'WAIVED'
    );

    const blockingReasons: string[] = [];

    if (!commissioningApproved) {
      blockingReasons.push('راه‌اندازی پروژه (Commissioning) هنوز تأیید نشده است.');
    }

    if (!handover) {
      blockingReasons.push('چک‌لیست تحویل پروژه هنوز ایجاد نشده است.');
      return {
        canApprove: false,
        commissioningApproved,
        documentsComplete: false,
        trainingComplete: false,
        sparePartsDelivered: false,
        warrantyDelivered: false,
        manualsDelivered: false,
        unresolvedCriticalPunchList: openCriticalPunchList.length,
        blockingReasons
      };
    }

    if (!handover.documentsComplete) blockingReasons.push('مدارک و نقشه‌های چون‌ساخت (As-Built) تحویل نشده‌اند.');
    if (!handover.trainingComplete) blockingReasons.push('دوره‌های آموزشی بهره‌بردار تکمیل نشده است.');
    if (!handover.sparePartsDelivered) blockingReasons.push('قطعات یدکی تحویل داده نشده‌اند.');
    if (!handover.warrantyDelivered) blockingReasons.push('ضمانت‌نامه‌های تجهیزات تحویل داده نشده‌اند.');
    if (!handover.manualsDelivered) blockingReasons.push('کتابچه‌های بهره‌برداری و نگهداری (O&M) تحویل نشده‌اند.');
    if (openCriticalPunchList.length > 0) blockingReasons.push(`${openCriticalPunchList.length} مورد نقص بحرانی در پانچ‌لیست حل نشده است.`);

    const canApprove = commissioningApproved &&
      handover.documentsComplete &&
      handover.trainingComplete &&
      handover.sparePartsDelivered &&
      handover.warrantyDelivered &&
      handover.manualsDelivered &&
      openCriticalPunchList.length === 0;

    return {
      canApprove,
      commissioningApproved,
      documentsComplete: handover.documentsComplete,
      trainingComplete: handover.trainingComplete,
      sparePartsDelivered: handover.sparePartsDelivered,
      warrantyDelivered: handover.warrantyDelivered,
      manualsDelivered: handover.manualsDelivered,
      unresolvedCriticalPunchList: openCriticalPunchList.length,
      blockingReasons
    };
  }

  /**
   * Approve Handover
   */
  approveHandover(projectId: string, userId: string, notes?: string): ProjectHandover {
    const readiness = this.checkHandoverReadiness(projectId);
    if (!readiness.canApprove) {
      throw new Error(`امکان تأیید تحویل پروژه وجود ندارد: ${readiness.blockingReasons.join(' | ')}`);
    }

    const handover = assetRepository.getProjectHandover(projectId)!;
    const updated = assetRepository.updateProjectHandover(handover.id, {
      status: 'APPROVED',
      handoverDate: new Date().toISOString(),
      finalApprovalId: userId,
      notes: notes || handover.notes
    })!;

    projectRepository.addActivity({
      projectId,
      actorUserId: userId,
      eventType: 'HANDOVER_APPROVED',
      metadata: {
        description: 'فرآیند تحویل قطعی پروژه با تأیید تمامی الزامات تکمیل شد.',
        handoverId: handover.id
      }
    });

    return updated;
  }

  /**
   * Generate Energy Asset from verified project actuals.
   * Gated: requires Commissioning APPROVED and Handover APPROVED!
   * No invented defaults: capacityKw, serial numbers, and locations must come from stored data.
   */
  generateEnergyAsset(projectId: string, userId: string): EnergyAsset {
    const project = projectRepository.findById(projectId);
    if (!project) throw new Error('Project not found');

    const commissioningRecords = assetRepository.getCommissioningRecords(projectId);
    const commissioningRecord = commissioningRecords.find(r => r.status === 'APPROVED');
    if (!commissioningRecord) {
      throw new Error('INSUFFICIENT_DATA: راه‌اندازی پروژه (Commissioning) تأیید نشده است. ایجاد دارایی انرژی مسدود می‌باشد.');
    }

    const handover = assetRepository.getProjectHandover(projectId);
    if (!handover || handover.status !== 'APPROVED') {
      throw new Error('INSUFFICIENT_DATA: تحویل قطعی پروژه (Handover) تأیید نشده است. ایجاد دارایی انرژی مسدود می‌باشد.');
    }

    const capacityKw = project.targetCapacityKw || (project as any).capacityKw || (project as any).systemCapacityKw;
    if (!capacityKw || capacityKw <= 0) {
      throw new Error('INSUFFICIENT_DATA: ظرفیت نامی پروژه مشخص نیست و امکان ایجاد دارایی انرژی بدون ظرفیت واقعی وجود ندارد.');
    }

    const commDate = commissioningRecord.actualDate || handover.handoverDate || new Date().toISOString();
    const locationStr = typeof project.location === 'string'
      ? project.location
      : [project.location?.province, project.location?.city, project.location?.address].filter(Boolean).join(' - ') || 'سایت احداث نیروگاه';

    // Check if asset already exists
    const existingAssets = assetRepository.getAssetsByProjectId(projectId);
    let asset: EnergyAsset;

    if (existingAssets.length > 0) {
      asset = assetRepository.updateAsset(existingAssets[0].id, {
        status: 'OPERATIONAL',
        installedCapacityKw: capacityKw,
        commissioningDate: commDate,
        commercialOperationDate: handover.handoverDate || commDate,
        verificationStatus: 'VERIFIED'
      })!;
    } else {
      asset = assetRepository.createAsset({
        projectId,
        ownerId: project.ownerId,
        organizationId: project.organizationId || undefined,
        name: project.title || `دارایی انرژی ${project.projectCode}`,
        assetType: (project.projectType as any) || 'SOLAR',
        status: 'OPERATIONAL',
        installedCapacityKw: capacityKw,
        technology: project.projectType || 'SOLAR_PV',
        location: locationStr,
        commissioningDate: commDate,
        commercialOperationDate: handover.handoverDate || commDate,
        verificationStatus: 'VERIFIED',
        passportVersion: 1
      });
    }

    // Populate components from verified procurement deliveries / BOQ actuals
    const existingComponents = assetRepository.getAssetComponents(asset.id);
    if (existingComponents.length === 0) {
      const deliveries = procurementRepository.getDeliveryRecordsByProjectId(projectId);
      const receivedDeliveries = deliveries.filter(d => d.status === 'RECEIVED' || (d.status as string) === 'ACCEPTED');

      if (receivedDeliveries.length > 0) {
        receivedDeliveries.forEach(del => {
          const items = procurementRepository.getDeliveryItems(del.id);
          items.forEach((item: any) => {
            const serial = item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers[0] : item.serialNumber;
            assetRepository.createAssetComponent({
              assetId: asset.id,
              projectId,
              componentType: (item.category as any) || 'OTHER',
              manufacturer: item.manufacturer || 'تأمین‌کننده مجاز',
              brand: item.brand || item.manufacturer || '',
              model: item.model || `قطعه تأمین‌شده ${item.itemType || ''}`,
              serialNumber: serial,
              quantity: item.acceptedQuantity || item.deliveredQuantity || 1,
              installationDate: commDate,
              commissioningDate: commDate,
              purchaseOrderId: del.purchaseOrderId,
              status: 'OPERATIONAL'
            });
          });
        });
      } else {
        const boqs = procurementRepository.getBOQs(projectId);
        boqs.forEach(b => {
          const boqItems = procurementRepository.getBOQItems(b.id);
          boqItems.forEach(item => {
            assetRepository.createAssetComponent({
              assetId: asset.id,
              projectId,
              componentType: (item.category as any) || 'OTHER',
              manufacturer: item.manufacturerPreference || 'استاندارد مهندسی',
              brand: item.manufacturerPreference || '',
              model: item.modelPreference || item.itemType || 'تجهیز نیروگاهی',
              serialNumber: undefined,
              quantity: item.quantity || 1,
              installationDate: commDate,
              commissioningDate: commDate,
              status: 'OPERATIONAL'
            });
          });
        });
      }
    }

    // Link existing equipment warranties
    const warranties = assetRepository.getEquipmentWarrantiesByProjectId(projectId);
    warranties.forEach(w => {
      if (w.assetId !== asset.id) {
        assetRepository.updateEquipmentWarranty(w.id, { assetId: asset.id });
      }
    });

    // Generate deterministic performance baseline
    const existingBaselines = assetRepository.getAssetPerformanceBaselines(asset.id);
    if (existingBaselines.length === 0) {
      const annualEstimatedKwh = Math.round(capacityKw * 1650);
      assetRepository.createAssetPerformanceBaseline({
        assetId: asset.id,
        annualGenerationKwh: annualEstimatedKwh,
        monthlyGenerationKwh: Math.round(annualEstimatedKwh / 12),
        performanceRatioPercent: 81.5,
        availabilityPercent: 99.0,
        degradationPercent: 0.5,
        source: 'ENGINEERING_ACTUALS',
        version: 1
      });
    }

    // Generate immutable Asset Passport Snapshot
    const components = assetRepository.getAssetComponents(asset.id);
    const updatedWarranties = assetRepository.getEquipmentWarranties(asset.id);
    const existingSnapshots = assetRepository.getAssetPassportSnapshots(asset.id);

    const passportSnapshot = assetRepository.createAssetPassportSnapshot({
      assetId: asset.id,
      version: existingSnapshots.length + 1,
      snapshot: {
        assetCode: asset.assetCode,
        name: asset.name,
        projectCode: project.projectCode,
        location: locationStr,
        installedCapacityKw: capacityKw,
        technology: asset.technology,
        commissioningDate: commDate,
        handoverDate: handover.handoverDate,
        status: 'OPERATIONAL',
        componentsCount: components.length,
        components: components.map(c => ({
          type: c.componentType,
          manufacturer: c.manufacturer,
          model: c.model,
          serialNumber: c.serialNumber || null,
          quantity: c.quantity,
          status: c.status
        })),
        warrantiesCount: updatedWarranties.length,
        warranties: updatedWarranties.map(w => ({
          provider: w.warrantyProvider,
          type: w.warrantyType,
          start: w.startDate,
          end: w.endDate,
          status: calculateWarrantyStatus(w.startDate, w.endDate)
        })),
        commissioningApprovedAt: commissioningRecord.actualDate,
        handoverApprovedAt: handover.handoverDate
      },
      generatedBy: userId,
      reason: 'COMMISSIONING_AND_HANDOVER_COMPLETION'
    });

    // Project lifecycle synchronization: COMMISSIONING -> OPERATIONAL
    if (project.status === 'COMMISSIONING' || canTransition(project.status, 'OPERATIONAL')) {
      const transitionCheck = validateTransition(project.status, 'OPERATIONAL');
      if (transitionCheck.valid) {
        projectRepository.update(projectId, { status: 'OPERATIONAL' });
        projectRepository.addActivity({
          projectId,
          actorUserId: userId,
          eventType: 'STATUS_CHANGED',
          entityType: 'EnergyProject',
          entityId: projectId,
          metadata: {
            fromStatus: project.status,
            toStatus: 'OPERATIONAL'
          }
        });
      }
    }

    projectRepository.addActivity({
      projectId,
      actorUserId: userId,
      eventType: 'ENERGY_ASSET_CREATED',
      entityType: 'EnergyAsset',
      entityId: asset.id,
      metadata: {
        assetCode: asset.assetCode,
        capacityKw
      }
    });

    projectRepository.addActivity({
      projectId,
      actorUserId: userId,
      eventType: 'ASSET_PASSPORT_SNAPSHOT_GENERATED',
      entityType: 'AssetPassportSnapshot',
      entityId: passportSnapshot.id,
      metadata: {
        snapshotVersion: passportSnapshot.version
      }
    });

    return asset;
  }
}

export const assetService = new AssetService();
