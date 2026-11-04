
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/database/postgres/schema.js';
import {
  maintenancePostgresAdapter,
  MaintenanceAccessDeniedError
} from '../src/database/postgres/maintenancePostgresAdapter.js';

const url = process.env.F5_TEST_DATABASE_URL;

if (!url) {
  throw new Error('F5_TEST_DATABASE_URL is required');
}

const target = new URL(url);

if (
  target.hostname !== '127.0.0.1' ||
  target.port !== '55433' ||
  target.pathname !== '/hooshyar_f5_test' ||
  target.username !== 'f5_test'
) {
  throw new Error('SAFETY BLOCK: Not the approved local F5 test database');
}

const client = new Client({ connectionString: url });
let checks = 0;
let transactionStarted = false;

function check(condition: unknown, name: string) {
  assert.ok(condition, name);
  checks++;
  console.log(`PASS ${checks}: ${name}`);
}

async function denied(operation: () => Promise<unknown>, name: string) {
  let rejected = false;
  try {
    await operation();
  } catch (error) {
    if (error instanceof MaintenanceAccessDeniedError) {
      rejected = true;
    } else {
      throw error;
    }
  }
  check(rejected, name);
}

async function main() {
  await client.connect();

  try {
    const identity = await client.query(
      'SELECT current_database() AS db, current_user AS username'
    );

    check(
      identity.rows[0].db === 'hooshyar_f5_test' &&
      identity.rows[0].username === 'f5_test',
      'Verified test database identity'
    );

    await client.query('BEGIN');
    transactionStarted = true;

    const db = drizzle(client, { schema });

    const suffix = `${Date.now()}-${process.pid}`;
    const id = `F5-INT-${suffix}`;
    const code = `MNT-F5-${suffix}`;
    const owner = `F5-OWNER-${suffix}`;
    const stranger = `F5-STRANGER-${suffix}`;
    const techA = `F5-TECH-A-${suffix}`;
    const techB = `F5-TECH-B-${suffix}`;
    const project = `F5-PROJECT-${suffix}`;

    const ownerAuth = { userId: owner };
    const strangerAuth = { userId: stranger };
    const aAuth = { userId: techA, role: 'TECHNICIAN' };
    const bAuth = { userId: techB, role: 'TECHNICIAN' };

    await client.query(
      `INSERT INTO maintenance_cases
      (id, maintenance_code, project_id, asset_id,
       title, description, category, priority, status,
       reported_by, reported_at, contact_name, contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12)`,
      [
        id, code, project, 'F5-ASSET',
        'F5_PRIVATE_TITLE', 'F5_PRIVATE_DESCRIPTION',
        'CORRECTIVE', 'MEDIUM', 'OPEN', owner,
        'F5_PRIVATE_CUSTOMER', '09000000000'
      ]
    );

    const read = (auth: any) =>
      maintenancePostgresAdapter.getCaseById(id, auth, db);

    const history = (auth: any) =>
      maintenancePostgresAdapter.getAssignmentHistories(id, auth, db);

    const ownerCase = await read(ownerAuth);
    check(ownerCase?.id === id, 'Owner can read own case');
    check(
      ownerCase?.contactName === 'F5_PRIVATE_CUSTOMER',
      'Owner receives own contact information'
    );

    await denied(
      () => read(strangerAuth),
      'Unrelated user cannot read case'
    );

    await denied(
      () => history(strangerAuth),
      'Unrelated user cannot read history'
    );

    await denied(
      () => maintenancePostgresAdapter.listCases(
        { projectId: project }, strangerAuth, db
      ),
      'Unrelated user cannot list by project alone'
    );

    const ownerList = await maintenancePostgresAdapter.listCases(
      { reportedBy: owner, limit: 10, offset: 0 },
      ownerAuth,
      db
    );

    check(
      ownerList.some(c => c.id === id),
      'Owner can list own case'
    );

    const emptyPage = await maintenancePostgresAdapter.listCases(
      { reportedBy: owner, limit: 1, offset: 1 },
      ownerAuth,
      db
    );

    check(
      emptyPage.every(c => c.id !== id),
      'Pagination excludes first record on second page'
    );

    async function updateAssignment(technician: string, status: string) {
      await client.query(
        `UPDATE maintenance_cases
         SET assigned_technician_id=$1, status=$2
         WHERE id=$3`,
        [technician, status, id]
      );
    }

    let eventIndex = 0;

    async function addHistory(technician: string, status: string) {
      eventIndex++;
      await client.query(
        `INSERT INTO maintenance_assignment_histories
         (id, maintenance_case_id, technician_id,
          assigned_by, status, assigned_at, notes)
         VALUES ($1,$2,$3,$4,$5,
                 NOW() + ($6 * INTERVAL '1 minute'),$7)`,
        [
          `${id}-H${eventIndex}`,
          id,
          technician,
          status === 'ACCEPTED' ? technician : 'F5-DISPATCHER',
          status,
          eventIndex,
          'F5_PRIVATE_HISTORY_NOTE'
        ]
      );
    }

    function containsSecret(value: unknown) {
      const text = JSON.stringify(value);
      return [
        'F5_PRIVATE_TITLE',
        'F5_PRIVATE_DESCRIPTION',
        'F5_PRIVATE_CUSTOMER',
        '09000000000'
      ].some(secret => text.includes(secret));
    }

    await updateAssignment(techA, 'ASSIGNED');
    await addHistory(techA, 'ASSIGNED');

    check(
      !containsSecret(await read(aAuth)),
      'Pre-acceptance technician privacy'
    );

    await addHistory(techA, 'ACCEPTED');

    check(
      !containsSecret(await read(aAuth)),
      'Accepted but inactive privacy'
    );

    await updateAssignment(techA, 'IN_PROGRESS');

    check(
      (await read(aAuth))?.description === 'F5_PRIVATE_DESCRIPTION',
      'Current accepted technician gets operational access'
    );

    await updateAssignment(techB, 'ASSIGNED');
    await addHistory(techB, 'ASSIGNED');

    await denied(
      () => read(aAuth),
      'Former technician A loses access'
    );

    check(
      !containsSecret(await read(bAuth)),
      'New technician B sees no private data'
    );

    await updateAssignment(techA, 'IN_PROGRESS');
    await addHistory(techA, 'ASSIGNED');

    check(
      !containsSecret(await read(aAuth)),
      'Old A acceptance cannot authorize new cycle'
    );

    await addHistory(techA, 'ACCEPTED');

    check(
      (await read(aAuth))?.description === 'F5_PRIVATE_DESCRIPTION',
      'New A acceptance grants current-cycle access'
    );

    const ownerHistory = await history(ownerAuth);

    check(
      ownerHistory.length === 5,
      'Owner sees complete five-event history'
    );

    const techHistory = await history(aAuth);

    check(
      techHistory.length === 4,
      'Current technician sees only own history events'
    );

    check(
  techHistory
    .filter(h => h.status === 'ASSIGNED')
    .every(h =>
      h.notes === 'Status transition: ASSIGNED' &&
      h.assignedBy === 'DISPATCHER'
    ),
  'Dispatcher notes are masked from technician'
);

check(
  techHistory
    .filter(h => h.status === 'ACCEPTED')
    .every(h =>
      h.notes === 'F5_PRIVATE_HISTORY_NOTE' &&
      h.assignedBy === techA
    ),
  'Technician sees own authored acceptance notes'
);

    await denied(
      () => history(bAuth),
      'Former technician B cannot read history'
    );

    await client.query(
      `UPDATE maintenance_cases SET status='CANCELLED' WHERE id=$1`,
      [id]
    );

    check(
      !containsSecret(await read(aAuth)),
      'Cancelled case masks customer data'
    );

    await client.query(
      `UPDATE maintenance_cases SET status='CLOSED' WHERE id=$1`,
      [id]
    );

    check(
      !containsSecret(await read(aAuth)),
      'Closed case masks customer data'
    );

    console.log(`RESULT: ${checks} CHECKS PASSED`);
  } finally {
    if (transactionStarted) {
      await client.query('ROLLBACK');
      console.log('TEST TRANSACTION ROLLED BACK');
    }
    await client.end();
  }
}

main().catch(error => {
  console.error('INTEGRATION TEST FAILED:', error);
  process.exitCode = 1;
});
