import React, { useState, useEffect } from 'react';
import { EnergyProject } from '../../types/project';
import { 
  LIFECYCLE_PHASES, 
  LifecyclePhaseId, 
  getProjectPhase, 
  mapTabToPhaseAndCapability 
} from './lifecycleMapping';
import { ProjectLifecycleProgress } from './ProjectLifecycleProgress';
import { ProjectSummary } from './ProjectSummary';
import { FinancialTab } from '../../pages/projects/FinancialTab';
import { ContractTab } from '../../pages/projects/Workspace/ContractTab';
import { MilestonesTab } from '../../pages/projects/Workspace/MilestonesTab';
import { ProcurementTab } from '../../pages/projects/Workspace/ProcurementTab';
import { CommissioningTab } from '../../pages/projects/Workspace/CommissioningTab';
import { HandoverTab } from '../../pages/projects/Workspace/HandoverTab';
import { AssetTab } from '../../pages/projects/Workspace/AssetTab';
import { FinancingTab } from '../../pages/projects/Workspace/FinancingTab';
import { InvestmentTab } from '../../pages/projects/Workspace/InvestmentTab';
import RFQTab from '../../pages/projects/Workspace/RFQTab';
import BidsTab from '../../pages/projects/Workspace/BidsTab';
import { CommercialWorkspace } from '../procurement';
import { 
  Layers, 
  FileText, 
  HandCoins, 
  HardHat, 
  Activity, 
  CheckCircle, 
  ArrowRight, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface ProjectProcessProps {
  project: EnergyProject;
  initialTab?: string;
  initialCapability?: string;
  onProjectUpdate?: () => void;
  onSelectTab?: (tab: string) => void;
}

export const ProjectProcess: React.FC<ProjectProcessProps> = ({
  project,
  initialTab,
  initialCapability,
  onProjectUpdate,
  onSelectTab,
}) => {
  const currentStatusInfo = getProjectPhase(project.status);
  const defaultPhaseId: LifecyclePhaseId = currentStatusInfo.phase?.id || 'phase-1-design';

  const [selectedPhaseId, setSelectedPhaseId] = useState<LifecyclePhaseId>(() => {
    if (initialTab) {
      return mapTabToPhaseAndCapability(initialTab).phaseId;
    }
    return defaultPhaseId;
  });

  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string>(() => {
    if (initialCapability) return initialCapability;
    if (initialTab) {
      return mapTabToPhaseAndCapability(initialTab).capabilityId;
    }
    const currentPhaseDef = LIFECYCLE_PHASES.find(p => p.id === defaultPhaseId);
    return currentPhaseDef?.capabilities[0]?.id || 'site-info';
  });

  // Sync when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      const mapped = mapTabToPhaseAndCapability(initialTab);
      setSelectedPhaseId(mapped.phaseId);
      setSelectedCapabilityId(initialCapability || mapped.capabilityId);
    }
  }, [initialTab, initialCapability]);

  const currentPhaseDef = LIFECYCLE_PHASES.find(p => p.id === selectedPhaseId) || LIFECYCLE_PHASES[0];

  const handlePhaseChange = (phaseId: LifecyclePhaseId) => {
    setSelectedPhaseId(phaseId);
    const newPhaseDef = LIFECYCLE_PHASES.find(p => p.id === phaseId);
    if (newPhaseDef && newPhaseDef.capabilities.length > 0) {
      setSelectedCapabilityId(newPhaseDef.capabilities[0].id);
    }
  };

  const renderCapabilityContent = () => {
    switch (selectedCapabilityId) {
      // Phase 1
      case 'site-info':
        return <ProjectSummary project={project} />;
      case 'financial-analysis':
        return <FinancialTab project={project} />;

      // Phase 2
      case 'rfq':
        return (
          <CommercialWorkspace
            project={project}
            initialStage="epc"
            onProjectUpdate={onProjectUpdate}
          />
        );
      case 'bids':
        return (
          <CommercialWorkspace
            project={project}
            initialStage="epc"
            onProjectUpdate={onProjectUpdate}
          />
        );

      // Phase 3
      case 'contract':
        return <ContractTab projectId={project.id} />;
      case 'financing':
        return <FinancingTab projectId={project.id} project={project} />;
      case 'investment':
        return <InvestmentTab project={project} />;
      case 'procurement':
        return (
          <CommercialWorkspace
            project={project}
            initialStage="equipment"
            onProjectUpdate={onProjectUpdate}
          />
        );

      // Phase 4
      case 'milestones':
        return <MilestonesTab projectId={project.id} />;
      case 'commissioning':
        return <CommissioningTab projectId={project.id} />;
      case 'handover':
        return <HandoverTab projectId={project.id} />;

      // Phase 5
      case 'asset':
        return <AssetTab projectId={project.id} />;
      case 'monitoring-status':
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900">وضعیت سامانه پایش و مانیتورینگ</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                پایش برخط هنوز فعال نشده است.
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mt-4 leading-relaxed text-right">
                سامانه هوشیار انرژی داده‌های درگاه تله‌متری و اینورتر را صرفاً پس از نصب تجهیز سخت‌افزاری و راستی‌آزمایی سیگنال دریافتی نمایش می‌دهد تا شفافیت و اعتماد فنی حفظ گردد.
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            ماژول درخواستی یافت نشد.
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Lifecycle Progress Stepper */}
      <ProjectLifecycleProgress
        status={project.status}
        selectedPhaseId={selectedPhaseId}
        onSelectPhase={handlePhaseChange}
        interactive={true}
      />

      {/* 2. Phase Header & Progressive Disclosure Capability Pills */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                {currentPhaseDef.index}
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                فاز {currentPhaseDef.index}: {currentPhaseDef.title}
              </h3>
              <span className="text-xs text-slate-400 font-mono">({currentPhaseDef.enTitle})</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentPhaseDef.description}
            </p>
          </div>

          <span className="text-xs font-medium text-slate-400">
            {currentPhaseDef.capabilities.length} ماژول تخصصی در این فاز
          </span>
        </div>

        {/* Capability Selectors */}
        <div className="flex flex-wrap gap-2">
          {currentPhaseDef.capabilities.map((cap) => {
            const isActive = selectedCapabilityId === cap.id;
            return (
              <button
                key={cap.id}
                type="button"
                onClick={() => setSelectedCapabilityId(cap.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{cap.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Capability Content Area */}
      <div className="transition-all duration-150">
        {renderCapabilityContent()}
      </div>
    </div>
  );
};
