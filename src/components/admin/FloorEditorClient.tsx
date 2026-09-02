"use client";

import { useEffect, useMemo, useTransition, useState } from "react";
import { saveFloorGraphAction } from "@/app/actions/admin";
import { UnifiedFloorEditor } from "@/components/admin/UnifiedFloorEditor";
import { useAdminStore, type DraftBlock, type DraftEdge, type DraftNode } from "@/store/useAdminStore";

const TYPES: DraftNode["type"][] = ["WALKWAY", "TENANT_ENTRANCE", "ELEVATOR", "ESCALATOR", "STAIRS", "KIOSK_START"];

export function FloorEditorClient({
  floorId,
  imageUrl,
  initial,
  tenants,
}: {
  floorId: string;
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
  const dirty = useAdminStore((s) => s.dirty);
  const markClean = useAdminStore((s) => s.markClean);
  const [pending, start] = useTransition();
  const [confirmModal, setConfirmModal] = useState<"blocks" | "nodes" | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showMap, setShowMap] = useState(true);

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
    <div className="flex h-[calc(100vh-10rem)] min-h-[600px] flex-col gap-4">
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
        <div className="flex gap-2 border-l border-slate-300 dark:border-slate-700 pl-4">
          <button
            type="button"
            onClick={() => useAdminStore.getState().addMultipleBlocks(1, -18, -18)}
            className="rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-indigo-300 dark:border-indigo-800/50"
          >
            +1 Block
          </button>
          <button
            type="button"
            onClick={() => useAdminStore.getState().addMultipleBlocks(5, -18, -18)}
            className="rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-indigo-300 dark:border-indigo-800/50"
          >
            +5 Blocks
          </button>
          <button
            type="button"
            onClick={() => useAdminStore.getState().addMultipleBlocks(10, -18, -18)}
            className="rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/80 px-3 py-2 text-sm font-semibold transition-colors border border-indigo-300 dark:border-indigo-800/50"
          >
            +10 Blocks
          </button>
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
        <div className="flex-1 min-h-0 shadow-lg relative">
          <UnifiedFloorEditor imageUrl={showMap ? imageUrl : null} tenantColors={tenantColors} />
        </div>

        {/* Floating/Bottom Property Panel */}
        {(selectedBlock || selectedNode || multiSelected) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-10">
            {selectedBlock ? (
            <div className="grid gap-3 rounded-2xl border border-slate-200 dark:border-sky-800/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 xl:grid-cols-7 shadow-2xl">
              <div className="flex flex-col xl:col-span-2">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Block Name</label>
                <input
                  className="h-10 rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={selectedBlock.blockName}
                  onChange={(e) => upsertBlock({ ...selectedBlock, blockName: e.target.value })}
                  placeholder="Block Name"
                />
              </div>
              <div className="flex flex-col xl:col-span-2">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Tenant</label>
                <select
                  className="h-10 rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={selectedBlock.tenantId ?? ""}
                  onChange={(e) => upsertBlock({ ...selectedBlock, tenantId: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tenantName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col xl:col-span-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Shape</label>
                <select
                  className="h-10 rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={selectedBlock.shape ?? "BOX"}
                  onChange={(e) => upsertBlock({ ...selectedBlock, shape: e.target.value as "BOX" | "CYLINDER" })}
                >
                  <option value="BOX">Square</option>
                  <option value="CYLINDER">Circle</option>
                </select>
              </div>
              <div className="flex flex-col xl:col-span-1">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Elevation (Y)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Elevation (Y)"
                  className="h-10 rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={selectedBlock.posY}
                  onChange={(e) => upsertBlock({ ...selectedBlock, posY: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Height</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="h-10 rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={selectedBlock.scaleY}
                  onChange={(e) => upsertBlock({ ...selectedBlock, scaleY: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col justify-end">
                <button type="button" className="h-10 text-rose-600 hover:bg-rose-50 border border-rose-200 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:border-rose-900/50 rounded font-medium text-sm transition-colors" onClick={() => removeBlock(selectedBlock.id)}>
                  Delete
                </button>
              </div>

              {/* 1-Click Scale Controls Row */}
              <div className="col-span-full pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">1-Click Scale:</span>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Width (X):</span>
                    <button type="button" onClick={() => scaleSelectedBlock(-0.5, 0, 0)} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors">-0.5</button>
                    <button type="button" onClick={() => scaleSelectedBlock(0.5, 0, 0)} className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-200 text-xs font-bold transition-colors">+0.5</button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Length (Z):</span>
                    <button type="button" onClick={() => scaleSelectedBlock(0, 0, -0.5)} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors">-0.5</button>
                    <button type="button" onClick={() => scaleSelectedBlock(0, 0, 0.5)} className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-200 text-xs font-bold transition-colors">+0.5</button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Height (Y):</span>
                    <button type="button" onClick={() => scaleSelectedBlock(0, -0.5, 0)} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors">-0.5</button>
                    <button type="button" onClick={() => scaleSelectedBlock(0, 0.5, 0)} className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 text-xs font-bold transition-colors">+0.5</button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedNode ? (
            <div className="grid gap-3 rounded-2xl border border-slate-200 dark:border-amber-800/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 xl:grid-cols-4 shadow-2xl">
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-amber-400/70 mb-1 uppercase tracking-wider font-semibold">Node Name</label>
                <input
                  className="h-10 rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={selectedNode.nodeName}
                  onChange={(e) => upsertNode({ ...selectedNode, nodeName: e.target.value })}
                  placeholder="Node Name"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-amber-400/70 mb-1 uppercase tracking-wider font-semibold">Type</label>
                <select
                  className="h-10 rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={selectedNode.type}
                  onChange={(e) => upsertNode({ ...selectedNode, type: e.target.value as DraftNode["type"] })}
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 dark:text-amber-400/70 mb-1 uppercase tracking-wider font-semibold">Elevation (Y)</label>
                <input
                  type="number"
                  step="0.1"
                  className="h-10 rounded bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 px-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={selectedNode.positionY}
                  onChange={(e) => upsertNode({ ...selectedNode, positionY: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col justify-end">
                <button type="button" className="h-10 text-rose-600 hover:bg-rose-50 border border-rose-200 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:border-rose-900/50 rounded font-medium text-sm transition-colors" onClick={() => removeNode(selectedNode.id)}>
                  Delete
                </button>
              </div>
            </div>
          ) : multiSelected ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 dark:border-sky-800/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl px-6 py-4">
              <p className="text-sky-700 dark:text-sky-300 font-medium">Multiple items selected. Use the 3D gizmo to move them as a group.</p>
            </div>
          ) : null}
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
