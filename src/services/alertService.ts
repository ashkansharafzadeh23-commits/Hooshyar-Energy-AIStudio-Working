import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { monitoringRepository } from '../repositories/monitoringRepository.js';
import {
  AssetAlert,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  AlertSource
} from '../types/maintenance.js';
import {
  TelemetryReading,
  AssetPerformanceSnapshot,
  AssetHealthAssessment
} from '../types/monitoring.js';

export const alertService = {
  /**
   * Evaluates telemetry reading against built-in thresholds and custom rules
   */
  evaluateTelemetryReading: (
    reading: TelemetryReading,
    assetId?: string,
    projectId?: string
  ): AssetAlert[] => {
    assetId = assetId || reading.assetId;
    projectId = projectId || reading.projectId;
    const alerts: AssetAlert[] = [];

    // Deduplication check: check if an active alert already exists
    const maybeAddAlert = (params: {
      ruleId?: string;
      source: AlertSource;
      severity: AlertSeverity;
      title: string;
      description: string;
      metricType?: string;
      metricValue?: number;
      thresholdValue?: number;
      cooldownMinutes?: number;
    }) => {
      // Deduplication check: check if an active alert already exists
      const existing = maintenanceRepository.findActiveAlert(assetId as string, params.ruleId, params.metricType);
      if (existing) {
        maintenanceRepository.updateAlert(existing.id, {
          lastObservedAt: reading.timestamp || new Date().toISOString(),
          metricValue: params.metricValue !== undefined ? params.metricValue : existing.metricValue,
          updatedAt: new Date().toISOString()
        });
        return; // Don't duplicate active alert, occurrence tracking updated
      }

      // Check cooldown if rule specified
      if (params.cooldownMinutes) {
        const recentResolved = maintenanceRepository.getAlerts(projectId as string, assetId as string).find(a => {
          if (a.status !== 'RESOLVED' && a.status !== 'SUPPRESSED') return false;
          if (params.ruleId && a.ruleId !== params.ruleId) return false;
          if (params.metricType && a.metricType !== params.metricType) return false;
          if (!a.resolvedAt) return false;
          const timeSinceResolved = (Date.now() - new Date(a.resolvedAt).getTime()) / (1000 * 60);
          return timeSinceResolved < params.cooldownMinutes!;
        });
        if (recentResolved) {
          return; // Still in cooldown
        }
      }

      const timestamp = reading.timestamp || new Date().toISOString();
      const created = maintenanceRepository.createAlert({
        assetId,
        projectId,
        ruleId: params.ruleId,
        source: params.source,
        severity: params.severity,
        status: 'TRIGGERED',
        title: params.title,
        description: params.description,
        metricType: params.metricType,
        metricValue: params.metricValue,
        thresholdValue: params.thresholdValue,
        firstObservedAt: timestamp,
        lastObservedAt: timestamp,
        metadata: {
          readingId: reading.id,
          sourceId: reading.sourceId,
          timestamp: reading.timestamp
        }
      });
      alerts.push(created);
    };

    // User-Configured and Verified System Rules (no invented thresholds)
    const configuredRules = maintenanceRepository.getRules(projectId, assetId)
      .filter(r => (r.enabled !== false && r.isEnabled !== false));

    for (const rule of configuredRules) {
      const conditionMetric = rule.metricType || rule.condition?.metricType;
      if (conditionMetric && conditionMetric !== reading.metricType) {
        continue;
      }

      const val = reading.value;
      const target = rule.thresholdValue !== undefined ? rule.thresholdValue : rule.condition?.threshold;
      if (target === undefined || isNaN(Number(target))) {
        continue;
      }

      const operator = rule.operator || rule.condition?.operator;
      let matched = false;

      switch (operator) {
        case '>': matched = val > target; break;
        case '<': matched = val < target; break;
        case '>=': matched = val >= target; break;
        case '<=': matched = val <= target; break;
        case '==': matched = val === target; break;
        case '!=': matched = val !== target; break;
      }

      if (matched) {
        maybeAddAlert({
          ruleId: rule.id,
          source: (rule.sourceType as AlertSource) || 'RULE',
          severity: rule.severity,
          title: rule.name,
          description: `${rule.description || rule.name} (مقدار: ${val} ${reading.unit || ''}، آستانه: ${target} ${reading.unit || ''})`,
          metricType: reading.metricType,
          metricValue: val,
          thresholdValue: target,
          cooldownMinutes: rule.cooldownMinutes || 60
        });
      }
    }

    return alerts;
  },

  /**
   * Evaluates performance snapshot for deviation and PR drop alerts
   */
  evaluatePerformanceSnapshot: (snapshot: AssetPerformanceSnapshot): AssetAlert[] => {
    const alerts: AssetAlert[] = [];
    const { assetId, projectId } = snapshot;

    // Helper deduplicator
    const maybeAddAlert = (params: {
      ruleId?: string;
      source: AlertSource;
      severity: AlertSeverity;
      title: string;
      description: string;
      metricType?: string;
      metricValue?: number;
      thresholdValue?: number;
    }) => {
      const existing = maintenanceRepository.findActiveAlert(assetId as string, params.ruleId, params.metricType);
      if (existing) {
        maintenanceRepository.updateAlert(existing.id, {
          lastObservedAt: snapshot.periodEnd || new Date().toISOString(),
          metricValue: params.metricValue !== undefined ? params.metricValue : existing.metricValue,
          updatedAt: new Date().toISOString()
        });
        return;
      }

      const timestamp = snapshot.periodEnd || new Date().toISOString();
      const created = maintenanceRepository.createAlert({
        assetId,
        projectId,
        ruleId: params.ruleId,
        source: params.source,
        severity: params.severity,
        status: 'TRIGGERED',
        title: params.title,
        description: params.description,
        metricType: params.metricType,
        metricValue: params.metricValue,
        thresholdValue: params.thresholdValue,
        firstObservedAt: timestamp,
        lastObservedAt: timestamp,
        metadata: {
          snapshotId: snapshot.id,
          periodStart: snapshot.periodStart,
          periodEnd: snapshot.periodEnd
        }
      });
      alerts.push(created);
    };

    // Check deviation
    if (snapshot.deviationPercent !== null && snapshot.deviationPercent !== undefined) {
      if (snapshot.deviationPercent >= 40) {
        maybeAddAlert({
          source: 'PERFORMANCE',
          severity: 'CRITICAL',
          title: 'افت بحرانی تولید نیروگاه نسبت به مدل تخمینی',
          description: `تولید واقعی نیروگاه به میزان ${snapshot.deviationPercent.toFixed(1)}% کمتر از مقدار پیش‌بینی شده بوده است.`,
          metricType: 'PERFORMANCE_DEVIATION',
          metricValue: snapshot.deviationPercent,
          thresholdValue: 40
        });
      } else if (snapshot.deviationPercent >= 20) {
        maybeAddAlert({
          source: 'PERFORMANCE',
          severity: 'WARNING',
          title: 'هشدار انحراف منفی تولید نیروگاه',
          description: `تولید انرژی نیروگاه ${snapshot.deviationPercent.toFixed(1)}% کمتر از برآورد مدل محاسباتی ثبت شد.`,
          metricType: 'PERFORMANCE_DEVIATION',
          metricValue: snapshot.deviationPercent,
          thresholdValue: 20
        });
      }
    }

    // Check Performance Ratio (PR)
    if (snapshot.performanceRatioPercent !== null && snapshot.performanceRatioPercent !== undefined) {
      if (snapshot.performanceRatioPercent < 50) {
        maybeAddAlert({
          source: 'PERFORMANCE',
          severity: 'CRITICAL',
          title: 'نسبت عملکرد (PR) بحرانی',
          description: `نسبت عملکرد به ${snapshot.performanceRatioPercent.toFixed(1)}% سقوط کرده است که نشان‌دهنده نقص جدی تجهیزات است.`,
          metricType: 'PERFORMANCE_RATIO',
          metricValue: snapshot.performanceRatioPercent,
          thresholdValue: 50
        });
      } else if (snapshot.performanceRatioPercent < 70) {
        maybeAddAlert({
          source: 'PERFORMANCE',
          severity: 'WARNING',
          title: 'کاهش ضریب نسبت عملکرد (PR)',
          description: `نسبت عملکرد ${snapshot.performanceRatioPercent.toFixed(1)}% گزارش شده که کمتر از حد استاندارد ۷۰٪ است.`,
          metricType: 'PERFORMANCE_RATIO',
          metricValue: snapshot.performanceRatioPercent,
          thresholdValue: 70
        });
      }
    }

    // Check Snapshot overall status
    if (snapshot.status === 'CRITICAL') {
      maybeAddAlert({
        source: 'PERFORMANCE',
        severity: 'CRITICAL',
        title: 'اسنپ‌شات عملکرد بحرانی',
        description: `گزارش بازه عملکرد دارایی در وضعیت بحرانی ثبت شده است. ${snapshot.notes || ''}`,
        metricType: 'SNAPSHOT_STATUS'
      });
    }

    return alerts;
  },

  /**
   * Evaluates asset health assessment for health score alerts
   */
  evaluateHealthAssessment: (assessment: AssetHealthAssessment): AssetAlert[] => {
    const alerts: AssetAlert[] = [];
    const { assetId, projectId } = assessment;

    const maybeAddAlert = (params: {
      source: AlertSource;
      severity: AlertSeverity;
      title: string;
      description: string;
      metricType?: string;
      metricValue?: number;
      thresholdValue?: number;
    }) => {
      const existing = maintenanceRepository.findActiveAlert(assetId as string, undefined, params.metricType);
      if (existing) {
        maintenanceRepository.updateAlert(existing.id, {
          lastObservedAt: assessment.evaluatedAt || new Date().toISOString(),
          metricValue: params.metricValue !== undefined ? params.metricValue : existing.metricValue,
          updatedAt: new Date().toISOString()
        });
        return;
      }

      const timestamp = assessment.evaluatedAt || new Date().toISOString();
      const created = maintenanceRepository.createAlert({
        assetId,
        projectId,
        source: params.source,
        severity: params.severity,
        status: 'TRIGGERED',
        title: params.title,
        description: params.description,
        metricType: params.metricType,
        metricValue: params.metricValue,
        thresholdValue: params.thresholdValue,
        firstObservedAt: timestamp,
        lastObservedAt: timestamp,
        metadata: {
          assessmentId: assessment.id,
          riskFactors: assessment.riskFactors,
          detectedIssues: assessment.detectedIssues
        }
      });
      alerts.push(created);
    };

    if (assessment.status === 'CRITICAL' || (assessment.score !== null && assessment.score < 50)) {
      maybeAddAlert({
        source: 'HEALTH',
        severity: 'CRITICAL',
        title: 'وضعیت سلامت بحرانی دارایی انرژی',
        description: `شاخص سلامت به ${assessment.score || 0}/100 تنزل یافته است. عوامل خطر: ${assessment.riskFactors.join('، ') || 'نقص چندگانه'}`,
        metricType: 'HEALTH_SCORE',
        metricValue: assessment.score || 0,
        thresholdValue: 50
      });
    } else if (assessment.status === 'DEGRADED' || (assessment.score !== null && assessment.score < 70)) {
      maybeAddAlert({
        source: 'HEALTH',
        severity: 'WARNING',
        title: 'افت شاخص سلامت تجهیزات دارایی',
        description: `امتیاز سلامت تجهیزات به ${assessment.score || 0}/100 رسیده است. ایرادات شناسایی شده: ${assessment.detectedIssues.join('، ') || 'افت بازده'}`,
        metricType: 'HEALTH_SCORE',
        metricValue: assessment.score || 0,
        thresholdValue: 70
      });
    }

    return alerts;
  },

  /**
   * Evaluates telemetry loss for an asset (e.g. no readings within maxInactiveHours)
   */
  evaluateTelemetryLoss: (assetId: string, projectId: string, maxInactiveHours = 4): AssetAlert[] => {
    const alerts: AssetAlert[] = [];
    const sources = monitoringRepository.getTelemetrySources(projectId, assetId)
      .filter(s => s.status === 'ACTIVE');

    if (sources.length === 0) return alerts;

    const readings = monitoringRepository.getTelemetryReadings(assetId);
    const now = Date.now();

    for (const source of sources) {
      const sourceReadings = readings.filter(r => r.sourceId === source.id);
      if (sourceReadings.length === 0) {
        // No readings ever
        const existing = maintenanceRepository.findActiveAlert(assetId as string, undefined, `LOSS_${source.id}`);
        if (existing) {
          maintenanceRepository.updateAlert(existing.id, {
            lastObservedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          const nowStr = new Date().toISOString();
          alerts.push(maintenanceRepository.createAlert({
            assetId,
            projectId,
            source: 'TELEMETRY_LOSS',
            severity: 'WARNING',
            status: 'TRIGGERED',
            title: `عدم دریافت داده از منبع ${source.name}`,
            description: `هیچ دیتایی از منبع تله‌متری ${source.name} تاکنون دریافت نشده است.`,
            metricType: `LOSS_${source.id}`,
            firstObservedAt: nowStr,
            lastObservedAt: nowStr,
            metadata: { sourceId: source.id }
          }));
        }
        continue;
      }

      // Sort by timestamp desc
      sourceReadings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastTimestamp = new Date(sourceReadings[0].timestamp).getTime();
      const diffHours = (now - lastTimestamp) / (1000 * 60 * 60);

      if (diffHours > maxInactiveHours) {
        const existing = maintenanceRepository.findActiveAlert(assetId as string, undefined, `LOSS_${source.id}`);
        if (existing) {
          maintenanceRepository.updateAlert(existing.id, {
            lastObservedAt: new Date().toISOString(),
            metricValue: diffHours,
            updatedAt: new Date().toISOString()
          });
        } else {
          const nowStr = new Date().toISOString();
          alerts.push(maintenanceRepository.createAlert({
            assetId,
            projectId,
            source: 'TELEMETRY_LOSS',
            severity: diffHours > 24 ? 'CRITICAL' : 'WARNING',
            status: 'TRIGGERED',
            title: `قطع ارتباط و مفقودی داده تله‌متری (${source.name})`,
            description: `آخرین قرائت داده از ${source.name} مربوط به ${diffHours.toFixed(1)} ساعت پیش بوده است که بیش از آستانه مجاز است.`,
            metricType: `LOSS_${source.id}`,
            metricValue: diffHours,
            thresholdValue: maxInactiveHours,
            firstObservedAt: nowStr,
            lastObservedAt: nowStr,
            metadata: {
              sourceId: source.id,
              lastTimestamp: sourceReadings[0].timestamp
            }
          }));
        }
      }
    }

    return alerts;
  },

  /**
   * Acknowledges an alert
   */
  acknowledgeAlert: (alertId: string, userId: string): AssetAlert => {
    const alert = maintenanceRepository.getAlertById(alertId);
    if (!alert) {
      throw new Error('هشدار مورد نظر یافت نشد.');
    }
    if (alert.status === 'RESOLVED') {
      throw new Error('هشدار حل شده است و امکان تغییر وضعیت به تأیید شده وجود ندارد.');
    }

    const updated = maintenanceRepository.updateAlert(alertId, {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: userId
    });

    return updated!;
  },

  /**
   * Resolves an alert
   */
  resolveAlert: (alertId: string, resolutionNotes: string, userId: string): AssetAlert => {
    const alert = maintenanceRepository.getAlertById(alertId);
    if (!alert) {
      throw new Error('هشدار مورد نظر یافت نشد.');
    }

    const updated = maintenanceRepository.updateAlert(alertId, {
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolutionNotes: resolutionNotes || `حل شده توسط کاربر ${userId}`
    });

    return updated!;
  },

  /**
   * Suppresses an alert
   */
  suppressAlert: (alertId: string, reason: string): AssetAlert => {
    const alert = maintenanceRepository.getAlertById(alertId);
    if (!alert) {
      throw new Error('هشدار مورد نظر یافت نشد.');
    }

    const updated = maintenanceRepository.updateAlert(alertId, {
      status: 'SUPPRESSED',
      resolvedAt: new Date().toISOString(),
      resolutionNotes: `نادیده‌گیری هشدار: ${reason}`
    });

    return updated!;
  }
};
