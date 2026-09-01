import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function DashboardPage() {
  const [floors, tenants, users, pending] = await Promise.all([
    prisma.floor.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.syncLog.count({ where: { syncStatus: "PENDING" } }),
  ]);

  const cards = [
    { href: "/admin/floors", label: "Floors", value: floors },
    { href: "/admin/tenants", label: "Active tenants", value: tenants },
    { href: "/admin/users", label: "Users", value: users },
    { href: "/admin/backup", label: "Pending sync", value: pending },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold">Operations dashboard</h1>
      <p className="mt-1 text-slate-400">Node A — mall directory control plane</p>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">{c.label}</p>
            <p className="mt-2 text-4xl font-bold">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
