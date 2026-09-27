import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MapPin,
  Briefcase,
  Star,
  Search,
  Filter,
  ArrowLeft,
  Wrench,
  Loader2,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ApprovedProfessionalsDirectoryProps {
  onRequestWithTech: (tech: any) => void;
}

export const ApprovedProfessionalsDirectory: React.FC<ApprovedProfessionalsDirectoryProps> = ({
  onRequestWithTech
}) => {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL');

  useEffect(() => {
    fetchApprovedProfessionals();
  }, []);

  const fetchApprovedProfessionals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/professionals');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.professionals || [];
        // Strictly filter approved professionals
        const approved = list.filter((p: any) => p.status === 'approved' || p.approvalStatus === 'APPROVED');
        setProfessionals(approved);
      }
    } catch (e) {
      console.error('Error fetching approved professionals:', e);
    } finally {
      setLoading(false);
    }
  };

  // Cities list
  const availableCities = Array.from(
    new Set(
      professionals.flatMap((p: any) => p.serviceCities || [])
    )
  ).filter(Boolean);

  const filteredPros = professionals.filter((p: any) => {
    if (cityFilter !== 'ALL' && (!p.serviceCities || !p.serviceCities.includes(cityFilter))) {
      return false;
    }
    if (specialtyFilter !== 'ALL' && (!p.specialties || !p.specialties.some((s: string) => s.includes(specialtyFilter)))) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.fullName?.toLowerCase().includes(q);
      const matchBio = p.bio?.toLowerCase().includes(q);
      const matchSpec = p.specialties?.some((s: string) => s.toLowerCase().includes(q));
      if (!matchName && !matchBio && !matchSpec) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={20} />
              شبکه متخصصان و کارشناسان مجاز انرژی خورشیدی (O&M)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تنها کارشناسان دارای احراز هویت رسمی و تایید صلاحیت فنی در این سامانه فعالیت دارند.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام یا مهارت متخصص..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <Filter size={14} />
            <span>شهر خدمات:</span>
          </div>
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 outline-none"
          >
            <option value="ALL">همه شهرها</option>
            {availableCities.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-slate-500 font-bold mr-4">
            <span>تخصص:</span>
          </div>
          <select
            value={specialtyFilter}
            onChange={e => setSpecialtyFilter(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 outline-none"
          >
            <option value="ALL">همه تخصص‌ها</option>
            <option value="اینورتر">اینورتر و ادوات قدرت</option>
            <option value="پنل">پنل و آرایه خورشیدی</option>
            <option value="باتری">باتری و ذخیره‌ساز</option>
            <option value="برق">تابلو و سیستم‌های برق</option>
          </select>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          <p>در حال بارگذاری لیست متخصصان مجاز O&M...</p>
        </div>
      ) : filteredPros.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-xs text-slate-500">
          متخصصی با فیلترهای انتخابی یافت نشد.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPros.map((pro: any) => (
            <div
              key={pro.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {pro.fullName ? pro.fullName.substring(0, 1) : 'م'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{pro.fullName || 'متخصص انرژی خورشیدی'}</span>
                        <span title="دارای صلاحیت رسمی"><ShieldCheck size={14} className="text-emerald-600" /></span>
                      </h4>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />
                        {pro.serviceCities?.join('، ') || 'سراسری'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    تایید رسمی
                  </span>
                </div>

                {/* Experience & Specialties */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  {typeof pro.yearsExperience === 'number' && pro.yearsExperience > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <Briefcase size={12} className="text-slate-400" />
                      <span>{pro.yearsExperience} سال سابقه کار تخصصی</span>
                    </div>
                  )}

                  {pro.specialties && pro.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pro.specialties.map((spec: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {pro.bio && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {pro.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onRequestWithTech({
                    technicianId: pro.id,
                    fullName: pro.fullName,
                    phone: pro.phone || '',
                    specialties: pro.specialties || [],
                    serviceCities: pro.serviceCities || [],
                    yearsExperience: pro.yearsExperience || 0,
                    status: 'approved',
                    matchScore: 100,
                    matchReasons: ['انتخاب مستقیم توسط کاربر']
                  })}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs text-center"
                >
                  ثبت درخواست با این متخصص
                </button>

                <Link
                  to={`/professionals/${pro.id}`}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                  title="مشاهده پروفایل عمومی"
                >
                  <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
