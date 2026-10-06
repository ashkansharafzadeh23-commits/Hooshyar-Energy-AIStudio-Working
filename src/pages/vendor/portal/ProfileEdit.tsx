import React, { useState, useEffect } from 'react';
import { Camera, Save, Building2, Globe, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../../context/ToastContext';
import { 
  getVendorProfile, 
  updateVendorProfile, 
  uploadPartnerMedia 
} from '../../../services/partnerMediaService';

interface ProfileEditProps {
  previewMode?: boolean;
}

export default function ProfileEdit({ previewMode = false }: ProfileEditProps) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(!previewMode);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    name: 'نیرو گستران پارس',
    description: 'تامین کننده تخصصی تجهیزات انرژی خورشیدی، اینورترهای متصل و منفصل از شبکه و باتری‌های ذخیره‌ساز با استاندارد بین‌المللی',
    address: 'تهران، خیابان لاله‌زار جنوبی، مجتمع تجاری بوشهری، پلاک ۱۲',
    city: 'تهران',
    phone: '021-33112233',
    website: 'https://nirogoostar-pars.ir',
    logoUrl: '',
    logoKey: ''
  });

  useEffect(() => {
    if (previewMode) return;

    async function loadProfile() {
      try {
        setLoading(true);
        const vendor = await getVendorProfile();
        if (vendor) {
          setFormData({
            name: vendor.companyName || '',
            description: vendor.aboutUs || '',
            address: vendor.address || '',
            city: vendor.city || '',
            phone: vendor.phones?.[0]?.number || '',
            website: vendor.website || '',
            logoUrl: vendor.logoUrl || '',
            logoKey: vendor.logoKey || ''
          });
        }
      } catch (err: any) {
        console.error('Failed to load vendor profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [previewMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewMode) {
      const tempUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, logoUrl: tempUrl, logoKey: 'preview_logo_key' }));
      showSuccess('لوگو در محیط پیش‌نمایش بارگذاری شد.', 'پیش‌نمایش لوگو');
      return;
    }

    try {
      setUploadingLogo(true);
      const res = await uploadPartnerMedia(file, 'VENDOR_LOGO');
      setFormData(prev => ({
        ...prev,
        logoKey: res.storageKey,
        logoUrl: res.downloadUrl
      }));
      showSuccess('لوگوی شرکت با موفقیت در مخزن امن ذخیره شد.', 'بارگذاری موفق');
    } catch (err: any) {
      showError(err.message || 'خطا در بارگذاری تصویر لوگو.', 'خطای بارگذاری');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (previewMode) {
      showSuccess('اطلاعات در محیط پیش‌نمایش به‌روزرسانی شد.', 'پیش‌نمایش پروفایل');
      return;
    }

    try {
      setSaving(true);
      await updateVendorProfile({
        companyName: formData.name,
        aboutUs: formData.description,
        address: formData.address,
        city: formData.city,
        phones: [{ label: 'دفتر مرکزی', number: formData.phone }],
        website: formData.website,
        logoKey: formData.logoKey,
        logoUrl: formData.logoUrl
      });
      showSuccess('مشخصات فروشگاه با موفقیت ذخیره شد.', 'به‌روزرسانی موفق');
    } catch (err: any) {
      showError(err.message || 'خطا در ذخیره اطلاعات فروشگاه.', 'خطای ذخیره‌سازی');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
        <Loader2 className="animate-spin mx-auto mb-2 text-[#0284C7]" size={24} />
        در حال دریافت مشخصات ثبتی فروشگاه...
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6 font-sans"
      dir="rtl"
    >
      <div className="border-b border-slate-200 dark:border-zinc-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
          مشخصات ثبتی و پروفایل شرکت
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          اطلاعات ثبتی، نشانی و راه‌های ارتباطی فروشگاه در سامانه هوشیار انرژی
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        
        {/* Account Profile Information Banner */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <Building2 size={20} className="text-[#0284C7] shrink-0" />
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                وضعیت اطلاعات حساب
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                اطلاعات رسمی، تماس و نشانی برای نمایش در فروشگاه عمومی، استعلام‌ها و کاتالوگ تجهیزات. {previewMode && 'تغییرات در این بخش ذخیره ابری نمی‌شود.'}
              </span>
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="flex items-center gap-5 pt-2">
          <div className="w-24 h-24 bg-slate-50 dark:bg-zinc-800 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-[#0284C7] hover:text-[#0284C7] transition-colors cursor-pointer relative overflow-hidden shrink-0">
            {uploadingLogo ? (
              <Loader2 className="animate-spin text-[#0284C7]" size={24} />
            ) : formData.logoUrl ? (
              <img src={formData.logoUrl} alt="لوگو" className="w-full h-full object-contain p-2" />
            ) : (
              <>
                <Camera size={22} className="mb-1 text-slate-400" />
                <span className="text-[10px] font-bold">لوگوی شرکت</span>
              </>
            )}
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoFileChange}
              disabled={uploadingLogo}
            />
          </div>
          <div className="flex-1 text-xs text-slate-500 dark:text-slate-400">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">تصویر نشان تجاری (لوگو)</h3>
            <p className="leading-relaxed">
              تصویر لوگوی فروشگاه با نسبت ابعاد مربعی (حداکثر حجم ۵ مگابایت، فرمت‌های مجاز: JPG, PNG, WebP). در مخزن امن ابری ذخیره و پیوند امن برای نمایش صادر می‌شود.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800 text-xs">
          <div className="space-y-4 md:col-span-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نام رسمی شرکت / فروشگاه تجهیزات <span className="text-red-500">*</span>
              </label>
              <input 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-slate-100 min-h-[44px]" 
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                درباره فروشگاه و حوزه تخصصی تأمین کالا
              </label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-slate-100 resize-none leading-relaxed" 
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              شهر محل استقرار دفتر فروش <span className="text-red-500">*</span>
            </label>
            <input 
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              className="w-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-slate-100 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              شماره تماس ثابت یا همراه فروش <span className="text-red-500">*</span>
            </label>
            <input 
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-slate-100 min-h-[44px]"
              dir="ltr" 
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              آدرس دقیق انبار یا فروشگاه مرکزی
            </label>
            <input 
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-slate-100 min-h-[44px]" 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              آدرس وب‌سایت رسمی (اختیاری)
            </label>
            <input 
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0284C7] text-slate-900 dark:text-slate-100 min-h-[44px]"
              dir="ltr" 
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-zinc-800">
          <button 
            type="submit"
            disabled={saving}
            className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors min-h-[44px] shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>ذخیره تغییرات مشخصات</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
