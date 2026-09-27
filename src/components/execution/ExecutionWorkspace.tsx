import React, { useState, useEffect } from 'react';
import { EnergyProject } from '../../types/project';
import { ProjectMilestone } from '../../types/execution';
import { CommissioningRecord, EnergyAsset, ProjectHandover, CommissioningTest } from '../../types/asset';
import { ExecutionOverview } from './ExecutionOverview';
import { MilestoneList } from './MilestoneList';
import { ExecutionDocuments, ExecutionDoc } from './ExecutionDocuments';
import { CommissioningReadiness, CommissioningReadinessData } from './CommissioningReadiness';
import { CommissioningChecklist } from './CommissioningChecklist';
import { CommissioningReview } from './CommissioningReview';
import { HandoverReview, HandoverReadinessData } from './HandoverReview';
import { ProjectToAssetTransition } from './ProjectToAssetTransition';
import { DeliveryItemSummary } from './EquipmentDeliverySummary';
import { ActivityEvent } from './SiteActivityTimeline';
import { LayoutDashboard, Flag, ShieldCheck, FileText, ArrowRightLeft, Zap } from 'lucide-react';

interface ExecutionWorkspaceProps {
  project: EnergyProject;
  initialTab?: 'overview' | 'milestones' | 'commissioning' | 'documents';
  onNavigateGlobalTab?: (tab: string) => void;
  onViewAssetPassport?: (assetId: string) => void;
  className?: string;
}

interface WorkspaceTabDef {
  id: 'overview' | 'milestones' | 'commissioning' | 'documents';
  title: string;
  icon: any;
  count?: number;
}

