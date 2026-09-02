"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { APP_NAME } from "@/lib/utils";
import { SyncListener } from "./SyncListener";
import { Screensaver } from "./Screensaver";

export function KioskChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-foreground relative overflow-hidden bg-background">
      <SyncListener />
      <Screensaver />
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-kiosk-border bg-background/40 backdrop-blur-md px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold drop-shadow-sm">Enterprise Wayfinding</p>
          <h1 className="font-display text-2xl font-bold drop-shadow-sm text-foreground">{APP_NAME}</h1>
        </div>
        <ThemeToggle />
      </header>
      <main className="h-screen w-screen overflow-hidden pt-20">{children}</main>
    </div>
  );
}
