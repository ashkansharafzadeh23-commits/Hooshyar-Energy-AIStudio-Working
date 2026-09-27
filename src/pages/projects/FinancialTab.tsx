import React, { useState, useEffect } from 'react';
import { EnergyProject } from '../../types/project';
import { ProjectFinancialModel, FinancialResults, FinancialAssumptionSet } from '../../types/finance';
import { 
  Loader2, 
  Plus, 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  FileText, 
  Award, 
  Sliders, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScenarioStudio } from './ScenarioStudio';

export function FinancialTab({ project }: { project: EnergyProject }) {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<ProjectFinancialModel | null>(null);
  const [assumptions, setAssumptions] = useState<FinancialAssumptionSet | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [availableBids, setAvailableBids] = useState<any[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom model creation form state
  const [customCapacityKw, setCustomCapacityKw] = useState<number>(project.targetCapacityKw || 100);
  const [customCapexMillionToman, setCustomCapexMillionToman] = useState<number>(
    project.estimatedBudget?.amount 
      ? (project.estimatedBudget.currency === 'IRR' ? Math.round(project.estimatedBudget.amount / 10000000) : Math.round(project.estimatedBudget.amount / 1000000))
      : (project.estimatedBudgetIRR ? Math.round(project.estimatedBudgetIRR / 10000000) : (project.targetCapacityKw ? project.targetCapacityKw * 25 : 2500))
  );
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(30);
  const [customSatbaTariff, setCustomSatbaTariff] = useState<number>(3200); // Toman/kWh

  useEffect(() => {
    fetchModelAndBids();
  }, [project.id]);

  const fetchModelAndBids = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch financial models
      const res = await fetch(`/api/projects/${project.id}/financial-models`);
      if (res.ok) {
        const models = await res.json();
        if (models.length > 0) {
          const currentModel = models[0];
          setModel(currentModel);

          // fetch assumptions for this model
          if (currentModel.assumptionSetId) {
            const detailRes = await fetch(`/api/projects/${project.id}/financial-models/${currentModel.id}`);
            if (detailRes.ok) {
              const detail = await detailRes.json();
              setAssumptions(detail.assumptions);
            }
          }
        }
      }

      // 2. Fetch any RFQ and Bids for this project to enable from-bid creation
      const rfqRes = await fetch(`/api/rfq/project/${project.id}`);
      if (rfqRes.ok) {
        const rfqs = await rfqRes.json();
        if (Array.isArray(rfqs) && rfqs.length > 0) {
          const bidsRes = await fetch(`/api/rfq/${rfqs[0].id}/bids`);
          if (bidsRes.ok) {
            const bidsData = await bidsRes.json();
            if (Array.isArray(bidsData)) {
              setAvailableBids(bidsData);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createModelFromBid = async (bidId?: string) => {
    setIsCalculating(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/financial-models/from-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidId })
      });

      if (res.ok) {
        const data = await res.json();
        setModel(data.model);
        setAssumptions(data.assumptions);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'خطا در تولید مدل مالی از پیشنهاد EPC');
      }
    } catch (e) {
      setErrorMessage('خطا در برقراری ارتباط با سرور');
    } finally {
      setIsCalculating(false);
    }
  };

  const createCustomModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customCapacityKw <= 0 || customCapexMillionToman <= 0) {
      setErrorMessage('ظرفیت نیروگاه و برآورد سرمایه‌گذاری اولیه باید بیشتر از صفر باشند.');
      return;
    }

    setIsCalculating(true);
    setErrorMessage(null);
    try {
      const capexTotalToman = customCapexMillionToman * 1000000;
      const unit = 'TOMAN';

      const equipmentRatio = 0.65;
      const installationRatio = 0.20;
      const engineeringRatio = 0.10;
      const contingencyRatio = 0.05;

      const newModel: Omit<ProjectFinancialModel, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId: project.id,
        modelCode: 'MOD-EST-' + Date.now(),
        status: 'DRAFT',
        baseCurrency: 'IRR',
        displayCurrencyUnit: unit,
        sourceType: 'ENGINEERING_ESTIMATE',
        version: 1,
        createdByUserId: 'user',
        capex: {
          engineering: { amount: Math.round(capexTotalToman * engineeringRatio), currency: 'IRR', unit },
          solarPanels: { amount: Math.round(capexTotalToman * equipmentRatio * 0.65), currency: 'IRR', unit },
          inverters: { amount: Math.round(capexTotalToman * equipmentRatio * 0.25), currency: 'IRR', unit },
          battery: { amount: 0, currency: 'IRR', unit },
          generator: { amount: 0, currency: 'IRR', unit },
          mountingStructure: { amount: Math.round(capexTotalToman * equipmentRatio * 0.10), currency: 'IRR', unit },
          electricalEquipment: { amount: 0, currency: 'IRR', unit },
          cables: { amount: 0, currency: 'IRR', unit },
          protection: { amount: 0, currency: 'IRR', unit },
          monitoring: { amount: 0, currency: 'IRR', unit },
          transportation: { amount: 0, currency: 'IRR', unit },
          installation: { amount: Math.round(capexTotalToman * installationRatio), currency: 'IRR', unit },
          commissioning: { amount: 0, currency: 'IRR', unit },
          gridConnection: { amount: 0, currency: 'IRR', unit },
          permits: { amount: 0, currency: 'IRR', unit },
          civilWorks: { amount: 0, currency: 'IRR', unit },
          tax: { amount: 0, currency: 'IRR', unit },
          contingency: { amount: Math.round(capexTotalToman * contingencyRatio), currency: 'IRR', unit },
          other: { amount: 0, currency: 'IRR', unit },
          total: { amount: capexTotalToman, currency: 'IRR', unit }
        },
        opex: {
          maintenance: { amount: Math.round(capexTotalToman * 0.01), currency: 'IRR', unit },
          cleaning: { amount: Math.round(capexTotalToman * 0.003), currency: 'IRR', unit },
          insurance: { amount: Math.round(capexTotalToman * 0.002), currency: 'IRR', unit },
          monitoring: { amount: Math.round(capexTotalToman * 0.001), currency: 'IRR', unit },
          landLease: { amount: 0, currency: 'IRR', unit },
          staff: { amount: 0, currency: 'IRR', unit },
          security: { amount: 0, currency: 'IRR', unit },
          batteryReplacementReserve: { amount: 0, currency: 'IRR', unit },
          inverterReplacementReserve: { amount: 0, currency: 'IRR', unit },
          administration: { amount: 0, currency: 'IRR', unit },
          other: { amount: 0, currency: 'IRR', unit },
          totalYear1: { amount: Math.round(capexTotalToman * 0.016), currency: 'IRR', unit }
        },
        replacements: [
          {
            year: 12,
            componentType: 'تعویض اینورترهای خورشیدی (Inverter Replacement)',
            estimatedCost: { amount: Math.round(capexTotalToman * equipmentRatio * 0.25 * 0.8), currency: 'IRR', unit }
          }
        ],
        energyEconomics: {
          installedCapacityKw: customCapacityKw,
          annualGenerationKwh: customCapacityKw * 1650,
          selfConsumptionRatio: 0,
          exportRatio: 100,
          customerTariff: {
            id: 'tariff-retail',
            name: 'تعرفه برق صنعتی/تجاری (Retail)',
            type: 'CUSTOMER_RETAIL_TARIFF',
            unitPricePerKwh: { amount: 400, currency: 'IRR', unit },
            effectiveDate: new Date().toISOString(),
            annualEscalationPercent: 25,
            source: 'وزارت نیرو'
          },
          exportTariff: {
            id: 'tariff-satba',
            name: 'نرخ خرید تضمینی ساتبا (FIT)',
            type: 'FEED_IN_TARIFF',
            unitPricePerKwh: { amount: customSatbaTariff, currency: 'IRR', unit },
            effectiveDate: new Date().toISOString(),
            annualEscalationPercent: 0,
            source: 'ساتبا مصوبه ۱۴۰۳'
          }
        }
      };

      const newAssumptions: Omit<FinancialAssumptionSet, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId: project.id,
        name: 'مفروضات برآورد مهندسی پروژه',
        version: 1,
        projectLifetimeYears: 20,
        discountRatePercent: customDiscountRate,
        annualInflationPercent: 35,
        electricityTariffEscalationPercent: 20,
        equipmentPriceEscalationPercent: 25,
        panelAnnualDegradationPercent: 0.5,
        systemAvailabilityPercent: 99,
        performanceRatioPercent: 80,
        annualOpexEscalationPercent: 30,
        taxRatePercent: 0,
        insurancePercent: 0.5,
        maintenancePercent: 1.0,
        residualValuePercent: 5
      };

      const res = await fetch(`/api/projects/${project.id}/financial-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: newModel, assumptions: newAssumptions })
      });

      if (res.ok) {
        const data = await res.json();
        setModel(data.model);
        setAssumptions(data.assumptions);
        setShowCustomModal(false);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'خطا در ثبت مدل مالی');
      }
    } catch (e) {
      setErrorMessage('خطا در ذخیره‌سازی مدل مالی');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRecalculate = async () => {
    if (!model) return;
    setIsCalculating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/financial-models/${model.id}/calculate`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated = await res.json();
        setModel(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  const selectedBid = availableBids.find(b => b.status === 'SELECTED') || availableBids[0];

  if (!model) {
    return (
      <div className="space-y-6 font-Vazirmatn">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-3xl mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Calculator size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">مدل مالی و اقتصادی پروژه</h3>
          <p className="text-gray-600 mb-6 max-w-lg leading-relaxed text-sm">
            محاسبات مالی در سامانه هوشیار انرژی به صورت کاملاً قطعی (Deterministic) و بر اساس پارامترهای مشخص فنی و اقتصادی انجام می‌شود. هیچ داده فرضی یا شبیه‌سازی نشده‌ای در محاسبات وارد نمی‌گردد.
          </p>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm max-w-md w-full text-right flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            {selectedBid ? (
              <button 
                onClick={() => createModelFromBid(selectedBid.id)}
                disabled={isCalculating}
                className="flex-1 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
              >
                {isCalculating ? <Loader2 className="animate-spin" size={18} /> : <Award size={18} />}
                ایجاد مدل بر اساس پیشنهاد EPC منتخب
              </button>
            ) : null}

            <button 
              onClick={() => setShowCustomModal(true)}
              disabled={isCalculating}
              className="flex-1 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
            >
              <Plus size={18} />
              تعریف مدل با ورودی‌های مهندسی
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-400">
            {selectedBid ? (
              <span>پیشنهاد EPC به شماره «{selectedBid.bidCode}» با مبلغ مصوب در دسترس است.</span>
            ) : (
              <span>تاکنون پیشنهاد EPC انتخاب نشده است؛ می‌توانید با ورود برآورد اولیه مدل را بسازید.</span>
            )}
          </div>
        </div>

        {/* Custom Input Modal */}
        {showCustomModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
              <button 
                onClick={() => setShowCustomModal(false)}
                className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-gray-900 mb-1">تعریف پارامترهای مدل مالی پروژه</h3>
              <p className="text-xs text-gray-500 mb-6">تمام محاسبات جریان نقدی و بازگشت سرمایه از این مقادیر استخراج خواهد شد.</p>

              <form onSubmit={createCustomModel} className="space-y-4 text-right">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ظرفیت نامی نیروگاه (کیلووات - kWp)</label>
                  <input 
                    type="number" 
                    value={customCapacityKw} 
                    onChange={e => setCustomCapacityKw(Number(e.target.value))}
                    min="1"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">برآورد کل هزینه سرمایه‌گذاری اولیه (CAPEX - میلیون تومان)</label>
                  <input 
                    type="number" 
                    value={customCapexMillionToman} 
                    onChange={e => setCustomCapexMillionToman(Number(e.target.value))}
                    min="10"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <div className="text-xs text-gray-400 mt-1">معادل {(customCapexMillionToman * 10).toLocaleString('fa-IR')} میلیون ریال</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نرخ پایه خرید تضمینی برق ساتبا (تومان به ازای هر کیلووات‌ساعت)</label>
                  <input 
                    type="number" 
                    value={customSatbaTariff} 
                    onChange={e => setCustomSatbaTariff(Number(e.target.value))}
                    min="500"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نرخ تنزیل مالی سالیانه (Discount Rate - درصد)</label>
                  <input 
                    type="number" 
                    value={customDiscountRate} 
                    onChange={e => setCustomDiscountRate(Number(e.target.value))}
                    min="5"
                    max="60"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <div className="text-xs text-gray-400 mt-1">نرخ استاندارد پروژه‌های زیرساختی انرژی در ایران بین ۲۵ تا ۳۵ درصد است.</div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isCalculating}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCalculating ? <Loader2 className="animate-spin" size={16} /> : null}
                    ایجاد و محاسبه قطعی مدل
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const r = model.results;
  
  if (!r) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center font-Vazirmatn">
        <h4 className="font-bold text-gray-800 mb-2">مدل مالی نیاز به محاسبه دارد</h4>
        <button
          onClick={handleRecalculate}
          disabled={isCalculating}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
        >
          {isCalculating ? 'در حال محاسبه...' : 'اجرای محاسبات مالی'}
        </button>
      </div>
    );
  }

  const formatMoney = (val: number) => {
    return (val / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 0 });
  };

  const isViable = typeof r.irrPercent === 'number' && r.irrPercent >= (assumptions?.discountRatePercent || 30);

  return (
    <div className="space-y-8 font-Vazirmatn">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">امکان‌سنجی اقتصادی و مدل مالی پروژه</h2>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
              model.sourceType === 'SELECTED_EPC_BID' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {model.sourceType === 'SELECTED_EPC_BID' ? 'مبتنی بر پیشنهاد EPC منتخب' : 'برآورد ساختاریافته مهندسی'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            کد مدل: {model.modelCode} | ویرایش: {model.version} | تاریخ محاسبه: {new Date(model.calculatedAt || model.createdAt).toLocaleDateString('fa-IR')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedBid && model.sourceType !== 'SELECTED_EPC_BID' && (
            <button 
              onClick={() => createModelFromBid(selectedBid.id)}
              disabled={isCalculating}
              className="px-3.5 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs hover:bg-emerald-100 flex items-center gap-1.5 border border-emerald-200"
            >
              <Award size={14} />
              به‌روزرسانی با پیشنهاد EPC
            </button>
          )}

          <button 
            onClick={handleRecalculate}
            disabled={isCalculating}
            className="px-3.5 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 flex items-center gap-1.5 border border-gray-300"
          >
            <Activity size={14} />
            محاسبه مجدد
          </button>

          <Link 
            to={`/projects/${project.id}/proposal`} 
            target="_blank" 
            className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-indigo-700 shadow-sm"
          >
            <FileText size={14} />
            پروپوزال رسمی پروژه
          </Link>
        </div>
      </div>

      {/* 4 Core Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-xs font-bold flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-blue-600" /> هزینه سرمایه‌گذاری (CAPEX)
          </div>
          <div className="text-2xl font-black text-gray-900">{formatMoney(r.totalCapex.amount)}</div>
          <div className="text-xs text-gray-500 mt-1">میلیون تومان</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-xs font-bold flex items-center gap-2 mb-2">
            <Activity size={16} className="text-amber-600" /> دوره بازگشت سرمایه
          </div>
          <div className="text-2xl font-black text-gray-900">
            {typeof r.simplePaybackYears === 'number' ? r.simplePaybackYears.toFixed(1) : '-'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            سال (ساده) / تنزیل‌شده: {typeof r.discountedPaybackYears === 'number' ? r.discountedPaybackYears.toFixed(1) + ' سال' : '-'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-xs font-bold flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-indigo-600" /> نرخ بازده داخلی (IRR)
          </div>
          <div className={`text-2xl font-black ${isViable ? 'text-emerald-600' : 'text-amber-600'}`} dir="ltr">
            {typeof r.irrPercent === 'number' ? r.irrPercent.toFixed(1) + '%' : 'عدم همگرایی'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            نرخ تنزیل مرجع: {assumptions?.discountRatePercent || 30}٪
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-xs font-bold flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-600" /> ارزش فعلی خالص (NPV)
          </div>
          <div className={`text-2xl font-black ${r.npv.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatMoney(r.npv.amount)}
          </div>
          <div className="text-xs text-gray-500 mt-1">میلیون تومان</div>
        </div>
      </div>

      {/* Detailed Revenue & Cash Flow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
            <span>درآمد و جریان نقدینگی سال اول</span>
            <span className="text-xs font-normal text-gray-500">بر مبنای تولید {r.annualGenerationYear1Kwh.toLocaleString()} kWh</span>
          </h3>
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-600">درآمد حاصل از فروش تضمینی برق به شبکه:</span>
              <span className="font-bold text-emerald-600">{formatMoney(r.annualExportRevenueYear1.amount)} <span className="text-xs font-normal text-gray-500">م.ت</span></span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-600">ارزش برق صرفه‌جویی شده مصرفی:</span>
              <span className="font-bold text-blue-600">{formatMoney(r.annualSavingsYear1.amount)} <span className="text-xs font-normal text-gray-500">م.ت</span></span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-600">هزینه‌های بهره‌برداری و نگهداری (OPEX سال اول):</span>
              <span className="font-bold text-red-500">{formatMoney(r.annualOpexYear1.amount)} <span className="text-xs font-normal text-gray-500">م.ت</span></span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
              <span className="text-gray-900 font-bold">جریان نقدینگی خالص سال اول:</span>
              <span className="font-black text-gray-900 text-lg">
                {formatMoney(r.annualNetBenefitYear1.amount - r.annualOpexYear1.amount)} <span className="text-xs font-normal text-gray-500">میلیون تومان</span>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
            <span>شاخص‌های تحلیلی و بازده طول عمر پروژه</span>
            <span className="text-xs font-normal text-gray-500">دوره تحلیل ۲۰ سال</span>
          </h3>
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-600">هزینه تراز شده انرژی (LCOE):</span>
              <span className="font-bold text-gray-900">
                {r.lcoePerKwh.amount.toLocaleString('fa-IR', { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-gray-500">تومان بر کیلووات‌ساعت</span>
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-600">مجموع درآمد ناخالص طول دوره:</span>
              <span className="font-bold text-emerald-600">{formatMoney(r.totalLifetimeRevenue.amount)} <span className="text-xs font-normal text-gray-500">م.ت</span></span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-600">مجموع جریان نقدی خالص (پس از کسر CAPEX و OPEX):</span>
              <span className="font-bold text-gray-900">{formatMoney(r.totalLifetimeNetCashFlow.amount)} <span className="text-xs font-normal text-gray-500">م.ت</span></span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
              <span className="text-gray-900 font-bold">بازده کل سرمایه (Lifetime ROI):</span>
              <span className="font-black text-indigo-600 text-lg" dir="ltr">
                {r.lifetimeRoiPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Economic Interpretation & Assumptions Table */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Info className="text-blue-600" size={18} />
            ارزیابی قطعی اقتصادی بر اساس استانداردهای مهندسی مالی
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed text-justify bg-blue-50/70 p-4 rounded-xl border border-blue-100">
            {isViable ? (
              <span>
                با توجه به نرخ بازده داخلی (IRR) معادل <strong>{typeof r.irrPercent === 'number' ? r.irrPercent.toFixed(1) : ''}٪</strong> که بالاتر از نرخ تنزیل پایه ({assumptions?.discountRatePercent || 30}٪) قرار دارد و ارزش فعلی خالص (NPV) مثبت <strong>{formatMoney(r.npv.amount)} میلیون تومان</strong>، این پروژه از نظر اقتصادی و بانکی <strong>توجیه‌پذیر و دارای ارزش افزوده سرمایه‌گذاری</strong> است. 
              </span>
            ) : (
              <span>
                نرخ بازده داخلی (IRR) طرح ({typeof r.irrPercent === 'number' ? r.irrPercent.toFixed(1) : ''}٪) به نرخ تنزیل پایه ({assumptions?.discountRatePercent || 30}٪) نزدیک است. برای بهبود توجیه‌پذیری، کاهش هزینه‌های سرمایه‌ای اولیه یا انتخاب مدل قرارداد تضمین تولید با مجری EPC الزامی است.
              </span>
            )}
          </p>
        </div>

        {/* Assumptions Table */}
        {assumptions && (
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3">جدول مفروضات قطعی محاسبات (Deterministic Assumptions)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">نرخ تنزیل (Discount Rate)</span>
                <span className="font-bold text-gray-800 text-sm">{assumptions.discountRatePercent}٪ سالیانه</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">تورم سالیانه (Inflation)</span>
                <span className="font-bold text-gray-800 text-sm">{assumptions.annualInflationPercent}٪</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">افت راندمان سالیانه پنل</span>
                <span className="font-bold text-gray-800 text-sm">{assumptions.panelAnnualDegradationPercent}٪</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">ضریب عملکرد (PR)</span>
                <span className="font-bold text-gray-800 text-sm">{assumptions.performanceRatioPercent}٪</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">طول عمر مدل اقتصادی</span>
                <span className="font-bold text-gray-800 text-sm">{assumptions.projectLifetimeYears} سال</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 block mb-1">نرخ مالیات (Tax Rate)</span>
                <span className="font-bold text-gray-800 text-sm">{assumptions.taxRatePercent}٪ (معافیت ماده ۱۳۲)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scenario Studio Component */}
      <ScenarioStudio project={project} model={model} />
    </div>
  );
}
