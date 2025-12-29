import type { RouteStep, ChatRequest } from "./types";
import { SYSTEM_ROUTING, SYSTEM_PROVIDERS } from "./config";
import { ProviderExecutor } from "./ProviderExecutor";
import { RateLimitError, RATE_LIMIT_COOLDOWN } from "./types";

/**
 * ------------------------------------------------------------------
 * CLASE 2: BALANCEADOR DE CARGA
 * Responsabilidad: Estrategia de routing y failover
 * ------------------------------------------------------------------
 */
export class LoadBalancer {
  private executor: ProviderExecutor;
  // ESTADO: Contador para saber a quién le toca (Round-Robin)
  private rotationCounters: Map<string, number> = new Map();
  // ESTADO: Cooldowns para proveedores fallidos (Circuit Breaker)
  private cooldowns: Map<string, number> = new Map();

  constructor() {
    this.executor = new ProviderExecutor();
  }

  /**
   * Calcula la prioridad de proveedores según preferencias y Round-Robin
   */
  private getPrioritizedSteps(
    modelName: string,
    baseSteps: RouteStep[],
    preferredProvider?: string
  ): RouteStep[] {
    const now = Date.now();

    // 0. FILTRADO: Circuit Breaker (Ignorar proveedores en cooldown)
    const activeSteps = baseSteps.filter((step) => {
      const cooldownUntil = this.cooldowns.get(step.providerId);
      if (cooldownUntil && cooldownUntil > now) {
        const remaining = Math.ceil((cooldownUntil - now) / 1000);
        console.warn(
          `⛔ [Circuit Breaker] Saltando ${step.providerId} (${remaining}s restantes)`
        );
        return false;
      }
      return true;
    });

    if (activeSteps.length === 0) {
      console.error(
        "⚠️ TODOS los proveedores están en cooldown. Ignorando Circuit Breaker para intentar dar servicio."
      );
      // Fallback de emergencia: Si todos están muertos, intentamos con todos igual
      // para no dejar al usuario sin servicio (quizás ya se recuperó alguno)
      return baseSteps;
    }

    // CASO 1: Preferencia de Usuario (Override)
    if (preferredProvider) {
      const index = activeSteps.findIndex(
        (s) => s.providerId === preferredProvider
      );
      if (index !== -1) {
        console.log(
          `🌟 Preferencia de usuario detectada: ${preferredProvider}`
        );
        const preferred = activeSteps[index];
        if (preferred) {
          const others = activeSteps.filter((_, i) => i !== index);
          return [preferred, ...others];
        }
      }
      console.warn(
        `⚠️ Preferencia '${preferredProvider}' no disponible o en cooldown. Usando rotación normal.`
      );
    }

    // CASO 2: Rotación Automática (Round Robin)
    const currentCount = this.rotationCounters.get(modelName) || 0;
    const offset = currentCount % activeSteps.length;

    // Actualizamos el contador para la próxima vez
    this.rotationCounters.set(modelName, currentCount + 1);

    // Rotamos el array
    const rotated = [
      ...activeSteps.slice(offset),
      ...activeSteps.slice(0, offset),
    ];

    if (rotated.length > 0 && rotated[0]) {
      console.log(
        `🔄 Rotación Round-Robin (Índice ${offset}): Prioridad -> ${rotated[0].providerId}`
      );
    }
    return rotated;
  }

  /**
   * Lógica interna de manejo de petición
   */
  private async processRequest(
    body: ChatRequest,
    headers: Headers
  ): Promise<Response> {
    const requestedModel = body.model;

    // 1. Obtener los pasos base
    const baseSteps =
      SYSTEM_ROUTING[requestedModel] || SYSTEM_ROUTING["default"] || [];
    const providers = {
      ...SYSTEM_PROVIDERS,
      ...(body.custom_providers || {}),
    };

    // 2. Calcular el orden (Rotación vs Preferencia)
    const prioritizedSteps = this.getPrioritizedSteps(
      requestedModel,
      baseSteps,
      body.preferred_provider
    );

    // 3. Ejecutar en cascada con failover
    let lastError: Error | null = null;

    for (const step of prioritizedSteps) {
      const config = providers[step.providerId];
      if (!config) continue;

      try {
        const response = await this.executor.executeRequest(
          config,
          step.targetModel,
          body,
          headers
        );

        return new Response(this.executor.streamResponseGenerator(response), {
          headers: {
            "Content-Type": "text/event-stream",
            "X-Provider-Used": step.providerId,
          },
        });
      } catch (error) {
        const err = error as Error;
        console.warn(`❌ Falló ${step.providerId}: ${err.message}`);

        // MANEJO DE CIRCUIT BREAKER
        if (err instanceof RateLimitError) {
          const cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN;
          this.cooldowns.set(step.providerId, cooldownUntil);
          const minutes = Math.ceil(RATE_LIMIT_COOLDOWN / 60000);
          console.error(
            `⛔ Activando Circuit Breaker para ${step.providerId} por ${minutes} minutos.`
          );
        }

        lastError = err;
      }
    }

    return new Response(
      JSON.stringify({
        error: "Todos los proveedores fallaron",
        detail: lastError?.message,
      }),
      { status: 503 }
    );
  }

  /**
   * Maneja la petición con estrategia de failover (parsea el body del Request)
   */
  public async handleRequest(req: Request): Promise<Response> {
    try {
      const body = (await req.json()) as ChatRequest;
      return await this.processRequest(body, req.headers);
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON Inválido" }), {
        status: 400,
      });
    }
  }

  /**
   * Maneja la petición con un body ya parseado (para uso con contexto)
   */
  public async handleRequestWithBody(
    body: ChatRequest,
    req: Request
  ): Promise<Response> {
    try {
      return await this.processRequest(body, req.headers);
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
}

// Exportamos también con el nombre antiguo para compatibilidad
export { LoadBalancer as AILoadBalancer };
