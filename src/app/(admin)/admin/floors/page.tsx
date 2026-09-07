import Link from "next/link";
import { deleteFloorAction, saveFloorAction } from "@/app/actions/admin";
import prisma from "@/lib/prisma";
import { ImageUploader } from "@/components/admin/ImageUploader";

export default async function FloorsPage() {
  const floors = await prisma.floor.findMany({ orderBy: { levelNumber: "asc" } });

  return (
    <div className="space-y-8 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-3xl font-bold">Floor masterlist</h1>
      <form action={saveFloorAction} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 md:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
        <input name="floorCode" placeholder="Code (L1)" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="floorName" placeholder="Name" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="levelNumber" type="number" placeholder="Level" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <button className="h-11 rounded-lg bg-sky-600 font-semibold">Add floor</button>
        
        <ImageUploader fieldName="image2dURL" label="Upload 2D Blueprint (JPG/PNG)" />
        <ImageUploader fieldName="model3dURL" label="Upload 3D Model (GLTF/GLB/ETC)" />
        
        <div className="md:col-span-4 grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-500">
            Floor Color (Hex)
            <input name="colorHex" type="color" defaultValue="#8B5FBF" className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-1 dark:border-zinc-800 dark:bg-zinc-950 cursor-pointer" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-500">
            Shape
            <select name="shape" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
              <option value="BOX">Rectangle (Default)</option>
              <option value="CIRCLE">Circle</option>
              <option value="HALF_CIRCLE">Half Circle</option>
              <option value="TRIANGLE">Triangle</option>
              <option value="HALF_SQUARE">Half Square</option>
              <option value="POLYGON">Custom Polygon</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-500">
            Points Data (JSON)
            <input name="pointsData" placeholder="e.g. [[-22, -22], [22, -22], ...]" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
          </label>
        </div>
        
        <label className="flex items-center gap-2 text-sm md:col-span-4">
          <input type="checkbox" name="isActive" defaultChecked /> Active
        </label>
      </form>
      <table className="w-full text-left text-sm">
        <thead className="text-zinc-500 dark:text-zinc-400">
          <tr>
            <th className="py-2">Code</th>
            <th>Name</th>
            <th>Level</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {floors.map((f) => (
            <tr key={f.id} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-3">{f.floorCode}</td>
              <td>{f.floorName}</td>
              <td>{f.levelNumber}</td>
              <td className="space-x-3 text-right">
                <Link href={`/admin/floors/${f.id}/editor`} className="text-sky-400">
                  3D editor
                </Link>
                <form action={deleteFloorAction.bind(null, f.id)} className="inline">
                  <button className="text-rose-400">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
