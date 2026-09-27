import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  RefreshCw, 
  Clock, 
  Filter, 
  CheckCircle2, 
  UserCheck 
} from 'lucide-react';
import { MaintenanceCase, MaintenanceStatus, MaintenancePriority, MaintenanceCategory, TechnicianMatch } from '../../types/maintenance';
import { MaintenanceCaseCard } from './MaintenanceCaseCard';
import { MaintenanceCaseDetails } from './MaintenanceCaseDetails';
import { MaintenanceEmptyState } from './MaintenanceEmptyState';
import { toPersianDigits } from '../../utils/formatters';

export type MaintenanceFilterTab = 'ALL' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';

export interface MaintenanceCenterProps {
  cases: MaintenanceCase[];
  componentMap?: Record<string, string>;
  loading?: boolean;
  canCreateCase?: boolean;
  onRefresh?: () => void;
  onCreateCase?: (newCaseData: { title: string; description: string; priority: MaintenancePriority; category: MaintenanceCategory; componentId?: string }) => Promise<void>;
  onAssignTechnician?: (caseId: string, technicianId: string, notes?: string) => Promise<void>;
  onAcceptCase?: (caseId: string) => Promise<void>;
  onScheduleCase?: (caseId: string, scheduledDate: string) => Promise<void>;
  onStartCase?: (caseId: string) => Promise<void>;
  onLogAction?: (caseId: string, actionData: any) => Promise<void>;
  onSubmitVerification?: (caseId: string, summary: any) => Promise<void>;
  onVerifyCase?: (caseId: string, notes: string, approved: boolean) => Promise<void>;
  onCloseCase?: (caseId: string) => Promise<void>;
  onFetchMatches?: (caseId: string) => Promise<TechnicianMatch[]>;
}

