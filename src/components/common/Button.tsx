import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { HE_CLASSES } from '../../theme/tokens';

export type ButtonVariant = 
  | 'primary' 
  | 'solar' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: LucideIcon | React.ComponentType<{ className?: string }>;
  rightIcon?: LucideIcon | React.ComponentType<{ className?: string }>;
  fullWidth?: boolean;
}

const VARIANT_CLASS_MAP: Record<ButtonVariant, string> = {
  primary: HE_CLASSES.btnPrimary,
  solar: HE_CLASSES.btnSolar,
  secondary: HE_CLASSES.btnSecondary,
  outline: HE_CLASSES.btnOutline,
  ghost: HE_CLASSES.btnGhost,
  danger: HE_CLASSES.btnDanger
};

// Strict mathematical 2:1 horizontal:vertical padding ratios with minimum 44px touch targets
const SIZE_CLASS_MAP: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs min-h-[44px]',
  md: 'px-5 py-2.5 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[48px]'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}, ref) => {
  const baseVariant = VARIANT_CLASS_MAP[variant] || VARIANT_CLASS_MAP.primary;
  const sizeClasses = SIZE_CLASS_MAP[size] || SIZE_CLASS_MAP.md;
  const widthClasses = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${baseVariant} ${sizeClasses} ${widthClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
          <span>در حال پردازش...</span>
        </>
      ) : (
        <>
          {RightIcon && <RightIcon className="w-4 h-4 shrink-0 -mr-0.5" />}
          {children && <span>{children}</span>}
          {LeftIcon && <LeftIcon className="w-4 h-4 shrink-0 -ml-0.5" />}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
