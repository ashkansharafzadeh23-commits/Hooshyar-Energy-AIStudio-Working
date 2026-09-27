# POSTGRESQL ARCHITECTURE - HOOSHYAR ENERGY

## Overview
This document outlines the Phase 2 (PH-2) architectural patterns implemented to transition Hooshyar Energy from its initial prototyping JSON synchronous file database (`db.json`) to a scalable, concurrent, transactional PostgreSQL database environment. 

## Target Architecture
The application now adheres strictly to the following layer boundaries:

`API Controllers/Express Routes` -> `Domain Services` -> `Repository Interfaces` -> `Database Adapter (Postgres | JSON)`

**Rule:** Under no circumstances should any domain service or API controller directly interact with PostgreSQL drivers or `fs` file operations. 

## Schema and ORM
* **ORM Strategy:** Drizzle ORM is utilized for PostgreSQL mapping and migrations due to its minimal footprint, strong TypeScript integration, and strict transactional capabilities.
* **Schema Definition:** `src/database/postgres/schema.ts`.
* **JSON Flexibility vs Relational Rigor:** Heavily structured core entities (Users, Organizations, Projects, Assets, Contracts, Financials) are modeled strictly with primary keys (UUIDs), explicit foreign keys, and typed columns (e.g., `double precision` for IRR). Unpredictable metadata or legacy structures have been safely mapped to `jsonb` columns.
* **Strict Missing Value Preservation:** Nullable attributes (like financing amounts, capacity, owner equity) are mapped to `NULL` explicitly. 0 is never used to represent "unknown".

## Repository Abstraction
To bridge the legacy JSON logic and the new PG logic, repository interfaces (`src/repositories/interfaces/*`) enforce standard data access contracts.

The application uses an incremental repository implementation:
1. `IProjectRepository`, `IFinancingRepository`, `IInvestmentRepository` represent the contract.
2. `JSONProjectRepository` acts as the `LEGACY` adapter for development and testing.

## Environment Variables & Strictness
* **`DATABASE_URL`**: Must be explicitly set to connect to PostgreSQL.
* **Fail-Fast in Production**: If `NODE_ENV=production` and `DATABASE_URL` is omitted, `getPostgresDB()` will aggressively throw a fatal startup error rather than silently defaulting to `db.json`.

## Migration Strategy
A safe migration runner has been provided in `scripts/migrate_json_to_postgres.ts`.

1. **Topological Ordering:** The runner inserts dependencies iteratively (Users -> Organizations -> Portfolios -> Projects -> Assets -> Financials).
2. **Idempotent Insertion Safety:** Supports `--dry-run` to output comprehensive verification metrics (detecting counts, orphans) without inserting a single row.
3. **Foreign-Key Preservation:** Primary UUIDs are imported identically ensuring relation bridges remain completely untouched. 

## Transaction Boundaries
Drizzle's `.transaction()` wrapper guarantees atomicity. The migration script uses a monolithic block transaction for the full data port. Subsequent `PostgresRepository` files MUST utilize `.transaction()` for the workflows identified in PH-1 (e.g., Awarding EPC bids, Commissioning Assets).

## Testing & Isolation Strategy
The test suite (e.g., `test_ph2_database.ts`) is designed to enforce:
1. **Never Touch Production Data**: The source `db.json` is checked via exact string matching before and after tests to prevent unintentional overrides.
2. **No PG Connections in Fast Tests**: Legacy test scripts (like `test_phase8.ts`) continue utilizing the isolated JSON engine, validating the fundamental logic in milliseconds without network overhead. 

---
*Generated during PH-2 Hardening*
