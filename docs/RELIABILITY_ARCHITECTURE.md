# Hooshyar Energy — Reliability Architecture & Production Hardening (PH-4)

## 1. Executive Summary & Philosophy

The Hooshyar Energy platform powers mission-critical industrial, utility, and commercial renewable energy planning, financing, procurement, and asset monitoring across Iran. System reliability is governed by strict fail-safe principles:

- **Graceful Degradation over Hard Failure**: Transient failure of non-critical external services (e.g. satellite irradiance APIs, AI executive generators) must never take down user workloads, project workflows, or financial records.
- **Truthful Factual Boundaries**: Regional solar estimates or AI summaries must never masquerade as verified measurements or authoritative engineering inputs.
- **Zero Raw External Payload Leakage**: Provider tokens, sensitive headers, or raw upstream JSON error bodies must never enter production application logs.
- **Durable Invariants for High-Risk Mutations**: Critical state changes (contract awards, financing approvals, payment verifications) must be protected by stored database state invariants, not merely in-memory HTTP caches.

---

## 2. Timeouts & Retry Policies

### Configurable Bounded Timeouts
Every outbound network interaction is bounded by finite, configurable timeouts enforced via `AbortController` and `Promise.race`:

| Service / Provider | Default Timeout | Environment Variable | Retry Policy |
| :--- | :--- | :--- | :--- |
| **NASA POWER Solar API** | 10,000 ms (10s) | `NASA_POWER_TIMEOUT_MS` | Max 2 retries (idempotent read) |
| **Gemini AI Assistant** | 15,000 ms (15s) | `GEMINI_TIMEOUT_MS` | Max 1 retry (idempotent read) |
| **SMS Gateway Provider** | 8,000 ms (8s) | `SMS_TIMEOUT_MS` | 0 retries (non-idempotent mutation) |
| **Payment Gateway (Zarinpal)** | 10,000 ms (10s) | `PAYMENT_TIMEOUT_MS` | 0 retries on authorization mutation |
| **PostgreSQL Readiness Probe** | 2,500 ms (2.5s) | N/A | Single attempt `SELECT 1` |

### Bounded Exponential Backoff with Jitter
For safe, transient errors (HTTP 429, 502, 503, 504, `ECONNRESET`, `ETIMEDOUT`):
```text
Delay = Min(maxBackoffMs, initialBackoffMs * 2^(attempt-1)) + Jitter(0-30%)
```
**Strict Prohibition on Non-Idempotent Mutation Retries**: Any operation flagged with `isIdempotent: false` (e.g. OTP dispatch, payment initiation, bank transfer) is strictly granted **0 retries** to prevent double-billing or spamming.

---

## 3. Circuit Breakers: State Machine & Fallbacks

Each external dependency is isolated behind a dedicated `CircuitBreaker` instance:
- `externalCircuitBreakers.nasaPower`
- `externalCircuitBreakers.geminiAi`
- `externalCircuitBreakers.smsProvider`
- `externalCircuitBreakers.paymentGateway`

```
         ┌────────────────────────────────────────────────────────┐
         │                                                        │
         ▼                                                        │
  ┌──────────────┐     Threshold Failures (e.g. 3)      ┌──────────────┐
  │              ├─────────────────────────────────────►│              │
  │    CLOSED    │                                      │     OPEN     │
  │ (Normal Ops) │◄─────────────────────────────────────┤  (Fails Fast)│
  └──────▲───────┘          Probe Succeeded             └──────┬───────┘
         │                                                     │
         │                  Probe Failed                       │ Reset Timeout
         │             ┌────────────────────────┐              │ Expired (20-30s)
         │             │                        ▼              ▼
         └─────────────┴─────────────────┌──────────────┐
                                         │  HALF_OPEN   │
                                         │ (Canary Test)│
                                         └──────────────┘
```

### Fallback Matrix
| Service | Circuit State = OPEN Fallback Behavior | Operational State |
| :--- | :--- | :--- |
| **NASA POWER** | Returns regional reference solar estimate marked `REFERENCE_ESTIMATE` with Persian advisory note. | `DEGRADED` (Non-blocking) |
| **Gemini AI** | Falls back to deterministic rule-based executive summary engine (`VERIFIED_FACTS_ENGINE`). | `DEGRADED` (Non-blocking) |
| **SMS Gateway** | Rejects OTP request gracefully with code `SMS_PROVIDER_DEGRADED` and exponential retry advice. | `DEGRADED` |
| **Payment Gateway** | Prevents checkout initiation with `PAYMENT_GATEWAY_UNAVAILABLE` before user is charged. | `DOWN` for payments |

---

## 4. Degraded Operation Modes vs Hard Failure

The platform distinguishes between **essential system health** and **peripheral service degradation**:

### Hard Failure (HTTP 503 `NOT_READY`)
- Primary database connectivity failure (PostgreSQL unreachable / pool exhausted).
- Fatal security configuration missing (e.g., missing `JWT_SECRET` in production).
- Catastrophic process memory exhaustion (>95% heap).

### Safe Degradation (HTTP 200 `DEGRADED`)
- An external dependency circuit breaker is OPEN (NASA POWER, Gemini AI).
- High memory pressure warnings (>85% heap).
- The platform continues to serve all core APIs, project management, financial matching, and asset telemetry without interruption.

---

## 5. Database Readiness vs Liveness Probes

To integrate safely with Kubernetes, Google Cloud Run, and container orchestrators, health probes are separated into two distinct endpoints:

