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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-4">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="flex items-center gap-2 p-3 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
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
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-inner" 
                      : "text-slate-300 hover:bg-white/10 hover:text-white border border-transparent"
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

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className={`h-16 w-16 flex items-center justify-center rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-colors border ${
          open 
            ? "bg-slate-800 border-white/20 text-white" 
            : "bg-sky-600 border-sky-400 text-white hover:bg-sky-500"
        }`}
      >
        {open ? <X size={28} /> : <Menu size={28} />}
      </motion.button>
    </div>
  );
}
