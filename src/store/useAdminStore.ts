"use client";

import { create } from "zustand";
import type { PathNodeType } from "@/lib/pathfinding";

export type EditorTool = "select" | "block" | "node" | "edge";

export type DraftBlock = {
  id: string;
  blockName: string;
  posX: number;
  posY: number;
  posZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
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
  selectedBlockId: string | null;
  selectedNodeId: string | null;
  edgeFromId: string | null;
  blocks: DraftBlock[];
  nodes: DraftNode[];
  edges: DraftEdge[];
  dirty: boolean;
  history: HistorySnapshot[];
  historyIndex: number;
  setTool: (tool: EditorTool) => void;
  hydrate: (payload: { blocks: DraftBlock[]; nodes: DraftNode[]; edges: DraftEdge[] }) => void;
  selectBlock: (id: string | null) => void;
  selectNode: (id: string | null) => void;
  upsertBlock: (block: DraftBlock) => void;
  upsertNode: (node: DraftNode) => void;
  addEdge: (edge: DraftEdge) => void;
  removeBlock: (id: string) => void;
  removeNode: (id: string) => void;
  setEdgeFrom: (id: string | null) => void;
  markClean: () => void;
  undo: () => void;
  redo: () => void;
  clearGraph: () => void;
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
  selectedBlockId: null,
  selectedNodeId: null,
  edgeFromId: null,
  blocks: [],
  nodes: [],
  edges: [],
  dirty: false,
  history: [],
  historyIndex: -1,
  
  setTool: (tool) => set({ tool }),
  hydrate: (payload) => set({ ...payload, dirty: false, history: [], historyIndex: -1, selectedBlockId: null, selectedNodeId: null, edgeFromId: null }),
  selectBlock: (selectedBlockId) => set({ selectedBlockId, selectedNodeId: null }),
  selectNode: (selectedNodeId) => set({ selectedNodeId, selectedBlockId: null }),
  
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
    set((s) => pushHistory(s, { blocks: s.blocks.filter((b) => b.id !== id), selectedBlockId: null })),
    
  removeNode: (id) =>
    set((s) => pushHistory(s, {
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.fromNodeId !== id && e.toNodeId !== id),
      selectedNodeId: null,
      edgeFromId: s.edgeFromId === id ? null : s.edgeFromId,
    })),
    
  setEdgeFrom: (edgeFromId) => set({ edgeFromId }),
  markClean: () => set({ dirty: false }),
  
  clearGraph: () => 
    set((s) => pushHistory(s, { nodes: [], edges: [], selectedNodeId: null, edgeFromId: null })),
    
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
        selectedBlockId: null,
        selectedNodeId: null,
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
        selectedBlockId: null,
        selectedNodeId: null,
        edgeFromId: null,
        dirty: true,
      };
    }),
}));
