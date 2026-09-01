import prisma from "@/lib/prisma";
import { getKioskBootstrapAction, getWayfindingGraphAction } from "@/app/actions/kiosk";
import { DirectionsView } from "@/components/kiosk/DirectionsView";
import { graphFromRecords } from "@/lib/pathfinding";

export default async function DirectionsPage({ searchParams }: { searchParams: { tenant?: string } }) {
  const data = await getKioskBootstrapAction();
  
  const blocks = await prisma.floorBlock.findMany({ 
    include: { tenant: { include: { category: true } } } 
  });

  const { nodes, edges, floorLevelMap, FLOOR_HEIGHT } = await getWayfindingGraphAction();
  const graph = graphFromRecords({ nodes, edges });

  const adjustY = (floorId: string, y: number) => y + ((floorLevelMap[floorId] || 1) - 1) * FLOOR_HEIGHT;

  return (
    <DirectionsView
      tenants={data.tenants}
      startNodeId={data.startNodeId}
      initialTenantId={searchParams.tenant}
      nodes={graph.nodes}
      blocks={blocks.map((b) => ({
        id: b.id,
        blockName: b.blockName,
        posX: b.posX,
        posY: adjustY(b.floorId, b.posY),
        posZ: b.posZ,
        scaleX: b.scaleX,
        scaleY: b.scaleY,
        scaleZ: b.scaleZ,
        shape: b.shape,
        color: b.tenant?.category.colorHex,
        label: b.tenant?.tenantName ?? b.blockName,
      }))}
    />
  );
}
