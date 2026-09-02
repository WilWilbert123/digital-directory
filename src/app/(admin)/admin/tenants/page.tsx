import Link from "next/link";
import { deleteTenantAction, saveTenantAction } from "@/app/actions/admin";
import prisma from "@/lib/prisma";
import { SubmitButton } from "@/components/admin/SubmitButton";

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
          <Link href="/admin/tenants/upload" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold">
            Logo uploader
          </Link>
        </div>
      </div>
      <form key={editingTenant?.id ?? 'new'} action={saveTenantAction} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 md:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
        {editingTenant && <input type="hidden" name="id" value={editingTenant.id} />}
        <input name="tenantCode" placeholder="Code" defaultValue={editingTenant?.tenantCode} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="tenantName" placeholder="Name" defaultValue={editingTenant?.tenantName} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="logoURL" placeholder="Logo URL" defaultValue={editingTenant?.logoURL ?? ""} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
        <textarea name="description" placeholder="Description" defaultValue={editingTenant?.description ?? ""} className="h-24 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 md:col-span-3 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
        <select name="categoryId" defaultValue={editingTenant?.categoryId} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.categoryName}</option>
          ))}
        </select>
        <select name="floorId" defaultValue={editingTenant?.floorId} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>{f.floorName}</option>
          ))}
        </select>
        <select name="entranceNodeId" defaultValue={editingTenant?.entranceNodeId ?? ""} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
          <option value="">No entrance node (No directions)</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>{n.nodeName}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={editingTenant ? editingTenant.isActive : true} /> Active
        </label>
        <SubmitButton 
          idleText={editingTenant ? "Update tenant" : "Save new tenant"} 
          loadingText="Saving..." 
          className="h-11 rounded-lg bg-sky-600 font-semibold md:col-span-2" 
        />
      </form>
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
