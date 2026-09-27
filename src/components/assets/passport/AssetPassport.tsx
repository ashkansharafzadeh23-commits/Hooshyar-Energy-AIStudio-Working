import React, { useState, useEffect } from 'react';
import { EnergyAsset, AssetComponent, EquipmentWarranty, CommissioningRecord, CommissioningTest } from '../../../types/asset';
import { ProjectContract, ContractParty } from '../../../types/execution';
import { ExecutionDoc } from '../../execution/ExecutionDocuments';
import { AssetIdentity } from './AssetIdentity';
import { AssetEquipmentRegistry } from './AssetEquipmentRegistry';
import { AssetWarrantySummary } from './AssetWarrantySummary';
import { AssetDocumentRegistry } from './AssetDocumentRegistry';
import { AssetCommissioningRecord } from './AssetCommissioningRecord';
import { AssetContractSummary } from './AssetContractSummary';
import { AssetMonitoringStatus } from './AssetMonitoringStatus';
import { AssetMaintenanceHistory, MaintenanceLog } from './AssetMaintenanceHistory';
import { AssetHistoryTimeline, AssetHistoryEvent } from './AssetHistoryTimeline';
import { Cpu, ShieldCheck, FileText, Activity, Wrench, Clock, Zap, ArrowRight, Layers } from 'lucide-react';

interface AssetPassportProps {
  assetId: string;
  onBack?: () => void;
  className?: string;
}

interface PassportSectionDef {
  id: 'equipment' | 'warranties' | 'commissioning' | 'documents' | 'contract' | 'monitoring' | 'maintenance' | 'history';
  title: string;
  icon: any;
  count?: number;
}

