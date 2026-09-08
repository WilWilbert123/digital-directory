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
      className="fixed bottom-0 left-0 right-0 z-[80] flex justify-center pb-3 sm:pb-5 px-3 pointer-events-none"
    >
      {/* Individual floating white parallelogram buttons */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <motion.button
              key={id}
              whileHover={{ y: -3, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => {
                if (id === "home") {
                  goHome();
                } else if (id === "search") {
                  openMapWithSearch();
                } else {
                  setActiveView(id);
                }
              }}
              className={cn(
                "relative group flex items-center -skew-x-12 rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-300",
                "backdrop-blur-md shadow-md shadow-slate-900/10",
                isActive
                  ? "bg-teal-400 text-slate-950 border border-teal-300 shadow-lg shadow-teal-500/25 font-black"
                  : "bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:border-slate-300 hover:shadow-lg"
              )}
            >
              {/* Counter-skewed content container so icon and label stay upright */}
              <div className="flex items-center gap-2.5 skew-x-12">
                <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-slate-950" : "text-teal-600")} />
                <span className="inline tracking-wide font-extrabold">{label}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
