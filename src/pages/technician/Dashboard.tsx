import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCircle, 
  Wallet, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  ArrowLeft, 
  LogOut, 
  Activity, 
  Briefcase,
  Wrench,
  Play,
  Check,
  Send,
  Plus,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MaintenanceCase, MaintenanceStatus } from '../../types/maintenance';
import { 
  formatCurrencyIRR, 
  formatPersianNumber, 
  toPersianDigits 
} from '../../utils/formatters';
import { formatPersianDateTime } from '../../components/operations/DataFreshnessIndicator';
import { 
  getMaintenancePriorityConfig, 
  getMaintenanceStatusLabel, 
  getMaintenanceCategoryLabel 
} from '../../components/operations/MaintenanceCaseCard';

export default function TechnicianDashboard() {
  const [activeTab, setActiveTab] = useState<'requests' | 'in_progress' | 'history' | 'profile'>('requests');
  const [cases, setCases] = useState<MaintenanceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User info from token or localStorage
  const [userProfile, setUserProfile] = useState<{ id?: string; name?: string; role?: string; email?: string }>({});

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedCaseForAction, setSelectedCaseForAction] = useState<MaintenanceCase | null>(null);
  const [actionType, setActionType] = useState('REPAIR');
  const [actionDesc, setActionDesc] = useState('');
  const [actionParts, setActionParts] = useState('');
  const [actionHours, setActionHours] = useState('');

  // Submit completion states
  const [selectedCaseForSubmit, setSelectedCaseForSubmit] = useState<MaintenanceCase | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();

      // Read current user
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUserProfile(JSON.parse(storedUser));
        } catch {
          // Ignore parse error
        }
      }

      const res = await fetch('/api/technician/cases', { headers });
      if (!res.ok) {
        throw new Error('خطا در دریافت پرونده‌های تعمیراتی تکنسین.');
      }
      const data = await res.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load technician cases:', err);
      setError(err?.message || 'خطا در بارگذاری اطلاعات.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Operational Actions
  const handleAccept = async (caseId: string) => {
    try {
      setActionLoadingId(caseId);
      const headers = getAuthHeaders();
      const res = await fetch(`/api/maintenance/${caseId}/accept`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        await fetchCases();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStart = async (caseId: string) => {
    try {
      setActionLoadingId(caseId);
      const headers = getAuthHeaders();
      const res = await fetch(`/api/maintenance/${caseId}/start`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        await fetchCases();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForAction) return;
    try {
      setActionLoadingId(selectedCaseForAction.id);
      const headers = getAuthHeaders();
      const res = await fetch(`/api/maintenance/${selectedCaseForAction.id}/actions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          actionType,
          description: actionDesc,
          partsReplaced: actionParts ? actionParts.split(',').map(p => p.trim()) : undefined,
          laborHours: actionHours ? parseFloat(actionHours) : undefined,
        }),
      });
      if (res.ok) {
        setSelectedCaseForAction(null);
        setActionDesc('');
        setActionParts('');
        setActionHours('');
        await fetchCases();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForSubmit) return;
    try {
      setActionLoadingId(selectedCaseForSubmit.id);
      const headers = getAuthHeaders();
      const res = await fetch(`/api/maintenance/${selectedCaseForSubmit.id}/submit-verification`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resolutionSummary,
          partsCost: partsCost ? parseFloat(partsCost) : undefined,
          laborCost: laborCost ? parseFloat(laborCost) : undefined,
        }),
      });
      if (res.ok) {
        setSelectedCaseForSubmit(null);
        setResolutionSummary('');
        setPartsCost('');
        setLaborCost('');
        await fetchCases();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Factual filterings
  const newRequests = cases.filter(c => ['REPORTED', 'ASSIGNED'].includes(c.status));
  const inProgressCases = cases.filter(c => ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_PARTS'].includes(c.status));
  const completedCases = cases.filter(c => ['COMPLETED', 'SUBMITTED_FOR_VERIFICATION', 'VERIFIED', 'CLOSED'].includes(c.status));

  // Compute recorded earnings ONLY from actual cases where laborCost is recorded
  const recordedEarnings = cases
    .filter(c => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(c.status))
    .reduce((sum, c) => sum + (typeof c.laborCost === 'number' ? c.laborCost : 0), 0);
  const hasRecordedEarnings = recordedEarnings > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-Vazirmatn pb-24 text-right" dir="rtl">
      {/* Header */}
      <header className="bg-emerald-600 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xs">
              <UserCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base">میز کار تکنسین‌ها و خدمات فنی O&M</h1>
              <p className="text-[10px] sm:text-xs text-emerald-100 font-medium">
                {userProfile.name ? `کاربر: ${userProfile.name}` : 'پنل مدیریت دستورکارهای تعمیراتی'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCases}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="به‌روزرسانی"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/" className="text-white/80 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors mr-2">
              خروج
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Real Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">دستمزد ثبت‌شده</div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {hasRecordedEarnings ? formatCurrencyIRR(recordedEarnings) : 'ثبت نشده است'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">درخواست‌های جدید</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(newRequests.length)} <span className="text-xs font-normal text-slate-500">مورد</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">در دست اقدام</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(inProgressCases.length)} <span className="text-xs font-normal text-slate-500">مورد</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">پرونده‌های تکمیل‌شده</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(completedCases.length)} <span className="text-xs font-normal text-slate-500">مورد</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>درخواست‌های جدید ({toPersianDigits(newRequests.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('in_progress')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'in_progress'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>عملیات در حال اجرا ({toPersianDigits(inProgressCases.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>سوابق و کارهای پایان‌یافته ({toPersianDigits(completedCases.length)})</span>
          </button>
        </div>

        {/* Tab 1: New Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {newRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  درخواست جدیدی ثبت نشده است
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  کلیه درخواست‌های ارجاع‌شده بررسی شده‌اند یا درخواست معوقه‌ای وجود ندارد.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newRequests.map((c) => {
                  const prio = getMaintenancePriorityConfig(c.priority);
                  const status = getMaintenanceStatusLabel(c.status);

                  return (
                    <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-mono text-slate-400">{c.maintenanceCode || ''}</span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${prio.className}`}>{prio.label}</span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${status.className}`}>{status.label}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">{c.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>دسته‌بندی: {getMaintenanceCategoryLabel(c.category)}</span>
                        <span>{formatPersianDateTime(c.createdAt || c.reportedAt)}</span>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        {c.status === 'ASSIGNED' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === c.id}
                            onClick={() => handleAccept(c.id)}
                            className="min-h-[44px] flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>قبول و پذیرش دستور کار</span>
                          </button>
                        )}
                        <Link
                          to={`/solar-assets/${c.assetId}?tab=operations`}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                        >
                          مشاهده دارایی
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: In Progress Cases */}
        {activeTab === 'in_progress' && (
          <div className="space-y-4">
            {inProgressCases.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
                <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  هیچ پرونده‌ای در حال حاضر در دست اقدام نیست
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  پس از پذیرش دستور کارها، عملیات اجرایی در این بخش نمایش می‌یابد.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressCases.map((c) => {
                  const prio = getMaintenancePriorityConfig(c.priority);
                  const status = getMaintenanceStatusLabel(c.status);

                  return (
                    <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-mono text-slate-400">{c.maintenanceCode || ''}</span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${prio.className}`}>{prio.label}</span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${status.className}`}>{status.label}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">{c.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{c.description}</p>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {((c.status as any) === 'ACCEPTED' || c.status === 'SCHEDULED' || c.status === 'ASSIGNED') && (
                          <button
                            type="button"
                            disabled={actionLoadingId === c.id}
                            onClick={() => handleStart(c.id)}
                            className="min-h-[44px] flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-4 h-4" />
                            <span>شروع عملیات تعمیراتی</span>
                          </button>
                        )}

                        {c.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedCaseForAction(c)}
                              className="min-h-[44px] flex-1 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" />
                              <span>ثبت اقدام / قطعه</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCaseForSubmit(c)}
                              className="min-h-[44px] flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Send className="w-4 h-4" />
                              <span>ثبت اتمام کار</span>
                            </button>
                          </>
                        )}

                        <Link
                          to={`/solar-assets/${c.assetId}?tab=operations`}
                          className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                        >
                          عملیات دارایی
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {completedCases.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  سابقه پرونده‌های خاتمه‌یافته خالی است
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  پرونده‌هایی که تکمیل و راستی‌آزمایی می‌شوند در این بخش بایگانی می‌گردند.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedCases.map((c) => {
                  const status = getMaintenanceStatusLabel(c.status);
                  const hasCost = typeof c.totalCost === 'number' && !isNaN(c.totalCost);

                  return (
                    <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">{c.maintenanceCode || ''}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${status.className}`}>{status.label}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">{c.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{c.resolutionSummary || 'نتیجه تعمیر ثبت نشده است'}</p>
                      
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                        <span>هزینه نهایی: <strong className="text-slate-700 dark:text-slate-200">{hasCost ? formatCurrencyIRR(c.totalCost) : 'هزینه ثبت نشده است'}</strong></span>
                        <span>{formatPersianDateTime(c.completedAt || c.updatedAt || c.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal: Log Action */}
        {selectedCaseForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ثبت اقدام فنی برای پرونده: {selectedCaseForAction.title}
              </h3>

              <form onSubmit={handleLogActionSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">نوع اقدام:</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="REPAIR">تعمیر قطعه</option>
                    <option value="REPLACE">تعویض قطعه</option>
                    <option value="CLEANING">شستشو و تنظیف</option>
                    <option value="CALIBRATION">کالیبراسیون و تنظیم</option>
                    <option value="INSPECTION">بازرسی فنی</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">شرح جزئیات اقدام:</label>
                  <textarea
                    required
                    rows={2}
                    value={actionDesc}
                    onChange={(e) => setActionDesc(e.target.value)}
                    placeholder="شرح عملیات انجام‌شده..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">ساعت کارکرد:</label>
                    <input
                      type="number"
                      step="0.5"
                      value={actionHours}
                      onChange={(e) => setActionHours(e.target.value)}
                      placeholder="اختیاری"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">قطعات تعویضی:</label>
                    <input
                      type="text"
                      value={actionParts}
                      onChange={(e) => setActionParts(e.target.value)}
                      placeholder="اختیاری"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCaseForAction(null)}
                    className="min-h-[44px] px-4 py-2 text-xs text-slate-500"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950"
                  >
                    ثبت اقدام
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Submit Verification */}
        {selectedCaseForSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ثبت اتمام عملیات و ارسال جهت بررسی کارفرما
              </h3>

              <form onSubmit={handleSubmitVerification} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">خلاصه اقدامات انجام‌شده و نتیجه:</label>
                  <textarea
                    required
                    rows={3}
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    placeholder="شرح چگونگی رفع عیب و نتیجه آزمون..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">دستمزد (تومان):</label>
                    <input
                      type="number"
                      value={laborCost}
                      onChange={(e) => setLaborCost(e.target.value)}
                      placeholder="اختیاری"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">هزینه قطعات (تومان):</label>
                    <input
                      type="number"
                      value={partsCost}
                      onChange={(e) => setPartsCost(e.target.value)}
                      placeholder="اختیاری"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCaseForSubmit(null)}
                    className="min-h-[44px] px-4 py-2 text-xs text-slate-500"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white"
                  >
                    تأیید و ارسال گزارش
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
