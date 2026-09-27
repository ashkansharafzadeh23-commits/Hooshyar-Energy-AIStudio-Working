import React, { useState } from 'react';
import { Camera, FileText, Zap, Loader2, Sparkles, Check, Trash2, Maximize, AlertCircle, Info, ShieldCheck, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const POPULAR_CITIES = [
  'تهران', 'اصفهان', 'شیراز', 'مشهد', 'تبریز', 'یزد', 'کرمان', 'اهواز', 
  'بندرعباس', 'رشت', 'کرج', 'قم', 'ارومیه', 'زاهدان', 'همدان', 'کاشان', 'بوشهر'
];

interface AnalysisResultData {
  monthlyConsumptionKwh: number | null;
  solarCapacityKwp: number | null;
  recommendedDesign: string;
  status?: 'SUCCESS' | 'INSUFFICIENT_DATA';
  missingFields?: string[];
  dataProvenance?: {
    consumption?: {
      value: number | null;
      source: string;
      classification: string;
      confidence: string;
    };
    area?: {
      value: number | null;
      source: string;
      isConstrained: boolean;
    };
    irradiance?: {
      sunHours: number | null;
      source: string;
      classification: string;
    };
  };
  extractionObservables?: {
    bill?: {
      extractedMonthlyKwh?: number | null;
      periodConsumptionKwh?: number | null;
      periodDays?: number | null;
      tariffType?: string | null;
      confidence?: string;
      observableNotes?: string;
    } | null;
    site?: {
      roofType?: string;
      visibleObstacles?: string[];
      roofSuitability?: string;
      visualObservations?: string;
    } | null;
  };
  engineeringSizing?: {
    requiredKwp?: number;
    finalKwp?: number;
    spaceConstrained?: boolean;
    numberOfPanels?: number;
    inverterKw?: number;
    performanceRatioUsed?: number;
    sqMetersPerKwpUsed?: number;
  } | null;
  disclaimers?: string[];
}

interface Props {
  area: number;
  city?: string;
  isSolar?: boolean;
  onAnalysisComplete: (consumption: number | null, recommendation: string, capacity: number | null) => void;
}

export default function SmartAnalyzer({ area: defaultArea, city: defaultCity, isSolar = true, onAnalysisComplete }: Props) {
  const [billImage, setBillImage] = useState<string | null>(null);
  const [siteImages, setSiteImages] = useState<string[]>([]);
  const [manualKwh, setManualKwh] = useState<string>('');
  const [manualArea, setManualArea] = useState<string>(defaultArea ? String(defaultArea) : '');
  const [selectedCity, setSelectedCity] = useState<string>(defaultCity || 'تهران');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResultData | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'bill' | 'site') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'bill') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillImage(reader.result as string);
      };
      reader.readAsDataURL(files[0]);
    } else {
      const newImages: string[] = [];
      let loadedCount = 0;
      
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          loadedCount++;
          if (loadedCount === files.length) {
            setSiteImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSiteImage = (index: number) => {
    setSiteImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!billImage && siteImages.length === 0 && !manualKwh) {
      setError('لطفاً حداقل یک تصویر (قبض یا محل احداث) بارگذاری کنید یا مقدار مصرف ماهانه را وارد فرمایید.');
      return;
    }
    
    setError(null);
    setIsAnalyzing(true);
    setResult(null);

    try {
      const extractBase64Data = (dataUrl: string) => {
        const parts = dataUrl.split(',');
        return {
          mimeType: parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg',
          data: parts[1]
        };
      };

      const finalArea = manualArea ? Number(manualArea) : defaultArea;
      const payload: any = { 
        area: finalArea,
        city: selectedCity || defaultCity || 'تهران'
      };
      
      if (billImage) payload.billImage = extractBase64Data(billImage);
      if (siteImages.length > 0) payload.siteImages = siteImages.map(img => extractBase64Data(img));
      if (manualKwh) payload.manualConsumption = Number(manualKwh);

      const res = await fetch('/api/energy/analyze-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'خطا در تحلیل تصویر');
      }

      const data: AnalysisResultData = await res.json();
      setResult(data);

      onAnalysisComplete(
        data.monthlyConsumptionKwh !== undefined ? data.monthlyConsumptionKwh : null,
        data.recommendedDesign || '',
        data.solarCapacityKwp !== undefined ? data.solarCapacityKwp : null
      );

    } catch (err: any) {
      setError(err.message || 'خطا در تحلیل هوشمند تصویر. لطفاً مجدداً تلاش کنید.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 shadow-sm mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">تحلیل هوشمند تصویر و قبض (Smart Vision Analysis)</h2>
          <p className="text-sm text-gray-500 mt-1">
            استخراج خودکار اطلاعات مصرف و مشخصات محل احداث با اتصال به موتور محاسباتی معین
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isSolar ? 'md:grid-cols-2' : ''} gap-6 mb-6`}>
        {/* Site Images Upload */}
        {isSolar && (
        <div className="bg-white p-5 rounded-xl border border-indigo-50 shadow-sm relative group">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
            <span>عکس‌های محل احداث / پشت‌بام</span>
            <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">{siteImages.length} عکس</span>
          </h3>
          
          <div className="flex flex-wrap gap-3 mb-3">
            {siteImages.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                <img src={img} alt="Site" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeSiteImage(idx)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <label className="cursor-pointer w-20 h-20 bg-gray-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors">
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'site')} />
              <Camera size={20} className="text-indigo-300 mb-1" />
              <span className="text-[10px] font-semibold text-gray-500">افزودن عکس</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            جهت شناسایی نوع سقف، موانع فیزیکی و سایه‌اندازی‌های مشهود توسط بینایی ماشین.
          </p>
        </div>
        )}

        {/* Bill Image Upload */}
        <div className="bg-white p-5 rounded-xl border border-indigo-50 shadow-sm relative overflow-hidden group">
          <h3 className="text-sm font-bold text-gray-700 mb-3">عکس قبض برق (استخراج مصرف)</h3>
          <label className="cursor-pointer block text-center">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'bill')} />
            {billImage ? (
              <div className="relative">
                <img src={billImage} alt="Bill" className="w-full h-32 object-cover rounded-lg mb-3 opacity-90" />
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-indigo-600 font-bold bg-indigo-50/90 px-3 py-1.5 rounded-lg inline-block whitespace-nowrap">
                  تغییر عکس قبض
                </span>
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-indigo-400 transition-colors">
                <FileText size={32} className="text-indigo-300 mb-2" />
                <span className="text-sm font-semibold text-gray-500">آپلود عکس قبض برق</span>
              </div>
            )}
          </label>
          <p className="text-xs text-gray-500 leading-relaxed mt-2">
            رقم مصرف و دوره قرائت استخراج گردیده و در صورت ابهام، تأیید دستی شما درخواست خواهد شد.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-indigo-50 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shrink-0">
            <Maximize size={20} />
          </div>
          <div className="flex-1">
            <label className="text-sm font-bold text-gray-700 block mb-1">متراژ محل نصب (مترمربع)</label>
            <input 
              type="number"
              value={manualArea}
              onChange={(e) => setManualArea(e.target.value)}
              placeholder="مثال: 100"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-50 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
          <div className="flex-1">
            <label className="text-sm font-bold text-gray-700 block mb-1">مصرف ماهانه دستی (kWh)</label>
            <input 
              type="number"
              value={manualKwh}
              onChange={(e) => setManualKwh(e.target.value)}
              placeholder="اختیاری در صورت آپلود قبض"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-50 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shrink-0">
            <MapPin size={20} />
          </div>
          <div className="flex-1">
            <label className="text-sm font-bold text-gray-700 block mb-1">شهر (تابش اقلیمی)</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            >
              {POPULAR_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-700 text-sm font-bold mb-4 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-center">
        <button 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-2 mx-auto min-w-[260px] cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              در حال استخراج بینایی و محاسبات مهندسی...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              استخراج داده‌های تصویری و ظرفیت‌سنجی
            </>
          )}
        </button>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white p-6 rounded-xl border border-indigo-100 shadow-sm space-y-4"
        >
          {/* Missing data alert if status is INSUFFICIENT_DATA */}
          {result.status === 'INSUFFICIENT_DATA' && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">داده‌های ورودی جهت ظرفیت‌سنجی مهندسی ناکافی است</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">{result.recommendedDesign}</p>
                {result.missingFields && result.missingFields.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {result.missingFields.map(f => (
                      <span key={f} className="text-[11px] bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded font-mono">
                        {f === 'monthlyConsumptionKwh' ? 'مصرف ماهانه برق' : f === 'city_or_sunHours' ? 'شهر یا ساعات تابش' : f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success or Partial Result View */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
              <Check size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-lg mb-2">نتیجه استخراج تصویری و مدل مهندسی</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-4">{result.recommendedDesign}</p>
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <span className="block text-[11px] text-gray-500 mb-1">مصرف ماهانه مبنا</span>
                  {result.monthlyConsumptionKwh !== null && result.monthlyConsumptionKwh !== undefined ? (
                    <span className="font-black text-gray-800 text-base">
                      {result.monthlyConsumptionKwh} <span className="text-xs font-normal">kWh</span>
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                      اطلاعات کافی نیست
                    </span>
                  )}
                  <span className="block text-[10px] text-indigo-600 mt-1 font-medium">
                    {result.monthlyConsumptionKwh === null || result.monthlyConsumptionKwh === undefined
                      ? 'نیازمند ورود دستی یا قبض'
                      : result.dataProvenance?.consumption?.source === 'USER_MANUAL_INPUT'
                      ? 'ورودی دستی کاربر'
                      : 'استخراج از قبض'}
                  </span>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <span className="block text-[11px] text-indigo-600 mb-1">ظرفیت مهندسی سامانه</span>
                  {result.solarCapacityKwp !== null && result.solarCapacityKwp !== undefined ? (
                    <span className="font-black text-indigo-900 text-base">
                      {result.solarCapacityKwp} <span className="text-xs font-normal">kWp</span>
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                      اطلاعات کافی نیست
                    </span>
                  )}
                  {result.engineeringSizing?.numberOfPanels ? (
                    <span className="block text-[10px] text-indigo-700 mt-1">{result.engineeringSizing.numberOfPanels} پنل ۵۵۰ وات</span>
                  ) : null}
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <span className="block text-[11px] text-amber-700 mb-1">تابش روزانه اقلیمی</span>
                  <span className="font-black text-amber-900 text-base">
                    {result.dataProvenance?.irradiance?.sunHours !== null && result.dataProvenance?.irradiance?.sunHours !== undefined ? (
                      <>
                        {result.dataProvenance.irradiance.sunHours} <span className="text-xs font-normal">ساعت/روز</span>
                      </>
                    ) : (
                      <span className="text-xs font-normal text-amber-700">نامشخص</span>
                    )}
                  </span>
                  <span className="block text-[10px] text-amber-800 mt-1 truncate">
                    {result.dataProvenance?.irradiance?.source || 'NASA POWER'}
                  </span>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <span className="block text-[11px] text-blue-700 mb-1">مدل مهندسی</span>
                  <span className="font-black text-blue-900 text-sm">PR: {result.engineeringSizing?.performanceRatioUsed || 0.775}</span>
                  <span className="block text-[10px] text-blue-700 mt-1">{result.engineeringSizing?.sqMetersPerKwpUsed || 6.5} m²/kWp</span>
                </div>
              </div>

              {/* Visual Observations from site/roof if available */}
              {result.extractionObservables?.site && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 mb-3 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Info size={14} className="text-slate-500" />
                    <span>مشاهدات بینایی ماشین از محل احداث:</span>
                  </div>
                  {result.extractionObservables.site.roofType && (
                    <div>نوع سقف مشهود: <span className="font-semibold">{result.extractionObservables.site.roofType}</span></div>
                  )}
                  {result.extractionObservables.site.visibleObstacles && result.extractionObservables.site.visibleObstacles.length > 0 && (
                    <div>موانع مشهود: <span className="font-semibold">{result.extractionObservables.site.visibleObstacles.join('، ')}</span></div>
                  )}
                </div>
              )}

              {/* Formal Engineering Disclaimer */}
              <div className="flex items-start gap-2 text-[11px] text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/80">
                <ShieldCheck size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-semibold text-zinc-600">عدم قطعیت و تعهد مهندسی:</p>
                  <p>استخراج تصویری صرفاً ابزار کمکی اولیه است. ابعاد نهایی، ظرفیت کابل‌کشی، انشعاب شبکه و تحلیل سایه‌اندازی دقیق مستلزم بازدید و تاییدیه رسمی شرکت مهندسی EPC در محل احداث است.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
