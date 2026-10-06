import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  UserCircle, 
  MapPin, 
  Award, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  Wrench,
  Sparkles,
  Phone
} from 'lucide-react';

interface TechnicianCert {
  id: string;
  title: string;
  issuingOrg?: string;
  issueYear?: string | number;
  description?: string;
  imageUrl?: string;
  verified: boolean;
}

interface TechnicianWork {
  id: string;
  title: string;
  description?: string;
  images: string[];
}

interface PublicPro {
  id: string;
  fullName: string;
  phone?: string;
  specialties: string[];
  serviceCities: string[];
  yearsExperience?: number;
  bio?: string;
  profileImageUrl?: string;
  certifications?: TechnicianCert[];
  workSamples?: TechnicianWork[];
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
        setError(null);
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
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold min-h-[44px]"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست کارشناسان
        </Link>
      </div>
    );
  }

  const certs = Array.isArray(profile.certifications) ? profile.certifications : [];
  const samples = Array.isArray(profile.workSamples) ? profile.workSamples : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans py-10 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/technicians"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          بازگشت به فهرست کارشناسان فنی
        </Link>

        {/* Profile Card Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-zinc-800">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={profile.fullName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-200 dark:border-zinc-700 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 shrink-0">
                <UserCircle size={56} />
              </div>
            )}

            <div className="flex-1 text-center sm:text-right">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {profile.fullName}
                </h1>
                {profile.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold self-center sm:self-auto">
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
                    <span>شهرهای تحت پوشش: {profile.serviceCities.join('، ')}</span>
                  </div>
                )}
                {typeof profile.yearsExperience === 'number' && profile.yearsExperience > 0 && (
                  <div className="flex items-center gap-1">
                    <Award size={14} className="text-slate-400" />
                    <span>سابقه فعالیت تخصصی: {profile.yearsExperience} سال</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-1" dir="ltr">
                    <Phone size={14} className="text-slate-400" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="pt-6">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-2.5">
              زمینه‌های تخصصی و خدمات
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.specialties && profile.specialties.length > 0 ? (
                profile.specialties.map((spec, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold"
                  >
                    {spec}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">سیستم‌های فتوولتائیک و اینورترهای خورشیدی</span>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="pt-6">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-2">
                درباره کارشناس
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line text-justify">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to="/smart-maintenance"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors min-h-[44px]"
            >
              <CheckCircle2 size={16} />
              ثبت درخواست خدمات در مرکز نگهداری و تعمیرات
            </Link>
          </div>
        </div>

        {/* Certificates & Qualifications Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <Award className="text-amber-500" size={20} />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              مدارک و گواهینامه‌های تخصصی ({certs.length})
            </h2>
          </div>

          {certs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              هنوز مدرک یا گواهینامه‌ای در این پروفایل ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certs.map(cert => (
                <div 
                  key={cert.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {cert.title}
                      </h3>
                      {cert.verified ? (
                        <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                          احراز اصالت شده
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 text-[10px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 shrink-0">
                          ثبت‌شده توسط متخصص
                        </span>
                      )}
                    </div>

                    {(cert.issuingOrg || cert.issueYear) && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        {cert.issuingOrg ? `مرجع صدور: ${cert.issuingOrg}` : ''}
                        {cert.issuingOrg && cert.issueYear ? ' • ' : ''}
                        {cert.issueYear ? `سال: ${cert.issueYear}` : ''}
                      </div>
                    )}

                    {cert.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                        {cert.description}
                      </p>
                    )}
                  </div>

                  {cert.imageUrl && (
                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800/80">
                      <a
                        href={cert.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#0284C7] hover:underline font-bold"
                      >
                        <FileText size={14} />
                        مشاهده سند گواهینامه
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Work Samples Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <Wrench className="text-emerald-500" size={20} />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              نمونه‌کارهای فنی و پروژه‌های اجرا شده ({samples.length})
            </h2>
          </div>

          {samples.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              هنوز نمونه‌کاری در این بخش ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-6">
              {samples.map(sample => (
                <div 
                  key={sample.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850/50 space-y-3"
                >
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {sample.title}
                  </h3>

                  {sample.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {sample.description}
                    </p>
                  )}

                  {Array.isArray(sample.images) && sample.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                      {sample.images.map((img, i) => (
                        <div key={i} className="h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
                          <img src={img} alt={`${sample.title} - تصویر ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
