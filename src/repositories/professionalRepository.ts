import { db } from '../db/index.js';
import { IProfessionalRepository } from './interfaces/IProfessionalRepository.js';

export class JSONProfessionalRepository implements IProfessionalRepository {
  createProfessional(professional: any) { return db.createProfessional(professional); }
  getProfessionalById(id: string) { return db.getProfessionalById ? db.getProfessionalById(id) : (db.getProfessionals() || []).find((p: any) => p.id === id); }
  getProfessionals() { return db.getProfessionals(); }
  updateProfessionalStatus(id: string, status: string) { return (db as any).updateProfessionalStatus(id, status); }
}

export const professionalRepository: IProfessionalRepository = new JSONProfessionalRepository();
