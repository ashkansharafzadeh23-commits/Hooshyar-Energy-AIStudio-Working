import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Lock, Building2, MapPin, Briefcase, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdBanner } from '../components/AdBanner';

export default function ContractorAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    city: '',
    specialty: 'نیروگاه‌های خورشیدی مقیاس بزرگ و صنعتی',
    registrationNumber: '',
    nationalId: '',
    bio: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await fetch('/api/auth/partner-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.phone,
            role: 'CONTRACTOR'
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'خطا در ورود شرکت پیمانکار');
        }

        login(data.token, data.user);
        navigate('/contractor-dashboard');
      } else {
        const res = await fetch('/api/auth/partner-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'CONTRACTOR',
            phone: formData.phone,
            name: formData.name,
            companyName: formData.name,
            city: formData.city,
            specialties: [formData.specialty],
            registrationNumber: formData.registrationNumber,
            nationalId: formData.nationalId,
            bio: formData.bio
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'خطا در ثبت شرکت پیمانکار');
        }

        login(data.token, data.user);
        setSuccessMsg('ثبت شرکت با موفقیت انجام شد. حساب کاربری مجری ایجاد گردید.');
        setTimeout(() => {
          navigate('/contractor-dashboard');
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'خطایی در ارتباط با سرور رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full font-sans py-8 px-4">
      <div className="w-full max-w-2xl relative">
        <div className="mb-4">
          <Link to="/partners" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200">
            <ArrowLeft size={14} />
            <span>بازگشت به همکاران</span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 bg-amber-500 text-white w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shadow-xl border-4 border-[#F7F8FA] dark:border-zinc-950 z-10"
        >
          <Building2 size={40} className="sm:w-12 sm:h-12" />
        </motion.div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-zinc-800 overflow-hidden pt-16 sm:pt-20">
          <div className="flex border-b border-slate-100 dark:border-zinc-800">
            <button 
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-4 font-bold text-base relative transition-colors ${isLogin ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500'}`}
            >
              ورود شرکت پیمانکار
              {isLogin && <motion.div layoutId="contractor_tab" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-t-full" />}
            </button>
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-4 font-bold text-base relative transition-colors ${!isLogin ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500'}`}
            >
              ثبت شرکت جدید
              {!isLogin && <motion.div layoutId="contractor_tab" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-t-full" />}
            </button>
          </div>
          
          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 flex items-center gap-2 text-sm">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-sm">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">نام شرکت یا برند تجاری</label>
                    <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: مهندسی نیروپژوهان" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">تخصص اصلی پیمانکاری</label>
                    <div className="relative">
                      <select required name="specialty" value={formData.specialty} onChange={handleChange} className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 appearance-none">
                        <option value="نیروگاه‌های خورشیدی مقیاس بزرگ و صنعتی">نیروگاه‌های مقیاس بزرگ و صنعتی</option>
                        <option value="نیروگاه‌های خورشیدی سقفی و سوله صنعتی">نیروگاه‌های سقفی و سوله صنعتی</option>
                        <option value="طراحی، مهندسی و اجرای مگاواتی (EPC)">طراحی و اجرای مگاواتی (EPC)</option>
                        <option value="مزارع خورشیدی و سیستم‌های هیبریدی">مزارع خورشیدی و سیستم‌های هیبریدی</option>
                      </select>
                      <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">شماره ثبت شرکت (اختیاری)</label>
                    <input name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: 123456" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">شناسه ملی شرکت (اختیاری)</label>
                    <input name="nationalId" value={formData.nationalId} onChange={handleChange} type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: 1400..." />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">شهر و آدرس دفتر مرکزی</label>
                    <div className="relative">
                      <input required name="city" value={formData.city} onChange={handleChange} type="text" className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: اصفهان" />
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">درباره شرکت و توانمندی‌های اجرایی</label>
                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 resize-none" placeholder="خلاصه‌ای از رزومه، استانداردهای فنی، توان مهندسی و تدارکات شرکت..."></textarea>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">شماره تماس مستقیم نماینده شرکت</label>
                  <div className="relative">
                    <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" dir="ltr" className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 text-right" placeholder="0912..." />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">رمز عبور حساب</label>
                  <div className="relative">
                    <input required name="password" value={formData.password} onChange={handleChange} type="password" dir="ltr" className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 text-right" placeholder="********" />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl text-base font-bold transition-colors shadow-md disabled:opacity-50"
                >
                  {loading ? 'در حال ارتباط با سرور...' : (isLogin ? 'ورود به پنل پیمانکار' : 'ثبت شرکت در شبکه مجریان')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="mt-8"><AdBanner layout="card" /></div>
    </div>
  );
}
