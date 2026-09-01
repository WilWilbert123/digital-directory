"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OnScreenKeyboard } from "@/components/kiosk/OnScreenKeyboard";
import { SearchField } from "@/components/kiosk/SearchField";
import { useKioskStore, type KioskTenant } from "@/store/useKioskStore";

export function HomeSearch({ tenants }: { tenants: KioskTenant[] }) {
  const query = useKioskStore((s) => s.query);
  const setSelectedTenant = useKioskStore((s) => s.setSelectedTenant);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants.slice(0, 8);
    return tenants.filter(
      (t) =>
        t.tenantName.toLowerCase().includes(q) ||
        t.tenantCode.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }, [query, tenants]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-32 pt-8">
      <div className="flex flex-col items-center justify-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight bg-gradient-to-br from-foreground to-kiosk-muted bg-clip-text text-transparent">
          Where would you like to go?
        </h1>
        <p className="text-kiosk-muted text-lg">Search by store name, category, or code</p>
      </div>
      
      <SearchField />
      
      <motion.div layout className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <Link
                href={`/directions?tenant=${t.id}`}
                onClick={() => setSelectedTenant(t.id)}
                className="flex flex-col h-full gap-4 rounded-3xl glass-panel p-5 group transition-shadow hover:shadow-2xl hover:shadow-kiosk-accent/10"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white shadow-inner"
                    style={{ 
                      background: `linear-gradient(135deg, ${t.category.colorHex}, #00000040)` 
                    }}
                  >
                    {t.tenantCode.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold truncate group-hover:text-kiosk-accent transition-colors">{t.tenantName}</p>
                    <p className="text-sm font-medium text-kiosk-muted truncate">
                      {t.category.categoryName}
                    </p>
                  </div>
                </div>
                <div className="mt-auto pt-2 flex items-center justify-between border-t border-kiosk-border/50">
                  <span className="text-xs font-medium uppercase tracking-wider text-kiosk-muted bg-kiosk-surface/50 px-2 py-1 rounded-md">
                    {t.floor.floorName}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-kiosk-accent/10 flex items-center justify-center text-kiosk-accent group-hover:bg-kiosk-accent group-hover:text-white transition-colors">
                    →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {matches.length === 0 && (
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
      </motion.div>
      <OnScreenKeyboard />
    </div>
  );
}
