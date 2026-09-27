import React, { useState } from 'react';
import { 
  UserPlus, 
  Star, 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  CheckCircle2, 
  Phone, 
  Loader2, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { MaintenanceCase, TechnicianMatch } from '../../types/maintenance';

interface TechnicianMatcherProps {
  mCase: MaintenanceCase | null;
  technicians: TechnicianMatch[];
  loading: boolean;
  onAssign: (caseId: string, technicianId: string, notes?: string) => Promise<void>;
  onClose: () => void;
}

export const TechnicianMatcher: React.FC<TechnicianMatcherProps> = ({
  mCase,
  technicians,
  loading,
  onAssign,
  onClose
}) => {
  const [selectedTech, setSelectedTech] = useState<TechnicianMatch | null>(null);
  const [assignNotes, setAssignNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!mCase) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <UserPlus size={36} className="text-slate-400 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800">پرونده‌ای برای تخصیص تکنسین انتخاب نشده است</h4>
        <p className="text-xs text-slate-500 mt-1">
          لطفاً از بخش پرونده‌های تعمیراتی، گزینه «تخصیص تکنسین» را انتخاب نمایید.
        </p>
      </div>
    );
  }

  const handleConfirmAssign = async () => {
    if (!selectedTech) return;
    setSubmitting(true);
    try {
      await onAssign(mCase.id, selectedTech.technicianId, assignNotes);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="maintenance-technician-matcher">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-600">{mCase.caseNumber}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-bold">{mCase.title}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
            <UserPlus size={18} className="text-indigo-600" />
            سیستم تطبیق هوشمند تکنسین و متخصص (Smart Technician Matching)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            الگوریتم بر اساس تخصص‌های مورد نیاز، موقعیت جغرافیایی، سابقه و امتیاز رضایت تکنسین‌ها را اولویت‌بندی کرده است.
          </p>
        </div>

        <button
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl transition-all"
        >
          بازگشت به لیست
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">در حال رتبه‌بندی متخصصان واجد شرایط...</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <AlertCircle size={32} className="text-amber-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">تکنسین فعالی مطابق با شرایط این پرونده ثبت نشده است.</p>
            </div>
          ) : (
            technicians.map(tech => {
              const isSelected = selectedTech?.technicianId === tech.technicianId;
              return (
                <div
                  key={tech.technicianId}
                  className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                    isSelected ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{tech.fullName}</h4>
                      <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-lg">
                        <span>امتیاز تطابق:</span>
                        <span className="font-mono">{tech.matchScore}%</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {tech.specialties.map((s, idx) => (
                        <span key={idx} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Briefcase size={13} className="text-slate-400" />
                        <span>سابقه کاری: <strong>{tech.yearsExperience} سال</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        <span>شهرهای تحت پوشش: {tech.serviceCities.join('، ')}</span>
                      </div>
                      {tech.rating && (
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                          <Star size={13} className="fill-amber-400 text-amber-400" />
                          <span>امتیاز کیفیت: {tech.rating} از ۵</span>
                        </div>
                      )}
                    </div>

                    {tech.matchReasons && tech.matchReasons.length > 0 && (
                      <div className="text-[11px] text-indigo-800 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                        دلایل تطابق: {tech.matchReasons.join(' • ')}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedTech(tech)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200'
                      }`}
                    >
                      {isSelected ? 'تکنسین انتخاب شد' : 'انتخاب جهت تخصیص'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Assignment Modal / Drawer Confirmation */}
      {selectedTech && (
        <div className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-indigo-600" />
              تایید ارجاع پرونده به {selectedTech.fullName}
            </h4>
            <span className="text-xs text-indigo-700 font-mono">تلفن هماهنگی: {selectedTech.phone}</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">یادداشت ارجاع برای تکنسین:</label>
            <input
              type="text"
              placeholder="دستور کار ویژه، زمان هماهنگی با حراست، تجهیزات خاص..."
              value={assignNotes}
              onChange={e => setAssignNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-indigo-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setSelectedTech(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              انصراف
            </button>
            <button
              onClick={handleConfirmAssign}
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              ثبت و ابلاغ ماموریت به تکنسین
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
