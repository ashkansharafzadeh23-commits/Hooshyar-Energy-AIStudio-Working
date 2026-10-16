import React from 'react';
import { formatPersianNumber, formatCurrencyIRR, formatSolarCapacity, formatPercentage } from '../../utils/formatters';

export interface PersianNumberProps {
  value: number | string | null | undefined;
  type?: 'number' | 'currency' | 'capacity' | 'percentage';
  decimals?: number;
  currencyUnit?: 'تومان' | 'ریال';
  showUnit?: boolean;
  className?: string;
}

export const PersianNumber: React.FC<PersianNumberProps> = ({
  value,
  type = 'number',
  decimals,
  currencyUnit = 'تومان',
  showUnit = true,
  className = ''
}) => {
  let formatted = '—';

  switch (type) {
    case 'currency': {
      const numVal = typeof value === 'string' ? parseFloat(value) : value;
      formatted = formatCurrencyIRR(numVal, currencyUnit, showUnit);
      break;
    }
    case 'capacity': {
      const numVal = typeof value === 'string' ? parseFloat(value) : value;
      formatted = formatSolarCapacity(numVal);
      break;
    }
    case 'percentage': {
      const numVal = typeof value === 'string' ? parseFloat(value) : value;
      formatted = formatPercentage(numVal, decimals);
      break;
    }
    case 'number':
    default: {
      formatted = formatPersianNumber(value, decimals);
      break;
    }
  }

  return (
    <span className={`he-num inline-block ${className}`} dir="rtl">
      {formatted}
    </span>
  );
};
