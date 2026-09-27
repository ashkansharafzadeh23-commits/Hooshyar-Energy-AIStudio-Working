import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Zap, Shield, TrendingDown, DollarSign, Activity } from 'lucide-react';

const panelData = [
  { id: 'longi', name: 'لونجی (LONGi)', efficiency: 22.8, lifespan: 30, degradation: 0.45, pricePerWatt: 11000, color: '#ef4444' },
  { id: 'jinko', name: 'جینکو (Jinko)', efficiency: 22.5, lifespan: 25, degradation: 0.55, pricePerWatt: 10500, color: '#3b82f6' },
  { id: 'trina', name: 'ترینا (Trina)', efficiency: 22.0, lifespan: 25, degradation: 0.55, pricePerWatt: 10000, color: '#10b981' },
  { id: 'canadian', name: 'کاندین (Canadian)', efficiency: 21.8, lifespan: 25, degradation: 0.60, pricePerWatt: 9500, color: '#f59e0b' },
  { id: 'ae', name: 'آ.ا (AE Solar)', efficiency: 21.5, lifespan: 30, degradation: 0.50, pricePerWatt: 12000, color: '#8b5cf6' },
];

export function PanelComparison() {
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  // Prepare data for 25-year performance projection
  const projectionData = [0, 5, 10, 15, 20, 25].map(year => {
    const dataPoint: any = { year: `سال ${year}` };
    panelData.forEach(panel => {
      // Calculate efficiency after N years
      let eff = panel.efficiency;
      if (year > 0) {
        // First year degradation is usually higher (e.g., 2%), then linear
        eff = eff * (1 - 0.02) * Math.pow(1 - panel.degradation / 100, year - 1);
      }
      dataPoint[panel.id] = parseFloat(eff.toFixed(2));
    });
    return dataPoint;
  });

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E4E7EC] mt-6 font-Vazirmatn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
            <Activity size={28} />
          </div>
          <h2 className="text-xl font-black text-gray-800">مقایسه تحلیلی برندهای پنل خورشیدی</h2>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            نمودار مقایسه‌ای
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            جدول مشخصات
          </button>
        </div>
      </div>

      {activeTab === 'chart' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80 w-full">
              <h3 className="text-sm font-bold text-gray-600 mb-4 text-center">راندمان اولیه پنل‌ها (%)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={panelData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" domain={[20, 24]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#555' }} width={110} />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'راندمان']} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="efficiency" radius={[0, 4, 4, 0]} barSize={24}>
                    {panelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-80 w-full">
              <h3 className="text-sm font-bold text-gray-600 mb-4 text-center">قیمت تقریبی به ازای هر وات (تومان)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={panelData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#555' }} width={110} />
                  <Tooltip formatter={(value: any) => [`${value.toLocaleString()} تومان`, 'قیمت هر وات']} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="pricePerWatt" radius={[0, 4, 4, 0]} barSize={24}>
                    {panelData.map((entry, index) => (
                      <Cell key={`cell-price-${index}`} fill="#fbbf24" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="h-96 w-full pt-4 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-6 text-center">افت راندمان در طول ۲۵ سال (مدل‌سازی)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                 <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                 <YAxis domain={[18, 24]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                 <Tooltip formatter={(value: any, name: any) => [`${value}%`, panelData.find(p => p.id === name)?.name || name]} />
                 <Legend wrapperStyle={{ paddingTop: '20px' }} />
                 {panelData.map(panel => (
                   <Bar key={panel.id} dataKey={panel.id} name={panel.name} fill={panel.color} radius={[4, 4, 0, 0]} />
                 ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 rounded-tr-xl">برند سازنده</th>
                <th className="px-4 py-4">راندمان (%)</th>
                <th className="px-4 py-4">افت سالانه (%)</th>
                <th className="px-4 py-4">طول عمر اسمی</th>
                <th className="px-4 py-4 rounded-tl-xl">حدود قیمت هر وات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {panelData.map((panel, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: panel.color }}></div>
                    {panel.name}
                  </td>
                  <td className="px-4 py-4 text-emerald-600 font-bold">{panel.efficiency}%</td>
                  <td className="px-4 py-4 text-red-500">{panel.degradation}%</td>
                  <td className="px-4 py-4 text-blue-600">{panel.lifespan} سال</td>
                  <td className="px-4 py-4 text-gray-800">{panel.pricePerWatt.toLocaleString()} تومان</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            * توجه: قیمت‌ها به صورت تقریبی و مربوط به توان‌های رایج (مثل ۵۵۰ وات) در بازار ایران محاسبه شده است. افت راندمان بر اساس کاتالوگ سازنده (STC) می‌باشد و در شرایط واقعی ممکن است متفاوت باشد.
          </p>
        </motion.div>
      )}
    </div>
  );
}
