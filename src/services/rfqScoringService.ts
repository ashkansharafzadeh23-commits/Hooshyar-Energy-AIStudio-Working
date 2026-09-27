import { 
  EPCBid, 
  ProjectRFQ, 
  ScoringWeights, 
  BidScoreBreakdown, 
  BidRiskFlag, 
  BidComparison, 
  RankedBidEntry,
  RFQScoringThresholds
} from '../types/rfq.js';
import { Organization } from '../types/organization.js';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  price: 25,
  technical: 25,
  equipment: 15,
  warranty: 10,
  timeline: 10,
  experience: 10,
  commercial: 5
};

export interface ConcreteScoringThresholds {
  minWarrantyYears: number;
  preferredWarrantyYears: number;
  longExecutionThresholdDays: number;
  lowPriceOutlierRatio: number;
  highPriceOutlierRatio: number;
}

export const DEFAULT_SCORING_THRESHOLDS: ConcreteScoringThresholds = {
  minWarrantyYears: 3,
  preferredWarrantyYears: 5,
  longExecutionThresholdDays: 120,
  lowPriceOutlierRatio: 0.65,
  highPriceOutlierRatio: 1.45
};

/**
 * Resolve effective scoring and risk thresholds.
 * RFQ-specific commercial terms or scoringConfig override global defaults.
 */
export function resolveRFQThresholds(
  rfq?: Partial<ProjectRFQ>, 
  customOverrides?: Partial<RFQScoringThresholds>
): ConcreteScoringThresholds {
  const comm = rfq?.commercialTerms;
  const cfg = rfq?.scoringConfig;

  return {
    minWarrantyYears: customOverrides?.minWarrantyYears ?? comm?.minWarrantyYears ?? cfg?.minWarrantyYears ?? DEFAULT_SCORING_THRESHOLDS.minWarrantyYears,
    preferredWarrantyYears: customOverrides?.preferredWarrantyYears ?? comm?.preferredWarrantyYears ?? cfg?.preferredWarrantyYears ?? DEFAULT_SCORING_THRESHOLDS.preferredWarrantyYears,
    longExecutionThresholdDays: customOverrides?.longExecutionThresholdDays ?? comm?.maxExecutionDays ?? cfg?.longExecutionThresholdDays ?? DEFAULT_SCORING_THRESHOLDS.longExecutionThresholdDays,
    lowPriceOutlierRatio: customOverrides?.lowPriceOutlierRatio ?? comm?.lowPriceThresholdRatio ?? cfg?.lowPriceOutlierRatio ?? DEFAULT_SCORING_THRESHOLDS.lowPriceOutlierRatio,
    highPriceOutlierRatio: customOverrides?.highPriceOutlierRatio ?? comm?.highPriceThresholdRatio ?? cfg?.highPriceOutlierRatio ?? DEFAULT_SCORING_THRESHOLDS.highPriceOutlierRatio,
  };
}

/**
 * Deterministically detect risk flags for a bid.
 * AI or advertising MUST NOT influence this.
 */
