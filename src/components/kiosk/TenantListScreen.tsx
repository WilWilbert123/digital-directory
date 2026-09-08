"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useKioskStore, type KioskTenant } from "@/store/useKioskStore";
import type { CategoryOption } from "@/components/kiosk/CategorySelector";
import { CATEGORY_GROUPS } from "@/lib/kioskCategories";

// ── Cravings / cuisine filter tags ──────────────────────────────────────────
const CRAVING_FILTERS = [
  "All", "Filipino", "Asian", "Western", "Japanese", "Korean",
  "Vegetarian", "Fast Food", "Cafe", "Desserts", "Italian", "Chinese",
];

// Alphabetical letters (A–Z) for quick-jump
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function TenantListScreen({
  tenants,
  categories,
}: {
  tenants: KioskTenant[];
  categories: CategoryOption[];
}) {
  const selectedSubcategoryId = useKioskStore((s) => s.selectedSubcategoryId);
  const selectedCategoryGroup = useKioskStore((s) => s.selectedCategoryGroup);
  const selectSubcategory     = useKioskStore((s) => s.selectSubcategory);
  const setSelectedTenant     = useKioskStore((s) => s.setSelectedTenant);

  const [search, setSearch] = useState("");
  const [craving, setCraving] = useState("All");
  const [alphaFilter, setAlphaFilter] = useState<string | null>(null);

  // The selected DB category
  const category = categories.find((c) => c.id === selectedSubcategoryId);
  const group = CATEGORY_GROUPS.find((g) => g.id === selectedCategoryGroup);

  // Filter tenants by selected DB category
  const filtered = useMemo(() => {
    let result = tenants.filter((t) => t.categoryId === selectedSubcategoryId);

    // Search query
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (t) =>
          t.tenantName.toLowerCase().includes(q) ||
          t.tenantCode.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
      );
    }

    // Craving filter (match against tenant name/description loosely)
    if (craving !== "All") {
      result = result.filter(
        (t) =>
          t.tenantName.toLowerCase().includes(craving.toLowerCase()) ||
          (t.description ?? "").toLowerCase().includes(craving.toLowerCase())
      );
    }

    // Alphabetical filter
    if (alphaFilter) {
      result = result.filter((t) =>
        t.tenantName.toUpperCase().startsWith(alphaFilter)
      );
    }

    return result;
  }, [tenants, selectedSubcategoryId, search, craving, alphaFilter]);

  // Group by floor, sorted by levelNumber
  const byFloor = useMemo(() => {
    const map: Record<string, { levelNumber: number; tenants: KioskTenant[] }> = {};
    for (const t of filtered) {
      const key = t.floor.floorName;
      if (!map[key]) map[key] = { levelNumber: t.floor.levelNumber, tenants: [] };
      map[key].tenants.push(t);
    }
    return Object.entries(map).sort((a, b) => a[1].levelNumber - b[1].levelNumber);
  }, [filtered]);

  if (!category) return null;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden pb-20 sm:pb-24">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 sm:px-8 pt-4 sm:pt-6 pb-3"
        style={{ background: `linear-gradient(135deg, ${category.colorHex}22, transparent)` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => selectSubcategory(null)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-foreground hover:bg-white/20 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </motion.button>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">{group?.label}</p>
            <h1 className="text-lg sm:text-2xl font-black text-foreground truncate">{category.categoryName}</h1>
          </div>

          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-black text-white"
            style={{ backgroundColor: category.colorHex }}
          >
            {filtered.length} stores
          </span>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kiosk-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search in ${category.categoryName}…`}
            className="w-full rounded-2xl bg-white/5 border border-white/10 pl-9 pr-9 py-2.5 text-sm outline-none placeholder:text-kiosk-muted/60 focus:ring-2 focus:ring-white/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-kiosk-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Tenant List (grouped by floor) ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-8 py-2">
        {byFloor.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <Search className="h-10 w-10" />
            <p className="text-lg font-medium">No stores found.</p>
          </div>
        ) : (
          <AnimatePresence>
            {byFloor.map(([floorName, { tenants: floorTenants }]) => (
              <div key={floorName} className="mb-6">
                {/* Floor label */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-px flex-1"
                    style={{ background: `linear-gradient(to right, ${category.colorHex}60, transparent)` }}
                  />
                  <span
                    className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${category.colorHex}20`, color: category.colorHex }}
                  >
                    {floorName}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: `linear-gradient(to left, ${category.colorHex}60, transparent)` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {floorTenants.map((t, i) => (
                    <motion.button
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04 } }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedTenant(t.id)}
                      className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:border-white/25 hover:bg-white/5 transition-all"
                    >
                      {/* Logo / Avatar */}
                      <div
                        className="h-11 w-11 rounded-full shrink-0 flex items-center justify-center overflow-hidden shadow-md"
                        style={{ backgroundColor: `${t.category.colorHex}25` }}
                      >
                        {t.logoURL ? (
                          <img
                            src={t.logoURL}
                            alt={t.tenantName}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <span
                            className="text-xs font-black"
                            style={{ color: t.category.colorHex }}
                          >
                            {t.tenantCode.slice(0, 3)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight truncate">
                          {t.tenantName}
                        </p>
                        <p className="text-[10px] opacity-40 uppercase tracking-wider mt-0.5">
                          {t.tenantCode}
                        </p>
                      </div>

                      {/* Get Directions cue */}
                      <span className="shrink-0 text-[10px] font-bold text-teal-400 opacity-70">
                        DIRECTIONS →
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Bottom Filters (Cravings + Alphabetical) ────────────────────── */}
      <div className="shrink-0 border-t border-white/10 bg-background/80 backdrop-blur-xl">
        {/* Craving filters */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 px-4 pt-2.5 pb-1">
          {CRAVING_FILTERS.map((tag) => (
            <button
              key={tag}
              onClick={() => setCraving(tag)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap transition-all ${
                craving === tag
                  ? "text-white shadow-md"
                  : "bg-white/5 text-foreground/50 border border-white/10 hover:bg-white/10"
              }`}
              style={
                craving === tag
                  ? { backgroundColor: category.colorHex }
                  : undefined
              }
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Alphabetical strip */}
        <div className="flex overflow-x-auto no-scrollbar gap-1 px-4 py-2">
          {ALPHA.map((letter) => (
            <button
              key={letter}
              onClick={() => setAlphaFilter(alphaFilter === letter ? null : letter)}
              className={`shrink-0 h-7 w-7 rounded-lg text-[10px] font-bold transition-all ${
                alphaFilter === letter
                  ? "text-black shadow"
                  : "bg-white/5 text-foreground/40 hover:bg-white/10"
              }`}
              style={alphaFilter === letter ? { backgroundColor: category.colorHex } : undefined}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
