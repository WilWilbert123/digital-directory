"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OnScreenKeyboard } from "@/components/kiosk/OnScreenKeyboard";
import { SearchField } from "@/components/kiosk/SearchField";
import { CategorySelector, type CategoryOption } from "@/components/kiosk/CategorySelector";
import { useKioskStore, type KioskTenant } from "@/store/useKioskStore";

export function HomeSearch({ tenants, categories }: { tenants: KioskTenant[], categories: CategoryOption[] }) {
  const query = useKioskStore((s) => s.query);
  const keyboardOpen = useKioskStore((s) => s.keyboardOpen);
  const setSelectedTenant = useKioskStore((s) => s.setSelectedTenant);

  const categoryId = useKioskStore((s) => s.categoryId);

  const matches = useMemo(() => {
    let filtered = tenants;
    if (categoryId) {
      filtered = filtered.filter((t) => t.categoryId === categoryId);
    }
    
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    
    return filtered.filter(
      (t) =>
        t.tenantName.toLowerCase().includes(q) ||
        t.tenantCode.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [query, tenants, categoryId]);

  return (
    <div className="w-full max-w-7xl mx-auto h-full pt-8 pb-8 flex flex-col relative">
      <SearchField />
      
      <div className="px-6 shrink-0 mb-4">
        <CategorySelector categories={categories} />
      </div>
      
      <motion.div layout className="flex-1 min-h-0 w-full">
        <div className="h-full overflow-y-auto no-scrollbar px-6 pb-24 grid gap-8 grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 content-start">
          <AnimatePresence mode="popLayout">
          {matches.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, type: "spring", bounce: 0.3 }}
            >
              <button
                onClick={() => setSelectedTenant(t.id)}
                className="flex flex-col items-center h-full group outline-none w-full"
              >
                {/* Massive Floating Logo */}
                {t.logoURL ? (
                  <div className="h-32 w-32 rounded-full bg-white p-5 shadow-xl flex items-center justify-center shrink-0 group-hover:scale-110 group-active:scale-95 transition-transform duration-300 mb-4 ring-0 group-hover:ring-4 ring-white/10">
                    <img 
                      src={t.logoURL} 
                      alt={`${t.tenantName} logo`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="h-32 w-32 rounded-full flex items-center justify-center shrink-0 shadow-xl group-hover:scale-110 group-active:scale-95 transition-transform duration-300 mb-4 ring-0 group-hover:ring-4 ring-white/10"
                    style={{ 
                      backgroundColor: t.category.colorHex,
                      opacity: 0.95
                    }}
                  >
                    <span className="text-4xl font-extrabold text-white tracking-wider">{t.tenantCode.slice(0, 3)}</span>
                  </div>
                )}

                {/* Minimalist Typography */}
                <div className="text-center px-2">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-white transition-colors leading-tight">
                    {t.tenantName}
                  </h3>
                  <p className="text-xs font-medium text-kiosk-muted mt-1 opacity-60">
                    {t.floor.floorName}
                  </p>
                </div>
              </button>
            </motion.div>
          ))}
          </AnimatePresence>
          
          {query && matches.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full rounded-3xl glass-panel p-12 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-kiosk-accent/10 flex items-center justify-center text-kiosk-accent text-2xl">
              ?
            </div>
            <p className="text-xl font-medium">No matching tenants found.</p>
            <p className="text-kiosk-muted mt-2">Try searching for a different keyword or category.</p>
          </motion.div>
          )}
        </div>
      </motion.div>
      <AnimatePresence>
        {keyboardOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-4 left-6 right-6 z-[60]"
          >
            <OnScreenKeyboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
