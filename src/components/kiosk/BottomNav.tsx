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
  const activeView       = useKioskStore((s) => s.activeView);
  const setActiveView    = useKioskStore((s) => s.setActiveView);
  const goHome           = useKioskStore((s) => s.goHome);
  const idleSeconds      = useKioskStore((s) => s.idleSeconds);
  const selectedTenantId = useKioskStore((s) => s.selectedTenantId);

  // Hide during screensaver or when viewing wayfinding map for a selected store
  if (idleSeconds >= 60 || selectedTenantId) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-[80] flex justify-center pb-3 sm:pb-5 px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/80 px-2 py-2 shadow-2xl backdrop-blur-xl border border-white/10">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.93 }}
              onClick={() => id === "home" ? goHome() : setActiveView(id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all duration-300",
                isActive
                  ? "bg-teal-400 text-black shadow-lg shadow-teal-400/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
