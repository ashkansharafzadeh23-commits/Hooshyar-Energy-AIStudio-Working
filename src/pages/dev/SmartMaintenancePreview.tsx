import React, { useState } from 'react';
import { 
  Wrench, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Camera, 
  Phone, 
  ArrowRight, 
  ExternalLink, 
  FileText, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  SlidersHorizontal, 
  Smartphone, 
  Monitor, 
  Plus, 
  Download, 
  Image as ImageIcon, 
  Layers, 
  Zap,
  Activity,
  Cpu,
  FileCheck2,
  Calendar,
  X
} from 'lucide-react';
import { MaintenanceCase, MaintenanceAction, CaseAttachment, MaintenanceDiagnosis } from '../../types/maintenance';

// =========================================================================
// DETERMINISTIC DEV QA FIXTURES (STAGE 13.7.1 SAFE MOCK DATA)
// =========================================================================

const DEV_DIAGNOSIS_FIXTURE: MaintenanceDiagnosis = {
  id: 'diag-dev-sample-01',
  projectId: 'prj-dev-solar-01',
  assetId: 'asset-dev-inv-33',
  alertId: 'alt-dev-temp-01',
  componentId: 'inv-unit-33cx',
  diagnosisStatus: 'ACTION_RECOMMENDED',
  method: 'HYBRID',
  confidence: 88,
  likelyRootCauses: [
    { 
      cause: 'افت بازدهی حرارتی و گرفتگی پروانه‌های فن خنک‌کننده هیت‌سینک', 
      probability: 0.85, 
      description: 'انباشت گرد و غبار بر روی پروانه‌های فن تهویه منجر به محدودسازی انتقال حرارت در ساعات بیشینه تابش شده است.' 
    },
    { 
      cause: 'نقص اندازه‌گیری سنسور دمای داخلی اینورتر (NTC)', 
      probability: 0.15, 
      description: 'احتمال خطای اندازه‌گیری در مدار فیدبک آنالوگ دمای هسته اینورتر.' 
    }
  ],
  facts: [
    'کاهش بازدهی توان خروجی در ساعات ظهر (تابش بالای ۸۰۰ وات بر مترمربع)',
    'کد خطای ثبت‌شده در لاگ اینورتر: E-024 (اضافه دمای مدار قدرت)',
    'دمای محیط سایت ۳۲ درجه سانتی‌گراد و ولتاژ استرینگ‌ها در محدوده مجاز ۶۵۰ ولت'
  ],
  inferences: [
    'سیستم حفاظتی اینورتر جهت محافظت از سوئیچ‌های قدرت، افت توان هوشمند (Thermal Derating) را فعال نموده است.',
    'بر اساس تاریخچه راه‌اندازی، دستگاه تحت پوشش گارانتی معتبر شرکتی قرار دارد.'
  ],
  recommendedActions: [
    { 
      action: 'غبارزدایی تخصصی هیت‌سینک و بررسی گردش آزادانه فن‌های تهویه', 
      priority: 'HIGH', 
      estimatedHours: 2, 
      estimatedCostIrr: 3500000 
    },
    { 
      action: 'قرائت دمای واقعی رادیاتور با ترمومتر و انطباق با مقدار ثبت‌شده سنسور', 
      priority: 'MEDIUM', 
      estimatedHours: 1, 
      estimatedCostIrr: 1500000 
    }
  ],
  safetyGuidance: [
    'قطع کامل مدار ورودی DC و کلید اصلی خروجی AC پیش از هرگونه بازرسی فیزیکی الزامی است.',
    'حداقل ۱۰ دقیقه پس از قطع کلیدها جهت تخلیه کامل خازن‌های لینک داخلی DC منتظر بمانید.'
  ],
  evidenceCategorized: {
    OBSERVED: ['افت تولید در ساعات ۱۲ تا ۱۴', 'صدای یکنواخت دور تند فن تهویه'],
    PHOTO_OBSERVED: ['تصویر نمایشگر اینورتر نشان‌دهنده کد خطای E-024', 'عدم مشاهده سوختگی یا تغییر رنگ روی بدنه'],
    AI_INFERENCE: ['احتمال بیش از ۸۵٪ رفع عیب با سرویس فیزیکی هیت‌سینک بدون نیاز به قطعه تعویضی']
  },
  createdAt: '2026-03-25T11:00:00Z'
};

