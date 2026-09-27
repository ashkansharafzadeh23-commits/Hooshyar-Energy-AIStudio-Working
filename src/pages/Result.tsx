import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { Check, Info, AlertTriangle, ExternalLink, Zap, Share, Map, Lightbulb, MessageSquare, Send, Save, Trash2 } from 'lucide-react';
import SavingsCalculator from '../components/SavingsCalculator';
import EnergyEfficiencyChart from '../components/EnergyEfficiencyChart';
import MonthlyGenerationChart from '../components/MonthlyGenerationChart';
import { SmartWarning } from '../components/SmartWarning';
import { AdBanner } from '../components/AdBanner';
import { PanelComparisonTable } from '../components/PanelComparisonTable';
import InstallationOptimization from '../components/InstallationOptimization';

export default function ResultPage() {
  const { state } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', text: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState<any>(state);
  const [diffSummary, setDiffSummary] = useState<any>(null);
  const [savedScenarios, setSavedScenarios] = useState<{name: string, monthlySunHours: Record<string, number>, systemKwp: number}[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const token = localStorage.getItem('token');

  

  const handleConvertToProject = async () => {
    if (!token) {
      alert("برای ایجاد پروژه باید وارد حساب کاربری شوید.");
      return;
    }
    const aId = result.analysisId || historyResultId;
    if (!aId) {
      alert("خطا: شناسه تحلیل یافت نشد.");
      return;
    }
    
    try {
      setProjectLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/from-analysis/${aId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ایجاد پروژه");
      setProjectId(data.id);
      setProjectStatus(data.status);
      alert("پروژه با موفقیت ایجاد شد! کد پروژه: " + data.projectCode);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProjectLoading(false);
    }
  };

  const handleSaveScenario = () => {
    const defaultName = `سناریو ${savedScenarios.length + 1}`;
    const name = window.prompt("نام سناریو را وارد کنید (مثلاً: پنل ۵۵۰ وات، ظرفیت ۵ کیلووات):", defaultName);
    if (name) {
      setSavedScenarios(prev => [...prev, {
        name,
        monthlySunHours: result.dataSource.monthlySunHours,
        systemKwp: result.solar.finalKwp
      }]);
    }
  };
  
  const handleRemoveScenario = (nameToRemove: string) => {
    setSavedScenarios(prev => prev.filter(sc => sc.name !== nameToRemove));
  };

  const location = useLocation();
  const historyResult = location.state?.historyResult;
  const historyResultId = location.state?.historyResultId;

  useEffect(() => {
    if (historyResult) {
      setResult(historyResult);
      setLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentInput)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.');
        }
        
        const data = await response.json();
        setResult(data);
        
        // Save to history
        try {
          const rawHist = localStorage.getItem('analysis_history');
          const history = rawHist ? JSON.parse(rawHist) : [];
          history.unshift({
             id: Date.now().toString(),
             date: new Date().toISOString(),
             input: currentInput,
             result: data,
             title: currentInput.targets?.includes('solar') ? 'تحلیل نیروگاه خورشیدی' : 'تحلیل انرژی'
          });
          // keep last 10
          localStorage.setItem('analysis_history', JSON.stringify(history.slice(0, 10)));
        } catch (e) {
          console.error("Failed to save history", e);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);


  const handleFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/analyze/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        },
        body: JSON.stringify({
          previousInput: currentInput,
          previousResult: result,
          message: userMsg
        })
      });

      const data = await response.json();
      
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      
      if (data.updatedResult && data.updatedInput) {
        setResult(data.updatedResult);
        setCurrentInput(data.updatedInput);
        setDiffSummary(data.diffSummary);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "خطا در ارتباط با سرور." }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-medium animate-pulse">در حال تحلیل داده‌ها و جستجوی محصولات...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 pt-20">
        <AlertTriangle size={48} className="mx-auto mb-4" />
        <h2 className="text-xl font-bold">{error}</h2>
      </div>
    );
  }

  if (!result) return null;

  // Determine theme colors based on targets
  let themePrimary = 'var(--solar-primary)';
  let themeAccent = 'var(--solar-accent)';
  if (state.targets.includes('generator')) {
    themePrimary = 'var(--generator-primary)';
    themeAccent = 'var(--generator-accent)';
  } else if (state.targets.includes('powerbank')) {
    themePrimary = 'var(--powerbank-primary)';
    themeAccent = 'var(--powerbank-accent)';
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-10"
    >
      <div className="flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-8 gap-4 min-h-[800px]">
        {/* 1. Analysis Summary (Bento Tall) */}
        <section className="col-span-4 row-span-4 bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200 dark:border-zinc-800 p-6 shadow-premium flex flex-col">
          <div className="flex items-center gap-2 mb-6 shrink-0">
            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: themePrimary }}></div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-100">تحلیل انرژی شما</h2>
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="bg-[#F4F4F5] dark:bg-zinc-800 p-4 rounded-xl border border-dashed border-[#E4E4E7] shrink-0">
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">تخمین مصرف روزانه</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black" style={{ color: themePrimary }}>
                  {result?.dailyConsumptionEstimate?.dailyKwh?.toFixed(1) || 0}
                </span>
                <span className="text-lg font-medium text-zinc-950 dark:text-zinc-100">kWh</span>
              </div>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto pr-1">
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{result.summary}</p>
              
              <SavingsCalculator 
                monthlyKwh={result?.dailyConsumptionEstimate?.monthlyKwh || 0}
                totalCost={result.estimatedTotalCost}
                targets={state.targets}
              />

              {state.targets.includes('solar') && (
                <div className="mt-6 space-y-3">
                  <Link 
                    to="/solar-planner"
                    className="w-full bg-[#10B981] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#167643] transition-colors shadow-[0_4px_12px_rgba(31,146,84,0.3)]"
                  >
                    <Zap size={18} />
                    شبیه‌ساز سه‌بعدی سقف و پنل خورشیدی
                  </Link>
                </div>
              )}
              
              <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                {projectId || historyResult?.projectId ? (
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center gap-2">
                    <div className="text-blue-700 dark:text-blue-400 font-bold text-sm">پروژه ایجاد شده است</div>
                    <Link to={`/projects/${projectId || historyResult.projectId}`} className="bg-blue-600 text-white w-full text-center py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">
                      مشاهده پروژه
                    </Link>
                  </div>
                ) : (
                  <button 
                    onClick={handleConvertToProject}
                    disabled={projectLoading || (!result?.analysisId && !historyResult?.id)}
                    className="w-full bg-[#09090B] dark:bg-zinc-100 text-white dark:text-zinc-950 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {projectLoading ? "در حال ایجاد..." : "تبدیل تحلیل به پروژه 🚀"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Recommended Products (Bento Large) */}
        <section className="col-span-5 row-span-8 bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200 dark:border-zinc-800 shadow-premium flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[#E4E4E7] bg-[#F4F4F5] dark:bg-zinc-800/50 flex justify-between items-center shrink-0">
            <h2 className="font-bold flex items-center gap-2 text-zinc-950 dark:text-zinc-100">
              <span style={{ color: themePrimary }}>🛒</span>
              محصولات پیشنهادی
            </h2>
            <Link 
              to="/sellers"
              className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#F4F4F5] dark:bg-zinc-800 transition-colors shadow-premium font-medium"
            >
              <Map size={14} className="text-zinc-500 dark:text-zinc-400" />
              لیست فروشندگان (نقشه)
            </Link>
          </div>
          
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {(result.recommendedProducts || []).map((prod: any, i: number) => (
              <div key={i} className="group p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row gap-4 hover:border-gray-400 transition-all">
                <div className="w-full sm:w-20 h-20 bg-[#F4F4F5] dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center font-medium capitalize">{prod.category}</div>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">{prod.brand} {prod.model}</h3>
                      <span className="text-[10px] text-white px-2 py-0.5 rounded-full bg-[#10B981]">موجود</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{prod.reason}</p>
                  </div>
                  <div className="mt-2 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">فروشنده: {prod.vendorName} ({prod.vendorCity})</p>
                      <p className="text-sm font-black text-zinc-950 dark:text-zinc-100">{(prod.price / 10).toLocaleString()} تومان</p>
                    </div>
                    <a 
                      href={`/vendor/${prod.id?.split('_')[0] || 'vendor_001'}`} 
                      className="text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-premium inline-flex items-center gap-1 transition-transform active:scale-95"
                      style={{ backgroundColor: themePrimary }}
                    >
                      خرید و تماس
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 border-t shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${themePrimary} 10%, transparent)`, borderColor: `color-mix(in srgb, ${themePrimary} 20%, transparent)` }}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-zinc-950 dark:text-zinc-100">برآورد هزینه کل تجهیزات:</span>
              <span className="text-xl font-black" style={{ color: themeAccent }}>
                {(result.estimatedTotalCost / 10).toLocaleString()} <span className="text-sm">تومان</span>
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 text-left italic">* شامل کابل‌کشی و هزینه نصب نمی‌باشد.</p>
          </div>
        </section>

        {/* 3. Technical Specs (Bento Square) */}
        <section className="col-span-3 row-span-4 bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-premium flex flex-col">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 border-b border-[#E4E4E7] pb-2 mb-3 flex items-center gap-2 shrink-0">
            <Info size={16} className="text-zinc-500 dark:text-zinc-400" />
            مشخصات فنی پیشنهادی
          </h3>
          <div className="overflow-y-auto flex-1 pr-1">
            {result.dataSource?.sourceLabel && (
              <div className="flex items-start gap-1 mb-3 text-[10px] text-zinc-500 dark:text-zinc-400 bg-[#F4F4F5] dark:bg-zinc-800 p-2 rounded-lg">
                <Info size={12} className="mt-0.5 shrink-0" />
                <span>منبع داده تابش خورشید: {result.dataSource.sourceLabel}</span>
              </div>
            )}
            <ul className="space-y-2.5">
              {(result.technicalSpecs || []).map((spec: any, i: number) => (
                <li key={i} className="flex justify-between text-xs items-center gap-4 border-b border-[#F4F4F5] pb-1 last:border-0">
                  <span className="text-zinc-500 dark:text-zinc-400">{spec.label}</span>
                  <span className="font-bold text-left text-zinc-950 dark:text-zinc-100">{spec.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Safety & Warnings (Bento Horizontal) */}
        <section className="col-span-3 row-span-4 bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-premium flex flex-col">
          <h3 className="text-sm font-bold text-[#EF4444] border-b border-[#E4E4E7] pb-2 mb-3 flex items-center gap-2 shrink-0">
            <AlertTriangle size={16} />
            نکات ایمنی و اجرا
          </h3>
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {result.warnings && result.warnings.length > 0 ? (
              result.warnings.map((w: any, i: number) => (
                <div key={i} className={`p-2 rounded-lg ${
                  w.severity === 'error' ? 'bg-[#EF4444]/5 text-[#EF4444]' :
                  'bg-[#F59E0B]/5 border border-[#F59E0B]/20 text-zinc-500 dark:text-zinc-400'
                }`}>
                  <p className="text-[10px] leading-relaxed">
                    {w.severity === 'error' ? '⚠️ ' : '* '}{w.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="bg-[#10B981]/5 p-2 rounded-lg text-[#10B981]">
                <p className="text-[10px] leading-relaxed">✓ سیستم ایمن ارزیابی شد.</p>
              </div>
            )}
          </div>
          <button className="mt-3 shrink-0 w-full border-2 border-[#09090B] text-zinc-950 dark:text-zinc-100 hover:bg-[#09090B] hover:text-white transition-colors py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2">
            درخواست بازدید کارشناس 👷‍♂️
          </button>
        </section>

        {/* 5. Accessories Checklist (Bento Small) */}
        <section className="col-span-4 row-span-2 bg-[#09090B] text-white rounded-2xl p-4 shadow-xl flex items-center gap-6">
           <div className="flex-1">
             <h4 className="text-xs font-bold mb-3" style={{ color: themePrimary }}>تجهیزات جانبی مورد نیاز</h4>
             <div className="grid grid-cols-2 gap-x-4 gap-y-2 h-[50px] overflow-y-auto pr-1">
                {(result.requiredAccessories || []).map((acc: any, i: number) => (
                  <div key={i} className={`flex items-center gap-2 text-[10px] ${acc.availableInCatalog ? 'opacity-90' : 'opacity-50'}`}>
                    <span style={{ color: acc.availableInCatalog ? themePrimary : '' }}>
                      {acc.availableInCatalog ? '✓' : '○'}
                    </span> 
                    <span className="truncate">{acc.name}</span>
                  </div>
                ))}
             </div>
           </div>
           <div className="w-px h-12 bg-white dark:bg-zinc-900/10 shrink-0"></div>
           <div className="flex flex-col items-center shrink-0">
              <div className="text-[10px] opacity-60 mb-2">اشتراک تحلیل</div>
              <button className="bg-white dark:bg-zinc-900/10 hover:bg-white dark:bg-zinc-900/20 transition-colors p-2 rounded-lg">
                <Share size={18} />
              </button>
           </div>
        </section>

        {/* 6. Energy Saving Tips */}
        <section className="col-span-4 row-span-2 bg-gradient-to-br from-[#F4F4F5] to-white rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-premium flex flex-col">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 border-b border-[#E4E4E7] pb-2 mb-3 flex items-center gap-2 shrink-0">
            <Lightbulb size={16} className="text-[#F59E0B]" />
            پیشنهادات کاهش مصرف
          </h3>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {result.energySavingTips && result.energySavingTips.length > 0 ? (
              result.energySavingTips.map((tip: any, i: number) => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-premium">
                  <h4 className="text-[11px] font-bold text-zinc-950 dark:text-zinc-100 mb-1">{tip.title}</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{tip.description}</p>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-[10px]">
                نکته‌ای برای نمایش وجود ندارد.
              </div>
            )}
          </div>
        </section>
        
        {state.targets.includes('solar') && state.city && (
          <div className="col-span-1 lg:col-span-12">
            <InstallationOptimization />
          </div>
        )}
        
        {state.targets.includes('solar') && result?.solar?.panelOptions && (
          <div className="col-span-1 lg:col-span-12">
            <PanelComparisonTable panelOptions={result.solar.panelOptions} />
          </div>
        )}

        {state.targets.includes('solar') && result?.dataSource?.monthlySunHours && result?.solar?.finalKwp && (
          <div className="col-span-1 lg:col-span-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 bg-white dark:bg-[#1a1b1e] p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
              <div className="flex-1">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Save size={18} className="text-blue-500" />
                  مقایسه سناریوها
                </h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  می‌توانید سناریوی فعلی را ذخیره کنید، سپس از طریق چت هوش مصنوعی تغییراتی اعمال کرده و نمودار تولید برق آنها را با هم مقایسه کنید.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleSaveScenario}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm font-medium"
                >
                  <Save size={16} />
                  ذخیره سناریوی فعلی
                </button>
              </div>
            </div>
            
            {savedScenarios.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {savedScenarios.map(sc => (
                  <div key={sc.name} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{sc.name}</span>
                    <button onClick={() => handleRemoveScenario(sc.name)} className="text-zinc-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <MonthlyGenerationChart 
              monthlySunHours={result.dataSource.monthlySunHours} 
              systemKwp={result.solar.finalKwp} 
              compareScenarios={savedScenarios}
            />
          </div>
        )}
        {state.targets.includes('solar') && (
          typeof result?.solar?.annualGenerationKwh === 'number' ? (
            <EnergyEfficiencyChart 
              monthlyConsumption={result?.dailyConsumptionEstimate?.monthlyKwh || 0}
              monthlyGeneration={Math.round(result.solar.annualGenerationKwh / 12)}
            />
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E4E7EC] dark:border-zinc-800 p-6 text-center text-slate-500 dark:text-zinc-400 mt-4">
              داده تولید سالانه ثبت نشده است
            </div>
          )
        )}
      </div>
      
      {/* Chat Box */}
      <div className="bg-white dark:bg-[#1a1b1e] rounded-xl border border-zinc-200/50 dark:border-zinc-800 p-4 lg:p-6 mt-6 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="text-blue-500" />
          می‌خواهید سناریوی دیگری را امتحان کنید؟ بپرسید
        </h3>
        
        <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl p-3 text-sm ${msg.role === 'user' ? 'bg-blue-50 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200' : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-3 text-sm text-zinc-500">
                در حال پردازش...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleFollowup} className="relative">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="مثلاً: اگه یه کولر گازی دیگه اضافه کنم چی می‌شه؟"
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || chatLoading}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-blue-500 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      <SmartWarning 
        monthlyKwh={(result?.dailyConsumptionEstimate?.monthlyKwh || 0)} 
        targets={state.targets} 
      />
    </motion.div>
  );
}
