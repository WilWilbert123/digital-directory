"use client";

import { Search, X, Keyboard } from "lucide-react";
import { useKioskStore } from "@/store/useKioskStore";
import { motion, AnimatePresence } from "framer-motion";

export function SearchField() {
  const query = useKioskStore((s) => s.query);
  const clearQuery = useKioskStore((s) => s.clearQuery);
  const setQuery = useKioskStore((s) => s.setQuery);
  const keyboardOpen = useKioskStore((s) => s.keyboardOpen);
  const setKeyboardOpen = useKioskStore((s) => s.setKeyboardOpen);

  const isExpanded = keyboardOpen || query.length > 0;

  return (
    <div className="fixed top-24 right-8 z-[70] flex items-center justify-end h-20">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.button
            key="icon"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => setKeyboardOpen(true)}
            className="flex h-16 w-16 items-center justify-center rounded-full glass-panel bg-kiosk-surface/90 hover:bg-white/10 active:scale-95 shadow-2xl border border-white/10 text-foreground transition-colors"
          >
            <Search className="h-7 w-7" />
          </motion.button>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, width: 64 }}
            animate={{ opacity: 1, width: 600 }}
            exit={{ opacity: 0, width: 64 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            className="relative flex items-center h-full w-[600px] max-w-[calc(100vw-4rem)]"
          >
            <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none z-10">
              <Search className="h-8 w-8 text-kiosk-muted" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="absolute inset-0 block h-full w-full rounded-[3rem] glass-panel bg-kiosk-surface/95 py-6 pl-20 pr-32 text-3xl font-medium outline-none placeholder:text-kiosk-muted/60 focus:ring-2 focus:ring-white/20 transition-all shadow-2xl backdrop-blur-xl border-white/10"
              autoFocus
            />
            <div className="absolute inset-y-0 right-4 my-auto flex items-center gap-2 z-10">
              {query ? (
                <button
                  onClick={clearQuery}
                  className="flex h-12 w-12 items-center justify-center rounded-full glass-button hover:bg-white/10 active:scale-95 transition-all text-kiosk-muted hover:text-foreground"
                >
                  <X className="h-6 w-6" />
                </button>
              ) : null}
              <button
                onClick={() => setKeyboardOpen(false)}
                className="flex h-12 w-12 items-center justify-center rounded-full active:scale-95 transition-all bg-foreground text-background shadow-lg"
              >
                <Keyboard className="h-6 w-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
