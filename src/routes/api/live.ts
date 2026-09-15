import { createFileRoute } from "@tanstack/react-router";
import { cuepayBus, type LiveEvent } from "@/lib/cuepay/events";

export const Route = createFileRoute("/api/live")({
  server: {
    handlers: {
      GET: async ({ request }) => {
    let controller: ReadableStreamDefaultController;
    const stream = new ReadableStream({
      start(c) {
        controller = c;
        // Keep-alive ping immediately
        controller.enqueue(new TextEncoder().encode(`data: {"type":"ping"}\n\n`));
      },
      cancel() {
        if (listener) cuepayBus.off("live", listener);
      },
    });

    const listener = (event: LiveEvent) => {
      if (controller) {
        try {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (e) {
          // Stream might be closed
        }
      }
    };

    cuepayBus.on("live", listener);
    
    // Some platforms abort the signal when the client disconnects
    request.signal.addEventListener("abort", () => {
      cuepayBus.off("live", listener);
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no" // For Nginx
      },
    });
  }
}
}
});
