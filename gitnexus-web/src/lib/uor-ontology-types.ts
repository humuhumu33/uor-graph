/**
 * UOR hosted graph: ontology inventory + perspectives aligned with the public site
 * [UOR Foundation](https://uor-foundation.github.io/UOR-Framework/) (“Ontology Inventory” line).
 *
 * **Scope:** Inventory counts mirror upstream `third_party/UOR-Framework/spec/src/counts.rs`
 * (`NAMESPACES`, `CLASSES`, `NAMESPACE_PROPERTIES`, `INDIVIDUALS`). The knowledge graph export
 * includes `spec/`, `public/`, and `website/` — ontology **symbols** map from `spec/src/namespaces/*.rs`;
 * `website/` nodes are **documentation site sources** (pages) alongside code graph entities.
 */

/** Public docs site (Ontology Inventory, Reference → Namespaces, etc.). */
export const UOR_FOUNDATION_SITE_HREF = 'https://uor-foundation.github.io/UOR-Framework/' as const;

/** Same site without trailing slash — use when joining path segments. */
export const UOR_FOUNDATION_SITE_BASE = UOR_FOUNDATION_SITE_HREF.replace(/\/+$/, '') as string;

/**
 * Base IRI for OWL entity ids in the pinned spec (`Class { id: "…" }`, etc.), per namespace docs.
 * Distinct from the docs site URL above.
 */
export const UOR_ONTOLOGY_IRI_PREFIX = 'https://uor.foundation/' as const;

export type UorOntologyPerspective =
  | 'all'
  | 'namespaces'
  | 'classes'
  | 'properties'
  | 'individuals';

/** UI + graph: same four facets as the foundation homepage inventory line. */
export const UOR_ONTOLOGY_PERSPECTIVE_OPTIONS: readonly {
  id: UorOntologyPerspective;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'namespaces', label: 'Namespaces' },
  { id: 'classes', label: 'Classes' },
  { id: 'properties', label: 'Properties' },
  { id: 'individuals', label: 'Individuals' },
] as const;

/** True when switching to this perspective needs `ontology-terms.json` (IRI lists). */
export function uorPerspectiveRequiresOntologyTerms(p: UorOntologyPerspective): boolean {
  return p === 'classes' || p === 'properties' || p === 'individuals';
}

/** Authoritative counts from upstream `spec/src/counts.rs` (embedded in manifest at export). */
export interface UorOntologyInventory {
  namespaces: number;
  classes: number;
  properties: number;
  individuals: number;
}

/** Extracted IRI lists + namespace module keys (from `spec/src/namespaces/*.rs`). */
export interface UorOntologyTermsPayload {
  classIris: string[];
  propertyIris: string[];
  individualIris: string[];
  /** Basenames without `.rs` — one ontology namespace module per file. */
  namespaceModuleKeys: string[];
}
