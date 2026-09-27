import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FolderKanban, 
  Activity, 
  DollarSign, 
  Boxes, 
  Wrench, 
  Lightbulb, 
  Bot, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ExternalLink,
  ChevronLeft,
  RefreshCw,
  Plus
} from 'lucide-react';
import { 
  Portfolio, 
  PortfolioOverviewSummary, 
  LifecycleIntelligenceSummary, 
  AssetPortfolioSummary, 
  FinancialPortfolioSummary, 
  ProcurementIntelligenceSummary, 
  OperationsIntelligenceSummary, 
  PlatformInsight 
} from '../../types/portfolio.js';

export default function PortfolioDashboard() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'overview' | 'lifecycle' | 'assets' | 'financial' | 'procurement' | 'operations' | 'insights'>('overview');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab Data States
  const [overview, setOverview] = useState<PortfolioOverviewSummary | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleIntelligenceSummary | null>(null);
  const [assets, setAssets] = useState<AssetPortfolioSummary | null>(null);
  const [financial, setFinancial] = useState<FinancialPortfolioSummary | null>(null);
  const [procurement, setProcurement] = useState<ProcurementIntelligenceSummary | null>(null);
  const [operations, setOperations] = useState<OperationsIntelligenceSummary | null>(null);
  const [insights, setInsights] = useState<PlatformInsight[]>([]);

  // AI Assistant State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<any | null>(null);

  // Load user organizations
  useEffect(() => {
    fetch('/api/enterprise/organizations')
      .then(res => {
        if (!res.ok) throw new Error('خطا در دریافت لیست سازمان‌ها');
        return res.json();
      })
      .then(data => {
        setOrganizations(data);
        if (data.length > 0) {
          setSelectedOrgId(data[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Load portfolios when organization changes
  useEffect(() => {
    if (!selectedOrgId) return;
    setLoading(true);
    fetch(`/api/enterprise/organizations/${selectedOrgId}/portfolios`)
      .then(res => res.json())
      .then(data => {
        setPortfolios(data);
        if (data.length > 0) {
          setSelectedPortfolioId(data[0].id);
        } else {
          setSelectedPortfolioId('');
          setLoading(false);
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedOrgId]);

  // Load portfolio details when selected portfolio changes
  const loadPortfolioData = () => {
    if (!selectedPortfolioId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/enterprise/portfolios/${selectedPortfolioId}/overview`).then(r => r.ok ? r.json() : null),
      fetch(`/api/enterprise/portfolios/${selectedPortfolioId}/lifecycle`).then(r => r.ok ? r.json() : null),
      fetch(`/api/enterprise/portfolios/${selectedPortfolioId}/assets`).then(r => r.ok ? r.json() : null),
      fetch(`/api/enterprise/portfolios/${selectedPortfolioId}/financial`).then(r => r.ok ? r.json() : null),
      fetch(`/api/enterprise/portfolios/${selectedPortfolioId}/procurement`).then(r => r.ok ? r.json() : null),
      fetch(`/api/enterprise/portfolios/${selectedPortfolioId}/operations`).then(r => r.ok ? r.json() : null),
      fetch(`/api/enterprise/portfolios/${selectedPortfolioId}/insights`).then(r => r.ok ? r.json() : [])
    ])
      .then(([ov, lc, as, fn, pr, op, ins]) => {
        setOverview(ov);
        setLifecycle(lc);
        setAssets(as);
        setFinancial(fn);
        setProcurement(pr);
        setOperations(op);
        setInsights(ins || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPortfolioData();
  }, [selectedPortfolioId]);

  const handleGenerateAiSummary = () => {
    if (!selectedPortfolioId) return;
    setAiLoading(true);
    fetch(`/api/enterprise/portfolios/${selectedPortfolioId}/executive-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'گزارش تحلیلی جامع پرتفوی جهت ارائه به هیئت مدیره' })
    })
      .then(res => res.json())
      .then(data => {
        setAiSummary(data);
        setAiLoading(false);
      })
      .catch(err => {
        alert('خطا در تولید گزارش هوشمند: ' + err.message);
        setAiLoading(false);
      });
  };

  if (loading && organizations.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <span className="mr-3 text-stone-600">در حال بارگذاری لایه سازمانی و پرتفوی...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
            <Building2 className="w-4 h-4" />
            <span>مدیریت یکپارچه سازمانی و هوشمندی پرتفوی نیروگاه‌های خورشیدی</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            داشبورد اختصاصی پرتفوی انرژی
          </h1>
        </div>

        {/* Org & Portfolio Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {organizations.length > 0 && (
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5">
              <span className="text-xs text-stone-500 font-medium">سازمان:</span>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="bg-transparent text-sm font-semibold text-stone-800 focus:outline-none"
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}

          {portfolios.length > 0 && (
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5">
              <span className="text-xs text-stone-500 font-medium">پرتفوی:</span>
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="bg-transparent text-sm font-semibold text-stone-800 focus:outline-none"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadPortfolioData}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
            title="به‌روزرسانی داده‌ها"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {portfolios.length === 0 && !loading && (
        <div className="bg-stone-50 border border-dashed border-stone-300 rounded-2xl p-12 text-center">
          <FolderKanban className="w-12 h-12 text-stone-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-stone-800 mb-2">هیچ پرتفویی برای این سازمان تعریف نشده است</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
            پرتفوی لایه تجمیعی برای نظارت یکپارچه بر پروژه‌ها و دارایی‌های عملیاتی خورشیدی سازمان است.
          </p>
        </div>
      )}

      {/* Tabs Navigation */}
      {selectedPortfolioId && (
        <div className="flex overflow-x-auto border-b border-stone-200 gap-1 sm:gap-2 pb-px scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-b-2 border-amber-600 text-amber-700 bg-amber-50/50'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            نمای کلی پرتفوی
          </button>

          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'lifecycle'
                ? 'border-b-2 border-amber-600 text-amber-700 bg-amber-50/50'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            چرخه عمر پروژه‌ها
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assets'
                ? 'border-b-2 border-amber-600 text-amber-700 bg-amber-50/50'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            دارایی‌های عملیاتی
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'financial'
                ? 'border-b-2 border-amber-600 text-amber-700 bg-amber-50/50'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            نمای مالی و تأمین سرمایه
          </button>

          <button
            onClick={() => setActiveTab('procurement')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'procurement'
                ? 'border-b-2 border-amber-600 text-amber-700 bg-amber-50/50'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            تدارکات و قراردادها
          </button>

          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'operations'
                ? 'border-b-2 border-amber-600 text-amber-700 bg-amber-50/50'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Wrench className="w-4 h-4" />
            بهره‌برداری و نگهداری (O&M)
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'insights'
                ? 'border-b-2 border-amber-600 text-amber-700 bg-amber-50/50'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            هوشمندی و دستیار ارشد
            {insights.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {insights.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Tab 1: Overview */}
      {selectedPortfolioId && activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
              <div className="text-stone-500 text-xs font-medium mb-1">کل پروژه‌های تحت پوشش</div>
              <div className="text-2xl font-bold text-stone-900">{overview.totalProjects}</div>
              <div className="mt-2 text-xs text-stone-500">
                {overview.projectsUnderConstruction} در حال احداث
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
              <div className="text-stone-500 text-xs font-medium mb-1">ظرفیت برنامه‌ریزی‌شده مشخص</div>
              <div className="text-2xl font-bold text-amber-600">
                {overview.plannedSolarCapacity.knownCapacityKw.toLocaleString()} <span className="text-xs text-stone-500 font-normal">kW</span>
              </div>
              <div className="mt-2 text-xs text-stone-500">
                {overview.plannedSolarCapacity.projectsWithKnownCapacity} از {overview.totalProjects} پروژه دارای ظرفیت قطعی
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
              <div className="text-stone-500 text-xs font-medium mb-1">ظرفیت عملیاتی فعال</div>
              <div className="text-2xl font-bold text-emerald-600">
                {overview.operationalCapacity.knownCapacityKw.toLocaleString()} <span className="text-xs text-stone-500 font-normal">kW</span>
              </div>
              <div className="mt-2 text-xs text-stone-500">
                در قالب {overview.totalOperationalAssets} دارایی متصل به شبکه
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
              <div className="text-stone-500 text-xs font-medium mb-1">فرآیندهای تدارکات و قرارداد</div>
              <div className="text-2xl font-bold text-blue-600">{overview.activeContracts}</div>
              <div className="mt-2 text-xs text-stone-500">
                قرارداد فعال | {overview.activeProcurementProcesses} بسته خرید جاری
              </div>
            </div>
          </div>

          {/* Operational Health Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                توزیع پروژه‌ها در چرخه عمر
              </h3>
              {Object.keys(overview.projectsByLifecycleStage).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(overview.projectsByLifecycleStage).map(([stage, count]) => (
                    <div key={stage} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                      <span className="text-sm text-stone-700 font-medium">{stage}</span>
                      <span className="text-sm font-semibold bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded-full">
                        {count} پروژه
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400">هیچ پروژه‌ای در این پرتفوی ثبت نشده است.</p>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                وضعیت هشدارها و تعمیرات جاری
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                  <span className="text-xs text-stone-500 block mb-1">هشدارهای فعال</span>
                  <span className={`text-2xl font-bold ${overview.activeAlerts > 0 ? 'text-red-600' : 'text-stone-700'}`}>
                    {overview.activeAlerts}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                  <span className="text-xs text-stone-500 block mb-1">موارد تعمیرات باز</span>
                  <span className={`text-2xl font-bold ${overview.openMaintenanceCases > 0 ? 'text-amber-600' : 'text-stone-700'}`}>
                    {overview.openMaintenanceCases}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                  <span className="text-xs text-stone-500 block mb-1">درخواست‌های باز تسهیلات</span>
                  <span className="text-2xl font-bold text-stone-700">
                    {overview.openFinancingApplications}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                  <span className="text-xs text-stone-500 block mb-1">توافق‌نامه‌های تأمین مالی</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {overview.activeFinancingAgreements}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lifecycle */}
      {selectedPortfolioId && activeTab === 'lifecycle' && lifecycle && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">پروژه‌های راکد (بدون تغییر &gt; ۳۰ روز)</div>
              <div className="text-2xl font-bold text-amber-600">{lifecycle.stalledProjects.length}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">مایلستون‌های معوق تاریخ‌گذشته</div>
              <div className="text-2xl font-bold text-red-600">{lifecycle.overdueMilestones.length}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">پروژه‌های نیازمند تکمیل اطلاعات گام بعد</div>
              <div className="text-2xl font-bold text-blue-600">{lifecycle.missingNextSteps.length}</div>
            </div>
          </div>

          {/* Overdue Milestones Table */}
          {lifecycle.overdueMilestones.length > 0 && (
            <div className="bg-white border border-red-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                مایلستون‌های اجرایی تاریخ‌گذشته
              </h3>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-red-100 text-stone-500 text-xs">
                      <th className="py-2">کد پروژه</th>
                      <th className="py-2">عنوان مایلستون</th>
                      <th className="py-2">موعد مقرر</th>
                      <th className="py-2">تأخیر (روز)</th>
                      <th className="py-2">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {lifecycle.overdueMilestones.map(om => (
                      <tr key={om.milestoneId}>
                        <td className="py-2.5 font-medium text-stone-800">{om.projectCode}</td>
                        <td className="py-2.5 text-stone-700">{om.milestoneTitle}</td>
                        <td className="py-2.5 text-stone-500">{om.dueDate}</td>
                        <td className="py-2.5 font-bold text-red-600">{om.daysOverdue} روز</td>
                        <td className="py-2.5"><span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">{om.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked comparison cards */}
              <div className="md:hidden space-y-3">
                {lifecycle.overdueMilestones.map(om => (
                  <div key={om.milestoneId} className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs font-bold text-stone-600 block">{om.projectCode}</span>
                        <h4 className="text-sm font-bold text-stone-900">{om.milestoneTitle}</h4>
                      </div>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold">{om.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-red-100">
                      <div>
                        <span className="text-stone-500 block">موعد مقرر:</span>
                        <span className="font-mono text-stone-800">{om.dueDate}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">میزان تأخیر:</span>
                        <span className="font-bold text-red-600">{om.daysOverdue} روز</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Next Steps */}
          {lifecycle.missingNextSteps.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-stone-900 mb-3">اقدامات لازم جهت پیشبرد چرخه عمر</h3>
              <div className="space-y-3">
                {lifecycle.missingNextSteps.map(mn => (
                  <div key={mn.projectId} className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-stone-800 text-sm">{mn.projectCode} - {mn.title}</span>
                      <span className="text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded">{mn.currentStatus}</span>
                    </div>
                    <div className="text-xs text-amber-700 font-medium mb-1">
                      فیلدهای ضروری ناقص: {mn.missingFields.join('، ')}
                    </div>
                    <div className="text-xs text-stone-600">اقدام پیشنهادی: {mn.recommendedAction}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Assets */}
      {selectedPortfolioId && activeTab === 'assets' && assets && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">کل دارایی‌های خورشیدی</div>
              <div className="text-2xl font-bold text-stone-900">{assets.totalAssets}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">در حال ارسال تله‌متری زنده</div>
              <div className="text-2xl font-bold text-emerald-600">{assets.telemetryBreakdown.reporting}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">فاقد تله‌متری یا اتصال</div>
              <div className="text-2xl font-bold text-stone-600">
                {assets.telemetryBreakdown.notConnected + assets.telemetryBreakdown.dataUnavailable}
              </div>
            </div>
          </div>

          {/* Assets Table */}
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-stone-900 mb-4">فهرست و پایش تفصیلی دارایی‌های خورشیدی</h3>
            {assets.assets.length > 0 ? (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 text-xs">
                        <th className="py-2.5">کد دارایی</th>
                        <th className="py-2.5">نام نیروگاه</th>
                        <th className="py-2.5">ظرفیت نامی (kW)</th>
                        <th className="py-2.5">وضعیت عملیاتی</th>
                        <th className="py-2.5">تله‌متری</th>
                        <th className="py-2.5">سلامت</th>
                        <th className="py-2.5">هشدارها</th>
                        <th className="py-2.5">گارانتی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {assets.assets.map(a => (
                        <tr key={a.assetId}>
                          <td className="py-3 font-semibold text-stone-800">{a.assetCode}</td>
                          <td className="py-3 text-stone-700">{a.name}</td>
                          <td className="py-3 text-stone-700">
                            {a.installedCapacityKw !== null && a.installedCapacityKw !== undefined ? `${a.installedCapacityKw} kW` : <span className="text-stone-400">ثبت‌نشده</span>}
                          </td>
                          <td className="py-3">
                            <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                              {a.operationalStatus}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              a.telemetryStatus === 'REPORTING' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                            }`}>
                              {a.telemetryStatus}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              a.healthState === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                            }`}>
                              {a.healthState}
                            </span>
                          </td>
                          <td className="py-3">
                            {a.activeAlertsCount > 0 ? (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">
                                {a.activeAlertsCount}
                              </span>
                            ) : (
                              <span className="text-xs text-stone-400">۰</span>
                            )}
                          </td>
                          <td className="py-3 text-xs text-stone-600">
                            {a.warrantyStatus}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Asset Cards */}
                <div className="lg:hidden space-y-3">
                  {assets.assets.map(a => (
                    <div key={a.assetId} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs font-bold text-stone-500 block">{a.assetCode}</span>
                          <h4 className="text-sm font-bold text-stone-900">{a.name}</h4>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-medium">
                          {a.operationalStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-200">
                        <div>
                          <span className="text-stone-500 block">ظرفیت نامی:</span>
                          <span className="font-bold text-stone-800">
                            {a.installedCapacityKw !== null ? `${a.installedCapacityKw} kW` : 'ثبت‌نشده'}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block">وضعیت تله‌متری:</span>
                          <span className={`font-medium ${a.telemetryStatus === 'REPORTING' ? 'text-emerald-700' : 'text-stone-600'}`}>
                            {a.telemetryStatus}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block">وضعیت سلامت:</span>
                          <span className={a.healthState === 'HEALTHY' ? 'text-emerald-700 font-medium' : 'text-stone-600'}>
                            {a.healthState}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block">هشدار فعال:</span>
                          <span className={`font-bold ${a.activeAlertsCount > 0 ? 'text-red-600' : 'text-stone-500'}`}>
                            {a.activeAlertsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-stone-400 text-center py-6">هیچ دارایی خورشیدی برای این پرتفوی ثبت نشده است.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Financial */}
      {selectedPortfolioId && activeTab === 'financial' && financial && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between">
            <span>
              <strong>اصل تمامیت داده مالی:</strong> هیچ عدد یا درصد ساختگی در محاسبات اعمال نمی‌شود. مقادیر نامشخص به عنوان داده ناقص گزارش شده و با صفر جایگزین نمی‌گردند.
            </span>
            <span className="font-semibold bg-amber-100 px-2 py-1 rounded">
              میزان پوشش داده: {financial.dataCoveragePercent}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">مجموع CAPEX مشخص (ریال)</div>
              <div className="text-xl font-bold text-stone-900">
                {financial.aggregations.totalKnownCapexIRR.toLocaleString()}
              </div>
              <div className="text-xs text-stone-400 mt-1">
                {financial.aggregations.projectsWithCapexCount} از {financial.totalProjectsInPortfolio} پروژه
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">تسهیلات درخواستی ثبت‌شده</div>
              <div className="text-xl font-bold text-blue-600">
                {financial.aggregations.totalKnownFinancingRequestedIRR.toLocaleString()}
              </div>
              <div className="text-xs text-stone-400 mt-1">
                {financial.aggregations.projectsWithFinancingRequestedCount} پروژه دارای درخواست
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">تأمین مالی مصوب و نهایی</div>
              <div className="text-xl font-bold text-emerald-600">
                {financial.aggregations.totalKnownFinancingSecuredIRR.toLocaleString()}
              </div>
              <div className="text-xs text-stone-400 mt-1">
                {financial.aggregations.projectsWithFinancingSecuredCount} توافق مصوب
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">آورده نقدی کارفرما (Equity)</div>
              <div className="text-xl font-bold text-amber-700">
                {financial.aggregations.totalKnownOwnerEquityIRR.toLocaleString()}
              </div>
              <div className="text-xs text-stone-400 mt-1">
                {financial.aggregations.projectsWithOwnerEquityCount} ثبت مشخص
              </div>
            </div>
          </div>

          {/* Project Financial Breakdown */}
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-stone-900 mb-4">جزئیات مالی پروژه‌ها</h3>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 text-xs">
                    <th className="py-2.5">کد پروژه</th>
                    <th className="py-2.5">عنوان</th>
                    <th className="py-2.5">برآورد CAPEX</th>
                    <th className="py-2.5">تسهیلات درخواستی</th>
                    <th className="py-2.5">تسهیلات مصوب</th>
                    <th className="py-2.5">آورده نقدی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {financial.projectFinancialDetails.map(p => (
                    <tr key={p.projectId}>
                      <td className="py-3 font-semibold text-stone-800">{p.projectCode}</td>
                      <td className="py-3 text-stone-700">{p.title}</td>
                      <td className="py-3 text-stone-700">
                        {p.capexIRR !== null && p.capexIRR !== undefined ? `${p.capexIRR.toLocaleString()} ریال` : <span className="text-stone-400 italic">نامشخص</span>}
                      </td>
                      <td className="py-3 text-stone-700">
                        {p.financingRequestedIRR !== null && p.financingRequestedIRR !== undefined ? `${p.financingRequestedIRR.toLocaleString()} ریال` : <span className="text-stone-400 italic">ندارد</span>}
                      </td>
                      <td className="py-3 text-stone-700">
                        {p.financingSecuredIRR !== null && p.financingSecuredIRR !== undefined ? `${p.financingSecuredIRR.toLocaleString()} ریال` : <span className="text-stone-400 italic">-</span>}
                      </td>
                      <td className="py-3 text-stone-700">
                        {p.ownerEquityIRR !== null && p.ownerEquityIRR !== undefined ? `${p.ownerEquityIRR.toLocaleString()} ریال` : <span className="text-stone-400 italic">نامشخص</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Financial Cards */}
            <div className="md:hidden space-y-3">
              {financial.projectFinancialDetails.map(p => (
                <div key={p.projectId} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-stone-500 block">{p.projectCode}</span>
                      <h4 className="text-sm font-bold text-stone-900">{p.title}</h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-200">
                    <div>
                      <span className="text-stone-500 block">برآورد CAPEX:</span>
                      <span className="font-mono font-bold text-stone-800">
                        {p.capexIRR !== null ? `${p.capexIRR.toLocaleString()} ریال` : 'نامشخص'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">تسهیلات درخواستی:</span>
                      <span className="font-mono text-stone-800">
                        {p.financingRequestedIRR !== null ? `${p.financingRequestedIRR.toLocaleString()} ریال` : 'ندارد'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">تسهیلات مصوب:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {p.financingSecuredIRR !== null ? `${p.financingSecuredIRR.toLocaleString()} ریال` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">آورده نقدی:</span>
                      <span className="font-mono text-stone-800">
                        {p.ownerEquityIRR !== null ? `${p.ownerEquityIRR.toLocaleString()} ریال` : 'نامشخص'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Procurement */}
      {selectedPortfolioId && activeTab === 'procurement' && procurement && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">بسته‌های خرید باز</div>
              <div className="text-2xl font-bold text-amber-600">{procurement.openProcurementPackages}</div>
              <div className="text-xs text-stone-400 mt-1">از {procurement.totalProcurementPackages} بسته</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">مناقصات تأمین‌کنندگان</div>
              <div className="text-2xl font-bold text-blue-600">{procurement.activeSupplierRFQs}</div>
              <div className="text-xs text-stone-400 mt-1">از {procurement.totalSupplierRFQs} استعلام</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">بازرسی‌های معلق تحویل</div>
              <div className="text-2xl font-bold text-red-600">{procurement.pendingInspections}</div>
              <div className="text-xs text-stone-400 mt-1">محموله ورودی کارگاه</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">قراردادهای فعال</div>
              <div className="text-2xl font-bold text-emerald-600">{procurement.activeContracts}</div>
              <div className="text-xs text-stone-400 mt-1">{procurement.approvedChangeRequests} تغییر مصوب</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Operations */}
      {selectedPortfolioId && activeTab === 'operations' && operations && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">نیروگاه‌های متصل به مانیتورینگ</div>
              <div className="text-2xl font-bold text-emerald-600">{operations.telemetryAvailability.reporting}</div>
              <div className="text-xs text-stone-400 mt-1">از مجموع {operations.totalOperationalAssets} دارایی عملیاتی</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">کل هشدارهای فعال</div>
              <div className="text-2xl font-bold text-red-600">{operations.activeAlertsCount}</div>
              <div className="text-xs text-stone-400 mt-1">
                بحرانی: {operations.activeAlertsBySeverity.CRITICAL} | بالا: {operations.activeAlertsBySeverity.HIGH}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="text-xs text-stone-500 mb-1">موارد تعمیراتی باز</div>
              <div className="text-2xl font-bold text-amber-600">{operations.openMaintenanceCasesCount}</div>
              <div className="text-xs text-stone-400 mt-1">
                اولویت بحرانی: {operations.openMaintenanceCasesByPriority.CRITICAL}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Insights & AI Assistant */}
      {selectedPortfolioId && activeTab === 'insights' && (
        <div className="space-y-8">
          {/* AI Executive Assistant Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-600 text-white rounded-xl">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">دستیار ارشد و تحلیل‌گر پرتفوی انرژی</h3>
                  <p className="text-xs text-stone-600">
                    استخراج گزارش ساخت‌یافته و دقیق مدیریتی منحصراً مبتنی بر داده‌های تأییدشده و مستند
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerateAiSummary}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition shadow-sm disabled:opacity-50"
              >
                {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                {aiLoading ? 'در حال تحلیل داده‌ها...' : 'تولید گزارش هوشمند ارشد'}
              </button>
            </div>

            {aiSummary && (
              <div className="bg-white border border-amber-100 rounded-xl p-6 shadow-sm space-y-4">
                <div className="text-xs text-stone-400 flex justify-between">
                  <span>منبع پردازش: {aiSummary.generatedBy}</span>
                  <span>{new Date(aiSummary.generatedAt).toLocaleString('fa-IR')}</span>
                </div>
                <div className="text-sm text-stone-800 leading-relaxed whitespace-pre-line">
                  {aiSummary.summaryText}
                </div>

                {aiSummary.attentionItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <span className="text-xs font-semibold text-amber-800 block mb-2">موارد نیازمند توجه ویژه:</span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-stone-700">
                      {aiSummary.attentionItems.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Platform Intelligence Engine Insights */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              بینش‌های عملیاتی و ریسک‌های شناسایی‌شده (موتور هوشمندی سیستم)
            </h3>

            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map(ins => {
                  const severityBg = 
                    ins.severity === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800' :
                    ins.severity === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                    ins.severity === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    'bg-blue-50 border-blue-200 text-blue-800';

                  return (
                    <div key={ins.id} className={`border rounded-xl p-5 ${severityBg}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm">{ins.title}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/70 border">
                          {ins.severity}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed mb-3">{ins.message}</p>
                      <div className="text-[11px] opacity-75 font-mono bg-white/40 p-2 rounded">
                        مستندات واقعی: {JSON.stringify(ins.evidence)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-8 text-center text-stone-500 text-sm">
                هیچ هشدار یا انحراف عملیاتی ثبت‌شده‌ای در این پرتفوی یافت نشد.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
