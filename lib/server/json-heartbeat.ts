/** Keep a long JSON response active while preserving ordinary fast failures. */
export async function jsonHeartbeat<T>(
  operation: Promise<T>,
  intervalMs = 15000,
): Promise<Response> {
  const settled = operation.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const first = await Promise.race([
    settled,
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), intervalMs);
    }),
  ]);
  clearTimeout(timer);
  if (first) {
    if (!first.ok) throw first.error;
    return Response.json(first.value, { headers: { 'Cache-Control': 'no-store' } });
  }
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval>;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // JSON permits leading whitespace. No credentials or partial results are emitted.
      const pulse = () => controller.enqueue(encoder.encode(' \n'));
      pulse();
      heartbeat = setInterval(pulse, intervalMs);
      void settled.then((result) => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        if (!result.ok) {
          controller.error(new Error('Long JSON operation failed'));
          return;
        }
        try {
          controller.enqueue(encoder.encode(JSON.stringify(result.value)));
          controller.close();
        } catch {
          controller.error(new Error('Long JSON operation failed'));
        }
      });
    },
    cancel() {
      closed = true;
      clearInterval(heartbeat);
    },
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Encoding': 'identity',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
