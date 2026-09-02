import { FloorEditorClient } from "@/components/admin/FloorEditorClient";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function FloorEditorPage({ params }: { params: { id: string } }) {
  const floor = await prisma.floor.findUnique({
    where: { id: params.id },
    include: { floorBlocks: true, pathNodes: { include: { outgoingEdges: true } } },
  });
  if (!floor) notFound();

  const tenants = await prisma.tenant.findMany({
    where: { floorId: floor.id },
    include: { category: true },
  });

  const nodes = floor.pathNodes.map((n) => ({
    id: n.id,
    nodeName: n.nodeName,
    type: n.type as import("@/lib/pathfinding").PathNodeType,
    positionX: n.positionX,
    positionY: n.positionY,
    positionZ: n.positionZ,
  }));
  const edges = floor.pathNodes.flatMap((n) =>
    n.outgoingEdges.map((e) => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      weight: e.weight,
      isAccessible: e.isAccessible,
    })),
  );

  return (
    <div className="h-full flex flex-col">
      <FloorEditorClient
        floorId={floor.id}
        floorName={floor.floorName}
        imageUrl={floor.image2dURL}
        tenants={tenants}
        initial={{
          blocks: floor.floorBlocks.map(b => ({
            ...b,
            shape: b.shape as "BOX" | "CYLINDER" | "WEDGE"
          })),
          nodes,
          edges,
        }}
      />
    </div>
  );
}
