import React from "react";
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, ArrowLeft, KeySquare, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
      setError('لطفاً یک شماره موبایل معتبر وارد کنید.');
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
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4" style={{
      backgroundImage: `url('https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2072&auto=format&fit=crop')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 border border-gray-100 shadow-sm">
            <img 
              src="/src/assets/images/solar_app_logo_1786611269806.jpg" 
              alt="هوشیار انرژی - لوگو" 
              className="w-full h-full object-cover scale-[1.35] transition-transform"
            />
          </div>
          <h1 className="text-2xl font-black text-[#1A1D23] mb-2">
            ورود به هوشیار انرژی
          </h1>
          <p className="text-[#5A6072] text-sm">
            {step === 'phone' ? 'برای استفاده از خدمات، شماره موبایل خود را وارد کنید.' : 'کد پیامک شده به شماره خود را وارد کنید.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">شماره موبایل</label>
              <div className="relative">
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border-2 border-[#E4E7EC] rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-[#1F9254] transition-colors" 
                  placeholder="0912..."
                  dir="ltr"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-[#1A1D23] text-white rounded-xl text-sm font-black hover:bg-black transition-colors mt-6 shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  ارسال کد تایید
                  <ArrowLeft size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1A1D23] mb-1.5">کد تایید (۴ رقم)</label>
              <div className="relative">
                <KeySquare size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6072]" />
                <input 
                  type="text" 
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={4}
                  className="w-full border-2 border-[#E4E7EC] rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-[#1F9254] transition-colors text-center font-bold tracking-widest text-lg" 
                  placeholder="- - - -"
                  dir="ltr"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-[#1F9254] text-white rounded-xl text-sm font-black hover:bg-[#167643] transition-colors mt-6 shadow-[0_4px_12px_rgba(31,146,84,0.3)] flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  ورود به سیستم
                  <ArrowLeft size={18} />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full py-2 text-sm text-[#5A6072] hover:text-[#1A1D23] transition-colors font-medium"
            >
              ویرایش شماره موبایل
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
