import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, ShieldCheck, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface PublicEpc {
  id: string;
  name: string;
  tradeName: string;
  legalName?: string;
  type: string;
  verificationStatus: string;
  verified: boolean;
  city?: string;
  address?: string;
  specialties: string[];
  bio?: string;
  createdAt: string;
}

export default function ContractorPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [epc, setEpc] = useState<PublicEpc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEpc() {
      try {
        setLoading(true);
        const res = await fetch(`/api/contractors/${id}`);
        if (!res.ok) {
          throw new Error('شرکت پیمانکار یافت نشد.');
        }
        const data = await res.json();
        setEpc(data.contractor);
      } catch (err: any) {
        setError(err.message || 'خطا در بارگذاری مشخصات شرکت');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchEpc();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center text-slate-500 dark:text-zinc-400 text-sm">
          در حال بارگذاری اطلاعات پیمانکار...
        </div>
      </div>
    );
  }

  if (error || !epc) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {error || 'پیمانکار یافت نشد'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
          اطلاعات این شرکت پیمانکاری در دسترس نیست.
        </p>
        <Link
          to="/contractors"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست پیمانکاران
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to="/contractors"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست پیمانکاران EPC
        </Link>

        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-zinc-800">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Building2 size={40} />
            </div>

            <div className="flex-1 text-center sm:text-right">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  {epc.name}
                </h1>
                {epc.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold self-center sm:self-auto">
                    <ShieldCheck size={14} />
                    پیمانکار احراز هویت شده
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-medium self-center sm:self-auto">
                    <Clock size={14} />
                    عضو شبکه EPC
                  </span>
                )}
              </div>

              {epc.legalName && epc.legalName !== epc.name && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">
                  نام ثبتی: {epc.legalName}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-zinc-400 mt-2">
                <div className="flex items-center gap-1">
                  <MapPin size={14} className="text-slate-400" />
                  <span>محدوده فعالیت: {epc.city || 'سراسری'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="pt-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              زمینه‌های تخصصی پیمانکاری
            </h2>
            <div className="flex flex-wrap gap-2">
              {epc.specialties && epc.specialties.length > 0 ? (
                epc.specialties.map((spec, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium"
                  >
                    {spec}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">طراحی و احداث نیروگاه خورشیدی</span>
              )}
            </div>
          </div>

          {/* Bio */}
          {epc.bio && (
            <div className="pt-6">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                معرفی شرکت
              </h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                {epc.bio}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-8 border-t border-slate-100 dark:border-zinc-800 mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to="/projects"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
            >
              <FileText size={16} />
              دعوت به استعلام یا مناقصه در پروژه‌ها
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
