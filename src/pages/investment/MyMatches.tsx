import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProjectMatch, InvestmentOpportunity } from '../../types/investment';
import { Loader2, ArrowLeft, Target, Percent } from 'lucide-react';

export default function MyMatches() {
  const [matches, setMatches] = useState<(ProjectMatch & { opportunity?: InvestmentOpportunity })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem('token');
      // 1. Generate if none
      await fetch('/api/investment/matches/generate', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      
      // 2. Fetch matches
      const res = await fetch('/api/investment/matches/me', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        
        // Populate opportunity details for demo
        const populated = await Promise.all(data.map(async (m: ProjectMatch) => {
          const oppRes = await fetch(`/api/investment/opportunities/${m.opportunityId}`);
          if (oppRes.ok) {
            return { ...m, opportunity: await oppRes.json() };
          }
          return m;
        }));
        
        setMatches(populated.sort((a, b) => b.score - a.score));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-fuchsia-500" size={40} /></div>;

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 font-Vazirmatn">
      <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">داشبورد تطابق سرمایه‌گذاری</h1>
          <p className="text-gray-500">فرصت‌های پیشنهادی بر اساس پروفایل ریسک و سرمایه شما</p>
        </div>
        <Link to="/investment-hub/opportunities" className="text-blue-600 font-bold flex items-center gap-2 hover:text-blue-800 transition-colors">
          بازار فرصت‌ها <ArrowLeft size={16} />
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
          <Target className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">هنوز فرصت متناسبی یافت نشده است</h3>
          <p className="text-gray-500 mb-6">سیستم در حال رصد پروژه‌های جدید است.</p>
          <Link to="/investment-hub/investor-profile" className="text-blue-600 font-bold hover:underline">
            ویرایش پروفایل سرمایه‌گذاری
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
              
              <div className="md:w-32 flex flex-col items-center justify-center bg-fuchsia-50 rounded-xl border border-fuchsia-100 p-4">
                <Percent className="text-fuchsia-500 mb-1" size={24} />
                <div className="text-3xl font-black text-fuchsia-900" dir="ltr">{m.score}%</div>
                <div className="text-xs text-fuchsia-600 font-bold mt-1 text-center">تطابق هوشمند</div>
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    <Link to={`/investment-hub/opportunities/${m.opportunityId}`} className="hover:text-blue-600 transition-colors">
                      {m.opportunity?.title || 'پروژه ناشناس'}
                    </Link>
                  </h3>
                  <span className="px-2 py-1 bg-gray-100 text-xs font-bold rounded-md text-gray-600">
                    کد: {m.opportunity?.opportunityCode}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {m.opportunity?.summary}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  <div className="text-xs text-gray-500">سرمایه: <strong className="text-gray-800">{m.scoreBreakdown.capitalFit}%</strong></div>
                  <div className="text-xs text-gray-500">مکان: <strong className="text-gray-800">{m.scoreBreakdown.locationFit}%</strong></div>
                  <div className="text-xs text-gray-500">ریسک: <strong className="text-gray-800">{m.scoreBreakdown.riskFit}%</strong></div>
                  <div className="text-xs text-gray-500">آمادگی: <strong className="text-gray-800">{m.scoreBreakdown.readinessFit}%</strong></div>
                </div>

                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2">
                  <strong>تحلیل انطباق معیارها:</strong>
                  این فرصت به دلیل هماهنگی بالا با محدوده سرمایه و تحمل ریسک شما پیشنهاد شده است.
                </div>
              </div>
              
              <div className="md:w-48 flex flex-col justify-center gap-2">
                <Link to={`/investment-hub/opportunities/${m.opportunityId}`} className="w-full text-center bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  مشاهده جزئیات
                </Link>
                {m.status === 'SUGGESTED' || m.status === 'VIEWED' ? (
                  <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    اعلام علاقه‌مندی
                  </button>
                ) : (
                  <button disabled className="w-full bg-emerald-100 text-emerald-800 font-bold py-2 rounded-lg border border-emerald-200">
                    درخواست ارسال شد
                  </button>
                )}
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
