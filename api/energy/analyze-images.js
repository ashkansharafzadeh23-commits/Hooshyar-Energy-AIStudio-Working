import { GoogleGenAI } from '@google/genai';
import { calculateSolarSizing } from '../../src/api/engine.js';
import { getSunHoursForCity } from '../lib/solarIrradiance.js';

let aiClient = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      billImage, 
      siteImages, 
      manualConsumption, 
      area, 
      city, 
      customSunHours, 
      customSunHoursSource,
      performanceRatio, 
      sqMetersPerKwp 
    } = req.body || {};

    let extractedData = {
      bill: null,
      site: null,
      confidence: 'UNCERTAIN',
      sourceAttribution: 'NONE'
    };

    const hasImages = Boolean(billImage || (siteImages && Array.isArray(siteImages) && siteImages.length > 0));
    const ai = getAiClient();

    // 1. Vision Extraction Phase (Observables ONLY - NEVER calculate system size via LLM)
    if (hasImages && ai) {
      try {
        let visionPrompt = `You are a computer vision extraction assistant for solar engineering.
Your task is ONLY to extract observable facts from the provided images.
DO NOT calculate solar system capacity (kWp).
DO NOT assume generation rates (e.g. DO NOT use 4.5 kWh/day per kWp).
DO NOT assume installation area per kWp (e.g. DO NOT use 5 sqm per kWp).

Instructions:
1. If an electricity bill image is provided:
   - Extract the monthly consumption in kWh (or calculate from total period consumption if billing period days are indicated).
   - If billing period is given (e.g. 30 days, 60 days), record periodConsumption and periodDays.
   - Extract tariff type if legible (e.g. residential, commercial, industrial).
   - Assess extraction confidence as "HIGH", "MEDIUM", "LOW", or "UNCERTAIN".
   - Note any extraction caveats in Persian.

2. If site or roof images are provided:
   - Identify roof type ("flat", "pitched", "metal_shed", "ground", "unknown").
   - List visible obstacles or shading sources (e.g. HVAC units, water tanks, trees, parapet walls).
   - Assess visible roof space quality ("SUITABLE", "CONSTRAINED", "UNSUITABLE", "UNKNOWN").
   - Provide concise qualitative visual observations in Persian (max 2 sentences).

Return your response strictly as a JSON object with this exact structure (no markdown wrappers):
{
  "bill": {
    "extractedMonthlyKwh": number | null,
    "periodConsumptionKwh": number | null,
    "periodDays": number | null,
    "tariffType": string | null,
    "confidence": "HIGH" | "MEDIUM" | "LOW" | "UNCERTAIN",
    "observableNotes": string
  },
  "site": {
    "roofType": "flat" | "pitched" | "metal_shed" | "ground" | "unknown",
    "visibleObstacles": string[],
    "roofSuitability": "SUITABLE" | "CONSTRAINED" | "UNSUITABLE" | "UNKNOWN",
    "visualObservations": string
  }
}`;

        const contents = [{ role: 'user', parts: [] }];

        if (billImage && billImage.data) {
          contents[0].parts.push({
            inlineData: {
              mimeType: billImage.mimeType || 'image/jpeg',
              data: billImage.data,
            }
          });
        }

        if (siteImages && Array.isArray(siteImages)) {
          siteImages.forEach(img => {
            if (img && img.data) {
              contents[0].parts.push({
                inlineData: {
                  mimeType: img.mimeType || 'image/jpeg',
                  data: img.data,
                }
              });
            }
          });
        }

        contents[0].parts.push({ text: visionPrompt });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents,
          config: {
            temperature: 0.1
          }
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.bill) extractedData.bill = parsed.bill;
          if (parsed.site) extractedData.site = parsed.site;
          if (parsed.bill && parsed.bill.confidence) extractedData.confidence = parsed.bill.confidence;
        }
      } catch (geminiError) {
        console.warn('[ImageAnalysis] Gemini extraction encountered an issue, proceeding with fallback inputs:', geminiError.message);
      }
    }

    // 2. Data Provenance & Consumption Resolution
    let monthlyConsumptionKwh = null;
    let consumptionSource = 'MISSING';
    let consumptionClassification = 'UNVERIFIED';

    const parsedManual = (manualConsumption !== undefined && manualConsumption !== null && manualConsumption !== '') 
      ? Number(manualConsumption) 
      : null;

    if (parsedManual !== null && !isNaN(parsedManual) && parsedManual >= 0) {
      monthlyConsumptionKwh = parsedManual;
      consumptionSource = 'USER_MANUAL_INPUT';
      consumptionClassification = 'USER_PROVIDED';
    } else if (extractedData.bill && typeof extractedData.bill.extractedMonthlyKwh === 'number' && extractedData.bill.extractedMonthlyKwh >= 0) {
      monthlyConsumptionKwh = extractedData.bill.extractedMonthlyKwh;
      consumptionSource = 'BILL_IMAGE_EXTRACTION';
      consumptionClassification = 'EXTRACTED_UNVERIFIED';
    }

    // 3. Installation Area Resolution
    const parsedArea = (area !== undefined && area !== null && area !== '') ? Number(area) : null;
    const validArea = (parsedArea !== null && !isNaN(parsedArea) && parsedArea > 0) ? parsedArea : null;

    // 4. Solar Irradiance Resolution (Attributed NASA POWER or User Custom - NEVER hardcoded 4.5!)
    let sunHours = null;
    let sunHoursSource = 'UNSPECIFIED';
    let sunHoursClassification = 'UNVERIFIED';

    const targetCity = city || (req.body && req.body.location);
    if (customSunHours !== undefined && customSunHours !== null && !isNaN(Number(customSunHours)) && Number(customSunHours) > 0) {
      sunHours = Number(customSunHours);
      sunHoursSource = customSunHoursSource || 'USER_CUSTOM_HOURS';
      sunHoursClassification = 'USER_PROVIDED';
    } else if (targetCity) {
      try {
        const irradianceResult = await getSunHoursForCity(targetCity);
        if (irradianceResult && irradianceResult.sunHours) {
          sunHours = irradianceResult.sunHours;
          sunHoursSource = irradianceResult.sourceLabel || irradianceResult.source || 'NASA_POWER';
          sunHoursClassification = irradianceResult.dataClassification || 'VERIFIED_SOURCE';
        }
      } catch (irrError) {
        console.warn('[ImageAnalysis] Irradiance retrieval failed for city:', targetCity, irrError.message);
      }
    }

    // 5. Missing Data Validation & Structured Error Reporting
    const missingFields = [];
    if (monthlyConsumptionKwh === null) {
      missingFields.push('monthlyConsumptionKwh');
    }
    if (sunHours === null) {
      missingFields.push('city_or_sunHours');
    }
    if (validArea === null) {
      missingFields.push('area');
    }

    let solarCapacityKwp = 0;
    let sizingDetails = null;
    let status = 'SUCCESS';
    let recommendedDesign = '';

    // 6. Deterministic Engineering Sizing Pipeline (Only when required data is present!)
    if (monthlyConsumptionKwh !== null && monthlyConsumptionKwh > 0 && sunHours !== null && sunHours > 0) {
      const dailyKwh = monthlyConsumptionKwh / 30;
      const prOption = performanceRatio ? Number(performanceRatio) : 0.775;
      const spaceOption = sqMetersPerKwp ? Number(sqMetersPerKwp) : 6.5;

      sizingDetails = calculateSolarSizing(
        dailyKwh,
        validArea || 0,
        sunHours,
        550,
        {
          performanceRatio: prOption,
          sqMetersPerKwp: spaceOption,
          isEngineeringVerified: false
        }
      );

      solarCapacityKwp = sizingDetails.finalKwp;

      const roofDesc = extractedData.site?.roofType ? `سقف ${extractedData.site.roofType}` : 'محل احداث';
      const obstacleNote = (extractedData.site?.visibleObstacles && extractedData.site.visibleObstacles.length > 0)
        ? ` موانع نوری مشاهده‌شده: ${extractedData.site.visibleObstacles.join('، ')}.`
        : '';

      if (sizingDetails.spaceConstrained) {
        recommendedDesign = `ظرفیت بهینه‌سازی‌شده برای ${roofDesc}: ${solarCapacityKwp} کیلووات‌‌پیک به دلیل محدودیت فضای نصب (${validArea} متر مربع).${obstacleNote} تابش مبنا: ${sunHours} ساعت روزانه (${sunHoursSource}).`;
      } else {
        recommendedDesign = `ظرفیت پیشنهادی برای پوشش کامل مصرف (${monthlyConsumptionKwh} کیلووات‌ساعت ماهانه): ${solarCapacityKwp} کیلووات‌‌پیک با ${sizingDetails.numberOfPanels} پنل ۵۵۰ وات.${obstacleNote} تابش مبنا: ${sunHours} ساعت (${sunHoursSource}).`;
      }
    } else if (monthlyConsumptionKwh === 0) {
      solarCapacityKwp = 0;
      recommendedDesign = 'مصرف ماهانه صفر ثبت شده است؛ احداث سامانه خورشیدی صرفاً در صورت تمایل به فروش کامل برق (طرح نیروگاه تجاری) پیشنهاد می‌گردد.';
    } else {
      status = 'INSUFFICIENT_DATA';
      solarCapacityKwp = 0;

      if (monthlyConsumptionKwh === null && sunHours === null) {
        recommendedDesign = 'اطلاعات قبض برق در تصویر قابل استخراج نبود و شهر پروژه مشخص نیست. لطفاً رقم مصرف ماهانه و شهر محل احداث را مشخص فرمایید.';
      } else if (monthlyConsumptionKwh === null) {
        recommendedDesign = 'میزان مصرف در تصویر قبض تشخیص داده نشد. لطفاً مصرف ماهانه را به صورت دستی وارد فرمایید.';
      } else if (sunHours === null) {
        recommendedDesign = 'ساعات تابش خورشیدی برای محل احداث نامشخص است. لطفاً شهر محل پروژه را انتخاب نمایید.';
      }
    }

    // 7. Structured Response (Ensuring 100% Backward Compatibility + Data-Truth Integrity)
    return res.status(200).json({
      // Backward-compatible fields expected by existing components
      monthlyConsumptionKwh: monthlyConsumptionKwh !== null ? monthlyConsumptionKwh : 0,
      solarCapacityKwp: solarCapacityKwp,
      recommendedDesign: recommendedDesign,

      // Structured Data-Truth & Engineering Attributes
      status,
      missingFields,
      dataProvenance: {
        consumption: {
          value: monthlyConsumptionKwh,
          source: consumptionSource,
          classification: consumptionClassification,
          confidence: extractedData.bill?.confidence || (parsedManual !== null ? 'USER_VERIFIED' : 'UNCERTAIN')
        },
        area: {
          value: validArea,
          source: validArea ? 'USER_SPECIFIED' : 'NOT_SPECIFIED',
          isConstrained: sizingDetails?.spaceConstrained || false
        },
        irradiance: {
          sunHours: sunHours,
          source: sunHoursSource,
          classification: sunHoursClassification
        }
      },
      extractionObservables: {
        bill: extractedData.bill,
        site: extractedData.site
      },
      engineeringSizing: sizingDetails ? {
        requiredKwp: sizingDetails.requiredKwp,
        finalKwp: sizingDetails.finalKwp,
        spaceConstrained: sizingDetails.spaceConstrained,
        numberOfPanels: sizingDetails.numberOfPanels,
        inverterKw: sizingDetails.inverterKw,
        performanceRatioUsed: sizingDetails.assumptions?.performanceRatio,
        sqMetersPerKwpUsed: sizingDetails.assumptions?.sqMetersPerKwp
      } : null,
      disclaimers: [
        'داده‌های مستخرج از تصویر توسط بینایی ماشین به عنوان داده اولیه غیرقطعی تلقی می‌گردد.',
        'ظرفیت‌سنجی مهندسی بر پایه داده‌های اقلیمی مدلسازی شده و طراحی نهایی نیازمند بازبینی و تایید مهندس EPC در محل است.'
      ]
    });

  } catch (error) {
    console.error('Image Analysis Pipeline Error:', error);
    return res.status(500).json({ 
      error: 'خطا در پردازش تصویر و تحلیل مهندسی',
      code: 'IMAGE_ANALYSIS_FAILED',
      message: error.message 
    });
  }
}
