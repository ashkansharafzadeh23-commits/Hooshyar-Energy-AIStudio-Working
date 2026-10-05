import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle, Phone, Lock, MapPin, Briefcase, Award, AlertCircle, CheckCircle2, Loader2, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
        setSuccessMsg('ثبت‌نام با موفقیت انجام شد. حساب کاربری ایجاد گردید.');
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
    <div className="w-full max-w-xl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        
        {/* Brand & Context Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-[#0284C7] dark:text-blue-400 mx-auto mb-3 flex items-center justify-center shadow-xs">
            <Wrench size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            ورود و ثبت‌نام متخصصان تعمیرات و نگهداری
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            مأموریت‌های میدانی، عیب‌یابی تجهیزات، پایش سلامت و ثبت گزارش‌های فنی
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-6">
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isLogin 
                ? 'bg-white dark:bg-slate-900 text-[#0284C7] dark:text-blue-400 shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ورود کارشناس
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-bold transition-all ${
              !isLogin 
                ? 'bg-white dark:bg-slate-900 text-[#0284C7] dark:text-blue-400 shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ثبت‌نام کارشناس جدید
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-4">
              <div>
                <label className="label-he">نام و نام خانوادگی کارشناس</label>
                <input 
                  required 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  type="text" 
                  dir="rtl"
                  style={{ paddingRight: '1rem', paddingLeft: '1rem' }}
                  className="input-he px-4 min-h-[48px] h-12 text-right" 
                  placeholder="مثال: مهندس علی حسینی" 
                />
              </div>

              <div>
                <label className="label-he">تخصص خورشیدی اصلی</label>
                <div className="relative">
                  <div className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none text-slate-400">
                    <Briefcase size={18} />
                  </div>
                  <select 
                    required 
                    name="profession" 
                    value={formData.profession} 
                    onChange={handleChange} 
                    dir="rtl"
                    style={{ paddingRight: '3.5rem', paddingLeft: '1rem' }}
                    className="input-he pr-14 pl-4 min-h-[48px] h-12 appearance-none text-right"
                  >
                    <option value="متخصص سیستم‌های فتوولتائیک و پنل">متخصص سیستم‌های فتوولتائیک و پنل</option>
                    <option value="اینورتر و سیستم‌های الکترونیک قدرت">اینورتر و سیستم‌های الکترونیک قدرت</option>
                    <option value="باتری و سیستم‌های ذخیره‌ساز انرژی">باتری و سیستم‌های ذخیره‌ساز انرژی</option>
                    <option value="تابلو برق، حفاظت و اتوماسیون خورشیدی">تابلو برق، حفاظت و اتوماسیون خورشیدی</option>
                    <option value="پایش برخط و عیب‌یابی نیروگاهی">پایش برخط و عیب‌یابی نیروگاهی</option>
                    <option value="سرویس و نگهداری دوره‌ای نیروگاه خورشیدی">سرویس و نگهداری دوره‌ای نیروگاه خورشیدی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-he">سابقه کار در حوزه خورشیدی (سال)</label>
                  <div className="relative">
                    <div className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none text-slate-400">
                      <Award size={18} />
                    </div>
                    <input 
                      name="experience" 
                      value={formData.experience} 
                      onChange={handleChange} 
                      type="number" 
                      min="0" 
                      max="50" 
                      dir="rtl"
                      style={{ paddingRight: '3.5rem', paddingLeft: '1rem' }}
                      className="input-he pr-14 pl-4 min-h-[48px] h-12 text-right" 
                      placeholder="مثال: 5" 
                    />
                  </div>
                </div>

                <div>
                  <label className="label-he">شهر و استان فعالیت</label>
                  <div className="relative">
                    <div className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none text-slate-400">
                      <MapPin size={18} />
                    </div>
                    <input 
                      required 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange} 
                      type="text" 
                      dir="rtl"
                      style={{ paddingRight: '3.5rem', paddingLeft: '1rem' }}
                      className="input-he pr-14 pl-4 min-h-[48px] h-12 text-right" 
                      placeholder="مثال: اصفهان" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="label-he">سوابق فنی و مدارک حرفه‌ای</label>
                <textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  rows={2} 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all resize-none min-h-[80px]" 
                  placeholder="سوابق اجرایی، گواهینامه‌های فنی‌وحرفه‌ای، دوره‌های نصب و نظارت..."
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-he">شماره موبایل</label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none text-slate-400">
                  <Phone size={18} />
                </div>
                <input 
                  required 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  type="tel" 
                  dir="ltr" 
                  inputMode="tel"
                  autoComplete="tel"
                  style={{ paddingLeft: '3.5rem', paddingRight: '1rem' }}
                  className="input-he pl-14 pr-4 min-h-[48px] h-12 text-left" 
                  placeholder="0912..." 
                />
              </div>
            </div>
            
            <div>
              <label className="label-he">رمز عبور</label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  required 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  type="password" 
                  dir="ltr" 
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  style={{ paddingLeft: '3.5rem', paddingRight: '1rem' }}
                  className="input-he pl-14 pr-4 min-h-[48px] h-12 text-left" 
                  placeholder="********" 
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-he-primary w-full min-h-[48px]"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'ورود به پنل کارشناسی' : 'ثبت اطلاعات کارشناس در سامانه'}</span>
                  <ArrowLeft size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Partner Ecosystem Gateways */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
            دسترسی به سایر بخش‌ها و همکاران:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link 
              to="/contractor-auth" 
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#0284C7] dark:hover:text-blue-400 transition-colors font-medium min-h-[36px] inline-flex items-center"
            >
              شرکت‌های EPC
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link 
              to="/vendor-auth" 
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#0284C7] dark:hover:text-blue-400 transition-colors font-medium min-h-[36px] inline-flex items-center"
            >
              تأمین‌کنندگان
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="px-3 py-1.5 rounded-lg font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 min-h-[36px] inline-flex items-center">
              تعمیرکاران (فعلی)
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link 
              to="/customer-login" 
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#0284C7] dark:hover:text-blue-400 transition-colors font-medium min-h-[36px] inline-flex items-center"
            >
              ورود کارفرمایان
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
