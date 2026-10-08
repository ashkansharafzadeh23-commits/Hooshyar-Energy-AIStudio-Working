/**
 * HOOSHYAR ENERGY — DETERMINISTIC GENERATOR SIZING SERVICE
 * Stage 13.11-C: Pure TypeScript Standalone Sizing Engine
 *
 * Rules:
 * 1. Running kW = (Sum of simultaneous running Watts) / 1000
 * 2. Running kVA = Running kW / Power Factor
 * 3. Power Factor is validated in range [0.6, 1.0], default is 0.8
 * 4. Distinct running demand from starting demand; do NOT blindly sum every motor's inrush
 * 5. Sequential starting scenario: Running load of all equipment + largest single motor starting surge
 * 6. Explicitly handles unknown motor starting behaviors without fabricating nameplate values
 * 7. Zero fuel consumption or fuel cost fabrication without certified equipment curves
 * 8. Zero solar coupling: Generator electrical outputs are never combined with solar inverters
 */

import {
  GeneratorAssessmentInput,
  GeneratorSizingResult,
  SizingConfidenceStatus,
  GeneratorEngineeringWarning,
  LoadItemInput
} from '../types/generator';

export const DEFAULT_POWER_FACTOR = 0.8;
export const DEFAULT_ENGINEERING_RESERVE_PERCENT = 20; // 20% planning headroom

