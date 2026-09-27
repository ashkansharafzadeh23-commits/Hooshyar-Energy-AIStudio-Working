import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  Camera,
  Trash2,
  UserCheck,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  Search,
  ExternalLink,
  Info,
  Phone,
  User,
  Zap,
  Cpu,
  Layers,
  Check,
  Loader2
} from 'lucide-react';
import { MaintenanceCase, MaintenanceDiagnosis, TechnicianMatch } from '../../types/maintenance';

interface CustomerMaintenanceRequestProps {
  onCaseCreated: (newCase: MaintenanceCase) => void;
  onGoToCases: () => void;
  onTrackCase: (caseId: string) => void;
  preselectedTechnician?: TechnicianMatch | null;
}

export const CustomerMaintenanceRequest: React.FC<CustomerMaintenanceRequestProps> = ({
  onCaseCreated,
  onGoToCases,
  onTrackCase,
  preselectedTechnician
}) => {
  // Step state (1 to 5)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // User Assets
  const [userAssets, setUserAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetChoice, setAssetChoice] = useState<'REGISTERED' | 'UNREGISTERED'>('UNREGISTERED');

  // Step 1: Equipment Details
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [equipmentType, setEquipmentType] = useState<string>('INVERTER');
  const [equipmentBrand, setEquipmentBrand] = useState<string>('');
  const [equipmentModel, setEquipmentModel] = useState<string>('');
  const [locationCity, setLocationCity] = useState<string>('تهران');
  const [approxCapacityKw, setApproxCapacityKw] = useState<string>('');

  // Step 2: Symptoms & Problem
  const [problemTitle, setProblemTitle] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');

  // Step 3: Photos & Documents
  const [photos, setPhotos] = useState<{ id: string; name: string; preview: string; base64: string }[]>([]);
  const [billDoc, setBillDoc] = useState<{
    name: string;
    preview?: string;
    data?: string;
    status?: 'NOT_PROVIDED' | 'UPLOADED_PENDING_EXTRACTION' | 'EXTRACTION_AVAILABLE' | 'EXTRACTION_FAILED' | 'UNVERIFIED';
    extractedData?: any;
  } | null>(null);

  // Step 4: AI Diagnosis & Evidence
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<MaintenanceDiagnosis | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Step 5: Technician Matching & Submission
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianMatch[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianMatch | null>(preselectedTechnician || null);
  const [autoMatch, setAutoMatch] = useState<boolean>(!preselectedTechnician);
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [createdCase, setCreatedCase] = useState<MaintenanceCase | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const commonSymptoms = [
    { id: 'gen_drop', label: 'کاهش ناگهانی یا غیرعادی تولید برق', type: 'PANEL' },
    { id: 'inv_red', label: 'چراغ خطای قرمز یا کد ارور روی اینورتر', type: 'INVERTER' },
    { id: 'trip_rcd', label: 'قطع شدن مکرر فیوز یا کلید محافظ جان (Trip)', type: 'INVERTER' },
    { id: 'hotspot', label: 'مشاهده داغ‌زدگی، تغییر رنگ یا ترک شیشه پنل', type: 'PANEL' },
    { id: 'smell_noise', label: 'بوی سوختگی، صدای جرقه یا نویز غیرعادی', type: 'INVERTER' },
    { id: 'comm_loss', label: 'قطع ارتباط سامانه پایش و دیتالاگر', type: 'MONITORING' },
    { id: 'battery_cutoff', label: 'تخلیه زودهنگام یا قطع سیستم مدیریت باتری (BMS)', type: 'BATTERY' },
    { id: 'dust_soiling', label: 'انباشت شدید گرد و غبار یا رسوب روی ماژول‌ها', type: 'PANEL' }
  ];

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // Fetch user's registered solar assets on mount
  useEffect(() => {
    const loadAssets = async () => {
      setLoadingAssets(true);
      try {
        const res = await fetch('/api/assets', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.assets || [];
          setUserAssets(list);
          if (list.length > 0) {
            setAssetChoice('REGISTERED');
            setSelectedAssetId(list[0].id);
          }
        }
      } catch (e) {
        console.error('Error fetching assets:', e);
      } finally {
        setLoadingAssets(false);
      }
    };
    loadAssets();
  }, []);

  // When step changes to 5, load matching technicians
  useEffect(() => {
    if (step === 5 && technicians.length === 0) {
      fetchMatchingTechnicians();
    }
  }, [step]);

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1] || '';
          setPhotos(prev => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              preview: result,
              base64: base64Data
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove Photo
  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  // Run Preliminary Evidence-Based Diagnosis
  const handleRunDiagnosis = async () => {
    setDiagnosing(true);
    setDiagError(null);
    try {
      const payload: any = {
        assetId: assetChoice === 'REGISTERED' ? selectedAssetId : 'UNREGISTERED',
        componentId: selectedComponentId || undefined,
        equipmentType: assetChoice === 'REGISTERED' ? undefined : equipmentType,
        symptoms: selectedSymptoms,
        description: problemDescription,
        locationCity,
        photos: photos.map(p => ({ name: p.name, data: p.base64 })),
        billData: billDoc ? {
          name: billDoc.name,
          status: billDoc.status || 'UNVERIFIED',
          data: billDoc.data
        } : undefined,
        triggerAiAssisted: true
      };

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ارزیابی و عیب‌یابی اولیه');
      }

      const diagData = await res.json();
      setDiagnosis(diagData);
    } catch (e: any) {
      setDiagError(e?.message || 'خطا در ارتباط با سامانه عیب‌یابی هوشمند');
    } finally {
      setDiagnosing(false);
    }
  };

  // Fetch Matching Technicians
  const fetchMatchingTechnicians = async () => {
    setLoadingTechnicians(true);
    try {
      const selectedAsset = userAssets.find(a => a.id === selectedAssetId);
      const queryCity = assetChoice === 'REGISTERED' && selectedAsset?.location?.city
        ? selectedAsset.location.city
        : locationCity;

      const res = await fetch('/api/technicians/matching', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          symptoms: selectedSymptoms,
          location: queryCity,
          equipmentType: assetChoice === 'REGISTERED' ? undefined : equipmentType,
          assetId: assetChoice === 'REGISTERED' ? selectedAssetId : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        const matches: TechnicianMatch[] = Array.isArray(data) ? data : [];
        setTechnicians(matches);
        if (!selectedTechnician && matches.length > 0 && !autoMatch) {
          setSelectedTechnician(matches[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching matching technicians:', e);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  // Final Case Submission
  const handleSubmitRequest = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const selectedAsset = userAssets.find(a => a.id === selectedAssetId);
      const effectiveTech = autoMatch ? (technicians[0] || null) : selectedTechnician;

      const payload = {
        assetId: assetChoice === 'REGISTERED' ? selectedAssetId : 'UNREGISTERED',
        componentId: selectedComponentId || undefined,
        equipmentType: assetChoice === 'REGISTERED' ? selectedAsset?.assetType : equipmentType,
        title: problemTitle || (selectedSymptoms.length > 0 ? selectedSymptoms[0] : 'درخواست تعمیرات و سرویس خورشیدی'),
        description: problemDescription || `درخواست ثبت‌شده برای تجهیز ${equipmentType} با علائم: ${selectedSymptoms.join('، ')}`,
        priority,
        category: 'CORRECTIVE',
        symptoms: selectedSymptoms,
        diagnosisId: diagnosis?.id,
        assignedTechnicianId: effectiveTech?.technicianId,
        assignedTechnicianName: effectiveTech?.fullName,
        assignedTechnicianPhone: effectiveTech?.phone,
        contactName: contactName || undefined,
        contactPhone: contactPhone || undefined,
        scheduledDate: scheduledDate || undefined,
        photos: photos.map(p => ({ name: p.name, data: p.base64 })),
        billDoc: billDoc ? {
          name: billDoc.name,
          status: billDoc.status || 'UNVERIFIED',
          data: billDoc.data
        } : undefined
      };

      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در ثبت رسمی پرونده تعمیراتی');
      }

      const caseData: MaintenanceCase = await res.json();
      setCreatedCase(caseData);
      onCaseCreated(caseData);
    } catch (e: any) {
      setSubmitError(e?.message || 'خطا در ارسال درخواست به سرور');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1: Validation
  const canGoToStep2 = () => {
    if (assetChoice === 'REGISTERED') {
      return Boolean(selectedAssetId);
    }
    return Boolean(equipmentType);
  };

  // Step 2: Validation
  const canGoToStep3 = () => {
    return selectedSymptoms.length > 0 || problemTitle.trim().length > 0 || problemDescription.trim().length > 0;
  };

  // Render Confirmation if created
  if (createdCase) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10 text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={36} />
        </div>

        <div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
            ثبت موفق درخواست
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">
            درخواست تعمیرات و نگهداری با موفقیت ثبت گردید
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            پرونده شما در سامانه رسمی هوشیار انرژی ثبت و در صف ارجاع قرار گرفت.
          </p>
        </div>

        {/* Case Card */}
        <div className="max-w-md mx-auto bg-slate-50 rounded-2xl border border-slate-200 p-5 text-right space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs text-slate-500 font-bold">کد پیگیری پرونده:</span>
            <span className="text-sm font-black font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              {createdCase.caseNumber || createdCase.maintenanceCode || createdCase.id}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">عنوان مشکل:</span>
            <span className="font-bold text-slate-800">{createdCase.title}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">وضعیت پرونده:</span>
            <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800">
              {createdCase.status === 'ASSIGNED' ? 'تخصیص‌یافته به متخصص' : 'در انتظار بررسی'}
            </span>
          </div>

          {createdCase.assignedTechnicianName && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-slate-500">متخصص منتخب:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <UserCheck size={14} />
                {createdCase.assignedTechnicianName}
              </span>
            </div>
          )}

          {createdCase.assetId && createdCase.assetId !== 'UNREGISTERED' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                این پرونده پس از اتمام اقدامات O&M، مستقیماً در شناسنامه فنی دارایی (Asset Passport) ثبت و آرشیو خواهد شد.
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onTrackCase(createdCase.id)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <span>پیگیری لحظه‌ای و جزئیات پرونده</span>
            <ArrowLeft size={16} />
          </button>

          <button
            onClick={onGoToCases}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            مشاهده تمام پرونده‌های من
          </button>

          <button
            onClick={() => {
              setCreatedCase(null);
              setStep(1);
              setDiagnosis(null);
              setPhotos([]);
              setSelectedSymptoms([]);
              setProblemTitle('');
              setProblemDescription('');
            }}
            className="px-4 py-3 text-slate-500 hover:text-slate-800 text-xs font-bold"
          >
            ثبت یک درخواست دیگر
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
      {/* Header and Stepper */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              درخواست هوشمند تعمیرات و نگهداری O&M
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
              <Wrench className="text-blue-600" size={20} />
              ثبت درخواست عیب‌یابی، تعمیر و اعزام متخصص
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              مراحل را طی کنید تا ارزیابی هوشمند و اتصال به متخصصان مجاز دارای صلاحیت انجام شود.
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-slate-400">مرحله {step} از ۵</span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(s => (
                <div
                  key={s}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono transition-all ${
                    s === step
                      ? 'bg-blue-600 text-white shadow-sm'
                      : s < step
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {s < step ? <Check size={12} /> : s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stepper Labels */}
        <div className="grid grid-cols-5 gap-2 mt-4 text-[11px] font-bold text-center">
          <div className={step >= 1 ? 'text-blue-600' : 'text-slate-400'}>۱. مشخصات تجهیز</div>
          <div className={step >= 2 ? 'text-blue-600' : 'text-slate-400'}>۲. شرح علائم</div>
          <div className={step >= 3 ? 'text-blue-600' : 'text-slate-400'}>۳. تصاویر و مدارک</div>
          <div className={step >= 4 ? 'text-blue-600' : 'text-slate-400'}>۴. عیب‌یابی اولیه</div>
          <div className={step >= 5 ? 'text-blue-600' : 'text-slate-400'}>۵. انتخاب متخصص</div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* STEP 1: Equipment / Asset Selection                            */}
      {/* ============================================================== */}
      {step === 1 && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              گام ۱: مشخصات سامانه یا تجهیز معیوب
            </h3>
            <p className="text-xs text-slate-500">
              آیا تجهیز مورد نظر مربوط به یکی از دارایی‌های ثبت‌شده شما در سامانه است یا تجهیز مستقل می‌باشد؟
            </p>
          </div>

          {/* Choice Segment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAssetChoice('REGISTERED')}
              className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                assetChoice === 'REGISTERED'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${assetChoice === 'REGISTERED' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Zap size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  انتخاب از دارایی‌های خورشیدی ثبت‌شده من
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  اتصال به شناسنامه فنی (Asset Passport)، سوابق تله‌متری و گارانتی معتبر قطعات
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAssetChoice('UNREGISTERED')}
              className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                assetChoice === 'UNREGISTERED'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${assetChoice === 'UNREGISTERED' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Cpu size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  تجهیز یا نیروگاه هنوز در هوشیار ثبت نشده است
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  گزارش خرابی و درخواست سرویس برای هر نوع اینورتر، پنل یا سامانه خورشیدی مستقل
                </p>
              </div>
            </button>
          </div>

          {/* Option A: Registered Asset Selection */}
          {assetChoice === 'REGISTERED' && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              {loadingAssets ? (
                <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                  در حال دریافت لیست دارایی‌های خورشیدی شما...
                </div>
              ) : userAssets.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  هیچ دارایی خورشیدی فعالی برای حساب کاربری شما یافت نشد. لطفاً گزینه «تجهیز ثبت‌نشده» را انتخاب نمایید.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      نیروگاه / دارایی مربوطه:
                    </label>
                    <select
                      value={selectedAssetId}
                      onChange={e => setSelectedAssetId(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {userAssets.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name || a.assetCode} — ظرفیت: {a.installedCapacityKw ?? 'نامشخص'} کیلووات ({a.location?.city || 'محل ثبت‌نشده'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      زیربخش یا تجهیز آسیب‌دیده (اختیاری):
                    </label>
                    <select
                      value={selectedComponentId}
                      onChange={e => setSelectedComponentId(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">کل نیروگاه / بررسی عمومی</option>
                      <option value="inverter-main">اینورتر اصلی (Inverter)</option>
                      <option value="pv-modules">آرایه و پنل‌های فتوولتائیک (PV Modules)</option>
                      <option value="battery-bank">بانک باتری و ذخیره‌ساز (Battery)</option>
                      <option value="combiner-box">تابلو جمع‌کننده و صاعقه‌گیر (Combiner Box / SPD)</option>
                      <option value="structure">سازه فلزی و اتصالات مکانیکی (Structure)</option>
                      <option value="monitoring">دیتالاگر و سنسورهای مانیتورینگ</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Option B: Unregistered Equipment */}
          {assetChoice === 'UNREGISTERED' && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نوع تجهیز معیوب:
                  </label>
                  <select
                    value={equipmentType}
                    onChange={e => setEquipmentType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INVERTER">اینورتر متصل به شبکه (On-Grid Inverter)</option>
                    <option value="PANEL">پنل‌های خورشیدی (Solar PV Panels)</option>
                    <option value="HYBRID_INVERTER">اینورتر هیبرید / متصل به باتری</option>
                    <option value="BATTERY">باتری و سیستم ذخیره‌ساز انرژی</option>
                    <option value="STRUCTURE">سازه و پایه‌های نصب پنل</option>
                    <option value="ELECTRICAL">کابل‌کشی، کلیدها و تابلوی حفاظت برق</option>
                    <option value="MONITORING">سیستم دیتالاگر، مودم و پایش آنلاین</option>
                    <option value="OTHER">سایر ادوات سیستم انرژی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    شهر و محل استقرار تجهیز:
                  </label>
                  <input
                    type="text"
                    value={locationCity}
                    onChange={e => setLocationCity(e.target.value)}
                    placeholder="مثال: تهران، اصفهان، یزد..."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    برند یا سازنده تجهیز (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={equipmentBrand}
                    onChange={e => setEquipmentBrand(e.target.value)}
                    placeholder="مثال: SMA, Sungrow, Growatt, Fronius, Jinko..."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ظرفیت تقریبی سامانه به کیلووات (اختیاری):
                  </label>
                  <input
                    type="number"
                    value={approxCapacityKw}
                    onChange={e => setApproxCapacityKw(e.target.value)}
                    placeholder="مثال: 5, 20, 100..."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!canGoToStep2()}
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <span>مرحله بعد: شرح علائم و مشاهدات</span>
              <ArrowLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2: Symptoms & Problem Description                         */}
      {/* ============================================================== */}
      {step === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              گام ۲: علائم و شرح مشکل مشاهده‌شده
            </h3>
            <p className="text-xs text-slate-500">
              هرگونه تغییر رفتار، هشدار یا نشانه غیرعادی را جهت تشخیص دقیق‌تر انتخاب و یادداشت نمایید.
            </p>
          </div>

          {/* Symptoms Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              علائم شایع (می‌توانید یک یا چند مورد را علامت بزنید):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {commonSymptoms.map(item => {
                const isSelected = selectedSymptoms.includes(item.label);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSymptom(item.label)}
                    className={`p-3 rounded-xl border text-right text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                      {isSelected && <Check size={12} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان مختصر مشکل:
              </label>
              <input
                type="text"
                value={problemTitle}
                onChange={e => setProblemTitle(e.target.value)}
                placeholder="مثال: اینورتر در ساعات اوج تابش ارور 102 می‌دهد و قطع می‌شود"
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                شرح دقیق رخداد یا مشاهدات عینی:
              </label>
              <textarea
                value={problemDescription}
                onChange={e => setProblemDescription(e.target.value)}
                placeholder="توضیح دهید مشکل از چه زمانی آغاز شد، نمایشگر چه کدی نشان می‌دهد و چه اقداماتی تاکنون صورت گرفته است..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سطح فوریت اعلام‌شده:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'LOW', label: 'عادی / بررسی دوره‌ای' },
                  { id: 'MEDIUM', label: 'متوسط / افت تولید' },
                  { id: 'URGENT', label: 'فوری / توقف کامل یا خطر' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      priority === p.id
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowRight size={16} />
              <span>مرحله قبل</span>
            </button>

            <button
              type="button"
              disabled={!canGoToStep3()}
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <span>مرحله بعد: بارگذاری تصاویر و مدارک</span>
              <ArrowLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 3: Photos & Documents Upload                              */}
      {/* ============================================================== */}
      {step === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              گام ۳: بارگذاری تصاویر تجهیز و مدارک فنی (اختیاری ولی توصیه‌شده)
            </h3>
            <p className="text-xs text-slate-500">
              ارائه عکس از پلاک مشخصات، صفحه نمایشگر خطا یا وضعیت فیزیکی قطعات به هوش مصنوعی و تکنسین در تشخیص دقیق بسیار کمک می‌کند.
            </p>
          </div>

          {/* Photos Upload Area */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              تصاویر تجهیز یا خطا (حداکثر ۵ تصویر):
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map(p => (
                <div key={p.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
                  <img src={p.preview} alt={p.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(p.id)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md opacity-90 hover:opacity-100 transition-opacity"
                    title="حذف تصویر"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {photos.length < 5 && (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-colors aspect-video text-center">
                  <Camera size={24} className="text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-blue-600">افزودن تصویر</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Bill / Document Upload (Optional) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">بارگذاری قبض برق یا گزارش عملکرد</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">جهت بررسی صحت محاسبات تزریق به شبکه یا افت درآمد خورشیدی</p>
              </div>
              <label className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 shadow-xs">
                <Upload size={14} />
                <span>انتخاب فایل</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const res = reader.result as string;
                        setBillDoc({
                          name: f.name,
                          preview: res,
                          data: res,
                          status: 'UNVERIFIED'
                        });
                      };
                      reader.readAsDataURL(f);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {billDoc && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    <span className="font-mono text-slate-800 font-bold truncate max-w-xs">{billDoc.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 w-fit">
                    <AlertTriangle size={12} />
                    <span>وضعیت مدرک: بارگذاری شده (نیازمند استخراج/تطبیق کارشناسی - تاییدنشده)</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBillDoc(null)}
                  className="text-rose-600 hover:text-rose-700 text-xs font-bold self-end sm:self-center"
                >
                  حذف
                </button>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowRight size={16} />
              <span>مرحله قبل</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(4);
                if (!diagnosis) {
                  handleRunDiagnosis();
                }
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <span>مرحله بعد: تحلیل و عیب‌یابی اولیه هوشمند</span>
              <Sparkles size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 4: Evidence-Based AI Preliminary Diagnosis                */}
      {/* ============================================================== */}
      {step === 4 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                <Sparkles size={14} />
                تحلیل شواهد و عیب‌یابی اولیه هوشمند
              </span>
              <h3 className="text-base font-black text-slate-900 mt-2">
                نتایج ارزیابی مبتنی بر شواهد و قواعد مهندسی O&M
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تفکیک دقیق واقعیات عینی، نشانه‌ها، داده‌های تله‌متری و استنتاج‌های تحلیلی هوش مصنوعی
              </p>
            </div>

            <button
              type="button"
              disabled={diagnosing}
              onClick={handleRunDiagnosis}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Sparkles size={14} className={diagnosing ? 'animate-spin' : ''} />
              <span>تحلیل مجدد شواهد</span>
            </button>
          </div>

          {diagnosing ? (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">در حال ریشه‌یابی و تطابق شواهد مهندسی با متون استاندارد...</p>
              <p className="text-[11px] text-slate-400">تحلیل عیوب اینورتر، وضعیت ایزولاسیون، ایمنی DC و استعلام شرایط گارانتی</p>
            </div>
          ) : diagError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{diagError}</span>
            </div>
          ) : diagnosis ? (
            <div className="space-y-5">
              {/* Evidence Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. OBSERVED Facts */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>مشاهدات عینی و واقعیات ثبت‌شده (OBSERVED):</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    {diagnosis.facts && diagnosis.facts.length > 0 ? (
                      diagnosis.facts.map((f, i) => <li key={i}>{f}</li>)
                    ) : (
                      <li className="text-slate-400">اطلاعات عینی ثبت نشده است.</li>
                    )}
                  </ul>
                </div>

                {/* 2. USER_REPORTED Symptoms */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <User size={16} className="text-blue-600" />
                    <span>گزارش و نشانه‌های اعلام‌شده توسط کاربر (USER_REPORTED):</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                    {diagnosis.symptoms && diagnosis.symptoms.length > 0 ? (
                      diagnosis.symptoms.map((s, i) => <li key={i}>{s}</li>)
                    ) : (
                      <li className="text-slate-400">نشانه خاصی گزارش نشده است.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* 3. DOCUMENT_EXTRACTED / Bill Evidence */}
              {diagnosis.evidenceCategorized?.DOCUMENT_EXTRACTED && diagnosis.evidenceCategorized.DOCUMENT_EXTRACTED.length > 0 && (
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <FileText size={16} className="text-blue-600" />
                    <span>شواهد مستندات و قبوض برق (DOCUMENT_EXTRACTED):</span>
                  </div>
                  <ul className="space-y-1 text-xs text-blue-800 list-disc list-inside">
                    {diagnosis.evidenceCategorized.DOCUMENT_EXTRACTED.map((doc, idx) => (
                      <li key={idx}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inferences / Possible Causes */}
              <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                    <Sparkles size={16} className="text-indigo-600" />
                    <span>علل احتمالی ریشه‌ای بر اساس استنتاج مهندسی (AI_INFERENCE):</span>
                  </div>
                  {diagnosis.confidenceScore !== undefined && diagnosis.confidenceScore !== null && (
                    <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                      سطح اطمینان تحلیلی: {Math.round(diagnosis.confidenceScore)}٪
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {diagnosis.rootCauses && diagnosis.rootCauses.length > 0 ? (
                    diagnosis.rootCauses.map((rc, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-indigo-100 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{rc.cause}</div>
                          {rc.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{rc.description}</p>
                          )}
                        </div>
                        {rc.probability !== undefined && (
                          <span className="font-mono text-[11px] font-bold text-indigo-700 shrink-0">
                            احتمال: {Math.round(rc.probability * 100)}٪
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">اطلاعات کافی برای تشخیص دقیق وجود ندارد.</p>
                  )}
                </div>
              </div>

              {/* Recommended Next Actions */}
              {diagnosis.actions && diagnosis.actions.length > 0 && (
                <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Wrench size={16} className="text-blue-600" />
                    <span>اقدامات پیشنهادی بعدی جهت رفع مشکل:</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {diagnosis.actions.map((act, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">{act.action}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            {act.priority || 'عادی'}
                          </span>
                        </div>
                        {act.estimatedHours && (
                          <span className="text-[11px] text-slate-400 block mt-1">
                            زمان تقریبی سرویس: {act.estimatedHours} ساعت
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Tools & Parts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {diagnosis.requiredTools && diagnosis.requiredTools.length > 0 && (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Wrench size={14} className="text-slate-600" />
                      <span>ابزارها و تجهیزات اندازه‌گیری احتمالی:</span>
                    </h5>
                    <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                      {diagnosis.requiredTools.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {diagnosis.requiredParts && diagnosis.requiredParts.length > 0 && (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers size={14} className="text-slate-600" />
                      <span>قطعات یدکی محتمل:</span>
                    </h5>
                    <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                      {diagnosis.requiredParts.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Safety Guidance Warning Box */}
              {diagnosis.safetyGuidance && diagnosis.safetyGuidance.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                    <span>راهنمای ایمنی و هشدارهای مهم ولتاژ DC:</span>
                  </div>
                  <ul className="space-y-1 text-amber-800 list-disc list-inside text-[11px]">
                    {diagnosis.safetyGuidance.map((sg, idx) => (
                      <li key={idx}>{sg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warranty Coverage Status */}
              {diagnosis.warrantyImpact && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">وضعیت گارانتی تجهیز: </span>
                    <span className="text-slate-600">{diagnosis.warrantyImpact.warrantyNotes || 'بررسی نشده'}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    diagnosis.warrantyImpact.hasWarrantyCoverage
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {diagnosis.warrantyImpact.hasWarrantyCoverage ? 'تحت پوشش گارانتی' : 'فاقد پوشش یا ثبت‌نشده'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              برای مشاهده تحلیل، دکمه «شروع تحلیل هوشمند» را بزنید.
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowRight size={16} />
              <span>مرحله قبل</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(5)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <span>مرحله بعد: انطباق متخصص و ثبت درخواست</span>
              <ArrowLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 5: Matching Professionals & Final Submission             */}
      {/* ============================================================== */}
      {step === 5 && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              شبکه تخصصی و مجاز هوشیار انرژی
            </span>
            <h3 className="text-base font-black text-slate-900 mt-2">
              گام ۵: انتخاب متخصص مجاز و ثبت نهایی درخواست
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تنها متخصصان دارای تاییدیه رسمی صلاحیت در فهرست زیر نمایش داده می‌شوند (بدون ارقام یا رتبه‌بندی‌های غیرواقعی).
            </p>
          </div>

          {/* Auto match vs Specific pro selection */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAutoMatch(true);
                setSelectedTechnician(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                autoMatch
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              ارسال درخواست به نزدیک‌ترین متخصص مجاز منطقه (پیشنهاد هوشمند)
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoMatch(false);
                if (technicians.length > 0 && !selectedTechnician) {
                  setSelectedTechnician(technicians[0]);
                }
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                !autoMatch
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              انتخاب دستی از فهرست متخصصان مجاز
            </button>
          </div>

          {/* Loading or Technician List */}
          {loadingTechnicians ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p>در حال جستجوی متخصصان مجاز منطقه و انطباق صلاحیت‌های O&M...</p>
            </div>
          ) : technicians.length === 0 ? (
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2">
              <p className="text-xs font-bold text-amber-900">
                در حال حاضر متخصص مستقیمی با تخصص خاص این تجهیز در این شهر ثبت نشده است.
              </p>
              <p className="text-[11px] text-amber-700">
                درخواست شما به شبکه نظارت مرکزی ارجاع داده شده و کارشناسان پشتیبانی هوشیار در اسرع وقت متخصص مناسب را اعزام خواهند کرد.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                متخصصان مجاز و دارای صلاحیت منطبق با این پرونده:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {technicians.map(tech => {
                  const isSelected = selectedTechnician?.technicianId === tech.technicianId;
                  return (
                    <div
                      key={tech.technicianId}
                      onClick={() => {
                        setSelectedTechnician(tech);
                        setAutoMatch(false);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2.5 ${
                        isSelected && !autoMatch
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                            {tech.fullName.substring(0, 1)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{tech.fullName}</span>
                              <span title="دارای تاییدیه رسمی"><ShieldCheck size={14} className="text-emerald-600" /></span>
                            </div>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} />
                              {tech.serviceCities?.join('، ') || 'سراسری'}
                            </span>
                          </div>
                        </div>

                        {tech.matchScore !== undefined && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            انطباق: {Math.round(tech.matchScore)}٪
                          </span>
                        )}
                      </div>

                      {/* Specialties */}
                      {tech.specialties && tech.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tech.specialties.map((s, idx) => (
                            <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Reasons */}
                      {tech.matchReasons && tech.matchReasons.length > 0 && (
                        <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                          معیار انطباق: {tech.matchReasons[0]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-800">اطلاعات هماهنگی و تماس با مشتری:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نام و نام خانوادگی متقاضی / کارفرما:
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="مثال: مهندس رضوانی"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  شماره موبایل جهت هماهنگی اعزام:
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="0912xxxxxxx"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {submitError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Navigation & Submit Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-5 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowRight size={16} />
              <span>مرحله قبل</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitRequest}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>در حال ثبت نهایی...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>تأیید و ثبت رسمی درخواست تعمیرات</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
