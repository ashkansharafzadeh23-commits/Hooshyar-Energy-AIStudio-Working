import React, { useState } from 'react';
import { 
  Building2, 
  Smartphone, 
  Monitor, 
  ShieldCheck, 
  SlidersHorizontal, 
  AlertCircle,
  Eye,
  FileText,
  Tag,
  CheckCircle,
  Inbox
} from 'lucide-react';
import { EnergyInformationRecord } from '../../types/energyCenter';
import EnergyCenterHome from '../energy-center/EnergyCenterHome';
import EnergyRecordDetail from '../energy-center/EnergyRecordDetail';
import { EnergyContentCard } from '../../components/energy-center/EnergyContentCard';
import { FutureAiImpactHook } from '../../components/energy-center/FutureAiImpactHook';
import { SourceProvenanceBadge } from '../../components/energy-center/SourceProvenanceBadge';
import { IngestionPipelineQaPanel } from '../../components/energy-center/IngestionPipelineQaPanel';

// SYNTHETIC DEV FIXTURES (Explicitly marked as DEV-only UI samples)
export const DEV_ENERGY_FIXTURES: EnergyInformationRecord[] = [
  {
    id: 'dev_fixture_regulation_01',
    slug: 'dev-ui-sample-grid-code-standard',
    title: 'نمونه نمایشی رابط کاربری: دستورالعمل اتصال نیروگاه‌های مقیاس‌کوچک به شبکه توزیع',
    summary: 'این یک سند آزمایشی صرفاً جهت ارزیابی فونت، چیدمان و ساختار کارت مقررات در مرکز اطلاعات انرژی است و فاقد استناد حقوقی یا شماره ابلاغیه واقعی می‌باشد.',
    body: `بخش اول: کلیات و تعاریف مهندسی
این متن به منظور بررسی عملکرد صفحه‌بندی، پاراگراف‌بندی و فاصله‌گذاری خطوط در نمایشگرهای موبایل و دسکتاپ ایجاد شده است. در نسخه‌های آتی، متن کامل مصوبات پس از صحه‌گذاری رسمی در این بخش قرار می‌گیرد.

بخش دوم: الزامات حفاظت و ایمنی
- بررسی پارامترهای هارمونیک و ضریب توان
- استانداردهای اینورترهای متصل به شبکه
- فرآیند دریافت پروانه احداث و انشعاب`,
    contentType: 'REGULATION',
    category: 'regulations',
    topics: ['اتصال به شبکه', 'مجوزها', 'نیروگاه'],
    provenance: {
      sourceName: 'نمونه آزمایشی (DEV FIXTURE)',
      sourceUrl: 'https://example.com/dev-fixture-source',
      publishedAt: '2026-09-15T08:00:00.000Z',
      verifiedAt: '2026-10-01T10:00:00.000Z',
      isOfficialSource: true,
      verifiedBy: 'واحد صحه‌گذاری اسناد هوشیار انرژی'
    },
    regulatoryStatus: 'ENFORCEABLE',
    keyPoints: [
      'نمونه بند ۱: بررسی چیدمان بولت‌پوینت‌های فارسی',
      'نمونه بند ۲: نمایش وضعیت حقوقی لازم‌الاجرا در هدر کارت',
      'نمونه بند ۳: آزمون پیوند به سامانه رسمی مأخذ'
    ],
    affectedStakeholders: ['PROJECT_OWNER', 'EPC_CONTRACTOR'],
    isFeatured: true,
    status: 'PUBLISHED'
  },
  {
    id: 'dev_fixture_tender_02',
    slug: 'dev-ui-sample-epc-call',
    title: 'نمونه نمایشی رابط کاربری: فراخوان عمومی ارزیابی کیفی پیمانکاران احداث ساختگاه خورشیدی',
    summary: 'رکورد تستی جهت آزمون برچسب مناقصات، نحوه رندر تاریخ انتشار و تطبیق ذی‌نفعان بدون هیچ‌گونه اطلاعات مناقصه واقعی.',
    body: 'این رکورد صرفاً نشان‌دهنده نحوه نمایش اسناد فراخوان و فرمت‌بندی تگ‌های موضوعی می‌باشد.',
    contentType: 'TENDER',
    category: 'tenders_calls',
    topics: ['مناقصات', 'خورشیدی', 'سرمایه‌گذاری'],
    provenance: {
      sourceName: 'نمونه آزمایشی (DEV FIXTURE)',
      publishedAt: '2026-09-20T09:30:00.000Z',
      verifiedAt: '2026-10-02T11:00:00.000Z',
      isOfficialSource: false
    },
    affectedStakeholders: ['EPC_CONTRACTOR', 'INVESTOR'],
    isFeatured: false,
    status: 'PUBLISHED'
  },
  {
    id: 'dev_fixture_market_03',
    slug: 'dev-ui-sample-exchange-bulletin',
    title: 'نمونه نمایشی رابط کاربری: چارچوب ساختاری گزارش معاملات تابلوی برق سبز بورس انرژی',
    summary: 'قالب آزمایشی برای ارزیابی نمایش گزارش‌های تحلیلی بورس انرژی؛ بدون هیچ‌گونه عدد، نرخ، حجم یا شاخص معاملاتی واقعی.',
    contentType: 'MARKET_DATA',
    category: 'energy_exchange',
    topics: ['بورس انرژی', 'برق'],
    provenance: {
      sourceName: 'نمونه آزمایشی (DEV FIXTURE)',
      publishedAt: '2026-09-25T12:00:00.000Z',
      verifiedAt: '2026-10-05T14:00:00.000Z',
      isOfficialSource: true
    },
    affectedStakeholders: ['INDUSTRIAL_CONSUMER', 'INVESTOR'],
    isFeatured: true,
    status: 'PUBLISHED'
  }
];

