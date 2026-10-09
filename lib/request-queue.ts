import { parsePending, type AlertInput } from "./alerts.ts";

export const pendingKey = "better-together:pending-alerts:v2";
export interface QueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readRequestQueue(storage: QueueStorage) {
  // Read errors must propagate: treating an inaccessible queue as empty could
  // overwrite drafts after a transient storage failure.
  return parsePending(JSON.parse(storage.getItem(pendingKey) || "[]"));
}

export function saveRequestQueue(storage: QueueStorage, items: AlertInput[]) {
  if (items.length > 100) throw new Error("queue_full");
  storage.setItem(pendingKey, JSON.stringify(items));
}
