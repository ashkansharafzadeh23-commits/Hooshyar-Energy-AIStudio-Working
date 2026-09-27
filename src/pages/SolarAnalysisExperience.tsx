import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LocationType } from '../types';
import {
  AnalysisWelcome,
  AnalysisStepLayout,
  UsageTypeSelector,
  LocationStep,
  ConsumptionStep,
  SiteDetailsStep,
  AnalysisGoalStep,
  UserSolarGoal,
  AnalysisProgress,
  AnalysisStage,
  AnalysisExecutiveSummary,
  EngineeringDetails,
  SolarDataSource,
  FinancialOverview,
  AIResultExplanation,
  AnalysisNextStep,
  AnalysisErrorState
} from '../components/analysis';

type StepNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function SolarAnalysisExperience() {
  const { state, updateState } = useAppContext();
  const navigate = useNavigate();
  const routeLocation = useLocation();

  // State from history navigation if arriving from dashboard/saved analyses
  const historyResult = routeLocation.state?.historyResult;
  const historyResultId = routeLocation.state?.historyResultId;

  // Step control: 0 = Welcome, 1 = Usage, 2 = Location, 3 = Consumption, 4 = Site, 5 = Goal, 6 = Progress, 7 = Results
  const [currentStep, setCurrentStep] = useState<StepNumber>(historyResult ? 7 : 0);

  // Form states initialized from AppContext or null/empty
  const [usageType, setUsageType] = useState<LocationType>(state.locationType || 'residential');
  const [province, setProvince] = useState<string>(state.province || '');
  const [city, setCity] = useState<string>(state.city || '');
  const [monthlyKwh, setMonthlyKwh] = useState<number | null>(state.monthlyKwh && state.monthlyKwh > 0 ? state.monthlyKwh : null);
  const [area, setArea] = useState<number | null>(state.area && state.area > 0 ? state.area : null);
  const [usableArea, setUsableArea] = useState<number | null>(state.usableArea && state.usableArea > 0 ? state.usableArea : null);
  const [gridConnected, setGridConnected] = useState<boolean>(state.gridConnected ?? true);
  const [gridStable, setGridStable] = useState<boolean>(state.gridStable ?? true);
  const [goal, setGoal] = useState<UserSolarGoal>('REDUCE_BILL');

  // Processing & Results State
  const [progressStage, setProgressStage] = useState<AnalysisStage>('VALIDATING_INPUTS');
  const [isDegraded, setIsDegraded] = useState(false);
  const [degradedMessage, setDegradedMessage] = useState<string | undefined>(undefined);
  const [analysisResult, setAnalysisResult] = useState<any>(historyResult || null);
  const [analysisId, setAnalysisId] = useState<string | null>(historyResultId || null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Check for previous analysis in local storage
  const [hasPreviousLocal, setHasPreviousLocal] = useState<boolean>(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('last_solar_analysis');
      if (stored) {
        setHasPreviousLocal(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleStart = () => {
    setCurrentStep(1);
  };

  const handleContinuePrevious = () => {
    try {
      const stored = localStorage.getItem('last_solar_analysis');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.result) {
          setAnalysisResult(parsed.result);
          setAnalysisId(parsed.id || null);
          setCurrentStep(7);
          return;
        }
      }
    } catch (e) {
      // fallback to step 1
    }
    setCurrentStep(1);
  };

  // Execution of the real analysis engine
  const executeAnalysis = async () => {
    // Validate inputs strictly before executing (preserving genuine 0 vs missing)
    if (!province || !city) {
      setErrorMessage('لطفاً استان و شهر محل احداث را مشخص فرمایید.');
      setCurrentStep(7);
      return;
    }

    if (monthlyKwh === null || monthlyKwh === undefined || isNaN(monthlyKwh) || monthlyKwh < 0) {
      setErrorMessage('لطفاً میزان مصرف ماهانه (کیلووات‌ساعت) را مشخص فرمایید (برای اماکن فاقد مصرف، عدد ۰ معتبر است).');
      setCurrentStep(7);
      return;
    }

    if (area === null || area === undefined || isNaN(area) || area <= 0) {
      setErrorMessage('مساحت کل محل احداث باید یک مقدار عددی مثبت و بزرگتر از صفر باشد.');
      setCurrentStep(7);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    setCurrentStep(6);
    setProgressStage('VALIDATING_INPUTS');
    setErrorMessage(null);

    const finalUsableArea = usableArea && usableArea > 0 ? usableArea : undefined;

    // Sync state with AppContext
    updateState({
      targets: ['solar'],
      locationType: usageType,
      province,
      city,
      monthlyKwh,
      area,
      usableArea: finalUsableArea,
      gridConnected,
      gridStable
    });

    const payload = {
      targets: ['solar'],
      locationType: usageType,
      province,
      city,
      monthlyKwh,
      actualMonthlyKwh: monthlyKwh,
      area,
      usableArea: finalUsableArea,
      gridConnected,
      gridStable,
      goal
    };

    try {
      setProgressStage('REQUESTING_ENGINE_ANALYSIS');

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const serverError = errorData.error || errorData.message;
        if (response.status === 400) {
          throw new Error(serverError || 'اطلاعات وارد شده ناقص یا نامعتبر است. لطفاً ورودی‌ها را بررسی فرمایید.');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(serverError || 'خطای دسترسی یا احراز هویت. لطفاً وضعیت ورود خود را بررسی فرمایید.');
        } else if (response.status === 402) {
          throw new Error(serverError || 'سقف تحلیل‌های رایگان ماهانه به پایان رسیده است.');
        } else if (response.status === 504 || response.status === 408) {
          throw new Error('زمان انتظار برای دریافت پاسخ محاسباتی به پایان رسید. لطفاً مجدداً تلاش کنید.');
        } else {
          throw new Error(serverError || 'خطا در ارتباط با موتور محاسباتی. لطفاً مجدداً تلاش کنید.');
        }
      }

      const data = await response.json();

      // Check if external NASA solar data was fallback/degraded
      if (data.dataSource?.isReferenceOnly || data.dataSource?.dataClassification === 'REFERENCE_ESTIMATE') {
        setIsDegraded(true);
        setDegradedMessage('داده‌های تابش به صورت برآورد مرجع اقلیمی استفاده شدند.');
      }

      setAnalysisResult(data);
      if (data.analysisId) {
        setAnalysisId(data.analysisId);
      }

      // Cache locally for resumption
      try {
        localStorage.setItem('last_solar_analysis', JSON.stringify({
          id: data.analysisId,
          result: data,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        // ignore
      }

      setProgressStage('COMPLETED');
      setCurrentStep(7);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در پردازش تحلیل خورشیدی');
      setCurrentStep(7);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert to official EnergyProject
  const handleConvertToProject = async (): Promise<string | void> => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/customer-login');
      return;
    }

    const currentAnalysisId = analysisId || analysisResult?.analysisId;
    if (!currentAnalysisId) {
      throw new Error('شناسه تحلیل معتبر برای ساخت پروژه یافت نشد.');
    }

    const res = await fetch(`/api/projects/from-analysis/${currentAnalysisId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        notes: `ایجادشده از مسیر ارزیابی خورشیدی. هدف کاربر: ${goal}`
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ساخت پروژه از تحلیل');
    }

    setProjectId(data.id);
    return data.id;
  };

  // Save Analysis History
  const handleSaveAnalysis = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/customer-login');
      return false;
    }

    const currentAnalysisId = analysisId || analysisResult?.analysisId;
    if (!currentAnalysisId) {
      setErrorMessage('شناسه تحلیل معتبر در سرور یافت نشد. لطفاً در حساب کاربری خود لاگین فرمایید.');
      return false;
    }

    try {
      const res = await fetch('/api/user/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('خطا در برقراری ارتباط با تاریخچه سرور');
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.history || []);
      const found = list.some((item: any) => item.id === currentAnalysisId);
      if (found) {
        setIsSaved(true);
        return true;
      } else {
        setErrorMessage('رکورد تحلیل در تاریخچه حساب کاربری تأیید نشد.');
        return false;
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'خطا در اعتبارسنجی ثبت تحلیل در سرور');
      return false;
    }
  };

  // Render Step 0: Welcome
  if (currentStep === 0) {
    return (
      <AnalysisWelcome
        onStart={handleStart}
        onContinuePrevious={handleContinuePrevious}
        hasPreviousAnalysis={hasPreviousLocal}
        lastAnalysisSummary={city && monthlyKwh ? `شهر ${city} - ${monthlyKwh} کیلووات‌ساعت` : undefined}
      />
    );
  }

  // Render Step 1: Usage Type
  if (currentStep === 1) {
    return (
      <AnalysisStepLayout
        currentStep={1}
        totalSteps={5}
        stepTitle="نوع کاربری ملک یا محل احداث را انتخاب کنید"
        stepDescription="مشخص کردن کاربری به تنظیم دقیق‌تر الگوی مصرف و شیوه اتصال کمک می‌کند."
        onNext={() => setCurrentStep(2)}
        onPrev={() => setCurrentStep(0)}
        nextLabel="مرحله بعد: موقعیت مکانی"
      >
        <UsageTypeSelector
          value={usageType}
          onChange={(newType) => setUsageType(newType)}
        />
      </AnalysisStepLayout>
    );
  }

  // Render Step 2: Location
  if (currentStep === 2) {
    return (
      <AnalysisStepLayout
        currentStep={2}
        totalSteps={5}
        stepTitle="موقعیت جغرافیایی محل احداث"
        stepDescription="تابش خورشیدی بر اساس استان و شهر تعیین و مبنای تحلیل قرار می‌گیرد."
        onNext={() => setCurrentStep(3)}
        onPrev={() => setCurrentStep(1)}
        isNextDisabled={!province || !city}
        nextLabel="مرحله بعد: مصرف برق"
      >
        <LocationStep
          province={province}
          city={city}
          onChange={(loc) => {
            setProvince(loc.province);
            setCity(loc.city);
          }}
        />
      </AnalysisStepLayout>
    );
  }

  // Render Step 3: Consumption
  if (currentStep === 3) {
    return (
      <AnalysisStepLayout
        currentStep={3}
        totalSteps={5}
        stepTitle="میزان مصرف ماهانه برق شما چقدر است؟"
        stepDescription="این مقدار برای محاسبه حداقل ظرفیت لازم جهت جبران مصرف اعلام می‌شود."
        onNext={() => setCurrentStep(4)}
        onPrev={() => setCurrentStep(2)}
        isNextDisabled={!monthlyKwh || monthlyKwh <= 0}
        nextLabel="مرحله بعد: مشخصات محل نصب"
      >
        <ConsumptionStep
          monthlyKwh={monthlyKwh}
          area={area || 0}
          onChange={(kwh) => setMonthlyKwh(kwh)}
          onAnalysisExtracted={(extractedKwh) => {
            if (extractedKwh && extractedKwh > 0) {
              setMonthlyKwh(Math.round(extractedKwh));
            }
          }}
        />
      </AnalysisStepLayout>
    );
  }

  // Render Step 4: Site Details
  if (currentStep === 4) {
    return (
      <AnalysisStepLayout
        currentStep={4}
        totalSteps={5}
        stepTitle="مشخصات و فضای در دسترس برای نصب"
        stepDescription="سازه، ابعاد فیزیکی و مساحت مفید بام یا زمین."
        onNext={() => setCurrentStep(5)}
        onPrev={() => setCurrentStep(3)}
        isNextDisabled={!area || area <= 0}
        nextLabel="مرحله بعد: هدف اصلی"
      >
        <SiteDetailsStep
          area={area || 0}
          usableArea={usableArea || 0}
          gridConnected={gridConnected}
          gridStable={gridStable}
          onChange={(details) => {
            setArea(details.area);
            setUsableArea(details.usableArea);
            setGridConnected(details.gridConnected);
            setGridStable(details.gridStable);
          }}
        />
      </AnalysisStepLayout>
    );
  }

  // Render Step 5: Goal Step
  if (currentStep === 5) {
    return (
      <AnalysisStepLayout
        currentStep={5}
        totalSteps={5}
        stepTitle="هدف اصلی شما از احداث سامانه خورشیدی چیست؟"
        stepDescription="انتخاب هدف به اولویت‌بندی سناریوی مالی و ظرفیت بهینه کمک می‌کند."
        onNext={executeAnalysis}
        onPrev={() => setCurrentStep(4)}
        nextLabel="دریافت تحلیل مهندسی خورشیدی"
      >
        <AnalysisGoalStep
          selectedGoal={goal}
          onChange={(newGoal) => setGoal(newGoal)}
        />
      </AnalysisStepLayout>
    );
  }

  // Render Step 6: Progress
  if (currentStep === 6) {
    return (
      <AnalysisProgress
        currentStage={progressStage}
        city={city}
        isDegraded={isDegraded}
        degradedMessage={degradedMessage}
      />
    );
  }

  // Render Step 7: Results or Error
  if (errorMessage || !analysisResult) {
    return (
      <AnalysisErrorState
        message={errorMessage || 'اطلاعات تحلیلی در دسترس نیست. لطفاً مجدداً تلاش کنید.'}
        onRetry={executeAnalysis}
        onBack={() => setCurrentStep(1)}
      />
    );
  }

  // Extract real calculated metrics from deterministic engine result - strictly no frontend formulas!
  const solar = analysisResult.solar || {};
  const dataSource = analysisResult.dataSource || {};
  const rec = analysisResult.recommendation || { summary: analysisResult.summary, energySavingTips: analysisResult.energySavingTips };

  const finalKwp = solar.finalKwp ?? null;
  const panelCount = solar.panelOptions?.default?.panelCount 
    ?? solar.panelOptions?.balanced?.panelCount 
    ?? solar.panelOptions?.economy?.panelCount 
    ?? solar.panelCount 
    ?? null;
  const panelWattage = solar.panelOptions?.default?.panelWattage 
    ?? solar.panelOptions?.balanced?.panelWattage 
    ?? solar.panelOptions?.economy?.panelWattage 
    ?? null;
  const estimatedAnnualKwh = solar.estimatedAnnualKwh ?? solar.annualGenerationKwh ?? null;
  const requiredAreaM2 = solar.requiredAreaM2 ?? solar.panelOptions?.default?.requiredAreaM2 ?? null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 sm:space-y-8" dir="rtl">
      {/* 1. Executive Summary: Core 6 Questions */}
      <AnalysisExecutiveSummary
        data={{
          recommendedKwp: finalKwp,
          panelCount,
          estimatedAnnualKwh,
          requiredAreaM2,
          locationLabel: `${province} - ${city}`,
          sourceStatus: dataSource.isReferenceOnly ? 'FALLBACK_REGIONAL' : 'LIVE_NASA'
        }}
        onExploreEngineering={() => {
          const el = document.getElementById('engineering-details-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onCreateProject={handleConvertToProject}
      />

      {/* 2. Solar Data Source Truth Card */}
      <SolarDataSource
        locationLabel={`${province}، ${city}`}
        sourceType={dataSource.isReferenceOnly ? 'REGIONAL_REFERENCE' : 'NASA_POWER'}
        peakSunHours={dataSource.sunHours}
        isFallback={dataSource.isReferenceOnly}
      />

      {/* 3. Engineering Details (Collapsible, accurate, non-overwhelming) */}
      <div id="engineering-details-section">
        <EngineeringDetails
          dcCapacityKwp={finalKwp}
          panelWattage={panelWattage}
          panelCount={panelCount}
          totalAreaM2={area}
          usableAreaM2={usableArea}
        />
      </div>

      {/* 4. Financial Overview (Strict truthfulness: no fake IRR/ROI) */}
      <FinancialOverview
        estimatedCostIRR={solar.estimatedTotalCost || null}
        annualSavingsIRR={null}
        simplePaybackYears={null}
        capacityKwp={finalKwp}
        monthlyConsumptionKwh={monthlyKwh}
      />

      {/* 5. AI Advisor Explanation (Explains, does not fabricate calculations) */}
      <AIResultExplanation
        summary={rec.summary}
        energySavingTips={rec.energySavingTips}
        aiStatus={analysisResult.aiStatus || (analysisResult.aiUnavailable ? 'UNAVAILABLE' : 'SUCCESS')}
        recommendedCapacityKwp={finalKwp}
        locationLabel={city}
      />

      {/* 6. Next Step & Energy Project Conversion */}
      <AnalysisNextStep
        analysisId={analysisId || analysisResult.analysisId}
        projectId={projectId}
        isSaved={isSaved}
        onSaveAnalysis={handleSaveAnalysis}
        onCreateProject={handleConvertToProject}
      />
    </div>
  );
}
