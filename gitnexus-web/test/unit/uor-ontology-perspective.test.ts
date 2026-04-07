import { describe, expect, it } from 'vitest';
import Graph from 'graphology';
import type { SigmaEdgeAttributes, SigmaNodeAttributes } from '../../src/lib/graph-adapter';
import {
  applyUorOntologyPerspectiveToSigma,
  namespaceKeyFromIri,
  nodeVisibleForUorPerspective,
  uorSubstrateEdgeVisibleForPerspective,
} from '../../src/lib/uor-ontology-perspective';
import type { UorOntologyTermsPayload } from '../../src/lib/uor-ontology-types';
import { UOR_ONTOLOGY_IRI_PREFIX } from '../../src/lib/uor-ontology-types';

function baseNode(
  id: string,
  overrides: Partial<SigmaNodeAttributes> & Pick<SigmaNodeAttributes, 'label' | 'filePath'>,
): SigmaNodeAttributes {
  return {
    x: 0,
    y: 0,
    size: 4,
    color: '#000',
    nodeType: 'Class',
    hidden: false,
    ...overrides,
  };
}

describe('uor-ontology-perspective', () => {
  it('namespaceKeyFromIri extracts module key from ontology IRI', () => {
    expect(namespaceKeyFromIri(`${UOR_ONTOLOGY_IRI_PREFIX}schema/Datum`)).toBe('schema');
    expect(namespaceKeyFromIri('https://example.com/other')).toBeNull();
  });

  const terms: UorOntologyTermsPayload = {
    classIris: [`${UOR_ONTOLOGY_IRI_PREFIX}schema/Datum`],
    propertyIris: [],
    individualIris: [],
    namespaceModuleKeys: ['schema'],
  };

  it('uorSubstrateEdgeVisibleForPerspective is true iff both endpoints match', () => {
    const inNs: SigmaNodeAttributes = baseNode('a', {
      label: 'Datum',
      filePath: 'spec/src/namespaces/schema.rs',
    });
    const outNs: SigmaNodeAttributes = baseNode('b', {
      label: 'Other',
      filePath: 'spec/src/foo.rs',
    });
    expect(uorSubstrateEdgeVisibleForPerspective(inNs, inNs, 'classes', null, terms)).toBe(true);
    expect(uorSubstrateEdgeVisibleForPerspective(inNs, outNs, 'classes', null, terms)).toBe(false);
  });

  it('applyUorOntologyPerspectiveToSigma leaves edges visible when perspective is all', () => {
    const g = new Graph<SigmaNodeAttributes, SigmaEdgeAttributes>();
    g.addNode('a', baseNode('a', { label: 'Datum', filePath: 'spec/src/namespaces/schema.rs' }));
    g.addNode('b', baseNode('b', { label: 'X', filePath: 'spec/src/foo.rs' }));
    const e = g.addEdge('a', 'b', { size: 1, color: '#000', relationType: 'CALLS' });
    g.setEdgeAttribute(e, 'hidden', true);

    applyUorOntologyPerspectiveToSigma(g, 'all', null, terms);
    expect(g.getEdgeAttribute(e, 'hidden')).toBe(false);
  });

  it('hides edge between class-matching and non-matching endpoints under classes perspective', () => {
    const g = new Graph<SigmaNodeAttributes, SigmaEdgeAttributes>();
    g.addNode('a', baseNode('a', { label: 'Datum', filePath: 'spec/src/namespaces/schema.rs' }));
    g.addNode('b', baseNode('b', { label: 'Other', filePath: 'spec/src/foo.rs' }));
    const e = g.addEdge('a', 'b', { size: 1, color: '#000', relationType: 'CALLS' });

    applyUorOntologyPerspectiveToSigma(g, 'classes', null, terms);
    expect(nodeVisibleForUorPerspective(g.getNodeAttributes('a'), 'classes', null, terms)).toBe(
      true,
    );
    expect(nodeVisibleForUorPerspective(g.getNodeAttributes('b'), 'classes', null, terms)).toBe(
      false,
    );
    expect(g.getNodeAttribute('a', 'hidden')).toBe(false);
    expect(g.getNodeAttribute('b', 'hidden')).toBe(true);
    expect(g.getEdgeAttribute(e, 'hidden')).toBe(true);
  });

  it('hides edge when an endpoint is base-hidden even if both match UOR', () => {
    const g = new Graph<SigmaNodeAttributes, SigmaEdgeAttributes>();
    g.addNode(
      'a',
      baseNode('a', { label: 'Datum', filePath: 'spec/src/namespaces/schema.rs', hidden: true }),
    );
    g.addNode('b', baseNode('b', { label: 'Datum', filePath: 'spec/src/namespaces/schema.rs' }));
    const e = g.addEdge('a', 'b', { size: 1, color: '#000', relationType: 'CALLS' });

    applyUorOntologyPerspectiveToSigma(g, 'classes', null, terms);
    expect(g.getNodeAttribute('a', 'hidden')).toBe(true);
    expect(g.getNodeAttribute('b', 'hidden')).toBe(false);
    expect(g.getEdgeAttribute(e, 'hidden')).toBe(true);
  });

  it('namespaces perspective filters by spec namespace paths without ontology-terms.json', () => {
    const g = new Graph<SigmaNodeAttributes, SigmaEdgeAttributes>();
    g.addNode('a', baseNode('a', { label: 'Datum', filePath: 'spec/src/namespaces/schema.rs' }));
    g.addNode('w', baseNode('w', { label: 'Page', filePath: 'website/src/foo.md' }));
    const e = g.addEdge('a', 'w', { size: 1, color: '#000', relationType: 'IMPORTS' });

    applyUorOntologyPerspectiveToSigma(g, 'namespaces', null, null);
    expect(g.getNodeAttribute('a', 'hidden')).toBe(false);
    expect(g.getNodeAttribute('w', 'hidden')).toBe(true);
    expect(g.getEdgeAttribute(e, 'hidden')).toBe(true);
  });

  it('individuals perspective matches JSON-LD-derived IRI (generated individuals, not regex-only)', () => {
    const termsWithInd: UorOntologyTermsPayload = {
      classIris: [],
      propertyIris: [],
      individualIris: [`${UOR_ONTOLOGY_IRI_PREFIX}schema/pi1`],
      namespaceModuleKeys: ['schema'],
    };
    const pi1 = baseNode('n', { label: 'pi1', filePath: 'spec/src/namespaces/schema.rs' });
    expect(nodeVisibleForUorPerspective(pi1, 'individuals', null, termsWithInd)).toBe(true);
  });
});
