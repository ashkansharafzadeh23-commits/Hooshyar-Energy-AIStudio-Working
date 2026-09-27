import { FinancingOffer, FinancingRequest, FinancingApplication } from '../types/financing.js';
import { debtServiceCalculator } from './debtServiceCalculator.js';

export interface OfferComparisonSummary {
  offer: FinancingOffer;
  requestedAmount: number;
  coveragePercent: number;
  effectiveRateLabel: string;
  monthlyPayment: number;
  totalFees: number;
  totalInterest: number;
  totalFinancingCost: number;
  totalRepayment: number;
  comparisonScore?: number;
  keyStrengths: string[];
  keyTradeoffs: string[];
}

export interface MultiOfferComparisonResult {
  offersCount: number;
  comparisons: {
    offerId: string;
    offerCode: string;
    partnerId: string;
    amount: {
      offeredAmount: number;
      currency: string;
      coveragePercent: number;
    };
    rate: {
      annualRate: number;
      rateType: string;
      label: string;
    };
    tenor: {
      tenorMonths: number;
      label: string;
    };
    gracePeriod: {
      gracePeriodMonths: number;
      label: string;
    };
    fees: {
      totalFeesAmount: number;
      items: any[];
    };
    collateral: {
      count: number;
      requirements: string[];
    };
    conditions: {
      count: number;
      conditionsPrecedent: string[];
    };
    repaymentStructure: {
      structure: string;
      monthlyPayment: number;
      totalInterest: number;
      totalFinancingCost: number;
      totalRepayment: number;
    };
    tradeoffs: string[];
    advantages: string[];
  }[];
  comparativeTradeoffsSummary: string[];
  disclaimer: string;
}

export const MANDATORY_FINANCING_DISCLAIMER = 
  'Hooshyar Energy does not recommend or endorse any financial product. Final financing decisions belong exclusively to the project owner.';

