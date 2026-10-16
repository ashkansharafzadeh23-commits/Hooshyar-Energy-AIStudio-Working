import React, { InputHTMLAttributes, forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { HE_CLASSES } from '../../theme/tokens';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  helperText,
  errorMessage,
  leftElement,
  rightElement,
  containerClassName = '',
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const isInvalid = Boolean(errorMessage);

  return (
    <div className={`w-full ${containerClassName}`} dir="rtl">
      {label && (
        <label htmlFor={inputId} className={HE_CLASSES.label}>
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {rightElement}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={isInvalid}
          className={`
            ${HE_CLASSES.input}
            ${rightElement ? 'pr-10' : ''}
            ${leftElement ? 'pl-10' : ''}
            ${isInvalid ? '!border-rose-500 !focus:border-rose-500 focus:!ring-rose-500/20' : ''}
            ${className}
          `}
          {...props}
        />

        {leftElement && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftElement}
          </div>
        )}
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

Input.displayName = 'Input';
