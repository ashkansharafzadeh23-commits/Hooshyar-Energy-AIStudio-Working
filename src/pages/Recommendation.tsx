import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TargetModule } from '../types';
import { Sun, Zap, BatteryCharging, ArrowRight, Loader2, CheckCircle2, ShieldAlert, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecommendationPage() {
  const { state, updateState } = useAppContext();
  const navigate = useNavigate();
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recMetadata, setRecMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missingInfo, setMissingInfo] = useState<string[]>([]);

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
              backupHours: state.supportHours || 2,
              allowBenchmarkPricing: true // Enable disclosed preliminary benchmark estimates for consumer preview
            }
          })
        });
        
        const data = await res.json();
        if (res.ok) {
          setRecommendations(data.solutions || []);
          setRecMetadata(data);
        } else {
          setError(data.error || 'خطا در دریافت پیشنهادها');
          if (Array.isArray(data.missingInfo)) {
            setMissingInfo(data.missingInfo);
          }
        }
      } catch (err) {
        console.error(err);
        setError('خطا در ارتباط با سرور');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [state]);

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

  const formatCost = (cost: number | null, pricingStatus?: string) => {
    if (pricingStatus === 'PRICE_DATA_REQUIRED' || cost === null || cost === undefined) {
      return "نیازمند استعلام از تأمین‌کنندگان";
    }
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
      className="max-w-4xl mx-auto pt-10 px-4 pb-16"
      dir="rtl"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-3">چه ترکیبی برای شما بهتر است؟</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">موتور پیشنهاد هوشیار بر اساس نیاز مصرفی، موقعیت مکانی و قابلیت اطمینان، بهترین معماری‌ها را اولویت‌بندی می‌کند.</p>
      </div>

      {/* Hypothetical Simulation Notice */}
      {recMetadata?.isHypothetical && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <span className="font-bold">حالت شبیه‌سازی فرضی:</span> نتایج ارائه‌شده بر پایه مفروضات سناریوی فرضی است و به عنوان طراحی مهندسی پروژه یا مبنای قرارداد معتبر نمی‌باشد.
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-zinc-500 font-medium">در حال ارزیابی بار، ساعات تابش و گزینه‌های فنی...</p>
        </div>
      ) : error ? (
        <div className="bg-amber-50 dark:bg-amber-950/20 text-zinc-800 dark:text-zinc-200 p-6 rounded-2xl text-center border border-amber-200 dark:border-amber-800 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2 text-zinc-900 dark:text-zinc-100">نیاز به تکمیل اطلاعات مهندسی</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {missingInfo.includes('monthlyConsumptionKwh') || missingInfo.includes('selectedAppliances') ? (
              <button 
                onClick={() => navigate('/consumption')} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <span>ثبت اطلاعات مصرف برق</span>
                <ArrowRight size={16} />
              </button>
            ) : null}
            {missingInfo.includes('usableArea') || missingInfo.includes('city') ? (
              <button 
                onClick={() => navigate('/area-city')} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <span>ثبت مساحت و شهر</span>
                <ArrowRight size={16} />
              </button>
            ) : null}
            <button 
              onClick={() => navigate('/solar-analysis')} 
              className="px-6 py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors"
            >
              شروع فرایند ارزیابی
            </button>
          </div>
        </div>
      ) : (
        <>
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
                  
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mb-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed min-h-[110px]">
                    {rec.explanation}
                  </div>
                  
                  <div className="mt-auto space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-500">هزینه تخمینی:</span>
                      <div className="text-left">
                        <span className="font-bold text-xs sm:text-sm">{formatCost(rec.estimatedCostIRR, rec.pricingStatus)}</span>
                        {rec.pricingStatus === 'PRELIMINARY_BENCHMARK' && (
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">شاخص مرجع مقدماتی</div>
                        )}
                      </div>
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

          {/* Preliminary Benchmark Disclaimer */}
          {recMetadata?.pricingStatus === 'PRELIMINARY_BENCHMARK' && (
            <div className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
              توجه: برآورد هزینه‌ها بر اساس شاخص‌های مرجع بازار بوده و قیمت نهایی پس از استعلام رسمی از فروشندگان تجهیزات تعیین می‌گردد.
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