export const AssetPassport: React.FC<AssetPassportProps> = ({
  assetId,
  onBack,
  className = ''
}) => {
  const [activeSection, setActiveSection] = useState<'equipment' | 'warranties' | 'commissioning' | 'documents' | 'contract' | 'monitoring' | 'maintenance' | 'history'>('equipment');

  const [asset, setAsset] = useState<EnergyAsset | null>(null);
  const [components, setComponents] = useState<AssetComponent[]>([]);
  const [warranties, setWarranties] = useState<EquipmentWarranty[]>([]);
  const [documents, setDocuments] = useState<ExecutionDoc[]>([]);
  const [commissioningRecord, setCommissioningRecord] = useState<CommissioningRecord | null>(null);
  const [commissioningTests, setCommissioningTests] = useState<CommissioningTest[]>([]);
  const [contract, setContract] = useState<ProjectContract | null>(null);
  const [contractParties, setContractParties] = useState<ContractParty[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [historyEvents, setHistoryEvents] = useState<AssetHistoryEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPassportData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Asset basic info
        const assetRes = await fetch(`/api/assets/${assetId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (!assetRes.ok) {
          throw new Error('دارایی یافت نشد یا دسترسی مجاز نیست.');
        }
        const assetData = await assetRes.json();
        setAsset(assetData);

        // 2. Components
        const compRes = await fetch(`/api/assets/${assetId}/components`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (compRes.ok) {
          const compData = await compRes.json();
          setComponents(Array.isArray(compData) ? compData : []);
        }

        // 3. Warranties
        const warRes = await fetch(`/api/assets/${assetId}/warranties`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (warRes.ok) {
          const warData = await warRes.json();
          setWarranties(Array.isArray(warData) ? warData : []);
        }

        // If asset has projectId, fetch linked project data (commissioning, documents, contract, activities)
        if (assetData.projectId) {
          // Documents
          const docsRes = await fetch(`/api/projects/${assetData.projectId}/documents`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
          });
          if (docsRes.ok) {
            const docsData = await docsRes.json();
            setDocuments(Array.isArray(docsData) ? docsData : []);
          }

          // Commissioning
          const commRes = await fetch(`/api/projects/${assetData.projectId}/commissioning`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
          });
          if (commRes.ok) {
            const commData = await commRes.json();
            setCommissioningRecord(commData);
            if (commData?.id) {
              const testsRes = await fetch(`/api/commissioning/${commData.id}/tests`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
              });
              if (testsRes.ok) {
                const testsData = await testsRes.json();
                setCommissioningTests(Array.isArray(testsData) ? testsData : []);
              }
            }
          }

          // Contract
          const contractRes = await fetch(`/api/execution/${assetData.projectId}/contracts`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
          });
          if (contractRes.ok) {
            const contractsData = await contractRes.json();
            if (Array.isArray(contractsData) && contractsData.length > 0) {
              setContract(contractsData[0]);
            }
          }

          // Activities for history
          const actRes = await fetch(`/api/projects/${assetData.projectId}/activity`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
          });
          if (actRes.ok) {
            const actData = await actRes.json();
            if (Array.isArray(actData)) {
              setHistoryEvents(
                actData.map((a: any) => ({
                  id: a.id,
                  title: a.eventType === 'ASSET_GENERATED' ? 'ایجاد شناسنامه دارایی' : a.eventType === 'COMMISSIONING_APPROVED' ? 'تأیید راه‌اندازی' : a.eventType === 'HANDOVER_APPROVED' ? 'تحویل پروژه به بهره‌بردار' : a.eventType,
                  date: a.timestamp || a.createdAt,
                  category: 'LIFECYCLE',
                  description: a.metadata?.description || a.metadata?.notes,
                  actor: a.actorUserId
                }))
              );
            }
          }
        }

        // Maintenance History
        try {
          const maintRes = await fetch(`/api/assets/${assetId}/maintenance-history`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
          });
          if (maintRes.ok) {
            const mData = await maintRes.json();
            const items = Array.isArray(mData) ? mData : mData.historyItems || [];
            setMaintenanceLogs(items.map((m: any) => ({
              id: m.id || m.maintenanceCaseId,
              assetId: assetId,
              maintenanceType: m.category || 'CORRECTIVE',
              description: m.title || m.resolutionSummary || 'سرویس و نگهداری ثبت‌شده',
              performedDate: m.completedDate || m.performedAt || m.createdAt,
              performedBy: m.assignedTechnicianName || m.performedBy || 'تیم O&M',
              status: m.status || 'COMPLETED',
              cost: m.totalCostIrr || m.cost,
              notes: m.closureNotes || m.resolutionSummary
            })));
          }
        } catch {
          // ignore
        }
      } catch (err: any) {
        setError(err?.message || 'خطا در بارگذاری اطلاعات شناسنامه دارایی');
      } finally {
        setLoading(false);
      }
    };

    if (assetId) {
      loadPassportData();
    }
  }, [assetId]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">در حال بارگذاری شناسنامه دارایی (Asset Passport)...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="p-8 rounded-3xl border border-rose-200 bg-rose-50 text-center space-y-3">
        <p className="text-xs font-bold text-rose-800">{error || 'شناسنامه دارایی یافت نشد.'}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 min-h-[44px]"
          >
            بازگشت
          </button>
        )}
      </div>
    );
  }

  const sections: PassportSectionDef[] = [
    { id: 'equipment', title: 'ادوات و تجهیزات', icon: Cpu, count: components.length },
    { id: 'warranties', title: 'ضمانت‌نامه‌ها', icon: ShieldCheck, count: warranties.length },
    { id: 'commissioning', title: 'سوابق راه‌اندازی', icon: ShieldCheck, count: commissioningTests.length },
    { id: 'documents', title: 'اسناد و مدارک', icon: FileText, count: documents.length },
    { id: 'contract', title: 'قرارداد احداث', icon: FileText },
    { id: 'monitoring', title: 'وضعیت پایش', icon: Activity },
    { id: 'maintenance', title: 'تعمیر و نگهداری', icon: Wrench, count: maintenanceLogs.length },
    { id: 'history', title: 'تاریخچه دارایی', icon: Clock, count: historyEvents.length }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Back button if present */}
      {onBack && (
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 min-h-[44px]"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به پروژه</span>
          </button>
        </div>
      )}

      {/* 1. Identity Component */}
      <AssetIdentity asset={asset} />

      {/* 2. Navigation Pills / Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-750 overflow-x-auto scrollbar-none">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.title}</span>
              {typeof sec.count === 'number' && sec.count > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                }`}>
                  {sec.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Progressive Section Content */}
      <div className="bg-slate-50/50 dark:bg-zinc-900/40 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800">
        {activeSection === 'equipment' && (
          <AssetEquipmentRegistry components={components} />
        )}

        {activeSection === 'warranties' && (
          <AssetWarrantySummary warranties={warranties} />
        )}

        {activeSection === 'commissioning' && (
          <AssetCommissioningRecord
            commissioningRecord={commissioningRecord}
            tests={commissioningTests}
          />
        )}

        {activeSection === 'documents' && (
          <AssetDocumentRegistry documents={documents} />
        )}

        {activeSection === 'contract' && (
          <AssetContractSummary
            contract={contract}
            parties={contractParties}
          />
        )}

        {activeSection === 'monitoring' && (
          <AssetMonitoringStatus
            assetId={asset.id}
            isConnected={false}
          />
        )}

        {activeSection === 'maintenance' && (
          <AssetMaintenanceHistory logs={maintenanceLogs} />
        )}

        {activeSection === 'history' && (
          <AssetHistoryTimeline events={historyEvents} />
        )}
      </div>
    </div>
  );
};
