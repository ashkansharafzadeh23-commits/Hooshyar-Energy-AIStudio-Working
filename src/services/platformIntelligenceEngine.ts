import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { portfolioAggregationService } from './portfolioAggregationService.js';
import { lifecycleIntelligenceService } from './lifecycleIntelligenceService.js';
import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { PlatformInsight, InsightType, InsightSeverity } from '../types/portfolio.js';

export const platformIntelligenceEngine = {
  /**
   * Generates deterministic, verified insights strictly from stored data facts.
   * Never hallucinates or invents non-existent conditions.
   */
  generatePortfolioInsights(portfolioId: string, options?: { stalledThresholdDays?: number }): PlatformInsight[] {
    const portfolio = portfolioRepository.getPortfolioById(portfolioId);
    if (!portfolio) return [];

    const insights: PlatformInsight[] = [];
    const now = new Date();

    const overview = portfolioAggregationService.getPortfolioOverview(portfolioId);
    const lifecycle = lifecycleIntelligenceService.getLifecycleIntelligence(portfolioId, options);
    const assetIntel = portfolioAggregationService.getAssetPortfolioIntelligence(portfolioId);
    const procIntel = portfolioAggregationService.getProcurementIntelligence(portfolioId);
    const finIntel = portfolioAggregationService.getFinancialPortfolioView(portfolioId);

    // Rule 1: Overdue Milestones (HIGH severity)
    if (lifecycle && lifecycle.overdueMilestones.length > 0) {
      for (const om of lifecycle.overdueMilestones) {
        insights.push({
          id: `ins-milestone-${om.milestoneId}`,
          type: 'OVERDUE_MILESTONE',
          severity: om.daysOverdue > 14 ? 'HIGH' : 'WARNING',
          entityType: 'PROJECT',
          entityId: om.milestoneId,
          projectId: om.projectId,
          title: `مایلستون معوق در پروژه ${om.projectCode}`,
          message: `مایلستون '${om.milestoneTitle}' به مدت ${om.daysOverdue} روز از موعد مقرر گذشته و وضعیت آن همچنان '${om.status}' است.`,
          evidence: {
            milestoneId: om.milestoneId,
            dueDate: om.dueDate,
            daysOverdue: om.daysOverdue,
            status: om.status
          },
          generatedAt: now.toISOString()
        });
      }
    }

    // Rule 2: Stalled Projects (WARNING severity)
    if (lifecycle && lifecycle.stalledProjects.length > 0) {
      for (const sp of lifecycle.stalledProjects) {
        insights.push({
          id: `ins-stalled-${sp.projectId}`,
          type: 'LIFECYCLE_STALLED',
          severity: sp.daysSinceLastUpdate > 60 ? 'HIGH' : 'WARNING',
          entityType: 'PROJECT',
          entityId: sp.projectId,
          projectId: sp.projectId,
          title: `توقف پیشرفت در پروژه ${sp.projectCode}`,
          message: sp.reason,
          evidence: {
            daysSinceLastUpdate: sp.daysSinceLastUpdate,
            thresholdDays: sp.thresholdDays,
            currentStatus: sp.status
          },
          generatedAt: now.toISOString()
        });
      }
    }

    // Rule 3: Pending Inspections for Deliveries (WARNING severity)
    if (procIntel && procIntel.pendingInspections > 0) {
      insights.push({
        id: `ins-proc-inspections-${portfolio.id}`,
        type: 'DELIVERY_INSPECTION_PENDING',
        severity: 'WARNING',
        entityType: 'PROCUREMENT',
        entityId: portfolio.id,
        title: `${procIntel.pendingInspections} مورد بازرسی تجهیزات معلق است`,
        message: `در مجموع ${procIntel.pendingInspections} محموله تجهیزات تحویل کارگاه شده و نیازمند انجام بازرسی فنی و تطبیق با استانداردهای کیفی است.`,
        evidence: {
          pendingInspectionsCount: procIntel.pendingInspections,
          completedDeliveries: procIntel.completedDeliveries
        },
        generatedAt: now.toISOString()
      });
    }

    // Rule 4: Operational Assets Without Telemetry (HIGH severity)
    if (assetIntel && assetIntel.telemetryBreakdown.notConnected + assetIntel.telemetryBreakdown.dataUnavailable > 0) {
      const offlineAssets = assetIntel.assets.filter(a => a.operationalStatus === 'OPERATIONAL' && a.telemetryStatus !== 'REPORTING');
      for (const oa of offlineAssets) {
        insights.push({
          id: `ins-telemetry-${oa.assetId}`,
          type: 'TELEMETRY_OFFLINE',
          severity: 'HIGH',
          entityType: 'ASSET',
          entityId: oa.assetId,
          projectId: oa.projectId,
          title: `عدم دریافت تله‌متری از دارایی ${oa.assetCode}`,
          message: `نیروگاه عملیاتی '${oa.name}' در وضعیت '${oa.telemetryStatus}' قرار دارد و داده‌های مانیتورینگ آنلاین ارسال نمی‌کند.`,
          evidence: {
            assetCode: oa.assetCode,
            telemetryStatus: oa.telemetryStatus,
            lastTelemetryTimestamp: oa.lastTelemetryTimestamp
          },
          generatedAt: now.toISOString()
        });
      }
    }

    // Rule 5: Critical Maintenance Cases (CRITICAL severity)
    const allCases = maintenanceRepository.getAllCases() || [];
    const projects = portfolioAggregationService.getPortfolioProjects(portfolio);
    const pids = new Set(projects.map(p => p.id));
    const criticalCases = allCases.filter(c => {
      const match = (c.projectId && pids.has(c.projectId));
      return match && c.priority === 'CRITICAL' && c.status !== 'CLOSED' && c.status !== 'RESOLVED';
    });

    for (const cc of criticalCases) {
      insights.push({
        id: `ins-maint-${cc.id}`,
        type: 'MAINTENANCE_CRITICAL',
        severity: 'CRITICAL',
        entityType: 'MAINTENANCE',
        entityId: cc.id,
        projectId: cc.projectId,
        title: `مورد تعمیراتی بحرانی: ${cc.caseNumber || cc.id}`,
        message: `خرابی یا نقص بحرانی با عنوان '${cc.title}' باز بوده و نیازمند اقدام فوری تیم فنی است.`,
        evidence: {
          caseNumber: cc.caseNumber,
          priority: cc.priority,
          status: cc.status,
          createdAt: cc.createdAt
        },
        generatedAt: now.toISOString()
      });
    }

    // Rule 6: Open EPC Selection Pending (INFO severity)
    if (overview) {
      const epcPendingCount = (overview.projectsByLifecycleStage['BIDS_RECEIVED'] || 0) + (overview.projectsByLifecycleStage['RFQ_OPEN'] || 0);
      if (epcPendingCount > 0) {
        insights.push({
          id: `ins-epc-pending-${portfolio.id}`,
          type: 'EPC_SELECTION_PENDING',
          severity: 'INFO',
          entityType: 'PROJECT',
          entityId: portfolio.id,
          title: `${epcPendingCount} پروژه در انتظار انتخاب پیمانکار EPC`,
          message: `مناقصات مربوط به ${epcPendingCount} پروژه در مرحله دریافت یا ارزیابی پیشنهادات پیمانکاران است.`,
          evidence: {
            bidsReceivedCount: overview.projectsByLifecycleStage['BIDS_RECEIVED'] || 0,
            rfqOpenCount: overview.projectsByLifecycleStage['RFQ_OPEN'] || 0
          },
          generatedAt: now.toISOString()
        });
      }
    }

    // Rule 7: Data Incompleteness in Financials (INFO severity)
    if (finIntel && finIntel.missingFinancialRecords > 0) {
      insights.push({
        id: `ins-fin-coverage-${portfolio.id}`,
        type: 'DATA_INCOMPLETE',
        severity: 'INFO',
        entityType: 'FINANCING',
        entityId: portfolio.id,
        title: `نقص سوابق مالی در ${finIntel.missingFinancialRecords} پروژه`,
        message: `میزان پوشش اطلاعات مالی در این پرتفوی ${finIntel.dataCoveragePercent}% است و برخی پروژه‌ها فاقد برآورد CAPEX یا ساختار تأمین مالی مصوب هستند.`,
        evidence: {
          missingRecordsCount: finIntel.missingFinancialRecords,
          dataCoveragePercent: finIntel.dataCoveragePercent,
          totalProjects: finIntel.totalProjectsInPortfolio
        },
        generatedAt: now.toISOString()
      });
    }

    return insights;
  }
};
