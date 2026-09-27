import { getSunHoursForCity } from './lib/solarIrradiance.js';
import { externalCircuitBreakers } from '../src/reliability/circuitBreaker.js';
import { executeWithTimeout, DEFAULT_TIMEOUTS } from '../src/reliability/externalClient.js';
import { logger } from '../src/observability/logger.js';

export async function runRuleEngine(body) {
  const req = { body }; // mock req for compatibility
  let resError = null;
  const res = {
    status: (code) => ({
      json: (data) => { resError = { status: code, data }; return { error: resError }; }
    })
  };

  // 3.1 اعتبارسنجی ورودی
    const { targets, locationType, appliances, actualMonthlyKwh, monthlyKwh, area, city, usableArea } = req.body;
    
    if (area === undefined || area === null || isNaN(Number(area)) || Number(area) <= 0) {
      return res.status(400).json({
        error: "مساحت محل احداث باید یک مقدار عددی مثبت باشد.",
        code: "INVALID_AREA",
        missingInfo: ["area"]
      });
    }

    if (!locationType) {
      return res.status(400).json({
        error: "نوع کاربری ملک یا محل احداث مشخص نشده است.",
        code: "INVALID_LOCATION_TYPE",
        missingInfo: ["locationType"]
      });
    }

    if (!city) {
      return res.status(400).json({
        error: "شهر محل احداث مشخص نشده است.",
        code: "INVALID_CITY",
        missingInfo: ["city"]
      });
    }
  
    // 3.2 Rule Engine - محاسبات قطعی
    let dailyKwh = 0;
    const rawMonthly = actualMonthlyKwh !== undefined ? actualMonthlyKwh : monthlyKwh;
    const parsedMonthly = (rawMonthly !== undefined && rawMonthly !== null && rawMonthly !== '') ? Number(rawMonthly) : null;
    
    if (parsedMonthly !== null && !isNaN(parsedMonthly)) {
      if (parsedMonthly > 0) {
        dailyKwh = parsedMonthly / 30;
      } else {
        // تفکیک مقدار واقعی صفر از مفقودی
        dailyKwh = 0;
      }
    } else if (appliances && appliances.length > 0) {
      let rawDaily = 0;
      for (const app of appliances) {
        rawDaily += (app.watt / 1000) * app.quantity * app.hours;
      }
      let diversityFactor = 0.6; // residential
      if (locationType === 'industrial_warehouse') diversityFactor = 0.7;
      if (locationType === 'factory') diversityFactor = 0.75;
      if (locationType === 'agricultural') diversityFactor = 0.8;
      dailyKwh = rawDaily * diversityFactor;
    } else {
      // تخمین متراژی در صورت عدم ارائه مصرف
      const numArea = Number(area);
      if (locationType === 'residential') {
        dailyKwh = (numArea / 100) * 20;
      } else if (locationType === 'industrial_warehouse') {
        dailyKwh = (numArea / 100) * 40;
      } else if (locationType === 'factory') {
        return res.status(400).json({
          error: "برای کاربری صنعتی یا کارخانه‌ای، ثبت مشخصات مصرف‌کننده‌ها یا مقدار قبض برق الزامی است.",
          code: "INSUFFICIENT_DATA",
          missingInfo: ["appliances", "actualMonthlyKwh"]
        });
      } else if (locationType === 'agricultural') {
        dailyKwh = 50; // بر اساس توان پمپ (پیشفرض)
      }
    }
  
    const engineResult = {
      dailyConsumptionEstimate: {
        dailyKwh: +(dailyKwh).toFixed(2),
        monthlyKwh: +(dailyKwh * 30).toFixed(2)
      }
    };
  
    const isSolar = !targets || targets.includes("solar");
    const isGenerator = targets && targets.includes("generator");
    const isPowerbank = targets && targets.includes("powerbank");
  
    // Sun hours mapping via NASA POWER API
    const sunData = await getSunHoursForCity(city);
    const {
      sunHours,
      monthlySunHours,
      source: sunHoursSource,
      dataClassification = 'REFERENCE_ESTIMATE',
      isVerifiedSource = false,
      isReferenceOnly = true
    } = sunData;
  
    let sourceLabel = "داده تابش خورشیدی ماهواره‌ای NASA POWER (میانگین ۲۲ ساله)";
    if (sunHoursSource !== "nasa_power_api" && sunHoursSource !== "nasa_power_api_cached") {
      sourceLabel = "تخمین تقریبی منطقه‌ای (داده مرجع اقلیمی - تاییدنشده ماهواره‌ای)";
    }
  
    if (isSolar) {
      const numArea = Number(area);
      // مساحت مفید: در صورت ارائه مساحت قابل استفاده توسط کاربر از همان استفاده می‌شود، در غیر این صورت مساحت کل
      const usableAreaM2 = (usableArea !== undefined && usableArea !== null && !isNaN(Number(usableArea)) && Number(usableArea) > 0)
        ? Number(usableArea)
        : numArea;

      const requiredKwp = (sunHours && sunHours > 0 && dailyKwh > 0) ? +(dailyKwh / (sunHours * 0.775)).toFixed(2) : 0;
      const maxKwpBySpace = +(usableAreaM2 / 6.5).toFixed(2);
      
      let spaceConstrained = false;
      let finalKwp = requiredKwp;
      
      if (requiredKwp > maxKwpBySpace) {
        finalKwp = maxKwpBySpace;
        spaceConstrained = true;
      }

      const annualGenerationKwh = Math.round(finalKwp * (sunHours || 4.5) * 365 * 0.775);
      const requiredAreaM2 = +(finalKwp * 6.5).toFixed(1);
  
      let catalogPanels = req.body.catalogPanels || [];
      let panelOptions = [];
      let catalogAvailable = catalogPanels.length > 0;
  
      if (catalogAvailable) {
        const estimatePanelArea = (p) => (p.widthM && p.heightM) ? p.widthM * p.heightM : (p.powerWatt / 1000) * 1.95;
        
        const evaluatedOptions = catalogPanels.map(panel => {
          const pArea = estimatePanelArea(panel);
          const idealCount = Math.ceil((finalKwp * 1000) / panel.powerWatt);
          const maxBySpace = Math.floor(usableAreaM2 / pArea);
          const pSpaceConstrained = idealCount > maxBySpace;
          const count = pSpaceConstrained ? maxBySpace : idealCount;
          
          return {
            productId: panel.id,
            panelWattage: panel.powerWatt,
            panelCount: count,
            actualSystemKwp: +(count * panel.powerWatt / 1000).toFixed(2),
            requiredAreaM2: +(count * pArea).toFixed(1),
            spaceConstrained: pSpaceConstrained,
            totalCost: count * panel.price,
            costPerWatt: +(panel.price / panel.powerWatt).toFixed(0),
            wattPerM2: +(panel.powerWatt / pArea).toFixed(0),
            panel: panel
          };
        });
  
        // Remove duplicates (same productId)
        const uniqueOptions = [];
        const seen = new Set();
        for (const opt of evaluatedOptions) {
          if (!seen.has(opt.productId)) {
            seen.add(opt.productId);
            uniqueOptions.push(opt);
          }
        }
  
        if (uniqueOptions.length > 0) {
          const economy = [...uniqueOptions].sort((a, b) => a.totalCost - b.totalCost)[0];
          const balanced = [...uniqueOptions].sort((a, b) => a.costPerWatt - b.costPerWatt)[0];
          const spaceSaving = [...uniqueOptions].sort((a, b) => b.wattPerM2 - a.wattPerM2)[0];
          panelOptions = { economy, balanced, spaceSaving };
        }
      } else {
        const count = finalKwp > 0 ? Math.ceil((finalKwp * 1000) / 550) : 0;
        panelOptions = {
          default: {
            panelWattage: 550,
            panelCount: count,
            actualSystemKwp: +(count * 550 / 1000).toFixed(2),
            requiredAreaM2
          }
        };
      }

      const defaultCount = finalKwp > 0 ? Math.ceil((finalKwp * 1000) / 550) : 0;
  
      engineResult.solar = {
        requiredKwp: +(requiredKwp).toFixed(2),
        finalKwp: +(finalKwp).toFixed(2),
        panelCount: panelOptions?.default?.panelCount ?? defaultCount,
        panelWattage: 550,
        annualGenerationKwh,
        estimatedAnnualKwh: annualGenerationKwh,
        requiredAreaM2,
        usableAreaM2,
        totalAreaM2: numArea,
        spaceConstrained,
        catalogAvailable,
        panelOptions,
        dataClassification,
        isVerifiedSource,
        isReferenceOnly
      };
    }
  
    console.log("Adding monthlySunHours to dataSource:", monthlySunHours);
    engineResult.dataSource = {
      sunHours,
      monthlySunHours,
      sunHoursSource,
      sourceLabel,
      dataClassification,
      isVerifiedSource,
      isReferenceOnly
    };
  
    if (isGenerator) {
      let totalKw = 0;
      let maxMotorKw = 0;
      let isThreePhase = false;
  
      if (appliances && appliances.length > 0) {
        for (const app of appliances) {
          const kw = app.watt / 1000;
          totalKw += kw * app.quantity;
          if (kw > maxMotorKw) maxMotorKw = kw;
        }
      } else if (dailyKwh > 0) {
         totalKw = dailyKwh / 10; // rough estimate of peak load
      }
  
      if (locationType === 'factory' && (!appliances || appliances.length === 0)) {
         return res.status(400).json({ error: "insufficient_data", missingInfo: ["factoryMotors"] });
      }
  
      const stableKva = totalKw / 0.8;
      
      // فاز
      if (stableKva > 15 || locationType === 'factory' || locationType === 'industrial_warehouse') {
        isThreePhase = true;
      }
  
      const startMultiplier = isThreePhase ? 6 : 3;
      const startupKw = (maxMotorKw * startMultiplier) + (totalKw - maxMotorKw);
      const startupKva = startupKw / 0.8;
  
      const finalKva = Math.max(stableKva, startupKva) * 1.275;
      
      const fuelType = (locationType === 'factory' || locationType === 'industrial_warehouse') ? 'diesel' : 'petrol';
      const atsRequired = (req.body.gridConnected !== false) && (locationType === 'factory' || locationType === 'industrial_warehouse');
  
      engineResult.generator = {
        stableKva: +(stableKva).toFixed(2),
        startupKva: +(startupKva).toFixed(2),
        finalKva: +(finalKva).toFixed(2),
        phase: isThreePhase ? '3-phase' : '1-phase',
        fuelType,
        atsRequired
      };
    }
  
    const catalogAccessories = req.body.catalogAccessories || [];
    let requiredAccessories = [];
    
    if (isSolar) {
      const accList = ['اینورتر', 'سازه نصب', 'کابل DC', 'کانکتور MC4', 'کلید قطع DC/AC', 'SPD'];
      accList.forEach(name => {
        const match = catalogAccessories.find(a => a.name === name);
        requiredAccessories.push({
          name,
          availableInCatalog: !!match,
          matchedProductId: match ? match.id : null,
          estimatedPrice: match ? match.price : null
        });
      });
    }
    
    if (isGenerator) {
      const accList = ['باتری استارت', 'پایه ضدارتعاش', 'سیستم اگزوز', 'تابلو برق'];
      if (engineResult.generator?.atsRequired) accList.push('سیستم ATS');
      
      accList.forEach(name => {
        const match = catalogAccessories.find(a => a.name === name);
        requiredAccessories.push({
          name,
          availableInCatalog: !!match,
          matchedProductId: match ? match.id : null,
          estimatedPrice: match ? match.price : null
        });
      });
    }
    
    engineResult.requiredAccessories = requiredAccessories;
  
    
  if (resError) return { error: resError };
  return { engineResult };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  
// 3.1 اعتبارسنجی ورودی
  const ruleRes = await runRuleEngine(req.body);
  if (ruleRes.error) return res.status(ruleRes.error.status).json(ruleRes.error.data);
  const engineResult = ruleRes.engineResult;

// 3.3 فراخوانی AI (اختیاری و تفسیری)
  const generateFallback = (errorMsg, status = 'UNAVAILABLE') => {
    return {
      summary: "تحلیل بر پایه محاسبات مهندسی قطعی و داده‌های تابش انجام شد. (" + errorMsg + ")",
      aiStatus: status,
      aiUnavailable: status === 'UNAVAILABLE' || status === 'NOT_CONFIGURED',
      recommendation: {
        summary: "تحلیل بر پایه محاسبات مهندسی قطعی و داده‌های تابش انجام شد.",
        energySavingTips: [
          { title: "بهینه‌سازی زاویه نصب", description: "تنظیم زاویه متناسب با عرض جغرافیایی موجب بیشینه شدن دریافت تابش سالانه خواهد شد." },
          { title: "سرویس و شستشوی دوره‌ای", description: "شستشوی منظم پنل‌ها از افت راندمان ناشی از گرد و غبار جلوگیری می‌کند." }
        ]
      },
      energySavingTips: [
        { title: "بهینه‌سازی زاویه نصب", description: "تنظیم زاویه متناسب با عرض جغرافیایی موجب بیشینه شدن دریافت تابش سالانه خواهد شد." },
        { title: "سرویس و شستشوی دوره‌ای", description: "شستشوی منظم پنل‌ها از افت راندمان ناشی از گرد و غبار جلوگیری می‌کند." }
      ],
      dailyConsumptionEstimate: engineResult.dailyConsumptionEstimate || { dailyKwh: 0, monthlyKwh: 0 },
      solar: engineResult.solar || {},
      generator: engineResult.generator || {},
      dataSource: engineResult.dataSource || {},
      recommendedProducts: [],
      requiredAccessories: engineResult.requiredAccessories || [],
      estimatedTotalCost: (engineResult.solar?.estimatedTotalCost || 0) + (engineResult.generator?.estimatedTotalCost || 0),
      warnings: [
        { severity: "info", message: "این پیشنهاد اولیه بر پایه موتور محاسباتی قطعی و استاندارد مهندسی است." }
      ],
      missingInfo: []
    };
  };

  if (!process.env.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY not configured; returning deterministic rule engine output", {
      service: 'AI_ANALYZE',
      event: 'AI_KEY_MISSING'
    });
    return res.status(200).json(generateFallback("کلید هوش مصنوعی تنظیم نشده است", "NOT_CONFIGURED"));
  }

  try {
    const SYSTEM_PROMPT = `شما یک مشاور هوشمند انرژی هستید.
با توجه به نتیجه محاسبات Rule Engine و لیست محصولات کاتالوگ، باید مناسب‌ترین محصولات را برای نیاز کاربر پیشنهاد دهید و یک نتیجه JSON دقیق برگردانید.
شما فقط باید قالب JSON برگردانید بدون هیچ متن اضافه‌ای.
در پیشنهادات خود:
- برای خورشیدی (solar): پنل‌های خورشیدی و اینورتر معرفی کنید.
- برای ژنراتور (generator): ژنراتور متناسب با KVA پیشنهاد دهید.
- برای پاوربانک (powerbank): پاوراستیشن متناسب معرفی کنید.
- اگر نیاز بود لوازم جانبی پیشنهاد دهید.

ساختار خروجی JSON:
{
  "summary": "توضیح کوتاه و دوستانه",
  "dailyConsumptionEstimate": { "dailyKwh": 0, "monthlyKwh": 0 },
  "solar": { "finalKwp": 0, "panelCount": 0, "panelOptions": [] },
  "generator": { "finalKva": 0, "phase": "", "fuelType": "" },
  "powerbank": { "finalWh": 0 },
  "dataSource": { "sourceLabel": "" },
  "recommendedProducts": [
    { "category": "پنل/موتور/پاوربانک/...", "brand": "", "model": "", "reason": "", "price": 0, "vendorName": "", "vendorCity": "" }
  ],
  "requiredAccessories": [
    { "name": "", "availableInCatalog": false, "estimatedPrice": 0 }
  ],
  "energySavingTips": [
    { "title": "", "description": "" }
  ],
  "estimatedTotalCost": 0,
  "warnings": [],
  "missingInfo": [],
  "technicalSpecs": [
    { "label": "", "value": "" }
  ]
}`;
    
    const claudeRes = await externalCircuitBreakers.geminiAi.execute(async () => {
      return await executeWithTimeout(
        (signal) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify({ ruleEngineResult: engineResult, catalog: { panels: req.body.catalogPanels, accessories: req.body.catalogAccessories } }) }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          }),
        }),
        'GEMINI_AI',
        DEFAULT_TIMEOUTS.GEMINI_AI || 15000
      );
    });

    if (!claudeRes.ok) {
      const errorText = await claudeRes.text();
      logger.warn("Gemini API HTTP non-200 error", {
        service: 'GEMINI_AI',
        event: 'AI_HTTP_ERROR',
        metadata: { status: claudeRes.status, errorText }
      });
      return res.status(200).json(generateFallback("خطا در پاسخ سرویس هوش مصنوعی", "UNAVAILABLE"));
    }

    const claudeData = await claudeRes.json();
    if (claudeData.error) {
      logger.warn("Gemini API error payload", {
        service: 'GEMINI_AI',
        event: 'AI_PAYLOAD_ERROR',
        metadata: { error: claudeData.error }
      });
      return res.status(200).json(generateFallback("خطا در پردازش مدل هوش مصنوعی", "UNAVAILABLE"));
    }
    let textContent = claudeData.candidates[0].content.parts[0].text;
    
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      textContent = jsonMatch[0];
    } else {
      if (textContent.startsWith('```json')) {
        textContent = textContent.replace(/```json\n?/, '').replace(/```$/, '');
      } else if (textContent.startsWith('```')) {
        textContent = textContent.replace(/```\n?/, '').replace(/```$/, '');
      }
    }
    
    const finalResult = JSON.parse(textContent);
    // استقلال موتور مهندسی: داده‌های عددی مهندسی همواره از موتور قطعی تأمین می‌شوند
    finalResult.solar = engineResult.solar;
    finalResult.dataSource = engineResult.dataSource;
    finalResult.dailyConsumptionEstimate = engineResult.dailyConsumptionEstimate;
    finalResult.aiStatus = 'SUCCESS';
    finalResult.aiUnavailable = false;
    finalResult.recommendation = {
      summary: finalResult.summary,
      energySavingTips: finalResult.energySavingTips || []
    };
    return res.status(200).json(finalResult);
    
  } catch (err) {
    logger.warn(`AI Analysis failed or timed out: ${err.message}`, {
      service: 'GEMINI_AI',
      event: 'AI_EXCEPTION',
      metadata: { errorMessage: err.message }
    });
    return res.status(200).json(generateFallback("سرویس تحلیل هوشمند موقتاً در دسترس نیست", "UNAVAILABLE"));
  }
}
