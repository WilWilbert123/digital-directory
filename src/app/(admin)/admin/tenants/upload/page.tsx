import { saveTenantAction } from "@/app/actions/admin";
import { LogoUploader } from "@/components/admin/LogoUploader";
import prisma from "@/lib/prisma";

export default async function TenantUploadPage() {
  const [floors, categories] = await Promise.all([
    prisma.floor.findMany({ orderBy: { levelNumber: "asc" } }),
    prisma.category.findMany({ orderBy: { categoryName: "asc" } }),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">Logo uploader & floor assignment</h1>
      <form action={saveTenantAction} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <input name="tenantCode" placeholder="Tenant code" className="h-11 w-full rounded-lg bg-slate-950 px-3" required />
        <input name="tenantName" placeholder="Tenant name" className="h-11 w-full rounded-lg bg-slate-950 px-3" required />
        <LogoUploader />
        <select name="floorId" className="h-11 w-full rounded-lg bg-slate-950 px-3" required>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.floorName}
            </option>
          ))}
        </select>
        <select name="categoryId" className="h-11 w-full rounded-lg bg-slate-950 px-3" required>
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
