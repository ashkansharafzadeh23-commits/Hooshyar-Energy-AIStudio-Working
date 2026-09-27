import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Zap, Calendar, ArrowLeft, ArrowRight, ShieldCheck, Activity, Layers, Plus } from 'lucide-react';
import { AppContextBreadcrumb } from '../../components/integration';

export default function SolarAssetsList() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/assets', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAssets(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  const getStatusBadge = (status?: string | null) => {
    if (!status || status.trim() === '') {
      return (
        <span className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-zinc-700 font-medium">
          وضعیت ثبت نشده است
        </span>
      );
    }

    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold">
            در حال بهره‌برداری تجاری
          </span>
        );
      case 'COMMISSIONED':
        return (
          <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 font-bold">
            راه‌اندازی شده
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 font-bold">
            تحت تعمیرات و نگهداری
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-zinc-700 font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <AppContextBreadcrumb
        items={[
          { label: 'پیشخوان', to: '/dashboard' },
          { label: 'دارایی‌های خورشیدی', active: true }
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
            دارایی‌های خورشیدی عملیاتی
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            شناسنامه‌های فنی، پایش عملکرد و سوابق نگهداری نیروگاه‌های فعال به بهره‌برداری رسیده
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors text-xs sm:text-sm font-bold min-h-[44px]"
          >
            <Layers size={16} />
            <span>مشاهده پرونده پروژه‌ها</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
          <span className="text-xs text-slate-500 dark:text-zinc-400">در حال بارگذاری اطلاعات دارایی‌ها...</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              هنوز دارایی عملیاتی ثبت نشده است.
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              بر اساس قوانین چرخه عمر سامانه، پروژه‌ها پس از تکمیل تست‌های راه‌اندازی و تأیید تحویل موقت، به عنوان دارایی رسمی ثبت شده و شناسنامه فنی و مرکز پایش آن‌ها فعال می‌گردد.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 text-xs font-bold transition-all shadow-xs min-h-[44px]"
            >
              <span>مشاهده پروژه‌های در حال احداث</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((asset) => {
            const displayName = asset.name || asset.projectName || 'دارایی بدون عنوان';
            const capacity = asset.installedCapacityKw ?? asset.capacityKw;
            const locationStr = asset.location?.city || asset.location || 'محل مشخص نشده';

            return (
              <div
                key={asset.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700"
              >
                <div className="p-5 flex-1 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      {asset.assetCode && (
                        <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-zinc-400 block mb-1">
                          {asset.assetCode}
                        </span>
                      )}
                      <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 line-clamp-1">
                        {displayName}
                      </h3>
                    </div>
                    {getStatusBadge(asset.status ?? asset.projectStatus)}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{locationStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-500 shrink-0" />
                      <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {capacity !== null && capacity !== undefined ? `${capacity} کیلووات` : 'ثبت نشده'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-850/60 p-4 border-t border-slate-100 dark:border-zinc-800">
                  <Link
                    to={`/solar-assets/${asset.id}`}
                    className="flex items-center justify-center gap-2 w-full text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-xs transition-colors min-h-[44px]"
                  >
                    <span>مشاهده دارایی عملیاتی</span>
                    <ArrowLeft size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
