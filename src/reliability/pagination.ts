/**
 * Consistent Safe Pagination (PH-4)
 * Clamps maximum page size to prevent unbounded memory allocation.
 * Provides backward-compatible response envelopes and HTTP pagination headers.
 */

import { Response } from 'express';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function parsePaginationParams(
  query: Record<string, any>,
  defaultLimit = 50,
  maxLimit = 100
): { page: number; limit: number; offset: number; isExplicit: boolean } {
  const isExplicit = query.page !== undefined || query.limit !== undefined;

  let page = parseInt(String(query.page || '1'), 10);
  if (isNaN(page) || page < 1) page = 1;

  let limit = parseInt(String(query.limit || defaultLimit), 10);
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit; // Enforce safe ceiling

  const offset = (page - 1) * limit;

  return { page, limit, offset, isExplicit };
}

export function paginateCollection<T>(
  items: T[],
  query: Record<string, any>,
  defaultLimit = 50,
  maxLimit = 100
): PaginatedResult<T> {
  const { page, limit, offset } = parsePaginationParams(query, defaultLimit, maxLimit);
  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const data = items.slice(offset, offset + limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  };
}

/**
 * Handles API list response cleanly:
 * If explicit pagination is requested, returns { data, pagination }.
 * If not requested, returns array with X-Total-Count, X-Page, X-Limit headers to maintain backward compatibility.
 */
export function sendPaginatedResponse<T>(
  res: Response,
  items: T[],
  query: Record<string, any>,
  defaultLimit = 50,
  maxLimit = 100
): Response {
  const { page, limit, offset, isExplicit } = parsePaginationParams(query, defaultLimit, maxLimit);
  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;

  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('X-Page', page.toString());
  res.setHeader('X-Limit', limit.toString());

  if (isExplicit) {
    const data = items.slice(offset, offset + limit);
    return res.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });
  }

  // Safe unbounded cap: if array exceeds maxLimit and no params were specified, slice at maxLimit
  const boundedData = total > maxLimit ? items.slice(0, maxLimit) : items;
  return res.json(boundedData);
}
