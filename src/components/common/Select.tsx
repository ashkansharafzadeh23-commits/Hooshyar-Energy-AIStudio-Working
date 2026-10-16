import React, { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { HE_CLASSES } from '../../theme/tokens';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  options?: SelectOption[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  helperText,
  errorMessage,
  options = [],
  containerClassName = '',
  className = '',
  id,
  children,
  disabled,
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const isInvalid = Boolean(errorMessage);

  return (
    <div className={`w-full ${containerClassName}`} dir="rtl">
      {label && (
        <label htmlFor={selectId} className={HE_CLASSES.label}>
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={isInvalid}
          className={`
            ${HE_CLASSES.select}
            pl-10 pr-3 appearance-none
            ${isInvalid ? '!border-rose-500 !focus:border-rose-500 focus:!ring-rose-500/20' : ''}
            ${className}
          `}
          {...props}
        >
          {children || options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {isInvalid && (
        <p className={HE_CLASSES.error} role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {!isInvalid && helperText && (
        <p className={HE_CLASSES.helper}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
