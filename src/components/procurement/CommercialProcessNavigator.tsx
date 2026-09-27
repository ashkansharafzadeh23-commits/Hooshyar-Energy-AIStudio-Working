import React from 'react';
import { Users, Cpu, FileSignature, Truck, CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react';

export type CommercialStageId = 'epc' | 'equipment' | 'contract_po' | 'delivery';

export type CommercialStageStatus = 
  | 'NOT_STARTED'        // شروع نشده
  | 'PENDING_INFO'        // در انتظار اطلاعات
  | 'RECEIVING_BIDS'      // در حال دریافت پیشنهاد
  | 'BIDS_RECEIVED'       // پیشنهاد دریافت شده
  | 'NEEDS_DECISION'      // نیازمند تصمیم
  | 'AWARDED'             // انتخاب انجام شده
  | 'IN_PROCUREMENT'      // در حال تأمین
  | 'DELIVERED';          // تحویل شده

export interface StageInfo {
  id: CommercialStageId;
  title: string;
  subtitle: string;
  status: CommercialStageStatus;
  statusLabel: string;
  countLabel?: string;
}

interface CommercialProcessNavigatorProps {
  activeStage: CommercialStageId;
  onSelectStage: (stage: CommercialStageId) => void;
  stages: StageInfo[];
  className?: string;
}

export const CommercialProcessNavigator: React.FC<CommercialProcessNavigatorProps> = ({
  activeStage,
  onSelectStage,
  stages,
  className = ''
}) => {
  const getStageIcon = (id: CommercialStageId) => {
    switch (id) {
      case 'epc':
        return Users;
      case 'equipment':
        return Cpu;
      case 'contract_po':
        return FileSignature;
      case 'delivery':
        return Truck;
    }
  };

  const getStatusBadge = (status: CommercialStageStatus, label: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'AWARDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            {label}
          </span>
        );
      case 'NEEDS_DECISION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {label}
          </span>
        );
      case 'RECEIVING_BIDS':
      case 'BIDS_RECEIVED':
      case 'IN_PROCUREMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3 h-3 shrink-0" />
            {label}
          </span>
        );
      case 'PENDING_INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50/70 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/40">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {label}
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
            <Circle className="w-2.5 h-2.5 shrink-0" />
            {label}
          </span>
        );
    }
  };

  return (
    <div className={`w-full bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-2 sm:p-3 shadow-2xs ${className}`}>
      <div className="flex flex-col lg:flex-row items-stretch gap-2">
        {stages.map((stage, idx) => {
          const Icon = getStageIcon(stage.id);
          const isActive = activeStage === stage.id;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.id)}
              className={`flex-1 text-right p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer min-h-[58px] ${
                isActive
                  ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-xs'
                  : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:border-slate-200 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                        ۰{idx + 1}
                      </span>
                      <h4 className={`text-xs sm:text-sm font-bold ${
                        isActive ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-zinc-200'
                      }`}>
                        {stage.title}
                      </h4>
                    </div>
                  </div>
                </div>

                {stage.countLabel && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                    {stage.countLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                  {stage.subtitle}
                </span>
                {getStatusBadge(stage.status, stage.statusLabel)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