export function evaluateBidRisks(
  bid: EPCBid, 
  rfq: ProjectRFQ, 
  allBids: EPCBid[], 
  epcOrg?: Organization,
  customThresholds?: Partial<RFQScoringThresholds>
): BidRiskFlag[] {
  const flags: BidRiskFlag[] = [];
  const thresholds = resolveRFQThresholds(rfq, customThresholds);

  // 1. Check Missing Documents
  const requiredDocs = rfq.requiredDocuments || [];
  const providedDocs = [...(bid.technicalDocuments || []), ...(bid.commercialDocuments || [])];
  if (requiredDocs.length > 0 && providedDocs.length < requiredDocs.length) {
    flags.push({
      type: 'MISSING_DOCUMENTS',
      severity: 'HIGH',
      description: `تعداد مدارک بارگذاری شده (${providedDocs.length}) کمتر از حداقل اسناد الزامی استعلام (${requiredDocs.length}) است.`
    });
  }

  // 2. Check Price Outlier against submitted peer bids
  const validPrices = allBids.map(b => b.totalPrice).filter(p => p > 0);
  if (validPrices.length >= 2) {
    const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    if (bid.totalPrice < avgPrice * thresholds.lowPriceOutlierRatio) {
      flags.push({
        type: 'PRICE_OUTLIER',
        severity: 'HIGH',
        description: 'قیمت این پیشنهاد به‌طور معناداری از میانگین پیشنهادهای دریافت‌شده پایین‌تر است و نیازمند بررسی دامنه کار، مشخصات تجهیزات و استثنائات پیشنهاد است.'
      });
    } else if (bid.totalPrice > avgPrice * thresholds.highPriceOutlierRatio) {
      const pctOver = Math.round((thresholds.highPriceOutlierRatio - 1) * 100);
      flags.push({
        type: 'PRICE_OUTLIER',
        severity: 'MEDIUM',
        description: `قیمت پیشنهادی بیش از ${pctOver}٪ از میانگین سایر پیشنهادهای دریافت‌شده بالاتر است.`
      });
    }
  }

  // 3. Check Short Warranty against configured RFQ requirements
  if (bid.warrantyYears < thresholds.minWarrantyYears) {
    flags.push({
      type: 'SHORT_WARRANTY',
      severity: 'HIGH',
      description: `دوره گارانتی پیشنهادی (${bid.warrantyYears} سال) کمتر از حداقل دوره تعیین‌شده در الزامات استعلام (${thresholds.minWarrantyYears} سال) است.`
    });
  } else if (bid.warrantyYears < thresholds.preferredWarrantyYears) {
    flags.push({
      type: 'SHORT_WARRANTY',
      severity: 'LOW',
      description: `دوره گارانتی پیشنهادی (${bid.warrantyYears} سال) کمتر از سطح گارانتی ترجیحی استعلام (${thresholds.preferredWarrantyYears} سال) است.`
    });
  }

  // 4. Check Long Execution against configured threshold
  const executionDays = bid.executionDays || 0;
  if (executionDays > thresholds.longExecutionThresholdDays) {
    flags.push({
      type: 'LONG_EXECUTION',
      severity: 'MEDIUM',
      description: `مدت زمان اجرای پروژه (${executionDays} روز) از سقف زمانی تعیین‌شده در الزامات استعلام (${thresholds.longExecutionThresholdDays} روز) بیشتر است.`
    });
  }

  // 5. Check Unverified EPC
  if (!epcOrg || epcOrg.verificationStatus !== 'VERIFIED') {
    flags.push({
      type: 'UNVERIFIED_EPC',
      severity: 'MEDIUM',
      description: 'شرکت پیمانکار هنوز فرآیند احراز هویت و تأیید مدارک رسمی را در سامانه تکمیل نکرده است.'
    });
  }

  // 6. Check Unusual Payment Terms
  const terms = (bid.paymentTerms || '').toLowerCase();
  if (terms.includes('100% پیش') || terms.includes('تمام نقد قبل') || terms.includes('80% پیش')) {
    flags.push({
      type: 'UNUSUAL_PAYMENT_TERMS',
      severity: 'HIGH',
      description: 'شرایط پرداخت غیرمتعارف است؛ مطالبه درصد بالای پیش‌پرداخت ریسک نقدینگی کارفرما را به شدت افزایش می‌دهد.'
    });
  }

  // 7. Check Technical Deviation
  if (bid.technicalCompliance === 'NON_COMPLIANT' || bid.technicalCompliance === 'PARTIALLY_COMPLIANT') {
    flags.push({
      type: 'TECHNICAL_DEVIATION',
      severity: bid.technicalCompliance === 'NON_COMPLIANT' ? 'HIGH' : 'MEDIUM',
      description: bid.complianceNotes || 'پیشنهاد فنی دارای انحرافاتی نسبت به الزامات اولیه دفترچه استعلام است.'
    });
  }

  return flags;
}

/**
 * Deterministically compute score breakdown for a bid.
 * Advertising or subscription status NEVER influences this calculation.
 */
