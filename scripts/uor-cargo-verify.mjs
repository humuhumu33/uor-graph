/**
 * Tier 0: compiler-grounded sanity check for the pinned UOR-Framework checkout.
 * Runs `cargo check --workspace` in third_party/UOR-Framework (no GitNexus graph merge).
 *
 * Optional: set UOR_VERIFY_CARGO_TEST=1 to run `cargo test --workspace --no-run` (compile tests, do not execute).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const uor = join(root, 'third_party', 'UOR-Framework');

if (!existsSync(join(uor, 'Cargo.toml'))) {
  console.error('Missing UOR workspace: third_party/UOR-Framework/Cargo.toml');
  console.error('Run: git submodule update --init --recursive');
  process.exit(1);
}

const testMode = process.env.UOR_VERIFY_CARGO_TEST === '1';
const cargoArgs = testMode ? ['test', '--workspace', '--no-run'] : ['check', '--workspace'];

const label = testMode ? 'cargo test --workspace --no-run' : 'cargo check --workspace';
console.error(`[uor-cargo-verify] ${label} in third_party/UOR-Framework …`);

const result = spawnSync('cargo', cargoArgs, {
  cwd: uor,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

if (result.error) {
  console.error('[uor-cargo-verify]', result.error.message);
  console.error('Install Rust (https://rustup.rs/) and ensure cargo is on PATH.');
  process.exit(1);
}

const code = result.status ?? 1;
if (code !== 0) {
  console.error(`[uor-cargo-verify] failed with exit ${code}`);
  process.exit(code);
}

console.error('[uor-cargo-verify] OK');
