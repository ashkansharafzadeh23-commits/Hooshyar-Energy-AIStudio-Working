# SECURITY ARCHITECTURE — HOOSHYAR ENERGY (PH-3)

## 1. Executive Security Overview
This document defines the security architecture and hardening standards implemented for Hooshyar Energy during Production Hardening Phase 3 (PH-3). All authentication, authorization, cryptographic operations, request validations, and API boundaries are hardened for production deployment while preserving established business functionality.

---

## 2. Authentication Architecture

### 2.1 JSON Web Tokens (JWT)
* **Fail-Fast Policy**: In production (`NODE_ENV=production`), `JWT_SECRET` must be set via environment variable. If missing, the server process fails immediately on startup (`FATAL: JWT_SECRET environment variable is strictly required in production mode`).
* **Dev/Test Isolation**: Insecure dev fallback secrets are strictly disallowed in production and isolated to local development environments only.
* **Claims Enforcement**: Every token generated specifies:
  - `issuer`: Configurable via `JWT_ISSUER` (default: `hooshyar-energy`).
  - `audience`: Configurable via `JWT_AUDIENCE` (default: `hooshyar-api`).
  - `expiresIn`: Configurable via `JWT_EXPIRES_IN` (default: `7d`).
* **Zero Secret Logging**: JWT tokens and secrets are redacted from all log streams via `securityLogger`.

### 2.2 One-Time Password (OTP)
* **Cryptographic Randomness**: Deprecated `Math.random()` and replaced with Node.js `crypto.randomInt(100000, 1000000)` providing cryptographically secure 6-digit tokens.
* **Single-Use Invalidation**: Verified OTPs are immediately purged upon first successful validation.
* **Short Lifespan**: OTP expiration is enforced (3 minutes).
* **Attempt Throttling**: Maximum 3 verification attempts per OTP. Upon reaching 3 failed attempts, the OTP is purged and rejected with `TOO_MANY_ATTEMPTS`.
* **Zero Production Disclosure**: OTP codes are never logged or returned in production HTTP responses.

### 2.3 Password Security
* **Algorithm**: Native `crypto.scryptSync` with unique 16-byte random salt and 64-byte key length.
* **Constant-Time Verification**: Uses `crypto.timingSafeEqual` to eliminate timing attacks.
* **Zero Hash Leakage**: The `passwordService.sanitizeUser()` utility recursively removes `password` and `passwordHash` fields prior to API serialization.

---

## 3. Central Authorization Policy & IDOR Hardening

### 3.1 Authorization Middleware Suite (`src/middleware/authorization.ts`)
* `requireAuthenticatedUser`: Verifies valid JWT token and attaches user context. Returns HTTP 401 if missing.
* `requireAdmin`: Enforces administrative privilege (`role === 'ADMIN' | 'SUPER_ADMIN'`). Returns HTTP 403 if insufficient.
* `requireOrganizationAccess(roles?)`: Verifies the authenticated user is the organization creator, an active member matching allowed roles, or a global admin.
* `requireProjectAccess(roles?)`: Validates project ownership, active membership with permitted roles, or administrative privileges.
* `requireAssetAccess()`: Verifies asset ownership, project membership of the asset's linked project, or admin status.

### 3.2 IDOR Prevention Rules
1. **Server-Side Binding**: Never trust client-supplied owner IDs (`ownerId`, `userId`, `organizationId`) in `req.body`. All parent-child associations are resolved from the authenticated context (`req.user.id`) or database records.
2. **Access Verification Before Read/Write**: Every route handling identifiable entities (`projectId`, `assetId`, `organizationId`, etc.) performs ownership and role checks before executing database queries.

---

## 4. Mass Assignment & Field Whitelisting
* **Pattern Elimination**: Unsafe object spreading (`db.create({...req.body})`) has been replaced with explicit field picking (`pickAllowedFields()`) and system field stripping (`stripProtectedFields()`).
* **Protected System Fields**:
  - Identifiers: `id`, `createdAt`, `updatedAt`
  - Ownership/Tenant: `ownerId`, `organizationId`, `createdBy`, `createdById`
  - Workflow & Auditing: `readinessScore`, `verificationStatus`, `approvedBy`, `approvedAt`, `systemScore`, `isAdmin`, `role`

---

## 5. Request Validation Architecture
* **Standardized Engine**: Validation is powered by Zod (`validateRequest({ params, query, body })`).
* **Rejection Semantics**: Requests with missing required fields, illegal types, negative numbers, or invalid formats return HTTP 400 with structured validation errors:
  ```json
  {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload or parameters",
    "requestId": "UUID",
    "details": [{ "field": "phone", "message": "Invalid format" }]
  }
  ```

---

## 6. Tiered Rate Limiting (`src/security/rateLimiter.ts`)
Configurable in-memory token bucket rate limiters protect the API:
* **AUTH_STRICT** (`/api/auth/send-otp`, `/api/auth/verify-otp`): 10 requests / 15 minutes.
* **AI_EXPENSIVE** (`/api/energy/*`, `/api/plan-powerplant`): 10 requests / 1 minute.
* **UPLOAD** (file attachments): 20 requests / 15 minutes.
* **PUBLIC_API** (catalogs, plans): 60 requests / 1 minute.
* **GENERAL_API** (standard REST endpoints): 120 requests / 1 minute.
Exceeded quotas return HTTP 429 (`RATE_LIMIT_EXCEEDED`).

---

## 7. Security Headers & CORS Policy
* **Helmet**: Configured on Express to enforce secure HTTP headers (`X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, etc.). `frameguard` is selectively tuned for AI Studio iframe embedding.
* **CORS**:
  - Production: Strictly validates `req.header('origin')` against whitelisted `ALLOWED_ORIGINS`.
  - Development: Restricts origin reflection to localhost development ports (`localhost:3000`, `localhost:5173`).
* **Request Limits**: JSON payload size is bounded to 1MB (`BODY_LIMIT`) to prevent memory exhaustion.

---

## 8. Error Handling & Observability
* **Correlation ID**: Every HTTP request receives a verified or generated UUID (`X-Request-Id`) attached to `req.id`, `res.setHeader()`, logs, and error responses.
* **Standard Error Model**:
  ```json
  {
    "code": "ERROR_CODE",
    "message": "Sanitized error message",
    "requestId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
  }
  ```
* **Production Sanitization**: Stack traces, database file paths, and internal exceptions are suppressed in production mode.
* **Security Logger**: Redacts tokens, passwords, OTPs, and authorization headers from logs.

---

## 9. Production Mock Guards (`src/security/mockGuard.ts`)
* In production mode (`NODE_ENV=production`), simulating external services (SMS, Payment Gateways like Zarinpal, Financial Approvals) is strictly prohibited.
* If credentials are missing in production, endpoints return HTTP 503 (`SERVICE_NOT_CONFIGURED`) rather than faking success.
* Privilege escalation endpoints (`/api/user/dev-make-admin`) are permanently disabled in production mode.
