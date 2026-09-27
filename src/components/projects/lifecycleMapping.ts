import { EnergyProject, ProjectStatus } from '../../types/project';
import { formatCurrencyIRR, formatSolarCapacity } from '../../utils/formatters';

export type LifecyclePhaseId = 
  | 'phase-1-design'
  | 'phase-2-preparation'
  | 'phase-3-contracting'
  | 'phase-4-execution'
  | 'phase-5-operation';

export interface LifecyclePhaseDef {
  id: LifecyclePhaseId;
  index: number; // 1 to 5
  title: string;
  enTitle: string;
  description: string;
  statuses: ProjectStatus[];
  capabilities: {
    id: string;
    title: string;
    description: string;
    tabEquivalent?: string;
  }[];
}

export const LIFECYCLE_PHASES: LifecyclePhaseDef[] = [
  {
    id: 'phase-1-design',
    index: 1,
    title: 'بررسی و طراحی',
    enTitle: 'Analysis & Design',
    description: 'امکان‌سنجی فنی، ارزیابی پتانسیل خورشیدی و طراحی اولیه نیروگاه',
    statuses: ['DRAFT', 'ANALYSIS', 'FEASIBILITY'],
    capabilities: [
      { id: 'site-info', title: 'محل و کاربری سایت', description: 'مختصات، استان، مساحت و اتصال شبکه', tabEquivalent: 'site' },
      { id: 'financial-analysis', title: 'مدل و تحلیل مالی اولیه', description: 'تخمین LCOE، دوره بازگشت و جریان نقدینگی', tabEquivalent: 'financial' }
    ]
  },
  {
    id: 'phase-2-preparation',
    index: 2,
    title: 'آماده‌سازی پروژه',
    enTitle: 'Preparation & RFQ',
    description: 'انتشار استعلام قیمت (RFQ)، دریافت و مقایسه پیشنهادهای پیمانکاران EPC',
    statuses: ['READY_FOR_RFQ', 'RFQ_OPEN', 'BIDS_RECEIVED', 'EPC_SELECTED'],
    capabilities: [
      { id: 'rfq', title: 'استعلام قیمت (RFQ)', description: 'مدیریت و انتشار اسناد استعلام احداث نیروگاه', tabEquivalent: 'rfq' },
      { id: 'bids', title: 'پیشنهادهای پیمانکاران (Bids)', description: 'ارزیابی فنی، قیمت‌ها و انتخاب پیمانکار منتخب', tabEquivalent: 'bids' }
    ]
  },
  {
    id: 'phase-3-contracting',
    index: 3,
    title: 'تأمین و قرارداد',
    enTitle: 'Contracting & Financing',
    description: 'انعقاد قرارداد EPC، جذب سرمایه‌گذار، تسهیلات بانکی و خرید تجهیزات اصلی',
    statuses: ['CONTRACTING', 'FINANCING', 'PROCUREMENT'],
    capabilities: [
      { id: 'contract', title: 'قرارداد احداث (EPC)', description: 'مفاد قرارداد، تعهدات طرفین و وضعیت امضا', tabEquivalent: 'contract' },
      { id: 'financing', title: 'تسهیلات و منابع مالی', description: 'تسهیلات بانکی و خطوط اعتباری انرژی تجدیدپذیر', tabEquivalent: 'financing' },
      { id: 'investment', title: 'مشارکت و سرمایه‌گذاری', description: 'طرح مشارکت حقوقی و سهم‌الشرکه سرمایه‌گذاران', tabEquivalent: 'investment' },
      { id: 'procurement', title: 'خرید و تجهیزات (Procurement)', description: 'سفارش‌گذاری پنل‌ها، اینورترها و زنجیره تأمین', tabEquivalent: 'procurement' }
    ]
  },
  {
    id: 'phase-4-execution',
    index: 4,
    title: 'اجرا و راه‌اندازی',
    enTitle: 'Construction & Commissioning',
    description: 'عملیات نصب و ساخت، کنترل نقاط عطف، آزمون‌های راه‌اندازی و تحویل رسمی',
    statuses: ['CONSTRUCTION', 'COMMISSIONING'],
    capabilities: [
      { id: 'milestones', title: 'نقاط عطف و کنترل پروژه (Milestones)', description: 'جدول زمان‌بندی، پیشرفت احداث و مایل‌استون‌ها', tabEquivalent: 'milestones' },
      { id: 'commissioning', title: 'آزمون‌ها و راه‌اندازی (Commissioning)', description: 'تست‌های الکتریکی، اتصال به شبکه و پروانه بهره‌برداری', tabEquivalent: 'commissioning' },
      { id: 'handover', title: 'تحویل موقت/قطعی و رفع نقص (Handover)', description: 'پانچ‌لیست، تحویل پروژه و گواهی‌نامه پذیرش', tabEquivalent: 'handover' }
    ]
  },
  {
    id: 'phase-5-operation',
    index: 5,
    title: 'بهره‌برداری',
    enTitle: 'Operation & Asset',
    description: 'تبدیل پروژه به دارایی انرژی پایدار، پایش برخط و نگهداری پیشگیرانه',
    statuses: ['OPERATIONAL', 'MAINTENANCE'],
    capabilities: [
      { id: 'asset', title: 'شناسنامه دیجیتال دارایی (Asset Passport)', description: 'پاسپورت فنی نیروگاه، تجهیزات نصب‌شده و گارانتی‌ها', tabEquivalent: 'asset' },
      { id: 'monitoring-status', title: 'پایش و عملکرد نیروگاه', description: 'وضعیت اتصال به سامانه تله‌متری و بازدهی', tabEquivalent: 'monitoring' }
    ]
  }
];

