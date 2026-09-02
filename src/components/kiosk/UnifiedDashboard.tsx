"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { computeRouteAction } from "@/app/actions/kiosk";
import { useKioskStore, type KioskTenant } from "@/store/useKioskStore";
import type { FloorBlockMesh } from "@/components/3d/FloorModel";
import type { GraphNode, PathResult } from "@/lib/pathfinding";
import type { CategoryOption } from "@/components/kiosk/CategorySelector";
import { HomeSearch } from "./HomeSearch";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PathfindingCanvas = dynamic(
  () => import("@/components/kiosk/PathfindingCanvas").then((m) => m.PathfindingCanvas),
  { ssr: false },
);

export function UnifiedDashboard({
  tenants,
  categories,
  blocks,
  nodes,
  startNodeId,
}: {
  tenants: KioskTenant[];
  categories: CategoryOption[];
  blocks: FloorBlockMesh[];
  nodes: GraphNode[];
  startNodeId: string | null;
}) {
  const selectedTenantId = useKioskStore((s) => s.selectedTenantId);
  const setSelectedTenant = useKioskStore((s) => s.setSelectedTenant);
  const [route, setRoute] = useState<PathResult | null>(null);

  const tenant = useMemo(() => tenants.find((t) => t.id === selectedTenantId), [tenants, selectedTenantId]);
  const goal = tenant?.entranceNodeId ?? null;

  useEffect(() => {
    if (!startNodeId || !goal) {
       setRoute(null);
       return;
    }
    computeRouteAction(startNodeId, goal).then(setRoute);
  }, [startNodeId, goal]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      
      {/* FULL SCREEN MAP (Only visible when a store is tapped) */}
      <AnimatePresence>
        {selectedTenantId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0 }}
            className="absolute inset-0 z-30 bg-[#0a0a0a]"
          >
            <div className="absolute inset-0">
              <PathfindingCanvas blocks={blocks} nodes={nodes} route={route} />
            </div>
            
            {/* Overlay */}
            <div className="absolute top-8 left-8 z-40 w-96 pointer-events-none">
                <button 
                  onClick={() => setSelectedTenant(null)} 
                  className="pointer-events-auto flex h-14 items-center gap-3 rounded-full bg-white px-6 font-bold text-black shadow-2xl hover:bg-slate-200 active:scale-95 transition-all mb-6"
                >
                  <ArrowLeft className="h-6 w-6" /> Back to Stores
                </button>

               {route?.found && (
                 <div className="rounded-3xl border border-white/10 bg-black/80 p-6 backdrop-blur-xl shadow-2xl pointer-events-auto">
                    <h2 className="text-xl font-bold text-white mb-4">Directions to {tenant?.tenantName}</h2>
                    <ol className="space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-2">
                       {route.steps.map((s) => (
                         <li key={s.node.id} className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-4 py-3 text-sky-100 font-medium">
                           {s.instruction}
                         </li>
                       ))}
                    </ol>
                 </div>
               )}
               {!route?.found && goal && (
                  <div className="rounded-3xl border border-rose-500/20 bg-black/80 p-6 backdrop-blur-xl shadow-2xl pointer-events-auto">
                    <p className="text-rose-400 font-medium">Cannot find a connected path to this store.</p>
                  </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* FULL SCREEN DIRECTORY (Visible by default) */}
      <div className="relative h-full w-full z-20 flex flex-col">
         <HomeSearch tenants={tenants} categories={categories} />
      </div>
    </div>
  );
}
