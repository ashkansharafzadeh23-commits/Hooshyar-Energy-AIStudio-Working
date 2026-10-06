import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertTriangle,
  Camera,
  Award,
  FileText,
  Trash2,
  ExternalLink,
  Upload,
  Loader2,
  Save,
  X
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
import {
  TechnicianProfile,
  TechnicianCertificate,
  TechnicianWorkSample,
  getTechnicianProfile,
  updateTechnicianProfile,
  createTechnicianCertificate,
  deleteTechnicianCertificate,
  createTechnicianWorkSample,
  deleteTechnicianWorkSample,
  uploadPartnerMedia
} from '../../services/partnerMediaService';

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

  // =========================================================================
  // Technician Profile, Certificates & Work Samples State
  // =========================================================================
  const [proProfile, setProProfile] = useState<TechnicianProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Cert Modal State
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certYear, setCertYear] = useState('');
  const [certDesc, setCertDesc] = useState('');
  const [certFileKey, setCertFileKey] = useState('');
  const [certFileUrl, setCertFileUrl] = useState('');
  const [certMimeType, setCertMimeType] = useState('application/pdf');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [submittingCert, setSubmittingCert] = useState(false);

  // Work Sample Modal State
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [workTitle, setWorkTitle] = useState('');
  const [workDesc, setWorkDesc] = useState('');
  const [workImages, setWorkImages] = useState<string[]>([]);
  const [uploadingWork, setUploadingWork] = useState(false);
  const [submittingWork, setSubmittingWork] = useState(false);

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

  const loadProfileData = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const p = await getTechnicianProfile();
      setProProfile(p);
    } catch (err) {
      console.error('Failed to load technician profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    if (activeTab === 'profile') {
      loadProfileData();
    }
  }, [activeTab, loadProfileData]);

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

  const handleStartWork = async (caseId: string) => {
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
      const payload: any = {
        actionType,
        description: actionDesc,
      };
      if (actionHours) payload.hoursSpent = parseFloat(actionHours);
      if (actionParts) payload.partsReplaced = actionParts.split(',').map((p) => p.trim());

      const res = await fetch(`/api/maintenance/${selectedCaseForAction.id}/actions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
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
      const payload: any = {
        resolutionSummary,
      };
      if (laborCost) payload.laborCost = parseFloat(laborCost);
      if (partsCost) payload.partsCost = parseFloat(partsCost);

      const res = await fetch(`/api/maintenance/${selectedCaseForSubmit.id}/submit-verification`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSelectedCaseForSubmit(null);
        setResolutionSummary('');
        setLaborCost('');
        setPartsCost('');
        await fetchCases();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // =========================================================================
  // Profile Photo, Certificates & Work Samples Handlers
  // =========================================================================
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const res = await uploadPartnerMedia(file, 'TECHNICIAN_PHOTO');
      const updated = await updateTechnicianProfile({
        profileImageKey: res.storageKey,
        profileImageUrl: res.downloadUrl
      });
      setProProfile(updated);
    } catch (err: any) {
      alert(err.message || 'خطا در بارگذاری تصویر پرسنلی.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfileInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proProfile) return;

    try {
      setSavingProfile(true);
      const updated = await updateTechnicianProfile({
        fullName: proProfile.fullName,
        phone: proProfile.phone,
        specialties: proProfile.specialties,
        serviceCities: proProfile.serviceCities,
        yearsExperience: proProfile.yearsExperience,
        bio: proProfile.bio
      });
      setProProfile(updated);
      alert('مشخصات کارشناس با موفقیت ذخیره شد.');
    } catch (err: any) {
      alert(err.message || 'خطا در ذخیره مشخصات.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCertFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCert(true);
      const res = await uploadPartnerMedia(file, 'TECHNICIAN_CERTIFICATE');
      setCertFileKey(res.storageKey);
      setCertFileUrl(res.downloadUrl);
      setCertMimeType(res.mimeType);
    } catch (err: any) {
      alert(err.message || 'خطا در بارگذاری مدرک.');
    } finally {
      setUploadingCert(false);
    }
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTitle) return;

    try {
      setSubmittingCert(true);
      const created = await createTechnicianCertificate({
        title: certTitle,
        issuingOrg: certOrg,
        issueYear: certYear,
        description: certDesc,
        fileKey: certFileKey,
        imageUrl: certFileUrl,
        mimeType: certMimeType
      });

      if (proProfile) {
        setProProfile({
          ...proProfile,
          certifications: [created, ...(proProfile.certifications || [])]
        });
      }
      setIsCertModalOpen(false);
      setCertTitle('');
      setCertOrg('');
      setCertYear('');
      setCertDesc('');
      setCertFileKey('');
      setCertFileUrl('');
    } catch (err: any) {
      alert(err.message || 'خطا در ذخیره مدرک.');
    } finally {
      setSubmittingCert(false);
    }
  };

  const handleDeleteCert = async (certId: string) => {
    if (!confirm('آیا از حذف این مدرک اطمینان دارید؟')) return;

    try {
      await deleteTechnicianCertificate(certId);
      if (proProfile) {
        setProProfile({
          ...proProfile,
          certifications: (proProfile.certifications || []).filter(c => c.id !== certId)
        });
      }
    } catch (err: any) {
      alert(err.message || 'خطا در حذف مدرک.');
    }
  };

  const handleWorkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingWork(true);
      const res = await uploadPartnerMedia(file, 'TECHNICIAN_WORK');
      setWorkImages(prev => [res.downloadUrl, ...prev]);
    } catch (err: any) {
      alert(err.message || 'خطا در بارگذاری تصویر نمونه‌کار.');
    } finally {
      setUploadingWork(false);
    }
  };

  const handleSaveWorkSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle) return;

    try {
      setSubmittingWork(true);
      const created = await createTechnicianWorkSample({
        title: workTitle,
        description: workDesc,
        images: workImages
      });

      if (proProfile) {
        setProProfile({
          ...proProfile,
          workSamples: [created, ...(proProfile.workSamples || [])]
        });
      }
      setIsWorkModalOpen(false);
      setWorkTitle('');
      setWorkDesc('');
      setWorkImages([]);
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت نمونه‌کار.');
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleDeleteWorkSample = async (sampleId: string) => {
    if (!confirm('آیا از حذف این نمونه‌کار اطمینان دارید؟')) return;

    try {
      await deleteTechnicianWorkSample(sampleId);
      if (proProfile) {
        setProProfile({
          ...proProfile,
          workSamples: (proProfile.workSamples || []).filter(w => w.id !== sampleId)
        });
      }
    } catch (err: any) {
      alert(err.message || 'خطا در حذف نمونه‌کار.');
    }
  };

  // Filter cases by tab
  const newRequests = cases.filter((c) => c.status === 'ASSIGNED');
  const inProgressCases = cases.filter((c) =>
    ['ACCEPTED', 'IN_PROGRESS', 'PENDING_PARTS'].includes(c.status)
  );
  const completedCases = cases.filter((c) =>
    ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(c.status)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans" dir="rtl">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              to="/smart-maintenance" 
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 min-h-[44px] min-w-[44px]"
              aria-label="بازگشت به مرکز نگهداری هوشمند"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">ورک‌اسپیس میدانی</div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                داشبورد کارشناس فنی نگهداری
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchCases}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="تازه‌سازی پرونده‌ها"
              aria-label="تازه‌سازی"
            >
              <RefreshCw size={16} />
            </button>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold">{userProfile.name || 'کارشناس رسمی'}</div>
              <div className="text-[10px] text-slate-400">شناسه: {userProfile.id?.slice(0, 8) || 'تکنسین'}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>درخواست‌های جدید</span>
              <AlertTriangle size={16} className="text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(newRequests.length)} <span className="text-xs font-normal text-slate-500">مورد</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>عملیات در دست اقدام</span>
              <Wrench size={16} className="text-blue-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(inProgressCases.length)} <span className="text-xs font-normal text-slate-500">مورد</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>موفقیت‌آمیز و پایان‌یافته</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(completedCases.length)} <span className="text-xs font-normal text-slate-500">مورد</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>وضعیت نمایه</span>
              <Award size={16} className="text-[#0284C7]" />
            </div>
            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
              احراز صلاحیت فعال
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>سوابق و کارهای پایان‌یافته ({toPersianDigits(completedCases.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UserCircle size={16} />
            <span>پروفایل و مدارک فنی</span>
          </button>
        </div>

        {/* Tab 1: New Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {newRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  درخواست ارجاع‌شده جدیدی وجود ندارد
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  به محض تخصیص پرونده تعمیراتی از سوی مرکز نگهداری، در این بخش قابل مشاهده خواهد بود.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newRequests.map((c) => {
                  const prio = getMaintenancePriorityConfig(c.priority);
                  const cat = getMaintenanceCategoryLabel(c.category);
                  const isBusy = actionLoadingId === c.id;

                  return (
                    <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">{c.maintenanceCode || ''}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${prio.className}`}>{prio.label}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">{c.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{c.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>دسته‌بندی: <strong>{cat}</strong></span>
                        <span>{formatPersianDateTime(c.createdAt)}</span>
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAccept(c.id)}
                          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Check size={16} />
                          <span>پذیرش پرونده و شروع هماهنگی</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: In Progress */}
        {activeTab === 'in_progress' && (
          <div className="space-y-4">
            {inProgressCases.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
                <Wrench className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  عملیات فعالی در جریان نیست
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  پس از پذیرش درخواست‌های جدید، پرونده‌ها برای ثبت اقدامات به این بخش منتقل می‌شوند.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressCases.map((c) => {
                  const status = getMaintenanceStatusLabel(c.status);
                  const isBusy = actionLoadingId === c.id;

                  return (
                    <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">{c.maintenanceCode || ''}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${status.className}`}>{status.label}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">{c.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{c.description}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {(c.status === 'ASSIGNED' || c.status === 'SCHEDULED') && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStartWork(c.id)}
                            className="flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5"
                          >
                            <Play size={14} />
                            <span>شروع عملیات اجرایی</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setSelectedCaseForAction(c)}
                          className="flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>ثبت اقدام / قطعه</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setSelectedCaseForSubmit(c)}
                          className="flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                        >
                          <Send size={14} />
                          <span>اعلام اتمام کار</span>
                        </button>
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

        {/* Tab 4: Professional Profile & Media Management */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {loadingProfile ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                <Loader2 className="animate-spin mx-auto mb-2 text-[#0284C7]" size={28} />
                در حال بارگذاری مشخصات کارشناس...
              </div>
            ) : (
              <>
                {/* Profile Information & Photo Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 group">
                      {uploadingPhoto ? (
                        <Loader2 className="animate-spin text-[#0284C7]" size={28} />
                      ) : proProfile?.profileImageUrl ? (
                        <img src={proProfile.profileImageUrl} alt="عکس پرسنلی" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle size={56} className="text-slate-400" />
                      )}
                      <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold">
                        <Camera size={20} className="mb-1" />
                        <span>تغییر عکس</span>
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp" 
                          className="hidden" 
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                        />
                      </label>
                    </div>

                    <div className="flex-1 text-center sm:text-right">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {proProfile?.fullName || 'کارشناس فنی'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        عکس پرسنلی و اطلاعات حرفه‌ای جهت نمایش در نمایه عمومی کارشناسان و ارجاع پرونده‌ها
                      </p>
                      {proProfile?.id && (
                        <div className="mt-3">
                          <Link
                            to={`/technician/${proProfile.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs text-[#0284C7] hover:underline font-bold"
                          >
                            <span>مشاهده نمایه عمومی کارشناس</span>
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfileInfo} className="space-y-4 pt-6 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                          نام و نام‌خانوادگی کامل <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          value={proProfile?.fullName || ''}
                          onChange={e => setProProfile(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                          شماره همراه فعال <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          dir="ltr"
                          value={proProfile?.phone || ''}
                          onChange={e => setProProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                          شهرهای تحت پوشش (با کاما جدا کنید)
                        </label>
                        <input
                          value={proProfile?.serviceCities?.join('، ') || ''}
                          onChange={e => setProProfile(prev => prev ? { ...prev, serviceCities: e.target.value.split('،').map(s => s.trim()).filter(Boolean) } : null)}
                          placeholder="مثال: تهران، کرج، قزوین"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                          سال‌های سابقه تخصصی
                        </label>
                        <input
                          type="number"
                          dir="ltr"
                          value={proProfile?.yearsExperience ?? 0}
                          onChange={e => setProProfile(prev => prev ? { ...prev, yearsExperience: Number(e.target.value) } : null)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        حوزه‌های تخصصی (با کاما جدا کنید)
                      </label>
                      <input
                        value={proProfile?.specialties?.join('، ') || ''}
                        onChange={e => setProProfile(prev => prev ? { ...prev, specialties: e.target.value.split('،').map(s => s.trim()).filter(Boolean) } : null)}
                        placeholder="مثال: اینورترهای متصل به شبکه، پنل خورشیدی، باتری‌های لیتیومی"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        معرفی و بیوگرافی حرفه‌ای
                      </label>
                      <textarea
                        rows={3}
                        value={proProfile?.bio || ''}
                        onChange={e => setProProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                        placeholder="شرح سوابق اجرایی، مدارک اخذ شده و تخصص‌های اصلی..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                      >
                        {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>ذخیره تغییرات نمایه</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Certificates / Qualifications Section */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Award className="text-amber-500" size={20} />
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        مدارک و گواهینامه‌های رسمی ({proProfile?.certifications?.length || 0})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCertModalOpen(true)}
                      className="inline-flex items-center gap-1 bg-[#0284C7] hover:bg-[#0369A1] text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer min-h-[38px]"
                    >
                      <Plus size={15} />
                      <span>افزودن مدرک جدید</span>
                    </button>
                  </div>

                  {!proProfile?.certifications || proProfile.certifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      هنوز مدرک یا گواهینامه‌ای ثبت نکرده‌اید. با بارگذاری مدارک معتبر، نشان تأیید صلاحیت دریافت نمایید.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {proProfile.certifications.map(cert => (
                        <div 
                          key={cert.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {cert.title}
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleDeleteCert(cert.id)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                                title="حذف مدرک"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {(cert.issuingOrg || cert.issueYear) && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                                {cert.issuingOrg ? `مرجع: ${cert.issuingOrg}` : ''}
                                {cert.issuingOrg && cert.issueYear ? ' • ' : ''}
                                {cert.issueYear ? `سال صدور: ${cert.issueYear}` : ''}
                              </div>
                            )}
                            {cert.description && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                {cert.description}
                              </p>
                            )}
                          </div>

                          {cert.imageUrl && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                              <a
                                href={cert.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#0284C7] font-bold hover:underline"
                              >
                                <FileText size={13} />
                                مشاهده فایل مدرک
                                <ExternalLink size={11} />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work Samples Section */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Wrench className="text-emerald-500" size={20} />
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        نمونه‌کارهای فنی و سوابق اجرایی ({proProfile?.workSamples?.length || 0})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWorkModalOpen(true)}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer min-h-[38px]"
                    >
                      <Plus size={15} />
                      <span>افزودن نمونه‌کار</span>
                    </button>
                  </div>

                  {!proProfile?.workSamples || proProfile.workSamples.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      هنوز نمونه‌کاری در نمایه خود ثبت نکرده‌اید. با افزودن پروژه‌ها و عکس‌های اجرایی، اعتماد مشتریان را جلب کنید.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proProfile.workSamples.map(sample => (
                        <div
                          key={sample.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {sample.title}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleDeleteWorkSample(sample.id)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="حذف نمونه‌کار"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {sample.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {sample.description}
                            </p>
                          )}

                          {Array.isArray(sample.images) && sample.images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                              {sample.images.map((img, i) => (
                                <div key={i} className="h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                  <img src={img} alt={`${sample.title} - ${i + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal: Add Certificate */}
        {isCertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  ثبت مدرک / گواهینامه تخصصی
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCertModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCert} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    عنوان مدرک یا گواهی <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={certTitle}
                    onChange={e => setCertTitle(e.target.value)}
                    placeholder="مثال: گواهینامه بین‌المللی نصب سیستم‌های خورشیدی PV"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">مرجع صدور</label>
                    <input
                      value={certOrg}
                      onChange={e => setCertOrg(e.target.value)}
                      placeholder="مثال: سازمان فنی و حرفه‌ای"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">سال اخذ</label>
                    <input
                      value={certYear}
                      onChange={e => setCertYear(e.target.value)}
                      placeholder="مثال: ۱۴۰۲"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">توضیحات</label>
                  <textarea
                    rows={2}
                    value={certDesc}
                    onChange={e => setCertDesc(e.target.value)}
                    placeholder="شرح دوره و صلاحیت‌های اعطا شده..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    فایل مدرک (PDF یا تصویر معتبر)
                  </label>
                  <label className="p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:border-[#0284C7] transition-colors text-slate-500 min-h-[48px]">
                    {uploadingCert ? (
                      <Loader2 size={16} className="animate-spin text-[#0284C7]" />
                    ) : certFileUrl ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check size={14} /> فایل مدرک بارگذاری شد
                      </span>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>انتخاب فایل مدرک (حداکثر ۱۵ مگابایت)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleCertFileUpload}
                      disabled={uploadingCert}
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCertModalOpen(false)}
                    className="px-4 py-2 text-slate-500 text-xs min-h-[44px]"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCert || uploadingCert}
                    className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingCert && <Loader2 size={14} className="animate-spin" />}
                    <span>ثبت مدرک</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Work Sample */}
        {isWorkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  ثبت نمونه‌کار فنی
                </h3>
                <button
                  type="button"
                  onClick={() => setIsWorkModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveWorkSample} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    عنوان نمونه‌کار <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={workTitle}
                    onChange={e => setWorkTitle(e.target.value)}
                    placeholder="مثال: نصب و راه‌اندازی اینورتر ۱۰ کیلووات نیروگاه ویلایی"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    شرح اقدامات انجام‌شده
                  </label>
                  <textarea
                    rows={3}
                    value={workDesc}
                    onChange={e => setWorkDesc(e.target.value)}
                    placeholder="شرح مراحل اجرای پروژه، تجهیزات نصب‌شده و نتایج آزمون..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    تصاویر پروژه
                  </label>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {workImages.map((img, i) => (
                      <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                        <img src={img} alt="نمونه" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <label className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-600 transition-colors cursor-pointer shrink-0">
                      {uploadingWork ? (
                        <Loader2 size={16} className="animate-spin text-emerald-600" />
                      ) : (
                        <Upload size={16} />
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleWorkImageUpload}
                        disabled={uploadingWork}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsWorkModalOpen(false)}
                    className="px-4 py-2 text-slate-500 text-xs min-h-[44px]"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={submittingWork || uploadingWork}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingWork && <Loader2 size={14} className="animate-spin" />}
                    <span>ثبت نمونه‌کار</span>
                  </button>
                </div>
              </form>
            </div>
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
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[44px]"
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
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">قطعات تعویضی:</label>
                    <input
                      type="text"
                      value={actionParts}
                      onChange={(e) => setActionParts(e.target.value)}
                      placeholder="اختیاری"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCaseForAction(null)}
                    className="min-h-[44px] px-4 py-2 text-xs text-slate-500 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 cursor-pointer"
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
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">هزینه قطعات (تومان):</label>
                    <input
                      type="number"
                      value={partsCost}
                      onChange={(e) => setPartsCost(e.target.value)}
                      placeholder="اختیاری"
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCaseForSubmit(null)}
                    className="min-h-[44px] px-4 py-2 text-xs text-slate-500 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white cursor-pointer"
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
