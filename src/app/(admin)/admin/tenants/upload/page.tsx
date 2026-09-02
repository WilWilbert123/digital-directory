import { saveTenantAction } from "@/app/actions/admin";
import { LogoUploader } from "@/components/admin/LogoUploader";
import prisma from "@/lib/prisma";

export default async function TenantUploadPage() {
  const [floors, categories] = await Promise.all([
    prisma.floor.findMany({ orderBy: { levelNumber: "asc" } }),
    prisma.category.findMany({ orderBy: { categoryName: "asc" } }),
  ]);

  return (
    <div className="max-w-xl space-y-6 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-3xl font-bold">Logo uploader & floor assignment</h1>
      <form action={saveTenantAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
        <input name="tenantCode" placeholder="Tenant code" className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="tenantName" placeholder="Tenant name" className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <LogoUploader />
        <select name="floorId" className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.floorName}
            </option>
          ))}
        </select>
        <select name="categoryId" className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.categoryName}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked /> Active
        </label>
        <button className="h-11 w-full rounded-lg bg-sky-600 font-semibold">Create tenant</button>
      </form>
    </div>
  );
}
