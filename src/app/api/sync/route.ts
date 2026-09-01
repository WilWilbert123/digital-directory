import { subscribe } from "@/lib/real-time-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "hello" })}\n\n`));
      const unsub = subscribe((chunk) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          unsub();
        }
      });
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
          unsub();
        }
      }, 25000);
      const close = () => {
        clearInterval(ping);
        unsub();
      };
      (controller as ReadableStreamDefaultController & { closeHook?: () => void }).closeHook = close;
    },
    cancel() {
      // cleaned in start via unsub on enqueue failure; ping cleared on client abort via this hook
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
