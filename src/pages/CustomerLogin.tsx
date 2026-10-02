import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Phone, ArrowLeft, KeySquare, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CustomerLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Read target redirect or fallback
  const queryParams = new URLSearchParams(location.search);
  const redirectTarget = queryParams.get('redirect') || '/user-dashboard';

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (phone.length < 10) {
      setError('لطفاً یک شماره موبایل معتبر ۱۰ رقمی وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ارسال کد تایید');
      }
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'خطا در ارسال کد تایید');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 4) {
      setError('کد تایید باید ۴ رقم باشد.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'کد تایید نادرست است');
      }

      login(data.token, data.user);
      navigate(redirectTarget);
    } catch (err: any) {
      setError(err?.message || 'کد تایید نادرست است');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Architectural Card Surface */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 border border-slate-200 dark:border-slate-800 shadow-xs bg-amber-500/10 flex items-center justify-center">
            <img 
              src="/src/assets/images/solar_app_logo_1786611269806.jpg" 
              alt="هوشیار انرژی" 
              className="w-full h-full object-cover scale-125"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            ورود به هوشیار انرژی
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {step === 'phone' 
              ? 'برای دسترسی به پیشخوان، پروژه‌ها و امکان‌سنجی، شماره موبایل خود را وارد نمایید.' 
              : `کد پیامک‌شده به شماره ${phone} را وارد نمایید.`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Step 1: Phone */}
        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
                شماره موبایل
              </label>
              <div className="relative">
                <input 
                  type="tel" 
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] h-11 px-3.5 py-2.5 pl-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all text-left" 
                  placeholder="09123456789"
                  dir="ltr"
                />
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 text-right">
                کد یک‌بار مصرف ورود (OTP) برای این شماره پیامک خواهد شد.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white rounded-xl text-sm font-bold shadow-xs hover:shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>ارسال کد تأیید</span>
                  <ArrowLeft size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: OTP */
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-right">
                کد تأیید ۴ رقمی
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  autoFocus
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full min-h-[44px] h-12 px-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-center text-xl font-mono font-bold tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all" 
                  placeholder="- - - -"
                  dir="ltr"
                />
                <KeySquare size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-sm font-bold shadow-xs transition-all flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>تأیید و ورود به سامانه</span>
                  <ArrowLeft size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setError(null); }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium text-center"
            >
              ویرایش شماره موبایل
            </button>
          </form>
        )}

        {/* Partner Ecosystem Gateways */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            ورود همکاران و متخصصان:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link 
              to="/contractor-auth" 
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#0284C7] dark:hover:text-blue-400 transition-colors font-medium"
            >
              شرکت‌های EPC
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link 
              to="/vendor-auth" 
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#0284C7] dark:hover:text-blue-400 transition-colors font-medium"
            >
              تأمین‌کنندگان
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link 
              to="/technician-auth" 
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#0284C7] dark:hover:text-blue-400 transition-colors font-medium"
            >
              تعمیرکاران
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
