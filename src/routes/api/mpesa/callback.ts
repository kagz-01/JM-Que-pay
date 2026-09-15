import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          // Assuming Safaricom STK Push Callback format
          const stkCallback = body.Body?.stkCallback;
          if (stkCallback) {
            const checkoutRequestId = stkCallback.CheckoutRequestID;
            const resultCode = stkCallback.ResultCode;
            
            const sql = await getSql();
            
            if (resultCode === 0) {
              // Success
              const rows = await sql`UPDATE transactions SET status = 'completed' WHERE reference = ${checkoutRequestId} RETURNING table_id`;
              if (rows.length > 0) {
                const tableId = rows[0].table_id;
                await sql`UPDATE tables SET state = 'Paid / Idle' WHERE id = ${tableId}`;
              }
            } else {
              // Failed
              await sql`UPDATE transactions SET status = 'failed' WHERE reference = ${checkoutRequestId}`;
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
