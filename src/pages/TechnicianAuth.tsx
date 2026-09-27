import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle, Phone, Lock, MapPin, Briefcase, Award, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdBanner } from '../components/AdBanner';

export default function TechnicianAuth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    name: '',
    profession: 'متخصص سیستم‌های فتوولتائیک و پنل',
    experience: '',
    city: '',
    bio: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            role: 'TECHNICIAN'
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'خطا در ورود به حساب کاربری');
        }

        login(data.token, data.user);
        navigate('/technician-dashboard');
      } else {
        const res = await fetch('/api/auth/partner-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'TECHNICIAN',
            phone: formData.phone,
            name: formData.name,
            specialties: [formData.profession],
            experience: Number(formData.experience) || 0,
            city: formData.city,
            bio: formData.bio
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'خطا در ثبت‌نام کارشناس');
        }

        login(data.token, data.user);
        setSuccessMsg('ثبت‌نام با موفقیت انجام شد. حساب کاربری شما ایجاد گردید و پرونده کارشناسی جهت بررسی در صف ثبت شد.');
        setTimeout(() => {
          navigate('/technician-dashboard');
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
      <div className="max-w-2xl mx-auto space-y-6 pt-10">
        <header className="flex items-center justify-between mb-8">
          <Link to="/partners" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white font-medium transition-colors">
            <ArrowLeft size={18} />
            بازگشت به همکاران
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCircle className="text-emerald-600" />
            کارشناسان و تعمیرکاران فنی خورشیدی
          </h1>
        </header>
        
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-zinc-800">
            <button 
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-4 font-bold text-center transition-colors relative ${isLogin ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'}`}
            >
              ورود به حساب
              {isLogin && <motion.div layoutId="tech_tab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full" />}
            </button>
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-4 font-bold text-center transition-colors relative ${!isLogin ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'}`}
            >
              ثبت‌نام کارشناس
              {!isLogin && <motion.div layoutId="tech_tab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full" />}
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
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">نام و نام خانوادگی</label>
                    <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: علی احمدی" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">تخصص خورشیدی اصلی</label>
                    <div className="relative">
                      <select required name="profession" value={formData.profession} onChange={handleChange} className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 appearance-none">
                        <option value="متخصص سیستم‌های فتوولتائیک و پنل">متخصص سیستم‌های فتوولتائیک و پنل</option>
                        <option value="اینورتر و سیستم‌های الکترونیک قدرت">اینورتر و سیستم‌های الکترونیک قدرت</option>
                        <option value="باتری و سیستم‌های ذخیره‌ساز انرژی">باتری و سیستم‌های ذخیره‌ساز انرژی</option>
                        <option value="تابلو برق، حفاظت و اتوماسیون خورشیدی">تابلو برق، حفاظت و اتوماسیون خورشیدی</option>
                        <option value="پایش برخط و عیب‌یابی نیروگاهی">پایش برخط و عیب‌یابی نیروگاهی</option>
                        <option value="سرویس و نگهداری دوره‌ای نیروگاه خورشیدی">سرویس و نگهداری دوره‌ای نیروگاه خورشیدی</option>
                      </select>
                      <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">سابقه کار در حوزه خورشیدی (سال)</label>
                    <div className="relative">
                      <input name="experience" value={formData.experience} onChange={handleChange} type="number" min="0" max="50" className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: 5" />
                      <Award className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">شهر و استان فعالیت</label>
                    <div className="relative">
                      <input required name="city" value={formData.city} onChange={handleChange} type="text" className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100" placeholder="مثال: تهران" />
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">توضیحات و سوابق کاری</label>
                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 resize-none" placeholder="توضیحات درباره سوابق، پروژه‌های نصب و گواهینامه‌های حرفه‌ای..."></textarea>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">شماره موبایل</label>
                  <div className="relative">
                    <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" dir="ltr" className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 text-right" placeholder="0912..." />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">رمز عبور</label>
                  <div className="relative">
                    <input required name="password" value={formData.password} onChange={handleChange} type="password" dir="ltr" className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-zinc-100 text-right" placeholder="********" />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl text-base font-bold hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {loading ? 'در حال پردازش...' : (isLogin ? 'ورود به پنل کارشناسی' : 'ثبت اطلاعات کارشناس')}
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
