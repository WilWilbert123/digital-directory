import prisma from "@/lib/prisma";
import { getKioskBootstrapAction, getWayfindingGraphAction } from "@/app/actions/kiosk";
import { graphFromRecords } from "@/lib/pathfinding";
import { UnifiedDashboard } from "@/components/kiosk/UnifiedDashboard";

export default async function KioskHomePage() {
  const data = await getKioskBootstrapAction();
  
  const blocks = await prisma.floorBlock.findMany({ 
    include: { tenant: { include: { category: true } } } 
  });

  const { nodes, edges, floorLevelMap, FLOOR_HEIGHT } = await getWayfindingGraphAction();
  const graph = graphFromRecords({ nodes, edges });

  const adjustY = (floorId: string, y: number) => y + ((floorLevelMap[floorId] || 1) - 1) * FLOOR_HEIGHT;

  const mappedBlocks = blocks.map((b) => ({
    id: b.id,
    blockName: b.blockName,
    levelNumber: floorLevelMap[b.floorId] || 1,
    posX: b.posX,
    posY: adjustY(b.floorId, b.posY),
    posZ: b.posZ,
    scaleX: b.scaleX,
    scaleY: b.scaleY,
    scaleZ: b.scaleZ,
    shape: b.shape.trim().toUpperCase(),
    pointsData: b.pointsData,
    color: b.tenant?.category.colorHex,
    label: b.tenant?.tenantName ?? b.blockName,
  }));

  const categories = await prisma.category.findMany({
    orderBy: { categoryName: "asc" }
  });

  return (
    <UnifiedDashboard
      tenants={data.tenants}
      categories={categories.map(c => ({
        id: c.id,
        categoryCode: c.categoryCode,
        categoryName: c.categoryName,
        colorHex: c.colorHex,
        iconURL: c.iconURL
      }))}
      startNodeId={data.startNodeId}
      nodes={graph.nodes}
      blocks={mappedBlocks}
    />
  );
}
