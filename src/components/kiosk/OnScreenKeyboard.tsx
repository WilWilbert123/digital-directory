"use client";

import { Delete, Space, ChevronDown } from "lucide-react";
import { useKioskStore } from "@/store/useKioskStore";
import { cn } from "@/lib/utils";

const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "&"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "'"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ".", ","],
  ["Z", "X", "C", "V", "B", "N", "M", "/", "!", "?"],
];

export function OnScreenKeyboard() {
  const appendKey = useKioskStore((s) => s.appendKey);
  const backspace = useKioskStore((s) => s.backspace);
  const clearQuery = useKioskStore((s) => s.clearQuery);
  const setKeyboardOpen = useKioskStore((s) => s.setKeyboardOpen);

  return (
    <div className="rounded-[2rem] glass-panel p-5 mx-auto max-w-4xl shadow-2xl shadow-black/20">
      {ROWS.map((row) => (
        <div key={row.join("")} className="mb-3 flex justify-center gap-3">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => appendKey(key)}
              className="h-16 min-w-[64px] rounded-2xl glass-button text-2xl font-semibold text-foreground active:scale-90 hover:scale-105"
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-3 mt-4">
        <button
          type="button"
          onClick={clearQuery}
          className="h-16 rounded-2xl glass-button px-8 text-lg font-semibold uppercase tracking-widest text-kiosk-muted hover:text-foreground active:scale-95"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => appendKey(" ")}
          className={cn("flex h-16 w-96 items-center justify-center gap-2 rounded-2xl bg-foreground text-background shadow-lg hover:opacity-90 active:scale-95 transition-all duration-300")}
        >
          <Space className="h-6 w-6" /> <span className="text-xl font-bold tracking-widest uppercase">Space</span>
        </button>
        <button
          type="button"
          onClick={backspace}
          className="flex h-16 items-center gap-2 rounded-2xl glass-button px-8 text-foreground active:scale-95 hover:text-red-400 hover:border-red-500/30 transition-colors"
        >
          <Delete className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={() => setKeyboardOpen(false)}
          className="flex h-16 items-center gap-2 rounded-2xl glass-button px-8 text-kiosk-muted hover:text-foreground active:scale-95 transition-colors"
        >
          <ChevronDown className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
