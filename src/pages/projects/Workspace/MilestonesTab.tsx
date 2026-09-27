import React, { useState, useEffect, useCallback } from 'react';
import { ProjectMilestone } from '../../../types/execution';
import { Loader2, Flag } from 'lucide-react';
import { MilestoneList } from '../../../components/execution/MilestoneList';

interface MilestonesTabProps {
  projectId: string;
}

export const MilestonesTab: React.FC<MilestonesTabProps> = ({ projectId }) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/execution/${projectId}/milestones`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMilestones(Array.isArray(data) ? data.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0)) : []);
      }
    } catch (e: any) {
      console.error('Failed to load milestones:', e);
      setError(e?.message || 'خطا در بارگذاری نقاط عطف پروژه');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleUpdateStatus = async (milestoneId: string, status: string, notes?: string) => {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`/api/execution/${projectId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در به‌روزرسانی نقطه عطف');
    }
    await fetchMilestones();
  };

  const handleSubmitApproval = async (milestoneId: string, notes?: string) => {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`/api/execution/${projectId}/milestones/${milestoneId}/submit-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در ارسال جهت بررسی نظارت');
    }
    await fetchMilestones();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
          <Flag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>نقاط عطف اجرایی و ساختار شکست کار (Milestones & WBS)</span>
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          پیگیری پیشرفت فیزیکی واقعی، تحویل مراحل و بازرسی‌های نظارت کارگاهی
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      <MilestoneList
        milestones={milestones}
        onUpdateStatus={handleUpdateStatus}
        onSubmitApproval={handleSubmitApproval}
        canEdit={true}
      />
    </div>
  );
};
