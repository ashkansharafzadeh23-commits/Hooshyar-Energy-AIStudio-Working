import { CITY_COORDINATES } from '../../data/cityCoordinates.js';
import { monitoringRepository } from '../../src/repositories/monitoringRepository.js';
import { externalCircuitBreakers } from '../../src/reliability/circuitBreaker.js';
import { executeWithTimeout } from '../../src/reliability/externalClient.js';
import { extractSafeExternalErrorMetadata } from '../../src/reliability/errorRedaction.js';
import { logger } from '../../src/observability/logger.js';

const CACHE_MAX_AGE_DAYS = 180;
const NASA_TIMEOUT_MS = Number(process.env.NASA_POWER_TIMEOUT_MS) || 10000;

export async function getSunHoursForCity(city, userProvidedIrradiance = null) {
  // 1. If explicit user-provided irradiance is supplied with valid source, validate and use it
  if (userProvidedIrradiance && userProvidedIrradiance.sunHours !== undefined && userProvidedIrradiance.sunHours !== null) {
    const rawVal = Number(userProvidedIrradiance.sunHours);
    if (!isNaN(rawVal) && rawVal >= 1.0 && rawVal <= 12.0) {
      const source = userProvidedIrradiance.source || 'کاربر / داده محلی';
      return {
        sunHours: +(rawVal).toFixed(2),
        monthlySunHours: userProvidedIrradiance.monthlySunHours || null, // Never fabricate monthly curves!
        source: 'USER_PROVIDED',
        sourceLabel: `ساعات تابش روزانه اعلامی کاربر (${source})`,
        dataClassification: 'USER_PROVIDED',
        isVerifiedSource: false,
        isReferenceOnly: true,
        status: 'READY',
        retrievalDate: new Date().toISOString()
      };
    }
  }

  // 2. Check cache for validated NASA POWER data
  if (city) {
    const cached = monitoringRepository.getCityIrradianceCache(city);
    if (cached) {
      const ageDays = (Date.now() - cached.fetchedAt) / (1000 * 60 * 60 * 24);
      if (ageDays < CACHE_MAX_AGE_DAYS && cached.sunHours) {
        return {
          sunHours: cached.sunHours,
          monthlySunHours: cached.monthlySunHours || null,
          source: 'nasa_power_api_cached',
          sourceLabel: 'داده تابش خورشیدی ماهواره‌ای NASA POWER (ذخیره‌شده در حافظه موقت)',
          dataClassification: 'VERIFIED_SOURCE',
          isVerifiedSource: true,
          isReferenceOnly: false,
          status: 'READY',
          retrievalDate: new Date(cached.fetchedAt).toISOString()
        };
      }
    }
  }

  const coords = city ? CITY_COORDINATES[city] : null;
  if (!coords) {
    logger.warn(`Coordinates for city "${city}" not found in atlas; returning reference estimate warning without fabricated values`, {
      service: 'SOLAR_IRRADIANCE',
      event: 'CITY_COORDS_MISSING',
      metadata: { city, provider: 'NASA_POWER', errorCategory: 'DATA_UNAVAILABLE' }
    });
    // Never silently substitute hardcoded regional irradiation or fabricate monthly curves!
    return {
      sunHours: null,
      monthlySunHours: null,
      source: 'REGIONAL_REFERENCE_ESTIMATE',
      sourceLabel: 'برآورد مرجع اقلیمی (نیازمند ثبت ساعت آفتابی برای طراحی مهندسی)',
      dataClassification: 'REFERENCE_ESTIMATE',
      isVerifiedSource: false,
      isReferenceOnly: true,
      status: 'INSUFFICIENT_DATA',
      error: 'NASA_POWER_UNAVAILABLE',
      warning: 'داده‌های تابش ماهواره‌ای معتبر برای این منطقه در دسترس نیست. جهت انجام محاسبات مهندسی، ثبت ساعات تابش موثر کارشناسی به همراه منبع الزامی است.',
      missingInfo: ['customSunHours', 'customSunHoursSource']
    };
  }

  try {
    return await externalCircuitBreakers.nasaPower.execute(async () => {
      const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${coords.lon}&latitude=${coords.lat}&format=JSON`;

      const response = await executeWithTimeout(
        (signal) => fetch(url, { signal }),
        'NASA_POWER',
        NASA_TIMEOUT_MS
      );

      if (!response.ok) throw new Error(`NASA POWER API status ${response.status}`);
      const json = await response.json();
      const dataObj = json.properties?.parameter?.ALLSKY_SFC_SW_DWN;
      if (!dataObj || !dataObj.ANN) {
        throw new Error('NASA POWER response missing required solar parameter ALLSKY_SFC_SW_DWN');
      }

      const sunHours = dataObj.ANN;
      const monthlySunHours = {
        JAN: dataObj.JAN, FEB: dataObj.FEB, MAR: dataObj.MAR,
        APR: dataObj.APR, MAY: dataObj.MAY, JUN: dataObj.JUN,
        JUL: dataObj.JUL, AUG: dataObj.AUG, SEP: dataObj.SEP,
        OCT: dataObj.OCT, NOV: dataObj.NOV, DEC: dataObj.DEC
      };

      monitoringRepository.setCityIrradianceCache({
        city,
        sunHours,
        fetchedAt: Date.now(),
        coords,
        monthlySunHours
      });

      return {
        sunHours,
        monthlySunHours,
        source: 'nasa_power_api',
        sourceLabel: 'داده تابش خورشیدی ماهواره‌ای NASA POWER (میانگین ۲۲ ساله)',
        dataClassification: 'VERIFIED_SOURCE',
        isVerifiedSource: true,
        isReferenceOnly: false,
        status: 'READY',
        retrievalDate: new Date().toISOString()
      };
    });
  } catch (err) {
    const safeMeta = extractSafeExternalErrorMetadata('NASA_POWER', err);
    logger.warn(`NASA POWER fetch failed; returning reference estimate warning without fabricated values`, {
      service: 'NASA_POWER',
      event: 'NASA_FETCH_FAILED',
      metadata: {
        city,
        provider: safeMeta.provider,
        httpStatus: safeMeta.httpStatus,
        errorCategory: safeMeta.errorCategory,
        isTransient: safeMeta.isTransient
      }
    });

    // Never silently substitute hardcoded regional irradiation or fabricate monthly curves!
    return {
      sunHours: null,
      monthlySunHours: null,
      source: 'REGIONAL_REFERENCE_ESTIMATE',
      sourceLabel: 'برآورد مرجع اقلیمی (نیازمند ثبت ساعت آفتابی برای طراحی مهندسی)',
      dataClassification: 'REFERENCE_ESTIMATE',
      isVerifiedSource: false,
      isReferenceOnly: true,
      status: 'INSUFFICIENT_DATA',
      error: 'NASA_POWER_UNAVAILABLE',
      warning: 'داده‌های تابش ماهواره‌ای معتبر برای این منطقه موقتاً در دسترس نیست. جهت انجام محاسبات مهندسی، ثبت ساعات تابش موثر کارشناسی به همراه منبع الزامی است.',
      missingInfo: ['customSunHours', 'customSunHoursSource']
    };
  }
}
