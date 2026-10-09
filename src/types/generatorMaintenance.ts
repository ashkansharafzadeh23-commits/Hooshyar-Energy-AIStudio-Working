/**
 * HOOSHYAR ENERGY — GENERATOR MAINTENANCE CONTRACTS & RULES
 * Stage 13.11-E.2.1: Safety-First Preliminary Diagnosis & Strict Safety Triage
 *
 * Explicitly decoupled from solar calculations. No combined solar-generator engineering.
 */

import { DiagnosisRootCause, DiagnosisAction } from './maintenance.js';

export type GeneratorEquipmentCategory =
  | 'PORTABLE_GENERATOR' // موتور برق پرتابل / بنزینی یا گازسوز سبک
  | 'STATIONARY_GENSET';   // دیزل‌ژنراتور ثابت / ژنراتور گازسوز دائم‌کار یا اضطراری

export type GeneratorFuelSource =
  | 'GASOLINE'
  | 'DIESEL'
  | 'NATURAL_GAS_CNG'
  | 'DUAL_FUEL'
  | 'UNKNOWN';

export type GeneratorPhaseContext =
  | 'SINGLE_PHASE'
  | 'THREE_PHASE'
  | 'UNKNOWN';

export type GeneratorCoolingType =
  | 'AIR_COOLED'
  | 'WATER_COOLED_RADIATOR'
  | 'UNKNOWN';

export type GeneratorStartingMethod =
  | 'RECOIL_MANUAL' // هندلی دستی
  | 'ELECTRIC_KEY'   // استارت الکتریکی با سوییچ
  | 'ATS_AUTOMATIC'  // تابلو چنج‌اور اتوماتیک ATS
  | 'UNKNOWN';

export type GeneratorStorageDuration =
  | 'ACTIVE_WEEKLY'       // در حال استفاده هفتگی یا روزانه
  | 'STORED_UNDER_3_MO'   // خاموش کمتر از ۳ ماه
  | 'STORED_OVER_3_MO'    // خاموش بیش از ۳ ماه
  | 'UNKNOWN';

export interface GeneratorOperatingContext {
  fuelType?: GeneratorFuelSource;
  phase?: GeneratorPhaseContext;
  coolingType?: GeneratorCoolingType;
  startingMethod?: GeneratorStartingMethod;
  runningHoursEstimate?: number;
  lastServiceMonthsAgo?: number;
  storageDuration?: GeneratorStorageDuration;
  ratedCapacityKw?: number;
  indoorOperation?: boolean;
  loadStateWhenFaultOccurred?: 'NO_LOAD' | 'PARTIAL_LOAD' | 'FULL_LOAD' | 'OVERLOAD' | 'STARTUP';
}

export type GeneratorSymptomId =
  | 'CRANK_NO_START'         // استارت می‌خورد ولی روشن نمی‌شود
  | 'NO_CRANK'               // استارت اصلاً نمی‌زند / هندل قفل است
  | 'STARTS_THEN_STALLS'     // روشن می‌شود ولی پس از چند ثانیه خاموش می‌شود
  | 'LOW_OR_NO_VOLTAGE'      // ولتاژ خروجی صفر است یا افت شدید دارد (زیر ۱۸۰ ولت)
  | 'HUNTING_SURGING'        // نوسان شدید دور موتور و بازی کردن ولتاژ (Hunting/Surging)
  | 'BLACK_OR_WHITE_SMOKE'   // دود سیاه، سفید یا آبی غیرعادی از اگزوز
  | 'OVERHEATING_TEMP_ALARM' // داغ کردن بیش از حد / آلارم دمای آب یا روغن
  | 'FUEL_OR_OIL_LEAK'       // نشتی سوخت یا روغن در زیر دستگاه
  | 'ABNORMAL_VIBRATION'     // لرزش و کوبش شدید غیرعادی یا صدای ضربه مکانیکی
  | 'AVR_FAILURE_SMELL'      // بوی سوختگی سیم‌پیچ یا داغ شدن بیش از حد ژنراتور
  | 'ATS_TRANSFER_FAILED';   // عمل نکردن کلید چنج‌اور ATS در زمان قطعی برق شبکه

export interface GeneratorSymptomOption {
  id: GeneratorSymptomId;
  label: string;
  category: 'STARTING' | 'ELECTRICAL' | 'MECHANICAL' | 'SAFETY';
  isCriticalSafety?: boolean;
}

