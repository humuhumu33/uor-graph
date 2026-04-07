/**
 * Load pre-exported GitNexus graph from static assets (GitHub Pages hosted mode).
 * Manifest: `${BASE_URL}uor-hosted/manifest.json`
 */
import type { GraphNode, GraphRelationship } from 'gitnexus-shared';

export type HostedManifest = {
  version: number;
  projectName: string;
  repository?: string;
  gitRef: string | null;
  resolvedSha: string;
  nodeCount: number;
  edgeCount: number;
  chunks: { id: string; path: string }[];
};

export type HostedGraphPayload = {
  manifest: HostedManifest;
  nodes: GraphNode[];
  relationships: GraphRelationship[];
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

  return { manifest, nodes, relationships };
}
