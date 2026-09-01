"use client";

import { Search, X } from "lucide-react";
import { useKioskStore } from "@/store/useKioskStore";

export function SearchField() {
  const query = useKioskStore((s) => s.query);
  const clearQuery = useKioskStore((s) => s.clearQuery);

  return (
    <div className="relative mx-auto max-w-2xl mb-12">
      <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
        <Search className="h-7 w-7 text-kiosk-muted" />
      </div>
      <div className="absolute -inset-1 bg-gradient-to-r from-kiosk-accent/20 to-purple-500/20 rounded-[2.5rem] blur-lg opacity-50"></div>
      <input
        type="text"
        readOnly
        value={query}
        placeholder="Type to search..."
        className="relative block w-full rounded-[2.5rem] glass-panel bg-kiosk-surface/80 py-6 pl-16 pr-16 text-2xl font-medium outline-none placeholder:text-kiosk-muted/60 focus:ring-4 focus:ring-kiosk-accent/30 transition-all shadow-xl"
      />
      {query ? (
        <button
          onClick={clearQuery}
          className="absolute inset-y-0 right-4 my-auto flex h-12 w-12 items-center justify-center rounded-full glass-button hover:bg-white/10 active:scale-95 transition-all text-kiosk-muted hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}
