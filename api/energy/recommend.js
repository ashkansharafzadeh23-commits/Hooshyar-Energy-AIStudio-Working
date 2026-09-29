import { calculateSolarSizing, calculateGeneratorSizing, calculatePowerbankSizing, calculateDailyConsumption, DIVERSITY_FACTORS } from '../../src/api/engine.js';
import { getSunHoursForCity } from '../lib/solarIrradiance.js';
import { db } from '../../src/db/index.js';
import { SCORING_WEIGHTS } from './scoringConfig.js';

const DETERMINISTIC_EXPLANATIONS = {
  solar_ongrid: "سامانه متصل به شبکه بدون باتری؛ اقتصادی‌ترین معماری جهت کاهش هزینه‌های برق و کسب درآمد با کمترین استهلاک. نکته مهم: در زمان قطعی سراسری شبکه، به دلیل الزامات ایمنی و حفاظت ضد جزیره‌ای، سامانه خاموش خواهد شد.",
  solar_hybrid: "سامانه خورشیدی هیبریدی مجهز به باتری؛ تأمین بی‌وقفه بارهای حیاتی در زمان قطع برق به همراه کاهش مستمر هزینه برق در روز. هزینه اولیه باتری‌ها و لزوم تعویض دوره‌ای آنها مهم‌ترین ملاحظه اقتصادی آن است.",
  solar_offgrid: "سامانه کاملاً منفصل از شبکه برق سراسری؛ گزینه‌ای مستقل و مطمئن برای مناطقی که دسترسی به شبکه توزیع ندارند. نیازمند ظرفیت‌سنجی دقیق باتری‌ها و پنل‌ها برای دوره‌های ابری پیاپی با سرمایه‌گذاری اولیه بالاتر.",
  generator_only: "موتور برق یا دیزل ژنراتور؛ مناسب برای زمان‌های بحرانی قطعی شبکه با قابلیت استارت بارهای سنگین القایی. دارای هزینه سوخت، آلایندگی صوتی و نیازمند تعمیرات دوره‌ای مکانیکی منظم.",
  solar_generator: "ترکیب بهینه انرژی خورشیدی و ژنراتور؛ تولید پاک در طول روز که مصرف سوخت ژنراتور را به حداقل می‌رساند و ژنراتور به عنوان پشتیبان شب و زمان‌های اضطراری وارد مدار می‌شود.",
  solar_battery_generator: "سامانه جامع پایداری کامل (خورشید + باتری + دیزل ژنراتور)؛ بالاترین سطح قابلیت اطمینان و افزونگی (Redundancy) برای کاربری‌های حساس، بیمارستانی یا مزارع صنعتی با کنترل هوشمند منابع انرژی."
};

const SYSTEM_PROMPT = `When given a ranked list of energy system architectures (already scored and ordered by deterministic code — never re-order them yourself), write a short Persian explanation for each, covering: why it fits the user's consumption/budget/backup needs, and one honest trade-off or caveat. Never state a number that isn't present in the input JSON. End each explanation-set with:
"این پیشنهاد اولیه است؛ طراحی نهایی باید توسط کارشناس/EPC تایید شود."`;

function selectCandidateArchitectures(profile) {
  const all = [
    'solar_ongrid',
    'solar_hybrid',
    'solar_offgrid',
    'generator_only',
    'solar_generator',
    'solar_battery_generator'
  ];
  if (!profile.gridConnected) {
    return ['solar_offgrid', 'generator_only', 'solar_generator', 'solar_battery_generator'];
  }
  if (profile.backupRequired === false && profile.outageFrequency === 'none') {
    return ['solar_ongrid'];
  }
  return all;
}

