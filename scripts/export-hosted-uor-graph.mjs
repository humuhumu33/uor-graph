/**
 * Export GitNexus graph JSON for GitHub Pages hosted mode.
 * Run from repo root after: gitnexus build, uor:prepare, uor:analyze:local
 *
 * Writes gitnexus-web/public/uor-hosted/manifest.json + chunks/*.json
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const lockPath = path.join(root, 'config', 'uor-upstream.lock.json');
const lbugPath = path.join(root, 'third_party', 'UOR-Framework', '.gitnexus', 'lbug');
const outDir = path.join(root, 'gitnexus-web', 'public', 'uor-hosted');
const chunksDir = path.join(outDir, 'chunks');

async function main() {
  const lockRaw = await fs.readFile(lockPath, 'utf8');
  const lock = JSON.parse(lockRaw);
  const resolvedSha = lock.resolved_sha;
  if (!resolvedSha) {
    console.error('Missing resolved_sha in config/uor-upstream.lock.json');
    process.exit(1);
  }

  try {
    await fs.access(lbugPath);
  } catch {
    console.error(`Ladybug DB not found at ${lbugPath}. Run npm run uor:analyze:local first.`);
    process.exit(1);
  }

  // Load compiled gitnexus (same as CLI); use file URL for Windows ESM resolution
  const distRoot = path.join(root, 'gitnexus', 'dist');
  const { withLbugDb } = await import(
    pathToFileURL(path.join(distRoot, 'core', 'lbug', 'lbug-adapter.js')).href
  );
  const { buildWebGraph } = await import(
    pathToFileURL(path.join(distRoot, 'core', 'graph', 'build-web-graph.js')).href
  );

  const graph = await withLbugDb(lbugPath, () => buildWebGraph(false));

  await fs.mkdir(chunksDir, { recursive: true });

  const chunkId = '0';
  const chunkRelPath = `chunks/${chunkId}.json`;
  const chunkPath = path.join(outDir, chunkRelPath);
  await fs.writeFile(chunkPath, JSON.stringify(graph), 'utf8');

  const manifest = {
    version: 1,
    projectName: 'UOR-Framework',
    repository: lock.repository ?? 'https://github.com/UOR-Foundation/UOR-Framework',
    gitRef: lock.git_ref ?? null,
    resolvedSha,
    nodeCount: graph.nodes.length,
    edgeCount: graph.relationships.length,
    chunks: [{ id: chunkId, path: chunkRelPath }],
  };

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const stat = await fs.stat(chunkPath);
  console.log(
    `Wrote ${outDir}/manifest.json + ${chunkRelPath} (${graph.nodes.length} nodes, ${graph.relationships.length} edges, ${(stat.size / 1024 / 1024).toFixed(2)} MiB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
