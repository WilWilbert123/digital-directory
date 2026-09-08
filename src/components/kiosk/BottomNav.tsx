"use client";

import { motion } from "framer-motion";
import { Home, Search, MapPin, Tag, Film } from "lucide-react";
import { useKioskStore, type KioskView } from "@/store/useKioskStore";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { id: KioskView; label: string; Icon: React.ElementType }[] = [
  { id: "home",   label: "HOME",   Icon: Home   },
  { id: "search", label: "Search", Icon: Search },
  { id: "map",    label: "Map",    Icon: MapPin  },
  { id: "promos", label: "Promos", Icon: Tag     },
  { id: "cinema", label: "Cinema", Icon: Film    },
];

export function BottomNav() {
  const activeView         = useKioskStore((s) => s.activeView);
  const setActiveView      = useKioskStore((s) => s.setActiveView);
  const goHome             = useKioskStore((s) => s.goHome);
  const openMapWithSearch  = useKioskStore((s) => s.openMapWithSearch);
  const idleSeconds        = useKioskStore((s) => s.idleSeconds);
  const selectedTenantId   = useKioskStore((s) => s.selectedTenantId);

  // Hide during screensaver or when viewing wayfinding map for a selected store
  if (idleSeconds >= 60 || selectedTenantId) return null;

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      className="fixed bottom-0 left-0 right-0 z-[80] px-2 pb-2 sm:pb-4 sm:px-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full flex items-end justify-center gap-1.5 sm:gap-2.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <motion.div
              key={id}
              className="flex-1 min-w-0"
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Mobile: compact pill — icon + tiny label stacked */}
              <button
                onClick={() => {
                  if (id === "home") goHome();
                  else if (id === "search") openMapWithSearch();
                  else setActiveView(id);
                }}
                className={cn(
                  "w-full flex sm:hidden flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-1 transition-all duration-200",
                  "shadow-md shadow-slate-900/10",
                  isActive
                    ? "bg-teal-400 text-slate-950"
                    : "bg-white/95 text-slate-600 border border-slate-200"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-slate-950" : "text-teal-600")} />
                <span className="text-[9px] font-black uppercase tracking-tight leading-none">{label}</span>
              </button>

              {/* Desktop / Kiosk: parallelogram style */}
              <button
                onClick={() => {
                  if (id === "home") goHome();
                  else if (id === "search") openMapWithSearch();
                  else setActiveView(id);
                }}
                style={{ transform: "skewX(-12deg)" }}
                className={cn(
                  "hidden sm:flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300",
                  "backdrop-blur-md shadow-md shadow-slate-900/10",
                  isActive
                    ? "bg-teal-400 text-slate-950 border border-teal-300 shadow-lg shadow-teal-500/25"
                    : "bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:border-slate-300 hover:shadow-lg"
                )}
              >
                <div style={{ transform: "skewX(12deg)" }} className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-slate-950" : "text-teal-600")} />
                  <span className="font-extrabold tracking-wide">{label}</span>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.nav>
  );
}
