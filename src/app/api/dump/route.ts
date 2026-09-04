import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { graphFromRecords, findPath, type PathNodeType } from '@/lib/pathfinding';

export async function GET() {
  const rawNodes = await prisma.pathNode.findMany();
  const edges = await prisma.pathEdge.findMany();
  const tenants = await prisma.tenant.findMany();
  const floors = await prisma.floor.findMany();

  const floorLevelMap = Object.fromEntries(floors.map(f => [f.id, f.levelNumber]));

  // Explicitly construct typed node records to prevent TypeScript widening 'type' to string
  const nodes: Array<{
    id: string;
    nodeName: string;
    type: PathNodeType;
    floorId: string;
    positionX: number;
    positionY: number;
    positionZ: number;
  }> = rawNodes.map((n) => ({
    id: n.id,
    nodeName: n.nodeName,
    type: n.type as PathNodeType,
    floorId: n.floorId,
    positionX: n.positionX,
    positionY: n.positionY,
    positionZ: n.positionZ,
  }));

  const verticalNodes = nodes.filter(n => ["ELEVATOR", "ESCALATOR", "STAIRS"].includes(n.type));
  const verticalGroups = verticalNodes.reduce((acc, n) => {
    const key = n.nodeName.trim().toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {} as Record<string, typeof nodes>);

  const extraEdges: Array<{ id: string; fromNodeId: string; toNodeId: string; weight: number; isAccessible: boolean }> = [];
  for (const group of Object.values(verticalGroups)) {
    if (group.length < 2) continue;
    group.sort((a, b) => floorLevelMap[a.floorId] - floorLevelMap[b.floorId]);
    for (let i = 0; i < group.length - 1; i++) {
      extraEdges.push({ id: `cross_${i}_a`, fromNodeId: group[i].id, toNodeId: group[i+1].id, weight: 15, isAccessible: true });
      extraEdges.push({ id: `cross_${i}_b`, fromNodeId: group[i+1].id, toNodeId: group[i].id, weight: 15, isAccessible: true });
    }
  }

  const allEdges = [...edges, ...extraEdges];
  const graph = graphFromRecords({ nodes, edges: allEdges });

  const startNode = nodes.find(n => n.type === 'KIOSK_START');
  const cyberzone = tenants.find(t => t.tenantName.toLowerCase().includes('cyber'));
  
  if (!startNode || !cyberzone || !cyberzone.entranceNodeId) {
    return NextResponse.json({ error: "Missing start, cyberzone, or entrance node", startNode, cyberzone });
  }

  const route = findPath(graph, startNode.id, cyberzone.entranceNodeId);

  return NextResponse.json({
    route,
    startNode,
    cyberzone,
    verticalGroups: Object.fromEntries(Object.entries(verticalGroups).map(([k, v]) => [k, v.map(n => ({ id: n.id, type: n.type, name: n.nodeName, floor: floorLevelMap[n.floorId] }))])),
    edgesToGoal: allEdges.filter(e => e.toNodeId === cyberzone.entranceNodeId || e.fromNodeId === cyberzone.entranceNodeId),
  });
}
