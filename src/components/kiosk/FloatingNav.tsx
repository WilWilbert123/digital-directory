"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Map, Navigation, Search, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FloatingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", icon: <Search size={24} />, label: "Search" },
    { href: "/categories", icon: <LayoutGrid size={24} />, label: "Categories" },
    { href: "/floor-plan", icon: <Map size={24} />, label: "Floor Plan" },
    { href: "/directions", icon: <Navigation size={24} />, label: "Directions" },
  ];

  return (
    <div className="fixed top-24 left-8 z-[80] flex flex-col items-start gap-4">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className={`h-16 w-16 flex items-center justify-center rounded-full shadow-xl transition-colors border ${
          open 
            ? "bg-kiosk-surface border-kiosk-border text-foreground" 
            : "bg-foreground text-background hover:opacity-90"
        }`}
      >
        {open ? <X size={28} /> : <Menu size={28} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="flex flex-col gap-2 p-3 rounded-3xl glass-panel shadow-2xl"
          >
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl transition-all w-24 ${
                    isActive 
                      ? "bg-foreground text-background" 
                      : "text-kiosk-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  {link.icon}
                  <span className="text-xs font-bold">{link.label}</span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
