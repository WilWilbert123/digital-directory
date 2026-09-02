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
  const setSelectedTenant = useKioskStore((s) => s.setSelectedTenant);
  const filtered = categoryId ? tenants.filter((t) => t.categoryId === categoryId) : tenants;

  return (
    <div className="space-y-6 pb-28 pt-32 px-6 max-w-7xl mx-auto">
      <h2 className="font-display text-3xl font-bold">Categories & legends</h2>
      <CategorySelector categories={categories} />
      <div className="mt-8 grid gap-8 grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 content-start px-2">
        {filtered.map((t) => (
          <Link
            key={t.id}
            href={`/directions?tenant=${t.id}`}
            onClick={() => setSelectedTenant(t.id)}
            className="flex flex-col items-center h-full group outline-none"
          >
            {/* Massive Floating Logo */}
            {t.logoURL ? (
              <div className="h-32 w-32 rounded-full bg-white p-5 shadow-xl flex items-center justify-center shrink-0 group-hover:scale-110 group-active:scale-95 transition-transform duration-300 mb-4 ring-0 group-hover:ring-4 ring-white/10">
                <img 
                  src={t.logoURL} 
                  alt={`${t.tenantName} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div
                className="h-32 w-32 rounded-full flex items-center justify-center shrink-0 shadow-xl group-hover:scale-110 group-active:scale-95 transition-transform duration-300 mb-4 ring-0 group-hover:ring-4 ring-white/10"
                style={{ 
                  backgroundColor: t.category.colorHex,
                  opacity: 0.95
                }}
              >
                <span className="text-4xl font-extrabold text-white tracking-wider">{t.tenantCode.slice(0, 3)}</span>
              </div>
            )}

            {/* Minimalist Typography */}
            <div className="text-center px-2">
              <h3 className="text-xl font-bold text-foreground group-hover:text-white transition-colors leading-tight">
                {t.tenantName}
              </h3>
              <p className="text-xs font-medium text-kiosk-muted mt-1 opacity-60">
                {t.floor.floorName}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
