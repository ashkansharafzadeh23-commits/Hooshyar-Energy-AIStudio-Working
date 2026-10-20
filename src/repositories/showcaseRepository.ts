import { JSONShowcaseRepository } from './JSONShowcaseRepository.js';
import { PostgresShowcaseRepository } from './PostgresShowcaseRepository.js';
import { IShowcaseRepository } from './interfaces/IShowcaseRepository.js';

/**
 * Resolves the appropriate repository implementation based on environment configuration.
 * In production or when DB_DRIVER=postgres, PostgresShowcaseRepository is strictly required.
 * Silent fallback to JSON storage in production is prohibited.
 */
export function getShowcaseRepository(): IShowcaseRepository {
  const isProduction = process.env.NODE_ENV === 'production';
  const driver = (process.env.DB_DRIVER || '').toLowerCase();

  if (isProduction || driver === 'postgres') {
    return new PostgresShowcaseRepository();
  }

  return new JSONShowcaseRepository();
}

/**
 * Dynamic showcaseRepository proxy.
 * Routes calls to the active storage engine (PostgreSQL in production, JSON in local development).
 */
export const showcaseRepository: IShowcaseRepository = {
  findPublishedProjects: (limit?: number) => getShowcaseRepository().findPublishedProjects(limit),
  findById: (id: string) => getShowcaseRepository().findById(id)
};
