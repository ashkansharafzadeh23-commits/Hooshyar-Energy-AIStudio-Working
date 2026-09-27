import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TargetModule } from '../types';
import { Sun, Zap, BatteryCharging, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdBanner } from '../components/AdBanner';

export default function Home() {
  const { state, updateState } = useAppContext();
  const navigate = useNavigate();

  const toggleTarget = (target: TargetModule) => {
    const newTargets = state.targets.includes(target)
      ? state.targets.filter((t) => t !== target)
      : [...state.targets, target];
    updateState({ targets: newTargets });
  };

  const handleNext = () => {
    if (state.targets.length > 0) {
      navigate('/location-type');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center max-w-3xl mx-auto pt-10"
    >
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-4">کاربر عزیز، به مشاور هوشمند انرژی خوش آمدید</h1>
        <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium text-lg">هدف شما چیست؟ (می‌توانید چند مورد را انتخاب کنید)</p>
      </div>

      
      <AdBanner layout="hero" />
      
      
      <div className="mt-8 mb-4 w-full">
        <Link to="/smart-maintenance" className="flex items-center justify-center gap-3 text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 px-8 py-4 rounded-2xl font-bold text-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg hover:shadow-xl w-full sm:w-auto transform hover:-translate-y-1">
          <Zap size={24} className="animate-pulse" />
          ورود به بخش تعمیرات و نگهداری هوشمند
        </Link>
      </div>

      <div className="w-full mb-6">
        <Link to="/powerplant-setup" className="flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-zinc-50 dark:bg-zinc-800 transition-all shadow-lg hover:shadow-xl w-full transform hover:-translate-y-1">
          <Sun size={24} className="animate-pulse" />
          احداث نیروگاه برق خورشیدی (فروش برق)
        </Link>
      </div>
      <div className="flex flex-col gap-4 w-full mb-10">
        <button
          onClick={() => { updateState({ targets: ['auto'] }); navigate('/location-type'); }}
          className={`relative w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-bold text-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white`}
        >
          <Sun size={28} className="animate-pulse" />
          <span>پیشنهاد هوشمند (چه ترکیبی برای من بهتره؟)</span>
        </button>
        <div className="flex items-center justify-center my-2 text-zinc-500 font-medium">یا مسیر دلخواه خود را انتخاب کنید (می‌دانم چه می‌خواهم):</div>
        <button
          onClick={() => toggleTarget('solar')}
          className={`relative w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border font-bold text-xl transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1 ${
            state.targets.includes('solar')
              ? 'border-[var(--solar-primary)] bg-white dark:bg-zinc-900 shadow-premium ring-2 text-[var(--solar-primary)]'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-[var(--solar-primary)] bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
          }`}
        >
          <Sun size={24} className={state.targets.includes('solar') ? "text-[var(--solar-primary)] animate-pulse" : "text-zinc-400 dark:text-zinc-500"} />
          <span>خرید پنل خورشیدی</span>
        </button>
        <button
          onClick={() => toggleTarget('generator')}
          className={`relative w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border font-bold text-xl transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1 ${
            state.targets.includes('generator')
              ? 'border-[var(--generator-primary)] bg-white dark:bg-zinc-900 shadow-premium ring-2 text-[var(--generator-primary)]'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-[var(--generator-primary)] bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
          }`}
        >
          <Zap size={24} className={state.targets.includes('generator') ? "text-[var(--generator-primary)] animate-pulse" : "text-zinc-400 dark:text-zinc-500"} />
          <span>خرید موتور برق / ژنراتور</span>
        </button>
        <button
          onClick={() => toggleTarget('powerbank')}
          className={`relative w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border font-bold text-xl transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1 ${
            state.targets.includes('powerbank')
              ? 'border-[var(--powerbank-primary)] bg-white dark:bg-zinc-900 shadow-premium ring-2 text-[var(--powerbank-primary)]'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-[var(--powerbank-primary)] bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200'
          }`}
        >
          <BatteryCharging size={24} className={state.targets.includes('powerbank') ? "text-[var(--powerbank-primary)] animate-pulse" : "text-zinc-400 dark:text-zinc-500"} />
          <span>خرید پاوربانک خانگی و صنعتی</span>
        </button>
      </div>
      <button
        onClick={handleNext}
        disabled={state.targets.length === 0}
        className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
          state.targets.length > 0 
            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 dark:hover:bg-zinc-200 shadow-md hover:shadow-lg cursor-pointer' 
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
        }`}
      >
        مرحله بعد
        <ArrowLeft size={20} />
      </button>
    </motion.div>
  );
}
