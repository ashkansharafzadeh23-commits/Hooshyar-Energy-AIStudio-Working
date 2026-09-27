import React, { useState } from 'react';
import { Camera, FileText, Zap, Loader2, Sparkles, Check, Trash2, Maximize } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  area: number;
  isSolar?: boolean;
  onAnalysisComplete: (consumption: number, recommendation: string, capacity: number) => void;
}

export default function SmartAnalyzer({ area: defaultArea, isSolar = true, onAnalysisComplete }: Props) {
  const [billImage, setBillImage] = useState<string | null>(null);
  const [siteImages, setSiteImages] = useState<string[]>([]);
  const [manualKwh, setManualKwh] = useState<string>('');
  const [manualArea, setManualArea] = useState<string>(defaultArea ? String(defaultArea) : '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ rec: string, cap: number, kwh: number } | null>(null);

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
      setError('لطفا حداقل یک تصویر آپلود کنید یا مصرف ماهانه را بنویسید.');
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
      const payload: any = { area: finalArea };
      
      if (billImage) payload.billImage = extractBase64Data(billImage);
      if (siteImages.length > 0) payload.siteImages = siteImages.map(img => extractBase64Data(img));
      if (manualKwh) payload.manualConsumption = Number(manualKwh);

      const res = await fetch('/api/energy/analyze-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to analyze');

      const data = await res.json();
      
      setResult({
        rec: data.recommendedDesign,
        cap: data.solarCapacityKwp,
        kwh: data.monthlyConsumptionKwh
      });

      onAnalysisComplete(data.monthlyConsumptionKwh, data.recommendedDesign, data.solarCapacityKwp);

    } catch (err) {
      setError('خطا در تحلیل هوشمند. لطفا دوباره تلاش کنید.');
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
          <h2 className="text-xl font-bold text-gray-800">تحلیل هوشمند (Smart Analysis)</h2>
          <p className="text-sm text-gray-500 mt-1">{isSolar ? 'آپلود عکس محل و قبض' : 'آپلود عکس قبض'} برای پیشنهاد خودکار هوش مصنوعی</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isSolar ? 'md:grid-cols-2' : ''} gap-6 mb-6`}>
        {/* Site Images Upload */}
        {isSolar && (
        <div className="bg-white p-5 rounded-xl border border-indigo-50 shadow-sm relative group">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
            <span>عکس‌های محل احداث</span>
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
              <span className="text-[10px] font-semibold text-gray-500">افزودن</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            می‌توانید چندین عکس از زوایای مختلف پشت‌بام یا زمین بارگذاری کنید.
          </p>
        </div>
        )}

        {/* Bill Image Upload */}
        <div className="bg-white p-5 rounded-xl border border-indigo-50 shadow-sm relative overflow-hidden group">
          <h3 className="text-sm font-bold text-gray-700 mb-3">عکس قبض برق</h3>
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              placeholder="مثال: 350"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm font-bold mb-4 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

      <div className="text-center">
        <button 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-2 mx-auto min-w-[240px]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              در حال تحلیل هوشمند...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              تحلیل با هوش مصنوعی و پیشنهاد طراحی
            </>
          )}
        </button>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white p-6 rounded-xl border border-indigo-100 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
              <Check size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">پیشنهاد هوشمند سیستم</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{result.rec}</p>
              
              <div className="flex flex-wrap gap-3">
                {result.kwh > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                    <span className="block text-xs text-gray-500 mb-1">مصرف تخمینی</span>
                    <span className="font-black text-gray-800">{result.kwh} <span className="text-xs font-normal">کیلووات ساعت</span></span>
                  </div>
                )}
                {result.cap > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2">
                    <span className="block text-xs text-indigo-500 mb-1">ظرفیت پیشنهادی پنل</span>
                    <span className="font-black text-indigo-900">{result.cap} <span className="text-xs font-normal">کیلووات</span></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
