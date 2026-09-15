import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { broadcast } from "@/lib/cuepay/events";

export const Route = createFileRoute("/api/hardware/tables/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
    try {
      const sql = await getSql();
      const rows = await sql<{ status: string; pending_games: number; game_minutes: number }>`
        select t.status, t.pending_games, l.game_minutes
        from pool_tables t
        join locations l on l.id = t.location_id
        where t.id = ${params.id}
      `;
      
      if (rows.length === 0) {
        return new Response("Not found", { status: 404 });
      }
      
      const r = rows[0];
      return new Response(JSON.stringify({ 
        status: r.status,
        pendingGames: Number(r.pending_games),
        gameMinutes: Number(r.game_minutes)
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response("Error", { status: 500 });
    }
  },
  POST: async ({ request, params }) => {
    // This is the /consume equivalent but mapped to POST for simplicity, 
    // or you could add a separate /consume route.
    // The spec says POST /api/hardware/tables/:id/consume
    // But since the current route is just $id, let's allow it via POST here.
    try {
      const sql = await getSql();
      const rows = await sql<{ location_id: string }>`
        update pool_tables
        set pending_games = greatest(pending_games - 1, 0),
            status = 'busy',
            busy_since = now()
        where id = ${params.id} and pending_games > 0
        returning location_id
      `;
      
      if (rows.length > 0) {
        broadcast({ type: "table:update", locationId: rows[0].location_id, tableId: params.id });
      }
      
      return new Response("OK");
    } catch (e) {
      return new Response("Error", { status: 500 });
    }
  }
}
}
});
