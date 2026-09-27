import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

interface Props {
  monthlyConsumption: number;
  monthlyGeneration: number;
}

export default function EnergyEfficiencyChart({ monthlyConsumption, monthlyGeneration }: Props) {
  // Generate data for 12 months with some seasonal variation
  const data = [
    { name: 'فروردین', 'مصرف شما': monthlyConsumption * 0.9, 'تولید خورشیدی': monthlyGeneration * 1.1 },
    { name: 'اردیبهشت', 'مصرف شما': monthlyConsumption * 0.85, 'تولید خورشیدی': monthlyGeneration * 1.2 },
    { name: 'خرداد', 'مصرف شما': monthlyConsumption * 0.95, 'تولید خورشیدی': monthlyGeneration * 1.3 },
    { name: 'تیر', 'مصرف شما': monthlyConsumption * 1.3, 'تولید خورشیدی': monthlyGeneration * 1.35 },
    { name: 'مرداد', 'مصرف شما': monthlyConsumption * 1.4, 'تولید خورشیدی': monthlyGeneration * 1.3 },
    { name: 'شهریور', 'مصرف شما': monthlyConsumption * 1.2, 'تولید خورشیدی': monthlyGeneration * 1.2 },
    { name: 'مهر', 'مصرف شما': monthlyConsumption * 0.9, 'تولید خورشیدی': monthlyGeneration * 1.0 },
    { name: 'آبان', 'مصرف شما': monthlyConsumption * 0.8, 'تولید خورشیدی': monthlyGeneration * 0.8 },
    { name: 'آذر', 'مصرف شما': monthlyConsumption * 0.85, 'تولید خورشیدی': monthlyGeneration * 0.7 },
    { name: 'دی', 'مصرف شما': monthlyConsumption * 1.1, 'تولید خورشیدی': monthlyGeneration * 0.65 },
    { name: 'بهمن', 'مصرف شما': monthlyConsumption * 1.0, 'تولید خورشیدی': monthlyGeneration * 0.75 },
    { name: 'اسفند', 'مصرف شما': monthlyConsumption * 0.9, 'تولید خورشیدی': monthlyGeneration * 0.9 },
  ].map(d => ({
    name: d.name,
    'مصرف شما': Math.round(d['مصرف شما']),
    'تولید خورشیدی': Math.round(d['تولید خورشیدی'])
  }));

  const efficiency = monthlyConsumption > 0 ? Math.min(100, Math.round((monthlyGeneration / monthlyConsumption) * 100)) : 0;

  return (
    <section className="col-span-12 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E4E7EC] p-6 shadow-sm flex flex-col mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 rounded-xl flex items-center justify-center">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100 tracking-tight">تحلیل بهره‌وری انرژی</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">مقایسه مصرف شما با تولید سیستم پیشنهادی در طول سال</p>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/50 px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">پوشش سالانه:</span>
          <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">٪{efficiency}</span>
        </div>
      </div>
      
      <div className="w-full h-[300px] font-Vazirmatn" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717A' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717A' }} dx={-10} />
            <Tooltip 
              cursor={{ fill: '#F4F4F5' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'right' }}
              itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
              labelStyle={{ fontSize: '12px', color: '#5A6072', marginBottom: '4px', textAlign: 'right' }}
              formatter={(value: number, name: string) => [`${value} kWh`, name]}
              labelFormatter={(label) => `ماه ${label}`}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
            <Bar dataKey="تولید خورشیدی" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationBegin={200} animationDuration={1500} animationEasing="ease-out" />
            <Bar dataKey="مصرف شما" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} animationBegin={400} animationDuration={1500} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
