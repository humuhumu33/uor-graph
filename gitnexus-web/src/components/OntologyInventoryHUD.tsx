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
    <div className="flex flex-col items-center gap-3 border-b border-border-subtle/60 bg-deep/90 px-4 py-3 backdrop-blur-sm">
      <div className="text-center">
        <h2 className="text-base font-semibold tracking-tight text-text-primary">
          Ontology inventory
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
          <span>{ns} namespaces</span>
          <span className="mx-2 text-border-default">·</span>
          <span>{cl} classes</span>
          <span className="mx-2 text-border-default">·</span>
          <span>{pr} properties</span>
          <span className="mx-2 text-border-default">·</span>
          <span>{ind} individuals</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
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
                  ? 'Ontology term list not loaded — re-export with ontology-terms.json'
                  : `Show ${p.label.toLowerCase()}`
              }
              onClick={() => setUorOntologyPerspective(p.id)}
              className={`min-h-[2.25rem] rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                disabled
                  ? 'cursor-not-allowed border-border-subtle/50 bg-elevated/40 text-text-muted/60'
                  : uorOntologyPerspective === p.id
                    ? 'border-accent/45 bg-accent/12 text-accent'
                    : 'border-border-subtle bg-elevated/80 text-text-secondary hover:border-border-default hover:text-text-primary'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {uorOntologyPerspective === 'namespaces' && keys.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <label htmlFor="uor-ns-filter" className="text-sm text-text-secondary">
            Namespace
          </label>
          <select
            id="uor-ns-filter"
            value={uorNamespaceFilter ?? ''}
            onChange={(e) => setUorNamespaceFilter(e.target.value || null)}
            className="max-w-[240px] rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-sm text-text-primary"
          >
            <option value="">All</option>
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
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            Open on site
          </a>
        </div>
      )}
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-text-secondary">
        <a
          href={UOR_FOUNDATION_SITE_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline-offset-2 hover:underline"
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
              className="underline-offset-2 hover:text-text-primary hover:underline"
              title="This graph’s commit on GitHub"
            >
              {hostedGraphMeta.resolvedSha.slice(0, 7)}
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
              className="underline-offset-2 hover:text-text-primary hover:underline"
              title="Repository tree at this revision"
            >
              Source tree
            </a>
          </>
        )}
      </p>
      <p className="max-w-2xl text-center text-sm leading-relaxed text-text-muted">
        Filters follow ontology terms from the export. Use the code panel to open the public site,
        generated docs, or the file on GitHub.
      </p>
    </div>
  );
};
