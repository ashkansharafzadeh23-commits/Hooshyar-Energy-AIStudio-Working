import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Phone, Lock, Building, MapPin, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    <div className="w-full max-w-xl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        
        {/* Brand & Context Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-[#0284C7] dark:text-blue-400 mx-auto mb-3 flex items-center justify-center shadow-xs">
            <Store size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            ورود و ثبت‌نام تأمین‌کنندگان و فروشندگان تجهیزات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ارائه پنل، اینورتر، سازه و مدیریت سفارشات و استعلام‌های تجاری
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
            ورود به حساب فروشگاه
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
            ثبت‌نام فروشگاه جدید
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
                <label className="label-he">نام فروشگاه یا شرکت بازرگانی</label>
                <div className="relative">
                  <input 
                    required 
                    name="companyName" 
                    value={formData.companyName} 
                    onChange={handleChange} 
                    type="text" 
                    className="input-he pl-9" 
                    placeholder="مثال: پارس سولار نوین" 
                  />
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className="label-he">نام و نام خانوادگی مدیر فروش / رابط</label>
                <input 
                  required 
                  name="managerName" 
                  value={formData.managerName} 
                  onChange={handleChange} 
                  type="text" 
                  className="input-he" 
                  placeholder="مثال: محمد حسینی" 
                />
              </div>

              <div>
                <label className="label-he">دسته تجهیزات اصلی</label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleChange} 
                  className="input-he appearance-none"
                >
                  <option value="پنل و تجهیزات خورشیدی">پنل و تجهیزات خورشیدی</option>
                  <option value="اینورتر و مبدل‌های برق">اینورتر و مبدل‌های برق</option>
                  <option value="باتری و سیستم‌های ذخیره‌ساز">باتری و سیستم‌های ذخیره‌ساز</option>
                  <option value="کابل، اتصالات و تابلو حفاظت">کابل، اتصالات و تابلو حفاظت</option>
                  <option value="استراکچر و سازه خورشیدی">استراکچر و سازه خورشیدی</option>
                </select>
              </div>
              
              <div>
                <label className="label-he">شهر و استان</label>
                <div className="relative">
                  <input 
                    required 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange} 
                    type="text" 
                    className="input-he pl-9" 
                    placeholder="مثال: تهران" 
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-he">شماره موبایل</label>
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
              <label className="label-he">رمز عبور</label>
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
                  <span>{isLogin ? 'ورود به پورتال تأمین‌کنندگان' : 'ثبت فروشگاه در پلتفرم'}</span>
                  <ArrowLeft size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <Link to="/customer-login" className="hover:text-[#0284C7] transition-colors">
            ورود خریداران و کارفرمایان
          </Link>
          <Link to="/contractor-auth" className="hover:text-[#0284C7] transition-colors">
            ورود شرکت‌های EPC
          </Link>
        </div>

      </div>
    </div>
  );
}
