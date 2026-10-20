import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sun,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Activity,
  Calculator,
  Compass
} from 'lucide-react';

/**
 * Public-safe verified project showcase contract.
 * Strictly excludes private customer IDs, financial returns, CAPEX/OPEX,
 * and exact geographical coordinates.
 */
export interface PublicVerifiedProjectShowcase {
  id: string;
  title: string;
  location: string; // City and Province only (e.g. "اصفهان، شهرک صنعتی رازی")
  capacityKw: number;
  status: 'OPERATIONAL' | 'COMMISSIONED';
  statusLabel?: string;
  commissioningDate?: string;
  measuredProduction?: {
    value: number;
    unit: string;
    period: string; // Explicit verified measurement window
    source: string; // e.g. "کنتور رسمی تبادل برق"
  };
  timeSeriesData?: {
    label: string;
    value: number;
  }[];
  imageUrl?: string;
  connectionDescription?: string; // Accurate relationship without false EPC ownership claims
}

export interface VerifiedProjectShowcaseProps {
  projects?: PublicVerifiedProjectShowcase[];
  autoRotateIntervalMs?: number; // default: 7000ms
  className?: string;
}

const ALLOWED_STATUSES = new Set(['OPERATIONAL', 'COMMISSIONED']);

/**
 * Validates a single incoming public project record defensively before rendering.
 * Returns true only if the record meets all presentation safety criteria.
 * Excludes invalid, incomplete, negative, or corrupted records.
 *
 * NOTE: This client-side validation is defense-in-depth only.
 * Full publication authorization, owner consent, and server-side field allowlisting
 * must be strictly enforced by the future Stage D.2-P2 backend before public serialization.
 */
