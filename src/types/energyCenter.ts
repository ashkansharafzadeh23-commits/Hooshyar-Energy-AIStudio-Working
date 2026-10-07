/**
 * HOOSHYAR ENERGY — IRAN ENERGY INTELLIGENCE CENTER DOMAIN TYPES
 * Stage 13.10.1 Foundation & Information Architecture
 */

export type EnergyContentType = 
  | 'NEWS'              // خبر
  | 'REGULATION'        // مقرره / آیین‌نامه
  | 'ANNOUNCEMENT'      // اطلاعیه رسمی
  | 'MARKET_DATA'       // اطلاعات بازار / بورس انرژی
  | 'TARIFF'            // تعرفه و نرخ خرید
  | 'TENDER'            // مناقصه و فراخوان
  | 'OPPORTUNITY';      // فرصت سرمایه‌گذاری

export type EnergyCategory =
  | 'news_announcements'        // اخبار و اطلاعیه‌ها
  | 'regulations'               // قوانین و مقررات
  | 'energy_exchange'           // بازار برق و بورس انرژی
  | 'tariffs_purchase'          // تعرفه‌ها و خرید برق
  | 'tenders_calls'             // مناقصات و فراخوان‌ها
  | 'investment_opportunities'; // سرمایه‌گذاری و فرصت‌ها

export type RegulatoryStatus =
  | 'ENFORCEABLE'               // لازم‌الاجرا
  | 'AMENDED'                   // اصلاح‌شده
  | 'REPEALED'                  // منسوخ
  | 'PENDING_ENFORCEMENT';      // در انتظار اجرا

export type StakeholderGroup =
  | 'PROJECT_OWNER'             // مالکان پروژه
  | 'INVESTOR'                  // سرمایه‌گذاران
  | 'EPC_CONTRACTOR'            // پیمانکاران EPC
  | 'EQUIPMENT_VENDOR'          // تأمین‌کنندگان تجهیزات
  | 'TECHNICIAN'                // کارشناسان و تکنیسین‌ها
  | 'INDUSTRIAL_CONSUMER';      // صنایع و مشترکان صنعتی

export type EnergyRecordStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED';

export const ENERGY_TOPICS = [
  'خورشیدی',
  'انرژی‌های تجدیدپذیر',
  'برق',
  'بورس انرژی',
  'نیروگاه',
  'سرمایه‌گذاری',
  'تعرفه',
  'خرید تضمینی',
  'اتصال به شبکه',
  'مجوزها',
  'مناقصات',
  'تجهیزات'
] as const;

export type EnergyTopic = typeof ENERGY_TOPICS[number];

export interface EnergyProvenance {
  sourceName: string;
  sourceUrl?: string;
  publishedAt: string;          // ISO date string
  ingestedAt?: string;          // ISO date string
  verifiedAt?: string;          // ISO date string
  isOfficialSource: boolean;
  verifiedBy?: string;
}

export interface EnergyInformationRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body?: string;
  contentType: EnergyContentType;
  category: EnergyCategory;
  topics: string[];
  provenance: EnergyProvenance;
  regulatoryStatus?: RegulatoryStatus;
  keyPoints?: string[];
  affectedStakeholders?: StakeholderGroup[];
  isFeatured?: boolean;
  status: EnergyRecordStatus;
  viewCount?: number;
  metadata?: Record<string, any>;
}

export interface EnergyCenterFilterState {
  searchQuery: string;
  category?: EnergyCategory | 'ALL';
  contentType?: EnergyContentType | 'ALL';
  topic?: string | 'ALL';
  sourceName?: string | 'ALL';
  timeRange?: 'ALL' | 'TODAY' | 'PAST_WEEK' | 'PAST_MONTH' | 'PAST_YEAR';
}

export interface EnergyCategoryMeta {
  id: EnergyCategory;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
}

