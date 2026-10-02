import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { PersianPromptModal } from '../components/common/PersianPromptModal';
import { motion } from 'framer-motion';
import { 
  Check, 
  Info, 
  AlertTriangle, 
  ExternalLink, 
  Zap, 
  Share, 
  Map, 
  Lightbulb, 
  MessageSquare, 
  Send, 
  Save, 
  Trash2,
  ChevronDown,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sun,
  Layers,
  ShoppingBag,
  Cpu,
  FileCheck2,
  Loader2
} from 'lucide-react';
import SavingsCalculator from '../components/SavingsCalculator';
import EnergyEfficiencyChart from '../components/EnergyEfficiencyChart';
import MonthlyGenerationChart from '../components/MonthlyGenerationChart';
import { SmartWarning } from '../components/SmartWarning';
import { AdBanner } from '../components/AdBanner';
import { PanelComparisonTable } from '../components/PanelComparisonTable';
import InstallationOptimization from '../components/InstallationOptimization';
import { DataTruthBadge } from '../components/common/DataTruthBadge';
import { 
  AnalysisExecutiveSummary, 
  SolarDataSource, 
  EngineeringDetails, 
  FinancialOverview, 
  AIResultExplanation 
} from '../components/analysis';

export default function ResultPage() {
  const { state } = useAppContext();
  const navigate = useNavigate();
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
  const { showSuccess, showError, showWarning } = useToast();
  const [isSaveScenarioModalOpen, setIsSaveScenarioModalOpen] = useState(false);
  const token = localStorage.getItem('token');

  const location = useLocation();
  const historyResult = location.state?.historyResult;
  const historyResultId = location.state?.historyResultId;

  const handleConvertToProject = async () => {
    if (!token) {
      showWarning("برای ایجاد پروژه باید ابتدا وارد حساب کاربری شوید.", "احراز هویت");
      return;
    }
    const aId = result?.analysisId || historyResultId;
    if (!aId) {
      showError("شناسه تحلیل یافت نشد. لطفاً تحلیل جدیدی ثبت کنید.", "خطا در دسترسی");
      return;
    }
    
    try {
      setProjectLoading(true);
      const res = await fetch(`/api/projects/from-analysis/${aId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ایجاد پروژه");
      setProjectId(data.id);
      setProjectStatus(data.status);
      showSuccess(`پروژه با موفقیت ایجاد شد! کد پروژه: ${data.projectCode}`, "پروژه ثبت گردید");
    } catch (err: any) {
      showError(err.message || "خطا در تبدیل تحلیل به پروژه", "خطای ارتباط");
    } finally {
      setProjectLoading(false);
    }
  };

  const handleSaveScenario = () => {
    setIsSaveScenarioModalOpen(true);
  };

  const handleSaveScenarioSubmit = (values: Record<string, string>) => {
    const name = values.scenarioName?.trim();
    if (!name) return;
    setSavedScenarios(prev => [...prev, {
      name,
      monthlySunHours: result.dataSource?.monthlySunHours || {},
      systemKwp: result.solar?.finalKwp || 0
    }]);
    setIsSaveScenarioModalOpen(false);
    showSuccess(`سناریو «${name}» با موفقیت ذخیره گردید.`);
  };
  
  const handleRemoveScenario = (nameToRemove: string) => {
    setSavedScenarios(prev => prev.filter(sc => sc.name !== nameToRemove));
  };

  useEffect(() => {
    if (historyResult) {
      setResult(historyResult);
      if (historyResult.projectId) {
        setProjectId(historyResult.projectId);
      }
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4" dir="rtl">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0284C7] rounded-full animate-spin mb-5"></div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 animate-pulse">
          در حال تدوین مدل مهندسی و ارزیابی اقتصادی تابش...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          استخراج داده‌های ماهواره‌ای <span dir="ltr" className="font-mono">NASA POWER</span> و شبیه‌سازی تولید برق
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/40">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">خطا در بارگذاری نتیجه تحلیل</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{error}</p>
        <Link 
          to="/target-select" 
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold hover:bg-[#0369A1] transition-colors"
        >
          <span>ثبت مجدد درخواست تحلیل</span>
          <ArrowLeft size={14} />
        </Link>
      </div>
    );
  }

  if (!result) return null;

  // Extracted authoritative engineering metrics - strictly preserving calculated results
  const solar = result.solar || {};
  const dataSource = result.dataSource || {};
  const rec = result.recommendation || { summary: result.summary, energySavingTips: result.energySavingTips };
  const dailyEstimate = result.dailyConsumptionEstimate || {};

  const finalKwp = solar.finalKwp ?? null;
  const panelCount = solar.panelOptions?.default?.panelCount 
    ?? solar.panelOptions?.balanced?.panelCount 
    ?? solar.panelOptions?.economy?.panelCount 
    ?? solar.panelCount 
    ?? null;
  const panelWattage = solar.panelOptions?.default?.panelWattage 
    ?? solar.panelOptions?.balanced?.panelWattage 
    ?? solar.panelOptions?.economy?.panelWattage 
    ?? null;
  const estimatedAnnualKwh = solar.estimatedAnnualKwh ?? solar.annualGenerationKwh ?? null;
  const requiredAreaM2 = solar.requiredAreaM2 ?? solar.panelOptions?.default?.requiredAreaM2 ?? null;

  const currentCity = currentInput.city || state.city || '';
  const currentProvince = currentInput.province || state.province || '';
  const locationLabel = currentCity ? (currentProvince ? `${currentProvince}، ${currentCity}` : currentCity) : 'ایران';

  const isProjectCreated = Boolean(projectId || historyResult?.projectId);
  const activeProjectId = projectId || historyResult?.projectId || null;
  const effectiveAnalysisId = result?.analysisId || historyResultId || 'anl_current';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-8 sm:space-y-10"
      dir="rtl"
    >
      {/* Top Breadcrumb & Status Bar */}
      <header className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
          <nav className="flex items-center gap-1.5" aria-label="مسیر صفحه">
            <Link to="/user-dashboard" className="hover:text-[#0284C7] transition-colors">پیشخوان</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-200 font-bold truncate">گزارش تصمیم‌گیری مهندسی و مالی سامانه خورشیدی</span>
          </nav>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-400">
              کد: {effectiveAnalysisId.substring(0, 16)}
            </span>
            <DataTruthBadge type="VERIFIED_SOURCE" size="sm" />
          </div>
        </div>

        {/* Existing Project Banner if already converted */}
        {isProjectCreated && activeProjectId && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  این تحلیل به پروژه مهندسی تبدیل شده است
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  اسناد فنی و مناقصه پیمانکاران EPC در میز کار پروژه در دسترس است.
                </p>
              </div>
            </div>
            <Link
              to={`/projects/${activeProjectId}`}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[40px]"
            >
              <span>مشاهده پروژه در پیشخوان</span>
              <ArrowLeft size={14} />
            </Link>
          </div>
        )}

        {/* 5-Question Jump Navigation Tabs for Fast Mobile & Desktop Access */}
        <div className="bg-slate-100 dark:bg-zinc-800/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-x-auto flex items-center gap-1.5 scrollbar-none text-xs">
          <button 
            type="button"
            onClick={() => scrollToSection('section-1-recommendation')}
            className="px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/50 dark:border-zinc-700 whitespace-nowrap hover:text-[#0284C7] transition-colors"
          >
            ۱. سیستم پیشنهادی
          </button>
          <button 
            type="button"
            onClick={() => scrollToSection('section-2-production')}
            className="px-3 py-1.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap transition-colors"
          >
            ۲. تولید برق و تراز
          </button>
          <button 
            type="button"
            onClick={() => scrollToSection('section-3-equipment')}
            className="px-3 py-1.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap transition-colors"
          >
            ۳. تجهیزات و پیکربندی
          </button>
          <button 
            type="button"
            onClick={() => scrollToSection('section-4-economics')}
            className="px-3 py-1.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap transition-colors"
          >
            ۴. ارزیابی مالی و بازگشت
          </button>
          <button 
            type="button"
            onClick={() => scrollToSection('section-5-action')}
            className="px-3 py-1.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap transition-colors"
          >
            ۵. اقدامات اجرایی
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* QUESTION 1: WHAT SYSTEM IS RECOMMENDED?                                   */}
      {/* ========================================================================= */}
      <section id="section-1-recommendation" className="space-y-4 sm:space-y-6" aria-label="سیستم پیشنهادی چیست؟">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
            گام ۱ از ۵
          </span>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
            سیستم پیشنهادی خورشیدی و خلاصه مشخصات اجرایی
          </h2>
        </div>

        {/* Executive Summary Card */}
        <AnalysisExecutiveSummary
          data={{
            recommendedKwp: finalKwp,
            panelCount,
            estimatedAnnualKwh,
            requiredAreaM2,
            locationLabel,
            sourceStatus: dataSource.isReferenceOnly ? 'FALLBACK_REGIONAL' : 'LIVE_NASA'
          }}
          onExploreEngineering={() => scrollToSection('section-3-equipment')}
          onCreateProject={handleConvertToProject}
          isProjectCreated={isProjectCreated}
          projectId={activeProjectId}
          projectLoading={projectLoading}
        />

        {/* Solar Radiation Data Truth Card */}
        <SolarDataSource
          locationLabel={locationLabel}
          sourceType={dataSource.isReferenceOnly ? 'REGIONAL_REFERENCE' : (dataSource.source || 'NASA_POWER')}
          peakSunHours={dataSource.sunHours || 5.1}
          isFallback={dataSource.isReferenceOnly}
        />
      </section>

      {/* ========================================================================= */}
      {/* QUESTION 2: HOW MUCH ENERGY CAN IT PRODUCE?                               */}
      {/* ========================================================================= */}
      <section id="section-2-production" className="space-y-4 sm:space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800" aria-label="چه میزان برق تولید می‌کند؟">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                گام ۲ از ۵
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                برآورد تولید انرژی و منحنی فصلی
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              پیش‌بینی تولید ماهانه با مدل تابش ناسا و تحلیل پوشش مصرف سالانه
            </p>
          </div>

          {state.targets.includes('solar') && dataSource?.monthlySunHours && finalKwp && (
            <button 
              type="button"
              onClick={handleSaveScenario}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-900/20 text-[#0284C7] dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/40 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-xs font-bold min-h-[40px] shrink-0"
            >
              <Save size={14} />
              <span>ذخیره سناریو جهت مقایسه</span>
            </button>
          )}
        </div>

        {/* Saved Scenarios List */}
        {savedScenarios.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">سناریوهای ذخیره‌شده:</span>
            {savedScenarios.map(sc => (
              <div key={sc.name} className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700 shadow-xs text-xs">
                <span className="text-slate-800 dark:text-slate-200 font-medium">{sc.name}</span>
                <span dir="ltr" className="text-[10px] text-slate-400 font-mono">({sc.systemKwp} kWp)</span>
                <button 
                  type="button"
                  onClick={() => handleRemoveScenario(sc.name)} 
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  aria-label={`حذف سناریو ${sc.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 1. Monthly Generation Chart */}
        {state.targets.includes('solar') && dataSource?.monthlySunHours && finalKwp ? (
          <MonthlyGenerationChart 
            monthlySunHours={dataSource.monthlySunHours} 
            systemKwp={finalKwp} 
            compareScenarios={savedScenarios}
          />
        ) : null}

        {/* 2. Annual Energy Efficiency & Consumption Coverage */}
        {state.targets.includes('solar') && (
          typeof result?.solar?.annualGenerationKwh === 'number' ? (
            <EnergyEfficiencyChart 
              monthlyConsumption={dailyEstimate?.monthlyKwh || 0}
              monthlyGeneration={Math.round(result.solar.annualGenerationKwh / 12)}
            />
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 text-center text-slate-500 dark:text-zinc-400 mt-4 text-xs">
              داده تولید سالانه ثبت نشده است
            </div>
          )
        )}
      </section>

      {/* ========================================================================= */}
      {/* QUESTION 3: WHAT EQUIPMENT / CONFIGURATION IS RECOMMENDED?                 */}
      {/* ========================================================================= */}
      <section id="section-3-equipment" className="space-y-4 sm:space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800" aria-label="چه تجهیزاتی پیشنهاد شده است؟">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40">
              گام ۳ از ۵
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              پیکربندی مهندسی و مشخصات فنی تجهیزات
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ماژول‌های فتوولتائیک، اینورتر، زاویه نصب جغرافیایی و استانداردهای حفاظتی
          </p>
        </div>

        {/* Technical Engineering Specifications Accordion */}
        <EngineeringDetails
          dcCapacityKwp={finalKwp}
          panelWattage={panelWattage}
          panelCount={panelCount}
          totalAreaM2={currentInput.area || state.area || null}
          usableAreaM2={currentInput.usableArea || state.usableArea || requiredAreaM2}
        />

        {/* Geographic Tilt & Azimuth Orientation */}
        {state.targets.includes('solar') && currentCity && (
          <InstallationOptimization />
        )}

        {/* Panel Comparison Component: Responsive Cards on Mobile & Full Table on Desktop */}
        {state.targets.includes('solar') && solar?.panelOptions && (
          <PanelComparisonTable panelOptions={solar.panelOptions} />
        )}

        {/* Equipment & Bill of Materials Catalog Breakdown */}
        {result.recommendedProducts && result.recommendedProducts.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden text-right">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2 bg-slate-50/70 dark:bg-zinc-800/40">
              <div className="flex items-center gap-2">
                <ShoppingBag size={17} className="text-[#0284C7]" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                  تجهیزات و صورت اقلام مهندسی (BOM)
                </h3>
              </div>
              <Link 
                to="/sellers"
                className="text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:text-[#0284C7] transition-colors font-medium min-h-[36px]"
              >
                <Map size={13} className="text-slate-400" />
                <span>فروشندگان مجاز (نقشه)</span>
              </Link>
            </div>

            <div className="p-3.5 sm:p-5 divide-y divide-slate-100 dark:divide-zinc-800 space-y-3 sm:space-y-4">
              {result.recommendedProducts.map((prod: any, i: number) => (
                <div key={i} className="pt-3 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700">
                      <Cpu size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                          {prod.category}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          <span dir="ltr" className="font-mono text-left inline-block">{prod.brand} {prod.model}</span>
                        </h4>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        تأمین‌کننده: {prod.vendorName} ({prod.vendorCity})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800">
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 flex items-baseline gap-1">
                        <span dir="ltr" className="font-mono">{(prod.price / 10).toLocaleString()}</span>
                        <span className="text-[10px] font-normal text-slate-500">تومان</span>
                      </span>
                    </div>
                    <Link
                      to={`/vendor/${prod.id?.split('_')[0] || 'vendor_001'}`} 
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors inline-flex items-center gap-1 min-h-[36px]"
                    >
                      <span>استعلام و خرید</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Equipment Cost Banner */}
            <div className="p-3.5 sm:p-4 bg-blue-50/50 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  جمع برآورد هزینه تجهیزات اصلی:
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  * بدون احتساب هزینه‌های ترابری، سازه اختصاصی، کابل‌کشی و نظارت مهندسی
                </p>
              </div>
              <div className="text-lg sm:text-xl font-black text-[#0284C7] dark:text-blue-400 flex items-baseline gap-1">
                <span dir="ltr" className="font-mono">{(result.estimatedTotalCost / 10).toLocaleString()}</span>
                <span className="text-xs font-normal text-slate-500">تومان</span>
              </div>
            </div>
          </div>
        )}

        {/* Required Accessories Checklist (Collapsible for cleaner mobile scanning) */}
        {result.requiredAccessories && result.requiredAccessories.length > 0 && (
          <details className="group rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-right overflow-hidden shadow-xs">
            <summary className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors list-none font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck2 size={16} className="text-[#0284C7]" />
                <span>چک‌لیست تجهیزات جانبی و اتصالات استاندارد ({result.requiredAccessories.length} مورد)</span>
              </div>
              <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-zinc-800/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3">
                {result.requiredAccessories.map((acc: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 text-xs">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${acc.availableInCatalog ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {acc.availableInCatalog ? '✓' : '•'}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{acc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}

        {/* Engineering & Safety Warnings */}
        <div className="space-y-3">
          {result.warnings && result.warnings.length > 0 ? (
            result.warnings.map((w: any, i: number) => (
              <div key={i} className={`p-3.5 sm:p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed ${
                w.severity === 'error' 
                  ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300' 
                  : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
              }`}>
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">نکته مهندسی و ایمنی سیستم:</strong>
                  <span>{w.message}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>پیکربندی سیستم مطابق با استانداردهای عمومی توانیر و سازمان انرژی‌های تجدیدپذیر (ساتبا) ارزیابی گردید.</span>
            </div>
          )}

          <SmartWarning 
            monthlyKwh={(dailyEstimate?.monthlyKwh || 0)} 
            targets={state.targets} 
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* QUESTION 4: WHAT ARE THE ECONOMICS & PAYBACK?                             */}
      {/* ========================================================================= */}
      <section id="section-4-economics" className="space-y-4 sm:space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800" aria-label="تحلیل مالی و بازگشت سرمایه">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
              گام ۴ از ۵
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              ارزیابی مالی، سرمایه‌گذاری و بازگشت سرمایه
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تفکیک دقیق ورودی‌ها، مفروضات بازار و نتایج محاسباتی بدون قطعیت کاذب
          </p>
        </div>

        {/* 1. Three-Tier Truthful Financial Overview */}
        <FinancialOverview
          estimatedCostIRR={result.estimatedTotalCost || solar.estimatedTotalCost || null}
          annualSavingsIRR={null}
          simplePaybackYears={null}
          capacityKwp={finalKwp}
          monthlyConsumptionKwh={dailyEstimate?.monthlyKwh || currentInput.actualMonthlyKwh || null}
        />

        {/* 2. Contextualized Savings & Payback Breakdown with Disclosures */}
        <SavingsCalculator 
          monthlyKwh={dailyEstimate?.monthlyKwh || 0}
          totalCost={result.estimatedTotalCost || 0}
          targets={state.targets}
        />
      </section>

      {/* ========================================================================= */}
      {/* QUESTION 5: WHAT ARE THE NEXT ACTIONABLE STEPS?                           */}
      {/* ========================================================================= */}
      <section id="section-5-action" className="space-y-4 sm:space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800" aria-label="گام‌های اجرایی بعدی چیست؟">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0284C7]/10 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
              گام ۵ از ۵
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              گام‌های بعدی و اقدامات اجرایی پروژه
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تبدیل به پروژه رسمی، انتشار مناقصه و دریافت استعلام قیمت از پیمانکاران واجد صلاحیت
          </p>
        </div>

        {/* Action Decision Cards (Stage 5 Dominant CTA) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Dominant Action Card: Convert to Project */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-50/60 to-white dark:from-zinc-900 dark:to-zinc-900 border-2 border-[#0284C7]/40 dark:border-blue-800 shadow-sm flex flex-col justify-between text-right">
            <div>
              <div className="flex items-center gap-2 text-[#0284C7] mb-2 font-bold text-xs">
                <CheckCircle2 size={16} />
                <span>اقدام اصلی پیشنهادی</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                ثبت پروژه و دریافت استعلام قیمت EPC
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                با تبدیل این تحلیل به پروژه، مشخصات محل و ظرفیت در پیشخوان اختصاصی شما ثبت شده و می‌توانید از پیمانکاران تاییدشده استعلام فنی و مالی دریافت کنید.
              </p>
            </div>

            {isProjectCreated && activeProjectId ? (
              <Link 
                to={`/projects/${activeProjectId}`} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors min-h-[48px]"
              >
                <span>ورود به میز کار پروژه ایجادشده</span>
                <ArrowLeft size={16} />
              </Link>
            ) : (
              <button 
                type="button"
                onClick={handleConvertToProject}
                disabled={projectLoading || (!result?.analysisId && !historyResultId)}
                className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50 min-h-[48px] cursor-pointer"
              >
                {projectLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>در حال ثبت پروژه...</span>
                  </>
                ) : (
                  <>
                    <span>تبدیل تحلیل به پروژه و انتشار استعلام قیمت 🚀</span>
                    <ArrowLeft size={16} />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Secondary Action: 3D Solar Planner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between text-right">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2 font-bold text-xs">
                <Zap size={16} />
                <span>شبیه‌ساز بصری</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                طراحی سه‌بعدی سقف و چیدمان پنل‌ها
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                زاویه شیب، آرایش رشته‌ها (String) و تاثیر موانع سایه‌انداز (کولر، دودکش و جان‌پناه) را روی سقف خود شبیه‌سازی کنید.
              </p>
            </div>

            <Link 
              to="/solar-planner"
              className="w-full bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-zinc-900 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors min-h-[44px]"
            >
              <Zap size={15} />
              <span>ورود به شبیه‌ساز سه‌بعدی سقف</span>
            </Link>
          </div>
        </div>

        {/* AI Advisor Explanation & Plain Synthesis */}
        <AIResultExplanation
          summary={rec.summary}
          energySavingTips={rec.energySavingTips}
          aiStatus={result.aiStatus || (result.aiUnavailable ? 'UNAVAILABLE' : 'SUCCESS')}
          recommendedCapacityKwp={finalKwp}
          locationLabel={currentCity}
        />

        {/* Interactive Scenario Modification & AI Followup */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-6 shadow-xs text-right">
          <div className="flex items-center gap-2 mb-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
            <MessageSquare size={17} className="text-[#0284C7]" />
            <h3>پرسش از مشاور هوشمند درباره سناریوی بهینه</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5">
            اگر سوالی درباره تغییر ظرفیت، اضافه کردن باتری، یا تغییر الگوی مصرف دارید، اینجا بنویسید:
          </p>
          
          <div className="space-y-2.5 mb-3.5 max-h-[220px] overflow-y-auto pr-1">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 border border-blue-100 dark:border-blue-900/50' 
                    : 'bg-slate-50 text-slate-800 dark:bg-zinc-800/60 dark:text-slate-200 border border-slate-100 dark:border-zinc-700/60'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-2.5 text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-[#0284C7]" />
                  <span>در حال پردازش پاسخ مهندسی...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleFollowup} className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="مثلاً: اگر یک کولر گازی اضافه کنم، ظرفیت پنل‌ها چقدر باید بیشتر شود؟"
              className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl pl-11 pr-3.5 py-2.5 sm:py-3 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284C7] outline-none transition-all"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              aria-label="ارسال سوال به مشاور"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#0284C7] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>

        {/* Energy Saving Tips */}
        {rec.energySavingTips && rec.energySavingTips.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs text-right">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2.5 flex items-center gap-2">
              <Lightbulb size={15} className="text-amber-500" />
              <span>پیشنهادات بهینه‌سازی مصرف و کاهش هزینه</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {rec.energySavingTips.map((tip: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">{tip.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{tip.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Partner Equipment & EPC Advertisement Banner */}
        <div className="w-full pt-1">
          <AdBanner layout="banner" />
        </div>
      </section>

      {/* Persian Scenario Save Prompt Modal */}
      <PersianPromptModal
        isOpen={isSaveScenarioModalOpen}
        onClose={() => setIsSaveScenarioModalOpen(false)}
        title="ذخیره سناریوی تحلیلی"
        description="نام مورد نظر خود را برای این سناریو جهت مقایسه در نمودارها وارد نمایید."
        fields={[
          {
            id: 'scenarioName',
            label: 'نام سناریو',
            placeholder: 'مثلاً: پنل ۵۵۰ وات، ظرفیت ۵ کیلووات',
            defaultValue: `سناریو ${savedScenarios.length + 1}`,
            required: true,
            helpText: 'نام سناریو در لیست و برچسب‌های نمودار مقایسه‌ای نمایش داده می‌شود.'
          }
        ]}
        submitText="ذخیره سناریو"
        cancelText="انصراف"
        onSubmit={handleSaveScenarioSubmit}
      />
    </motion.div>
  );
}