### 1. Liveness Probe (`GET /health/live`)
- **Purpose**: Verifies that the Node.js event loop is running and accepting HTTP requests.
- **Contract**: Always returns HTTP 200 `{ status: "UP", uptimeSeconds: N }` unless the process is deadlocked or crashed.
- **Failure Consequence**: Container orchestrator immediately restarts the container.

### 2. Readiness Probe (`GET /health/ready`)
- **Purpose**: Verifies that the container is ready to accept user production traffic.
- **Architecture**:
  ```text
  GET /health/ready
        │
        ▼
  src/api/health.ts (Health Route — ZERO direct DB or db.json imports)
        │
        ▼
  src/database/health.ts (Database Health Abstraction)
        │
        ├── Active Driver = 'postgres': Runs SELECT 1 connectivity probe
        └── Active Driver = 'json': Verifies JSON storage initialization
  ```
- **PostgreSQL Truthful Reporting**:
  - If PostgreSQL is configured and passes `SELECT 1`: `status: "UP"`, `postgres: { status: "UP", verified: true }`.
  - If PostgreSQL is unconfigured: `postgres: { status: "NOT_CONFIGURED", verified: false }`.
  - If PostgreSQL is configured but unreachable: `postgres: { status: "NOT_PRODUCTION_VERIFIED", verified: false }`.
  - **Critical Rule**: In production (`NODE_ENV=production`), JSON storage is never reported as PostgreSQL `UP`. It yields `status: "DOWN"` and HTTP 503 `NOT_READY`.

---

## 6. Idempotency Architecture: Transport vs Domain

The platform enforces a robust two-tier idempotency model:

### Tier 1: Local Transport Idempotency (`LOCAL_IDEMPOTENCY`)
- Implemented in `src/reliability/idempotency.ts` via `idempotencyMiddleware`.
- Uses an in-memory key store with a 10-minute TTL.
- Scoped by endpoint, user ID, and `Idempotency-Key` header.
- Replays cached responses with `X-Idempotent-Replay: true` during client network retries.

### Tier 2: Durable Domain Idempotency (`DURABLE_DOMAIN_IDEMPOTENCY`)
Critical, high-risk financial and contractual operations DO NOT rely on in-memory state:
1. **RFQ Award (`POST /api/rfq/bids/:bidId/select`)**:
   - Inspects persistent database state: checks if `rfq.status === 'AWARDED'`.
   - If already awarded to this bid, returns success (`alreadyAwarded: true`).
   - If awarded to a *different* bid, rejects with HTTP 409 Conflict.
2. **Financing Offer Approval (`POST /api/financing/financing-offers/:id/record-partner-approval`)**:
   - Checks existing `projectFinancingRecords` for `financingOfferId === offer.id`.
   - Returns existing record (`alreadyRecorded: true`) without creating duplicate debt contracts.
3. **Subscription Payment Verification (`GET /api/subscription/verify`)**:
   - Checks `transaction.status === "success"`.
   - Rejects duplicate subscription creation if already verified.

### Status of Distributed Transport Idempotency (`DISTRIBUTED_IDEMPOTENCY NOT YET VERIFIED`)
A shared distributed cache (e.g. Redis or PostgreSQL idempotency log table with advisory locking) for transport-level raw HTTP request deduplication across multiple horizontal container nodes is **NOT YET VERIFIED**. In multi-instance deployments, transport-level deduplication relies on the underlying Durable Domain Idempotency.

---

## 7. External Error Log Redaction

All external service integrations (NASA, Gemini, SMS, Payment) route error logging through `extractSafeExternalErrorMetadata`:

- **Banned**: Logging raw upstream response bodies, HTML error pages, stack traces, or authorization headers.
- **Logged Safe Metadata**:
  - `provider`: e.g. `'NASA_POWER'`, `'GEMINI_AI'`
  - `httpStatus`: e.g. `404`, `429`, `503`
  - `requestId`: Trace identifier
  - `errorCategory`: `'TIMEOUT'`, `'CIRCUIT_OPEN'`, `'RATE_LIMITED'`, `'NETWORK_ERROR'`
  - `safeSummary`: Sanitized high-level message

---

## 8. NASA Solar Irradiance & Factual Boundaries

Regional solar estimates and satellite measurements are strictly categorized:

| Classification | Meaning | `isVerifiedSource` | `isReferenceOnly` |
| :--- | :--- | :--- | :--- |
| **`VERIFIED_SOURCE`** | Live or cached NASA POWER satellite measurement (22-year climatology). | `true` | `false` |
| **`REFERENCE_ESTIMATE`** | Regional climate atlas baseline (e.g. Central Desert 5.75, Caspian 4.0). | `false` | `true` |
| **`UNAVAILABLE`** | City unrecognized and no regional fallback possible. | `false` | `true` |

Downstream engineering calculations in `api/analyze.js` retain these flags in both `dataSource` and `solar` objects, ensuring that estimates are never presented as measured NASA satellite data.

---

## 9. Remaining Risks & Phase 5 Readiness

1. **Distributed Lock Absence**: While durable domain invariants protect against duplicate records, high-concurrency race conditions across horizontally scaled nodes would benefit from PostgreSQL advisory locks (`pg_advisory_xact_lock`).
2. **PostgreSQL Migration Execution**: The schema, Drizzle ORM models, migration scripts, and repository abstractions are production-ready. Once production credentials (`DATABASE_URL`) are attached, running `npx tsx scripts/migrate_json_to_postgres.ts` activates durable PostgreSQL persistence.
