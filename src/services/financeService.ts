import { FinancialAssumptionSet, ProjectFinancialModel, FinancialResults, FinancialScenario, MoneyAmount, ReplacementEvent } from '../types/finance.js';

export function normalizeMoney(m: MoneyAmount | undefined, targetUnit: 'RIAL' | 'TOMAN'): number {
  if (!m || typeof m.amount !== 'number' || isNaN(m.amount)) return 0;
  if (m.unit === targetUnit) return m.amount;
  if (m.unit === 'TOMAN' && targetUnit === 'RIAL') return m.amount * 10;
  if (m.unit === 'RIAL' && targetUnit === 'TOMAN') return m.amount / 10;
  return m.amount;
}

export const financeService = {
  calculateModel: (model: ProjectFinancialModel, assumptions: FinancialAssumptionSet): FinancialResults => {
    const unit = model.displayCurrencyUnit || 'TOMAN';

    // 1. Calculate CAPEX with strict currency unit normalization
    const capexObject = model.capex;
    const totalCapexAmount = 
      normalizeMoney(capexObject.engineering, unit) + 
      normalizeMoney(capexObject.solarPanels, unit) + 
      normalizeMoney(capexObject.inverters, unit) + 
      normalizeMoney(capexObject.battery, unit) + 
      normalizeMoney(capexObject.generator, unit) + 
      normalizeMoney(capexObject.mountingStructure, unit) + 
      normalizeMoney(capexObject.electricalEquipment, unit) + 
      normalizeMoney(capexObject.cables, unit) + 
      normalizeMoney(capexObject.protection, unit) + 
      normalizeMoney(capexObject.monitoring, unit) + 
      normalizeMoney(capexObject.transportation, unit) + 
      normalizeMoney(capexObject.installation, unit) + 
      normalizeMoney(capexObject.commissioning, unit) + 
      normalizeMoney(capexObject.gridConnection, unit) + 
      normalizeMoney(capexObject.permits, unit) + 
      normalizeMoney(capexObject.civilWorks, unit) + 
      normalizeMoney(capexObject.tax, unit) + 
      normalizeMoney(capexObject.contingency, unit) + 
      normalizeMoney(capexObject.other, unit);
    
    const totalCapex: MoneyAmount = { amount: totalCapexAmount, currency: 'IRR', unit };

    // 2. Calculate OPEX Year 1
    const opexObject = model.opex;
    const totalOpexYear1Amount = 
      normalizeMoney(opexObject.maintenance, unit) + 
      normalizeMoney(opexObject.cleaning, unit) + 
      normalizeMoney(opexObject.insurance, unit) + 
      normalizeMoney(opexObject.monitoring, unit) + 
      normalizeMoney(opexObject.landLease, unit) + 
      normalizeMoney(opexObject.staff, unit) + 
      normalizeMoney(opexObject.security, unit) + 
      normalizeMoney(opexObject.batteryReplacementReserve, unit) + 
      normalizeMoney(opexObject.inverterReplacementReserve, unit) + 
      normalizeMoney(opexObject.administration, unit) + 
      normalizeMoney(opexObject.other, unit);
    
    const totalOpexYear1: MoneyAmount = { amount: totalOpexYear1Amount, currency: 'IRR', unit };

    // 3. Year 1 Energy Benefits
    const generationKwh = model.energyEconomics?.annualGenerationKwh || 0;
    const selfConsumptionRatio = model.energyEconomics?.selfConsumptionRatio || 0;
    const exportRatio = model.energyEconomics?.exportRatio || 0;
    const selfConsumptionKwh = generationKwh * (selfConsumptionRatio / 100);
    const exportKwh = generationKwh * (exportRatio / 100);

    const customerTariffUnitAmount = normalizeMoney(model.energyEconomics?.customerTariff?.unitPricePerKwh, unit);
    const exportTariffUnitAmount = normalizeMoney(model.energyEconomics?.exportTariff?.unitPricePerKwh, unit);

    const year1SavingsAmount = selfConsumptionKwh * customerTariffUnitAmount;
    const year1ExportRevenueAmount = exportKwh * exportTariffUnitAmount;
    const year1TotalBenefitAmount = year1SavingsAmount + year1ExportRevenueAmount;

    // Safety checks for insufficient data
    if (totalCapexAmount <= 0 || generationKwh <= 0) {
      return {
        totalCapex,
        annualOpexYear1: totalOpexYear1,
        annualGenerationYear1Kwh: generationKwh,
        annualSavingsYear1: { amount: year1SavingsAmount, currency: 'IRR', unit },
        annualExportRevenueYear1: { amount: year1ExportRevenueAmount, currency: 'IRR', unit },
        annualNetBenefitYear1: { amount: year1TotalBenefitAmount, currency: 'IRR', unit },
        simplePaybackYears: 'NO_PAYBACK_WITHIN_PROJECT_LIFE',
        discountedPaybackYears: 'NO_PAYBACK_WITHIN_PROJECT_LIFE',
        npv: { amount: 0, currency: 'IRR', unit },
        irrPercent: 'IRR_NOT_AVAILABLE',
        lifetimeRoiPercent: 0,
        lcoePerKwh: { amount: 0, currency: 'IRR', unit },
        totalLifetimeRevenue: { amount: 0, currency: 'IRR', unit },
        totalLifetimeOpex: { amount: 0, currency: 'IRR', unit },
        totalLifetimeNetCashFlow: { amount: 0, currency: 'IRR', unit }
      };
    }

    // 4. Cash Flows Generation
    const normalizedReplacements = (model.replacements || []).map(r => ({
      ...r,
      estimatedCost: {
        ...r.estimatedCost,
        amount: normalizeMoney(r.estimatedCost, unit),
        unit
      }
    }));
    const cashFlows = financeService.generateCashFlows(totalCapexAmount, totalOpexYear1Amount, year1TotalBenefitAmount, assumptions, normalizedReplacements);
    
    // 5. Payback
    const simplePayback = financeService.calculatePayback(cashFlows.netCashFlows, false, assumptions.discountRatePercent);
    const discountedPayback = financeService.calculatePayback(cashFlows.netCashFlows, true, assumptions.discountRatePercent);

    // 6. NPV & IRR
    const npvAmount = financeService.calculateNPV(cashFlows.netCashFlows, assumptions.discountRatePercent);
    const irrPercent = financeService.calculateIRR(cashFlows.netCashFlows);
    
    // 7. LCOE
    const lcoeAmount = financeService.calculateLCOE(totalCapexAmount, totalOpexYear1Amount, generationKwh, assumptions, normalizedReplacements);

    // 8. Totals
    const totalLifetimeRevenue = cashFlows.grossBenefits.reduce((sum, v) => sum + v, 0);
    const totalLifetimeOpex = cashFlows.totalOpex.reduce((sum, v) => sum + v, 0);
    const totalLifetimeNetCashFlow = cashFlows.netCashFlows.reduce((sum, v) => sum + v, 0);
    const lifetimeRoiPercent = totalCapexAmount > 0 ? (totalLifetimeNetCashFlow / totalCapexAmount) * 100 : 0;
    
    return {
      totalCapex,
      annualOpexYear1: { amount: totalOpexYear1Amount, currency: 'IRR', unit },
      annualGenerationYear1Kwh: generationKwh,
      annualSavingsYear1: { amount: year1SavingsAmount, currency: 'IRR', unit },
      annualExportRevenueYear1: { amount: year1ExportRevenueAmount, currency: 'IRR', unit },
      annualNetBenefitYear1: { amount: year1TotalBenefitAmount, currency: 'IRR', unit },
      
      simplePaybackYears: simplePayback,
      discountedPaybackYears: discountedPayback,
      npv: { amount: npvAmount, currency: 'IRR', unit },
      irrPercent,
      lifetimeRoiPercent,
      lcoePerKwh: { amount: lcoeAmount, currency: 'IRR', unit },
      
      totalLifetimeRevenue: { amount: totalLifetimeRevenue, currency: 'IRR', unit },
      totalLifetimeOpex: { amount: totalLifetimeOpex, currency: 'IRR', unit },
      totalLifetimeNetCashFlow: { amount: totalLifetimeNetCashFlow, currency: 'IRR', unit }
    };
  },

  generateCashFlows: (capex: number, opexYear1: number, benefitYear1: number, assumptions: FinancialAssumptionSet, replacements: ReplacementEvent[]) => {
    const netCashFlows = [-capex]; // Year 0
    const grossBenefits = [0];
    const totalOpex = [0];
    
    for (let year = 1; year <= assumptions.projectLifetimeYears; year++) {
      // Degrade benefit
      const degradedBenefit = benefitYear1 * Math.pow(1 - (assumptions.panelAnnualDegradationPercent / 100), year - 1);
      // Escalate tariff
      const escalatedBenefit = degradedBenefit * Math.pow(1 + (assumptions.electricityTariffEscalationPercent / 100), year - 1);
      grossBenefits.push(escalatedBenefit);
      
      // Escalate OPEX
      const escalatedOpex = opexYear1 * Math.pow(1 + (assumptions.annualOpexEscalationPercent / 100), year - 1);
      
      // Replacements
      const yearReplacements = replacements.filter(r => r.year === year).reduce((sum, r) => sum + r.estimatedCost.amount, 0);
      const totalCost = escalatedOpex + yearReplacements;
      totalOpex.push(totalCost);
      
      // Net
      const taxAmount = (escalatedBenefit - totalCost) > 0 ? (escalatedBenefit - totalCost) * (assumptions.taxRatePercent / 100) : 0;
      const net = escalatedBenefit - totalCost - taxAmount;
      netCashFlows.push(net);
    }
    
    return { netCashFlows, grossBenefits, totalOpex };
  },

  calculateNPV: (cashFlows: number[], discountRatePercent: number): number => {
    const r = discountRatePercent / 100;
    let npv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + r, t);
    }
    return npv;
  },

  calculatePayback: (cashFlows: number[], discounted: boolean, discountRatePercent: number): number | 'NO_PAYBACK_WITHIN_PROJECT_LIFE' => {
    const r = discountRatePercent / 100;
    let cumulative = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const cf = discounted ? cashFlows[t] / Math.pow(1 + r, t) : cashFlows[t];
      cumulative += cf;
      if (cumulative >= 0 && t > 0) {
        // Linear interpolation for fraction of year
        const prevCumulative = cumulative - cf;
        const fraction = Math.abs(prevCumulative) / cf;
        return (t - 1) + fraction;
      }
    }
    return 'NO_PAYBACK_WITHIN_PROJECT_LIFE';
  },

  calculateIRR: (cashFlows: number[]): number | 'IRR_NOT_AVAILABLE' => {
    // Simple Bisection method for IRR
    let min = -0.99;
    let max = 10.0; // 1000%
    const tolerance = 1e-5;
    
    let irr = 0;
    let npv = 0;
    
    // Check if IRR is possible (at least one positive and one negative cash flow)
    const hasPos = cashFlows.some(c => c > 0);
    const hasNeg = cashFlows.some(c => c < 0);
    if (!hasPos || !hasNeg) return 'IRR_NOT_AVAILABLE';
    
    for (let i = 0; i < 100; i++) {
      irr = (min + max) / 2;
      npv = financeService.calculateNPV(cashFlows, irr * 100);
      
      if (Math.abs(npv) < tolerance) {
        return irr * 100;
      }
      
      if (npv > 0) {
        min = irr; // NPV is positive, rate needs to be higher to reduce NPV
      } else {
        max = irr; // NPV is negative, rate needs to be lower
      }
    }
    
    // If not converged perfectly but close
    if (Math.abs(npv) < 1) return irr * 100;
    
    return 'IRR_NOT_AVAILABLE';
  },

  calculateLCOE: (capex: number, opexYear1: number, generationYear1Kwh: number, assumptions: FinancialAssumptionSet, replacements: ReplacementEvent[]): number => {
    const r = assumptions.discountRatePercent / 100;
    let pvCosts = capex;
    let pvGeneration = 0;
    
    for (let t = 1; t <= assumptions.projectLifetimeYears; t++) {
      const escalatedOpex = opexYear1 * Math.pow(1 + (assumptions.annualOpexEscalationPercent / 100), t - 1);
      const yearReplacements = replacements.filter(re => re.year === t).reduce((sum, re) => sum + re.estimatedCost.amount, 0);
      const costYearT = escalatedOpex + yearReplacements;
      pvCosts += costYearT / Math.pow(1 + r, t);
      
      const generationYearT = generationYear1Kwh * Math.pow(1 - (assumptions.panelAnnualDegradationPercent / 100), t - 1);
      pvGeneration += generationYearT / Math.pow(1 + r, t);
    }
    
    if (pvGeneration === 0) return 0;
    return pvCosts / pvGeneration;
  },

  calculateScenario: (scenario: FinancialScenario, baseModel: ProjectFinancialModel, assumptions: FinancialAssumptionSet): FinancialResults => {
    // Clone and apply overrides
    const modifiedModel = JSON.parse(JSON.stringify(baseModel)) as ProjectFinancialModel;
    const modifiedAssumptions = JSON.parse(JSON.stringify(assumptions)) as FinancialAssumptionSet;
    
    if (scenario.capexOverride) {
      // distribute proportionally or just overwrite total? To keep simple, we can put it all in 'other' and zero the rest, or just let calculateModel handle it if we modify it.
      // Wait, calculateModel sums up the individual parts. Let's just mock the total.
      modifiedModel.capex.engineering.amount = scenario.capexOverride.amount;
      modifiedModel.capex.solarPanels.amount = 0;
      modifiedModel.capex.inverters.amount = 0;
      modifiedModel.capex.battery.amount = 0;
      modifiedModel.capex.generator.amount = 0;
      modifiedModel.capex.mountingStructure.amount = 0;
      modifiedModel.capex.electricalEquipment.amount = 0;
      modifiedModel.capex.cables.amount = 0;
      modifiedModel.capex.protection.amount = 0;
      modifiedModel.capex.monitoring.amount = 0;
      modifiedModel.capex.transportation.amount = 0;
      modifiedModel.capex.installation.amount = 0;
      modifiedModel.capex.commissioning.amount = 0;
      modifiedModel.capex.gridConnection.amount = 0;
      modifiedModel.capex.permits.amount = 0;
      modifiedModel.capex.civilWorks.amount = 0;
      modifiedModel.capex.tax.amount = 0;
      modifiedModel.capex.contingency.amount = 0;
      modifiedModel.capex.other.amount = 0;
    }
    
    if (scenario.opexOverride) {
      modifiedModel.opex.maintenance.amount = scenario.opexOverride.amount;
      modifiedModel.opex.cleaning.amount = 0;
      modifiedModel.opex.insurance.amount = 0;
      modifiedModel.opex.monitoring.amount = 0;
      modifiedModel.opex.landLease.amount = 0;
      modifiedModel.opex.staff.amount = 0;
      modifiedModel.opex.security.amount = 0;
      modifiedModel.opex.administration.amount = 0;
      modifiedModel.opex.other.amount = 0;
    }
    
    if (scenario.generationOverrideKwh) {
      modifiedModel.energyEconomics.annualGenerationKwh = scenario.generationOverrideKwh;
    }
    
    if (scenario.tariffOverride) {
      modifiedModel.energyEconomics.customerTariff.unitPricePerKwh = scenario.tariffOverride;
      modifiedModel.energyEconomics.exportTariff.unitPricePerKwh = scenario.tariffOverride;
    }
    
    if (scenario.discountRateOverridePercent !== undefined) {
      modifiedAssumptions.discountRatePercent = scenario.discountRateOverridePercent;
    }
    
    if (scenario.projectLifetimeOverrideYears !== undefined) {
      modifiedAssumptions.projectLifetimeYears = scenario.projectLifetimeOverrideYears;
    }

    return financeService.calculateModel(modifiedModel, modifiedAssumptions);
  }
};
