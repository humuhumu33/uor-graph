/**
 * Load pre-exported GitNexus graph from static assets (GitHub Pages hosted mode).
 * Manifest: `${BASE_URL}uor-hosted/manifest.json`
 * Optional `ontology-terms.json` supplies IRIs for class/property/individual perspectives (see `uor-ontology-types`).
 * (Future: optional second layer of OWL axiom edges from JSON-LD — see docs/UOR_INDEX.md § Future: OWL structure subgraph.)
 */
import type { GraphNode, GraphRelationship } from 'gitnexus-shared';
import type { UorOntologyInventory, UorOntologyTermsPayload } from '../lib/uor-ontology-types';

export type HostedManifest = {
  version: number;
  projectName: string;
  repository?: string;
  gitRef: string | null;
  resolvedSha: string;
  nodeCount: number;
  edgeCount: number;
  chunks: { id: string; path: string }[];
  /** When set, graph was post-filtered to these repo-relative trees (e.g. `spec,public,website`). */
  hostedScope?: string;
  /** Authoritative ontology inventory from upstream `spec/src/counts.rs` at export time. */
  ontologyInventory?: UorOntologyInventory;
};

export type HostedGraphPayload = {
  manifest: HostedManifest;
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  ontologyTerms: UorOntologyTermsPayload | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Returns null if manifest is missing (404) or invalid.
 */
export async function tryLoadHostedUorGraph(): Promise<HostedGraphPayload | null> {
  const base = import.meta.env.BASE_URL || '/';
  const manifestUrl = new URL('uor-hosted/manifest.json', window.location.origin + base).href;

  let manifest: HostedManifest;
  try {
    const res = await fetch(manifestUrl, { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    manifest = (await res.json()) as HostedManifest;
  } catch {
    return null;
  }

  if (!manifest.chunks?.length || !manifest.resolvedSha) return null;

  const termsUrl = new URL('uor-hosted/ontology-terms.json', window.location.origin + base).href;
  let ontologyTerms: UorOntologyTermsPayload | null = null;
  try {
    const tr = await fetch(termsUrl, { method: 'GET' });
    if (tr.ok) {
      ontologyTerms = (await tr.json()) as UorOntologyTermsPayload;
    }
  } catch {
    ontologyTerms = null;
  }

  const nodes: GraphNode[] = [];
  const relationships: GraphRelationship[] = [];

  for (const ch of manifest.chunks) {
    const rel = `uor-hosted/${ch.path.replace(/^\//, '')}`;
    const chunkUrl = new URL(rel, window.location.origin + base).href;
    const part = await fetchJson<{ nodes: GraphNode[]; relationships: GraphRelationship[] }>(
      chunkUrl,
    );
    nodes.push(...part.nodes);
    relationships.push(...part.relationships);
  }

  return { manifest, nodes, relationships, ontologyTerms };
}
