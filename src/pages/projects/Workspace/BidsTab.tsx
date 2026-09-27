import React, { useState, useEffect } from 'react';
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
  FileCheck
} from 'lucide-react';
import { EPCBid, ProjectRFQ } from '../../../types/rfq.js';

interface BidsTabProps {
  projectId: string;
  project: any;
  onProjectUpdate?: () => void;
}

export default function BidsTab({ projectId, project, onProjectUpdate }: BidsTabProps) {
  const [rfq, setRfq] = useState<ProjectRFQ | null>(null);
  const [bids, setBids] = useState<EPCBid[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 1. Fetch project RFQ
      const rfqRes = await fetch(`/api/rfq/project/${projectId}`, { headers });
      if (rfqRes.ok) {
        const rfqs = await rfqRes.json();
        if (Array.isArray(rfqs) && rfqs.length > 0) {
          const currentRfq = rfqs[0];
          setRfq(currentRfq);

          // 2. Fetch bids and comparison for this RFQ
          const compareRes = await fetch(`/api/rfq/${currentRfq.id}/compare`, { headers });
          if (compareRes.ok) {
            const compData = await compareRes.json();
            setComparison(compData);
            setBids(compData.ranking || compData.bids || []);
          } else {
            // fallback to direct bids endpoint
            const bidsRes = await fetch(`/api/rfq/${currentRfq.id}/bids`, { headers });
            if (bidsRes.ok) {
              const bidsData = await bidsRes.json();
              setBids(Array.isArray(bidsData) ? bidsData : []);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading bids data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBid = async (bidId: string) => {
    const selectedBid = bids.find(b => b.id === bidId);
    const contractorName = selectedBid?.epcOrganization?.tradeName || selectedBid?.epcOrganization?.legalName || 'پیمانکار';
    
    if (!confirm(`آیا از انتخاب «${contractorName}» به عنوان مجری نهایی و رسمی پروژه اطمینان دارید؟ این عمل وضعیت پروژه را به «پیمانکار منتخب (EPC_SELECTED)» تغییر می‌دهد.`)) {
      return;
    }

    setActionLoading(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rfq/bids/${bidId}/select`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setActionMessage({ 
          type: 'success', 
          text: `پیمانکار «${contractorName}» به عنوان مجری رسمی پروژه انتخاب شد و پروژه به فاز EPC_SELECTED ارتقا یافت.` 
        });
        await loadData();
        if (onProjectUpdate) onProjectUpdate();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'خطا در انتخاب مجری' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطا در ارتباط با سرور' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBidStatus = async (bidId: string, status: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rfq/bids/${bidId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        setActionMessage({ type: 'success', text: `وضعیت پیشنهاد به ${status} تغییر یافت.` });
        await loadData();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'خطا در تغییر وضعیت پیشنهاد' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطا در ارتباط با سرور' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"><CheckCircle2 size={13} /> مجری منتخب</span>;
      case 'SHORTLISTED':
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">فهرست کوتاه</span>;
      case 'UNDER_REVIEW':
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">در حال بررسی</span>;
      case 'REJECTED':
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-gray-100 text-gray-600 border border-gray-200">رد شده</span>;
      case 'SUBMITTED':
      default:
        return <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">ارسال شده</span>;
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500 bg-gray-100';
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center font-bold text-gray-500">
        در حال ارزیابی و بارگذاری پیشنهادات EPC...
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center py-16">
        <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">ابتدا استعلام EPC را ایجاد کنید</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          برای دریافت و مقایسه پیشنهادات پیمانکاران، ابتدا در تب «استعلام (RFQ)» پروژه اقدام به صدور استعلام فرمایید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
          <span className="text-sm font-bold">{actionMessage.text}</span>
        </div>
      )}

      {/* HEADER & ACTIONS */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {rfq.rfqCode}
            </span>
            <span className="text-xs font-bold text-gray-500">
              تعداد پیشنهادات دریافتی: {bids.length} پیشنهاد
            </span>
          </div>
          <h2 className="text-xl font-black text-gray-900">ارزیابی فنی و مالی پیشنهادات EPC</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            امتیازدهی قطعی و شفاف هوشیار بر اساس قیمت، مشخصات فنی، برند تجهیزات، گارانتی و سابقه اجرایی
          </p>
        </div>

        {bids.length > 0 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowComparisonModal(!showComparisonModal)}
              className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <ArrowUpDown size={16} />
              {showComparisonModal ? 'بستن ماتریس مقایسه' : 'ماتریس مقایسه تطبیقی'}
            </button>
          </div>
        )}
      </div>

      {/* COMPARISON MATRIX (EXPANDABLE) */}
      {showComparisonModal && bids.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Award size={18} className="text-blue-600" />
              ماتریس مقایسه تطبیقی پیشنهادات پیمانکاران (Deterministic Bid Matrix)
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              فرمول امتیازدهی: قیمت ۲۵٪ | فنی ۲۵٪ | تجهیزات ۱۵٪ | گارانتی ۱۰٪ | زمان ۱۰٪ | سابقه ۱۰٪ | تجاری ۵٪
            </span>
          </div>

          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <th className="p-3 font-bold">رتبه و پیمانکار</th>
                <th className="p-3 font-bold">امتیاز کل (از ۱۰۰)</th>
                <th className="p-3 font-bold">مبلغ کل پیشنهادی</th>
                <th className="p-3 font-bold">مدت زمان اجرا</th>
                <th className="p-3 font-bold">تضمین تولید سالیانه</th>
                <th className="p-3 font-bold">برند پنل و اینورتر</th>
                <th className="p-3 font-bold">گارانتی</th>
                <th className="p-3 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bids.map((b, idx) => {
                const org = b.epcOrganization;
                const priceMillion = Math.round(b.proposedPriceIRR / 10000000); // Toman
                return (
                  <tr key={b.id} className={`hover:bg-blue-50/40 transition-colors ${b.status === 'ACCEPTED' ? 'bg-emerald-50/50' : ''}`}>
                    <td className="p-3 font-bold">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-gray-900 font-bold">{org?.tradeName || org?.legalName || 'پیمانکار'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{b.bidCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg font-black border text-xs ${getScoreColor(b.score?.totalScore)}`}>
                        {b.score?.totalScore ? `${b.score.totalScore.toFixed(1)}` : 'در حال محاسبه'}
                      </span>
                    </td>
                    <td className="p-3 font-black text-blue-700">
                      {priceMillion.toLocaleString('fa-IR')} میلیون تومان
                    </td>
                    <td className="p-3 font-bold text-gray-700">
                      {b.timelineDays} روز
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      {b.guaranteedAnnualYieldMwh} MWh/سال
                    </td>
                    <td className="p-3 text-gray-600">
                      <div>{b.equipmentSpecs?.panelBrand || '-'}</div>
                      <div className="text-[10px] text-gray-400">{b.equipmentSpecs?.inverterBrand || '-'}</div>
                    </td>
                    <td className="p-3 font-bold text-gray-700">
                      {b.warrantyYears} سال
                    </td>
                    <td className="p-3">
                      {b.status === 'ACCEPTED' ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">مجری منتخب</span>
                      ) : (
                        <button 
                          onClick={() => handleSelectBid(b.id)}
                          disabled={actionLoading}
                          className="bg-emerald-600 text-white px-3 py-1 rounded text-[11px] font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          انتخاب نهایی
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* NO BIDS YET */}
      {bids.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center py-16">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={40} />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">در انتظار دریافت پیشنهادات EPC</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            استعلام برای پیمانکاران ارسال شده است. به محض ارسال پیشنهاد فنی و مالی، سیستم به صورت قطعی امتیازدهی را محاسبه کرده و در این صفحه نمایش می‌دهد.
          </p>
        </div>
      )}

      {/* BIDS LIST */}
      <div className="grid grid-cols-1 gap-4">
        {bids.map((b, idx) => {
          const org = b.epcOrganization;
          const isExpanded = expandedBidId === b.id;
          const priceToman = Math.round(b.proposedPriceIRR / 10000000);

          return (
            <div 
              key={b.id} 
              className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${
                b.status === 'ACCEPTED' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                      {b.bidCode}
                    </span>
                    {getStatusBadge(b.status)}
                    {idx === 0 && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <Award size={13} className="text-amber-600" /> رتبه اول ارزیابی
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-gray-900 pt-1">
                    {org?.tradeName || org?.legalName || 'شرکت مهندسی EPC'}
                  </h3>
                  <div className="text-xs text-gray-500">
                    شناسه ملی: {org?.nationalId || '-'} | ثبت: {org?.registrationNumber || '-'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-left md:text-right px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block font-bold">امتیاز تجمیعی</span>
                    <span className={`text-lg font-black ${b.score?.totalScore && b.score.totalScore >= 75 ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {b.score?.totalScore ? `${b.score.totalScore.toFixed(1)} / ۱۰۰` : 'در حال ارزیابی'}
                    </span>
                  </div>

                  {b.status === 'ACCEPTED' ? (
                    <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm">
                      <FileCheck size={16} />
                      قرارداد در حال انعقاد
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSelectBid(b.id)}
                      disabled={actionLoading}
                      className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-xs shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={16} />
                      انتخاب به عنوان مجری رسمی
                    </button>
                  )}
                </div>
              </div>

              {/* STATS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-gray-100">
                <div>
                  <span className="text-xs text-gray-400 block mb-1">مبلغ کل پیشنهادی</span>
                  <span className="text-base font-black text-blue-700">
                    {priceToman.toLocaleString('fa-IR')} میلیون تومان
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">تولید سالیانه تضمین شده</span>
                  <span className="text-base font-black text-emerald-700">
                    {b.guaranteedAnnualYieldMwh} MWh/سال
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">زمان‌بندی اجرا و تحویل</span>
                  <span className="text-base font-black text-gray-800">
                    {b.timelineDays} روز کاری
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">گارانتی و خدمات پس از فروش</span>
                  <span className="text-base font-black text-gray-800">
                    {b.warrantyYears} سال
                  </span>
                </div>
              </div>

              {/* RISK FLAGS */}
              {b.score?.riskFlags && b.score.riskFlags.length > 0 && (
                <div className="py-3 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    <ShieldAlert size={14} className="text-amber-500" /> هشدارهای ریسک:
                  </span>
                  {b.score.riskFlags.map((rf, rIdx) => (
                    <span key={rIdx} className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      rf.severity === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {rf.message}
                    </span>
                  ))}
                </div>
              )}

              {/* DETAILED SCORE BREAKDOWN TOGGLE */}
              <div className="pt-3 flex items-center justify-between">
                <button 
                  onClick={() => setExpandedBidId(isExpanded ? null : b.id)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isExpanded ? 'بستن جزئیات امتیازدهی و مشخصات تجهیزات' : 'مشاهده جزئیات امتیازدهی و برند تجهیزات'}
                </button>

                <div className="flex items-center gap-2">
                  {b.status !== 'ACCEPTED' && b.status !== 'SHORTLISTED' && (
                    <button 
                      onClick={() => handleUpdateBidStatus(b.id, 'SHORTLISTED')}
                      className="text-xs font-bold text-gray-600 hover:text-blue-600 px-3 py-1 rounded hover:bg-gray-50"
                    >
                      افزودن به لیست نهایی
                    </button>
                  )}
                  {b.status !== 'REJECTED' && b.status !== 'ACCEPTED' && (
                    <button 
                      onClick={() => handleUpdateBidStatus(b.id, 'REJECTED')}
                      className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                    >
                      رد پیشنهاد
                    </button>
                  )}
                </div>
              </div>

              {/* EXPANDED DETAILS */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 p-4 rounded-xl space-y-4 text-xs">
                  {/* SCORE BREAKDOWN */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-2">تفکیک امتیازات ارزیابی (Scoring Breakdown):</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-gray-200">
                      <div>
                        <span className="text-gray-400 block">امتیاز قیمت (۲۵٪):</span>
                        <span className="font-black text-gray-800">{b.score?.breakdown.priceScore.toFixed(1)} / ۲۵</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">امتیاز مشخصات فنی (۲۵٪):</span>
                        <span className="font-black text-gray-800">{b.score?.breakdown.technicalScore.toFixed(1)} / ۲۵</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">کیفیت تجهیزات (۱۵٪):</span>
                        <span className="font-black text-gray-800">{b.score?.breakdown.equipmentScore.toFixed(1)} / ۱۵</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">مدت گارانتی (۱۰٪):</span>
                        <span className="font-black text-gray-800">{b.score?.breakdown.warrantyScore.toFixed(1)} / ۱۰</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">زمان‌بندی اجرا (۱۰٪):</span>
                        <span className="font-black text-gray-800">{b.score?.breakdown.timelineScore.toFixed(1)} / ۱۰</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">سابقه EPC (۱۰٪):</span>
                        <span className="font-black text-gray-800">{b.score?.breakdown.experienceScore.toFixed(1)} / ۱۰</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">شرایط تجاری (۵٪):</span>
                        <span className="font-black text-gray-800">{b.score?.breakdown.commercialScore.toFixed(1)} / ۵</span>
                      </div>
                    </div>
                  </div>

                  {/* EQUIPMENT SPECS */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-2">مشخصات فنی و برندهای پیشنهادی:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-gray-200">
                      <div>
                        <span className="text-gray-400 block">برند پنل خورشیدی:</span>
                        <span className="font-bold text-gray-800">{b.equipmentSpecs?.panelBrand || 'اعلام نشده'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">برند اینورتر:</span>
                        <span className="font-bold text-gray-800">{b.equipmentSpecs?.inverterBrand || 'اعلام نشده'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">سازه و استراکچر:</span>
                        <span className="font-bold text-gray-800">{b.equipmentSpecs?.rackingType || 'گالوانیزه گرم استاندارد'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">سیستم مانیتورینگ:</span>
                        <span className="font-bold text-gray-800">{b.equipmentSpecs?.monitoringIncluded ? 'شامل پایش برخط' : 'ندارد'}</span>
                      </div>
                    </div>
                  </div>

                  {/* REVISION HISTORY */}
                  {b.revisions && b.revisions.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2">تاریخچه نسخه‌ها و اصلاحیه‌ها:</h4>
                      <div className="space-y-1">
                        {b.revisions.map((rev) => (
                          <div key={rev.revisionNumber} className="bg-white p-2.5 rounded border border-gray-200 flex justify-between items-center text-xs">
                            <span className="font-bold">نسخه {rev.revisionNumber}: {Math.round(rev.proposedPriceIRR / 10000000).toLocaleString('fa-IR')} میلیون تومان</span>
                            <span className="text-gray-500">{rev.reasonForRevision || 'اصلاح مشخصات'}</span>
                            <span className="text-gray-400">{new Date(rev.createdAt).toLocaleDateString('fa-IR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
