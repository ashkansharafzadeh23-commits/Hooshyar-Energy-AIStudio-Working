import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ArrowRightLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ProjectHandover, EnergyAsset } from '../../../types/asset';
import { HandoverReview, HandoverReadinessData } from '../../../components/execution/HandoverReview';
import { ProjectToAssetTransition } from '../../../components/execution/ProjectToAssetTransition';

interface HandoverTabProps {
  projectId: string;
  onNavigateTab?: (tab: string) => void;
}

export const HandoverTab: React.FC<HandoverTabProps> = ({ projectId, onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [handover, setHandover] = useState<ProjectHandover | null>(null);
  const [readiness, setReadiness] = useState<HandoverReadinessData | null>(null);
  const [asset, setAsset] = useState<EnergyAsset | null>(null);
  const [commissioningApproved, setCommissioningApproved] = useState(false);
  const [targetCapacityKw, setTargetCapacityKw] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchHandoverData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [handoverRes, readinessRes, commRes, projectRes, assetsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/handover`, { headers }).catch(() => null),
        fetch(`/api/projects/${projectId}/handover/readiness`, { headers }).catch(() => null),
        fetch(`/api/projects/${projectId}/commissioning`, { headers }).catch(() => null),
        fetch(`/api/projects/${projectId}`, { headers }).catch(() => null),
        fetch(`/api/projects/${projectId}/assets`, { headers }).catch(() => null)
      ]);

      if (handoverRes && handoverRes.ok) {
        const hData = await handoverRes.json();
        setHandover(hData && hData.id ? hData : null);
      }

      if (readinessRes && readinessRes.ok) {
        const rData = await readinessRes.json();
        setReadiness(rData);
      }

      if (commRes && commRes.ok) {
        const cData = await commRes.json();
        setCommissioningApproved(cData?.status === 'APPROVED');
      }

      if (projectRes && projectRes.ok) {
        const pData = await projectRes.json();
        setTargetCapacityKw(pData.targetCapacityKw ?? pData.capacityKw ?? undefined);
      }

      if (assetsRes && assetsRes.ok) {
        const aData = await assetsRes.json();
        if (Array.isArray(aData) && aData.length > 0) {
          setAsset(aData[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load handover tab data:', err);
      setError(err?.message || 'خطا در بارگذاری اطلاعات تحویل پروژه');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchHandoverData();
  }, [fetchHandoverData]);

  const handleUpdateChecklist = async (items: Partial<ProjectHandover>) => {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`/api/projects/${projectId}/handover/checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(items)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در به‌روزرسانی چک‌لیست تحویل');
    }
    await fetchHandoverData();
  };

  const handleApproveHandover = async (notes?: string) => {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`/api/projects/${projectId}/handover/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در ثبت صورت‌جلسه تحویل نهایی');
    }
    await fetchHandoverData();
  };

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
    setAsset(created);
    await fetchHandoverData();
    return created;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isApproved = handover?.status === 'APPROVED';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>مدیریت و صورت‌جلسه تحویل نهایی (Handover)</span>
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          انتقال قانونی مالکیت عملیاتی، اسناد چون‌ساخت، آموزش بهره‌بردار و گارانتی‌ها
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Handover Review and Checklist */}
      <HandoverReview
        projectId={projectId}
        handover={handover}
        readiness={readiness}
        onUpdateChecklist={handleUpdateChecklist}
        onApproveHandover={handleApproveHandover}
        canEdit={!isApproved}
      />

      {/* Project to Asset Transition */}
      <ProjectToAssetTransition
        projectId={projectId}
        projectCapacityKw={targetCapacityKw}
        commissioningApproved={commissioningApproved}
        handoverApproved={isApproved}
        existingAsset={asset}
        onCreateAsset={handleCreateAsset}
        onViewAssetPassport={() => {
          if (onNavigateTab) onNavigateTab('asset');
        }}
      />
    </div>
  );
};
