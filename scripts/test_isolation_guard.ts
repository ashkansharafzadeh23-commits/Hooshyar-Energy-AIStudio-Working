import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as db from '../src/db/index.js';

export interface IsolationContext {
  tempDbPath: string;
  repoDbPath: string;
  initialHash: string;
  verifyImmutability: () => void;
  cleanup: () => void;
}

export function computeFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cannot compute hash: file does not exist at ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Initializes test database isolation.
 * Guarantees that:
 * 1. The repository db.json is never targeted for writing by tests.
 * 2. A separate temp file is provisioned in os.tmpdir().
 * 3. Initial SHA-256 hash of repository db.json is recorded.
 * 4. TEST_DATABASE_ISOLATED_FROM_REPOSITORY_DB = PASS is asserted and logged.
 * 5. After test finishes, immutability of repository db.json is verified byte-for-byte.
 */
export function setupTestDatabaseIsolation(suiteName: string = 'test_suite'): IsolationContext {
  const repoDbPath = path.resolve(process.cwd(), 'db.json');
  if (!fs.existsSync(repoDbPath)) {
    throw new Error(`Repository db.json not found at: ${repoDbPath}`);
  }

  const initialHash = computeFileHash(repoDbPath);

  // Generate unique isolated temp database file
  const rand = Math.random().toString(36).substring(2, 9);
  const tempDbPath = path.join(os.tmpdir(), `hooshyar_${suiteName}_${Date.now()}_${rand}.json`);

  // Initialize temp database with clean copy of existing db.json
  fs.copyFileSync(repoDbPath, tempDbPath);

  // Configure runtime environment for test isolation
  process.env.NODE_ENV = 'test';
  process.env.TEST_DB_PATH = tempDbPath;
  db.setDBPath(tempDbPath);

  // Verify source-path isolation assertion
  const currentPath = path.resolve(db.getDBPath());
  if (currentPath === repoDbPath) {
    throw new Error(`FATAL ISOLATION FAILURE: Active DB path (${currentPath}) equals repository db.json!`);
  }

  console.log(`[TEST ISOLATION] Active isolated DB: ${tempDbPath}`);
  console.log(`TEST_DATABASE_ISOLATED_FROM_REPOSITORY_DB = PASS`);

  const verifyImmutability = () => {
    const finalHash = computeFileHash(repoDbPath);
    if (finalHash !== initialHash) {
      console.error(`\n[CRITICAL ERROR] Repository db.json was modified during test suite!`);
      console.error(`  Initial SHA-256: ${initialHash}`);
      console.error(`  Final SHA-256:   ${finalHash}`);
      throw new Error(`IMMUTABILITY VIOLATION: Repository db.json was mutated by tests!`);
    }
    console.log(`[IMMUTABILITY GUARD] PASS: Repository db.json byte-for-byte identical (SHA-256: ${initialHash})`);
  };

  const cleanup = () => {
    try {
      verifyImmutability();
    } finally {
      if (fs.existsSync(tempDbPath)) {
        try {
          fs.unlinkSync(tempDbPath);
        } catch {
          // Ignore temp cleanup errors
        }
      }
    }
  };

  return {
    tempDbPath,
    repoDbPath,
    initialHash,
    verifyImmutability,
    cleanup
  };
}