export const GENERATOR_COMMON_SYMPTOMS: GeneratorSymptomOption[] = [
  { id: 'CRANK_NO_START', label: 'استارت می‌خورد ولی موتور روشن نمی‌شود', category: 'STARTING' },
  { id: 'NO_CRANK', label: 'استارت اصلاً عمل نمی‌کند یا هندل بسیار سفت/قفل است', category: 'STARTING' },
  { id: 'STARTS_THEN_STALLS', label: 'موتور روشن می‌شود ولی بلافاصله یا زیر بار خاموش می‌شود', category: 'STARTING' },
  { id: 'LOW_OR_NO_VOLTAGE', label: 'موتور کار می‌کند ولی برق تولید نمی‌شود یا ولتاژ افت شدید دارد', category: 'ELECTRICAL' },
  { id: 'HUNTING_SURGING', label: 'دور موتور نوسان دارد و صدای گاز خوردن سینوسی است (Hunting)', category: 'MECHANICAL' },
  { id: 'BLACK_OR_WHITE_SMOKE', label: 'خروج دود سیاه غلیظ، دود سفید یا دود آبی از اگزوز', category: 'MECHANICAL' },
  { id: 'OVERHEATING_TEMP_ALARM', label: 'جوش آوردن، هشدار دمای بالای آب یا چراغ هشدار فشار روغن', category: 'MECHANICAL' },
  { id: 'FUEL_OR_OIL_LEAK', label: 'نشتی بنزین، گازوئیل یا روغن در اطراف موتور یا ژنراتور', category: 'SAFETY', isCriticalSafety: true },
  { id: 'AVR_FAILURE_SMELL', label: 'بوی سوختگی عایق یا داغی شدید پوسته دینام/آلترناتور', category: 'ELECTRICAL', isCriticalSafety: true },
  { id: 'ABNORMAL_VIBRATION', label: 'لرزش بسیار شدید غیرعادی یا صدای کوبش و تق‌تق مکانیکی', category: 'MECHANICAL' },
  { id: 'ATS_TRANSFER_FAILED', label: 'تابلو چنج‌اور خودکار (ATS) برق را به ژنراتور منتقل نمی‌کند', category: 'ELECTRICAL' }
];

export type GeneratorSafetySeverity = 'CRITICAL_SAFETY' | 'WARNING';

export interface GeneratorSafetyWarningRule {
  id: string;
  triggerKey: string;
  severity: GeneratorSafetySeverity;
  title: string;
  warningText: string;
  mandatoryStep: string;
}

