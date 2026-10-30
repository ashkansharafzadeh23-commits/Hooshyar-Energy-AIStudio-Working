/** Focused local F.5 closure authorization regression; isolated temporary database. */
import * as http from 'http';
import express from 'express';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';

const isolation = setupTestDatabaseIsolation('f5_closure_auth');
let server: http.Server | undefined;
let total = 0;
let failures = 0;
function check(pass: boolean, label: string) {
  total++;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${label}`);
}

async function main() {
  const reporter = userRepository.createUser({ name: 'F5 Reporter', email: 'f5-auth-reporter@example.test', role: 'customer' } as any);
  const admin = userRepository.createUser({ name: 'F5 Admin', email: 'f5-auth-admin@example.test', role: 'admin' } as any);
  const technician = userRepository.createUser({ name: 'F5 Technician', email: 'f5-auth-tech@example.test', role: 'technician' } as any);
  const outsider = userRepository.createUser({ name: 'F5 Outsider', email: 'f5-auth-outsider@example.test', role: 'customer' } as any);
  const token = (u: any) => jwtService.sign({ userId: u.id, role: u.role });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = jwtService.verify(header.slice(7));
        (req as any).user = { ...payload, id: payload.userId };
      } catch { /* router rejects unauthenticated request */ }
    }
    next();
  });
  app.use(maintenanceRouter);
  server = http.createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const makeCase = (title: string, projectId = 'CUSTOMER_DIRECT') => maintenanceRepository.createCase({
    title, description: 'Closure authorization isolated fixture', projectId,
    assetId: 'f5-auth-asset', status: 'VERIFIED', category: 'INVERTER',
    priority: 'MEDIUM', alertIds: [], reportedBy: reporter.id,
    assignedTechnicianId: technician.id
  } as any);
  const close = (id: string, user: any, path: 'cases' | 'maintenance' = 'cases') => fetch(`${url}/${path}/${id}/close`, {
    method: 'POST', headers: { Authorization: `Bearer ${token(user)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ closureNotes: 'Authorized closure test' })
  });
  const project = 'f5-auth-project-fixture';

  // Project-linked case assigned to a technician who must NOT have closure rights.
  const restricted = makeCase('Technician closure must be denied', project);
  const alarm = maintenanceRepository.createAlert({ assetId: 'f5-auth-asset', projectId: project,
    source: 'PERFORMANCE', severity: 'HIGH', status: 'TRIGGERED',
    title: 'F5 linked alarm', description: 'Must remain triggered on denial' } as any);
  maintenanceRepository.updateCase(restricted.id, { alertIds: [alarm.id] });
  const before = JSON.stringify(maintenanceRepository.getCaseById(restricted.id));
  const techReply = await close(restricted.id, technician, 'maintenance');
  check(techReply.status === 403, 'Assigned technician cannot close project-linked case');
  check(JSON.stringify(maintenanceRepository.getCaseById(restricted.id)) === before, 'Technician denial does not mutate case');
  check(maintenanceRepository.getAlertById(alarm.id)?.status === 'TRIGGERED', 'Technician denial does not resolve linked alert');

  // An unrelated user must also be denied, including the alternate URL.
  const otherReply = await close(restricted.id, outsider);
  check(otherReply.status === 403 || otherReply.status === 404, 'Unrelated user cannot close project-linked case');
  check(JSON.stringify(maintenanceRepository.getCaseById(restricted.id)) === before, 'Unrelated user denial does not mutate case');
  check(maintenanceRepository.getAlertById(alarm.id)?.status === 'TRIGGERED', 'Unrelated user denial does not resolve linked alert');

  // Reporter should retain closure permission.
  const reporterReply = await close(restricted.id, reporter);
  check(reporterReply.status === 200, 'Reporter can close project-linked verified case');
  check(maintenanceRepository.getCaseById(restricted.id)?.status === 'CLOSED', 'Reporter closure persists CLOSED status');
  check(maintenanceRepository.getAlertById(alarm.id)?.status === 'RESOLVED', 'Reporter closure resolves linked alert');

  // Admin override remains available on another verified case.
  const adminCase = makeCase('Admin closure case');
  const adminReply = await close(adminCase.id, admin, 'maintenance');
  check(adminReply.status === 200, 'Administrator can close verified direct case');
  check(maintenanceRepository.getCaseById(adminCase.id)?.status === 'CLOSED', 'Administrator closure persists CLOSED status');

  isolation.verifyImmutability();
  console.log(`AUTHORIZATION SUMMARY: ${total - failures}/${total} passed, ${failures} failed`);
  if (failures) process.exitCode = 1;
}
main().catch(err => { console.error('TEST HARNESS ERROR:', err); process.exitCode = 2; })
  .finally(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    isolation.cleanup();
  });
