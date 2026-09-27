import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Megaphone, Image as ImageIcon, Video, Link as LinkIcon, CheckCircle, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdsPortal() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [adType, setAdType] = useState('banner'); // banner, video

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-lg text-center max-w-md w-full border border-gray-100">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-black mb-3 text-gray-800">تبلیغ با موفقیت ثبت شد</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">آگهی شما پس از بررسی توسط تیم پشتیبانی، در بخش‌های ویژه پلتفرم به کاربران نمایش داده خواهد شد.</p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 3 }} className="h-full bg-green-500"></motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-Vazirmatn p-4 md:p-6 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between mb-8">
          
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D23] flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
              <Megaphone size={24} />
            </div>
            پرتال ثبت تبلیغات
          </h1>
        </header>

        <div className="bg-white rounded-3xl shadow-sm border border-[#E4E7EC] overflow-hidden">
          <div className="p-6 md:p-8">
            <p className="text-gray-600 mb-8">با ثبت بنر یا ویدیو تبلیغاتی، برند و خدمات خود را در معرض دید هزاران کاربر علاقه‌مند به سیستم‌های انرژی خورشیدی قرار دهید.</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Ad Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAdType('banner')}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${adType === 'banner' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 text-gray-600'}`}
                >
                  <ImageIcon size={32} />
                  <span className="font-bold">بنر تصویری</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdType('video')}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${adType === 'video' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 text-gray-600'}`}
                >
                  <Video size={32} />
                  <span className="font-bold">تیزر ویدیویی</span>
                </button>
              </div>

              {/* Upload Area */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">فایل تبلیغ</label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 bg-gray-50 hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer flex flex-col items-center justify-center group text-center">
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {adType === 'banner' ? <ImageIcon className="text-gray-400 group-hover:text-purple-500" size={32} /> : <Video className="text-gray-400 group-hover:text-purple-500" size={32} />}
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">برای آپلود فایل کلیک کنید یا فایل را اینجا رها کنید</h3>
                  <p className="text-sm text-gray-500">
                    {adType === 'banner' ? 'فرمت‌های مجاز: JPG, PNG, WEBP (حداکثر ۵ مگابایت)' : 'فرمت‌های مجاز: MP4, WebM (حداکثر ۲۰ مگابایت)'}
                  </p>
                </div>
              </div>

              {/* Ad Details */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">عنوان تبلیغ</label>
                  <input required type="text" className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium text-gray-800" placeholder="مثال: فروش ویژه پنل‌های ۵۵۰ وات با تخفیف پاییزه" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">لینک ارجاع (اختیاری)</label>
                  <div className="relative">
                    <input type="url" dir="ltr" className="w-full px-5 py-4 pl-12 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium text-gray-800 text-right" placeholder="https://..." />
                    <LinkIcon className="absolute left-4 top-4 text-gray-400" size={20} />
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">پلن نمایش</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-2xl p-5 hover:border-purple-500 cursor-pointer transition-colors relative bg-white flex flex-col h-full">
                    <h4 className="font-bold text-gray-800">برنزی</h4>
                    <p className="text-sm text-gray-500 mt-1 mb-4 flex-1">نمایش در صفحات داخلی و لیست همکاران</p>
                    <div className="font-black text-lg text-purple-700">۱۰,۰۰۰,۰۰۰ <span className="text-sm font-normal text-gray-500">تومان / ماه</span></div>
                  </div>
                  <div className="border-2 border-purple-600 rounded-2xl p-5 cursor-pointer transition-colors relative bg-purple-50 shadow-md flex flex-col h-full">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">پیشنهاد ویژه</div>
                    <h4 className="font-bold text-purple-900">نقره‌ای</h4>
                    <p className="text-sm text-purple-700/80 mt-1 mb-4 flex-1">نمایش در داشبورد تعمیرات و صفحه نتایج</p>
                    <div className="font-black text-lg text-purple-800">۱۵,۰۰۰,۰۰۰ <span className="text-sm font-normal text-purple-600">تومان / ماه</span></div>
                  </div>
                  <div className="border border-gray-200 rounded-2xl p-5 hover:border-purple-500 cursor-pointer transition-colors relative bg-white flex flex-col h-full">
                    <h4 className="font-bold text-gray-800">طلایی</h4>
                    <p className="text-sm text-gray-500 mt-1 mb-4 flex-1">نمایش در صفحه اصلی، ابزار سه‌بعدی و نتایج (بالاترین شانس دیده شدن)</p>
                    <div className="font-black text-lg text-purple-700">۲۰,۰۰۰,۰۰۰ <span className="text-sm font-normal text-gray-500">تومان / ماه</span></div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button type="submit" className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-5 rounded-2xl text-lg font-bold hover:bg-purple-700 transition-colors shadow-lg">
                  <CreditCard size={24} />
                  پرداخت و ثبت نهایی آگهی
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
