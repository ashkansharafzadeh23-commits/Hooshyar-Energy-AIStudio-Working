import React, { useState, useEffect, useMemo } from 'react';
import {
  GeneratorSizingResult,
  GeneratorSupplierMatch,
  GeneratorSupplierDiscoveryResponse
} from '../../types/generator';
import {
  Store,
  MapPin,
  ExternalLink,
  Phone,
  CheckCircle2,
  AlertCircle,
  Package,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Info
} from 'lucide-react';

interface GeneratorSupplierDiscoveryProps {
  sizingResult: GeneratorSizingResult;
  userProvince?: string;
  userCity?: string;
}

const COMMON_PROVINCES = [
  'همه استان‌ها',
  'تهران',
  'اصفهان',
  'خراسان رضوی',
  'فارس',
  'خوزستان',
  'آذربایجان شرقی',
  'مازندران',
  'البرز',
  'کرمان',
  'یزد',
  'گیلان',
  'مرکزی',
  'قزوین'
];

export const GeneratorSupplierDiscovery: React.FC<GeneratorSupplierDiscoveryProps> = ({
  sizingResult,
  userProvince,
  userCity
}) => {
  const [data, setData] = useState<GeneratorSupplierDiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);

  // User-controlled filters
  const [selectedProvince, setSelectedProvince] = useState<string>(userProvince || 'همه استان‌ها');
  const [selectedFuel, setSelectedFuel] = useState<string>('ALL');
  const [selectedPhase, setSelectedPhase] = useState<string>(
    sizingResult.phase === 'THREE_PHASE' ? 'THREE_PHASE' :
    sizingResult.phase === 'SINGLE_PHASE' ? 'SINGLE_PHASE' : 'ALL'
  );
  const [showAllRegardlessOfCapacity, setShowAllRegardlessOfCapacity] = useState<boolean>(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (!showAllRegardlessOfCapacity) {
        if (sizingResult.preliminaryRecommendedKw) {
          params.append('kw', sizingResult.preliminaryRecommendedKw.toString());
        }
        if (sizingResult.preliminaryRecommendedKva) {
          params.append('kva', sizingResult.preliminaryRecommendedKva.toString());
        }
      }

      if (selectedPhase !== 'ALL') {
        params.append('phase', selectedPhase);
      }

      if (selectedFuel !== 'ALL') {
        params.append('fuelType', selectedFuel);
      }

      if (selectedProvince && selectedProvince !== 'همه استان‌ها') {
        params.append('province', selectedProvince);
      }

      const res = await fetch(`/api/vendors/generator-discovery?${params.toString()}`);
      if (!res.ok) {
        throw new Error('خطا در دریافت اطلاعات تأمین‌کنندگان');
      }

      const json: GeneratorSupplierDiscoveryResponse = await res.json();
      setData(json);
      if (json.suppliers.length > 0) {
        setExpandedVendorId(json.suppliers[0].id);
      }
    } catch (err: any) {
      console.error('Generator supplier discovery fetch failed:', err);
      setError(err.message || 'خطا در برقراری ارتباط با بازارگاه تأمین‌کنندگان');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [
    sizingResult.preliminaryRecommendedKw,
    sizingResult.preliminaryRecommendedKva,
    selectedProvince,
    selectedFuel,
    selectedPhase,
    showAllRegardlessOfCapacity
  ]);

  const toggleExpand = (vendorId: string) => {
    setExpandedVendorId(prev => (prev === vendorId ? null : vendorId));
  };

  return (
    <div className="mt-6 border-t border-slate-200 dark:border-zinc-800 pt-5 space-y-4 text-right">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
            <Store size={18} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              تأمین‌کنندگان معتبر موتور برق و دیزل ژنراتور
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ارتباط مستقیم با فروشندگان تأییدشده در سامانه بر اساس نتایج اولیه برآورد
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSuppliers}
          disabled={loading}
          aria-label="بروزرسانی تأمین‌کنندگان"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Mandatory Engineering Trust Notice */}
      <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
        <ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">تذکر مهم مهندسی: </span>
          مقایسه توان صرفاً بر مبنای بار نامی حالت پایدار (Steady-State) است. توان راه‌اندازی الکتروموتورها و الزامات فنی نصب در محل باید حتماً توسط کارشناس و بر اساس کاتالوگ سازنده تأیید شود.
        </div>
      </div>

      {/* User-Controlled Discovery Filter Bar */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-700/60 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            فیلتر و شخصی‌سازی جستجو:
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedProvince('همه استان‌ها');
              setSelectedFuel('ALL');
              setSelectedPhase('ALL');
              setShowAllRegardlessOfCapacity(true);
            }}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            مشاهده تمام تأمین‌کنندگان
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {/* Province Filter */}
          <div>
            <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
              موقعیت جغرافیایی:
            </label>
            <select
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200"
            >
              {COMMON_PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Fuel Filter */}
          <div>
            <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
              نوع سوخت مورد نظر:
            </label>
            <select
              value={selectedFuel}
              onChange={e => setSelectedFuel(e.target.value)}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">همه انواع سوخت</option>
              <option value="DIESEL">دیزل (گازوئیل)</option>
              <option value="GASOLINE">بنزین</option>
              <option value="NATURAL_GAS">گاز طبیعی (شهری)</option>
              <option value="DUAL_FUEL">دوگانه‌سوز</option>
            </select>
          </div>

          {/* Phase Filter */}
          <div>
            <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
              تعداد فاز:
            </label>
            <select
              value={selectedPhase}
              onChange={e => setSelectedPhase(e.target.value)}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">تک فاز و سه فاز</option>
              <option value="SINGLE_PHASE">تک فاز (۲۳۰V)</option>
              <option value="THREE_PHASE">سه فاز (۴۰۰V)</option>
            </select>
          </div>
        </div>

        {/* Preliminary Sizing Benchmark Tag */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1 border-t border-slate-200/50 dark:border-zinc-700/40 text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-700 dark:text-slate-200">مبنای مقایسه بار دائم:</span>
          {sizingResult.preliminaryRecommendedKw ? (
            <span className="bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-mono font-bold">
              {sizingResult.preliminaryRecommendedKw} kW
              {sizingResult.preliminaryRecommendedKva ? ` (~${sizingResult.preliminaryRecommendedKva} kVA)` : ''}
            </span>
          ) : (
            <span className="bg-slate-200/60 dark:bg-zinc-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
              تعیین نشده
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            (تطابق راه‌اندازی موتوری: نیازمند تأیید در کاتالوگ سازنده)
          </span>
        </div>
      </div>

      {/* Content states */}
      {loading ? (
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-zinc-800 flex flex-col items-center justify-center gap-2.5 text-center">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            در حال بازیابی تأمین‌کنندگان واجد شرایط از پایگاه داده بازارگاه...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50 flex items-start gap-3">
          <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-rose-900 dark:text-rose-200">{error}</p>
            <p className="text-rose-700 dark:text-rose-300 text-[11px]">
              می‌توانید برای مشاهده فهرست کل فروشگاه‌ها به بخش تأمین‌کنندگان مراجعه کنید.
            </p>
          </div>
        </div>
      ) : !data || data.suppliers.length === 0 ? (
        /* Safe Empty State */
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-200/80 dark:border-zinc-800 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-zinc-700 flex items-center justify-center text-slate-400">
            <Search size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              با فیلترهای انتخابی فعلی، تأمین‌کننده تأییدشده‌ای با رسته تخصصی ژنراتور یافت نشد
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              تأمین‌کنندگان جدید پس از بررسی و تأیید در سامانه نمایش داده می‌شوند. می‌توانید فیلتر استان یا سوخت را تغییر داده یا تمام تأمین‌کنندگان را مشاهده کنید.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => {
                setSelectedProvince('همه استان‌ها');
                setSelectedFuel('ALL');
                setSelectedPhase('ALL');
                setShowAllRegardlessOfCapacity(true);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              حذف فیلترها و مشاهده همه
            </button>
            <a
              href="/vendors"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>مشاهده دایرکتوری کلی بازارگاه</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      ) : (
        /* Real Supplier List */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <span>
              <strong>{data.suppliers.length}</strong> تأمین‌کننده تأییدشده واجد شرایط ژنراتور یافت شد
            </span>
            <a
              href="/vendors"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0284C7] hover:underline flex items-center gap-1 font-medium"
            >
              <span>مشاهده کل فروشندگان</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="space-y-2.5">
            {data.suppliers.map((supplier: GeneratorSupplierMatch) => {
              const isExpanded = expandedVendorId === supplier.id;

              return (
                <div
                  key={supplier.id}
                  className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-4 transition-all hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {supplier.logoUrl ? (
                        <img
                          src={supplier.logoUrl}
                          alt={supplier.companyName}
                          className="w-12 h-12 rounded-xl object-contain border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 flex items-center justify-center font-bold text-sm shrink-0">
                          {supplier.companyName.slice(0, 2)}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            {supplier.companyName}
                          </h5>
                          {supplier.verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-950/50">
                              <CheckCircle2 size={11} />
                              فروشنده تأییدشده در سامانه
                            </span>
                          )}
                          {supplier.hasPreliminaryRatingNearTarget && (
                            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200/50">
                              رده توان منطبق با بار دائم
                            </span>
                          )}
                        </div>

                        {supplier.aboutUs && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {supplier.aboutUs}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                          {(supplier.city || supplier.province) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" />
                              {supplier.city} {supplier.province ? `(${supplier.province})` : ''}
                            </span>
                          )}
                          {supplier.matchedProductsCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Package size={12} className="text-slate-400" />
                              {supplier.matchedProductsCount} تجهیز ثبت‌شده در کاتالوگ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <a
                        href={`/vendor/${supplier.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs min-h-[34px]"
                      >
                        <span>ویترین و محصولات</span>
                        <ExternalLink size={13} />
                      </a>

                      {supplier.matchedProducts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(supplier.id)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <span>{isExpanded ? 'بستن کاتالوگ' : 'تجهیزات فروشگاه'}</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Product List with Clear Engineering Labels */}
                  {isExpanded && supplier.matchedProducts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>تجهیزات و ژنراتورهای ثبت‌شده توسط فروشنده:</span>
                        <span className="text-[10px] font-normal text-amber-700 dark:text-amber-400">
                          مقایسه توان حالت پایدار (بدون احتساب شوک راه‌اندازی)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {supplier.matchedProducts.map(prod => (
                          <div
                            key={prod.id}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 text-right space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {prod.name}
                              </span>
                              {prod.capacityKw ? (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-1.5 py-0.5 rounded shrink-0">
                                  {prod.capacityKw} kW
                                </span>
                              ) : prod.capacityKva ? (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 px-1.5 py-0.5 rounded shrink-0">
                                  {prod.capacityKva} kVA
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                              <span>{prod.brand ? `${prod.brand} ${prod.model || ''}` : prod.category}</span>
                              {prod.price && prod.price > 0 ? (
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {prod.price.toLocaleString('fa-IR')} تومان
                                </span>
                              ) : (
                                <span className="text-slate-400">استعلام تلفنی قیمت</span>
                              )}
                            </div>
                            {/* Technical Safety Note */}
                            <div className="pt-1 border-t border-slate-200/40 dark:border-zinc-700/40 text-[9px] text-slate-400 flex items-center justify-between">
                              <span>راه‌اندازی موتوری: تأیید نشده (استعلام الزامی)</span>
                              <span>{prod.phase === 'THREE_PHASE' ? 'سه فاز' : prod.phase === 'SINGLE_PHASE' ? 'تک فاز' : ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Contact Phone numbers */}
                  {supplier.phones && supplier.phones.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-50 dark:border-zinc-800/40 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Phone size={11} className="text-slate-400" />
                        تماس مستقیم:
                      </span>
                      {supplier.phones.map((phone, pIdx) => (
                        <a
                          key={pIdx}
                          href={`tel:${phone.number}`}
                          className="hover:text-amber-600 dark:hover:text-amber-400 font-mono text-xs"
                          dir="ltr"
                        >
                          {phone.number} {phone.label ? `(${phone.label})` : ''}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
