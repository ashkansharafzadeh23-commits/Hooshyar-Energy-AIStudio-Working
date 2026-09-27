import React from 'react';
import { AssetComponent } from '../../../types/asset';
import { Cpu, ShieldCheck, Tag, Calendar, Layers, AlertCircle } from 'lucide-react';

interface AssetEquipmentRegistryProps {
  components: AssetComponent[];
  loading?: boolean;
  className?: string;
}

export const AssetEquipmentRegistry: React.FC<AssetEquipmentRegistryProps> = ({
  components,
  loading = false,
  className = ''
}) => {
  const getComponentTypeLabel = (type: string) => {
    switch (type) {
      case 'SOLAR_PANEL':
        return 'ماژول‌های خورشیدی (Solar PV Panels)';
      case 'INVERTER':
        return 'اینورترها و مبدل‌های توان (Inverters)';
      case 'BATTERY':
        return 'سامانه ذخیره‌ساز انرژی و باتری (BESS)';
      case 'TRANSFORMER':
        return 'ترانسفورماتور و پست اختصاصی (Transformer)';
      case 'METER':
        return 'کنتور اندازه‌گیری و دیسپاچینگ (Smart Meter)';
      case 'TRACKER':
        return 'سامانه ردیاب خورشیدی (Solar Tracker)';
      case 'MONITORING_DEVICE':
        return 'دیتالاگر و سامانه مانیتورینگ (Data Logger)';
      default:
        return type || 'تجهیز نیروگاهی';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>ثبت ادوات و تجهیزات شناسنامه‌دار ({components.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            ردیابی شماره سریال، سازنده، مدل و مشخصات پلاک فنی تجهیزات نصب‌شده
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری اطلاعات تجهیزات...
        </div>
      ) : components.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800">
          <Layers className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            اطلاعات تجهیزات این دارایی هنوز ثبت نشده است.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            با تکمیل سفارش‌های خرید و تحویل اقلام در مرحله اجرای پروژه، شناسنامه تجهیزات ثبت می‌گردد.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {components.map((comp) => (
            <div
              key={comp.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                    {getComponentTypeLabel(comp.componentType)}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                    تعداد: {comp.quantity || 1}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  {comp.manufacturer || comp.brand || 'سازنده مشخص نشده'} - {comp.model || 'مدل نامشخص'}
                </h4>
              </div>

              {/* Technical identifiers */}
              <div className="space-y-1.5 text-xs bg-slate-50/70 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">شماره سریال:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                    {comp.serialNumber || (
                      <span className="text-slate-400 dark:text-zinc-500 font-normal italic">
                        شماره سریال ثبت نشده
                      </span>
                    )}
                  </span>
                </div>

                {comp.ratedCapacity !== undefined && comp.ratedCapacity !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">ظرفیت / توان نامی:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                      {comp.ratedCapacity} {comp.capacityUnit || 'W'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">تاریخ نصب:</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300">
                    {formatDate(comp.installationDate)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
