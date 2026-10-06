import { db } from '../db/index.js';
import { IProfessionalRepository } from './interfaces/IProfessionalRepository.js';

export class JSONProfessionalRepository implements IProfessionalRepository {
  createProfessional(professional: any) { return db.createProfessional(professional); }
  getProfessionalById(id: string) { return db.getProfessionalById ? db.getProfessionalById(id) : (db.getProfessionals() || []).find((p: any) => p.id === id); }
  getProfessionalByUserId(userId: string) {
    if (!userId) return undefined;
    if (typeof (db as any).getProfessionalByUserId === 'function') {
      return (db as any).getProfessionalByUserId(userId);
    }
    return (db.getProfessionals() || []).find((p: any) => p.userId === userId);
  }
  getProfessionals() { return db.getProfessionals(); }
  updateProfessional(id: string, updates: any) { return (db as any).updateProfessional(id, updates); }
  updateProfessionalStatus(id: string, status: string) { return (db as any).updateProfessionalStatus(id, status); }
}

export const professionalRepository: IProfessionalRepository = new JSONProfessionalRepository();
