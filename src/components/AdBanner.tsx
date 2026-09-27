import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X, Info, Zap, ShieldCheck, TrendingUp, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const MOCK_ADS = [
  {
    id: 1,
    title: 'فروش ویژه پنل‌های خورشیدی ۵۵۰ وات',
    subtitle: 'راندمان بالا همراه با ۱۰ سال گارانتی تعویض و خدمات پس از فروش',
    image: 'https://images.unsplash.com/photo-1509391366360-120953a15443?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    link: '/vendor/vendor_001',
    color: 'from-orange-600/90 to-amber-500/90',
    icon: <Zap size={24} className="text-white" />,
    badge: 'فروش ویژه'
  },
  {
    id: 2,
    title: 'خدمات تخصصی تعمیرات احمدی',
    subtitle: 'سرویس و اورهال انواع ژنراتور و موتور برق با گارانتی ۶ ماهه',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    link: '#',
    color: 'from-blue-700/90 to-blue-500/90',
    icon: <ShieldCheck size={24} className="text-white" />,
    badge: 'خدمات تخصصی'
  },
  {
    id: 3,
    title: 'باتری‌های ژل و لیتیومی صنعتی',
    subtitle: 'بهترین قیمت بازار همراه با نصب رایگان در محل پروژه',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    link: '#',
    color: 'from-emerald-700/90 to-green-500/90',
    icon: <TrendingUp size={24} className="text-white" />,
    badge: 'تخفیف محدود'
  },
  {
    id: 4,
    title: 'اینورترهای هیبریدی نسل جدید',
    subtitle: 'مدیریت هوشمند انرژی برای مصارف صنعتی و خانگی',
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    link: '#',
    color: 'from-purple-700/90 to-fuchsia-500/90',
    icon: <Sparkles size={24} className="text-white" />,
    badge: 'محصول جدید'
  }
];

