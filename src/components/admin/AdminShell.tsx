import Link from "next/link";
import { logoutAction } from "@/app/actions/admin";
import type { SessionUser } from "@/lib/auth";

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-800 bg-slate-900 p-6">
        <p className="text-xs uppercase tracking-widest text-sky-400">Admin console</p>
        <h1 className="mt-1 text-xl font-bold">BISPOS</h1>
        <nav className="mt-8 space-y-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="absolute bottom-6 left-6 right-6">
          <p className="mb-2 truncate text-xs text-slate-400">
            {user.fullName} · {user.role}
          </p>
          <button className="w-full rounded-lg border border-slate-700 py-2 text-sm">Sign out</button>
        </form>
      </aside>
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
