import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Eye, Star, TrendingUp, Megaphone, CheckCircle, Clock, FileText, Activity, MessageSquare
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

const visitsData = [
  { name: 'شنبه', visits: 120, inquiries: 12 },
  { name: 'یکشنبه', visits: 180, inquiries: 18 },
  { name: 'دوشنبه', visits: 250, inquiries: 25 },
  { name: 'سه‌شنبه', visits: 210, inquiries: 20 },
  { name: 'چهارشنبه', visits: 310, inquiries: 35 },
  { name: 'پنجشنبه', visits: 280, inquiries: 28 },
  { name: 'جمعه', visits: 390, inquiries: 42 },
];

const mockAds = [
  { id: 1, title: 'تخفیف ویژه پاییزه روی تمام محصولات Growatt', type: 'بنر تصویری', status: 'active', views: '۱۲,۴۵۰', clicks: '۱,۲۳۰', ctr: '۹.۸٪' },
  { id: 2, title: 'نیرو گستران پارس - بزرگترین تامین‌کننده اینورتر', type: 'تیزر ویدیویی', status: 'active', views: '۸,۹۰۰', clicks: '۸۹۰', ctr: '۱۰.۰٪' },
  { id: 3, title: 'فروش باتری‌های لیتیومی با گارانتی ۵ ساله', type: 'بنر تصویری', status: 'pending', views: '-', clicks: '-', ctr: '-' },
];

const mockInquiries = [
  { id: 1, customer: 'محمد رمضانی', product: 'اینورتر 5KW گرین', date: 'امروز ۱۲:۳۰', status: 'unread' },
  { id: 2, customer: 'سارا سعیدی', product: 'پنل ۵۵۰ وات مونوکریستال', date: 'دیروز ۱۶:۴۵', status: 'read' },
  { id: 3, customer: 'شرکت مهندسی آوا', product: 'خرید عمده باتری ۱۰۰ آمپر', date: 'دوشنبه ۰۹:۱۵', status: 'read' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">داشبورد تحلیل و آمار</h1>
          <p className="text-sm text-gray-500 mt-1">نمای کلی عملکرد، آمار بازدید و گزارش تبلیغات</p>
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
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Eye size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">بازدید ماهانه پروفایل</div>
                <div className="text-xl font-black text-gray-900">۱,۷۴۰ <span className="text-[10px] text-green-500 font-normal mr-1">↑ ۱۵٪</span></div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <MessageSquare size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">درخواست‌های مشتریان</div>
                <div className="text-xl font-black text-gray-900">۱۸۰ <span className="text-[10px] text-green-500 font-normal mr-1">↑ ۲۴٪</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                <Star size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">میانگین امتیاز</div>
                <div className="text-xl font-black text-gray-900">۴.۸ <span className="text-xs font-normal text-gray-500 mr-1">از ۵</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Activity size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-medium">نرخ تبدیل بازدید به تماس</div>
                <div className="text-xl font-black text-gray-900">۱۸.۵٪ <span className="text-[10px] text-red-500 font-normal mr-1">↓ ۲٪</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
              <h3 className="text-base font-bold text-gray-900 mb-6">روند بازدید و درخواست‌ها (هفته جاری)</h3>
              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontFamily: 'Vazirmatn' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line yAxisId="left" type="monotone" name="بازدید فروشگاه" dataKey="visits" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" name="درخواست‌های ثبت‌شده" dataKey="inquiries" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inquiries List */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-900">آخرین استعلام‌ها</h3>
                <button className="text-xs text-blue-600 font-bold hover:text-blue-700">مشاهده همه</button>
              </div>
              <div className="space-y-4 flex-1">
                {mockInquiries.map(inquiry => (
                  <div key={inquiry.id} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors flex flex-col gap-2 relative">
                    {inquiry.status === 'unread' && (
                      <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-blue-500"></span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">{inquiry.customer}</span>
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded">{inquiry.date}</span>
                    </div>
                    <p className="text-xs text-gray-600">درخواست استعلام قیمت: <span className="font-medium">{inquiry.product}</span></p>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-100 transition-colors">
                پاسخ به مشتریان
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'ads' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="bg-purple-600 p-5 rounded-2xl shadow-sm text-white flex items-center justify-between">
               <div>
                 <div className="text-purple-200 text-xs mb-1">کل نمایش تبلیغات (ماه)</div>
                 <div className="text-2xl font-black">۲۱,۳۵۰</div>
               </div>
               <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                 <Eye size={24} />
               </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
               <div>
                 <div className="text-gray-500 text-xs mb-1">کل کلیک‌ها</div>
                 <div className="text-2xl font-black text-gray-900">۲,۱۲۰</div>
               </div>
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                 <TrendingUp size={24} />
               </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
               <div>
                 <div className="text-gray-500 text-xs mb-1">متوسط نرخ کلیک (CTR)</div>
                 <div className="text-2xl font-black text-gray-900">۹.۹٪</div>
               </div>
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                 <Activity size={24} />
               </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">وضعیت کمپین‌های تبلیغاتی شما</h3>
              <button className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-100 transition-colors">
                <Megaphone size={16} />
                ثبت تبلیغ جدید
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-xs font-bold text-gray-600 w-1/3">عنوان آگهی / کمپین</th>
                    <th className="p-4 text-xs font-bold text-gray-600">نوع</th>
                    <th className="p-4 text-xs font-bold text-gray-600">وضعیت</th>
                    <th className="p-4 text-xs font-bold text-gray-600">نمایش</th>
                    <th className="p-4 text-xs font-bold text-gray-600">کلیک</th>
                    <th className="p-4 text-xs font-bold text-gray-600">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {mockAds.map((ad) => (
                    <tr key={ad.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-sm text-gray-900">{ad.title}</div>
                      </td>
                      <td className="p-4 text-xs text-gray-600">{ad.type}</td>
                      <td className="p-4">
                        {ad.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">
                            <CheckCircle size={12} /> فعال
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                            <Clock size={12} /> در حال بررسی
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-900">{ad.views}</td>
                      <td className="p-4 text-sm font-bold text-gray-900">{ad.clicks}</td>
                      <td className="p-4 text-sm font-bold text-gray-900">{ad.ctr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