export const ENERGY_CATEGORIES: EnergyCategoryMeta[] = [
  {
    id: 'news_announcements',
    title: 'اخبار و اطلاعیه‌ها',
    subtitle: 'پوشش رخدادها و اطلاعیه‌های رسمی صنعت برق و انرژی‌های پاک',
    description: 'اطلاعیه‌های وزارت نیرو، ساتبا، توانیر و نهادهای ذی‌ربط با ارجاع دقیق به منبع اصلی.',
    iconName: 'Newspaper'
  },
  {
    id: 'regulations',
    title: 'قوانین و مقررات',
    subtitle: 'چارچوب‌های قانونی، آیین‌نامه‌ها، ضوابط اتصال و مصوبات شورای اقتصاد',
    description: 'متن مصوبات، دستورالعمل‌های فنی و بررسی وضعیت حقوقی و اجرایی مقررات انرژی.',
    iconName: 'Scale'
  },
  {
    id: 'energy_exchange',
    title: 'بازار برق و بورس انرژی',
    subtitle: 'تابلو سبز، گواهی ظرفیت، معاملات مشتقه و روندهای تجاری',
    description: 'تحلیل روندهای معاملاتی تابلوی برق سبز بورس انرژی ایران و ابزارهای مالی مرتبط.',
    iconName: 'TrendingUp'
  },
  {
    id: 'tariffs_purchase',
    title: 'تعرفه‌ها و خرید برق',
    subtitle: 'چارچوب‌های قانونی خرید تضمینی، ماده ۱۲، مدل‌های تهاتر و تعرفه‌های صنعتی',
    description: 'مقررات تعرفه‌ای، سازوکارهای خرید تضمینی برق و مدل‌های اقتصادی فروش برق به صنایع.',
    iconName: 'Coins'
  },
  {
    id: 'tenders_calls',
    title: 'مناقصات و فراخوان‌ها',
    subtitle: 'استعلام‌های پیمانکاری، احداث ساختگاه، خرید تجهیزات و خدمات مهندسی',
    description: 'بستر انتشار مناقصات و فراخوان‌های رسمی پروژه‌های نیروگاهی پس از دریافت از مبادی رسمی.',
    iconName: 'FileCheck2'
  },
  {
    id: 'investment_opportunities',
    title: 'سرمایه‌گذاری و فرصت‌ها',
    subtitle: 'طرح‌های توسعه، الگوهای تأمین مالی و مدل‌های بازگشت سرمایه',
    description: 'معرفی چارچوب‌ها و فرصت‌های سرمایه‌گذاری در بخش انرژی‌های تجدیدپذیر پس از صحه‌گذاری.',
    iconName: 'Briefcase'
  }
];

export const CONTENT_TYPE_LABELS: Record<EnergyContentType, { label: string; badgeClass: string }> = {
  NEWS: {
    label: 'خبر',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
  },
  REGULATION: {
    label: 'مقرره و قانون',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
  },
  ANNOUNCEMENT: {
    label: 'اطلاعیه رسمی',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
  },
  MARKET_DATA: {
    label: 'اطلاعات بازار',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  },
  TARIFF: {
    label: 'تعرفه و نرخ',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  },
  TENDER: {
    label: 'مناقصه و فراخوان',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
  },
  OPPORTUNITY: {
    label: 'فرصت سرمایه‌گذاری',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
  }
};

export const REGULATORY_STATUS_LABELS: Record<RegulatoryStatus, { label: string; badgeClass: string }> = {
  ENFORCEABLE: {
    label: 'لازم‌الاجرا',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200'
  },
  AMENDED: {
    label: 'اصلاح‌شده',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200'
  },
  REPEALED: {
    label: 'منسوخ',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200'
  },
  PENDING_ENFORCEMENT: {
    label: 'در انتظار اجرا',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200'
  }
};

export const STAKEHOLDER_LABELS: Record<StakeholderGroup, string> = {
  PROJECT_OWNER: 'مالکان نیروگاه و کارفرمایان',
  INVESTOR: 'سرمایه‌گذاران و نهادهای مالی',
  EPC_CONTRACTOR: 'پیمانکاران و شرکت‌های EPC',
  EQUIPMENT_VENDOR: 'تأمین‌کنندگان و بازرگانان تجهیزات',
  TECHNICIAN: 'متخصصان، کارشناسان و تکنیسین‌ها',
  INDUSTRIAL_CONSUMER: 'مشترکان صنعتی و خریداران برق'
};
