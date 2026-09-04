"use client";

import { create } from "zustand";
import type { PathNodeType } from "@/lib/pathfinding";

export type EditorTool = "select" | "marquee" | "block" | "node" | "edge";

export type DraftBlock = {
  id: string;
  blockName: string;
  posX: number;
  posY: number;
  posZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotationY: number;
  shape: "BOX" | "CYLINDER" | "WEDGE" | "ESCALATOR" | "STAIRS" | "PLANT" | "CHAIR" | "TABLE" | "BENCH" | "STREET_LIGHT" | "COMPUTER" | "TRIANGLE" | "POLYGON";
  pointsData?: string | null;
  color?: string | null;
  tenantId: string | null;
};

export type DraftNode = {
  id: string;
  nodeName: string;
  type: PathNodeType;
  positionX: number;
  positionY: number;
  positionZ: number;
};

export type DraftEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  weight: number;
  isAccessible: boolean;
};

type HistorySnapshot = { blocks: DraftBlock[]; nodes: DraftNode[]; edges: DraftEdge[] };

type AdminState = {
  tool: EditorTool;
  selectedBlockIds: string[];
  selectedNodeIds: string[];
  edgeFromId: string | null;
  blocks: DraftBlock[];
  nodes: DraftNode[];
  edges: DraftEdge[];
  dirty: boolean;
  history: HistorySnapshot[];
  historyIndex: number;
  setTool: (tool: EditorTool) => void;
  hydrate: (payload: { blocks: DraftBlock[]; nodes: DraftNode[]; edges: DraftEdge[] }) => void;
  selectBlock: (id: string | null, append?: boolean) => void;
  selectNode: (id: string | null, append?: boolean) => void;
  setSelection: (blockIds: string[], nodeIds: string[]) => void;
  moveSelection: (dx: number, dz: number) => void;
  upsertBlock: (block: DraftBlock) => void;
  upsertNode: (node: DraftNode) => void;
  addEdge: (edge: DraftEdge) => void;
  removeBlock: (id: string) => void;
  removeNode: (id: string) => void;
  setEdgeFrom: (id: string | null) => void;
  markClean: () => void;
  undo: () => void;
  redo: () => void;
  clearBlocks: () => void;
  clearGraph: () => void;
  addMultipleBlocks: (count: number, startX: number, startZ: number) => void;
  loadPresetLayout: (tenantIds: string[]) => void;
  commitHistory: () => void;
  scaleSelectedBlock: (deltaX: number, deltaY: number, deltaZ: number) => void;
  rotateSelectedBlock: (deltaY: number) => void;
};

// Helper to push history before mutating state
const pushHistory = (s: AdminState, nextState: Partial<AdminState>) => {
  const currentSnapshot = { blocks: s.blocks, nodes: s.nodes, edges: s.edges };
  const newHistory = s.history.slice(0, s.historyIndex + 1);
  newHistory.push(currentSnapshot);
  if (newHistory.length > 50) newHistory.shift(); // Keep max 50 history states
  
  return {
    ...nextState,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    dirty: true,
  };
};

