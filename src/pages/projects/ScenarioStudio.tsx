import React, { useState, useEffect } from 'react';
import { EnergyProject } from '../../types/project';
import { ProjectFinancialModel, FinancialScenario, FinancialAssumptionSet } from '../../types/finance';
import { Loader2, Plus, TrendingUp, AlertTriangle, Sliders, X } from 'lucide-react';

export function ScenarioStudio({ project, model }: { project: EnergyProject, model: ProjectFinancialModel }) {
  const [scenarios, setScenarios] = useState<FinancialScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  
  // Custom scenario form state
  const [customName, setCustomName] = useState('');
  const [capexDeltaPercent, setCapexDeltaPercent] = useState<number>(10);
  const [genDeltaPercent, setGenDeltaPercent] = useState<number>(-5);

  useEffect(() => {
    fetchScenarios();
  }, [model.id]);

  const fetchScenarios = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/financial-models/${model.id}/scenarios`);
      if (res.ok) {
        setScenarios(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val: number) => {
    return (val / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 0 });
  };

  const baseCapex = model.results?.totalCapex?.amount || model.capex?.total?.amount || 0;
  const baseGen = model.energyEconomics?.annualGenerationKwh || model.results?.annualGenerationYear1Kwh || 0;

  const createDefaultScenarios = async () => {
    setCreating(true);
    try {
      const conservative: Partial<FinancialScenario> = {
        name: 'سناریو محتاطانه (+۱۵٪ هزینه، -۱۰٪ تولید)',
        type: 'CONSERVATIVE',
        capexOverride: { amount: Math.round(baseCapex * 1.15), currency: 'IRR', unit: model.displayCurrencyUnit || 'TOMAN' },
        generationOverrideKwh: Math.round(baseGen * 0.9),
      };

      const optimistic: Partial<FinancialScenario> = {
        name: 'سناریو خوش‌بینانه (-۱۰٪ هزینه، +۱۰٪ تولید)',
        type: 'OPTIMISTIC',
        capexOverride: { amount: Math.round(baseCapex * 0.90), currency: 'IRR', unit: model.displayCurrencyUnit || 'TOMAN' },
        generationOverrideKwh: Math.round(baseGen * 1.1),
      };

      await fetch(`/api/projects/${project.id}/financial-models/${model.id}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conservative)
      });

      await fetch(`/api/projects/${project.id}/financial-models/${model.id}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimistic)
      });

      await fetchScenarios();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCustomScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    setCreating(true);
    try {
      const capexFactor = 1 + (capexDeltaPercent / 100);
      const genFactor = 1 + (genDeltaPercent / 100);

      const customScenario: Partial<FinancialScenario> = {
        name: customName,
        type: 'CUSTOM',
        capexOverride: { 
          amount: Math.round(baseCapex * capexFactor), 
          currency: 'IRR', 
          unit: model.displayCurrencyUnit || 'TOMAN' 
        },
        generationOverrideKwh: Math.round(baseGen * genFactor)
      };

      await fetch(`/api/projects/${project.id}/financial-models/${model.id}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customScenario)
      });

      setShowCustomModal(false);
      setCustomName('');
      await fetchScenarios();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6 mt-8 font-Vazirmatn">
      <div className="flex flex-wrap justify-between items-center border-t border-gray-200 pt-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">استودیوی سناریوها و تحلیل حساسیت (Sensitivity Studio)</h2>
          <p className="text-sm text-gray-500 mt-1">مقایسه عملکرد مالی طرح تحت شرایط متغیر هزینه‌ای و تولیدی با محاسبات قطعی</p>
        </div>
        <div className="flex gap-2">
          {scenarios.length === 0 && (
            <button 
              onClick={createDefaultScenarios}
              disabled={creating}
              className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-100 flex items-center gap-2 border border-blue-200"
            >
              {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              تولید سناریوهای استاندارد
            </button>
          )}
          <button
            onClick={() => setShowCustomModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200 flex items-center gap-2 border border-gray-300"
          >
            <Sliders size={16} />
            سناریوی حساسیت سفارشی
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Base Scenario from Model */}
        <div className="bg-white p-6 rounded-2xl border-2 border-blue-500 shadow-md relative">
          <div className="absolute top-0 right-4 transform -translate-y-1/2 bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-full">
            سناریوی مبنا (Base Case)
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-4 text-center mt-2">معماری و برآورد مصوب</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">سرمایه‌گذاری (CAPEX):</span>
              <span className="font-bold text-gray-800">{formatMoney(model.results?.totalCapex.amount || 0)} م.ت</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">تولید سال اول:</span>
              <span className="font-bold text-gray-800">{model.energyEconomics?.annualGenerationKwh?.toLocaleString() || 0} kWh</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">ارزش فعلی خالص (NPV):</span>
              <span className="font-bold text-emerald-600">{formatMoney(model.results?.npv.amount || 0)} م.ت</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">دوره بازگشت سرمایه:</span>
              <span className="font-bold text-gray-800">{typeof model.results?.simplePaybackYears === 'number' ? model.results.simplePaybackYears.toFixed(1) + ' سال' : '-'}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-gray-500">نرخ بازده داخلی (IRR):</span>
              <span className="font-bold text-blue-600 text-lg" dir="ltr">{typeof model.results?.irrPercent === 'number' ? model.results?.irrPercent.toFixed(1) + '%' : '-'}</span>
            </div>
          </div>
        </div>

        {/* Generated Scenarios */}
        {scenarios.map(sc => (
          <div key={sc.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
            <div className={`absolute top-0 right-4 transform -translate-y-1/2 px-3 py-1 text-xs font-bold rounded-full text-white ${
              sc.type === 'OPTIMISTIC' ? 'bg-emerald-600' : sc.type === 'CONSERVATIVE' ? 'bg-amber-600' : 'bg-indigo-600'
            }`}>
              {sc.type === 'OPTIMISTIC' ? 'خوش‌بینانه' : sc.type === 'CONSERVATIVE' ? 'محتاطانه' : 'سفارشی'}
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-4 text-center mt-2 truncate" title={sc.name}>
              {sc.name}
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">سرمایه‌گذاری (CAPEX):</span>
                <span className="font-bold text-gray-800">{formatMoney(sc.results?.totalCapex.amount || 0)} م.ت</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">تولید سال اول:</span>
                <span className="font-bold text-gray-800">{sc.results?.annualGenerationYear1Kwh?.toLocaleString() || 0} kWh</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">ارزش فعلی خالص (NPV):</span>
                <span className="font-bold text-emerald-600">{formatMoney(sc.results?.npv.amount || 0)} م.ت</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">دوره بازگشت سرمایه:</span>
                <span className="font-bold text-gray-800">{typeof sc.results?.simplePaybackYears === 'number' ? sc.results.simplePaybackYears.toFixed(1) + ' سال' : '-'}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500">نرخ بازده داخلی (IRR):</span>
                <span className="font-bold text-blue-600 text-lg" dir="ltr">{typeof sc.results?.irrPercent === 'number' ? sc.results?.irrPercent.toFixed(1) + '%' : '-'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {scenarios.length > 0 && (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3 mt-4">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-amber-900 mb-1">نتیجه‌گیری قطعی تحلیل حساسیت</h4>
            <p className="text-sm text-amber-800 leading-relaxed text-justify">
              محاسبات ریاضی فوق حاکی از آن است که تغییرات نرخ بازده داخلی (IRR) و ارزش فعلی خالص (NPV) کاملاً وابسته به دقت برآورد تولید انرژی سالیانه و تغییرات شاخص تورم/تعدیل تعرفه خرید تضمینی ساتبا می‌باشد. برای اطمینان از نتایج مالی، عقد قرارداد با پیمانکار EPC معتبر با تعهد Performance Ratio و گارانتی حداقل تولید توصیه می‌شود.
            </p>
          </div>
        </div>
      )}

      {/* Custom Scenario Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button 
              onClick={() => setShowCustomModal(false)}
              className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sliders className="text-blue-600" size={20} />
              تعریف سناریوی حساسیت سفارشی
            </h3>

            <form onSubmit={handleCreateCustomScenario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان سناریو</label>
                <input 
                  type="text" 
                  value={customName} 
                  onChange={e => setCustomName(e.target.value)} 
                  placeholder="مثال: شوک ارزی و تورم تجهیزات" 
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تغییر هزینه سرمایه‌گذاری (CAPEX): {capexDeltaPercent > 0 ? `+${capexDeltaPercent}%` : `${capexDeltaPercent}%`}
                </label>
                <input 
                  type="range" 
                  min="-30" 
                  max="50" 
                  step="5"
                  value={capexDeltaPercent} 
                  onChange={e => setCapexDeltaPercent(Number(e.target.value))} 
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>۳۰- ٪</span>
                  <span>۰ ٪</span>
                  <span>۵۰+ ٪</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تغییر تولید سالیانه: {genDeltaPercent > 0 ? `+${genDeltaPercent}%` : `${genDeltaPercent}%`}
                </label>
                <input 
                  type="range" 
                  min="-25" 
                  max="25" 
                  step="5"
                  value={genDeltaPercent} 
                  onChange={e => setGenDeltaPercent(Number(e.target.value))} 
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>۲۵- ٪</span>
                  <span>۰ ٪</span>
                  <span>۲۵+ ٪</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={creating || !customName.trim()}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? <Loader2 className="animate-spin" size={16} /> : null}
                  محاسبه و ذخیره سناریو
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
