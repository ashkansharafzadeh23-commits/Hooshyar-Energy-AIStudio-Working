import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Megaphone, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon, 
  CheckCircle, 
  CreditCard, 
  AlertCircle,
  Clock,
  ExternalLink,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { AD_PLANS } from '../types/adPlans';

interface UserAdItem {
  id: string;
  title: string;
  planId: string;
  placement: string;
  status: 'pending_review' | 'active' | 'expired' | 'rejected';
  paymentStatus?: 'unpaid' | 'paid' | 'failed';
  paymentAmount?: number;
  paymentRefId?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export default function AdsPortal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token, isAuthenticated, activeRole } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [adType, setAdType] = useState('banner'); // banner, video
  const [selectedPlan, setSelectedPlan] = useState<'bronze' | 'silver' | 'gold'>('silver');
  const [title, setTitle] = useState('');
  const [linkTo, setLinkTo] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1509391366360-120953a15443?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User History State
  const [myAds, setMyAds] = useState<UserAdItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Payment Callback feedback handling
  const paymentStatusParam = searchParams.get('payment_status');
  const paymentRefIdParam = searchParams.get('refId');
  const paymentErrorParam = searchParams.get('error');
  const simulatedAuthorityParam = searchParams.get('simulated_authority');

  const [simulatedPaying, setSimulatedPaying] = useState(false);

  // Roles allowed to create ads
  const userRoles: string[] = [];
  if (user?.role) userRoles.push(user.role.toUpperCase());
  if (Array.isArray(user?.roles)) {
    user.roles.forEach((r: string) => userRoles.push(r.toUpperCase()));
  }
  const isAuthorizedRole = userRoles.some(r => ['VENDOR', 'CONTRACTOR', 'EPC', 'TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'].includes(r));

  const fetchMyAds = async () => {
    const authToken = token || localStorage.getItem('token');
    if (!authToken) return;

    try {
      setLoadingHistory(true);
      const res = await fetch('/api/ads/my-ads', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMyAds(data.ads || []);
      }
    } catch {
      // ignore history fetch error
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) {
      fetchMyAds();
    }
  }, [activeTab, isAuthenticated]);

  // Handle simulated payment in test/sandbox environment
  const handleSimulatedPayment = async () => {
    if (!simulatedAuthorityParam) return;
    setSimulatedPaying(true);
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await fetch('/api/ads/payment/verify-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          authority: simulatedAuthorityParam,
          status: 'OK'
        })
      });
      if (res.ok) {
        navigate('/ads/portal?payment_status=success');
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'خطا در ثبت پرداخت آزمایشی');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setSimulatedPaying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const authToken = token || localStorage.getItem('token');
    if (!isAuthenticated && !authToken) {
      setErrorMessage('جهت ثبت آگهی، ابتدا باید وارد حساب کاربری همکاران شوید.');
      return;
    }

    if (!isAuthorizedRole) {
      setErrorMessage('ثبت آگهی تبلیغاتی و پرداخت صرفاً مختص حساب‌های تجاری (تأمین‌کننده، پیمانکار، تکنسین و مدیر) است.');
      return;
    }

    setSubmitting(true);
    try {
      const planIdMap: Record<string, string> = {
        bronze: 'ad_plan_bronze',
        silver: 'ad_plan_silver',
        gold: 'ad_plan_gold'
      };

      const res = await fetch('/api/ads/payment/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          title,
          imageUrl,
          linkTo: linkTo || undefined,
          planId: planIdMap[selectedPlan] || 'ad_plan_bronze'
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'خطا در ثبت درخواست و شروع فرایند پرداخت');
      }

      const data = await res.json();
      if (data.paymentUrl) {
        if (data.paymentUrl.startsWith('http')) {
          // Redirect to external live payment gateway
          window.location.href = data.paymentUrl;
        } else {
          // Local sandbox / mock navigation
          navigate(data.paymentUrl);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-Vazirmatn p-4 md:p-6 pb-24" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 mb-2">
              <Megaphone size={13} />
              <span>پرتال تجاری هوشیار انرژی</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D23]">
              پرتال ثبت و مدیریت آگهی‌های تبلیغاتی
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              نمایش هدفمند خدمات و محصولات خورشیدی شما به هزاران مشتری و کارفرمای تخصصی
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'create'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              ثبت آگهی جدید
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              سوابق تبلیغات من
            </button>
          </div>
        </header>

        {/* Callback Alerts */}
        {paymentStatusParam === 'success' && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <div className="flex items-center gap-3 font-black text-base mb-1">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>پرداخت موفق آگهی با موفقیت انجام شد</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed mt-1">
              تراکنش بانکی شما تأیید گردید و آگهی شما با وضعیت <strong className="font-black text-emerald-900">«در انتظار بررسی مدیر»</strong> ثبت شد. پس از اعتبارسنجی توسط تیم نظارت، آگهی فعال خواهد شد.
            </p>
            {paymentRefIdParam && (
              <div className="mt-2 text-xs font-mono text-emerald-900 bg-emerald-100/60 p-2 rounded-lg inline-block" dir="ltr">
                شماره پیگیری پرداخت: {paymentRefIdParam}
              </div>
            )}
          </div>
        )}

        {paymentStatusParam === 'failed' && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-center gap-3 font-black text-base mb-1">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>پرداخت انجام نشد یا لغو گردید</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed mt-1">
              {paymentErrorParam ? decodeURIComponent(paymentErrorParam) : 'تراکنش پرداخت توسط کاربر یا درگاه بانکی تکمیل نگردید. لطفاً مجدداً تلاش فرمایید.'}
            </p>
          </div>
        )}

        {/* Simulated Sandbox Dialog */}
        {simulatedAuthorityParam && (
          <div className="p-6 rounded-3xl bg-amber-50 border border-amber-300 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-800 font-bold">
              <Receipt size={20} />
              <span>شبیه‌ساز پرداخت آزمایشی درگاه زرین‌پال (محیط تست / Sandbox)</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              شما در حال پرداخت از طریق درگاه آزمایشی هستید. شناسه مرجع پرداخت (Authority):
              <code className="mx-2 font-mono bg-white px-2 py-1 rounded-md border border-amber-200 text-slate-800" dir="ltr">
                {simulatedAuthorityParam}
              </code>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSimulatedPayment}
                disabled={simulatedPaying}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {simulatedPaying ? 'در حال تایید پرداخت...' : 'تأیید و پرداخت شبیه‌سازی‌شده (موفق)'}
              </button>
              <button
                onClick={() => navigate('/ads/portal?payment_status=failed&error=پرداخت+توسط+کاربر+لغو+شد')}
                className="px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100/50 transition-colors"
              >
                انصراف از پرداخت
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: CREATE AD */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-3xl shadow-sm border border-[#E4E7EC] overflow-hidden">
            <div className="p-6 md:p-8">
              <p className="text-gray-600 mb-8 text-sm leading-relaxed">
                با انتخاب پلن تبلیغاتی، برند و خدمات خود را در معرض دید هزاران فعال و سرمایه‌گذار نیروگاه‌های خورشیدی قرار دهید. هزینه‌ها به‌صورت قطعی از طریق سرور محاسبه می‌گردد.
              </p>
              
              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Ad Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAdType('banner')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${adType === 'banner' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 text-gray-600'}`}
                  >
                    <ImageIcon size={32} />
                    <span className="font-bold text-sm">بنر تصویری ثابت</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdType('video')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${adType === 'video' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 text-gray-600'}`}
                  >
                    <Video size={32} />
                    <span className="font-bold text-sm">تیزر ویدیویی</span>
                  </button>
                </div>

                {/* Upload Area */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">فایل و رسانه تبلیغ</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 bg-gray-50 hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer flex flex-col items-center justify-center group text-center">
                    <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      {adType === 'banner' ? <ImageIcon className="text-gray-400 group-hover:text-purple-500" size={28} /> : <Video className="text-gray-400 group-hover:text-purple-500" size={28} />}
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm mb-1">فایل تبلیغاتی آماده است</h3>
                    <p className="text-xs text-gray-500">
                      {adType === 'banner' ? 'تصویر بنر پیش‌فرض بارگذاری شده است' : 'ویدیو تیزر آماده بارگذاری'}
                    </p>
                  </div>
                </div>

                {/* Ad Details */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">عنوان تبلیغ</label>
                    <input 
                      required 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium text-gray-800 text-sm" 
                      placeholder="مثال: فروش ویژه پنل‌های ۵۵۰ وات با گارانتی رسمی ۲۵ ساله" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">لینک ارجاع و وبسایت (اختیاری)</label>
                    <div className="relative">
                      <input 
                        type="url" 
                        dir="ltr" 
                        value={linkTo}
                        onChange={(e) => setLinkTo(e.target.value)}
                        className="w-full px-5 py-3.5 pl-12 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-medium text-gray-800 text-left text-sm" 
                        placeholder="https://yourcompany.ir" 
                      />
                      <LinkIcon className="absolute left-4 top-3.5 text-gray-400" size={18} />
                    </div>
                  </div>
                </div>

                {/* Plan Selection with Server-Authoritative Pricing */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">انتخاب پلن نمایش و جایگاه</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Bronze */}
                    <div 
                      onClick={() => setSelectedPlan('bronze')}
                      className={`border rounded-2xl p-5 cursor-pointer transition-all relative flex flex-col h-full ${selectedPlan === 'bronze' ? 'border-2 border-purple-600 bg-purple-50/70 shadow-md' : 'border-gray-200 hover:border-purple-300 bg-white'}`}
                    >
                      <h4 className="font-bold text-gray-800">پلن برنزی</h4>
                      <p className="text-xs text-gray-500 mt-1 mb-4 flex-1">
                        {AD_PLANS.ad_plan_bronze.descriptionFa}
                      </p>
                      <div className="font-black text-lg text-purple-700">
                        {AD_PLANS.ad_plan_bronze.priceToman.toLocaleString('fa-IR')} <span className="text-xs font-normal text-gray-500">تومان / ۳۰ روز</span>
                      </div>
                    </div>

                    {/* Silver */}
                    <div 
                      onClick={() => setSelectedPlan('silver')}
                      className={`border rounded-2xl p-5 cursor-pointer transition-all relative flex flex-col h-full ${selectedPlan === 'silver' ? 'border-2 border-purple-600 bg-purple-50/70 shadow-md' : 'border-gray-200 hover:border-purple-300 bg-white'}`}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-xs">
                        پیشنهاد ویژه
                      </div>
                      <h4 className="font-bold text-purple-900">پلن نقره‌ای</h4>
                      <p className="text-xs text-purple-700/80 mt-1 mb-4 flex-1">
                        {AD_PLANS.ad_plan_silver.descriptionFa}
                      </p>
                      <div className="font-black text-lg text-purple-800">
                        {AD_PLANS.ad_plan_silver.priceToman.toLocaleString('fa-IR')} <span className="text-xs font-normal text-purple-600">تومان / ۳۰ روز</span>
                      </div>
                    </div>

                    {/* Gold */}
                    <div 
                      onClick={() => setSelectedPlan('gold')}
                      className={`border rounded-2xl p-5 cursor-pointer transition-all relative flex flex-col h-full ${selectedPlan === 'gold' ? 'border-2 border-purple-600 bg-purple-50/70 shadow-md' : 'border-gray-200 hover:border-purple-300 bg-white'}`}
                    >
                      <h4 className="font-bold text-gray-800">پلن طلایی</h4>
                      <p className="text-xs text-gray-500 mt-1 mb-4 flex-1">
                        {AD_PLANS.ad_plan_gold.descriptionFa}
                      </p>
                      <div className="font-black text-lg text-purple-700">
                        {AD_PLANS.ad_plan_gold.priceToman.toLocaleString('fa-IR')} <span className="text-xs font-normal text-gray-500">تومان / ۳۰ روز</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl text-base font-bold hover:bg-purple-700 transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    <CreditCard size={20} />
                    {submitting ? 'در حال برقراری ارتباط با درگاه بانکی...' : 'اتصال به درگاه و پرداخت آنلاین'}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    پرداخت ایمن تحت نظارت شاپرک / زرین‌پال با رمزپویا
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: USER ADVERTISEMENT HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl shadow-sm border border-[#E4E7EC] p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">تاریخچه تبلیغات و وضعیت تجاری</h3>
                <p className="text-xs text-slate-500">مشاهده کلیه سفارشات تبلیغاتی ثبت شده توسط حساب کاربری شما</p>
              </div>
              <button
                onClick={fetchMyAds}
                disabled={loadingHistory}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              >
                بروزرسانی
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-500">در حال واکشی تاریخچه تبلیغات...</div>
            ) : myAds.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                هنوز هیچ آگهی تبلیغاتی ثبت نکرده‌اید.
              </div>
            ) : (
              <div className="space-y-4">
                {myAds.map(item => {
                  const isPaid = item.paymentStatus === 'paid';
                  const isModeratedActive = item.status === 'active';
                  const isPending = item.status === 'pending_review';
                  const isRejected = item.status === 'rejected';

                  return (
                    <div 
                      key={item.id}
                      className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isModeratedActive 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isRejected 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isModeratedActive ? 'فعال و در حال نمایش' : isRejected ? 'رد شده توسط ناظر' : 'در انتظار بررسی مدیر'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isPaid ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isPaid ? 'پرداخت موفق' : 'در انتظار پرداخت'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            پلن: {item.planId}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                        <div className="text-xs text-slate-500 flex items-center gap-4">
                          {item.status === 'pending_review' ? (
                            <span className="text-amber-700 font-medium">
                              در انتظار تأیید — دوره تبلیغ پس از تأیید مدیر آغاز می‌شود
                            </span>
                          ) : (
                            <>
                              <span>شروع: {new Date(item.startDate).toLocaleDateString('fa-IR')}</span>
                              <span>پایان: {new Date(item.endDate).toLocaleDateString('fa-IR')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-left font-mono shrink-0">
                        {item.paymentAmount ? (
                          <div className="text-sm font-bold text-purple-700">
                            {(item.paymentAmount / 10).toLocaleString('fa-IR')} تومان
                          </div>
                        ) : null}
                        {item.paymentRefId ? (
                          <div className="text-[10px] text-slate-400">
                            کد رهگیری: {item.paymentRefId}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
