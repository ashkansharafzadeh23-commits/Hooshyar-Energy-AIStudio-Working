import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Building2, 
  Store, 
  Layers, 
  Award, 
  Clock, 
  Zap, 
  Package, 
  Inbox, 
  Megaphone,
  Smartphone,
  Monitor,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ContractorDashboard from '../ContractorDashboard';
import Dashboard from '../vendor/portal/Dashboard';
import ProductManagement from '../vendor/portal/ProductManagement';
import ProfileEdit from '../vendor/portal/ProfileEdit';
import Subscription from '../vendor/portal/Subscription';
import { ProjectRFQ, EPCBid } from '../../types/rfq';
import { Organization } from '../../types/organization';
import { EnergyProject } from '../../types/project';

// =========================================================================
// DETERMINISTIC DEV FIXTURES (STAGE 13.6)
// =========================================================================

const DEV_EPC_ORG: Organization = {
  id: 'org_epc_dev_01',
  legalName: 'شرکت مهندسی و توسعه انرژی‌های تجدیدپذیر البرز سازه (سهامی خاص)',
  tradeName: 'البرز سولار EPC',
  nationalId: '۱۰۳۸۰۲۹۳۸۱۱',
  verified: true,
  verificationStatus: 'VERIFIED',
  roles: ['EPC'],
  contactEmail: 'epc@alborz-solar.ir',
  contactPhone: '021-88776655',
  createdAt: '2026-01-10T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z'
} as any;

const DEV_RFQS: ProjectRFQ[] = [
  {
    id: 'rfq-dev-01',
    rfqCode: 'RFQ-HSE-001042',
    projectId: 'prj-dev-01',
    createdByUserId: 'user-cust-01',
    status: 'OPEN',
    title: 'احداث نیروگاه خورشیدی ۱۰۰ کیلوواتی سقف سوله صنعتی اشتهارد',
    description: 'استعلام احداث کامل نیروگاه خورشیدی فتوولتائیک متصل به شبکه بر روی سقف سوله صنعتی با کاربری تولید قطعات در شهرک صنعتی اشتهارد.',
    scope: 'FULL_EPC',
    submissionDeadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    currency: 'IRR',
    visibility: 'VERIFIED_EPCS',
    technicalRequirements: [
      'پنل‌های مونوکریستال هالف‌سل با راندمان حداقل ۲۱٪',
      'اینورترهای خورشیدی استرینگ با استاندارد اتصال به شبکه توانیر',
      'استراکچر آلومینیومی آنودایز شده مقاوم در برابر باد ۱۲۰ کیلومتر'
    ],
    commercialRequirements: [
      'ارائه ضمانت‌نامه حسن انجام تعهدات بانکی',
      'بیمه مسئولیت مدنی تمام‌خطر نصب',
      'حداقل دوره گارانتی جامع ۵ سال'
    ],
    requiredDocuments: ['پروپوزال فنی شبیه‌سازی تابش PVSyst', 'جدول تفکیک قیمت تجهیزات و نصب BOM', 'گواهی صلاحیت پیمانکاری'],
    commercialTerms: {
      minWarrantyYears: 5,
      preferredWarrantyYears: 7,
      maxExecutionDays: 60
    },
    createdAt: '2026-03-15T08:00:00Z'
  },
  {
    id: 'rfq-dev-02',
    rfqCode: 'RFQ-HSE-001043',
    projectId: 'prj-dev-02',
    createdByUserId: 'user-cust-02',
    status: 'OPEN',
    title: 'احداث سامانه فتوولتائیک ۶۰ کیلووات متصل به شبکه کارخانه مواد غذایی صفادشت',
    description: 'تامین و اجرای سامانه ۶۰ کیلووات زمینی با شیب بهینه جهت تزریق برق به شبکه عمومی ماده ۱۶.',
    scope: 'FULL_EPC',
    submissionDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    currency: 'IRR',
    visibility: 'VERIFIED_EPCS',
    technicalRequirements: ['پنل‌های دارای استاندارد IEC 61215', 'اینورتر اروپایی یا برتر آسیایی'],
    commercialRequirements: ['پرداخت اقساطی متناسب با پیشرفت فیزیکی'],
    requiredDocuments: ['نقشه لی‌اوت', 'جدول زمان‌بندی اجرای پروژه'],
    commercialTerms: {
      minWarrantyYears: 3,
      preferredWarrantyYears: 5,
      maxExecutionDays: 45
    },
    createdAt: '2026-03-18T11:00:00Z'
  }
];

