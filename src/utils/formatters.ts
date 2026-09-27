/**
 * Hooshyar Energy - Persian Number and Localization Utilities
 * Provides formatting for Persian numerals, Iranian currency, solar capacity,
 * energy generation, percentages, and dates in the presentation layer.
 * 
 * CRITICAL RULE:
 * Never mutate raw backend values, IDs, serial numbers, equipment model numbers,
 * or technical codes with these formatters.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts Western Arabic digits (0-9) to Persian digits (۰-۹).
 * Preserves non-digit characters.
 */
export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)] || d);
}

/**
 * Formats numbers with thousands separators and converts to Persian digits.
 */
export function formatPersianNumber(value: number | string | null | undefined, decimals?: number): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  const formatted = typeof decimals === 'number'
    ? num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : num.toLocaleString('en-US');

  // Replace commas with Persian thousands separator (٬) and dots with Persian decimal separator (٫)
  const localizedSeparators = formatted.replace(/,/g, '٬').replace(/\./g, '٫');
  return toPersianDigits(localizedSeparators);
}

/**
 * Formats currency in Iranian Rial or Toman with Persian digits.
 * Default unit: 'تومان'
 */
export function formatCurrencyIRR(
  amount: number | null | undefined,
  unit: 'تومان' | 'ریال' = 'تومان',
  showUnit: boolean = true
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—';
  }

  const formattedNum = formatPersianNumber(Math.round(amount));
  return showUnit ? `${formattedNum} ${unit}` : formattedNum;
}

/**
 * Formats solar plant capacity in kW or MW with Persian digits.
 * e.g., 250 kW -> "۲۵۰ کیلووات", 2500 kW -> "۲٫۵ مگاوات"
 */
export function formatSolarCapacity(capacityKw: number | null | undefined): string {
  if (capacityKw === null || capacityKw === undefined || isNaN(capacityKw)) {
    return '—';
  }

  if (capacityKw >= 1000) {
    const mw = capacityKw / 1000;
    const formatted = formatPersianNumber(mw, mw % 1 === 0 ? 0 : 1);
    return `${formatted} مگاوات`;
  }

  return `${formatPersianNumber(capacityKw, capacityKw % 1 === 0 ? 0 : 1)} کیلووات`;
}

/**
 * Formats electrical energy generation in kWh, MWh, or GWh with Persian digits.
 */
export function formatEnergyGeneration(kwh: number | null | undefined): string {
  if (kwh === null || kwh === undefined || isNaN(kwh)) {
    return '—';
  }

  if (kwh >= 1000000) {
    const gwh = kwh / 1000000;
    return `${formatPersianNumber(gwh, 2)} گیگاوات‌ساعت`;
  }

  if (kwh >= 1000) {
    const mwh = kwh / 1000;
    return `${formatPersianNumber(mwh, 1)} مگاوات‌ساعت`;
  }

  return `${formatPersianNumber(kwh, 0)} کیلووات‌ساعت`;
}

/**
 * Formats a percentage value with Persian digits and percent sign (٪).
 * e.g., 18.4 -> "۱۸٫۴٪"
 */
export function formatPercentage(pct: number | null | undefined, decimals: number = 1): string {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return '—';
  }

  const formatted = formatPersianNumber(pct, decimals);
  return `${formatted}٪`;
}

/**
 * Formats an ISO date or timestamp to Persian Solar (Jalali) date.
 * Output example: "۱۴۰۵/۰۶/۲۵"
 */
export function formatJalaliDate(
  dateInput: string | Date | number | null | undefined,
  includeTime: boolean = false
): string {
  if (!dateInput) return '—';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '—';

    const options: Intl.DateTimeFormatOptions = {
      calendar: 'persian',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(includeTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }
        : {})
    };

    const formatted = new Intl.DateTimeFormat('fa-IR', options).format(date);
    return toPersianDigits(formatted);
  } catch {
    return '—';
  }
}

/**
 * Translates technical role identifiers to professional Persian labels.
 */
export function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return 'کاربر مهمان';

  const normalized = role.toUpperCase().trim();
  switch (normalized) {
    case 'PROJECT_OWNER':
    case 'CUSTOMER':
      return 'کارفرما';
    case 'INVESTOR':
      return 'سرمایه‌گذار';
    case 'FINANCIER':
    case 'FINANCIAL_PARTNER':
      return 'تأمین‌کننده مالی';
    case 'EPC':
    case 'EPC_CONTRACTOR':
      return 'پیمانکار احداث';
    case 'VENDOR':
      return 'فروشنده تجهیزات';
    case 'TECHNICIAN':
      return 'تکنسین خدمات';
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return 'مدیر سامانه';
    case 'LAND_OWNER':
      return 'مالک زمین';
    case 'CONSULTANT':
      return 'مشاور مهندسی';
    case 'PROJECT_MANAGER':
      return 'مدیر پروژه';
    case 'FINANCE':
      return 'کارشناس مالی';
    case 'ENGINEER':
      return 'مهندس طراح';
    case 'VIEWER':
      return 'ناظر سازمانی';
    default:
      return normalized;
  }
}
