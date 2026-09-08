"use client";

import { useKioskStore } from "@/store/useKioskStore";
import { cn } from "@/lib/utils";

export type CategoryOption = {
  id: string;
  categoryCode: string;
  categoryName: string;
  colorHex: string;
  iconURL: string | null;
};

export function CategorySelector({ categories }: { categories: CategoryOption[] }) {
  const categoryId = useKioskStore((s) => s.categoryId);
  const setCategoryId = useKioskStore((s) => s.setCategoryId);

  return (
    <div className="flex overflow-x-auto pb-3 gap-2 sm:gap-3 no-scrollbar snap-x">
      <button
        type="button"
        onClick={() => setCategoryId(null)}
        className={cn(
          "shrink-0 snap-start whitespace-nowrap rounded-full border px-4 py-1.5 sm:px-8 sm:py-3 text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95",
          !categoryId 
            ? "border-foreground bg-foreground text-background" 
            : "border-white/10 bg-kiosk-surface hover:bg-white/5",
        )}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setCategoryId(c.id)}
          className={cn(
            "flex shrink-0 snap-start items-center gap-1.5 sm:gap-3 whitespace-nowrap rounded-full border px-3 py-1.5 sm:px-6 sm:py-3 text-xs sm:text-sm transition-all shadow-md active:scale-95",
            categoryId === c.id 
              ? "border-foreground bg-foreground text-background" 
              : "border-white/10 bg-kiosk-surface hover:bg-white/5",
          )}
        >
          <span className="h-2.5 w-2.5 sm:h-4 sm:w-4 rounded-full shadow-inner" style={{ backgroundColor: c.colorHex }} />
          <span className="font-bold">{c.categoryName}</span>
        </button>
      ))}
    </div>
  );
}
