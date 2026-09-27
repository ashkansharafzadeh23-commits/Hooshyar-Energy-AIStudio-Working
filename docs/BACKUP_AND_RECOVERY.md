# Hooshyar Energy — Production Backup and Recovery Runbook
**Document Version:** 1.0.0 (PH-5 Production Hardening)  
**Status:** Canonical Operations Guide  
**Classification:** Internal Confidential / SRE Runbook  

---

## 1. Executive Summary & Objectives

Hooshyar Energy is a mission-critical solar project lifecycle and asset management platform managing physical energy infrastructure, contractual RFQs, EPC tenders, and financial investments. 

Data loss or extended downtime threatens grid asset visibility, tender deadlines, and financial obligations. This runbook defines the disaster recovery (DR) architecture, automated backup mechanisms, point-in-time recovery (PITR) procedures, and recovery objectives.

### Core Recovery Targets
* **Recovery Point Objective (RPO):** $\le 15\text{ minutes}$ (Maximum acceptable data loss window during catastrophic failure).
* **Recovery Time Objective (RTO):** $\le 60\text{ minutes}$ (Maximum acceptable platform downtime before primary operational services are restored).

---

## 2. Backup Architecture & Strategy

### 2.1 PostgreSQL Production Backups (Managed / Self-Hosted)
Hooshyar Energy mandates a dual-tier backup strategy for PostgreSQL:

1. **Continuous Write-Ahead Log (WAL) Archiving:**
   * Archiving enabled via `wal_level = replica`, `archive_mode = on`, and `archive_command = 'test ! -f /mnt/wal_archive/%f && cp %p /mnt/wal_archive/%f'`.
   * WAL segments streamed continuously to geo-redundant, write-once object storage (e.g., S3 Glacier, GCS Nearline) every 5 minutes.
   * Enables true **Point-In-Time Recovery (PITR)** to any second within the retention window.

2. **Daily Physical/Logical Base Backups:**
   * Automated full daily snapshot scheduled during off-peak hours (02:00 IRST / 22:30 UTC).
   * Format: Compressed PostgreSQL custom format (`pg_dump -Fc`).
   * Retention Schedule:
     * Daily backups: Retained for 30 days.
     * Weekly snapshots: Retained for 12 weeks.
     * Monthly snapshots: Retained for 7 years (regulatory and contractual audit compliance).

### 2.2 Pre-Migration JSON File Snapshot Policy
During legacy transition or phased migrations from file-backed staging to PostgreSQL:
* Prior to running `scripts/migrate_json_to_postgres.ts`, an immutable, timestamped SHA-256 verified snapshot of `db.json` is created:
  ```bash
  SNAPSHOT_TIME=$(date -u +"%Y%m%d_%H%M%SZ")
  cp db.json "backups/db_snapshot_${SNAPSHOT_TIME}.json"
  sha256sum "backups/db_snapshot_${SNAPSHOT_TIME}.json" > "backups/db_snapshot_${SNAPSHOT_TIME}.json.sha256"
  chmod 400 "backups/db_snapshot_${SNAPSHOT_TIME}.json"
  ```
* Production environments running `NODE_ENV=production` **never** read or write to `db.json`.

---

## 3. Secret Management & Dump Sanitization

> [!CAUTION]
> **Zero Plaintext Secrets in Backups:**
> Database dumps contain salted password hashes and encrypted token references, but must NEVER contain unencrypted cryptographic keys or third-party provider credentials.

* `JWT_SECRET`, `SESSION_SECRET`, and `COOKIE_SECRET` are managed strictly via environment secret vaults (e.g., GCP Secret Manager, HashiCorp Vault, AWS Secrets Manager) and are never stored inside tables.
* Telemetry source configurations stored in `telemetry_sources` table sanitize connection credentials in memory via `sanitizeTelemetrySource()` before being served to client consumers.
* Backup archives must be encrypted at rest using AES-256-GCM before transport to remote object storage:
  ```bash
  pg_dump -Fc -d "$DATABASE_URL" | gpg --symmetric --cipher-algo AES256 -o "hooshyar_backup_${SNAPSHOT_TIME}.dump.gpg"
  ```

---

## 4. Automated Backup Commands & Scripts

