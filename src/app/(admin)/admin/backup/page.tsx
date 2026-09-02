import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function BackupPage() {
  const logs = await prisma.syncLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 });

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-3xl font-bold">Backup & sync</h1>
      <form action="/api/backup" method="post">
        <button className="rounded-xl bg-sky-600 px-5 py-3 font-semibold">Generate JSON snapshot</button>
      </form>
      <table className="w-full text-left text-sm">
        <thead className="text-zinc-500 dark:text-zinc-400">
          <tr>
            <th className="py-2">When</th>
            <th>Table</th>
            <th>Op</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-3">{formatDate(l.createdAt)}</td>
              <td>{l.tableName}</td>
              <td>{l.operationType}</td>
              <td>{l.syncStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
