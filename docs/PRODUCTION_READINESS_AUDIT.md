# PRODUCTION READINESS AUDIT - HOOSHYAR ENERGY

## Executive Summary
This document provides a comprehensive production readiness audit of the Hooshyar Energy platform (Phases 0-9). The current architecture is a functional monolith built on a single synchronous JSON file persistence (`db.json`) and Express/Node.js APIs. While feature-complete for MVP phases, the architecture requires significant refactoring to transition from a prototype to a scalable, secure, and transactional production system.

The primary blockers for production readiness revolve around JSON-based storage (leading to concurrency/data corruption risks in serverless environments), widespread direct database access, lack of proper database transactions, implicit IDOR risks relying on manual endpoint-by-endpoint validation, and the use of weak cryptographic practices for authentication. 

This document outlines the findings and presents the migration strategy for Phase 2 (PH-2) and beyond.

---

## Critical Findings
1. **Synchronous File Persistence (`db.json`) in Serverless:** The database uses `fs.readFileSync` and `fs.writeFileSync` in `src/db/index.ts`. In serverless/containerized environments (like Vercel or Cloud Run), the local file system is ephemeral. Data will be lost upon container restart. Furthermore, synchronous file I/O blocks the Node.js event loop, preventing scalability.
2. **Missing Transaction Boundaries:** Operations involving multiple collections (e.g., creating a project match, awarding a bid, processing a payment) are executed sequentially without atomicity. If a failure occurs midway, the database is left in a corrupted state.
3. **Data Corruption & Concurrency Risk:** `writeDB(data)` rewrites the entire JSON file. Under concurrent requests, race conditions will cause one request's data to silently overwrite another's.
4. **Widespread IDOR Vulnerability via Missing Global Middleware:** Many endpoints (e.g., in `financing.ts`, `procurement.ts`) rely on developers manually calling `checkProjectAccess()` inside the route handler rather than utilizing a centralized, enforced middleware (like `requireProjectAccess()`). 
5. **Mass Assignment Vulnerabilities:** Endpoints like `POST /api/investment/opportunities` take `req.body` and directly push it to the database (`db.createInvestmentOpportunity({...req.body})`) without sanitization or strict field picking, allowing attackers to inject restricted fields (e.g., `status`, `readinessScore`, or malicious `projectId`s).

## High-Risk Findings
1. **Weak OTP Generation:** The authentication system in `src/api/auth.ts` generates OTPs using `Math.random()`, which is not cryptographically secure and can be predicted.
2. **Insecure JWT Configuration:** `JWT_SECRET` defaults to `"fallback_secret_for_dev"` in production if the environment variable is missing. Tokens lack audience/issuer validation, and they have a long expiry (30 days) with no revocation mechanism.
3. **Direct Database Bypasses:** Significant business logic directly calls `db.` (e.g., `db.getFinancingRequests`, `db.updateProject`) across `financing.ts`, `procurement.ts`, and `investment.ts`, completely bypassing repository abstractions. This couples business logic tightly to the JSON implementation, making the migration to PostgreSQL extremely difficult.
4. **Lack of Rate Limiting:** Critical endpoints like `/api/auth/send-otp`, `/api/auth/verify-otp`, file uploads, and heavy analytical routes (e.g., `getLifecycleIntelligence`) have no rate limiting, exposing the system to SMS toll fraud and Denial of Service (DoS) attacks.

## Medium-Risk Findings
1. **Error Handling & Stack Traces:** Error handling is inconsistent. Some endpoints return raw 500 status codes with generic messages, while others fail silently or throw unhandled promise rejections. A standardized error response structure (`code`, `message`, `requestId`) is missing.
2. **Missing API Input Validation Schema:** The system relies on manual `if (!field)` checks instead of a robust validation schema (e.g., Zod, Joi). This leads to inconsistent type boundaries and numeric validations.
3. **Logging & Observability:** The system uses `console.log` for logging (e.g., `console.log('[SMS] Sending OTP...')`). There are no structured JSON logs, request IDs, or distinct log levels required for production observability.

