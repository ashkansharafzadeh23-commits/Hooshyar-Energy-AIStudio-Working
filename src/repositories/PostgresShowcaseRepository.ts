import { eq, asc, desc } from 'drizzle-orm';
import { getPostgresDB } from '../database/postgres/connection.js';
import { showcaseProjects } from '../database/postgres/schema.js';
import {
  ShowcaseProjectRecord,
  isRecordEligibleForPublicShowcase
} from '../types/showcase.js';
import { IShowcaseRepository } from './interfaces/IShowcaseRepository.js';

export class PostgresShowcaseRepository implements IShowcaseRepository {
  private getDb() {
    const db = getPostgresDB();
    if (!db) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: PostgreSQL database connection is unavailable in production mode.');
      }
      throw new Error('PostgreSQL database connection is unavailable. Ensure DATABASE_URL is set.');
    }
    return db;
  }

  private mapRowToRecord(row: any): ShowcaseProjectRecord {
    const location = typeof row.location === 'string' ? JSON.parse(row.location) : row.location;
    const ownerConsent = typeof row.ownerConsent === 'string' ? JSON.parse(row.ownerConsent) : row.ownerConsent;
    const technicalEvidence = typeof row.technicalEvidence === 'string' ? JSON.parse(row.technicalEvidence) : row.technicalEvidence;

    let measuredProduction = null;
    if (row.measuredProduction) {
      measuredProduction = typeof row.measuredProduction === 'string'
        ? JSON.parse(row.measuredProduction)
        : row.measuredProduction;
    }

    let timeSeriesData = null;
    if (row.timeSeriesData) {
      timeSeriesData = typeof row.timeSeriesData === 'string'
        ? JSON.parse(row.timeSeriesData)
        : row.timeSeriesData;
    }

    const installedCapacityKw = typeof row.installedCapacityKw === 'string'
      ? parseFloat(row.installedCapacityKw)
      : Number(row.installedCapacityKw);

    const displayOrder = typeof row.displayOrder === 'number'
      ? row.displayOrder
      : parseInt(String(row.displayOrder || '0'), 10);

    const version = typeof row.version === 'number'
      ? row.version
      : parseInt(String(row.version || '1'), 10);

    return {
      id: String(row.id),
      internalProjectRefId: row.internalProjectRefId || null,
      internalAssetRefId: row.internalAssetRefId || null,
      publicTitle: String(row.publicTitle || ''),
      location,
      installedCapacityKw,
      operationalStatus: row.operationalStatus,
      statusLabel: row.statusLabel ? String(row.statusLabel) : undefined,
      commissioningDate: row.commissioningDate ? String(row.commissioningDate) : undefined,
      measuredProduction,
      timeSeriesData,
      publicImageUrl: row.publicImageUrl || null,
      connectionDescription: row.connectionDescription || null,
      ownerConsent,
      technicalEvidence,
      publicationStatus: row.publicationStatus,
      displayOrder,
      rejectionReason: row.rejectionReason || null,
      unpublishReason: row.unpublishReason || null,
      version,
      createdByUserId: String(row.createdByUserId || ''),
      reviewedByUserId: row.reviewedByUserId ? String(row.reviewedByUserId) : null,
      reviewedAt: row.reviewedAt ? (row.reviewedAt instanceof Date ? row.reviewedAt.toISOString() : String(row.reviewedAt)) : null,
      publishedByUserId: row.publishedByUserId ? String(row.publishedByUserId) : null,
      publishedAt: row.publishedAt ? (row.publishedAt instanceof Date ? row.publishedAt.toISOString() : String(row.publishedAt)) : null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || new Date().toISOString()),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || new Date().toISOString())
    };
  }

  async findPublishedProjects(limit: number = 15): Promise<ShowcaseProjectRecord[]> {
    const db = this.getDb();
    const safeLimit = Math.min(Math.max(1, limit), 20);

    const rows = await db
      .select()
      .from(showcaseProjects)
      .where(eq(showcaseProjects.publicationStatus, 'PUBLISHED'))
      .orderBy(asc(showcaseProjects.displayOrder), desc(showcaseProjects.updatedAt))
      .limit(safeLimit);

    // Map rows to ShowcaseProjectRecord and enforce fail-closed eligibility
    const mapped = rows.map((r: any) => this.mapRowToRecord(r));
    return mapped.filter(isRecordEligibleForPublicShowcase);
  }

  async findById(id: string): Promise<ShowcaseProjectRecord | null> {
    if (!id || typeof id !== 'string') return null;
    const db = this.getDb();

    const rows = await db
      .select()
      .from(showcaseProjects)
      .where(eq(showcaseProjects.id, id))
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    return this.mapRowToRecord(rows[0]);
  }
}
