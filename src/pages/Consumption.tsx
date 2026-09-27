import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { calculateDailyConsumption } from '../api/engine';
import { ArrowLeft, Zap, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdBanner } from '../components/AdBanner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ConsumptionPage() {
  const { state, updateState } = useAppContext();
  const navigate = useNavigate();

  const [actualMonthly, setActualMonthly] = useState<string>(state.actualMonthlyKwh ? String(state.actualMonthlyKwh) : '');

  const dailyKwh = useMemo(() => {
    return calculateDailyConsumption(state.appliances, state.locationType || 'residential');
  }, [state.appliances, state.locationType]);

  const monthlyKwh = dailyKwh * 30;

  const handleSubmit = () => {
    if (actualMonthly) {
      updateState({ actualMonthlyKwh: Number(actualMonthly) });
    } else {
      updateState({ actualMonthlyKwh: null });
    }
    
    if (state.targets.includes('auto')) {
      navigate('/recommendation');
    } else {
      navigate('/result');
    }
  };

  const chartData = [
    {
      name: 'تخمین سیستم',
      value: Math.round(monthlyKwh),
      color: '#3b82f6'
    },
    ...(actualMonthly && Number(actualMonthly) > 0 ? [{
      name: 'مقدار قبض',
      value: Number(actualMonthly),
      color: '#10b981'
    }] : [])
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto pt-10"
    >
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-900/30 rounded-full -ml-10 -mb-10 blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
              <Zap size={32} />
            </div>
            <h2 className="text-xl font-medium mb-2 opacity-90">تخمین مصرف برق شما</h2>
            <div className="text-5xl font-bold mb-2">
              {dailyKwh.toFixed(1)} <span className="text-xl font-normal opacity-80">kWh/روز</span>
            </div>
            <div className="text-lg opacity-90">
              ماهانه: {monthlyKwh.toFixed(0)} کیلووات‌ساعت
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-gray-600 text-center">
            این عدد بر اساس لوازمی که انتخاب کردید (یا متراژ) محاسبه شده است. 
            برای دقت بیشتر در پیشنهاد سیستم، می‌توانید مصرف دقیق قبض برق خود را وارد کنید.
          </p>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <label className="block font-medium mb-2 text-blue-900">مصرف ماهانه واقعی (از روی قبض):</label>
            <div className="flex gap-2">
              <input 
                type="number"
                value={actualMonthly}
                onChange={(e) => setActualMonthly(e.target.value)}
                placeholder="اختیاری (مثلاً ۳۰۰)"
                className="flex-1 border-2 border-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400 bg-white shadow-sm"
              />
              <span className="flex items-center px-4 bg-white rounded-xl border border-white text-gray-500 shadow-sm">kWh</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-gray-800">
              <BarChart2 className="text-blue-500" />
              <h3 className="font-bold text-lg">تحلیل و مقایسه مصرف ماهانه</h3>
            </div>
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontFamily: 'Vazirmatn, sans-serif', fill: '#6b7280' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontFamily: 'Vazirmatn, sans-serif', fill: '#6b7280' }} 
                    axisLine={false} 
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{ fontFamily: 'Vazirmatn, sans-serif', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f3f4f6' }}
                    formatter={(value: number) => [`${value} kWh`, 'مقدار مصرف']}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true} 
                    animationBegin={200} 
                    animationDuration={1500} 
                    animationEasing="ease-out"
                    maxBarSize={80}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all w-full justify-center"
            >
              دریافت نتیجه تحلیل
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-8 w-full max-w-4xl mx-auto"><AdBanner layout="card" /></div>
    </motion.div>
  );
}
