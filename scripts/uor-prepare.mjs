/**
 * Copy config/uor.gitnexusignore into the UOR submodule before `gitnexus analyze`.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'config', 'uor.gitnexusignore');
const destDir = join(root, 'third_party', 'UOR-Framework');
const dest = join(destDir, '.gitnexusignore');

if (!existsSync(join(destDir, '.git'))) {
  console.error('Missing UOR submodule. Run: git submodule update --init --recursive');
  process.exit(1);
}

copyFileSync(src, dest);
console.log('Copied config/uor.gitnexusignore → third_party/UOR-Framework/.gitnexusignore');
