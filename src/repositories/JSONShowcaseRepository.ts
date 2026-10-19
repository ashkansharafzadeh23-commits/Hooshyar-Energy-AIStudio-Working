import { db } from '../db/index.js';
import {
  ShowcaseProjectRecord,
  isRecordEligibleForPublicShowcase
} from '../types/showcase.js';
import { IShowcaseRepository } from './interfaces/IShowcaseRepository.js';

export class JSONShowcaseRepository implements IShowcaseRepository {
  async findPublishedProjects(limit: number = 15): Promise<ShowcaseProjectRecord[]> {
    const allRecords = db.getShowcaseProjects();

    // Strict fail-closed publication eligibility filter
    const eligibleRecords = allRecords.filter(isRecordEligibleForPublicShowcase);

    // Consistent ordering: displayOrder ASC, then updatedAt DESC
    const sorted = eligibleRecords.sort((a, b) => {
      const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 999;
      const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    const safeLimit = Math.min(Math.max(1, limit), 20);
    return sorted.slice(0, safeLimit);
  }

  async findById(id: string): Promise<ShowcaseProjectRecord | null> {
    if (!id || typeof id !== 'string') return null;
    const record = db.getShowcaseProjectById(id);
    return record || null;
  }
}
