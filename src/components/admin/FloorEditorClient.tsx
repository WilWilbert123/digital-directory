"use client";

import { useEffect, useMemo, useTransition, useState } from "react";
import { saveFloorGraphAction } from "@/app/actions/admin";
import { UnifiedFloorEditor } from "@/components/admin/UnifiedFloorEditor";
import { useAdminStore, type DraftBlock, type DraftEdge, type DraftNode } from "@/store/useAdminStore";

const TYPES: DraftNode["type"][] = ["WALKWAY", "TENANT_ENTRANCE", "ELEVATOR", "ESCALATOR", "STAIRS", "KIOSK_START"];
const SHAPES: { value: DraftBlock["shape"]; label: string; icon: string }[] = [
  { value: "BOX", label: "Block", icon: "▣" },
  { value: "CYLINDER", label: "Circle", icon: "◉" },
  { value: "WEDGE", label: "Curved", icon: "◒" },
  { value: "ESCALATOR", label: "Escalator", icon: "↗" },
  { value: "STAIRS", label: "Stairs", icon: "▤" },
  { value: "PLANT", label: "Plant", icon: "♧" },
  { value: "CHAIR", label: "Chair", icon: "♜" },
  { value: "TABLE", label: "Table", icon: "⊞" },
  { value: "BENCH", label: "Bench", icon: "▰" },
  { value: "STREET_LIGHT", label: "Street light", icon: "†" },
  { value: "COMPUTER", label: "Computer PC", icon: "▣" },
  { value: "TRIANGLE", label: "Triangle", icon: "△" },
  { value: "POLYGON", label: "Polygon", icon: "⬡" },
];