export class GeneratorSizingService {
  /**
   * Evaluates generator capacity requirements deterministically.
   */
  public static calculateSizing(input: GeneratorAssessmentInput): GeneratorSizingResult {
    const warnings: GeneratorEngineeringWarning[] = [];
    const missingInputs: string[] = [];
    const assumptions: string[] = [];
    const safetyNotices: string[] = [];
    const disclaimers: string[] = [];

    // 1. Mandatory Safety Notices (CO poisoning, ventilation, ATS isolation)
    safetyNotices.push(
      'خطر مرگبار گاز مونوکسید کربن (CO): هرگز ژنراتور یا موتور برق را در فضاهای بسته، پارکینگ سرپوشیده، زیرزمین، راهرو یا کنار پنجره روشن نکنید.'
    );
    safetyNotices.push(
      'تفکیک ایمن مدار (کلید تبدیل ATS یا چنج‌اور دستی): اتصال موازی و همزمان خروجی ژنراتور به شبکه سراسری یا خروجی اینورتر خورشیدی بدون کلید تغییر وضعیت تاییدشده اکیداً ممنوع بوده و موجب آتش‌سوزی یا برق‌گرفتگی تکنسین‌های شبکه می‌شود.'
    );
    safetyNotices.push(
      'زمین حفاظتی (ارتینگ): اتصال بدنه ژنراتور به چاه یا الکترود ارت استاندارد جهت حفاظت در برابر شوک الکتریکی ضروری است.'
    );

    // 2. Power Factor Validation & Disclosure
    let powerFactor: number;
    let isDefaultPowerFactor = false;

    if (input.powerFactorAssumption === undefined || input.powerFactorAssumption === null) {
      powerFactor = DEFAULT_POWER_FACTOR;
      isDefaultPowerFactor = true;
      assumptions.push(`ضریب توان پیش‌فرض برنامه‌ریزی: ${DEFAULT_POWER_FACTOR} (مبنای تبدیل تخمینی کیلووات به کاوا؛ برای محاسبه دقیق باید ضریب توان واقعی بارها وارد شود)`);
    } else if (
      typeof input.powerFactorAssumption === 'number' &&
      Number.isFinite(input.powerFactorAssumption) &&
      input.powerFactorAssumption >= 0.6 &&
      input.powerFactorAssumption <= 1.0
    ) {
      powerFactor = input.powerFactorAssumption;
      assumptions.push(`ضریب توان واردشده توسط کاربر: ${powerFactor} (مبنای تبدیل کیلووات به کاوا)`);
    } else {
      // Invalid user input explicitly supplied: DO NOT silently replace with 0.8 as valid!
      powerFactor = DEFAULT_POWER_FACTOR;
      missingInputs.push(`ضریب توان نامعتبر است (${input.powerFactorAssumption}). ضریب توان باید یک عدد معتبر در بازه ۰.۶ تا ۱.۰ باشد.`);
      warnings.push({
        code: 'INVALID_POWER_FACTOR_SUPPLIED',
        severity: 'WARNING',
        title: 'ضریب توان نامعتبر است',
        description: `مقدار واردشده برای ضریب توان (${input.powerFactorAssumption}) نامعتبر است. ضریب توان الکتریکی باید بین ۰.۶ و ۱.۰ باشد. محاسبه قطعی تا زمان تصحیح این ورودی انجام نمی‌شود.`
      });
    }

    // 3. Engineering Reserve Validation
    let reservePercent = input.engineeringReservePercent ?? DEFAULT_ENGINEERING_RESERVE_PERCENT;
    if (typeof reservePercent !== 'number' || !Number.isFinite(reservePercent) || reservePercent < 0) {
      reservePercent = DEFAULT_ENGINEERING_RESERVE_PERCENT;
    }
    // Cap reserve percent to reasonable engineering boundaries (0% to 100%)
    if (reservePercent > 100) {
      reservePercent = 100;
    }
    assumptions.push(
      `حاشیه اطمینان مهندسی برای جلوگیری از کارکرد زیر بار ۱۰۰٪ دائم: ${reservePercent}٪ (پیش‌فرض برنامه‌ریزی، نه الزام قطعی سازنده)`
    );

    // 4. Validate & Process Loads
    const loads: LoadItemInput[] = Array.isArray(input.loads) ? input.loads : [];
    if (loads.length === 0) {
      missingInputs.push('فهرست بارهای برقی ضروری تعیین نشده است.');
    }

    let totalRunningWatts = 0;
    let hasMotorLoads = false;
    let hasUnknownMotorStarting = false;
    let largestMotorStartingWatts = 0;
    let largestMotorRunningWatts = 0;

    for (const load of loads) {
      const qty = typeof load.quantity === 'number' && Number.isFinite(load.quantity) ? load.quantity : 0;
      const watts = typeof load.runningWatts === 'number' && Number.isFinite(load.runningWatts) ? load.runningWatts : 0;

      if (qty <= 0 || watts <= 0) {
        warnings.push({
          code: 'INVALID_LOAD_ITEM',
          severity: 'INFO',
          title: 'تجهیز بدون توان یا تعداد معتبر',
          description: `تجهیز "${load.name || 'بدون نام'}" با تعداد یا توان نامعتبر نادیده گرفته شد.`
        });
        continue;
      }

      // Check bounds: prevent realistic overflow while allowing heavy industrial loads up to 500 kW per item
      if (watts > 1_000_000 || qty > 1000) {
        warnings.push({
          code: 'EXTREME_LOAD_VALUE',
          severity: 'WARNING',
          title: 'توان بسیار بالا برای تجهیز واحد',
          description: `تجهیز "${load.name}" توان بسیار بزرگی اعلام کرده است و نیاز به بازبینی دیماند برق دارد.`
        });
      }

      const itemTotalRunningWatts = watts * qty;
      totalRunningWatts += itemTotalRunningWatts;

      if (load.isMotorDriven) {
        hasMotorLoads = true;

        // Estimate starting surge for this single unit
        let unitStartingWatts = 0;
        if (load.startingWatts && Number.isFinite(load.startingWatts) && load.startingWatts > watts) {
          unitStartingWatts = load.startingWatts;
        } else if (load.startingMultiplier && Number.isFinite(load.startingMultiplier) && load.startingMultiplier > 1) {
          unitStartingWatts = watts * load.startingMultiplier;
        } else {
          // Motor starting current unknown
          hasUnknownMotorStarting = true;
          // Apply standard heuristic notice: DOL motors typically draw 3 to 6 times running watts
          unitStartingWatts = watts * 3.5;
        }

        if (unitStartingWatts > largestMotorStartingWatts) {
          largestMotorStartingWatts = unitStartingWatts;
          largestMotorRunningWatts = watts;
        }
      }
    }

    const totalRunningKw = totalRunningWatts / 1000;
    const runningKva = powerFactor > 0 ? totalRunningKw / powerFactor : 0;

    // 5. Motor-driven Starting Surge Considerations
    let largestMotorStartingKva: number | null = null;
    let estimatedPeakStartingKva: number | null = null;

    if (hasMotorLoads && largestMotorStartingWatts > 0) {
      // Motor starting apparent power at rated power factor
      largestMotorStartingKva = (largestMotorStartingWatts / 1000) / powerFactor;

      // Sequential start scenario:
      // Scenario Peak = Running load of all OTHER operating equipment + starting power of the selected motor.
      // Notice: The running load of the starting motor is subtracted from total running load so it is NOT double-counted.
      const baseOtherRunningWatts = Math.max(0, totalRunningWatts - largestMotorRunningWatts);
      const peakStartingWatts = baseOtherRunningWatts + largestMotorStartingWatts;
      estimatedPeakStartingKva = (peakStartingWatts / 1000) / powerFactor;

      assumptions.push(
        'سناریوی راه‌اندازی متوالی موتورها: بار فعال در لحظه استارت = مجموع توان در حال کار سایر تجهیزات + توان استارت بزرگترین موتور (بدون محاسبه مجدد توان کاری همان موتور). استارت همزمان همه موتورها لحاظ نشده است.'
      );
      assumptions.push(
        'عدم فرض قابلیت اضافه بار گذرا عمومی: به دلیل تفاوت چشمگیر دینامیک پاسخ‌دهی ژنراتورها و افت فرکانس و ولتاژ (Voltage & Frequency Dip)، هیچ‌گونه ضریب اضافه بار گذرای همگانی فرض نمی‌شود و تایید قابلیت استارت موتورها منوط به بررسی دیتاشیت آلترناتور سازنده است.'
      );
    }

    if (hasUnknownMotorStarting) {
      warnings.push({
        code: 'UNKNOWN_MOTOR_STARTING_SURGE',
        severity: 'WARNING',
        title: 'جریان استارت موتورها نامشخص است',
        description:
          'نوع استارت (مستقیم، ستاره-مثلث، یا سافت‌استارتر) برخی الکتروموتورها نامشخص است. توان نهایی نیازمند اندازه‌گیری جریان هجومی (Inrush Current) است.'
      });
    }

    // 6. Duty Type and Operating Boundary Warnings
    if (input.dutyType === 'CONTINUOUS' || input.dutyType === 'PRIME_POWER') {
      warnings.push({
        code: 'CONTINUOUS_PRIME_DUTY_WARNING',
        severity: 'INFO',
        title: 'بهره‌برداری طولانی‌مدت (Prime/Continuous)',
        description:
          'در کارکرد پیوسته، ژنراتورها معمولاً نباید در بیش از ۷۰ تا ۸۰ درصد توان نامی Standby خود بارگذاری شوند تا استهلاک و مصرف روغن کنترل گردد.'
      });
    }

    // 7. Phase Consistency Warning
    if (input.phase === 'UNKNOWN') {
      missingInputs.push('تک‌فاز یا سه‌فاز بودن مدار مصرف‌کننده‌ها نامشخص است.');
      warnings.push({
        code: 'PHASE_UNKNOWN',
        severity: 'WARNING',
        title: 'تعداد فاز نامشخص',
        description:
          'بارهای سه‌فاز نیازمند ژنراتور سه‌فاز با توازن دقیق بار روی هر سه فاز هستند. اتصال بار تک‌فاز سنگین به یک فاز ژنراتور سه‌فاز ممکن است موجب نامتقارنی و سوختن سیم‌پیچ شود.'
      });
    } else if (input.phase === 'THREE_PHASE' && totalRunningKw < 7) {
      warnings.push({
        code: 'LOW_CAPACITY_THREE_PHASE',
        severity: 'INFO',
        title: 'ظرفیت پایین برای سیستم سه‌فاز',
        description:
          'توزیع بار زیر ۷ کیلووات در سیستم سه‌فاز حساسیت بالایی به عدم تقارن فازها دارد. بررسی تک‌فاز بودن بارهای مجزا توصیه می‌شود.'
      });
    }

    // 8. Fuel Availability
    if (!input.availableFuels || input.availableFuels.length === 0) {
      missingInputs.push('نوع سوخت‌های در دسترس انتخاب نشده است.');
    }

    // 9. Environmental & Installation
    if (input.installationEnvironment === 'INDOOR_VENTILATED') {
      warnings.push({
        code: 'INDOOR_VENTILATION_REQUIREMENT',
        severity: 'WARNING',
        title: 'الزام کانال‌کشی اگزوز و هوادهی اتاقک ژنراتور',
        description:
          'نصب در فضای مسقف نیازمند فن دمنده ورود هوای تازه، دریچه خروج هوای گرم رادیاتور و اگزوز استاندارد خروجی دود با عایق‌بندی حرارتی است.'
      });
    }

    // 10. Preliminary Sizing Recommendation Calculation
    // Sizing recommendation is strictly based on steady-state running load and engineering reserve.
    // Motor-starting capability is NEVER calculated via generic transient overload multipliers (e.g. 1.5x/2.0x).
    // Starting capability is labeled UNVERIFIED and requires professional review with manufacturer alternator curves.
    const isCalculable = totalRunningKw > 0;
    let preliminaryRecommendedKw: number | null = null;
    let preliminaryRecommendedKva: number | null = null;
    let startingCapabilityStatus: 'NOT_APPLICABLE' | 'UNVERIFIED' | 'NEEDS_MANUFACTURER_DATA' = 'NOT_APPLICABLE';

    if (isCalculable) {
      const reserveMultiplier = 1 + reservePercent / 100;
      let calculatedKw = totalRunningKw * reserveMultiplier;

      // Add future expansion headroom if specified
      if (input.futureExpansionPercent && input.futureExpansionPercent > 0) {
        const expansionFactor = 1 + Math.min(input.futureExpansionPercent, 100) / 100;
        calculatedKw *= expansionFactor;
        assumptions.push(`لحاظ ${input.futureExpansionPercent}٪ حاشیه توسعه آتی تجهیزات.`);
      }

      // Motor-starting capability safety check:
      if (hasMotorLoads) {
        startingCapabilityStatus = 'UNVERIFIED';
        warnings.push({
          code: 'MOTOR_STARTING_CAPABILITY_UNVERIFIED',
          severity: 'WARNING',
          title: 'قابلیت استارت موتورها تاییدنشده است',
          description:
            'توان پیشنهادی صرفاً بر اساس بار کاری پیوسته و حاشیه اطمینان محاسبه شده است. توانایی راه‌اندازی الکتروموتورها منوط به بررسی منحنی افت ولتاژ دینامیک آلترناتور (SkVA) در کاتالوگ سازنده بوده و نیازمند بررسی تخصصی است.'
        });
      }

      // Round to 1 decimal place
      preliminaryRecommendedKw = Math.round(calculatedKw * 10) / 10;
      preliminaryRecommendedKva = Math.round((calculatedKw / powerFactor) * 10) / 10;
    }

    // 11. Determine Confidence Status
    let status: SizingConfidenceStatus;
    if (!isCalculable || missingInputs.length > 0) {
      status = 'NEEDS_ADDITIONAL_INFORMATION';
    } else if (hasMotorLoads || hasUnknownMotorStarting || input.phase === 'UNKNOWN' || totalRunningKw > 50) {
      // Any motor loads or unknown starting behavior require professional review
      status = 'REQUIRES_PROFESSIONAL_REVIEW';
    } else {
      status = 'PRELIMINARY_ESTIMATE';
    }

    // 12. Final Standard Disclaimers
    disclaimers.push(
      'این برآورد صرفاً یک راهنمای اولیه مهندسی است و مشخصات نهایی تجهیز باید پس از بازدید محل، بررسی پلاک تجهیزات و تایید مهندس برق مشخص شود.'
    );
    disclaimers.push(
      'محاسبه دقیق مصرف و هزینه سوخت مستلزم دریافت منحنی مصرف ویژه سوخت (SFC) از شرکت سازنده در درصدهای مختلف بار است و در این مرحله تخمین زده نمی‌شود.'
    );
    disclaimers.push(
      'ضریب کاهش توان ناشی از ارتفاع از سطح دریا (Altitude Derating) و دمای محیط باید بر اساس مشخصات کاتالوگ موتور ژنراتور انتخابی لحاظ گردد.'
    );

    return {
      status,
      isCalculable,
      totalRunningWatts: Math.round(totalRunningWatts),
      totalRunningKw: Math.round(totalRunningKw * 100) / 100,
      powerFactor,
      runningKva: Math.round(runningKva * 100) / 100,
      engineeringReservePercent: reservePercent,
      preliminaryRecommendedKw,
      preliminaryRecommendedKva,
      hasMotorLoads,
      hasUnknownMotorStarting,
      startingCapabilityStatus,
      estimatedPeakStartingKva: estimatedPeakStartingKva ? Math.round(estimatedPeakStartingKva * 10) / 10 : null,
      largestMotorStartingKva: largestMotorStartingKva ? Math.round(largestMotorStartingKva * 10) / 10 : null,
      phase: input.phase,
      dutyType: input.dutyType,
      availableFuels: input.availableFuels || [],
      requiredBackupHours: input.requiredBackupHours,
      warnings,
      missingInputs,
      assumptions,
      safetyNotices,
      disclaimers,
      calculatedAt: new Date().toISOString()
    };
  }
}
