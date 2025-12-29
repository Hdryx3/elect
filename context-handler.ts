import type { ChatRequest, Message } from "./types";
import { contextManager } from "./context-manager";
import { LoadBalancer } from "./loadbalancer";

/**
 * ------------------------------------------------------------------
 * MANEJADOR DE PETICIONES CON CONTEXTO
 * ------------------------------------------------------------------
 */
export class ContextAwareHandler {
  private loadBalancer: LoadBalancer;

  constructor() {
    this.loadBalancer = new LoadBalancer();
  }

  /**
   * Maneja una petición de chat con soporte de contexto
   */
  async handleChatRequest(req: Request): Promise<Response> {
    try {
      const body = (await req.json()) as ChatRequest;

      // Obtener o crear sesión
      const session = contextManager.getOrCreateSession(body.session_id);
      const sessionId = session.id;
      const useContext = body.use_context ?? false;

      // Si se requiere contexto, agregar historial a los mensajes
      let messages = body.messages as Message[];

      if (useContext && session.messages.length > 0) {
        // Combinar historial con nuevos mensajes
        messages = [...session.messages, ...messages];
        console.log(
          `🔗 Usando contexto para sesión ${sessionId}: ${session.messages.length} mensaje(s) previo(s)`
        );
      }

      // Crear body modificado con historial completo y SIN campos de control
      const modifiedBody: any = {
        ...body,
        messages,
      };

      // Eliminar explícitamente los campos de control
      delete modifiedBody.session_id;
      delete modifiedBody.use_context;

      console.log(`🧪 Modified body keys:`, Object.keys(modifiedBody));
      console.log(`🧪 Has session_id?`, "session_id" in modifiedBody);
      console.log(`🧪 Has use_context?`, "use_context" in modifiedBody);

      // Guardar mensaje del usuario antes de enviar
      const userMessages = (body.messages as Message[]).filter(
        (m) => m.role === "user"
      );

      // Hacer la petición al load balancer con el body modificado
      const response = await this.loadBalancer.handleRequestWithBody(
        modifiedBody,
        req
      );

      // Si la respuesta es exitosa y NO es streaming, guardar en contexto
      if (response.ok && !body.stream) {
        const clonedResponse = response.clone();
        const result: any = await clonedResponse.json();

        // Extraer respuesta del asistente
        const assistantMessage: Message = {
          role: "assistant",
          content: result.choices?.[0]?.message?.content || "",
        };

        // Guardar usuario + asistente en contexto
        if (useContext) {
          contextManager.addMessages(sessionId, [
            ...userMessages,
            assistantMessage,
          ]);
        }
      }

      // Agregar session_id a los headers de respuesta
      const headers = new Headers(response.headers);
      headers.set("X-Session-ID", sessionId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "Error procesando petición",
          detail: (e as Error).message,
        }),
        { status: 500 }
      );
    }
  }

  /**
   * Obtiene información de una sesión
   */
  getSessionInfo(sessionId: string): Response {
    const history = contextManager.getHistory(sessionId);

    if (history.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Sesión no encontrada",
          session_id: sessionId,
        }),
        { status: 404 }
      );
    }

    const session = contextManager
      .getAllSessions()
      .find((s) => s.id === sessionId);

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        message_count: history.length,
        messages: history,
        created_at: session?.createdAt,
        last_used: session?.lastUsed,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /**
   * Elimina una sesión
   */
  deleteSession(sessionId: string): Response {
    const deleted = contextManager.deleteSession(sessionId);

    if (!deleted) {
      return new Response(
        JSON.stringify({
          error: "Sesión no encontrada",
          session_id: sessionId,
        }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sesión eliminada correctamente",
        session_id: sessionId,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  /**
   * Lista todas las sesiones activas
   */
  listSessions(): Response {
    const sessions = contextManager.getAllSessions();
    const stats = contextManager.getStats();

    return new Response(
      JSON.stringify({
        ...stats,
        sessions: sessions.map((s) => ({
          id: s.id,
          message_count: s.messages.length,
          created_at: s.createdAt,
          last_used: s.lastUsed,
        })),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
