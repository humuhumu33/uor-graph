/**
 * Run: node --test scripts/uor-jsonld-ontology-terms.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertOntologyTermsMatchCounts,
  classifyJsonLdEntity,
  extractOntologyTermsFromJsonLdDocument,
  flattenJsonLdTypes,
} from './uor-jsonld-ontology-terms.mjs';

test('flattenJsonLdTypes handles string and arrays', () => {
  assert.deepEqual(flattenJsonLdTypes('owl:Class'), ['owl:Class']);
  assert.deepEqual(
    flattenJsonLdTypes(['owl:NamedIndividual', 'https://uor.foundation/schema/Datum']),
    ['owl:NamedIndividual', 'https://uor.foundation/schema/Datum'],
  );
});

test('classifyJsonLdEntity: ontology and OWL entities', () => {
  assert.equal(classifyJsonLdEntity(['owl:Ontology']), null);
  assert.equal(classifyJsonLdEntity('owl:Class'), 'class');
  assert.equal(
    classifyJsonLdEntity(['owl:DatatypeProperty', 'owl:FunctionalProperty']),
    'property',
  );
  assert.equal(classifyJsonLdEntity('owl:AnnotationProperty'), 'property');
  assert.equal(
    classifyJsonLdEntity(['owl:NamedIndividual', 'https://uor.foundation/schema/Datum']),
    'individual',
  );
});

test('extractOntologyTermsFromJsonLdDocument: miniature @graph', () => {
  const doc = {
    '@context': {},
    '@graph': [
      { '@id': 'https://uor.foundation/', '@type': 'owl:Ontology' },
      { '@id': 'https://uor.foundation/space', '@type': 'owl:AnnotationProperty' },
      { '@id': 'https://uor.foundation/u/', '@type': 'owl:Ontology' },
      { '@id': 'https://uor.foundation/u/Address', '@type': 'owl:Class' },
      {
        '@id': 'https://uor.foundation/u/glyph',
        '@type': ['owl:DatatypeProperty', 'owl:FunctionalProperty'],
      },
      {
        '@id': 'https://uor.foundation/schema/pi1',
        '@type': ['owl:NamedIndividual', 'https://uor.foundation/schema/Datum'],
      },
    ],
  };
  const t = extractOntologyTermsFromJsonLdDocument(doc);
  assert.equal(t.classIris.length, 1);
  assert.equal(t.propertyIris.length, 2);
  assert.equal(t.individualIris.length, 1);
  assert.ok(t.propertyIris.includes('https://uor.foundation/space'));
  assert.ok(t.individualIris.includes('https://uor.foundation/schema/pi1'));
});

test('assertOntologyTermsMatchCounts throws on mismatch', () => {
  assert.throws(() =>
    assertOntologyTermsMatchCounts(
      {
        classIris: ['a'],
        propertyIris: [],
        individualIris: [],
      },
      { classes: 2, propertiesTotal: 0, individuals: 0 },
    ),
  );
});