## Low-Risk Findings
1. **File Upload Security:** The app has provisions for file uploads (contracts, documents, asset photos), but lacks strict MIME-type enforcement, virus scanning, and securely scoped signed URLs. 
2. **Package dependencies:** Some unused or purely developmental dependencies might exist in `package.json` that require auditing prior to production build shrinking.

---

## Database Inventory
All data is currently stored in a single JSON document (`db.json`) parsed via `src/db/index.ts`. 

| Entity Name | Storage Location | Primary Identifier | Important FK Relationships | Migration Risk |
| --- | --- | --- | --- | --- |
| `User` | `users` array | `id` (UUID) | None | Low |
| `OTP` | `otps` array | `phone` | Links to User implicitly | Low |
| `Organization` | `organizations` array | `id` (UUID) | None | Low |
| `EnergyProject` | `energyProjects` array | `id` (UUID) | `ownerId`, `organizationId` | High |
| `ProjectMember` | `projectMembers` array | `id` (UUID) | `projectId`, `userId` | Medium |
| `ProjectContract` | `projectContracts` array | `id` (UUID) | `projectId` | Medium |
| `Asset` | `solarAssets` array | `id` (UUID) | `projectId`, `ownerId` | High |
| `Portfolio` | `portfolios` array | `id` (UUID) | `organizationId`, `projectIds[]` | Medium |
| `InvestmentOpportunity` | `investmentOpportunities` array | `id` (UUID) | `projectId`, `createdByUserId` | Medium |
| `FinancingRequest` | `financingRequests` array | `id` (UUID) | `projectId` | High |
| `ProcurementPackage` | `procurementPackages` array | `id` (UUID) | `projectId` | High |
| `MaintenanceCase` | `maintenanceCases` array | `id` (UUID) | `assetId` | Medium |
| `TelemetrySource` | `telemetrySources` array | `id` (UUID) | `assetId` | High |

---

## Security Matrix (Authorization & IDOR Audit)
*Note: This is a representative sample of high-risk endpoints.*

