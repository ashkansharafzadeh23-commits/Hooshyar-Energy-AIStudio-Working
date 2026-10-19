import { ShowcaseProjectRecord } from '../../types/showcase.js';

export interface IShowcaseRepository {
  /**
   * Returns all publication-eligible showcase records ordered by displayOrder ASC, then updatedAt DESC.
   */
  findPublishedProjects(limit?: number): Promise<ShowcaseProjectRecord[]>;

  /**
   * Find a specific showcase record by ID.
   */
  findById(id: string): Promise<ShowcaseProjectRecord | null>;
}