export const ExecutionWorkspace: React.FC<ExecutionWorkspaceProps> = ({
  project,
  initialTab = 'overview',
  onNavigateGlobalTab,
  onViewAssetPassport,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'commissioning' | 'documents'>(initialTab);

  // Data states
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItemSummary[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [documents, setDocuments] = useState<ExecutionDoc[]>([]);

  // Commissioning & Handover states
  const [commissioningRecord, setCommissioningRecord] = useState<CommissioningRecord | null>(null);
  const [commissioningTests, setCommissioningTests] = useState<CommissioningTest[]>([]);
  const [commissioningReadiness, setCommissioningReadiness] = useState<CommissioningReadinessData | null>(null);
  const [handover, setHandover] = useState<ProjectHandover | null>(null);
  const [handoverReadiness, setHandoverReadiness] = useState<HandoverReadinessData | null>(null);
  const [asset, setAsset] = useState<EnergyAsset | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync initialTab when changed externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load all factual data for this project
  const loadProjectExecutionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Milestones
      const milestonesRes = await fetch(`/api/execution/${project.id}/milestones`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (milestonesRes.ok) {
        const data = await milestonesRes.json();
        setMilestones(Array.isArray(data) ? data : []);
      }

      // 2. Deliveries from procurement
      const deliveriesRes = await fetch(`/api/projects/${project.id}/deliveries`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json();
        setDeliveries(Array.isArray(data) ? data : []);
      }

      // 3. Site Activities
      const activitiesRes = await fetch(`/api/projects/${project.id}/activity`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(Array.isArray(data) ? data : []);
      }

      // 4. Documents
      const docsRes = await fetch(`/api/projects/${project.id}/documents`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(Array.isArray(data) ? data : []);
      }

      // 5. Commissioning
      const commRes = await fetch(`/api/projects/${project.id}/commissioning`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (commRes.ok) {
        const data = await commRes.json();
        setCommissioningRecord(data);
        if (data?.id) {
          // Load tests
          const testsRes = await fetch(`/api/commissioning/${data.id}/tests`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
          });
          if (testsRes.ok) {
            const testData = await testsRes.json();
            setCommissioningTests(Array.isArray(testData) ? testData : []);
          }
        }
      }

      // 6. Commissioning readiness
      const commReadinessRes = await fetch(`/api/projects/${project.id}/commissioning/readiness`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (commReadinessRes.ok) {
        const data = await commReadinessRes.json();
        setCommissioningReadiness(data);
      }

      // 7. Handover & Readiness
      const handoverRes = await fetch(`/api/projects/${project.id}/handover`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (handoverRes.ok) {
        const data = await handoverRes.json();
        setHandover(data);
      }

      const handoverReadinessRes = await fetch(`/api/projects/${project.id}/handover/readiness`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (handoverReadinessRes.ok) {
        const data = await handoverReadinessRes.json();
        setHandoverReadiness(data);
      }

      // 8. Assets
      const assetsRes = await fetch(`/api/projects/${project.id}/assets`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setAsset(data[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load execution workspace data:', err);
      setError(err?.message || 'خطا در بارگذاری اطلاعات کارگاهی');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project?.id) {
      loadProjectExecutionData();
    }
  }, [project?.id]);

  // Milestone actions
  const handleUpdateMilestoneStatus = async (milestoneId: string, status: string, notes?: string) => {
    const res = await fetch(`/api/execution/${project.id}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در به‌روزرسانی نقطه عطف');
    }
    await loadProjectExecutionData();
  };

  const handleSubmitMilestoneApproval = async (milestoneId: string, notes?: string) => {
    const res = await fetch(`/api/execution/${project.id}/milestones/${milestoneId}/submit-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در ارسال جهت تأیید');
    }
    await loadProjectExecutionData();
  };

  // Commissioning test recording
  const handleRecordTestResult = async (testId: string, measuredValue: string, status: string, notes?: string) => {
    const res = await fetch(`/api/commissioning-tests/${testId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ measuredValue, status, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در ثبت نتیجه آزمون');
    }
    await loadProjectExecutionData();
  };

  // Commissioning approval
  const handleApproveCommissioning = async (notes?: string) => {
    const res = await fetch(`/api/projects/${project.id}/commissioning/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در تأیید نهایی پرونده راه‌اندازی');
    }
    await loadProjectExecutionData();
  };

  // Handover checklist toggle
  const handleUpdateHandoverChecklist = async (items: Partial<ProjectHandover>) => {
    const res = await fetch(`/api/projects/${project.id}/handover/checklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(items)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در به‌روزرسانی چک‌لیست تحویل');
    }
    await loadProjectExecutionData();
  };

  // Handover approval
  const handleApproveHandover = async (notes?: string) => {
    const res = await fetch(`/api/projects/${project.id}/handover/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در تأیید تحویل نهایی');
    }
    await loadProjectExecutionData();
  };

  // Asset creation
  const handleCreateAsset = async (): Promise<EnergyAsset> => {
    const res = await fetch(`/api/projects/${project.id}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'خطا در صدور شناسنامه دارایی');
    }
    const created = await res.json();
    setAsset(created);
    await loadProjectExecutionData();
    return created;
  };

  const tabs: WorkspaceTabDef[] = [
    { id: 'overview', title: 'نمای کلی کارگاه', icon: LayoutDashboard },
    { id: 'milestones', title: 'نقاط عطف اجرایی', icon: Flag, count: milestones.length },
    { id: 'commissioning', title: 'راه‌اندازی و تحویل', icon: ShieldCheck, count: commissioningTests.length },
    { id: 'documents', title: 'مدارک و نقشه‌ها', icon: FileText, count: documents.length }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Segmented Navigation (Mobile-first responsive) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-750 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.title}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <ExecutionOverview
          project={project}
          milestones={milestones}
          deliveries={deliveries}
          activities={activities}
          commissioningRecord={commissioningRecord}
          commissioningReadiness={commissioningReadiness}
          handover={handover}
          asset={asset}
          onNavigateTab={(targetTab) => {
            if (targetTab === 'milestones' || targetTab === 'commissioning' || targetTab === 'documents') {
              setActiveTab(targetTab);
            } else if (onNavigateGlobalTab) {
              onNavigateGlobalTab(targetTab);
            }
          }}
          onCreateAsset={handleCreateAsset}
          onViewAssetPassport={onViewAssetPassport}
        />
      )}

      {/* Tab 2: Milestones */}
      {activeTab === 'milestones' && (
        <MilestoneList
          milestones={milestones}
          loading={loading}
          onUpdateStatus={handleUpdateMilestoneStatus}
          onSubmitApproval={handleSubmitMilestoneApproval}
          canEdit={true}
        />
      )}

      {/* Tab 3: Commissioning & Handover */}
      {activeTab === 'commissioning' && (
        <div className="space-y-6">
          {/* Commissioning Readiness check */}
          <CommissioningReadiness
            readiness={commissioningReadiness}
            loading={loading}
          />

          {/* Commissioning Checklist */}
          <CommissioningChecklist
            tests={commissioningTests}
            loading={loading}
            onRecordResult={handleRecordTestResult}
            canEdit={true}
          />

          {/* Final Commissioning Sign-off Review */}
          <CommissioningReview
            projectId={project.id}
            readiness={commissioningReadiness}
            onApproveCommissioning={handleApproveCommissioning}
            loading={loading}
          />

          {/* Handover & As-Built review */}
          <HandoverReview
            projectId={project.id}
            handover={handover}
            readiness={handoverReadiness}
            onUpdateChecklist={handleUpdateHandoverChecklist}
            onApproveHandover={handleApproveHandover}
            loading={loading}
            canEdit={true}
          />

          {/* Asset Transition */}
          <ProjectToAssetTransition
            projectId={project.id}
            projectCapacityKw={project.targetCapacityKw || (project as any).capacityKw}
            commissioningApproved={commissioningRecord?.status === 'APPROVED'}
            handoverApproved={handover?.status === 'APPROVED'}
            existingAsset={asset}
            onCreateAsset={handleCreateAsset}
            onViewAssetPassport={onViewAssetPassport}
          />
        </div>
      )}

      {/* Tab 4: Documents */}
      {activeTab === 'documents' && (
        <ExecutionDocuments
          documents={documents}
          loading={loading}
          canUpload={true}
        />
      )}
    </div>
  );
};
