import { ContextAwareHandler } from "./context-handler";

/**
 * ------------------------------------------------------------------
 * INICIO SERVIDOR CON GESTIÓN DE CONTEXTO
 * ------------------------------------------------------------------
 */
const handler = new ContextAwareHandler();
const PORT = process.env.PORT || 3000;

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",

  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Endpoint principal: Chat con soporte de contexto
    if (req.method === "POST" && path === "/v1/chat/completions") {
      return await handler.handleChatRequest(req);
    }

    // Endpoint: Obtener información de una sesión
    if (req.method === "GET" && path.startsWith("/v1/sessions/")) {
      const sessionId = path.split("/").pop();
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Session ID requerido" }), {
          status: 400,
        });
      }
      return handler.getSessionInfo(sessionId);
    }

    // Endpoint: Eliminar una sesión
    if (req.method === "DELETE" && path.startsWith("/v1/sessions/")) {
      const sessionId = path.split("/").pop();
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Session ID requerido" }), {
          status: 400,
        });
      }
      return handler.deleteSession(sessionId);
    }

    // Endpoint: Listar todas las sesiones
    if (req.method === "GET" && path === "/v1/sessions") {
      return handler.listSessions();
    }

    // Ruta por defecto (Documentación)
    return new Response(Bun.file("./docs.html"), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
});

console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
console.log(`📝 Gestión de contexto activada`);
console.log(`\nEndpoints disponibles:`);
console.log(`  POST   /v1/chat/completions      - Chat con contexto`);
console.log(`  GET    /v1/sessions              - Listar sesiones`);
console.log(`  GET    /v1/sessions/:id          - Info de sesión`);
console.log(`  DELETE /v1/sessions/:id          - Eliminar sesión`);
