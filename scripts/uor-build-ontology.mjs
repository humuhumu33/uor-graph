/**
 * Run `uor-build` in the UOR-Framework submodule to materialize `public/uor.foundation.jsonld`
 * (and sibling artifacts). Required for canonical `ontology-terms.json` extraction.
 *
 * @see third_party/UOR-Framework/clients/src/bin/build.rs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const uor = join(root, 'third_party', 'UOR-Framework');

/**
 * @returns {number} exit code (0 = success)
 */
export function runUorBuildSync() {
  if (!existsSync(join(uor, 'Cargo.toml'))) {
    console.error('[uor-build-ontology] Missing third_party/UOR-Framework — init submodules.');
    return 1;
  }

  console.error('[uor-build-ontology] cargo run --bin uor-build -- --out public …');

  const result = spawnSync('cargo', ['run', '--bin', 'uor-build', '--', '--out', 'public'], {
    cwd: uor,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.error) {
    console.error('[uor-build-ontology]', result.error.message);
    console.error('Install Rust (https://rustup.rs/) and ensure cargo is on PATH.');
    return 1;
  }

  return result.status ?? 1;
}

const ranAsCli = (() => {
  try {
    const here = fileURLToPath(import.meta.url);
    return process.argv[1] && resolve(process.argv[1]) === resolve(here);
  } catch {
    return false;
  }
})();

if (ranAsCli) {
  const code = runUorBuildSync();
  if (code !== 0) process.exit(code);
  console.error('[uor-build-ontology] OK');
}
