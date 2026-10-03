import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Award, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  ArrowUpDown, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  FileCheck2,
  Calendar,
  Layers,
  MapPin,
  Check,
  X,
  Eye,
  SlidersHorizontal,
  Info,
  Smartphone,
  Monitor,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { ProjectRFQ, EPCBid } from '../../types/rfq.js';
import RFQTab from '../projects/Workspace/RFQTab.js';
import BidsTab from '../projects/Workspace/BidsTab.js';
import { BidDocumentsManager } from '../../components/rfq/BidDocumentsManager.js';

// =========================================================================
// DEV FIXTURES (STAGE 13.5 SAFE MOCK DATA - DOES NOT LEAK INTO PRODUCTION)
// =========================================================================

const FIXTURE_PROJECT = {
  id: 'dev-proj-13-5',
  title: 'نیروگاه خورشیدی ۱۰۰ کیلووات صنعتی اشتهارد',
  location: 'استان البرز، شهرک صنعتی اشتهارد، فاز توسعه',
  capacityKwp: 100,
  consumptionKwh: 165000,
  createdAt: '2026-05-10T08:00:00.000Z',
};

const FIXTURE_RFQS: Record<string, ProjectRFQ> = {
  OPEN_ACTIVE: {
    id: 'rfq-dev-open-01',
    rfqCode: 'RFQ-1405-089',
    projectId: 'dev-proj-13-5',
    createdByUserId: 'usr-dev-admin',
    status: 'PUBLISHED',
    title: 'استعلام احداث نیروگاه خورشیدی متصل به شبکه ۱۰۰ کیلووات',
    description: 'تامین تجهیزات باکیفیت استاندارد توانیر (مورد تایید ساتبا)، مهندسی جزئیات، ساخت استراکچر گالوانیزه گرم، اجرای کامل الکتریکال، نصب، تست و راه‌اندازی با ترانس اختصاصی و اتصال به شبکه توزیع البرز.',
    scope: 'احداث کامل EPC نیروگاه خورشیدی ۱۰۰ کیلووات صنعتی',
    submissionDeadline: '2026-06-15T23:59:59.000Z',
    currency: 'IRR',
    visibility: 'VERIFIED_EPCS',
    technicalRequirements: ['پنل‌های خورشیدی استاندارد Tier 1 با راندمان بالای ۲۱٪', 'اینورترهای خورشیدی متصل به شبکه تحت لیسانس و گواهی ساتبا'],
    commercialRequirements: ['گارانتی حداقل ۱۰ ساله تجهیزات اصلی', 'تعهد حسن انجام کار و تحویل ۵۶ روزه'],
    requiredDocuments: [
      'اساسنامه و رزومه معتبر EPC در حوزه نیروگاه‌های صنعتی',
      'گواهی صلاحیت فنی یا رتبه‌بندی پیمانکاری',
      'پیشنهاد فنی شامل سینگل لاین دیاگرام و برآورد شبیه‌سازی PVSyst',
      'آنالیز تفکیکی قیمت (BOM) و جدول زمان‌بندی اجرای پروژه'
    ],
    createdAt: '2026-05-12T09:00:00.000Z',
    publishedAt: '2026-05-12T10:00:00.000Z',
    selectedBidId: undefined,
    selectedEpcOrganizationId: undefined,
  },
  AWARDED: {
    id: 'rfq-dev-awarded-02',
    rfqCode: 'RFQ-1405-042',
    projectId: 'dev-proj-13-5',
    createdByUserId: 'usr-dev-admin',
    status: 'AWARDED',
    title: 'استعلام احداث نیروگاه خورشیدی ۱۰۰ کیلووات — واگذارشده',
    description: 'فرآیند ارزیابی فنی و بازرگانی پایان یافته و قرارداد نهایی با پیمانکار منتخب مبادله گردیده است.',
    scope: 'احداث کامل EPC نیروگاه ۱۰۰ کیلووات صنعتی',
    submissionDeadline: '2026-04-20T23:59:59.000Z',
    currency: 'IRR',
    visibility: 'VERIFIED_EPCS',
    technicalRequirements: ['طرح فنی تایید شده'],
    commercialRequirements: ['شرایط قرارداد نهایی'],
    requiredDocuments: ['رزومه پیمانکار', 'طرح فنی', 'قیمت تفکیکی'],
    createdAt: '2026-04-01T10:00:00.000Z',
    publishedAt: '2026-04-01T12:00:00.000Z',
    closedAt: '2026-05-01T12:00:00.000Z',
    awardedAt: '2026-05-01T12:00:00.000Z',
    selectedBidId: 'bid-dev-01',
    selectedEpcOrganizationId: 'epc-org-parto',
  },
  CLOSED: {
    id: 'rfq-dev-closed-03',
    rfqCode: 'RFQ-1405-012',
    projectId: 'dev-proj-13-5',
    createdByUserId: 'usr-dev-admin',
    status: 'CLOSED',
    title: 'استعلام احداث نیروگاه خورشیدی ۱۰۰ کیلووات — پایان مهلت',
    description: 'مهلت ارسال پیشنهاد به اتمام رسیده و دریافت پیشنهاد جدید غیرفعال است.',
    scope: 'احداث نیروگاه خورشیدی ۱۰۰ کیلووات',
    submissionDeadline: '2026-03-20T23:59:59.000Z',
    currency: 'IRR',
    visibility: 'VERIFIED_EPCS',
    technicalRequirements: ['طرح فنی'],
    commercialRequirements: ['پیشنهاد مالی'],
    requiredDocuments: ['طرح فنی و مالی'],
    createdAt: '2026-03-01T08:00:00.000Z',
    publishedAt: '2026-03-01T09:00:00.000Z',
    closedAt: '2026-03-25T18:00:00.000Z',
    selectedBidId: undefined,
    selectedEpcOrganizationId: undefined,
  },
  DRAFT: {
    id: 'rfq-dev-draft-04',
    rfqCode: 'RFQ-1405-DRAFT',
    projectId: 'dev-proj-13-5',
    createdByUserId: 'usr-dev-admin',
    status: 'DRAFT',
    title: 'پیش‌نویس استعلام مهندسی و اجرای نیروگاه ۱۰۰ کیلووات',
    description: 'این استعلام در مرحله تدوین مدارک و چک‌لیست بوده و هنوز در شبکه پیمانکاران منتشر نشده است.',
    scope: 'احداث نیروگاه خورشیدی ۱۰۰ کیلووات صنعتی',
    submissionDeadline: '2026-07-01T23:59:59.000Z',
    currency: 'IRR',
    visibility: 'VERIFIED_EPCS',
    technicalRequirements: ['استاندارد توانیر'],
    commercialRequirements: ['تضامین بانکی'],
    requiredDocuments: ['ضمانت‌نامه بانکی', 'شبیه‌سازی فنی'],
    createdAt: '2026-05-20T11:00:00.000Z',
    selectedBidId: undefined,
    selectedEpcOrganizationId: undefined,
  }
};

