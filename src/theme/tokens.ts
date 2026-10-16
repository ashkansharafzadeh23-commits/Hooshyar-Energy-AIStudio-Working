/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Hooshyar Energy Design System Tokens — Stage D.1 Premium Foundation
 * 
 * Provides centralized, typed design tokens for the Hooshyar Energy platform.
 * Supports light & dark modes, Persian RTL ergonomics, domain-native
 * solar energy visual language, zero-pill metadata discipline, and mathematical
 * geometric harmony (nested radii, 2:1 button aspect padding, 44px touch targets).
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

  // Fintech Blue (Financial Infrastructure, Banking Facility, Power Purchase Agreements)
  fintech: {
    900: '#1E3A8A',
    800: '#1E40AF',
    700: '#1D4ED8',
    600: '#2563EB',
    500: '#3B82F6',
    soft: '#EFF6FF',
    border: '#BFDBFE',
    default: '#2563EB',
    hover: '#1D4ED8'
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
    border: '#A7F3D0',
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
    border: '#FDE68A',
    default: '#F59E0B',
    hover: '#D97706'
  },

  // Light Mode Surfaces & Text (Light-First Enterprise Standard)
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
    borderSubtle: '#F1F5F9',
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
    borderSubtle: '#1E293B',
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
  },

  // Critical Data Truth / Provenance Tokens (Section 5)
  provenance: {
    real: {
      key: 'REAL',
      label: 'داده واقعی',
      color: '#059669',
      bgLight: '#ECFDF5',
      bgDark: 'rgba(5, 150, 105, 0.15)',
      borderLight: '#A7F3D0',
      borderDark: 'rgba(5, 150, 105, 0.3)'
    },
    calculated: {
      key: 'CALCULATED',
      label: 'محاسباتی مهندسی',
      color: '#2563EB',
      bgLight: '#EFF6FF',
      bgDark: 'rgba(37, 99, 235, 0.15)',
      borderLight: '#BFDBFE',
      borderDark: 'rgba(37, 99, 235, 0.3)'
    },
    userProvided: {
      key: 'USER_PROVIDED',
      label: 'اظهار کاربر',
      color: '#475569',
      bgLight: '#F1F5F9',
      bgDark: 'rgba(71, 85, 105, 0.2)',
      borderLight: '#E2E8F0',
      borderDark: 'rgba(71, 85, 105, 0.4)'
    },
    market: {
      key: 'MARKET',
      label: 'شاخص بازار',
      color: '#D97706',
      bgLight: '#FFFBEB',
      bgDark: 'rgba(217, 119, 6, 0.15)',
      borderLight: '#FDE68A',
      borderDark: 'rgba(217, 119, 6, 0.3)'
    },
    ai: {
      key: 'AI',
      label: 'تحلیل هوش مصنوعی',
      color: '#6366F1',
      bgLight: '#EEF2FF',
      bgDark: 'rgba(99, 102, 241, 0.15)',
      borderLight: '#C7D2FE',
      borderDark: 'rgba(99, 102, 241, 0.3)'
    },
    missing: {
      key: 'MISSING',
      label: 'عدم اتصال / ثبت نشده',
      color: '#DC2626',
      bgLight: '#FEF2F2',
      bgDark: 'rgba(220, 38, 38, 0.15)',
      borderLight: '#FECACA',
      borderDark: 'rgba(220, 38, 38, 0.3)'
    }
  }
} as const;

export const HE_RADIUS = {
  xs: '6px',    // Micro controls, inner indicators
  sm: '10px',   // Badges, tags, compact controls
  md: '12px',   // Buttons, inputs, interactive controls
  lg: '16px',   // Standard cards, metric containers
  xl: '20px',   // Feature surfaces, modals, drawers
  full: '9999px' // Avatars, circular icon buttons
} as const;

/**
 * Calculates nested corner radius according to architectural formula:
 * R_inside = max(0, R_outside - Padding)
 */
export function getNestedRadius(outerRadiusPx: number, paddingPx: number): number {
  return Math.max(0, outerRadiusPx - paddingPx);
}

export const HE_SHADOWS = {
  none: 'none',
  subtle: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
  card: '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)',
  floating: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
  modal: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
  solarAmber: '0 4px 14px 0 rgba(245, 158, 11, 0.22)'
} as const;

export const HE_TOUCH_TARGET = {
  minSizePx: 44,
  touchClass: 'min-h-[44px] min-w-[44px]'
} as const;

/**
 * Mathematical 2:1 horizontal:vertical padding ratios for buttons
 */
export const HE_BUTTON_PADDING = {
  sm: 'px-4 py-2 text-xs',         // 16px horizontal : 8px vertical
  md: 'px-5 py-2.5 text-sm',       // 20px horizontal : 10px vertical (Default)
  lg: 'px-6 py-3 text-base'        // 24px horizontal : 12px vertical
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
  cardGlass: 'card-he-glass',

  // Forms
  input: 'input-he',
  select: 'select-he',
  textarea: 'textarea-he',
  label: 'label-he',
  helper: 'helper-he',
  error: 'error-he',

  // Numerics & Typography
  num: 'he-num',
  tabular: 'tabular-nums',
  metaItem: 'he-meta-item',
  metaSeparator: 'he-meta-separator'
} as const;
