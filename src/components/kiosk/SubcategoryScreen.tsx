"use client";

import { ArrowLeft, ChevronRight, Utensils, Coffee, ShoppingBag, Zap, Store } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useKioskStore } from "@/store/useKioskStore";
import { CATEGORY_GROUPS, getCategoriesForGroup } from "@/lib/kioskCategories";
import type { CategoryOption } from "@/components/kiosk/CategorySelector";

const SUBCATEGORY_ICONS: Record<string, React.ElementType> = {
  "casual dining":   Utensils,
  "food court":      Store,
  "food hall":       Store,
  "novelty food":    Zap,
  "pastries":        Coffee,
  "desserts":        Coffee,
  "beverages":       Coffee,
  "quick service":   ShoppingBag,
};

function getSubcategoryIcon(name: string): React.ElementType {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(SUBCATEGORY_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Store;
}

export function SubcategoryScreen({ categories }: { categories: CategoryOption[] }) {
  const selectedCategoryGroup = useKioskStore((s) => s.selectedCategoryGroup);
  const selectCategoryGroup   = useKioskStore((s) => s.selectCategoryGroup);
  const selectSubcategory     = useKioskStore((s) => s.selectSubcategory);

  const group = CATEGORY_GROUPS.find((g) => g.id === selectedCategoryGroup);
  const subcategories = getCategoriesForGroup(selectedCategoryGroup ?? "", categories);

  if (!group) return null;

  const color = subcategories[0]?.colorHex ?? group.defaultColor;

  return (
    <div className="h-full w-full flex flex-col pb-20 sm:pb-24 overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 px-4 sm:px-8 py-5 sm:py-8 flex items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${color}22, transparent)` }}
      >
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => selectCategoryGroup(null)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/20 text-foreground hover:bg-white/20 transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </motion.button>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">Category</p>
          <h1 className="text-2xl sm:text-4xl font-black text-foreground">{group.label}</h1>
        </div>
      </div>

      {/* Subcategory Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-8 py-2">
        {subcategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
            <Store className="h-12 w-12" />
            <p className="text-lg font-medium">No subcategories found in database.</p>
            <p className="text-sm opacity-60">Add categories matching this group to your admin panel.</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {subcategories.map((cat, i) => {
                const Icon = getSubcategoryIcon(cat.categoryName);
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.07 } }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => selectSubcategory(cat.id)}
                    className="relative flex items-center gap-4 rounded-2xl border border-white/10 p-4 sm:p-5 text-left transition-all hover:border-white/30 overflow-hidden"
                    style={{ background: `${cat.colorHex}18` }}
                  >
                    {/* Color accent strip */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                      style={{ backgroundColor: cat.colorHex }}
                    />

                    <div
                      className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${cat.colorHex}30` }}
                    >
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: cat.colorHex }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-lg font-bold text-foreground leading-tight">
                        {cat.categoryName}
                      </h3>
                      <p className="text-xs opacity-50 mt-0.5 uppercase tracking-wider">
                        {cat.categoryCode}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 opacity-30 shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
