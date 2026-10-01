/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Hooshyar Energy Design System Tokens — Stage 13.1 Foundation
 * 
 * Provides centralized, typed design tokens for the Hooshyar Energy platform.
 * Supports light & dark modes, Persian RTL ergonomics, and domain-native
 * solar energy technology visual language.
 */

export const HE_COLORS = {
  // Brand / Energy Blue (Primary Platform Identity)
  brand: {
    950: '#082F49',
    900: '#0C4A6E',
    800: '#075985',
    700: '#0369A1',
    600: '#0284C7',
    500: '#0EA5E9',
    soft: '#E0F2FE',
    default: '#0284C7',
    hover: '#0369A1',
    active: '#075985'
  },

  // Structural Dark / Enterprise Framing (Secondary Neutral)
  structural: {
    950: '#020617',
    900: '#0F172A',
    800: '#1E293B',
    700: '#334155',
    600: '#475569',
    500: '#64748B'
  },

  // Energy Green (Operational Health, Generation & Environmental Yield)
  energy: {
    800: '#065F46',
    700: '#047857',
    600: '#059669',
    500: '#10B981',
    soft: '#ECFDF5',
    default: '#059669',
    hover: '#047857'
  },

  // Solar Amber (Strictly Accent & Solar Irradiance — Used Sparingly)
  solar: {
    700: '#B45309',
    600: '#D97706',
    500: '#F59E0B',
    400: '#FBBF24',
    soft: '#FEF3C7',
    default: '#F59E0B',
    hover: '#D97706'
  },

  // Light Mode Surfaces & Text
  light: {
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    subtle: '#F1F5F9',
    elevated: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textInverse: '#FFFFFF',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1'
  },

  // Dark Mode Surfaces & Text
  dark: {
    canvas: '#07111F',
    surface: '#0F172A',
    subtle: '#162032',
    elevated: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    textInverse: '#0F172A',
    border: '#334155',
    borderStrong: '#475569'
  },

  // Semantic Status Tokens
  status: {
    success: '#059669',
    successSoft: '#ECFDF5',
    warning: '#D97706',
    warningSoft: '#FFFBEB',
    danger: '#DC2626',
    dangerSoft: '#FEF2F2',
    info: '#0284C7',
    infoSoft: '#F0F9FF'
  }
} as const;

export const HE_RADIUS = {
  sm: '10px',   // Small badges, tags, compact controls
  md: '12px',   // Buttons, inputs, interactive controls
  lg: '16px',   // Standard cards, metric containers
  xl: '20px'    // Feature surfaces, modals, drawers
} as const;

export const HE_SHADOWS = {
  none: 'none',
  subtle: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
  card: '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)',
  floating: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)'
} as const;

export const HE_TOUCH_TARGET = {
  minSizePx: 44,
  touchClass: 'min-h-[44px] min-w-[44px]'
} as const;

/**
 * Standard CSS Class Primitives for Hooshyar Energy
 */
export const HE_CLASSES = {
  // Buttons
  btnPrimary: 'btn-he-primary',
  btnSolar: 'btn-he-solar',
  btnSecondary: 'btn-he-secondary',
  btnOutline: 'btn-he-outline',
  btnGhost: 'btn-he-ghost',
  btnDanger: 'btn-he-danger',
  btnIcon: 'btn-he-icon',

  // Surfaces & Cards
  cardSurface: 'card-he-surface',
  cardMetric: 'card-he-metric',
  cardInteractive: 'card-he-interactive',
  cardPanel: 'card-he-panel',

  // Forms
  input: 'input-he',
  label: 'label-he',
  helper: 'helper-he',
  error: 'error-he',

  // Numerics & Typography
  num: 'he-num',
  tabular: 'tabular-nums'
} as const;
