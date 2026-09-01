import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { graphFromRecords, findPath } from '@/lib/pathfinding';

export async function GET() {
  const nodes = await prisma.pathNode.findMany();
  const edges = await prisma.pathEdge.findMany();
  const tenants = await prisma.tenant.findMany();
  const floors = await prisma.floor.findMany();

  const floorLevelMap = Object.fromEntries(floors.map(f => [f.id, f.levelNumber]));

  const verticalNodes = nodes.filter(n => ["ELEVATOR", "ESCALATOR", "STAIRS"].includes(n.type));
  const verticalGroups = verticalNodes.reduce((acc, n) => {
    const key = n.nodeName.trim().toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {} as Record<string, typeof nodes>);

  const extraEdges = [];
  for (const group of Object.values(verticalGroups)) {
    if (group.length < 2) continue;
    group.sort((a, b) => floorLevelMap[a.floorId] - floorLevelMap[b.floorId]);
    for (let i = 0; i < group.length - 1; i++) {
      extraEdges.push({ id: `cross1`, fromNodeId: group[i].id, toNodeId: group[i+1].id, weight: 15, isAccessible: true });
      extraEdges.push({ id: `cross2`, fromNodeId: group[i+1].id, toNodeId: group[i].id, weight: 15, isAccessible: true });
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
