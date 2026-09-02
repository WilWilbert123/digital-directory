import Link from "next/link";
import prisma from "@/lib/prisma";
import { ActivityChart } from "@/components/admin/ActivityChart";

export default async function DashboardPage() {
  const [floors, tenants, users, pending, categories] = await Promise.all([
    prisma.floor.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.syncLog.count({ where: { syncStatus: "PENDING" } }),
    prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { tenants: { where: { isActive: true } } },
        },
      },
    }),
  ]);

  const cards = [
    { href: "/admin/floors", label: "Floors", value: floors },
    { href: "/admin/tenants", label: "Active tenants", value: tenants },
    { href: "/admin/users", label: "Users", value: users },
    { href: "/admin/backup", label: "Pending sync", value: pending },
  ];

  const sortedCategories = categories.sort((a, b) => b._count.tenants - a._count.tenants);
  const maxTenants = Math.max(...sortedCategories.map((c) => c._count.tenants), 1);

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Operations dashboard</h1>
      <p className="mt-1 text-zinc-500 dark:text-zinc-400">Node A — mall directory control plane</p>
      
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 transition-all">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{c.label}</p>
            <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-zinc-100">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">Wayfinding Queries (7 Days)</h2>
          <ActivityChart />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6">Tenants by Category</h2>
          <div className="space-y-4 max-w-3xl">
            {sortedCategories.map((category) => {
              const count = category._count.tenants;
              const percentage = Math.max((count / maxTenants) * 100, 1.5);
              return (
                <div key={category.id} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-zinc-600 dark:text-zinc-400 truncate" title={category.categoryName}>
                    {category.categoryName}
                  </div>
                  <div className="flex-1 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%`, backgroundColor: category.colorHex }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {count}
                  </div>
                </div>
              );
            })}
            {sortedCategories.length === 0 && (
              <p className="text-sm text-zinc-500">No categories found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
