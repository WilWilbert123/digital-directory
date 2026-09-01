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
    type: n.type,
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
    <div>
      <h1 className="mb-2 text-3xl font-bold">{floor.floorName} editor</h1>
      <p className="mb-6 text-slate-400">Extrude blocks, drop nodes, and connect walkable edges.</p>
      <FloorEditorClient
        floorId={floor.id}
        imageUrl={floor.image2dURL}
        tenants={tenants}
        initial={{
          blocks: floor.floorBlocks.map(b => ({
            ...b,
            shape: b.shape as "BOX" | "CYLINDER"
          })),
          nodes,
          edges,
        }}
      />
    </div>
  );
}
