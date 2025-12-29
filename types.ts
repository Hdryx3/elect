/**
 * ------------------------------------------------------------------
 * DEFINICIÓN DE TIPOS
 * ------------------------------------------------------------------
 */

// CONSTANTES
// Tiempo de penalización por defecto: 5 minutos (300,000 ms)
export const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000;

export interface ProviderConfig {
  name: string;
  url: string;
  key: string;
}

export interface RouteStep {
  providerId: string;
  targetModel: string;
}

export interface ChatRequest {
  model: string;
  messages: unknown[];
  stream?: boolean;
  // NUEVO CAMPO: El usuario puede pedir un proveedor específico
  preferred_provider?: string;
  custom_providers?: Record<string, ProviderConfig>;
  // CAMPOS DE CONTEXTO/SESIÓN
  session_id?: string; // ID de sesión para mantener contexto
  use_context?: boolean; // Si debe usar el historial de la sesión (default: false)
  [key: string]: any;
}

export interface ExecutionPlan {
  steps: RouteStep[];
  providers: Record<string, ProviderConfig>;
}

export interface ConfigInput {
  providers?: Record<string, ProviderConfig>;
  routing?: Record<string, RouteStep[]>;
}

/**
 * ------------------------------------------------------------------
 * TIPOS PARA SISTEMA DE CONTEXTO
 * ------------------------------------------------------------------
 */

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
  lastUsed: Date;
}

/**
 * ------------------------------------------------------------------
 * ERRORES PERSONALIZADOS
 * ------------------------------------------------------------------
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
