import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Megaphone, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  ExternalLink, 
  ShieldAlert, 
  LogIn, 
  Calendar, 
  User, 
  Layers, 
  Tag, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AdminAd {
  id: string;
  ownerType: 'vendor' | 'professional';
  ownerId: string;
  title: string;
  imageUrl: string;
  linkTo: string;
  placement: string;
  startDate: string;
  endDate: string;
  status: 'pending_review' | 'active' | 'expired' | 'rejected';
  planId: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export default function AdminAdsReview() {
  const { user, token, activeRole } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Rejection modal state
  const [rejectingAd, setRejectingAd] = useState<AdminAd | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(activeRole?.toUpperCase() || '') ||
                  ['ADMIN', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase() || '') ||
                  (Array.isArray(user?.roles) && user.roles.some((r: string) => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase())));

  const fetchAds = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem('token');
      const res = await fetch('/api/ads/admin', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data.ads) ? data.ads : []);
      } else {
        showError('خطا در دریافت لیست آگهی‌های تبلیغاتی');
      }
    } catch (err) {
      showError('خطا در ارتباط با سرور جهت دریافت آگهی‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAds();
    }
  }, [isAdmin]);

  const handleApprove = async (ad: AdminAd) => {
    try {
      setActionLoadingId(ad.id);
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(`/api/ads/${ad.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ status: 'active' })
      });

      if (res.ok) {
        showSuccess(`آگهی "${ad.title}" با موفقیت تأیید و فعال گردید.`);
        fetchAds();
      } else {
        const errData = await res.json().catch(() => ({}));
        showError(errData.error || 'خطا در فعال‌سازی آگهی');
      }
    } catch (err) {
      showError('خطا در ارسال درخواست تأیید آگهی');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingAd) return;
    try {
      setActionLoadingId(rejectingAd.id);
      const authToken = token || localStorage.getItem('token');
      const res = await fetch(`/api/ads/${rejectingAd.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejectionReason: rejectionReason.trim() || 'عدم رعایت ضوابط تبلیغاتی'
        })
      });

      if (res.ok) {
        showSuccess(`آگهی "${rejectingAd.title}" رد گردید.`);
        setRejectingAd(null);
        setRejectionReason('');
        fetchAds();
      } else {
        const errData = await res.json().catch(() => ({}));
        showError(errData.error || 'خطا در رد آگهی');
      }
    } catch (err) {
      showError('خطا در ارسال درخواست رد آگهی');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 max-w-md mx-auto my-12">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
          <LogIn size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-slate-900">نیاز به ورود به حساب مدیریت</h2>
        <p className="text-slate-600 mb-6 text-sm">
          جهت مشاهده و بررسی آگهی‌های تبلیغاتی، لطفاً با حساب کاربری مدیر سامانه وارد شوید.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
        >
          ورود به سامانه
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-rose-200 p-8 max-w-md mx-auto my-12">
        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-rose-800">دسترسی مسدود است</h2>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
          حساب کاربری شما دارای مجوز مدیر ارشد سامانه (ADMIN) نمی‌باشد. این صفحه ویژه نظارت و تأیید کمپین‌های تبلیغاتی همکاران است.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    );
  }

  const filteredAds = ads.filter(ad => {
    if (filterStatus === 'all') return true;
    return ad.status === filterStatus;
  });

  const pendingCount = ads.filter(a => a.status === 'pending_review').length;
  const activeCount = ads.filter(a => a.status === 'active').length;
  const rejectedCount = ads.filter(a => a.status === 'rejected').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
              <Megaphone size={24} />
            </div>
            مدیریت و تأیید آگهی‌های تبلیغاتی
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            بررسی کیفی، پالایش پیوندها و فعال‌سازی کمپین‌های تبلیغاتی تأمین‌کنندگان و مجریان
          </p>
        </div>
        <button
          onClick={fetchAds}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          به‌روزرسانی لیست
        </button>
      </div>

      {/* Status Counters & Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-2xl border text-right transition-all ${
            filterStatus === 'all'
              ? 'border-amber-500 bg-amber-50/60 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-slate-500 font-medium">کل آگهی‌ها</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{ads.length}</div>
        </button>
        <button
          onClick={() => setFilterStatus('pending_review')}
          className={`p-4 rounded-2xl border text-right transition-all ${
            filterStatus === 'pending_review'
              ? 'border-amber-500 bg-amber-50/60 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
            <Clock size={14} />
            در انتظار بررسی
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</div>
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`p-4 rounded-2xl border text-right transition-all ${
            filterStatus === 'active'
              ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 size={14} />
            فعال و در حال نمایش
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
        </button>
        <button
          onClick={() => setFilterStatus('rejected')}
          className={`p-4 rounded-2xl border text-right transition-all ${
            filterStatus === 'rejected'
              ? 'border-rose-500 bg-rose-50/60 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
            <XCircle size={14} />
            رد شده / غیرمجاز
          </span>
          <div className="text-2xl font-black text-rose-700 mt-1">{rejectedCount}</div>
        </button>
      </div>

      {/* Ads List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">در حال واکشی آگهی‌های تبلیغاتی...</div>
      ) : filteredAds.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Megaphone size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">هیچ آگهی‌ای در این دسته‌بندی یافت نشد</h3>
          <p className="text-sm text-slate-500">
            {filterStatus === 'pending_review' 
              ? 'تمامی آگهی‌های ثبت‌شده تعیین تکلیف شده‌اند.' 
              : 'در حال حاضر آگهی با وضعیت انتخابی ثبت نشده است.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAds.map(ad => (
            <div 
              key={ad.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Media Preview Header */}
                <div className="h-44 relative bg-slate-100 overflow-hidden border-b border-slate-100">
                  {ad.imageUrl ? (
                    <img 
                      src={ad.imageUrl} 
                      alt={ad.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
                      ad.status === 'active'
                        ? 'bg-emerald-600 text-white'
                        : ad.status === 'rejected'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {ad.status === 'active' ? 'تأییدشده و فعال' : ad.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-md text-slate-700 shadow-xs">
                      جایگاه: {ad.placement}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      پلن: {ad.planId}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 mb-1">{ad.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={13} className="text-slate-400" />
                        مالک: {ad.ownerType === 'vendor' ? 'تأمین‌کننده' : 'متخصص/پیمانکار'}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        ID: {ad.ownerId ? ad.ownerId.slice(0, 8) + '...' : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Destination link */}
                  {ad.linkTo && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs flex items-center justify-between gap-2 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600 truncate">
                        <ExternalLink size={13} className="text-blue-500 shrink-0" />
                        <span className="truncate font-mono" dir="ltr">{ad.linkTo}</span>
                      </div>
                      <a 
                        href={ad.linkTo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-bold shrink-0 text-[11px]"
                      >
                        بررسی لینک
                      </a>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50/50 p-3 rounded-xl border border-slate-100/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span>شروع: {new Date(ad.startDate).toLocaleDateString('fa-IR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span>پایان: {new Date(ad.endDate).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>

                  {/* Rejection Note if rejected */}
                  {ad.status === 'rejected' && ad.rejectionReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
                      <span className="font-bold">علت رد آگهی: </span>
                      {ad.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 pt-0 flex items-center gap-3 border-t border-slate-100 mt-4">
                {ad.status === 'pending_review' ? (
                  <>
                    <button
                      onClick={() => handleApprove(ad)}
                      disabled={actionLoadingId === ad.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      تأیید و انتشار آگهی
                    </button>
                    <button
                      onClick={() => {
                        setRejectingAd(ad);
                        setRejectionReason('');
                      }}
                      disabled={actionLoadingId === ad.id}
                      className="inline-flex items-center justify-center gap-1.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl text-xs font-bold transition-colors border border-rose-200 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      رد آگهی
                    </button>
                  </>
                ) : ad.status === 'active' ? (
                  <button
                    onClick={() => {
                      setRejectingAd(ad);
                      setRejectionReason('');
                    }}
                    disabled={actionLoadingId === ad.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2 rounded-xl text-xs font-bold transition-colors border border-rose-200 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    غیرفعال‌سازی / توقف انتشار
                  </button>
                ) : (
                  <button
                    onClick={() => handleApprove(ad)}
                    disabled={actionLoadingId === ad.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 py-2 rounded-xl text-xs font-bold transition-colors border border-slate-200 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    تأیید مجدد آگهی
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal Dialog (Pure React, No Native Alert/Confirm) */}
      {rejectingAd && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">رد آگهی تبلیغاتی</h3>
                <p className="text-xs text-slate-500">آگهی: {rejectingAd.title}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">علت رد یا عدم تأیید آگهی:</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: لینک مقصد نامعتبر است یا کیفیت بنر استاندارد نمی‌باشد..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingAd(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={actionLoadingId === rejectingAd.id}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
              >
                تأیید رد آگهی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
