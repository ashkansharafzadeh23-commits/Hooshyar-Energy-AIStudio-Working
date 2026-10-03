import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package, 
  Megaphone, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Building2,
  FileCheck2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Inbox,
  Store,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { formatPersianNumber, formatJalaliDate } from '../../../utils/formatters';

interface VendorDashboardProps {
  previewMode?: boolean;
  initialAds?: any[];
  initialInvitations?: any[];
  initialPOs?: any[];
  initialVendor?: any;
}

export default function Dashboard({
  previewMode = false,
  initialAds,
  initialInvitations,
  initialPOs,
  initialVendor
}: VendorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'inquiries' | 'ads'>('overview');
  const [myAds, setMyAds] = useState<any[]>(initialAds || []);
  const [invitations, setInvitations] = useState<any[]>(initialInvitations || []);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>(initialPOs || []);
  const [vendorData, setVendorData] = useState<any>(initialVendor || {
    companyName: 'شرکت نیرو گستران پارس',
    city: 'تهران',
    phone: '021-33112233',
    productsCount: previewMode ? 4 : 0,
    profileCompleteness: 85
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (previewMode) return;

    const fetchVendorData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // 1. Fetch real ads
        const adsRes = await fetch('/api/ads/my-ads', { headers });
        if (adsRes.ok) {
          const data = await adsRes.json();
          setMyAds(Array.isArray(data.ads) ? data.ads : []);
        }

        // 2. Fetch real vendor invitations / RFQ inquiries
        const invRes = await fetch('/api/vendor/invitations', { headers });
        if (invRes.ok) {
          const invData = await invRes.json();
          setInvitations(Array.isArray(invData) ? invData : []);
        }

        // 3. Fetch purchase orders
        const poRes = await fetch('/api/vendor/purchase-orders', { headers });
        if (poRes.ok) {
          const poData = await poRes.json();
          setPurchaseOrders(Array.isArray(poData) ? poData : []);
        }
      } catch (err) {
        console.error('Failed to load vendor portal data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [previewMode]);

  const activeAdsCount = myAds.filter(a => a.status === 'active').length;
  const pendingAdsCount = myAds.filter(a => a.status === 'pending_review' || a.status === 'pending').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto font-sans"
      dir="rtl"
    >
      {/* 1. VENDOR IDENTITY & ATTENTION HEADER */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
              <Store size={32} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {vendorData.companyName}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 flex items-center gap-1">
                  <Building2 size={13} className="text-slate-500" />
                  پروفایل کسب‌وکار
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مرکز عملیاتی تأمین کالا، پاسخ به استعلام‌های تجهیزات و مدیریت کمپین‌ها
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>موقعیت: <strong>{vendorData.city || 'تهران'}</strong></span>
                <span>•</span>
                <span>تلفن تماس: <strong dir="ltr">{vendorData.phone || 'ثبت نشده'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Link 
              to="/vendor-portal/dashboard/products"
              className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 min-h-[44px] shadow-xs transition-colors"
            >
              <Plus size={16} />
              <span>مدیریت محصولات</span>
            </Link>
            <Link 
              to="/ads/portal"
              className="bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 min-h-[44px] transition-colors"
            >
              <Megaphone size={16} className="text-[#0284C7]" />
              <span>سفارش تبلیغات</span>
            </Link>
          </div>
        </div>

        {/* Profile Completeness Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              تکمیل پروفایل فروشگاه:
            </span>
            <div className="w-32 bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${vendorData.profileCompleteness || 85}%` }}
              />
            </div>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {formatPersianNumber(vendorData.profileCompleteness || 85)}٪
            </span>
          </div>

          <Link 
            to="/vendor-portal/dashboard/profile"
            className="text-[#0284C7] hover:underline font-bold flex items-center gap-1"
          >
            <span>تکمیل و به‌روزرسانی مدارک شرکت</span>
            <ArrowRight size={14} className="rotate-180" />
          </Link>
        </div>
      </div>

      {/* 2. ATTENTION CENTER: OPERATIONAL KPIS (TRUTHFUL ONLY) */}
      <section aria-label="مرکز اولویت‌های تأمین‌کننده">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Equipment Inquiries */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold mb-1">
                استعلام‌های تجهیزات
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {invitations.length > 0 ? (
                  <span>{formatPersianNumber(invitations.length)} <span className="text-xs font-normal text-slate-400">مورد</span></span>
                ) : (
                  <span className="text-xs font-bold text-slate-500">در حال حاضر درخواست جدیدی وجود ندارد</span>
                )}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] flex items-center justify-center shrink-0">
              <Inbox size={20} />
            </div>
          </div>

          {/* Card 2: Active Products in Catalog */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold mb-1">
                محصولات در کاتالوگ
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {vendorData.productsCount ? (
                  <span>{formatPersianNumber(vendorData.productsCount)} <span className="text-xs font-normal text-slate-400">قلم کالا</span></span>
                ) : (
                  <span className="text-xs font-bold text-slate-500">ثبت نشده</span>
                )}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
          </div>

          {/* Card 3: Active Ads */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold mb-1">
                تبلیغات تجاری فعال
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {formatPersianNumber(activeAdsCount)} <span className="text-xs font-normal text-slate-400">کمپین</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <Megaphone size={20} />
            </div>
          </div>

          {/* Card 4: Purchase Orders (PO) */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold mb-1">
                سفارش‌های رسمی (PO)
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {purchaseOrders.length > 0 ? (
                  <span>{formatPersianNumber(purchaseOrders.length)} <span className="text-xs font-normal text-slate-400">سفارش</span></span>
                ) : (
                  <span className="text-xs font-bold text-slate-500">ثبت نشده</span>
                )}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
              <FileCheck2 size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* 3. WORKSPACE SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#0284C7] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          نمای کلی و استعلام‌ها
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inquiries')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
            activeTab === 'inquiries'
              ? 'bg-[#0284C7] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          دعوت‌نامه‌ها و استعلام قیمت ({invitations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
            activeTab === 'ads'
              ? 'bg-[#0284C7] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          کمپین‌های تبلیغاتی ({myAds.length})
        </button>
      </div>

      {/* 4. TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Inquiries / Opportunities */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Inbox className="text-[#0284C7]" size={18} />
                  استعلام‌های قیمت دریافت شده از پیمانکاران و خریداران
                </h3>
              </div>

              {invitations.length === 0 ? (
                <div className="py-12 px-4 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Inbox size={26} />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                    در حال حاضر درخواست جدیدی وجود ندارد
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    به محض انتشار استعلام تأمین تجهیزات خورشیدی منطبق با محصولات فروشگاه شما، فرصت‌های فروش در این قسمت قرار می‌گیرند.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv, idx) => (
                    <div 
                      key={inv.id || idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                          {inv.title || `استعلام تأمین تجهیزات نیروگاهی شماره ${formatPersianNumber(idx + 1)}`}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          مهلت پاسخ: {inv.deadline ? formatJalaliDate(inv.deadline) : 'طبق زمان‌بندی'}
                        </span>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-[#0284C7] dark:bg-blue-950/40 border border-blue-200 shrink-0">
                        در انتظار پیشنهاد قیمت
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Truthful Platform Traffic Card (Anti-Slop: NO fake charts) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="text-[#0284C7]" size={18} />
                وضعیت ترافیک و آمار بازدید فروشگاه
              </h3>
              <div className="p-6 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-lg mx-auto leading-relaxed">
                  اطلاعات آماری بازدید و ارجاعات مستقیم خریداران به صورت برخط و همگام با بازدیدهای کاربران از کاتالوگ ثبت می‌گردد. در حال حاضر آمار ساختگی برای این فروشگاه تولید نمی‌شود.
                </p>
              </div>
            </div>
          </div>

          {/* Side Column: Catalog Summary & Business Information */}
          <div className="space-y-6">
            {/* Catalog Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  کاتالوگ محصولات
                </h3>
                <Link 
                  to="/vendor-portal/dashboard/products"
                  className="text-xs text-[#0284C7] font-bold hover:underline"
                >
                  مشاهده همه
                </Link>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                تجهیزات ثبت‌شده در پنل هوشیار انرژی، در پیشنهادهای فنی استعلام‌ها به پیمانکاران پیشنهاد داده می‌شوند.
              </p>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
                <span>تعداد کالاهای ثبت‌شده:</span>
                <span className="font-black text-sm">{formatPersianNumber(vendorData.productsCount || 0)} مورد</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-2.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
                دسترسی‌های سریع
              </h3>
              <Link 
                to="/vendor/vendor_001" 
                target="_blank"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors min-h-[44px]"
              >
                <span>صفحه اختصاصی فروشگاه عمومی</span>
                <ExternalLink size={15} className="text-slate-400" />
              </Link>
              <Link 
                to="/ads/portal" 
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors min-h-[44px]"
              >
                <span>ثبت آگهی بنری در پلتفرم</span>
                <Megaphone size={15} className="text-[#0284C7]" />
              </Link>
              <Link 
                to="/vendor-portal/dashboard/subscription" 
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors min-h-[44px]"
              >
                <span>اشتراک تجاری تأمین‌کنندگان</span>
                <CreditCard size={15} className="text-[#0284C7]" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* INQUIRIES TAB */}
      {activeTab === 'inquiries' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
              استعلام‌های تأمین و درخواست‌های قیمت
            </h3>
          </div>

          {invitations.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Inbox size={32} />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">
                در حال حاضر درخواست جدیدی وجود ندارد
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                استعلام‌های قیمت ثبت‌شده توسط پیمانکاران EPC و کارفرمایان نیروگاهی پس از انتشار در این بخش نمایش داده می‌شوند.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-700">
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-300">عنوان استعلام</th>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-300">درخواست‌دهنده</th>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-300">مهلت ارسال</th>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-300">وضعیت</th>
                    <th className="p-3 font-bold text-slate-700 dark:text-slate-300">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv, idx) => (
                    <tr key={inv.id || idx} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {inv.title || `استعلام خرید تجهیزات ${idx + 1}`}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {inv.requesterName || 'پیمانکار متقاضی'}
                      </td>
                      <td className="p-3 text-slate-500">
                        {inv.deadline ? formatJalaliDate(inv.deadline) : 'مشخص نشده'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0284C7] border border-blue-200">
                          فعال
                        </span>
                      </td>
                      <td className="p-3">
                        <button 
                          type="button"
                          className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-3 py-1.5 rounded-lg font-bold text-xs min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          ارسال قیمت
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADS TAB */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">کمپین‌های تبلیغاتی فروشگاه</h3>
                <p className="text-xs text-slate-500">مدیریت آگهی‌های بنری ثبت‌شده در سامانه</p>
              </div>
              <Link 
                to="/ads/portal"
                className="bg-[#0284C7] hover:bg-[#0369A1] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[44px]"
              >
                <Plus size={16} />
                <span>ثبت تبلیغ جدید</span>
              </Link>
            </div>
            
            {myAds.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Megaphone size={40} className="text-slate-300" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">هنوز کمپین تبلیغاتی فعالی ثبت نکرده‌اید</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  برای نمایش بنرهای تجاری خود در صفحه اصلی، داشبورد مهندسی و صفحات تحلیل، اولین کمپین تبلیغاتی خود را فعال کنید.
                </p>
                <Link 
                  to="/ads/portal"
                  className="mt-2 bg-[#0284C7] hover:bg-[#0369A1] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors min-h-[44px] flex items-center justify-center"
                >
                  ثبت سفارش تبلیغات
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-700">
                      <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300 w-1/3">عنوان آگهی / کمپین</th>
                      <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">پلن</th>
                      <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">وضعیت پرداخت</th>
                      <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">وضعیت انتشار</th>
                      <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300">دوره نمایش</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAds.map((ad) => (
                      <tr key={ad.id} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                          {ad.title}
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                          {ad.planId}
                        </td>
                        <td className="p-3.5">
                          {ad.paymentStatus === 'paid' ? (
                            <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-bold text-[11px] border border-emerald-200">
                              پرداخت موفق
                            </span>
                          ) : (
                            <span className="text-slate-600 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-bold text-[11px]">
                              در انتظار پرداخت
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {ad.status === 'active' ? (
                            <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-bold text-[11px] border border-emerald-200 flex items-center gap-1 w-fit">
                              <CheckCircle size={12} /> فعال
                            </span>
                          ) : ad.status === 'rejected' ? (
                            <span className="text-red-700 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded font-bold text-[11px] border border-red-200 w-fit">
                              رد شده
                            </span>
                          ) : (
                            <span className="text-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded font-bold text-[11px] border border-amber-200 flex items-center gap-1 w-fit">
                              <Clock size={12} /> در انتظار بررسی
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {ad.status === 'active' && ad.startDate && ad.endDate ? (
                            `${formatJalaliDate(ad.startDate)} تا ${formatJalaliDate(ad.endDate)}`
                          ) : (
                            'پس از تأیید ناظر آغاز می‌شود'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
