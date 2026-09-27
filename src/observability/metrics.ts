/**
 * Lightweight In-Memory Metrics Architecture (PH-4)
 * Provides production-ready counters and latency measurements.
 * Strictly avoids high-cardinality values or sensitive credentials in labels.
 */

export interface MetricSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  http: {
    totalRequests: number;
    totalErrors: number;
    requestsByMethod: Record<string, number>;
    requestsByRoute: Record<string, number>;
    requestsByStatus: Record<string, number>;
    averageDurationMs: number;
    p95DurationMs: number;
  };
  externalServices: {
    totalRequests: number;
    totalFailures: number;
    byService: Record<string, { requests: number; failures: number; avgDurationMs: number }>;
  };
  database: {
    totalOperations: number;
    totalFailures: number;
    byOperation: Record<string, { total: number; failures: number }>;
  };
}

class MetricsRegistry {
  private startTime = Date.now();

  // HTTP metrics
  private totalHttpRequests = 0;
  private totalHttpErrors = 0;
  private requestsByMethod: Record<string, number> = {};
  private requestsByRoute: Record<string, number> = {};
  private requestsByStatus: Record<string, number> = {};
  private httpDurations: number[] = [];
  private readonly maxDurationSamples = 500;

  // External Service Metrics
  private externalRequests: Record<string, { requests: number; failures: number; durations: number[] }> = {};

  // Database Metrics
  private dbOperations: Record<string, { total: number; failures: number }> = {};

  /**
   * Normalizes route paths to avoid high-cardinality explosion
   * e.g. /api/projects/3829e1e8-78a0-... -> /api/projects/:id
   */
  public normalizeRoute(path: string): string {
    if (!path) return '/';
    return path
      .split('?')[0] // remove query string
      .replace(/[0-9a-fA-F-]{36}/g, ':id') // UUIDs
      .replace(/\/[0-9]+/g, '/:id') // Numeric IDs
      .replace(/\/bids\/[^/]+/g, '/bids/:id')
      .replace(/\/rfqs\/[^/]+/g, '/rfqs/:id');
  }

  public recordHttpRequest(method: string, rawPath: string, statusCode: number, durationMs: number): void {
    const route = this.normalizeRoute(rawPath);
    this.totalHttpRequests++;
    
    const m = method.toUpperCase();
    this.requestsByMethod[m] = (this.requestsByMethod[m] || 0) + 1;
    this.requestsByRoute[route] = (this.requestsByRoute[route] || 0) + 1;
    
    const statusCategory = `${Math.floor(statusCode / 100)}xx`;
    this.requestsByStatus[statusCategory] = (this.requestsByStatus[statusCategory] || 0) + 1;

    if (statusCode >= 400) {
      this.totalHttpErrors++;
    }

    this.httpDurations.push(durationMs);
    if (this.httpDurations.length > this.maxDurationSamples) {
      this.httpDurations.shift();
    }
  }

  public recordExternalServiceCall(service: string, operation: string, success: boolean, durationMs: number): void {
    const key = `${service}:${operation}`;
    if (!this.externalRequests[key]) {
      this.externalRequests[key] = { requests: 0, failures: 0, durations: [] };
    }
    const entry = this.externalRequests[key];
    entry.requests++;
    if (!success) {
      entry.failures++;
    }
    entry.durations.push(durationMs);
    if (entry.durations.length > 200) {
      entry.durations.shift();
    }
  }

  public recordDatabaseOperation(operation: string, success: boolean): void {
    if (!this.dbOperations[operation]) {
      this.dbOperations[operation] = { total: 0, failures: 0 };
    }
    this.dbOperations[operation].total++;
    if (!success) {
      this.dbOperations[operation].failures++;
    }
  }

  public getSnapshot(): MetricSnapshot {
    const sortedDurations = [...this.httpDurations].sort((a, b) => a - b);
    const avgDuration = sortedDurations.length > 0
      ? Math.round(sortedDurations.reduce((acc, v) => acc + v, 0) / sortedDurations.length)
      : 0;
    const p95Idx = Math.floor(sortedDurations.length * 0.95);
    const p95Duration = sortedDurations.length > 0 ? sortedDurations[p95Idx] : 0;

    let totalExternalReqs = 0;
    let totalExternalFailures = 0;
    const externalByService: Record<string, { requests: number; failures: number; avgDurationMs: number }> = {};

    for (const [key, val] of Object.entries(this.externalRequests)) {
      totalExternalReqs += val.requests;
      totalExternalFailures += val.failures;
      const avgD = val.durations.length > 0
        ? Math.round(val.durations.reduce((acc, v) => acc + v, 0) / val.durations.length)
        : 0;
      externalByService[key] = {
        requests: val.requests,
        failures: val.failures,
        avgDurationMs: avgD
      };
    }

    let totalDbOps = 0;
    let totalDbFailures = 0;
    for (const val of Object.values(this.dbOperations)) {
      totalDbOps += val.total;
      totalDbFailures += val.failures;
    }

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      http: {
        totalRequests: this.totalHttpRequests,
        totalErrors: this.totalHttpErrors,
        requestsByMethod: { ...this.requestsByMethod },
        requestsByRoute: { ...this.requestsByRoute },
        requestsByStatus: { ...this.requestsByStatus },
        averageDurationMs: avgDuration,
        p95DurationMs: p95Duration
      },
      externalServices: {
        totalRequests: totalExternalReqs,
        totalFailures: totalExternalFailures,
        byService: externalByService
      },
      database: {
        totalOperations: totalDbOps,
        totalFailures: totalDbFailures,
        byOperation: { ...this.dbOperations }
      }
    };
  }

  public resetForTesting(): void {
    this.totalHttpRequests = 0;
    this.totalHttpErrors = 0;
    this.requestsByMethod = {};
    this.requestsByRoute = {};
    this.requestsByStatus = {};
    this.httpDurations = [];
    this.externalRequests = {};
    this.dbOperations = {};
    this.startTime = Date.now();
  }
}

export const metrics = new MetricsRegistry();
