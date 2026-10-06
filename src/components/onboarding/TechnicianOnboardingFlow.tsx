import React, { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Upload,
  Trash2,
  Plus,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Camera,
  Award,
  FileText,
  Briefcase,
  Image as ImageIcon,
  Sparkles,
  Info,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import {
  uploadPartnerMedia,
  getTechnicianProfile,
  updateTechnicianProfile,
  createTechnicianCertificate,
  deleteTechnicianCertificate,
  createTechnicianWorkSample,
  deleteTechnicianWorkSample,
  formatPartnerMediaError,
  TechnicianCertificate,
  TechnicianWorkSample
} from '../../services/partnerMediaService';

interface TechnicianOnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
  initialName?: string;
}

export default function TechnicianOnboardingFlow({
  onComplete,
  onSkip,
  initialName
}: TechnicianOnboardingFlowProps) {
  // Loading & state
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [certSaving, setCertSaving] = useState(false);
  const [certFileUploading, setCertFileUploading] = useState(false);
  const [sampleSaving, setSampleSaving] = useState(false);
  const [sampleImagesUploading, setSampleImagesUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Profile photo
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [profileImageKey, setProfileImageKey] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // 2. Certificates
  const [certificates, setCertificates] = useState<TechnicianCertificate[]>([]);
  const [showAddCert, setShowAddCert] = useState(false);
  const [certForm, setCertForm] = useState({
    title: '',
    issuingOrg: '',
    issueYear: '1401',
    description: '',
    fileKey: '',
    imageUrl: '',
    mimeType: ''
  });
  const certFileInputRef = useRef<HTMLInputElement | null>(null);

  // 3. Work samples
  const [workSamples, setWorkSamples] = useState<TechnicianWorkSample[]>([]);
  const [showAddSample, setShowAddSample] = useState(false);
  const [sampleForm, setSampleForm] = useState({
    title: '',
    description: '',
    images: [] as string[]
  });
  const sampleImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadInitial() {
      try {
        const prof = await getTechnicianProfile();
        if (prof) {
          if (prof.profileImageUrl) setProfileImageUrl(prof.profileImageUrl);
          if (prof.profileImageKey) setProfileImageKey(prof.profileImageKey);
          if (Array.isArray(prof.certifications)) setCertificates(prof.certifications);
          if (Array.isArray(prof.workSamples)) setWorkSamples(prof.workSamples);
        }
      } catch (err: any) {
        console.warn('Initial technician onboarding load:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadInitial();
  }, []);

  const showFeedback = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // 1. Photo handlers
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlobalError(null);
    setPhotoUploading(true);

    try {
      const res = await uploadPartnerMedia(file, 'TECHNICIAN_PHOTO');
      setProfileImageUrl(res.downloadUrl);
      setProfileImageKey(res.storageKey);

      await updateTechnicianProfile({
        profileImageKey: res.storageKey,
        profileImageUrl: res.downloadUrl
      });
      showFeedback('عکس نمایه کارشناس با موفقیت ذخیره گردید.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در بارگذاری عکس نمایه.'));
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoUploading(true);
    setGlobalError(null);
    try {
      await updateTechnicianProfile({
        profileImageKey: '',
        profileImageUrl: ''
      });
      setProfileImageUrl('');
      setProfileImageKey('');
      showFeedback('عکس نمایه حذف شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در حذف عکس نمایه.'));
    } finally {
      setPhotoUploading(false);
    }
  };

  // 2. Certificate handlers
  const handleCertFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertFileUploading(true);
    setGlobalError(null);

    try {
      const res = await uploadPartnerMedia(file, 'TECHNICIAN_CERTIFICATE');
      setCertForm(prev => ({
        ...prev,
        fileKey: res.storageKey,
        imageUrl: res.downloadUrl,
        mimeType: res.mimeType
      }));
      showFeedback('فایل مدرک با موفقیت در فضای امن ذخیره شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در بارگذاری فایل مدرک.'));
    } finally {
      setCertFileUploading(false);
      if (certFileInputRef.current) certFileInputRef.current.value = '';
    }
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.title.trim()) {
      setGlobalError('عنوان مدرک یا گواهینامه الزامی است.');
      return;
    }

    setCertSaving(true);
    setGlobalError(null);

    try {
      // Truthfulness rule: verified is false by default
      const saved = await createTechnicianCertificate({
        title: certForm.title.trim(),
        issuingOrg: certForm.issuingOrg.trim() || undefined,
        issueYear: certForm.issueYear ? String(certForm.issueYear) : undefined,
        description: certForm.description.trim() || undefined,
        fileKey: certForm.fileKey || undefined,
        imageUrl: certForm.imageUrl || undefined,
        mimeType: certForm.mimeType || undefined,
        verified: false
      });

      setCertificates(prev => [saved, ...prev]);
      setShowAddCert(false);
      setCertForm({
        title: '',
        issuingOrg: '',
        issueYear: '1401',
        description: '',
        fileKey: '',
        imageUrl: '',
        mimeType: ''
      });
      showFeedback('مدرک با وضعیت «ثبت‌شده توسط متخصص» ذخیره شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در ثبت مدرک.'));
    } finally {
      setCertSaving(false);
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await deleteTechnicianCertificate(id);
      setCertificates(prev => prev.filter(c => c.id !== id));
      showFeedback('مدرک حذف شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در حذف مدرک.'));
    }
  };

  // 3. Work Sample handlers
  const handleSampleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setSampleImagesUploading(true);
    setGlobalError(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadPartnerMedia(file, 'TECHNICIAN_WORK');
        newUrls.push(res.downloadUrl || res.storageKey);
      }
      setSampleForm(prev => ({
        ...prev,
        images: [...prev.images, ...newUrls]
      }));
      showFeedback(`${files.length} تصویر با موفقیت بارگذاری شد.`);
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در بارگذاری تصاویر نمونه‌کار.'));
    } finally {
      setSampleImagesUploading(false);
      if (sampleImageInputRef.current) sampleImageInputRef.current.value = '';
    }
  };

  const handleRemoveSampleImage = (index: number) => {
    setSampleForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleForm.title.trim()) {
      setGlobalError('عنوان نمونه‌کار الزامی است.');
      return;
    }

    setSampleSaving(true);
    setGlobalError(null);

    try {
      const saved = await createTechnicianWorkSample({
        title: sampleForm.title.trim(),
        description: sampleForm.description.trim() || undefined,
        images: sampleForm.images
      });

      setWorkSamples(prev => [saved, ...prev]);
      setShowAddSample(false);
      setSampleForm({
        title: '',
        description: '',
        images: []
      });
      showFeedback('نمونه‌کار با موفقیت ثبت شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در ثبت نمونه‌کار.'));
    } finally {
      setSampleSaving(false);
    }
  };

  const handleDeleteSample = async (id: string) => {
    try {
      await deleteTechnicianWorkSample(id);
      setWorkSamples(prev => prev.filter(s => s.id !== id));
      showFeedback('نمونه‌کار حذف شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در حذف نمونه‌کار.'));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        
        {/* Progress Badge */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/80 text-[#0284C7] dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              مرحله ۲ از ۲
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {initialName ? `کارشناس ${initialName}` : 'پروفایل حرفه‌ای متخصص'}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            بعداً تکمیل می‌کنم ←
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
          <div className="bg-[#0284C7] h-full rounded-full w-full transition-all duration-500" />
        </div>

        <div className="text-center sm:text-right">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            تکمیل پروفایل حرفه‌ای
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            حساب کاربری شما ایجاد شد. برای ارجاع مأموریت‌های تعمیراتی و نمایش در لیست متخصصان مورد تأیید، می‌توانید تصویر چهره، مدارک مهارتی و نمونه‌کارهای پیشین را بارگذاری کنید.
          </p>
        </div>

        {/* Alerts */}
        {globalError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{globalError}</span>
          </div>
        )}

        {successToast && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs font-bold animate-fade-in">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successToast}</span>
          </div>
        )}
      </div>

      {loadingInitial ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
          <Loader2 size={32} className="animate-spin mx-auto text-[#0284C7] mb-3" />
          <p className="text-xs">در حال دریافت اطلاعات کارشناس...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* 1. PROFILE PHOTO */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="text-[#0284C7]" size={20} />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    عکس پروفایل
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    اختیاری
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  یک تصویر حرفه‌ای برای معرفی بهتر به مشتریان بارگذاری کنید.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                {profileImageUrl ? (
                  <>
                    <button
                      type="button"
                      disabled={photoUploading}
                      onClick={() => photoInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] flex items-center gap-1.5"
                    >
                      <Upload size={14} />
                      <span>تغییر تصویر</span>
                    </button>
                    <button
                      type="button"
                      disabled={photoUploading}
                      onClick={handleRemovePhoto}
                      className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      <span>حذف</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={photoUploading}
                    onClick={() => photoInputRef.current?.click()}
                    className="px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[42px] flex items-center gap-2"
                  >
                    {photoUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    <span>انتخاب تصویر</span>
                  </button>
                )}
              </div>
            </div>

            {/* Photo Preview */}
            <div className="pt-5 flex items-center gap-5">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center overflow-hidden shrink-0">
                {photoUploading ? (
                  <Loader2 size={24} className="animate-spin text-[#0284C7]" />
                ) : profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="عکس پروفایل"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Wrench size={32} className="text-slate-400" />
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {profileImageUrl ? (
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    تصویر نمایه ذخیره شد و در صفحه عمومی کارشناس نمایش داده می‌شود.
                  </p>
                ) : (
                  <p>
                    توصیه می‌شود تصویر پرسنلی یا کاری واضح با پس‌زمینه مناسب انتخاب نمایید.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. CERTIFICATES */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="text-amber-500" size={20} />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    مدارک و گواهی‌ها
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {certificates.length} مدرک
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  گواهینامه‌های دوره‌های آموزشی، فنی و حرفه‌ای، برق قدرت یا ایمنی کار در ارتفاع را ثبت کنید.
                </p>
              </div>

              {!showAddCert && (
                <button
                  type="button"
                  onClick={() => setShowAddCert(true)}
                  className="px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[42px] flex items-center gap-2 shrink-0"
                >
                  <Plus size={16} />
                  <span>افزودن مدرک یا گواهی</span>
                </button>
              )}
            </div>

            {/* Add Certificate Form Drawer */}
            {showAddCert && (
              <form onSubmit={handleSaveCert} className="pt-6 pb-4 space-y-4 border-b border-slate-100 dark:border-slate-800 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[#0284C7]" />
                    مشخصات مدرک یا گواهینامه جدید
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddCert(false)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    انصراف
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      عنوان مدرک <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: گواهی نصب و راه‌اندازی نیروگاه خورشیدی"
                      value={certForm.title}
                      onChange={e => setCertForm({ ...certForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مرجع صادرکننده — اختیاری
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: سازمان آموزش فنی و حرفه‌ای"
                      value={certForm.issuingOrg}
                      onChange={e => setCertForm({ ...certForm, issuingOrg: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      سال دریافت — اختیاری
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="مثال: 1401"
                      value={certForm.issueYear}
                      onChange={e => setCertForm({ ...certForm, issueYear: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    توضیح — اختیاری
                  </label>
                  <textarea
                    rows={2}
                    placeholder="شرح مهارت‌های فراگرفته شده در این دوره یا شماره سریال مدرک..."
                    value={certForm.description}
                    onChange={e => setCertForm({ ...certForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white resize-none"
                  />
                </div>

                {/* File Upload (Image or PDF) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      فایل تصویر یا PDF مدرک
                    </label>
                    <button
                      type="button"
                      disabled={certFileUploading}
                      onClick={() => certFileInputRef.current?.click()}
                      className="text-xs text-[#0284C7] dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {certFileUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{certForm.imageUrl ? 'تغییر فایل مدرک' : 'انتخاب فایل مدرک'}</span>
                    </button>
                    <input
                      type="file"
                      ref={certFileInputRef}
                      onChange={handleCertFileUpload}
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="hidden"
                    />
                  </div>

                  {certForm.imageUrl ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <FileText size={16} />
                        <span>فایل مدرک با موفقیت بارگذاری شد</span>
                      </div>
                      <a
                        href={certForm.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#0284C7] font-bold hover:underline flex items-center gap-1"
                      >
                        <span>مشاهده فایل</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ) : (
                    <div
                      onClick={() => certFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <FileText className="mx-auto text-slate-400 mb-1.5" size={24} />
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                        کلیک کنید تا اسکن یا تصویر مدرک بارگذاری شود
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        فرمت‌های مجاز: PDF, JPG, PNG (حداکثر ۵ مگابایت)
                      </p>
                    </div>
                  )}
                </div>

                {/* TRUTHFULNESS NOTICE */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                  <ShieldAlert size={16} className="shrink-0 text-amber-600" />
                  <span>
                    توجه: مدارک بارگذاری‌شده با وضعیت «ثبت‌شده توسط متخصص» ثبت می‌شوند و پس از احراز اصالت توسط کارشناسان پشتیبانی هوشیار، نشان اصالت دریافت می‌نمایند.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddCert(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={certSaving}
                    className="px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {certSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    <span>ثبت مدرک</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of Certificates */}
            <div className="pt-4">
              {certificates.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  هنوز مدرکی اضافه نکرده‌اید. افزودن گواهی‌های معتبر به افزایش درخواست‌های دریافتی کمک شایانی می‌کند.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {certificates.map(cert => (
                    <div
                      key={cert.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
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

                        {/* Truthful badge */}
                        <div className="mb-2">
                          {cert.verified ? (
                            <span className="text-emerald-700 dark:text-emerald-300 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                              احراز اصالت شده
                            </span>
                          ) : (
                            <span className="text-amber-800 dark:text-amber-300 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                              ثبت‌شده توسط متخصص
                            </span>
                          )}
                        </div>

                        {(cert.issuingOrg || cert.issueYear) && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {cert.issuingOrg && <span>مرجع: {cert.issuingOrg}</span>}
                            {cert.issuingOrg && cert.issueYear && <span> • </span>}
                            {cert.issueYear && <span>سال: {cert.issueYear}</span>}
                          </div>
                        )}

                        {cert.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                            {cert.description}
                          </p>
                        )}
                      </div>

                      {cert.imageUrl && (
                        <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/80">
                          <a
                            href={cert.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#0284C7] font-bold hover:underline"
                          >
                            <FileText size={13} />
                            مشاهده فایل
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. WORK SAMPLES */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Briefcase className="text-[#0284C7]" size={20} />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    نمونه‌کارها
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {workSamples.length} نمونه‌کار
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  تصاویر و گزارش‌های پروژه‌ها و خدمات نصب یا تعمیرات قبلی خود را ثبت کنید.
                </p>
              </div>

              {!showAddSample && (
                <button
                  type="button"
                  onClick={() => setShowAddSample(true)}
                  className="px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[42px] flex items-center gap-2 shrink-0"
                >
                  <Plus size={16} />
                  <span>افزودن نمونه‌کار</span>
                </button>
              )}
            </div>

            {/* Add Sample Drawer */}
            {showAddSample && (
              <form onSubmit={handleSaveSample} className="pt-6 pb-4 space-y-4 border-b border-slate-100 dark:border-slate-800 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[#0284C7]" />
                    ثبت نمونه‌کار یا پروژه میدانی جدید
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddSample(false)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    انصراف
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان نمونه‌کار <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: نصب و راه‌اندازی اینورتر ۲۰ کیلووات در کارخانه صنعتی"
                    value={sampleForm.title}
                    onChange={e => setSampleForm({ ...sampleForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    توضیح کوتاه
                  </label>
                  <textarea
                    rows={2}
                    placeholder="شرح عملیات انجام شده، قطعات تعویض شده، عیب‌یابی و نتیجه عملکرد..."
                    value={sampleForm.description}
                    onChange={e => setSampleForm({ ...sampleForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white resize-none"
                  />
                </div>

                {/* Multiple Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      تصاویر نمونه‌کار
                    </label>
                    <button
                      type="button"
                      disabled={sampleImagesUploading}
                      onClick={() => sampleImageInputRef.current?.click()}
                      className="text-xs text-[#0284C7] dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {sampleImagesUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>افزودن تصویر</span>
                    </button>
                    <input
                      type="file"
                      ref={sampleImageInputRef}
                      onChange={handleSampleImageUpload}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {sampleForm.images.length === 0 ? (
                    <div
                      onClick={() => sampleImageInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <ImageIcon className="mx-auto text-slate-400 mb-1.5" size={24} />
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                        تصاویر قبل و بعد از تعمیر یا اجرای پروژه را بارگذاری کنید
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        امکان انتخاب چندین تصویر همزمان
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {sampleForm.images.map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden h-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <img src={imgUrl} alt={`تصویر نمونه‌کار ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveSampleImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddSample(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={sampleSaving}
                    className="px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {sampleSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    <span>ثبت نمونه‌کار</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of Samples */}
            <div className="pt-4">
              {workSamples.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  هنوز نمونه‌کاری اضافه نشده است. با ثبت نمونه‌کار، تخصص و مهارت‌های شما به مشتریان نشان داده می‌شود.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {workSamples.map(sample => (
                    <div
                      key={sample.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-between"
                    >
                      <div>
                        {Array.isArray(sample.images) && sample.images.length > 0 && (
                          <div className="w-full h-32 rounded-xl overflow-hidden mb-3 bg-slate-200 dark:bg-slate-700">
                            <img src={sample.images[0]} alt={sample.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {sample.title}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleDeleteSample(sample.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="حذف نمونه‌کار"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {sample.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                            {sample.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FINAL ACTIONS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info size={16} className="text-[#0284C7] shrink-0" />
              <span>
                در آینده می‌توانید از بخش ویرایش نمایه در پنل متخصص، مدارک و نمونه‌کارهای بیشتری ثبت کنید.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onSkip}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold transition-all min-h-[44px]"
              >
                بعداً تکمیل می‌کنم
              </button>

              <button
                type="button"
                onClick={onComplete}
                className="w-full sm:w-auto px-6 py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>تکمیل پروفایل و ورود به پنل</span>
                <ArrowLeft size={16} />
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
