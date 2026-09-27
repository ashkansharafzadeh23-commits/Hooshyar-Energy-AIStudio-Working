import { EnergyProject, ProjectMember, ProjectDocument, ProjectActivity } from '../../types/project.js';

export interface IProjectRepository {
  findAll(): EnergyProject[];
  findById(id: string): EnergyProject | undefined;
  create(project: Omit<EnergyProject, "id" | "createdAt" | "updatedAt">): EnergyProject;
  update(id: string, updates: Partial<EnergyProject>): EnergyProject | null;
  
  getMembers(projectId: string): ProjectMember[];
  addMember(member: Omit<ProjectMember, "id" | "createdAt">): ProjectMember;
  
  getDocuments(projectId: string): ProjectDocument[];
  addDocument(doc: Omit<ProjectDocument, "id" | "createdAt">): ProjectDocument;
  
  getActivities(projectId: string): ProjectActivity[];
  addActivity(activity: Omit<ProjectActivity, "id" | "createdAt">): ProjectActivity;
  
  // Keep analysis history methods for now
  getAnalysisHistoryById(id: string): any;
  updateAnalysisHistoryProjectId(id: string, projectId: string): any;
}
