import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { EnergyProject } from '../../types/project';
import { ProjectFinancialModel, FinancialResults } from '../../types/finance';
import { Loader2, ArrowRight, Download, Printer } from 'lucide-react';
import { ProjectStatusBadge } from '../../components/ProjectStatusBadge';

export default function ProjectProposal() {
  const { id } = useParams();
  const [project, setProject] = useState<EnergyProject | null>(null);
  const [model, setModel] = useState<ProjectFinancialModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [projRes, modRes] = await Promise.all([
          fetch(`/api/projects/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`/api/projects/${id}/financial-models`)
        ]);
        
        if (projRes.ok) {
          setProject(await projRes.json());
        }
        if (modRes.ok) {
          const models = await modRes.json();
          if (models.length > 0) {
            setModel(models[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center min-h-screen bg-white">در حال بارگذاری...</div>;
  if (!project) return <div className="p-8 text-center min-h-screen bg-white">پروژه یافت نشد.</div>;

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (val: number | undefined) => {
    if (val === undefined) return '-';
    return (val / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 0 });
  };

  const r = model?.results;

  return (
    <div className="min-h-screen bg-gray-50 font-Vazirmatn py-8 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Print controls (hidden on print) */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Link to={`/projects/${project.id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowRight size={20} />
            بازگشت به پروژه
          </Link>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
              <Printer size={18} />
              چاپ پروپوزال
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="bg-white p-8 md:p-12 border border-gray-200 shadow-sm rounded-2xl print:border-none print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="border-b-2 border-blue-600 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">پروپوزال فنی و اقتصادی نیروگاه خورشیدی</h1>
              <p className="text-gray-500 text-lg">{project.title}</p>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-500">شماره پروژه</div>
              <div className="font-mono font-bold text-gray-800">{project.projectCode}</div>
              <div className="text-sm text-gray-500 mt-2">تاریخ گزارش</div>
              <div className="font-bold text-gray-800">{new Date().toLocaleDateString('fa-IR')}</div>
            </div>
          </div>

          {/* Section 1: Overview */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-blue-700 border-b border-gray-200 pb-2 mb-4">۱. خلاصه پروژه و مشخصات محل</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500">استان</div>
                <div className="font-bold">{project.location.province}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500">شهر</div>
                <div className="font-bold">{project.location.city}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500">نوع کاربری</div>
                <div className="font-bold">{project.site?.type || '-'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500">مساحت (مترمربع)</div>
                <div className="font-bold">{project.site?.areaM2 || '-'}</div>
              </div>
            </div>
          </section>

          {/* Section 2: Technical Design */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-blue-700 border-b border-gray-200 pb-2 mb-4">۲. مشخصات فنی و تولید انرژی</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-600">نوع سیستم:</span>
                  <span className="font-bold text-gray-900">{project.projectType}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-600">ظرفیت هدف:</span>
                  <span className="font-bold text-gray-900">{project.targetCapacityKw || '-'} kWp</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-600">وضعیت اتصال:</span>
                  <span className="font-bold text-gray-900">{project.energyRequirement?.gridConnected ? 'متصل به شبکه' : 'منفصل از شبکه'}</span>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-600">تولید سال اول:</span>
                  <span className="font-bold text-emerald-600">{r?.annualGenerationYear1Kwh.toLocaleString() || '-'} kWh</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-600">مصرف ماهیانه فعلی:</span>
                  <span className="font-bold text-gray-900">{project.energyRequirement?.monthlyConsumptionKwh || '-'} kWh</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Financials */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-blue-700 border-b border-gray-200 pb-2 mb-4">۳. شاخص‌های اقتصادی و امکان‌سنجی مالی</h2>
            {!model ? (
              <p className="text-gray-500 italic">مدل مالی برای این پروژه ثبت نشده است.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 text-center">
                    <div className="text-xs opacity-75 mb-1">سرمایه اولیه (CAPEX)</div>
                    <div className="text-xl font-black">{formatMoney(r?.totalCapex.amount)}</div>
                    <div className="text-[10px] mt-1">میلیون تومان</div>
                  </div>
                  <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-100 text-center">
                    <div className="text-xs opacity-75 mb-1">ارزش فعلی خالص (NPV)</div>
                    <div className="text-xl font-black">{formatMoney(r?.npv.amount)}</div>
                    <div className="text-[10px] mt-1">میلیون تومان</div>
                  </div>
                  <div className="p-4 bg-fuchsia-50 text-fuchsia-900 rounded-xl border border-fuchsia-100 text-center">
                    <div className="text-xs opacity-75 mb-1">بازگشت سرمایه</div>
                    <div className="text-xl font-black">{typeof r?.simplePaybackYears === 'number' ? r.simplePaybackYears.toFixed(1) : '-'}</div>
                    <div className="text-[10px] mt-1">سال</div>
                  </div>
                  <div className="p-4 bg-amber-50 text-amber-900 rounded-xl border border-amber-100 text-center">
                    <div className="text-xs opacity-75 mb-1">نرخ بازده داخلی (IRR)</div>
                    <div className="text-xl font-black" dir="ltr">{typeof r?.irrPercent === 'number' ? r.irrPercent.toFixed(1) + '%' : '-'}</div>
                    <div className="text-[10px] mt-1">سودآوری</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-600">درآمد سال اول (فروش به شبکه):</span>
                    <span className="font-bold text-gray-900">{formatMoney(r?.annualExportRevenueYear1.amount)} میلیون تومان</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2 pt-2">
                    <span className="text-gray-600">ارزش صرفه‌جویی سال اول:</span>
                    <span className="font-bold text-gray-900">{formatMoney(r?.annualSavingsYear1.amount)} میلیون تومان</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2 pt-2">
                    <span className="text-gray-600">هزینه‌های جاری (OPEX) سال اول:</span>
                    <span className="font-bold text-gray-900">{formatMoney(r?.annualOpexYear1.amount)} میلیون تومان</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-800 font-bold">هزینه تراز شده انرژی (LCOE):</span>
                    <span className="font-bold text-blue-700">{r?.lcoePerKwh.amount.toLocaleString('fa-IR', {maximumFractionDigits: 0})} تومان/کیلووات‌ساعت</span>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Disclaimer */}
          <div className="text-xs text-gray-400 mt-12 pt-6 border-t border-gray-100 text-justify leading-relaxed">
            <strong>سلب مسئولیت:</strong> این گزارش توسط سامانه هوشیار به صورت خودکار تهیه شده است و شامل برآوردهای مالی و مهندسی اولیه می‌باشد. اطلاعات ارائه شده، تضمینی برای بازده مالی قطعی نبوده و با توجه به نوسانات بازار، تعرفه‌های دولتی و شرایط محیطی ممکن است تغییر کند. مسئولیت تایید نهایی بر عهده کارشناسان مهندسی مشاور و مجری نهایی (EPC) خواهد بود.
          </div>
        </div>
      </div>
    </div>
  );
}
