import { Link } from 'react-router-dom';
import { NotificationCenter } from '../components/NotificationCenter';
import { ThemeToggle } from '../components/ThemeToggle';
import { motion } from 'framer-motion';
import { Sun, Zap, User, Store, ArrowLeft, ShieldCheck, BatteryCharging, Cpu } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-zinc-950 text-zinc-900 dark:text-white dark:text-zinc-100 font-Vazirmatn flex flex-col overflow-y-auto">
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center p-6 text-center">
        {/* Background Image with Parallax effect */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2500&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1D23]/85 via-[#1A1D23]/70 to-[#F7F8FA] dark:to-zinc-950 z-0"></div>

        <div className="absolute top-4 left-4 z-50 bg-white bg-white/10 dark:bg-zinc-900/50 text-white backdrop-blur-md rounded-full border border-white/20 shadow-lg">
        <NotificationCenter />
        <ThemeToggle />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto mt-12 sm:mt-0 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center mb-8 rounded-3xl overflow-hidden shadow-2xl border border-white/20 w-24 h-24 sm:w-32 sm:h-32"
          >
            <img 
              src="/src/assets/images/solar_app_logo_1786611269806.jpg" 
              alt="هوشیار انرژی - لوگو" 
              className="w-full h-full object-cover scale-[1.35] transition-transform"
            />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tight leading-tight"
          >
            به <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">هوشیار انرژی</span> خوش آمدید
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-200 leading-relaxed font-medium mb-4"
          >
            زیرساخت دیجیتال یکپارچه برای چرخه کامل پروژه‌های انرژی خورشیدی.
            <br className="hidden sm:block" /> از تحلیل و امکان‌سنجی مهندسی تا احداث، تأمین مالی و بهره‌برداری.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 bg-emerald-600/20 text-[#12B76A] border border-[#1F9254]/30 px-5 py-2.5 rounded-full mb-12 backdrop-blur-sm shadow-lg font-bold"
          >
            <Cpu size={20} />
            با هوش مصنوعی بهترین طراحی و تحلیل را برای شما انجام می‌دهیم
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto"
          >
            <Link 
              to="/customer-login"
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-500 transition-all shadow-emerald-600/20 shadow-xl hover:shadow-[0_12px_28px_rgba(31,146,84,0.5)] hover:-translate-y-1 flex items-center justify-between px-6 group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-700/50 p-1.5 rounded-lg">
                  <User size={18} />
                </div>
                <span>ورود مشتریان (مشاوره و خرید)</span>
              </div>
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            </Link>

            <Link 
              to="/vendors"
              className="w-full py-3.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-sm font-black hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 border border-[#E4E7EC] flex items-center justify-between px-6 group"
            >
               <div className="flex items-center gap-3">
                <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white p-1.5 rounded-lg">
                  <Store size={18} />
                </div>
                <span>ورود همکاران (ثبت فروشگاه)</span>
              </div>
              <ArrowLeft size={16} className="text-[#FF9E2C] group-hover:-translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full relative z-10 -mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-premium border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-emerald-600/10 text-[#1F9254] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sun size={32} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">انرژی خورشیدی</h3>
            <p className="text-[#5A6072] text-sm leading-relaxed">
              تامین، طراحی و اجرای نیروگاه‌های خورشیدی خانگی و صنعتی با بالاترین راندمان.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-premium border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BatteryCharging size={32} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">موتور برق و ژنراتور</h3>
            <p className="text-[#5A6072] text-sm leading-relaxed">
              ارائه انواع ژنراتورهای دیزلی و بنزینی برای تامین برق اضطراری و دائمی.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-premium border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">فروشندگان معتبر</h3>
            <p className="text-[#5A6072] text-sm leading-relaxed">
              ارتباط مستقیم با شبکه‌ای از تامین‌کنندگان مجاز و تایید شده در سراسر کشور.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Image Showcase */}
      <section className="pb-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-3xl overflow-hidden shadow-lg h-72 sm:h-96 relative group border border-[#E4E7EC]">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/4/45/Berlin_pv-system_block-103_20050309_p1010367.jpg" 
              alt="Solar Panels" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1D23]/90 via-[#1A1D23]/20 to-transparent flex items-end p-8">
              <h3 className="text-white text-2xl font-black">پنل‌های خورشیدی با راندمان بالا</h3>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-lg h-72 sm:h-96 relative group border border-[#E4E7EC]">
             <img 
              src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2070&auto=format&fit=crop" 
              alt="Generators" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1D23]/90 via-[#1A1D23]/20 to-transparent flex items-end p-8">
              <h3 className="text-white text-2xl font-black">ژنراتورهای صنعتی و موتور برق</h3>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
