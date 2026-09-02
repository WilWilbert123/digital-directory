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
    <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar snap-x">
      <button
        type="button"
        onClick={() => setCategoryId(null)}
        className={cn(
          "shrink-0 snap-start whitespace-nowrap rounded-full border px-8 py-3 font-bold transition-all shadow-md active:scale-95",
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
            "flex shrink-0 snap-start items-center gap-3 whitespace-nowrap rounded-full border px-6 py-3 transition-all shadow-md active:scale-95",
            categoryId === c.id 
              ? "border-foreground bg-foreground text-background" 
              : "border-white/10 bg-kiosk-surface hover:bg-white/5",
          )}
        >
          <span className="h-4 w-4 rounded-full shadow-inner" style={{ backgroundColor: c.colorHex }} />
          <span className="font-bold">{c.categoryName}</span>
        </button>
      ))}
    </div>
  );
}