export default function EnergyCenterPreview() {
  const [viewMode, setViewMode] = useState<'HOME_POPULATED' | 'HOME_EMPTY' | 'DETAIL_VIEW' | 'CARD_COMPONENTS' | 'INGESTION_QA'>('HOME_POPULATED');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile_390' | 'mobile_430' | 'mobile_375'>('desktop');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('dev_fixture_regulation_01');

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
        
        {/* DEV QA Top Bar */}
        <header className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-200/90">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 mb-2">
                <Building2 size={14} />
                <span>محیط توسعه و اعتبارسنجی مرکز اطلاعات انرژی (Stage 13.10.1 QA)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                پیش‌نمایش معماری اطلاعات و رابط کاربری مرکز اطلاعات انرژی
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                ارزیابی دسته‌بندی‌های شش‌گانه، فیلترها، کارت‌های اسناد، صفحه جزئیات و رفتار صادقانه حالت خالی (بدون داده‌های ساختگی در پروداکشن).
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

          {/* Interactive Inspection Mode Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-500">حالت بازبینی:</span>
              <button
                onClick={() => setViewMode('HOME_POPULATED')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
                  viewMode === 'HOME_POPULATED'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ۱. صفحه اصلی با نمونه‌های نمایشی (DEV Fixtures)
              </button>
              <button
                onClick={() => setViewMode('HOME_EMPTY')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
                  viewMode === 'HOME_EMPTY'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ۲. صفحه اصلی در حالت خالی پروداکشن (Empty State)
              </button>
              <button
                onClick={() => setViewMode('DETAIL_VIEW')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
                  viewMode === 'DETAIL_VIEW'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ۳. صفحه جزئیات سند (/energy-center/:id)
              </button>
              <button
                onClick={() => setViewMode('CARD_COMPONENTS')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
                  viewMode === 'CARD_COMPONENTS'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ۴. مؤلفه‌های منفرد (Cards & Hooks)
              </button>
              <button
                onClick={() => setViewMode('INGESTION_QA')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
                  viewMode === 'INGESTION_QA'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ۵. خط‌لوله دریافت و ضد‌تکرار (Ingestion & Deduplication QA)
              </button>
            </div>

            {viewMode === 'DETAIL_VIEW' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-500">انتخاب سند:</span>
                <select
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  {DEV_ENERGY_FIXTURES.map(f => (
                    <option key={f.id} value={f.id}>{f.title.slice(0, 35)}...</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        {/* Truthfulness Notice */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-black">اصل عدم جعل داده‌های انرژی (Absolute Truthfulness Rule):</strong>
            <span>
              رکوردهای نمایش‌داده‌شده در این پیش‌نمایش فقط فیکسچرهای ساختاری (DEV Fixture) جهت سنجش چیدمان و تایپوگرافی هستند. در حالت پروداکشن هیچ داده، خبر، نرخ تعرفه یا اطلاعیه غیرواقعی وجود ندارد و سامانه تا زمان راه‌اندازی فرآیند دریافت واقعی (Stage 13.10.2) از وضعیت خالی استاندارد استفاده می‌کند.
            </span>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className={`${getViewportWidth()} mx-auto transition-all duration-300`}>
          {deviceMode !== 'desktop' && (
            <div className="bg-slate-800 text-white text-[11px] font-mono px-4 py-2 rounded-t-2xl flex items-center justify-between border-b border-slate-700">
              <span className="flex items-center gap-1.5">
                <Smartphone size={13} />
                <span>Mobile Safari Viewport</span>
              </span>
              <span>{deviceMode === 'mobile_390' ? '390 × 844 pt' : deviceMode === 'mobile_430' ? '430 × 932 pt' : '375 × 667 pt'}</span>
            </div>
          )}

          <div className={`overflow-hidden border border-slate-200/90 shadow-sm ${deviceMode !== 'desktop' ? 'rounded-b-2xl border-t-0' : 'rounded-3xl'}`}>
            {viewMode === 'HOME_POPULATED' && (
              <EnergyCenterHome initialRecords={DEV_ENERGY_FIXTURES} />
            )}

            {viewMode === 'HOME_EMPTY' && (
              <EnergyCenterHome initialRecords={[]} />
            )}

            {viewMode === 'DETAIL_VIEW' && (
              <EnergyRecordDetail records={DEV_ENERGY_FIXTURES} />
            )}

            {viewMode === 'CARD_COMPONENTS' && (
              <div className="p-6 md:p-8 bg-white space-y-8" dir="rtl">
                <div>
                  <h2 className="text-base font-black text-slate-900 mb-2">مؤلفه هوک هوش مصنوعی (Future AI Impact Hook)</h2>
                  <FutureAiImpactHook topicTitle="آزمون مؤلفه هوش مصنوعی" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900 mb-2">مؤلفه اعتبار مأخذ (Source Provenance Component)</h2>
                  <SourceProvenanceBadge provenance={DEV_ENERGY_FIXTURES[0].provenance} />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900 mb-4">کارت‌های اطلاعاتی منفرد (Content Cards)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DEV_ENERGY_FIXTURES.map(f => (
                      <EnergyContentCard key={f.id} record={f} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'INGESTION_QA' && (
              <IngestionPipelineQaPanel />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
