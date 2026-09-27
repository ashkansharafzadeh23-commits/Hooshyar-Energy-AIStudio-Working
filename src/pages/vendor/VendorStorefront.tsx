import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Globe, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function VendorStorefront() {
  const { id } = useParams();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch /api/vendors/:id
    setTimeout(() => {
      setVendor({
        id,
        companyName: 'نیرو گستران پارس',
        aboutUs: 'شرکت نیرو گستران پارس با بیش از ۱۰ سال سابقه در زمینه مشاوره، تامین و اجرای سیستم‌های انرژی خورشیدی، ژنراتورهای صنعتی و سیستم‌های ذخیره‌سازی انرژی (UPS) فعالیت می‌کند. هدف ما ارائه بهترین و مطمئن‌ترین راهکارها با بالاترین راندمان است.',
        city: 'تهران',
        address: 'خیابان لاله‌زار جنوبی، پاساژ بوشهری، پلاک ۱۲',
        phones: [{ number: '021-33112233' }, { number: '09123456789' }],
        workingHours: 'شنبه تا چهارشنبه: ۹ الی ۱۸ | پنجشنبه: ۹ الی ۱۴',
        website: 'www.nirogoostar-pars.ir',
        logoUrl: '',
        products: [
          { id: 1, name: 'پنل خورشیدی JA Solar 550W', category: 'پنل خورشیدی', price: 4500000, img: null },
          { id: 2, name: 'اینورتر Growatt 5kW', category: 'اینورتر', price: 32000000, img: null },
          { id: 3, name: 'باتری ژل صبا 100Ah', category: 'باتری', price: 6500000, img: null },
          { id: 4, name: 'استراکچر آلومینیومی سقفی', category: 'تجهیزات نصب', price: 1200000, img: null },
        ]
      });
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-[#FF9E2C] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#5A6072] font-medium">در حال دریافت اطلاعات فروشگاه...</p>
      </div>
    </div>
  );
  
  if (!vendor) return <div className="p-20 text-center">فروشنده یافت نشد</div>;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[#E4E7EC] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/vendors" className="w-10 h-10 bg-[#F7F8FA] rounded-full flex items-center justify-center text-[#1A1D23] hover:bg-[#E4E7EC] transition-colors">
              <ArrowRight size={20} />
            </Link>
            <h1 className="font-black text-lg text-[#1A1D23]">{vendor.companyName}</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold bg-[#1F9254]/10 text-[#1F9254] px-3 py-1.5 rounded-full border border-[#1F9254]/20">
            <ShieldCheck size={14} />
            فروشنده تایید شده
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        {/* Vendor Profile Hero (Bento Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E4E7EC] flex flex-col sm:flex-row gap-6 sm:gap-8 items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FF9E2C]/10 to-transparent rounded-bl-[100px] pointer-events-none"></div>
            
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl flex items-center justify-center shrink-0 text-[#5A6072] font-black text-3xl shadow-inner z-10">
              {vendor.logoUrl ? <img src={vendor.logoUrl} alt="logo" className="w-full h-full object-contain p-2" /> : vendor.companyName.charAt(0)}
            </div>
            
            <div className="flex-1 z-10">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-black text-[#1A1D23]">{vendor.companyName}</h2>
              </div>
              <p className="text-[#5A6072] leading-relaxed text-sm sm:text-base text-justify mb-6">
                {vendor.aboutUs}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <a href={`tel:${vendor.phones[0]?.number}`} className="bg-[#1A1D23] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-black transition-colors shadow-lg">
                  <Phone size={16} />
                  تماس سریع
                </a>
                <a href={vendor.website ? `https://${vendor.website}` : '#'} target="_blank" rel="noreferrer" className="bg-white border-2 border-[#E4E7EC] text-[#1A1D23] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:border-[#1A1D23] transition-colors">
                  <Globe size={16} />
                  مشاهده وب‌سایت
                </a>
              </div>
            </div>
          </div>

          <div className="bg-[#12151B] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-center gap-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF9E2C] via-[#FFD166] to-[#E8590C]"></div>
             
             <h3 className="text-sm font-bold text-[#FF9E2C] flex items-center gap-2 border-b border-white/10 pb-3">
               <MapPin size={18} />
               اطلاعات تماس و دسترسی
             </h3>
             
             <div className="space-y-4">
               <div>
                 <div className="text-[10px] text-gray-400 mb-1">آدرس فروشگاه</div>
                 <div className="text-sm font-medium leading-relaxed">{vendor.city}، {vendor.address}</div>
               </div>
               
               <div>
                 <div className="text-[10px] text-gray-400 mb-1">شماره‌های تماس</div>
                 <div className="text-sm font-medium flex flex-col gap-1" dir="ltr">
                   {vendor.phones.map((p: any, i: number) => (
                     <span key={i} className="text-right">{p.number}</span>
                   ))}
                 </div>
               </div>

               <div>
                 <div className="text-[10px] text-gray-400 mb-1">ساعات کاری</div>
                 <div className="text-sm font-medium">{vendor.workingHours}</div>
               </div>
             </div>
          </div>
        </div>

        {/* Products */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#FF9E2C]/10 text-[#FF9E2C] rounded-xl flex items-center justify-center">
              <Zap size={20} />
            </div>
            <h2 className="text-xl font-black text-[#1A1D23]">محصولات و خدمات ارائه شده</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {vendor.products.map((product: any) => (
              <div key={product.id} className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm hover:shadow-md transition-all group flex flex-col">
                <div className="w-full h-40 bg-[#F7F8FA] rounded-xl mb-4 border border-[#E4E7EC] flex items-center justify-center overflow-hidden relative">
                   {product.img ? (
                     <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                   ) : (
                     <span className="text-[10px] text-[#5A6072] font-bold">تصویر محصول</span>
                   )}
                   <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[#1A1D23] text-[10px] px-2 py-1 rounded-md font-bold shadow-sm">
                     {product.category}
                   </div>
                </div>
                <h3 className="font-bold text-sm text-[#1A1D23] mb-2 leading-tight flex-1 group-hover:text-[#FF9E2C] transition-colors">{product.name}</h3>
                <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#F7F8FA]">
                  <div>
                    <span className="text-xs text-[#5A6072] block mb-0.5">قیمت:</span>
                    <span className="text-[#1A1D23] font-black">{product.price.toLocaleString()} <span className="text-[10px] font-normal">تومان</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#E4E7EC] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 sm:hidden">
        <a 
          href={`tel:${vendor.phones[0]?.number}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#FF9E2C] text-white rounded-xl font-black shadow-[0_4px_12px_rgba(255,158,44,0.3)]"
        >
          <Phone size={18} />
          تماس با فروشنده
        </a>
      </div>
    </div>
  );
}

