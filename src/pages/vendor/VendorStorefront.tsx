import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Globe, ArrowRight, ShieldCheck, Zap, AlertCircle, Package } from 'lucide-react';
import { formatCurrencyIRR } from '../../utils/formatters.js';

export default function VendorStorefront() {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVendor() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/vendors/${id}`);
        if (!res.ok) {
          throw new Error('فروشگاه تجهیزات مورد نظر یافت نشد.');
        }
        const data = await res.json();
        setVendor(data.vendor);
      } catch (err: any) {
        setError(err.message || 'خطا در برقراری ارتباط با سرور.');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchVendor();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">در حال دریافت اطلاعات فروشگاه...</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {error || 'فروشگاه یافت نشد'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
          اطلاعات این فروشگاه تجهیزات در دسترس نیست یا حذف شده است.
        </p>
        <Link
          to="/vendors"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold min-h-[44px]"
        >
          <ArrowRight size={16} />
          بازگشت به فهرست فروشندگان
        </Link>
      </div>
    );
  }

  const products = Array.isArray(vendor.products) ? vendor.products : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-24 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 shadow-xs border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/vendors" 
              className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="بازگشت به فهرست فروشگاه‌ها"
            >
              <ArrowRight size={20} />
            </Link>
            <h1 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">{vendor.companyName}</h1>
          </div>
          {vendor.verified && (
            <div className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck size={14} />
              فروشنده تأیید شده
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 space-y-6">
        {/* Vendor Profile Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start relative overflow-hidden">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 font-black text-3xl shadow-inner overflow-hidden">
              {vendor.logoUrl ? (
                <img src={vendor.logoUrl} alt={vendor.companyName} className="w-full h-full object-contain p-2" />
              ) : (
                vendor.companyName?.charAt(0) || 'ف'
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">{vendor.companyName}</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm text-justify mb-6 whitespace-pre-line">
                {vendor.aboutUs || 'تأمین‌کننده رسمی تجهیزات و ملزومات انرژی خورشیدی.'}
              </p>
              
              <div className="flex flex-wrap gap-3">
                {vendor.phones?.[0]?.number && (
                  <a 
                    href={`tel:${vendor.phones[0].number}`} 
                    className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-xs min-h-[44px]"
                  >
                    <Phone size={16} />
                    تماس با فروشگاه
                  </a>
                )}
                {vendor.website && (
                  <a 
                    href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors min-h-[44px]"
                  >
                    <Globe size={16} />
                    مشاهده وب‌سایت
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Contact and Location Panel */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col justify-center gap-4 relative overflow-hidden">
            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 border-b border-white/10 pb-3">
              <MapPin size={16} />
              اطلاعات تماس و دسترسی
            </h3>
            
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[10px] text-slate-400 mb-0.5">آدرس فروشگاه</div>
                <div className="font-medium leading-relaxed">
                  {vendor.city ? `${vendor.city}، ` : ''}{vendor.address || 'ثبت نشده'}
                </div>
              </div>
              
              {vendor.phones && vendor.phones.length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-400 mb-0.5">شماره‌های تماس</div>
                  <div className="font-mono font-medium flex flex-col gap-1" dir="ltr">
                    {vendor.phones.map((p: any, i: number) => (
                      <span key={i} className="text-right text-slate-200">{p.number}</span>
                    ))}
                  </div>
                </div>
              )}

              {vendor.workingHours && (
                <div>
                  <div className="text-[10px] text-slate-400 mb-0.5">ساعات کاری</div>
                  <div className="font-medium text-slate-200">{vendor.workingHours}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Catalog */}
        <div className="mt-8 sm:mt-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">محصولات و تجهیزات فروشگاه</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">کاتالوگ تجهیزات ثبت‌شده با تصاویر و وضعیت موجودی انبار</span>
            </div>
          </div>
          
          {products.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-10 text-center space-y-2">
              <Package size={36} className="mx-auto text-slate-300 dark:text-zinc-600" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">هنوز محصولی در این فروشگاه ثبت نشده است.</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">تجهیزات این تأمین‌کننده به زودی بارگذاری خواهد شد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product: any) => {
                const isAvailable = product.availability === 'AVAILABLE' || (product.availability !== 'UNAVAILABLE' && product.inStock !== false);
                const firstImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;

                return (
                  <div 
                    key={product.id} 
                    className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all group flex flex-col"
                  >
                    <div className="w-full h-44 bg-slate-100 dark:bg-zinc-800 rounded-xl mb-3 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden relative">
                      {firstImage ? (
                        <img 
                          src={firstImage} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                          <Package size={32} />
                          <span className="text-[10px]">تصویر تجهیز</span>
                        </div>
                      )}
                      
                      {/* Category Badge */}
                      <div className="absolute top-2 right-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs text-slate-800 dark:text-slate-200 text-[10px] px-2.5 py-1 rounded-md font-bold shadow-xs border border-slate-200 dark:border-zinc-700">
                        {product.category}
                      </div>

                      {/* Availability Badge */}
                      <div className="absolute bottom-2 left-2">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                            موجود در انبار
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-700 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                            ناموجود
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 leading-snug flex-1">
                      {product.name}
                    </h3>

                    {(product.brand || product.model) && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        {product.brand} {product.model ? `— مدل ${product.model}` : ''}
                      </div>
                    )}

                    {product.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-end justify-between mt-auto pt-3 border-t border-slate-100 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">قیمت:</span>
                        {product.price && product.price > 0 ? (
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {formatCurrencyIRR(product.price)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500">استعلام تلفنی</span>
                        )}
                      </div>

                      {product.warrantyYears && product.warrantyYears > 0 ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                          {product.warrantyYears} سال گارانتی
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Sticky CTA */}
      {vendor.phones?.[0]?.number && (
        <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 p-3 shadow-lg z-40 sm:hidden">
          <a 
            href={`tel:${vendor.phones[0].number}`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#0284C7] text-white rounded-xl font-black text-sm min-h-[44px]"
          >
            <Phone size={18} />
            تماس با فروشگاه ({vendor.phones[0].number})
          </a>
        </div>
      )}
    </div>
  );
}
