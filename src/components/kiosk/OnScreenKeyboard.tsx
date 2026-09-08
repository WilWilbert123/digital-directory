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
    <div className="rounded-3xl glass-panel p-3.5 sm:p-4 mx-auto w-full max-w-2xl shadow-2xl shadow-black/30 backdrop-blur-xl bg-[#141414]/90 border border-white/15">
      {ROWS.map((row) => (
        <div key={row.join("")} className="mb-2 flex justify-center gap-1.5 sm:gap-2">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => appendKey(key)}
              className="h-10 sm:h-12 min-w-[32px] sm:min-w-[42px] flex-1 max-w-[48px] rounded-xl glass-button text-sm sm:text-base font-bold text-foreground active:scale-90 hover:scale-105 flex items-center justify-center transition-all"
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-2 mt-3">
        <button
          type="button"
          onClick={clearQuery}
          className="h-10 sm:h-12 rounded-xl bg-black text-white border border-white/25 px-4.5 text-xs font-black uppercase tracking-wider hover:bg-black/80 active:scale-95 transition-all shadow-md"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => appendKey(" ")}
          className={cn("flex h-10 sm:h-12 flex-1 max-w-[200px] items-center justify-center gap-1.5 rounded-xl bg-white text-black font-bold shadow-md hover:bg-white/90 active:scale-95 transition-all")}
        >
          <Space className="h-4 w-4" /> <span className="text-xs uppercase tracking-widest font-black">Space</span>
        </button>
        <button
          type="button"
          onClick={backspace}
          className="flex h-10 sm:h-12 items-center justify-center rounded-xl glass-button px-4 text-foreground active:scale-95 hover:text-rose-400 transition-all"
        >
          <Delete className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setKeyboardOpen(false)}
          className="flex h-10 sm:h-12 items-center justify-center rounded-xl glass-button px-4 text-white/60 hover:text-foreground active:scale-95 transition-all"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
