import React, { useState } from 'react';
import { Phone, Lock, Building2, MapPin, Briefcase, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="w-full max-w-xl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        
        {/* Brand & Context Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-[#0284C7] dark:text-blue-400 mx-auto mb-3 flex items-center justify-center shadow-xs">
            <Building2 size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            ورود و ثبت‌نام پیمانکاران و شرکت‌های EPC
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            دسترسی به پروژه‌ها، مناقصات خورشیدی و مدیریت استعلام‌های فعال
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-6">
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              isLogin 
                ? 'bg-white dark:bg-slate-900 text-[#0284C7] dark:text-blue-400 shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ورود شرکت پیمانکار
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              !isLogin 
                ? 'bg-white dark:bg-slate-900 text-[#0284C7] dark:text-blue-400 shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ثبت‌نام شرکت جدید
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-4">
              <div>
                <label className="label-he">نام شرکت یا برند تجاری</label>
                <input 
                  required 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  type="text" 
                  className="input-he" 
                  placeholder="مثال: مهندسی نیروپژوهان افق" 
                />
              </div>
              
              <div>
                <label className="label-he">تخصص اصلی پیمانکاری</label>
                <div className="relative">
                  <select 
                    required 
                    name="specialty" 
                    value={formData.specialty} 
                    onChange={handleChange} 
                    className="input-he pr-9 appearance-none"
                  >
                    <option value="نیروگاه‌های خورشیدی مقیاس بزرگ و صنعتی">نیروگاه‌های مقیاس بزرگ و صنعتی</option>
                    <option value="نیروگاه‌های خورشیدی سقفی و سوله صنعتی">نیروگاه‌های سقفی و سوله صنعتی</option>
                    <option value="طراحی، مهندسی و اجرای مگاواتی (EPC)">طراحی و اجرای مگاواتی (EPC)</option>
                    <option value="مزارع خورشیدی و سیستم‌های هیبریدی">مزارع خورشیدی و سیستم‌های هیبریدی</option>
                  </select>
                  <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-he">شماره ثبت شرکت (اختیاری)</label>
                  <input 
                    name="registrationNumber" 
                    value={formData.registrationNumber} 
                    onChange={handleChange} 
                    type="text" 
                    className="input-he" 
                    placeholder="مثال: 123456" 
                  />
                </div>
                <div>
                  <label className="label-he">شناسه ملی شرکت (اختیاری)</label>
                  <input 
                    name="nationalId" 
                    value={formData.nationalId} 
                    onChange={handleChange} 
                    type="text" 
                    className="input-he" 
                    placeholder="مثال: 1400..." 
                  />
                </div>
              </div>

              <div>
                <label className="label-he">شهر دفتر مرکزی</label>
                <div className="relative">
                  <input 
                    required 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange} 
                    type="text" 
                    className="input-he pr-9" 
                    placeholder="مثال: اصفهان" 
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className="label-he">درباره شرکت و توانمندی‌های اجرایی</label>
                <textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  rows={2} 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all resize-none" 
                  placeholder="خلاصه‌ای از رزومه، استانداردهای فنی و پروژه‌های اجراشده..."
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-he">شماره تماس نماینده شرکت</label>
              <div className="relative">
                <input 
                  required 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  type="tel" 
                  dir="ltr" 
                  className="input-he pl-9 text-left" 
                  placeholder="0912..." 
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
            
            <div>
              <label className="label-he">رمز عبور حساب</label>
              <div className="relative">
                <input 
                  required 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  type="password" 
                  dir="ltr" 
                  className="input-he pl-9 text-left" 
                  placeholder="********" 
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-he-primary w-full"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'ورود به پنل پیمانکار' : 'ثبت شرکت در شبکه مجریان'}</span>
                  <ArrowLeft size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <Link to="/customer-login" className="hover:text-[#0284C7] transition-colors">
            ورود مشتریان حقیقی و کارفرمایان
          </Link>
          <Link to="/vendor-auth" className="hover:text-[#0284C7] transition-colors">
            پرتال تأمین‌کنندگان
          </Link>
        </div>

      </div>
    </div>
  );
}