export function scoreBid(
  bid: EPCBid, 
  rfq: ProjectRFQ, 
  allBids: EPCBid[], 
  epcOrg?: Organization,
  customWeights?: Partial<ScoringWeights>,
  customThresholds?: Partial<RFQScoringThresholds>
): { breakdown: BidScoreBreakdown; risks: BidRiskFlag[]; totalScore: number } {
  const weights: ScoringWeights = { ...DEFAULT_SCORING_WEIGHTS, ...(customWeights || {}) };
  const thresholds = resolveRFQThresholds(rfq, customThresholds);

  // 1. Price Score (25% default)
  const allPrices = allBids.map(b => b.totalPrice).filter(p => p > 0);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : bid.totalPrice;
  let priceScore = 0;
  if (bid.totalPrice > 0 && minPrice > 0) {
    // Relative inverse scaling: min price gets full weight, higher prices get proportional fraction
    const ratio = minPrice / bid.totalPrice;
    priceScore = Math.round(ratio * weights.price * 10) / 10;
  }
  priceScore = Math.min(weights.price, Math.max(0, priceScore));

  // 2. Technical Score (25% default)
  let technicalScore = 0;
  switch (bid.technicalCompliance) {
    case 'COMPLIANT':
      technicalScore = weights.technical;
      break;
    case 'PARTIALLY_COMPLIANT':
      technicalScore = Math.round(weights.technical * 0.6 * 10) / 10;
      break;
    case 'REQUIRES_REVIEW':
      technicalScore = Math.round(weights.technical * 0.4 * 10) / 10;
      break;
    case 'NON_COMPLIANT':
      technicalScore = 0;
      break;
    default:
      technicalScore = Math.round(weights.technical * 0.5 * 10) / 10;
  }

  // 3. Equipment Score (15% default)
  let equipmentScore = 0;
  const eq = bid.equipmentSummary || {};
  let eqCount = 0;
  if (eq.panels && eq.panels.trim().length > 3) eqCount += 1.5;
  if (eq.inverters && eq.inverters.trim().length > 3) eqCount += 1.5;
  if (eq.structures && eq.structures.trim().length > 3) eqCount += 1;
  if (eq.transformers || eq.storage || eq.monitoring) eqCount += 1;
  
  const eqRatio = Math.min(1, eqCount / 5);
  equipmentScore = Math.round(eqRatio * weights.equipment * 10) / 10;

  // 4. Warranty Score (10% default)
  let warrantyScore = 0;
  if (bid.warrantyYears >= thresholds.preferredWarrantyYears * 2) {
    warrantyScore = weights.warranty;
  } else if (bid.warrantyYears >= thresholds.preferredWarrantyYears) {
    warrantyScore = Math.round(weights.warranty * 0.85 * 10) / 10;
  } else if (bid.warrantyYears >= thresholds.minWarrantyYears) {
    warrantyScore = Math.round(weights.warranty * 0.6 * 10) / 10;
  } else {
    warrantyScore = Math.round(weights.warranty * 0.2 * 10) / 10;
  }

  // 5. Timeline Score (10% default)
  let timelineScore = 0;
  const allDays = allBids.map(b => b.executionDays).filter(d => d > 0);
  const minDays = allDays.length > 0 ? Math.min(...allDays) : bid.executionDays;
  if (bid.executionDays > 0 && minDays > 0) {
    const timeRatio = minDays / bid.executionDays;
    timelineScore = Math.round(timeRatio * weights.timeline * 10) / 10;
  }
  timelineScore = Math.min(weights.timeline, Math.max(0, timelineScore));

  // 6. Experience / Verification Score (10% default)
  let experienceScore = 0;
  if (epcOrg?.verificationStatus === 'VERIFIED') {
    experienceScore += weights.experience * 0.7;
  } else {
    experienceScore += weights.experience * 0.2;
  }
  // If tradeName or registration details present
  if (epcOrg?.registrationNumber || epcOrg?.nationalId) {
    experienceScore += weights.experience * 0.3;
  }
  experienceScore = Math.min(weights.experience, Math.round(experienceScore * 10) / 10);

  // 7. Commercial Score (5% default)
  let commercialScore = 0;
  const termsText = (bid.paymentTerms || '').toLowerCase();
  if (termsText.includes('مرحله‌ای') || termsText.includes('پیشرفت کار') || termsText.includes('تایید مهندس')) {
    commercialScore = weights.commercial;
  } else if (termsText.includes('چک') || termsText.includes('اقساط')) {
    commercialScore = Math.round(weights.commercial * 0.8 * 10) / 10;
  } else {
    commercialScore = Math.round(weights.commercial * 0.5 * 10) / 10;
  }

  const totalScore = Math.round(
    (priceScore + technicalScore + equipmentScore + warrantyScore + timelineScore + experienceScore + commercialScore) * 10
  ) / 10;

  const breakdown: BidScoreBreakdown = {
    priceScore,
    technicalScore,
    equipmentScore,
    warrantyScore,
    timelineScore,
    experienceScore,
    commercialScore,
    totalScore
  };

  const risks = evaluateBidRisks(bid, rfq, allBids, epcOrg, customThresholds);

  return { breakdown, risks, totalScore };
}

