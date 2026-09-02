import Link from "next/link";
import { logoutAction } from "@/app/actions/admin";
import type { SessionUser } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/floors", label: "Floors" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/backup", label: "Backup" },
];

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Admin console</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">BISPOS</h1>
          </div>
          <ThemeToggle />
        </div>
        
        <nav className="mt-8 flex-1 space-y-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        
        <form action={logoutAction} className="mt-auto">
          <p className="mb-3 truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {user.fullName} · {user.role}
          </p>
          <button className="w-full rounded-lg border border-zinc-200 bg-white py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all">Sign out</button>
        </form>
      </aside>
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
