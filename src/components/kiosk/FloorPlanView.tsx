"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { FloorBlockMesh } from "@/components/3d/FloorModel";
import type { GraphNode } from "@/lib/pathfinding";

const PathfindingCanvas = dynamic(
  () => import("@/components/kiosk/PathfindingCanvas").then((m) => m.PathfindingCanvas),
  { ssr: false },
);

type FloorLite = { id: string; floorName: string; floorCode: string; image2dURL: string | null };

export function FloorPlanView({
  floors,
  blocksByFloor,
  nodes,
}: {
  floors: FloorLite[];
  blocksByFloor: Record<string, FloorBlockMesh[]>;
  nodes: GraphNode[];
}) {
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "");
  const floor = floors.find((f) => f.id === floorId);
  const blocks = blocksByFloor[floorId] ?? [];
  const floorNodes = useMemo(() => nodes.filter((n) => n.floorId === floorId), [nodes, floorId]);

  return (
    <>
      <div className="fixed inset-0 z-0">
        <PathfindingCanvas blocks={blocks} nodes={floorNodes} route={null} imageUrl={floor?.image2dURL} />
      </div>
      
      <div className="relative z-10 w-full px-6">
        <div className="inline-flex flex-wrap gap-2 rounded-3xl border border-white/20 bg-black/60 p-4 backdrop-blur-xl shadow-2xl">
          {floors.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFloorId(f.id)}
              className={`rounded-full px-6 py-2.5 text-sm font-bold shadow-lg transition-all ${
                f.id === floorId 
                  ? "bg-sky-500 text-white shadow-sky-500/25 scale-105" 
                  : "bg-white/10 text-slate-300 hover:bg-white/20"
              }`}
            >
              {f.floorName}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