export const MaintenanceCenter: React.FC<MaintenanceCenterProps> = ({
  cases,
  componentMap = {},
  loading = false,
  canCreateCase = true,
  onRefresh,
  onCreateCase,
  onAssignTechnician,
  onAcceptCase,
  onScheduleCase,
  onStartCase,
  onLogAction,
  onSubmitVerification,
  onVerifyCase,
  onCloseCase,
  onFetchMatches,
}) => {
  const [filterTab, setFilterTab] = useState<MaintenanceFilterTab>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Matches cache per case
  const [caseMatches, setCaseMatches] = useState<Record<string, TechnicianMatch[]>>({});
  const [loadingMatches, setLoadingMatches] = useState<Record<string, boolean>>({});

  // New Case Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<MaintenancePriority>('MEDIUM');
  const [newCategory, setNewCategory] = useState<MaintenanceCategory>('CORRECTIVE');
  const [newComponentId, setNewComponentId] = useState('');
  const [isSubmittingNewCase, setIsSubmittingNewCase] = useState(false);

  // Filter cases strictly
  const filteredCases = cases.filter((c) => {
    if (filterTab === 'ACTIVE') {
      const activeStatuses: string[] = ['OPEN', 'DRAFT', 'DIAGNOSING', 'AWAITING_ASSIGNMENT', 'ASSIGNED', 'SCHEDULED', 'ACCEPTED', 'REPORTED'];
      if (!activeStatuses.includes(c.status)) return false;
    } else if (filterTab === 'IN_PROGRESS') {
      const inProgStatuses: string[] = ['IN_PROGRESS', 'WAITING_PARTS'];
      if (!inProgStatuses.includes(c.status)) return false;
    } else if (filterTab === 'COMPLETED') {
      const compStatuses: string[] = ['COMPLETED', 'AWAITING_VERIFICATION', 'PENDING_VERIFICATION', 'SUBMITTED_FOR_VERIFICATION', 'VERIFIED', 'RESOLVED'];
      if (!compStatuses.includes(c.status)) return false;
    } else if (filterTab === 'CLOSED') {
      if (c.status !== 'CLOSED' && c.status !== 'CANCELLED') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = c.title.toLowerCase().includes(q);
      const descMatch = c.description?.toLowerCase().includes(q);
      const codeMatch = c.maintenanceCode?.toLowerCase().includes(q);
      const techMatch = c.assignedTechnicianName?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !codeMatch && !techMatch) return false;
    }

    return true;
  });

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || null;

  // Counts based on actual backend data
  const activeCount = cases.filter((c) => ['REPORTED', 'ASSIGNED', 'ACCEPTED', 'SCHEDULED'].includes(c.status)).length;
  const inProgressCount = cases.filter((c) => ['IN_PROGRESS', 'WAITING_PARTS'].includes(c.status)).length;
  const completedCount = cases.filter((c) => ['COMPLETED', 'SUBMITTED_FOR_VERIFICATION', 'VERIFIED'].includes(c.status)).length;

  const handleSelectCase = async (c: MaintenanceCase) => {
    setSelectedCaseId(c.id);
    if (onFetchMatches && !caseMatches[c.id]) {
      try {
        setLoadingMatches((prev) => ({ ...prev, [c.id]: true }));
        const matches = await onFetchMatches(c.id);
        setCaseMatches((prev) => ({ ...prev, [c.id]: matches }));
      } catch (err) {
        console.error('Failed to fetch matches for case', err);
      } finally {
        setLoadingMatches((prev) => ({ ...prev, [c.id]: false }));
      }
    }
  };

  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateCase) return;
    try {
      setIsSubmittingNewCase(true);
      await onCreateCase({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        category: newCategory,
        componentId: newComponentId || undefined,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewComponentId('');
    } catch (err) {
      console.error('Failed to create case', err);
    } finally {
      setIsSubmittingNewCase(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Bar with Filters and Create Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              <span>مرکز عملیات و نگهداری (O&M)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مدیریت پرونده‌های تعمیراتی، تخصیص تکنسین و راستی‌آزمایی اقدامات
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canCreateCase && onCreateCase && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>پرونده جدید</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="به‌روزرسانی"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setFilterTab('ACTIVE')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterTab === 'ACTIVE'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>پرونده‌های فعال</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200/60 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {toPersianDigits(activeCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('IN_PROGRESS')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterTab === 'IN_PROGRESS'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>در حال اجرا</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/60 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              {toPersianDigits(inProgressCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('COMPLETED')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterTab === 'COMPLETED'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>تکمیل و تأییدشده</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-200/60 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
              {toPersianDigits(completedCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('CLOSED')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterTab === 'CLOSED'
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>بایگانی‌شده</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>همه ({toPersianDigits(cases.length)})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، شرح، شناسه پرونده یا نام تکنسین..."
            className="w-full text-xs pr-9 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Selected Case Details Drawer */}
      {selectedCase && (
        <MaintenanceCaseDetails
          maintenanceCase={selectedCase}
          componentName={selectedCase.componentId ? componentMap[selectedCase.componentId] : undefined}
          technicianMatches={caseMatches[selectedCase.id] || []}
          isLoadingMatches={loadingMatches[selectedCase.id]}
          onClose={() => setSelectedCaseId(null)}
          onAssignTechnician={onAssignTechnician ? (techId, notes) => onAssignTechnician(selectedCase.id, techId, notes) : undefined}
          onAcceptCase={onAcceptCase ? () => onAcceptCase(selectedCase.id) : undefined}
          onScheduleCase={onScheduleCase ? (date) => onScheduleCase(selectedCase.id, date) : undefined}
          onStartCase={onStartCase ? () => onStartCase(selectedCase.id) : undefined}
          onLogAction={onLogAction ? (data) => onLogAction(selectedCase.id, data) : undefined}
          onSubmitVerification={onSubmitVerification ? (summary) => onSubmitVerification(selectedCase.id, summary) : undefined}
          onVerifyCase={onVerifyCase ? (notes, app) => onVerifyCase(selectedCase.id, notes, app) : undefined}
          onCloseCase={onCloseCase ? () => onCloseCase(selectedCase.id) : undefined}
        />
      )}

      {/* Case Listing */}
      {filteredCases.length === 0 ? (
        <MaintenanceEmptyState
          filtered={cases.length > 0}
          canCreateCase={canCreateCase}
          onCreateCase={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCases.map((c) => (
            <MaintenanceCaseCard
              key={c.id}
              maintenanceCase={c}
              componentName={c.componentId ? componentMap[c.componentId] : undefined}
              isSelected={selectedCaseId === c.id}
              onSelect={handleSelectCase}
              onAssignClick={(caseItem) => {
                handleSelectCase(caseItem);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ثبت پرونده تعمیرات و نگهداری جدید
            </h3>

            <form onSubmit={handleCreateCaseSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان پرونده:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثلاً: سرویس سالیانه ترانسفورماتور و آچارکشی باس‌بار"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  شرح دستور کار و نواقص مشاهده‌شده:
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="توضیحات فنی، علائم خطای مشاهده‌شده در سایت..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    سطح اولویت:
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as MaintenancePriority)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="LOW">عادی (LOW)</option>
                    <option value="MEDIUM">متوسط (MEDIUM)</option>
                    <option value="HIGH">فوری (HIGH)</option>
                    <option value="EMERGENCY">اضطراری (EMERGENCY)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    دسته‌بندی:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MaintenanceCategory)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="CORRECTIVE">تعمیر اضطراری / اصلاحی</option>
                    <option value="PREVENTIVE">سرویس دوره‌ای / پیشگیرانه</option>
                    <option value="PREDICTIVE">پیش‌بینانه</option>
                    <option value="INSPECTION">بازرسی فنی</option>
                    <option value="WARRANTY">اقدام تحت گارانتی</option>
                  </select>
                </div>
              </div>

              {Object.keys(componentMap).length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تجهیز مرتبط (اختیاری):
                  </label>
                  <select
                    value={newComponentId}
                    onChange={(e) => setNewComponentId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="">بدون تجهیز خاص (کل نیروگاه)</option>
                    {Object.entries(componentMap).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-[44px] px-4 py-2 text-xs text-slate-500 hover:text-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewCase}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
                >
                  {isSubmittingNewCase ? 'در حال ثبت...' : 'ثبت پرونده'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
