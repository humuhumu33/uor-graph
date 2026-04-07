/**
 * Build process flow data from in-memory graph (hosted static mode — no Cypher backend).
 */
import type { KnowledgeGraph } from '../core/graph/types';
import type { ProcessData, ProcessStep } from './mermaid-generator';

function stepsForProcess(graph: KnowledgeGraph, processId: string): ProcessStep[] {
  const rels = graph.relationships.filter(
    (r) => r.type === 'STEP_IN_PROCESS' && r.targetId === processId,
  );
  rels.sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
  const steps: ProcessStep[] = [];
  for (const r of rels) {
    const n = graph.nodes.find((node) => node.id === r.sourceId);
    if (!n) continue;
    steps.push({
      id: r.sourceId,
      name: n.properties.name ?? 'Unknown',
      filePath: n.properties.filePath,
      stepNumber: r.step ?? 0,
    });
  }
  return steps;
}

function callsBetweenSteps(
  graph: KnowledgeGraph,
  stepIds: Set<string>,
): Array<{ from: string; to: string; type: string }> {
  return graph.relationships
    .filter(
      (r) =>
        r.type === 'CALLS' &&
        stepIds.has(r.sourceId) &&
        stepIds.has(r.targetId) &&
        r.sourceId !== r.targetId,
    )
    .map((r) => ({ from: r.sourceId, to: r.targetId, type: r.type }));
}

export function buildProcessDataFromGraph(
  graph: KnowledgeGraph,
  processId: string,
  label: string,
  processType: string,
): ProcessData {
  const steps = stepsForProcess(graph, processId);
  const stepIds = new Set(steps.map((s) => s.id));
  const edges = callsBetweenSteps(graph, stepIds);
  const processNode = graph.nodes.find((n) => n.id === processId);
  const clusters = processNode?.properties.communities ?? [];

  return {
    id: processId,
    label,
    processType: processType as 'cross_community' | 'intra_community',
    steps,
    edges,
    clusters,
  };
}

export function buildCombinedAllProcessesData(
  graph: KnowledgeGraph,
  processIds: string[],
  label: string,
): ProcessData {
  const allStepsMap = new Map<string, ProcessStep>();
  const allEdges: Array<{ from: string; to: string; type: string }> = [];

  for (const pid of processIds) {
    for (const s of stepsForProcess(graph, pid)) {
      if (!allStepsMap.has(s.id)) allStepsMap.set(s.id, s);
    }
  }

  const allSteps = Array.from(allStepsMap.values());
  const stepIds = new Set(allSteps.map((s) => s.id));
  for (const e of callsBetweenSteps(graph, stepIds)) {
    allEdges.push(e);
  }

  return {
    id: 'combined-all',
    label,
    processType: 'cross_community',
    steps: allSteps,
    edges: allEdges,
    clusters: [],
  };
}

export function stepIdsForProcess(graph: KnowledgeGraph, processId: string): string[] {
  return stepsForProcess(graph, processId).map((s) => s.id);
}
