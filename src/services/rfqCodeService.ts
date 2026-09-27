import { rfqRepository } from '../repositories/rfqRepository.js';

export function generateRFQCode(): string {
  const allRFQs = rfqRepository.getAllRFQs?.() || [];
  let maxNum = 0;
  for (const r of allRFQs) {
    if (r.rfqCode && typeof r.rfqCode === 'string') {
      const match = r.rfqCode.match(/RFQ-HSE-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }
  const next = maxNum + 1;
  const padded = next.toString().padStart(6, '0');
  return `RFQ-HSE-${padded}`;
}

export function generateBidCode(): string {
  const allBids = rfqRepository.getAllBids?.() || [];
  let maxNum = 0;
  for (const b of allBids) {
    if (b.bidCode && typeof b.bidCode === 'string') {
      const match = b.bidCode.match(/BID-HSE-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }
  const next = maxNum + 1;
  const padded = next.toString().padStart(6, '0');
  return `BID-HSE-${padded}`;
}
