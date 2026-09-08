"use client";

import { create } from "zustand";
import type { PathResult } from "@/lib/pathfinding";

export type KioskView = "home" | "search" | "map" | "promos" | "cinema";

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
  // Search / query
  query: string;
  categoryId: string | null;
  keyboardOpen: boolean;

  // Navigation
  activeView: KioskView;
  selectedCategoryGroup: string | null;   // e.g. "food", "fashion"
  selectedSubcategoryId: string | null;   // DB category ID

  // Wayfinding & Destination in Map
  destinationTenant: KioskTenant | null;
  autoOpenSearch: boolean;
  selectedTenantId: string | null;
  startNodeId: string | null;
  route: PathResult | null;

  // Idle / screensaver
  idleSeconds: number;

  // Actions — search
  setQuery: (q: string) => void;
  appendKey: (key: string) => void;
  backspace: () => void;
  clearQuery: () => void;
  setCategoryId: (id: string | null) => void;
  setKeyboardOpen: (open: boolean) => void;

  // Actions — navigation
  setActiveView: (view: KioskView) => void;
  selectCategoryGroup: (group: string | null) => void;
  selectSubcategory: (id: string | null) => void;
  goHome: () => void;
  openMapWithSearch: () => void;
  openMapWithDestination: (tenant: KioskTenant) => void;

  // Actions — wayfinding
  setDestinationTenant: (tenant: KioskTenant | null) => void;
  setAutoOpenSearch: (open: boolean) => void;
  setSelectedTenant: (id: string | null) => void;
  setStartNodeId: (id: string | null) => void;
  setRoute: (route: PathResult | null) => void;

  // Actions — idle
  tickIdle: () => void;
  resetIdle: () => void;
};

export const useKioskStore = create<KioskState>((set) => ({
  // Search
  query: "",
  categoryId: null,
  keyboardOpen: false,

  // Navigation
  activeView: "home",
  selectedCategoryGroup: null,
  selectedSubcategoryId: null,

  // Wayfinding
  destinationTenant: null,
  autoOpenSearch: false,
  selectedTenantId: null,
  startNodeId: process.env.NEXT_PUBLIC_DEFAULT_START_NODE ?? null,
  route: null,

  // Idle
  idleSeconds: 0,

  // Search actions
  setQuery: (query) => set({ query, idleSeconds: 0 }),
  appendKey: (key) =>
    set((s) => ({
      query: (s.query + key).slice(0, 64),
      idleSeconds: 0,
    })),
  backspace: () => set((s) => ({ query: s.query.slice(0, -1), idleSeconds: 0 })),
  clearQuery: () => set({ query: "", idleSeconds: 0 }),
  setCategoryId: (categoryId) => set({ categoryId, idleSeconds: 0 }),
  setKeyboardOpen: (keyboardOpen) => set({ keyboardOpen, idleSeconds: 0 }),

  // Navigation actions
  setActiveView: (activeView) =>
    set({ activeView, selectedCategoryGroup: null, selectedSubcategoryId: null, idleSeconds: 0 }),
  selectCategoryGroup: (selectedCategoryGroup) =>
    set({ selectedCategoryGroup, selectedSubcategoryId: null, idleSeconds: 0 }),
  selectSubcategory: (selectedSubcategoryId) =>
    set({ selectedSubcategoryId, idleSeconds: 0 }),
  goHome: () =>
    set({ activeView: "home", selectedCategoryGroup: null, selectedSubcategoryId: null, selectedTenantId: null, idleSeconds: 0 }),
  openMapWithSearch: () =>
    set({ activeView: "map", autoOpenSearch: true, selectedCategoryGroup: null, selectedSubcategoryId: null, selectedTenantId: null, idleSeconds: 0 }),
  openMapWithDestination: (destinationTenant) =>
    set({ activeView: "map", destinationTenant, autoOpenSearch: false, selectedCategoryGroup: null, selectedSubcategoryId: null, selectedTenantId: null, idleSeconds: 0 }),

  // Wayfinding actions
  setDestinationTenant: (destinationTenant) => set({ destinationTenant, idleSeconds: 0 }),
  setAutoOpenSearch: (autoOpenSearch) => set({ autoOpenSearch }),
  setSelectedTenant: (selectedTenantId) => set({ selectedTenantId, idleSeconds: 0 }),
  setStartNodeId: (startNodeId) => set({ startNodeId }),
  setRoute: (route) => set({ route }),

  // Idle actions
  tickIdle: () => set((s) => ({ idleSeconds: s.idleSeconds + 1 })),
  resetIdle: () => set({ idleSeconds: 0 }),
}));