### 4.1 Daily Automated Dump Command
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/hooshyar"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
TARGET_FILE="${BACKUP_DIR}/hooshyar_pg_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup at ${TIMESTAMP}..."
pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --dbname="${DATABASE_URL}" \
  --file="${TARGET_FILE}"

# Generate SHA256 integrity signature
sha256sum "${TARGET_FILE}" > "${TARGET_FILE}.sha256"
echo "[INFO] Backup completed successfully: ${TARGET_FILE}"
```

### 4.2 Automated Health Validation of Backups
* Weekly automated synthetic restoration drill runs in an isolated sandbox database.
* The drill validates:
  1. Archive decompression and checksum verification.
  2. Schema consistency across all foreign keys.
  3. Row count variance between production and restored replica ($\Delta \le 0.1\%$).

---

## 5. Step-by-Step Disaster Recovery & Restoration Procedure

In the event of total database loss, instance corruption, or ransomware disaster, follow this procedure sequentially:

### Phase 1: Provisioning & Network Isolation
1. Provision a new PostgreSQL 16+ instance in the recovery zone or cloud region.
2. Configure networking, firewall rules, and SSL requirements (`sslmode=require`).
3. Set connection parameters:
   * Max connections: 100
   * Connection timeout: 5000ms
   * Timezone: UTC

### Phase 2: Schema Initialization (If restoring to empty database)
Ensure Drizzle schema migrations are executed:
```bash
export DATABASE_URL="postgres://user:password@new-db-host:5432/hooshyar_production?sslmode=require"
npm run db:push
# or execute SQL migrations in src/database/postgres/migrations
```

### Phase 3: Binary Restore via `pg_restore`
Restore database contents with parallel jobs:
```bash
# Decrypt if encrypted
gpg --decrypt "hooshyar_backup_latest.dump.gpg" > "/tmp/restore.dump"

# Verify checksum
sha256sum -c "/tmp/restore.dump.sha256"

# Execute restoration
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --jobs=4 \
  --dbname="${DATABASE_URL}" \
  "/tmp/restore.dump"

rm -f "/tmp/restore.dump"
```

### Phase 4: Point-In-Time Recovery (PITR) via WAL Playback
If recovering up to a specific transaction timestamp (e.g., immediately preceding a dropped table):
1. Stop PostgreSQL server:
   ```bash
   systemctl stop postgresql
   ```
2. Configure `postgresql.conf` or `recovery.signal`:
   ```ini
   restore_command = 'cp /mnt/wal_archive/%f %p'
   recovery_target_time = '2026-09-20 08:00:00 UTC'
   recovery_target_action = 'promote'
   ```
3. Start PostgreSQL and monitor logs until target is reached and database is promoted.

### Phase 5: Post-Recovery Integrity Verification
Execute internal regression and integrity verification commands:
```bash
# 1. Verify direct bypasses remain zero
npx tsx scripts/test_direct_bypasses.ts

# 2. Verify database health probe
curl -f http://localhost:3000/health/ready

# 3. Check release gate suite
npx tsx scripts/test_ph5_production_readiness.ts
```

---

## 6. Disaster Recovery Runbook: Scenarios & Action Plans

| Scenario | Primary Cause | Immediate Action | Expected RTO |
| :--- | :--- | :--- | :--- |
| **Primary Node Hardware Failure** | Host outage, hypervisor crash | Automated failover to sync replica via connection pooler (PgBouncer) | < 3 minutes |
| **Data Corruption / Rogue Query** | Unvalidated manual DB edit | Stand up recovery instance; execute PITR to 1 minute prior to incident | < 45 minutes |
| **Regional Cloud Outage** | Cloud datacenter connectivity loss | Route traffic via DNS failover to cross-region standby cluster | < 30 minutes |
| **Storage Exhaustion** | Unbounded telemetry growth | Expand disk volume; execute automated partition truncation on telemetry | < 15 minutes |

---

## 7. Operational Roles & Responsibilities

* **Incident Commander (IC):** Authorizes disaster declaration and switch to standby replica.
* **Database Administrator / Lead SRE:** Executes physical restoration and WAL replay.
* **Lead Application Engineer:** Validates `/health/ready` and executes synthetic verification transactions.
* **Security Officer:** Verifies checksum signatures and certifies secret isolation.
