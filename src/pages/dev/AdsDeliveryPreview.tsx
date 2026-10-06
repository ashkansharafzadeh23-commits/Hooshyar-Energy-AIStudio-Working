import React, { useState } from 'react';
import { 
  Megaphone, 
  Smartphone, 
  Monitor, 
  CheckCircle, 
  ShieldCheck, 
  LayoutDashboard,
  Calculator,
  Compass,
  Store,
  Truck,
  TrendingUp,
  Zap,
  Building2,
  Calendar,
  AlertCircle,
  Eye,
  Layers
} from 'lucide-react';
import { AdPlacement, DisplayAd } from '../../components/AdBanner';

export const DEV_PREVIEW_ADS: Record<'banner' | 'card' | 'sidebar', DisplayAd> = {
  banner: {
    id: 'dev_preview_gold',
    advertiser: 'انرژی خورشیدی آفتاب پارس',
    title: 'راهکارهای خورشیدی صنعتی برای کارخانه‌ها',
    subtitle: 'طراحی و اجرای نیروگاه خورشیدی ویژه صنایع و واحدهای تولیدی',
    image: 'https://images.unsplash.com/photo-1509391366360-120953a15443?auto=format&fit=crop&w=1200&q=80',
    link: 'https://aftab-pars.ir/industrial-solar',
    color: 'from-orange-600/90 to-amber-500/90',
    badge: 'پلن طلایی (GOLD)',
    ctaText: 'مشاهده خدمات'
  },
  card: {
    id: 'dev_preview_silver',
    advertiser: 'تجهیز انرژی ایرانیان',
    title: 'پنل خورشیدی و اینورتر صنعتی',
    subtitle: 'تأمین تجهیزات خورشیدی برای پروژه‌های تجاری و صنعتی',
    image: 'https://images.unsplash.com/photo-1548611716-ad78255b706c?auto=format&fit=crop&w=1200&q=80',
    link: 'https://iranian-energy.ir/equipment',
    color: 'from-blue-700/90 to-blue-500/90',
    badge: 'پلن نقره‌ای (SILVER)',
    ctaText: 'مشاهده محصولات'
  },
  sidebar: {
    id: 'dev_preview_bronze',
    advertiser: 'پارس انرژی نو',
    title: 'خدمات نگهداری نیروگاه خورشیدی',
    subtitle: 'بازرسی، سرویس و نگهداری سامانه‌های خورشیدی',
    image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80',
    link: 'https://pars-energy-no.ir/maintenance',
    color: 'from-emerald-700/90 to-green-500/90',
    badge: 'پلن برنزی (BRONZE)',
    ctaText: 'اطلاعات بیشتر'
  }
};

type SurfaceId = 'dashboard' | 'result' | 'recommendation' | 'contractors' | 'vendors';
type DeviceMode = 'desktop' | 'mobile_390' | 'mobile_430' | 'mobile_375';
type SimulationMode = 'DEV_FIXTURES' | 'EMPTY_STATE' | 'LIVE_API';

