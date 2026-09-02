"use server";

import prisma from "@/lib/prisma";
import { findPath, graphFromRecords } from "@/lib/pathfinding";

export async function searchTenantsAction(query: string, categoryId?: string | null) {
  const q = query.trim();
  return prisma.tenant.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            OR: [
              { tenantName: { contains: q, mode: "insensitive" } },
              { tenantCode: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { category: true, floor: true },
    orderBy: { tenantName: "asc" },
    take: 60,
  });
}

export async function getWayfindingGraphAction() {
  const [nodes, edges, floors] = await Promise.all([
    prisma.pathNode.findMany(),
    prisma.pathEdge.findMany(),
    prisma.floor.findMany(),
  ]);

  const floorLevelMap = Object.fromEntries(floors.map(f => [f.id, f.levelNumber]));

  // Auto-connect cross-floor vertical nodes (Elevators, Escalators, Stairs) by normalized name match
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
      extraEdges.push({
        id: `cross-${group[i].id}-${group[i+1].id}`,
        fromNodeId: group[i].id,
        toNodeId: group[i+1].id,
        weight: 15,
        isAccessible: true,
      });
      extraEdges.push({
        id: `cross-${group[i+1].id}-${group[i].id}`,
        fromNodeId: group[i+1].id,
        toNodeId: group[i].id,
        weight: 15,
        isAccessible: true,
      });
    }
  }

  const allEdges = [...edges, ...extraEdges];

  const FLOOR_HEIGHT = 8;
  const adjustY = (floorId: string, y: number) => y + ((floorLevelMap[floorId] || 1) - 1) * FLOOR_HEIGHT;

  const adjustedNodes = nodes.map(n => ({
    ...n,
    type: n.type as import("@/lib/pathfinding").PathNodeType,
    positionY: adjustY(n.floorId, n.positionY),
  }));

  return { nodes: adjustedNodes, edges: allEdges, floorLevelMap, FLOOR_HEIGHT };
}

export async function computeRouteAction(startNodeId: string, goalNodeId: string) {
  const { nodes, edges } = await getWayfindingGraphAction();
  const path = findPath(graphFromRecords({ nodes, edges }), startNodeId, goalNodeId);

  if (path.found) {
    const { routeAroundObstacles } = await import("@/lib/obstacleAvoidance");
    const blocks = await prisma.floorBlock.findMany();
    
    const dodgedPolyline = [];
    for (let i = 0; i < path.polyline.length - 1; i++) {
      const start = path.polyline[i];
      const end = path.polyline[i + 1];
      
      const startNode = path.nodes[i];
      const endNode = path.nodes[i + 1];
      
      // If jumping floors, do straight line
      if (startNode.floorId !== endNode.floorId || Math.abs(start.y - end.y) > 0.1) {
        if (dodgedPolyline.length === 0) dodgedPolyline.push(start);
        dodgedPolyline.push(end);
        continue;
      }

      const floorBlocks = blocks.filter(b => b.floorId === startNode.floorId);
      const segment = routeAroundObstacles(start, end, floorBlocks);
      if (dodgedPolyline.length > 0) {
        dodgedPolyline.push(...segment.slice(1));
      } else {
        dodgedPolyline.push(...segment);
      }
    }
    path.polyline = dodgedPolyline.length > 0 ? dodgedPolyline : path.polyline;
  }

  return path;
}

export async function getKioskBootstrapAction() {
  const [floors, categories, tenants, nodes, start] = await Promise.all([
    prisma.floor.findMany({ where: { isActive: true }, orderBy: { levelNumber: "asc" } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { categoryName: "asc" } }),
    prisma.tenant.findMany({
      where: { isActive: true },
      include: { category: true, floor: true },
      orderBy: { tenantName: "asc" },
    }),
    prisma.pathNode.findMany(),
    prisma.pathNode.findFirst({
      where: {
        OR: [{ type: "KIOSK_START" }, { nodeName: process.env.NEXT_PUBLIC_DEFAULT_START_NODE ?? "KIOSK-L1" }],
      },
    }),
  ]);
  return { floors, categories, tenants, nodes, startNodeId: start?.id ?? nodes[0]?.id ?? null };
}
