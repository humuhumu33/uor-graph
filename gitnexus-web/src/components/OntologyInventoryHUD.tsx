import { useEffect } from 'react';
import { useAppState } from '../hooks/useAppState';
import {
  UOR_FOUNDATION_SITE_BASE,
  UOR_FOUNDATION_SITE_HREF,
  UOR_ONTOLOGY_PERSPECTIVE_OPTIONS,
  uorPerspectiveRequiresOntologyTerms,
} from '../lib/uor-ontology-types';
import { hostedGithubLinksFromMeta } from '../lib/uor-github-links';

/**
 * Ontology inventory line + perspective switcher (hosted UOR graph only), aligned with
 * [UOR Foundation — Ontology Inventory](https://uor-foundation.github.io/UOR-Framework/).
 * Counts use manifest `ontologyInventory` when present (authoritative `spec/src/counts.rs`).
 */
export const OntologyInventoryHUD = () => {
  const {
    hostedGraphMode,
    uorOntologyInventory,
    uorOntologyTerms,
    uorOntologyPerspective,
    setUorOntologyPerspective,
    uorNamespaceFilter,
    setUorNamespaceFilter,
    hostedGraphMeta,
  } = useAppState();

  const namespaceModuleSiteUrl =
    uorNamespaceFilter != null && uorNamespaceFilter !== ''
      ? `${UOR_FOUNDATION_SITE_BASE}/namespaces/${encodeURIComponent(uorNamespaceFilter)}/`
      : `${UOR_FOUNDATION_SITE_BASE}/namespaces/`;

  const { commitUrl: hostedCommitUrl, treeUrl: hostedTreeUrl } =
    hostedGithubLinksFromMeta(hostedGraphMeta);

  useEffect(() => {
    if (uorOntologyPerspective !== 'namespaces') {
      setUorNamespaceFilter(null);
    }
  }, [uorOntologyPerspective, setUorNamespaceFilter]);

  if (!hostedGraphMode) return null;

  const ns =
    uorOntologyInventory?.namespaces ?? uorOntologyTerms?.namespaceModuleKeys.length ?? '—';
  const cl = uorOntologyInventory?.classes ?? uorOntologyTerms?.classIris.length ?? '—';
  const pr = uorOntologyInventory?.properties ?? uorOntologyTerms?.propertyIris.length ?? '—';
  const ind = uorOntologyInventory?.individuals ?? uorOntologyTerms?.individualIris.length ?? '—';

  const keys = uorOntologyTerms?.namespaceModuleKeys ?? [];

  return (
    <div className="flex flex-col items-center gap-2 border-b border-border-subtle/60 bg-deep/90 px-4 py-2.5 backdrop-blur-sm">
      <div className="text-center">
        <h2 className="text-sm font-semibold tracking-tight text-text-primary">
          Ontology Inventory
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          <span>{ns} namespaces</span>
          <span className="mx-1.5 text-border-default">·</span>
          <span>{cl} classes</span>
          <span className="mx-1.5 text-border-default">·</span>
          <span>{pr} properties</span>
          <span className="mx-1.5 text-border-default">·</span>
          <span>{ind} named individuals</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {UOR_ONTOLOGY_PERSPECTIVE_OPTIONS.map((p) => {
          const needsTerms = uorPerspectiveRequiresOntologyTerms(p.id);
          const disabled = needsTerms && !uorOntologyTerms;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              title={
                disabled
                  ? 'Load ontology-terms.json (export) to filter by extracted IRIs'
                  : undefined
              }
              onClick={() => setUorOntologyPerspective(p.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                disabled
                  ? 'cursor-not-allowed border-border-subtle/50 bg-elevated/40 text-text-muted/50'
                  : uorOntologyPerspective === p.id
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-border-subtle bg-elevated/80 text-text-muted hover:border-border-default hover:text-text-secondary'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {uorOntologyPerspective === 'namespaces' && keys.length > 0 && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="uor-ns-filter"
            className="text-[10px] tracking-wide text-text-muted uppercase"
          >
            Namespace module
          </label>
          <select
            id="uor-ns-filter"
            value={uorNamespaceFilter ?? ''}
            onChange={(e) => setUorNamespaceFilter(e.target.value || null)}
            className="max-w-[220px] rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs text-text-primary"
          >
            <option value="">All namespaces</option>
            {keys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <a
            href={namespaceModuleSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium text-accent underline hover:text-accent/90"
          >
            Open on site
          </a>
        </div>
      )}
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[10px] text-text-muted/90">
        <a
          href={UOR_FOUNDATION_SITE_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent/90 underline hover:text-accent"
        >
          Foundation site
        </a>
        {hostedCommitUrl && hostedGraphMeta ? (
          <>
            <span className="text-border-default">·</span>
            <a
              href={hostedCommitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-secondary"
              title="GitHub commit for this graph"
            >
              Commit {hostedGraphMeta.resolvedSha.slice(0, 7)}
            </a>
          </>
        ) : null}
        {hostedTreeUrl && (
          <>
            <span className="text-border-default">·</span>
            <a
              href={hostedTreeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-secondary"
              title="Browse repository tree at this pin"
            >
              Repo tree
            </a>
          </>
        )}
      </p>
      <p className="max-w-xl text-center text-[10px] text-text-muted/90">
        Perspectives filter the graph by matching ontology IRIs from the UOR spec to code symbols in
        each namespace module (see Reference above). Inventory numbers match upstream{' '}
        <code className="rounded bg-elevated px-1">spec/src/counts.rs</code>. Perspective filters
        use IRIs from export-time extraction (classes/properties are near-complete; some generated
        individuals may not map to visible graph symbols). Use Code Inspector links (Site, Ref,
        Repo) on a selection to jump to the public site, generated docs HTML, or the pinned GitHub
        file.
      </p>
    </div>
  );
};