/**
 * Generate a deterministic comparison of all bids for an RFQ.
 */
export function compareBids(
  rfq: ProjectRFQ, 
  bids: EPCBid[], 
  organizations: Organization[],
  customWeights?: Partial<ScoringWeights>,
  customThresholds?: Partial<RFQScoringThresholds>
): BidComparison {
  const weights: ScoringWeights = { ...DEFAULT_SCORING_WEIGHTS, ...(customWeights || {}) };
  const orgMap = new Map<string, Organization>();
  for (const org of organizations) {
    orgMap.set(org.id, org);
  }

  const scoredEntries: Array<Omit<RankedBidEntry, "rank">> = bids.map(bid => {
    const org = orgMap.get(bid.epcOrganizationId);
    const { breakdown, risks, totalScore } = scoreBid(bid, rfq, bids, org, weights, customThresholds);

    // Update bid object reference with score breakdown
    bid.scoreBreakdown = breakdown;
    bid.riskFlags = risks;
    bid.normalizedScore = totalScore;

    const highlights: string[] = [];
    if (breakdown.priceScore >= weights.price * 0.9) highlights.push('بهترین قیمت اقتصادی');
    if (breakdown.technicalScore >= weights.technical * 0.95) highlights.push('انطباق کامل فنی با الزامات');
    if (breakdown.warrantyScore >= weights.warranty * 0.9) highlights.push(`گارانتی طولانی‌مدت (${bid.warrantyYears} سال)`);
    if (breakdown.timelineScore >= weights.timeline * 0.9) highlights.push(`سریع‌ترین زمان‌بندی اجرا (${bid.executionDays} روز)`);
    if (org?.verificationStatus === 'VERIFIED') highlights.push('شرکت EPC احراز هویت شده');

    return {
      bid,
      epcName: org?.tradeName || org?.legalName || 'شرکت پیمانکار EPC',
      epcVerified: org?.verificationStatus === 'VERIFIED',
      scoreBreakdown: breakdown,
      highlights,
      riskFlags: risks
    };
  });

  // Sort descending by totalScore
  scoredEntries.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);

  const rankedBids: RankedBidEntry[] = scoredEntries.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));

  // Generate objective analytical explanation (AI role: explanatory only, never changes score)
  let aiExplanation = '';
  if (rankedBids.length > 0) {
    const top = rankedBids[0];
    const topName = top.epcName;
    const topScore = top.scoreBreakdown.totalScore;
    
    aiExplanation = `بررسی تحلیلی پیشنهادها: پیشنهاد شرکت «${topName}» با نمره کل ${topScore} از ۱۰۰ در رتبه اول قرار دارد. ` +
      `این پیشنهاد در بخش قیمت نمره ${top.scoreBreakdown.priceScore}/${weights.price} و در بخش انطباق فنی نمره ${top.scoreBreakdown.technicalScore}/${weights.technical} کسب کرده است. `;

    if (rankedBids.length > 1) {
      const runnerUp = rankedBids[1];
      aiExplanation += `در مقایسه با رتبه دوم («${runnerUp.epcName}» با نمره ${runnerUp.scoreBreakdown.totalScore})، تفاوت اصلی در ` +
        (top.scoreBreakdown.priceScore > runnerUp.scoreBreakdown.priceScore ? 'قیمت رقابتی‌تر' : 'مشخصات فنی و گارانتی معتبرتر') +
        ` مشهود است. `;
    }

    const highRisks = rankedBids.flatMap(b => b.riskFlags.filter(r => r.severity === 'HIGH'));
    if (highRisks.length > 0) {
      aiExplanation += `توجه: تعداد ${highRisks.length} هشدار ریسک با اولویت بالا در مجموع پیشنهادها شناسایی شده که لازم است قبل از عقد قرارداد نهایی شفاف‌سازی شوند.`;
    }
  }

  return {
    rfqId: rfq.id,
    projectId: rfq.projectId,
    generatedAt: new Date().toISOString(),
    weights,
    rankedBids,
    aiExplanation
  };
}
