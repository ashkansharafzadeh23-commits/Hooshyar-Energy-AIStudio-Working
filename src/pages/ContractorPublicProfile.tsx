import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Briefcase, 
  Zap, 
  Calendar, 
  Phone,
  Package
} from 'lucide-react';
import { formatCurrencyIRR, formatPersianNumber } from '../utils/formatters.js';

interface PortfolioProject {
  id: string;
  title: string;
  projectType: string;
  province?: string;
  city?: string;
  installedCapacityKw?: number;
  completionYear?: string | number;
  description?: string;
  images: string[];
}

interface PublicEpc {
  id: string;
  name: string;
  tradeName: string;
  legalName?: string;
  type: string;
  verificationStatus: string;
  verified: boolean;
  city?: string;
  address?: string;
  phone?: string;
  specialties: string[];
  bio?: string;
  logoUrl?: string;
  projectPortfolio?: PortfolioProject[];
  products?: any[];
  createdAt: string;
}

export default function ContractorPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [epc, setEpc] = useState<PublicEpc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEpc() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/contractors/${id}`);
        if (!res.ok) {
          throw new Error('شرکت پیمانکار یافت نشد.');
        }
        const data = await res.json();
        setEpc(data.contractor);
      } catch (err: any) {
        setError(err.message || 'خطا در بارگذاری مشخصات شرکت');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchEpc();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center text-slate-500 dark:text-zinc-400 text-sm">
          در حال بارگذاری اطلاعات پیمانکار...
        </div>
      </div>
    );
  }

  if (error || !epc) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {error || 'پیمانکار یافت نشد'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
          اطلاعات این شرکت پیمانکاری در دسترس نیست یا حذف شده است.
        </p>
        <Link
          to="/contractors"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold min-h-[44px]"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست پیمانکاران
        </Link>
      </div>
    );
  }

  const portfolio = Array.isArray(epc.projectPortfolio) ? epc.projectPortfolio : [];
  const products = Array.isArray(epc.products) ? epc.products : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans py-10 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/contractors"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست پیمانکاران EPC
        </Link>

        {/* Profile Card Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-zinc-800">
            {epc.logoUrl ? (
              <img
                src={epc.logoUrl}
                alt={epc.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-contain p-2 border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Building2 size={44} />
              </div>
            )}

            <div className="flex-1 text-center sm:text-right">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {epc.name}
                </h1>
                {epc.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold self-center sm:self-auto">
                    <ShieldCheck size={14} />
                    پیمانکار تأییدشده
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium self-center sm:self-auto">
                    <Clock size={14} />
                    عضو شبکه پیمانکاران
                  </span>
                )}
              </div>

              {epc.legalName && epc.legalName !== epc.name && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  نام ثبتی: {epc.legalName}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-zinc-400 mt-2">
                {epc.city && (
                  <div className="flex items-center gap-1">
                    <MapPin size={14} className="text-slate-400" />
                    <span>محل استقرار: {epc.city}</span>
                  </div>
                )}
                {epc.address && (
                  <div className="flex items-center gap-1">
                    <span>نشانی: {epc.address}</span>
                  </div>
                )}
                {epc.phone && (
                  <div className="flex items-center gap-1" dir="ltr">
                    <Phone size={14} className="text-slate-400" />
                    <span>{epc.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="pt-6">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-2.5">
              حوزه‌های فعالیت و خدمات مهندسی
            </h2>
            <div className="flex flex-wrap gap-2">
              {epc.specialties && epc.specialties.length > 0 ? (
                epc.specialties.map((spec, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold"
                  >
                    {spec}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">طراحی، تأمین و احداث نیروگاه‌های خورشیدی (EPC)</span>
              )}
            </div>
          </div>

          {/* Bio */}
          {epc.bio && (
            <div className="pt-6">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-2">
                درباره شرکت پیمانکار
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line text-justify">
                {epc.bio}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to="/power-plant-setup"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors min-h-[44px]"
            >
              <Zap size={16} />
              ثبت درخواست استعلام قیمت و مناقصه (RFQ)
            </Link>
          </div>
        </div>

        {/* Project Portfolio Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <Briefcase className="text-[#0284C7]" size={20} />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              سبد پروژه‌های اجرا شده / Portfolio ({portfolio.length})
            </h2>
          </div>

          {portfolio.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              هنوز نمونه‌پروژه‌ای در این بخش ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolio.map(proj => (
                <div 
                  key={proj.id}
                  className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-50 dark:bg-zinc-850/50 flex flex-col"
                >
                  {/* Project Image Gallery Preview */}
                  {Array.isArray(proj.images) && proj.images.length > 0 ? (
                    <div className="w-full h-48 overflow-hidden bg-slate-100 dark:bg-zinc-800 relative">
                      <img 
                        src={proj.images[0]} 
                        alt={proj.title} 
                        className="w-full h-full object-cover" 
                      />
                      {proj.images.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                          +{proj.images.length - 1} تصویر دیگر
                        </span>
                      )}
                      <span className="absolute top-2 right-2 bg-white/90 dark:bg-zinc-900/90 text-slate-800 dark:text-slate-200 text-[10px] px-2 py-0.5 rounded font-bold">
                        {proj.projectType}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                      <Briefcase size={28} />
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {proj.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        {proj.installedCapacityKw && (
                          <span className="font-bold text-[#0284C7]">
                            ظرفیت: {formatPersianNumber(proj.installedCapacityKw)} کیلووات
                          </span>
                        )}
                        {(proj.province || proj.city) && (
                          <span>
                            محل: {proj.province ? `${proj.province}، ` : ''}{proj.city || ''}
                          </span>
                        )}
                        {proj.completionYear && (
                          <span>سال اجرا: {proj.completionYear}</span>
                        )}
                      </div>

                      {proj.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2 text-justify">
                          {proj.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional Products / Equipment Section */}
        {products.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <Package className="text-amber-500" size={20} />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                تجهیزات و اقلام اختصاصی پیمانکار ({products.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map(prod => (
                <div 
                  key={prod.id}
                  className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 bg-slate-50 dark:bg-zinc-850/50 flex flex-col"
                >
                  {prod.images?.[0] ? (
                    <div className="w-full h-36 rounded-xl overflow-hidden mb-3 bg-white dark:bg-zinc-800">
                      <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                    </div>
                  ) : null}

                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mb-1">
                    {prod.name}
                  </h3>

                  <div className="text-[10px] text-slate-500 mb-2">
                    {prod.category} {prod.brand ? `• ${prod.brand}` : ''}
                  </div>

                  {prod.price && prod.price > 0 && (
                    <div className="mt-auto pt-2 border-t border-slate-200 dark:border-zinc-800 text-xs font-bold text-[#0284C7]">
                      {formatCurrencyIRR(prod.price)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
