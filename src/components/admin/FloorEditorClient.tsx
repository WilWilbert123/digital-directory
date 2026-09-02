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
  const dirty = useAdminStore((s) => s.dirty);
  const markClean = useAdminStore((s) => s.markClean);
  const [pending, start] = useTransition();
  const [confirmModal, setConfirmModal] = useState<"blocks" | "nodes" | null>(null);

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
      <div className="flex-none flex flex-wrap gap-2">
        {(["select", "marquee", "block", "node", "edge"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTool(t)}
            className={`rounded-full px-4 py-2 text-sm capitalize transition-colors ${
              tool === t ? "bg-sky-600 font-bold" : "bg-slate-800 hover:bg-slate-700"
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
          className="rounded-full bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold transition-colors border border-sky-900/50"
        >
          Select All
        </button>
        <div className="ml-4 flex gap-2 border-l border-slate-700 pl-4">
          <button
            type="button"
            onClick={useAdminStore((s) => s.undo)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={useAdminStore((s) => s.redo)}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Redo
          </button>
        </div>
        {multiSelected && (
          <div className="flex gap-2 border-l border-slate-700 pl-4">
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
              className="rounded-lg bg-amber-900/50 text-amber-300 px-3 py-2 text-sm font-semibold hover:bg-amber-800/80 transition-colors"
            >
              Snap to Floor
            </button>
          </div>
        )}
        <div className="flex gap-2 border-l border-slate-700 pl-4">
          <button
            type="button"
            onClick={() => useAdminStore.getState().addMultipleBlocks(1, -18, -18)}
            className="rounded-lg bg-indigo-900/50 text-indigo-300 px-3 py-2 text-sm font-semibold hover:bg-indigo-800/80 transition-colors"
          >
            +1 Block
          </button>
          <button
            type="button"
            onClick={() => useAdminStore.getState().addMultipleBlocks(5, -18, -18)}
            className="rounded-lg bg-indigo-900/50 text-indigo-300 px-3 py-2 text-sm font-semibold hover:bg-indigo-800/80 transition-colors"
          >
            +5 Blocks
          </button>
          <button
            type="button"
            onClick={() => useAdminStore.getState().addMultipleBlocks(10, -18, -18)}
            className="rounded-lg bg-indigo-900/50 text-indigo-300 px-3 py-2 text-sm font-semibold hover:bg-indigo-800/80 transition-colors"
          >
            +10 Blocks
          </button>
        </div>
        <div className="flex gap-2 border-l border-slate-700 pl-4">
          <button
            type="button"
            onClick={() => setConfirmModal("blocks")}
            className="rounded-lg bg-rose-900/50 text-rose-300 px-3 py-2 text-sm font-semibold hover:bg-rose-800/80 transition-colors"
          >
            Clear Blocks
          </button>
          <button
            type="button"
            onClick={() => setConfirmModal("nodes")}
            className="rounded-lg bg-rose-900/50 text-rose-300 px-3 py-2 text-sm font-semibold hover:bg-rose-800/80 transition-colors"
          >
            Clear Nodes
          </button>
        </div>
        <div className="flex gap-2 border-l border-slate-700 pl-4">
          <button
            type="button"
            onClick={() => {
              if (confirm("This will replace all blocks and nodes with a preset layout. Continue?")) {
                useAdminStore.getState().loadPresetLayout(tenants.map(t => t.id));
              }
            }}
            className="rounded-lg bg-emerald-900/50 text-emerald-300 px-3 py-2 text-sm font-semibold hover:bg-emerald-800/80 transition-colors"
          >
            Load Preset Layout
          </button>
        </div>

        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              await saveFloorGraphAction({ floorId, blocks, nodes, edges });
              markClean();
            })
          }
          className="ml-auto rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold transition-opacity disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save graph"}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col relative">
        {/* Unified 3D Editor */}
        <div className="flex-1 min-h-0 shadow-lg relative">
          <UnifiedFloorEditor imageUrl={imageUrl} tenantColors={tenantColors} />
        </div>

        {/* Floating/Bottom Property Panel */}
        {(selectedBlock || selectedNode || multiSelected) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-10">
            {selectedBlock ? (
            <div className="grid gap-3 rounded-2xl border border-sky-800/50 bg-sky-950/20 p-4 xl:grid-cols-7 shadow-lg">
              <div className="flex flex-col xl:col-span-2">
                <input
                  className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                  value={selectedBlock.blockName}
                  onChange={(e) => upsertBlock({ ...selectedBlock, blockName: e.target.value })}
                  placeholder="Block Name"
                />
              </div>
              <div className="flex flex-col xl:col-span-2">
                <select
                  className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
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
                <select
                  className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                  value={selectedBlock.shape ?? "BOX"}
                  onChange={(e) => upsertBlock({ ...selectedBlock, shape: e.target.value as "BOX" | "CYLINDER" })}
                >
                  <option value="BOX">Square</option>
                  <option value="CYLINDER">Circle</option>
                </select>
              </div>
              <div className="flex flex-col xl:col-span-1">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Elevation (Y)"
                  className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                  value={selectedBlock.posY}
                  onChange={(e) => upsertBlock({ ...selectedBlock, posY: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Height</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                  value={selectedBlock.scaleY}
                  onChange={(e) => upsertBlock({ ...selectedBlock, scaleY: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col justify-end">
                <button type="button" className="h-10 text-rose-400 font-medium hover:bg-rose-950/30 rounded border border-rose-900/50 text-sm transition-colors" onClick={() => removeBlock(selectedBlock.id)}>
                  Delete
                </button>
              </div>
            </div>
          ) : selectedNode ? (
            <div className="grid gap-3 rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4 xl:grid-cols-4 shadow-lg">
              <div className="flex flex-col">
                <label className="text-[10px] text-amber-400/70 mb-1 uppercase tracking-wider font-semibold">Node Name</label>
                <input
                  className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                  value={selectedNode.nodeName}
                  onChange={(e) => upsertNode({ ...selectedNode, nodeName: e.target.value })}
                  placeholder="Node Name"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-amber-400/70 mb-1 uppercase tracking-wider font-semibold">Type</label>
                <select
                  className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                  value={selectedNode.type}
                  onChange={(e) => upsertNode({ ...selectedNode, type: e.target.value as DraftNode["type"] })}
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] text-amber-400/70 mb-1 uppercase tracking-wider font-semibold">Elevation (Y)</label>
                <input
                  type="number"
                  step="0.1"
                  className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                  value={selectedNode.positionY}
                  onChange={(e) => upsertNode({ ...selectedNode, positionY: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col justify-end">
                <button type="button" className="h-10 text-rose-400 font-medium hover:bg-rose-950/30 rounded border border-rose-900/50 text-sm transition-colors" onClick={() => removeNode(selectedNode.id)}>
                  Delete
                </button>
              </div>
            </div>
          ) : multiSelected ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-sky-800/50 bg-sky-950/20 shadow-lg px-6">
              <p className="text-sky-300 font-medium">Multiple items selected. Use the 3D gizmo to move them as a group.</p>
            </div>
          ) : null}
          </div>
        )}
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-slate-100 mb-2">
              {confirmModal === "blocks" ? "Clear All Blocks" : "Clear All Nodes"}
            </h3>
            <p className="text-slate-400 mb-6 text-sm">
              {confirmModal === "blocks" 
                ? "Are you sure you want to clear all blocks? Nodes and edges will remain."
                : "Are you sure you want to clear all nodes and edges? Blocks will remain."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
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
