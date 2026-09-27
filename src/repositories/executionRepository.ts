import { db } from '../db/index.js';
import { IExecutionRepository } from './interfaces/IExecutionRepository.js';

export class JSONExecutionRepository implements IExecutionRepository {
  getContractById(id: string) { return db.getContractById(id); }
  getMilestoneById(id: string) { return db.getMilestoneById(id); }
  getProjectBaselineById(id: string) { return db.getProjectBaselineById(id); }
  getChangeRequestById(id: string) { return db.getChangeRequestById(id); }
  getApprovalRequestById(id: string) { return db.getApprovalRequestById(id); }
  getProjectContracts(projectId?: string) { return db.getProjectContracts(projectId); }
  getEnergyProjects() { return db.getEnergyProjects(); }
  createContract(contract: any) { return db.createContract(contract); }
  getOrganizationById(orgId: string) { return db.getOrganizationById?.(orgId); }
  createContractParty(party: any) { return db.createContractParty(party); }
  createMilestone(milestone: any) { return db.createMilestone(milestone); }
  createProjectBaseline(baseline: any) { return db.createProjectBaseline(baseline); }
  updateContract(id: string, updates: any) { return db.updateContract(id, updates); }
  getContractParties(contractId: string) { return db.getContractParties(contractId); }
  updateContractParty(id: string, updates: any) { return db.updateContractParty(id, updates); }
  getContractRevisions(contractId?: string) { return db.getContractRevisions(contractId); }
  getChangeRequestsByProjectId(projectId?: string) { return db.getChangeRequestsByProjectId(projectId); }
  createChangeRequest(cr: any) { return db.createChangeRequest(cr); }
  updateChangeRequest(id: string, updates: any) { return db.updateChangeRequest(id, updates); }
  createContractRevision(rev: any) { return db.createContractRevision(rev); }
  getProjectBaseline(projectId: string) { return db.getProjectBaseline(projectId); }
  updateProjectBaseline(id: string, updates: any) { return db.updateProjectBaseline(id, updates); }
  getProjectBaselines(projectId: string) { return db.getProjectBaselines(projectId); }
  getProjectMilestones(projectId: string) { return db.getProjectMilestones(projectId); }
  updateMilestone(id: string, updates: any) { return db.updateMilestone(id, updates); }
  deleteMilestone(id: string) { return db.deleteMilestone(id); }
  getApprovalRequests(projectId: string) { return db.getApprovalRequests(projectId); }
  createApprovalRequest(req: any) { return db.createApprovalRequest(req); }
  updateApprovalRequest(id: string, updates: any) { return db.updateApprovalRequest(id, updates); }
}

export const executionRepository: IExecutionRepository = new JSONExecutionRepository();
