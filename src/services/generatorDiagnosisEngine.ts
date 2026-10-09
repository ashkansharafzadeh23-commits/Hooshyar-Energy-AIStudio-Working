/**
 * HOOSHYAR ENERGY — GENERATOR DIAGNOSIS ENGINE
 * Stage 13.11-E.2.1: Safety-First Preliminary Diagnosis & Strict Safety Triage
 *
 * Safety-first, conservative preliminary assessment.
 * Completely decoupled from solar inverter/photovoltaic algorithms.
 * NO fabricated probabilities. NO hazardous user DIY repair instructions.
 */

import {
  GeneratorEquipmentCategory,
  GeneratorOperatingContext,
  GeneratorPreliminaryRuleResult,
  GeneratorQualitativeStatus,
  GENERATOR_SAFETY_RULES
} from '../types/generatorMaintenance.js';
import { DiagnosisRootCause, DiagnosisAction } from '../types/maintenance.js';

/**
 * Strict explicit routing: ONLY recognized generator equipment categories.
 * Never match on generic keywords like "موتور" or "برق".
 */
export function isGeneratorEquipment(equipmentType?: string): boolean {
  if (!equipmentType) return false;
  const upper = equipmentType.trim().toUpperCase();
  return upper === 'PORTABLE_GENERATOR' || upper === 'STATIONARY_GENSET';
}