export const GENERATOR_SAFETY_RULES: GeneratorSafetyWarningRule[] = [
  {
    id: 'SAFETY_CO_POISONING',
    triggerKey: 'CO_OR_INDOOR',
    severity: 'CRITICAL_SAFETY',
    title: 'خطر مرگبار گاز مونوکسید کربن (CO Poisoning)',
    warningText: 'هرگز و تحت هیچ شرایطی موتور برق یا ژنراتور را در فضای بسته، پارکینگ، زیرزمین، راهرو یا نزدیک پنجره‌های باز روشن نکنید. دود اگزوز حاوی گاز بی‌رنگ و بی‌بوی مونوکسید کربن است که ظرف چند دقیقه می‌تواند کشنده باشد. در صورت احساس سرگیجه، سردرد یا تهوع، فوراً محیط را ترک کرده و با اورژانس (۱۱۵) تماس بگیرید.',
    mandatoryStep: 'دستگاه باید منحصراً در فضای باز با تهویه کامل طبیعی و فاصله ایمن حداقل ۶ متر از هرگونه پنجره و بازشو نصب شود.'
  },
  {
    id: 'SAFETY_FUEL_LEAK',
    triggerKey: 'FUEL_LEAK',
    severity: 'CRITICAL_SAFETY',
    title: 'خطر اشتعال و انفجار سوخت (Fuel Fire Risk)',
    warningText: 'نشتی بنزین، گازوئیل یا گاز در مجاورت اگزوز داغ یا کلیدهای الکتریکی خطر انفجار و حریق فوری دارد. از استارت مجدد یا کارکرد دستگاه جداً خودداری کنید. از ایجاد هرگونه جرقه، شعله یا روشن کردن کلید برق در مجاورت محل پرهیز نمایید و از دستگاه فاصله بگیرید.',
    mandatoryStep: 'دستگاه را روشن نکنید، از محل خطر دور شوید و جهت ایمن‌سازی و رفع نشتی از تکنسین مجرب یا خدمات امدادی آتش‌نشانی (۱۲۵) استمداد بطلبید.'
  },
  {
    id: 'SAFETY_FIRE',
    triggerKey: 'FIRE',
    severity: 'CRITICAL_SAFETY',
    title: 'خطر فوری حریق و سوختگی شدید (Fire Hazard)',
    warningText: 'در صورت مشاهده شعله، آتش‌سوزی فعال یا حرارت خارج از کنترل، بلافاصله محیط را تخلیه کرده و فاصله ایمن بگیرید.',
    mandatoryStep: 'فوراً محل را تخلیه نمایید و با سازمان آتش‌نشانی (۱۲۵) تماس حاصل فرمایید. تلاش غیراصولی برای مهار حریق سوخت‌های نفتی بدون کپسول استاندارد پودر و گاز (کلاس B/C) بسیار خطرناک است.'
  },
  {
    id: 'SAFETY_ELECTRICAL_SHOCK',
    triggerKey: 'SHOCK_HAZARD',
    severity: 'CRITICAL_SAFETY',
    title: 'خطر شوک الکتریکی و برق‌گرفتگی مرگبار (Electrocution Risk)',
    warningText: 'ولتاژ خروجی ژنراتور (۲۲۰ الی ۴۰۰ ولت متناوب) در صورت تماس با هادی‌های برق‌دار لخت یا کاربری در شرایط خیس و بارانی می‌تواند کشنده باشد. هرگز با دستان مرطوب به اتصالات دست نزنید.',
    mandatoryStep: 'از لمس بخش‌های الکتریکی یا کابل‌های آسیب‌دیده جداً خودداری نمایید و پیش از هرگونه تماس، با تکنسین مجرب برق تماس بگیرید.'
  },
  {
    id: 'SAFETY_BACKFEED',
    triggerKey: 'BACKFEED',
    severity: 'CRITICAL_SAFETY',
    title: 'خطر مرگبار برق‌برگشتی به شبکه توزیع (Backfeed Hazard)',
    warningText: 'اتصال مستقیم ژنراتور به پریز یا تابلوی ساختمان بدون کلید چنج‌اور دوطرفه تاییدشده استاندارد می‌تواند ولتاژ بالا را به خطوط شبکه توزیع برگشت دهد و جان خط‌بانان و همسایگان را به خطر اندازد.',
    mandatoryStep: 'کلید اصلی فیوز کنتور برق شهر را همواره قطع نگه دارید و اتصال خروجی را منحصراً از طریق کلید ایزوله‌کننده استاندارد چنج‌اور (ATS یا دستی) انجام دهید.'
  },
  {
    id: 'SAFETY_UNCONTROLLED_RPM',
    triggerKey: 'UNCONTROLLED_RPM',
    severity: 'CRITICAL_SAFETY',
    title: 'خطر خارج شدن کنترل دور موتور و تخریب مکانیکی (Engine Runaway)',
    warningText: 'گاز خوردن شدید و کنترل‌نشده دور موتور (Runaway) ممکن است منجر به انفجار مکانیکی قطعات دوار، خرد شدن فلایویل یا سوختن تجهیزات برقی متصل گردد.',
    mandatoryStep: 'از ایستادن در راستای فلایویل یا فن ژنراتور خودداری کرده و با حفظ فاصله ایمن، از متخصص مکانیک دیزل جهت مهار و بازرسی اضطراری کمک بخواهید.'
  },
  {
    id: 'SAFETY_HOT_PARTS',
    triggerKey: 'HOT_PARTS',
    severity: 'WARNING',
    title: 'خطر سوختگی حرارتی شدید و پرتاب قطعات گردنده',
    warningText: 'منیفولد اگزوز و بدنه موتور حرارت بسیار بالایی دارند. پروانه رادیاتور و تسمه‌های در حال گردش می‌توانند آسیب جدی مکانیکی وارد کنند.',
    mandatoryStep: 'پیش از هرگونه بازدید چشمی یا بررسی روغن و مایع خنک‌کننده، حداقل ۳۰ دقیقه اجازه دهید موتور کاملاً خنک شود.'
  }
];

export type GeneratorQualitativeStatus =
  | 'INSUFFICIENT_INFORMATION'
  | 'PRELIMINARY_POSSIBLE_CAUSES'
  | 'PROFESSIONAL_INSPECTION_REQUIRED'
  | 'URGENT_SAFETY_ESCALATION';

export interface GeneratorPreliminaryRuleResult {
  qualitativeStatus: GeneratorQualitativeStatus;
  isUrgentSafetyEscalation: boolean;
  criticalHazardsIdentified: string[];
  rootCauses: DiagnosisRootCause[];
  actions: DiagnosisAction[];
  requiredTools: string[];
  requiredParts: string[];
  safetyGuidance: string[];
}
