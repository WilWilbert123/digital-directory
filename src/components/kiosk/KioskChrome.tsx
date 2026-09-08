"use client";

import { SyncListener } from "./SyncListener";
import { Screensaver } from "./Screensaver";

export function KioskChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-foreground relative overflow-hidden bg-background">
      <SyncListener />
      <Screensaver />
      {/* No header — kiosk is full-screen, header removed per design */}
      <main className="h-screen w-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
