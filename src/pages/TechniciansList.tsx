import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCircle, MapPin, Award, ShieldCheck, Clock, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdBanner } from '../components/AdBanner';

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

export default function TechniciansList() {
  const [experts, setExperts] = useState<PublicPro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExperts() {
      try {
        setLoading(true);
        const res = await fetch('/api/professionals');
        if (res.ok) {
          const data = await res.json();
          setExperts(data.professionals || []);
        }
      } catch (err) {
        console.error('Failed to load professionals:', err);
      } finally {
        setLoading(false);
      }
    }
    loadExperts();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-zinc-950 font-sans p-4 md:p-6 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdBanner layout="banner" />
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/partners" className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 inline-flex items-center gap-1">
                <ArrowLeft size={14} />
                <span>همکاری با هوشیار انرژی</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                <UserCircle size={24} />
              </div>
              کارشناسان و تعمیرکاران فنی خورشیدی
            </h1>
          </div>
          <Link to="/technician-auth" className="bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
             ثبت‌نام به عنوان کارشناس
          </Link>
        </header>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال دریافت فهرست کارشناسان معتبر...
          </div>
        ) : experts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <UserCircle size={48} className="mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300 mb-1">
              در حال حاضر هیچ کارشناس فعالی در این بخش ثبت نشده است.
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
              متخصصان و کارشناسان فنی خورشیدی پس از ثبت اطلاعات و بررسی مدارک در این سامانه نمایش داده می‌شوند.
            </p>
            <Link
              to="/technician-auth"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              ثبت‌نام اولین کارشناس
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experts.map(expert => (
              <motion.div 
                key={expert.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all group"
              >
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    {expert.profileImageUrl ? (
                      <img src={expert.profileImageUrl} alt={expert.fullName} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-zinc-700" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 shrink-0">
                        <UserCircle size={32} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{expert.fullName}</h3>
                        {expert.verified ? (
                          <span className="text-emerald-600 dark:text-emerald-400" title="کارشناس تأییدشده">
                            <ShieldCheck size={16} />
                          </span>
                        ) : (
                          <span className="text-slate-400" title="عضو شبکه همکاران">
                            <Clock size={16} />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {expert.specialties.slice(0, 2).map((s, idx) => (
                          <span key={idx} className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {expert.bio && (
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4 line-clamp-2">
                      {expert.bio}
                    </p>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-zinc-400 mb-6">
                    {expert.serviceCities && expert.serviceCities.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400" />
                        <span>شهرهای خدمت: {expert.serviceCities.join('، ')}</span>
                      </div>
                    )}
                    {typeof expert.yearsExperience === 'number' && expert.yearsExperience > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Award size={14} className="text-slate-400" />
                        <span>سابقه: {expert.yearsExperience} سال</span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  to={`/professionals/${expert.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <span>مشاهده پروفایل و تخصص‌ها</span>
                  <ArrowUpRight size={14} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
