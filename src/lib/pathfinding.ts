export type Vec3 = { x: number; y: number; z: number };

export type PathNodeType =
  | "WALKWAY"
  | "TENANT_ENTRANCE"
  | "ELEVATOR"
  | "ESCALATOR"
  | "STAIRS"
  | "KIOSK_START";

export type GraphNode = {
  id: string;
  nodeName: string;
  type: PathNodeType;
  floorId: string;
  position: Vec3;
};

export type GraphEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  weight: number;
  isAccessible: boolean;
};

export type WayfindingGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type PathStep = {
  node: GraphNode;
  instruction: string;
  isVertical: boolean;
};

export type PathResult = {
  found: boolean;
  distance: number;
  nodes: GraphNode[];
  polyline: Vec3[];
  steps: PathStep[];
};

const VERTICAL_TYPES: PathNodeType[] = ["ELEVATOR", "ESCALATOR", "STAIRS"];

function heuristic(a: GraphNode, b: GraphNode) {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const dz = a.position.z - b.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function euclidean(a: GraphNode, b: GraphNode) {
  return heuristic(a, b);
}

function buildAdjacency(graph: WayfindingGraph, accessibleOnly = true) {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const adj = new Map<string, { to: string; weight: number }[]>();

  for (const node of graph.nodes) adj.set(node.id, []);

  for (const edge of graph.edges) {
    if (accessibleOnly && !edge.isAccessible) continue;
    const from = nodes.get(edge.fromNodeId);
    const to = nodes.get(edge.toNodeId);
    if (!from || !to) continue;
    const w = edge.weight > 0 ? edge.weight : euclidean(from, to);
    adj.get(from.id)!.push({ to: to.id, weight: w });
    adj.get(to.id)!.push({ to: from.id, weight: w });
  }

  return { nodes, adj };
}

function reconstruct(cameFrom: Map<string, string>, current: string) {
  const path = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!;
    path.unshift(current);
  }
  return path;
}

function instructionFor(prev: GraphNode | undefined, curr: GraphNode, next: GraphNode | undefined) {
  if (!prev) return `Start at ${curr.nodeName}`;
  if (VERTICAL_TYPES.includes(curr.type) && next && curr.floorId !== next.floorId) {
    const verb =
      curr.type === "ELEVATOR" ? "Take the elevator" : curr.type === "ESCALATOR" ? "Ride the escalator" : "Use the stairs";
    return `${verb} at ${curr.nodeName} to the next level`;
  }
  if (curr.type === "TENANT_ENTRANCE") return `Arrive at ${curr.nodeName}`;
  return `Continue along ${curr.nodeName}`;
}

/**
 * Multi-floor A* over a 3D node graph. Vertical connectors (elevator / escalator / stairs)
 * are first-class nodes; their edges encode floor transitions via Z (level) change.
 */
export function findPath(graph: WayfindingGraph, startId: string, goalId: string): PathResult {
  const empty: PathResult = { found: false, distance: Infinity, nodes: [], polyline: [], steps: [] };
  const { nodes, adj } = buildAdjacency(graph);
  const start = nodes.get(startId);
  const goal = nodes.get(goalId);
  if (!start || !goal) return empty;

  const open = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startId, 0]]);
  const fScore = new Map<string, number>([[startId, heuristic(start, goal)]]);

  while (open.size > 0) {
    let current = "";
    let best = Infinity;
    for (const id of Array.from(open)) {
      const f = fScore.get(id) ?? Infinity;
      if (f < best) {
        best = f;
        current = id;
      }
    }

    if (current === goalId) {
      const ids = reconstruct(cameFrom, current);
      const pathNodes = ids.map((id) => nodes.get(id)!);
      const distance = gScore.get(current) ?? 0;
      const steps: PathStep[] = pathNodes.map((node, i) => ({
        node,
        instruction: instructionFor(pathNodes[i - 1], node, pathNodes[i + 1]),
        isVertical: VERTICAL_TYPES.includes(node.type),
      }));
      return {
        found: true,
        distance,
        nodes: pathNodes,
        polyline: pathNodes.map((n) => n.position),
        steps,
      };
    }

    open.delete(current);
    for (const neighbor of adj.get(current) ?? []) {
      const tentative = (gScore.get(current) ?? Infinity) + neighbor.weight;
      if (tentative < (gScore.get(neighbor.to) ?? Infinity)) {
        cameFrom.set(neighbor.to, current);
        gScore.set(neighbor.to, tentative);
        const nNode = nodes.get(neighbor.to)!;
        fScore.set(neighbor.to, tentative + heuristic(nNode, goal));
        open.add(neighbor.to);
      }
    }
  }

  return empty;
}

export function graphFromRecords(input: {
  nodes: Array<{
    id: string;
    nodeName: string;
    type: PathNodeType;
    floorId: string;
    positionX: number;
    positionY: number;
    positionZ: number;
  }>;
  edges: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    weight: number;
    isAccessible: boolean;
  }>;
}): WayfindingGraph {
  return {
    nodes: input.nodes.map((n) => ({
      id: n.id,
      nodeName: n.nodeName,
      type: n.type,
      floorId: n.floorId,
      position: { x: n.positionX, y: n.positionY, z: n.positionZ },
    })),
    edges: input.edges,
  };
}