export const useAdminStore = create<AdminState>((set) => ({
  tool: "select",
  selectedBlockIds: [],
  selectedNodeIds: [],
  edgeFromId: null,
  blocks: [],
  nodes: [],
  edges: [],
  dirty: false,
  history: [],
  historyIndex: -1,
  
  setTool: (tool) => set({ tool }),
  hydrate: (payload) => set({ ...payload, dirty: false, history: [], historyIndex: -1, selectedBlockIds: [], selectedNodeIds: [], edgeFromId: null }),
  selectBlock: (id, append = false) => set((s) => {
    if (!id) return { selectedBlockIds: [], selectedNodeIds: [] };
    if (append) {
      return { 
        selectedBlockIds: s.selectedBlockIds.includes(id) ? s.selectedBlockIds.filter(b => b !== id) : [...s.selectedBlockIds, id]
      };
    }
    // If it's already selected and we have multiple things selected, don't deselect everything
    // This prevents accidental deselection when trying to click near the gizmo
    if (s.selectedBlockIds.includes(id) && (s.selectedBlockIds.length > 1 || s.selectedNodeIds.length > 0)) {
      return {};
    }
    return { selectedBlockIds: [id], selectedNodeIds: [] };
  }),
  selectNode: (id, append = false) => set((s) => {
    if (!id) return { selectedBlockIds: [], selectedNodeIds: [] };
    if (append) {
      return { 
        selectedNodeIds: s.selectedNodeIds.includes(id) ? s.selectedNodeIds.filter(n => n !== id) : [...s.selectedNodeIds, id]
      };
    }
    if (s.selectedNodeIds.includes(id) && (s.selectedNodeIds.length > 1 || s.selectedBlockIds.length > 0)) {
      return {};
    }
    return { selectedNodeIds: [id], selectedBlockIds: [] };
  }),
  setSelection: (selectedBlockIds, selectedNodeIds) => set({ selectedBlockIds, selectedNodeIds }),
  
  moveSelection: (dx, dz) => set((s) => {
    if (s.selectedBlockIds.length === 0 && s.selectedNodeIds.length === 0) return s;
    const blocks = s.blocks.map((b) => 
      s.selectedBlockIds.includes(b.id) 
        ? { ...b, posX: Number((b.posX + dx).toFixed(2)), posZ: Number((b.posZ + dz).toFixed(2)) }
        : b
    );
    const nodes = s.nodes.map((n) => 
      s.selectedNodeIds.includes(n.id) 
        ? { ...n, positionX: Number((n.positionX + dx).toFixed(2)), positionZ: Number((n.positionZ + dz).toFixed(2)) }
        : n
    );
    return pushHistory(s, { blocks, nodes });
  }),
  
  upsertBlock: (block) =>
    set((s) => {
      const idx = s.blocks.findIndex((b) => b.id === block.id);
      const blocks = idx >= 0 ? s.blocks.map((b) => (b.id === block.id ? block : b)) : [...s.blocks, block];
      return pushHistory(s, { blocks });
    }),
    
  upsertNode: (node) =>
    set((s) => {
      const idx = s.nodes.findIndex((n) => n.id === node.id);
      const nodes = idx >= 0 ? s.nodes.map((n) => (n.id === node.id ? node : n)) : [...s.nodes, node];
      return pushHistory(s, { nodes });
    }),
    
  addEdge: (edge) =>
    set((s) => {
      const existing = s.edges.find(
        (e) =>
          (e.fromNodeId === edge.fromNodeId && e.toNodeId === edge.toNodeId) ||
          (e.fromNodeId === edge.toNodeId && e.toNodeId === edge.fromNodeId)
      );
      if (existing) {
        return pushHistory(s, { edges: s.edges.filter((e) => e.id !== existing.id), edgeFromId: null });
      }
      return pushHistory(s, { edges: [...s.edges, edge], edgeFromId: null });
    }),
    
  removeBlock: (id) => 
    set((s) => pushHistory(s, { blocks: s.blocks.filter((b) => b.id !== id), selectedBlockIds: s.selectedBlockIds.filter(bid => bid !== id) })),
    
  removeNode: (id) =>
    set((s) => pushHistory(s, {
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.fromNodeId !== id && e.toNodeId !== id),
      selectedNodeIds: s.selectedNodeIds.filter(nid => nid !== id),
      edgeFromId: s.edgeFromId === id ? null : s.edgeFromId,
    })),
    
  setEdgeFrom: (edgeFromId) => set({ edgeFromId }),
  markClean: () => set({ dirty: false }),
  
  clearBlocks: () =>
    set((s) => pushHistory(s, { blocks: [], selectedBlockIds: [] })),
  
  clearGraph: () => 
    set((s) => pushHistory(s, { nodes: [], edges: [], selectedNodeIds: [], edgeFromId: null })),

  addMultipleBlocks: (count, startX, startZ) =>
    set((s) => {
      const newBlocks = Array.from({ length: count }).map((_, i) => ({
        id: crypto.randomUUID(),
        blockName: `BLK-${s.blocks.length + i + 1}`,
        posX: startX + (i * 3),
        posY: 0,
        posZ: startZ,
        scaleX: 2,
        scaleY: 2,
        scaleZ: 2,
        rotationY: 0,
        shape: "BOX" as const,
        tenantId: null,
      }));
      return pushHistory(s, { blocks: [...s.blocks, ...newBlocks] });
    }),
    
  loadPresetLayout: (tenantIds) =>
    set((s) => {
      const blocks: DraftBlock[] = [];
      const nodes: DraftNode[] = [];
      const edges: DraftEdge[] = [];
      
      const getTenant = (i: number) => tenantIds.length > 0 ? tenantIds[i % tenantIds.length] : null;

      let blockCount = 0;
      const addBlock = (posX: number, posZ: number, scaleX: number, scaleZ: number, shape: "BOX" | "CYLINDER", entranceX: number, entranceZ: number) => {
        const blockId = crypto.randomUUID();
        const entranceId = crypto.randomUUID();
        blocks.push({
          id: blockId,
          blockName: `BLK-${blockCount + 1}`,
          posX, posY: 0, posZ,
          scaleX, scaleY: 2, scaleZ,
          rotationY: 0,
          shape,
          tenantId: getTenant(blockCount)
        });
        nodes.push({
          id: entranceId,
          nodeName: `E${blockCount + 1}`,
          type: "TENANT_ENTRANCE",
          positionX: entranceX,
          positionY: 0.2,
          positionZ: entranceZ,
        });
        blockCount++;
        return entranceId;
      };

      const entranceIds: string[] = [];

      // Center (1 circle)
      entranceIds.push(addBlock(0, 0, 8, 8, "CYLINDER", 0, 5));

      // Top (5 blocks)
      for (let i = 0; i < 5; i++) {
        const x = -12 + (i * 6);
        entranceIds.push(addBlock(x, -12, 4, 4, "BOX", x, -9));
      }

      // Left (5 blocks)
      for (let i = 0; i < 5; i++) {
        const z = -6 + (i * 4);
        entranceIds.push(addBlock(-14, z, 4, 3, "BOX", -11, z));
      }

      // Right (4 blocks)
      for (let i = 0; i < 4; i++) {
        const z = -6 + (i * 6);
        entranceIds.push(addBlock(14, z, 4, 5, "BOX", 11, z));
      }

      const hubNodeId = crypto.randomUUID();
      nodes.push({
        id: hubNodeId,
        nodeName: "HUB",
        type: "WALKWAY",
        positionX: 0,
        positionY: 0.2,
        positionZ: 8,
      });

      const kioskNodeId = crypto.randomUUID();
      nodes.push({
        id: kioskNodeId,
        nodeName: "START",
        type: "KIOSK_START",
        positionX: 0,
        positionY: 0.2,
        positionZ: 16,
      });

      edges.push({
        id: crypto.randomUUID(),
        fromNodeId: kioskNodeId,
        toNodeId: hubNodeId,
        weight: 1,
        isAccessible: true,
      });

      for (const entId of entranceIds) {
        edges.push({
          id: crypto.randomUUID(),
          fromNodeId: hubNodeId,
          toNodeId: entId,
          weight: 1,
          isAccessible: true,
        });
      }

      return pushHistory(s, { blocks, nodes, edges, selectedBlockIds: [], selectedNodeIds: [], edgeFromId: null });
    }),
    
  undo: () =>
    set((s) => {
      if (s.historyIndex < 0) return s;
      const prevSnapshot = s.history[s.historyIndex];
      
      let newHistory = s.history;
      // If we are currently at the "head" of history, save our current state so we can redo it
      if (s.historyIndex === s.history.length - 1) {
        newHistory = [...s.history, { blocks: s.blocks, nodes: s.nodes, edges: s.edges }];
      }
      
      return {
        blocks: prevSnapshot.blocks,
        nodes: prevSnapshot.nodes,
        edges: prevSnapshot.edges,
        history: newHistory,
        historyIndex: s.historyIndex - 1,
        selectedBlockIds: [],
        selectedNodeIds: [],
        edgeFromId: null,
        dirty: true,
      };
    }),
    
  redo: () =>
    set((s) => {
      // If we are already at the head of the forward history (or the next state is our current appended state)
      // wait, if we appended S3, history is [S0, S1, S2, S3]. index is currently at S2 (index 1).
      // wait. If S0, S1, S2. index = 2.
      // S3 happens. Push S2. index = 2.
      // undo(): newHistory = [S0, S1, S2, S3]. index = 1 (points to S1). current state is S2.
      // redo(): index = 2 (points to S2). current state is S3 (newHistory[index + 1] -> newHistory[3]).
      
      if (s.historyIndex >= s.history.length - 2) return s; 
      // Because history length is at least index + 2 if there's a redo available.
      
      const nextSnapshot = s.history[s.historyIndex + 2];
      return {
        blocks: nextSnapshot.blocks,
        nodes: nextSnapshot.nodes,
        edges: nextSnapshot.edges,
        historyIndex: s.historyIndex + 1,
        selectedBlockIds: [],
        selectedNodeIds: [],
        edgeFromId: null,
        dirty: true,
      };
    }),

  commitHistory: () => set((s) => pushHistory(s, {})),

  scaleSelectedBlock: (deltaX, deltaY, deltaZ) => set((s) => {
    if (s.selectedBlockIds.length !== 1) return s;
    const blockId = s.selectedBlockIds[0];
    const blocks = s.blocks.map((b) => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        scaleX: Number(Math.max(0.2, b.scaleX + deltaX).toFixed(2)),
        scaleY: Number(Math.max(0.2, b.scaleY + deltaY).toFixed(2)),
        scaleZ: Number(Math.max(0.2, b.scaleZ + deltaZ).toFixed(2)),
      };
    });
    return pushHistory(s, { blocks });
  }),

  rotateSelectedBlock: (deltaY) => set((s) => {
    if (s.selectedBlockIds.length !== 1) return s;
    const blockId = s.selectedBlockIds[0];
    const blocks = s.blocks.map((b) => {
      if (b.id !== blockId) return b;
      let currentRot = Number.isNaN(b.rotationY) || b.rotationY == null ? 0 : b.rotationY;
      let newRot = currentRot + deltaY;
      // Keep it within 0 to 2*PI roughly
      if (newRot > Math.PI * 2) newRot -= Math.PI * 2;
      if (newRot < 0) newRot += Math.PI * 2;
      return {
        ...b,
        rotationY: Number(newRot.toFixed(4)),
      };
    });
    return pushHistory(s, { blocks });
  }),
}));