const FIXTURE_BIDS: EPCBid[] = [
  {
    id: 'bid-dev-01',
    bidCode: 'BID-HSE-000001',
    projectId: 'dev-proj-13-5',
    rfqId: 'rfq-dev-open-01',
    epcOrganizationId: 'epc-org-parto',
    epcCompanyName: 'شرکت مهندسی پرتو تابش کویر (سهامی خاص)',
    epcName: 'شرکت مهندسی پرتو تابش کویر (سهامی خاص)',
    status: 'UNDER_REVIEW',
    currency: 'IRR',
    totalPrice: 32500000000,
    totalPriceIRR: 32500000000,
    engineeringPrice: 1500000000,
    equipmentPrice: 24000000000,
    installationPrice: 5000000000,
    otherPrice: 2000000000,
    executionDays: 56,
    timelineDays: 56,
    warrantyYears: 10,
    equipmentSummary: {
      panels: 'Longi Solar Hi-MO 6 (550W Tier-1)',
      inverters: 'Sungrow SG100CX (100kW)',
      structures: 'سازه گالوانیزه گرم فیکس با زاویه بهینه ۲۸ درجه',
      monitoring: 'سامانه نظارت برخط اسکادا'
    },
    paymentTerms: '۲۰٪ پیش‌پرداخت، ۶۰٪ تحویل تجهیزات اصلی در محل پروژه، ۲۰٪ اتصال به شبکه و اخذ تاییدیه توزیع',
    technicalDocuments: ['pvsyst-simulation-report.pdf', 'single-line-diagram-signed.pdf'],
    commercialDocuments: ['bom-detailed-pricing.pdf'],
    technicalCompliance: 'COMPLIANT',
    riskFlags: [],
    currentRevisionNumber: 1,
    createdAt: '2026-05-15T11:20:00.000Z',
    submittedAt: '2026-05-15T11:20:00.000Z',
    guaranteedAnnualYieldMwh: 184.5,
    equipmentSpecs: {
      panelBrand: 'Longi Solar Hi-MO 6 (550W Tier-1)',
      inverterBrand: 'Sungrow SG100CX (100kW)',
      rackingType: 'سازه گالوانیزه گرم فیکس با زاویه بهینه ۲۸ درجه',
      monitoringIncluded: true
    },
    technicalProposalNotes: 'پیمانکار رتبه ۲ نیرو و تاسیسات با سابقه احداث بیش از ۱۲ مگاوات نیروگاه صنعتی در استان البرز.'
  },
  {
    id: 'bid-dev-02',
    bidCode: 'BID-HSE-000002',
    projectId: 'dev-proj-13-5',
    rfqId: 'rfq-dev-open-01',
    epcOrganizationId: 'epc-org-alborz',
    epcCompanyName: 'مهندسی انرژی نوین البرز',
    epcName: 'مهندسی انرژی نوین البرز',
    status: 'SUBMITTED',
    currency: 'IRR',
    totalPrice: 29800000000,
    totalPriceIRR: 29800000000,
    engineeringPrice: 1200000000,
    equipmentPrice: 22000000000,
    installationPrice: 4800000000,
    otherPrice: 1800000000,
    executionDays: 42,
    timelineDays: 42,
    warrantyYears: 15,
    equipmentSummary: {
      panels: 'Jinko Solar Tiger Pro (545W Mono PERC)',
      inverters: 'Huawei SUN2000-100KTL-M1',
      structures: 'سازه آلیاژی سبک با پوشش زینک‌پلاس',
      monitoring: 'Huawei FusionSolar IoT'
    },
    paymentTerms: '۲۵٪ پیش‌پرداخت، ۵۰٪ تحویل تجهیزات، ۲۵٪ پس از اتصال نهایی به شبکه',
    technicalDocuments: ['technical-catalog-jinko.pdf'],
    commercialDocuments: ['price-schedule-alborz.pdf'],
    technicalCompliance: 'COMPLIANT',
    riskFlags: [],
    currentRevisionNumber: 1,
    createdAt: '2026-05-16T14:45:00.000Z',
    submittedAt: '2026-05-16T14:45:00.000Z',
    guaranteedAnnualYieldMwh: 178.2,
    equipmentSpecs: {
      panelBrand: 'Jinko Solar Tiger Pro (545W Mono PERC)',
      inverterBrand: 'Huawei SUN2000-100KTL-M1',
      rackingType: 'سازه آلیاژی سبک با پوشش زینک‌پلاس',
      monitoringIncluded: true
    },
    technicalProposalNotes: 'تجهیزات اصلی در انبار تهران موجود بوده و تحویل سریع تضمین می‌گردد.'
  },
  {
    id: 'bid-dev-03',
    bidCode: 'BID-HSE-000003',
    projectId: 'dev-proj-13-5',
    rfqId: 'rfq-dev-open-01',
    epcOrganizationId: 'epc-org-arya',
    epcCompanyName: 'نیرو سازان توانمند آریا',
    epcName: 'نیرو سازان توانمند آریا',
    status: 'SUBMITTED',
    currency: 'IRR',
    totalPrice: 34200000000,
    totalPriceIRR: 34200000000,
    engineeringPrice: 1800000000,
    equipmentPrice: 25000000000,
    installationPrice: 5400000000,
    otherPrice: 2000000000,
    executionDays: 70,
    timelineDays: 70,
    warrantyYears: 12,
    equipmentSummary: {
      panels: 'Canadian Solar BiHiKu7 (540W Bifacial)',
      inverters: 'SMA Sunny Tripower CORE2 (110kW)',
      structures: 'سازه مرتفع ویژه پنل‌های دوطرفه',
      monitoring: 'SMA EnnexOS Energy Management'
    },
    paymentTerms: '۱۵٪ پیش‌پرداخت، ۶۵٪ تامین تجهیزات، ۲۰٪ راه‌اندازی و سنکرون',
    technicalDocuments: ['bifacial-performance-simulation.pdf'],
    commercialDocuments: [],
    technicalCompliance: 'PARTIALLY_COMPLIANT',
    riskFlags: [
      {
        type: 'MISSING_DOCUMENTS',
        severity: 'MEDIUM',
        description: 'سند تفکیکی قیمت (BOM) ارسال نشده است'
      }
    ],
    currentRevisionNumber: 1,
    createdAt: '2026-05-18T09:10:00.000Z',
    submittedAt: '2026-05-18T09:10:00.000Z',
    guaranteedAnnualYieldMwh: 191.0,
    equipmentSpecs: {
      panelBrand: 'Canadian Solar BiHiKu7 (540W Bifacial)',
      inverterBrand: 'SMA Sunny Tripower CORE2 (110kW)',
      rackingType: 'سازه مرتفع ویژه پنل‌های دوطرفه',
      monitoringIncluded: true
    },
    technicalProposalNotes: 'پیش‌بینی بالاترین بازدهی تولید با استفاده از ماژول‌های دوطرفه نسل جدید.'
  },
  {
    id: 'bid-dev-04',
    bidCode: 'BID-HSE-000004',
    projectId: 'dev-proj-13-5',
    rfqId: 'rfq-dev-open-01',
    epcOrganizationId: 'epc-org-minimal',
    epcCompanyName: 'توسعه انرژی پایدار سپهر (پیشنهاد پایه)',
    epcName: 'توسعه انرژی پایدار سپهر (پیشنهاد پایه)',
    status: 'SUBMITTED',
    currency: 'IRR',
    totalPrice: 27500000000,
    totalPriceIRR: 27500000000,
    engineeringPrice: 1000000000,
    equipmentPrice: 21000000000,
    installationPrice: 4000000000,
    otherPrice: 1500000000,
    executionDays: 84,
    timelineDays: 84,
    warrantyYears: 5,
    equipmentSummary: {
      panels: undefined,
      inverters: undefined,
      structures: undefined,
      monitoring: undefined
    },
    paymentTerms: '۳۰٪ پیش‌پرداخت، ۵۰٪ تحویل، ۲۰٪ تست شبکه',
    technicalDocuments: [],
    commercialDocuments: [],
    technicalCompliance: 'REQUIRES_REVIEW',
    riskFlags: [
      {
        type: 'MISSING_DOCUMENTS',
        severity: 'HIGH',
        description: 'اسناد فنی و مدارک هویتی تجهیزات ضمیمه نشده است'
      }
    ],
    currentRevisionNumber: 1,
    createdAt: '2026-05-19T16:00:00.000Z',
    submittedAt: '2026-05-19T16:00:00.000Z',
    guaranteedAnnualYieldMwh: 168.0,
    equipmentSpecs: {
      panelBrand: undefined,
      inverterBrand: undefined,
      rackingType: undefined,
      monitoringIncluded: false
    },
    technicalProposalNotes: 'پیشنهاد قیمت اقتصادی، مدل دقیق تجهیزات بر اساس نوسانات ارزی در زمان عقد قرارداد نهایی می‌گردد.'
  }
];

