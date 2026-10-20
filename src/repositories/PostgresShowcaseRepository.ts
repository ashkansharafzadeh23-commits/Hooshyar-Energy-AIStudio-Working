import { eq, asc, desc, and, or, gt, lt } from 'drizzle-orm';
import { getPostgresDB } from '../database/postgres/connection.js';
import { showcaseProjects } from '../database/postgres/schema.js';
import { 
  ShowcaseProjectRecord, 
  isRecordEligibleForPublicShowcase 
} from '../types/showcase.js';
import { IShowcaseRepository } from './interfaces/IShowcaseRepository.js';

export class PostgresShowcaseRepository implements IShowcaseRepository {
  constructor(private dbInstance?: any) {}

  private getDb() {
    if (this.dbInstance) {
      return this.dbInstance;
    }
    const db = getPostgresDB();
    if (!db) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: PostgreSQL database connection is unavailable in production mode.');
      }
      throw new Error('PostgreSQL database connection is unavailable. Ensure DATABASE_URL is set.');
    }
    return db;
  }

  private mapRowToRecord(row: any): ShowcaseProjectRecord | null {
    if (!row || typeof row !== 'object') {
      return null;
    }

    try {
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
    } catch {
      // Corrupted JSON rows fail closed to null and are excluded from eligible output
      return null;
    }
  }

  private compareKeysetProgression(
    next: { displayOrder: number; updatedTime: number; id: string },
    prev: { displayOrder: number; updatedTime: number; id: string }
  ): number {
    if (next.displayOrder !== prev.displayOrder) {
      return next.displayOrder - prev.displayOrder;
    }
    if (next.updatedTime !== prev.updatedTime) {
      return prev.updatedTime - next.updatedTime; // DESC: older timestamp comes after newer
    }
    if (next.id < prev.id) return -1;
    if (next.id > prev.id) return 1;
    return 0;
  }

  async findPublishedProjects(limit: number = 15): Promise<ShowcaseProjectRecord[]> {
    const db = this.getDb();
    const safeLimit = Math.min(Math.max(1, limit), 20);
    const batchSize = Math.max(safeLimit, 20);
    const maxScanBudget = 2000; // Protective scan budget against DoS / runaway queries

    const eligibleProjects: ShowcaseProjectRecord[] = [];
    let evaluatedCount = 0;
    let cursor: { displayOrder: number; updatedAt: Date; id: string } | null = null;

    while (eligibleProjects.length < safeLimit) {
      const queryLimit = evaluatedCount >= maxScanBudget ? 1 : batchSize;

      const whereCondition = cursor === null
        ? eq(showcaseProjects.publicationStatus, 'PUBLISHED')
        : and(
            eq(showcaseProjects.publicationStatus, 'PUBLISHED'),
            or(
              gt(showcaseProjects.displayOrder, cursor.displayOrder),
              and(
                eq(showcaseProjects.displayOrder, cursor.displayOrder),
                lt(showcaseProjects.updatedAt, cursor.updatedAt)
              ),
              and(
                eq(showcaseProjects.displayOrder, cursor.displayOrder),
                eq(showcaseProjects.updatedAt, cursor.updatedAt),
                gt(showcaseProjects.id, cursor.id)
              )
            )
          );

      const rows = await db
        .select()
        .from(showcaseProjects)
        .where(whereCondition)
        .orderBy(
          asc(showcaseProjects.displayOrder),
          desc(showcaseProjects.updatedAt),
          asc(showcaseProjects.id)
        )
        .limit(queryLimit);

      if (!rows || rows.length === 0) {
        // Dataset exhausted before reaching safeLimit; return all gathered eligible projects
        break;
      }

      // If protective scan budget was reached in previous batches and additional candidates
      // exist beyond the budget, fail closed explicitly rather than scanning further or returning
      // a misleading incomplete result set.
      if (evaluatedCount >= maxScanBudget) {
        throw new Error(
          `Showcase candidate scan budget exceeded (${maxScanBudget} records evaluated without reaching requested ${safeLimit} eligible records). Pagination halted to prevent denial of service.`
        );
      }

      for (const row of rows) {
        evaluatedCount++;

        const record = this.mapRowToRecord(row);
        if (record && isRecordEligibleForPublicShowcase(record)) {
          eligibleProjects.push(record);
          if (eligibleProjects.length >= safeLimit) {
            break;
          }
        }
      }

      // Once the requested number of fully eligible records has been collected,
      // return immediately without unnecessarily constructing or validating another pagination cursor.
      if (eligibleProjects.length >= safeLimit) {
        return eligibleProjects;
      }

      // Check for cursor progression using the last candidate row in the returned batch
      const lastRow = rows[rows.length - 1];

      // Validate and extract displayOrder without silent normalization
      let parsedDisplayOrder: number;
      if (typeof lastRow.displayOrder === 'number' && Number.isSafeInteger(lastRow.displayOrder)) {
        parsedDisplayOrder = lastRow.displayOrder;
      } else if (
        typeof lastRow.displayOrder === 'string' &&
        /^-?\d+$/.test(lastRow.displayOrder.trim())
      ) {
        parsedDisplayOrder = parseInt(lastRow.displayOrder.trim(), 10);
      } else {
        throw new Error(`Malformed cursor displayOrder value: ${lastRow.displayOrder}`);
      }

      // Validate and extract updatedAt without silent normalization
      let lastRowUpdatedAt: Date;
      if (lastRow.updatedAt instanceof Date) {
        lastRowUpdatedAt = lastRow.updatedAt;
      } else if (typeof lastRow.updatedAt === 'string' || typeof lastRow.updatedAt === 'number') {
        lastRowUpdatedAt = new Date(lastRow.updatedAt);
      } else {
        throw new Error(`Malformed cursor updatedAt value: ${lastRow.updatedAt}`);
      }

      const updatedTime = lastRowUpdatedAt.getTime();
      if (!Number.isFinite(updatedTime) || Number.isNaN(updatedTime)) {
        throw new Error(`Invalid non-finite cursor timestamp: ${lastRow.updatedAt}`);
      }

      // Validate and extract id without silent normalization
      if (
        !lastRow.id ||
        (typeof lastRow.id !== 'string' && typeof lastRow.id !== 'number') ||
        String(lastRow.id).trim().length === 0
      ) {
        throw new Error(`Malformed cursor id value: ${lastRow.id}`);
      }
      const parsedId = String(lastRow.id).trim();

      const newCursor = {
        displayOrder: parsedDisplayOrder,
        updatedAt: lastRowUpdatedAt,
        id: parsedId
      };

      if (cursor !== null) {
        const comparison = this.compareKeysetProgression(
          { displayOrder: newCursor.displayOrder, updatedTime, id: newCursor.id },
          { displayOrder: cursor.displayOrder, updatedTime: cursor.updatedAt.getTime(), id: cursor.id }
        );

        if (comparison === 0) {
          throw new Error('Non-progressing (stagnant) pagination cursor detected in showcase repository.');
        }
        if (comparison < 0) {
          throw new Error('Backward-moving pagination cursor detected in showcase repository.');
        }
      }

      cursor = newCursor;

      // If fewer rows returned than batchSize, table has no more published candidates
      if (rows.length < batchSize) {
        break;
      }
    }

    return eligibleProjects;
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

