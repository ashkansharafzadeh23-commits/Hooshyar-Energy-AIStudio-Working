import { db } from '../db/index.js';
import { IFinancingRepository } from './interfaces/IFinancingRepository.js';

export class JSONFinancingRepository implements IFinancingRepository {
  getFinancingRequests(projectId?: string) { return db.getFinancingRequests ? db.getFinancingRequests(projectId) : (db.getFinancingRequestsByProjectId ? db.getFinancingRequestsByProjectId(projectId) : []); }
  getProjectById(projectId: string) { return db.getProjectById(projectId); }
  getFinancialModelsByProjectId(projectId: string) { return db.getFinancialModelsByProjectId(projectId); }
  createFinancingRequest(request: any) { return db.createFinancingRequest(request); }
  getProjectContracts(projectId?: string) { return db.getProjectContracts ? db.getProjectContracts(projectId) : []; }
  getProjectDocuments(projectId: string) { return db.getProjectDocuments ? db.getProjectDocuments(projectId) : []; }
  createFinanceReadinessSnapshot(snapshot: any) { return db.createFinanceReadinessSnapshot(snapshot); }
  updateFinancingRequest(id: string, updates: any) { return db.updateFinancingRequest(id, updates); }
  getFinancingRequestById(id: string) { return db.getFinancingRequestById(id); }
  getFinanceReadinessSnapshots(requestId: string) { return db.getFinanceReadinessSnapshots(requestId); }
  getFinancialPartnerProfiles() { return db.getFinancialPartnerProfiles(); }
  getFinancingProducts() { return db.getFinancingProducts(); }
  saveFinancialPartnerMatches(requestId: string, matches: any[]) { return db.saveFinancialPartnerMatches(requestId, matches); }
  getFinancialPartnerProfileById(id: string) { return db.getFinancialPartnerProfileById(id); }
  createFinancingSubmission(submission: any) { return db.createFinancingSubmission(submission); }
  updateProject(projectId: string, updates: any) { return db.updateProject(projectId, updates); }
  getFinancingSubmissions() { return db.getFinancingSubmissions(); }
  getFinanceInformationRequests(submissionId: string) { return db.getFinanceInformationRequests(submissionId); }
  getFinancingOffers(requestId: string) { return db.getFinancingOffers(requestId); }
  getFinancingSubmissionById(id: string) { return db.getFinancingSubmissionById(id); }
  updateFinancingSubmission(id: string, updates: any) { return db.updateFinancingSubmission(id, updates); }
  getFinanceReviewNotes(submissionId: string) { return db.getFinanceReviewNotes(submissionId); }
  createFinanceInformationRequest(req: any) { return db.createFinanceInformationRequest(req); }
  createFinancingOffer(offer: any) { return db.createFinancingOffer(offer); }
  getFinancingOfferById(id: string) { return db.getFinancingOfferById(id); }
  updateFinancingOffer(id: string, updates: any) { return db.updateFinancingOffer(id, updates); }
  createProjectFinancingRecord(record: any) { return db.createProjectFinancingRecord(record); }
  getProjectFinancingRecords(projectId?: string) { return db.getProjectFinancingRecords ? db.getProjectFinancingRecords(projectId) : (db.getProjectFinancingRecordsByProjectId ? db.getProjectFinancingRecordsByProjectId(projectId) : []); }
  getFinancialModelById(id: string) { return db.getFinancialModelById(id); }
  getFinancialAssumptionSetById(id: string) { return db.getFinancialAssumptionSetById(id); }
  getRFQsByProjectId(projectId: string) { return (db as any).getRFQsByProjectId ? (db as any).getRFQsByProjectId(projectId) : []; }
  getBidById(id: string) { return (db as any).getBidById ? (db as any).getBidById(id) : null; }
  getBidsByRfqId(rfqId: string) { return (db as any).getBidsByRfqId ? (db as any).getBidsByRfqId(rfqId) : []; }
  createFinancialAssumptionSet(data: any) { return db.createFinancialAssumptionSet(data); }
  createFinancialModel(data: any) { return db.createFinancialModel(data); }
  updateFinancialModel(id: string, data: any) { return db.updateFinancialModel(id, data); }
  createFinancialScenario(data: any) { return db.createFinancialScenario(data); }
  getFinancialScenariosByModelId(modelId: string) { return db.getFinancialScenariosByModelId(modelId); }
}

export const financingRepository: IFinancingRepository = new JSONFinancingRepository();