export const financingOfferComparisonService = {
  enrichAndScoreOffer: (offer: FinancingOffer, requestOrApp: Partial<FinancingApplication> | Partial<FinancingRequest>): OfferComparisonSummary => {
    const requested = (requestOrApp as any).financingRequested || (requestOrApp as any).requestedAmount || 1;
    const coveragePercent = Math.min(100, Math.round((offer.offeredAmount / requested) * 100));

    const totalFees = (offer.fees || []).reduce((sum, f) => {
      if (f.percentage) {
        return sum + (offer.offeredAmount * f.percentage) / 100;
      }
      return sum + (f.amount || 0);
    }, 0);

    const rate = offer.annualRate !== undefined ? offer.annualRate : (offer.interestRate || 0);
    const repaymentType = offer.repaymentStructure || offer.repaymentType || 'EQUAL_INSTALLMENT';
    
    const debtCalc = debtServiceCalculator.calculateSchedule(
      offer.offeredAmount,
      rate,
      offer.tenorMonths,
      offer.gracePeriodMonths,
      repaymentType
    );

    const totalInterest = debtCalc.totalInterest;
    const totalFinancingCost = totalInterest + totalFees;
    const totalRepayment = offer.offeredAmount + totalFinancingCost;

    const keyStrengths: string[] = [];
    const keyTradeoffs: string[] = [];

    if (coveragePercent >= 100) keyStrengths.push('پوشش کامل سرمایه درخواستی');
    else if (coveragePercent >= 80) keyStrengths.push(`پوشش مناسب تسهیلات (${coveragePercent}٪)`);
    else keyTradeoffs.push(`پوشش کسری تسهیلات (${coveragePercent}٪) - نیاز به منابع تکمیلی`);

    if (offer.gracePeriodMonths >= 6) keyStrengths.push(`دوره تنفس مناسب (${offer.gracePeriodMonths} ماه) متناسب با بازه احداث`);
    else if (offer.gracePeriodMonths === 0) keyTradeoffs.push('فاقد دوره تنفس بازپرداخت');

    if (rate > 0 && rate <= 18) keyStrengths.push(`نرخ سود حمایتی یا ترجیحی (${rate}٪)`);
    else if (rate > 23) keyTradeoffs.push(`نرخ هزینه سرمایه بالاتر از میانگین (${rate}٪)`);

    if (offer.tenorMonths >= 48) keyStrengths.push(`دوره بازپرداخت بلندمدت (${offer.tenorMonths} ماه)`);
    else if (offer.tenorMonths <= 24) keyTradeoffs.push(`دوره بازپرداخت کوتاه‌مدت (${offer.tenorMonths} ماه) با اقساط ماهانه بالاتر`);

    const colCount = (offer.collateralRequirements || []).length;
    if (colCount > 2) keyTradeoffs.push(`تعداد وثایق و تضامین درخواستی قابل توجه است (${colCount} فقره)`);
    else if (colCount <= 1) keyStrengths.push('الزامات وثیقه‌گذاری محدودتر');

    const condCount = (offer.conditionsPrecedent || []).length;
    if (condCount > 3) keyTradeoffs.push(`شروط متعدد پیش از امضای قرارداد (${condCount} شرط)`);

    return {
      offer: {
        ...offer,
        estimatedPeriodicPayment: debtCalc.monthlyPayment,
        estimatedTotalFinancingCost: totalFinancingCost,
        estimatedTotalRepayment: totalRepayment,
        comparisonScore: 75
      },
      requestedAmount: requested,
      coveragePercent,
      effectiveRateLabel: rate > 0 ? `${rate}٪ سالانه` : 'اعلام با بررسی اعتباری',
      monthlyPayment: debtCalc.monthlyPayment,
      totalFees,
      totalInterest,
      totalFinancingCost,
      totalRepayment,
      comparisonScore: 75,
      keyStrengths,
      keyTradeoffs
    };
  },

  /**
   * Deterministic Side-by-Side Comparison of Multiple Offers
   * Does NOT pick a "best" offer. Provides analytical trade-offs and mandatory disclaimer.
   */
  compareOffers: (
    offers: FinancingOffer[],
    requestOrApp: Partial<FinancingApplication> | Partial<FinancingRequest>
  ): MultiOfferComparisonResult => {
    const requested = (requestOrApp as any).financingRequested || (requestOrApp as any).requestedAmount || 1;

    const comparisons = offers.map(offer => {
      const enriched = financingOfferComparisonService.enrichAndScoreOffer(offer, requestOrApp);
      const totalFees = enriched.totalFees;
      const rate = offer.annualRate !== undefined ? offer.annualRate : (offer.interestRate || 0);
      const rateType = offer.rateType || offer.interestRateType || 'FIXED';
      const repaymentStructure = offer.repaymentStructure || offer.repaymentType || 'EQUAL_INSTALLMENT';

      return {
        offerId: offer.id,
        offerCode: offer.offerCode,
        partnerId: offer.partnerId || offer.financialPartnerProfileId,
        amount: {
          offeredAmount: offer.offeredAmount,
          currency: offer.currency || 'IRR',
          coveragePercent: enriched.coveragePercent
        },
        rate: {
          annualRate: rate,
          rateType,
          label: rate > 0 ? `${rate}٪ سالانه (${rateType === 'FIXED' ? 'ثابت' : 'متغیر'})` : 'طبق توافق'
        },
        tenor: {
          tenorMonths: offer.tenorMonths,
          label: `${offer.tenorMonths} ماه (${(offer.tenorMonths / 12).toFixed(1)} سال)`
        },
        gracePeriod: {
          gracePeriodMonths: offer.gracePeriodMonths,
          label: `${offer.gracePeriodMonths} ماه`
        },
        fees: {
          totalFeesAmount: totalFees,
          items: offer.fees || []
        },
        collateral: {
          count: (offer.collateralRequirements || []).length,
          requirements: offer.collateralRequirements || []
        },
        conditions: {
          count: (offer.conditionsPrecedent || []).length,
          conditionsPrecedent: offer.conditionsPrecedent || []
        },
        repaymentStructure: {
          structure: repaymentStructure,
          monthlyPayment: enriched.monthlyPayment,
          totalInterest: enriched.totalInterest,
          totalFinancingCost: enriched.totalFinancingCost,
          totalRepayment: enriched.totalRepayment
        },
        tradeoffs: enriched.keyTradeoffs,
        advantages: enriched.keyStrengths
      };
    });

    const comparativeTradeoffsSummary: string[] = [];
    if (offers.length >= 2) {
      // Analyze tenor vs monthly cash flow
      const lowestRateOffer = [...comparisons].sort((a, b) => a.rate.annualRate - b.rate.annualRate)[0];
      const longestTenorOffer = [...comparisons].sort((a, b) => b.tenor.tenorMonths - a.tenor.tenorMonths)[0];

      if (lowestRateOffer.offerId !== longestTenorOffer.offerId) {
        comparativeTradeoffsSummary.push(
          `پیشنهاد ${lowestRateOffer.offerCode} دارای نرخ سود پایین‌تر (${lowestRateOffer.rate.label}) است که کل هزینه بهره را کاهش می‌دهد، در حالی که پیشنهاد ${longestTenorOffer.offerCode} دوره بازپرداخت طولانی‌تر (${longestTenorOffer.tenor.label}) داشته و فشار نقدینگی ماهانه را تسهیل می‌کند.`
        );
      }

      // Analyze collateral burden
      const lowestCollateral = [...comparisons].sort((a, b) => a.collateral.count - b.collateral.count)[0];
      const highestCollateral = [...comparisons].sort((a, b) => b.collateral.count - a.collateral.count)[0];
      if (lowestCollateral.offerId !== highestCollateral.offerId && highestCollateral.collateral.count > lowestCollateral.collateral.count) {
        comparativeTradeoffsSummary.push(
          `پیشنهاد ${lowestCollateral.offerCode} نیازمند وثایق سهل‌الوصول‌تر و کمتر (${lowestCollateral.collateral.count} مورد) است، در حالی که پیشنهاد ${highestCollateral.offerCode} نیازمند تضامین بیشتری (${highestCollateral.collateral.count} مورد) می‌باشد.`
        );
      }
    }

    return {
      offersCount: offers.length,
      comparisons,
      comparativeTradeoffsSummary,
      disclaimer: MANDATORY_FINANCING_DISCLAIMER
    };
  }
};
