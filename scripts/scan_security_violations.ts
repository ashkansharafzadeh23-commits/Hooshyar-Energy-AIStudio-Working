import fs from 'fs';
import path from 'path';

interface Violation {
  file: string;
  line: number;
  rule: string;
  snippet: string;
}

const violations: Violation[] = [];

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Rule 1: No insecure fallback secret
    if (line.includes('fallback_secret_for_dev')) {
      violations.push({
        file: filePath,
        line: lineNum,
        rule: 'HARDCODED_DEV_SECRET',
        snippet: line.trim()
      });
    }

    // Rule 2: No Math.random in security/auth
    if (filePath.includes('/auth') || filePath.includes('/security')) {
      if (line.includes('Math.random()')) {
        violations.push({
          file: filePath,
          line: lineNum,
          rule: 'INSECURE_RANDOM_IN_AUTH',
          snippet: line.trim()
        });
      }
    }

    // Rule 3: No permissive unconfigured CORS in server.ts
    if (filePath.endsWith('server.ts') && line.trim() === 'app.use(cors());') {
      violations.push({
        file: filePath,
        line: lineNum,
        rule: 'PERMISSIVE_CORS',
        snippet: line.trim()
      });
    }
  });
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      scanFile(fullPath);
    }
  }
}

console.log('================================================================');
console.log('HOOSHYAR ENERGY — SECURITY STATIC CODE SCANNER (PH-3)');
console.log('================================================================');

walkDir(path.join(process.cwd(), 'src'));
scanFile(path.join(process.cwd(), 'server.ts'));

if (violations.length === 0) {
  console.log('[PASS] Static security scan completed: 0 violations found!');
  process.exit(0);
} else {
  console.error(`[FAIL] Static security scan found ${violations.length} violations:`);
  violations.forEach(v => {
    console.error(` - [${v.rule}] ${v.file}:${v.line} -> ${v.snippet}`);
  });
  process.exit(1);
}
