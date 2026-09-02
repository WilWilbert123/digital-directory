import Link from "next/link";
import { deleteTenantAction } from "@/app/actions/admin";
import prisma from "@/lib/prisma";
import { TenantForm } from "@/components/admin/TenantForm";

export default async function TenantsPage({ searchParams }: { searchParams: { editId?: string } }) {
  const [tenants, floors, categories, nodes] = await Promise.all([
    prisma.tenant.findMany({ include: { floor: true, category: true }, orderBy: { tenantName: "asc" } }),
    prisma.floor.findMany({ orderBy: { levelNumber: "asc" } }),
    prisma.category.findMany({ orderBy: { categoryName: "asc" } }),
    prisma.pathNode.findMany({ where: { type: "TENANT_ENTRANCE" } }),
  ]);

  const editingTenant = searchParams.editId ? tenants.find(t => t.id === searchParams.editId) : null;

  return (
    <div className="space-y-8 text-zinc-900 dark:text-zinc-100">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{editingTenant ? "Edit Tenant" : "Tenant masterlist"}</h1>
        <div className="flex gap-2">
          {editingTenant && (
            <Link href="/admin/tenants" className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
              Cancel Edit
            </Link>
          )}
          <Link href="/admin/tenants/upload" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
            Logo uploader
          </Link>
        </div>
      </div>
      <TenantForm
        editingTenant={editingTenant}
        categories={categories.map(c => ({ id: c.id, categoryName: c.categoryName }))}
        floors={floors.map(f => ({ id: f.id, floorName: f.floorName }))}
        nodes={nodes.map(n => ({ id: n.id, nodeName: n.nodeName }))}
      />
      <table className="w-full text-left text-sm">
        <thead className="text-zinc-500 dark:text-zinc-400">
          <tr>
            <th className="py-2">Code</th>
            <th>Name</th>
            <th>Floor</th>
            <th>Category</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-3">{t.tenantCode}</td>
              <td>
                {t.tenantName}
                {t.entranceNodeId ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">Has Node</span>
                ) : (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">No Node</span>
                )}
              </td>
              <td>{t.floor.floorName}</td>
              <td>{t.category.categoryName}</td>
              <td className="text-right">
                <div className="flex justify-end gap-3">
                  <Link href={`/admin/tenants?editId=${t.id}`} className="text-sky-400 hover:underline">Edit</Link>
                  <form action={deleteTenantAction.bind(null, t.id)}>
                    <button className="text-rose-400 hover:underline">Delete</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