const DEV_BIDS: EPCBid[] = [
  {
    id: 'bid-dev-01',
    bidCode: 'BID-HSE-00891',
    rfqId: 'rfq-dev-01',
    projectId: 'prj-dev-01',
    epcOrganizationId: DEV_EPC_ORG.id,
    proposedPriceIRR: 3500000000,
    totalPrice: 3500000000,
    currency: 'IRR',
    guaranteedAnnualYieldMwh: 182,
    timelineDays: 50,
    warrantyYears: 5,
    status: 'UNDER_REVIEW',
    equipmentSummary: {
      panels: 'Longi Solar 550W Tier 1 Hi-MO 5',
      inverters: 'Sungrow SG110CX Multi-MPPT'
    },
    equipmentSpecs: {
      panelBrand: 'Longi Solar 550W Tier 1 Hi-MO 5',
      inverterBrand: 'Sungrow SG110CX Multi-MPPT',
      rackingType: 'سازه گالوانیزه گرم با پیچ‌های استیل A2',
      monitoringIncluded: true
    },
    createdAt: '2026-03-20T14:00:00Z',
    submittedAt: '2026-03-20T14:30:00Z'
  },
  {
    id: 'bid-dev-02',
    bidCode: 'BID-HSE-00845',
    rfqId: 'rfq-dev-legacy-01',
    projectId: 'prj-dev-legacy-01',
    epcOrganizationId: DEV_EPC_ORG.id,
    proposedPriceIRR: 2100000000,
    totalPrice: 2100000000,
    currency: 'IRR',
    guaranteedAnnualYieldMwh: 105,
    timelineDays: 40,
    warrantyYears: 7,
    status: 'ACCEPTED',
    equipmentSummary: {
      panels: 'JA Solar 545W DeepBlue 3.0',
      inverters: 'Huawei SUN2000-50KTL'
    },
    equipmentSpecs: {
      panelBrand: 'JA Solar 545W DeepBlue 3.0',
      inverterBrand: 'Huawei SUN2000-50KTL',
      rackingType: 'آلومینیوم اکسترود شده آلیاژ ۶۰۰۵',
      monitoringIncluded: true
    },
    createdAt: '2026-02-10T09:00:00Z',
    submittedAt: '2026-02-10T11:00:00Z'
  },
  {
    id: 'bid-dev-03',
    bidCode: 'BID-HSE-00780',
    rfqId: 'rfq-dev-legacy-02',
    projectId: 'prj-dev-legacy-02',
    epcOrganizationId: DEV_EPC_ORG.id,
    proposedPriceIRR: 4200000000,
    totalPrice: 4200000000,
    currency: 'IRR',
    guaranteedAnnualYieldMwh: 210,
    timelineDays: 70,
    warrantyYears: 5,
    status: 'SHORTLISTED',
    equipmentSummary: {
      panels: 'Trina Solar Vertex 670W',
      inverters: 'SMA Sunny Tripower CORE2'
    },
    createdAt: '2026-01-22T10:00:00Z',
    submittedAt: '2026-01-22T12:00:00Z'
  }
] as any;

const DEV_PROJECTS: EnergyProject[] = [
  {
    id: 'prj-dev-legacy-01',
    code: 'PRJ-HSE-000412',
    title: 'نیروگاه خورشیدی ۵۰ کیلووات سردخانه آریا',
    clientName: 'شرکت صنایع برودتی آریا',
    capacityKw: 50,
    status: 'INSTALLATION',
    city: 'قزوین',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-03-25T14:00:00Z',
    currentStage: 'نصب سازه و کابل‌کشی DC',
    assignedContractorId: DEV_EPC_ORG.id
  } as any
];

// Vendor Fixtures
const DEV_VENDOR_INFO = {
  companyName: 'شرکت نیرو گستران پارس (تأمین تجهیزات خورشیدی)',
  city: 'تهران',
  phone: '021-33112233',
  productsCount: 4,
  profileCompleteness: 90
};

