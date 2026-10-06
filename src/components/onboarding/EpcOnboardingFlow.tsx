import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Upload,
  Trash2,
  Plus,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Camera,
  Package,
  Image as ImageIcon,
  Sparkles,
  Info
} from 'lucide-react';
import {
  uploadPartnerMedia,
  getContractorProfile,
  updateContractorProfile,
  createContractorPortfolioProject,
  deleteContractorPortfolioProject,
  createContractorProduct,
  deleteContractorProduct,
  formatPartnerMediaError,
  EpcPortfolioProject
} from '../../services/partnerMediaService';

interface EpcOnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
  initialCompanyName?: string;
}

export default function EpcOnboardingFlow({
  onComplete,
  onSkip,
  initialCompanyName
}: EpcOnboardingFlowProps) {
  // Loading & Error states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoKey, setLogoKey] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Portfolio state
  const [portfolioProjects, setPortfolioProjects] = useState<EpcPortfolioProject[]>([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectImagesUploading, setProjectImagesUploading] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    projectType: 'نیروگاه خورشیدی متصل به شبکه',
    province: 'تهران',
    city: '',
    installedCapacityKw: '',
    completionYear: '1402',
    description: '',
    images: [] as string[]
  });
  const projectImageInputRef = useRef<HTMLInputElement | null>(null);

  // Equipment / Optional Products state
  const [products, setProducts] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productImagesUploading, setProductImagesUploading] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'پنل خورشیدی',
    brand: '',
    model: '',
    description: '',
    specs: '',
    price: '',
    images: [] as string[]
  });
  const productImageInputRef = useRef<HTMLInputElement | null>(null);

  // Load existing profile if any
  useEffect(() => {
    async function loadProfile() {
      try {
        const prof = await getContractorProfile();
        if (prof) {
          if (prof.logoUrl) setLogoUrl(prof.logoUrl);
          if (prof.logoKey) setLogoKey(prof.logoKey);
          if (Array.isArray(prof.projectPortfolio)) setPortfolioProjects(prof.projectPortfolio);
          if (Array.isArray(prof.products)) setProducts(prof.products);
        }
      } catch (err: any) {
        console.warn('Initial profile load in EPC onboarding:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadProfile();
  }, []);

  const showFeedback = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // 1. Logo handlers
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlobalError(null);
    setLogoUploading(true);

    try {
      const uploadRes = await uploadPartnerMedia(file, 'EPC_LOGO');
      setLogoUrl(uploadRes.downloadUrl);
      setLogoKey(uploadRes.storageKey);

      await updateContractorProfile({
        logoKey: uploadRes.storageKey,
        logoUrl: uploadRes.downloadUrl
      });
      showFeedback('لوگوی شرکت با موفقیت بارگذاری و ذخیره شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در بارگذاری لوگوی شرکت.'));
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUploading(true);
    setGlobalError(null);
    try {
      await updateContractorProfile({
        logoKey: '',
        logoUrl: ''
      });
      setLogoUrl('');
      setLogoKey('');
      showFeedback('لوگو حذف شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در حذف لوگو.'));
    } finally {
      setLogoUploading(false);
    }
  };

  // 2. Portfolio handlers
  const handleProjectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProjectImagesUploading(true);
    setGlobalError(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadPartnerMedia(file, 'EPC_PORTFOLIO');
        newUrls.push(res.downloadUrl || res.storageKey);
      }
      setProjectForm(prev => ({
        ...prev,
        images: [...prev.images, ...newUrls]
      }));
      showFeedback(`${files.length} تصویر با موفقیت بارگذاری شد.`);
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در بارگذاری تصاویر پروژه.'));
    } finally {
      setProjectImagesUploading(false);
      if (projectImageInputRef.current) projectImageInputRef.current.value = '';
    }
  };

  const handleRemoveProjectImage = (index: number) => {
    setProjectForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title.trim()) {
      setGlobalError('لطفاً عنوان نمونه پروژه را وارد نمایید.');
      return;
    }

    setProjectSaving(true);
    setGlobalError(null);

    try {
      const saved = await createContractorPortfolioProject({
        title: projectForm.title.trim(),
        projectType: projectForm.projectType,
        province: projectForm.province,
        city: projectForm.city.trim(),
        installedCapacityKw: projectForm.installedCapacityKw ? Number(projectForm.installedCapacityKw) : null,
        completionYear: projectForm.completionYear ? String(projectForm.completionYear) : null,
        description: projectForm.description.trim(),
        images: projectForm.images
      });

      setPortfolioProjects(prev => [saved, ...prev]);
      setShowAddProject(false);
      setProjectForm({
        title: '',
        projectType: 'نیروگاه خورشیدی متصل به شبکه',
        province: 'تهران',
        city: '',
        installedCapacityKw: '',
        completionYear: '1402',
        description: '',
        images: []
      });
      showFeedback('نمونه پروژه با موفقیت ثبت شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در ذخیره نمونه پروژه.'));
    } finally {
      setProjectSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteContractorPortfolioProject(id);
      setPortfolioProjects(prev => prev.filter(p => p.id !== id));
      showFeedback('نمونه پروژه حذف شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در حذف پروژه.'));
    }
  };

  // 3. Optional Products handlers
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProductImagesUploading(true);
    setGlobalError(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadPartnerMedia(file, 'EPC_PRODUCT');
        newUrls.push(res.downloadUrl || res.storageKey);
      }
      setProductForm(prev => ({
        ...prev,
        images: [...prev.images, ...newUrls]
      }));
      showFeedback('تصویر تجهیز با موفقیت بارگذاری گردید.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در بارگذاری تصویر تجهیز.'));
    } finally {
      setProductImagesUploading(false);
      if (productImageInputRef.current) productImageInputRef.current.value = '';
    }
  };

  const handleRemoveProductImage = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      setGlobalError('نام محصول یا تجهیز را وارد کنید.');
      return;
    }

    setProductSaving(true);
    setGlobalError(null);

    try {
      const saved = await createContractorProduct({
        name: productForm.name.trim(),
        category: productForm.category,
        brand: productForm.brand.trim() || undefined,
        model: productForm.model.trim() || undefined,
        description: productForm.description.trim() || undefined,
        specs: productForm.specs.trim() || undefined,
        price: productForm.price ? Number(productForm.price) : undefined,
        images: productForm.images
      });

      setProducts(prev => [saved, ...prev]);
      setShowAddProduct(false);
      setProductForm({
        name: '',
        category: 'پنل خورشیدی',
        brand: '',
        model: '',
        description: '',
        specs: '',
        price: '',
        images: []
      });
      showFeedback('تجهیز با موفقیت به کاتالوگ اضافه شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در افزودن محصول.'));
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteContractorProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showFeedback('تجهیز حذف شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در حذف تجهیز.'));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6" dir="rtl">
      {/* Onboarding Header & Step Tracker */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        
        {/* Progress Badge */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/80 text-[#0284C7] dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              مرحله ۲ از ۲
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {initialCompanyName ? `شرکت ${initialCompanyName}` : 'پروفایل حرفه‌ای شرکت EPC'}
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
            تکمیل پروفایل شرکت
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            حساب کاربری شما ایجاد شد. برای حضور قدرتمند در لیست مجریان و مناقصات هوشیار انرژی، می‌توانید لوگو، پروژه‌های پیشین و تجهیزات قابل ارائه را معرفی کنید.
          </p>
        </div>

        {/* Global Notifications */}
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
          <p className="text-xs">در حال بارگذاری اطلاعات اولیه شرکت...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SECTION 1: COMPANY LOGO */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="text-[#0284C7]" size={20} />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    لوگوی شرکت
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    اختیاری
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  لوگوی رسمی شرکت خود را بارگذاری کنید.
                </p>
              </div>

              {/* Logo Action Buttons */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoSelect}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                
                {logoUrl ? (
                  <>
                    <button
                      type="button"
                      disabled={logoUploading}
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] flex items-center gap-1.5"
                    >
                      <Upload size={14} />
                      <span>تغییر تصویر</span>
                    </button>
                    <button
                      type="button"
                      disabled={logoUploading}
                      onClick={handleRemoveLogo}
                      className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      <span>حذف</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[42px] flex items-center gap-2"
                  >
                    {logoUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    <span>انتخاب تصویر</span>
                  </button>
                )}
              </div>
            </div>

            {/* Logo Preview */}
            <div className="pt-5 flex items-center gap-5">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center overflow-hidden shrink-0">
                {logoUploading ? (
                  <Loader2 size={24} className="animate-spin text-[#0284C7]" />
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="لوگوی شرکت"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <Building2 size={32} className="text-slate-400" />
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {logoUrl ? (
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    لوگوی شرکت با موفقیت در فضای ذخیره‌سازی ابری امن ثبت گردید.
                  </p>
                ) : (
                  <p>
                    فرمت‌های مجاز: PNG, JPG, WEBP (حداکثر ۵ مگابایت).
                    این تصویر در بالای پروفایل عمومی شرکت و کارت‌های جستجوی EPC نمایش داده می‌شود.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: PROJECT PORTFOLIO */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="text-[#0284C7]" size={20} />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    نمونه پروژه‌های اجراشده
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    اختیاری
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  برای معرفی توانمندی‌های شرکت می‌توانید پروژه‌های اجراشده را ثبت کنید.
                </p>
              </div>

              {!showAddProject && (
                <button
                  type="button"
                  onClick={() => setShowAddProject(true)}
                  className="px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[42px] flex items-center gap-2 shrink-0"
                >
                  <Plus size={16} />
                  <span>افزودن نمونه پروژه</span>
                </button>
              )}
            </div>

            {/* Add Project Form Drawer / Accordion */}
            {showAddProject && (
              <form onSubmit={handleSaveProject} className="pt-6 pb-4 space-y-4 border-b border-slate-100 dark:border-slate-800 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[#0284C7]" />
                    مشخصات نمونه پروژه جدید
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddProject(false)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    انصراف
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      عنوان پروژه <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: نیروگاه خورشیدی ۵ مگاوات سمنان"
                      value={projectForm.title}
                      onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نوع پروژه
                    </label>
                    <select
                      value={projectForm.projectType}
                      onChange={e => setProjectForm({ ...projectForm, projectType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    >
                      <option value="نیروگاه خورشیدی متصل به شبکه">نیروگاه خورشیدی متصل به شبکه</option>
                      <option value="نیروگاه مقیاس بزرگ و صنعتی (مگاواتی)">نیروگاه مقیاس بزرگ و صنعتی (مگاواتی)</option>
                      <option value="سقف خورشیدی مسکونی و تجاری">سقف خورشیدی مسکونی و تجاری</option>
                      <option value="پمپ آب خورشیدی کشاورزی">پمپ آب خورشیدی کشاورزی</option>
                      <option value="سیستم خورشیدی مستقل از شبکه (آف‌گرید)">سیستم خورشیدی مستقل از شبکه (آف‌گرید)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      استان
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: سمنان"
                      value={projectForm.province}
                      onChange={e => setProjectForm({ ...projectForm, province: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      شهر
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: دامغان"
                      value={projectForm.city}
                      onChange={e => setProjectForm({ ...projectForm, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ظرفیت نصب‌شده (کیلووات) — اختیاری
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      placeholder="مثال: 500"
                      value={projectForm.installedCapacityKw}
                      onChange={e => setProjectForm({ ...projectForm, installedCapacityKw: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      سال اجرا — اختیاری
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="مثال: 1402"
                      value={projectForm.completionYear}
                      onChange={e => setProjectForm({ ...projectForm, completionYear: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    توضیح کوتاه
                  </label>
                  <textarea
                    rows={2}
                    placeholder="شرح مشخصات فنی، تجهیزات کلیدی استفاده‌شده، دستاوردها و عملکرد پروژه..."
                    value={projectForm.description}
                    onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white resize-none"
                  />
                </div>

                {/* Multiple Project Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      تصاویر پروژه (چندگانه)
                    </label>
                    <button
                      type="button"
                      disabled={projectImagesUploading}
                      onClick={() => projectImageInputRef.current?.click()}
                      className="text-xs text-[#0284C7] dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {projectImagesUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>افزودن تصویر جدید</span>
                    </button>
                    <input
                      type="file"
                      ref={projectImageInputRef}
                      onChange={handleProjectImageUpload}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {projectForm.images.length === 0 ? (
                    <div 
                      onClick={() => projectImageInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <ImageIcon className="mx-auto text-slate-400 mb-2" size={28} />
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                        کلیک کنید تا تصاویر اجرای پروژه بارگذاری شوند
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        فرمت‌های مجاز JPG و PNG (امکان انتخاب همزمان چند فایل)
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {projectForm.images.map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden h-24 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <img src={imgUrl} alt={`تصویر پروژه ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveProjectImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100"
                            title="حذف این تصویر"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddProject(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={projectSaving}
                    className="px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {projectSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    <span>ثبت نمونه پروژه</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of Projects */}
            <div className="pt-4">
              {portfolioProjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  هنوز نمونه پروژه‌ای اضافه نکرده‌اید. با معرفی پروژه‌ها، رتبه و اعتماد مشتریان به شرکت افزایش می‌یابد.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portfolioProjects.map(proj => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-between"
                    >
                      <div>
                        {Array.isArray(proj.images) && proj.images.length > 0 && (
                          <div className="w-full h-32 rounded-xl overflow-hidden mb-3 bg-slate-200 dark:bg-slate-700">
                            <img src={proj.images[0]} alt={proj.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {proj.title}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(proj.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="حذف پروژه"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-2">
                          <span>{proj.projectType}</span>
                          {(proj.city || proj.province) && (
                            <span>• {proj.province} {proj.city}</span>
                          )}
                          {proj.installedCapacityKw && (
                            <span>• {proj.installedCapacityKw} کیلووات</span>
                          )}
                          {proj.completionYear && (
                            <span>• سال {proj.completionYear}</span>
                          )}
                        </div>

                        {proj.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: EPC PRODUCTS / EQUIPMENT (OPTIONAL) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="text-[#0284C7]" size={20} />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    محصولات و تجهیزات قابل ارائه
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900">
                    اختیاری
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  در صورت تمایل، تجهیزات یا محصولاتی را که شرکت شما تأمین یا نصب می‌کند معرفی کنید.
                </p>
              </div>

              {!showAddProduct && (
                <button
                  type="button"
                  onClick={() => setShowAddProduct(true)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[42px] flex items-center gap-2 shrink-0"
                >
                  <Plus size={16} />
                  <span>افزودن محصول یا تجهیز</span>
                </button>
              )}
            </div>

            {/* Add Product Drawer */}
            {showAddProduct && (
              <form onSubmit={handleSaveProduct} className="pt-6 pb-4 space-y-4 border-b border-slate-100 dark:border-slate-800 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Package size={16} className="text-[#0284C7]" />
                    مشخصات تجهیز یا محصول قابل ارائه
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    انصراف
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نام محصول <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: پنل خورشیدی ۵۵۰ وات مونوکریستال Tier-1"
                      value={productForm.name}
                      onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      دسته‌بندی
                    </label>
                    <select
                      value={productForm.category}
                      onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    >
                      <option value="پنل خورشیدی">پنل خورشیدی</option>
                      <option value="اینورتر خورشیدی">اینورتر خورشیدی</option>
                      <option value="باتری و ذخیره‌ساز">باتری و ذخیره‌ساز</option>
                      <option value="سازه و استراکچر">سازه و استراکچر</option>
                      <option value="تابلو برق و حفاظت الکتریکی">تابلو برق و حفاظت الکتریکی</option>
                      <option value="پمپ آب خورشیدی">پمپ آب خورشیدی</option>
                      <option value="سایر تجهیزات">سایر تجهیزات</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      برند — اختیاری
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: Jinko Solar"
                      value={productForm.brand}
                      onChange={e => setProductForm({ ...productForm, brand: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مدل — اختیاری
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: Tiger Neo N-type 550W"
                      value={productForm.model}
                      onChange={e => setProductForm({ ...productForm, model: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      قیمت (تومان) — اختیاری
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      placeholder="خالی برای «استعلام قیمت»"
                      value={productForm.price}
                      onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      توضیح — اختیاری
                    </label>
                    <textarea
                      rows={2}
                      placeholder="توضیحات کلی، ویژگی‌های کاربردی..."
                      value={productForm.description}
                      onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مشخصات فنی — اختیاری
                    </label>
                    <textarea
                      rows={2}
                      placeholder="راندمان ۲۲.۳٪، ابعاد، گارانتی ۲۵ ساله..."
                      value={productForm.specs}
                      onChange={e => setProductForm({ ...productForm, specs: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                {/* Product Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      تصاویر محصول
                    </label>
                    <button
                      type="button"
                      disabled={productImagesUploading}
                      onClick={() => productImageInputRef.current?.click()}
                      className="text-xs text-[#0284C7] dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {productImagesUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>بارگذاری تصویر محصول</span>
                    </button>
                    <input
                      type="file"
                      ref={productImageInputRef}
                      onChange={handleProductImageUpload}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {productForm.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {productForm.images.map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden h-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <img src={imgUrl} alt={`تصویر محصول ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveProductImage(idx)}
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
                    onClick={() => setShowAddProduct(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={productSaving}
                    className="px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {productSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    <span>ثبت محصول</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of Products */}
            <div className="pt-4">
              {products.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  تجهیزی ثبت نشده است (ثبت تجهیز برای شرکت‌های EPC کاملاً اختیاری است).
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map(prod => (
                    <div
                      key={prod.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {Array.isArray(prod.images) && prod.images.length > 0 ? (
                          <img src={prod.images[0]} alt={prod.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                            <Package size={20} />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {prod.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {prod.category} {prod.brand ? `• ${prod.brand}` : ''}
                          </p>
                          <span className="text-[10px] font-bold text-[#0284C7] dark:text-blue-400">
                            {prod.price ? `${Number(prod.price).toLocaleString('fa-IR')} تومان` : 'استعلام قیمت'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5"
                        title="حذف محصول"
                      >
                        <Trash2 size={14} />
                      </button>
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
                در آینده هر زمان می‌توانید اطلاعات و تصاویر را از طریق منوی تنظیمات پنل ویرایش نمایید.
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
