import type { SigmaNodeAttributes, SigmaEdgeAttributes } from './graph-adapter';
import type Graph from 'graphology';
import type { UorOntologyPerspective, UorOntologyTermsPayload } from './uor-ontology-types';
import { UOR_ONTOLOGY_IRI_PREFIX } from './uor-ontology-types';

function normalizeFp(fp: string | undefined): string {
  if (!fp) return '';
  return fp.replace(/\\/g, '/');
}

/** `spec/src/namespaces/schema.rs` → `schema` */
export function namespaceKeyFromFilePath(fp: string | undefined): string | null {
  const n = normalizeFp(fp);
  const m = n.match(/spec\/src\/namespaces\/([^/]+)\.rs$/);
  return m ? m[1] : null;
}

/** `https://uor.foundation/schema/Datum` → `schema` */
export function namespaceKeyFromIri(iri: string): string | null {
  if (!iri.startsWith(UOR_ONTOLOGY_IRI_PREFIX)) return null;
  const rest = iri.slice(UOR_ONTOLOGY_IRI_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  return rest.slice(0, slash);
}

/** Candidate OWL entity IRI for a code symbol in a namespace module file. */
export function candidateIri(
  nsKey: string | undefined,
  symbolName: string | undefined,
): string | null {
  if (!nsKey || !symbolName) return null;
  return `${UOR_ONTOLOGY_IRI_PREFIX}${nsKey}/${symbolName}`;
}

function termsAsSets(terms: UorOntologyTermsPayload | null) {
  if (!terms) return null;
  return {
    classes: new Set(terms.classIris),
    properties: new Set(terms.propertyIris),
    individuals: new Set(terms.individualIris),
  };
}

/**
 * Whether a graph node should stay visible under the current ontology perspective.
 * Uses file path + symbol name matching against extracted IRIs (same namespace key + local name).
 * **Namespaces** works with path rules only when `terms` is null; class/property/individual views need IRI lists.
 */
export function nodeVisibleForUorPerspective(
  attr: SigmaNodeAttributes,
  perspective: UorOntologyPerspective,
  namespaceFilter: string | null,
  terms: UorOntologyTermsPayload | null,
): boolean {
  if (perspective === 'all') return true;

  const fp = attr.filePath;
  const name = attr.label?.trim();
  const nsKey = namespaceKeyFromFilePath(fp);

  if (namespaceFilter) {
    if (nsKey !== namespaceFilter) return false;
  }

  if (perspective === 'namespaces') {
    // Ontology namespace modules only (see `spec/src/namespaces/*.rs` — aligns with site “33 namespaces”)
    return nsKey !== null;
  }

  if (!terms) {
    // Without ontology-terms.json, cannot match OWL entities; show full graph (no UOR narrowing).
    return true;
  }

  const sets = termsAsSets(terms);
  if (!sets) return true;

  if (!name || !nsKey) {
    return false;
  }

  const cand = candidateIri(nsKey, name);
  if (!cand) return false;

  if (perspective === 'classes') return sets.classes.has(cand);
  if (perspective === 'properties') return sets.properties.has(cand);
  if (perspective === 'individuals') return sets.individuals.has(cand);

  return true;
}

/**
 * Whether this edge lies in the UOR **relationship substrate** for the active perspective:
 * both endpoints qualify under {@link nodeVisibleForUorPerspective} (ignores base depth/label `hidden`).
 * Edges-first policy: classify relationships before composing with base filters on nodes.
 */
export function uorSubstrateEdgeVisibleForPerspective(
  sourceAttr: SigmaNodeAttributes,
  targetAttr: SigmaNodeAttributes,
  perspective: UorOntologyPerspective,
  namespaceFilter: string | null,
  terms: UorOntologyTermsPayload | null,
): boolean {
  return (
    nodeVisibleForUorPerspective(sourceAttr, perspective, namespaceFilter, terms) &&
    nodeVisibleForUorPerspective(targetAttr, perspective, namespaceFilter, terms)
  );
}

/**
 * Apply UOR perspective on top of existing `hidden` flags from label/depth filters.
 *
 * **Order (edges → nodes → compose):** (1) mark edges by UOR substrate eligibility, (2) apply UOR to
 * nodes together with base `hidden`, (3) set each edge hidden if substrate failed or either endpoint
 * is hidden after step 2. Graphology still requires nodes to exist before edges at build time; this
 * is the subgraph policy order for filtering.
 */
export function applyUorOntologyPerspectiveToSigma(
  graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>,
  perspective: UorOntologyPerspective,
  namespaceFilter: string | null,
  terms: UorOntologyTermsPayload | null,
): void {
  graph.forEachEdge((edge) => {
    graph.setEdgeAttribute(edge, 'hidden', false);
  });

  // Class/property/individual perspectives need IRI sidecar; namespaces can filter by path alone.
  if (perspective === 'all') return;
  if (!terms && perspective !== 'namespaces') return;

  // 1) Relationship substrate (UOR only — not depth/label base hidden)
  graph.forEachEdge((edge) => {
    const [source, target] = graph.extremities(edge);
    const substrateOk = uorSubstrateEdgeVisibleForPerspective(
      graph.getNodeAttributes(source),
      graph.getNodeAttributes(target),
      perspective,
      namespaceFilter,
      terms,
    );
    graph.setEdgeAttribute(edge, 'hidden', !substrateOk);
  });

  // 2) Nodes: base filter ∪ UOR
  graph.forEachNode((nodeId, attr) => {
    const baseHidden = attr.hidden === true;
    const uorOk = nodeVisibleForUorPerspective(attr, perspective, namespaceFilter, terms);
    graph.setNodeAttribute(nodeId, 'hidden', baseHidden || !uorOk);
  });

  // 3) Edges: substrate failure or either endpoint fully hidden after step 2
  graph.forEachEdge((edge) => {
    const [source, target] = graph.extremities(edge);
    const substrateFailed = graph.getEdgeAttribute(edge, 'hidden') === true;
    const s = graph.getNodeAttribute(source, 'hidden') === true;
    const t = graph.getNodeAttribute(target, 'hidden') === true;
    graph.setEdgeAttribute(edge, 'hidden', substrateFailed || s || t);
  });
}
