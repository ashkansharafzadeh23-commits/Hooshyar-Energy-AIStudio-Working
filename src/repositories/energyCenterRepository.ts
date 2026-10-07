/**
 * HOOSHYAR ENERGY — ENERGY CENTER IN-MEMORY REPOSITORY
 * Stage 13.10.2-B.1 Strict Security & Scope Correction
 * 
 * Manages candidates, public verified records, and audit logs.
 * 
 * PERSISTENCE ARCHITECTURE POLICY:
 * CURRENT CANDIDATE PERSISTENCE: EPHEMERAL / IN-MEMORY
 * Restarting the server resets candidate queue.
 * CRITICAL RULE: NEVER mutates or writes to db.json (SHA-256 canonical integrity protected).
 * Durable multi-replica persistence will be introduced in a future controlled database phase.
 */

import { 
  EnergyIngestionCandidate, 
  EnergyInformationRecord, 
  EnergyCategory, 
  CandidateReviewStatus 
} from '../types/energyCenter.js';

class EnergyCenterRepository {
  private candidates: Map<string, EnergyIngestionCandidate> = new Map();
  private publicRecords: Map<string, EnergyInformationRecord> = new Map();

  constructor() {
    this.seedInitialPublicRecords();
  }

  /**
   * Seed initial verified records if any, or start with safe empty state.
   */
  private seedInitialPublicRecords(): void {
    // Stage 13.10.1 truthful foundation: No fake production records.
    // Public records are populated only through verified candidate approvals.
  }

  // ==========================================================================
  // CANDIDATE STORE METHODS
  // ==========================================================================

  public getAllCandidates(): EnergyIngestionCandidate[] {
    return Array.from(this.candidates.values()).map(c => ({ ...c }));
  }

  public getCandidateById(id: string): EnergyIngestionCandidate | undefined {
    const candidate = this.candidates.get(id);
    return candidate ? { ...candidate } : undefined;
  }

  public getCandidatesByStatus(status: CandidateReviewStatus): EnergyIngestionCandidate[] {
    return Array.from(this.candidates.values())
      .filter(c => c.reviewStatus === status)
      .map(c => ({ ...c }));
  }

  public getCandidatesBySource(sourceId: string): EnergyIngestionCandidate[] {
    return Array.from(this.candidates.values())
      .filter(c => c.sourceId === sourceId)
      .map(c => ({ ...c }));
  }

  public saveCandidate(candidate: EnergyIngestionCandidate): EnergyIngestionCandidate {
    const cloned = { ...candidate, updatedAt: new Date().toISOString() };
    this.candidates.set(cloned.id, cloned);
    return { ...cloned };
  }

  public deleteCandidate(id: string): boolean {
    return this.candidates.delete(id);
  }

  public clearCandidates(): void {
    this.candidates.clear();
  }

  // ==========================================================================
  // PUBLIC VERIFIED RECORDS STORE METHODS
  // ==========================================================================

  public getAllPublicRecords(): EnergyInformationRecord[] {
    return Array.from(this.publicRecords.values()).map(r => ({ ...r }));
  }

  public getPublicRecordById(id: string): EnergyInformationRecord | undefined {
    const record = this.publicRecords.get(id);
    return record ? { ...record } : undefined;
  }

  public getPublicRecordsByCategory(category: EnergyCategory): EnergyInformationRecord[] {
    return Array.from(this.publicRecords.values())
      .filter(r => r.category === category && r.status === 'PUBLISHED')
      .map(r => ({ ...r }));
  }

  public savePublicRecord(record: EnergyInformationRecord): EnergyInformationRecord {
    const cloned = { ...record };
    this.publicRecords.set(cloned.id, cloned);
    return { ...cloned };
  }

  public deletePublicRecord(id: string): boolean {
    return this.publicRecords.delete(id);
  }

  public clearPublicRecords(): void {
    this.publicRecords.clear();
  }
}

export const energyCenterRepository = new EnergyCenterRepository();
