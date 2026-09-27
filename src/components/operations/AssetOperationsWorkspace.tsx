import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  ArrowRight, 
  RefreshCw, 
  ExternalLink, 
  FileText, 
  Zap, 
  MapPin, 
  Layers, 
  Radio, 
  ShieldCheck,
  Plus
} from 'lucide-react';
import { EnergyAsset, AssetComponent } from '../../types/asset';
import { 
  AssetHealthAssessment, 
  TelemetryReading, 
  TelemetrySource 
} from '../../types/monitoring';
import { 
  AssetAlert, 
  MaintenanceCase, 
  AssetMaintenanceHistoryItem,
  MaintenanceDiagnosis,
  TechnicianMatch,
  AlertStatus,
  AlertSeverity
} from '../../types/maintenance';
import { OperationsNavigation, OperationsTabId } from './OperationsNavigation';
import { AssetOperationsOverview } from './AssetOperationsOverview';
import { MonitoringConnectionStatus, MonitoringConnectionReport } from './MonitoringConnectionStatus';
import { TelemetrySourceList } from './TelemetrySourceList';
import { TelemetryMetricCard } from './TelemetryMetricCard';
import { TelemetryChart } from './TelemetryChart';
import { TelemetryTimeRangeSelector, TelemetryTimeRange } from './TelemetryTimeRangeSelector';
import { DataFreshnessIndicator } from './DataFreshnessIndicator';
import { AlertCenter } from './AlertCenter';
import { MaintenanceCenter } from './MaintenanceCenter';
import { AssetMaintenanceHistory } from './AssetMaintenanceHistory';
import { OperationsEmptyState, OperationsErrorState } from './OperationsEmptyState';
import { formatPersianNumber, toPersianDigits } from '../../utils/formatters';

export interface AssetOperationsWorkspaceProps {
  assetId: string;
  initialTab?: OperationsTabId;
  onNavigateToPassport?: () => void;
  onBack?: () => void;
}

