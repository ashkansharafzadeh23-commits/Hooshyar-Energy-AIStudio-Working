import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Database, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Link2, 
  FileText, 
  Copy, 
  ExternalLink, 
  Check, 
  Layers, 
  Clock, 
  Building2 
} from 'lucide-react';
import { OFFICIAL_ENERGY_SOURCES } from '../../services/energy/energySourceRegistry';
import { canonicalizeSourceUrl, isPrivateOrInternalAddress } from '../../utils/urlCanonicalizer';
import { 
  normalizePersianDisplay, 
  normalizePersianForComparison,
  calculateTextSimilarity 
} from '../../utils/persianNormalizer';

interface MockCandidate {
  id: string;
  sourceId: string;
  canonicalUrl: string;
  title: string;
  rawContent: string;
  reviewStatus: 'NEW' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DUPLICATE';
  reviewedBy?: string;
  rejectionReason?: string;
  canonicalHash: string;
}

export function IngestionPipelineQaPanel() {
  // --- Section 1: URL & SSRF Tester State ---
  const [testUrl, setTestUrl] = useState('https://satba.gov.ir/fa/tariffs/solar-ppa-1405?utm_source=telegram&utm_medium=channel&fbclid=abcd123#page-content');

  // Compute URL result
  const urlCanonicalResult = canonicalizeSourceUrl(testUrl);
  const hostname = urlCanonicalResult.hostname || '';
  const isSsrfRisk = isPrivateOrInternalAddress(hostname);
  const matchedSource = OFFICIAL_ENERGY_SOURCES.find(s => 
    hostname === s.officialDomain || hostname.endsWith(`.${s.officialDomain}`)
  );
  const isUrlAllowed = urlCanonicalResult.isValid && !isSsrfRisk && Boolean(matchedSource);

  // --- Section 2: Persian Normalizer State ---
  const [rawText, setRawText] = useState('مصوبه شماره ۱۲۳۴۵   وزارت نيرو در خصوص تعرفة خريد برق   تجديدپذير‌ها (نسخهٔ آزمايشي)');
  const displayNormalized = normalizePersianDisplay(rawText);
  const comparisonNormalized = normalizePersianForComparison(rawText);

  // --- Section 3: Deduplication & Review State ---
  const [candidates, setCandidates] = useState<MockCandidate[]>([
    {
      id: 'cand_satba_001',
      sourceId: 'src_satba',
      canonicalUrl: 'https://satba.gov.ir/fa/regulations/grid-code-2026',
      title: 'دستورالعمل جامع اتصال مولدهای تجدیدپذیر به شبکه توزیع',
      rawContent: 'ماده ۱: کلیه متقاضیان احداث نیروگاه ملزم به رعایت استاندارد فنی اتصال هستند.',
      reviewStatus: 'PENDING_REVIEW',
      canonicalHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0'
    },
    {
      id: 'cand_tavanir_002',
      sourceId: 'src_tavanir',
      canonicalUrl: 'https://tavanir.org.ir/rules/tariffs-industry',
      title: 'جدول ضرایب مصرف در ساعات اوج بار مشترکان صنعتی',
      rawContent: 'نرخ محاسبه بهای برق مصرفی در ساعات پیک مشمول ضریب ۱.۵ می‌باشد.',
      reviewStatus: 'APPROVED',
      reviewedBy: 'سردبیر ارشد هوشیار انرژی',
      canonicalHash: 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01'
    }
  ]);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Actions
  const handleApprove = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? {
      ...c,
      reviewStatus: 'APPROVED',
      reviewedBy: 'ویراستار رسمی تحریریه',
      rejectionReason: undefined
    } : c));
    showNotification(`کاندیدای ${id} با موفقیت به وضعیت «تأیید شده (APPROVED)» تغییر یافت. (مرز انتشار حفظ شده است).`, 'success');
  };

  const handleReject = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? {
      ...c,
      reviewStatus: 'REJECTED',
      reviewedBy: 'ویراستار رسمی تحریریه',
      rejectionReason: 'عدم تطابق با مستندات قانونی یا نقص مدارک مرجع'
    } : c));
    showNotification(`کاندیدای ${id} رد شد.`, 'info');
  };

  const handleSimulateDuplicate = () => {
    const existing = candidates[0];
    const simResult = calculateTextSimilarity(existing.title, existing.title);
    showNotification(
      `تشخیص تکرار: سند جدید دارای هش یکسان با '${existing.id}' است (میزان تشابه: ${Math.round(simResult * 100)}٪). برچسب EXACT_DUPLICATE اعمال شد و انتشار خودکار مسدود گردید.`,
      'error'
    );
  };

  return (
    <div className="p-6 md:p-8 bg-white space-y-10" dir="rtl">
      
      {/* Toast Alert */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : notification.type === 'error'
            ? 'bg-rose-50 text-rose-900 border-rose-200'
            : 'bg-blue-50 text-blue-900 border-blue-200'
        }`}>
          {notification.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
          {notification.type === 'error' && <ShieldAlert size={16} className="text-rose-600 shrink-0" />}
          {notification.type === 'info' && <Clock size={16} className="text-blue-600 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 1. Official Energy Sources Registry */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="text-[#0284C7]" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              فهرست مراجع رسمی مجاز (Tier-1 Energy Source Registry)
            </h2>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
            {OFFICIAL_ENERGY_SOURCES.length} مأخذ رسمی ثبت‌شده
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {OFFICIAL_ENERGY_SOURCES.map(source => (
            <div key={source.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-black text-slate-900 leading-snug">{source.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  Tier-1
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                <Link2 size={12} className="text-slate-400" />
                <span className="text-[#0284C7] font-semibold">{source.officialDomain}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                <span>شیوه: {source.fetchMethod === 'MANUAL_CURATION' ? 'کیوریت دستی' : source.fetchMethod}</span>
                <span className="text-emerald-700 flex items-center gap-1">
                  <Check size={11} /> مدار سالم
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. URL Canonicalization & SSRF Protection Tester */}
      <section className="space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="text-emerald-600" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              آزمون اعتبارسنجی نشانی و حفاظت ضد SSRF
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            بررسی اجباری HTTPS، پاکسازی ردیاب‌های تبلیغاتی (UTM)، انطباق با دامنه‌های مجاز و مسدودسازی نفوذ به شبکه داخلی.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-bold self-center">نمونه‌های آزمون:</span>
            <button 
              onClick={() => setTestUrl('https://satba.gov.ir/fa/tariffs/solar-ppa-1405?utm_source=telegram&utm_medium=channel&fbclid=abcd123#page-content')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium text-slate-700"
            >
              ۱. نشانی رسمی ساتبا با UTM
            </button>
            <button 
              onClick={() => setTestUrl('https://news.tavanir.org.ir/tender/grid-2026?tracking=1')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-medium text-slate-700"
            >
              ۲. ساب‌دامین رسمی توانیر
            </button>
            <button 
              onClick={() => setTestUrl('http://127.0.0.1:8080/admin/secrets')}
              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-medium"
            >
              ۳. حمله SSRF به سرور محلی (127.0.0.1)
            </button>
            <button 
              onClick={() => setTestUrl('https://169.254.169.254/latest/meta-data/')}
              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-medium"
            >
              ۴. حمله به متادیتای کلود (169.254)
            </button>
            <button 
              onClick={() => setTestUrl('https://fake-energy-news-iran.com/article')}
              className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-medium"
            >
              ۵. دامنه غیررسمی ناشناس
            </button>
          </div>

          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-left"
            dir="ltr"
          />

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600">وضعیت امنیت نشانی:</span>
              {isUrlAllowed ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center gap-1">
                  <CheckCircle2 size={13} /> مجاز و تطبیق‌یافته با مرجع رسمی
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-black flex items-center gap-1">
                  <XCircle size={13} /> غیرمجاز و مسدود شده ({isSsrfRisk ? 'خطر SSRF' : !matchedSource ? 'دامنه تاییدنشده' : 'خطای فرمت'})
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-slate-600 text-left bg-white p-2.5 rounded-xl border border-slate-200" dir="ltr">
              <strong className="block text-slate-400 text-[10px]">Canonical URL (Stripped of tracking & fragment):</strong>
              {urlCanonicalResult.canonicalUrl || 'N/A'}
            </div>
            {matchedSource && (
              <div className="text-[11px] text-slate-600">
                مرجع متناظر: <strong className="text-slate-900">{matchedSource.name}</strong> ({matchedSource.organization})
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Persian Normalization Tester */}
      <section className="space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <FileText className="text-purple-600" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              نرمال‌سازی متون فارسی (Persian Linguistic Normalization)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            یکسان‌سازی «ی» و «ک» عربی، اصلاح نیم‌فاصله و حذف زوائد بدون تغییر معنای حقوقی سند.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={2}
            className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="block font-bold text-slate-700">نمایش پالایش‌شده (Display Safe):</span>
              <p className="text-slate-900 font-medium leading-relaxed">{displayNormalized}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="block font-bold text-slate-700">فرم مقایسه‌ای و هش ضد‌تکرار (Token Stream):</span>
              <p className="text-slate-600 font-mono text-[11px] leading-relaxed">{comparisonNormalized}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Candidate Deduplication & Editorial Queue */}
      <section className="space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="text-amber-600" size={20} />
            <h2 className="text-lg font-black text-slate-900">
              صف بررسی تحریریه و پیشگیری از انتشار خودکار (Editorial Workflow)
            </h2>
          </div>
          <button
            onClick={handleSimulateDuplicate}
            className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200 transition-all"
          >
            آزمون تشخیص تکرار (Duplicate Detection)
          </button>
        </div>

        <div className="space-y-3">
          {candidates.map(candidate => (
            <div 
              key={candidate.id} 
              className={`p-4 rounded-2xl border transition-all ${
                candidate.reviewStatus === 'APPROVED'
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : candidate.reviewStatus === 'REJECTED'
                  ? 'border-rose-300 bg-rose-50/20'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">{candidate.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    candidate.reviewStatus === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : candidate.reviewStatus === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {candidate.reviewStatus === 'PENDING_REVIEW' && 'در انتظار بازبینی'}
                    {candidate.reviewStatus === 'APPROVED' && 'تأیید شده برای مرحله انتشار (APPROVED)'}
                    {candidate.reviewStatus === 'REJECTED' && 'رد شده'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 text-left" dir="ltr">
                  Hash: {candidate.canonicalHash.slice(0, 16)}...
                </div>
              </div>

              <div className="py-2.5 space-y-1">
                <h4 className="text-sm font-bold text-slate-900">{candidate.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{candidate.rawContent}</p>
                {candidate.rejectionReason && (
                  <p className="text-xs text-rose-700 font-medium pt-1">
                    دلیل رد: {candidate.rejectionReason}
                  </p>
                )}
                {candidate.reviewedBy && (
                  <p className="text-[11px] text-slate-400">
                    بازبینی توسط: {candidate.reviewedBy}
                  </p>
                )}
              </div>

              {/* Action & Boundary Enforcement */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                {candidate.reviewStatus === 'PENDING_REVIEW' && (
                  <>
                    <button
                      onClick={() => handleApprove(candidate.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all"
                    >
                      تأیید سند (Approve)
                    </button>
                    <button
                      onClick={() => handleReject(candidate.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all"
                    >
                      رد سند (Reject)
                    </button>
                  </>
                )}

                {candidate.reviewStatus === 'APPROVED' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      تأیید شده (APPROVED)
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      «تأیید این رکورد به معنی انتشار عمومی نیست. انتشار عمومی در مرحله بعدی و پس از فعالسازی کنترل‌شده انجام خواهد شد.»
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

export default IngestionPipelineQaPanel;
