import Link from "next/link";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin";
import prisma from "@/lib/prisma";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function AdminCategoriesPage({ searchParams }: { searchParams: { editId?: string } }) {
  const categories = await prisma.category.findMany({ orderBy: { categoryName: "asc" } });
  
  const editingCategory = searchParams.editId ? categories.find(c => c.id === searchParams.editId) : null;

  return (
    <div className="space-y-8 text-zinc-900 dark:text-zinc-100">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{editingCategory ? "Edit Category" : "Category legends"}</h1>
        {editingCategory && (
          <Link href="/admin/categories" className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
            Cancel Edit
          </Link>
        )}
      </div>
      <form action={saveCategoryAction} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 md:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
        {editingCategory && <input type="hidden" name="id" value={editingCategory.id} />}
        <input name="categoryCode" placeholder="Code" defaultValue={editingCategory?.categoryCode} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="categoryName" placeholder="Name" defaultValue={editingCategory?.categoryName} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="iconURL" placeholder="Icon URL" defaultValue={editingCategory?.iconURL ?? ""} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
        <input name="colorHex" type="color" defaultValue={editingCategory?.colorHex ?? "#2563EB"} className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-1 dark:border-zinc-800 dark:bg-zinc-950" />
        <label className="flex items-center gap-2 text-sm md:col-span-3">
          <input type="checkbox" name="isActive" defaultChecked={editingCategory ? editingCategory.isActive : true} /> Active
        </label>
        <SubmitButton 
          idleText={editingCategory ? "Update category" : "Save category"} 
          loadingText="Saving..." 
          className="h-11 rounded-lg bg-sky-600 font-semibold" 
        />
      </form>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <span className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.colorHex }} />
              <span className="font-semibold">{c.categoryName}</span> 
              <span className="text-zinc-500 dark:text-zinc-400">({c.categoryCode})</span>
            </span>
            <div className="flex items-center gap-4">
              <Link href={`/admin/categories?editId=${c.id}`} className="text-sky-400 text-sm hover:underline">Edit</Link>
              <form action={deleteCategoryAction.bind(null, c.id)}>
                <button className="text-rose-400 text-sm hover:underline">Delete</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