| Method | Route | Auth | Resource Ownership | Risk | Required Fix |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/investment/opportunities` | Yes | No | **CRITICAL** | Validate user owns the `projectId` injected via `req.body`. Add schema validation to block mass assignment. |
| `GET` | `/api/projects/:projectId/financing-requests` | Yes | Manual (`checkProjectAccess`) | HIGH | Move `checkProjectAccess` into a global `requireProjectAccess()` middleware to prevent missed implementations. |
| `PATCH` | `/api/procurement/quotes/:id` | Yes | Manual (`checkProjectAccess`) | HIGH | Standardize resource ownership checks into a strict policy layer. |
| `POST` | `/api/auth/send-otp` | No | N/A | HIGH | Implement strict rate-limiting and captcha/abuse prevention. |

---

## Mock / Fallback Inventory

| Feature | Location | Type | Description |
| --- | --- | --- | --- |
| Zarinpal Payment | `src/api/subscription.ts` | PRODUCTION MOCK | Payments are mocked and automatically verified. |
| SMS Provider | `src/api/auth.ts` | PRODUCTION MOCK | OTPs are printed to `console.log` rather than sent via SMS provider. |
| Commissioning Tests | `src/services/assetService.ts` | TEST FIXTURE | Generates standard boilerplate test ranges (e.g., `> 1.0 MΩ at 1000V DC`). |
| Gemini AI (Fallback) | `src/services/aiExecutiveAssistantService.ts` | SAFE FALLBACK | Falls back to deterministic template generation (`VERIFIED_FACTS_ENGINE`) if API key is missing. |
| Documents Readiness | `src/services/projectReadinessService.ts` | BUSINESS MOCK | Arbitrarily assigns `70%` completion score if project is not `DRAFT`. |
| Financing Workflow | `src/pages/projects/Workspace/FinancingTab.tsx`| DEMO MOCK | Explicit "Demo Workflow" component is active in UI for partners. |

---

## Secrets Audit

| Secret Type | File/Location | Risk | Recommended Environment Variable |
| --- | --- | --- | --- |
| `JWT_SECRET` | `src/api/auth.ts` | High | Uses `fallback_secret_for_dev`. Must enforce strict `.env` failure. |
| `GEMINI_API_KEY` | `src/services/aiExecutiveAssistantService.ts` | Medium | Safe fallback exists, but should be strictly verified on boot. |

---

## External Integration Audit
1. **SMS Integration:** Currently mocked. Needs Kavenegar/Ghasedak HTTP integration with timeouts, retries, and strict rate-limiting.
2. **Payment Gateway (Zarinpal):** Currently mocked. Needs robust webhook handling, signature verification, and atomic transaction settlement.
3. **Gemini AI:** Safely wrapped with a fallback. Needs rate-limiting logic to prevent token exhaustion or budget overruns on large portfolios.
4. **NASA POWER / Solar Data:** Cached in `cityIrradianceCache`, but if integrated via direct API in the future, it requires a robust exponential backoff and retry policy.

---

## Dependency Audit
* `fs`: Core module heavily used for persistence. Must be entirely phased out for business data.
* `uuid`: Used for ID generation. Consider `crypto.randomUUID()` in newer Node versions or relying on PostgreSQL standard UUID generation.
* `express`, `jsonwebtoken`: Standard and expected.

---

## Transaction Requirements
The following workflows MUST be refactored to use atomic SQL transactions (`BEGIN ... COMMIT`) during PH-2:
1. **Awarding an EPC Bid:** Creating the contract, updating project status to `CONTRACTED`, and notifying the vendor must succeed or fail together.
2. **Financing Offer Selection:** Accepting an offer, declining competing offers, creating the final agreement, and updating project readiness.
3. **Project & Asset Lifecycle State Transitions:** Moving a project from `CONSTRUCTION` to `OPERATIONAL` while simultaneously creating the `Asset` and `CommissioningRecords`.
4. **User Registration:** Creating the `User` and initiating their default `SubscriptionPlan`.

---

## Target Production Architecture (PostgreSQL)
**Data Layer:** PostgreSQL (v14+)
**ORM / Query Builder:** Prisma or Drizzle ORM to provide strict type safety matching the existing TS interfaces.
**Repository Pattern:** Abstract all direct `db.` calls into dedicated Repositories (e.g., `ProjectRepository`, `FinancingRepository`). The rest of the services should remain untouched, only swapping their data access layer from `db.json` to the Repository interfaces.

---

## PH-2 Migration Plan
1. **Schema Design:** Translate existing TS interfaces into a Prisma schema (`schema.prisma`) or Drizzle schema.
2. **Repository Abstraction:** Replace all `db.*` imports in `src/api/*` and `src/services/*` with repository calls.
3. **Migration Script:** Create a robust migration script that reads the legacy `db.json` and inserts records sequentially into PostgreSQL, preserving foreign key relationships.
4. **Validation:** Implement checksum validations (row counts, sum of capacities, financial IRR sums) before and after migration to guarantee 0% data loss.

## PH-3 Security Plan
1. Centralize authorization into global Express middlewares.
2. Implement strict rate-limiting (e.g., `express-rate-limit`).
3. Integrate Zod validation for all incoming `req.body` payloads.
4. Upgrade authentication to use `crypto.randomInt()` for OTPs and strictly enforced JWT properties.

## PH-4 Reliability Plan
1. Establish structured JSON logging (e.g., Pino) and request tracing.
2. Standardize error handling middleware.
3. Implement automated backup policies and point-in-time recovery for PostgreSQL.

## PH-5 Final Verification Plan
1. Re-run all E2E and unit test scripts against the PostgreSQL database.
2. Perform penetration testing on mass assignment and IDOR vulnerabilities.
3. Execute load testing against the new database connection pool.