export function FloorEditorClient({
  floorId,
  floorName,
  imageUrl,
  initial,
  tenants,
}: {
  floorId: string;
  floorName: string;
  imageUrl?: string | null;
  initial: { blocks: DraftBlock[]; nodes: DraftNode[]; edges: DraftEdge[] };
  tenants: { id: string; tenantName: string; category: { colorHex: string } }[];
}) {
  const hydrate = useAdminStore((s) => s.hydrate);
  const tool = useAdminStore((s) => s.tool);
  const setTool = useAdminStore((s) => s.setTool);
  const blocks = useAdminStore((s) => s.blocks);
  const nodes = useAdminStore((s) => s.nodes);
  const edges = useAdminStore((s) => s.edges);
  const selectedBlockIds = useAdminStore((s) => s.selectedBlockIds);
  const selectedNodeIds = useAdminStore((s) => s.selectedNodeIds);
  const upsertBlock = useAdminStore((s) => s.upsertBlock);
  const upsertNode = useAdminStore((s) => s.upsertNode);
  const removeBlock = useAdminStore((s) => s.removeBlock);
  const removeNode = useAdminStore((s) => s.removeNode);
  const scaleSelectedBlock = useAdminStore((s) => s.scaleSelectedBlock);
  const rotateSelectedBlock = useAdminStore((s) => s.rotateSelectedBlock);
  const dirty = useAdminStore((s) => s.dirty);
  const markClean = useAdminStore((s) => s.markClean);
  const [pending, start] = useTransition();
  const [confirmModal, setConfirmModal] = useState<"blocks" | "nodes" | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [placementShape, setPlacementShape] = useState<DraftBlock["shape"]>("BOX");

  useEffect(() => {
    hydrate(initial);
  }, [floorId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") return;
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedBlockIds.length > 0) {
          selectedBlockIds.forEach(id => removeBlock(id));
        }
        if (selectedNodeIds.length > 0) {
          selectedNodeIds.forEach(id => removeNode(id));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBlockIds, selectedNodeIds, removeBlock, removeNode]);

  const tenantColors = useMemo(
    () => Object.fromEntries(tenants.map((t) => [t.id, t.category.colorHex])),
    [tenants]
  );

  const selectedBlock = selectedBlockIds.length === 1 ? blocks.find((b) => b.id === selectedBlockIds[0]) : null;
  const selectedNode = selectedNodeIds.length === 1 && selectedBlockIds.length === 0 ? nodes.find((n) => n.id === selectedNodeIds[0]) : null;
  const multiSelected = selectedBlockIds.length > 1 || selectedNodeIds.length > 1 || (selectedBlockIds.length > 0 && selectedNodeIds.length > 0);

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-[600px] flex-col gap-2">
      <div className="flex-none flex flex-wrap gap-2 items-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {(["select", "marquee", "block", "node", "edge"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTool(t)}
            className={`rounded-full px-4 py-2 text-sm capitalize transition-all font-semibold shadow-sm ${
              tool === t
                ? "bg-sky-600 text-white shadow-sky-600/20"
                : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="relative border-l border-slate-300 dark:border-slate-700 pl-4">
          <button
            type="button"
            onClick={() => setShapeMenuOpen((open) => !open)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all border shadow-sm ${shapeMenuOpen || tool === "block" ? "bg-amber-500 text-white border-amber-600" : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"}`}
            aria-expanded={shapeMenuOpen}
          >
            Shape: {SHAPES.find((shape) => shape.value === placementShape)?.label}
          </button>
          {shapeMenuOpen && (
            <div className="absolute left-4 top-full z-50 mt-2 max-h-72 w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Choose object to place</div>
              {SHAPES.map((shape) => (
                <button
                  key={shape.value}
                  type="button"
                  onClick={() => {
                    setPlacementShape(shape.value);
                    setTool("block");
                    setShapeMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${placementShape === shape.value ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-lg dark:bg-slate-800">{shape.icon}</span>
                  {shape.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setTool("select");
            useAdminStore.getState().setSelection(blocks.map(b => b.id), nodes.map(n => n.id));
          }}
          className="rounded-full bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 px-4 py-2 text-sm font-semibold transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          Select All
        </button>
        <div className="ml-2 flex gap-2 border-l border-slate-300 dark:border-slate-700 pl-4">
          <button
            type="button"
            onClick={useAdminStore((s) => s.undo)}
            className="rounded-lg bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 px-3 py-2 text-sm font-semibold transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={useAdminStore((s) => s.redo)}
            className="rounded-lg bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 px-3 py-2 text-sm font-semibold transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            Redo
          </button>
        </div>
        {multiSelected && (
          <div className="flex gap-2 border-l border-slate-300 dark:border-slate-700 pl-4">
            <button
              type="button"
              onClick={() => {
                const state = useAdminStore.getState();
                const ids = state.selectedBlockIds;
                ids.forEach(id => {
                  const block = state.blocks.find(b => b.id === id);
                  if (block) state.upsertBlock({ ...block, posY: 0 });
                });
              }}
              className="rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-amber-300 dark:border-amber-800/50"
            >
              Snap to Floor
            </button>
          </div>
        )}
        <div className="border-l border-slate-300 dark:border-slate-700 pl-4">
          <select
            aria-label="Add blocks"
            defaultValue=""
            onChange={(e) => {
              const count = Number(e.target.value);
              if (count) useAdminStore.getState().addMultipleBlocks(count, -18, -18);
              e.target.value = "";
            }}
            className="rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-indigo-300 dark:border-indigo-800/50"
          >
            <option value="" disabled>Add blocks</option>
            <option value="1">+1 Block</option>
            <option value="5">+5 Blocks</option>
            <option value="10">+10 Blocks</option>
          </select>
        </div>
        <div className="flex gap-2 border-l border-slate-300 dark:border-slate-700 pl-4">
          <button
            type="button"
            onClick={() => setConfirmModal("blocks")}
            className="rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-rose-300 dark:border-rose-800/50"
          >
            Clear Blocks
          </button>
          <button
            type="button"
            onClick={() => setConfirmModal("nodes")}
            className="rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-rose-300 dark:border-rose-800/50"
          >
            Clear Nodes
          </button>
        </div>
        <div className="flex gap-2 border-l border-slate-300 dark:border-slate-700 pl-4">
          <button
            type="button"
            onClick={() => {
              if (confirm("This will replace all blocks and nodes with a preset layout. Continue?")) {
                useAdminStore.getState().loadPresetLayout(tenants.map(t => t.id));
              }
            }}
            className="rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-emerald-300 dark:border-emerald-800/50"
          >
            Load Preset Layout
          </button>
        </div>
        <div className="flex gap-2 border-l border-slate-300 dark:border-slate-700 pl-4">
          <button
            type="button"
            disabled={generating || !imageUrl}
            onClick={async () => {
              if (!imageUrl) return;
              if (confirm("This will attempt to parse the 2D floor plan into 3D blocks. Existing blocks will NOT be deleted, but you can clear them first. Continue?")) {
                setGenerating(true);
                try {
                  const res = await fetch("/api/parse-floorplan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageUrl }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Failed to parse");
                  }
                  const data = await res.json();
                  if (data.blocks && data.blocks.length > 0) {
                    const state = useAdminStore.getState();
                    useAdminStore.setState({
                      blocks: [...state.blocks, ...data.blocks],
                      dirty: true
                    });
                  } else {
                    alert("No regions detected in the floor plan.");
                  }
                } catch (e: any) {
                  alert(e.message || "Failed to generate layout");
                } finally {
                  setGenerating(false);
                }
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-fuchsia-300 dark:border-fuchsia-800/50 disabled:opacity-50"
            title={!imageUrl ? "You must upload a 2D floor plan first" : ""}
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : "Auto-Generate 3D Layout"}
          </button>
        </div>
        
        {imageUrl && (
          <div className="flex gap-2 border-l border-slate-300 dark:border-slate-700 pl-4">
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors border shadow-sm ${
                showMap 
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700" 
                  : "bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700"
              }`}
            >
              {showMap ? "Hide Map" : "Show Map"}
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              await saveFloorGraphAction({ floorId, blocks, nodes, edges });
              markClean();
            })
          }
          className="ml-auto rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-500 px-5 py-2 text-sm transition-all shadow-md shadow-emerald-600/20 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save graph"}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col relative">
        {/* Unified 3D Editor */}
        <div className="flex-1 min-h-0 shadow-lg relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white drop-shadow-md tracking-tight">{floorName} editor</h1>
          </div>
          <UnifiedFloorEditor imageUrl={showMap ? imageUrl : null} tenantColors={tenantColors} placementShape={placementShape} />
        </div>
        {/* Floating Right Property Panel */}
        {(selectedBlock || selectedNode || multiSelected) && (
          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2 w-80 pointer-events-none">
            <div className="pointer-events-auto">
              <button 
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                {isPanelOpen ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    Hide Properties
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Show Properties
                  </>
                )}
              </button>
            </div>
            
            {isPanelOpen && (
              <div className="w-full pointer-events-auto flex flex-col gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xl">
                {selectedBlock ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider font-semibold block">Block Name</label>
                          <input
                            className="w-full h-7 text-xs rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-2 border border-slate-300 dark:border-slate-700 focus:outline-none"
                            value={selectedBlock.blockName}
                            onChange={(e) => upsertBlock({ ...selectedBlock, blockName: e.target.value })}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider font-semibold block">Tenant</label>
                          <select
                            className="w-full h-7 text-xs rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-1 border border-slate-300 dark:border-slate-700 focus:outline-none"
                            value={selectedBlock.tenantId ?? ""}
                            onChange={(e) => upsertBlock({ ...selectedBlock, tenantId: e.target.value || null })}
                          >
                            <option value="">Unassigned</option>
                            {tenants.map((t) => (
                              <option key={t.id} value={t.id}>{t.tenantName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider font-semibold block">Shape</label>
                          <select
                            className="w-full h-7 text-xs rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-1 border border-slate-300 dark:border-slate-700 focus:outline-none"
                            value={selectedBlock.shape ?? "BOX"}
                            onChange={(e) => upsertBlock({ ...selectedBlock, shape: e.target.value as DraftBlock["shape"] })}
                          >
                            <option value="BOX">Square</option>
                            <option value="CYLINDER">Circle</option>
                            <option value="WEDGE">Curved</option>
                            <option value="ESCALATOR">Escalator</option>
                            <option value="STAIRS">Stairs</option>
                            <option value="PLANT">Plant</option>
                            <option value="CHAIR">Chair</option>
                            <option value="TABLE">Table</option>
                            <option value="BENCH">Bench</option>
                            <option value="STREET_LIGHT">Street light</option>
                            <option value="COMPUTER">Computer PC</option>
                            <option value="TRIANGLE">Triangle</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wider font-semibold block">Elevation (Y)</label>
                          <input
                            type="number" step="0.1"
                            className="w-full h-7 text-xs rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-2 border border-slate-300 dark:border-slate-700 focus:outline-none"
                            value={selectedBlock.posY}
                            onChange={(e) => upsertBlock({ ...selectedBlock, posY: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Scale Controls */}
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Quick Scale</span>
                      </div>
                      <div className="grid gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-500">Width (X) {selectedBlock.scaleX}</span>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => scaleSelectedBlock(-0.5, 0, 0)} className="w-6 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold">-</button>
                            <button type="button" onClick={() => scaleSelectedBlock(0.5, 0, 0)} className="w-6 h-5 flex items-center justify-center rounded bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 hover:bg-sky-200 border border-sky-200 dark:border-sky-800 text-xs font-bold">+</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-500">Length (Z) {selectedBlock.scaleZ}</span>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => scaleSelectedBlock(0, 0, -0.5)} className="w-6 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold">-</button>
                            <button type="button" onClick={() => scaleSelectedBlock(0, 0, 0.5)} className="w-6 h-5 flex items-center justify-center rounded bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 hover:bg-sky-200 border border-sky-200 dark:border-sky-800 text-xs font-bold">+</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-500">Height (Y) {selectedBlock.scaleY}</span>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => scaleSelectedBlock(0, -0.5, 0)} className="w-6 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold">-</button>
                            <button type="button" onClick={() => scaleSelectedBlock(0, 0.5, 0)} className="w-6 h-5 flex items-center justify-center rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rotate Controls */}
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Quick Rotate</span>
                        <span className="text-[10px] text-slate-400">{Number.isNaN(selectedBlock.rotationY) ? 0 : (selectedBlock.rotationY * (180/Math.PI)).toFixed(0)}°</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <button type="button" onClick={() => rotateSelectedBlock(-Math.PI / 12)} className="h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">-15°</button>
                        <button type="button" onClick={() => rotateSelectedBlock(Math.PI / 12)} className="h-6 flex items-center justify-center rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 hover:bg-indigo-200 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">+15°</button>
                        <button type="button" onClick={() => rotateSelectedBlock(-Math.PI / 2)} className="h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">-90°</button>
                        <button type="button" onClick={() => rotateSelectedBlock(Math.PI / 2)} className="h-6 flex items-center justify-center rounded bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/80 dark:text-fuchsia-300 hover:bg-fuchsia-200 border border-fuchsia-200 dark:border-fuchsia-800 text-[10px] font-bold">+90°</button>
                      </div>
                    </div>

                    <div className="pt-1.5 mt-0.5 border-t border-slate-200 dark:border-slate-800">
                      <button type="button" className="w-full h-7 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:border-rose-900/50 rounded font-bold text-[10px] transition-colors" onClick={() => removeBlock(selectedBlock.id)}>
                        Delete Block
                      </button>
                    </div>
                  </>
                ) : selectedNode ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <div>
                        <label className="text-[9px] text-slate-500 dark:text-amber-400/70 mb-0.5 uppercase tracking-wider font-semibold block">Node Name</label>
                        <input
                          className="w-full h-7 text-xs rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-2 border border-slate-300 dark:border-slate-700 focus:outline-none"
                          value={selectedNode.nodeName}
                          onChange={(e) => upsertNode({ ...selectedNode, nodeName: e.target.value })}
                          placeholder="Node Name"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-500 dark:text-amber-400/70 mb-0.5 uppercase tracking-wider font-semibold block">Type</label>
                          <select
                            className="w-full h-7 text-xs rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-1 border border-slate-300 dark:border-slate-700 focus:outline-none"
                            value={selectedNode.type}
                            onChange={(e) => upsertNode({ ...selectedNode, type: e.target.value as DraftNode["type"] })}
                          >
                            {TYPES.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-slate-500 dark:text-amber-400/70 mb-0.5 uppercase tracking-wider font-semibold block">Elevation</label>
                          <input
                            type="number"
                            step="0.1"
                            className="w-full h-7 text-xs rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-2 border border-slate-300 dark:border-slate-700 focus:outline-none"
                            value={selectedNode.positionY}
                            onChange={(e) => upsertNode({ ...selectedNode, positionY: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-800">
                      <button type="button" className="w-full h-7 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:border-rose-900/50 rounded font-bold text-[10px] transition-colors" onClick={() => removeNode(selectedNode.id)}>
                        Delete Node
                      </button>
                    </div>
                  </>
                ) : multiSelected ? (
                  <div className="py-8 text-center text-sky-700 dark:text-sky-300 font-medium">
                    Multiple items selected.<br/><br/>
                    Use the 3D gizmo to move them as a group.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-xl font-bold mb-2">
              {confirmModal === "blocks" ? "Clear All Blocks" : "Clear All Nodes"}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
              {confirmModal === "blocks" 
                ? "Are you sure you want to clear all blocks? Nodes and edges will remain."
                : "Are you sure you want to clear all nodes and edges? Blocks will remain."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 font-medium dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal === "blocks") {
                    useAdminStore.getState().clearBlocks();
                  } else {
                    useAdminStore.getState().clearGraph();
                  }
                  setConfirmModal(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-500 transition-colors"
              >
                Clear {confirmModal === "blocks" ? "Blocks" : "Nodes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