const DEV_ACTIVE_CASE_FIXTURE: MaintenanceCase = {
  id: 'mc-dev-act-0042',
  maintenanceCode: 'MNT-HSE-000042',
  caseNumber: 'MC-2026-0042',
  projectId: 'prj-dev-solar-01',
  assetId: 'asset-dev-inv-33',
  title: 'افت توان خروجی و خطای دمای بالای اینورتر مرکزی ۳۰ کیلووات',
  description: 'در ساعات اوج تابش روزانه، اینورتر با آلارم Over-temperature متوقف شده و تولید استرینگ‌ها به صفر می‌رسد. خطای E-024 روی ال‌سی‌دی ظاهر می‌گردد.',
  category: 'CORRECTIVE',
  priority: 'HIGH',
  status: 'IN_PROGRESS',
  reportedBy: 'کاربر آزمایشی خریدار نیروگاه',
  reportedAt: '2026-03-25T10:30:00Z',
  contactName: 'مهندس رضایی',
  contactPhone: '09123456789',
  assignedTechnicianId: 'tech-dev-01',
  assignedTechnicianName: 'مهندس علی محمدی',
  assignedTechnicianPhone: '09121112233',
  scheduledDate: '2026-03-26',
  symptoms: [
    'خطای اضافه دمای اینورتر (Over-temperature)',
    'افت تولید بیش از ۳۰ درصد در ساعات ظهر',
    'صدای غیرعادی فن خنک‌کننده'
  ],
  alertIds: ['alt-dev-temp-01'],
  photos: [
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=600&auto=format&fit=crop'
  ],
  attachments: [
    {
      id: 'att-dev-01',
      maintenanceCaseId: 'mc-dev-act-0042',
      name: 'inverter_error_display.jpg',
      type: 'PHOTO',
      url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop',
      uploadedBy: 'مشتری',
      uploadedAt: '2026-03-25T10:35:00Z',
      sizeBytes: 420000,
      mimeType: 'image/jpeg'
    },
    {
      id: 'att-dev-02',
      maintenanceCaseId: 'mc-dev-act-0042',
      name: 'combiner_box_wiring.jpg',
      type: 'PHOTO',
      url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=600&auto=format&fit=crop',
      uploadedBy: 'مشتری',
      uploadedAt: '2026-03-25T10:36:00Z',
      sizeBytes: 580000,
      mimeType: 'image/jpeg'
    }
  ],
  createdAt: '2026-03-25T10:30:00Z',
  updatedAt: '2026-03-25T10:30:00Z'
};

const DEV_ACTIVE_ACTIONS_FIXTURE: MaintenanceAction[] = [
  {
    id: 'act-dev-01',
    maintenanceCaseId: 'mc-dev-act-0042',
    actionType: 'CLEANING',
    description: 'بررسی فیلترهای هوای ورودی هیت‌سینک و غبارزدایی پروانه‌های فن تهویه با کمپرسور باد',
    performedBy: 'tech-dev-01',
    performedAt: '2026-03-26T09:00:00Z',
    resultStatus: 'انجام شد - مسیر هوای خنک‌کننده پاکسازی گردید',
    createdAt: '2026-03-26T09:00:00Z'
  },
  {
    id: 'act-dev-02',
    maintenanceCaseId: 'mc-dev-act-0042',
    actionType: 'TEST',
    description: 'تست مدار فرمان فن تهویه و اندازه‌گیری دمای بدنه با ترمومتر دیجیتال',
    performedBy: 'tech-dev-01',
    performedAt: '2026-03-26T11:30:00Z',
    resultStatus: 'فن شماره ۲ نیازمند جایگزینی است؛ هماهنگی جهت تامین قطعه انجام شد',
    createdAt: '2026-03-26T11:30:00Z'
  }
];

