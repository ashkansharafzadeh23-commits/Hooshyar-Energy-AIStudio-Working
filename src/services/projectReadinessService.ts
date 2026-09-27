import { EnergyProject } from '../types/project';
import { InvestmentOpportunity, ProjectReadinessScore } from '../types/investment';

const WEIGHTS = {
  land: 15,
  technical: 20,
  grid: 15,
  permit: 15,
  financial: 15,
  epc: 10,
  documents: 10
};

export const projectReadinessService = {
  calculateReadiness: (project: EnergyProject | null, opportunity: InvestmentOpportunity): ProjectReadinessScore => {
    let land = 0, technical = 0, grid = 0, permit = 0, financial = 0, epc = 0, documents = 0;
    const missingItems: string[] = [];

    // Land
    if (opportunity.landStatus === 'VERIFIED' || opportunity.landStatus === 'OWNED') {
      land = 100;
    } else if (opportunity.landStatus !== 'UNKNOWN') {
      land = 50;
      missingItems.push('وضعیت مالکیت زمین نیاز به تایید نهایی دارد.');
    } else {
      missingItems.push('وضعیت زمین مشخص نیست.');
    }

    // Technical
    if (opportunity.engineeringStatus === 'COMPLETE') {
      technical = 100;
    } else if (opportunity.engineeringStatus === 'IN_PROGRESS') {
      technical = 50;
      missingItems.push('طراحی مهندسی در حال انجام است.');
    } else {
      missingItems.push('طراحی مهندسی انجام نشده است.');
    }

    // Grid
    if (opportunity.gridConnectionStatus === 'APPROVED') {
      grid = 100;
    } else if (opportunity.gridConnectionStatus === 'REQUESTED') {
      grid = 50;
      missingItems.push('مجوز اتصال به شبکه در دست بررسی است.');
    } else {
      missingItems.push('وضعیت اتصال به شبکه نامشخص است.');
    }

    // Permit
    if (opportunity.permitStatus === 'APPROVED') {
      permit = 100;
    } else if (opportunity.permitStatus === 'IN_PROGRESS') {
      permit = 50;
      missingItems.push('مجوزهای احداث در حال پیگیری است.');
    } else {
      missingItems.push('مجوز احداث دریافت نشده است.');
    }

    // Financial
    if (opportunity.financialModelStatus === 'COMPLETE') {
      financial = 100;
    } else {
      missingItems.push('مدل مالی تکمیل نشده است.');
    }

    // EPC
    if (opportunity.epcStatus === 'SELECTED' || opportunity.epcStatus === 'CONTRACTED') {
      epc = 100;
    } else if (opportunity.epcStatus === 'TENDERING') {
      epc = 50;
      missingItems.push('در حال انتخاب پیمانکار EPC.');
    } else {
      missingItems.push('پیمانکار EPC انتخاب نشده است.');
    }

    // Documents (Simple mock logic)
    if (project && project.status !== 'DRAFT') {
      documents = 70; // assume some docs exist if it's past draft
    } else {
      missingItems.push('مدارک پروژه ناقص است.');
    }

    const totalScore = 
      (land * WEIGHTS.land +
      technical * WEIGHTS.technical +
      grid * WEIGHTS.grid +
      permit * WEIGHTS.permit +
      financial * WEIGHTS.financial +
      epc * WEIGHTS.epc +
      documents * WEIGHTS.documents) / 100;

    let level: 'EARLY_STAGE' | 'DEVELOPING' | 'INVESTMENT_PREPARATION' | 'INVESTMENT_READY' = 'EARLY_STAGE';
    if (totalScore >= 85) level = 'INVESTMENT_READY';
    else if (totalScore >= 60) level = 'INVESTMENT_PREPARATION';
    else if (totalScore >= 30) level = 'DEVELOPING';

    return {
      id: '', // Will be generated on save
      projectId: project?.id || '',
      score: Math.round(totalScore),
      overallScore: Math.round(totalScore),
      breakdown: { land, technical, grid, permit, financial, epc, documents },
      scoreBreakdown: { land, technical, grid, permit, financial, epc, documents },
      level,
      missingItems,
      calculatedAt: new Date().toISOString(),
      scoringVersion: '1.0.0'
    };
  }
};
