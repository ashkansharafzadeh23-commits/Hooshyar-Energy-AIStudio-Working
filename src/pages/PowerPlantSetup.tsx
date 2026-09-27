import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { provinces } from '../config/cities';
import { ArrowLeft, ArrowRight, Sun, Loader2, MapPin, Maximize, Wallet, CheckCircle, Building2, Star, Phone, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdBanner } from '../components/AdBanner';
import { PanelComparison } from '../components/PanelComparison';
import Markdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

export default function PowerPlantSetup() {
  const [formData, setFormData] = useState<any>({
    area: '',
    province: 'تهران',
    city: 'تهران',
    budget: '',
    budgetUnit: 'million',
    connectionType: 'on-grid',
    roofType: 'flat',
    phase: '3-phase'
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [isSent, setIsSent] = useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [result]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze-powerplant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
            const data = await response.json();
      setResult(data.analysis);
      setFinancialData(data.financialData || []);
    } catch (error) {
      console.error(error);
      setResult('خطا در برقراری ارتباط با سرور. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-Vazirmatn flex flex-col p-4 md:p-6 gap-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-4xl mx-auto w-full">
        <div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D23] flex items-center gap-2">
            <Sun className="text-amber-500" size={32} />
            احداث نیروگاه برق خورشیدی
          </h1>
          <p className="text-[#5A6072] mt-1 font-medium">نقشه راه جامع برای تاسیس و فروش برق به شبکه</p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E4E7EC]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">مساحت زمین/سقف (متر مربع)</label>
                <div className="relative">
                  <input required name="area" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} type="number" dir="ltr" className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-medium text-gray-800 text-right" placeholder="مثال: 5000" />
                  <Maximize className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">استان</label>
                  <div className="relative">
                    <select
                      value={formData.province || 'تهران'}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        const p = provinces.find(x => x.name === newProv);
                        setFormData({...formData, province: newProv, city: p.cities[0]});
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-medium text-gray-800 appearance-none bg-white"
                    >
                      {provinces.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">شهر</label>
                  <div className="relative">
                    <select
                      value={formData.city || 'تهران'}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-medium text-gray-800 appearance-none bg-white"
                    >
                      {provinces.find(p => p.name === (formData.province || 'تهران'))?.cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">بودجه تقریبی</label>
                <div className="flex relative rounded-xl border border-gray-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200 transition-all overflow-hidden bg-white">
                  <select 
                    value={formData.budgetUnit} 
                    onChange={e => setFormData({...formData, budgetUnit: e.target.value})}
                    className="bg-gray-50 border-l border-gray-200 px-3 py-3 text-sm font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="million">میلیون تومان</option>
                    <option value="billion">میلیارد تومان</option>
                  </select>
                  <input required name="budget" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} type="number" dir="ltr" className="flex-1 px-4 py-3 outline-none font-medium text-gray-800 text-right" placeholder="مثال: 2000" />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Wallet size={18} />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">نوع اتصال به شبکه</label>
                <select 
                  value={formData.connectionType}
                  onChange={e => setFormData({...formData, connectionType: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-medium text-gray-800 bg-white"
                >
                  <option value="on-grid">متصل به شبکه (On-Grid) - فروش برق</option>
                  <option value="off-grid">منفصل از شبکه (Off-Grid) - تامین برق شخصی</option>
                  <option value="hybrid">هیبرید (Hybrid) - ترکیب هر دو</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">محل نصب پنل‌ها</label>
                <select 
                  value={formData.roofType}
                  onChange={e => setFormData({...formData, roofType: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-medium text-gray-800 bg-white"
                >
                  <option value="flat">سقف مسطح (ایزوگام/موزاییک)</option>
                  <option value="sloped">سقف شیب‌دار (شیروانی/سفال)</option>
                  <option value="ground">نصب روی زمین (پایه کوبی)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">فاز شبکه برق محلی</label>
                <select 
                  value={formData.phase}
                  onChange={e => setFormData({...formData, phase: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-medium text-gray-800 bg-white"
                >
                  <option value="3-phase">سه فاز (صنعتی / مجتمع)</option>
                  <option value="1-phase">تک فاز (خانگی)</option>
                </select>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl text-lg font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? (
                <><Loader2 className="animate-spin" size={24} /> در حال تحلیل و پردازش...</>
              ) : (
                <><Sun size={24} /> دریافت نقشه راه جامع</>
              )}
            </button>
          </form>
        </div>

        {result && (
          <motion.div ref={resultRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E4E7EC] mt-4">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                <CheckCircle size={28} />
              </div>
              <h2 className="text-2xl font-black text-gray-800">نقشه راه و تحلیل احداث نیروگاه</h2>
            </div>
            
            <div className="prose prose-lg prose-amber max-w-none font-Vazirmatn leading-relaxed text-gray-700 prose-headings:font-black prose-headings:text-gray-900 prose-strong:text-amber-700 text-right" dir="rtl">
              <Markdown>{result}</Markdown>
            </div>
          </motion.div>
        )}
      
        {financialData && financialData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E4E7EC] mt-6">
            <h2 className="text-xl font-black text-gray-800 mb-6 border-b border-gray-100 pb-4">پیش‌بینی مالی ۱۰ ساله (ارقام به میلیون تومان)</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="h-80 w-full">
                <h3 className="text-sm font-bold text-gray-600 mb-4 text-center">روند بازگشت سرمایه و سود تجمعی</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <RechartsTooltip formatter={(value) => [`${value} میلیون تومان`, 'سود تجمعی']} />
                    <Area type="monotone" dataKey="cumulativeProfit" stroke="#10b981" fill="#d1fae5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="h-80 w-full">
                <h3 className="text-sm font-bold text-gray-600 mb-4 text-center">مقایسه درآمد و هزینه نگهداری سالیانه</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <RechartsTooltip formatter={(value, name) => [`${value} میلیون تومان`, name === 'revenue' ? 'درآمد' : 'هزینه نگهداری']} />
                    <Legend />
                    <Bar dataKey="revenue" name="درآمد" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maintenance" name="هزینه نگهداری" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 rounded-tr-xl">سال</th>
                    <th className="px-4 py-3">درآمد ناخالص</th>
                    <th className="px-4 py-3">هزینه نگهداری</th>
                    <th className="px-4 py-3">سود خالص</th>
                    <th className="px-4 py-3 rounded-tl-xl">سود تجمعی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {financialData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-800">{row.year}</td>
                      <td className="px-4 py-3 text-emerald-600">{row.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-500">{row.maintenance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-blue-600 font-bold">{row.netProfit.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-800 font-black" dir="ltr">{row.cumulativeProfit.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}


        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E4E7EC] mt-6">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Building2 size={28} />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-800">شرکت‌های پیشنهادی برای احداث (EPC)</h2>
              </div>
              <Link to="/contractors" className="hidden sm:flex text-sm font-bold text-blue-600 hover:text-blue-700 items-center gap-1">
                مشاهده همه
                <ArrowLeft size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'توسعه انرژی خورشیدی مهر', city: 'تهران', rating: 4.8, type: 'EPC صنعتی' },
                { name: 'نیروپژوهان راد', city: 'اصفهان', rating: 4.6, type: 'سوله و خانگی' }
              ].map((c, i) => (
                <div key={i} className="border border-gray-200 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-300 transition-colors bg-gray-50/50">
                  <div className="mb-4">
                    <h3 className="font-bold text-gray-800 text-lg mb-1">{c.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><MapPin size={14}/> {c.city}</span>
                      <span className="flex items-center gap-1 text-amber-500 font-bold"><Star size={14} className="fill-amber-500"/> {c.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded-md">{c.type}</span>
                    <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Phone size={14} /> تماس
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/contractors" className="mt-6 flex sm:hidden w-full justify-center text-sm font-bold text-blue-600 bg-blue-50 py-3 rounded-xl hover:bg-blue-100 items-center gap-1">
              مشاهده همه شرکت‌ها
              <ArrowLeft size={16} />
            </Link>
          </motion.div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center justify-center bg-white p-6 rounded-3xl border border-blue-100 shadow-sm text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">ثبت درخواست در داشبورد</h3>
            <p className="text-gray-600 mb-6 max-w-lg">
              کاربر گرامی، در صورت تمایل می‌توانید مشخصات نیروگاه خود را در داشبورد ثبت کنید تا برای شرکت‌های مجری (EPC) ارسال شود و آن‌ها پیشنهاد خود را به شما اعلام کنند. 
              اطلاعات تماس شما نزد ما محفوظ می‌ماند.
            </p>
            <button 
              onClick={() => {
                let requests = [];
                try {
                  const raw = localStorage.getItem('epc_requests');
                  requests = raw ? JSON.parse(raw) : [];
                } catch (e) { console.error(e); }
                const newReq = {
                  id: Date.now().toString(),
                  userId: 'user_1',
                  ...formData,
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                  replies: []
                };
                requests.push(newReq);
                localStorage.setItem('epc_requests', JSON.stringify(requests));
                setIsSent(true);
              }}
              disabled={isSent}
              className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-colors shadow-md ${isSent ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'}`}
            >
              {isSent ? <CheckCircle size={24} /> : <Send size={24} />}
              {isSent ? 'درخواست شما در داشبورد ثبت و برای شرکت‌ها ارسال شد' : 'ثبت درخواست احداث برای شرکت‌های مجری (EPC)'}
            </button>
            {isSent && (
              <Link to="/user-dashboard" className="mt-4 text-blue-600 font-bold hover:underline flex items-center gap-1">
                ورود به داشبورد من <ArrowLeft size={16} />
              </Link>
            )}
          </motion.div>
        )}

      </main>
      
      <div className="max-w-4xl mx-auto w-full"><AdBanner layout="banner" /></div>
    </div>
  );
}