export interface NextActionInfo {
  title: string;
  description: string;
  category: 'SETUP' | 'RFQ' | 'CONTRACT' | 'CONSTRUCTION' | 'COMMISSIONING' | 'OPERATION' | 'GENERAL';
  targetCapability?: string;
  targetTab?: string;
  actionText: string;
}

/**
 * Returns the current phase definition for a given status
 */
export function getProjectPhase(status: ProjectStatus): {
  phase: LifecyclePhaseDef | null;
  phaseIndex: number;
  isCancelled: boolean;
} {
  if (status === 'CANCELLED') {
    return { phase: null, phaseIndex: -1, isCancelled: true };
  }

  const found = LIFECYCLE_PHASES.find(p => p.statuses.includes(status));
  if (found) {
    return { phase: found, phaseIndex: found.index, isCancelled: false };
  }

  // Fallback to phase 1
  return { phase: LIFECYCLE_PHASES[0], phaseIndex: 1, isCancelled: false };
}

/**
 * Deterministic Next Recommended Action based strictly on project status and data
 */
export function getNextRecommendedAction(project: EnergyProject): NextActionInfo {
  switch (project.status) {
    case 'DRAFT':
      return {
        title: 'تکمیل اطلاعات سایت و مشخصات اولیه',
        description: 'مساحت، کاربری زمین و الگوی مصرف انرژی را تکمیل کنید تا مدل اولیه طراحی شود.',
        category: 'SETUP',
        targetCapability: 'site-info',
        targetTab: 'overview',
        actionText: 'مشاهده مشخصات سایت'
      };
    case 'ANALYSIS':
      return {
        title: 'بررسی محاسبات تحلیل انرژی و امکان‌سنجی اولیه',
        description: 'نتایج شبیه‌سازی تابش خورشیدی و ظرفیت بهینه را ارزیابی و تأیید نمایید.',
        category: 'SETUP',
        targetCapability: 'financial-analysis',
        targetTab: 'financial',
        actionText: 'مشاهده مدل مالی'
      };
    case 'FEASIBILITY':
      return {
        title: 'تایید نهایی گزارش امکان‌سنجی و تهیه اسناد استعلام',
        description: 'گزارش امکان‌سنجی را بررسی کرده و پروژه را برای ورود به مرحله استعلام آماده کنید.',
        category: 'RFQ',
        targetCapability: 'rfq',
        targetTab: 'rfq',
        actionText: 'آماده‌سازی استعلام'
      };
    case 'READY_FOR_RFQ':
      return {
        title: 'انتشار رسمی استعلام قیمت (RFQ) و دعوت از پیمانکاران',
        description: 'مشخصات فنی و شرایط پروژه را در قالب RFQ برای شرکت‌های معتبر EPC منتشر نمایید.',
        category: 'RFQ',
        targetCapability: 'rfq',
        targetTab: 'rfq',
        actionText: 'انتشار و مدیریت RFQ'
      };
    case 'RFQ_OPEN':
      return {
        title: 'دریافت و بررسی پیشنهادات فنی و مالی پیمانکاران',
        description: 'استعلام هم‌اکنون فعال است؛ پیشنهادهای ورودی پیمانکاران را پیگیری و پایش کنید.',
        category: 'RFQ',
        targetCapability: 'bids',
        targetTab: 'bids',
        actionText: 'مشاهده پیشنهادها'
      };
    case 'BIDS_RECEIVED':
      return {
        title: 'مقایسه تطبیقی پیشنهادات و انتخاب مجری منتخب',
        description: 'پیشنهادهای قیمت و سوابق فنی پیمانکاران را مقایسه و پیمانکار برنده را برگزینید.',
        category: 'RFQ',
        targetCapability: 'bids',
        targetTab: 'bids',
        actionText: 'ارزیابی و انتخاب مجری'
      };
    case 'EPC_SELECTED':
      return {
        title: 'نهایی‌سازی قرارداد و تبادل تضامین با مجری منتخب',
        description: 'پیش‌نویس قرارداد احداث را با شرکت EPC منتخب نهایی کرده و تضامین را دریافت کنید.',
        category: 'CONTRACT',
        targetCapability: 'contract',
        targetTab: 'contract',
        actionText: 'ورود به بخش قرارداد'
      };
    case 'CONTRACTING':
      return {
        title: 'امضای رسمی قرارداد احداث و ابلاغ شروع به کار',
        description: 'قرارداد نهایی را به امضای طرفین رسانده و مقدمات تأمین مالی را آماده نمایید.',
        category: 'CONTRACT',
        targetCapability: 'contract',
        targetTab: 'contract',
        actionText: 'پیگیری قرارداد احداث'
      };
    case 'FINANCING':
      return {
        title: 'تکمیل مدارک اعتباری و اخذ تسهیلات مالی',
        description: 'مدارک مالی و سهم‌الشرکه پروژه را برای آزادسازی منابع تسهیلاتی ارائه دهید.',
        category: 'CONTRACT',
        targetCapability: 'financing',
        targetTab: 'financing',
        actionText: 'مدیریت تسهیلات مالی'
      };
    case 'PROCUREMENT':
      return {
        title: 'کنترل کیفی و تایید تجهیزات اصلی (پنل و اینورتر)',
        description: 'سفارش‌گذاری ماژول‌های فتوولتائیک و اینورترها را بر اساس استانداردها تأیید کنید.',
        category: 'CONSTRUCTION',
        targetCapability: 'procurement',
        targetTab: 'procurement',
        actionText: 'بررسی فهرست تجهیزات'
      };
    case 'CONSTRUCTION':
      return {
        title: 'پیشرفت عملیات اجرایی طبق زمان‌بندی و ثبت مایل‌استون‌ها',
        description: 'عملیات سازه و نصب مکانیکی/الکتریکی را کنترل و گزارش پیشرفت مایل‌استون‌ها را ثبت کنید.',
        category: 'CONSTRUCTION',
        targetCapability: 'milestones',
        targetTab: 'milestones',
        actionText: 'ثبت پیشرفت نقاط عطف'
      };
    case 'COMMISSIONING':
      return {
        title: 'اجرای آزمون‌های راه‌اندازی و اخذ تاییدیه اتصال به شبکه',
        description: 'تست‌های تزریق توان، عایقی و تست حفاظت اینورتر را با حضور ناظر انجام دهید.',
        category: 'COMMISSIONING',
        targetCapability: 'commissioning',
        targetTab: 'commissioning',
        actionText: 'آزمون‌های راه‌اندازی'
      };
    case 'OPERATIONAL':
      return {
        title: 'پایش مستمر تولید و بررسی عملکرد نیروگاه',
        description: 'پاسپورت دارایی را تکمیل کرده و اتصال به سیستم مانیتورینگ عملکرد را برقرار نمایید.',
        category: 'OPERATION',
        targetCapability: 'asset',
        targetTab: 'asset',
        actionText: 'شناسنامه دارایی انرژی'
      };
    case 'MAINTENANCE':
      return {
        title: 'اجرای سرویس‌های دوره‌ای و نگهداری پیشگیرانه',
        description: 'برنامه شست‌وشوی پنل‌ها و بازدید اتصالات الکتریکی را طبق برنامه انجام دهید.',
        category: 'OPERATION',
        targetCapability: 'asset',
        targetTab: 'asset',
        actionText: 'سوابق نگهداری و تعمیرات'
      };
    case 'CANCELLED':
      return {
        title: 'پروژه متوقف شده است',
        description: 'این پروژه به وضعیت لغو شده منتقل شده و فعالیت اجرایی جدیدی برای آن تعریف نشده است.',
        category: 'GENERAL',
        targetTab: 'overview',
        actionText: 'مشاهده جزئیات'
      };
    default:
      return {
        title: 'اقدام بعدی هنوز مشخص نشده است.',
        description: 'اطلاعات کافی برای تعیین اقدام اجرایی قطعی در این مرحله موجود نیست.',
        category: 'GENERAL',
        targetTab: 'overview',
        actionText: 'نمای کلی'
      };
  }
}

