import { describe, expect, it } from 'vitest';
import type { GraphNode } from 'gitnexus-shared';
import {
  ontologyIriLocalName,
  uorFoundationReferenceDocUrlForOntologySymbol,
  uorFoundationUrlForGraphNode,
  uorFoundationUrlForOntologySymbol,
  uorFoundationUrlForWebsiteConceptFile,
  uorHostedCodeInspectorUrls,
} from '../../src/lib/uor-foundation-links';
import type { UorOntologyTermsPayload } from '../../src/lib/uor-ontology-types';
import {
  UOR_FOUNDATION_SITE_BASE,
  UOR_ONTOLOGY_IRI_PREFIX,
} from '../../src/lib/uor-ontology-types';

describe('uor-foundation-links', () => {
  it('ontologyIriLocalName matches Rust local_name', () => {
    expect(ontologyIriLocalName(`${UOR_ONTOLOGY_IRI_PREFIX}schema/Datum`)).toBe('Datum');
  });

  it('builds uor_docs reference HTML URL with local fragment', () => {
    const terms: UorOntologyTermsPayload = {
      classIris: [`${UOR_ONTOLOGY_IRI_PREFIX}schema/Datum`],
      propertyIris: [],
      individualIris: [],
      namespaceModuleKeys: ['schema'],
    };
    expect(
      uorFoundationReferenceDocUrlForOntologySymbol(
        'spec/src/namespaces/schema.rs',
        'Datum',
        terms,
      ),
    ).toBe(`${UOR_FOUNDATION_SITE_BASE}/docs/namespaces/schema.html#Datum`);
  });

  it('builds namespace + class fragment URLs (uor-website extractor shape)', () => {
    const terms: UorOntologyTermsPayload = {
      classIris: [`${UOR_ONTOLOGY_IRI_PREFIX}schema/Datum`],
      propertyIris: [],
      individualIris: [],
      namespaceModuleKeys: ['schema'],
    };
    const url = uorFoundationUrlForOntologySymbol('spec/src/namespaces/schema.rs', 'Datum', terms);
    expect(url).toBe(`${UOR_FOUNDATION_SITE_BASE}/namespaces/schema/#class-Datum`);
  });

  it('falls back to namespace page without terms sidecar', () => {
    const url = uorFoundationUrlForOntologySymbol('spec/src/namespaces/schema.rs', 'Datum', null);
    expect(url).toBe(`${UOR_FOUNDATION_SITE_BASE}/namespaces/schema/`);
  });

  it('maps website concept markdown to /concepts/{slug}/', () => {
    expect(uorFoundationUrlForWebsiteConceptFile('website/content/concepts/ring.md')).toBe(
      `${UOR_FOUNDATION_SITE_BASE}/concepts/ring/`,
    );
    expect(uorFoundationUrlForWebsiteConceptFile('spec/src/foo.rs')).toBeNull();
  });

  it('uorHostedCodeInspectorUrls returns site ref and github in one pass', () => {
    const terms: UorOntologyTermsPayload = {
      classIris: [`${UOR_ONTOLOGY_IRI_PREFIX}schema/Datum`],
      propertyIris: [],
      individualIris: [],
      namespaceModuleKeys: ['schema'],
    };
    const node = {
      id: 'n1',
      label: 'Class',
      properties: {
        name: 'Datum',
        filePath: 'spec/src/namespaces/schema.rs',
        startLine: 10,
        endLine: 12,
      },
    } as GraphNode;
    const pin = {
      repository: 'https://github.com/UOR-Foundation/UOR-Framework',
      resolvedSha: 'sha1',
    };
    const out = uorHostedCodeInspectorUrls(true, node, terms, pin);
    expect(out.site).toContain('/namespaces/schema/#class-Datum');
    expect(out.referenceDoc).toContain('/docs/namespaces/schema.html#Datum');
    expect(out.githubBlob).toContain('/blob/sha1/spec/src/namespaces/schema.rs#L10-L12');
  });

  it('uorFoundationUrlForGraphNode prefers concept page over ontology', () => {
    const node = {
      id: 'n1',
      label: 'File',
      properties: {
        name: 'ring.md',
        filePath: 'website/content/concepts/ring.md',
      },
    } as GraphNode;
    expect(uorFoundationUrlForGraphNode(node, null)).toBe(
      `${UOR_FOUNDATION_SITE_BASE}/concepts/ring/`,
    );
  });
});
