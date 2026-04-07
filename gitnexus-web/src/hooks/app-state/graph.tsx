import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import type { GraphNode, NodeLabel } from 'gitnexus-shared';
import type { KnowledgeGraph } from '../../core/graph/types';
import { DEFAULT_VISIBLE_LABELS, DEFAULT_VISIBLE_EDGES, type EdgeType } from '../../lib/constants';
import {
  type UorOntologyInventory,
  type UorOntologyPerspective,
  type UorOntologyTermsPayload,
  uorPerspectiveRequiresOntologyTerms,
} from '../../lib/uor-ontology-types';

interface GraphStateContextValue {
  graph: KnowledgeGraph | null;
  setGraph: (graph: KnowledgeGraph | null) => void;
  selectedNode: GraphNode | null;
  setSelectedNode: (node: GraphNode | null) => void;
  visibleLabels: NodeLabel[];
  toggleLabelVisibility: (label: NodeLabel) => void;
  visibleEdgeTypes: EdgeType[];
  toggleEdgeVisibility: (edgeType: EdgeType) => void;
  depthFilter: number | null;
  setDepthFilter: (depth: number | null) => void;
  highlightedNodeIds: Set<string>;
  setHighlightedNodeIds: (ids: Set<string>) => void;
  /** Hosted UOR: extracted IRI lists for ontology perspectives */
  uorOntologyTerms: UorOntologyTermsPayload | null;
  setUorOntologyTerms: (t: UorOntologyTermsPayload | null) => void;
  uorOntologyInventory: UorOntologyInventory | null;
  setUorOntologyInventory: (inv: UorOntologyInventory | null) => void;
  uorOntologyPerspective: UorOntologyPerspective;
  setUorOntologyPerspective: (p: UorOntologyPerspective) => void;
  /** Limit to one namespace module (`spec/src/namespaces/<key>.rs`); null = all */
  uorNamespaceFilter: string | null;
  setUorNamespaceFilter: (k: string | null) => void;
}

const GraphStateContext = createContext<GraphStateContextValue | null>(null);

export const GraphStateProvider = ({ children }: { children: ReactNode }) => {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [visibleLabels, setVisibleLabels] = useState<NodeLabel[]>(DEFAULT_VISIBLE_LABELS);
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState<EdgeType[]>(DEFAULT_VISIBLE_EDGES);
  const [depthFilter, setDepthFilter] = useState<number | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  const [uorOntologyTerms, setUorOntologyTerms] = useState<UorOntologyTermsPayload | null>(null);
  const [uorOntologyInventory, setUorOntologyInventory] = useState<UorOntologyInventory | null>(
    null,
  );
  const [uorOntologyPerspective, setUorOntologyPerspective] =
    useState<UorOntologyPerspective>('all');
  const [uorNamespaceFilter, setUorNamespaceFilter] = useState<string | null>(null);

  useEffect(() => {
    if (uorPerspectiveRequiresOntologyTerms(uorOntologyPerspective) && !uorOntologyTerms) {
      setUorOntologyPerspective('all');
    }
  }, [uorOntologyPerspective, uorOntologyTerms]);

  const setGraphWrapped = useCallback(
    (g: KnowledgeGraph | null) => {
      setGraph(g);
      if (!g) {
        setUorOntologyTerms(null);
        setUorOntologyInventory(null);
        setUorOntologyPerspective('all');
        setUorNamespaceFilter(null);
      }
    },
    [setGraph],
  );

  const toggleLabelVisibility = useCallback((label: NodeLabel) => {
    setVisibleLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }, []);

  const toggleEdgeVisibility = useCallback((edgeType: EdgeType) => {
    setVisibleEdgeTypes((prev) =>
      prev.includes(edgeType) ? prev.filter((e) => e !== edgeType) : [...prev, edgeType],
    );
  }, []);

  const value = useMemo<GraphStateContextValue>(
    () => ({
      graph,
      setGraph: setGraphWrapped,
      selectedNode,
      setSelectedNode,
      visibleLabels,
      toggleLabelVisibility,
      visibleEdgeTypes,
      toggleEdgeVisibility,
      depthFilter,
      setDepthFilter,
      highlightedNodeIds,
      setHighlightedNodeIds,
      uorOntologyTerms,
      setUorOntologyTerms,
      uorOntologyInventory,
      setUorOntologyInventory,
      uorOntologyPerspective,
      setUorOntologyPerspective,
      uorNamespaceFilter,
      setUorNamespaceFilter,
    }),
    [
      graph,
      setGraphWrapped,
      selectedNode,
      visibleLabels,
      visibleEdgeTypes,
      depthFilter,
      highlightedNodeIds,
      uorOntologyTerms,
      uorOntologyInventory,
      uorOntologyPerspective,
      uorNamespaceFilter,
    ],
  );

  return <GraphStateContext.Provider value={value}>{children}</GraphStateContext.Provider>;
};

export const useGraphState = (): GraphStateContextValue => {
  const ctx = useContext(GraphStateContext);
  if (!ctx) {
    throw new Error('useGraphState must be used within a GraphStateProvider');
  }
  return ctx;
};