const DEV_COMPLETED_CASE_FIXTURE: MaintenanceCase = {
  id: 'mc-dev-comp-0019',
  maintenanceCode: 'MNT-HSE-000019',
  caseNumber: 'MC-2026-0019',
  projectId: 'prj-dev-solar-01',
  assetId: 'asset-dev-comb-02',
  title: 'تعویض فیوز DC استرینگ ۳ و راه‌اندازی مجدد مدار فتوولتائیک',
  description: 'سوختگی فیوز جریان مستقیم ناشی از اضافه جریان ولتاژ گذرا در تابلوی کمباینر باکس شماره ۲.',
  category: 'CORRECTIVE',
  priority: 'MEDIUM',
  status: 'COMPLETED',
  reportedBy: 'کاربر آزمایشی خریدار نیروگاه',
  reportedAt: '2026-03-10T14:00:00Z',
  contactName: 'مهندس رضایی',
  contactPhone: '09123456789',
  assignedTechnicianId: 'tech-dev-02',
  assignedTechnicianName: 'مهندس سارا رحیمی',
  assignedTechnicianPhone: '09124445566',
  completedAt: '2026-03-12T16:00:00Z',
  verifiedAt: '2026-03-13T09:00:00Z',
  verificationPassed: true,
  verificationNotes: 'تأیید حسن انجام کار؛ جریان و ولتاژ استرینگ ۳ پس از تعویض فیوز در حالت نرمال قرار دارد.',
  closureNotes: 'تکمیل نهایی اقدامات و بستن پرونده نگهداری',
  sparePartsUsed: [
    {
      partName: 'فیوز فتوولتائیک gPV 1000V DC 15A',
      quantity: 2,
      costIrr: 4500000
    }
  ],
  symptoms: [
    'عدم تزریق جریان در استرینگ ۳',
    'آلارم عدم تقارن استرینگ در تابلوی مانیتورینگ'
  ],
  alertIds: [],
  photos: [
    'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=600&auto=format&fit=crop'
  ],
  attachments: [
    {
      id: 'att-dev-comp-01',
      maintenanceCaseId: 'mc-dev-comp-0019',
      name: 'blown_fuse_inspection.jpg',
      type: 'PHOTO',
      url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=600&auto=format&fit=crop',
      uploadedBy: 'تکنسین',
      uploadedAt: '2026-03-11T10:15:00Z',
      sizeBytes: 310000,
      mimeType: 'image/jpeg'
    }
  ],
  createdAt: '2026-03-10T14:00:00Z',
  updatedAt: '2026-03-12T16:00:00Z'
};

const DEV_COMPLETED_ACTIONS_FIXTURE: MaintenanceAction[] = [
  {
    id: 'act-dev-c1',
    maintenanceCaseId: 'mc-dev-comp-0019',
    actionType: 'INSPECTION',
    description: 'تست پیوستگی مدار و تشخیص فیوز سوخته استرینگ ۳ کمباینر باکس',
    performedBy: 'tech-dev-02',
    performedAt: '2026-03-11T10:00:00Z',
    resultStatus: 'سوختگی فیوز ۱۵ آمپر محرز شد',
    createdAt: '2026-03-11T10:00:00Z'
  },
  {
    id: 'act-dev-c2',
    maintenanceCaseId: 'mc-dev-comp-0019',
    actionType: 'PART_REPLACEMENT',
    description: 'نصب دو عدد فیوز استاندارد خورشیدی ۱۰*۳۸ میلی‌متر gPV و بستن مدار با گشتاور استاندارد',
    performedBy: 'tech-dev-02',
    performedAt: '2026-03-12T15:00:00Z',
    resultStatus: 'مدار متصل و جریان استرینگ روی ۸.۴ آمپر پایدار شد',
    createdAt: '2026-03-12T15:00:00Z'
  }
];

