import {
  defaultRouting,
  llama3_70b,
  llama3_8b,
  openai_gpt_oss_120b,
  groq,
  cerebras,
} from "./default";
import type { ConfigInput, ProviderConfig, RouteStep } from "./types";

/**
 * ------------------------------------------------------------------
 * CONFIGURACIÓN DEL SISTEMA
 * ------------------------------------------------------------------
 */

export const SYSTEM_PROVIDERS: Record<string, ProviderConfig> = {
  ...groq,
  ...cerebras,
};

// Rutas base disponibles
export const SYSTEM_ROUTING: Record<string, RouteStep[]> = {
  ...defaultRouting,
  ...llama3_70b,
  ...llama3_8b,
  ...openai_gpt_oss_120b,
};

/**
 * ------------------------------------------------------------------
 * FUNCIÓN DE REGISTRO DINÁMICO
 * ------------------------------------------------------------------
 */

/**
 * Registra nuevos proveedores y rutas dinámicamente
 * @param config - Objeto con providers y/o routing a agregar
 * @example
 * registerProviders({
 *   providers: {
 *     openai: {
 *       name: "OpenAI",
 *       url: "https://api.openai.com/v1/chat/completions",
 *       key: process.env.OPENAI_API_KEY || ""
 *     }
 *   },
 *   routing: {
 *     "gpt-4": [{ providerId: "openai", targetModel: "gpt-4" }]
 *   }
 * })
 */
export function registerProviders(config: ConfigInput): void {
  // Agregar nuevos proveedores
  if (config.providers) {
    Object.assign(SYSTEM_PROVIDERS, config.providers);
    console.log(
      `✅ Registrados ${
        Object.keys(config.providers).length
      } nuevo(s) proveedor(es): ${Object.keys(config.providers).join(", ")}`
    );
  }

  // Agregar nuevas rutas
  if (config.routing) {
    Object.assign(SYSTEM_ROUTING, config.routing);
    console.log(
      `✅ Registradas ${
        Object.keys(config.routing).length
      } nueva(s) ruta(s): ${Object.keys(config.routing).join(", ")}`
    );
  }
}
