import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Zap, CheckCircle2, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { EnergyAsset } from '../../../types/asset';
import { ProjectToAssetTransition } from '../../../components/execution/ProjectToAssetTransition';
import { AssetPassport } from '../../../components/assets/passport/AssetPassport';

interface AssetTabProps {
  projectId: string;
}

export const AssetTab: React.FC<AssetTabProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Gating status
  const [commissioningApproved, setCommissioningApproved] = useState(false);
  const [handoverApproved, setHandoverApproved] = useState(false);
  const [targetCapacityKw, setTargetCapacityKw] = useState<number | undefined>(undefined);

  const fetchAssetTabData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [assetsRes, projectRes, commRes, handoverRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/assets`, { headers }).catch(() => null),
        fetch(`/api/projects/${projectId}`, { headers }).catch(() => null),
        fetch(`/api/projects/${projectId}/commissioning`, { headers }).catch(() => null),
        fetch(`/api/projects/${projectId}/handover`, { headers }).catch(() => null)
      ]);

      if (assetsRes && assetsRes.ok) {
        const data = await assetsRes.json();
        const list = Array.isArray(data) ? data : [];
        setAssets(list);
        if (list.length > 0) {
          setSelectedAssetId(list[0].id);
        }
      }

      if (projectRes && projectRes.ok) {
        const pData = await projectRes.json();
        setTargetCapacityKw(pData.targetCapacityKw ?? pData.capacityKw ?? undefined);
      }

      if (commRes && commRes.ok) {
        const cData = await commRes.json();
        setCommissioningApproved(cData?.status === 'APPROVED');
      }

      if (handoverRes && handoverRes.ok) {
        const hData = await handoverRes.json();
        setHandoverApproved(hData?.status === 'APPROVED');
      }
    } catch (e) {
      console.error('Failed to load asset tab data:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAssetTabData();
  }, [fetchAssetTabData]);

  const handleCreateAsset = async (): Promise<EnergyAsset> => {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`/api/projects/${projectId}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در صدور شناسنامه دارایی');
    }

    const created = await res.json();
    await fetchAssetTabData();
    return created;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If asset exists and selected, show full AssetPassport
  if (selectedAssetId) {
    return (
      <div className="space-y-6">
        <AssetPassport
          assetId={selectedAssetId}
          onBack={assets.length > 1 ? () => setSelectedAssetId(null) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
            دارایی انرژی و شناسنامه دیجیتال (Energy Asset & Passport)
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            شناسنامه دارایی، ادوات و تجهیزات شناسنامه‌دار و وضعیت بهره‌برداری
          </p>
        </div>
      </div>

      {/* Project to Asset Transition Gating */}
      <ProjectToAssetTransition
        projectId={projectId}
        projectCapacityKw={targetCapacityKw}
        commissioningApproved={commissioningApproved}
        handoverApproved={handoverApproved}
        existingAsset={assets[0] || null}
        onCreateAsset={handleCreateAsset}
        onViewAssetPassport={(assetId) => setSelectedAssetId(assetId)}
      />

      {/* If multiple assets exist, list them */}
      {assets.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">
            شناسنامه‌های دارایی ثبت‌شده برای این پروژه:
          </h4>
          <div className="space-y-2">
            {assets.map(a => (
              <div
                key={a.id}
                onClick={() => setSelectedAssetId(a.id)}
                className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-all"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">{a.name}</div>
                  <div className="text-xs text-slate-500 font-mono">کد دارایی: {a.assetCode} | ظرفیت: {a.installedCapacityKw} kW</div>
                </div>
                <button className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 min-h-[44px]">
                  <span>مشاهده شناسنامه کامل</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