export default function SmartMaintenancePreview() {
  // DEV-ONLY HARD GUARD: Completely disabled in production builds
  if (!import.meta.env.DEV) {
    return null;
  }

  // Active scenario state
  const [scenario, setScenario] = useState<
    'NEW_REQUEST' | 'AI_ANALYSIS' | 'ACTIVE_CASE' | 'COMPLETED_CASE' | 'EMPTY_STATE'
  >('NEW_REQUEST');

  // Toolbar collapse state
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const [previewViewport, setPreviewViewport] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');

  // In-memory Interactive State for Scenario 1 (New Request)
  const [newReqStep, setNewReqStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [equipmentType, setEquipmentType] = useState('INVERTER');
  const [description, setDescription] = useState('افت راندمان اینورتر در ساعات بعدازظهر و روشن شدن چراغ هشدار قرمز');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['افت توان تولید', 'کد خطای اینورتر']);
  const [mockFiles, setMockFiles] = useState<{ name: string; size: string; preview: string }[]>([
    {
      name: 'inverter_nameplate.jpg',
      size: '1.2 MB',
      preview: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop'
    },
    {
      name: 'warning_led_panel.jpg',
      size: '850 KB',
      preview: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=400&auto=format&fit=crop'
    }
  ]);
  const [submittedRequestCode, setSubmittedRequestCode] = useState<string | null>(null);

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans antialiased" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. VISIBLE DEV QA WATERMARK & TEST ISOLATION BANNER                      */}
      {/* ========================================================================= */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs font-bold border-b border-amber-600 shadow-sm sticky top-0 z-50 flex items-center justify-center gap-2">
        <AlertTriangle size={16} className="shrink-0" />
        <span>داده‌های این صفحه صرفاً نمونه آزمایشی هستند و هیچ تغییری در اطلاعات واقعی سامانه ایجاد نمی‌کنند.</span>
      </div>

      {/* ========================================================================= */}
      {/* 2. COLLAPSIBLE QA CONTROLS TOOLBAR                                        */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-[37px] z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-100 flex items-center gap-2">
                  <span>پنل کنترل سناریوهای QA — تعمیرات هوشمند O&M</span>
                  <span className="text-[10px] bg-blue-900/80 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700">
                    STAGE 13.7.1 DEV PREVIEW
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  تست سناریوهای پنج‌گانه فرآیند تعمیرات بدون نیاز به لاگین یا جهش به صفحات احراز هویت
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Viewport simulation toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('DESKTOP')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewViewport === 'DESKTOP' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Monitor size={14} />
                  <span>دسکتاپ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('MOBILE')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewViewport === 'MOBILE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone size={14} />
                  <span>موبایل</span>
                </button>
              </div>

              {/* Collapse/Expand button */}
              <button
                type="button"
                onClick={() => setIsToolbarOpen(prev => !prev)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title={isToolbarOpen ? 'بستن کنترل‌ها' : 'باز کردن کنترل‌ها'}
              >
                {isToolbarOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Scenario Selector Pills */}
          {isToolbarOpen && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setScenario('NEW_REQUEST');
                  setSubmittedRequestCode(null);
                }}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'NEW_REQUEST'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Plus size={15} />
                <span>سناریو ۱: ثبت درخواست جدید</span>
              </button>

              <button
                type="button"
                onClick={() => setScenario('AI_ANALYSIS')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'AI_ANALYSIS'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Sparkles size={15} />
                <span>سناریو ۲: تحلیل هوشمند شواهد</span>
              </button>

              <button
                type="button"
                onClick={() => setScenario('ACTIVE_CASE')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'ACTIVE_CASE'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Clock size={15} />
                <span>سناریو ۳: پرونده فعال و در حال اقدام</span>
              </button>

              <button
                type="button"
                onClick={() => setScenario('COMPLETED_CASE')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'COMPLETED_CASE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <CheckCircle2 size={15} />
                <span>سناریو ۴: پرونده تکمیل و تاییدشده</span>
              </button>

              <button
                type="button"
                onClick={() => setScenario('EMPTY_STATE')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'EMPTY_STATE'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <FileText size={15} />
                <span>سناریو ۵: وضعیت خالی (بدون پرونده)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PREVIEW CONTAINER (DESKTOP OR MOBILE SIMULATION)                        */}
      {/* ========================================================================= */}
      <div className={`mx-auto px-4 pt-6 transition-all ${
        previewViewport === 'MOBILE' ? 'max-w-md bg-white border border-slate-300 rounded-3xl my-6 shadow-2xl p-4' : 'max-w-7xl'
      }`}>

        {/* Operational Lifecycle Overview Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-800 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="text-blue-400" size={18} />
              <h1 className="text-xs md:text-sm font-black text-slate-100">
                گردش کار عملیاتی بهره‌برداری و نگهداری نیروگاه‌های خورشیدی (Solar O&M Lifecycle)
              </h1>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 w-fit">
              بررسی فنی اولیه بر اساس اطلاعات و شواهد ثبت‌شده
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
            <div className={`p-3 rounded-2xl border transition-all ${
              scenario === 'NEW_REQUEST' && newReqStep <= 2
                ? 'bg-blue-900/50 border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-slate-800/60 border-slate-700/80'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-400">
                <span>گام ۱</span>
                <Wrench size={13} />
              </div>
              <div className="font-bold text-white text-[11px]">ثبت عارضه و مشخصات</div>
              <p className="text-[10px] text-slate-400 leading-tight">تجهیز معیوب، علائم و ظرفیت</p>
            </div>

            <div className={`p-3 rounded-2xl border transition-all ${
              scenario === 'NEW_REQUEST' && newReqStep === 3
                ? 'bg-indigo-900/50 border-indigo-500 ring-2 ring-indigo-500/30'
                : 'bg-slate-800/60 border-slate-700/80'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400">
                <span>گام ۲</span>
                <Camera size={13} />
              </div>
              <div className="font-bold text-white text-[11px]">شواهد و تصاویر فنی</div>
              <p className="text-[10px] text-slate-400 leading-tight">پلاک، نمایشگر اینورتر و قبوض</p>
            </div>

            <div className={`p-3 rounded-2xl border transition-all ${
              scenario === 'AI_ANALYSIS' || (scenario === 'NEW_REQUEST' && newReqStep === 4)
                ? 'bg-cyan-900/50 border-cyan-500 ring-2 ring-cyan-500/30'
                : 'bg-slate-800/60 border-slate-700/80'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400">
                <span>گام ۳</span>
                <Sparkles size={13} />
              </div>
              <div className="font-bold text-white text-[11px]">تحلیل هوشمند و قواعد</div>
              <p className="text-[10px] text-slate-400 leading-tight">ریشه‌یابی و ارزیابی شواهد</p>
            </div>

            <div className={`p-3 rounded-2xl border transition-all ${
              scenario === 'ACTIVE_CASE' || (scenario === 'NEW_REQUEST' && newReqStep === 5)
                ? 'bg-purple-900/50 border-purple-500 ring-2 ring-purple-500/30'
                : 'bg-slate-800/60 border-slate-700/80'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-400">
                <span>گام ۴</span>
                <ShieldCheck size={13} />
              </div>
              <div className="font-bold text-white text-[11px]">انتخاب یا ارجاع به متخصص</div>
              <p className="text-[10px] text-slate-400 leading-tight">متخصصان ثبت‌شده در سامانه</p>
            </div>

            <div className={`col-span-2 sm:col-span-1 p-3 rounded-2xl border transition-all ${
              scenario === 'COMPLETED_CASE'
                ? 'bg-emerald-900/50 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-slate-800/60 border-slate-700/80'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                <span>گام ۵</span>
                <FileCheck2 size={13} />
              </div>
              <div className="font-bold text-white text-[11px]">ثبت اقدامات و وضعیت پرونده</div>
              <p className="text-[10px] text-slate-400 leading-tight">ثبت سوابق تکنسین و تاریخچه</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SCENARIO 1: NEW MAINTENANCE CASE REQUEST                                   */}
        {/* ========================================================================= */}
        {scenario === 'NEW_REQUEST' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    پیش‌نمایش فرآیند ثبت درخواست (درون‌حافظه‌ای)
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-2 flex items-center gap-2">
                    <Wrench className="text-blue-600" size={20} />
                    ثبت درخواست عیب‌یابی و تعمیرات هوشمند
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    فرم گام‌به‌گام ثبت تجهیز، شرح علائم، آپلود شواهد تصویری و انتخاب متخصص
                  </p>
                </div>

                {/* Stepper Buttons for QA inspection */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs">
                  <span className="text-slate-500 text-[11px] font-bold px-2">گام فرم:</span>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewReqStep(s as any)}
                      className={`w-7 h-7 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                        newReqStep === s
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {submittedRequestCode ? (
                <div className="p-8 text-center space-y-4 bg-emerald-50/60 rounded-3xl border border-emerald-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-base font-black text-emerald-950">درخواست تعمیرات با موفقیت ثبت شد</h3>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    پرونده شما در صف بررسی اولیه قرار گرفت. جهت رهگیری مستقیم می‌توانید از کد زیر استفاده فرمایید:
                  </p>
                  <div className="inline-flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-emerald-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-bold">کد رهگیری پرونده:</span>
                    <span dir="ltr" className="text-sm font-black font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {submittedRequestCode}
                    </span>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setScenario('ACTIVE_CASE')}
                      className="px-6 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      مشاهده در سناریوی پرونده فعال
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Step 1: Equipment */}
                  {newReqStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-900">گام ۱: مشخصات سامانه یا تجهیز معیوب</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'INVERTER', title: 'اینورتر خورشیدی', icon: Zap, desc: 'استرینگ یا مرکزی متصل به شبکه' },
                          { id: 'PANEL', title: 'پنل و آرایه‌ها', icon: Layers, desc: 'ماژول‌ها، سیم‌کشی DC و استراکچر' },
                          { id: 'COMBINER_BOX', title: 'تابلو و کمباینر', icon: Cpu, desc: 'فیوزها، سرج ارستر و بریکرها' }
                        ].map(t => (
                          <div
                            key={t.id}
                            onClick={() => setEquipmentType(t.id)}
                            className={`p-4 rounded-2xl border text-right cursor-pointer transition-all ${
                              equipmentType === t.id
                                ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <t.icon className={equipmentType === t.id ? 'text-blue-600' : 'text-slate-400'} size={20} />
                            <h4 className="text-xs font-bold text-slate-900 mt-2">{t.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-1">{t.desc}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => setNewReqStep(2)}
                          className="px-6 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          ادامه به گام ۲: شرح علائم
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Problem Description */}
                  {newReqStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-900">گام ۲: علائم و شرح مشکل مشاهده‌شده</h3>
                      <div className="flex flex-wrap gap-2">
                        {['افت توان تولید', 'کد خطای اینورتر', 'خاموشی کامل اینورتر', 'بوی سوختگی یا جرقه', 'سوختگی فیوز'].map(sym => (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => toggleSymptom(sym)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              selectedSymptoms.includes(sym)
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {sym}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">شرح تکمیلی وضعیت تجهیز:</label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setNewReqStep(1)}
                          className="px-4 py-2 min-h-[44px] text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          گام قبلی
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewReqStep(3)}
                          className="px-6 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          ادامه به گام ۳: شواهد تصویری
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Image Upload Visual State */}
                  {newReqStep === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900">گام ۳: شواهد و تصاویر فنی تجهیز</h3>
                        <span className="text-[11px] text-slate-400 font-mono">{mockFiles.length} تصویر پیوست‌شده</span>
                      </div>

                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2 bg-slate-50">
                        <Camera className="w-8 h-8 text-blue-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">تصاویر پلاک مشخصات، صفحه نمایشگر خطا و وضعیت ظاهری</p>
                        <p className="text-[11px] text-slate-400">فرمت‌های مجاز: JPG, PNG, WEBP — حداکثر ۱۰ مگابایت</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mockFiles.map((file, idx) => (
                          <div key={idx} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-3">
                            <img src={file.preview} alt={file.name} className="w-14 h-14 object-cover rounded-xl border border-slate-100" />
                            <div className="flex-1 min-w-0">
                              <span dir="ltr" className="text-xs font-bold text-slate-800 block truncate font-mono">{file.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{file.size}</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              تأییدشده
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setNewReqStep(2)}
                          className="px-4 py-2 min-h-[44px] text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          گام قبلی
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewReqStep(4)}
                          className="px-6 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          ادامه به گام ۴: تحلیل هوشمند
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: AI Analysis Preview */}
                  {newReqStep === 4 && (
                    <div className="space-y-4">
                      {/* Truthful attribution notice */}
                      <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950">
                        <Info size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <span className="font-bold block text-indigo-900">
                            دستیار هوشمند تحلیل شواهد مهندسی O&M (پیشنهاد اولیه تشخیصی)
                          </span>
                          <p className="text-[11px] text-indigo-800 leading-relaxed">
                            این نتایج یک بررسی فنی اولیه بر اساس اطلاعات و شواهد تصویری ثبت‌شده توسط کاربر است و جایگزین بررسی حضوری کارشناس یا آزمون‌های الکتریکی تخصصی نبوده و صرفاً جنبه راهنمایی دارد.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">ریشه‌یابی اولیه بر اساس شواهد:</span>
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-mono">
                            اطمینان اولیه: ۸۸٪
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          افت بازدهی حرارتی و گرفتگی پروانه‌های فن خنک‌کننده هیت‌سینک در ساعات ظهر تابستان.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setNewReqStep(3)}
                          className="px-4 py-2 min-h-[44px] text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          گام قبلی
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewReqStep(5)}
                          className="px-6 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          ادامه به گام ۵: انتخاب متخصص و ثبت نهایی
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Submit state */}
                  {newReqStep === 5 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-900">گام ۵: ارجاع به متخصص و تایید نهایی</h3>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">شیوه ارجاع:</span>
                          <span className="font-bold text-slate-800">ارجاع به متخصصان فعال منطقه</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">شماره تماس رابط:</span>
                          <span dir="ltr" className="font-mono font-bold text-slate-800">09123456789</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setNewReqStep(4)}
                          className="px-4 py-2 min-h-[44px] text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          گام قبلی
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmittedRequestCode('MC-2026-0042')}
                          className="px-8 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer"
                        >
                          ثبت نهایی درخواست و دریافت کد رهگیری
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCENARIO 2: AI ANALYSIS VIEW                                               */}
        {/* ========================================================================= */}
        {scenario === 'AI_ANALYSIS' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                    پیش‌نمایش سناریوی تحلیل هوشمند شواهد
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-2 flex items-center gap-2">
                    <Sparkles className="text-indigo-600" size={20} />
                    نتایج ارزیابی هوشمند شواهد و علائم خطا
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ارائه علل محتمل، شواهد دسته‌بندی‌شده، توصیه‌های ایمنی و اقدامات پیشنهادی
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">میزان قطعیت تخمین:</span>
                  <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                    ۸۸٪
                  </span>
                </div>
              </div>

              {/* Truthful attribution notice */}
              <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950">
                <Info size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold block text-indigo-900">
                    دستیار هوشمند تحلیل شواهد مهندسی O&M (پیشنهاد اولیه تشخیصی)
                  </span>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    این نتایج یک بررسی فنی اولیه بر اساس اطلاعات و شواهد تصویری ثبت‌شده توسط کاربر است و جایگزین بررسی حضوری کارشناس یا آزمون‌های الکتریکی تخصصی نبوده و صرفاً جنبه راهنمایی دارد.
                  </p>
                </div>
              </div>

              {/* Root causes */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-600" />
                  <span>ریشه‌یابی و احتمالات خرابی شناسایی‌شده</span>
                </h3>
                <div className="space-y-2.5">
                  {DEV_DIAGNOSIS_FIXTURE.likelyRootCauses?.map((cause: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{cause.cause}</span>
                        <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-lg">
                          احتمال: {Math.round(cause.probability * 100)}٪
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{cause.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categorized Evidence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera size={14} className="text-blue-600" />
                    <span>شواهد استخراج‌شده از تصاویر</span>
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    {DEV_DIAGNOSIS_FIXTURE.evidenceCategorized?.PHOTO_OBSERVED?.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>علائم گزارش‌شده توسط کاربر</span>
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    {DEV_DIAGNOSIS_FIXTURE.evidenceCategorized?.OBSERVED?.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Next Actions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>اقدامات پیشنهادی و گام‌های اصلاحی</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEV_DIAGNOSIS_FIXTURE.recommendedActions?.map((act: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950">{act.action}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          اولویت: {act.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">تخمین زمان مورد نیاز: {act.estimatedHours} ساعت</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Guidance */}
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60 text-xs space-y-2">
                <h4 className="font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-rose-600" />
                  <span>دستورالعمل‌های ایمنی پیش از بازرسی</span>
                </h4>
                <ul className="text-[11px] text-rose-800 space-y-1 list-disc list-inside">
                  {DEV_DIAGNOSIS_FIXTURE.safetyGuidance?.map((sg, i) => (
                    <li key={i}>{sg}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCENARIO 3: ACTIVE MAINTENANCE CASE TRACKING                               */}
        {/* ========================================================================= */}
        {scenario === 'ACTIVE_CASE' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              {/* Header with Case Code */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                      پرونده فعال در حال اجرا
                    </span>
                    <span dir="ltr" className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {DEV_ACTIVE_CASE_FIXTURE.caseNumber}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-slate-900 mt-2">
                    {DEV_ACTIVE_CASE_FIXTURE.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ثبت‌شده در تاریخ: {new Date(DEV_ACTIVE_CASE_FIXTURE.reportedAt).toLocaleDateString('fa-IR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">وضعیت پرونده:</span>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-xl">
                    در حال اقدام
                  </span>
                </div>
              </div>

              {/* Grid: Details & Assigned Tech */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Column 1: Tech Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <span>متخصص مسئول پرونده</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-slate-900">{DEV_ACTIVE_CASE_FIXTURE.assignedTechnicianName}</p>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      <span dir="ltr" className="font-mono">{DEV_ACTIVE_CASE_FIXTURE.assignedTechnicianPhone}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">تاریخ مراجعه برنامه‌ریزی‌شده: ۱۴۰۵/۰۱/۰۶</p>
                  </div>
                </div>

                {/* Column 2 & 3: Actions Log */}
                <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wrench size={16} className="text-blue-600" />
                    <span>سوابق اقدامات فنی ثبت‌شده ({DEV_ACTIVE_ACTIONS_FIXTURE.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {DEV_ACTIVE_ACTIONS_FIXTURE.map(act => (
                      <div key={act.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{act.description}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(act.performedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>نوع اقدام: <strong>{act.actionType}</strong></span>
                          <span>نتیجه: <strong className="text-slate-700">{act.resultStatus}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon size={16} className="text-indigo-600" />
                  <span>پیوست‌های تصویری پرونده</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEV_ACTIVE_CASE_FIXTURE.attachments?.map(att => (
                    <div key={att.id} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-3">
                      <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-xl border border-slate-100" />
                      <div className="flex-1 min-w-0">
                        <span dir="ltr" className="text-xs font-bold text-slate-800 block truncate font-mono">{att.name}</span>
                        <span className="text-[10px] text-slate-400">آپلود توسط {att.uploadedBy}</span>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                        title="مشاهده تصویر"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCENARIO 4: COMPLETED MAINTENANCE CASE VIEW                                */}
        {/* ========================================================================= */}
        {scenario === 'COMPLETED_CASE' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              {/* Header with Case Code */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                      پرونده تکمیل و بایگانی‌شده
                    </span>
                    <span dir="ltr" className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {DEV_COMPLETED_CASE_FIXTURE.caseNumber}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-slate-900 mt-2">
                    {DEV_COMPLETED_CASE_FIXTURE.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    تاریخ خاتمه اقدامات: {new Date(DEV_COMPLETED_CASE_FIXTURE.completedAt!).toLocaleDateString('fa-IR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">وضعیت پرونده:</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl">
                    تکمیل و مختومه
                  </span>
                </div>
              </div>

              {/* Customer Confirmation Banner */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-950 font-bold">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>تأییدیه حسن انجام کار و رضایت کارفرما ثبت شده است</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  یادداشت کارفرما: {DEV_COMPLETED_CASE_FIXTURE.verificationNotes}
                </p>
              </div>

              {/* Spare Parts and Technician Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Spare Parts */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Cpu size={16} className="text-blue-600" />
                    <span>قطعات یدکی مصرف‌شده</span>
                  </h3>
                  <div className="space-y-2">
                    {DEV_COMPLETED_CASE_FIXTURE.sparePartsUsed?.map((sp, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{sp.partName}</span>
                          <span className="text-[10px] text-slate-400">تعداد: {sp.quantity} عدد</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {sp.costIrr?.toLocaleString('fa-IR')} ریال
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technician Log */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wrench size={16} className="text-blue-600" />
                    <span>اقدامات نهایی کارشناس O&M</span>
                  </h3>
                  <div className="space-y-2">
                    {DEV_COMPLETED_ACTIONS_FIXTURE.map(act => (
                      <div key={act.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">{act.description}</span>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{act.actionType}</span>
                          <span>{act.resultStatus}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCENARIO 5: EMPTY STATE (NO MAINTENANCE CASES)                             */}
        {/* ========================================================================= */}
        {scenario === 'EMPTY_STATE' && (
          <div className="space-y-6">
            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText size={32} />
              </div>
              <h2 className="text-base font-black text-slate-900">
                هیچ پرونده تعمیرات و نگهداری فعالی وجود ندارد
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                سامانه هوشیار به شما کمک می‌کند در صورت بروز عیب، افت تولید یا نیاز به بازرسی دوره‌ای نیروگاه خورشیدی خود، به سادگی شواهد را ثبت کرده و از پشتیبانی متخصصان بهره‌مند شوید.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setScenario('NEW_REQUEST')}
                  className="px-6 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>ثبت اولین درخواست تعمیرات</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
