import React, { useState } from 'react';
import { Bot, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { usePlacementStore } from '../../store/usePlacementStore';

export function AILayoutOptimizer() {
  const [width, setWidth] = useState('10');
  const [length, setLength] = useState('10');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  
  const { clearPanels, addPanel } = usePlacementStore();

  const handleOptimize = async () => {
    if (!width || !length || Number(width) <= 0 || Number(length) <= 0) {
      setError('ابعاد واردشده نامعتبر است.');
      return;
    }
    if (Number(width) > 50 || Number(length) > 50) {
      setError('حداکثر ابعاد مجاز ۵۰ متر است.');
      return;
    }
    
    setError(null);
    setIsOptimizing(true);
    setRecommendation(null);
    
    try {
      const res = await fetch('/api/energy/optimize-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width: Number(width), length: Number(length) })
      });
      
      if (!res.ok) throw new Error('API Error');
      
      const data = await res.json();
      
      if (data.panels && Array.isArray(data.panels)) {
        clearPanels();
        data.panels.forEach((p: any, idx: number) => {
          addPanel({
            id: p.id || `ai_panel_${idx + 1}`,
            position: [p.x, 0.5, p.z],
            rotation: p.rotation || [0, 0, 0],
            efficiency: undefined,
            renderingCoefficient: 1.0,
          });
        });
      }
      
      if (data.recommendationText) {
        setRecommendation(data.recommendationText);
      }
      
    } catch (err) {
      console.error(err);
      setError('ارتباط با سرویس جانمایی خودکار برقرار نشد.');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
          <Bot size={15} className="text-blue-600" />
          <span>جانمایی اولیه خودکار</span>
        </h3>
        <span className="text-[10px] text-slate-400">برآورد شبکه ماژول</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">عرض سقف (متر)</label>
          <input 
            type="number" 
            value={width} 
            onChange={(e) => setWidth(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono min-h-[40px]"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">طول سقف (متر)</label>
          <input 
            type="number" 
            value={length} 
            onChange={(e) => setLength(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono min-h-[40px]"
            dir="ltr"
          />
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-1.5 text-rose-600 text-xs bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <button 
        type="button"
        onClick={handleOptimize}
        disabled={isOptimizing}
        className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-xs shadow-xs cursor-pointer"
      >
        {isOptimizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        <span>تولید چیدمان خودکار ماژول‌ها</span>
      </button>
      
      {recommendation && (
        <div className="mt-2 bg-blue-50 dark:bg-blue-950/50 p-3 rounded-xl border border-blue-100 dark:border-blue-900">
          <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
