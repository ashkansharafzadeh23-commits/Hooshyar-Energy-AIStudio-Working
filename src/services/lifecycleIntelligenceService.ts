import { projectRepository } from '../repositories/projectRepository.js';
import { executionRepository } from '../repositories/executionRepository.js';
import { financingRepository } from '../repositories/financingRepository.js';
import { rfqRepository } from '../repositories/rfqRepository.js';
import { procurementRepository } from '../repositories/procurementRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { portfolioAggregationService } from './portfolioAggregationService.js';
import { EnergyProject, ProjectStatus } from '../types/project.js';
import {
  LifecycleIntelligenceSummary,
  StalledProjectItem,
  MissingNextStepItem,
  OverdueMilestoneItem,
  BlockedWorkflowItem
} from '../types/portfolio.js';

export const lifecycleIntelligenceService = {
  getLifecycleIntelligence(portfolioId: string, options?: { stalledThresholdDays?: number }): LifecycleIntelligenceSummary | null {
    const portfolio = portfolioRepository.getPortfolioById(portfolioId);
    if (!portfolio) return null;

    const projects = portfolioAggregationService.getPortfolioProjects(portfolio);
    const now = new Date();

    const stageDistribution: Record<string, number> = {};
    const stalledProjects: StalledProjectItem[] = [];
    const missingNextSteps: MissingNextStepItem[] = [];
    const overdueMilestones: OverdueMilestoneItem[] = [];
    const blockedWorkflows: BlockedWorkflowItem[] = [];

    for (const project of projects) {
      const status = project.status || 'DRAFT';
      stageDistribution[status] = (stageDistribution[status] || 0) + 1;

      // 1. Detect Stalled Projects (> threshold days without update and not terminal)
      // A project must NOT be classified as STALLED unless a threshold is explicitly configured:
      // 1. project.stalledThresholdDays
      // 2. portfolio settings (settings.stalledThresholdDays or portfolio.stalledThresholdDays)
      // 3. explicit service/query option (options.stalledThresholdDays)
      // If no explicit threshold exists, stalled status remains NOT_EVALUATED and no stalled item or insight is created.
      if (status !== 'MAINTENANCE' && (status as string) !== 'OPERATIONAL' && (status as string) !== 'CANCELLED' && (status as string) !== 'ON_HOLD') {
        const thresholdDays = (project as any).stalledThresholdDays ?? (portfolio as any).settings?.stalledThresholdDays ?? (portfolio as any).stalledThresholdDays ?? options?.stalledThresholdDays;
        
        if (typeof thresholdDays === 'number' && thresholdDays > 0) {
          const lastUpdated = project.updatedAt ? new Date(project.updatedAt) : new Date(project.createdAt);
          const diffDays = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= thresholdDays) {
            stalledProjects.push({
              projectId: project.id,
              projectCode: project.projectCode,
              title: project.title,
              status,
              daysSinceLastUpdate: diffDays,
              thresholdDays,
              reason: `پروژه بیش از ${diffDays} روز در وضعیت ${status} بدون تغییر یا به‌روزرسانی باقی مانده است (حد آستانه تعیین‌شده: ${thresholdDays} روز).`
            });
          }
        }
      }

      // 2. Detect Missing Required Next-Step Data
      const missingFields: string[] = [];
      let recommendedAction = '';

      if (status === 'DRAFT' || status === 'ANALYSIS') {
        if (!project.targetCapacityKw && !(project as any).capacityKw) missingFields.push('ظرفیت هدف (kW)');
        if (!project.location?.city && !project.location?.province) missingFields.push('موقعیت مکانی پروژه');
        if (missingFields.length > 0) {
          recommendedAction = 'تکمیل مشخصات فنی اولیه و موقعیت مکانی برای ورود به ارزیابی فنی و اقتصادی';
        }
      } else if (status === 'FEASIBILITY') {
        const finModels = financingRepository.getFinancialModelsByProjectId ? financingRepository.getFinancialModelsByProjectId(project.id) : [];
        if (!finModels || finModels.length === 0) {
          missingFields.push('مدل مالی و امکان‌سنجی اولیه');
          recommendedAction = 'ثبت مدل ارزیابی مالی اولیه و بازده سرمایه قبل از ورود به فاز مناقصه';
        }
      } else if (status === 'READY_FOR_RFQ' || status === 'RFQ_OPEN') {
        const rfqs = rfqRepository.findRFQsByProjectId(project.id) || [];
        if (rfqs.length === 0) {
          missingFields.push('اسناد مناقصه (RFQ)');
          recommendedAction = 'ایجاد و انتشار بسته مناقصه جهت استعلام پیمانکاران EPC';
        }
      } else if (status === 'EPC_SELECTED') {
        const contracts = executionRepository.getProjectContracts(project.id) || [];
        if (contracts.length === 0) {
          missingFields.push('پیش‌نویس قرارداد EPC');
          recommendedAction = 'تنظیم و ارسال پیش‌نویس قرارداد برای پیمانکار منتخب';
        }
      } else if (status === 'CONTRACTING') {
        const contracts = executionRepository.getProjectContracts(project.id) || [];
        const hasActive = contracts.some(c => c.status === 'ACTIVE' || c.status === 'SIGNED' || c.status === 'EXECUTED');
        if (!hasActive) {
          missingFields.push('امضای قرارداد و تبادل تضامین');
          recommendedAction = 'نهایی‌سازی امضای طرفین و مبادله قرارداد رسمی';
        }
      } else if (status === 'FINANCING') {
        const finReqs = financingRepository.getFinancingRequests(project.id) || [];
        if (finReqs.length === 0) {
          missingFields.push('درخواست تأمین مالی');
          recommendedAction = 'تکمیل و ارسال بسته تسهیلات به نهادهای مالی همکار';
        }
      } else if (status === 'PROCUREMENT') {
        const boqs = procurementRepository.getBOQs(project.id) || [];
        if (boqs.length === 0) {
          missingFields.push('فهرست مقادیر و تجهیزات (BOQ)');
          recommendedAction = 'ثبت و تصویب فهرست تجهیزات نیروگاه برای صدور سفارش‌های خرید';
        }
      } else if (status === 'CONSTRUCTION') {
        const baselines = executionRepository.getProjectBaselines ? executionRepository.getProjectBaselines(project.id) : [];
        const milestones = executionRepository.getProjectMilestones(project.id) || [];
        if (milestones.length === 0) {
          missingFields.push('برنامه زمان‌بندی و مایلستون‌های اجرایی');
          recommendedAction = 'تعریف ساختار مایلستون‌های فاز ساخت و نصب تجهیزات';
        }
      } else if (status === 'COMMISSIONING') {
        const tests = assetRepository.getCommissioningTests ? assetRepository.getCommissioningTests(project.id) : [];
        if (!tests || tests.length === 0) {
          missingFields.push('تست‌های پیش‌راه‌اندازی و اتصال به شبکه');
          recommendedAction = 'انجام و ثبت آزمون‌های ایمنی، عایقی و تست ترانس و اینورترها';
        }
      }

      if (missingFields.length > 0) {
        missingNextSteps.push({
          projectId: project.id,
          projectCode: project.projectCode,
          title: project.title,
          currentStatus: status,
          missingFields,
          recommendedAction
        });
      }

      // 3. Detect Overdue Milestones (ONLY where explicit dates exist!)
      const milestones = executionRepository.getProjectMilestones(project.id) || [];
      for (const m of milestones) {
        const isNotCompleted = m.status !== 'COMPLETED' && m.status !== 'APPROVED';
        const targetDateStr = m.dueDate || (m as any).targetDate;
        
        if (isNotCompleted && targetDateStr) {
          const targetDate = new Date(targetDateStr);
          if (!isNaN(targetDate.getTime()) && targetDate < now) {
            const daysOverdue = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
            overdueMilestones.push({
              projectId: project.id,
              projectCode: project.projectCode,
              projectTitle: project.title,
              milestoneId: m.id,
              milestoneTitle: m.name || m.title || `مایلستون ${m.id.slice(0, 6)}`,
              dueDate: targetDateStr,
              daysOverdue,
              status: m.status
            });
          }
        }
      }

      // 4. Detect Blocked Workflow States
      // A: Pending or Rejected Change Requests
      const changeRequests = executionRepository.getChangeRequestsByProjectId(project.id) || [];
      for (const cr of changeRequests) {
        if (cr.status === 'PENDING' || cr.status === 'UNDER_REVIEW') {
          blockedWorkflows.push({
            projectId: project.id,
            projectCode: project.projectCode,
            title: project.title,
            blockReason: `درخواست تغییر ${cr.requestNumber || cr.id} در انتظار تأیید کارفرماست و ممکن است زمان‌بندی را متوقف کند.`,
            blockedEntity: 'CHANGE_REQUEST',
            entityId: cr.id
          });
        }
      }

      // B: Failed Commissioning Tests
      const commTests = assetRepository.getCommissioningTests ? assetRepository.getCommissioningTests(project.id) : [];
      for (const ct of (commTests || [])) {
        if (ct.status === 'FAILED' || (ct.status as string) === 'REQUIRES_RETEST') {
          blockedWorkflows.push({
            projectId: project.id,
            projectCode: project.projectCode,
            title: project.title,
            blockReason: `تست راه‌اندازی '${(ct as any).name || ct.testType}' مردود شده و نیاز به تست مجدد قبل از برق‌داری دارد.`,
            blockedEntity: 'COMMISSIONING',
            entityId: ct.id
          });
        }
      }
    }

    return {
      portfolioId: portfolio.id,
      totalProjects: projects.length,
      stageDistribution,
      stalledProjects,
      missingNextSteps,
      overdueMilestones,
      blockedWorkflows,
      calculatedAt: new Date().toISOString()
    };
  }
};