export interface AttentionItem {
  id: string;
  type: 'WARNING' | 'INFO' | 'ACTION_REQUIRED';
  title: string;
  description: string;
  linkTab?: string;
  linkText?: string;
}

/**
 * Derives actionable attention items strictly from actual project state
 */
export function getAttentionItems(project: EnergyProject): AttentionItem[] {
  const items: AttentionItem[] = [];

  // Check incomplete technical inputs
  if (!project.site?.areaM2 || !project.targetCapacityKw) {
    items.push({
      id: 'missing-site-specs',
      type: 'WARNING',
      title: 'اطلاعات فنی یا مساحت سایت تکمیل نشده است',
      description: 'برای انجام محاسبات مهندسی دقیق و انتشار RFQ، تکمیل مساحت و ظرفیت هدف ضروری است.',
      linkTab: 'process',
      linkText: 'تکمیل مشخصات'
    });
  }

  // Lifecycle-driven attention items
  if (project.status === 'READY_FOR_RFQ') {
    items.push({
      id: 'rfq-ready',
      type: 'ACTION_REQUIRED',
      title: 'اسناد آماده انتشار رسمی استعلام (RFQ) هستند',
      description: 'پروژه به مرحله آماده‌سازی وارد شده است. برای دریافت قیمت از پیمانکاران، استعلام را فعال کنید.',
      linkTab: 'rfq',
      linkText: 'انتشار استعلام'
    });
  } else if (project.status === 'RFQ_OPEN') {
    items.push({
      id: 'rfq-in-progress',
      type: 'INFO',
      title: 'استعلام هم‌اکنون در حال پذیرش پیشنهاد است',
      description: 'پیمانکاران دعوت‌شده در مهلت مقرر می‌توانند پیشنهادهای فنی و مالی خود را بارگذاری نمایند.',
      linkTab: 'bids',
      linkText: 'بررسی وضعیت پیشنهادها'
    });
  } else if (project.status === 'BIDS_RECEIVED') {
    items.push({
      id: 'bids-waiting-eval',
      type: 'ACTION_REQUIRED',
      title: 'پیشنهادهای جدید از پیمانکاران دریافت شده است',
      description: 'برای حفظ زمان‌بندی پروژه، پیشنهادهای ورودی را مقایسه و پیمانکار مناسب را انتخاب نمایید.',
      linkTab: 'bids',
      linkText: 'مقایسه پیشنهادها'
    });
  } else if (project.status === 'EPC_SELECTED') {
    items.push({
      id: 'epc-selected-contract-pending',
      type: 'ACTION_REQUIRED',
      title: 'پیمانکار انتخاب شده است؛ قرارداد در انتظار تدوین است',
      description: 'توافقات نهایی و تنظیم پیش‌نویس رسمی قرارداد EPC با پیمانکار منتخب باید آغاز شود.',
      linkTab: 'contract',
      linkText: 'ورود به قراردادها'
    });
  } else if (project.status === 'CONTRACTING') {
    items.push({
      id: 'contract-signing',
      type: 'ACTION_REQUIRED',
      title: 'قرارداد احداث در انتظار نهایی‌سازی و امضا است',
      description: 'مفاد حقوقی و تضمین‌های اجرایی طرفین باید به تأیید نهایی برسد.',
      linkTab: 'contract',
      linkText: 'مشاهده قرارداد'
    });
  } else if (project.status === 'FINANCING') {
    items.push({
      id: 'financing-docs',
      type: 'ACTION_REQUIRED',
      title: 'مدارک تسهیلات و منابع مالی نیازمند بررسی است',
      description: 'پرونده تسهیلاتی یا توافق با سرمایه‌گذار در مرحله تکمیل مدارک اعتباری قرار دارد.',
      linkTab: 'financing',
      linkText: 'پیگیری تسهیلات'
    });
  } else if (project.status === 'PROCUREMENT') {
    items.push({
      id: 'procurement-tracking',
      type: 'INFO',
      title: 'تأمین تجهیزات اصلی در حال پیگیری است',
      description: 'سفارش‌گذاری پنل‌ها و اینورترها با زنجیره تأمین در جریان است.',
      linkTab: 'procurement',
      linkText: 'فهرست تجهیزات'
    });
  } else if (project.status === 'CONSTRUCTION') {
    items.push({
      id: 'construction-active',
      type: 'INFO',
      title: 'عملیات احداث در سایت پروژه فعال است',
      description: 'پیشرفت فیزیکی مایل‌استون‌های نصب سازه و کابل‌کشی را در سامانه به‌روزرسانی کنید.',
      linkTab: 'milestones',
      linkText: 'کنترل مایل‌استون‌ها'
    });
  } else if (project.status === 'COMMISSIONING') {
    items.push({
      id: 'commissioning-pending',
      type: 'ACTION_REQUIRED',
      title: 'آزمون‌های تحویل و اتصال شبکه نیازمند تاییدیه است',
      description: 'ثبت نتایج آزمون‌های راه‌اندازی برای صدور پروانه بهره‌برداری الزامی است.',
      linkTab: 'commissioning',
      linkText: 'آزمون‌های راه‌اندازی'
    });
  } else if (project.status === 'OPERATIONAL') {
    items.push({
      id: 'operational-telemetry',
      type: 'INFO',
      title: 'پروژه در فاز بهره‌برداری است',
      description: 'عملکرد تولیدی نیروگاه را در شناسنامه دارایی پایش نمایید.',
      linkTab: 'asset',
      linkText: 'شناسنامه دارایی'
    });
  }

  return items;
}

