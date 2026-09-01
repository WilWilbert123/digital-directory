type SyncEvent = {
  tableName: string;
  operationType: string;
  payload: unknown;
  at: string;
};

type Subscriber = (chunk: string) => void;

const globalSync = globalThis as unknown as {
  bisposSubscribers?: Set<Subscriber>;
  bisposLastEvent?: SyncEvent | null;
};

if (!globalSync.bisposSubscribers) globalSync.bisposSubscribers = new Set();

export function subscribe(fn: Subscriber) {
  globalSync.bisposSubscribers!.add(fn);
  return () => globalSync.bisposSubscribers!.delete(fn);
}

export function publishSync(event: Omit<SyncEvent, "at">) {
  const full: SyncEvent = { ...event, at: new Date().toISOString() };
  globalSync.bisposLastEvent = full;
  const chunk = `data: ${JSON.stringify(full)}\n\n`;
  for (const sub of Array.from(globalSync.bisposSubscribers!)) {
    try {
      sub(chunk);
    } catch {
      globalSync.bisposSubscribers!.delete(sub);
    }
  }
}

export function getLastSyncEvent() {
  return globalSync.bisposLastEvent ?? null;
}
