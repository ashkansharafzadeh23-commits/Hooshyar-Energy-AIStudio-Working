import { monitoringRepository } from '../repositories/monitoringRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import {
  TelemetrySource,
  TelemetrySourceStatus,
  TelemetryReading,
  TelemetryReadingQuality,
  TelemetryMetricType,
  AssetPerformanceSnapshot,
  AssetHealthAssessment,
  TelemetryValidationResult,
  BulkIngestResult,
  PerformanceDeviation
} from '../types/monitoring.js';
import { EnergyAsset } from '../types/asset.js';

export type AssetConnectionStatus =
  | 'NOT_CONNECTED'
  | 'CONFIGURED_NOT_VERIFIED'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'STALE'
  | 'UNAVAILABLE';

export interface AssetConnectionReport {
  assetId: string;
  status: AssetConnectionStatus;
  isLiveConnected: boolean;
  telemetryVerified: boolean;
  activeSourcesCount: number;
  totalSourcesCount: number;
  latestReadingTimestamp?: string;
  staleThresholdHours: number;
  reason: string;
  dataClassification: 'VERIFIED_TELEMETRY' | 'SYNTHETIC_TEST_DATA' | 'NO_TELEMETRY';
}

// Centralized & Configurable Health Scoring Weights
export const HEALTH_WEIGHTS = {
  performanceDeviation: 0.40,
  availability: 0.25,
  telemetryQuality: 0.20,
  componentStatus: 0.15
};

// Supported metric types
const SUPPORTED_METRICS: TelemetryMetricType[] = [
  'POWER_KW',
  'ACTIVE_POWER_KW',
  'ENERGY_KWH',
  'VOLTAGE',
  'CURRENT',
  'FREQUENCY',
  'IRRADIANCE',
  'AMBIENT_TEMPERATURE',
  'MODULE_TEMPERATURE',
  'BATTERY_SOC',
  'BATTERY_POWER_KW',
  'GRID_IMPORT_KW',
  'GRID_EXPORT_KW',
  'OTHER'
];

/**
 * Mask credentials/secrets from telemetry source configuration for safe API output.
 */
export function sanitizeTelemetrySource(source: TelemetrySource): TelemetrySource {
  if (!source) return source;
  const clone = { ...source };
  if (clone.configuration) {
    const safeConfig: Record<string, any> = { ...clone.configuration };
    const sensitiveKeys = ['secret', 'password', 'token', 'apikey', 'api_key', 'authheader', 'credential', 'credentials'];
    for (const key of Object.keys(safeConfig)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        safeConfig[key] = '********';
      }
    }
    clone.configuration = safeConfig;
  }
  return clone;
}

