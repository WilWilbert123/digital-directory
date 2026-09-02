import { deleteUserAction, saveUserAction } from "@/app/actions/admin";
import prisma from "@/lib/prisma";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { username: "asc" } });

  return (
    <div className="space-y-8 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-3xl font-bold">System users</h1>
      <form action={saveUserAction} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-sm">
        <input name="username" placeholder="Username" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="fullName" placeholder="Full name" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" required />
        <input name="password" type="password" placeholder="Password" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
        <select name="role" className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="MALL_ADMIN">MALL_ADMIN</option>
          <option value="KIOSK_OPERATOR">KIOSK_OPERATOR</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked /> Active
        </label>
        <button className="h-11 rounded-lg bg-sky-600 font-semibold">Save user</button>
      </form>
      <table className="w-full text-left text-sm">
        <thead className="text-zinc-500 dark:text-zinc-400">
          <tr>
            <th className="py-2">Username</th>
            <th>Name</th>
            <th>Role</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-3">{u.username}</td>
              <td>{u.fullName}</td>
              <td>{u.role}</td>
              <td className="text-right">
                <form action={deleteUserAction.bind(null, u.id)}>
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
