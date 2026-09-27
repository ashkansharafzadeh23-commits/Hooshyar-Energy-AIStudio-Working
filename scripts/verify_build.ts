import { execSync } from 'child_process';

console.log('Running tsc --noEmit:');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ tsc --noEmit passed successfully');
} catch (e) {
  console.error('✗ tsc --noEmit failed');
  process.exit(1);
}

console.log('\nRunning vite build:');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✓ vite build passed successfully');
} catch (e) {
  console.error('✗ vite build failed');
  process.exit(1);
}
