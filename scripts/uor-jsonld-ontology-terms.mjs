/**
 * Extract OWL entity IRIs from uor-build output (`public/uor.foundation.jsonld`).
 * Classifies @graph nodes by @type (handles arrays and owl:FunctionalProperty pairs).
 *
 * Counts must match `spec/src/counts.rs`: CLASSES, PROPERTIES, INDIVIDUALS.
 * Manifest `ontologyInventory.properties` uses NAMESPACE_PROPERTIES (895); the global
 * `https://uor.foundation/space` annotation property is included in propertyIris (896 total).
 */

/**
 * @param {unknown} typeField
 * @returns {string[]}
 */
export function flattenJsonLdTypes(typeField) {
  if (typeField == null) return [];
  if (Array.isArray(typeField)) {
    return typeField.flatMap((x) => flattenJsonLdTypes(x));
  }
  return [String(typeField)];
}

/**
 * @param {string[]} types
 * @returns {'class' | 'property' | 'individual' | null}
 */
export function classifyJsonLdEntity(types) {
  const t = flattenJsonLdTypes(types);
  if (t.length === 0) return null;

  const isOntology = t.some(
    (x) =>
      x === 'owl:Ontology' ||
      x === 'http://www.w3.org/2002/07/owl#Ontology' ||
      x.endsWith('#Ontology'),
  );
  if (isOntology) return null;

  const isNamedIndividual = t.some(
    (x) =>
      x === 'owl:NamedIndividual' ||
      x === 'http://www.w3.org/2002/07/owl#NamedIndividual' ||
      x.endsWith('#NamedIndividual'),
  );
  if (isNamedIndividual) return 'individual';

  const isClass = t.some(
    (x) => x === 'owl:Class' || x === 'http://www.w3.org/2002/07/owl#Class' || x.endsWith('#Class'),
  );
  if (isClass) return 'class';

  const isProperty = t.some((x) => {
    if (
      x === 'owl:ObjectProperty' ||
      x === 'owl:DatatypeProperty' ||
      x === 'owl:AnnotationProperty' ||
      x === 'owl:FunctionalProperty'
    ) {
      return true;
    }
    return /#(Object|Datatype|Annotation|Functional)Property$/.test(x);
  });
  if (isProperty) return 'property';

  return null;
}

/**
 * @param {unknown} doc - parsed JSON-LD root `{ @context, @graph }`
 * @returns {{ classIris: string[]; propertyIris: string[]; individualIris: string[] }}
 */
export function extractOntologyTermsFromJsonLdDocument(doc) {
  const graph = doc && typeof doc === 'object' && '@graph' in doc ? doc['@graph'] : null;
  if (!Array.isArray(graph)) {
    throw new Error('Invalid JSON-LD: missing @graph array');
  }

  const classIris = [];
  const propertyIris = [];
  const individualIris = [];

  for (const node of graph) {
    if (!node || typeof node !== 'object') continue;
    const id = node['@id'];
    if (typeof id !== 'string' || id === '') continue;

    const kind = classifyJsonLdEntity(node['@type']);
    if (kind === 'class') classIris.push(id);
    else if (kind === 'property') propertyIris.push(id);
    else if (kind === 'individual') individualIris.push(id);
  }

  const uniq = (arr) => [...new Set(arr)].sort();
  return {
    classIris: uniq(classIris),
    propertyIris: uniq(propertyIris),
    individualIris: uniq(individualIris),
  };
}

/**
 * @param {{ classIris: string[]; propertyIris: string[]; individualIris: string[] }} terms
 * @param {{ classes: number; propertiesTotal: number; individuals: number }} expected from counts.rs
 */
export function assertOntologyTermsMatchCounts(terms, expected) {
  const { classes, propertiesTotal, individuals } = expected;
  const errs = [];
  if (terms.classIris.length !== classes) {
    errs.push(`classes: JSON-LD ${terms.classIris.length} vs counts.rs CLASSES ${classes}`);
  }
  if (terms.propertyIris.length !== propertiesTotal) {
    errs.push(
      `properties: JSON-LD ${terms.propertyIris.length} vs counts.rs PROPERTIES ${propertiesTotal}`,
    );
  }
  if (terms.individualIris.length !== individuals) {
    errs.push(
      `individuals: JSON-LD ${terms.individualIris.length} vs counts.rs INDIVIDUALS ${individuals}`,
    );
  }
  if (errs.length) {
    throw new Error(`ontology-terms.json IRI counts mismatch:\n  ${errs.join('\n  ')}`);
  }
}
