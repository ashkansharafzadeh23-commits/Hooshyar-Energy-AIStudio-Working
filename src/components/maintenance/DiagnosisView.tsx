import React, { useState } from 'react';
import { 
  Stethoscope, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Coins, 
  FileText, 
  ArrowRight,
  Upload,
  Camera,
  Search,
  Loader2,
  X,
  Check
} from 'lucide-react';
import { AssetAlert, MaintenanceDiagnosis } from '../../types/maintenance';
import Markdown from 'react-markdown';

interface DiagnosisViewProps {
  selectedAlert: AssetAlert | null;
  diagnosis: MaintenanceDiagnosis | null;
  loading: boolean;
  onRunDiagnosis: (alertId: string) => void;
  onCreateCaseFromDiagnosis: (alert: AssetAlert, diagnosis: MaintenanceDiagnosis) => void;
  onBackToAlerts: () => void;
}

export const DiagnosisView: React.FC<DiagnosisViewProps> = ({
  selectedAlert,
  diagnosis,
  loading,
  onRunDiagnosis,
  onCreateCaseFromDiagnosis,
  onBackToAlerts
}) => {
  // Visual Inspection State
  const [images, setImages] = useState<{ data: string; mimeType: string; previewUrl: string }[]>([]);
  const [visualDescription, setVisualDescription] = useState('');
  const [isAnalyzingVisual, setIsAnalyzingVisual] = useState(false);
  const [visualDiagnosisResult, setVisualDiagnosisResult] = useState<MaintenanceDiagnosis | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          setImages(prev => [
            ...prev,
            {
              data: base64Data,
              mimeType: file.type || 'image/jpeg',
              previewUrl: result
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeVisual = async () => {
    if (images.length === 0 && !visualDescription) return;
    setIsAnalyzingVisual(true);
    setVisualError(null);
    setVisualDiagnosisResult(null);

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
      const symptomsList: string[] = [];
      if (selectedAlert?.title) symptomsList.push(selectedAlert.title);
      if (selectedAlert?.description) symptomsList.push(selectedAlert.description);
      if (visualDescription) symptomsList.push(`مشاهدات بازرسی بصری: ${visualDescription}`);

      const payload = {
        assetId: selectedAlert?.assetId,
        alertId: selectedAlert?.id,
        componentId: selectedAlert?.componentId,
        equipmentType: selectedAlert?.metricType || 'SOLAR_EQUIPMENT',
        symptoms: symptomsList,
        description: visualDescription,
        photos: images.map((img, idx) => ({
          name: `equipment_photo_${idx + 1}.jpg`,
          mimeType: img.mimeType || 'image/jpeg',
          data: img.data
        })),
        triggerAiAssisted: true
      };

      const res = await fetch('/api/maintenance/diagnose', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          setVisualError('جهت انجام عیب‌یابی تصویری هوشمند، لطفاً ابتدا وارد حساب کاربری خود شوید.');
        } else {
          setVisualError(data.error || 'خطا در اجرای فرآیند عیب‌یابی تصویری تجهیزات.');
        }
        return;
      }

      setVisualDiagnosisResult(data);
    } catch (error: any) {
      console.error('Visual diagnosis failed:', error);
      setVisualError('خطا در برقراری ارتباط با سرور عیب‌یابی هوشمند. لطفاً اتصال شبکه را بررسی نمایید.');
    } finally {
      setIsAnalyzingVisual(false);
    }
  };

  if (!selectedAlert) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Stethoscope size={36} className="text-slate-400 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800">هیچ هشداری برای تحلیل و تشخیص انتخاب نشده است</h4>
        <p className="text-xs text-slate-500 mt-1">
          لطفاً از تب داشبورد هشدارها، روی دکمه «تشخیص و گارانتی» هشدار مورد نظر کلیک نمایید.
        </p>
        <button
          onClick={onBackToAlerts}
          className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
        >
          بازگشت به لیست هشدارها
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="maintenance-diagnosis-view">
      {/* Alert Header Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-blue-600">{selectedAlert.alertCode}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">
              ثبت‌شده در {new Date(selectedAlert.detectedAt).toLocaleString('fa-IR')}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Stethoscope className="text-indigo-600" size={20} />
            تشخیص فنی، ریشه‌یابی و وضعیت گارانتی
          </h2>
          <p className="text-xs text-slate-600 mt-1">{selectedAlert.title} — {selectedAlert.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRunDiagnosis(selectedAlert.id)}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Stethoscope size={14} />}
            اجرای مجدد موتور تشخیص هوشمند
          </button>
          <button
            onClick={onBackToAlerts}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition-all"
          >
            بازگشت
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">در حال ارزیابی الگوهای تله‌متری و تحلیل قواعد فنی...</p>
          <p className="text-xs text-slate-400 mt-1">موتور تخصصی عیب‌یابی در حال بررسی اسناد گارانتی و تجهیزات است.</p>
        </div>
      )}

      {/* Diagnosis Results */}
      {!loading && diagnosis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Causes & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Root Causes Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b pb-3">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={18} />
                  علل ریشه‌ای شناسایی‌شده (Root Causes)
                </span>
                {diagnosis.confidenceScore !== undefined && diagnosis.confidenceScore > 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                    اطمینان مدل: {Math.round(diagnosis.confidenceScore * 100)}%
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
                    ارزیابی کیفی اولیه (نیازمند بازرسی)
                  </span>
                )}
              </h3>

              <div className="space-y-3">
                {diagnosis.rootCauses && diagnosis.rootCauses.length > 0 ? (
                  diagnosis.rootCauses.map((rc, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{rc.cause}</span>
                        {rc.probability !== undefined && rc.probability > 0 ? (
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            احتمال: {Math.round(rc.probability * 100)}%
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            علت محتمل
                          </span>
                        )}
                      </div>
                      {rc.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{rc.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">علت خاصی از قواعد خودکار شناسایی نشد.</p>
                )}
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <CheckCircle2 className="text-emerald-600" size={18} />
                اقدامات پیشنهادی و برآورد هزینه (Recommended Actions)
              </h3>

              <div className="space-y-3">
                {Array.isArray(diagnosis.recommendedActions) && diagnosis.recommendedActions.length > 0 ? (
                  diagnosis.recommendedActions.map((act: any, idx: number) => {
                    const isObj = typeof act === 'object' && act !== null;
                    const title = isObj ? act.action || act.title : String(act);
                    const desc = isObj ? act.description : null;
                    const cost = isObj ? act.estimatedCostIrr || act.estimatedCost : null;
                    const hours = isObj ? act.estimatedHours : null;
                    const priority = isObj ? act.priority : null;

                    return (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            {title}
                          </span>
                          {priority && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              اولویت: {priority}
                            </span>
                          )}
                        </div>
                        {desc && <p className="text-xs text-slate-600 pr-7">{desc}</p>}
                        {(cost || hours) && (
                          <div className="flex items-center gap-4 pr-7 text-xs text-slate-500 pt-1">
                            {hours && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> تخمین زمان: {hours} ساعت
                              </span>
                            )}
                            {cost && (
                              <span className="flex items-center gap-1 font-mono text-emerald-700 font-bold">
                                <Coins size={12} /> برآورد هزینه: {Number(cost).toLocaleString()} ریال
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">اقدام پیشنهادی خودکار ثبت نشده است.</p>
                )}
              </div>

              {/* Safety Guidance Warnings Box */}
              {diagnosis.safetyGuidance && diagnosis.safetyGuidance.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                    <span>راهنما و الزامات حیاتی ایمنی:</span>
                  </div>
                  <ul className="space-y-1 text-amber-800 list-disc list-inside text-[11px] leading-relaxed">
                    {diagnosis.safetyGuidance.map((sg: string, idx: number) => (
                      <li key={idx}>{sg}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t flex justify-end">
                <button
                  onClick={() => onCreateCaseFromDiagnosis(selectedAlert, diagnosis)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <FileText size={16} />
                  ایجاد پرونده تعمیراتی بر مبنای این تشخیص
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Column: Warranty Status & Symptoms */}
          <div className="space-y-6">
            {/* Warranty Impact Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <ShieldCheck className="text-blue-600" size={18} />
                وضعیت گارانتی تجهیز (Warranty)
              </h3>

              {diagnosis.warrantyImpact ? (
                <div className="space-y-3">
                  <div
                    className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                      diagnosis.warrantyImpact.hasWarrantyCoverage || diagnosis.warrantyImpact.eligible
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {diagnosis.warrantyImpact.hasWarrantyCoverage || diagnosis.warrantyImpact.eligible ? (
                      <ShieldCheck size={24} className="text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert size={24} className="text-amber-600 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold">
                        {diagnosis.warrantyImpact.hasWarrantyCoverage || diagnosis.warrantyImpact.eligible
                          ? 'تجهیز تحت پوشش گارانتی معتبر است'
                          : 'فاقد پوشش گارانتی فعال یا نیازمند بررسی'}
                      </h4>
                      <p className="text-[11px] mt-0.5 opacity-90">{diagnosis.warrantyImpact.summary}</p>
                    </div>
                  </div>

                  {diagnosis.warrantyImpact.provider && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between">
                      <span>تامین‌کننده / ارائه‌دهنده:</span>
                      <span className="font-bold text-slate-900">{diagnosis.warrantyImpact.provider}</span>
                    </div>
                  )}

                  {diagnosis.warrantyImpact.warrantyNotes && (
                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      یادداشت گارانتی: {diagnosis.warrantyImpact.warrantyNotes}
                    </p>
                  )}

                  {diagnosis.warrantyImpact.claimProcedure && (
                    <p className="text-xs text-blue-600 leading-relaxed bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                      دستورالعمل ادعای خسارت: {diagnosis.warrantyImpact.claimProcedure}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">اطلاعات گارانتی در دسترس نیست.</p>
              )}
            </div>

            {/* Symptoms & Inferences */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">شواهد و نشانه‌های مشاهده‌شده</h3>
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                {diagnosis.symptoms && diagnosis.symptoms.length > 0 ? (
                  diagnosis.symptoms.map((s, idx) => <li key={idx}>{s}</li>)
                ) : (
                  <li>شواهد تله‌متری اولیه: افت بازدهی یا نقض آستانه کارکرد</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Visual Photo Inspection Option (Preserving Visual Intelligence) */}
      <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 p-6 rounded-2xl border border-indigo-100 space-y-4">
        <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
          <Camera className="text-indigo-600" size={18} />
          ارزیابی بصری تجهیزات از طریق بارگذاری تصویر
        </h3>
        <p className="text-xs text-indigo-700">
          می‌توانید تصویر پنل، اینورتر، آسیب‌دیدگی ظاهری، کثیفی یا سوختگی اتصالات را بارگذاری کنید تا هوش مصنوعی ارزیابی تکمیلی ارائه دهد.
        </p>

        <div className="space-y-3">
          <div
            className="w-full bg-white border-2 border-dashed border-indigo-200 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
            onClick={() => document.getElementById('diag-image-upload')?.click()}
          >
            <Upload size={24} className="text-indigo-500 mb-1.5" />
            <span className="text-xs font-bold text-indigo-900">افزودن تصاویر تجهیزات</span>
            <input
              id="diag-image-upload"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                  <img src={img.previewUrl} alt="Equipment" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <textarea
              value={visualDescription}
              onChange={e => setVisualDescription(e.target.value)}
              placeholder="توضیحات ظاهری یا مشاهدات محل..."
              className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs focus:ring-2 focus:ring-indigo-300 outline-none h-16 resize-none bg-white"
            />
          </div>

          <button
            onClick={handleAnalyzeVisual}
            disabled={isAnalyzingVisual || (images.length === 0 && !visualDescription)}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAnalyzingVisual ? (
              <><Loader2 size={16} className="animate-spin" /> در حال تحلیل تصویر...</>
            ) : (
              <><Search size={16} /> تحلیل تصویر تجهیزات</>
            )}
          </button>

          {visualError && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="shrink-0 mt-0.5 text-red-600" size={16} />
              <p className="leading-relaxed">{visualError}</p>
            </div>
          )}

          {visualDiagnosisResult && (
            <div className="mt-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs leading-relaxed space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/60 pb-2">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  نتیجه عیب‌یابی و بازرسی بصری:
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    visualDiagnosisResult.diagnosisMethod === 'AI_ASSISTED'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  }`}>
                    {visualDiagnosisResult.diagnosisMethod === 'AI_ASSISTED' ? 'تحلیل هوش مصنوعی + کارشناسی' : 'موتور قوانین مهندسی'}
                  </span>
                  {visualDiagnosisResult.confidenceScore !== undefined && (
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold text-[10px]">
                      اطمینان: {Math.round(visualDiagnosisResult.confidenceScore)}%
                    </span>
                  )}
                </div>
              </div>

              {/* AI response summary if available */}
              {visualDiagnosisResult.rawAiResponse && (
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200 prose prose-xs max-w-none">
                  <Markdown>{visualDiagnosisResult.rawAiResponse}</Markdown>
                </div>
              )}

              {/* Root causes */}
              {visualDiagnosisResult.likelyRootCauses && visualDiagnosisResult.likelyRootCauses.length > 0 && (
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                    علل ریشه‌ای شناسایی‌شده:
                  </h5>
                  <div className="space-y-1.5">
                    {visualDiagnosisResult.likelyRootCauses.map((rc, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{rc.cause}</span>
                          {rc.probability !== undefined && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                              {Math.round(rc.probability * 100)}٪
                            </span>
                          )}
                        </div>
                        {rc.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{rc.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              {visualDiagnosisResult.recommendedActions && visualDiagnosisResult.recommendedActions.length > 0 && (
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">اقدامات اصلاحی پیشنهادی:</h5>
                  <ul className="space-y-1">
                    {visualDiagnosisResult.recommendedActions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 text-[11px]">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{act.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Tools & Parts if any */}
              {visualDiagnosisResult.requiredTools && visualDiagnosisResult.requiredTools.length > 0 && (
                <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300">ابزارهای لازم تکنسین: </span>
                  {visualDiagnosisResult.requiredTools.join('، ')}
                </div>
              )}

              {/* Action: Create Case */}
              {selectedAlert && (
                <button
                  type="button"
                  onClick={() => onCreateCaseFromDiagnosis(selectedAlert, visualDiagnosisResult)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Check size={14} />
                  ایجاد پرونده اقدام اصلاحی بر اساس این تحلیل
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