function rankArchitectures(pool, profile, isPricingActive = true) {
  const isBudgetValid = Boolean(isPricingActive && profile.budgetIRR && profile.budgetIRR > 0);
  
  // Payback is excluded unless genuine verified financial payback data exists with verified inputs
  const hasVerifiedPayback = pool.some(c => c.verifiedPaybackScore !== undefined && c.verifiedPaybackScore !== null);

  const includedCriteria = ['backupFit', 'reliability'];
  const excludedCriteria = [];

  if (isBudgetValid) {
    includedCriteria.push('costFit');
  } else {
    excludedCriteria.push({
      criterion: 'costFit',
      reason: isPricingActive ? 'BUDGET_NOT_SPECIFIED' : 'PRICE_DATA_REQUIRED'
    });
  }

  if (hasVerifiedPayback) {
    includedCriteria.push('payback');
  } else {
    excludedCriteria.push({
      criterion: 'payback',
      reason: 'MISSING_VERIFIED_TARIFF_OR_PAYBACK_DATA'
    });
  }

  // Calculate sum of active weights for dynamic normalization
  let totalActiveWeight = 0;
  for (const crit of includedCriteria) {
    totalActiveWeight += SCORING_WEIGHTS[crit] || 0;
  }

  return pool.map(cand => {
    let weightedSum = 0;

    // 1. backupFit (weight: 0.35)
    let backupFitScore = 1.0;
    if (profile.backupRequired) {
      if (cand.type === 'solar_ongrid') {
        backupFitScore = 0.0;
      }
    }
    weightedSum += backupFitScore * SCORING_WEIGHTS.backupFit;

    // 2. reliability (weight: 0.15)
    let reliabilityScore = 0.8;
    if (profile.outageFrequency === 'frequent') {
      if (cand.type.includes('generator')) reliabilityScore = 1.0;
      if (cand.type === 'solar_ongrid') reliabilityScore = 0.2;
    }
    weightedSum += reliabilityScore * SCORING_WEIGHTS.reliability;

    // 3. costFit (weight: 0.30, only when active)
    let costFitScore = null;
    if (isBudgetValid && cand.costEstimate !== null) {
      if (cand.costEstimate > profile.budgetIRR) {
        costFitScore = Math.max(0, 1 - ((cand.costEstimate - profile.budgetIRR) / profile.budgetIRR));
      } else {
        const slack = (profile.budgetIRR - cand.costEstimate) / profile.budgetIRR;
        if (slack > 0.5) {
          costFitScore = 1 - (slack * 0.5);
        } else {
          costFitScore = 1.0;
        }
      }
      weightedSum += costFitScore * SCORING_WEIGHTS.costFit;
    }

    // 4. payback (weight: 0.20, excluded when genuine financial data is missing)
    let paybackScore = null;
    if (hasVerifiedPayback && cand.verifiedPaybackScore !== undefined && cand.verifiedPaybackScore !== null) {
      paybackScore = cand.verifiedPaybackScore;
      weightedSum += paybackScore * SCORING_WEIGHTS.payback;
    }

    const finalScore = totalActiveWeight > 0 ? +(weightedSum / totalActiveWeight).toFixed(3) : 0;

    return {
      ...cand,
      score: finalScore,
      criteriaScores: {
        backupFit: backupFitScore,
        reliability: reliabilityScore,
        costFit: costFitScore,
        payback: paybackScore
      },
      scoringBreakdown: {
        includedCriteria,
        excludedCriteria,
        totalApplicableWeight: +totalActiveWeight.toFixed(2)
      }
    };
  }).sort((a, b) => b.score - a.score);
}

