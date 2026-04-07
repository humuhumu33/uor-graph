/**
 * Export GitNexus graph JSON for GitHub Pages hosted mode.
 * Run from repo root after: gitnexus build, uor:prepare, uor:analyze:local
 *
 * Writes gitnexus-web/public/uor-hosted/manifest.json + chunks/*.json
 *
 * Ontology IRIs in `ontology-terms.json` come from `uor-build` output (`public/uor.foundation.jsonld`),
 * not regex on Rust sources. Set `UOR_SKIP_ONTOLOGY_BUILD=1` only if jsonld is already materialized.
 *
 * The exported **code graph** is the full GitNexus web graph for the indexed UOR checkout (no path
 * subset filter): re-run `uor:prepare` + `uor:analyze:local` after changing `config/uor.gitnexusignore`.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { runUorBuildSync } from './uor-build-ontology.mjs';
import {
  assertOntologyTermsMatchCounts,
  extractOntologyTermsFromJsonLdDocument,
} from './uor-jsonld-ontology-terms.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const lockPath = path.join(root, 'config', 'uor-upstream.lock.json');
const lbugPath = path.join(root, 'third_party', 'UOR-Framework', '.gitnexus', 'lbug');
const outDir = path.join(root, 'gitnexus-web', 'public', 'uor-hosted');
const chunksDir = path.join(outDir, 'chunks');

const uorRoot = path.join(root, 'third_party', 'UOR-Framework');

/**
 * Authoritative counts from `spec/src/counts.rs` (same source as the public site).
 */
async function readOntologyInventoryFromCounts() {
  const countsPath = path.join(uorRoot, 'spec', 'src', 'counts.rs');
  const text = await fs.readFile(countsPath, 'utf8');
  const take = (name) => {
    const m = text.match(new RegExp(`pub const ${name}: usize = (\\d+);`));
    return m ? parseInt(m[1], 10) : 0;
  };
  return {
    namespaces: take('NAMESPACES'),
    classes: take('CLASSES'),
    /** Namespace-level property count (matches foundation site hero line). */
    properties: take('NAMESPACE_PROPERTIES'),
    /** Total OWL properties including global `uor:space` — must match `ontology-terms.json` propertyIris length. */
    propertiesTotal: take('PROPERTIES'),
    individuals: take('INDIVIDUALS'),
  };
}

async function readNamespaceModuleKeys() {
  const nsDir = path.join(uorRoot, 'spec', 'src', 'namespaces');
  const dirEnt = await fs.readdir(nsDir);
  return dirEnt
    .filter((f) => f.endsWith('.rs') && f !== 'mod.rs')
    .map((f) => f.replace(/\.rs$/, ''))
    .sort();
}

async function ensureUorFoundationJsonLd() {
  const jsonldPath = path.join(uorRoot, 'public', 'uor.foundation.jsonld');
  let skip = process.env.UOR_SKIP_ONTOLOGY_BUILD === '1';
  try {
    await fs.access(jsonldPath);
  } catch {
    skip = false;
  }
  if (skip) {
    console.log(
      'Using existing public/uor.foundation.jsonld (UOR_SKIP_ONTOLOGY_BUILD=1). Remove env var to rebuild.',
    );
    return;
  }
  const code = runUorBuildSync();
  if (code !== 0) process.exit(code);
}

async function extractOntologyTermsFromBuild() {
  const jsonldPath = path.join(uorRoot, 'public', 'uor.foundation.jsonld');
  const raw = await fs.readFile(jsonldPath, 'utf8');
  const doc = JSON.parse(raw);
  const extracted = extractOntologyTermsFromJsonLdDocument(doc);
  const namespaceModuleKeys = await readNamespaceModuleKeys();
  return { ...extracted, namespaceModuleKeys };
}

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

  await ensureUorFoundationJsonLd();

  // Load compiled gitnexus (same as CLI); use file URL for Windows ESM resolution
  const distRoot = path.join(root, 'gitnexus', 'dist');
  const { withLbugDb } = await import(
    pathToFileURL(path.join(distRoot, 'core', 'lbug', 'lbug-adapter.js')).href
  );
  const { buildWebGraph } = await import(
    pathToFileURL(path.join(distRoot, 'core', 'graph', 'build-web-graph.js')).href
  );

  const raw = await withLbugDb(lbugPath, () => buildWebGraph(false));
  const graph = raw;

  const ontologyInventoryFull = await readOntologyInventoryFromCounts();
  const { propertiesTotal, ...ontologyInventory } = ontologyInventoryFull;

  const ontologyTerms = await extractOntologyTermsFromBuild();
  assertOntologyTermsMatchCounts(ontologyTerms, {
    classes: ontologyInventoryFull.classes,
    propertiesTotal: ontologyInventoryFull.propertiesTotal,
    individuals: ontologyInventoryFull.individuals,
  });
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, 'ontology-terms.json'),
    JSON.stringify(ontologyTerms, null, 2),
    'utf8',
  );

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
    hostedScope: 'full-workspace',
    ontologyInventory,
  };

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const stat = await fs.stat(chunkPath);
  console.log(
    `Wrote ${outDir}/manifest.json + ${chunkRelPath} (${graph.nodes.length} nodes, ${graph.relationships.length} edges, ${(stat.size / 1024 / 1024).toFixed(2)} MiB)`,
  );
  console.log(
    `  Ontology terms: ${ontologyTerms.classIris.length} classes, ${ontologyTerms.propertyIris.length} properties, ${ontologyTerms.individualIris.length} individuals, ${ontologyTerms.namespaceModuleKeys.length} namespace modules`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
