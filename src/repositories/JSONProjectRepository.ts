import { db } from '../db/index.js';
import { EnergyProject, ProjectMember, ProjectDocument, ProjectActivity } from '../types/project.js';
import { IProjectRepository } from './interfaces/IProjectRepository.js';

export class JSONProjectRepository implements IProjectRepository {
  findAll(): EnergyProject[] {
    return db.getEnergyProjects();
  }
  
  findById(id: string): EnergyProject | undefined {
    return db.getEnergyProjectById(id);
  }
  
  create(project: Omit<EnergyProject, "id" | "createdAt" | "updatedAt">): EnergyProject {
    return db.createEnergyProject(project);
  }
  
  update(id: string, updates: Partial<EnergyProject>): EnergyProject | null {
    return db.updateEnergyProject(id, updates);
  }
  
  getMembers(projectId: string): ProjectMember[] {
    return db.getProjectMembers(projectId);
  }
  
  addMember(member: Omit<ProjectMember, "id" | "createdAt">): ProjectMember {
    return db.createProjectMember(member);
  }
  
  getDocuments(projectId: string): ProjectDocument[] {
    return db.getProjectDocuments(projectId);
  }
  
  addDocument(doc: Omit<ProjectDocument, "id" | "createdAt">): ProjectDocument {
    return db.createProjectDocument(doc);
  }
  
  getActivities(projectId: string): ProjectActivity[] {
    return db.getProjectActivities(projectId);
  }
  
  addActivity(activity: Omit<ProjectActivity, "id" | "createdAt">): ProjectActivity {
    return db.createProjectActivity(activity);
  }
  
  getAnalysisHistoryById(id: string): any {
    return db.getAnalysisHistoryById(id);
  }
  
  updateAnalysisHistoryProjectId(id: string, projectId: string): any {
    return db.updateAnalysisHistoryProjectId(id, projectId);
  }
}
