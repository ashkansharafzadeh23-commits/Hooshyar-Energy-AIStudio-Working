import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, ShieldCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { CommissioningRecord, CommissioningTest } from '../../../types/asset';
import { CommissioningReadiness, CommissioningReadinessData } from '../../../components/execution/CommissioningReadiness';
import { CommissioningChecklist } from '../../../components/execution/CommissioningChecklist';
import { CommissioningReview } from '../../../components/execution/CommissioningReview';

interface CommissioningTabProps {
  projectId: string;
}

export const CommissioningTab: React.FC<CommissioningTabProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<CommissioningRecord | null>(null);
  const [tests, setTests] = useState<CommissioningTest[]>([]);
  const [readiness, setReadiness] = useState<CommissioningReadinessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const fetchCommissioningData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [commRes, readinessRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/commissioning`, { headers }).catch(() => null),
        fetch(`/api/projects/${projectId}/commissioning/readiness`, { headers }).catch(() => null)
      ]);

      if (commRes && commRes.ok) {
        const commData = await commRes.json();
        setRecord(commData);
        if (commData?.id) {
          const testsRes = await fetch(`/api/commissioning/${commData.id}/tests`, { headers }).catch(() => null);
          if (testsRes && testsRes.ok) {
            const testData = await testsRes.json();
            setTests(Array.isArray(testData) ? testData : []);
          }
        }
      }

      if (readinessRes && readinessRes.ok) {
        const rData = await readinessRes.json();
        setReadiness(rData);
      }
    } catch (err: any) {
      console.error('Failed to load commissioning tab data:', err);
      setError(err?.message || 'خطا در بارگذاری پرونده راه‌اندازی');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCommissioningData();
  }, [fetchCommissioningData]);

  const handleStartCommissioning = async () => {
    try {
      setStarting(true);
      setError(null);
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/projects/${projectId}/commissioning/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'خطا در آغاز پرونده راه‌اندازی');
      }
      await fetchCommissioningData();
    } catch (err: any) {
      setError(err?.message || 'خطا در آغاز راه‌اندازی');
    } finally {
      setStarting(false);
    }
  };

  const handleRecordTestResult = async (testId: string, measuredValue: string, status: string, notes?: string) => {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`/api/commissioning-tests/${testId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ measuredValue, status, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در ثبت نتیجه آزمون');
    }
    await fetchCommissioningData();
  };

  const handleApproveCommissioning = async (notes?: string) => {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`/api/projects/${projectId}/commissioning/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در تأیید نهایی راه‌اندازی');
    }
    await fetchCommissioningData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isApproved = record?.status === 'APPROVED';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>مدیریت راه‌اندازی فنی و اتصال موقت (Commissioning)</span>
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            اجرای پروتکل آزمون‌های سرد، گرم، تزریق توان و انطباق شبکه
          </p>
        </div>

        {!record && (
          <button
            onClick={handleStartCommissioning}
            disabled={starting}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2 min-h-[44px] self-start sm:self-auto"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
            <span>آغاز پرونده راه‌اندازی</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Readiness Assessment */}
      <CommissioningReadiness readiness={readiness} />

      {/* Tests Checklist */}
      <CommissioningChecklist
        tests={tests}
        onRecordResult={handleRecordTestResult}
        canEdit={!isApproved}
      />

      {/* Sign-off Review */}
      {record && (
        <CommissioningReview
          projectId={projectId}
          readiness={readiness}
          onApproveCommissioning={handleApproveCommissioning}
        />
      )}
    </div>
  );
};
