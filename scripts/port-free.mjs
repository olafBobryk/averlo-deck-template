// The PDF render's port check (scripts/render-pdf.mjs). The render starts
// `next start` on PDF_PORT and prints whatever answers there; when another
// server already holds the port, it would render that server's pages. The
// owner's answer: fail clearly instead.
import { createServer } from "node:net";

/**
 * Resolves when `port` on `host` can be listened on; rejects with an error
 * naming the port when something already holds it.
 */
export function assertPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (error) => {
      if (error.code !== "EADDRINUSE") return reject(error);
      reject(
        new Error(
          `port ${port} is busy: something already answers on ${host}:${port}. Stop it, or set PDF_PORT to a free port.`,
        ),
      );
    });
    probe.listen(port, host, () => probe.close(() => resolve()));
  });
}
