export interface IInvestmentRepository {
  getInvestmentOpportunityByProjectId(projectId: string): any;
  updateInvestmentOpportunity(id: string, updates: any): any;
  createInvestmentOpportunity(opportunity: any): any;
  getInvestmentOpportunities(): any[];
  getInvestmentOpportunityById(id: string): any;
  getProjectById(projectId: string): any;
  getInvestorProfileByUserId(userId: string): any;
  createInvestorProfile(profile: any): any;
  getProjectMatchesForInvestor(investorId: string): any[];
  createProjectMatch(match: any): any;
  updateProjectMatch(id: string, updates: any): any;
}
