"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { computeRouteAction } from "@/app/actions/kiosk";
import type { FloorBlockMesh } from "@/components/3d/FloorModel";
import type { GraphNode, PathResult } from "@/lib/pathfinding";
import type { KioskTenant } from "@/store/useKioskStore";
import { useKioskStore } from "@/store/useKioskStore";

const PathfindingCanvas = dynamic(
  () => import("@/components/kiosk/PathfindingCanvas").then((m) => m.PathfindingCanvas),
  { ssr: false },
);

export function DirectionsView({
  tenants,
  blocks,
  nodes,
  startNodeId,
  initialTenantId,
}: {
  tenants: KioskTenant[];
  blocks: FloorBlockMesh[];
  nodes: GraphNode[];
  startNodeId: string | null;
  initialTenantId?: string;
}) {
  const setSelectedTenant = useKioskStore((s) => s.setSelectedTenant);
  const [tenantId, setTenantId] = useState(initialTenantId ?? tenants[0]?.id ?? "");
  const [route, setRoute] = useState<PathResult | null>(null);

  const tenant = useMemo(() => tenants.find((t) => t.id === tenantId), [tenants, tenantId]);
  const goal = tenant?.entranceNodeId ?? null;

  useEffect(() => {
    if (initialTenantId) setSelectedTenant(initialTenantId);
  }, [initialTenantId, setSelectedTenant]);

  useEffect(() => {
    if (!startNodeId || !goal) return;
    computeRouteAction(startNodeId, goal).then(setRoute);
  }, [startNodeId, goal]);

  return (
    <>
      <div className="fixed inset-0 z-0">
        <PathfindingCanvas blocks={blocks} nodes={nodes} route={route} />
      </div>
      
      <div className="relative z-10 w-full max-w-sm px-6 pt-28 pointer-events-none">
        <aside className="space-y-4 rounded-3xl border border-white/20 bg-black/60 p-6 backdrop-blur-xl shadow-2xl pointer-events-auto">
          <h2 className="text-xl font-bold text-white">Live pathfinder</h2>
          <label className="block text-sm font-semibold text-slate-300">Destination</label>
          <select
            className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-white backdrop-blur focus:bg-slate-800"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id} className="text-black">
                {t.tenantName} ({t.floor.floorCode})
              </option>
            ))}
          </select>
          <ol className="space-y-2 text-sm">
            {route?.found ? (
              route.steps.map((s) => (
                <li key={s.node.id} className="rounded-xl bg-sky-900/40 border border-sky-400/20 px-3 py-2 text-sky-100 font-medium">
                  {s.instruction}
                </li>
              ))
            ) : !goal ? (
              <li className="text-slate-400 italic">This store does not have an entrance door assigned.</li>
            ) : (
              <li className="text-rose-400 italic">Cannot find a connected path. Please make sure the nodes are connected.</li>
            )}
          </ol>
        </aside>
      </div>
    </>
  );
}
