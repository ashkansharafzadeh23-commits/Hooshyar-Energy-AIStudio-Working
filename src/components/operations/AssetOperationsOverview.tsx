import React from 'react';
import { 
  Activity, 
  Zap, 
  Sun, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  ArrowLeft, 
  ShieldCheck, 
  Compass,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { EnergyAsset } from '../../types/asset';
import { AssetHealthAssessment, TelemetryReading } from '../../types/monitoring';
import { AssetAlert, MaintenanceCase } from '../../types/maintenance';
import { MonitoringConnectionStatus, MonitoringConnectionReport } from './MonitoringConnectionStatus';
import { OperationalHealthCard } from './OperationalHealthCard';
import { TelemetryMetricCard } from './TelemetryMetricCard';
import { DataFreshnessIndicator } from './DataFreshnessIndicator';
import { AlertCard } from './AlertCard';
import { MaintenanceCaseCard } from './MaintenanceCaseCard';
import { OperationsTabId } from './OperationsNavigation';
import { toPersianDigits, formatPersianNumber } from '../../utils/formatters';

export interface AssetOperationsOverviewProps {
  asset: EnergyAsset;
  connectionReport?: MonitoringConnectionReport | null;
  healthAssessment?: AssetHealthAssessment | null;
  latestReadings?: Record<string, TelemetryReading>;
  activeAlerts?: AssetAlert[];
  activeCases?: MaintenanceCase[];
  componentMap?: Record<string, string>;
  onNavigateTab: (tab: OperationsTabId) => void;
  onConfigureMonitoring?: () => void;
  canConfigureMonitoring?: boolean;
}

export const AssetOperationsOverview: React.FC<AssetOperationsOverviewProps> = ({
  asset,
  connectionReport,
  healthAssessment,
  latestReadings = {},
  activeAlerts = [],
  activeCases = [],
  componentMap = {},
  onNavigateTab,
  onConfigureMonitoring,
  canConfigureMonitoring = false,
}) => {
  // Extract real telemetry measurements
  const powerReading = latestReadings['POWER_KW'] || latestReadings['ACTIVE_POWER_KW'];
  const dailyEnergyReading = latestReadings['ENERGY_KWH'] || latestReadings['DAILY_YIELD_KWH'];
  const voltageReading = latestReadings['VOLTAGE'];
  const tempReading = latestReadings['MODULE_TEMPERATURE'] || latestReadings['AMBIENT_TEMPERATURE'];

  // Critical items needing attention:
  // Unresolved alerts or emergency/high priority cases
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');
  const needsAttentionCount = activeAlerts.length + activeCases.length;

  // Determine factual Next Action based on real backend state:
  let nextAction: { title: string; desc: string; buttonText: string; tabTarget?: OperationsTabId; action?: () => void } | null = null;

  if (connectionReport?.status === 'NO_SOURCES_CONFIGURED' || connectionReport?.status === 'NOT_CONFIGURED') {
    nextAction = {
      title: 'اتصال منبع داده پایش به نیروگاه',
      desc: 'برای شروع دریافت تله‌متری برخط و نظارت هوشمند، منبع داده اینورتر، کنتور یا وب‌سرویس پایش را متصل نمایید.',
      buttonText: 'پیکربندی منبع پایش',
      action: onConfigureMonitoring,
      tabTarget: 'MONITORING',
    };
  } else if (criticalAlerts.length > 0) {
    nextAction = {
      title: 'رسیدگی به هشدارهای با اولویت بالا',
      desc: `${toPersianDigits(criticalAlerts.length)} هشدار مهم در سامانه ثبت شده است که نیازمند بررسی کارشناسی یا ایجاد پرونده تعمیرات است.`,
      buttonText: 'مشاهده هشدارها',
      tabTarget: 'ALERTS',
    };
  } else if (activeCases.some((c) => !c.assignedTechnicianId)) {
    nextAction = {
      title: 'تخصیص تکنسین به پرونده‌های تعمیراتی در انتظار',
      desc: 'پرونده‌های فعال بدون تکنسین نیازمند انطباق و اعزام تکنسین متخصص جهت رفع مشکل هستند.',
      buttonText: 'مدیریت پرونده‌ها و تکنسین‌ها',
      tabTarget: 'MAINTENANCE',
    };
  } else if (activeCases.some((c) => c.status === 'COMPLETED' || c.status === 'AWAITING_VERIFICATION' || c.status === 'PENDING_VERIFICATION')) {
    nextAction = {
      title: 'راستی‌آزمایی و تأیید نهایی تعمیرات',
      desc: 'گزارش اتمام کار تکنسین ارسال شده و در انتظار راستی‌آزمایی و ارزیابی کیفیت توسط کارفرما است.',
      buttonText: 'بررسی راستی‌آزمایی',
      tabTarget: 'MAINTENANCE',
    };
  }

  return (
    <div className="space-y-6">
      {/* Top Section: Monitoring Connection Status Banner */}
      <MonitoringConnectionStatus
        report={connectionReport}
        canConfigure={canConfigureMonitoring}
        onConfigureClick={onConfigureMonitoring}
      />

      {/* Section C: Latest Verified Telemetry Measurements (Max ~4) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>آخرین اندازه‌گیری‌های تصدیق‌شده تله‌متری</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('MONITORING')}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>مشاهده نمودارها و منابع</span>
            <ArrowLeft className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <TelemetryMetricCard
            label="توان لحظه‌ای فعال"
            value={powerReading?.value}
            unit="kW"
            metricType="POWER_KW"
            timestamp={powerReading?.timestamp}
            quality={powerReading?.quality}
            icon={Zap}
          />
          <TelemetryMetricCard
            label="تولید انرژی ثبت‌شده"
            value={dailyEnergyReading?.value}
            unit="kWh"
            metricType="ENERGY_KWH"
            timestamp={dailyEnergyReading?.timestamp}
            quality={dailyEnergyReading?.quality}
            icon={Sun}
          />
          <TelemetryMetricCard
            label="ولتاژ شبکه / فاز"
            value={voltageReading?.value}
            unit="V"
            metricType="VOLTAGE"
            timestamp={voltageReading?.timestamp}
            quality={voltageReading?.quality}
          />
          <TelemetryMetricCard
            label="دمای تجهیز / ماژول"
            value={tempReading?.value}
            unit="°C"
            metricType="MODULE_TEMPERATURE"
            timestamp={tempReading?.timestamp}
            quality={tempReading?.quality}
          />
        </div>
      </div>

      {/* Grid: Health Assessment & Next Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section D: Operational Health */}
        <OperationalHealthCard
          assessment={healthAssessment}
        />

        {/* Section F: Next Action Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
              <Compass className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">گام بعدی عملیاتی (Next Action)</span>
            </div>

            {nextAction ? (
              <div className="mt-3 space-y-2">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {nextAction.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {nextAction.desc}
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>کلیه فرآیندهای عملیاتی در وضعیت پایدار قرار دارند</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  در حال حاضر اقدام اضطراری باز یا تخصیص معوقه‌ای برای این دارایی وجود ندارد. جریان تله‌متری و هشدارها به طور مداوم پایش می‌شوند.
                </p>
              </div>
            )}
          </div>

          {nextAction && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (nextAction?.action) nextAction.action();
                  else if (nextAction?.tabTarget) onNavigateTab(nextAction.tabTarget);
                }}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
              >
                <span>{nextAction.buttonText}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section E: Attention Required (Alerts & Maintenance Cases) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Open Alerts Mini-Preview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>هشدارهای فعال نیازمند توجه ({toPersianDigits(activeAlerts.length)})</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigateTab('ALERTS')}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>مشاهده همه</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              هشدار ثبت‌شده‌ای برای این بازه نمایش داده نمی‌شود.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeAlerts.slice(0, 2).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  componentName={alert.componentId ? componentMap[alert.componentId] : undefined}
                  onSelect={() => onNavigateTab('ALERTS')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Active Maintenance Cases Mini-Preview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <span>پرونده‌های فعال O&M ({toPersianDigits(activeCases.length)})</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigateTab('MAINTENANCE')}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>مشاهده همه</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

          {activeCases.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              پرونده تعمیراتی ثبت‌شده‌ای برای این دارایی وجود ندارد.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeCases.slice(0, 2).map((c) => (
                <MaintenanceCaseCard
                  key={c.id}
                  maintenanceCase={c}
                  componentName={c.componentId ? componentMap[c.componentId] : undefined}
                  onSelect={() => onNavigateTab('MAINTENANCE')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