export function AdBanner({ layout = 'banner' }: { layout?: 'banner' | 'card' | 'inline' | 'marquee' | 'hero' | 'sidebar' }) {
  const [currentIndex, setCurrentIndex] = useState(Math.floor(Math.random() * MOCK_ADS.length));
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isVisible || layout === 'marquee') return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MOCK_ADS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isVisible, layout]);

  if (!isVisible) return null;

  const currentAd = MOCK_ADS[currentIndex];

  const nextAd = () => setCurrentIndex((prev) => (prev + 1) % MOCK_ADS.length);
  const prevAd = () => setCurrentIndex((prev) => (prev - 1 + MOCK_ADS.length) % MOCK_ADS.length);

  if (layout === 'marquee') {
    return (
      <div className="w-full bg-[#1A1D23] text-white py-2 overflow-hidden relative shadow-md">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1A1D23] to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#1A1D23] to-transparent z-10"></div>
        <div className="flex whitespace-nowrap animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
          {[...MOCK_ADS, ...MOCK_ADS].map((ad, idx) => (
            <a key={idx} href={ad.link} className="flex items-center gap-3 mx-8 group">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white/90">{ad.badge}</span>
              <span className="text-sm font-medium group-hover:text-blue-400 transition-colors">{ad.title} - {ad.subtitle}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'sidebar') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all group bg-white border border-gray-100 flex flex-col h-full min-h-[300px]">
        <div className="h-40 relative shrink-0">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${currentAd.image})` }} />
          <div className={`absolute inset-0 bg-gradient-to-t ${currentAd.color} mix-blend-multiply opacity-90`} />
          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-bold">
            آگهی ویژه
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl bg-white p-1 shadow-md flex items-center justify-center z-10">
            <div className={`w-full h-full rounded-lg bg-gradient-to-br ${currentAd.color} flex items-center justify-center`}>
              {currentAd.icon}
            </div>
          </div>
        </div>
        <div className="p-5 pt-8 flex-1 flex flex-col items-center text-center">
          <span className="text-[10px] text-gray-400 font-bold mb-1">{currentAd.badge}</span>
          <h3 className="font-black text-gray-800 text-base mb-2 line-clamp-2">{currentAd.title}</h3>
          <p className="text-xs text-gray-500 mb-4 line-clamp-3 leading-relaxed">{currentAd.subtitle}</p>
          <div className="mt-auto w-full pt-4">
            <a href={currentAd.link} className="flex items-center justify-center gap-2 w-full text-center bg-gray-900 hover:bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold transition-colors">
              مشاهده پیشنهاد
              <ChevronLeft size={14} />
            </a>
          </div>
        </div>
        <button onClick={() => setIsVisible(false)} className="absolute top-2 left-2 text-white/50 hover:text-white bg-black/20 rounded-full p-1 z-20">
          <X size={14} />
        </button>
      </div>
    );
  }

  if (layout === 'hero') {
    return (
      <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl group my-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="relative h-[300px] md:h-[400px] w-full flex items-center"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
              style={{ backgroundImage: `url(${currentAd.image})` }}
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${currentAd.color} opacity-90`} />
            <div className="absolute inset-0 bg-black/30" />
            
            <div className="relative z-10 p-8 md:p-16 w-full flex flex-col md:flex-row items-center justify-between gap-8 h-full">
              <div className="text-white max-w-2xl">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold mb-6 border border-white/30"
                >
                  <Sparkles size={16} className="text-yellow-300" />
                  {currentAd.badge}
                </motion.div>
                
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-5xl font-black mb-4 leading-tight drop-shadow-lg"
                >
                  {currentAd.title}
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg md:text-xl text-white/90 font-medium leading-relaxed drop-shadow-md mb-8"
                >
                  {currentAd.subtitle}
                </motion.p>
                
                <motion.a 
                  href={currentAd.link}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-2xl text-base font-black hover:bg-gray-100 hover:scale-105 transition-all shadow-xl"
                >
                  ثبت سفارش و خرید
                  <ExternalLink size={18} />
                </motion.a>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-6 right-8 flex gap-2 z-20">
          <button onClick={prevAd} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-colors border border-white/30">
            <ChevronRight size={20} />
          </button>
          <button onClick={nextAd} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-colors border border-white/30">
            <ChevronLeft size={20} />
          </button>
        </div>
        
        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white/80 text-xs px-2 py-1 rounded flex items-center gap-1 z-20">
          آگهی 
        </div>
        
        <button onClick={() => setIsVisible(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors backdrop-blur-sm z-20">
          <X size={18} />
        </button>
      </div>
    );
  }

  if (layout === 'card') {
    return (
      <div className="relative w-full rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group bg-white h-full flex flex-col">
        <div className="h-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${currentAd.image})` }} />
          <div className={`absolute inset-0 bg-gradient-to-t ${currentAd.color} mix-blend-multiply opacity-90`} />
          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
            آگهی
          </div>
          <div className="absolute -bottom-6 left-6 w-14 h-14 rounded-2xl bg-white p-1.5 shadow-lg flex items-center justify-center z-10 group-hover:-translate-y-2 transition-transform">
            <div className={`w-full h-full rounded-xl bg-gradient-to-br ${currentAd.color} flex items-center justify-center`}>
              {currentAd.icon}
            </div>
          </div>
        </div>
        <div className="p-6 pt-10 flex-1 flex flex-col">
          <span className="text-[10px] text-gray-400 font-bold mb-2">{currentAd.badge}</span>
          <h3 className="font-black text-gray-800 text-base mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{currentAd.title}</h3>
          <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed flex-1">{currentAd.subtitle}</p>
          <a href={currentAd.link} className="flex items-center justify-center gap-2 w-full text-center bg-gray-50 hover:bg-gray-900 hover:text-white text-gray-700 py-3 rounded-xl text-sm font-bold transition-all border border-gray-100 hover:border-gray-900">
            مشاهده پیشنهاد
            <ChevronLeft size={16} />
          </a>
        </div>
        <button onClick={() => setIsVisible(false)} className="absolute top-3 left-3 text-white/70 hover:text-white bg-black/20 rounded-full p-1.5 z-20 transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  if (layout === 'inline') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-[#E4E7EC] group flex flex-col sm:flex-row items-stretch bg-white my-4">
        <div className="w-full sm:w-1/3 md:w-1/4 h-32 sm:h-auto relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${currentAd.image})` }} />
          <div className={`absolute inset-0 bg-gradient-to-br ${currentAd.color} mix-blend-multiply opacity-90`} />
          <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded flex items-center gap-1">
            آگهی
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {currentAd.icon}
          </div>
        </div>
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full mb-2 inline-block">{currentAd.badge}</span>
              <h3 className="font-black text-[#1A1D23] text-base mb-1.5 group-hover:text-blue-700 transition-colors">{currentAd.title}</h3>
              <p className="text-sm text-[#5A6072] leading-relaxed line-clamp-2">{currentAd.subtitle}</p>
            </div>
            <a href={currentAd.link} className="shrink-0 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-600 hover:bg-blue-600 hover:text-white transition-all">
              <ChevronLeft size={20} />
            </a>
          </div>
          <div className="mt-4 sm:hidden flex justify-end">
            <a href={currentAd.link} className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700">
              مشاهده <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <button onClick={() => setIsVisible(false)} className="absolute top-2 left-2 text-gray-400 hover:text-gray-600 bg-white/80 rounded-full p-1.5 shadow-sm">
          <X size={14} />
        </button>
      </div>
    );
  }

  // default banner
  return (
    <div className="relative w-full mx-auto my-6 rounded-3xl overflow-hidden shadow-lg group border border-gray-100">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-[200px] sm:h-[240px] w-full flex items-center"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url(${currentAd.image})` }}
          />
          <div className={`absolute inset-0 bg-gradient-to-l ${currentAd.color} opacity-95 mix-blend-multiply`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold z-20 shadow-sm">
            <Sparkles size={14} className="text-yellow-300" />
            آگهی ویژه
          </div>
          
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-4 left-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors backdrop-blur-sm z-20"
          >
            <X size={18} />
          </button>
          
          <div className="relative z-10 p-6 sm:p-10 w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 h-full">
            <div className="text-white max-w-2xl mt-auto md:mt-0">
              <span className="inline-block text-xs font-bold bg-white/20 text-white px-2 py-1 rounded mb-3 backdrop-blur-sm border border-white/20">{currentAd.badge}</span>
              <h3 className="text-2xl sm:text-3xl font-black mb-2 line-clamp-1 drop-shadow-md">
                {currentAd.title}
              </h3>
              <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed line-clamp-2 drop-shadow">
                {currentAd.subtitle}
              </p>
            </div>
            
            <a 
              href={currentAd.link}
              className="shrink-0 mt-auto md:mt-0 bg-white text-gray-900 px-6 py-3.5 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 group-hover:ring-4 ring-white/30"
            >
              خرید و اطلاعات بیشتر
              <ChevronLeft size={18} />
            </a>
          </div>
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute bottom-4 right-1/2 translate-x-1/2 flex gap-2 z-20">
        {MOCK_ADS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-8 shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/40 hover:bg-white/70 w-2'}`}
          />
        ))}
      </div>
    </div>
  );
}
