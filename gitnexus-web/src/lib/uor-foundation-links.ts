/**
 * Map graph selections to URLs on the published UOR Foundation site.
 *
 * Mirrors `uor-website` / `website/src/extractor.rs` + `website/src/renderer.rs`:
 * - Namespace: `{base}/namespaces/{prefix}/`
 * - Class: `{base}/namespaces/{prefix}/#class-{local}`
 * - Property: `{base}/namespaces/{prefix}/#prop-{local}`
 * - Individual: `{base}/namespaces/{prefix}/#ind-{local}`
 * - Concept page: `{base}/concepts/{slug}/` for `website/content/concepts/{slug}.md`
 * - Long-form reference HTML (uor_docs linker): `{base}/docs/namespaces/{prefix}.html#{local}`
 *
 * @see https://uor-foundation.github.io/UOR-Framework/
 */
import type { GraphNode } from 'gitnexus-shared';
import { candidateIri, namespaceKeyFromFilePath } from './uor-ontology-perspective';
import type { UorOntologyTermsPayload } from './uor-ontology-types';
import { UOR_FOUNDATION_SITE_BASE } from './uor-ontology-types';
import { githubBlobUrl } from './uor-github-links';

/** Last path segment of an ontology IRI (matches Rust `local_name` / `fragment_from_iri`). */
export function ontologyIriLocalName(iri: string): string {
  const noFrag = iri.split('#')[0] ?? iri;
  const parts = noFrag.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? iri;
}

function classifyOntologyIri(
  iri: string,
  terms: UorOntologyTermsPayload,
): 'class' | 'property' | 'individual' | null {
  if (terms.classIris.includes(iri)) return 'class';
  if (terms.propertyIris.includes(iri)) return 'property';
  if (terms.individualIris.includes(iri)) return 'individual';
  return null;
}

/** Shared path + IRI resolution for namespace-module symbols (`spec/src/namespaces/<ns>.rs`). */
function ontologySymbolContext(
  filePath: string | undefined,
  symbolName: string | undefined,
): { nsKey: string; cand: string } | null {
  const fp = filePath?.replace(/\\/g, '/');
  const name = symbolName?.trim();
  if (!fp || !name) return null;
  const nsKey = namespaceKeyFromFilePath(fp);
  if (!nsKey) return null;
  const cand = candidateIri(nsKey, name);
  if (!cand) return null;
  return { nsKey, cand };
}

/**
 * When `terms` is set, deep-links to the matching table row on the namespace page.
 * Otherwise returns the namespace landing page only.
 */
export function uorFoundationUrlForOntologySymbol(
  filePath: string | undefined,
  symbolName: string | undefined,
  terms: UorOntologyTermsPayload | null,
): string | null {
  const ctx = ontologySymbolContext(filePath, symbolName);
  if (!ctx) return null;

  const nsUrl = `${UOR_FOUNDATION_SITE_BASE}/namespaces/${encodeURIComponent(ctx.nsKey)}/`;

  if (!terms) {
    return nsUrl;
  }

  const kind = classifyOntologyIri(ctx.cand, terms);
  const local = ontologyIriLocalName(ctx.cand);
  if (kind === 'class') return `${nsUrl}#class-${local}`;
  if (kind === 'property') return `${nsUrl}#prop-${local}`;
  if (kind === 'individual') return `${nsUrl}#ind-${local}`;
  return nsUrl;
}

/**
 * Generated reference HTML (`uor_docs` / `docs/src/linker.rs`): same local-name fragment for
 * classes, properties, and individuals.
 */
export function uorFoundationReferenceDocUrlForOntologySymbol(
  filePath: string | undefined,
  symbolName: string | undefined,
  terms: UorOntologyTermsPayload | null,
): string | null {
  if (!terms) return null;
  const ctx = ontologySymbolContext(filePath, symbolName);
  if (!ctx) return null;
  if (!classifyOntologyIri(ctx.cand, terms)) return null;
  const local = ontologyIriLocalName(ctx.cand);
  return `${UOR_FOUNDATION_SITE_BASE}/docs/namespaces/${encodeURIComponent(ctx.nsKey)}.html#${local}`;
}

/** Map `website/content/concepts/{slug}.md` → `/concepts/{slug}/` on the public site. */
export function uorFoundationUrlForWebsiteConceptFile(filePath: string | undefined): string | null {
  if (!filePath) return null;
  const n = filePath.replace(/\\/g, '/');
  const m = n.match(/website\/content\/concepts\/([^/]+)\.md$/i);
  if (!m) return null;
  return `${UOR_FOUNDATION_SITE_BASE}/concepts/${encodeURIComponent(m[1])}/`;
}

/**
 * Best URL for a graph node in hosted UOR mode: ontology anchor, concept page, or null.
 */
export function uorFoundationUrlForGraphNode(
  node: GraphNode | null,
  terms: UorOntologyTermsPayload | null,
): string | null {
  if (!node) return null;
  const fp = node.properties?.filePath as string | undefined;

  const concept = uorFoundationUrlForWebsiteConceptFile(fp);
  if (concept) return concept;

  const name = node.properties?.name as string | undefined;
  return uorFoundationUrlForOntologySymbol(fp, name, terms);
}

/** Reference HTML deep link when the node maps to an extracted ontology IRI. */
export function uorFoundationReferenceDocUrlForGraphNode(
  node: GraphNode | null,
  terms: UorOntologyTermsPayload | null,
): string | null {
  if (!node) return null;
  const fp = node.properties?.filePath as string | undefined;
  if (uorFoundationUrlForWebsiteConceptFile(fp)) return null;

  const name = node.properties?.name as string | undefined;
  return uorFoundationReferenceDocUrlForOntologySymbol(fp, name, terms);
}

/** Pinned GitHub blob uses manifest `repository` + `resolvedSha` (same shape as `HostedGraphMeta`). */
export type UorHostedGraphPin = { repository?: string; resolvedSha: string };

/**
 * Single pass for Code Inspector external links (Site / Ref / Repo) in hosted UOR mode.
 */
export function uorHostedCodeInspectorUrls(
  hostedMode: boolean,
  node: GraphNode | null,
  terms: UorOntologyTermsPayload | null,
  pin: UorHostedGraphPin | null | undefined,
): {
  site: string | null;
  referenceDoc: string | null;
  githubBlob: string | null;
} {
  if (!hostedMode || !node) {
    return { site: null, referenceDoc: null, githubBlob: null };
  }
  const site = uorFoundationUrlForGraphNode(node, terms);
  const referenceDoc = uorFoundationReferenceDocUrlForGraphNode(node, terms);
  let githubBlob: string | null = null;
  if (pin?.resolvedSha?.trim()) {
    const fp = node.properties?.filePath as string | undefined;
    const start = node.properties?.startLine as number | undefined;
    const end = node.properties?.endLine as number | undefined;
    const lineRange =
      typeof start === 'number' && start > 0
        ? { startLine: start, endLine: typeof end === 'number' && end > 0 ? end : start }
        : null;
    githubBlob = githubBlobUrl(pin.repository, pin.resolvedSha, fp, lineRange);
  }
  return { site, referenceDoc, githubBlob };
}
