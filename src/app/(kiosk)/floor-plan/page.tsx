import prisma from "@/lib/prisma";
import { FloorPlanView } from "@/components/kiosk/FloorPlanView";
import { graphFromRecords } from "@/lib/pathfinding";

export default async function FloorPlanPage() {
  const [floors, blocks, nodes, edges] = await Promise.all([
    prisma.floor.findMany({ where: { isActive: true }, orderBy: { levelNumber: "asc" } }),
    prisma.floorBlock.findMany({ include: { tenant: { include: { category: true } } } }),
    prisma.pathNode.findMany(),
    prisma.pathEdge.findMany(),
  ]);

  const graph = graphFromRecords({ nodes, edges });
  const blocksByFloor: Record<string, Array<{
    id: string;
    blockName: string;
    posX: number;
    posY: number;
    posZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    color?: string;
    label?: string;
  }>> = {};

  for (const b of blocks) {
    (blocksByFloor[b.floorId] ??= []).push({
      id: b.id,
      blockName: b.blockName,
      posX: b.posX,
      posY: b.posY,
      posZ: b.posZ,
      scaleX: b.scaleX,
      scaleY: b.scaleY,
      scaleZ: b.scaleZ,
      color: b.tenant?.category.colorHex,
      label: b.tenant?.tenantName ?? b.blockName,
    });
  }

  return (
    <FloorPlanView
      floors={floors.map((f) => ({ id: f.id, floorName: f.floorName, floorCode: f.floorCode, image2dURL: f.image2dURL }))}
      blocksByFloor={blocksByFloor}
      nodes={graph.nodes}
    />
  );
}
