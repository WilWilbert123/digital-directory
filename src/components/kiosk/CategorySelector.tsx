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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <button
        type="button"
        onClick={() => setCategoryId(null)}
        className={cn(
          "rounded-2xl border px-4 py-4 text-left font-semibold",
          !categoryId ? "border-sky-500 bg-sky-500/15" : "border-kiosk-border bg-kiosk-surface",
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
            "flex items-center gap-3 rounded-2xl border px-4 py-4 text-left",
            categoryId === c.id ? "border-sky-500 bg-sky-500/15" : "border-kiosk-border bg-kiosk-surface",
          )}
        >
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.colorHex }} />
          <span className="font-semibold">{c.categoryName}</span>
        </button>
      ))}
    </div>
  );
}
