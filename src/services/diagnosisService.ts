import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { monitoringRepository } from '../repositories/monitoringRepository.js';
import {
  MaintenanceDiagnosis,
  DiagnosisRootCause,
  DiagnosisAction,
  WarrantyImpact,
  DiagnosisMethod
} from '../types/maintenance.js';
import { GoogleGenAI } from '@google/genai';
import { externalCircuitBreakers } from '../reliability/circuitBreaker.js';
import { logger } from '../observability/logger.js';

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Failed to initialize Gemini client:', e);
      geminiClient = null;
    }
  }
  return geminiClient;
}

export const diagnosisService = {
  /**
   * Generates evidence-based diagnosis for an asset / alert
   */
  generateDiagnosis: async (params: {
    assetId?: string;
    alertId?: string;
    componentId?: string;
    equipmentType?: string;
    symptoms?: string[];
    description?: string;
    photos?: any[];
    documents?: any[];
    billData?: any;
    locationCity?: string;
    triggerAiAssisted?: boolean;
  }): Promise<MaintenanceDiagnosis> => {
    const { alertId, componentId, triggerAiAssisted } = params;

    const isUnregistered = !params.assetId || params.assetId === 'UNREGISTERED' || params.assetId === 'STANDALONE';
    let asset: any = null;

    if (!isUnregistered && params.assetId) {
      asset = assetRepository.getAssetById(params.assetId);
      if (!asset) {
        throw new Error('دارایی انرژی مورد نظر یافت نشد.');
      }
    }

    const projectId = asset ? asset.projectId : 'CUSTOMER_DIRECT';
    const effectiveAssetId = asset ? asset.id : 'UNREGISTERED';

    let alert = alertId ? maintenanceRepository.getAlertById(alertId) : undefined;
    const collectedSymptoms: string[] = [...(params.symptoms || [])];
    if (params.description) {
      collectedSymptoms.push(`شرح مشکل: ${params.description}`);
    }

    if (alert) {
      collectedSymptoms.push(`${alert.title}: ${alert.description}`);
      if (alert.metricType) {
        collectedSymptoms.push(`متریک درگیر: ${alert.metricType} (مقدار: ${alert.metricValue ?? 'نامشخص'})`);
      }
    }

    // 1. Check Warranties (Strict validation: invalid/missing/past dates never become ACTIVE)
    const dbWarranties = asset ? assetRepository.getEquipmentWarranties(asset.id) : [];
    const passportWarranties = (asset as any)?.equipmentPassport?.warranties || [];
    const warranties = dbWarranties.length > 0 ? dbWarranties : passportWarranties;

    let warrantyStatus: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    let warrantyImpact: WarrantyImpact = {
      hasWarrantyCoverage: false,
      warrantyStatus: 'INSUFFICIENT_DATA',
      warrantyNotes: 'اطلاعات گارانتی در دسترس نیست یا ثبت نشده است.'
    };

    if (warranties.length > 0) {
      // First try exact component match
      let activeWarranty = componentId ? warranties.find((w: any) => {
        if (!w.endDate) return false;
        const end = new Date(w.endDate);
        if (isNaN(end.getTime()) || end.getTime() < Date.now()) return false;
        if (w.status !== 'ACTIVE') return false;
        return w.componentId === componentId;
      }) : undefined;

      // If no exact component match, check general asset warranty or active equipment warranty for this asset
      if (!activeWarranty) {
        activeWarranty = warranties.find((w: any) => {
          if (!w.endDate) return false;
          const end = new Date(w.endDate);
          if (isNaN(end.getTime()) || end.getTime() < Date.now()) return false;
          if (w.status !== 'ACTIVE') return false;
          return true;
        });
      }

      if (activeWarranty) {
        const end = new Date(activeWarranty.endDate);
        const daysLeft = Math.round((end.getTime() - Date.now()) / (1000 * 3600 * 24));
        warrantyStatus = daysLeft <= 30 ? 'EXPIRING' : 'ACTIVE';

        warrantyImpact = {
          hasWarrantyCoverage: true,
          eligible: true,
          warrantyId: activeWarranty.id,
          warrantyType: activeWarranty.warrantyType || activeWarranty.equipmentType,
          warrantyStatus,
          provider: activeWarranty.provider || activeWarranty.manufacturer || 'سازنده تجهیز',
          claimProcedure: (activeWarranty.claimProcedure || 'ثبت درخواست گارانتی از طریق فرم رسمی سازنده و تحویل به پیمانکار EPC') + ' (منوط به بررسی سازنده)',
          warrantyNotes: `تحت پوشش گارانتی معتبر (${activeWarranty.coverageSummary || activeWarranty.terms || 'پوشش استاندارد'}) تا تاریخ ${activeWarranty.endDate} (${daysLeft} روز باقیمانده). تایید نهایی مطالبه منوط به بررسی فنی شرکت سازنده می‌باشد.`
        };
      } else {
        const expiredWarranty = warranties.find((w: any) => {
          if (!w.endDate) return false;
          const end = new Date(w.endDate);
          return !isNaN(end.getTime()) && end.getTime() < Date.now();
        });

        warrantyStatus = expiredWarranty ? 'EXPIRED' : 'INSUFFICIENT_DATA';
        warrantyImpact = {
          hasWarrantyCoverage: false,
          eligible: false,
          warrantyStatus,
          warrantyNotes: expiredWarranty 
            ? `دوره گارانتی تجهیزات در تاریخ ${expiredWarranty.endDate} منقضی شده است.`
            : 'شرایط گارانتی فعال برای این تجهیز احراز نشد.'
        };
      }
    }

    // 2. Fetch Recent Telemetry & Context
    const recentReadings = asset ? monitoringRepository.getTelemetryReadings(asset.id) : [];
    const hasTelemetryData = recentReadings.length > 0;

    // 3. Evidence-Based Root Cause & Action Derivation
    const symptomsText = (collectedSymptoms.join(' ') + ' ' + (params.equipmentType || '')).toLowerCase();
    const likelyRootCauses: DiagnosisRootCause[] = [];
    const recommendedActions: DiagnosisAction[] = [];
    let confidenceScore = 80;
    let diagnosisStatus: 'INSUFFICIENT_DATA' | 'POSSIBLE_CAUSE_IDENTIFIED' | 'MANUAL_REVIEW_REQUIRED' | 'ACTION_RECOMMENDED' = 'ACTION_RECOMMENDED';

    const isInverterRelated = symptomsText.includes('inverter') || symptomsText.includes('اینورتر') || alert?.alertType === 'INVERTER_FAULT' || alert?.metricType === 'V_DC' || params.equipmentType === 'INVERTER';
    const isBatteryRelated = symptomsText.includes('battery') || symptomsText.includes('soc') || symptomsText.includes('باتری') || alert?.metricType === 'BATTERY_SOC' || params.equipmentType === 'BATTERY';
    const isTempRelated = symptomsText.includes('temperature') || symptomsText.includes('دما') || symptomsText.includes('حرارت') || alert?.metricType === 'MODULE_TEMPERATURE';
    const isPerformanceDrop = symptomsText.includes('performance') || symptomsText.includes('افت') || symptomsText.includes('تولید') || alert?.metricType === 'PERFORMANCE_DEVIATION' || alert?.metricType === 'PERFORMANCE_RATIO' || params.equipmentType === 'PANEL';
    const isGridRelated = symptomsText.includes('frequency') || symptomsText.includes('voltage') || symptomsText.includes('فرکانس') || symptomsText.includes('ولتاژ') || alert?.metricType === 'FREQUENCY' || alert?.metricType === 'VOLTAGE';
    const isTelemetryLoss = symptomsText.includes('loss') || symptomsText.includes('مفقودی') || symptomsText.includes('قطع ارتباط') || alert?.source === 'TELEMETRY_LOSS';

    if (isInverterRelated) {
      likelyRootCauses.push(
        { cause: 'خطای ایزولاسیون سمت DC یا اتصال زمین استرینگ‌ها (Isolation Fault / Ground Fault)', probability: 0.55, description: 'افت مقاومت عایقی کابل‌های DC متصل به ورودی اینورتر' },
        { cause: 'اشکال در ماژول‌های قدرت IGBT یا خرابی برد کنترل اینورتر', probability: 0.30, description: 'داغ شدن بیش از حد یا اتصال کوتاه در طبقه اینورتینگ' },
        { cause: 'انحراف ولتاژ DC ورودی فراتر از محدوده کاری MPPT', probability: 0.15, description: 'ولتاژ ورودی خارج از محدوده مجاز راه اندازی اینورتر' }
      );
      recommendedActions.push(
        { action: 'تست عایقی (میگر) استرینگ‌های DC ورودی به اینورتر', priority: 'CRITICAL', estimatedCostIrr: 12000000, estimatedHours: 2.5 },
        { action: 'بررسی کدهای خطای ثبت‌شده در لاگ اینورتر و تست کارت ارتباطی', priority: 'HIGH', estimatedCostIrr: 5000000, estimatedHours: 1.5 }
      );
      confidenceScore = 85;
      diagnosisStatus = 'ACTION_RECOMMENDED';
    } else if (isBatteryRelated) {
      likelyRootCauses.push(
        { cause: 'خرابی سلول باتری یا افت ظرفیت چرخه شارژ (SOH Degradation)', probability: 0.60, description: 'کاهش نرخ پذیرش شارژ یا اتصال کوتاه داخلی در یکی از بلوک‌های باتری' },
        { cause: 'تنظیمات نادرست شارژر یا اختلال سیستم مدیریت باتری (BMS Cutoff)', probability: 0.25, description: 'قطع پیش از موعد رله شارژ به دلیل قرائت اشتباه دمای باتری' },
        { cause: 'اضافه‌بار مصرفی خارج از منحنی دشارژ استاندارد', probability: 0.15, description: 'تغذیه بارهای سنگین برنامه‌ریزی‌نشده' }
      );
      recommendedActions.push(
        { action: 'تست ظرفیت و اندازه‌گیری ولتاژ تک‌تک سلول‌های بانک باتری زیر بار فرضی', priority: 'CRITICAL', estimatedCostIrr: 15000000, estimatedHours: 3 },
        { action: 'بررسی تنظیمات آستانه ولتاژ قطع و پارامترهای ارتباطی BMS', priority: 'HIGH', estimatedCostIrr: 5000000, estimatedHours: 2 }
      );
      confidenceScore = 88;
      diagnosisStatus = 'ACTION_RECOMMENDED';
    } else if (isTempRelated) {
      likelyRootCauses.push(
        { cause: 'انسداد مسیر هوارسانی و عدم گردش طبیعی هوا در زیر ماژول‌ها', probability: 0.50, description: 'تجمع ضایعات یا طراحی نامناسب فاصله استراکچر تا سطح زمین' },
        { cause: 'ایجاد نقطه داغ (Hotspot) ناشی از ترک مویی یا سایه موضعی', probability: 0.35, description: 'جریان معکوس و داغ شدن بای‌پس دیودهای معیوب' },
        { cause: 'افزایش شدید دمای محیطی فراتر از نقطه تحمل ماژول', probability: 0.15, description: 'تاثیر ضریب دمایی توان (Pmax Temp Coefficient)' }
      );
      recommendedActions.push(
        { action: 'انجام بازرسی و آزمون ترموگرافی مادون قرمز (IR Thermography) بر روی استرینگ‌ها', priority: 'HIGH', estimatedCostIrr: 25000000, estimatedHours: 4 },
        { action: 'بررسی جریان خروجی دیودهای هرزگرد (Bypass Diodes) جعبه تقسیم ماژول', priority: 'MEDIUM', estimatedCostIrr: 10000000, estimatedHours: 2 }
      );
      confidenceScore = 85;
      diagnosisStatus = 'ACTION_RECOMMENDED';
    } else if (isPerformanceDrop) {
      likelyRootCauses.push(
        { cause: 'انباشت گرد و غبار، ذرات صنعتی یا رسوب بر سطح شیشه ماژول‌ها (Soiling)', probability: 0.45, description: 'کاهش تابش موثر ورودی به سلول‌ها' },
        { cause: 'سوختگی فیوز DC یا قطعی در کابل‌کشی استرینگ‌ها', probability: 0.30, description: 'از مدار خارج شدن یک یا چند استرینگ اینورتر' },
        { cause: 'انحراف عملکرد و خطای ردیاب نقطه حداکثر توان (MPPT Inverter Error)', probability: 0.25, description: 'عدم تطابق امپدانس ورودی اینورتر' }
      );
      recommendedActions.push(
        { action: 'شستشوی مکانیزه و استاندارد پنل‌ها با آب تصفیه شده بدون املاح', priority: 'HIGH', estimatedCostIrr: 20000000, estimatedHours: 5 },
        { action: 'اندازه‌گیری ولتاژ مدار باز (Voc) و جریان نامی (Isc) تک‌تک استرینگ‌ها', priority: 'HIGH', estimatedCostIrr: 12000000, estimatedHours: 3 }
      );
      confidenceScore = 82;
      diagnosisStatus = 'ACTION_RECOMMENDED';
    } else if (isGridRelated) {
      likelyRootCauses.push(
        { cause: 'نوسانات ولتاژ شبکه توزیع و فعال‌شدن حفاظت ضدجزیره‌ای اینورتر', probability: 0.65, description: 'تغییرات بار لحظه‌ای پست برق بالادست' },
        { cause: 'کالیبره نبودن سنسورهای ولتاژ یا تنظیمات رله حفاظتی اینورتر', probability: 0.35, description: 'محدوده مجاز تعریف‌شده تنگ‌تر از استانداردهای توانیر' }
      );
      recommendedActions.push(
        { action: 'نصب پاور آنالایزر جهت ثبت هارمونیک و نوسانات ولتاژ در نقطه اتصال به شبکه (PCC)', priority: 'HIGH', estimatedCostIrr: 18000000, estimatedHours: 4 },
        { action: 'هماهنگی با اداره برق منطقه و تنظیم مجدد فریم‌های حفاظتی اینورتر', priority: 'MEDIUM', estimatedCostIrr: 5000000, estimatedHours: 2 }
      );
      confidenceScore = 80;
      diagnosisStatus = 'ACTION_RECOMMENDED';
    } else if (isTelemetryLoss) {
      likelyRootCauses.push(
        { cause: 'قطعی تغذیه یا آسیب به منبع تغذیه مودم / دیتالاگر خورشیدی', probability: 0.55, description: 'نوسان برق ورودی یا اتمام باتری پشتیبان گیت‌وی' },
        { cause: 'آسیب فیزیکی به کابل شبکه یا کابل شیلددار رابط RS-485', probability: 0.35, description: 'خوردگی یا قطعی فیزیکی کابل' },
        { cause: 'اختلال در سیم‌کارت یا آنتن‌دهی اپراتور مخابراتی در سایت', probability: 0.10, description: 'ضعف سیگنال رادیویی' }
      );
      recommendedActions.push(
        { action: 'بازدید میدانی از تابلوی مانیتورینگ و تست چراغ‌های وضعیت PWR / LINK دیتالاگر', priority: 'HIGH', estimatedCostIrr: 8000000, estimatedHours: 2 },
        { action: 'تست پیوستگی سیگنال خط فیزیکی RS485 با مولتی‌متر', priority: 'MEDIUM', estimatedCostIrr: 6000000, estimatedHours: 1.5 }
      );
      confidenceScore = 85;
      diagnosisStatus = 'ACTION_RECOMMENDED';
    } else {
      // General or insufficient symptoms
      if (!hasTelemetryData && collectedSymptoms.length === 0) {
        likelyRootCauses.push({
          cause: 'شواهد یا داده تله‌متری کافی جهت استنتاج علت ریشه‌ای وجود ندارد (INSUFFICIENT_DATA)',
          probability: 1.0,
          description: 'هیچ داده تله‌متری یا نشانه عینی برای این دارایی ثبت نشده است.'
        });
        recommendedActions.push({
          action: 'اتصال منابع تله‌متری فعال یا ثبت گزارش بازدید میدانی کارشناس',
          priority: 'MEDIUM',
          estimatedCostIrr: 0,
          estimatedHours: 1
        });
        confidenceScore = 10;
        diagnosisStatus = 'INSUFFICIENT_DATA';
      } else {
        likelyRootCauses.push(
          { cause: 'افت راندمان عمومی یا نیاز به بازرسی دوره‌ای تجهیزات', probability: 0.70, description: 'نیاز به داده‌های تحلیلی تکمیلی جهت بررسی دقیق‌تر' },
          { cause: 'احتمال اتصالات سست در ترمینال‌ها', probability: 0.30, description: 'افزایش مقاومت تماسی' }
        );
        recommendedActions.push(
          { action: 'اجرای چک‌لیست کامل سرویس و نگهداری پیشگیرانه (PM) و بررسی تخصصی', priority: 'MEDIUM', estimatedCostIrr: 20000000, estimatedHours: 4 }
        );
        confidenceScore = 55;
        diagnosisStatus = 'MANUAL_REVIEW_REQUIRED';
      }
    }

    // Explicitly assemble verified FACTS (not inferred)
    const facts: string[] = asset ? [
      `دارایی: ${asset.name || asset.assetCode} (نوع: ${asset.assetType || 'خورشیدی'})`,
      `ظرفیت نامی: ${asset.installedCapacityKw || 0} کیلووات`,
      `وضعیت تله‌متری: ${hasTelemetryData ? `${recentReadings.length} قرائت در دسترس` : 'فاقد سوابق تله‌متری'}`,
      `وضعیت گارانتی تجهیزات: ${warrantyStatus} (${warrantyImpact.warrantyNotes || ''})`
    ] : [
      `تجهیز مورد بررسی: ${params.equipmentType || 'سامانه یا تجهیز خورشیدی'}`,
      `محل استقرار: ${params.locationCity || 'ثبت‌نشده'}`,
      `وضعیت تله‌متری: فاقد اتصال برخط به دیتالاگر (تجهیز مستقل)`,
      `وضعیت گارانتی: اطلاعات گارانتی در دسترس نیست یا ثبت نشده است.`
    ];

    if (alert) {
      facts.push(`هشدار دریافتی: کد ${alert.alertCode}، عنوان: ${alert.title} (شدت: ${alert.severity})`);
      if (alert.metricType) {
        facts.push(`متریک ثبت‌شده: ${alert.metricType} با مقدار ${alert.metricValue ?? 'ثبت‌نشده'}`);
      }
    }

    // Inferences explicitly distinct from facts
    const inferences: string[] = likelyRootCauses.map(
      rc => `[استنتاج تحلیلی - احتمال ${(rc.probability * 100).toFixed(0)}٪]: ${rc.cause}`
    );

    // Required Tools, Parts, Safety Guidance
    const requiredTools: string[] = [];
    const requiredParts: string[] = [];
    const safetyGuidance: string[] = [
      'هشدار ایمنی ولتاژ بالا: مدارهای استرینگ DC نیروگاه خورشیدی حتی در روزهای ابری برق‌دار و خطرناک هستند.',
      'پیش از هرگونه دستکاری یا بازرسی مکانیکی، کلید قطع زیر بار DC (Isolator) و کلید مینیاتوری AC را قطع نمایید.',
      'هرگز اتصالات کانکتورهای MC4 را در شرایط زیر بار قطع یا وصل نکنید (خطر ایجاد قوس الکتریکی شدید Arc Flash).',
      'در صورت مشاهده بوی سوختگی، صدای جرقه یا دود، بلافاصله کلید اصلی تابلو را قطع و از تجهیز فاصله بگیرید.'
    ];

    if (isInverterRelated) {
      requiredTools.push('مولتی‌متر دیجیتال کلمپی ۱۰۰۰ ولت DC با استاندارد CAT III/IV', 'تستر مقاومت عایقی و میگر (Megohmmeter)', 'تستر توالی فاز و فرکانس شبکه AC');
      requiredParts.push('سرج ارستر / محافظ اضافه ولتاژ DC (Surge Protective Device - SPD)', 'فیوزهای سرامیکی تندکار استرینگ gPV', 'فن خنک‌کننده یا برد پاور/کنترل اینورتر');
    } else if (isBatteryRelated) {
      requiredTools.push('تستر مقاومت داخلی باتری و ولت‌متر میلی‌ولت دقیق', 'دستگاه تست دشارژ و لود بانک باتری', 'تجهیزات حفاظت فردی ضداسید و شوک الکتریکی');
      requiredParts.push('کابل‌های ارتباطی جامپر باتری با روکش نسوز', 'فیوز حفاظتی خط باتری استاندارد NH', 'ماژول بالانسر ولتاژ سلول‌های باتری');
    } else if (isTempRelated || isPerformanceDrop) {
      requiredTools.push('دوربین ترموویژن مادون قرمز جهت شناسایی Hotspot', 'دستگاه سنجش تابش خورشیدی (Solar Pyranometer / Solarmeter)', 'آچار استاندارد باز و بست و پرس کانکتورهای MC4');
      requiredParts.push('دیودهای بای‌پاس جعبه تقسیم پنل (Bypass Diode)', 'کانکتورهای استاندارد ضدآب MC4 نر و مادگی', 'کابل خورشیدی ۴ یا ۶ میلی‌متر مربع مقاوم در برابر اشعه UV');
    } else if (isGridRelated) {
      requiredTools.push('دستگاه سنجش کیفیت توان و آنالایزر شبکه AC');
      requiredParts.push('رله اضافه/کاهش ولتاژ و فرکانس');
    } else if (isTelemetryLoss) {
      requiredTools.push('تستر کابل شبکه RJ45 و مولتی‌متر تست پیوستگی RS-485');
      requiredParts.push('مودم/روتر صنعتی ۴G یا مبدل ارتباطی RS-485 به TCP/IP');
    }

    if (params.photos && params.photos.length > 0) {
      facts.push(`تصاویر ارسالی: ${params.photos.length} تصویر پیوست پرونده`);
    }

    const docExtracted: string[] = [];
    if (params.billData) {
      const kwhVal = params.billData.kwh || params.billData.extractedData?.periodGenerationKwh;
      const billStatus = params.billData.status || (kwhVal ? 'EXTRACTION_AVAILABLE' : 'UNVERIFIED');
      if (billStatus === 'EXTRACTION_AVAILABLE' && kwhVal) {
        docExtracted.push(`اطلاعات استخراج‌شده از قبض برق: مصرف/تولید دوره ${kwhVal} کیلووات‌ساعت (تایید محاسباتی)`);
      } else if (billStatus === 'UNVERIFIED') {
        docExtracted.push(`مدرک قبض بارگذاری شده است؛ نیازمند استخراج/تطبیق کارشناسی با سامانه توانیر (تاییدنشده)`);
      } else {
        docExtracted.push(`مدرک بارگذاری شده: ${params.billData.name || 'فایل ضمیمه'} (وضعیت: ${billStatus})`);
      }
      if (params.billData.extractedData?.meterNumber) {
        docExtracted.push(`شماره بدنه کنتور: ${params.billData.extractedData.meterNumber}`);
      }
    } else if (params.documents && params.documents.length > 0) {
      docExtracted.push(`مدارک فنی بارگذاری شده (${params.documents.length} فایل) - در انتظار بررسی میدانی کارشناس`);
    }

    const photoEvidence = params.photos && params.photos.length > 0 
      ? params.photos.map((p, idx) => `تصویر ${idx + 1}: ${p.name || 'تصویر تجهیز'}`)
      : [];

    const evidenceCategorized = {
      OBSERVED: facts,
      USER_REPORTED: collectedSymptoms,
      PHOTO_OBSERVED: photoEvidence,
      DOCUMENT_EXTRACTED: docExtracted,
      TELEMETRY_VERIFIED: hasTelemetryData ? [`تله‌متری زنده متصل: ${recentReadings.length} قرائت در بازه اخیر`] : ['داده تله‌متری زنده در دسترس نیست'],
      AI_INFERENCE: inferences,
      NOT_AVAILABLE: [
        ...(hasTelemetryData ? [] : ['داده‌های تله‌متری زنده سنسورها']),
        ...(warranties.length > 0 ? [] : ['پرونده گارانتی رسمی ثبت‌شده']),
        ...(!params.billData && (!params.documents || params.documents.length === 0) ? ['قبض برق و داده‌های دقیق صورتحساب'] : [])
      ]
    };

    // 4. Optional AI Enrichment Layer
    let diagnosisMethod: DiagnosisMethod = 'EXPERT_RULESET';
    let rawAiResponse: string | undefined = undefined;

    const ai = getGeminiClient();
    if (ai && triggerAiAssisted !== false) {
      try {
        const prompt = `شما یک مهندس ارشد و کارشناس عیب‌یابی نیروگاه‌های خورشیدی و سیستم‌های انرژی تجدیدپذیر هستید.
اطلاعات دارایی یا تجهیز:
- نام و نوع تجهیز: ${asset ? `${asset.name || asset.assetCode} (${asset.assetType})` : params.equipmentType || 'تجهیز خورشیدی'}
- ظرفیت تقریبی: ${asset ? `${asset.installedCapacityKw} کیلووات` : 'نامشخص'}
- نشانه‌ها و هشدارهای دریافتی: ${collectedSymptoms.join(' | ') || 'بررسی وضعیت عمومی'}
- وضعیت گارانتی تجهیزات: ${warrantyImpact.hasWarrantyCoverage ? 'دارد: ' + warrantyImpact.warrantyNotes : 'ندارد یا نامشخص'}

بر اساس این شواهد، لطفاً تحلیل فنی علت ریشه‌ای و ۳ اقدام پیشنهادی دارای اولویت را ارائه دهید.
پاسخ را خلاصه، تخصصی و به زبان فارسی بنویسید.`;

        const response: any = await externalCircuitBreakers.geminiAi.execute(async () => {
          const aiPromise = ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt
          });

          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timeout')), 3000)
          );

          return await Promise.race([aiPromise, timeoutPromise]);
        });

        if (response && response.text) {
          rawAiResponse = response.text;
          diagnosisMethod = 'AI_ASSISTED';
          confidenceScore = Math.min(95, confidenceScore + 5);
        }
      } catch (aiErr: any) {
        logger.warn('Gemini diagnosis enrichment skipped, timed out, or circuit open:', {
          service: 'DIAGNOSIS_AI',
          event: 'AI_ENRICHMENT_SKIPPED',
          metadata: { errorMessage: aiErr?.message }
        });
        // Fallback remains EXPERT_RULESET
      }
    }

    const created = maintenanceRepository.createDiagnosis({
      alertId,
      assetId: effectiveAssetId,
      projectId,
      componentId,
      diagnosisStatus,
      facts,
      inferences,
      symptoms: collectedSymptoms,
      rootCauses: likelyRootCauses,
      likelyRootCauses,
      actions: recommendedActions,
      recommendedActions,
      confidenceScore,
      warrantyImpact,
      diagnosisMethod,
      rawAiResponse,
      evidenceCategorized,
      requiredTools,
      requiredParts,
      safetyGuidance
    });

    return created;
  },

  /**
   * Convenience alias to diagnose an alert directly by alert ID
   */
  diagnoseAlert: async (
    alertId: string,
    options?: { triggerAiAssisted?: boolean; symptoms?: string[] }
  ): Promise<MaintenanceDiagnosis> => {
    const alert = maintenanceRepository.getAlertById(alertId);
    if (!alert) {
      throw new Error(`هشدار با شناسه ${alertId} یافت نشد.`);
    }

    return diagnosisService.generateDiagnosis({
      assetId: alert.assetId,
      alertId: alert.id,
      componentId: alert.componentId,
      symptoms: options?.symptoms,
      triggerAiAssisted: options?.triggerAiAssisted
    });
  }
};
