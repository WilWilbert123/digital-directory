"use client";

import { create } from "zustand";
import type { PathResult } from "@/lib/pathfinding";

export type KioskTenant = {
  id: string;
  tenantCode: string;
  tenantName: string;
  logoURL: string | null;
  description: string | null;
  categoryId: string;
  floorId: string;
  entranceNodeId: string | null;
  category: { id: string; categoryName: string; colorHex: string; iconURL: string | null; categoryCode: string };
  floor: { id: string; floorName: string; floorCode: string; levelNumber: number };
};

type KioskState = {
  query: string;
  categoryId: string | null;
  selectedTenantId: string | null;
  startNodeId: string | null;
  route: PathResult | null;
  idleSeconds: number;
  keyboardOpen: boolean;
  setQuery: (q: string) => void;
  appendKey: (key: string) => void;
  backspace: () => void;
  clearQuery: () => void;
  setCategoryId: (id: string | null) => void;
  setSelectedTenant: (id: string | null) => void;
  setStartNodeId: (id: string | null) => void;
  setRoute: (route: PathResult | null) => void;
  tickIdle: () => void;
  resetIdle: () => void;
  setKeyboardOpen: (open: boolean) => void;
};

export const useKioskStore = create<KioskState>((set) => ({
  query: "",
  categoryId: null,
  selectedTenantId: null,
  startNodeId: process.env.NEXT_PUBLIC_DEFAULT_START_NODE ?? null,
  route: null,
  idleSeconds: 0,
  keyboardOpen: false,
  setQuery: (query) => set({ query, idleSeconds: 0, keyboardOpen: true }),
  appendKey: (key) =>
    set((s) => ({
      query: (s.query + key).slice(0, 64),
      idleSeconds: 0,
    })),
  backspace: () => set((s) => ({ query: s.query.slice(0, -1), idleSeconds: 0 })),
  clearQuery: () => set({ query: "", idleSeconds: 0 }),
  setCategoryId: (categoryId) => set({ categoryId, idleSeconds: 0 }),
  setSelectedTenant: (selectedTenantId) => set({ selectedTenantId, idleSeconds: 0 }),
  setStartNodeId: (startNodeId) => set({ startNodeId }),
  setRoute: (route) => set({ route }),
  tickIdle: () => set((s) => ({ idleSeconds: s.idleSeconds + 1 })),
  resetIdle: () => set({ idleSeconds: 0 }),
  setKeyboardOpen: (keyboardOpen) => set({ keyboardOpen, idleSeconds: 0 }),
}));
