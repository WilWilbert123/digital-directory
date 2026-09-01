"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SyncListener() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/sync");
    source.onmessage = () => router.refresh();
    return () => source.close();
  }, [router]);

  return null;
}
