import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
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
  Info,
  Check,
  X
} from 'lucide-react';
import {
  uploadPartnerMedia,
  getVendorProfile,
  updateVendorProfile,
  getVendorProducts,
  createVendorProduct,
  deleteVendorProduct,
  updateVendorProductAvailability,
  formatPartnerMediaError,
  VendorProductItem
} from '../../services/partnerMediaService';

interface VendorOnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
  initialCompanyName?: string;
}

export default function VendorOnboardingFlow({
  onComplete,
  onSkip,
  initialCompanyName
}: VendorOnboardingFlowProps) {
  // Loading & Error states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productImagesUploading, setProductImagesUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoKey, setLogoKey] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Products state
  const [products, setProducts] = useState<VendorProductItem[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'پنل خورشیدی',
    brand: '',
    model: '',
    description: '',
    specs: '',
    price: '',
    availability: 'AVAILABLE' as 'AVAILABLE' | 'UNAVAILABLE',
    images: [] as string[]
  });
  const productImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadInitial() {
      try {
        const prof = await getVendorProfile();
        if (prof) {
          if (prof.logoUrl) setLogoUrl(prof.logoUrl);
          if (prof.logoKey) setLogoKey(prof.logoKey);
        }
        const prods = await getVendorProducts();
        if (Array.isArray(prods)) {
          setProducts(prods);
        }
      } catch (err: any) {
        console.warn('Initial vendor onboarding load:', err);
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

  // 1. Logo handlers
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlobalError(null);
    setLogoUploading(true);

    try {
      const uploadRes = await uploadPartnerMedia(file, 'VENDOR_LOGO');
      setLogoUrl(uploadRes.downloadUrl);
      setLogoKey(uploadRes.storageKey);

      await updateVendorProfile({
        logoKey: uploadRes.storageKey,
        logoUrl: uploadRes.downloadUrl
      });
      showFeedback('لوگوی فروشگاه با موفقیت ذخیره شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در بارگذاری لوگوی فروشگاه.'));
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUploading(true);
    setGlobalError(null);
    try {
      await updateVendorProfile({
        logoKey: '',
        logoUrl: ''
      });
      setLogoUrl('');
      setLogoKey('');
      showFeedback('لوگوی فروشگاه حذف شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در حذف لوگو.'));
    } finally {
      setLogoUploading(false);
    }
  };

  // 2. Product handlers
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProductImagesUploading(true);
    setGlobalError(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadPartnerMedia(file, 'VENDOR_PRODUCT');
        newUrls.push(res.downloadUrl || res.storageKey);
      }
      setProductForm(prev => ({
        ...prev,
        images: [...prev.images, ...newUrls]
      }));
      showFeedback('تصویر واقعی محصول با موفقیت بارگذاری شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در بارگذاری تصویر محصول.'));
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
      setGlobalError('لطفاً نام محصول را وارد کنید.');
      return;
    }

    setProductSaving(true);
    setGlobalError(null);

    try {
      const isAvail = productForm.availability === 'AVAILABLE';
      const created = await createVendorProduct({
        name: productForm.name.trim(),
        category: productForm.category,
        brand: productForm.brand.trim() || undefined,
        model: productForm.model.trim() || undefined,
        description: productForm.description.trim() || undefined,
        specs: productForm.specs.trim() || undefined,
        price: productForm.price ? Number(productForm.price) : undefined,
        images: productForm.images,
        availability: productForm.availability,
        inStock: isAvail
      });

      setProducts(prev => [created, ...prev]);
      setShowAddProduct(false);
      setProductForm({
        name: '',
        category: 'پنل خورشیدی',
        brand: '',
        model: '',
        description: '',
        specs: '',
        price: '',
        availability: 'AVAILABLE',
        images: []
      });
      showFeedback('محصول با موفقیت در کاتالوگ فروشگاه ثبت شد.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در ثبت محصول.'));
    } finally {
      setProductSaving(false);
    }
  };

  const handleToggleAvailability = async (productId: string, currentAvail: 'AVAILABLE' | 'UNAVAILABLE') => {
    const nextStatus = currentAvail === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    try {
      const updated = await updateVendorProductAvailability(productId, nextStatus);
      setProducts(prev => prev.map(p => p.id === productId ? updated : p));
      showFeedback(`وضعیت موجودی به «${nextStatus === 'AVAILABLE' ? 'موجود' : 'ناموجود'}» تغییر یافت.`);
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در تغییر وضعیت موجودی محصول.'));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteVendorProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      showFeedback('محصول از کاتالوگ حذف گردید.');
    } catch (err: any) {
      setGlobalError(formatPartnerMediaError(err, 'خطا در حذف محصول.'));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6" dir="rtl">
      {/* Onboarding Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        
        {/* Progress Badge */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/80 text-[#0284C7] dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              مرحله ۲ از ۲
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {initialCompanyName ? `فروشگاه ${initialCompanyName}` : 'پروفایل فروشگاهی تأمین‌کننده'}
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
            تکمیل پروفایل فروشگاه
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            حساب کاربری فروشگاه ایجاد شد. برای جذب مشتریان و دریافت استعلام‌های خرید تجهیزات، لوگو و نخستین محصولات کاتالوگ فروشگاه خود را ثبت نمایید.
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
          <p className="text-xs">در حال بارگذاری اطلاعات فروشگاه...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* 1. VENDOR LOGO */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="text-[#0284C7]" size={20} />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    لوگوی فروشگاه یا شرکت
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    اختیاری
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  لوگو یا نماد تجاری فروشگاه خود را بارگذاری کنید.
                </p>
              </div>

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
                    alt="لوگوی فروشگاه"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <Store size={32} className="text-slate-400" />
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {logoUrl ? (
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    لوگوی فروشگاه ثبت شد و در صفحه عمومی ویترین نمایش داده می‌شود.
                  </p>
                ) : (
                  <p>
                    لوگو در ویترین فروشگاه و نتایج جستجوی تجهیزات خورشیدی به خریداران نمایش داده می‌شود.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. FIRST PRODUCTS & AVAILABILITY */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="text-[#0284C7]" size={20} />
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    محصولات شما
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {products.length} محصول ثبت‌شده
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  محصولات واقعی فروشگاه خود را برای نمایش به کاربران ثبت کنید.
                </p>
              </div>

              {!showAddProduct && (
                <button
                  type="button"
                  onClick={() => setShowAddProduct(true)}
                  className="px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[42px] flex items-center gap-2 shrink-0"
                >
                  <Plus size={16} />
                  <span>افزودن محصول</span>
                </button>
              )}
            </div>

            {/* Add Product Form Drawer */}
            {showAddProduct && (
              <form onSubmit={handleSaveProduct} className="pt-6 pb-4 space-y-4 border-b border-slate-100 dark:border-slate-800 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={16} className="text-[#0284C7]" />
                    ثبت محصول جدید در کاتالوگ فروشگاه
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
                      placeholder="مثال: اینورتر متصل به شبکه ۱۰ کیلووات سه فاز"
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
                      <option value="باتری خورشیدی">باتری خورشیدی</option>
                      <option value="کنترلر شارژ (MPPT/PWM)">کنترلر شارژ (MPPT/PWM)</option>
                      <option value="سازه و استراکچر">سازه و استراکچر</option>
                      <option value="کابل و اتصالات خورشیدی">کابل و اتصالات خورشیدی</option>
                      <option value="تجهیزات حفاظتی و فیوز">تجهیزات حفاظتی و فیوز</option>
                      <option value="پمپ آب خورشیدی">پمپ آب خورشیدی</option>
                      <option value="سایر تجهیزات">سایر تجهیزات</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      برند
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: Huawei / Sungrow / Growatt"
                      value={productForm.brand}
                      onChange={e => setProductForm({ ...productForm, brand: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مدل
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: SUN2000-10KTL-M1"
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

                {/* PRODUCT AVAILABILITY CONTROL (REQUIRED) */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="block text-xs font-black text-slate-900 dark:text-white mb-2">
                    وضعیت محصول <span className="text-rose-500">*</span>
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, availability: 'AVAILABLE' })}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border min-h-[44px] cursor-pointer ${
                        productForm.availability === 'AVAILABLE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full border-2 ${
                        productForm.availability === 'AVAILABLE' ? 'border-white bg-white' : 'border-slate-400'
                      }`} />
                      <span>موجود</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, availability: 'UNAVAILABLE' })}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border min-h-[44px] cursor-pointer ${
                        productForm.availability === 'UNAVAILABLE'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full border-2 ${
                        productForm.availability === 'UNAVAILABLE' ? 'border-white bg-white' : 'border-slate-400'
                      }`} />
                      <span>ناموجود</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      توضیح
                    </label>
                    <textarea
                      rows={2}
                      placeholder="توضیح کوتاه درباره ویژگی‌ها و کاربرد محصول..."
                      value={productForm.description}
                      onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مشخصات فنی
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ولتاژ، راندمان، گارانتی، دمای کارکرد..."
                      value={productForm.specs}
                      onChange={e => setProductForm({ ...productForm, specs: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                {/* Real Product Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      تصاویر واقعی محصول
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

                  {productForm.images.length === 0 ? (
                    <div 
                      onClick={() => productImageInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <ImageIcon className="mx-auto text-slate-400 mb-2" size={28} />
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                        بارگذاری تصاویر واقعی محصول
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        فرمت‌های مجاز JPG و PNG (حداکثر ۵ مگابایت)
                      </p>
                    </div>
                  ) : (
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
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  هنوز محصولی ثبت نشده است. با کلیک بر روی «افزودن محصول»، نخستین تجهیز را در کاتالوگ فروشگاه ثبت کنید.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map(prod => {
                    const isAvail = prod.availability === 'AVAILABLE' || (prod.availability !== 'UNAVAILABLE' && prod.inStock !== false);
                    return (
                      <div
                        key={prod.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-between"
                      >
                        <div>
                          {Array.isArray(prod.images) && prod.images.length > 0 && (
                            <div className="w-full h-32 rounded-xl overflow-hidden mb-3 bg-slate-200 dark:bg-slate-700">
                              <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {prod.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="حذف محصول"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-2">
                            <span>{prod.category}</span>
                            {prod.brand && <span>• برند: {prod.brand}</span>}
                            {prod.model && <span>• مدل: {prod.model}</span>}
                          </div>

                          <div className="mt-2 text-xs font-bold text-[#0284C7] dark:text-blue-400">
                            {prod.price ? `${Number(prod.price).toLocaleString('fa-IR')} تومان` : 'استعلام قیمت'}
                          </div>
                        </div>

                        {/* Explicit Availability Control & Badge */}
                        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            وضعیت انبار:
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(prod.id, isAvail ? 'AVAILABLE' : 'UNAVAILABLE')}
                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                              isAvail
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{isAvail ? 'موجود' : 'ناموجود'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* FINAL ACTIONS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info size={16} className="text-[#0284C7] shrink-0" />
              <span>
                در آینده می‌توانید محصولات بیشتری را از بخش مدیریت کاتالوگ فروشگاه اضافه یا ویرایش کنید.
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
