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
  const selectedBlockId = useAdminStore((s) => s.selectedBlockId);
  const selectedNodeId = useAdminStore((s) => s.selectedNodeId);
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
        if (selectedBlockId) removeBlock(selectedBlockId);
        if (selectedNodeId) removeNode(selectedNodeId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBlockId, selectedNodeId, removeBlock, removeNode]);

  const tenantColors = useMemo(
    () => Object.fromEntries(tenants.map((t) => [t.id, t.category.colorHex])),
    [tenants]
  );

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[600px] flex-col gap-4">
      <div className="flex-none flex flex-wrap gap-2">
        {(["select", "block", "node", "edge"] as const).map((t) => (
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

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* Unified 3D Editor */}
        <div className="flex-1 min-h-0 shadow-lg relative">
          <UnifiedFloorEditor imageUrl={imageUrl} tenantColors={tenantColors} />
        </div>

        {/* Floating/Bottom Property Panel */}
        <div className="flex-none h-[74px]">
          {selectedBlock ? (
            <div className="grid gap-3 rounded-2xl border border-sky-800/50 bg-sky-950/20 p-4 xl:grid-cols-5 shadow-lg">
              <input
                className="h-10 rounded bg-slate-900 px-3 border border-slate-800 xl:col-span-1"
                value={selectedBlock.blockName}
                onChange={(e) => upsertBlock({ ...selectedBlock, blockName: e.target.value })}
                placeholder="Block Name"
              />
              <select
                className="h-10 rounded bg-slate-900 px-3 border border-slate-800 xl:col-span-2"
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
              <select
                className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                value={selectedBlock.shape ?? "BOX"}
                onChange={(e) => upsertBlock({ ...selectedBlock, shape: e.target.value as "BOX" | "CYLINDER" })}
              >
                <option value="BOX">Square/Box</option>
                <option value="CYLINDER">Circle/Oval</option>
              </select>
              <button type="button" className="text-rose-400 font-medium hover:underline text-sm" onClick={() => removeBlock(selectedBlock.id)}>
                Delete block
              </button>
            </div>
          ) : selectedNode ? (
            <div className="grid gap-3 rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4 xl:grid-cols-3 shadow-lg">
              <input
                className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                value={selectedNode.nodeName}
                onChange={(e) => upsertNode({ ...selectedNode, nodeName: e.target.value })}
                placeholder="Node Name"
              />
              <select
                className="h-10 rounded bg-slate-900 px-3 border border-slate-800"
                value={selectedNode.type}
                onChange={(e) => upsertNode({ ...selectedNode, type: e.target.value as DraftNode["type"] })}
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button type="button" className="text-rose-400 font-medium hover:underline text-sm" onClick={() => removeNode(selectedNode.id)}>
                Delete node
              </button>
            </div>
          ) : null}
        </div>
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
