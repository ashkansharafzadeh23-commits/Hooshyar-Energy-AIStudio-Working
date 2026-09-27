import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TargetModule } from '../types';
import { Sun, Zap, BatteryCharging, ArrowLeft, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecommendationPage() {
  const { state, updateState } = useAppContext();
  const navigate = useNavigate();
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/energy/recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            energyProfile: {
              locationType: state.locationType,
              city: state.city,
              totalArea: state.area,
              usableArea: state.usableArea,
              selectedAppliances: state.appliances,
              monthlyConsumptionKwh: state.actualMonthlyKwh,
              budgetIRR: null, 
              gridConnected: state.gridConnected,
              outageFrequency: state.gridStable ? "none" : "frequent",
              backupRequired: state.essentialAppliances && state.essentialAppliances.length > 0,
              backupHours: state.supportHours || 2
            }
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data.solutions || []);
        } else {
          setError('خطا در دریافت پیشنهادها');
        }
      } catch (err) {
        console.error(err);
        setError('خطا در ارتباط با سرور');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, []);

  const handleSelect = (systemType: string) => {
    let targets: TargetModule[] = [];
    if (systemType.includes('solar')) targets.push('solar');
    if (systemType.includes('generator')) targets.push('generator');
    if (systemType.includes('battery') || systemType.includes('hybrid') || systemType.includes('offgrid')) targets.push('powerbank');
    
    if (targets.length === 0) targets = ['solar']; // fallback
    
    updateState({ targets });
    navigate('/result');
  };

  const getSystemIcon = (type: string) => {
    if (type.includes('solar') && type.includes('generator')) return <div className="flex"><Sun size={24}/><Zap size={24}/></div>;
    if (type === 'generator_only') return <Zap size={28} className="text-orange-500" />;
    if (type.includes('offgrid') || type.includes('hybrid')) return <div className="flex"><Sun size={24}/><BatteryCharging size={24}/></div>;
    return <Sun size={28} className="text-yellow-500" />;
  };

  const formatCost = (cost: number) => {
    if (!cost) return "نامشخص";
    return (cost / 10000000).toLocaleString('fa-IR') + " میلیون تومان";
  };

  const formatTypeLabel = (type: string) => {
    const map: any = {
      'solar_ongrid': 'برق خورشیدی متصل به شبکه',
      'solar_hybrid': 'خورشیدی هیبریدی (با باتری)',
      'solar_offgrid': 'خورشیدی منفصل از شبکه',
      'generator_only': 'فقط موتور برق/ژنراتور',
      'solar_generator': 'خورشیدی + ژنراتور',
      'solar_battery_generator': 'سیستم کامل (خورشیدی+باتری+ژنراتور)'
    };
    return map[type] || type;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pt-10 px-4"
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-3">چه ترکیبی برای شما بهتره؟</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">هوش مصنوعی بهترین معماری‌های انرژی را بر اساس نیاز شما پیشنهاد می‌دهد.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-zinc-500 font-medium">در حال تحلیل داده‌ها و محاسبه گزینه‌ها...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center border border-red-100">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg">تلاش مجدد</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations.map((rec, idx) => (
            <motion.div 
              key={rec.systemType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-white dark:bg-zinc-900 rounded-2xl border ${idx === 0 ? 'border-blue-500 ring-4 ring-blue-50 dark:ring-blue-900/20 shadow-xl' : 'border-zinc-200 dark:border-zinc-800 shadow-sm'} overflow-hidden flex flex-col`}
            >
              <div className={`p-4 text-center font-bold ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}>
                {rec.label}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-center mb-4 text-blue-600 dark:text-blue-400">
                  {getSystemIcon(rec.systemType)}
                </div>
                <h3 className="text-xl font-bold text-center mb-4">{formatTypeLabel(rec.systemType)}</h3>
                
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mb-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed min-h-[100px]">
                  {rec.explanation}
                </div>
                
                <div className="mt-auto space-y-3 mb-6">
                  <div className="flex justify-between items-center text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="text-zinc-500">هزینه تخمینی:</span>
                    <span className="font-bold">{formatCost(rec.estimatedCostIRR)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">پشتیبان در قطعی:</span>
                    <span className="font-bold flex items-center gap-1">
                      {rec.score >= 0.8 ? <CheckCircle2 size={16} className="text-emerald-500" /> : <ShieldAlert size={16} className="text-amber-500" />}
                      {rec.score >= 0.8 ? "عالی" : "محدود"}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleSelect(rec.systemType)}
                  className={`w-full py-3 rounded-xl font-bold transition-colors ${idx === 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100'}`}
                >
                  انتخاب این معماری
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
