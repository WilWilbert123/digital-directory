"use client";

import { loginAction } from "@/app/actions/admin";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="w-full max-w-md space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-8"
      action={async (fd) => {
        const res = await loginAction(fd);
        if (res?.error) setError(res.error);
      }}
    >
      <h1 className="text-2xl font-bold text-white">Mall administration</h1>
      <p className="text-sm text-slate-400">Sign in to manage floors, tenants, and path graphs.</p>
      {error ? <p className="rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      <input name="username" placeholder="Username" className="h-12 w-full rounded-xl bg-slate-950 px-4 text-white" required />
      <input name="password" type="password" placeholder="Password" className="h-12 w-full rounded-xl bg-slate-950 px-4 text-white" required />
      <button className="h-12 w-full rounded-xl bg-sky-600 font-semibold text-white">Enter console</button>
    </form>
  );
}
