/**
 * CI: ensure config/uor-upstream.lock.json matches submodule HEAD,
 * and the submodule remote is exactly UOR-Foundation/UOR-Framework.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPO = 'https://github.com/UOR-Foundation/UOR-Framework';

function normalizeGitHubRepoUrl(url) {
  let u = url.trim().replace(/\.git$/i, '');
  if (u.startsWith('git@github.com:')) {
    u = 'https://github.com/' + u.slice('git@github.com:'.length);
  }
  return u.replace(/\/$/, '');
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, 'config', 'uor-upstream.lock.json');
const uor = join(root, 'third_party', 'UOR-Framework');
const gitmodulesPath = join(root, '.gitmodules');

if (!existsSync(join(uor, '.git'))) {
  console.error('UOR submodule missing.');
  process.exit(1);
}
if (!existsSync(lockPath)) {
  console.error('Missing config/uor-upstream.lock.json — run npm run uor:sync-lock');
  process.exit(1);
}

if (existsSync(gitmodulesPath)) {
  const gm = readFileSync(gitmodulesPath, 'utf8');
  if (!gm.includes('UOR-Foundation/UOR-Framework')) {
    console.error('.gitmodules must point submodule to UOR-Foundation/UOR-Framework only.');
    process.exit(1);
  }
}

const origin = execSync('git remote get-url origin', { cwd: uor, encoding: 'utf8' }).trim();
const normalizedOrigin = normalizeGitHubRepoUrl(origin);
if (normalizedOrigin !== CANONICAL_REPO) {
  console.error('UOR submodule origin must be the canonical UOR-Framework repo.');
  console.error('  expected:', CANONICAL_REPO);
  console.error('  actual:  ', normalizedOrigin);
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const lockRepo = normalizeGitHubRepoUrl(lock.repository ?? '');
if (lockRepo && lockRepo !== CANONICAL_REPO) {
  console.error('uor-upstream.lock.json repository must match canonical UOR-Framework URL.');
  console.error('  expected:', CANONICAL_REPO);
  console.error('  lock:    ', lockRepo);
  process.exit(1);
}

const actual = execSync('git rev-parse HEAD', { cwd: uor, encoding: 'utf8' }).trim();

if (lock.resolved_sha !== actual) {
  console.error('uor-upstream.lock.json out of sync with submodule.');
  console.error('  lock:  ', lock.resolved_sha);
  console.error('  actual:', actual);
  console.error('Run: npm run uor:sync-lock');
  process.exit(1);
}

console.log('UOR submodule OK:', normalizedOrigin, '@', actual.slice(0, 7));