export function evaluateGeneratorPreliminaryFaults(params: {
  equipmentCategory: GeneratorEquipmentCategory | string;
  symptoms: string[];
  description?: string;
  operatingContext?: GeneratorOperatingContext;
}): GeneratorPreliminaryRuleResult {
  const symptomsJoined = (params.symptoms.join(' ') + ' ' + (params.description || '')).toLowerCase();
  const rootCauses: DiagnosisRootCause[] = [];
  const actions: DiagnosisAction[] = [];
  const requiredTools: string[] = [];
  const requiredParts: string[] = [];
  const safetyGuidance: string[] = [];
  const criticalHazards: string[] = [];

  const ctx = params.operatingContext || {};
  const isDiesel = ctx.fuelType === 'DIESEL' || symptomsJoined.includes('گازوئیل') || symptomsJoined.includes('دیزل');
  const isGasoline = ctx.fuelType === 'GASOLINE' || symptomsJoined.includes('بنزین');
  const isLongStored = ctx.storageDuration === 'STORED_OVER_3_MO' || symptomsJoined.includes('خوابیده') || symptomsJoined.includes('انبار') || symptomsJoined.includes('مدت طولانی');

  // =========================================================================
  // 1. DETERMINISTIC AUTHORITATIVE SAFETY GATE (Runs First & Unconditionally)
  // =========================================================================

  // A. Carbon Monoxide exposure or indoor operation
  const isIndoor = ctx.indoorOperation === true ||
    symptomsJoined.includes('فضای بسته') ||
    symptomsJoined.includes('پارکینگ') ||
    symptomsJoined.includes('زیرزمین') ||
    symptomsJoined.includes('اتاق') ||
    symptomsJoined.includes('داخل منزل') ||
    symptomsJoined.includes('indoor');

  const isCoSymptom = symptomsJoined.includes('مونوکسید') ||
    symptomsJoined.includes('سرگیجه') ||
    symptomsJoined.includes('سردرد') ||
    symptomsJoined.includes('تهوع') ||
    symptomsJoined.includes('co poisoning') ||
    symptomsJoined.includes('خفگی');

  if (isIndoor || isCoSymptom) {
    criticalHazards.push('خطر مسمومیت مرگبار با گاز مونوکسید کربن (CO Poisoning / Indoor Running)');
    safetyGuidance.push(
      GENERATOR_SAFETY_RULES[0].title + ': ' + GENERATOR_SAFETY_RULES[0].warningText + ' الزامات حیاتی: ' + GENERATOR_SAFETY_RULES[0].mandatoryStep
    );
  } else {
    // Universal outdoor ventilation baseline reminder
    safetyGuidance.push(
      GENERATOR_SAFETY_RULES[0].title + ': ' + GENERATOR_SAFETY_RULES[0].warningText
    );
  }

  // B. Fuel or Gas Leakage
  const isFuelLeak =
    symptomsJoined.includes('fuel_or_oil_leak') ||
    symptomsJoined.includes('نشتی بنزین') ||
    symptomsJoined.includes('نشتی گازوئیل') ||
    symptomsJoined.includes('نشتی گاز') ||
    symptomsJoined.includes('بوی بنزین') ||
    symptomsJoined.includes('بوی گاز') ||
    symptomsJoined.includes('چکه سوخت') ||
    symptomsJoined.includes('fuel leak');

  if (isFuelLeak) {
    criticalHazards.push('خطر اشتعال و انفجار سوخت (Fuel Leak Hazard)');
    safetyGuidance.push(
      GENERATOR_SAFETY_RULES[1].title + ': ' + GENERATOR_SAFETY_RULES[1].warningText + ' الزامات حیاتی: ' + GENERATOR_SAFETY_RULES[1].mandatoryStep
    );
    rootCauses.push({
      cause: 'نشتی در اتصالات، مسیرهای سوخت‌رسانی یا کاربراتور/انژکتور (نیازمند بررسی ایمن توسط متخصص)',
      probability: 0,
      description: 'ریزش سوخت روی سطوح گرم موتور خطر حریق فوری دارد. بهره‌برداری باید بلافاصله متوقف شود.'
    });
    actions.push({
      action: 'توقف فوری بهره‌برداری، دور شدن از مجاورت دستگاه، پرهیز مطلق از استارت یا ایجاد جرقه، و فراخوانی تکنسین متخصص جهت رفع ایمن نشتی',
      priority: 'CRITICAL',
      estimatedHours: 0.5
    });
  }

  // C. Fire
  const isFire =
    symptomsJoined.includes('آتش') ||
    symptomsJoined.includes('حریق') ||
    symptomsJoined.includes('شعله') ||
    symptomsJoined.includes('آتش‌سوزی') ||
    symptomsJoined.includes('fire');

  if (isFire) {
    criticalHazards.push('خطر حریق فعال (Active Fire Hazard)');
    safetyGuidance.push(
      GENERATOR_SAFETY_RULES[2].title + ': ' + GENERATOR_SAFETY_RULES[2].warningText + ' الزامات حیاتی: ' + GENERATOR_SAFETY_RULES[2].mandatoryStep
    );
    actions.unshift({
      action: 'تخلیه فوری محیط، حفظ فاصله ایمن و تماس بلادرنگ با آتش‌نشانی (۱۲۵). هرگز خودسرانه به دستگاه نزدیک نشوید.',
      priority: 'CRITICAL',
      estimatedHours: 0
    });
  }

  // D. Electrical Shock & Exposed Energized Conductors
  const isShockOrExposed =
    symptomsJoined.includes('برق‌گرفتگی') ||
    symptomsJoined.includes('سیم لخت') ||
    symptomsJoined.includes('هادی لخت') ||
    symptomsJoined.includes('جرقه') ||
    symptomsJoined.includes('اتصال بدنه') ||
    symptomsJoined.includes('shock') ||
    symptomsJoined.includes('electrocution');

  if (isShockOrExposed) {
    criticalHazards.push('خطر برق‌گرفتگی و شوک الکتریکی فشار قوی (Electrical Shock Hazard)');
    safetyGuidance.push(
      GENERATOR_SAFETY_RULES[3].title + ': ' + GENERATOR_SAFETY_RULES[3].warningText + ' الزامات حیاتی: ' + GENERATOR_SAFETY_RULES[3].mandatoryStep
    );
    actions.push({
      action: 'پرهیز کامل از لمس هرگونه سیم یا بدنه فلزی برق‌دار و قطع برق از کلید بالادست در صورت دسترسی ایمن، سپس ارجاع فوری به کارشناس برق',
      priority: 'CRITICAL',
      estimatedHours: 0.5
    });
  }

  // E. Grid Backfeed
  const isBackfeed =
    symptomsJoined.includes('برق شهر قطع') ||
    symptomsJoined.includes('پریز') ||
    symptomsJoined.includes('برق‌برگشتی') ||
    symptomsJoined.includes('backfeed') ||
    symptomsJoined.includes('چنج‌اور') ||
    symptomsJoined.includes('ats_transfer_failed');

  if (isBackfeed) {
    criticalHazards.push('خطر بالقوه برق‌برگشتی به شبکه توزیع (Backfeed Danger)');
    safetyGuidance.push(
      GENERATOR_SAFETY_RULES[4].title + ': ' + GENERATOR_SAFETY_RULES[4].warningText + ' الزامات حیاتی: ' + GENERATOR_SAFETY_RULES[4].mandatoryStep
    );
  }

  // F. Engine Runaway / Uncontrolled Speed
  const isRunaway =
    symptomsJoined.includes('دور موتور بی‌نهایت') ||
    symptomsJoined.includes('گاز هرز') ||
    symptomsJoined.includes('runaway') ||
    symptomsJoined.includes('خارج از کنترل');

  if (isRunaway) {
    criticalHazards.push('خطر خارج شدن کنترل دور موتور (Engine Runaway)');
    safetyGuidance.push(
      GENERATOR_SAFETY_RULES[5].title + ': ' + GENERATOR_SAFETY_RULES[5].warningText + ' الزامات حیاتی: ' + GENERATOR_SAFETY_RULES[5].mandatoryStep
    );
  }

  // Universal hot parts reminder
  safetyGuidance.push(
    GENERATOR_SAFETY_RULES[6].title + ': ' + GENERATOR_SAFETY_RULES[6].mandatoryStep
  );

  // =========================================================================
  // 2. CONSERVATIVE PRELIMINARY FAULT INTAKE (Hypotheses - No DIY Repairs)
  // =========================================================================

  // A. CRANK NO START / FAILS TO FIRE
  const isCrankNoStart =
    symptomsJoined.includes('crank_no_start') ||
    symptomsJoined.includes('استارت می‌خورد ولی') ||
    symptomsJoined.includes('روشن نمی‌شود') ||
    symptomsJoined.includes('روشن نمیشه') ||
    symptomsJoined.includes('fails to start');

  if (isCrankNoStart) {
    if (isDiesel) {
      rootCauses.push(
        {
          cause: 'احتمال نفوذ هوا به مدار سوخت یا گرفتگی فیلتر اولیه/سپراتور گازوئیل',
          probability: 0,
          description: 'نیاز به هواگیری اصولی مسیر انژکتورها و بررسی کیفیت سوخت توسط تکنسین ماهر دیزل'
        },
        {
          cause: 'احتمال اختلال در مدار بوبین شیر برقی قطع‌کن سوخت (Stop Solenoid)',
          probability: 0,
          description: 'عدم باز شدن مجرای سوخت پمپ انژکتور ناشی از ضعف مدار فرمان یا بوبین سلونوئید'
        },
        {
          cause: 'احتمال سوختگی یا عدم عملکرد شمع‌های گرمکن در شرایط هوای سرد (Glow Plugs)',
          probability: 0,
          description: 'نرسیدن دمای محفظه احتراق به حد نصاب اشتعال تراکمی گازوئیل'
        }
      );
      actions.push(
        { action: 'بررسی ایمن شیر سوخت، بازبینی نشانگر سطح سوخت و هماهنگی جهت بازدید تکنسین جهت هواگیری مدار سوخت', priority: 'HIGH', estimatedHours: 1.0 }
      );
      requiredTools.push('ابزارهای تخصصی اندازه‌گیری فشار سوخت و تست الکتریکی (ویژه کارشناس)');
      requiredParts.push('فیلتر گازوئیل مطابق با پارت‌نامبر استاندارد کاتالوگ سازنده');
    } else {
      rootCauses.push(
        {
          cause: isLongStored
            ? 'احتمال اکسیداسیون و رسوب صمغ سوخت مانده در ژیگلورهای کاربراتور ناشی از خواب طولانی'
            : 'احتمال گرفتگی مجاری کاربراتور یا بسته بودن شیر سوخت/ساسات',
          probability: 0,
          description: 'سوخت کهنه پس از چند ماه اکسید شده و نیازمند شستشوی اصولی کاربراتور توسط تکنسین است'
        },
        {
          cause: 'احتمال عدم جرقه‌زنی مناسب شمع یا ضعف مدار مگنت و کوئل احتراق',
          probability: 0,
          description: 'دوده گرفتگی الکترود شمع یا خرابی کوئل جرقه‌زن'
        },
        {
          cause: 'احتمال قطع مدار جرقه‌زنی توسط سنسور هشدار کمبود روغن موتور (Low Oil Cutoff)',
          probability: 0,
          description: 'پایین بودن سطح روغن در کارتر مانع روشن شدن ایمن موتور می‌شود'
        }
      );
      actions.push(
        { action: 'بررسی چشمی سطح روغن موتور از طریق گیج روغن پس از خنک شدن کامل دستگاه', priority: 'HIGH', estimatedHours: 0.2 },
        { action: 'اطمینان از قرار داشتن سوییچ اصلی در حالت روشن (ON) و باز بودن شیر بنزین و ساسات', priority: 'MEDIUM', estimatedHours: 0.1 },
        { action: 'در صورت خواب طولانی دستگاه، ارجاع به تعمیرکار مجاز جهت سرویس ایمن کاربراتور و تعویض بنزین کهنه', priority: 'HIGH', estimatedHours: 1.0 }
      );
      requiredTools.push('ابزار بازرسی عمومی گیج روغن و تجهیزات تست استاندارد تعمیرگاهی');
      requiredParts.push('شمع استاندارد مطابق با کاتالوگ کارخانه سازنده');
    }
  }

  // B. NO CRANK / STARTER DEAD
  const isNoCrank =
    symptomsJoined.includes('no_crank') ||
    symptomsJoined.includes('استارت اصلاً') ||
    symptomsJoined.includes('استارت نمیزنه') ||
    symptomsJoined.includes('استارت نمی‌زند') ||
    symptomsJoined.includes('استارت نمی زند') ||
    symptomsJoined.includes('هندل قفل') ||
    symptomsJoined.includes('هندل سفت');

  if (isNoCrank) {
    if (isDiesel) {
      rootCauses.push(
        {
          cause: 'احتمال افت شدید ولتاژ باتری زیر بار استارت دیزل یا نقص مدار بوبین اتوماتیک استارت و شمع‌های گرمکن گازوئیل',
          probability: 0,
          description: 'دیزل‌ژنراتورها به آمپراژ استارت بسیار بالاتری نیاز دارند؛ ضعف باتری یا اتصالات مانع گردش میل‌لنگ می‌شود'
        },
        {
          cause: 'احتمال خرابی رله استارتر یا کلید مغناطیسی استارت دیزل',
          probability: 0,
          description: 'عدم درگیری دنده استارتر با چرخ‌دنده فلایویل'
        },
        {
          cause: 'احتمال قفل هیدرواستاتیکی سیلندر یا گریپاژ قطعات متحرک میل‌لنگ',
          probability: 0,
          description: 'نفوذ گازوئیل یا آب به محفظه احتراق؛ از اعمال فشار مکانیکی به موتور جداً خودداری شود'
        }
      );
    } else {
      rootCauses.push(
        {
          cause: 'احتمال دشارژ یا فرسودگی باتری استارت / شل بودن بست‌های سر باتری',
          probability: 0,
          description: 'افت توان خروجی باتری مانع عملکرد استارتر برقی می‌گردد'
        },
        {
          cause: 'احتمال خرابی رله یا اتوماتیک استارت (Starter Solenoid)',
          probability: 0,
          description: 'شنیده شدن صدای کلیک رله بدون چرخش موتور'
        },
        {
          cause: 'احتمال قفل هیدرواستاتیکی یا گریپاژ مکانیکی موتور (Hydro-lock / Mechanical Seizure)',
          probability: 0,
          description: 'نفوذ مایعات به محفظه احتراق یا قفل قطعات متحرک؛ از وارد کردن فشار غیرعادی به هندل پرهیز فرمایید'
        }
      );
    }
    actions.push(
      { action: 'پرهیز از تحمیل فشار مکانیکی به هندل، بررسی وضعیت ظاهری بست‌های باتری و ارجاع به کارشناس جهت تست بار باتری و سلامت موتور', priority: 'HIGH', estimatedHours: 0.5 }
    );
    requiredTools.push('تستر باتری و ادوات تست مکانیکی تعمیرگاهی');
    requiredParts.push('باتری استارت استاندارد با ظرفیت و ابعاد مطابق راهنمای سازنده');
  }

  // C. LOW OR NO VOLTAGE / AVR DEFECT
  const isVoltageProblem =
    symptomsJoined.includes('low_or_no_voltage') ||
    symptomsJoined.includes('برق تولید نمی‌شود') ||
    symptomsJoined.includes('ولتاژ افت') ||
    symptomsJoined.includes('ولتاژ صفر') ||
    symptomsJoined.includes('avr') ||
    symptomsJoined.includes('بدون برق') ||
    symptomsJoined.includes('افت ولتاژ');

  if (isVoltageProblem) {
    rootCauses.push(
      {
        cause: 'احتمال نقص در رگولاتور خودکار ولتاژ (AVR) یا سوختگی المان‌های تنظیم ولتاژ',
        probability: 0,
        description: 'عدم تثبیت ولتاژ خروجی؛ مدارهای تحریک برق‌دار و خطرناک هستند و آزمون آن نیازمند تکنسین ماهر است'
      },
      {
        cause: 'احتمال قطع بودن کلید مینیاتوری یا بریکر خروجی تابلوی ژنراتور',
        probability: 0,
        description: 'عملکرد کلید حفاظتی ناشی از اضافه‌بار لحظه‌ای یا اتصال کوتاه مصرف‌کننده'
      },
      {
        cause: 'احتمال از بین رفتن پسماند مغناطیسی یا سایش زغال‌های روتور و اسلیپ‌رینگ‌ها',
        probability: 0,
        description: 'کاهش تحریک اولیه در ژنراتورهایی که مدتی خاموش بوده‌اند'
      }
    );
    actions.push(
      { action: 'قطع تمامی دوشاخه‌ها و بارهای متصل به ژنراتور، و بررسی موقعیت کلید فیوز خروجی تابلوی دستگاه', priority: 'HIGH', estimatedHours: 0.2 },
      { action: 'در صورت تداوم فقدان برق، ارجاع تجهیز به کارشناس برق ژنراتور جهت بررسی ایمن مدار تحریک و AVR (از اندازه‌گیری دستی مدارهای برق‌دار جداً پرهیز شود)', priority: 'HIGH', estimatedHours: 1.0 }
    );
    requiredTools.push('مولتی‌متر کالیبره صنعتی (مخصوص کارشناس برق)');
    requiredParts.push('ماژول AVR فابریک متناسب با توان ژنراتور');
  }

  // D. HUNTING / SURGING / RPM UNSTABLE
  const isHunting =
    symptomsJoined.includes('hunting_surging') ||
    symptomsJoined.includes('نوسان دور موتور') ||
    symptomsJoined.includes('گاز خوردن سینوسی') ||
    symptomsJoined.includes('hunting') ||
    symptomsJoined.includes('دور موتور بازی') ||
    symptomsJoined.includes('surging');

  if (isHunting) {
    rootCauses.push(
      {
        cause: 'احتمال نوسان نسبت سوخت و هوا ناشی از گرفتگی ژیگلور دور آرام کاربراتور یا مکش هوای کاذب',
        probability: 0,
        description: 'واکنش پی‌درپی گاورنر مکانیکی جهت جبران افت دور موتور'
      },
      {
        cause: 'احتمال اختلال در تنظیمات یا فنر بازوی گاورنر مکانیکی / اکچویتور الکترونیکی',
        probability: 0,
        description: 'از دستکاری خودسرانه پیچ‌ها و فنرهای گاورنر به دلیل خطر دور برداشتن خطرناک موتور (Runaway) خودداری شود'
      }
    );
    actions.push(
      { action: 'بررسی عدم مسدود بودن فیلتر هوا و قطع بارهای القایی نوسان‌دار', priority: 'MEDIUM', estimatedHours: 0.3 },
      { action: 'ارجاع به تکنسین تنظیم دور و گاورنر جهت تست فرکانس دقیق خروجی بر روی ۵۰ هرتز', priority: 'HIGH', estimatedHours: 0.8 }
    );
    requiredTools.push('فرکانس‌متر دقیق و تاکومتر دورسنج کالیبره (مخصوص کارشناس O&M)');
  }

  // E. SMOKE / OVERHEATING
  const isSmokeOrHeat =
    symptomsJoined.includes('black_or_white_smoke') ||
    symptomsJoined.includes('overheating') ||
    symptomsJoined.includes('دود') ||
    symptomsJoined.includes('جوش') ||
    symptomsJoined.includes('داغ') ||
    symptomsJoined.includes('حرارت');

  if (isSmokeOrHeat) {
    rootCauses.push(
      {
        cause: 'احتمال تحمیل اضافه‌بار فراتر از ظرفیت نامی پیوسته ژنراتور یا انسداد گردش هوای خنک‌کاری',
        probability: 0,
        description: 'تولید حرارت بیش از ظرفیت اتلاف سیستم خنک‌کننده'
      },
      {
        cause: isDiesel
          ? 'احتمال احتراق ناقص گازوئیل ناشی از کثیفی سوزن انژکتور، تاخیر پاشش یا انسداد فیلتر هوا'
          : 'احتمال بسته ماندن ساسات یا مخلوط سوخت بیش‌ازحد غنی (Rich Mixture)',
        probability: 0,
        description: 'خروج دود سیاه نشانه احتراق ناقص و هدررفت سوخت است'
      }
    );
    actions.push(
      { action: 'کاهش فوری بارهای متصل به دستگاه و اطمینان از قرار داشتن دستگاه در محیط باز با جریان آزاد هوا', priority: 'HIGH', estimatedHours: 0.2 },
      { action: 'خاموش کردن ایمن دستگاه، اجازه خنک‌شدن به مدت حداقل ۳۰ دقیقه و هماهنگی جهت بازرسی فیلترها و مایعات خنک‌کننده', priority: 'HIGH', estimatedHours: 0.5 }
    );
    requiredTools.push('دماسنج تفنگی لیزری مادون قرمز و کلمپ‌آمپرمتر (مخصوص کارشناس)');
  }

  // F. ATS / TRANSFER SWITCH FAILURE
  const isAtsFailure =
    symptomsJoined.includes('ats_transfer_failed') ||
    symptomsJoined.includes('چنج‌اور') ||
    symptomsJoined.includes('ats') ||
    symptomsJoined.includes('تابلو چنج اور');

  if (isAtsFailure) {
    rootCauses.push(
      {
        cause: 'احتمال عدم تطابق پارامترهای ولتاژ یا فرکانس خروجی با آستانه پذیرش بورد ATS یا نقص مدار فرمان کنتاکتورها',
        probability: 0,
        description: 'بورد چنج‌اور به منظور حفظ ایمنی مصرف‌کننده‌ها تا زمان تثبیت کامل ولتاژ و فرکانس از وصل مدار امتناع می‌ورزد'
      }
    );
    actions.push(
      { action: 'بررسی روشن بودن ژنراتور و تثبیت دور موتور؛ در صورت عدم اتصال خودکار بار، منحصراً از تکنسین مجرب تابلوی برق جهت بررسی کنتاکتورها و اینترلاک کمک بگیرید', priority: 'HIGH', estimatedHours: 0.5 }
    );
    requiredTools.push('تستر توالی فاز، ولت‌متر True-RMS و فرکانس‌متر تابلو (مخصوص برق‌کار ماهر)');
  }

  // General fallback if no specific fault pattern matched
  if (rootCauses.length === 0) {
    rootCauses.push(
      {
        cause: 'نیاز به انجام سرویس دوره‌ای استاندارد ژنراتور و بازبینی عمومی اتصالات',
        probability: 0,
        description: 'بر اساس علائم گزارش‌شده، خرابی حادی ثبت نشده است ولی بازبینی دوره‌ای پیشگیرانه الزامی است.'
      }
    );
    actions.push(
      { action: 'بررسی گیج روغن، سطح سوخت و تمیزی اتصالات پس از خنک‌شدن دستگاه، و ثبت نوبت سرویس دوره‌ای', priority: 'MEDIUM', estimatedHours: 0.5 }
    );
  }

  // =========================================================================
  // 3. QUALITATIVE CATEGORIZATION (No Fabricated Probabilities)
  // =========================================================================

  let qualitativeStatus: GeneratorQualitativeStatus = 'PRELIMINARY_POSSIBLE_CAUSES';
  const isUrgentSafetyEscalation = criticalHazards.length > 0;

  if (isUrgentSafetyEscalation) {
    qualitativeStatus = 'URGENT_SAFETY_ESCALATION';
  } else if (params.symptoms.length === 0 && (!params.description || params.description.trim().length === 0)) {
    qualitativeStatus = 'INSUFFICIENT_INFORMATION';
  } else if (rootCauses.length > 0) {
    qualitativeStatus = 'PROFESSIONAL_INSPECTION_REQUIRED';
  }

  // Zero out any legacy probability field to avoid statistical claims
  const sanitizedRootCauses = rootCauses.map(rc => ({
    ...rc,
    probability: 0
  }));

  return {
    qualitativeStatus,
    isUrgentSafetyEscalation,
    criticalHazardsIdentified: Array.from(new Set(criticalHazards)),
    rootCauses: sanitizedRootCauses,
    actions,
    requiredTools: Array.from(new Set(requiredTools)),
    requiredParts: Array.from(new Set(requiredParts)),
    safetyGuidance: Array.from(new Set(safetyGuidance))
  };
}