export default async function handler(req, res) {
  const profile = req.body.energyProfile;
  if (!profile || typeof profile !== 'object') {
    return res.status(400).json({ 
      error: "پروفایل انرژی ارسال نشده است (missing energyProfile)",
      code: "MISSING_ENERGY_PROFILE"
    });
  }

  const isHypothetical = Boolean(profile.isHypotheticalScenario || profile.scenarioMode === 'HYPOTHETICAL');
  const allowBenchmarkPricing = Boolean(profile.allowBenchmarkPricing || profile.isBenchmarkPriceEnabled || profile.pricingMode === 'BENCHMARK');

  // 1. Consumption Resolution
  let dailyKwh = 0;
  let consumptionSource = 'UNSPECIFIED';
  let consumptionClassification = 'UNVERIFIED';

  if (isHypothetical) {
    const rawHypDaily = profile.hypotheticalDailyKwh !== undefined && profile.hypotheticalDailyKwh !== null
      ? Number(profile.hypotheticalDailyKwh)
      : (profile.hypotheticalMonthlyKwh !== undefined && profile.hypotheticalMonthlyKwh !== null
          ? Number(profile.hypotheticalMonthlyKwh) / 30
          : null);

    if (rawHypDaily === null || isNaN(rawHypDaily) || rawHypDaily <= 0) {
      return res.status(400).json({
        error: "در حالت شبیه‌سازی فرضی، ثبت میزان مصرف فرضی سناریو (hypotheticalDailyKwh یا hypotheticalMonthlyKwh به عنوان عدد مثبت) الزامی است و سیستم نباید مقدار فرضی اختراع کند.",
        code: "MISSING_SCENARIO_INPUTS",
        missingInfo: ["hypotheticalDailyKwh"]
      });
    }

    dailyKwh = +rawHypDaily.toFixed(2);
    consumptionSource = 'HYPOTHETICAL_INPUT';
    consumptionClassification = 'HYPOTHETICAL_SIMULATION';
  } else {
    const rawMonthly = profile.monthlyConsumptionKwh !== undefined ? profile.monthlyConsumptionKwh : profile.actualMonthlyKwh;
    const parsedMonthly = (rawMonthly !== undefined && rawMonthly !== null && rawMonthly !== '') ? Number(rawMonthly) : null;

    if (parsedMonthly !== null) {
      if (isNaN(parsedMonthly) || parsedMonthly < 0) {
        return res.status(400).json({
          error: "میزان مصرف ماهانه برق باید عددی معتبر و نامنفی باشد.",
          code: "INVALID_CONSUMPTION",
          missingInfo: ["monthlyConsumptionKwh"]
        });
      }
      if (parsedMonthly === 0) {
        dailyKwh = 0;
        consumptionSource = 'MEASURED_ZERO';
        consumptionClassification = 'MEASURED_ZERO';
      } else {
        dailyKwh = +(parsedMonthly / 30).toFixed(2);
        consumptionSource = 'BILL_DATA';
        consumptionClassification = 'MEASURED_DATA';
      }
    } else if (profile.selectedAppliances && Array.isArray(profile.selectedAppliances) && profile.selectedAppliances.length > 0) {
      for (const app of profile.selectedAppliances) {
        if (!app || typeof app !== 'object') {
          return res.status(400).json({
            error: "ساختار اطلاعات مصرف‌کننده‌ها نامعتبر است.",
            code: "INVALID_APPLIANCE_DATA",
            missingInfo: ["selectedAppliances"]
          });
        }
        const watt = Number(app.watt);
        const qty = Number(app.quantity);
        const hrs = Number(app.hours);
        if (isNaN(watt) || watt <= 0) {
          return res.status(400).json({
            error: `توان مصرفی برای دستگاه "${app.name || app.id || 'نامشخص'}" باید عدد مثبت باشد.`,
            code: "INVALID_APPLIANCE_DATA",
            missingInfo: ["selectedAppliances.watt"]
          });
        }
        if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
          return res.status(400).json({
            error: `تعداد برای دستگاه "${app.name || app.id || 'نامشخص'}" باید عدد صحیح مثبت باشد.`,
            code: "INVALID_APPLIANCE_DATA",
            missingInfo: ["selectedAppliances.quantity"]
          });
        }
        if (isNaN(hrs) || hrs < 0 || hrs > 24) {
          return res.status(400).json({
            error: `ساعات کارکرد برای دستگاه "${app.name || app.id || 'نامشخص'}" باید بین ۰ تا ۲۴ باشد.`,
            code: "INVALID_APPLIANCE_DATA",
            missingInfo: ["selectedAppliances.hours"]
          });
        }
      }
      dailyKwh = calculateDailyConsumption(profile.selectedAppliances, profile.locationType || 'residential');
      consumptionSource = 'APPLIANCE_AUDIT';
      consumptionClassification = 'MEASURED_DATA';
    } else {
      return res.status(400).json({
        error: "برای ارائه پیشنهاد مهندسی، ثبت اطلاعات مصرف برق (قبض ماهانه یا فهرست مصرف‌کننده‌ها) الزامی است. تخمین فرضی مجاز نمی‌باشد.",
        code: "INSUFFICIENT_CONSUMPTION_DATA",
        missingInfo: ["monthlyConsumptionKwh", "selectedAppliances"]
      });
    }
  }

  // 2. Candidate Architecture Selection
  const candidates = selectCandidateArchitectures(profile);
  const requiresSolar = candidates.some(c => c.includes('solar'));

  // 3. Area Resolution
  let usableAreaM2 = 0;
  if (requiresSolar) {
    const rawArea = profile.usableArea !== undefined && profile.usableArea !== null
      ? profile.usableArea
      : (profile.totalArea !== undefined && profile.totalArea !== null
          ? profile.totalArea
          : profile.area);

    if (isHypothetical) {
      const hypArea = profile.hypotheticalArea !== undefined && profile.hypotheticalArea !== null
        ? Number(profile.hypotheticalArea)
        : Number(rawArea);

      if (isNaN(hypArea) || hypArea <= 0) {
        return res.status(400).json({
          error: "در حالت شبیه‌سازی فرضی، ثبت مساحت فرضی محل احداث (hypotheticalArea به عنوان عدد مثبت) الزامی است.",
          code: "MISSING_SCENARIO_INPUTS",
          missingInfo: ["hypotheticalArea"]
        });
      }
      usableAreaM2 = hypArea;
    } else {
      const numArea = Number(rawArea);
      if (!rawArea || isNaN(numArea) || numArea <= 0) {
        return res.status(400).json({
          error: "مساحت محل احداث یا مساحت مفید سقف برای طراحی سیستم خورشیدی الزامی است و نباید مقدار پیش‌فرض جایگزین گردد.",
          code: "INSUFFICIENT_AREA_DATA",
          missingInfo: ["usableArea", "totalArea"]
        });
      }
      usableAreaM2 = numArea;
    }
  }

  // 4. Solar Irradiance Resolution with Provenance
  let sunData = null;
  if (requiresSolar) {
    let userProvided = null;

    if (profile.userProvidedIrradiance && typeof profile.userProvidedIrradiance === 'object') {
      userProvided = profile.userProvidedIrradiance;
    } else if (profile.customSunHours !== undefined && profile.customSunHours !== null) {
      const cHours = Number(profile.customSunHours);
      if (isNaN(cHours) || cHours < 1.0 || cHours > 12.0) {
        return res.status(400).json({
          error: "ساعات تابش روزانه اعلامی (customSunHours) باید عددی بین ۱.۰ تا ۱۲.۰ باشد.",
          code: "INVALID_IRRADIANCE_DATA",
          missingInfo: ["customSunHours"]
        });
      }
      if (!profile.customSunHoursSource && !profile.sunHoursSource) {
        return res.status(400).json({
          error: "برای استفاده از ساعات تابش دستی، ذکر منبع استعلام (customSunHoursSource) الزامی است.",
          code: "MISSING_IRRADIANCE_SOURCE",
          missingInfo: ["customSunHoursSource"]
        });
      }
      userProvided = {
        sunHours: cHours,
        source: profile.customSunHoursSource || profile.sunHoursSource
      };
    } else if (profile.sunHours !== undefined && profile.sunHours !== null) {
      // Direct unverified profile.sunHours without source is strictly validated
      const sHours = Number(profile.sunHours);
      if (isNaN(sHours) || sHours < 1.0 || sHours > 12.0) {
        return res.status(400).json({
          error: "ساعات تابش ارسالی باید عددی بین ۱.۰ تا ۱۲.۰ باشد.",
          code: "INVALID_IRRADIANCE_DATA",
          missingInfo: ["sunHours"]
        });
      }
      if (!profile.sunHoursSource && !profile.city) {
        return res.status(400).json({
          error: "ساعات تابش ارسالی فاقد منبع موثق است. ثبت منبع استعلام یا انتخاب شهر معتبر الزامی است.",
          code: "UNVERIFIED_IRRADIANCE_INPUT",
          missingInfo: ["sunHoursSource", "city"]
        });
      }
      if (profile.sunHoursSource) {
        userProvided = {
          sunHours: sHours,
          source: profile.sunHoursSource
        };
      }
    }

    if (isHypothetical && !profile.city && !userProvided) {
      const hypSun = profile.hypotheticalSunHours !== undefined && profile.hypotheticalSunHours !== null
        ? Number(profile.hypotheticalSunHours)
        : null;

      if (hypSun === null || isNaN(hypSun) || hypSun < 1.0 || hypSun > 12.0) {
        return res.status(400).json({
          error: "در حالت شبیه‌سازی فرضی، ثبت ساعات تابش فرضی سناریو (hypotheticalSunHours بین ۱.۰ تا ۱۲.۰) الزامی است و نباید مقدار پیش‌فرض اختراع گردد.",
          code: "MISSING_SCENARIO_INPUTS",
          missingInfo: ["hypotheticalSunHours"]
        });
      }
      userProvided = {
        sunHours: hypSun,
        source: profile.hypotheticalSunHoursSource || "مفروضات سناریوی فرضی کاربر"
      };
    }

    if (!profile.city && !userProvided) {
      return res.status(400).json({
        error: "برای طراحی و پیشنهاد سامانه خورشیدی، تعیین شهر یا ثبت ساعات تابش با منبع معتبر الزامی است.",
        code: "INSUFFICIENT_IRRADIANCE_DATA",
        missingInfo: ["city", "customSunHours", "customSunHoursSource"]
      });
    }

    sunData = await getSunHoursForCity(profile.city, userProvided);

    if (!sunData.sunHours || sunData.sunHours <= 0 || sunData.status === 'INSUFFICIENT_DATA') {
      return res.status(400).json({
        error: "داده تابش معتبر ماهواره‌ای برای این منطقه در دسترس نیست. جهت انجام محاسبات مهندسی، ثبت ساعات تابش به همراه منبع الزامی است.",
        code: "INSUFFICIENT_IRRADIANCE_DATA",
        missingInfo: ["customSunHours", "customSunHoursSource"],
        dataSource: sunData
      });
    }
  }

  // 5. Configurable Engineering Assumptions
  const pr = profile.performanceRatio ? Number(profile.performanceRatio) : 0.775;
  if (pr < 0.50 || pr > 0.95) {
    return res.status(400).json({
      error: "ضریب عملکرد سیستم (performanceRatio) باید بین ۰.۵۰ تا ۰.۹۵ باشد.",
      code: "INVALID_PERFORMANCE_RATIO"
    });
  }

  const spacePerKwp = profile.sqMetersPerKwp ? Number(profile.sqMetersPerKwp) : 6.5;
  if (spacePerKwp < 4.0 || spacePerKwp > 15.0) {
    return res.status(400).json({
      error: "مساحت مورد نیاز به ازای هر کیلووات‌پیک (sqMetersPerKwp) باید بین ۴.۰ تا ۱۵.۰ متر مربع باشد.",
      code: "INVALID_SPACE_RATIO"
    });
  }

  // 6. System Sizing & Financial Evaluation
  const evaluated = candidates.map(type => {
    let solarPart = null;
    let generatorPart = null;
    let batteryPart = null;
    let costEstimate = null;

    if (type.includes('solar') && sunData && sunData.sunHours) {
      solarPart = calculateSolarSizing(
        dailyKwh,
        usableAreaM2,
        sunData.sunHours,
        550,
        {
          performanceRatio: pr,
          sqMetersPerKwp: spacePerKwp,
          isEngineeringVerified: Boolean(profile.isEngineeringVerified)
        }
      );

      // Attach annual generation consistent with main analysis engine
      solarPart.annualGenerationKwh = Math.round(solarPart.finalKwp * sunData.sunHours * 365 * pr);
      solarPart.requiredAreaM2 = +(solarPart.finalKwp * spacePerKwp).toFixed(1);
    }
    
    if (type.includes('generator')) {
      const isThreePhase = profile.locationType === 'industrial' || profile.locationType === 'factory' || profile.locationType === 'industrial_warehouse';
      generatorPart = calculateGeneratorSizing(profile.selectedAppliances || [], isThreePhase);
    }
    
    if (type.includes('hybrid') || type.includes('offgrid') || type.includes('battery')) {
      const backupHours = profile.backupHours ? Number(profile.backupHours) : 2;
      batteryPart = calculatePowerbankSizing(profile.selectedAppliances || [], backupHours);
    }

    // Benchmark Pricing Calculation (only when explicitly enabled)
    if (allowBenchmarkPricing) {
      let benchmarkTotal = 0;
      if (solarPart && solarPart.finalKwp > 0) {
        benchmarkTotal += solarPart.finalKwp * 300_000_000;
      }
      if (generatorPart && generatorPart.finalKva > 0) {
        benchmarkTotal += generatorPart.finalKva * 150_000_000;
      }
      if (batteryPart && batteryPart.capacityKwh > 0) {
        benchmarkTotal += batteryPart.capacityKwh * 400_000_000;
      }
      costEstimate = benchmarkTotal;
    }

    return { type, solarPart, generatorPart, batteryPart, costEstimate };
  });

  // Filter within budget only if pricing is active and estimate is computed
  const withinBudget = (allowBenchmarkPricing && profile.budgetIRR && profile.budgetIRR > 0)
    ? evaluated.filter(e => e.costEstimate !== null && e.costEstimate <= profile.budgetIRR * 1.15)
    : evaluated;
  const pool = withinBudget.length > 0 ? withinBudget : evaluated;

  const ranked = rankArchitectures(pool, profile, allowBenchmarkPricing).slice(0, 3);

  // 7. Explanations (Deterministic Persian baseline with optional AI enhancement)
  let aiExplanations = {};
  if (process.env.GEMINI_API_KEY) {
    try {
      const promptPayload = {
        candidates: ranked.map(r => ({
          type: r.type,
          score: r.score,
          solarKwp: r.solarPart?.finalKwp || 0,
          generatorKva: r.generatorPart?.finalKva || 0,
          batteryKwh: r.batteryPart?.capacityKwh || 0
        })),
        profile: {
          locationType: profile.locationType,
          dailyKwh,
          backupRequired: profile.backupRequired,
          outageFrequency: profile.outageFrequency
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(promptPayload) }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item.systemType && item.explanation) {
                aiExplanations[item.systemType] = item.explanation;
              }
            }
          }
        }
      }
    } catch {
      // Deterministic Persian fallback handles this gracefully
    }
  }

  const solutions = ranked.map((r, idx) => {
    const explanation = aiExplanations[r.type] || DETERMINISTIC_EXPLANATIONS[r.type] || "شرح فنی برای این معماری بر اساس نیازهای بار و پشتیبانی پروژه تدوین شده است.";

    return {
      rank: idx + 1,
      label: idx === 0 ? "بهترین انتخاب" : (idx === 1 ? "انتخاب دوم" : "گزینه جایگزین"),
      systemType: r.type,
      technicalSummary: {
        solarPart: r.solarPart,
        generatorPart: r.generatorPart,
        batteryPart: r.batteryPart
      },
      estimatedCostIRR: r.costEstimate,
      pricingStatus: allowBenchmarkPricing ? 'PRELIMINARY_BENCHMARK' : 'PRICE_DATA_REQUIRED',
      pricingMessage: allowBenchmarkPricing
        ? "برآورد هزینه اولیه بر اساس نرخ‌های شاخص مرجع بازار است و قیمت قطعی محسوب نمی‌شود."
        : "استعلام قیمت روز از تأمین‌کنندگان کاتالوگ تجهیزات الزامی است.",
      score: r.score,
      explanation
    };
  });

  const recData = {
    recommendationId: "rec_" + Date.now(),
    classification: isHypothetical ? "HYPOTHETICAL_SIMULATION" : "PRELIMINARY_ENGINEERING_RECOMMENDATION",
    isHypothetical,
    pricingStatus: allowBenchmarkPricing ? "PRELIMINARY_BENCHMARK" : "PRICE_DATA_REQUIRED",
    isBenchmarkPricingAllowed: allowBenchmarkPricing,
    scoringMetadata: {
      includedCriteria: ranked[0]?.scoringBreakdown?.includedCriteria || ['backupFit', 'reliability'],
      excludedCriteria: ranked[0]?.scoringBreakdown?.excludedCriteria || [],
      totalApplicableWeight: ranked[0]?.scoringBreakdown?.totalApplicableWeight || 0.5,
      isPaybackCalculated: false,
      paybackExclusionReason: "MISSING_VERIFIED_TARIFF_OR_PAYBACK_DATA"
    },
    dataSource: sunData ? {
      sunHours: sunData.sunHours,
      source: sunData.source,
      sourceLabel: sunData.sourceLabel,
      dataClassification: sunData.dataClassification,
      isVerifiedSource: sunData.isVerifiedSource,
      isReferenceOnly: sunData.isReferenceOnly,
      retrievalDate: sunData.retrievalDate,
      warning: sunData.warning || null
    } : null,
    consumptionProvenance: {
      dailyKwh,
      source: consumptionSource,
      dataClassification: consumptionClassification,
      isHypothetical
    },
    assumptions: [
      isHypothetical 
        ? "این پیشنهاد بر پایه شبیه‌سازی فرضی تولید شده و مبنای قرارداد مهندسی نمی‌باشد."
        : "این پیشنهاد اولیه است؛ طراحی نهایی باید توسط کارشناس/EPC تایید شود.",
      allowBenchmarkPricing
        ? "برآورد قیمت‌ها بر اساس شاخص‌های مرجع بازار بوده و نیازمند استعلام رسمی است."
        : "قیمت‌گذاری دقیق پس از استعلام رسمی از فروشندگان تجهیزات تعیین می‌گردد."
    ],
    solutions
  };

  if (db && db.addRecommendationLog) {
    try {
      db.addRecommendationLog({ profile, recommendation: recData });
    } catch {
      // Non-fatal logging
    }
  }

  return res.status(200).json(recData);
}
