import React from 'react';
import { motion } from 'framer-motion';
import { AdBanner } from '../components/AdBanner';
import { Link } from 'react-router-dom';
import { Store, UserCircle, Megaphone, LogIn, ArrowLeft, Building2 } from 'lucide-react';

export default function VendorsList() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center max-w-5xl mx-auto pt-10 px-4 pb-24"
    >
      
      <div className="w-full mb-8 rounded-2xl overflow-hidden"><AdBanner layout="marquee" /></div>

      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black mb-4 text-gray-800">بخش همکاران و متخصصین</h1>
        <p className="text-gray-600 text-lg">لطفاً بخش مورد نظر خود را انتخاب کنید</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {/* Option 4: Contractors */}
        <Link to="/contractor-auth" className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-amber-500 transition-all flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0 group-hover:bg-amber-100 transition-colors"></div>
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 z-10 group-hover:scale-110 transition-transform">
            <Building2 size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3 z-10 text-gray-800">شرکت ها برای احداث نیروگاه</h2>
          <p className="text-gray-600 mb-8 z-10 flex-1">
            مخصوص شرکت‌های مجری و پیمانکاران احداث نیروگاه جهت ثبت‌نام و فعالیت.
          </p>
          <div className="w-full bg-amber-50 text-amber-600 font-bold py-3 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center gap-2 z-10">
            <LogIn size={20} />
            ورود / ثبت‌نام
          </div>
        </Link>
        {/* Option 1: Vendor Auth */}
        <Link to="/vendor-auth" className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 group-hover:bg-blue-100 transition-colors"></div>
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 z-10 group-hover:scale-110 transition-transform">
            <Store size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3 z-10 text-gray-800">ورود فروشندگان</h2>
          <p className="text-gray-600 mb-8 z-10 flex-1">
            مخصوص تامین‌کنندگان، فروشندگان تجهیزات و شرکت‌ها جهت دسترسی به پرتال فروش.
          </p>
          <div className="w-full bg-blue-50 text-blue-600 font-bold py-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center gap-2 z-10">
            <LogIn size={20} />
            ورود / ثبت‌نام
          </div>
        </Link>

        {/* Option 2: Technician Auth */}
        <Link to="/technician-auth" className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-green-500 transition-all flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-0 group-hover:bg-green-100 transition-colors"></div>
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 z-10 group-hover:scale-110 transition-transform">
            <UserCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3 z-10 text-gray-800">ورود کارشناسان فنی</h2>
          <p className="text-gray-600 mb-8 z-10 flex-1">
            مخصوص کارشناسان سیستم‌های خورشیدی و تعمیرکاران جهت فعالیت در پلتفرم.
          </p>
          <div className="w-full bg-green-50 text-green-600 font-bold py-3 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors flex items-center justify-center gap-2 z-10">
            <LogIn size={20} />
            ورود / ثبت‌نام
          </div>
        </Link>
        
        {/* Option 3: Ads Portal */}
        <Link to="/ads-portal" className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-purple-500 transition-all flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 group-hover:bg-purple-100 transition-colors"></div>
          <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-6 z-10 group-hover:scale-110 transition-transform">
            <Megaphone size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3 z-10 text-gray-800">ثبت تبلیغات</h2>
          <p className="text-gray-600 mb-8 z-10 flex-1">
            پرتال ثبت بنر، ویدیو و تیزرهای تبلیغاتی جهت نمایش ویژه به کاربران.
          </p>
          <div className="w-full bg-purple-50 text-purple-600 font-bold py-3 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center gap-2 z-10">
            <Megaphone size={20} />
            ثبت آگهی تبلیغاتی
          </div>
        </Link>
      </div>
      
      <div className="mt-12 w-full">
        <AdBanner layout="hero" />
      </div>
    </motion.div>
  );
}
