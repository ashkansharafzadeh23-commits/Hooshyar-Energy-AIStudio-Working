import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserCircle, MapPin, Award, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface PublicPro {
  id: string;
  fullName: string;
  specialties: string[];
  serviceCities: string[];
  yearsExperience?: number;
  bio?: string;
  profileImageUrl?: string;
  verified: boolean;
  status: string;
  createdAt: string;
}

export default function TechnicianPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicPro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const res = await fetch(`/api/professionals/${id}`);
        if (!res.ok) {
          throw new Error('متخصص مورد نظر یافت نشد.');
        }
        const data = await res.json();
        setProfile(data.professional);
      } catch (err: any) {
        setError(err.message || 'خطا در بارگذاری مشخصات کارشناس');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center text-slate-500 dark:text-zinc-400 text-sm">
          در حال بارگذاری پروفایل کارشناس...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {error || 'کارشناس یافت نشد'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
          پروفایل کارشناس در دسترس نیست یا هنوز به تأیید نهایی نرسیده است.
        </p>
        <Link
          to="/technicians"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست کارشناسان
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to="/technicians"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست کارشناسان
        </Link>

        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-zinc-800">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={profile.fullName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 dark:border-zinc-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                <UserCircle size={48} />
              </div>
            )}

            <div className="flex-1 text-center sm:text-right">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  {profile.fullName}
                </h1>
                {profile.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold self-center sm:self-auto">
                    <ShieldCheck size={14} />
                    کارشناس تأییدشده
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-medium self-center sm:self-auto">
                    <Clock size={14} />
                    عضو شبکه همکاران
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-zinc-400 mt-2">
                {profile.serviceCities && profile.serviceCities.length > 0 && (
                  <div className="flex items-center gap-1">
                    <MapPin size={14} className="text-slate-400" />
                    <span>شهرهای خدمت: {profile.serviceCities.join('، ')}</span>
                  </div>
                )}
                {typeof profile.yearsExperience === 'number' && profile.yearsExperience > 0 && (
                  <div className="flex items-center gap-1">
                    <Award size={14} className="text-slate-400" />
                    <span>سابقه حرفه‌ای: {profile.yearsExperience} سال</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="pt-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              زمینه‌های تخصصی خورشیدی
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.specialties && profile.specialties.length > 0 ? (
                profile.specialties.map((spec, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium"
                  >
                    {spec}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">سیستم‌های خورشیدی</span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="pt-6">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                درباره کارشناس
              </h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-8 border-t border-slate-100 dark:border-zinc-800 mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to="/smart-maintenance"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
            >
              <CheckCircle2 size={16} />
              ثبت درخواست خدمات در مرکز نگهداری
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
