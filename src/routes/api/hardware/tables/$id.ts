import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/hardware/tables/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const sql = await getSql();
          const rows = await sql`SELECT state FROM tables WHERE id = ${params.id}`;
          
          if (rows.length === 0) {
            return new Response("Not found", { status: 404 });
          }
          
          const pendingGames = rows[0].state === 'Paid / Idle' ? 1 : 0;
          return new Response(JSON.stringify({ pendingGames }), {
              headers: { "Content-Type": "application/json" }
          });
        } catch (e) {
          return new Response("Error", { status: 500 });
        }
      },
      POST: async ({ request, params }) => {
        try {
          const sql = await getSql();
          await sql`UPDATE tables SET state = 'Occupied' WHERE id = ${params.id} AND state = 'Paid / Idle'`;
          return new Response("OK");
        } catch (e) {
          return new Response("Error", { status: 500 });
        }
      }
    }
  }
});
