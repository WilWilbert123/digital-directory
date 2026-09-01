"use client";

import Link from "next/link";
import { LayoutGrid, Map, Navigation, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { APP_NAME } from "@/lib/utils";
import { SyncListener } from "./SyncListener";
import { FloatingNav } from "./FloatingNav";

export function KioskChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-foreground relative overflow-hidden bg-[#020617]">
      <SyncListener />
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400 font-bold drop-shadow-md">Enterprise Wayfinding</p>
          <h1 className="font-display text-2xl font-bold drop-shadow-md text-white">{APP_NAME}</h1>
        </div>
        <ThemeToggle />
      </header>
      <main className="h-screen w-screen overflow-y-auto">{children}</main>
      <FloatingNav />
    </div>
  );
}

