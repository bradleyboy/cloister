// Hono server with API routes and SSE

import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { streamSSE } from "hono/streaming";
import {
  discoverSessions,
  getSessionById,
  getProjectList,
  getTagCounts,
} from "./sessions";
import { sessionWatcher, type WatcherEvent } from "./watcher";

export function createServer() {
  const app = new Hono();

  // Serve static files from public directory
  app.use("/static/*", serveStatic({ root: "./" }));

  // API Routes
  app.get("/api/sessions", async (c) => {
    const sessions = await discoverSessions();
    return c.json({ sessions });
  });

  app.get("/api/sessions/:id", async (c) => {
    const id = c.req.param("id");
    const session = await getSessionById(id);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json({ session });
  });

  app.get("/api/projects", async (c) => {
    const projects = await getProjectList();
    return c.json({ projects });
  });

  app.get("/api/tags", async (c) => {
    const tagCounts = await getTagCounts();
    const tags = Object.fromEntries(tagCounts);
    return c.json({ tags });
  });

  // SSE endpoint for live updates
  app.get("/api/sessions/:id/events", async (c) => {
    const sessionId = c.req.param("id");
    const session = await getSessionById(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return streamSSE(c, async (stream) => {
      // Start watching this session
      await sessionWatcher.watchSession(sessionId, session.filePath);

      const unsubscribe = sessionWatcher.subscribe((event: WatcherEvent) => {
        if (event.sessionId !== sessionId) return;

        stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event.data),
        });
      });

      // Send initial status
      await stream.writeSSE({
        event: "status",
        data: JSON.stringify({ status: session.status }),
      });

      // Keep connection alive
      const keepAlive = setInterval(() => {
        stream.writeSSE({
          event: "ping",
          data: JSON.stringify({ time: Date.now() }),
        });
      }, 30000);

      // Cleanup on disconnect
      stream.onAbort(() => {
        clearInterval(keepAlive);
        unsubscribe();
      });

      // Keep the stream open
      await new Promise(() => {});
    });
  });

  // Serve main HTML page
  app.get("/", async (c) => {
    const file = Bun.file("./public/index.html");
    const html = await file.text();
    return c.html(html);
  });

  // Session permalink route - serve same HTML, let client-side handle routing
  app.get("/session/:id", async (c) => {
    const file = Bun.file("./public/index.html");
    const html = await file.text();
    return c.html(html);
  });

  // Serve other static files
  app.get("/:file{.+\\.(css|js|ico|png|svg)$}", async (c) => {
    const fileName = c.req.param("file");
    const file = Bun.file(`./public/${fileName}`);

    if (!(await file.exists())) {
      return c.notFound();
    }

    const contentTypes: Record<string, string> = {
      css: "text/css",
      js: "application/javascript",
      ico: "image/x-icon",
      png: "image/png",
      svg: "image/svg+xml",
    };

    const ext = fileName.split(".").pop() || "";
    const contentType = contentTypes[ext] || "application/octet-stream";

    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  });

  return app;
}
