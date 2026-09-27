import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Star, 
  Settings, 
  LogOut, 
  Briefcase, 
  CheckCircle, 
  FileText, 
  TrendingUp, 
  Clock, 
  Send,
  Award,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ProjectRFQ, EPCBid } from '../types/rfq.js';
import { Organization } from '../types/organization.js';

const mockData = [
  { name: 'فروردین', projects: 2, income: 400 },
  { name: 'اردیبهشت', projects: 3, income: 600 },
  { name: 'خرداد', projects: 2, income: 500 },
  { name: 'تیر', projects: 5, income: 900 },
  { name: 'مرداد', projects: 4, income: 750 },
];

export default function ContractorDashboard() {
  const [activeTab, setActiveTab] = useState('rfqs');
  const [requests, setRequests] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  // RFQ & Bidding State (Phase 1)
  const [openRfqs, setOpenRfqs] = useState<ProjectRFQ[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [epcOrgs, setEpcOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('org_epc_001');
  const [myBids, setMyBids] = useState<EPCBid[]>([]);
  
  // Submit Bid Modal
  const [biddingRfq, setBiddingRfq] = useState<ProjectRFQ | null>(null);
  const [bidPriceToman, setBidPriceToman] = useState<number>(350); // in Million Toman
  const [bidYieldMwh, setBidYieldMwh] = useState<number>(180);
  const [bidTimelineDays, setBidTimelineDays] = useState<number>(60);
  const [bidWarrantyYears, setBidWarrantyYears] = useState<number>(5);
  const [panelBrand, setPanelBrand] = useState('Longi Solar 550W Tier 1');
  const [inverterBrand, setInverterBrand] = useState('Sungrow String Inverter');
  const [rackingType, setRackingType] = useState('گالوانیزه گرم مقاوم در برابر باد ۱۲۰ کیلومتر');
  const [monitoringIncluded, setMonitoringIncluded] = useState(true);
  const [bidNotes, setBidNotes] = useState('تجهیزات طبق آخرین استانداردهای فنی مهندسی با گارانتی تعویض و بیمه مسئولیت تحویل خواهد شد.');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Revise Bid Modal
  const [revisingBid, setRevisingBid] = useState<EPCBid | null>(null);
  const [revisePriceToman, setRevisePriceToman] = useState<number>(330);
  const [reviseYieldMwh, setReviseYieldMwh] = useState<number>(185);
  const [reviseTimelineDays, setReviseTimelineDays] = useState<number>(55);
  const [reviseWarrantyYears, setReviseWarrantyYears] = useState<number>(7);
  const [reviseReason, setReviseReason] = useState('تخفیف ویژه مهندسی و ارتقای دوره گارانتی');

  useEffect(() => {
    // 1. Legacy local requests
    try {
      const stored = localStorage.getItem('epc_requests');
      if (stored) {
        setRequests(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Load open RFQs and EPC organizations
    loadEpcData();
  }, []);

  const loadEpcData = async () => {
    setLoadingRfqs(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch open RFQs
      const rfqRes = await fetch('/api/rfq/opportunities/open', { headers });
      if (rfqRes.ok) {
        const rfqs = await rfqRes.json();
        setOpenRfqs(Array.isArray(rfqs) ? rfqs : []);
      }

      // Fetch verified EPC orgs
      const orgRes = await fetch('/api/rfq/organizations/epc', { headers });
      if (orgRes.ok) {
        const orgs = await orgRes.json();
        setEpcOrgs(Array.isArray(orgs) ? orgs : []);
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading EPC data', err);
    } finally {
      setLoadingRfqs(false);
    }
  };

  const handleOpenBidModal = (rfq: ProjectRFQ) => {
    setBiddingRfq(rfq);
    // Sensible defaults based on RFQ
    if (rfq.commercialTerms?.minWarrantyYears) {
      setBidWarrantyYears(rfq.commercialTerms.minWarrantyYears);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biddingRfq) return;

    setSubmittingBid(true);
    setFeedbackMessage(null);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        epcOrganizationId: selectedOrgId,
        proposedPriceIRR: Number(bidPriceToman) * 10000000, // Toman to IRR
        guaranteedAnnualYieldMwh: Number(bidYieldMwh),
        timelineDays: Number(bidTimelineDays),
        warrantyYears: Number(bidWarrantyYears),
        equipmentSpecs: {
          panelBrand,
          inverterBrand,
          rackingType,
          monitoringIncluded
        },
        paymentTerms: '۲۰٪ پیش‌پرداخت، ۶۰٪ متناسب با تحویل تجهیزات، ۲۰٪ پس از راه‌اندازی و اتصال به شبکه',
        notes: bidNotes
      };

      const res = await fetch(`/api/rfq/${biddingRfq.id}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newBid = await res.json();
        setMyBids(prev => [newBid, ...prev]);
        setBiddingRfq(null);
        setFeedbackMessage({
          type: 'success',
          text: `پیشنهاد شما با کد رسمی ${newBid.bidCode} با موفقیت ثبت شد! امتیاز اولیه: ${newBid.score?.totalScore?.toFixed(1) || '-'}/۱۰۰`
        });
        setActiveTab('my_bids');
      } else {
        const err = await res.json();
        setFeedbackMessage({ type: 'error', text: err.error || 'خطا در ثبت پیشنهاد' });
      }
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleOpenReviseModal = (bid: EPCBid) => {
    setRevisingBid(bid);
    setRevisePriceToman(Math.round(bid.proposedPriceIRR / 10000000));
    setReviseYieldMwh(bid.guaranteedAnnualYieldMwh);
    setReviseTimelineDays(bid.timelineDays);
    setReviseWarrantyYears(bid.warrantyYears);
  };

  const handleReviseBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingBid) return;

    setSubmittingBid(true);
    setFeedbackMessage(null);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        proposedPriceIRR: Number(revisePriceToman) * 10000000,
        guaranteedAnnualYieldMwh: Number(reviseYieldMwh),
        timelineDays: Number(reviseTimelineDays),
        warrantyYears: Number(reviseWarrantyYears),
        reasonForRevision: reviseReason
      };

      const res = await fetch(`/api/rfq/bids/${revisingBid.id}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedBid = await res.json();
        setMyBids(prev => prev.map(b => b.id === updatedBid.id ? updatedBid : b));
        setRevisingBid(null);
        setFeedbackMessage({
          type: 'success',
          text: `نسخه اصلاحیه پیشنهاد ${updatedBid.bidCode} با موفقیت ثبت شد. امتیاز جدید: ${updatedBid.score?.totalScore?.toFixed(1)}/۱۰۰`
        });
      } else {
        const err = await res.json();
        setFeedbackMessage({ type: 'error', text: err.error || 'خطا در ارسال اصلاحیه' });
      }
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: 'خطا در برقراری ارتباط با سرور' });
    } finally {
      setSubmittingBid(false);
    }
  };

  const currentOrg = epcOrgs.find(o => o.id === selectedOrgId) || epcOrgs[0];

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-Vazirmatn flex flex-col md:flex-row pb-20 md:pb-0" dir="rtl">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-white border-l border-gray-200 p-6 flex flex-col hidden md:flex shrink-0 min-h-screen sticky top-0">
        <div className="flex flex-col items-center mb-6 border-b border-gray-100 pb-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            <Building2 size={32} />
          </div>
          <h2 className="text-base font-black text-gray-800 text-center">
            {currentOrg?.tradeName || currentOrg?.legalName || 'پیمانکار رسمی EPC'}
          </h2>
          <div className="mt-2 flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
            <ShieldCheck size={14} className="text-amber-600" />
            مجری احراز صلاحیت شده
          </div>
        </div>

        {/* EPC Profile Selector */}
        {epcOrgs.length > 1 && (
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-gray-500 mb-1">پروفایل فعال EPC:</label>
            <select 
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
              className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl p-2 outline-none"
            >
              {epcOrgs.map(org => (
                <option key={org.id} value={org.id}>
                  {org.tradeName || org.legalName}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="space-y-1.5 flex-1">
          <button 
            onClick={() => setActiveTab('rfqs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'rfqs' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Zap size={18} />
            استعلام‌ها و مناقصات (RFQ)
            {openRfqs.length > 0 && (
              <span className="mr-auto bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {openRfqs.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('my_bids')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'my_bids' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Award size={18} />
            پیشنهادهای ارسالی من
            {myBids.length > 0 && (
              <span className="mr-auto bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {myBids.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'overview' ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <TrendingUp size={18} />
            داشبورد و آمار
          </button>

          <button 
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors relative ${activeTab === 'requests' ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText size={18} />
            درخواست‌های خرد احداث
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'settings' ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings size={18} />
            تنظیمات و مدارک شرکت
          </button>
        </nav>

        <div className="pt-4 border-t border-gray-100 space-y-2">
          <Link to="/target-select" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors text-xs">
            تحلیل انرژی پروژه
          </Link>
          <button 
            onClick={() => { localStorage.removeItem('token'); window.location.href = '/'; }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors text-xs"
          >
            <LogOut size={16} />
            خروج از حساب
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              {activeTab === 'rfqs' && 'مناقصات و استعلام‌های باز نیروگاهی (RFQ)'}
              {activeTab === 'my_bids' && 'پیشنهادهای قیمت و فنی ارسال‌شده'}
              {activeTab === 'overview' && 'داشبورد مدیریتی EPC'}
              {activeTab === 'requests' && 'درخواست‌های احداث خرد'}
              {activeTab === 'settings' && 'تنظیمات حساب کاربری و احراز صلاحیت'}
            </h1>
            <p className="text-gray-500 mt-1 text-xs sm:text-sm">
              {activeTab === 'rfqs' && 'مشاهده پروژه‌های رسمی نیازمند پیمانکار EPC و ارسال پیشنهاد رقابتی'}
              {activeTab === 'my_bids' && 'پیگیری امتیازدهی قطعی سیستم، اصلاحیه پیشنهادات و نتایج استعلام‌ها'}
              {activeTab === 'overview' && 'نمودار عملکرد، پروژه‌های فعال و پایش شاخص‌های کلیدی'}
              {activeTab === 'requests' && 'درخواست‌های ثبت‌شده توسط کارفرمایان خانگی و صنعتی'}
              {activeTab === 'settings' && 'مدارک صلاحیت پیمانکاری، ظرفیت آزاد مجاز و مشخصات شرکت'}
            </p>
          </div>
        </header>

        {feedbackMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border mb-6 ${feedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {feedbackMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
            <span className="text-sm font-bold">{feedbackMessage.text}</span>
          </div>
        )}

        {/* OPEN RFQs TAB (PHASE 1) */}
        {activeTab === 'rfqs' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {loadingRfqs ? (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center font-bold text-gray-500">
                در حال دریافت مناقصات باز...
              </div>
            ) : openRfqs.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center py-16 shadow-sm">
                <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap size={36} />
                </div>
                <h3 className="text-lg font-black text-gray-800 mb-2">در حال حاضر استعلام بازی ثبت نشده است</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  به محض انتشار استعلام جدید توسط کارفرمایان یا دعوت اختصاصی از شرکت شما، پروژه‌ها در این فهرست نمایش داده می‌شوند.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {openRfqs.map((rfq) => {
                  const deadlineDate = new Date(rfq.submissionDeadline).toLocaleDateString('fa-IR');

                  return (
                    <div 
                      key={rfq.id} 
                      className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            {rfq.rfqCode}
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مناقصه باز (RFQ_OPEN)
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-gray-900">{rfq.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2 max-w-2xl leading-relaxed">
                          {rfq.scopeDescription}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={14} className="text-amber-500" />
                            مهلت ارسال: {deadlineDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            حداقل گارانتی: {rfq.commercialTerms?.minWarrantyYears || 5} سال
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap size={14} className="text-blue-500" />
                            راندمان پنل: حداقل ۲۱٪ (Tier 1)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button 
                          onClick={() => handleOpenBidModal(rfq)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-colors"
                        >
                          <Send size={16} />
                          ارسال پیشنهاد EPC
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* MY SUBMITTED BIDS TAB (PHASE 1) */}
        {activeTab === 'my_bids' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {myBids.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center py-16 shadow-sm">
                <Award size={40} className="mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">هنوز پیشنهادی ارسال نکرده‌اید</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
                  از منوی «استعلام‌ها و مناقصات»، پروژه‌های باز را بررسی کرده و پیشنهاد فنی و مالی خود را ارسال نمایید.
                </p>
                <button 
                  onClick={() => setActiveTab('rfqs')}
                  className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-600 transition-colors"
                >
                  مشاهده مناقصات
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myBids.map((bid) => {
                  const priceToman = Math.round(bid.proposedPriceIRR / 10000000);
                  const isAccepted = bid.status === 'ACCEPTED';

                  return (
                    <div 
                      key={bid.id} 
                      className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${
                        isAccepted ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                              {bid.bidCode}
                            </span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                              bid.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              bid.status === 'SHORTLISTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {bid.status === 'ACCEPTED' ? 'منتخب کارفرما (برنده)' :
                               bid.status === 'SHORTLISTED' ? 'فهرست نهایی' : 'ارسال شده'}
                            </span>
                            {bid.revisions && bid.revisions.length > 0 && (
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                نسخه {bid.revisions.length + 1}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-black text-gray-900 pt-1">
                            مبلغ کل: {priceToman.toLocaleString('fa-IR')} میلیون تومان
                          </h3>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-left md:text-right">
                            <span className="text-[10px] text-gray-400 block font-bold">امتیاز قطعی سیستم</span>
                            <span className="text-lg font-black text-blue-600">
                              {bid.score?.totalScore ? `${bid.score.totalScore.toFixed(1)} / ۱۰۰` : '-'}
                            </span>
                          </div>

                          {bid.status !== 'ACCEPTED' && bid.status !== 'REJECTED' && (
                            <button 
                              onClick={() => handleOpenReviseModal(bid)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Edit3 size={14} />
                              ارسال اصلاحیه (Revision)
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 text-xs border-b border-gray-100">
                        <div>
                          <span className="text-gray-400 block mb-0.5">تولید تضمینی:</span>
                          <span className="font-bold text-gray-800">{bid.guaranteedAnnualYieldMwh} MWh/سال</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-0.5">مدت زمان اجرا:</span>
                          <span className="font-bold text-gray-800">{bid.timelineDays} روز کاری</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-0.5">مدت گارانتی:</span>
                          <span className="font-bold text-gray-800">{bid.warrantyYears} سال</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block mb-0.5">برند پنل و اینورتر:</span>
                          <span className="font-bold text-gray-800">{bid.equipmentSpecs?.panelBrand || '-'} / {bid.equipmentSpecs?.inverterBrand || '-'}</span>
                        </div>
                      </div>

                      {bid.revisions && bid.revisions.length > 0 && (
                        <div className="pt-3">
                          <span className="text-[11px] font-bold text-gray-500 block mb-1">تاریخچه نسخه‌های اصلاحی:</span>
                          <div className="space-y-1">
                            {bid.revisions.map((rev) => (
                              <div key={rev.revisionNumber} className="bg-gray-50 p-2 rounded text-[11px] flex justify-between">
                                <span>نسخه {rev.revisionNumber}: {Math.round(rev.proposedPriceIRR / 10000000).toLocaleString('fa-IR')} میلیون تومان ({rev.reasonForRevision || 'اصلاح'})</span>
                                <span className="text-gray-400">{new Date(rev.createdAt).toLocaleDateString('fa-IR')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-600">مناقصات باز</h3>
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-800">{openRfqs.length}</div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-600">پیشنهادات ارسالی</h3>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Award size={20} />
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-800">{myBids.length}</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-600">پروژه‌های در حال اجرا</h3>
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-800">۲</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-600">امتیاز کیفی EPC</h3>
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                    <Star size={20} />
                  </div>
                </div>
                <div className="text-3xl font-black text-gray-800">۴.۸</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-6">روند درآمد و پروژه‌ها (شش ماه اخیر)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#a0aec0" />
                    <YAxis stroke="#a0aec0" />
                    <Tooltip />
                    <Area type="monotone" dataKey="income" stroke="#f59e0b" fill="#fef3c7" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {requests.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center py-16">
                <FileText size={40} className="mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-bold text-gray-800 mb-1">درخواستی یافت نشد</h3>
                <p className="text-gray-500 text-xs">در حال حاضر درخواست احداث جدیدی وجود ندارد.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-gray-800 text-base">درخواست احداث در {req.city}</h3>
                    <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl text-xs">
                    <div><span className="text-gray-400">متراژ:</span> <span className="font-bold">{req.area} مترمربع</span></div>
                    <div><span className="text-gray-400">سقف:</span> <span className="font-bold">{req.roofType}</span></div>
                    <div><span className="text-gray-400">بودجه:</span> <span className="font-bold">{req.budget} میلیون تومان</span></div>
                    <div><span className="text-gray-400">اتصال:</span> <span className="font-bold">{req.connectionType}</span></div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="text-amber-600" size={24} />
              مشخصات حقوقی و صلاحیت پیمانکار EPC
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">نام ثبتی شرکت</label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-800">
                  {currentOrg?.legalName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">نام تجاری</label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-800">
                  {currentOrg?.tradeName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">شماره ثبت</label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono font-bold text-gray-800">
                  {currentOrg?.registrationNumber}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">شناسه ملی</label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono font-bold text-gray-800">
                  {currentOrg?.nationalId}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">وضعیت احراز هویت</label>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  احراز هویت شده و معتبر (VERIFIED)
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">نوع سازمان</label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-800">
                  پیمانکار عمومی EPC نیروگاه خورشیدی
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* SUBMIT BID MODAL */}
      {biddingRfq && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {biddingRfq.rfqCode}
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  ارسال پیشنهاد فنی و مالی EPC
                </h3>
              </div>
              <button 
                onClick={() => setBiddingRfq(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">شرکت ارائه‌دهنده پیشنهاد (پروفایل EPC)</label>
                <select 
                  value={selectedOrgId}
                  onChange={e => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50"
                >
                  {epcOrgs.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.tradeName || org.legalName} (شناسه: {org.nationalId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">مبلغ کل پیشنهادی (میلیون تومان)</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={bidPriceToman}
                    onChange={e => setBidPriceToman(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-sm font-bold"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    معادل {(Number(bidPriceToman) * 10000000).toLocaleString('fa-IR')} ریال
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">تولید سالیانه تضمین‌شده (MWh/سال)</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    step="0.1"
                    value={bidYieldMwh}
                    onChange={e => setBidYieldMwh(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">مدت زمان اجرا و راه‌اندازی (روز کاری)</label>
                  <input 
                    type="number"
                    required
                    min={10}
                    value={bidTimelineDays}
                    onChange={e => setBidTimelineDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">مدت گارانتی و خدمات پس از فروش (سال)</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={bidWarrantyYears}
                    onChange={e => setBidWarrantyYears(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">برند و مدل پنل خورشیدی</label>
                  <input 
                    type="text"
                    required
                    value={panelBrand}
                    onChange={e => setPanelBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">برند و مدل اینورتر</label>
                  <input 
                    type="text"
                    required
                    value={inverterBrand}
                    onChange={e => setInverterBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">مشخصات سازه و استراکچر</label>
                <input 
                  type="text"
                  value={rackingType}
                  onChange={e => setRackingType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="monitoring"
                  checked={monitoringIncluded}
                  onChange={e => setMonitoringIncluded(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="monitoring" className="text-xs font-bold text-gray-700 cursor-pointer">
                  سیستم مانیتورینگ و دیتالاگر برخط (Online SCADA/IoT) شامل می‌شود
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">توضیحات تکمیلی پیشنهاد</label>
                <textarea 
                  rows={2}
                  value={bidNotes}
                  onChange={e => setBidNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setBiddingRfq(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-xs"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  disabled={submittingBid}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submittingBid ? 'در حال ارسال و امتیازدهی...' : 'ثبت و ارسال پیشنهاد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVISE BID MODAL */}
      {revisingBid && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {revisingBid.bidCode}
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  ارسال نسخه اصلاحیه پیشنهاد (Revision)
                </h3>
              </div>
              <button 
                onClick={() => setRevisingBid(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviseBid} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">مبلغ جدید (میلیون تومان)</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={revisePriceToman}
                    onChange={e => setRevisePriceToman(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">تولید تضمینی جدید (MWh/سال)</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    step="0.1"
                    value={reviseYieldMwh}
                    onChange={e => setReviseYieldMwh(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">مدت زمان اجرا (روز کاری)</label>
                  <input 
                    type="number"
                    required
                    min={10}
                    value={reviseTimelineDays}
                    onChange={e => setReviseTimelineDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">مدت گارانتی (سال)</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={reviseWarrantyYears}
                    onChange={e => setReviseWarrantyYears(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">دلیل اعمال اصلاحیه</label>
                <textarea 
                  rows={2}
                  required
                  value={reviseReason}
                  onChange={e => setReviseReason(e.target.value)}
                  placeholder="علت به‌روزرسانی قیمت یا شرایط را توضیح دهید..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-amber-500 outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setRevisingBid(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-xs"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  disabled={submittingBid}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submittingBid ? 'در حال ثبت...' : 'ثبت نسخه اصلاحی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('rfqs')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'rfqs' ? 'text-amber-600' : 'text-gray-500'}`}>
          <Zap size={20} />
          <span className="text-[10px] font-bold">مناقصات</span>
        </button>
        <button onClick={() => setActiveTab('my_bids')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'my_bids' ? 'text-amber-600' : 'text-gray-500'}`}>
          <Award size={20} />
          <span className="text-[10px] font-bold">پیشنهادها</span>
        </button>
        <button onClick={() => setActiveTab('overview')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'overview' ? 'text-amber-600' : 'text-gray-500'}`}>
          <TrendingUp size={20} />
          <span className="text-[10px] font-bold">داشبورد</span>
        </button>
        <button onClick={() => setActiveTab('requests')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'requests' ? 'text-amber-600' : 'text-gray-500'}`}>
          <FileText size={20} />
          <span className="text-[10px] font-bold">درخواست‌ها</span>
        </button>
      </div>
    </div>
  );
}
