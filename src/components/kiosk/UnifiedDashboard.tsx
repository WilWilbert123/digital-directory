"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { computeRouteAction } from "@/app/actions/kiosk";
import { useKioskStore, type KioskTenant } from "@/store/useKioskStore";
import type { FloorBlockMesh } from "@/components/3d/FloorModel";
import type { GraphNode, PathResult } from "@/lib/pathfinding";
import type { CategoryOption } from "@/components/kiosk/CategorySelector";
import { ArrowLeft, Play, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Lazy-loaded components ──────────────────────────────────────────────────
const PathfindingCanvas = dynamic(
  () => import("@/components/kiosk/PathfindingCanvas").then((m) => m.PathfindingCanvas),
  { ssr: false }
);

// ── View components ─────────────────────────────────────────────────────────
import { HomeSearch }         from "./HomeSearch";
import { KioskHome }          from "./KioskHome";
import { SubcategoryScreen }  from "./SubcategoryScreen";
import { TenantListScreen }   from "./TenantListScreen";
import { BottomNav }          from "./BottomNav";
import { MapView }            from "./MapView";
import { PromosScreen }       from "./PromosScreen";
import { CinemaScreen }       from "./CinemaScreen";

// ── Types ───────────────────────────────────────────────────────────────────
export function UnifiedDashboard({
  tenants,
  categories,
  blocks,
  nodes,
  startNodeId,
  floorsData,
}: {
  tenants: KioskTenant[];
  categories: CategoryOption[];
  blocks: FloorBlockMesh[];
  nodes: GraphNode[];
  startNodeId: string | null;
  floorsData?: { levelNumber: number; shape?: string; pointsData?: string | null; colorHex?: string | null }[];
}) {
  const selectedTenantId      = useKioskStore((s) => s.selectedTenantId);
  const setSelectedTenant     = useKioskStore((s) => s.setSelectedTenant);
  const activeView            = useKioskStore((s) => s.activeView);
  const selectedCategoryGroup = useKioskStore((s) => s.selectedCategoryGroup);
  const selectedSubcategoryId = useKioskStore((s) => s.selectedSubcategoryId);

  const [route, setRoute]                   = useState<PathResult | null>(null);
  const [isPlayingAnimation, setIsPlaying]  = useState(false);

  const tenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId),
    [tenants, selectedTenantId]
  );
  const goal = tenant?.entranceNodeId ?? null;

  useEffect(() => {
    if (!startNodeId || !goal) {
      setRoute(null);
      setIsPlaying(false);
      return;
    }
    computeRouteAction(startNodeId, goal).then((res) => {
      setRoute(res);
      if (res?.found) setIsPlaying(true);
    });
  }, [startNodeId, goal]);

  // ── Determine which "home" sub-screen to show ────────────────────────────
  function renderHomeView() {
    if (selectedSubcategoryId) {
      return <TenantListScreen tenants={tenants} categories={categories} />;
    }
    if (selectedCategoryGroup) {
      return <SubcategoryScreen categories={categories} />;
    }
    return <KioskHome categories={categories} />;
  }

  // ── Pick the active view ─────────────────────────────────────────────────
  function renderMainView() {
    switch (activeView) {
      case "search":
        return <HomeSearch tenants={tenants} categories={categories} />;
      case "map":
        return (
          <MapView
            blocks={blocks}
            nodes={nodes as (GraphNode & { floorId: string; type: string })[]}
            floorsData={floorsData}
            tenants={tenants}
            startNodeId={startNodeId}
          />
        );
      case "promos":
        return <PromosScreen />;
      case "cinema":
        return <CinemaScreen />;
      case "home":
      default:
        return renderHomeView();
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">

      {/* ── FULL-SCREEN WAYFINDING MAP (tenant selected) ─────────────────── */}
      <AnimatePresence>
        {selectedTenantId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0 }}
            className="absolute inset-0 z-30 bg-[#f8fafc]"
          >
            <div className="absolute inset-0">
              <PathfindingCanvas
                blocks={blocks}
                nodes={nodes}
                route={route}
                floorsData={floorsData}
                isPlayingAnimation={isPlayingAnimation}
                onAnimationComplete={() => {
                  // Animation complete - TourGuide stops at destination floor without looping back to start
                }}
              />
            </div>

            {/* Overlay controls */}
            <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-40 flex flex-col gap-3 pointer-events-none">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedTenant(null); setIsPlaying(false); }}
                  className="pointer-events-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-black/20 border border-white/10 text-white shadow-2xl backdrop-blur-xl hover:bg-black/40 hover:scale-105 active:scale-95 transition-all"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                {tenant && (
                  <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black/20 border border-white/10 px-5 py-2.5 backdrop-blur-xl shadow-2xl">
                    <h2 className="text-sm sm:text-lg font-bold text-white tracking-wide">{tenant.tenantName}</h2>
                    <span
                      className="flex items-center justify-center rounded-full px-3 py-1 text-xs sm:text-sm font-extrabold tracking-wider shadow-lg text-white"
                      style={{ background: tenant.category?.colorHex ?? "#38bdf8" }}
                    >
                      F{tenant.floor?.levelNumber ?? "?"}
                    </span>
                  </div>
                )}
              </div>

              {/* Play/Stop animation */}
              {route?.found && (
                <button
                  onClick={() => {
                    if (isPlayingAnimation) {
                      setIsPlaying(false);
                    } else {
                      setIsPlaying(false);
                      setTimeout(() => setIsPlaying(true), 20);
                    }
                  }}
                  className={`pointer-events-auto flex w-fit items-center gap-3 rounded-full border px-4 py-2.5 sm:px-5 sm:py-3 backdrop-blur-xl shadow-2xl transition-all text-sm sm:text-base ${
                    isPlayingAnimation
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-100 hover:bg-rose-500/30"
                      : "bg-black/40 border-white/10 text-white hover:bg-white/10 hover:scale-105"
                  }`}
                >
                  {isPlayingAnimation ? (
                    <><Square className="h-4 w-4 fill-current" /><span className="font-bold">Stop Route</span></>
                  ) : (
                    <><Play className="h-4 w-4 fill-current" /><span className="font-bold">Play Route</span></>
                  )}
                </button>
              )}

              {!route?.found && goal && (
                <div className="pointer-events-auto rounded-2xl border border-rose-500/20 bg-black/80 p-4 backdrop-blur-xl shadow-2xl max-w-xs">
                  <p className="text-rose-400 font-medium text-sm">Cannot find a connected path to this store.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────────────── */}
      <div className="relative h-full w-full z-20 flex flex-col">
        {renderMainView()}
      </div>

      {/* ── BOTTOM NAV (always on top, hides during screensaver/wayfinding) ─ */}
      <BottomNav />
    </div>
  );
}
