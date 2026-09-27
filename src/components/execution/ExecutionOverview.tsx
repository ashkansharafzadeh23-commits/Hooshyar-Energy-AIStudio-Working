import React from 'react';
import { EnergyProject } from '../../types/project';
import { ProjectMilestone } from '../../types/execution';
import { CommissioningRecord, EnergyAsset, ProjectHandover } from '../../types/asset';
import { ExecutionStageNavigator } from './ExecutionStageNavigator';
import { ExecutionNextAction } from './ExecutionNextAction';
import { ExecutionAttentionItems, AttentionItem } from './ExecutionAttentionItems';
import { EquipmentDeliverySummary, DeliveryItemSummary } from './EquipmentDeliverySummary';
import { CommissioningReadiness, CommissioningReadinessData } from './CommissioningReadiness';
import { SiteActivityTimeline, ActivityEvent } from './SiteActivityTimeline';
import { ProjectToAssetTransition } from './ProjectToAssetTransition';
import { ShieldCheck, Flag, Package, Zap, Clock } from 'lucide-react';

interface ExecutionOverviewProps {
  project: EnergyProject;
  milestones: ProjectMilestone[];
  deliveries: DeliveryItemSummary[];
  activities: ActivityEvent[];
  commissioningRecord: CommissioningRecord | null;
  commissioningReadiness: CommissioningReadinessData | null;
  handover: ProjectHandover | null;
  asset: EnergyAsset | null;
  onNavigateTab: (tab: string) => void;
  onCreateAsset: () => Promise<EnergyAsset>;
  onViewAssetPassport?: (assetId: string) => void;
  className?: string;
}

export const ExecutionOverview: React.FC<ExecutionOverviewProps> = ({
  project,
  milestones,
  deliveries,
  activities,
  commissioningRecord,
  commissioningReadiness,
  handover,
  asset,
  onNavigateTab,
  onCreateAsset,
  onViewAssetPassport,
  className = ''
}) => {
  // Derive factual attention items
  const attentionItems: AttentionItem[] = [];

  const commApproved = commissioningRecord?.status === 'APPROVED';
  const handoverApproved = handover?.status === 'APPROVED';
  const hasAsset = Boolean(asset);

  // Check pending deliveries
  const pendingDeliveries = deliveries.filter(d => d.status === 'SHIPPED' || d.status === 'DELIVERED');
  if (pendingDeliveries.length > 0) {
    attentionItems.push({
      id: 'pending-deliveries',
      severity: 'MEDIUM',
      category: 'EQUIPMENT',
      title: `${pendingDeliveries.length} محموله تجهیزات در انتظار بازرسی کیفی`,
      description: 'تجهیزات ارسال‌شده یا تخلیه‌شده در کارگاه نیازمند تأیید بازرسی فنی هستند.',
      targetTab: 'milestones',
      actionLabel: 'مشاهده تأمین'
    });
  }

  // Check commissioning readiness blocking reasons
  if (commissioningReadiness && !commissioningReadiness.canApprove && (commissioningReadiness.blockingReasons?.length ?? 0) > 0) {
    attentionItems.push({
      id: 'comm-blocking',
      severity: 'HIGH',
      category: 'TEST',
      title: 'نواقص راه‌اندازی و اتصال موقت',
      description: commissioningReadiness.blockingReasons![0],
      targetTab: 'commissioning',
      actionLabel: 'بررسی آزمون‌ها'
    });
  }

  // Check handover blocking items
  if (commApproved && !handoverApproved) {
    attentionItems.push({
      id: 'handover-pending',
      severity: 'MEDIUM',
      category: 'HANDOVER',
      title: 'تکمیل مدارک و چک‌لیست تحویل پروژه',
      description: 'راه‌اندازی فنی تأیید گردیده و اکنون تحویل اسناد چون‌ساخت و آموزش در جریان است.',
      targetTab: 'commissioning',
      actionLabel: 'مشاهده تحویل'
    });
  }

  // Key factual status counts (strictly maximum 4, no fake percentage progress!)
  const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length;
  const inProgressMilestones = milestones.filter(m => m.status === 'IN_PROGRESS' || m.status === 'SUBMITTED_FOR_REVIEW').length;
  const capacityKw = project.targetCapacityKw ?? (project as any).capacityKw ?? (project as any).systemCapacityKw ?? 0;

  const nextActiveMilestone = milestones.find(m => m.status === 'IN_PROGRESS' || m.status === 'SUBMITTED_FOR_REVIEW' || m.status === 'NOT_STARTED');

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 1. Stage Navigator */}
      <ExecutionStageNavigator currentStatus={project.status} />

      {/* 2. Transition Banner (if ready or created) */}
      <ProjectToAssetTransition
        projectId={project.id}
        projectCapacityKw={capacityKw}
        commissioningApproved={commApproved}
        handoverApproved={handoverApproved}
        existingAsset={asset}
        onCreateAsset={onCreateAsset}
        onViewAssetPassport={onViewAssetPassport}
      />

      {/* 3. Next Action Guidance */}
      <ExecutionNextAction
        projectStatus={project.status}
        contractStatus={(project as any).contractStatus}
        hasPendingMilestones={inProgressMilestones > 0}
        nextMilestoneTitle={nextActiveMilestone?.title}
        hasPendingDeliveries={pendingDeliveries.length > 0}
        hasCommissioningRecord={Boolean(commissioningRecord)}
        commissioningCanApprove={commissioningReadiness?.canApprove}
        commissioningApproved={commApproved}
        handoverCanApprove={handoverApproved || false}
        handoverApproved={handoverApproved}
        hasOperationalAsset={hasAsset}
        onNavigateTab={onNavigateTab}
      />

      {/* 4. Strictly 4 key factual indicators (no decorative metrics, NO invented percentages) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">نقاط عطف اجرایی</span>
            <Flag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-zinc-100">{completedMilestones}</span>
            <span className="text-xs text-slate-400">از {milestones.length} گام</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
            {inProgressMilestones} گام در جریان
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">محموله‌های تجهیزات</span>
            <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-zinc-100">
              {deliveries.filter(d => d.status === 'INSPECTED').length}
            </span>
            <span className="text-xs text-slate-400">از {deliveries.length} محموله</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
            تأیید کیفی شده در سایت
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">راه‌اندازی (Commissioning)</span>
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            {commApproved ? 'تأیید شده ✓' : commissioningReadiness?.canApprove ? 'آماده تأیید' : 'در حال انجام آزمون‌ها'}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
            {commissioningReadiness?.passedTests ?? 0} آزمون موفق
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">ظرفیت نامی نیروگاه</span>
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-zinc-100">
              {capacityKw > 0 ? capacityKw : 'ثبت نشده'}
            </span>
            {capacityKw > 0 && <span className="text-xs text-slate-400">kW</span>}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
            {hasAsset ? 'شناسنامه فعال' : 'در مرحله احداث'}
          </span>
        </div>
      </div>

      {/* 5. Attention Items */}
      <ExecutionAttentionItems
        items={attentionItems}
        onAction={onNavigateTab}
      />

      {/* 6. Equipment delivery summary */}
      <EquipmentDeliverySummary
        deliveries={deliveries}
        onViewProcurement={() => onNavigateTab('milestones')}
      />

      {/* 7. Commissioning readiness preview */}
      <CommissioningReadiness
        readiness={commissioningReadiness}
        onGoToTests={() => onNavigateTab('commissioning')}
      />

      {/* 8. Recent activity timeline snippet */}
      <SiteActivityTimeline
        activities={activities.slice(0, 5)}
      />
    </div>
  );
};