export default function AdsDeliveryPreview() {
  const [activeSurface, setActiveSurface] = useState<SurfaceId>('dashboard');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('DEV_FIXTURES');

  const getPreviewAds = (placement: 'banner' | 'card' | 'sidebar'): DisplayAd[] | undefined => {
    if (simulationMode === 'LIVE_API') return undefined; // use live fetch
    if (simulationMode === 'EMPTY_STATE') return []; // zero ads -> null render
    return [DEV_PREVIEW_ADS[placement]];
  };

  const getViewportWidth = () => {
    switch (deviceMode) {
      case 'mobile_375': return 'max-w-[375px]';
      case 'mobile_390': return 'max-w-[390px]';
      case 'mobile_430': return 'max-w-[430px]';
      default: return 'w-full';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans p-4 md:p-8 pb-32" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <header className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-200/90">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 mb-2">
                <Megaphone size={14} />
                <span>محیط ارزیابی بصری و استقرار آگهی‌ها (Stage 13.9.3.2 Visual QA)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                پیش‌نمایش استقرار واقعی تبلیغات در صفحات محصول
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                ارزیابی دقیق نحوه قرارگیری بنر طلایی (BANNER)، کارت نقره‌ای (CARD) و سایدبار برنزی (SIDEBAR) در قالب صفحات اصلی و اعتبارسنجی واکنش‌گرایی در نمایشگرهای موبایل Safari (عرض‌های ۳۷۵، ۳۹۰ و ۴۳۰ پیکسل).
              </p>
            </div>

            {/* Viewport Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start lg:self-auto">
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceMode === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor size={15} />
                <span>دسکتاپ</span>
              </button>
              <button
                onClick={() => setDeviceMode('mobile_390')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceMode === 'mobile_390' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone size={15} />
                <span>موبایل ۳۹۰px</span>
              </button>
              <button
                onClick={() => setDeviceMode('mobile_430')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceMode === 'mobile_430' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone size={15} />
                <span>موبایل ۴۳۰px</span>
              </button>
              <button
                onClick={() => setDeviceMode('mobile_375')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  deviceMode === 'mobile_375' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone size={15} />
                <span>۳۷۵px (SE)</span>
              </button>
            </div>
          </div>

          {/* Surface & Simulation Controls */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            {/* Select Surface */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">صفحه محصول:</span>
              {[
                { id: 'dashboard', label: '۱. داشبورد کاربر', icon: LayoutDashboard },
                { id: 'result', label: '۲. نتایج تحلیل', icon: Calculator },
                { id: 'recommendation', label: '۳. پیشنهادها', icon: Compass },
                { id: 'contractors', label: '۴. پیمانکاران EPC', icon: Store },
                { id: 'vendors', label: '۵. تأمین‌کنندگان تجهیزات', icon: Truck },
              ].map(s => {
                const Icon = s.icon;
                const active = activeSurface === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSurface(s.id as SurfaceId)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      active 
                        ? 'bg-[#0284C7] text-white shadow-xs' 
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Simulation Mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">داده شبیه‌سازی:</span>
              <select
                value={simulationMode}
                onChange={(e) => setSimulationMode(e.target.value as SimulationMode)}
                className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#0284C7]"
              >
                <option value="DEV_FIXTURES">نمونه‌های معتبر DEV (سه پلن طلایی/نقره‌ای/برنزی)</option>
                <option value="EMPTY_STATE">حالت خالی (بدون آگهی فعال — باید کاملاً پنهان شود)</option>
                <option value="LIVE_API">اتصال مستقیم به API زنده (/api/ads/list)</option>
              </select>
            </div>
          </div>
        </header>

        {/* Quality Standards Summary */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>نشان افشای <strong>«محتوای تبلیغاتی»</strong> با نشانگر کهربایی روی تمام بنرها و کارت‌ها الزامی و حاضر است.</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck size={16} className="text-[#0284C7] shrink-0" />
            <span>داده‌های DEV فقط در حافظه لوکال قرار دارند و هرگز در <code>db.json</code> یا API عمومی تزریق نمی‌شوند.</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>در صورت نبود آگهی، المان بدون اشغال فضا به صورت تمیز محو می‌شود (Zero Layout Shift).</span>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className={`${getViewportWidth()} mx-auto transition-all duration-300`}>
          {deviceMode !== 'desktop' && (
            <div className="bg-slate-800 text-white text-[11px] font-mono px-4 py-2 rounded-t-2xl flex items-center justify-between border-b border-slate-700">
              <span className="flex items-center gap-1.5">
                <Smartphone size={13} />
                <span>Safari Mobile Simulator</span>
              </span>
              <span>{deviceMode === 'mobile_390' ? '390 × 844 pt' : deviceMode === 'mobile_430' ? '430 × 932 pt' : '375 × 667 pt'}</span>
            </div>
          )}

          <div className={`bg-white p-4 sm:p-6 md:p-8 border border-slate-200/90 shadow-sm ${deviceMode !== 'desktop' ? 'rounded-b-2xl border-t-0' : 'rounded-3xl'} space-y-8`}>
            
            {/* SURFACE 1: USER DASHBOARD */}
            {activeSurface === 'dashboard' && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2 text-[#0284C7] text-xs font-bold mb-1">
                    <LayoutDashboard size={14} />
                    <span>محیط استقرار: پیشخوان کاربری (User Dashboard)</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">پیشخوان مدیریت پروژه‌ها و دارایی‌ها</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    شامل دو جایگاه تبلیغاتی: ۱. ستون کناری برنزی (SIDEBAR) در کنار دارایی‌ها | ۲. بنر طلایی (BANNER) در انتهای صفحه.
                  </p>
                </div>

                {/* Simulated Content: Top Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">پروژه‌های فعال</span>
                    <span className="text-base font-black text-slate-800">۲ نیروگاه</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">ظرفیت کل</span>
                    <span className="text-base font-black text-slate-800">۱۵۰ کیلووات</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">تولید ماهانه</span>
                    <span className="text-base font-black text-slate-800">۲۲,۵۰۰ kWh</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block mb-1">وضعیت سلامت</span>
                    <span className="text-base font-black text-emerald-600">۱۰۰٪ نرمال</span>
                  </div>
                </div>

                {/* Dashboard Grid showing SIDEBAR Placement */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                  {/* Primary 2-column area */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 mb-2">اقدامات توصیه‌شده مهندسی</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        استعلام قیمت تجهیزات اینورتر پروژه شماره ۱۰۲ توسط دو تأمین‌کننده پاسخ داده شد. اسناد مناقصه آماده بررسی نهایی هستند.
                      </p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 mb-2">گزارش هفتگی سامانه مانیتورینگ</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        سامانه پایش هوشمند O&M هیچ خطای اینورتر یا افتی در راندمان استرینگ‌ها ثبت نکرده است.
                      </p>
                    </div>
                  </div>

                  {/* Secondary Column: SIDEBAR Placement */}
                  <div className="space-y-4">
                    <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                      <span>جایگاه ستون کناری (BRONZE)</span>
                      <span className="text-amber-700 font-mono">SIDEBAR</span>
                    </div>

                    {/* BRONZE AD PLACEMENT */}
                    <AdPlacement 
                      placement="SIDEBAR" 
                      previewAds={getPreviewAds('sidebar')} 
                    />

                    {/* Responsive explanation */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                      <strong>رفتار در موبایل:</strong> در نمایش دسکتاپ به عنوان ستون کناری کنار اقدامات قرار دارد؛ در موبایل Safari به شکل طبیعی به زیر لیست منتقل شده و با عرض ۱۰۰٪ به صورت کارتی شکیل رندر می‌شود بدون هیچ‌گونه فشرده‌سازی افقی یا اسکرول ناخواسته.
                    </div>
                  </div>
                </div>

                {/* Bottom Section: GOLD BANNER Placement */}
                <div className="pt-6 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                    <span>جایگاه بنر اصلی عریض (GOLD)</span>
                    <span className="text-amber-600 font-mono">BANNER</span>
                  </div>

                  {/* GOLD AD BANNER */}
                  <AdPlacement 
                    placement="BANNER" 
                    previewAds={getPreviewAds('banner')} 
                  />
                </div>
              </div>
            )}

            {/* SURFACE 2: SOLAR ANALYSIS RESULTS */}
            {activeSurface === 'result' && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2 text-[#0284C7] text-xs font-bold mb-1">
                    <Calculator size={14} />
                    <span>محیط استقرار: صفحه نتایج تحلیل اقتصادی و مهندسی (Result)</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">خلاصه تحلیل مالی و بازگشت سرمایه</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    بنر طلایی همکاران تجاری در پایین نتایج محاسباتی به شکل تمیز مستقر است بدون اینکه با نتایج رسمی ترکیب شود.
                  </p>
                </div>

                {/* Simulated Engineering Output */}
                <div className="p-5 bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl border border-blue-100/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">ظرفیت پیشنهادی سامانه:</span>
                    <span className="font-black text-[#0284C7]">۲۰ کیلووات آن‌گرید</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">دوره بازگشت سرمایه (PBP):</span>
                    <span className="font-black text-emerald-600">۳.۴ سال</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">درآمد سالانه بر مبنای تعرفه رسمی:</span>
                    <span className="font-black text-slate-800">۱۴۸,۰۰۰,۰۰۰ تومان</span>
                  </div>
                </div>

                {/* GOLD BANNER PLACEMENT */}
                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                    <span>جایگاه بنر ویژه طلایی در صفحه نتایج</span>
                    <span className="text-amber-600 font-mono">BANNER</span>
                  </div>

                  <AdPlacement 
                    placement="BANNER" 
                    previewAds={getPreviewAds('banner')} 
                  />
                </div>
              </div>
            )}

            {/* SURFACE 3: RECOMMENDATIONS */}
            {activeSurface === 'recommendation' && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2 text-[#0284C7] text-xs font-bold mb-1">
                    <Compass size={14} />
                    <span>محیط استقرار: صفحه پیشنهادها و تجهیزات سیستم (Recommendation)</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">پیشنهاد ترکیب تجهیزات نیروگاه</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    کارت حامی تجاری نقره‌ای (SILVER CARD) به عنوان بسته پیشنهادی تأمین‌کننده با نشان مشخص تبلیغاتی نمایش داده می‌شود.
                  </p>
                </div>

                {/* Organic Recommendation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-bold text-[#0284C7] block mb-1">پیشنهاد هوشمند سیستم (ارگانیک)</span>
                    <h4 className="text-sm font-black text-slate-800 mb-1">پکیج استاندارد تیپ A (اینورتر مرکزی)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      طراحی بهینه برای سقف‌های سوله صنعتی با زاویه شیب ۱۵ درجه.
                    </p>
                    <div className="text-xs font-bold text-slate-700">راندمان تخمینی: ۸۲.۴٪ PR</div>
                  </div>

                  {/* SPONSORED SILVER CARD */}
                  <div className="flex flex-col">
                    <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>جایگاه کارت حمایت‌شده نقره‌ای</span>
                      <span className="text-blue-600 font-mono">CARD</span>
                    </div>

                    <AdPlacement 
                      placement="CARD" 
                      previewAds={getPreviewAds('card')} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SURFACE 4: CONTRACTORS LIST */}
            {activeSurface === 'contractors' && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2 text-[#0284C7] text-xs font-bold mb-1">
                    <Store size={14} />
                    <span>محیط استقرار: فهرست و بازارگاه پیمانکاران EPC (ContractorsList)</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">شبکه شرکت‌های مهندسی و پیمانکاران مجری</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    شامل کارت تبلیغاتی نقره‌ای (CARD) در بخش معرفی شرکتی و بنر طلایی (BANNER) در انتهای لیست پیمانکاران.
                  </p>
                </div>

                {/* SPONSORED CARD IN CONTRACTORS LIST */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                    <span>کارت برجسته پیمانکار حامی (SILVER CARD)</span>
                    <span className="text-blue-600 font-mono">CARD</span>
                  </div>

                  <div className="max-w-md">
                    <AdPlacement 
                      placement="CARD" 
                      previewAds={getPreviewAds('card')} 
                    />
                  </div>
                </div>

                {/* Simulated Contractor Profiles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <span className="text-xs font-bold text-slate-800 block">شرکت مهندسی پرتو انرژی آریا</span>
                    <span className="text-[11px] text-slate-500">رتبه ۱ ساتبا | تهران | ۵۰ مگاوات اجرا شده</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <span className="text-xs font-bold text-slate-800 block">فناوران خورشیدی کویر</span>
                    <span className="text-[11px] text-slate-500">متخصص نیروگاه خورشیدی یزد و کرمان</span>
                  </div>
                </div>

                {/* Bottom GOLD BANNER in ContractorsList */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                    <span>بنر طلایی در انتهای صفحه پیمانکاران</span>
                    <span className="text-amber-600 font-mono">BANNER</span>
                  </div>

                  <AdPlacement 
                    placement="BANNER" 
                    previewAds={getPreviewAds('banner')} 
                  />
                </div>
              </div>
            )}

            {/* SURFACE 5: VENDORS LIST */}
            {activeSurface === 'vendors' && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2 text-[#0284C7] text-xs font-bold mb-1">
                    <Truck size={14} />
                    <span>محیط استقرار: فهرست تأمین‌کنندگان و تجهیزات خورشیدی (VendorsList)</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">تأمین‌کنندگان معتبر پنل، اینورتر و استراکچر</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    شامل کارت نقره‌ای حامی تجهیزات (CARD) و بنر ویژه طلایی برندینگ (BANNER).
                  </p>
                </div>

                {/* SILVER CARD IN VENDORS LIST */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                    <span>کارت تجهیزات حامی تجاری (SILVER CARD)</span>
                    <span className="text-blue-600 font-mono">CARD</span>
                  </div>

                  <div className="max-w-md">
                    <AdPlacement 
                      placement="CARD" 
                      previewAds={getPreviewAds('card')} 
                    />
                  </div>
                </div>

                {/* Simulated Equipment Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold block">پنل JA Solar ۵۵۰W</span>
                    <span className="text-slate-400 text-[11px]">انبار تهران - موجود</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold block">اینورتر Sungrow ۱۰۰kW</span>
                    <span className="text-slate-400 text-[11px]">با گارانتی ۵ ساله</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold block">کابل سولار KBE آلمان</span>
                    <span className="text-slate-400 text-[11px]">مقطع ۶ میلی‌متر</span>
                  </div>
                </div>

                {/* GOLD BANNER IN VENDORS LIST */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                    <span>بنر طلایی برند در انتهای صفحه تأمین‌کنندگان</span>
                    <span className="text-amber-600 font-mono">BANNER</span>
                  </div>

                  <AdPlacement 
                    placement="BANNER" 
                    previewAds={getPreviewAds('banner')} 
                  />
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
