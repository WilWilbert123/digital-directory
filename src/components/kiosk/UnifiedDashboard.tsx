"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { computeRouteAction } from "@/app/actions/kiosk";
import { useKioskStore, type KioskTenant } from "@/store/useKioskStore";
import type { FloorBlockMesh } from "@/components/3d/FloorModel";
import type { GraphNode, PathResult } from "@/lib/pathfinding";
import type { CategoryOption } from "@/components/kiosk/CategorySelector";
import { HomeSearch } from "./HomeSearch";
import { ArrowLeft, Play, Square } from "lucide-react";
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

  // Animation State
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);

  const tenant = useMemo(() => tenants.find((t) => t.id === selectedTenantId), [tenants, selectedTenantId]);
  const goal = tenant?.entranceNodeId ?? null;
  
  const targetLevel = useMemo(() => {
    const destLevel = tenant?.floor?.levelNumber ?? 1;
    const startNode = nodes.find((n) => n.id === startNodeId);
    const startLevel = startNode ? Math.round(startNode.position.y / 8) + 1 : 1;
    return Math.max(startLevel, destLevel);
  }, [tenant, nodes, startNodeId]);

  useEffect(() => {
    if (!startNodeId || !goal) {
       setRoute(null);
       setIsPlayingAnimation(false);
       return;
    }
    computeRouteAction(startNodeId, goal).then((res) => {
       setRoute(res);
       if (res?.found) {
         // Auto-play the animation when a route is loaded
         setIsPlayingAnimation(true);
       }
    });
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
              <PathfindingCanvas 
                blocks={blocks} 
                nodes={nodes} 
                route={route} 
                targetLevel={targetLevel} 
                isPlayingAnimation={isPlayingAnimation} 
                onAnimationComplete={() => {
                  setIsPlayingAnimation(false);
                  // Loop repeatedly with a 1.5s delay
                  setTimeout(() => setIsPlayingAnimation(true), 1500);
                }}
              />
            </div>
            
            {/* Overlay */}
            <div className="absolute top-8 left-8 z-40 flex flex-col gap-4 pointer-events-none">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        setSelectedTenant(null);
                        setIsPlayingAnimation(false);
                      }} 
                      className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/20 border border-white/10 text-white shadow-2xl backdrop-blur-xl hover:bg-black/40 hover:scale-105 active:scale-95 transition-all"
                      title="Back to Stores"
                    >
                      <ArrowLeft className="h-6 w-6" />
                    </button>
                    {tenant && (
                      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black/20 border border-white/10 px-6 py-3 backdrop-blur-xl shadow-2xl">
                        <h2 className="text-lg font-bold text-white tracking-wide">{tenant.tenantName}</h2>
                        <span
                          className="flex items-center justify-center rounded-full px-3 py-1 text-sm font-extrabold tracking-wider shadow-lg"
                          style={{
                            background: tenant.category?.colorHex ?? "#38bdf8",
                            color: "#fff",
                            minWidth: "2.5rem",
                            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                          }}
                          title={tenant.floor?.floorName}
                        >
                          F{tenant.floor?.levelNumber ?? "?"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Play Animation Button */}
                  {route?.found && (
                    <button
                      onClick={() => setIsPlayingAnimation(!isPlayingAnimation)}
                      className={`pointer-events-auto flex w-fit items-center gap-3 rounded-full border px-5 py-3 backdrop-blur-xl shadow-2xl transition-all ${
                        isPlayingAnimation 
                          ? "bg-rose-500/20 border-rose-500/50 text-rose-100 hover:bg-rose-500/30" 
                          : "bg-black/40 border-white/10 text-white hover:bg-white/10 hover:scale-105"
                      }`}
                    >
                      {isPlayingAnimation ? (
                        <>
                          <Square className="h-5 w-5 fill-current" />
                          <span className="font-bold tracking-wide">Stop Animation</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 fill-current" />
                          <span className="font-bold tracking-wide">Play Animation</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

               {!route?.found && goal && (
                  <div className="rounded-3xl border border-rose-500/20 bg-black/80 p-6 backdrop-blur-xl shadow-2xl pointer-events-auto max-w-sm">
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
