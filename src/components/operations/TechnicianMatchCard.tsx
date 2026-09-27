import React from 'react';
import { 
  User, 
  MapPin, 
  Award, 
  Phone, 
  CheckCircle, 
  Briefcase 
} from 'lucide-react';
import { TechnicianMatch } from '../../types/maintenance';
import { toPersianDigits } from '../../utils/formatters';

export interface TechnicianMatchCardProps {
  match: TechnicianMatch;
  isSelected?: boolean;
  onSelect?: (m: TechnicianMatch) => void;
  onAssign?: (m: TechnicianMatch) => void;
}

export const TechnicianMatchCard: React.FC<TechnicianMatchCardProps> = ({
  match,
  isSelected = false,
  onSelect,
  onAssign,
}) => {
  return (
    <div
      onClick={() => onSelect && onSelect(match)}
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all text-right cursor-pointer ${
        isSelected
          ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {match.fullName || (match as any).technicianName}
            </h4>

            {match.phone && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Phone className="w-3.5 h-3.5" />
                <span className="font-mono">{toPersianDigits(match.phone)}</span>
              </div>
            )}
          </div>
        </div>

        {typeof match.yearsExperience === 'number' && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            {toPersianDigits(match.yearsExperience)} سال سابقه
          </span>
        )}
      </div>

      {/* Specialties & Cities */}
      <div className="mt-3 space-y-2 text-xs">
        {match.specialties && match.specialties.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {match.specialties.map((spec, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]"
              >
                {spec}
              </span>
            ))}
          </div>
        )}

        {match.serviceCities && match.serviceCities.length > 0 && (
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>پوشش شهری: {match.serviceCities.join('، ')}</span>
          </div>
        )}
      </div>

      {/* Deterministic match reasons from backend */}
      {match.matchReasons && match.matchReasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
            معیارهای انطباق ثبت‌شده:
          </span>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {match.matchReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action CTA */}
      {onAssign && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onAssign(match)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
          >
            تخصیص به این تکنسین
          </button>
        </div>
      )}
    </div>
  );
};
