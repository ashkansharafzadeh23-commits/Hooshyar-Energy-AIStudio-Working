export interface DebtSchedulePeriod {
  periodNumber: number;
  month: number;
  beginningBalance: number;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  endingBalance: number;
  isGracePeriod: boolean;
}

export interface DebtCalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: DebtSchedulePeriod[];
  dscr?: number;
}

export const debtServiceCalculator = {
  calculateSchedule: (
    principal: number,
    annualInterestRatePercent: number, // e.g. 23
    tenorMonths: number, // e.g. 36
    gracePeriodMonths: number = 0, // e.g. 6
    repaymentType: 'EQUAL_INSTALLMENT' | 'EQUAL_PRINCIPAL' | 'BULLET' | 'CUSTOM' = 'EQUAL_INSTALLMENT',
    annualCFADS?: number // Cash Flow Available for Debt Service (optional for DSCR)
  ): DebtCalculationResult => {
    if (principal <= 0 || tenorMonths <= 0) {
      return {
        monthlyPayment: 0,
        totalInterest: 0,
        totalRepayment: 0,
        schedule: []
      };
    }

    const monthlyRate = (annualInterestRatePercent / 100) / 12;
    const repaymentMonths = Math.max(1, tenorMonths - gracePeriodMonths);
    const schedule: DebtSchedulePeriod[] = [];

    let balance = principal;
    let totalInterest = 0;
    let totalPrincipalPaid = 0;

    // Fixed installment for annuity after grace period
    let annuityPayment = 0;
    if (repaymentType === 'EQUAL_INSTALLMENT') {
      if (monthlyRate > 0) {
        annuityPayment = balance * (monthlyRate * Math.pow(1 + monthlyRate, repaymentMonths)) / (Math.pow(1 + monthlyRate, repaymentMonths) - 1);
      } else {
        annuityPayment = balance / repaymentMonths;
      }
    }

    const fixedPrincipalPerMonth = repaymentType === 'EQUAL_PRINCIPAL' ? balance / repaymentMonths : 0;

    for (let m = 1; m <= tenorMonths; m++) {
      const isGrace = m <= gracePeriodMonths;
      const startBal = balance;
      const interestPayment = startBal * monthlyRate;
      let principalPayment = 0;

      if (isGrace) {
        // Interest only during grace period
        principalPayment = 0;
      } else {
        if (repaymentType === 'EQUAL_INSTALLMENT') {
          principalPayment = Math.min(startBal, annuityPayment - interestPayment);
        } else if (repaymentType === 'EQUAL_PRINCIPAL') {
          principalPayment = Math.min(startBal, fixedPrincipalPerMonth);
        } else if (repaymentType === 'BULLET') {
          // Bullet pays principal at last month
          principalPayment = m === tenorMonths ? startBal : 0;
        } else {
          // Default installment
          principalPayment = Math.min(startBal, annuityPayment - interestPayment);
        }
      }

      // Safeguard against rounding
      if (m === tenorMonths && !isGrace) {
        principalPayment = startBal;
      }

      const totalPayment = principalPayment + interestPayment;
      balance = Math.max(0, startBal - principalPayment);
      totalInterest += interestPayment;
      totalPrincipalPaid += principalPayment;

      schedule.push({
        periodNumber: m,
        month: m,
        beginningBalance: Math.round(startBal),
        principalPayment: Math.round(principalPayment),
        interestPayment: Math.round(interestPayment),
        totalPayment: Math.round(totalPayment),
        endingBalance: Math.round(balance),
        isGracePeriod: isGrace
      });
    }

    const regularPayment = schedule.find(s => !s.isGracePeriod)?.totalPayment || (schedule[0]?.totalPayment || 0);

    let dscr: number | undefined;
    if (annualCFADS && annualCFADS > 0) {
      // Annual debt service for year 1 (sum of first 12 months payments)
      const year1DebtService = schedule.slice(0, 12).reduce((sum, s) => sum + s.totalPayment, 0);
      if (year1DebtService > 0) {
        dscr = Math.round((annualCFADS / year1DebtService) * 100) / 100;
      }
    }

    return {
      monthlyPayment: Math.round(regularPayment),
      totalInterest: Math.round(totalInterest),
      totalRepayment: Math.round(principal + totalInterest),
      schedule,
      dscr
    };
  }
};