export const monitoringService = {
  /**
   * 1. Register a new TelemetrySource for an EnergyAsset
   */
  registerTelemetrySource(
    assetId: string,
    sourceData: Omit<TelemetrySource, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>,
    userId: string
  ): TelemetrySource {
    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      throw new Error('ASSET_NOT_FOUND: دارایی انرژی مورد نظر یافت نشد.');
    }

    if (!asset.projectId) {
      throw new Error('ASSET_HAS_NO_PROJECT: دارایی فاقد شناسه پروژه متناظر است.');
    }

    if (!sourceData.name || !sourceData.name.trim()) {
      throw new Error('VALIDATION_ERROR: نام منبع تله‌متری الزامی است.');
    }

    if (!sourceData.sourceType) {
      throw new Error('VALIDATION_ERROR: نوع منبع تله‌متری الزامی است.');
    }

    const created = monitoringRepository.createSource({
      ...sourceData,
      assetId,
      projectId: asset.projectId,
      status: sourceData.status || 'ACTIVE'
    });

    projectRepository.addActivity({
      projectId: asset.projectId,
      actorUserId: userId,
      eventType: 'TELEMETRY_SOURCE_REGISTERED',
      entityType: 'TelemetrySource',
      entityId: created.id,
      metadata: {
        assetId,
        sourceName: created.name,
        sourceType: created.sourceType,
        provider: created.provider
      }
    });

    return created;
  },

  /**
   * Update TelemetrySource status or details
   */
  updateTelemetrySource(
    sourceId: string,
    updates: Partial<TelemetrySource>,
    userId: string
  ): TelemetrySource {
    const source = monitoringRepository.getSourceById(sourceId);
    if (!source) {
      throw new Error('SOURCE_NOT_FOUND: منبع تله‌متری یافت نشد.');
    }

    // Never allow changing assetId or projectId through patch
    const safeUpdates: Partial<TelemetrySource> = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.assetId;
    delete safeUpdates.projectId;
    delete safeUpdates.createdAt;

    const updated = monitoringRepository.updateSource(sourceId, safeUpdates);
    if (!updated) {
      throw new Error('SOURCE_UPDATE_FAILED: ویرایش منبع تله‌متری انجام نشد.');
    }

    // Meaningful activity log if status disabled
    if (updates.status === 'INACTIVE' && source.status !== 'INACTIVE') {
      projectRepository.addActivity({
        projectId: source.projectId,
        actorUserId: userId,
        eventType: 'TELEMETRY_SOURCE_DISABLED',
        entityType: 'TelemetrySource',
        entityId: source.id,
        metadata: {
          assetId: source.assetId,
          sourceName: source.name,
          previousStatus: source.status,
          newStatus: 'INACTIVE'
        }
      });
    }

    return updated;
  },

  /**
   * 2. Validate a single Telemetry Reading
   * Rejects or marks INVALID when rules fail.
   * Does NOT invent missing values or replace with zero.
   */
  validateTelemetryReading(
    readingInput: any,
    asset?: EnergyAsset,
    source?: TelemetrySource
  ): TelemetryValidationResult {
    if (!readingInput || typeof readingInput !== 'object') {
      return { isValid: false, quality: 'INVALID', error: 'داده تله‌متری نامعتبر است.' };
    }

    // Check asset exists
    if (!asset) {
      return { isValid: false, quality: 'INVALID', error: 'دارایی انرژی یافت نشد.' };
    }

    // Check source exists & belongs to asset
    if (!source) {
      return { isValid: false, quality: 'INVALID', error: 'منبع تله‌متری یافت نشد.' };
    }

    if (source.assetId !== asset.id) {
      return { isValid: false, quality: 'INVALID', error: 'منبع تله‌متری متعلق به این دارایی نیست.' };
    }

    // Check timestamp
    if (!readingInput.timestamp) {
      return { isValid: false, quality: 'INVALID', error: 'برچسب زمانی (timestamp) الزامی است.' };
    }

    const timeMs = new Date(readingInput.timestamp).getTime();
    if (isNaN(timeMs)) {
      return { isValid: false, quality: 'INVALID', error: 'فرمت برچسب زمانی نامعتبر است.' };
    }

    // Prevent extreme future dates (more than 24h ahead)
    const now = Date.now();
    if (timeMs > now + 24 * 3600 * 1000) {
      return { isValid: false, quality: 'INVALID', error: 'برچسب زمانی بیش از ۲۴ ساعت در آینده است.' };
    }

    // Check numeric value: missing data must remain missing, never invent zero!
    if (readingInput.value === null || readingInput.value === undefined || readingInput.value === '') {
      return { isValid: false, quality: 'MISSING', error: 'مقدار سنجه ارسال نشده است (داده مفقود).' };
    }

    const numVal = Number(readingInput.value);
    if (isNaN(numVal) || !isFinite(numVal)) {
      return { isValid: false, quality: 'INVALID', error: 'مقدار سنجه باید عدد معتبر باشد.' };
    }

    // Check metricType
    if (!readingInput.metricType || !SUPPORTED_METRICS.includes(readingInput.metricType)) {
      return {
        isValid: false,
        quality: 'INVALID',
        error: `نوع سنجه نامعتبر است. سنجه‌های مجاز: ${SUPPORTED_METRICS.join(', ')}`
      };
    }

    // Check physical sanity bounds
    switch (readingInput.metricType) {
      case 'POWER_KW':
        if (numVal < 0) {
          return { isValid: false, quality: 'INVALID', error: 'توان تولیدی نمی‌تواند منفی باشد.' };
        }
        break;
      case 'ENERGY_KWH':
        if (numVal < 0) {
          return { isValid: false, quality: 'INVALID', error: 'انرژی تجمیعی نمی‌تواند منفی باشد.' };
        }
        break;
      case 'VOLTAGE':
      case 'CURRENT':
        if (numVal < 0) {
          return { isValid: false, quality: 'INVALID', error: 'ولتاژ یا جریان نمی‌تواند منفی باشد.' };
        }
        break;
      case 'FREQUENCY':
        if (numVal < 35 || numVal > 75) {
          return { isValid: false, quality: 'INVALID', error: 'فرکانس خارج از محدوده مجاز شبکه (35-75 هرتز) است.' };
        }
        break;
      case 'IRRADIANCE':
        if (numVal < 0 || numVal > 2500) {
          return { isValid: false, quality: 'INVALID', error: 'تابش خورشیدی خارج از محدوده فیزیکی (0-2500 W/m²) است.' };
        }
        break;
      case 'BATTERY_SOC':
        if (numVal < 0 || numVal > 100) {
          return { isValid: false, quality: 'INVALID', error: 'درصد شارژ باتری (SOC) باید بین ۰ تا ۱۰۰ باشد.' };
        }
        break;
      case 'AMBIENT_TEMPERATURE':
      case 'MODULE_TEMPERATURE':
        if (numVal < -60 || numVal > 160) {
          return { isValid: false, quality: 'INVALID', error: 'دمای اندازه‌گیری شده خارج از دامنه طبیعی است.' };
        }
        break;
    }

    const quality: TelemetryReadingQuality = readingInput.quality === 'ESTIMATED' ? 'ESTIMATED' : 'VALID';

    return { isValid: true, quality };
  },

  /**
   * 3. Ingest Telemetry Readings (Bulk or Single)
   * One invalid record must NOT reject an otherwise valid batch.
   */
  ingestTelemetryReadings(
    assetId: string,
    readingsInput: any[],
    userId?: string
  ): BulkIngestResult {
    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      throw new Error('ASSET_NOT_FOUND: دارایی انرژی مورد نظر یافت نشد.');
    }

    if (!Array.isArray(readingsInput)) {
      throw new Error('INVALID_INPUT: ورودی تله‌متری باید آرایه‌ای از رکوردها باشد.');
    }

    const validReadingsToStore: Array<Omit<TelemetryReading, 'id' | 'createdAt'>> = [];
    const errors: BulkIngestResult['errors'] = [];
    const affectedSourceIds = new Set<string>();

    // Cache sources for this asset to avoid redundant db lookups
    const assetSources = monitoringRepository.getSources(undefined, assetId);
    const sourceMap = new Map<string, TelemetrySource>();
    assetSources.forEach(s => sourceMap.set(s.id, s));

    readingsInput.forEach((r, idx) => {
      const sourceId = r.sourceId;
      if (!sourceId) {
        errors.push({ index: idx, error: 'شناسه منبع تله‌متری (sourceId) الزامی است.', data: r });
        return;
      }

      const source = sourceMap.get(sourceId) || monitoringRepository.getSourceById(sourceId);
      if (!source) {
        errors.push({ index: idx, sourceId, error: 'منبع تله‌متری یافت نشد.', data: r });
        return;
      }

      if (source.assetId !== asset.id) {
        errors.push({ index: idx, sourceId, error: 'منبع تله‌متری متعلق به این دارایی انرژی نیست.', data: r });
        return;
      }

      // Check validation
      const valRes = this.validateTelemetryReading(r, asset, source);
      if (!valRes.isValid) {
        errors.push({
          index: idx,
          sourceId,
          metricType: r.metricType,
          timestamp: r.timestamp,
          error: valRes.error || 'داده نامعتبر است.',
          data: r
        });
        return;
      }

      validReadingsToStore.push({
        assetId: asset.id,
        sourceId: source.id,
        timestamp: new Date(r.timestamp).toISOString(),
        metricType: r.metricType,
        value: Number(r.value),
        unit: r.unit || this.getDefaultUnitForMetric(r.metricType),
        quality: valRes.quality,
        metadata: r.metadata
      });

      affectedSourceIds.add(source.id);
    });

    let storedReadings: TelemetryReading[] = [];
    if (validReadingsToStore.length > 0) {
      storedReadings = monitoringRepository.createReadingsBatch(validReadingsToStore);

      // Update lastSyncAt on affected sources
      const nowIso = new Date().toISOString();
      affectedSourceIds.forEach(sId => {
        monitoringRepository.updateSource(sId, { lastSyncAt: nowIso });
      });
    }

    return {
      acceptedCount: storedReadings.length,
      rejectedCount: errors.length,
      errors,
      readings: storedReadings
    };
  },

  /**
   * Helper: Default units for metric types
   */
  getDefaultUnitForMetric(metricType: TelemetryMetricType): string {
    switch (metricType) {
      case 'POWER_KW':
      case 'BATTERY_POWER_KW':
      case 'GRID_IMPORT_KW':
      case 'GRID_EXPORT_KW':
        return 'kW';
      case 'ENERGY_KWH':
        return 'kWh';
      case 'VOLTAGE':
        return 'V';
      case 'CURRENT':
        return 'A';
      case 'FREQUENCY':
        return 'Hz';
      case 'IRRADIANCE':
        return 'W/m2';
      case 'AMBIENT_TEMPERATURE':
      case 'MODULE_TEMPERATURE':
        return 'C';
      case 'BATTERY_SOC':
        return '%';
      default:
        return '';
    }
  },

  /**
   * 4. Get Asset Telemetry Readings with filtering
   */
  getAssetTelemetry(
    assetId: string,
    filters?: {
      from?: string;
      to?: string;
      metricType?: string;
      sourceId?: string;
      quality?: string;
    }
  ): TelemetryReading[] {
    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      throw new Error('ASSET_NOT_FOUND: دارایی انرژی مورد نظر یافت نشد.');
    }
    return monitoringRepository.getReadings(assetId, filters);
  },

  /**
   * 5. Calculate Data Completeness
   * Based on sampling interval and expected samples.
   * If sampling frequency is unknown, returns 'INSUFFICIENT_DATA'.
   * Never fakes 100%.
   */
  calculateDataCompleteness(
    assetId: string,
    periodStart: string,
    periodEnd: string,
    samplingIntervalSeconds?: number
  ): number | 'INSUFFICIENT_DATA' {
    const startMs = new Date(periodStart).getTime();
    const endMs = new Date(periodEnd).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      return 'INSUFFICIENT_DATA';
    }

    let intervalSec = samplingIntervalSeconds;
    if (!intervalSec || intervalSec <= 0) {
      // Check active sources for this asset
      const sources = monitoringRepository.getSources(undefined, assetId);
      const activeSourceWithInterval = sources.find(s => s.status === 'ACTIVE' && s.samplingIntervalSeconds && s.samplingIntervalSeconds > 0);
      if (activeSourceWithInterval && activeSourceWithInterval.samplingIntervalSeconds) {
        intervalSec = activeSourceWithInterval.samplingIntervalSeconds;
      }
    }

    if (!intervalSec || intervalSec <= 0) {
      return 'INSUFFICIENT_DATA';
    }

    const durationSeconds = (endMs - startMs) / 1000;
    const expectedSamples = Math.floor(durationSeconds / intervalSec);
    if (expectedSamples <= 0) {
      return 'INSUFFICIENT_DATA';
    }

    // Count valid readings in period
    const readings = monitoringRepository.getReadings(assetId, {
      from: periodStart,
      to: periodEnd
    }).filter(r => r.quality === 'VALID' || r.quality === 'ESTIMATED');

    if (readings.length === 0) {
      return 0;
    }

    // Metric-level sample count: count readings of the most frequent metric
    const metricCounts = new Map<string, number>();
    readings.forEach(r => {
      metricCounts.set(r.metricType, (metricCounts.get(r.metricType) || 0) + 1);
    });

    let maxSamples = 0;
    metricCounts.forEach(cnt => {
      if (cnt > maxSamples) maxSamples = cnt;
    });

    const completeness = Math.min(100, Math.round((maxSamples / expectedSamples) * 1000) / 10);
    return completeness;
  },

  /**
   * 6. Calculate Performance Deviation
   */
  calculatePerformanceDeviation(
    actualGenerationKwh: number,
    expectedGenerationKwh: number
  ): PerformanceDeviation {
    if (!expectedGenerationKwh || expectedGenerationKwh <= 0) {
      return {
        actualGenerationKwh,
        expectedGenerationKwh: 0,
        deviationPercent: 0,
        severity: 'NORMAL'
      };
    }

    const deviationPercent = Math.round(((actualGenerationKwh - expectedGenerationKwh) / expectedGenerationKwh) * 1000) / 10;
    let severity: PerformanceDeviation['severity'] = 'NORMAL';
    if (deviationPercent < -25) {
      severity = 'CRITICAL';
    } else if (deviationPercent < -10) {
      severity = 'WARNING';
    }

    return {
      actualGenerationKwh,
      expectedGenerationKwh,
      deviationPercent,
      severity
    };
  },

  /**
   * 7. Calculate Asset Performance Snapshot
   * Uses VERIFIED data only. If baseline does not exist, returns INSUFFICIENT_DATA.
   * Does NOT invent engineering assumptions.
   */
  calculateAssetPerformance(
    assetId: string,
    periodStart: string,
    periodEnd: string,
    userId: string
  ): AssetPerformanceSnapshot {
    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      throw new Error('ASSET_NOT_FOUND: دارایی انرژی یافت نشد.');
    }

    const startMs = new Date(periodStart).getTime();
    const endMs = new Date(periodEnd).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      throw new Error('INVALID_PERIOD: بازه زمانی اعلام‌شده نامعتبر است.');
    }

    const hoursInPeriod = (endMs - startMs) / (1000 * 3600);
    const daysInPeriod = hoursInPeriod / 24;

    // Check verified baseline
    const baselines = assetRepository.getAssetPerformanceBaselines(assetId);
    const verifiedBaseline = baselines.length > 0 ? baselines[0] : null;

    // Retrieve readings in period
    const readings = monitoringRepository.getReadings(assetId, {
      from: periodStart,
      to: periodEnd
    });

    const validReadings = readings.filter(r => r.quality === 'VALID' || r.quality === 'ESTIMATED');

    // Calculate actual generation from verified telemetry
    let actualGenerationKwh = 0;
    const energyReadings = validReadings
      .filter(r => r.metricType === 'ENERGY_KWH')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (energyReadings.length >= 2) {
      // Cumulative meter difference
      const firstVal = energyReadings[0].value;
      const lastVal = energyReadings[energyReadings.length - 1].value;
      if (lastVal >= firstVal) {
        actualGenerationKwh = Math.round((lastVal - firstVal) * 100) / 100;
      } else {
        // Meter reset or individual interval readings
        actualGenerationKwh = Math.round(energyReadings.reduce((sum, r) => sum + r.value, 0) * 100) / 100;
      }
    } else if (energyReadings.length === 1) {
      actualGenerationKwh = energyReadings[0].value;
    } else {
      // Fallback: trapezoidal numerical integration of POWER_KW over time
      const powerReadings = validReadings
        .filter(r => r.metricType === 'POWER_KW')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (powerReadings.length >= 2) {
        let integratedEnergy = 0;
        for (let i = 1; i < powerReadings.length; i++) {
          const dtHours = (new Date(powerReadings[i].timestamp).getTime() - new Date(powerReadings[i - 1].timestamp).getTime()) / (1000 * 3600);
          if (dtHours > 0 && dtHours <= 4) { // Ignore huge gaps
            const avgPower = (powerReadings[i].value + powerReadings[i - 1].value) / 2;
            integratedEnergy += avgPower * dtHours;
          }
        }
        actualGenerationKwh = Math.round(integratedEnergy * 100) / 100;
      }
    }

    const completenessRes = this.calculateDataCompleteness(assetId, periodStart, periodEnd);
    const dataCompletenessPercent = typeof completenessRes === 'number' ? completenessRes : null;

    // IF NO VERIFIED BASELINE EXISTS:
    // DO NOT invent expectedGenerationKwh. Return INSUFFICIENT_DATA!
    if (!verifiedBaseline || !verifiedBaseline.annualGenerationKwh || verifiedBaseline.annualGenerationKwh <= 0) {
      const snapshot = monitoringRepository.createPerformanceSnapshot({
        assetId: asset.id,
        projectId: asset.projectId || '',
        periodStart,
        periodEnd,
        actualGenerationKwh,
        expectedGenerationKwh: null,
        performanceRatioPercent: null,
        availabilityPercent: null,
        capacityFactorPercent: asset.installedCapacityKw > 0 && hoursInPeriod > 0
          ? Math.round((actualGenerationKwh / (asset.installedCapacityKw * hoursInPeriod)) * 1000) / 10
          : null,
        dataCompletenessPercent,
        healthScore: null,
        status: 'INSUFFICIENT_DATA',
        calculationVersion: 1,
        deviationPercent: null,
        notes: 'خط مبنای عملکرد مهندسی (Performance Baseline) برای این دارایی ثبت یا تأیید نشده است.'
      });

      if (asset.projectId) {
        projectRepository.addActivity({
          projectId: asset.projectId,
          actorUserId: userId,
          eventType: 'PERFORMANCE_SNAPSHOT_CREATED',
          entityType: 'AssetPerformanceSnapshot',
          entityId: snapshot.id,
          metadata: {
            assetId: asset.id,
            status: 'INSUFFICIENT_DATA',
            reason: 'NO_VERIFIED_BASELINE'
          }
        });
      }

      return snapshot;
    }

    // Calculate expected generation from VERIFIED baseline
    let expectedGenerationKwh: number;
    if (daysInPeriod >= 25 && daysInPeriod <= 35 && verifiedBaseline.monthlyGenerationKwh > 0) {
      expectedGenerationKwh = Math.round((daysInPeriod / 30) * verifiedBaseline.monthlyGenerationKwh);
    } else {
      expectedGenerationKwh = Math.round((daysInPeriod / 365) * verifiedBaseline.annualGenerationKwh);
    }

    // Availability calculation based on valid telemetry samples
    let availabilityPercent: number | null = null;
    if (typeof dataCompletenessPercent === 'number') {
      availabilityPercent = dataCompletenessPercent;
    } else if (validReadings.length > 0) {
      availabilityPercent = Math.min(100, Math.round((validReadings.length / (readings.length || 1)) * 1000) / 10);
    }

    // Performance Ratio based on baseline
    let performanceRatioPercent: number | null = null;
    let deviationPercent: number | null = null;
    let status: AssetPerformanceSnapshot['status'] = 'NORMAL';

    if (expectedGenerationKwh > 0) {
      const ratio = actualGenerationKwh / expectedGenerationKwh;
      performanceRatioPercent = Math.round(ratio * (verifiedBaseline.performanceRatioPercent || 100) * 10) / 10;
      deviationPercent = Math.round(((actualGenerationKwh - expectedGenerationKwh) / expectedGenerationKwh) * 1000) / 10;

      if (deviationPercent < -25) {
        status = 'CRITICAL';
      } else if (deviationPercent < -10) {
        status = 'WARNING';
      } else {
        status = 'NORMAL';
      }
    }

    // Capacity Factor
    const capacityFactorPercent = asset.installedCapacityKw > 0 && hoursInPeriod > 0
      ? Math.round((actualGenerationKwh / (asset.installedCapacityKw * hoursInPeriod)) * 1000) / 10
      : null;

    // Calculate temporary health score for snapshot
    let healthScore: number | null = null;
    if (performanceRatioPercent !== null && availabilityPercent !== null) {
      const perfRatioFactor = Math.min(100, Math.max(0, (performanceRatioPercent / (verifiedBaseline.performanceRatioPercent || 80)) * 100));
      healthScore = Math.round((perfRatioFactor * 0.6) + (availabilityPercent * 0.4));
    }

    const snapshot = monitoringRepository.createPerformanceSnapshot({
      assetId: asset.id,
      projectId: asset.projectId || '',
      periodStart,
      periodEnd,
      actualGenerationKwh,
      expectedGenerationKwh,
      performanceRatioPercent,
      availabilityPercent,
      capacityFactorPercent,
      dataCompletenessPercent,
      healthScore,
      status,
      calculationVersion: 1,
      deviationPercent,
      notes: `محاسبه بر مبنای خط مبنای نسخه ${verifiedBaseline.version} و تله‌متری معتبر دوره.`
    });

    if (asset.projectId) {
      projectRepository.addActivity({
        projectId: asset.projectId,
        actorUserId: userId,
        eventType: 'PERFORMANCE_SNAPSHOT_CREATED',
        entityType: 'AssetPerformanceSnapshot',
        entityId: snapshot.id,
        metadata: {
          assetId: asset.id,
          actualGenerationKwh,
          expectedGenerationKwh,
          status
        }
      });
    }

    return snapshot;
  },

  /**
   * 8. Calculate Asset Health Assessment
   * Deterministic scoring algorithm with explicit weighted factors.
   * If required data is missing -> INSUFFICIENT_DATA.
   */
  calculateHealthAssessment(
    assetId: string,
    periodStart?: string,
    periodEnd?: string,
    userId?: string
  ): AssetHealthAssessment {
    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      throw new Error('ASSET_NOT_FOUND: دارایی انرژی یافت نشد.');
    }

    const now = new Date();
    const pEnd = periodEnd || now.toISOString();
    const pStart = periodStart || new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const baselines = assetRepository.getAssetPerformanceBaselines(assetId);
    const verifiedBaseline = baselines.length > 0 ? baselines[0] : null;

    const readings = monitoringRepository.getReadings(assetId, {
      from: pStart,
      to: pEnd
    });

    const riskFactors: string[] = [];
    const detectedIssues: string[] = [];

    // If no verified baseline or no readings at all, cannot compute deterministic health score!
    if (!verifiedBaseline || readings.length === 0) {
      if (!verifiedBaseline) {
        riskFactors.push('خط مبنای عملکرد فنی دارایی ثبت یا تأیید نشده است.');
      }
      if (readings.length === 0) {
        riskFactors.push('هیچ داده تله‌متری در بازه زمانی ارزیابی دریافت نشده است.');
      }

      const assessment = monitoringRepository.createHealthAssessment({
        assetId: asset.id,
        projectId: asset.projectId || '',
        status: 'INSUFFICIENT_DATA',
        score: null,
        riskFactors,
        detectedIssues,
        assessmentPeriodStart: pStart,
        assessmentPeriodEnd: pEnd,
        factorBreakdown: {
          performanceDeviationScore: null,
          availabilityScore: null,
          telemetryQualityScore: null,
          componentStatusScore: null,
          weights: HEALTH_WEIGHTS
        }
      });

      if (asset.projectId && userId) {
        projectRepository.addActivity({
          projectId: asset.projectId,
          actorUserId: userId,
          eventType: 'HEALTH_ASSESSMENT_CREATED',
          entityType: 'AssetHealthAssessment',
          entityId: assessment.id,
          metadata: {
            assetId: asset.id,
            status: 'INSUFFICIENT_DATA'
          }
        });
      }

      return assessment;
    }

    // 1. Performance Factor Score (Weight: 40%)
    // Compute performance over the assessment period
    const perfSnapshot = this.calculateAssetPerformance(assetId, pStart, pEnd, userId || 'SYSTEM');
    let perfScore = 100;
    if (perfSnapshot.deviationPercent !== null && perfSnapshot.deviationPercent !== undefined) {
      const dev = perfSnapshot.deviationPercent;
      if (dev >= 0) {
        perfScore = 100;
      } else if (dev >= -10) {
        perfScore = 90 + ((10 + dev) / 10) * 10;
      } else if (dev >= -25) {
        perfScore = 65 + ((25 + dev) / 15) * 25;
        detectedIssues.push(`افت توان و تولید انرژی (${Math.abs(dev)}٪ کمتر از برآورد خط مبنا).`);
        riskFactors.push('کاهش راندمان نسبت به پیش‌بینی مهندسی');
      } else {
        perfScore = Math.max(0, 65 + dev); // Drop rapidly below -25%
        detectedIssues.push(`افت بحرانی تولید (${Math.abs(dev)}٪ زیر مقدار مورد انتظار).`);
        riskFactors.push('احتمال وقوع خطا یا خرابی عمده در سیستم تولید توان');
      }
    }

    // 2. Availability Factor Score (Weight: 25%)
    let availScore = 100;
    if (perfSnapshot.availabilityPercent !== null && perfSnapshot.availabilityPercent !== undefined) {
      availScore = perfSnapshot.availabilityPercent;
      if (availScore < 80) {
        detectedIssues.push(`نرخ در دسترس‌پذیری پایین (${availScore}٪).`);
        riskFactors.push('توقفات مکرر در جمع‌آوری یا تولید داده‌های سامانه');
      }
    }

    // 3. Telemetry Quality Factor Score (Weight: 20%)
    const validCount = readings.filter(r => r.quality === 'VALID').length;
    const qualityRatio = readings.length > 0 ? (validCount / readings.length) : 0;
    const telemetryScore = Math.round(qualityRatio * 100);
    if (telemetryScore < 85) {
      riskFactors.push('کیفیت یا دقت برخی رکوردهای حسگرها و ادوات پایش نیازمند بررسی است.');
    }

    // 4. Component Status Factor Score (Weight: 15%)
    const components = assetRepository.getAssetComponents(assetId);
    let compScore = 100;
    if (components.length > 0) {
      let activeWeight = 0;
      components.forEach(c => {
        if (c.status === 'OPERATIONAL' || c.status === 'INSTALLED') {
          activeWeight += 100;
        } else if (c.status === 'UNDER_MAINTENANCE') {
          activeWeight += 60;
          detectedIssues.push(`قطعه ${c.model || c.componentType} در وضعیت تعمیر و نگهداری قرار دارد.`);
        } else if (c.status === 'FAILED') {
          activeWeight += 0;
          detectedIssues.push(`خرابی قطعه ${c.model || c.componentType} با شماره سریال ${c.serialNumber || 'نامشخص'}.`);
          riskFactors.push('عدم کارکرد تجهیزات اصلی در دارایی');
        } else {
          activeWeight += 70;
        }
      });
      compScore = Math.round(activeWeight / components.length);
    }

    // Deterministic overall weighted score
    const finalScore = Math.round(
      perfScore * HEALTH_WEIGHTS.performanceDeviation +
      availScore * HEALTH_WEIGHTS.availability +
      telemetryScore * HEALTH_WEIGHTS.telemetryQuality +
      compScore * HEALTH_WEIGHTS.componentStatus
    );

    let status: AssetHealthAssessment['status'] = 'HEALTHY';
    if (finalScore < 60 || detectedIssues.some(i => i.includes('بحرانی') || i.includes('خرابی'))) {
      status = 'CRITICAL';
    } else if (finalScore < 85) {
      status = 'DEGRADED';
    }

    const assessment = monitoringRepository.createHealthAssessment({
      assetId: asset.id,
      projectId: asset.projectId || '',
      status,
      score: finalScore,
      riskFactors,
      detectedIssues,
      assessmentPeriodStart: pStart,
      assessmentPeriodEnd: pEnd,
      factorBreakdown: {
        performanceDeviationScore: Math.round(perfScore),
        availabilityScore: Math.round(availScore),
        telemetryQualityScore: telemetryScore,
        componentStatusScore: compScore,
        weights: HEALTH_WEIGHTS
      }
    });

    if (asset.projectId && userId) {
      projectRepository.addActivity({
        projectId: asset.projectId,
        actorUserId: userId,
        eventType: 'HEALTH_ASSESSMENT_CREATED',
        entityType: 'AssetHealthAssessment',
        entityId: assessment.id,
        metadata: {
          assetId: asset.id,
          score: finalScore,
          status
        }
      });
    }

    return assessment;
  },

  /**
   * 9. Get latest performance snapshot
   */
  getLatestPerformanceSnapshot(assetId: string): AssetPerformanceSnapshot | null {
    return monitoringRepository.getLatestPerformanceSnapshot(assetId);
  },

  /**
   * 10. Get latest health assessment
   */
  getLatestHealthAssessment(assetId: string): AssetHealthAssessment | null {
    return monitoringRepository.getLatestHealthAssessment(assetId);
  },

  /**
   * 11. Truthfully determine Asset Telemetry Connection Status (PH-5)
   * Prevents fabricating live connections when no active telemetry exists.
   */
  getAssetConnectionStatus(assetId: string): AssetConnectionReport {
    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      return {
        assetId,
        status: 'UNAVAILABLE',
        isLiveConnected: false,
        telemetryVerified: false,
        activeSourcesCount: 0,
        totalSourcesCount: 0,
        staleThresholdHours: 24,
        reason: 'Asset does not exist in registry.',
        dataClassification: 'NO_TELEMETRY'
      };
    }

    if (asset.status === 'UNDER_MAINTENANCE' || asset.status === 'DECOMMISSIONED') {
      return {
        assetId,
        status: 'UNAVAILABLE',
        isLiveConnected: false,
        telemetryVerified: false,
        activeSourcesCount: 0,
        totalSourcesCount: 0,
        staleThresholdHours: 24,
        reason: `Asset is currently in ${asset.status} state.`,
        dataClassification: 'NO_TELEMETRY'
      };
    }

    const sources = monitoringRepository.getSourcesByAsset(assetId);
    const activeSources = sources.filter(s => s.status === 'ACTIVE');

    if (sources.length === 0 || activeSources.length === 0) {
      return {
        assetId,
        status: 'NOT_CONNECTED',
        isLiveConnected: false,
        telemetryVerified: false,
        activeSourcesCount: activeSources.length,
        totalSourcesCount: sources.length,
        staleThresholdHours: 24,
        reason: 'No active telemetry data sources or logger registered for this asset.',
        dataClassification: 'NO_TELEMETRY'
      };
    }

    const readings = monitoringRepository.getReadingsByAsset(assetId);
    if (readings.length === 0) {
      return {
        assetId,
        status: 'CONFIGURED_NOT_VERIFIED',
        isLiveConnected: false,
        telemetryVerified: false,
        activeSourcesCount: activeSources.length,
        totalSourcesCount: sources.length,
        staleThresholdHours: 24,
        reason: 'Telemetry sources configured, but no readings have been ingested yet.',
        dataClassification: 'NO_TELEMETRY'
      };
    }

    // Sort readings by timestamp desc
    const sortedReadings = [...readings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latestReading = sortedReadings[0];
    const latestTime = new Date(latestReading.timestamp).getTime();
    const now = Date.now();
    const ageHours = (now - latestTime) / (1000 * 60 * 60);

    const staleThresholdHours = 24;
    const hasValidQuality = readings.some(r => r.quality === 'VALID' || r.quality === 'ESTIMATED');
    const hasErrors = activeSources.some(s => s.status === 'ERROR') || readings.filter(r => r.quality === 'INVALID').length > readings.length * 0.5;

    if (ageHours > staleThresholdHours) {
      return {
        assetId,
        status: 'STALE',
        isLiveConnected: false,
        telemetryVerified: hasValidQuality,
        activeSourcesCount: activeSources.length,
        totalSourcesCount: sources.length,
        latestReadingTimestamp: latestReading.timestamp,
        staleThresholdHours,
        reason: `Latest telemetry reading is older than ${staleThresholdHours} hours (${Math.round(ageHours)} hours ago).`,
        dataClassification: 'SYNTHETIC_TEST_DATA'
      };
    }

    if (hasErrors) {
      return {
        assetId,
        status: 'DEGRADED',
        isLiveConnected: true,
        telemetryVerified: hasValidQuality,
        activeSourcesCount: activeSources.length,
        totalSourcesCount: sources.length,
        latestReadingTimestamp: latestReading.timestamp,
        staleThresholdHours,
        reason: 'Telemetry stream is experiencing high error rate or logger degradation.',
        dataClassification: 'VERIFIED_TELEMETRY'
      };
    }

    return {
      assetId,
      status: 'CONNECTED',
      isLiveConnected: true,
      telemetryVerified: true,
      activeSourcesCount: activeSources.length,
      totalSourcesCount: sources.length,
      latestReadingTimestamp: latestReading.timestamp,
      staleThresholdHours,
      reason: 'Active telemetry stream received and verified within operational window.',
      dataClassification: 'VERIFIED_TELEMETRY'
    };
  }
};
