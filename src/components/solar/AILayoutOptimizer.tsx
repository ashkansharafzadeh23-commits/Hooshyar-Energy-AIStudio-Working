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
      setError('ابعاد نامعتبر است.');
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
            efficiency: undefined, // Authoritative engineering efficiency unmeasured/unsupplied
            renderingCoefficient: 1.0, // Visual layout rendering coefficient
          });
        });
      }
      
      if (data.recommendationText) {
        setRecommendation(data.recommendationText);
      }
      
    } catch (err) {
      console.error(err);
      setError('مشکلی در ارتباط با هوش مصنوعی به وجود آمد.');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E4E7EC]">
      <div className="flex items-center gap-2 border-b border-[#E4E7EC] pb-3 mb-4">
        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
          <Bot size={18} />
        </div>
        <h3 className="font-bold text-[#1A1D23]">چیدمان هوشمند با هوش مصنوعی</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-bold text-[#5A6072] block mb-1">عرض (متر)</label>
          <input 
            type="number" 
            value={width} 
            onChange={(e) => setWidth(e.target.value)}
            className="w-full border border-[#E4E7EC] rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 bg-[#F7F8FA]"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[#5A6072] block mb-1">طول (متر)</label>
          <input 
            type="number" 
            value={length} 
            onChange={(e) => setLength(e.target.value)}
            className="w-full border border-[#E4E7EC] rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 bg-[#F7F8FA]"
          />
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2 rounded-lg mb-4">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      
      <button 
        onClick={handleOptimize}
        disabled={isOptimizing}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 text-sm shadow-sm"
      >
        {isOptimizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        تولید چیدمان خودکار
      </button>
      
      {recommendation && (
        <div className="mt-4 bg-purple-50 p-3 rounded-xl border border-purple-100">
          <p className="text-xs text-purple-900 leading-relaxed font-medium">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
