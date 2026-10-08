import React, { useState, useEffect, useRef } from 'react';
import {
  GeneratorApplication,
  ElectricalPhaseType,
  GeneratorDutyType,
  GeneratorFuelType,
  LoadItemInput,
  GeneratorAssessmentInput,
  GeneratorSizingResult as IGeneratorSizingResult
} from '../../types/generator';
import { GeneratorSizingService } from '../../services/generatorSizingService';
import { GeneratorSizingResult } from './GeneratorSizingResult';
import {
  Zap,
  X,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Sliders,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';

interface GeneratorAssessmentProps {
  initialApplication?: string;
  initialProvince?: string;
  initialCity?: string;
  isOpen: boolean;
  onClose: () => void;
}

// Preset library for common Iranian household/commercial equipment
const PRESET_LOAD_TEMPLATES: Array<Omit<LoadItemInput, 'id' | 'quantity'>> = [
  { name: 'روشنایی کم‌مصرف (LED)', category: 'LIGHTING', runningWatts: 150, isMotorDriven: false },
  { name: 'یخچال و فریزر خانگی', category: 'REFRIGERATION', runningWatts: 300, isMotorDriven: true, startingMultiplier: 4 },
  { name: 'مودم و تجهیزات اینترنت', category: 'TELECOM_IT', runningWatts: 40, isMotorDriven: false },
  { name: 'کامپیوتر و سیستم نظارتی (DVR)', category: 'TELECOM_IT', runningWatts: 250, isMotorDriven: false },
  { name: 'تلویزیون و سیستم صوتی', category: 'CUSTOM', runningWatts: 180, isMotorDriven: false },
  { name: 'پمپ آب خانگی (۱ اسب بخار)', category: 'PUMP', runningWatts: 750, isMotorDriven: true, startingMultiplier: 4.5 },
  { name: 'کولر آبی خانگی', category: 'HVAC', runningWatts: 600, isMotorDriven: true, startingMultiplier: 3.5 },
  { name: 'اسپلیت / کولر گازی (۲۴۰۰۰)', category: 'HVAC', runningWatts: 2400, isMotorDriven: true, startingMultiplier: 3.0 },
  { name: 'الکتروموتور کارگاهی (۳ فاز)', category: 'WORKSHOP', runningWatts: 4000, isMotorDriven: true, startingMultiplier: 5.0 }
];

export const GeneratorAssessment: React.FC<GeneratorAssessmentProps> = ({
  initialApplication,
  initialProvince,
  initialCity,
  isOpen,
  onClose
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Form State
  const [step, setStep] = useState<'FORM' | 'RESULT'>('FORM');
  const [application, setApplication] = useState<GeneratorApplication>(
    (initialApplication?.toUpperCase() as GeneratorApplication) || 'RESIDENTIAL'
  );
  const [phase, setPhase] = useState<ElectricalPhaseType>('SINGLE_PHASE');
  const [dutyType, setDutyType] = useState<GeneratorDutyType>('STANDBY_EMERGENCY');
  const [availableFuels, setAvailableFuels] = useState<GeneratorFuelType[]>(['GASOLINE']);
  const [requiredBackupHours, setRequiredBackupHours] = useState<number>(4);
  const [installationEnvironment, setInstallationEnvironment] = useState<
    'INDOOR_VENTILATED' | 'OUTDOOR_COVERED' | 'OUTDOOR_OPEN' | 'UNKNOWN'
  >('OUTDOOR_COVERED');

  // Loads State (Default: essential residential baseline)
  const [loads, setLoads] = useState<LoadItemInput[]>([
    { id: '1', name: 'روشنایی ضروری و کم‌مصرف', category: 'LIGHTING', runningWatts: 200, quantity: 1, isMotorDriven: false },
    { id: '2', name: 'یخچال و فریزر', category: 'REFRIGERATION', runningWatts: 350, quantity: 1, isMotorDriven: true, startingMultiplier: 4 }
  ]);

  // Custom load adder
  const [customName, setCustomName] = useState('');
  const [customWatts, setCustomWatts] = useState<number>(100);
  const [customIsMotor, setCustomIsMotor] = useState(false);

  // Reserve & PF options
  const [engineeringReserve, setEngineeringReserve] = useState<number>(20);

  // Result state
  const [sizingResult, setSizingResult] = useState<IGeneratorSizingResult | null>(null);

  // Accessible focus trap and escape listener
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      // Focus modal container
      dialogRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleFuel = (fuel: GeneratorFuelType) => {
    if (availableFuels.includes(fuel)) {
      if (availableFuels.length > 1) {
        setAvailableFuels(availableFuels.filter(f => f !== fuel));
      }
    } else {
      setAvailableFuels([...availableFuels, fuel]);
    }
  };

  const handleAddPreset = (template: Omit<LoadItemInput, 'id' | 'quantity'>) => {
    const newItem: LoadItemInput = {
      ...template,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      quantity: 1
    };
    setLoads([...loads, newItem]);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || customWatts <= 0) return;
    const newItem: LoadItemInput = {
      id: Date.now().toString(),
      name: customName.trim(),
      category: 'CUSTOM',
      runningWatts: customWatts,
      quantity: 1,
      isMotorDriven: customIsMotor,
      startingMultiplier: customIsMotor ? 3.5 : undefined
    };
    setLoads([...loads, newItem]);
    setCustomName('');
    setCustomWatts(100);
    setCustomIsMotor(false);
  };

  const handleRemoveLoad = (id: string) => {
    setLoads(loads.filter(l => l.id !== id));
  };

  const handleUpdateLoadQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setLoads(loads.map(l => (l.id === id ? { ...l, quantity: qty } : l)));
  };

  const handleUpdateLoadWatts = (id: string, watts: number) => {
    if (watts < 0) return;
    setLoads(loads.map(l => (l.id === id ? { ...l, runningWatts: watts } : l)));
  };

  const handleRunCalculation = () => {
    const input: GeneratorAssessmentInput = {
      application,
      phase,
      dutyType,
      availableFuels,
      requiredBackupHours,
      installationEnvironment,
      loads,
      powerFactorAssumption: 0.8,
      engineeringReservePercent: engineeringReserve,
      locationCity: initialCity,
      locationProvince: initialProvince
    };

    const res = GeneratorSizingService.calculateSizing(input);
    setSizingResult(res);
    setStep('RESULT');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="generator-assessment-title"
      tabIndex={-1}
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto outline-hidden"
    >
      <div
        dir="rtl"
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-zinc-800 text-right space-y-5 my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Zap size={22} />
            </div>
            <div>
              <h3 id="generator-assessment-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                ارزیابی نیاز و برآورد ظرفیت موتور برق و ژنراتور
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                محاسبه کاملاً مستقل از طرح خورشیدی بر اساس بارهای الکتریکی ضروری
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن فرم ارزیابی"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content based on step */}
        {step === 'FORM' ? (
          <div className="space-y-6">
            {/* 1. Context & Application */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                ۱. نوع کاربری و شرایط محل نصب:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'RESIDENTIAL', label: 'مسکونی / ویلایی' },
                  { id: 'COMMERCIAL', label: 'تجاری / اداری' },
                  { id: 'AGRICULTURAL', label: 'کشاورزی / پمپاژ' },
                  { id: 'INDUSTRIAL', label: 'کارگاهی / صنعتی' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setApplication(opt.id as GeneratorApplication)}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                      application === opt.id
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                        : 'border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Electrical Phase & Duty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  ۲. نوع مدار الکتریکی:
                </label>
                <select
                  value={phase}
                  onChange={e => setPhase(e.target.value as ElectricalPhaseType)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="SINGLE_PHASE">تک‌فاز (۲۳۰ ولت خانگی/تجاری)</option>
                  <option value="THREE_PHASE">سه‌فاز (۴۰۰ ولت صنعتی/کشاورزی)</option>
                  <option value="UNKNOWN">نامشخص (نیازمند کارشناسی)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  ۳. کاربرد ژنراتور:
                </label>
                <select
                  value={dutyType}
                  onChange={e => setDutyType(e.target.value as GeneratorDutyType)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="STANDBY_EMERGENCY">اضطراری و قطعی برق (Standby)</option>
                  <option value="PRIME_POWER">کارکرد مکرر / چاه آب (Prime)</option>
                  <option value="CONTINUOUS">دائم‌کار صنعتی (Continuous)</option>
                </select>
              </div>
            </div>

            {/* 3. Fuel & Backup Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  ۴. سوخت‌های در دسترس:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'GASOLINE', label: 'بنزینی' },
                    { id: 'NATURAL_GAS', label: 'گاز شهری' },
                    { id: 'DIESEL', label: 'گازوئیل' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFuel(f.id as GeneratorFuelType)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all cursor-pointer ${
                        availableFuels.includes(f.id as GeneratorFuelType)
                          ? 'bg-amber-500 text-white border-amber-500 font-bold'
                          : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  ۵. مدت زمان پشتیبانی مورد نیاز (ساعت):
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={requiredBackupHours}
                  onChange={e => setRequiredBackupHours(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* 4. Essential Electrical Loads Table */}
            <div className="space-y-3 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  ۶. بارهای برقی ضروری برای زمان قطعی برق:
                </label>
                <span className="text-[11px] text-slate-500">
                  مجموع وات فعلی:{' '}
                  {loads.reduce((acc, l) => acc + (l.runningWatts || 0) * (l.quantity || 1), 0).toLocaleString('fa-IR')} وات
                </span>
              </div>

              {/* Load Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {loads.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/60 text-xs"
                  >
                    <div className="flex-1 font-medium text-slate-800 dark:text-slate-200">
                      {item.name}
                      {item.isMotorDriven && (
                        <span className="mr-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                          موتوردار / دارای استارت
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">توان:</span>
                        <input
                          type="number"
                          value={item.runningWatts}
                          onChange={e => handleUpdateLoadWatts(item.id, parseInt(e.target.value, 10) || 0)}
                          className="w-16 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-center text-xs"
                        />
                        <span className="text-[10px] text-slate-400">W</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">تعداد:</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => handleUpdateLoadQty(item.id, parseInt(e.target.value, 10) || 1)}
                          className="w-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-center text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLoad(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="حذف این بار"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Template Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 block">افزودن سریع تجهیزات متداول:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_LOAD_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddPreset(tpl)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                    >
                      <Plus size={11} />
                      <span>{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Load Form */}
              <form onSubmit={handleAddCustom} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="نام تجهیز دلخواه دیگر..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
                <input
                  type="number"
                  placeholder="توان (وات)"
                  value={customWatts}
                  onChange={e => setCustomWatts(parseInt(e.target.value, 10) || 0)}
                  className="w-20 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
                <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customIsMotor}
                    onChange={e => setCustomIsMotor(e.target.checked)}
                    className="rounded"
                  />
                  <span>موتوردار</span>
                </label>
                <button
                  type="submit"
                  disabled={!customName.trim() || customWatts <= 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold disabled:opacity-50"
                >
                  افزودن
                </button>
              </form>
            </div>

            {/* Sizing Assumptions Headroom */}
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-slate-200/60 dark:border-zinc-700/60">
              <span>حاشیه اطمینان مهندسی برای جلوگیری از لود ۱۰۰٪:</span>
              <div className="flex items-center gap-2">
                {[15, 20, 25].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setEngineeringReserve(pct)}
                    className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer ${
                      engineeringReserve === pct
                        ? 'bg-amber-500 text-white font-bold'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    {pct}٪
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold transition-colors cursor-pointer min-h-[42px]"
              >
                انصراف و بازگشت
              </button>

              <button
                type="button"
                onClick={handleRunCalculation}
                disabled={loads.length === 0}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[42px] disabled:opacity-50"
              >
                <span>محاسبه و ارزیابی توان ژنراتور</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        ) : (
          sizingResult && (
            <GeneratorSizingResult
              result={sizingResult}
              onModifyInputs={() => setStep('FORM')}
              onClose={onClose}
            />
          )
        )}
      </div>
    </div>
  );
};
