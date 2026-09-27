import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Phone, Lock, Building, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdBanner } from '../components/AdBanner';

export default function VendorAuth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    companyName: '',
    managerName: '',
    city: '',
    category: 'پنل و تجهیزات خورشیدی'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
            role: 'VENDOR'
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'خطا در ورود به حساب تأمین‌کننده');
        }

        login(data.token, data.user);
        navigate('/vendor-portal/dashboard');
      } else {
        const res = await fetch('/api/auth/partner-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'VENDOR',
            phone: formData.phone,
            name: formData.managerName || formData.companyName,
            companyName: formData.companyName,
            city: formData.city,
            specialties: [formData.category]
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'خطا در ثبت فروشگاه و تأمین‌کننده');
        }

        login(data.token, data.user);
        setSuccessMsg('ثبت تأمین‌کننده با موفقیت انجام شد. حساب کاربری فروشگاهی ایجاد گردید.');
        setTimeout(() => {
          navigate('/vendor-portal/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'خطایی در ارتباط با سرور رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-zinc-950 font-sans p-4 md:p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6 pt-10">
        <header className="flex items-center justify-between mb-8">
          <Link to="/partners" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium transition-colors">
            <ArrowLeft size={18} />
            بازگشت به همکاران
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="text-blue-600" />
            فروشندگان و تامین‌کنندگان
          </h1>
        </header>
        
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-zinc-800">
            <button 
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-4 font-bold text-center transition-colors relative ${isLogin ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500'}`}
            >
              ورود به حساب
              {isLogin && <motion.div layoutId="vendor_tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
            </button>
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-4 font-bold text-center transition-colors relative ${!isLogin ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500'}`}
            >
              ثبت فروشگاه
              {!isLogin && <motion.div layoutId="vendor_tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">نام فروشگاه یا شرکت</label>
                    <div className="relative">
                      <input required name="companyName" value={formData.companyName} onChange={handleChange} type="text" className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: پارس سولار" />
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">نام و نام خانوادگی مدیر</label>
                    <input required name="managerName" value={formData.managerName} onChange={handleChange} type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: محمد حسینی" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">دسته تجهیزات اصلی</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100">
                      <option value="پنل و تجهیزات خورشیدی">پنل و تجهیزات خورشیدی</option>
                      <option value="اینورتر و مبدل‌های برق">اینورتر و مبدل‌های برق</option>
                      <option value="باتری و سیستم‌های ذخیره‌ساز">باتری و سیستم‌های ذخیره‌ساز</option>
                      <option value="کابل، اتصالات و تابلو حفاظت">کابل، اتصالات و تابلو حفاظت</option>
                      <option value="استراکچر و سازه خورشیدی">استراکچر و سازه خورشیدی</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">شهر و استان</label>
                    <div className="relative">
                      <input required name="city" value={formData.city} onChange={handleChange} type="text" className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: تهران" />
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">شماره موبایل</label>
                <div className="relative">
                  <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" dir="ltr" className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 text-right" placeholder="0912..." />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">رمز عبور</label>
                <div className="relative">
                  <input required name="password" value={formData.password} onChange={handleChange} type="password" dir="ltr" className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 text-right" placeholder="********" />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl text-base font-bold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {loading ? 'در حال ارتباط...' : (isLogin ? 'ورود به پورتال فروشندگان' : 'ثبت فروشگاه')}
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