export function validatePublicProject(project: unknown): project is PublicVerifiedProjectShowcase {
  if (!project || typeof project !== 'object') {
    return false;
  }

  const p = project as Record<string, unknown>;

  // 1. ID: Non-empty string
  if (typeof p.id !== 'string' || p.id.trim().length === 0) {
    return false;
  }

  // 2. Title: Non-empty string
  if (typeof p.title !== 'string' || p.title.trim().length === 0) {
    return false;
  }

  // 3. Location: Non-empty string (city/province)
  if (typeof p.location !== 'string' || p.location.trim().length === 0) {
    return false;
  }

  // 4. Capacity: Finite, strictly positive number (kWp)
  if (typeof p.capacityKw !== 'number' || !Number.isFinite(p.capacityKw) || p.capacityKw <= 0) {
    return false;
  }

  // 5. Status: Must be in allowed statuses ('OPERATIONAL' | 'COMMISSIONED')
  if (typeof p.status !== 'string' || !ALLOWED_STATUSES.has(p.status)) {
    return false;
  }

  // 6. Optional measuredProduction validation:
  if (p.measuredProduction !== undefined && p.measuredProduction !== null) {
    if (typeof p.measuredProduction !== 'object') return false;
    const mp = p.measuredProduction as Record<string, unknown>;

    // Value must be finite positive number
    if (typeof mp.value !== 'number' || !Number.isFinite(mp.value) || mp.value <= 0) {
      return false;
    }
    // Unit, period, and source must be non-empty strings
    if (typeof mp.unit !== 'string' || mp.unit.trim().length === 0) return false;
    if (typeof mp.period !== 'string' || mp.period.trim().length === 0) return false;
    if (typeof mp.source !== 'string' || mp.source.trim().length === 0) return false;
  }

  // 7. Optional timeSeriesData validation:
  if (p.timeSeriesData !== undefined && p.timeSeriesData !== null) {
    if (!Array.isArray(p.timeSeriesData)) return false;
    // Bounded length (max 48 points)
    if (p.timeSeriesData.length > 48) return false;

    for (const pt of p.timeSeriesData) {
      if (!pt || typeof pt !== 'object') return false;
      const ptObj = pt as Record<string, unknown>;
      if (typeof ptObj.label !== 'string' || ptObj.label.trim().length === 0) return false;
      if (typeof ptObj.value !== 'number' || !Number.isFinite(ptObj.value) || ptObj.value < 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Decorative Solar Energy Flow Schematic.
 * Rendered when no verified operational time-series data exists or metadata is incomplete.
 * Strictly contains NO fake numerical scale, NO fabricated timestamps,
 * and NO live measured readings.
 */
function SolarEnergySchematic() {
  return (
    <div
      className="w-full py-2.5 px-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center space-y-2"
      role="img"
      aria-label="طرح شماتیک تبدیل انرژی خورشیدی — فاقد داده عملیاتی"
    >
      <div className="w-full flex items-center justify-between text-xs text-slate-200 font-mono">
        <span className="flex items-center gap-1.5">
          <Sun size={13} className="text-amber-400" />
          <span>تابش اقلیمی</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Compass size={13} className="text-[#5EEAD4]" />
          <span>تبدیل فتوولتائیک</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Activity size={13} className="text-sky-300" />
          <span>تزریق به شبکه</span>
        </span>
      </div>

      {/* Decorative Normalized Solar Bell-Curve SVG */}
      <svg
        viewBox="0 0 240 44"
        className="w-full h-11 overflow-visible stroke-linecap-round stroke-linejoin-round"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="schematicGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle grid lines */}
        <line x1="0" y1="38" x2="240" y2="38" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
        <line x1="0" y1="20" x2="240" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

        {/* Shaded Area under smooth solar irradiance bell-curve */}
        <path
          d="M 10 38 Q 60 38 90 22 T 120 8 T 150 22 Q 180 38 230 38 Z"
          fill="url(#schematicGlow)"
        />

        {/* Clean Smooth Curve Line */}
        <path
          d="M 10 38 Q 60 38 90 22 T 120 8 T 150 22 Q 180 38 230 38"
          fill="none"
          stroke="#5EEAD4"
          strokeWidth="2"
        />

        {/* Peak Indicator Node */}
        <circle cx="120" cy="8" r="3.5" fill="#5EEAD4" className="animate-pulse" />
      </svg>

      {/* Mandatory Truthful Non-Operational Label */}
      <div className="w-full text-center">
        <span className="text-xs font-medium text-slate-200 tracking-tight">
          نمای شماتیک — داده عملیاتی نیست
        </span>
      </div>
    </div>
  );
}

/**
 * Verified Time-Series Production Chart.
 * Rendered ONLY when actual, approved time-series points exist AND measurement provenance is verified.
 */
function VerifiedTimeSeriesChart({
  data,
  period,
  source
}: {
  data: { label: string; value: number }[];
  period?: string;
  source?: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const divisor = maxValue > 0 ? maxValue : 1;
  const width = 240;
  const height = 44;
  const paddingY = 8;
  const availableHeight = height - paddingY * 2;

  const points = data.map((d, index) => {
    const x = data.length > 1 ? (index / (data.length - 1)) * (width - 24) + 12 : width / 2;
    const y = height - paddingY - (d.value / divisor) * availableHeight;
    return {
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      label: d.label,
      value: d.value
    };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaD = `${pathD} L ${lastPoint.x} ${height - 4} L ${firstPoint.x} ${height - 4} Z`;

  return (
    <div
      className="w-full py-2.5 px-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center space-y-2"
      role="img"
      aria-label={`نمودار تولید انرژی تأییدشده ${period || ''} — منبع: ${source || 'کنتور رسمی'}`}
    >
      <div className="w-full flex items-center justify-between text-xs text-slate-200">
        <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
          <Activity size={13} className="text-emerald-400" />
          <span>تولید ثبت‌شده</span>
          {source && <span className="text-[11px] text-slate-300 font-normal">({source})</span>}
        </span>
        {period && <span className="text-slate-200 font-mono text-xs">{period}</span>}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11 overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="verifiedChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#verifiedChartGradient)" />
        <path d={pathD} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#10B981" />
        ))}
      </svg>

      <div className="w-full flex justify-between text-xs text-slate-200 font-mono">
        <span>{points[0]?.label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)]?.label}</span>}
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function VerifiedProjectShowcase({
  projects = [],
  autoRotateIntervalMs = 7000,
  className = ''
}: VerifiedProjectShowcaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Client-side state for public showcase projects retrieved from secure API
  const [fetchedProjects, setFetchedProjects] = useState<PublicVerifiedProjectShowcase[]>([]);

  useEffect(() => {
    // If an explicit non-empty array is passed as props (e.g. fixtures or previews), bypass fetch
    if (projects && projects.length > 0) return;

    let isMounted = true;
    const controller = new AbortController();

    async function loadPublicShowcase() {
      try {
        const res = await fetch('/api/public/showcase-projects', {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted && json && Array.isArray(json.data)) {
          setFetchedProjects(json.data);
        }
      } catch {
        // Fail closed silently: empty array keeps truthful zero-state
      }
    }

    loadPublicShowcase();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [projects]);

  const rawProjects = (projects && projects.length > 0) ? projects : fetchedProjects;

  // Validate incoming projects defensively (defense-in-depth presentation validation)
  const validProjects = useMemo(() => {
    if (!Array.isArray(rawProjects)) return [];
    return rawProjects.filter(validatePublicProject);
  }, [rawProjects]);

  const hasProjects = validProjects.length > 0;
  const isMultiProject = validProjects.length > 1;

  // Reduced motion preference detection with listener cleanup
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    } catch {
      // Graceful fallback in environments without matchMedia
    }
  }, []);

  // Safe clamping when valid projects array shrinks or changes
  useEffect(() => {
    if (currentIndex >= validProjects.length && validProjects.length > 0) {
      setCurrentIndex(0);
    }
  }, [validProjects.length, currentIndex]);

  // Auto-rotation timer: strictly active ONLY when 2 or more approved projects exist and not paused/reduced-motion
  useEffect(() => {
    if (!isMultiProject || isPaused || prefersReducedMotion) return;

    const interval = autoRotateIntervalMs > 0 ? autoRotateIntervalMs : 7000;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validProjects.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isMultiProject, isPaused, prefersReducedMotion, validProjects.length, autoRotateIntervalMs]);

  // Focus event handlers with focus-within containment:
  // Moving focus between controls INSIDE this carousel does not resume auto-rotation
  const handleFocus = () => {
    setIsPaused(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      setIsPaused(false);
    }
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handlePrev = () => {
    if (!isMultiProject) return;
    setCurrentIndex((prev) => (prev - 1 + validProjects.length) % validProjects.length);
  };

  const handleNext = () => {
    if (!isMultiProject) return;
    setCurrentIndex((prev) => (prev + 1) % validProjects.length);
  };

  const safeIndex = hasProjects ? Math.min(Math.max(0, currentIndex), validProjects.length - 1) : 0;
  const currentProject = hasProjects ? validProjects[safeIndex] : null;

  // Strict chart validation: requires valid points (>=2, <=48) AND explicit measurement period + provenance
  const hasValidTimeSeriesChart = Boolean(
    currentProject &&
    currentProject.timeSeriesData &&
    Array.isArray(currentProject.timeSeriesData) &&
    currentProject.timeSeriesData.length >= 2 &&
    currentProject.timeSeriesData.length <= 48 &&
    currentProject.measuredProduction?.period?.trim() &&
    currentProject.measuredProduction?.source?.trim() &&
    currentProject.timeSeriesData.every(
      pt => pt &&
            typeof pt.label === 'string' &&
            pt.label.trim().length > 0 &&
            typeof pt.value === 'number' &&
            Number.isFinite(pt.value) &&
            pt.value >= 0
    )
  );

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="region"
      aria-roledescription="carousel"
      aria-label="ویترین پروژه‌های خورشیدی هوشیار انرژی"
      className={`bg-slate-900/65 dark:bg-slate-950/65 backdrop-blur-xl border border-white/25 dark:border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-w-sm sm:max-w-md mx-auto lg:mr-auto lg:ml-0 transition-all hover:border-white/40 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5EEAD4] animate-pulse" />
          <span className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
            ویترین پروژه‌های خورشیدی
          </span>
        </div>

        {/* Accurate Public Showcase Badge (Replaces misleading «نمونه تحلیل پروژه») */}
        {currentProject ? (
          <span className="text-xs font-bold text-emerald-200 bg-emerald-500/25 border border-emerald-300/40 px-2.5 py-0.5 rounded-md">
            پروژه تأییدشده
          </span>
        ) : (
          <span className="text-xs font-bold text-sky-200 bg-sky-500/25 border border-sky-300/40 px-2.5 py-0.5 rounded-md">
            ویترین ساختگاه‌ها
          </span>
        )}
      </div>

      {/* Main Content Area: Zero-Data State or Active Approved Project */}
      {!currentProject ? (
        // ZERO-DATA STATE: Truthful, high-trust presentation without mock figures
        <div className="pt-4 space-y-4">
          <div className="text-right space-y-1.5">
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#5EEAD4]" />
              <span>پروژه‌های واقعی، به‌زودی</span>
            </h4>
            <p className="text-xs text-slate-200/90 leading-relaxed font-normal">
              نمونه پروژه‌های خورشیدی پس از تأیید اطلاعات و مجوز انتشار در این بخش نمایش داده می‌شوند.
            </p>
          </div>

          {/* Decorative Solar Energy Flow Schematic */}
          <SolarEnergySchematic />

          {/* Non-repetitive Truthful Governance Note */}
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-xs text-slate-200 leading-relaxed text-right">
            تنها ساختگاه‌های دارای تأییدیه فنی رسمی و مجوز انتشار در این ویترین عمومی ثبت می‌شوند.
          </div>

          {/* Primary Action Button */}
          <div className="pt-1">
            <Link
              to="/target-select"
              className="w-full py-2.5 px-4 min-h-[44px] rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#5EEAD4]"
            >
              <Calculator size={15} />
              <span>شروع تحلیل پروژه</span>
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      ) : (
        // ACTIVE PROJECT STATE: Renders safe, approved published project details
        <div className="pt-4 space-y-4">
          {/* Project Title and General Location */}
          <div className="text-right space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white truncate">
                {currentProject.title}
              </h4>
              <span className="text-xs text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>{currentProject.statusLabel || 'بهره‌برداری تأییدشده'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-200">
              {currentProject.location}
            </p>
          </div>

          {/* Technical Metric Tiles (Installed Capacity & Measured Output) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/15 space-y-1">
              <span className="text-xs font-semibold text-slate-200 block">ظرفیت نامی</span>
              <div className="text-lg font-black font-mono tabular-nums text-white" dir="ltr">
                {currentProject.capacityKw.toLocaleString('fa-IR')} <span className="text-xs font-sans font-bold text-amber-300">kWp</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/15 space-y-1">
              <span className="text-xs font-semibold text-slate-200 block">
                {currentProject.measuredProduction ? 'تولید اندازه‌گیری‌شده' : 'سال اتصال به شبکه'}
              </span>
              <div className="text-lg font-black font-mono tabular-nums text-[#5EEAD4]" dir="ltr">
                {currentProject.measuredProduction ? (
                  <>
                    {currentProject.measuredProduction.value.toLocaleString('fa-IR')} <span className="text-xs font-sans font-bold text-sky-200">{currentProject.measuredProduction.unit}</span>
                  </>
                ) : (
                  currentProject.commissioningDate || 'تأییدشده'
                )}
              </div>
            </div>
          </div>

          {/* Chart Area: Strict fallback to schematic if metadata or points are insufficient */}
          {hasValidTimeSeriesChart && currentProject.timeSeriesData ? (
            <VerifiedTimeSeriesChart
              data={currentProject.timeSeriesData}
              period={currentProject.measuredProduction?.period}
              source={currentProject.measuredProduction?.source}
            />
          ) : (
            <SolarEnergySchematic />
          )}

          {/* Carousel Controls */}
          {isMultiProject && (
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5EEAD4]"
                  aria-label="پروژه قبلی"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5EEAD4]"
                  aria-label="پروژه بعدی"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              {/* Indicator Dots with Meaningful Accessible Labels */}
              <div className="flex items-center gap-1.5" role="tablist" aria-label="انتخاب پروژه">
                {validProjects.map((proj, idx) => (
                  <button
                    key={proj.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    role="tab"
                    aria-selected={safeIndex === idx}
                    aria-label={`پروژه ${(idx + 1).toLocaleString('fa-IR')} از ${validProjects.length.toLocaleString('fa-IR')}: ${proj.title}`}
                    className={`h-2 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5EEAD4] ${
                      safeIndex === idx ? 'w-5 bg-[#5EEAD4]' : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>

              <span className="text-xs font-mono text-slate-200" aria-live="polite">
                {(safeIndex + 1).toLocaleString('fa-IR')} از {validProjects.length.toLocaleString('fa-IR')}
              </span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1">
            <Link
              to="/target-select"
              className="w-full py-2.5 px-4 min-h-[44px] rounded-xl bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#5EEAD4]"
            >
              <Calculator size={15} />
              <span>امکان‌سنجی ساختگاه شما</span>
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifiedProjectShowcase;
