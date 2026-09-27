import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Subscription() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-black text-[#1A1D23] mb-4">ارتقا به فروشنده ویژه</h1>
        <p className="text-[#5A6072]">
          با تهیه اشتراک ویژه، محصولات شما به عنوان پیشنهاد هوشمند در نتایج تحلیل به مشتریان نمایش داده می‌شود و فروش خود را چند برابر کنید.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Monthly Plan */}
        <div className="bg-white rounded-3xl border border-[#E4E7EC] p-8 shadow-sm flex flex-col hover:border-[#1F9254] transition-colors relative">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#1A1D23] mb-2">اشتراک ماهانه</h2>
            <p className="text-sm text-[#5A6072]">مناسب برای تست بازدهی پلتفرم</p>
          </div>
          <div className="mb-8">
            <span className="text-4xl font-black text-[#1A1D23]">۲۰,۰۰۰,۰۰۰</span>
            <span className="text-sm text-[#5A6072] mr-2">تومان / ماهانه</span>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-[#5A6072]">
              <CheckCircle2 size={20} className="text-[#1F9254] shrink-0" />
              <span>نمایش در نتایج تحلیل هوشمند</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-[#5A6072]">
              <CheckCircle2 size={20} className="text-[#1F9254] shrink-0" />
              <span>صفحه اختصاصی فروشگاه با لینک مستقیم</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-[#5A6072]">
              <CheckCircle2 size={20} className="text-[#1F9254] shrink-0" />
              <span>ثبت نامحدود محصول</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-[#5A6072]">
              <CheckCircle2 size={20} className="text-[#1F9254] shrink-0" />
              <span>پشتیبانی تیکتی</span>
            </li>
          </ul>

          <button className="w-full py-3.5 bg-white border-2 border-[#1A1D23] text-[#1A1D23] rounded-xl font-bold hover:bg-[#F7F8FA] transition-colors">
            انتخاب طرح ماهانه
          </button>
        </div>

        {/* Annual Plan */}
        <div className="bg-[#12151B] rounded-3xl border border-[#12151B] p-8 shadow-xl flex flex-col relative transform md:-translate-y-4">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#FF9E2C] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
            پیشنهاد ویژه (۲ ماه رایگان)
          </div>

          <div className="mb-6 mt-4">
            <h2 className="text-xl font-bold text-white mb-2">اشتراک سالانه</h2>
            <p className="text-gray-400 text-sm">بهترین انتخاب برای فروشندگان حرفه‌ای</p>
          </div>
          <div className="mb-8">
            <span className="text-4xl font-black text-[#FF9E2C]">۲۰۰,۰۰۰,۰۰۰</span>
            <span className="text-sm text-gray-400 mr-2">تومان / سالانه</span>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-sm text-gray-300">
              <CheckCircle2 size={20} className="text-[#FF9E2C] shrink-0" />
              <span>تمامی امکانات طرح ماهانه</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-300">
              <CheckCircle2 size={20} className="text-[#FF9E2C] shrink-0" />
              <span>اولویت نمایش بالاتر در محصولات پیشنهادی</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-300">
              <CheckCircle2 size={20} className="text-[#FF9E2C] shrink-0" />
              <span>گزارشات پیشرفته فروش و بازدید</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-300">
              <CheckCircle2 size={20} className="text-[#FF9E2C] shrink-0" />
              <span>پشتیبانی تلفنی و اختصاصی ۲۴ ساعته</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-gray-300">
              <CheckCircle2 size={20} className="text-[#FF9E2C] shrink-0" />
              <span>ارسال پیامک معرفی به خریداران منطقه</span>
            </li>
          </ul>

          <button className="w-full py-3.5 bg-[#FF9E2C] text-white rounded-xl font-bold hover:bg-[#E8590C] transition-colors shadow-[0_4px_12px_rgba(255,158,44,0.3)]">
            خرید طرح سالانه
          </button>
        </div>
      </div>
    </motion.div>
  );
}
