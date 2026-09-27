import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function InvestorProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    investorType: string;
    capitalMin: number | '';
    capitalMax: number | '';
    preferredProvinces: string[];
    riskPreference: string;
    targetReturnPreference: string;
  }>({
    investorType: 'INDIVIDUAL',
    capitalMin: '',
    capitalMax: '',
    preferredProvinces: ['ALL'],
    riskPreference: 'BALANCED',
    targetReturnPreference: ''
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.capitalMin === '' || Number(formData.capitalMin) <= 0) {
      setErrorMessage('لطفاً حداقل سرمایه مدنظر را به تومان وارد نمایید.');
      return;
    }
    if (formData.capitalMax === '' || Number(formData.capitalMax) < Number(formData.capitalMin)) {
      setErrorMessage('حداکثر سرمایه باید بزرگتر یا مساوی حداقل سرمایه باشد.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/investment/investor-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          capitalMin: Number(formData.capitalMin),
          capitalMax: Number(formData.capitalMax),
          currency: 'IRR',
          preferredProjectStages: ['ALL'],
          preferredTechnologies: ['SOLAR'],
          requiresLandVerified: false,
          requiresFinancialModel: false,
          requiresEpcSelected: false,
          status: 'ACTIVE'
        })
      });
      if (res.ok) {
        navigate('/investment-hub/matches');
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'خطا در ثبت پروفایل سرمایه‌گذار');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'خطا در اتصال به سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 font-Vazirmatn">
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900 mb-6">ایجاد پروفایل سرمایه‌گذاری</h1>
        <p className="text-gray-500 mb-8 text-sm">
          این اطلاعات به موتور تطابق هوشیار کمک می‌کند تا بهترین فرصت‌های سرمایه‌گذاری را متناسب با ترجیحات شما پیشنهاد دهد. اطلاعات مالی شما محرمانه باقی می‌ماند.
        </p>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">نوع سرمایه‌گذار</label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={formData.investorType}
              onChange={e => setFormData({...formData, investorType: e.target.value})}
            >
              <option value="INDIVIDUAL">شخص حقیقی</option>
              <option value="COMPANY">شرکت / حقوقی</option>
              <option value="FUND">صندوق سرمایه‌گذاری</option>
              <option value="FAMILY_OFFICE">سبدگردان / Family Office</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">حداقل سرمایه (تومان) *</label>
              <input 
                type="number" 
                placeholder="مثال: ۵۰۰،۰۰۰،۰۰۰"
                className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
                value={formData.capitalMin}
                onChange={e => setFormData({...formData, capitalMin: e.target.value === '' ? '' : Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">حداکثر سرمایه (تومان) *</label>
              <input 
                type="number" 
                placeholder="مثال: ۵،۰۰۰،۰۰۰،۰۰۰"
                className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
                value={formData.capitalMax}
                onChange={e => setFormData({...formData, capitalMax: e.target.value === '' ? '' : Number(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ریسک‌پذیری</label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={formData.riskPreference}
              onChange={e => setFormData({...formData, riskPreference: e.target.value})}
            >
              <option value="CONSERVATIVE">محافظه‌کار (پروژه‌های آماده احداث / کم‌ریسک)</option>
              <option value="BALANCED">متعادل</option>
              <option value="GROWTH">رشد (پروژه‌های مراحل اولیه / پرریسک)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70"
          >
            {loading ? 'در حال ثبت...' : 'ثبت پروفایل و جستجوی فرصت‌ها'}
          </button>
        </form>
      </div>
    </div>
  );
}