export interface HealthIndicator {
  label: string;
  value: string;
  subtext?: string;
  badgeType?: 'neutral' | 'info' | 'success' | 'warning';
}

/**
 * Generates at most 4 meaningful health indicators strictly from existing verified data
 */
export function getProjectHealthSummary(project: EnergyProject): HealthIndicator[] {
  const indicators: HealthIndicator[] = [];

  // 1. Current Phase
  const phaseInfo = getProjectPhase(project.status);
  indicators.push({
    label: 'مرحله چرخه عمر',
    value: phaseInfo.phase ? phaseInfo.phase.title : (project.status === 'CANCELLED' ? 'لغو شده' : '—'),
    subtext: `گام ${phaseInfo.phaseIndex > 0 ? phaseInfo.phaseIndex : '—'} از ۵`,
    badgeType: 'info'
  });

  // 2. Stage Progress label
  let stageLabel = 'در حال بررسی اولیه';
  let stageBadge: 'neutral' | 'info' | 'success' | 'warning' = 'info';
  switch (project.status) {
    case 'DRAFT':
    case 'ANALYSIS':
    case 'FEASIBILITY':
      stageLabel = 'طراحی و امکان‌سنجی اولیه';
      stageBadge = 'neutral';
      break;
    case 'READY_FOR_RFQ':
    case 'RFQ_OPEN':
      stageLabel = 'فرآیند مناقصه و استعلام';
      stageBadge = 'info';
      break;
    case 'BIDS_RECEIVED':
    case 'EPC_SELECTED':
      stageLabel = 'ارزیابی و انتخاب مجری';
      stageBadge = 'info';
      break;
    case 'CONTRACTING':
    case 'FINANCING':
    case 'PROCUREMENT':
      stageLabel = 'تأمین مالی و تجهیزات';
      stageBadge = 'warning';
      break;
    case 'CONSTRUCTION':
      stageLabel = 'عملیات احداث فیزیکی';
      stageBadge = 'warning';
      break;
    case 'COMMISSIONING':
      stageLabel = 'راه‌اندازی و تست نهایی';
      stageBadge = 'warning';
      break;
    case 'OPERATIONAL':
    case 'MAINTENANCE':
      stageLabel = 'بهره‌برداری تجاری فعال';
      stageBadge = 'success';
      break;
    case 'CANCELLED':
      stageLabel = 'متوقف / لغو شده';
      stageBadge = 'neutral';
      break;
  }
  indicators.push({
    label: 'وضعیت مرحله جاری',
    value: stageLabel,
    subtext: `کد وضعیت: ${project.status}`,
    badgeType: stageBadge
  });

  // 3. Financial status
  const budgetFormatted = project.estimatedBudgetIRR 
    ? formatCurrencyIRR(project.estimatedBudgetIRR)
    : (project.estimatedBudget?.amount ? `${project.estimatedBudget.amount.toLocaleString()} ${project.estimatedBudget.currency}` : '—');
  
  indicators.push({
    label: 'برآورد مالی و سرمایه‌گذاری',
    value: budgetFormatted,
    subtext: project.estimatedBudgetIRR ? 'برآورد بر مبنای شاخص بازار' : 'بودجه تفصیلی ثبت نشده',
    badgeType: project.estimatedBudgetIRR ? 'info' : 'neutral'
  });

  // 4. Grid status
  const gridConnected = project.energyRequirement?.gridConnected ?? true;
  indicators.push({
    label: 'اتصال به شبکه سراسری',
    value: gridConnected ? 'متصل به شبکه (On-Grid)' : 'منفصل از شبکه (Off-Grid)',
    subtext: project.energyRequirement?.gridStable === false ? 'شبکه ناپایدار (نیازمند پشتیبان)' : 'تأییدیه اولیه اتصال',
    badgeType: gridConnected ? 'success' : 'warning'
  });

  return indicators;
}

