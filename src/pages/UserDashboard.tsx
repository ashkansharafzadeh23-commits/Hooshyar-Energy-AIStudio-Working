import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Briefcase, Clock, FileText, Plus, Search, Filter, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EnergyProject } from '../types/project';
import { EnergyAsset } from '../types/asset';
import { PageContainer } from '../components/common/PageContainer';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  DashboardHeader,
  AttentionCenter,
  NextActions,
  ActiveProjects,
  OperationalAssets,
  RoleSummary,
  RecentActivity,
  NewUserOnboarding,
  DashboardAttentionItem,
  DashboardNextAction,
  DashboardMetric,
  DashboardActivityItem
} from '../components/dashboard';
import { getProjectPhase, getNextRecommendedAction } from '../components/projects/lifecycleMapping';
import { formatSolarCapacity, formatCurrencyIRR, toPersianDigits, formatPersianNumber } from '../utils/formatters';

export default function UserDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole, activeOrganization, token } = useAuth();

  // URL parameters and tabs for backwards compatibility
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedTab = searchParams.get('tab');
  
  // Determine if on explicit projects route (/projects) or legacy tab
  const isProjectsRoute = location.pathname === '/projects' || requestedTab === 'projects';
  const isHistoryTab = requestedTab === 'history';
  const isRequestsTab = requestedTab === 'requests';

  const [projects, setProjects] = useState<EnergyProject[]>([]);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [activities, setActivities] = useState<DashboardActivityItem[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Projects list filter/search state when viewing all projects
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL');

  // Fetch projects and assets from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const authToken = token || localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    };

    try {
      // 1. Fetch user projects
      const prjRes = await fetch('/api/projects', { headers });
      let prjData: EnergyProject[] = [];
      if (prjRes.ok) {
        prjData = await prjRes.json();
        setProjects(Array.isArray(prjData) ? prjData : []);
      }

      // 2. Fetch user / approved solar assets
      const assetRes = await fetch('/api/assets', { headers });
      if (assetRes.ok) {
        const assetData = await assetRes.json();
        setAssets(Array.isArray(assetData) ? assetData : []);
      }

      // 3. Fetch activities for user's projects (aggregate recent ones)
      if (Array.isArray(prjData) && prjData.length > 0) {
        const recentProjects = prjData.slice(0, 5);
        const activityPromises = recentProjects.map(async (p) => {
          try {
            const actRes = await fetch(`/api/projects/${p.id}/activity`, { headers });
            if (actRes.ok) {
              const acts = await actRes.json();
              return (Array.isArray(acts) ? acts : []).map((a: any) => ({
                id: a.id,
                title: a.description || a.eventType || 'رویداد پروژه',
                description: a.eventType ? `نوع: ${a.eventType}` : undefined,
                timestamp: a.createdAt,
                projectName: p.title
              }));
            }
          } catch {
            return [];
          }
          return [];
        });

        const activityResults = await Promise.all(activityPromises);
        const flatActivities = activityResults.flat().sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setActivities(flatActivities.slice(0, 6));
      }

      // 4. Load localStorage data for legacy requests and history
      try {
        const storedReqs = localStorage.getItem('epc_requests');
        if (storedReqs) {
          const loaded = JSON.parse(storedReqs);
          if (Array.isArray(loaded)) {
            // For authenticated users, legacy records must only be shown when explicitly associated with the authenticated user.
            // If ownership cannot be verified, omit the record. Never fall back to unverified demo identifiers.
            setRequests(loaded.filter((r: any) => Boolean(user?.id && r.userId && r.userId === user.id)));
          }
        }
      } catch {
        // Safe fallback
      }

      try {
        const storedHistory = localStorage.getItem('analysis_history');
        if (storedHistory) {
          const loaded = JSON.parse(storedHistory);
          if (Array.isArray(loaded)) {
            setAnalysisHistory(loaded);
          }
        }
      } catch {
        // Safe fallback
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('خطا در دریافت اطلاعات پیشخوان. لطفاً اتصال شبکه را بررسی نمایید.');
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert analysis to project handler (for history tab compatibility)
  const handleConvertAnalysis = async (analysisId: string) => {
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(`/api/projects/from-analysis/${analysisId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });
      if (res.ok) {
        const project = await res.json();
        navigate(`/projects/${project.id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در تبدیل تحلیل به پروژه');
      }
    } catch {
      alert('خطا در برقراری ارتباط با سرور');
    }
  };

  // -------------------------------------------------------------
  // REAL DATA DERIVATION FOR UI-3 DASHBOARD SECTIONS
  // -------------------------------------------------------------

  // 1. Attention Items: strictly real actionable conditions
  const attentionItems = useMemo<DashboardAttentionItem[]>(() => {
    const items: DashboardAttentionItem[] = [];

    // Projects conditions
    projects.forEach((p) => {
      // Incomplete technical inputs
      if (!p.site?.areaM2 || !p.targetCapacityKw) {
        items.push({
          id: `missing-specs-${p.id}`,
          title: 'اطلاعات فنی یا مساحت سایت تکمیل نشده است',
          description: `پروژه «${p.title}» برای محاسبات دقیق مهندسی نیازمند تکمیل مساحت و ظرفیت هدف است.`,
          severity: 'WARNING',
          category: 'PROJECT',
          actionLabel: 'تکمیل مشخصات',
          actionHref: `/projects/${p.id}?tab=process`,
          badgeText: p.projectCode
        });
      }

      // Ready for RFQ
      if (p.status === 'READY_FOR_RFQ') {
        items.push({
          id: `ready-rfq-${p.id}`,
          title: 'پروژه آماده انتشار استعلام قیمت (RFQ) است',
          description: `اسناد فنی و مدارک پروژه «${p.title}» آماده انتشار و ارسال به پیمانکاران EPC است.`,
          severity: 'URGENT',
          category: 'RFQ',
          actionLabel: 'انتشار استعلام',
          actionHref: `/projects/${p.id}?tab=process`,
          badgeText: 'RFQ'
        });
      }

      // Bids Received
      if (p.status === 'BIDS_RECEIVED') {
        items.push({
          id: `bids-received-${p.id}`,
          title: 'پیشنهادهای جدید پیمانکاران در انتظار بررسی است',
          description: `پیشنهادهای ارسال‌شده برای پروژه «${p.title}» نیازمند ارزیابی فنی و مالی است.`,
          severity: 'URGENT',
          category: 'RFQ',
          actionLabel: 'ارزیابی پیشنهادها',
          actionHref: `/projects/${p.id}?tab=process`,
          badgeText: 'پیشنهادها'
        });
      }

      // Contracting
      if (p.status === 'CONTRACTING') {
        items.push({
          id: `contracting-${p.id}`,
          title: 'قرارداد احداث در مرحله نهایی‌سازی و امضا است',
          description: `پیش‌نویس قرارداد احداث پروژه «${p.title}» در انتظار نهایی‌سازی و تبادل تضامین است.`,
          severity: 'URGENT',
          category: 'CONTRACT',
          actionLabel: 'مشاهده قرارداد',
          actionHref: `/projects/${p.id}?tab=process`,
          badgeText: 'قرارداد'
        });
      }

      // Financing
      if (p.status === 'FINANCING') {
        items.push({
          id: `financing-${p.id}`,
          title: 'تأمین مالی نیازمند ارزیابی و تکمیل است',
          description: `پرونده تسهیلات مالی پروژه «${p.title}» نیازمند بررسی و تأیید مستندات اعتباری است.`,
          severity: 'INFO',
          category: 'FINANCE',
          actionLabel: 'بررسی تسهیلات',
          actionHref: `/projects/${p.id}?tab=process`,
          badgeText: 'تسهیلات'
        });
      }
    });

    // Assets conditions
    assets.forEach((a) => {
      // Under maintenance
      if (a.operationalStatus === 'UNDER_MAINTENANCE' || a.status === 'UNDER_MAINTENANCE') {
        items.push({
          id: `asset-maint-${a.id}`,
          title: 'نیروگاه در وضعیت نگهداری و تعمیرات فعال است',
          description: `نیروگاه «${a.name}» هم‌اکنون تحت فرآیند سرویس، شست‌وشو یا تعمیرات است.`,
          severity: 'WARNING',
          category: 'MAINTENANCE',
          actionLabel: 'سوابق نگهداری',
          actionHref: `/solar-assets/${a.id}`,
          badgeText: a.assetCode
        });
      }

      // Telemetry not connected
      if (a.operationalStatus === 'OPERATIONAL' && a.source !== 'TELEMETRY_CONNECTED') {
        items.push({
          id: `asset-telemetry-${a.id}`,
          title: 'پایش برخط متصل نیست',
          description: `درگاه تله‌متری برخط نیروگاه «${a.name}» متصل نشده و دریافت داده‌های توان نیازمند اتصال است.`,
          severity: 'INFO',
          category: 'ASSET',
          actionLabel: 'تنظیم درگاه پایش',
          actionHref: `/solar-assets/${a.id}`,
          badgeText: 'نامتصل'
        });
      }
    });

    return items;
  }, [projects, assets]);

  // 2. Next Actions: deterministic lifecycle recommendations
  const nextActions = useMemo<DashboardNextAction[]>(() => {
    // Sort projects by urgency / active status
    const activeProjects = projects.filter(p => p.status !== 'CANCELLED');
    
    if (activeProjects.length > 0) {
      return activeProjects.slice(0, 3).map((p) => {
        const { phase } = getProjectPhase(p.status);
        const rec = getNextRecommendedAction(p);
        return {
          id: `action-${p.id}`,
          projectOrAssetName: p.title,
          title: rec.title,
          reason: rec.description,
          actionText: rec.actionText,
          actionHref: `/projects/${p.id}`,
          phaseTitle: phase ? `گام ${phase.index}: ${phase.title}` : undefined,
          isPrimary: true
        };
      });
    }

    // Role-specific deterministic fallback when no projects exist
    const role = (activeRole || '').toUpperCase();
    if (role === 'INVESTOR') {
      return [{
        id: 'investor-next',
        projectOrAssetName: 'هاب سرمایه‌گذاری',
        title: 'بررسی فرصت‌های سرمایه‌گذاری فعال',
        reason: 'پروژه‌های آماده جذب سرمایه با تحلیل بازدهی و مدل جریان نقدی',
        actionText: 'مشاهده فرصت‌ها',
        actionHref: '/investment-hub/opportunities',
        isPrimary: true
      }];
    }

    if (role === 'EPC' || role === 'EPC_CONTRACTOR') {
      return [{
        id: 'epc-next',
        projectOrAssetName: 'استعلام‌های احداث',
        title: 'بررسی استعلام‌های قیمت (RFQ) جدید',
        reason: 'استعلام‌های منتشر شده توسط کارفرمایان جهت ارسال پیشنهاد قیمت',
        actionText: 'مشاهده استعلام‌ها',
        actionHref: '/contractors',
        isPrimary: true
      }];
    }

    if (role === 'TECHNICIAN') {
      return [{
        id: 'tech-next',
        projectOrAssetName: 'پایش و عیب‌یابی',
        title: 'ورود به سامانه نگهداری هوشمند',
        reason: 'بررسی هشدارهای فعال، تجهیزات و ثبت گزارش‌های بازدید میدانی',
        actionText: 'نگهداری هوشمند',
        actionHref: '/smart-maintenance',
        isPrimary: true
      }];
    }

    if (role === 'VENDOR' || role === 'SUPPLIER') {
      return [{
        id: 'vendor-next',
        projectOrAssetName: 'پرتال تأمین‌کنندگان',
        title: 'مدیریت تجهیزات و استعلام‌های خرید',
        reason: 'بررسی درخواست‌های استعلام کالا و به‌روزرسانی کاتالوگ تجهیزات نیروگاهی',
        actionText: 'پرتال تأمین‌کنندگان',
        actionHref: '/vendor-portal',
        isPrimary: true
      }];
    }

    return [{
      id: 'owner-next',
      projectOrAssetName: 'پروژه جدید',
      title: 'شروع تحلیل هوشمند انرژی خورشیدی',
      reason: 'شبیه‌سازی تابش، متراژ ساختگاه و برآورد ظرفیت نیروگاه خورشیدی',
      actionText: 'محاسبه پتانسیل خورشیدی',
      actionHref: '/target-select',
      isPrimary: true
    }];
  }, [projects, activeRole]);

  // 3. Role Summary Metrics: maximum 4 metrics strictly derived from real data
  const roleMetrics = useMemo<DashboardMetric[]>(() => {
    const role = (activeRole || '').toUpperCase();

    switch (role) {
      case 'INVESTOR': {
        const matchingProjects = projects.filter(p => ['FEASIBILITY', 'READY_FOR_RFQ', 'CONTRACTING'].includes(p.status));
        return [
          {
            id: 'active-projects-inv',
            label: 'پروژه‌های واجد شرایط سرمایه‌گذاری',
            value: formatPersianNumber(matchingProjects.length),
            provenance: 'REAL',
            subtext: 'پروژه‌های دارای مدل مالی'
          },
          {
            id: 'operational-assets-inv',
            label: 'نیروگاه‌های در حال بهره‌برداری',
            value: formatPersianNumber(assets.length),
            provenance: 'REAL',
            subtext: 'دارایی‌های متصل یا ثبت‌شده'
          }
        ];
      }

      case 'EPC':
      case 'EPC_CONTRACTOR': {
        const epcProjects = projects.filter(p => ['RFQ_OPEN', 'BIDS_RECEIVED', 'EPC_SELECTED', 'CONTRACTING', 'CONSTRUCTION'].includes(p.status));
        const constructionProjects = projects.filter(p => p.status === 'CONSTRUCTION');
        const constructionCapKw = constructionProjects.reduce((acc, p) => acc + (p.targetCapacityKw || 0), 0);

        const list: DashboardMetric[] = [
          {
            id: 'epc-active',
            label: 'پروژه‌های مرتبط یا در مرحله مناقصه',
            value: formatPersianNumber(epcProjects.length),
            provenance: 'REAL',
            subtext: 'استعلام‌ها و قراردادها'
          }
        ];

        if (constructionCapKw > 0) {
          list.push({
            id: 'epc-capacity',
            label: 'مجموع ظرفیت در حال احداث',
            value: formatSolarCapacity(constructionCapKw),
            provenance: 'CALCULATED',
            subtext: 'بر مبنای ظرفیت هدف ثبت‌شده'
          });
        }

        return list;
      }

      case 'TECHNICIAN': {
        const reportingAssets = assets.filter(a => a.source === 'TELEMETRY_CONNECTED');
        const maintAssets = assets.filter(a => a.operationalStatus === 'UNDER_MAINTENANCE' || a.status === 'UNDER_MAINTENANCE');

        return [
          {
            id: 'tech-assets',
            label: 'نیروگاه‌های تحت نظارت فنی',
            value: formatPersianNumber(assets.length),
            provenance: 'REAL',
            subtext: 'شناسنامه‌های دارایی فعال'
          },
          {
            id: 'tech-reporting',
            label: 'سامانه‌های متصل به پایش',
            value: formatPersianNumber(reportingAssets.length),
            provenance: 'REAL',
            subtext: 'درگاه‌های تله‌متری برقرار'
          },
          {
            id: 'tech-maint',
            label: 'پرونده‌های فعال نگهداری',
            value: formatPersianNumber(maintAssets.length),
            provenance: 'REAL',
            subtext: 'سرویس‌های در حال انجام'
          }
        ];
      }

      case 'FINANCE':
      case 'FINANCIAL_PARTNER': {
        const financingProjects = projects.filter(p => p.status === 'FINANCING' || p.status === 'CONTRACTING');
        const totalBudget = financingProjects.reduce((acc, p) => acc + (p.estimatedBudgetIRR || 0), 0);

        const list: DashboardMetric[] = [
          {
            id: 'fin-projects',
            label: 'پرونده‌های متقاضی تسهیلات',
            value: formatPersianNumber(financingProjects.length),
            provenance: 'REAL',
            subtext: 'در مرحله تأمین و قرارداد'
          }
        ];

        if (totalBudget > 0) {
          list.push({
            id: 'fin-volume',
            label: 'حجم تسهیلات مورد نیاز',
            value: formatCurrencyIRR(totalBudget),
            provenance: 'CALCULATED',
            subtext: 'برآورد مالی اظهار شده'
          });
        }

        return list;
      }

      case 'ADMIN':
      case 'SUPER_ADMIN': {
        const totalCapKw = projects.reduce((acc, p) => acc + (p.targetCapacityKw || 0), 0);
        return [
          {
            id: 'adm-projects',
            label: 'کل پروژه‌های ثبت‌شده',
            value: formatPersianNumber(projects.length),
            provenance: 'REAL',
            subtext: 'در تمامی فازهای چرخه عمر'
          },
          {
            id: 'adm-capacity',
            label: 'مجموع توان برنامه‌ریزی‌شده',
            value: totalCapKw > 0 ? formatSolarCapacity(totalCapKw) : '—',
            provenance: totalCapKw > 0 ? 'CALCULATED' : 'MISSING',
            subtext: 'مجموع توان نامی پروژه‌ها'
          },
          {
            id: 'adm-assets',
            label: 'دارایی‌های دیجیتال انرژی',
            value: formatPersianNumber(assets.length),
            provenance: 'REAL',
            subtext: 'نیروگاه‌های دارای شناسنامه'
          }
        ];
      }

      case 'VENDOR':
      case 'SUPPLIER': {
        // Vendor dashboard summary must contain ONLY metrics that can be derived
        // from real authenticated vendor/procurement data already available.
        // Because verified vendor/procurement metrics (e.g. quotation requests,
        // purchase orders, delivery milestones) are not currently fetched in this view,
        // we strictly return an empty array so RoleSummary safely renders nothing (no fake zeros).
        return [];
      }

      case 'PROJECT_OWNER':
      case 'CUSTOMER':
      case 'OWNER':
      default: {
        const activeProjectsCount = projects.filter(p => p.status !== 'CANCELLED').length;
        const totalPlannedCapKw = projects.reduce((acc, p) => acc + (p.targetCapacityKw || 0), 0);
        const totalBudget = projects.reduce((acc, p) => acc + (p.estimatedBudgetIRR || 0), 0);

        const list: DashboardMetric[] = [
          {
            id: 'owner-projects',
            label: 'پروژه‌های فعال',
            value: formatPersianNumber(activeProjectsCount),
            provenance: 'REAL',
            subtext: 'پروژه‌های در حال توسعه'
          }
        ];

        if (totalPlannedCapKw > 0) {
          list.push({
            id: 'owner-capacity',
            label: 'مجموع ظرفیت هدف',
            value: formatSolarCapacity(totalPlannedCapKw),
            provenance: 'CALCULATED',
            subtext: 'مجموع توان نامی پروژه‌ها'
          });
        }

        if (totalBudget > 0) {
          list.push({
            id: 'owner-budget',
            label: 'برآورد مالی کل',
            value: formatCurrencyIRR(totalBudget),
            provenance: 'CALCULATED',
            subtext: 'برآورد بودجه مورد نیاز احداث'
          });
        }

        if (assets.length > 0) {
          list.push({
            id: 'owner-assets',
            label: 'نیروگاه‌های به بهره‌برداری رسیده',
            value: formatPersianNumber(assets.length),
            provenance: 'REAL',
            subtext: 'دارایی‌های فعال در پایش'
          });
        }

        return list;
      }
    }
  }, [projects, assets, activeRole]);

  // Filtered projects for the "All Projects" view
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = projectSearchQuery === '' ||
        p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
        (p.projectCode && p.projectCode.toLowerCase().includes(projectSearchQuery.toLowerCase())) ||
        (p.location?.city && p.location.city.includes(projectSearchQuery)) ||
        (p.location?.province && p.location.province.includes(projectSearchQuery));

      const matchesStatus = projectStatusFilter === 'ALL' || p.status === projectStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, projectSearchQuery, projectStatusFilter]);

  // Render loading state
  if (loading) {
    return (
      <PageContainer maxWidth="wide">
        <LoadingState message="در حال بارگذاری اطلاعات پیشخوان هوشیار انرژی..." />
      </PageContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <PageContainer maxWidth="wide">
        <ErrorState
          title="عدم موفقیت در دریافت اطلاعات"
          message={error}
          onRetry={fetchData}
        />
      </PageContainer>
    );
  }

  // -------------------------------------------------------------
  // VIEW 1: FULL ALL PROJECTS VIEW (/projects or ?tab=projects)
  // -------------------------------------------------------------
  if (isProjectsRoute) {
    return (
      <PageContainer maxWidth="wide" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <ArrowRight size={14} />
                <span>بازگشت به پیشخوان</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
              پروژه‌های انرژی خورشیدی من
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              مدیریت و پایش یکپارچه کلیه پروژه‌ها در گام‌های ۵ گانه چرخه عمر مهندسی
            </p>
          </div>

          <Link
            to="/target-select"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-xs min-h-[44px]"
          >
            <Plus size={18} />
            <span>پروژه جدید</span>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجو در نام، کد پروژه یا استان..."
              value={projectSearchQuery}
              onChange={(e) => setProjectSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-slate-400 hidden sm:inline" />
            <select
              value={projectStatusFilter}
              onChange={(e) => setProjectStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden min-h-[44px]"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="DRAFT">پیش‌نویس</option>
              <option value="ANALYSIS">تحلیل انرژی</option>
              <option value="FEASIBILITY">امکان‌سنجی</option>
              <option value="READY_FOR_RFQ">آماده استعلام (RFQ)</option>
              <option value="RFQ_OPEN">استعلام فعال</option>
              <option value="BIDS_RECEIVED">پیشنهادها دریافت شد</option>
              <option value="CONTRACTING">قرارداد</option>
              <option value="CONSTRUCTION">احداث و ساخت</option>
              <option value="COMMISSIONING">راه‌اندازی</option>
              <option value="OPERATIONAL">بهره‌برداری</option>
            </select>
          </div>
        </div>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="پروژه‌ای با این مشخصات یافت نشد"
            description="می‌توانید فیلترهای جستجو را پاک کنید یا یک پروژه جدید ایجاد نمایید."
            actionLabel="تحلیل و ایجاد پروژه جدید"
            actionHref="/target-select"
          />
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((p) => {
              const { phase } = getProjectPhase(p.status);
              const nextRec = getNextRecommendedAction(p);
              return (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {p.projectCode || 'HSE-IR'}
                      </span>
                      <StatusBadge status={p.status} size="sm" />
                      {phase && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800">
                          گام {phase.index}: {phase.title}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      {p.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      {p.location?.province && (
                        <span>موقعیت: {p.location.province} {p.location.city ? `(${p.location.city})` : ''}</span>
                      )}
                      {p.targetCapacityKw && (
                        <span>ظرفیت: {formatSolarCapacity(p.targetCapacityKw)}</span>
                      )}
                      {p.estimatedBudgetIRR && (
                        <span>برآورد: {formatCurrencyIRR(p.estimatedBudgetIRR)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden lg:inline max-w-[200px] truncate">
                      اقدام: {nextRec.title}
                    </span>
                    <Link
                      to={`/projects/${p.id}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 transition-colors shadow-xs min-h-[44px]"
                    >
                      <span>ورود به فضای کار</span>
                      <ArrowLeft size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageContainer>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: HISTORY TAB (Deep link compatibility: ?tab=history)
  // -------------------------------------------------------------
  if (isHistoryTab) {
    return (
      <PageContainer maxWidth="wide" className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <Link
              to="/dashboard"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <ArrowRight size={14} />
              <span>بازگشت به پیشخوان</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              تاریخچه محاسبات و تحلیل‌های انرژی
            </h1>
          </div>
          <Link
            to="/target-select"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 min-h-[44px]"
          >
            <Plus size={16} />
            <span>تحلیل جدید</span>
          </Link>
        </div>

        {analysisHistory.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="تاریخچه‌ای از تحلیل‌های قبلی ثبت نشده است"
            description="شما می‌توانید با انجام تحلیل پتانسیل خورشیدی، محاسبات اولیه را ذخیره یا به پروژه تبدیل نمایید."
            actionLabel="شروع تحلیل جدید"
            actionHref="/target-select"
          />
        ) : (
          <div className="space-y-3">
            {analysisHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    {item.title || 'تحلیل پتانسیل خورشیدی'}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-4">
                    <span>{new Date(item.date).toLocaleDateString('fa-IR')}</span>
                    <span>{item.input?.city || 'مکان نامشخص'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/result', { state: { historyResult: item.result, historyResultId: item.id } })}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-h-[44px]"
                  >
                    مشاهده نتیجه
                  </button>
                  {item.id && (
                    <button
                      onClick={() => handleConvertAnalysis(item.id)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 min-h-[44px] flex items-center gap-1"
                    >
                      <Briefcase size={14} />
                      <span>تبدیل به پروژه</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: REQUESTS TAB (Deep link compatibility: ?tab=requests)
  // -------------------------------------------------------------
  if (isRequestsTab) {
    return (
      <PageContainer maxWidth="wide" className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <Link
              to="/dashboard"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <ArrowRight size={14} />
              <span>بازگشت به پیشخوان</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              درخواست‌های احداث نیروگاه
            </h1>
          </div>
          <Link
            to="/powerplant-setup"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 min-h-[44px]"
          >
            <Plus size={16} />
            <span>ثبت درخواست</span>
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="درخواستی برای احداث نیروگاه یافت نشد"
            description="شما می‌توانید درخواست احداث نیروگاه خورشیدی را برای استعلام از پیمانکاران ثبت نمایید."
            actionLabel="ثبت درخواست احداث"
            actionHref="/powerplant-setup"
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req, idx) => (
              <div
                key={req.id || idx}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    درخواست احداث نیروگاه در {req.city || 'ایران'}
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {req.replies?.length ? `${req.replies.length} پیشنهاد` : 'در انتظار بررسی'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <div>متراژ: {toPersianDigits(req.area || '—')} متر مربع</div>
                  <div>اتصال: {req.connectionType === 'on-grid' ? 'متصل به شبکه' : 'منفصل از شبکه'}</div>
                  <div>نوع سقف: {req.roofType === 'flat' ? 'مسطح' : 'شیب‌دار'}</div>
                  <div>بودجه: {toPersianDigits(req.budget || '—')} {req.budgetUnit === 'million' ? 'میلیون' : 'میلیارد'} تومان</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  // -------------------------------------------------------------
  // PRIMARY ROLE-BASED DASHBOARD (UI-3 ARCHITECTURE)
  // Attention → Action → Context → Detail
  // -------------------------------------------------------------
  const isNewUser = projects.length === 0 && assets.length === 0;

  return (
    <PageContainer maxWidth="wide" className="space-y-8">
      {/* 1. Greeting & Context Header */}
      <DashboardHeader
        user={user}
        activeRole={activeRole}
        activeOrganization={activeOrganization}
      />

      {/* When user is completely new (0 projects & 0 assets), render helpful onboarding first */}
      {isNewUser ? (
        <div className="space-y-8">
          <NewUserOnboarding activeRole={activeRole} />
          
          {/* Still render Attention Center (which shows clean empty state: No urgent items) */}
          <AttentionCenter items={attentionItems} />

          {/* Role Summary */}
          <RoleSummary
            activeRole={activeRole}
            metrics={roleMetrics}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 2. Attention Center (Highest priority section: «نیازمند توجه شما») */}
          <AttentionCenter items={attentionItems} />

          {/* 3. Next Actions (Deterministic lifecycle steps: «اقدام‌های بعدی») */}
          <NextActions actions={nextActions} />

          {/* 4. Active Projects (Compact project cards: «پروژه‌های فعال») */}
          <ActiveProjects projects={projects} maxDisplay={5} />

          {/* 5. Operational Assets (ONLY rendered if user has operational assets!) */}
          <OperationalAssets assets={assets} />

          {/* 6. Role-Specific Summary (Max 4 verified metrics: «خلاصه شاخص‌ها») */}
          <RoleSummary
            activeRole={activeRole}
            metrics={roleMetrics}
          />

          {/* 7. Recent Activity (Real activity logs: «فعالیت‌های اخیر») */}
          <RecentActivity activities={activities} />
        </div>
      )}
    </PageContainer>
  );
}
