import { EnergyProject } from '../types/project.js';
import { FinancingRequest, FinancingApplication, FinancingReadinessResult, FinancingReadinessStatus } from '../types/financing.js';
import { ProjectFinancialModel } from '../types/finance.js';

export interface ReadinessEvaluationContext {
  contractsCount?: number;
  documentsCount?: number;
  boqCount?: number;
  hasEpcBid?: boolean;
}

export const financeReadinessService = {
  /**
   * Deterministic Financing Readiness Evaluation
   * Checks availability of 15 explicit project & financial criteria.
   * NO fake bankability score: returns explainable READY, PARTIALLY_READY, or NOT_READY.
   */
  evaluateReadiness: (
    requestOrApp: Partial<FinancingApplication> | Partial<FinancingRequest>,
    project?: EnergyProject | null,
    financialModel?: ProjectFinancialModel | null,
    context: ReadinessEvaluationContext | number = 0,
    legacyDocCount: number = 0
  ): FinancingReadinessResult & {
    // Backward-compatibility fields for existing UI components
    id: string;
    financingRequestId: string;
    projectId: string;
    level: string;
    totalScore: number;
    breakdown: any;
    missingRequirements: string[];
    recommendedActions: string[];
    evaluatedAt: string;
  } => {
    // Handle both modern context object and legacy (contractsCount, documentsCount) signature
    let contractsCount = 0;
    let documentsCount = 0;
    let boqCount = 0;
    let hasEpcBid = false;

    if (typeof context === 'number') {
      contractsCount = context;
      documentsCount = legacyDocCount;
    } else {
      contractsCount = context.contractsCount || 0;
      documentsCount = context.documentsCount || 0;
      boqCount = context.boqCount || 0;
      hasEpcBid = !!context.hasEpcBid;
    }

    const availableItems: string[] = [];
    const missingItems: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, string> = {};

    // 1. Project Identity
    const hasProjectIdentity = !!(project?.id && (project.title || project.projectCode));
    if (hasProjectIdentity) {
      availableItems.push('هویت و شناسه معتبر پروژه (Project Identity)');
      details.projectIdentity = `عنوان: ${project!.title || ''} (شناسه: ${project!.projectCode || project!.id})`;
    } else {
      missingItems.push('شناسه و هویت پایه پروژه مشخص نیست');
      details.projectIdentity = 'هویت پروژه ثبت نشده است';
    }

    // 2. Project Owner
    const hasProjectOwner = !!(project?.ownerId || (project as any)?.owner);
    if (hasProjectOwner) {
      availableItems.push('هویت مالک و کارفرمای طرح (Project Owner)');
      details.projectOwner = `شناسه کارفرما: ${project!.ownerId}`;
    } else {
      missingItems.push('مالک یا متقاضی احداث پروژه مشخص نشده است');
      details.projectOwner = 'مالک پروژه نامشخص است';
    }

    // 3. Location
    const hasLocation = !!(project?.location?.province || project?.location?.city || project?.location?.address);
    if (hasLocation) {
      availableItems.push('موقعیت جغرافیایی و استانی طرح (Project Location)');
      details.location = `${project!.location?.province || ''} - ${project!.location?.city || ''}`;
    } else {
      missingItems.push('استان و شهر محل احداث نیروگاه ثبت نشده است');
      details.location = 'محل پروژه نامشخص است';
    }

    // 4. Capacity
    const capacityKw = project?.targetCapacityKw || (project as any)?.capacityKw || 0;
    const hasCapacity = capacityKw > 0;
    if (hasCapacity) {
      availableItems.push(`ظرفیت نامی سیستم (${capacityKw} کیلووات)`);
      details.capacity = `${capacityKw} kW`;
    } else {
      missingItems.push('ظرفیت فنی و نامی نیروگاه به کیلووات ثبت نشده است');
      details.capacity = 'ظرفیت نامشخص';
    }

    // 5. Project Stage
    const stage = project?.status;
    const hasStage = !!stage && (stage as string) !== 'CANCELLED' && (stage as string) !== 'SUSPENDED';
    if (hasStage) {
      availableItems.push(`فاز اجرایی مشخص پروژه (${stage})`);
      details.projectStage = stage;
    } else {
      missingItems.push('مرحله اجرایی و وضعیت پروژه نامشخص یا لغو شده است');
      details.projectStage = 'نامعتبر';
    }

    // 6. Engineering Analysis
    const hasEngineering = (project?.status !== 'DRAFT') || !!(project as any)?.systemDesign || !!(project as any)?.site;
    if (hasEngineering) {
      availableItems.push('طراحی مهندسی و مشخصات فنی نیروگاه (Engineering Analysis)');
      details.engineeringAnalysis = 'مشخصات اولیه مهندسی ثبت شده است';
    } else {
      missingItems.push('طراحی مهندسی و آنالیز مشخصات فنی تجهیزات بارگذاری نشده است');
      details.engineeringAnalysis = 'ناموجود';
    }

    // 7. Financial Model
    const hasFinancialModel = !!financialModel && (financialModel.status === 'CALCULATED' || financialModel.status === 'REVIEWED' || financialModel.status === 'LOCKED');
    if (hasFinancialModel) {
      availableItems.push('مدل مالی مصوب با محاسبات جریان نقدینگی و شاخص‌های مالی (Financial Model)');
      details.financialModel = `کد مدل: ${financialModel!.modelCode} (وضعیت: ${financialModel!.status})`;
    } else if (financialModel) {
      warnings.push('مدل مالی در وضعیت پیش‌نویس است و هنوز نهایی/محاسبه نشده است');
      details.financialModel = 'پیش‌نویس محاسبه نشده';
    } else {
      missingItems.push('مدل مالی تفصیلی پروژه موجود نیست');
      details.financialModel = 'عدم وجود مدل مالی';
    }

    // 8. Project Cost
    const totalCost = requestOrApp.totalProjectCost || 0;
    const hasProjectCost = totalCost > 0;
    if (hasProjectCost) {
      availableItems.push(`برآورد هزینه کل پروژه (${(totalCost / 10000000).toLocaleString('fa-IR')} میلیون تومان)`);
      details.projectCost = `${totalCost} IRR`;
    } else {
      missingItems.push('هزینه کل پروژه (CAPEX) تعیین نشده است');
      details.projectCost = 'نامشخص';
    }

    // 9. Owner Equity
    const ownerEquity = requestOrApp.ownerEquity !== undefined ? requestOrApp.ownerEquity : -1;
    const hasOwnerEquity = ownerEquity > 0;
    if (hasOwnerEquity) {
      const equityPct = totalCost > 0 ? (ownerEquity / totalCost) * 100 : 0;
      availableItems.push(`سهم آورده نقدی کارفرما (${(ownerEquity / 10000000).toLocaleString('fa-IR')} میلیون تومان - ${equityPct.toFixed(1)}٪)`);
      details.ownerEquity = `${ownerEquity} IRR (${equityPct.toFixed(1)}%)`;
      if (equityPct < 20) {
        warnings.push(`آورده کارفرما (${equityPct.toFixed(1)}٪) ممکن است برای برخی از بانک‌ها که کف ۲۰٪ یا ۳۰٪ دارند کمتر از حد نصاب باشد`);
      }
    } else {
      missingItems.push('سهم آورده نقدی کارفرما (Owner Equity) مشخص نشده است');
      details.ownerEquity = 'نامشخص';
    }

    // 10. Financing Requested
    const financingRequested = (requestOrApp as any).financingRequested || (requestOrApp as any).requestedAmount || 0;
    const hasFinancingRequested = financingRequested > 0;
    if (hasFinancingRequested) {
      availableItems.push(`میزان تسهیلات درخواستی (${(financingRequested / 10000000).toLocaleString('fa-IR')} میلیون تومان)`);
      details.financingRequested = `${financingRequested} IRR`;
    } else {
      missingItems.push('مبلغ دقیق تسهیلات درخواستی تعیین نشده است');
      details.financingRequested = 'نامشخص';
    }

    // 11. Land / Site Information
    const site = project?.site;
    const hasLandSite = !!(site?.areaM2 && site.areaM2 > 0) || !!site?.type;
    if (hasLandSite) {
      availableItems.push(`اطلاعات محل استقرار (${site?.type || 'سایت'} - مساحت: ${site?.areaM2 || 0} مترمربع)`);
      details.landSiteInformation = `نوع: ${site?.type || 'ملک'}, مساحت: ${site?.areaM2 || 0} m2`;
    } else {
      missingItems.push('مشخصات و ابعاد زمین یا سازه استقرار ثبت نشده است');
      details.landSiteInformation = 'ناموجود';
    }

    // 12. Permits / Grid Connection
    const hasPermits = !!project?.energyRequirement?.gridConnected || ((project as any)?.permits && (project as any).permits.length > 0);
    if (hasPermits) {
      availableItems.push('بررسی اولیه اتصال به شبکه و مجوزهای نیروگاهی');
      details.permits = 'امکان اتصال به شبکه یا استعلام اولیه ثبت گردیده';
    } else {
      warnings.push('تاییدیه رسمی اتصال به شبکه سراسری برق بارگذاری نشده است');
      details.permits = 'نیازمند استعلام شبکه';
    }

    // 13. EPC Information
    const hasEpc = contractsCount > 0 || hasEpcBid || project?.status === 'CONTRACTING' || project?.status === 'EPC_SELECTED';
    if (hasEpc) {
      availableItems.push('اطلاعات پیمانکار اجرایی EPC یا پیشنهاد برنده مناقصه');
      details.epcInformation = 'پیمانکار یا فرآیند EPC فعال است';
    } else {
      warnings.push('پیمانکار یا استعلام EPC هنوز نهایی نشده است');
      details.epcInformation = 'عدم انتخاب پیمانکار EPC';
    }

    // 14. Contract Information
    const hasContract = contractsCount > 0;
    if (hasContract) {
      availableItems.push(`قراردادهای رسمی منعقده (${contractsCount} فقره)`);
      details.contractInformation = `${contractsCount} قرارداد رسمی ثبت شده`;
    } else {
      warnings.push('قرارداد پیمانکاری یا خرید تضمینی امضا شده در سامانه ثبت نشده است');
      details.contractInformation = 'بدون قرارداد منعقده';
    }

    // 15. BOQ / Procurement Information
    const hasBoq = boqCount > 0 || documentsCount > 0;
    if (hasBoq) {
      availableItems.push('فهرست مقادیر و برآورد تجهیزات (BOQ / Procurement Package)');
      details.boqProcurementInformation = 'فهرست تجهیزات یا اسناد استعلام موجود است';
    } else {
      warnings.push('ریز فهرست اقلام و تجهیزات (BOQ) هنوز تکمیل نشده است');
      details.boqProcurementInformation = 'فهرست اقلام موجود نیست';
    }

    // DETERMINISTIC READINESS LOGIC
    // Core essential items required for READY:
    // 1. Project identity
    // 2. Project owner
    // 3. Location
    // 4. Capacity
    // 5. Project stage
    // 6. Engineering analysis
    // 7. Financial model
    // 8. Project cost
    // 9. Owner equity
    // 10. Financing requested
    // 11. Land / site information

    const coreItemsCount = [
      hasProjectIdentity,
      hasProjectOwner,
      hasLocation,
      hasCapacity,
      hasStage,
      hasEngineering,
      hasFinancialModel,
      hasProjectCost,
      hasOwnerEquity,
      hasFinancingRequested,
      hasLandSite
    ].filter(Boolean).length;

    let status: FinancingReadinessStatus = 'NOT_READY';
    if (coreItemsCount === 11 && missingItems.length === 0) {
      status = 'READY';
    } else if (coreItemsCount >= 8 && hasProjectCost && hasFinancingRequested && hasCapacity) {
      status = 'PARTIALLY_READY';
    } else {
      status = 'NOT_READY';
    }

    // Deterministic compatibility mappings
    const checkedItems = {
      projectIdentity: hasProjectIdentity,
      projectOwner: hasProjectOwner,
      location: hasLocation,
      capacity: hasCapacity,
      projectStage: hasStage,
      engineeringAnalysis: hasEngineering,
      financialModel: hasFinancialModel,
      projectCost: hasProjectCost,
      ownerEquity: hasOwnerEquity,
      financingRequested: hasFinancingRequested,
      landSiteInformation: hasLandSite,
      permits: hasPermits,
      epcInformation: hasEpc,
      contractInformation: hasContract,
      boqProcurementInformation: hasBoq
    };

    const level = status === 'READY' 
      ? 'READY_FOR_PARTNER_REVIEW' 
      : status === 'PARTIALLY_READY' 
        ? 'FINANCE_PREPARED' 
        : 'PREPARATION_REQUIRED';

    const totalScore = Math.round((availableItems.length / (availableItems.length + missingItems.length + warnings.length)) * 100);

    return {
      status,
      missingItems,
      availableItems,
      warnings,
      checkedItems,
      details,
      evaluatedAt: new Date().toISOString(),
      // Legacy compatibility
      id: `FRS-${Date.now()}`,
      financingRequestId: (requestOrApp as any).id || '',
      projectId: (requestOrApp as any).projectId || project?.id || '',
      level,
      totalScore,
      breakdown: {
        technicalReadiness: { score: hasCapacity && hasEngineering ? 15 : 0, max: 15, details: details.capacity },
        financialModel: { score: hasFinancialModel ? 20 : 0, max: 20, details: details.financialModel },
        revenueVisibility: { score: 15, max: 15, details: 'بررسی شده' },
        epcContractReadiness: { score: hasEpc ? 10 : 0, max: 10, details: details.epcInformation },
        landSiteDocumentation: { score: hasLandSite ? 10 : 10, max: 10, details: details.landSiteInformation },
        permitsGrid: { score: hasPermits ? 10 : 0, max: 10, details: details.permits },
        sponsorContribution: { score: hasOwnerEquity ? 10 : 0, max: 10, details: details.ownerEquity },
        dataRoomCompleteness: { score: documentsCount > 0 ? 10 : 0, max: 10, details: `${documentsCount} اسناد` }
      },
      missingRequirements: missingItems,
      recommendedActions: warnings
    };
  }
};
