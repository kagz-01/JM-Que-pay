import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { broadcast } from "@/lib/cuepay/events";

export const Route = createFileRoute("/api/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
    try {
      const body = await request.json();
      const stkCallback = body.Body?.stkCallback;
      
      if (stkCallback) {
        const checkoutId = stkCallback.CheckoutRequestID;
        const resultCode = stkCallback.ResultCode;
        
        const sql = await getSql();
        
        if (resultCode === 0) {
          // Success
          const updated = await sql<{ location_id: string; table_id: string }>`
            update play_sessions
            set status = 'paid',
                paid_at = now(),
                mpesa_ref = coalesce(
                  (select value::text from json_array_elements(
                    ${JSON.stringify(stkCallback.CallbackMetadata?.Item || [])}::json
                  ) where (value->>'Name') = 'MpesaReceiptNumber' limit 1), 
                  'UNKNOWN'
                )
            where checkout_id = ${checkoutId} and status = 'pending'
            returning location_id, table_id
          `;
          
          if (updated.length > 0) {
            const { location_id, table_id } = updated[0];
            
            await sql`
              update pool_tables
              set pending_games = pending_games + 1
              where id = ${table_id}
            `;
            
            broadcast({ type: "session:update", locationId: location_id, sessionId: checkoutId });
            broadcast({ type: "table:update", locationId: location_id, tableId: table_id });
          }
        } else {
          // Failed / Cancelled
          await sql`
            update play_sessions 
            set status = 'failed' 
            where checkout_id = ${checkoutId} and status = 'pending'
          `;
        }
      }
      return new Response("OK");
    } catch (e) {
      console.error("Mpesa callback error", e);
      return new Response("Error", { status: 500 });
    }
  }
}
}
});
