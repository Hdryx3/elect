/**
 * ------------------------------------------------------------------
 * GESTOR DE CONTEXTO DE CONVERSACIONES
 * ------------------------------------------------------------------
 */

import type { Message, Session } from "./types";

export class ContextManager {
  private sessions: Map<string, Session> = new Map();
  private readonly MAX_SESSIONS = 1000; // Límite de sesiones en memoria
  private readonly SESSION_TIMEOUT_MS = 1000 * 60 * 60 * 24; // 24 horas

  /**
   * Genera un ID de sesión único
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Crea o recupera una sesión
   */
  getOrCreateSession(sessionId?: string): Session {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.lastUsed = new Date();
      return session;
    }

    // Crear nueva sesión
    const id = sessionId || this.generateSessionId();
    const session: Session = {
      id,
      messages: [],
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    this.sessions.set(id, session);
    this.cleanOldSessions(); // Limpiar sesiones antiguas
    console.log(`📝 Nueva sesión creada: ${id}`);
    return session;
  }

  /**
   * Agrega mensajes al historial de una sesión
   */
  addMessages(sessionId: string, messages: Message[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ Sesión no encontrada: ${sessionId}`);
      return;
    }

    session.messages.push(...messages);
    session.lastUsed = new Date();
    console.log(
      `💬 Agregados ${messages.length} mensaje(s) a sesión ${sessionId}. Total: ${session.messages.length}`
    );
  }

  /**
   * Obtiene el historial completo de una sesión
   */
  getHistory(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  /**
   * Elimina una sesión específica
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`🗑️ Sesión eliminada: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * Obtiene todas las sesiones activas
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      messages: session.messages,
      createdAt: session.createdAt,
      lastUsed: session.lastUsed,
    }));
  }

  /**
   * Limpia sesiones antiguas o cuando hay demasiadas
   */
  private cleanOldSessions(): void {
    const now = Date.now();

    // Eliminar sesiones expiradas
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastUsed.getTime() > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(id);
        console.log(`🧹 Sesión expirada eliminada: ${id}`);
      }
    }

    // Si aún hay demasiadas, eliminar las más antiguas
    if (this.sessions.size > this.MAX_SESSIONS) {
      const sorted = Array.from(this.sessions.entries()).sort(
        ([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime()
      );

      const toDelete = sorted.slice(0, this.sessions.size - this.MAX_SESSIONS);
      toDelete.forEach(([id]) => {
        this.sessions.delete(id);
        console.log(`🧹 Sesión antigua eliminada (límite): ${id}`);
      });
    }
  }

  /**
   * Obtiene estadísticas de las sesiones
   */
  getStats(): {
    totalSessions: number;
    totalMessages: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  } {
    const sessions = this.getAllSessions();
    return {
      totalSessions: sessions.length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
      oldestSession:
        sessions.length > 0
          ? new Date(Math.min(...sessions.map((s) => s.createdAt.getTime())))
          : null,
      newestSession:
        sessions.length > 0
          ? new Date(Math.max(...sessions.map((s) => s.createdAt.getTime())))
          : null,
    };
  }
}

// Instancia singleton
export const contextManager = new ContextManager();