export const AssetOperationsWorkspace: React.FC<AssetOperationsWorkspaceProps> = ({
  assetId,
  initialTab = 'OVERVIEW',
  onNavigateToPassport,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<OperationsTabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data Entities
  const [asset, setAsset] = useState<EnergyAsset | null>(null);
  const [components, setComponents] = useState<AssetComponent[]>([]);
  const [connectionReport, setConnectionReport] = useState<MonitoringConnectionReport | null>(null);
  const [sources, setSources] = useState<TelemetrySource[]>([]);
  const [healthAssessment, setHealthAssessment] = useState<AssetHealthAssessment | null>(null);
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [alerts, setAlerts] = useState<AssetAlert[]>([]);
  const [cases, setCases] = useState<MaintenanceCase[]>([]);
  const [historyItems, setHistoryItems] = useState<AssetMaintenanceHistoryItem[]>([]);
  const [diagnoses, setDiagnoses] = useState<Record<string, MaintenanceDiagnosis>>({});

  // Telemetry Filtering
  const [timeRange, setTimeRange] = useState<TelemetryTimeRange>('TODAY');
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);

  // New Telemetry Source Modal
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState('INVERTER');
  const [newSourceProvider, setNewSourceProvider] = useState('');
  const [newSourceProtocol, setNewSourceProtocol] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Auth Header Helper
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // 1. Fetch Master Operational State
  const fetchOperationsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();

      // Asset info
      const assetRes = await fetch(`/api/assets/${assetId}`, { headers });
      if (!assetRes.ok) {
        throw new Error('دارایی مورد نظر یافت نشد یا دسترسی مجاز نیست.');
      }
      const assetData: EnergyAsset = await assetRes.json();
      setAsset(assetData);

      // Components
      const compRes = await fetch(`/api/assets/${assetId}/components`, { headers });
      if (compRes.ok) {
        const compData = await compRes.json();
        setComponents(Array.isArray(compData) ? compData : []);
      }

      // Connection status
      const connRes = await fetch(`/api/assets/${assetId}/connection-status`, { headers });
      if (connRes.ok) {
        const connData = await connRes.json();
        setConnectionReport(connData);
      }

      // Telemetry Sources
      if (assetData.projectId) {
        const sourcesRes = await fetch(`/api/projects/${assetData.projectId}/telemetry-sources`, { headers });
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json();
          const filteredSources = Array.isArray(sourcesData) 
            ? sourcesData.filter((s: TelemetrySource) => !s.assetId || s.assetId === assetId)
            : [];
          setSources(filteredSources);
        }
      }

      // Health assessment
      const healthRes = await fetch(`/api/assets/${assetId}/health`, { headers });
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealthAssessment(healthData);
      }

      // Alerts
      const alertsRes = await fetch(`/api/assets/${assetId}/alerts`, { headers });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
      }

      // Maintenance cases
      const casesRes = await fetch(`/api/assets/${assetId}/maintenance`, { headers });
      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setCases(Array.isArray(casesData) ? casesData : []);
      }

      // Maintenance history
      const historyRes = await fetch(`/api/assets/${assetId}/maintenance-history`, { headers });
      if (historyRes.ok) {
        const histData = await historyRes.json();
        setHistoryItems(Array.isArray(histData) ? histData : []);
      }

      // Telemetry readings
      await fetchTelemetryReadings(timeRange);

    } catch (err: any) {
      console.error('Error fetching operations data:', err);
      setError(err?.message || 'خطا در بارگذاری اطلاعات عملیاتی.');
    } finally {
      setLoading(false);
    }
  }, [assetId, getAuthHeaders, timeRange]);

  // 2. Fetch Telemetry Readings for Selected Time Range
  const fetchTelemetryReadings = async (range: TelemetryTimeRange) => {
    try {
      setIsRefreshingTelemetry(true);
      const headers = getAuthHeaders();
      const now = new Date();
      let fromDate = new Date();

      if (range === 'TODAY') {
        fromDate.setHours(0, 0, 0, 0);
      } else if (range === '7D') {
        fromDate.setDate(now.getDate() - 7);
      } else if (range === '30D') {
        fromDate.setDate(now.getDate() - 30);
      }

      const query = `from=${encodeURIComponent(fromDate.toISOString())}&to=${encodeURIComponent(now.toISOString())}`;
      const res = await fetch(`/api/assets/${assetId}/telemetry?${query}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReadings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching telemetry readings:', err);
    } finally {
      setIsRefreshingTelemetry(false);
    }
  };

  useEffect(() => {
    fetchOperationsData();
  }, [fetchOperationsData]);

  // Handle Range Change
  const handleRangeChange = (range: TelemetryTimeRange) => {
    setTimeRange(range);
    fetchTelemetryReadings(range);
  };

  // Component Map for quick lookups
  const componentMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    components.forEach((c) => {
      map[c.id] = (c as any).name || c.model || c.componentType;
    });
    return map;
  }, [components]);

  // Extract latest readings by metricType
  const latestReadings = React.useMemo(() => {
    const map: Record<string, TelemetryReading> = {};
    // Chronological sort
    const sorted = [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    sorted.forEach((r) => {
      map[r.metricType] = r;
    });
    return map;
  }, [readings]);

  // 3. Operational Action Handlers
  const handleInvestigateAlert = async (alertId: string, note?: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/alerts/${alertId}/investigate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    }
  };

  const handleFlagAlertMaintenance = async (alertId: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/alerts/${alertId}/maintenance-required`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    }
  };

  const handleResolveAlert = async (alertId: string, resolutionNote: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ resolutionNote }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    }
  };

  const handleDismissAlert = async (alertId: string, reason: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/alerts/${alertId}/dismiss`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    }
  };

  const handleDiagnoseAlert = async (alert: AssetAlert) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/alerts/${alert.id}/diagnose`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      const diag: MaintenanceDiagnosis = await res.json();
      setDiagnoses((prev) => ({ ...prev, [alert.id]: diag }));
    }
  };

  const handleCreateCaseFromAlert = async (alert: AssetAlert) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/assets/${assetId}/maintenance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `رسیدگی به: ${alert.title}`,
        description: alert.description || 'ایجاد پرونده تعمیرات بر اساس هشدار تله‌متری',
        priority: alert.severity === 'CRITICAL' ? 'EMERGENCY' : alert.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        category: 'CORRECTIVE',
        componentId: alert.componentId,
        alertId: alert.id,
      }),
    });
    if (res.ok) {
      const newCase: MaintenanceCase = await res.json();
      setCases((prev) => [newCase, ...prev]);
      // Update alert's maintenanceCaseId
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, maintenanceCaseId: newCase.id, status: 'CASE_CREATED' } : a)));
      setActiveTab('MAINTENANCE');
    }
  };

  const handleCreateManualCase = async (data: { title: string; description: string; priority: any; category: any; componentId?: string }) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/assets/${assetId}/maintenance`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newCase: MaintenanceCase = await res.json();
      setCases((prev) => [newCase, ...prev]);
    }
  };

  const handleFetchTechnicianMatches = async (caseId: string): Promise<TechnicianMatch[]> => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/technician-matches`, { headers });
    if (res.ok) {
      const matches = await res.json();
      return Array.isArray(matches) ? matches : [];
    }
    return [];
  };

  const handleAssignTechnician = async (caseId: string, technicianId: string, notes?: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ technicianId, notes }),
    });
    if (res.ok) {
      const updatedCase = await res.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    }
  };

  const handleAcceptCase = async (caseId: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/accept`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      const updatedCase = await res.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    }
  };

  const handleScheduleCase = async (caseId: string, scheduledDate: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/schedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ scheduledDate }),
    });
    if (res.ok) {
      const updatedCase = await res.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    }
  };

  const handleStartCase = async (caseId: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/start`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      const updatedCase = await res.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    }
  };

  const handleLogAction = async (caseId: string, actionData: any) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(actionData),
    });
    if (res.ok) {
      const updatedCase = await res.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    }
  };

  const handleSubmitVerification = async (caseId: string, summary: any) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/submit-verification`, {
      method: 'POST',
      headers,
      body: JSON.stringify(summary),
    });
    if (res.ok) {
      const updatedCase = await res.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    }
  };

  const handleVerifyCase = async (caseId: string, notes: string, approved: boolean) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ verificationNotes: notes, approved }),
    });
    if (res.ok) {
      const updatedCase = await res.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    }
  };

  const handleCloseCase = async (caseId: string) => {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/maintenance/${caseId}/close`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      const updatedCase = await res.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
    }
  };

  const handleAddTelemetrySource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAddingSource(true);
      const headers = getAuthHeaders();
      const res = await fetch(`/api/assets/${assetId}/telemetry-sources`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newSourceName,
          sourceType: newSourceType,
          provider: newSourceProvider || undefined,
          protocol: newSourceProtocol || undefined,
          status: 'ACTIVE',
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSources((prev) => [...prev, created]);
        setShowAddSourceModal(false);
        setNewSourceName('');
        setNewSourceProvider('');
        setNewSourceProtocol('');
      }
    } catch (err) {
      console.error('Error adding telemetry source:', err);
    } finally {
      setIsAddingSource(false);
    }
  };

  if (loading && !asset) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6 animate-pulse">
        <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <OperationsErrorState
          message={error || 'دارایی یافت نشد.'}
          onRetry={fetchOperationsData}
        />
      </div>
    );
  }

  const openAlertsCount = alerts.filter((a) => ['TRIGGERED', 'OPEN', 'ACKNOWLEDGED'].includes(a.status)).length;
  const activeCasesCount = cases.filter((c) => !['CLOSED', 'CANCELLED'].includes(c.status)).length;

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 px-4 space-y-6" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                {asset.assetCode || asset.id}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {asset.assetType || 'نیروگاه فتوولتائیک'}
              </span>
              {asset.status && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  {asset.status}
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
              {asset.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              {typeof (asset.installedCapacityKw ?? (asset as any).nominalCapacityKw) === 'number' && (
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>ظرفیت نامی: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{formatPersianNumber(asset.installedCapacityKw ?? (asset as any).nominalCapacityKw)} kW</strong></span>
                </div>
              )}
              {asset.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {typeof asset.location === 'string'
                      ? asset.location
                      : (asset.location as any).city
                      ? `${(asset.location as any).province || ''}، ${(asset.location as any).city}`
                      : (asset.location as any).address || 'موقعیت ثبت نشده است'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToPassport && (
              <button
                type="button"
                onClick={onNavigateToPassport}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>مشاهده شناسنامه دارایی (Passport)</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchOperationsData}
              title="به‌روزرسانی کل اطلاعات"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Data Freshness and Connection Quick Status Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <DataFreshnessIndicator
            lastReadingTimestamp={connectionReport?.latestReadingTimestamp}
            statusClassification={connectionReport?.status}
            staleThresholdHours={connectionReport?.staleThresholdHours}
          />

          <MonitoringConnectionStatus
            report={connectionReport}
            compact
          />
        </div>
      </div>

      {/* Operations Navigation Tabs */}
      <OperationsNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        openAlertsCount={openAlertsCount}
        activeCasesCount={activeCasesCount}
      />

      {/* Main Tab Views */}
      {activeTab === 'OVERVIEW' && (
        <AssetOperationsOverview
          asset={asset}
          connectionReport={connectionReport}
          healthAssessment={healthAssessment}
          latestReadings={latestReadings}
          activeAlerts={alerts.filter((a) => ['TRIGGERED', 'OPEN', 'ACKNOWLEDGED'].includes(a.status))}
          activeCases={cases.filter((c) => !['CLOSED', 'CANCELLED'].includes(c.status))}
          componentMap={componentMap}
          onNavigateTab={setActiveTab}
          onConfigureMonitoring={() => setShowAddSourceModal(true)}
          canConfigureMonitoring={true}
        />
      )}

      {activeTab === 'MONITORING' && (
        <div className="space-y-6">
          {/* Time Range Selector & Freshness Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                <span>نمودارها و داده‌های جریان تله‌متری</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                بررسی روند سری‌های زمانی توان، تولید انرژی و پارامترهای الکتریکی
              </p>
            </div>

            <div className="flex items-center gap-3">
              <TelemetryTimeRangeSelector
                selectedRange={timeRange}
                onRangeChange={handleRangeChange}
                disabled={isRefreshingTelemetry}
              />
            </div>
          </div>

          {/* Telemetry Charts */}
          <div className="space-y-5">
            <TelemetryChart
              readings={readings}
              metricType="POWER_KW"
              metricLabel="توان فعال خروجی"
              unit="kW"
              hasSources={sources.length > 0}
              canConfigure={true}
              onConfigureClick={() => setShowAddSourceModal(true)}
            />

            <TelemetryChart
              readings={readings}
              metricType="ENERGY_KWH"
              metricLabel="تولید تجمعی انرژی"
              unit="kWh"
              hasSources={sources.length > 0}
              canConfigure={true}
              onConfigureClick={() => setShowAddSourceModal(true)}
            />
          </div>

          {/* Telemetry Sources List */}
          <TelemetrySourceList
            sources={sources}
            loading={loading}
            canAddSource={true}
            onAddSource={() => setShowAddSourceModal(true)}
            equipmentMap={componentMap}
          />
        </div>
      )}

      {activeTab === 'ALERTS' && (
        <AlertCenter
          alerts={alerts}
          diagnoses={diagnoses}
          componentMap={componentMap}
          loading={loading}
          onRefresh={fetchOperationsData}
          onInvestigate={handleInvestigateAlert}
          onFlagMaintenance={handleFlagAlertMaintenance}
          onResolve={handleResolveAlert}
          onDismiss={handleDismissAlert}
          onDiagnose={handleDiagnoseAlert}
          onCreateCase={handleCreateCaseFromAlert}
          onViewCase={(caseId) => {
            setActiveTab('MAINTENANCE');
          }}
        />
      )}

      {activeTab === 'MAINTENANCE' && (
        <MaintenanceCenter
          cases={cases}
          componentMap={componentMap}
          loading={loading}
          canCreateCase={true}
          onRefresh={fetchOperationsData}
          onCreateCase={handleCreateManualCase}
          onAssignTechnician={handleAssignTechnician}
          onAcceptCase={handleAcceptCase}
          onScheduleCase={handleScheduleCase}
          onStartCase={handleStartCase}
          onLogAction={handleLogAction}
          onSubmitVerification={handleSubmitVerification}
          onVerifyCase={handleVerifyCase}
          onCloseCase={handleCloseCase}
          onFetchMatches={handleFetchTechnicianMatches}
        />
      )}

      {activeTab === 'HISTORY' && (
        <AssetMaintenanceHistory
          historyItems={historyItems}
          loading={loading}
          onRefresh={fetchOperationsData}
        />
      )}

      {/* Modal: Add Telemetry Source */}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              پیکربندی منبع تله‌متری جدید
            </h3>

            <form onSubmit={handleAddTelemetrySource} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نام منبع:
                </label>
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="مثلاً: کنتور هوشمند فیدر خروجی، اینورتر شماره ۱"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نوع منبع داده:
                </label>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="INVERTER">اینورتر خورشیدی</option>
                  <option value="SMART_METER">کنتور هوشمند</option>
                  <option value="BATTERY_BMS">سیستم باتری (BMS)</option>
                  <option value="WEATHER_STATION">ایستگاه هواشناسی</option>
                  <option value="API">وب‌سرویس پایش (API)</option>
                  <option value="MANUAL_UPLOAD">بارگذاری دستی داده معتبر</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  تأمین‌کننده / ارائه‌دهنده سرویس (اختیاری):
                </label>
                <input
                  type="text"
                  value={newSourceProvider}
                  onChange={(e) => setNewSourceProvider(e.target.value)}
                  placeholder="مثلاً: سامانه پایش توانیر، هواشناسی، دیتالاگر"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  پروتکل ارتباطی (اختیاری):
                </label>
                <input
                  type="text"
                  value={newSourceProtocol}
                  onChange={(e) => setNewSourceProtocol(e.target.value)}
                  placeholder="در صورت عدم درج، «پروتکل ثبت نشده است» نمایش می‌یابد"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                  className="min-h-[44px] px-4 py-2 text-xs text-slate-500 hover:text-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isAddingSource}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
                >
                  {isAddingSource ? 'در حال ثبت...' : 'ثبت منبع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