export default function RfqBidPreview() {
  // DEV-ONLY HARD GUARD: Fail closed outside development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  // Scenarios state
  const [rfqScenario, setRfqScenario] = useState<'OPEN_ACTIVE' | 'AWARDED' | 'CLOSED' | 'DRAFT'>('OPEN_ACTIVE');
  const [viewportMode, setViewportMode] = useState<'responsive' | '430' | '390' | '360'>('responsive');
  const [activeTab, setActiveTab] = useState<'BIDS' | 'RFQ' | 'DOCS_DEMO'>('BIDS');
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [selectedBidForDocs, setSelectedBidForDocs] = useState<string>('bid-dev-01');

  // Simulated live state
  const [bids, setBids] = useState<EPCBid[]>(FIXTURE_BIDS);
  const [currentRfq, setCurrentRfq] = useState<ProjectRFQ>(FIXTURE_RFQS['OPEN_ACTIVE']);

  const handleScenarioChange = (scenario: 'OPEN_ACTIVE' | 'AWARDED' | 'CLOSED' | 'DRAFT') => {
    setRfqScenario(scenario);
    const baseRfq = { ...FIXTURE_RFQS[scenario] };
    if (scenario === 'AWARDED') {
      baseRfq.selectedBidId = 'bid-dev-01';
      setBids(FIXTURE_BIDS.map(b => b.id === 'bid-dev-01' ? { ...b, status: 'ACCEPTED' as const } : { ...b, status: 'REJECTED' as const }));
    } else {
      setBids(FIXTURE_BIDS);
    }
    setCurrentRfq(baseRfq);
  };

  const getContainerWidthClass = () => {
    switch (viewportMode) {
      case '360':
        return 'max-w-[360px] mx-auto border-x border-slate-300 dark:border-zinc-700 shadow-2xl bg-white dark:bg-zinc-950 min-h-screen';
      case '390':
        return 'max-w-[390px] mx-auto border-x border-slate-300 dark:border-zinc-700 shadow-2xl bg-white dark:bg-zinc-950 min-h-screen';
      case '430':
        return 'max-w-[430px] mx-auto border-x border-slate-300 dark:border-zinc-700 shadow-2xl bg-white dark:bg-zinc-950 min-h-screen';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 font-sans text-slate-800 dark:text-slate-100 transition-colors pb-24" dir="rtl">
      
      {/* ========================================================================= */}
      {/* COMPACT & COLLAPSIBLE MOBILE DEV PREVIEW TOOLBAR                         */}
      {/* ========================================================================= */}
      <aside 
        aria-label="نوار ابزار پیش‌نمایش مناقصات و اسناد مرحله ۱۳.۵"
        className="sticky top-0 z-50 bg-slate-900/95 text-white backdrop-blur-md border-b border-slate-800 shadow-md text-xs"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-slate-200">پیش‌نمایش RFQ و مناقصات (Stage 13.5)</span>
            <span className="hidden sm:inline-block bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-400 border border-slate-700">
              محیط ایزوله DEV — بدون تاثیر بر تولید
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Viewport Simulator */}
            <div className="hidden lg:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <span className="px-2 text-[10px] text-slate-400">عرض نمایشگر:</span>
              <button
                type="button"
                onClick={() => setViewportMode('responsive')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${viewportMode === 'responsive' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                کامل
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('430')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${viewportMode === '430' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                430px
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('390')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${viewportMode === '390' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                390px
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('360')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${viewportMode === '360' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                360px
              </button>
            </div>

            {/* Desktop Scenarios */}
            <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => handleScenarioChange('OPEN_ACTIVE')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${rfqScenario === 'OPEN_ACTIVE' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                استعلام فعال (۴ پیشنهاد)
              </button>
              <button
                type="button"
                onClick={() => handleScenarioChange('AWARDED')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${rfqScenario === 'AWARDED' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                واگذارشده (برنده مشخص)
              </button>
              <button
                type="button"
                onClick={() => handleScenarioChange('CLOSED')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${rfqScenario === 'CLOSED' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                پایان مهلت
              </button>
              <button
                type="button"
                onClick={() => handleScenarioChange('DRAFT')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${rfqScenario === 'DRAFT' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                پیش‌نویس
              </button>
            </div>

            {/* Mobile Toggle Button */}
            <button
              type="button"
              onClick={() => setIsToolbarOpen(!isToolbarOpen)}
              className="sm:hidden px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5"
            >
              <span>تنظیمات آزمون</span>
              <ChevronDown size={14} className={`transition-transform ${isToolbarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Collapsed Drawer */}
        {isToolbarOpen && (
          <div className="sm:hidden px-4 pb-3 pt-1 border-t border-slate-800/80 bg-slate-900 space-y-2.5">
            <div className="text-[11px] text-slate-400">وضعیت استعلام نمونه:</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => { handleScenarioChange('OPEN_ACTIVE'); setIsToolbarOpen(false); }}
                className={`py-1.5 px-2 rounded-lg text-center font-bold text-xs ${rfqScenario === 'OPEN_ACTIVE' ? 'bg-[#0284C7] text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                فعال (۴ پیشنهاد)
              </button>
              <button
                type="button"
                onClick={() => { handleScenarioChange('AWARDED'); setIsToolbarOpen(false); }}
                className={`py-1.5 px-2 rounded-lg text-center font-bold text-xs ${rfqScenario === 'AWARDED' ? 'bg-[#0284C7] text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                واگذارشده
              </button>
              <button
                type="button"
                onClick={() => { handleScenarioChange('CLOSED'); setIsToolbarOpen(false); }}
                className={`py-1.5 px-2 rounded-lg text-center font-bold text-xs ${rfqScenario === 'CLOSED' ? 'bg-[#0284C7] text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                بسته‌شده
              </button>
              <button
                type="button"
                onClick={() => { handleScenarioChange('DRAFT'); setIsToolbarOpen(false); }}
                className={`py-1.5 px-2 rounded-lg text-center font-bold text-xs ${rfqScenario === 'DRAFT' ? 'bg-[#0284C7] text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                پیش‌نویس
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Container with Viewport Width Constraint */}
      <div className={getContainerWidthClass()}>
        
        {/* Workspace Sub-tabs Navigation (Responsive, Zero Clipping at 360px/390px/430px) */}
        <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-3 sm:px-4 py-2.5 sticky top-10 z-40 shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scroll-smooth no-scrollbar py-1 px-0.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('BIDS')}
                className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap min-h-[44px] shrink-0 cursor-pointer ${
                  activeTab === 'BIDS'
                    ? 'bg-[#0284C7] text-white shadow-xs ring-2 ring-blue-400/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 bg-slate-50 dark:bg-zinc-800/50'
                }`}
              >
                <TrendingUp size={16} />
                <span className="hidden sm:inline">بررسی و مقایسه پیشنهادات (BidsTab)</span>
                <span className="sm:hidden">پیشنهادات EPC</span>
                <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                  {rfqScenario === 'DRAFT' ? 0 : bids.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('RFQ')}
                className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap min-h-[44px] shrink-0 cursor-pointer ${
                  activeTab === 'RFQ'
                    ? 'bg-[#0284C7] text-white shadow-xs ring-2 ring-blue-400/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 bg-slate-50 dark:bg-zinc-800/50'
                }`}
              >
                <FileText size={16} />
                <span className="hidden sm:inline">مشخصات استعلام و اسناد مبنا (RFQTab)</span>
                <span className="sm:hidden">مشخصات استعلام</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('DOCS_DEMO')}
                className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap min-h-[44px] shrink-0 cursor-pointer ${
                  activeTab === 'DOCS_DEMO'
                    ? 'bg-[#0284C7] text-white shadow-xs ring-2 ring-blue-400/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 bg-slate-50 dark:bg-zinc-800/50'
                }`}
              >
                <FileCheck2 size={16} />
                <span className="hidden sm:inline">مدیریت اسناد امن پیشنهاد (BidDocs)</span>
                <span className="sm:hidden">اسناد امن</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-bold shrink-0 hidden md:block">
              پروژه: ۱۰۰ kWp اشتهارد
            </div>
          </div>
        </div>

        {/* Tab 1: BidsTab (Comparison Matrix + Decision Flow) */}
        {activeTab === 'BIDS' && (
          <main className="max-w-6xl mx-auto px-4 py-6">
            <BidsTab
              projectId={FIXTURE_PROJECT.id}
              project={FIXTURE_PROJECT}
              previewMode={true}
              initialRfq={currentRfq}
              initialBids={rfqScenario === 'DRAFT' ? [] : bids}
            />
          </main>
        )}

        {/* Tab 2: RFQTab (RFQ Specs + Customer Requirements + RFQ Docs) */}
        {activeTab === 'RFQ' && (
          <main className="max-w-6xl mx-auto px-4 py-6">
            <RFQTab
              projectId={FIXTURE_PROJECT.id}
              project={FIXTURE_PROJECT}
              previewMode={true}
              initialRfq={currentRfq}
              onNavigateToBids={() => setActiveTab('BIDS')}
            />
          </main>
        )}

        {/* Tab 3: Dedicated Secure Documents Manager Inspection */}
        {activeTab === 'DOCS_DEMO' && (
          <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" size={18} />
                    بررسی اسناد پیوست امن پیشنهادهای پیمانکاران (Stage 12.3E Secure Storage)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    اسناد فنی و مالی تحت آبجکت‌استوریج ابری ذخیره شده و صرفاً از طریق لینک‌های امضاشده کوتاه‌مدت با توکن امنیتی بارگیری می‌شوند.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">انتخاب پیشنهاد:</span>
                  <select
                    value={selectedBidForDocs}
                    onChange={(e) => setSelectedBidForDocs(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    {bids.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.epcCompanyName} ({b.technicalDocuments.length + b.commercialDocuments.length} سند)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <BidDocumentsManager
                  bidId={selectedBidForDocs}
                  rfqId={currentRfq.id}
                  isBidOwner={false}
                  canModify={false}
                  legacyTechnical={bids.find(b => b.id === selectedBidForDocs)?.technicalDocuments || []}
                  legacyCommercial={bids.find(b => b.id === selectedBidForDocs)?.commercialDocuments || []}
                />
              </div>
            </div>

            {/* Info notice about Stage 12.3E compliance */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-4 flex items-start gap-3">
              <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-bold">تایید انطباق امنیتی مرحله ۱۲.۳E:</p>
                <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  تمامی کلیدهای خام فضای ابری و آدرس‌های مستقیم S3/MinIO پنهان باقی مانده و کارفرما فقط نام فایل، حجم، تاریخ و پیوند دانلود امضاشده با اعتبار استاندارد ۵ دقیقه‌ای (۳۰۰ ثانیه) را دریافت می‌کند. تمامی دکمه‌های کنترلی و دانلود دارای ابعاد لمسی حداقل ۴۴×۴۴ پیکسل بوده و بدون پنجره‌های هشدار بومی مرورگر اجرا می‌شوند.
                </p>
              </div>
            </div>
          </main>
        )}

      </div>
    </div>
  );
}
