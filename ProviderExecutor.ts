import { type ChatRequest, type ProviderConfig, RateLimitError } from "./types";

export class ProviderExecutor {
  /**
   * Genera un stream de respuesta desde el proveedor
   */
  async *streamResponseGenerator(
    upstreamResponse: Response
  ): AsyncGenerator<Uint8Array, void, unknown> {
    const reader = upstreamResponse.body?.getReader();
    if (!reader) throw new Error("No body stream");
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Ejecuta una petición a un proveedor específico
   */
  async executeRequest(
    config: ProviderConfig,
    model: string,
    originalBody: ChatRequest,
    headers: Headers
  ): Promise<Response> {
    // Eliminamos campos de control para no enviarlos a la API real
    const {
      custom_providers,
      preferred_provider,
      session_id,
      use_context,
      ...cleanPayload
    } = originalBody;

    const reqHeaders = new Headers(headers);
    reqHeaders.set("Authorization", `Bearer ${config.key}`);
    reqHeaders.set("Content-Type", "application/json");
    reqHeaders.delete("Host");
    reqHeaders.delete("Content-Length");

    console.log(`⚡ Ejecutando: [${config.name}] -> Modelo: ${model}`);

    const finalPayload = { ...cleanPayload, model };
    console.log(`📦 Payload enviado:`, JSON.stringify(finalPayload));

    const response = await fetch(config.url, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(finalPayload),
    });

    if (!response.ok) {
      const txt = await response.text();
      // DETECCIÓN INTELIGENTE DE RATE LIMIT
      if (
        response.status === 429 || // Too Many Requests
        response.status === 402 || // Payment Required (Quota Exceeded)
        txt.toLowerCase().includes("rate limit") ||
        txt.toLowerCase().includes("quota exceeded")
      ) {
        throw new RateLimitError(`[${config.name}] Limit Exceeded: ${txt}`);
      }
      throw new Error(`[${config.name}] HTTP ${response.status}: ${txt}`);
    }
    return response;
  }
}
