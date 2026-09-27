import React, { useState, useEffect } from 'react';
import { ProjectContract, ContractParty, ChangeRequest, ProjectBaseline, ContractRevision } from '../../../types/execution';
import { 
  Loader2, 
  FileText, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Award, 
  Plus, 
  DollarSign, 
  Calendar, 
  Building, 
  AlertCircle, 
  Layers, 
  Sliders, 
  X,
  FileCheck,
  TrendingUp,
  History,
  PenTool
} from 'lucide-react';

interface ContractTabProps {
  projectId: string;
}

export const ContractTab: React.FC<ContractTabProps> = ({ projectId }) => {
  const [contracts, setContracts] = useState<ProjectContract[]>([]);
  const [parties, setParties] = useState<Record<string, ContractParty[]>>({});
  const [revisions, setRevisions] = useState<Record<string, ContractRevision[]>>({});
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [baseline, setBaseline] = useState<ProjectBaseline | null>(null);
  const [winningBid, setWinningBid] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCRModal, setShowCRModal] = useState(false);
  const [activeContractForCR, setActiveContractForCR] = useState<string | null>(null);

  // Terms Edit / Confirm Modal
  const [contractToEditTerms, setContractToEditTerms] = useState<ProjectContract | null>(null);
  const [editAdvance, setEditAdvance] = useState<number>(20);
  const [editRetention, setEditRetention] = useState<number>(5);
  const [editWarranty, setEditWarranty] = useState<number>(24);
  const [editPaymentTerms, setEditPaymentTerms] = useState<string>('');

  // New CR form
  const [crTitle, setCrTitle] = useState('');
  const [crDescription, setCrDescription] = useState('');
  const [crCostImpact, setCrCostImpact] = useState<number>(0);
  const [crScheduleImpactDays, setCrScheduleImpactDays] = useState<number>(0);
  const [crReason, setCrReason] = useState<'CLIENT_REQUEST' | 'SITE_CONDITIONS' | 'REGULATORY' | 'DESIGN_CHANGE'>('DESIGN_CHANGE');

  // External Signed Document Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadContractId, setUploadContractId] = useState<string | null>(null);
  const [uploadFileUrl, setUploadFileUrl] = useState('');

  useEffect(() => {
    fetchContractData();
  }, [projectId]);

  const fetchContractData = async () => {
    setLoading(true);
    try {
      // 1. Fetch contracts
      const res = await fetch(`/api/execution/${projectId}/contracts`);
      if (res.ok) {
        const contractsData: ProjectContract[] = await res.json();
        setContracts(contractsData);

        // Fetch parties & revisions for each contract
        for (const c of contractsData) {
          const pRes = await fetch(`/api/execution/${projectId}/contracts/${c.id}/parties`);
          if (pRes.ok) {
            const pData = await pRes.json();
            setParties(prev => ({ ...prev, [c.id]: pData }));
          }

          const rRes = await fetch(`/api/execution/${projectId}/contracts/${c.id}/revisions`);
          if (rRes.ok) {
            const rData = await rRes.json();
            setRevisions(prev => ({ ...prev, [c.id]: rData }));
          }
        }
      }

      // 2. Fetch baseline
      const baseRes = await fetch(`/api/execution/${projectId}/baseline`);
      if (baseRes.ok) {
        const baseData = await baseRes.json();
        setBaseline(baseData);
      }

      // 3. Fetch change requests
      const crRes = await fetch(`/api/execution/${projectId}/change-requests`);
      if (crRes.ok) {
        const crData = await crRes.json();
        setChangeRequests(crData);
      }

      // 4. Check for winning EPC bid
      const rfqRes = await fetch(`/api/rfq/project/${projectId}`);
      if (rfqRes.ok) {
        const rfqs = await rfqRes.json();
        if (Array.isArray(rfqs) && rfqs.length > 0) {
          const bidsRes = await fetch(`/api/rfq/${rfqs[0].id}/bids`);
          if (bidsRes.ok) {
            const bids = await bidsRes.json();
            const win = bids.find((b: any) => b.status === 'SELECTED');
            if (win) setWinningBid(win);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContractFromBid = async () => {
    if (!winningBid) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/contracts/from-bid/${winningBid.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'current-user' })
      });
      if (res.ok) {
        await fetchContractData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReadyToSign = async (contractId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/contracts/${contractId}/ready-to-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        await fetchContractData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadSignedDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadContractId || !uploadFileUrl.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/contracts/${uploadContractId}/upload-signed-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: uploadFileUrl })
      });
      if (res.ok) {
        setShowUploadModal(false);
        setUploadFileUrl('');
        setUploadContractId(null);
        await fetchContractData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSignedDocument = async (contractId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/contracts/${contractId}/confirm-signed-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        await fetchContractData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveBaseline = async () => {
    if (!baseline) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/baseline/${baseline.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'supervisor-user' })
      });
      if (res.ok) {
        await fetchContractData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractToEditTerms) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/contracts/${contractToEditTerms.id}/confirm-terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advancePaymentPercent: editAdvance,
          retentionPercent: editRetention,
          warrantyPeriodMonths: editWarranty,
          paymentTermsSummary: editPaymentTerms,
          status: 'UNDER_REVIEW'
        })
      });
      if (res.ok) {
        setContractToEditTerms(null);
        await fetchContractData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const openTermsModal = (c: ProjectContract) => {
    setContractToEditTerms(c);
    setEditAdvance(c.advancePaymentPercent ?? 20);
    setEditRetention(c.retentionPercent ?? 5);
    setEditWarranty(c.warrantyPeriodMonths ?? 24);
    setEditPaymentTerms(c.paymentTermsSummary || 'پیش‌پرداخت ۲۰٪، ورود تجهیزات ۴۰٪، نصب مکانیکی ۲۰٪، تست و راه‌اندازی ۱۵٪، سپرده حسن انجام کار ۵٪');
  };

  const handleCreateChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crTitle.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/change-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: activeContractForCR,
          crCode: `CR-${Date.now().toString().slice(-4)}`,
          title: crTitle,
          description: crDescription,
          reasonCategory: crReason,
          costImpactAmount: crCostImpact,
          scheduleImpactDays: crScheduleImpactDays,
          requestedByUserId: 'user'
        })
      });
      if (res.ok) {
        setShowCRModal(false);
        setCrTitle('');
        setCrDescription('');
        setCrCostImpact(0);
        setCrScheduleImpactDays(0);
        await fetchContractData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCRStatus = async (crId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/execution/${projectId}/change-requests/${crId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          approvedByUserId: 'supervisor', 
          approvedAt: new Date().toISOString() 
        })
      });
      if (res.ok) {
        await fetchContractData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const formatMoney = (val: number, currency = 'IRR') => {
    if (currency === 'IRR') {
      const toman = Math.round(val / 10);
      return (toman / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' م.تومان';
    }
    return val.toLocaleString('fa-IR') + ' ' + currency;
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center font-Vazirmatn">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-Vazirmatn">
      {/* Top Banner / Actions */}
      <div className="flex flex-wrap justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">مدیریت قراردادها و خط مبنای اجرایی (Contracts & Baselines)</h2>
          <p className="text-sm text-gray-500">کنترل حقوقی، امضای طرفین، شرایط پرداخت، ثبت الحاقیه‌ها و تاریخچه بازنگری‌های مصوب</p>
        </div>

        <div className="flex items-center gap-3">
          {winningBid && contracts.length === 0 && (
            <button 
              onClick={handleCreateContractFromBid}
              disabled={actionLoading}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Award size={16} />}
              عقد قرارداد EPC بر مبنای پیشنهاد منتخب ({winningBid.bidCode})
            </button>
          )}

          {winningBid && contracts.length > 0 && (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <CheckCircle size={14} />
              منطبق بر پیشنهاد مصوب EPC ({winningBid.bidCode})
            </div>
          )}
        </div>
      </div>

      {/* Baseline Card */}
      {baseline && contracts.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base mb-1">
                <Layers className="text-blue-600" size={18} />
                خط مبنای پروژه (Project Baseline): {baseline.baselineCode || 'BL-01'}
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  baseline.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                  baseline.status === 'SUPERSEDED' ? 'bg-gray-200 text-gray-700' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {baseline.status === 'APPROVED' ? 'مصوب (APPROVED)' :
                   baseline.status === 'SUPERSEDED' ? 'منسوخ شده با الحاقیه (SUPERSEDED)' :
                   'پیش‌نویس نیازمند تایید (DRAFT)'}
                </span>
              </div>
              <p className="text-xs text-blue-700">
                {baseline.approvedAt ? `تاریخ تصویب: ${new Date(baseline.approvedAt).toLocaleDateString('fa-IR')}` : 'در انتظار تایید رسمی ناظر و کارفرما'} | برنامه زمان‌بندی: {baseline.plannedStartDate || 'نامشخص'} الی {baseline.plannedCompletionDate || 'نامشخص'}
              </p>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-xs text-gray-500 block">مبلغ مصوب اولیه خط مبنا:</span>
                <span className="font-black text-gray-900">{formatMoney(baseline.contractValue, baseline.currency)}</span>
              </div>
              <div className="h-8 w-px bg-blue-200"></div>
              <div>
                <span className="text-xs text-gray-500 block">مبلغ جاری قرارداد (با الحاقیه‌ها):</span>
                <span className="font-black text-indigo-700">{formatMoney(contracts[0]?.revisedContractValue || contracts[0]?.contractValue || baseline.contractValue, contracts[0]?.currency)}</span>
              </div>

              {baseline.status !== 'APPROVED' && (
                <button
                  onClick={handleApproveBaseline}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  تایید رسمی خط مبنا (Approve Baseline)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-800">قراردادی منعقد نشده است</h3>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
            {winningBid 
              ? 'پیشنهاد پیمانکار منتخب نهایی شده است. با کلیک بر روی دکمه عقد قرارداد بالا، پیش‌نویس کامل قرارداد و مایلستون‌های اجرایی ایجاد می‌شوند.'
              : 'پس از اتمام فرایند استعلام و انتخاب پیشنهاد برنده در تب «پیشنهادهای مناقصه»، قرارداد پروژه تشکیل خواهد شد.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {contracts.map(contract => {
            const contractParties = parties[contract.id] || [];
            const relatedCRs = changeRequests.filter(cr => cr.contractId === contract.id);
            const contractRevs = revisions[contract.id] || [];
            const isTemplate = Boolean(contract.isTemplateTerms);

            return (
              <div key={contract.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Template Disclaimer Banner */}
                {isTemplate && (
                  <div className="bg-amber-50 border-b border-amber-200 p-4 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5 text-amber-900 text-xs">
                      <AlertCircle className="text-amber-600 shrink-0" size={18} />
                      <div>
                        <span className="font-bold block text-sm">SUGGESTED TEMPLATE — NOT CONTRACTUAL DATA</span>
                        <span>مفاد مالی و حقوقی این قرارداد از الگوی پیشنهادی بارگذاری شده‌اند و نیازمند بررسی و تایید صریح طرفین قبل از امضا و اجرا می‌باشند.</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openTermsModal(contract)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      بررسی و تایید شرایط قرارداد
                    </button>
                  </div>
                )}

                {/* Contract Card Header */}
                <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-start gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-900 text-lg">{contract.title}</h3>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                          contract.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          contract.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          contract.status === 'SIGNED' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                          contract.status === 'READY_TO_SIGN' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          contract.status === 'PENDING_SIGNATURE' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          contract.status === 'UNDER_REVIEW' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {contract.status === 'ACTIVE' ? 'قرارداد نافذ و فعال (ACTIVE)' :
                           contract.status === 'SIGNED' ? 'بارگذاری اسکن امضاشده (SIGNED - نیازمند تایید)' :
                           contract.status === 'READY_TO_SIGN' ? 'آماده امضای خارج سامانه (READY TO SIGN)' :
                           contract.status === 'PENDING_SIGNATURE' ? 'در انتظار امضای فیزیکی طرفین' :
                           contract.status === 'UNDER_REVIEW' ? 'در حال بازبینی حقوقی (UNDER REVIEW)' :
                           contract.status === 'DRAFT' ? 'پیش‌نویس قرارداد (DRAFT)' :
                           contract.status === 'COMPLETED' ? 'تکمیل و تحویل نهایی' : contract.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-4 mt-1.5">
                        <span>شناسه پیمان: <strong className="font-mono text-gray-700">{contract.contractCode}</strong></span>
                        <span>نوع پیمان: <strong>{contract.contractType}</strong></span>
                        <span>نسخه/بازنگری: <strong>Rev {contract.currentRevisionNumber || 1}</strong></span>
                        <span>تاریخ ایجاد: <strong>{new Date(contract.createdAt).toLocaleDateString('fa-IR')}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isTemplate && (
                      <button
                        onClick={() => openTermsModal(contract)}
                        className="px-3.5 py-2 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5"
                      >
                        ویرایش شرایط
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveContractForCR(contract.id);
                        setShowCRModal(true);
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-gray-300"
                    >
                      <Plus size={14} />
                      ثبت دستور تغییر کار (CR)
                    </button>
                  </div>
                </div>

                {/* Contract Body Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/50 border-b border-gray-100 text-sm">
                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 block mb-1">مبلغ پیمان (اصلی و جاری)</span>
                    <span className="font-bold text-gray-900 text-base">
                      {formatMoney(contract.revisedContractValue || contract.contractValue, contract.currency)}
                    </span>
                    {contract.revisedContractValue && contract.revisedContractValue !== contract.contractValue && (
                      <div className="text-xs text-indigo-600 mt-0.5">
                        مبلغ اولیه: {formatMoney(contract.contractValue, contract.currency)}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 block mb-1">پیش‌پرداخت و حسن انجام کار</span>
                    <span className="font-bold text-gray-900">
                      پیش‌پرداخت: {contract.advancePaymentPercent !== undefined ? `${contract.advancePaymentPercent}٪` : 'تعیین نشده'} | سپرده: {contract.retentionPercent !== undefined ? `${contract.retentionPercent}٪` : 'تعیین نشده'}
                    </span>
                    <div className="text-xs text-gray-400 mt-1">ضمانتنامه معتبر حسن اجرای تعهدات</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 block mb-1">دوره گارانتی و خسارت تأخیر</span>
                    <span className="font-bold text-gray-900">
                      گارانتی: {contract.warrantyPeriodMonths !== undefined ? `${contract.warrantyPeriodMonths} ماهه` : 'تعیین نشده'}
                    </span>
                    <div className="text-xs text-gray-400 mt-1">
                      خسارت تأخیر: {contract.liquidatedDamagesPerDayPercent !== undefined ? `${contract.liquidatedDamagesPerDayPercent}٪ روزانه` : 'بر اساس شرایط عمومی'}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 block mb-1">بازه زمانی اجرا</span>
                    <span className="font-bold text-gray-900">
                      {contract.plannedStartDate || 'تعیین نشده'} الی {contract.plannedCompletionDate || 'تعیین نشده'}
                    </span>
                    <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <Clock size={12} /> کنترل بر اساس مایلستون‌های تفصیلی
                    </div>
                  </div>
                </div>

                {/* Official External Signing Workflow Notice */}
                <div className="bg-amber-50 border-b border-amber-200 p-4 text-xs text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <strong className="block mb-0.5 text-amber-950 font-bold">فرآیند رسمی امضای قراردادهای اجرایی:</strong>
                      <span>قراردادها خارج از سامانه به صورت رسمی امضا و مبادله می‌شوند. نسخه اسکن‌شده جهت بایگانی و فعال‌سازی پروژه بارگذاری می‌گردد. سامانه هوشیار انرژی صادرکننده گواهی امضای الکترونیک دیجیتال نیست.</span>
                    </div>
                  </div>

                  {/* Workflow Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {(contract.status === 'DRAFT' || contract.status === 'UNDER_REVIEW') && (
                      <button
                        onClick={() => handleMarkReadyToSign(contract.id)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                      >
                        <FileCheck size={14} />
                        آماده‌سازی برای امضای خارج سامانه
                      </button>
                    )}

                    {contract.status === 'READY_TO_SIGN' && (
                      <button
                        onClick={() => {
                          setUploadContractId(contract.id);
                          setShowUploadModal(true);
                        }}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                      >
                        <FileText size={14} />
                        بارگذاری اسکن نسخه امضا شده فیزیکی
                      </button>
                    )}

                    {(contract.status === 'SIGNED' || (contract.signedDocumentId && contract.status !== 'ACTIVE')) && (
                      <button
                        onClick={() => handleConfirmSignedDocument(contract.id)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                        تایید صحت امضا و فعال‌سازی قرارداد
                      </button>
                    )}

                    {contract.status === 'ACTIVE' && (
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">
                        <CheckCircle size={14} />
                        قرارداد رسمی تایید و فعال شده است
                      </div>
                    )}
                  </div>
                </div>

                {/* Contract Parties & Signing Status */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                      <Building size={16} className="text-blue-600" />
                      طرفین قرارداد و نمایندگان رسمی (Contract Parties & Representatives)
                    </h4>
                    <div className="space-y-3 text-xs">
                      {contractParties.length > 0 ? (
                        contractParties.map(p => (
                          <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                            <div>
                              <div className="font-bold text-gray-800">
                                {p.partyType === 'CLIENT' ? 'کارفرما (Client):' : 'مجری EPC (Contractor):'}
                                <span className="font-normal mr-1.5 text-gray-700">{p.legalName}</span>
                              </div>
                              {p.representativeName && (
                                <span className="text-gray-500 block mt-0.5">نماینده مجاز حقوقی: {p.representativeName}</span>
                              )}
                              {p.signedAt && (
                                <span className="text-emerald-600 block mt-0.5">
                                  تایید صحت امضا در {new Date(p.signedAt).toLocaleDateString('fa-IR')}
                                </span>
                              )}
                            </div>
                            <div>
                              {p.signStatus === 'SIGNED' ? (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                                  <CheckCircle size={12} /> امضا شده در نسخه فیزیکی
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-300 rounded-lg text-xs font-medium flex items-center gap-1">
                                  <Clock size={12} /> در انتظار امضا و مبادله نسخه فیزیکی
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 p-2">طرفین قرارداد ثبت نشده‌اند.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-600" />
                      موضوع و شرایط مالی قرارداد
                    </h4>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed space-y-2">
                      <p><strong>موضوع پیمان:</strong> {contract.scopeSummary || 'احداث، طراحی، تأمین و راه‌اندازی نیروگاه خورشیدی بر مبنای استانداردهای ساتبا'}</p>
                      <p><strong>شرایط پرداخت:</strong> {contract.paymentTermsSummary || 'بر مبنای پیشرفت فیزیکی مایلستون‌های تایید شده توسط ناظر'}</p>
                    </div>
                  </div>
                </div>

                {/* Contract Revisions History */}
                {contractRevs.length > 0 && (
                  <div className="p-6 bg-slate-50 border-b border-gray-200">
                    <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                      <History size={16} className="text-indigo-600" />
                      تاریخچه بازنگری‌ها و الحاقیه‌های مصوب (Contract Revisions Audit Trail)
                    </h4>
                    <div className="space-y-2">
                      {contractRevs.map(r => (
                        <div key={r.id} className="bg-white p-3 rounded-xl border border-gray-200 flex flex-wrap justify-between items-center text-xs gap-3">
                          <div>
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono ml-2">
                              Rev {r.revisionNumber}
                            </span>
                            <span className="font-bold text-gray-800">{r.changesSummary || r.reason}</span>
                            <span className="text-gray-400 mr-3">تاریخ: {new Date(r.createdAt).toLocaleDateString('fa-IR')}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-gray-500">قبل: {formatMoney(r.contractValueBefore || 0, contract.currency)}</span>
                            <span className="text-gray-400">←</span>
                            <span className="font-bold text-emerald-700">بعد: {formatMoney(r.contractValueAfter || 0, contract.currency)}</span>
                            {r.scheduleImpactDays ? <span className="text-amber-700 font-sans">(+{r.scheduleImpactDays} روز)</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change Requests Section */}
                <div className="p-6 bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Sliders size={16} className="text-amber-600" />
                      دستور تغییر کار و الحاقیه‌ها (Variations & Change Requests)
                    </h4>
                    <span className="text-xs text-gray-500">تعداد الحاقیه‌ها: {relatedCRs.length}</span>
                  </div>

                  {relatedCRs.length === 0 ? (
                    <div className="text-xs text-gray-400 bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                      تاکنون هیچ دستور تغییر کار یا افزایشی برای این قرارداد صادر نشده است.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {relatedCRs.map(cr => (
                        <div key={cr.id} className="flex flex-wrap justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 gap-4 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800 text-sm">{cr.title}</span>
                              <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono">{cr.crCode}</span>
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                cr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                cr.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {cr.status === 'APPROVED' ? 'مصوب و ثبت در بازنگری قرارداد' :
                                 cr.status === 'REJECTED' ? 'رد شده' : 'در انتظار بررسی نظارت'}
                              </span>
                            </div>
                            <p className="text-gray-500 mt-1">{cr.description}</p>
                          </div>

                          <div className="flex items-center gap-6">
                            <div>
                              <span className="text-gray-400 block">اثر مالی:</span>
                              <span className="font-bold text-gray-900">{formatMoney(cr.costImpactAmount || cr.costImpact || 0, contract.currency)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">اثر زمانی:</span>
                              <span className="font-bold text-gray-900">{cr.scheduleImpactDays} روز</span>
                            </div>
                            {cr.status === 'SUBMITTED' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateCRStatus(cr.id, 'APPROVED')}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                  تصویب و ایجاد بازنگری
                                </button>
                                <button
                                  onClick={() => handleUpdateCRStatus(cr.id, 'REJECTED')}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition-colors"
                                >
                                  رد
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm / Edit Terms Modal */}
      {contractToEditTerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button 
              onClick={() => setContractToEditTerms(null)}
              className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">تایید و تدقیق شرایط حقوقی و مالی قرارداد</h3>
            <p className="text-xs text-gray-500 mb-4">
              بررسی و ثبت شرایط پرداخت توافق شده میان کارفرما و پیمانکار منتخب جهت جایگزینی الگوی پیشنهادی.
            </p>

            <form onSubmit={handleConfirmTerms} className="space-y-4 text-right text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">درصد پیش‌پرداخت (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editAdvance}
                    onChange={e => setEditAdvance(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">سپرده حسن انجام کار (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editRetention}
                    onChange={e => setEditRetention(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">دوره گارانتی تجهیزات و عملکرد (ماه)</label>
                <input
                  type="number"
                  min="0"
                  value={editWarranty}
                  onChange={e => setEditWarranty(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">شرح مفصل شرایط و مراحل پرداخت</label>
                <textarea
                  rows={3}
                  value={editPaymentTerms}
                  onChange={e => setEditPaymentTerms(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setContractToEditTerms(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  تایید و ذخیره شرایط نهایی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Change Request Modal */}
      {showCRModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button 
              onClick={() => setShowCRModal(false)}
              className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">ثبت دستور تغییر کار (Change Request)</h3>
            <p className="text-xs text-gray-500 mb-4">هرگونه تغییر در احجام عملیات، نقشه یا مشخصات فنی که دارای اثر مالی یا زمانی باشد.</p>

            <form onSubmit={handleCreateChangeRequest} className="space-y-4 text-right">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان تغییر</label>
                <input 
                  type="text" 
                  value={crTitle} 
                  onChange={e => setCrTitle(e.target.value)}
                  placeholder="مثال: تغییر نوع فونداسیون به علت سنگی بودن لایه‌های زیرین زمین"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">علت و منشأ دستور تغییر</label>
                <select 
                  value={crReason} 
                  onChange={e => setCrReason(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="SITE_CONDITIONS">شرایط ژئوتکنیک و محیطی کارگاه (Site Conditions)</option>
                  <option value="DESIGN_CHANGE">اصلاح مهندسی و بهینه‌سازی فنی (Design Optimization)</option>
                  <option value="CLIENT_REQUEST">درخواست کارفرما (Client Request)</option>
                  <option value="REGULATORY">دستورالعمل‌های جدید برق منطقه‌ای/ساتبا (Regulatory)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شرح تفصیلی تغییر و مشخصات اقلام</label>
                <textarea 
                  value={crDescription} 
                  onChange={e => setCrDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اثر مالی (ریال)</label>
                  <input 
                    type="number" 
                    value={crCostImpact} 
                    onChange={e => setCrCostImpact(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="text-xs text-gray-400 mt-1">مبلغ به ریال (می‌تواند مثبت یا منفی باشد)</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اثر بر برنامه زمانی (روز)</label>
                  <input 
                    type="number" 
                    value={crScheduleImpactDays} 
                    onChange={e => setCrScheduleImpactDays(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="text-xs text-gray-400 mt-1">تمدید مجاز پیمان به روز</div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCRModal(false)}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !crTitle.trim()}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                  ثبت برای بررسی و تصویب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scanned Signed Contract Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button 
              onClick={() => {
                setShowUploadModal(false);
                setUploadContractId(null);
              }}
              className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">بارگذاری اسکن قرارداد امضاشده فیزیکی</h3>
            <p className="text-xs text-gray-500 mb-4">
              لطفاً فایل PDF یا تصویر اسکن‌شده از نسخه چاپی با مهر و امضای معتبر طرفین را جهت آرشیو حقوقی و فعال‌سازی پروژه بارگذاری نمایید.
            </p>

            <form onSubmit={handleUploadSignedDocument} className="space-y-4 text-right">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نشانی اینترنتی یا مسیر فایل سند (File URL / Path)</label>
                <input 
                  type="text" 
                  value={uploadFileUrl} 
                  onChange={e => setUploadFileUrl(e.target.value)}
                  placeholder="https://storage.example.com/contracts/signed_epc_contract.pdf"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  required
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  پس از بارگذاری، نسخه اسکن‌شده به عنوان سند بایگانی پیوست شده و توسط کارفرما بررسی و تایید می‌گردد.
                </span>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadContractId(null);
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !uploadFileUrl.trim()}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <FileCheck size={16} />}
                  ثبت سند و ارسال برای تایید کارفرما
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
