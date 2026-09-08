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
      {/* Individual floating liquid glass buttons */}
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
                "relative group flex items-center gap-2 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-300 overflow-hidden",
                "backdrop-blur-2xl shadow-xl shadow-black/25",
                isActive
                  ? "bg-gradient-to-b from-teal-400 to-teal-500 text-black border border-teal-200/60 shadow-[0_8px_25px_rgba(20,184,166,0.4)]"
                  : "bg-[#18181b]/85 hover:bg-[#27272a]/95 text-white/90 hover:text-white border border-white/20 hover:border-white/35"
              )}
            >
              {/* Glossy liquid top highlight reflection */}
              <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-2xl" />

              {/* Liquid bottom light glow */}
              <div
                className={cn(
                  "absolute inset-x-2 -bottom-2 h-3 rounded-full blur-sm transition-opacity duration-300 pointer-events-none",
                  isActive ? "bg-teal-200/60 opacity-100" : "bg-white/15 opacity-0 group-hover:opacity-100"
                )}
              />

              <Icon className={cn("h-4 w-4 shrink-0 relative z-10 transition-transform group-hover:scale-110", isActive ? "text-black" : "text-teal-400")} />
              <span className="inline relative z-10 tracking-wide font-extrabold">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
