import { ProjectStatus } from '../types/project.js';

export const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['ANALYSIS', 'CANCELLED'],
  ANALYSIS: ['FEASIBILITY', 'CANCELLED'],
  FEASIBILITY: ['READY_FOR_RFQ', 'ANALYSIS', 'CANCELLED'],
  READY_FOR_RFQ: ['RFQ_OPEN', 'FEASIBILITY', 'CANCELLED'],
  RFQ_OPEN: ['BIDS_RECEIVED', 'READY_FOR_RFQ', 'CANCELLED'],
  BIDS_RECEIVED: ['EPC_SELECTED', 'RFQ_OPEN', 'CANCELLED'],
  EPC_SELECTED: ['CONTRACTING', 'RFQ_OPEN', 'CANCELLED'],
  CONTRACTING: ['FINANCING', 'PROCUREMENT', 'CANCELLED'],
  FINANCING: ['PROCUREMENT', 'CONTRACTING', 'CANCELLED'],
  PROCUREMENT: ['CONSTRUCTION', 'CANCELLED'],
  CONSTRUCTION: ['COMMISSIONING', 'CANCELLED'],
  COMMISSIONING: ['OPERATIONAL', 'CANCELLED'],
  OPERATIONAL: ['MAINTENANCE'],
  MAINTENANCE: ['OPERATIONAL'],
  CANCELLED: []
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'پیش‌نویس',
  ANALYSIS: 'تحلیل انرژی',
  FEASIBILITY: 'امکان‌سنجی',
  READY_FOR_RFQ: 'آماده استعلام EPC',
  RFQ_OPEN: 'استعلام فعال (انتشار یافته)',
  BIDS_RECEIVED: 'دریافت پیشنهادها',
  EPC_SELECTED: 'پیمانکار منتخب تعیین شد',
  CONTRACTING: 'انعقاد قرارداد',
  FINANCING: 'تأمین مالی و تسهیلات',
  PROCUREMENT: 'تأمین تجهیزات',
  CONSTRUCTION: 'عملیات احداث و نصب',
  COMMISSIONING: 'تست و راه‌اندازی',
  OPERATIONAL: 'بهره‌برداری تجاری',
  MAINTENANCE: 'تعمیر و نگهداری (O&M)',
  CANCELLED: 'لغو شده'
};

export function canTransition(current: ProjectStatus, target: ProjectStatus): boolean {
  if (current === target) return true;
  return VALID_TRANSITIONS[current]?.includes(target) ?? false;
}

export function validateTransition(current: ProjectStatus, target: ProjectStatus): { valid: boolean; error?: string } {
  if (current === target) {
    return { valid: true };
  }

  if (current === 'CANCELLED') {
    return { 
      valid: false, 
      error: 'پروژه لغو شده است و امکان تغییر وضعیت آن وجود ندارد.' 
    };
  }

  const allowed = VALID_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    const currentLabel = STATUS_LABELS[current] || current;
    const targetLabel = STATUS_LABELS[target] || target;
    const allowedLabels = allowed.map(s => STATUS_LABELS[s] || s).join('، ');
    
    return {
      valid: false,
      error: `انتقال وضعیت غیرمجاز است: امکان تغییر وضعیت از «${currentLabel}» به «${targetLabel}» وجود ندارد. وضعیت‌های مجاز بعدی: [${allowedLabels || 'هیچ‌کدام'}]`
    };
  }

  return { valid: true };
}
