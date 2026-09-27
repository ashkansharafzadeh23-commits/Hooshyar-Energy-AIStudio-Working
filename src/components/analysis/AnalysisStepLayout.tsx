import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalysisStepLayoutProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription?: string;
  onNext?: () => void;
  onPrev?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  isNextDisabled?: boolean;
  isNextLoading?: boolean;
  children: React.ReactNode;
  showPrev?: boolean;
}

export const AnalysisStepLayout: React.FC<AnalysisStepLayoutProps> = ({
  currentStep,
  totalSteps,
  stepTitle,
  stepDescription,
  onNext,
  onPrev,
  nextLabel = 'ادامه',
  prevLabel = 'مرحله قبل',
  isNextDisabled = false,
  isNextLoading = false,
  children,
  showPrev = true
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10" dir="rtl">
      {/* Step Header */}
      <div className="mb-6 sm:mb-8 text-right">
        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            مرحله {currentStep} از {totalSteps}
          </span>
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx + 1 === currentStep
                    ? 'w-7 bg-amber-500'
                    : idx + 1 < currentStep
                    ? 'w-3.5 bg-amber-300 dark:bg-amber-700'
                    : 'w-3.5 bg-zinc-200 dark:bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Titles */}
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1.5 tracking-tight">
          {stepTitle}
        </h2>
        {stepDescription && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
            {stepDescription}
          </p>
        )}
      </div>

      {/* Main Form Body */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.25 }}
        className="mb-8"
      >
        {children}
      </motion.div>

      {/* Action Footer (Desktop & Mobile Friendly, Min 44px touch targets) */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 sticky bottom-0 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-md pb-4 z-10">
        {showPrev && onPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-medium text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
          >
            <ArrowRight size={16} />
            <span>{prevLabel}</span>
          </button>
        ) : (
          <div />
        )}

        {onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={isNextDisabled || isNextLoading}
            className={`min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              isNextDisabled || isNextLoading
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-transparent'
                : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 shadow-sm'
            }`}
          >
            {isNextLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>در حال پردازش...</span>
              </span>
            ) : (
              <>
                <span>{nextLabel}</span>
                <ArrowLeft size={16} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