const DEV_VENDOR_ADS = [
  {
    id: 'ad-dev-01',
    title: 'بنر رسمی پنل‌های خورشیدی JA Solar ۵۵۰ وات با گارانتی ۱۲ ساله',
    planId: 'PLAN-GOLD-HOMEPAGE',
    paymentStatus: 'paid',
    status: 'active',
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2026-04-01T00:00:00Z'
  },
  {
    id: 'ad-dev-02',
    title: 'کمپین تخفیف اینورترهای متصل به شبکه Growatt',
    planId: 'PLAN-SILVER-DASHBOARD',
    paymentStatus: 'paid',
    status: 'pending_review',
    startDate: '2026-03-25T00:00:00Z',
    endDate: '2026-04-25T00:00:00Z'
  }
];

const DEV_VENDOR_INVITATIONS = [
  {
    id: 'inv-dev-01',
    title: 'استعلام تأمین ۱۸۰ عدد پنل مونوکریستال ۵۵۰ وات نیروگاه اشتهارد',
    requesterName: 'شرکت مهندسی البرز سولار EPC',
    deadline: new Date(Date.now() + 5 * 86400000).toISOString()
  },
  {
    id: 'inv-dev-02',
    title: 'استعلام قیمت ۳ دستگاه اینورتر ۵۰ کیلووات استرینگ صنعتی',
    requesterName: 'مهندسین مشاور تابان انرژی',
    deadline: new Date(Date.now() + 9 * 86400000).toISOString()
  }
];

const DEV_VENDOR_POS = [
  {
    id: 'po-dev-01',
    orderNumber: 'PO-HSE-2026-0045',
    buyerName: 'شرکت توسعه پاک‌انرژی خاورمیانه',
    totalAmountIRR: 980000000,
    status: 'CONFIRMED'
  }
];

