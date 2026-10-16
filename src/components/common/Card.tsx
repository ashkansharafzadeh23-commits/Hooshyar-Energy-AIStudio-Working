import React, { HTMLAttributes, forwardRef } from 'react';
import { HE_CLASSES } from '../../theme/tokens';

export type CardVariant = 'surface' | 'metric' | 'interactive' | 'panel' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}

const VARIANT_CLASS_MAP: Record<CardVariant, string> = {
  surface: HE_CLASSES.cardSurface,
  metric: HE_CLASSES.cardMetric,
  interactive: HE_CLASSES.cardInteractive,
  panel: HE_CLASSES.cardPanel,
  glass: HE_CLASSES.cardGlass
};

const PADDING_CLASS_MAP: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
  xl: 'p-6 sm:p-8'
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'surface',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...props
}, ref) => {
  const actualVariant = interactive ? 'interactive' : variant;
  const variantClass = VARIANT_CLASS_MAP[actualVariant] || VARIANT_CLASS_MAP.surface;
  const paddingClass = PADDING_CLASS_MAP[padding] || PADDING_CLASS_MAP.md;

  return (
    <div
      ref={ref}
      className={`${variantClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
