import { InvestmentOpportunity, InvestorProfile, ProjectReadinessScore } from '../types/investment';

const WEIGHTS = {
  capitalFit: 30,
  locationFit: 20,
  sizeFit: 15,
  stageFit: 15,
  readinessFit: 10,
  riskFit: 5,
  technologyFit: 5
};

export const projectMatchingService = {
  calculateMatchScore: (
    investor: InvestorProfile, 
    opportunity: InvestmentOpportunity, 
    readinessScore?: ProjectReadinessScore
  ) => {
    let capitalFit = 100;
    if (opportunity.capitalRequirement && opportunity.capitalRequirement.capitalRequired > 0) {
      const required = opportunity.capitalRequirement.capitalRequired;
      if (required < investor.capitalMin || required > investor.capitalMax) {
        capitalFit = 30; // low fit if out of range, but not 0
      } else {
        // Ideal fit is in the middle of the range
        capitalFit = 100;
      }
    }

    let locationFit = 50;
    if (investor.preferredProvinces.length === 0 || investor.preferredProvinces.includes('ALL')) {
      locationFit = 100;
    } else if (investor.preferredProvinces.includes(opportunity.location.province)) {
      locationFit = 100;
    } else {
      locationFit = 0;
    }

    let sizeFit = 100;
    if (opportunity.targetCapacityKw) {
      const cap = opportunity.targetCapacityKw;
      if (investor.preferredProjectSizeMinKw && cap < investor.preferredProjectSizeMinKw) sizeFit = 30;
      if (investor.preferredProjectSizeMaxKw && cap > investor.preferredProjectSizeMaxKw) sizeFit = 30;
    }

    let stageFit = 50;
    if (investor.preferredProjectStages.length === 0 || investor.preferredProjectStages.includes('ALL')) {
      stageFit = 100;
    } else if (investor.preferredProjectStages.includes(opportunity.projectStage)) {
      stageFit = 100;
    } else {
      stageFit = 20;
    }

    let readinessFit = readinessScore ? readinessScore.score : 50;

    let riskFit = 50;
    if (investor.riskPreference === 'CONSERVATIVE' && (!readinessScore || readinessScore.score < 70)) {
      riskFit = 20;
    } else if (investor.riskPreference === 'GROWTH' && (!readinessScore || readinessScore.score < 50)) {
      riskFit = 100; // Growth investors might like low-readiness (high reward potential)
    } else {
      riskFit = 80;
    }

    let technologyFit = 100;
    // Assuming mostly SOLAR, but if we have other types we can check.

    const totalScore = 
      (capitalFit * WEIGHTS.capitalFit +
      locationFit * WEIGHTS.locationFit +
      sizeFit * WEIGHTS.sizeFit +
      stageFit * WEIGHTS.stageFit +
      readinessFit * WEIGHTS.readinessFit +
      riskFit * WEIGHTS.riskFit +
      technologyFit * WEIGHTS.technologyFit) / 100;

    return {
      score: Math.round(totalScore),
      scoreBreakdown: {
        capitalFit,
        locationFit,
        sizeFit,
        stageFit,
        riskFit,
        technologyFit,
        readinessFit
      }
    };
  }
};