export default function PartnerExperiencePreview() {
  // Fail-closed guard for production
  if (!import.meta.env.DEV) {
    return <Navigate to="/" replace />;
  }

  // Preview States
  const [partnerRole, setPartnerRole] = useState<'EPC' | 'VENDOR'>('EPC');
  const [viewportMode, setViewportMode] = useState<'responsive' | '430' | '390' | '375' | '360' | '320'>('responsive');

  // EPC Scenarios: 1. Active Opportunities, 2. Submitted Bids, 3. Awarded Project, 4. Empty State
  const [epcScenario, setEpcScenario] = useState<'ACTIVE_OPPORTUNITIES' | 'SUBMITTED_BIDS' | 'AWARDED_PROJECT' | 'EMPTY_STATE'>('ACTIVE_OPPORTUNITIES');

  // Vendor Scenarios: 5. Products Available, 6. No Products, 7. Inquiry Available, 8. No Inquiries
  const [vendorScenario, setVendorScenario] = useState<'PRODUCTS_AVAILABLE' | 'NO_PRODUCTS' | 'INQUIRY_AVAILABLE' | 'NO_INQUIRIES'>('PRODUCTS_AVAILABLE');
  const [vendorView, setVendorView] = useState<'dashboard' | 'products' | 'profile' | 'subscription'>('dashboard');
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);

  const getContainerWidthClass = () => {
    switch (viewportMode) {
      case '320':
        return 'max-w-[320px] mx-auto border-x border-slate-300 dark:border-zinc-700 shadow-2xl bg-white dark:bg-zinc-950 min-h-screen';
      case '360':
        return 'max-w-[360px] mx-auto border-x border-slate-300 dark:border-zinc-700 shadow-2xl bg-white dark:bg-zinc-950 min-h-screen';
      case '375':
        return 'max-w-[375px] mx-auto border-x border-slate-300 dark:border-zinc-700 shadow-2xl bg-white dark:bg-zinc-950 min-h-screen';
      case '390':
        return 'max-w-[390px] mx-auto border-x border-slate-300 dark:border-zinc-700 shadow-2xl bg-white dark:bg-zinc-950 min-h-screen';
      case '430':
        return 'max-w-[430px] mx-auto border-x border-slate-300 dark:border-zinc-700 shadow-2xl bg-white dark:bg-zinc-950 min-h-screen';
      default:
        return 'w-full';
    }
  };

  // Derive EPC data based on selected scenario
  const getEpcProps = () => {
    switch (epcScenario) {
      case 'EMPTY_STATE':
        return {
          initialRfqs: [],
          initialBids: [],
          initialProjects: [],
          initialOrgs: [DEV_EPC_ORG],
          initialActiveTab: 'rfqs' as const
        };
      case 'SUBMITTED_BIDS':
        return {
          initialRfqs: DEV_RFQS,
          initialBids: DEV_BIDS,
          initialProjects: DEV_PROJECTS,
          initialOrgs: [DEV_EPC_ORG],
          initialActiveTab: 'my_bids' as const
        };
      case 'AWARDED_PROJECT':
        return {
          initialRfqs: DEV_RFQS,
          initialBids: DEV_BIDS,
          initialProjects: DEV_PROJECTS,
          initialOrgs: [DEV_EPC_ORG],
          initialActiveTab: 'awarded' as const
        };
      case 'ACTIVE_OPPORTUNITIES':
      default:
        return {
          initialRfqs: DEV_RFQS,
          initialBids: DEV_BIDS,
          initialProjects: DEV_PROJECTS,
          initialOrgs: [DEV_EPC_ORG],
          initialActiveTab: 'rfqs' as const
        };
    }
  };

  // Derive Vendor data based on selected scenario
  const getVendorProps = () => {
    const baseVendor = { ...DEV_VENDOR_INFO };
    let initialAds = DEV_VENDOR_ADS;
    let initialInvitations = DEV_VENDOR_INVITATIONS;
    let initialPOs = DEV_VENDOR_POS;
    let initialProducts = undefined;

    if (vendorScenario === 'NO_PRODUCTS') {
      baseVendor.productsCount = 0;
      initialProducts = [];
    } else if (vendorScenario === 'NO_INQUIRIES') {
      initialInvitations = [];
      initialPOs = [];
    } else if (vendorScenario === 'INQUIRY_AVAILABLE') {
      initialInvitations = DEV_VENDOR_INVITATIONS;
    }

    return {
      initialVendor: baseVendor,
      initialAds,
      initialInvitations,
      initialPOs,
      initialProducts
    };
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 font-sans text-slate-800 dark:text-slate-100 pb-20" dir="rtl">
      
      {/* ========================================================================= */}
      {/* DEV CONTROL TOOLBAR (COLLAPSIBLE FOR MOBILE QA)                           */}
      {/* ========================================================================= */}
      <aside 
        aria-label="نوار ابزار پیش‌نمایش تجربه همکاران مرحله ۱۳.۶"
        className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 shadow-md text-xs"
      >
        {/* Compact Collapsible Header */}
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-bold">
              STAGE 13.6 QA
            </span>
            <span className="text-slate-200 text-xs font-bold">
              {partnerRole === 'EPC' ? 'ورک‌اسپیس EPC' : 'ورک‌اسپیس تأمین‌کننده'}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              ({viewportMode === 'responsive' ? 'کامل' : `${viewportMode}px`})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsToolbarExpanded(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 min-h-[44px] min-w-[44px] transition-colors cursor-pointer"
            aria-expanded={isToolbarExpanded}
            aria-label={isToolbarExpanded ? 'بستن کنترل‌های QA' : 'گسترش کنترل‌های QA'}
          >
            <span>{isToolbarExpanded ? 'بستن ابزار QA' : 'تنظیمات و سناریوهای QA'}</span>
            {isToolbarExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Collapsible Panel with all QA Controls */}
        {isToolbarExpanded && (
          <div className="border-t border-slate-800 bg-slate-900/95">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand & Role Selection */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
              STAGE 13.6 QA
            </span>
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPartnerRole('EPC')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors min-h-[36px] cursor-pointer ${
                  partnerRole === 'EPC' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 size={15} />
                <span>پیمانکار EPC</span>
              </button>
              <button
                type="button"
                onClick={() => setPartnerRole('VENDOR')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors min-h-[36px] cursor-pointer ${
                  partnerRole === 'VENDOR' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store size={15} />
                <span>تأمین‌کننده (Vendor)</span>
              </button>
            </div>
          </div>

          {/* Viewport Width Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-[11px]">
              <span className="px-2 text-slate-400 text-[10px]">عرض:</span>
              <button
                type="button"
                onClick={() => setViewportMode('responsive')}
                className={`px-2 py-1 rounded font-bold transition-colors ${viewportMode === 'responsive' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                کامل
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('430')}
                className={`px-2 py-1 rounded font-bold transition-colors ${viewportMode === '430' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                430px
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('390')}
                className={`px-2 py-1 rounded font-bold transition-colors ${viewportMode === '390' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                390px
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('375')}
                className={`px-2 py-1 rounded font-bold transition-colors ${viewportMode === '375' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                375px
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('360')}
                className={`px-2 py-1 rounded font-bold transition-colors ${viewportMode === '360' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                360px
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('320')}
                className={`px-2 py-1 rounded font-bold transition-colors ${viewportMode === '320' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                320px
              </button>
            </div>

            {/* Scenario Selection for EPC */}
            {partnerRole === 'EPC' && (
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setEpcScenario('ACTIVE_OPPORTUNITIES')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${epcScenario === 'ACTIVE_OPPORTUNITIES' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ۱. فرصت‌های فعال
                </button>
                <button
                  type="button"
                  onClick={() => setEpcScenario('SUBMITTED_BIDS')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${epcScenario === 'SUBMITTED_BIDS' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ۲. پیشنهادهای من
                </button>
                <button
                  type="button"
                  onClick={() => setEpcScenario('AWARDED_PROJECT')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${epcScenario === 'AWARDED_PROJECT' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ۳. پروژه واگذارشده
                </button>
                <button
                  type="button"
                  onClick={() => setEpcScenario('EMPTY_STATE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${epcScenario === 'EMPTY_STATE' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ۴. حالت خالی
                </button>
              </div>
            )}

            {/* Scenario Selection for Vendor */}
            {partnerRole === 'VENDOR' && (
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setVendorScenario('PRODUCTS_AVAILABLE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${vendorScenario === 'PRODUCTS_AVAILABLE' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ۵. کاتالوگ فعال
                </button>
                <button
                  type="button"
                  onClick={() => setVendorScenario('NO_PRODUCTS')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${vendorScenario === 'NO_PRODUCTS' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ۶. بدون محصول
                </button>
                <button
                  type="button"
                  onClick={() => setVendorScenario('INQUIRY_AVAILABLE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${vendorScenario === 'INQUIRY_AVAILABLE' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ۷. استعلام دریافتی
                </button>
                <button
                  type="button"
                  onClick={() => setVendorScenario('NO_INQUIRIES')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${vendorScenario === 'NO_INQUIRIES' ? 'bg-[#0284C7] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ۸. بدون استعلام
                </button>
              </div>
            )}
          </div>
        </div>

            {/* Vendor Sub-view selector when role === 'VENDOR' */}
            {partnerRole === 'VENDOR' && (
              <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-slate-400">بخش پرتال تأمین‌کننده:</span>
                <button
                  type="button"
                  onClick={() => setVendorView('dashboard')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${vendorView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                >
                  داشبورد و استعلام‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setVendorView('products')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${vendorView === 'products' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                >
                  مدیریت محصولات
                </button>
                <button
                  type="button"
                  onClick={() => setVendorView('profile')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${vendorView === 'profile' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                >
                  پروفایل شرکت
                </button>
                <button
                  type="button"
                  onClick={() => setVendorView('subscription')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${vendorView === 'subscription' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                >
                  اشتراک و مالی
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* WORKSPACE PREVIEW CONTAINER                                              */}
      {/* ========================================================================= */}
      <div className={getContainerWidthClass()}>
        
        {/* DEV FIXTURE ISOLATION BANNER */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-amber-600 shrink-0" />
            <span>
              <strong>داده‌های نمونه غیرتخریبی (DEV Fixtures):</strong> تغییرات اعمال‌شده در این محیط صرفاً در حافظه رندر شده و هیچ تغییری در دیتابیس یا سرور پروداکشن ایجاد نمی‌کند.
            </span>
          </div>
          <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">
            previewMode=true
          </span>
        </div>

        {/* ROLE 1: EPC CONTRACTOR WORKSPACE */}
        {partnerRole === 'EPC' && (
          <ContractorDashboard 
            previewMode={true}
            {...getEpcProps()}
          />
        )}

        {/* ROLE 2: VENDOR WORKSPACE */}
        {partnerRole === 'VENDOR' && (
          <div className="p-4 sm:p-6 lg:p-8">
            {vendorView === 'dashboard' && (
              <Dashboard 
                previewMode={true}
                {...getVendorProps()}
              />
            )}
            {vendorView === 'products' && (
              <ProductManagement 
                previewMode={true}
                initialProducts={getVendorProps().initialProducts}
              />
            )}
            {vendorView === 'profile' && (
              <ProfileEdit previewMode={true} />
            )}
            {vendorView === 'subscription' && (
              <Subscription />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
