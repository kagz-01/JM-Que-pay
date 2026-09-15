import { EventEmitter } from "node:events";

// Simple in-memory event bus for Server-Sent Events (SSE)
// In a multi-instance production environment, this would be replaced with Redis or Supabase Realtime.
export const cuepayBus = new EventEmitter();

// Event types
export type LiveEvent =
  | { type: "table:update"; locationId: string; tableId: string }
  | { type: "session:update"; locationId: string; sessionId: string };

export function broadcast(event: LiveEvent) {
  cuepayBus.emit("live", event);
}
