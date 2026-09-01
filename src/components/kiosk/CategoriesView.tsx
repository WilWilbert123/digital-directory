"use client";

import Link from "next/link";
import { CategorySelector, type CategoryOption } from "@/components/kiosk/CategorySelector";
import { useKioskStore, type KioskTenant } from "@/store/useKioskStore";

export function CategoriesView({
  categories,
  tenants,
}: {
  categories: CategoryOption[];
  tenants: KioskTenant[];
}) {
  const categoryId = useKioskStore((s) => s.categoryId);
  const filtered = categoryId ? tenants.filter((t) => t.categoryId === categoryId) : tenants;

  return (
    <div className="space-y-6 pb-28">
      <h2 className="font-display text-3xl font-bold">Categories & legends</h2>
      <CategorySelector categories={categories} />
      <div className="grid gap-3 md:grid-cols-3">
        {filtered.map((t) => (
          <Link
            key={t.id}
            href={`/directions?tenant=${t.id}`}
            className="rounded-2xl border border-kiosk-border bg-kiosk-surface p-4"
          >
            <div className="mb-3 h-2 w-16 rounded-full" style={{ backgroundColor: t.category.colorHex }} />
            <p className="text-lg font-bold">{t.tenantName}</p>
            <p className="text-sm text-kiosk-muted">{t.floor.floorName}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
