import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Building2, ShieldCheck, Clock, ArrowUpRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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

export default function ContractorsList() {
  const [contractors, setContractors] = useState<PublicEpc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('all');

  useEffect(() => {
    async function loadContractors() {
      try {
        setLoading(true);
        const res = await fetch('/api/contractors');
        if (res.ok) {
          const data = await res.json();
          setContractors(data.contractors || []);
        }
      } catch (err) {
        console.error('Failed to load contractors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContractors();
  }, []);

  const filtered = contractors.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.legalName && c.legalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.specialties && c.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCity = filterCity === 'all' || (c.city && c.city.includes(filterCity));
    return matchesSearch && matchesCity;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans p-4 md:p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/partners" className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 inline-flex items-center gap-1">
                <ArrowLeft size={14} />
                <span>همکاری با هوشیار انرژی</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
                <Building2 size={24} />
              </div>
              شرکت‌های پیمانکار و مجری EPC خورشیدی
            </h1>
          </div>
          <Link
            to="/contractor-auth"
            className="bg-amber-500 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            ثبت شرکت مجری
          </Link>
        </header>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="جستجوی نام شرکت یا تخصص..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-slate-800 dark:text-zinc-200"
            >
              <option value="all">همه شهرها</option>
              <option value="تهران">تهران</option>
              <option value="اصفهان">اصفهان</option>
              <option value="یزد">یزد</option>
              <option value="شیراز">شیراز</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            در حال بارگذاری اطلاعات پیمانکاران معتبر...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <Building2 size={48} className="mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-zinc-300 mb-1">
              هیچ شرکت پیمانکاری مطابق با جستجوی شما یافت نشد.
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
              شرکت‌های مهندسی و پیمانکاران EPC خورشیدی پس از ثبت اطلاعات در این بازارگاه قرار می‌گیرند.
            </p>
            <Link
              to="/contractor-auth"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors"
            >
              ثبت شرکت در شبکه مجریان
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(contractor => (
              <motion.div
                key={contractor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Building2 size={28} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                          {contractor.name}
                        </h3>
                        {contractor.verified ? (
                          <span className="text-emerald-600 dark:text-emerald-400" title="پیمانکار احراز هویت شده">
                            <ShieldCheck size={18} />
                          </span>
                        ) : (
                          <span className="text-slate-400" title="عضو شبکه همکاران">
                            <Clock size={16} />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                        <MapPin size={13} className="text-slate-400" />
                        <span>{contractor.city || 'ثبت نشده'}</span>
                      </div>
                    </div>
                  </div>

                  {contractor.bio && (
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4 line-clamp-2">
                      {contractor.bio}
                    </p>
                  )}

                  <div className="pt-2 mb-6">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">تخصص‌ها:</div>
                    <div className="flex flex-wrap gap-1">
                      {contractor.specialties.map((s, idx) => (
                        <span key={idx} className="text-[11px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded-lg">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/epc/${contractor.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <span>مشاهده جزئیات شرکت</span>
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