/**
 * Mapping legacy or direct tabs to corresponding lifecycle phase and capability
 */
export function mapTabToPhaseAndCapability(tab: string): {
  phaseId: LifecyclePhaseId;
  capabilityId: string;
} {
  switch (tab) {
    case 'overview':
    case 'site':
      return { phaseId: 'phase-1-design', capabilityId: 'site-info' };
    case 'financial':
      return { phaseId: 'phase-1-design', capabilityId: 'financial-analysis' };
    case 'rfq':
      return { phaseId: 'phase-2-preparation', capabilityId: 'rfq' };
    case 'bids':
      return { phaseId: 'phase-2-preparation', capabilityId: 'bids' };
    case 'contract':
      return { phaseId: 'phase-3-contracting', capabilityId: 'contract' };
    case 'financing':
      return { phaseId: 'phase-3-contracting', capabilityId: 'financing' };
    case 'investment':
      return { phaseId: 'phase-3-contracting', capabilityId: 'investment' };
    case 'procurement':
      return { phaseId: 'phase-3-contracting', capabilityId: 'procurement' };
    case 'milestones':
      return { phaseId: 'phase-4-execution', capabilityId: 'milestones' };
    case 'commissioning':
      return { phaseId: 'phase-4-execution', capabilityId: 'commissioning' };
    case 'handover':
      return { phaseId: 'phase-4-execution', capabilityId: 'handover' };
    case 'asset':
      return { phaseId: 'phase-5-operation', capabilityId: 'asset' };
    case 'monitoring':
      return { phaseId: 'phase-5-operation', capabilityId: 'monitoring-status' };
    default:
      return { phaseId: 'phase-1-design', capabilityId: 'site-info' };
  }
}
