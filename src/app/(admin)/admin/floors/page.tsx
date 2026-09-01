import Link from "next/link";
import { deleteFloorAction, saveFloorAction } from "@/app/actions/admin";
import prisma from "@/lib/prisma";
import { ImageUploader } from "@/components/admin/ImageUploader";

export default async function FloorsPage() {
  const floors = await prisma.floor.findMany({ orderBy: { levelNumber: "asc" } });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Floor masterlist</h1>
      <form action={saveFloorAction} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-4">
        <input name="floorCode" placeholder="Code (L1)" className="h-11 rounded-lg bg-slate-950 px-3" required />
        <input name="floorName" placeholder="Name" className="h-11 rounded-lg bg-slate-950 px-3" required />
        <input name="levelNumber" type="number" placeholder="Level" className="h-11 rounded-lg bg-slate-950 px-3" required />
        <button className="h-11 rounded-lg bg-sky-600 font-semibold">Add floor</button>
        
        <ImageUploader fieldName="image2dURL" label="Upload 2D Blueprint (JPG/PNG)" />
        <ImageUploader fieldName="model3dURL" label="Upload 3D Model (GLTF/GLB/ETC)" />
        
        <label className="flex items-center gap-2 text-sm md:col-span-4">
          <input type="checkbox" name="isActive" defaultChecked /> Active
        </label>
      </form>
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Code</th>
            <th>Name</th>
            <th>Level</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {floors.map((f) => (
            <tr key={f.id} className="border-t border-slate-800">
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
