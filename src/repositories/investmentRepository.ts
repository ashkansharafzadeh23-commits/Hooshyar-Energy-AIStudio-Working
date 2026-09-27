import { db } from '../db/index.js';
import { IInvestmentRepository } from './interfaces/IInvestmentRepository.js';

export class JSONInvestmentRepository implements IInvestmentRepository {
  getInvestmentOpportunityByProjectId(projectId: string) { return db.getInvestmentOpportunityByProjectId(projectId); }
  updateInvestmentOpportunity(id: string, updates: any) { return db.updateInvestmentOpportunity(id, updates); }
  createInvestmentOpportunity(opportunity: any) { return db.createInvestmentOpportunity(opportunity); }
  getInvestmentOpportunities() { return db.getInvestmentOpportunities(); }
  getInvestmentOpportunityById(id: string) { return db.getInvestmentOpportunityById(id); }
  getProjectById(projectId: string) { return (db as any).getProjectById ? (db as any).getProjectById(projectId) : null; }
  getInvestorProfileByUserId(userId: string) { return db.getInvestorProfileByUserId(userId); }
  createInvestorProfile(profile: any) { return db.createInvestorProfile(profile); }
  getProjectMatchesForInvestor(investorId: string) { return db.getProjectMatchesForInvestor(investorId); }
  createProjectMatch(match: any) { return db.createProjectMatch(match); }
  updateProjectMatch(id: string, updates: any) { return db.updateProjectMatch(id, updates); }
}

export const investmentRepository: IInvestmentRepository = new JSONInvestmentRepository();
