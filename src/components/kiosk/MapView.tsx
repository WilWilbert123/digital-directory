"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, X, MapPin, ChevronUp, Accessibility, ZoomIn, ZoomOut, Maximize2, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useKioskStore, type KioskTenant } from "@/store/useKioskStore";
import { computeRouteAction } from "@/app/actions/kiosk";
import { OnScreenKeyboard } from "@/components/kiosk/OnScreenKeyboard";
import type { FloorBlockMesh } from "@/components/3d/FloorModel";
import type { GraphNode, PathResult } from "@/lib/pathfinding";
import { useIsMobile } from "@/hooks/useIsMobile";
import { APP_NAME } from "@/lib/utils";

const PathfindingCanvas = dynamic(
  () => import("@/components/kiosk/PathfindingCanvas").then((m) => m.PathfindingCanvas),
  { ssr: false }
);

type FloorData = { levelNumber: number; shape?: string; pointsData?: string | null; colorHex?: string | null };
type NodeWithFloor = GraphNode & { floorId: string; type: string };

export function MapView({
  blocks,
  nodes,
  floorsData,
  tenants,
  startNodeId: defaultStartNodeId,
}: {
  blocks: FloorBlockMesh[];
  nodes: NodeWithFloor[];
  floorsData?: FloorData[];
  tenants: KioskTenant[];
  startNodeId: string | null;
}) {
  const isMobile = useIsMobile();

  // ── State ────────────────────────────────────────────────────────────────
  const [destination, setDestination] = useState<KioskTenant | null>(null);
  const [destModalOpen, setDestModalOpen] = useState(false);
  const [destQuery, setDestQuery] = useState("");
  const [originNodeId, setOriginNodeId] = useState<string | null>(defaultStartNodeId);
  const [originFloor, setOriginFloor] = useState<number>(1);
  const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
  const [route, setRoute] = useState<PathResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [proceedSignal, setProceedSignal] = useState(0);

  // ── Floors list ──────────────────────────────────────────────────────────
  const floors = useMemo<number[]>(() => {
    if (floorsData && floorsData.length > 0) {
      const lvls = floorsData.map((f) => f.levelNumber);
      return [...new Set(lvls)].sort((a, b) => a - b);
    }
    return [1];
  }, [floorsData]);

  // KIOSK_START nodes by floor
  const kioskNodesByFloor = useMemo(() => {
    const map: Record<number, string> = {};
    for (const n of nodes as NodeWithFloor[]) {
      if (n.type === "KIOSK_START" && n.floorId) {
        const floorLevel = floorsData?.find(() => true)?.levelNumber ?? 1;
        map[floorLevel] = n.id;
      }
    }
    if (Object.keys(map).length === 0 && defaultStartNodeId) {
      map[1] = defaultStartNodeId;
    }
    return map;
  }, [nodes, floorsData, defaultStartNodeId]);

  // Sync with global store query for virtual keyboard input
  const storeQuery = useKioskStore((s) => s.query);
  const setStoreQuery = useKioskStore((s) => s.setQuery);
  const autoOpenSearch = useKioskStore((s) => s.autoOpenSearch);
  const setAutoOpenSearch = useKioskStore((s) => s.setAutoOpenSearch);
  const storeDestinationTenant = useKioskStore((s) => s.destinationTenant);
  const setStoreDestinationTenant = useKioskStore((s) => s.setDestinationTenant);

  // Auto-open destination search if user clicked "Search" tab
  useEffect(() => {
    if (autoOpenSearch) {
      setDestModalOpen(true);
      setDestQuery("");
      setStoreQuery("");
      setAutoOpenSearch(false);
    }
  }, [autoOpenSearch, setStoreQuery, setAutoOpenSearch]);

  // When a store destination is passed from TenantList directions click
  useEffect(() => {
    if (storeDestinationTenant) {
      setDestination(storeDestinationTenant);
      setDestModalOpen(false);
      setStoreDestinationTenant(null);

      // Trigger route computation from current kiosk location to store
      const startId = kioskNodesByFloor[originFloor] ?? defaultStartNodeId;
      if (startId && storeDestinationTenant.entranceNodeId) {
        setIsLoadingRoute(true);
        computeRouteAction(startId, storeDestinationTenant.entranceNodeId)
          .then((res) => {
            setRoute(res);
            if (res?.found) setIsAnimating(true);
          })
          .finally(() => setIsLoadingRoute(false));
      }
    }
  }, [storeDestinationTenant, kioskNodesByFloor, originFloor, defaultStartNodeId, setStoreDestinationTenant]);

  // Sync store query to destQuery when modal is open
  useEffect(() => {
    if (destModalOpen) {
      setDestQuery(storeQuery);
    }
  }, [storeQuery, destModalOpen]);

  const destMatches = useMemo(() => {
    if (!destQuery.trim()) return tenants.slice(0, 40);
    const q = destQuery.toLowerCase();
    return tenants
      .filter(
        (t) =>
          t.tenantName.toLowerCase().includes(q) ||
          t.tenantCode.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [tenants, destQuery]);

  useEffect(() => {
    const nodeId = kioskNodesByFloor[originFloor] ?? defaultStartNodeId;
    setOriginNodeId(nodeId);
  }, [originFloor, kioskNodesByFloor, defaultStartNodeId]);

  async function handleGetDirections() {
    if (!originNodeId || !destination?.entranceNodeId) return;
    setIsLoadingRoute(true);
    try {
      setIsAnimating(false);
      const result = await computeRouteAction(originNodeId, destination.entranceNodeId);
      setRoute(result);
      if (result?.found) {
        setTimeout(() => setIsAnimating(true), 20);
      }
    } finally {
      setIsLoadingRoute(false);
    }
  }

  function selectDestination(t: KioskTenant) {
    setDestination(t);
    setDestQuery("");
    setStoreQuery("");
    setDestModalOpen(false);
    setRoute(null);
    setIsAnimating(false);
  }

  function clearDestination() {
    setDestination(null);
    setRoute(null);
    setIsAnimating(false);
  }

  // Current KIOSK location label
  const kioskLabel = `${originFloor}F, ${APP_NAME}`;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">

      {/* ── Map Canvas ──────────────────────────────────────────────────── */}
      <PathfindingCanvas
        blocks={blocks}
        nodes={nodes}
        route={route}
        floorsData={floorsData}
        selectedFloor={originFloor}
        onLevelChange={(lvl) => setOriginFloor(lvl)}
        isPlayingAnimation={isAnimating}
        onProceed={() => setProceedSignal(s => s + 1)}
        proceedSignal={proceedSignal}
        onAnimationComplete={() => {
          // Animation complete - TourGuide stops at destination floor without looping back to start
        }}
      />

      {/* ── Navigation Bar (Google Maps style) ─────────────────────────── */}
      <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 z-40 flex flex-col items-center px-3 sm:px-6">
        <div className="flex w-full max-w-2xl items-stretch gap-0 rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl bg-[#1a1a1a]">

          {/* LEFT — Input Destination tappable field */}
          <button
            onClick={() => {
              setStoreQuery("");
              setDestQuery("");
              setDestModalOpen(true);
            }}
            className="flex flex-1 items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 text-left hover:bg-white/5 transition-colors min-w-0"
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-white/40 shrink-0" />
            {destination ? (
              <span className="text-xs sm:text-sm font-bold text-teal-400 truncate">{destination.tenantName}</span>
            ) : (
              <span className="text-xs sm:text-sm text-white/30 font-medium">Input Destination</span>
            )}
            {destination && (
              <button
                onClick={(e) => { e.stopPropagation(); clearDestination(); }}
                className="shrink-0 text-white/30 hover:text-white ml-auto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </button>

          {/* DIVIDER */}
          <div className="w-px bg-white/10 my-2" />

          {/* MIDDLE — Get Directions / Accessibility icons */}
          <div className="flex items-center px-2 sm:px-3 gap-1 sm:gap-2">
            {/* Direction icon button */}
            <button
              onClick={destination ? handleGetDirections : () => { setDestModalOpen(true); setDestQuery(""); }}
              disabled={isLoadingRoute}
              title="Get Directions"
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-sm ${
                destination && !isAnimating
                  ? "bg-teal-400 text-black hover:bg-teal-300 shadow-teal-500/20"
                  : isAnimating
                  ? "bg-emerald-500 text-white shadow-emerald-500/20 animate-pulse"
                  : "bg-teal-400/90 text-black hover:bg-teal-300"
              }`}
            >
              <Navigation className="h-4 w-4 fill-current rotate-45" />
            </button>

            {/* Accessibility */}
            <button
              title="Accessible Route"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white/10 text-white/40 hover:bg-white/20 hover:text-white transition-all active:scale-95 shrink-0"
            >
              <Accessibility className="h-4 w-4 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* DIVIDER */}
          <div className="w-px bg-white/10 my-2" />

          {/* RIGHT — Current KIOSK location + floor picker + zoom controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
            {/* KIOSK location — tappable dropdown to switch floor view */}
            <div className="relative">
              <button
                onClick={() => setOriginDropdownOpen(!originDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors px-2.5 py-1.5 sm:px-3 sm:py-2 group"
                title="Select Floor View"
              >
                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal-400 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap max-w-[90px] sm:max-w-[130px] truncate">
                  {kioskLabel}
                </span>
                <ChevronUp className={`h-3 w-3 text-white/50 group-hover:text-white transition-transform ${originDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Floor selector dropdown preview */}
              <AnimatePresence>
                {originDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute bottom-full mb-3 right-0 rounded-2xl bg-[#141414] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden min-w-[170px] z-[100] p-1.5"
                  >
                    <p className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-teal-400 border-b border-white/10 flex items-center justify-between">
                      <span>All Floors</span>
                      <span className="text-[8px] text-white/40 font-normal">Switch View</span>
                    </p>
                    <div className="flex flex-col gap-1 mt-1 max-h-56 overflow-y-auto no-scrollbar">
                      {floors.map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => { setOriginFloor(lvl); setOriginDropdownOpen(false); }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            originFloor === lvl 
                              ? "bg-teal-400 text-black shadow-md font-black" 
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className={`h-3.5 w-3.5 ${originFloor === lvl ? "text-black" : "text-teal-400"}`} />
                            <span>Floor {lvl}</span>
                          </div>
                          {originFloor === lvl && (
                            <span className="text-[9px] font-black uppercase bg-black/20 px-1.5 py-0.5 rounded-md text-black">Active</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Zoom out */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("kiosk-map-zoom-out"))}
              title="Zoom Out"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all active:scale-90"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>

            {/* Zoom in */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("kiosk-map-zoom-in"))}
              title="Zoom In"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all active:scale-90"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>

            {/* Reset view */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("kiosk-map-reset"))}
              title="Reset View"
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all active:scale-90"
            >
              <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>

        {/* No route found */}
        <AnimatePresence>
          {destination && route && !route.found && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-2 w-full max-w-2xl rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-2 text-center"
            >
              <p className="text-[11px] text-rose-400 font-medium">
                No connected path found to this store.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* ── Destination Search Overlay — compact dropdown + centered keyboard ── */}
      <AnimatePresence>
        {destModalOpen && (
          <>
            {/* Subtle backdrop — map still visible behind */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setDestModalOpen(false)}
            />

            {/* ── Floating keyboard positioned top-center (doesn't overlap bottom dropdown) ── */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                className="absolute left-1/2 top-16 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-auto"
              >
                <OnScreenKeyboard />
              </motion.div>
            )}

            {/* ── Compact search dropdown — aligned directly above the Input Destination field ── */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
              className="absolute bottom-[4.5rem] sm:bottom-[5.5rem] left-0 right-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none"
            >
              <div className="w-full max-w-2xl flex justify-start pointer-events-none">
                <div className="pointer-events-auto w-full max-w-[240px] sm:max-w-[280px] rounded-2xl bg-[#1a1a1a] border border-white/15 shadow-2xl overflow-hidden mb-1">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/10">
                    <Search className="h-4 w-4 text-white/40 shrink-0" />
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => {
                        setDestQuery(e.target.value);
                        setStoreQuery(e.target.value);
                      }}
                      placeholder="Search stores…"
                      autoFocus={isMobile}
                      className="flex-1 bg-transparent text-white text-xs sm:text-sm outline-none placeholder:text-white/30"
                    />
                    <button
                      onClick={() => setDestModalOpen(false)}
                      className="h-6 w-6 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Results list — small & compact */}
                  <div className="max-h-48 overflow-y-auto no-scrollbar">
                    {destMatches.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectDestination(t)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-white/8 transition-colors border-b border-white/5 text-left last:border-b-0"
                      >
                        <div
                          className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `${t.category.colorHex}25` }}
                        >
                          <span className="text-[9px] font-black" style={{ color: t.category.colorHex }}>
                            {t.tenantCode.slice(0, 3)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{t.tenantName}</p>
                          <p className="text-[9px] text-white/40 truncate">{t.floor.floorName} · {t.category.categoryName}</p>
                        </div>
                        <MapPin className="h-3.5 w-3.5 text-teal-400/50 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
