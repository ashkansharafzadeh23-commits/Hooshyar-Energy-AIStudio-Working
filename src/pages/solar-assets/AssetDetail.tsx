import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AssetPassport } from '../../components/assets/passport/AssetPassport';
import { AssetOperationsWorkspace } from '../../components/operations/AssetOperationsWorkspace';
import { AppContextBreadcrumb, ProjectAssetBridge } from '../../components/integration';
import { FileText, Activity, Layers, ArrowRight } from 'lucide-react';

export default function SolarAssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [assetSummary, setAssetSummary] = useState<{
    id: string;
    name?: string;
    assetCode?: string;
    projectId?: string;
    status?: string;
  } | null>(null);

  const currentView = searchParams.get('view') || (searchParams.get('tab') === 'passport' ? 'passport' : 'operations');

  const setView = (view: 'passport' | 'operations') => {
    setSearchParams({ view });
  };

  useEffect(() => {
    if (!id) return;
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/assets/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setAssetSummary(data);
        }
      } catch (e) {
        // Handled silently; underlying views also fetch data
      }
    };
    fetchSummary();
  }, [id]);

  if (!id) {
    return (
      <div className="p-8 text-center text-xs text-slate-500" dir="rtl">
        شناسه دارایی نامعتبر است.
      </div>
    );
  }

  const assetName = assetSummary?.name || 'دارایی بدون عنوان';
  const viewTitle = currentView === 'operations' ? 'مرکز پایش و عملیات' : 'شناسنامه فنی دارایی';

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      {/* Top Breadcrumb & Context Bar */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <AppContextBreadcrumb
            items={[
              { label: 'دارایی‌ها', to: '/solar-assets' },
              { label: assetName, to: `/solar-assets/${id}` },
              { label: viewTitle, active: true }
            ]}
          />

          {/* Contextual link back to originating EnergyProject (only if relationship exists) */}
          {assetSummary?.projectId && (
            <ProjectAssetBridge
              mode="ASSET_TO_PROJECT"
              projectId={assetSummary.projectId}
              className="self-start sm:self-auto"
            />
          )}
        </div>
      </div>

      {/* Top View Mode Switcher */}
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div className="inline-flex w-full sm:w-auto bg-slate-100 dark:bg-slate-850 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
          <button
            type="button"
            onClick={() => setView('operations')}
            className={`flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentView === 'operations'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>مرکز عملیات و پایش (Operations Center)</span>
          </button>

          <button
            type="button"
            onClick={() => setView('passport')}
            className={`flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentView === 'passport'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>شناسنامه فنی دارایی (Asset Passport)</span>
          </button>
        </div>
      </div>

      {/* Selected View */}
      {currentView === 'operations' ? (
        <AssetOperationsWorkspace
          assetId={id}
          onNavigateToPassport={() => setView('passport')}
          onBack={() => navigate('/solar-assets')}
        />
      ) : (
        <div className="max-w-6xl mx-auto py-4 sm:py-6 px-4 space-y-6">
          <AssetPassport
            assetId={id}
            onBack={() => navigate('/solar-assets')}
          />
        </div>
      )}
    </div>
  );
}
