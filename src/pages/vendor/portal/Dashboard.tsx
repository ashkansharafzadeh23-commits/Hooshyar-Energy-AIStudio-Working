import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package, Eye, Star, TrendingUp, Megaphone, CheckCircle, Clock, FileText, Activity, MessageSquare, AlertCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [myAds, setMyAds] = useState<any[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);

  useEffect(() => {
    // Load real vendor advertising history from Stage 12.1C endpoint
    const fetchVendorAds = async () => {
      setLoadingAds(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/ads/my-ads', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setMyAds(Array.isArray(data.ads) ? data.ads : []);
        }
      } catch (err) {
        console.error('Failed to load vendor ads', err);
      } finally {
        setLoadingAds(false);
      }
    };

    fetchVendorAds();
  }, []);

  const activeAdsCount = myAds.filter(a => a.status === 'active').length;
  const pendingAdsCount = myAds.filter(a => a.status === 'pending_review').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">داشبورد تحلیل و آمار فروشگاه</h1>
          <p className="text-sm text-gray-500 mt-1">نمای کلی عملکرد، محصولات و کمپین‌های تبلیغاتی</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            خلاصه وضعیت
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'ads' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            کمپین‌های تبلیغاتی
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Megaphone size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">تبلیغات فعال</div>
                <div className="text-xl font-black text-gray-900">{activeAdsCount} آگهی</div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">در انتظار بررسی ناظر</div>
                <div className="text-xl font-black text-gray-900">{pendingAdsCount} آگهی</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">وضعیت حساب تأمین‌کننده</div>
                <div className="text-base font-black text-gray-900">احراز شده</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <MessageSquare size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">استعلام‌های دریافتی</div>
                <div className="text-base font-black text-gray-900">۰ مورد</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
              <h3 className="text-base font-bold text-gray-900 mb-4">آمار بازدید فروشگاه</h3>
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2 border border-dashed border-gray-200 rounded-xl p-6 text-center">
                <Activity size={32} className="text-gray-300" />
                <p className="text-sm font-bold text-gray-600">گزارش بازدید در حال تجمیع</p>
                <p className="text-xs text-gray-400 max-w-sm">
                  پس از ثبت اولین بازدیدهای عمومی از محصولات فروشگاه در پلتفرم، نمودار ترافیک به صورت برخط در این بخش رسم خواهد شد.
                </p>
              </div>
            </div>

            {/* Inquiries List */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-900">آخرین استعلام‌ها</h3>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400 gap-2">
                <MessageSquare size={32} className="text-gray-300" />
                <p className="text-sm font-bold text-gray-600">هنوز درخواستی ثبت نشده است</p>
                <p className="text-xs text-gray-400">
                  استعلام‌های قیمت خریداران و پیام‌های مهندسین پس از ارسال در این بخش قابل مدیریت خواهد بود.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'ads' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="bg-purple-600 p-5 rounded-2xl shadow-sm text-white flex items-center justify-between">
               <div>
                 <div className="text-purple-200 text-xs mb-1">کمپین‌های فعال</div>
                 <div className="text-2xl font-black">{activeAdsCount}</div>
               </div>
               <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                 <Eye size={24} />
               </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
               <div>
                 <div className="text-gray-500 text-xs mb-1">در انتظار بررسی مدیر</div>
                 <div className="text-2xl font-black text-gray-900">{pendingAdsCount}</div>
               </div>
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                 <TrendingUp size={24} />
               </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
               <div>
                 <div className="text-gray-500 text-xs mb-1">کل آگهی‌های ثبت‌شده</div>
                 <div className="text-2xl font-black text-gray-900">{myAds.length}</div>
               </div>
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                 <Activity size={24} />
               </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">وضعیت کمپین‌های تبلیغاتی شما</h3>
              <Link 
                to="/ads/portal"
                className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-100 transition-colors"
              >
                <Megaphone size={16} />
                ثبت تبلیغ جدید
              </Link>
            </div>
            
            {myAds.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Megaphone size={40} className="text-gray-300" />
                <h4 className="font-bold text-gray-700">هنوز کمپین تبلیغاتی فعالی ثبت نکرده‌اید</h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  برای نمایش بنرهای تجاری خود در صفحه اصلی، داشبورد مهندسی و صفحات تحلیل، اولین کمپین تبلیغاتی خود را فعال کنید.
                </p>
                <Link 
                  to="/ads/portal"
                  className="mt-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-purple-700 transition-colors"
                >
                  ثبت سفارش تبلیغات
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 text-xs font-bold text-gray-600 w-1/3">عنوان آگهی / کمپین</th>
                      <th className="p-4 text-xs font-bold text-gray-600">پلن</th>
                      <th className="p-4 text-xs font-bold text-gray-600">وضعیت پرداخت</th>
                      <th className="p-4 text-xs font-bold text-gray-600">وضعیت انتشار</th>
                      <th className="p-4 text-xs font-bold text-gray-600">دوره نمایش</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAds.map((ad) => (
                      <tr key={ad.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-sm text-gray-900">{ad.title}</div>
                        </td>
                        <td className="p-4 text-xs text-gray-600 font-mono">{ad.planId}</td>
                        <td className="p-4">
                          {ad.paymentStatus === 'paid' ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                              پرداخت موفق
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">
                              در انتظار پرداخت
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {ad.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">
                              <CheckCircle size={12} /> فعال
                            </span>
                          ) : ad.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold">
                              رد شده
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                              <Clock size={12} /> در انتظار بررسی
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          {ad.status === 'active' ? (
                            `${new Date(ad.startDate).toLocaleDateString('fa-IR')} تا ${new Date(ad.endDate).toLocaleDateString('fa-IR')}`
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
        </motion.div>
      )}
    </motion.div>
  );
}
