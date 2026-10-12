import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function restRequest(path: string) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${path} -> HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export function registerSupabaseTools(server: McpServer) {
  server.registerTool(
    "supabase_list_tables",
    {
      title: "Listar tablas de Supabase (Altitude)",
      description:
        "Lista las tablas disponibles en el esquema public de la base de datos de Altitude Service Solutions en Supabase.",
      inputSchema: {},
    },
    async () => {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return {
          content: [
            {
              type: "text",
              text: "Supabase no está configurado todavía (faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
            },
          ],
        };
      }
      const data = await restRequest("/rest/v1/?select=*");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2).slice(0, 4000) }] };
    }
  );

  server.registerTool(
    "supabase_select",
    {
      title: "Consultar filas de una tabla en Supabase (Altitude)",
      description:
        "Hace un SELECT de solo lectura sobre una tabla del esquema public en la base de Altitude. Usa el formato de filtros de PostgREST (ej. 'status=eq.active'). Limitado a 100 filas por llamada.",
      inputSchema: {
        table: z.string().describe("Nombre de la tabla, ej. 'bookings' o 'contacts'"),
        filter: z
          .string()
          .optional()
          .describe("Filtro estilo PostgREST, ej. 'status=eq.active'. Opcional."),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    async ({ table, filter, limit }) => {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return {
          content: [
            {
              type: "text",
              text: "Supabase no está configurado todavía (faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
            },
          ],
        };
      }
      const safeTable = encodeURIComponent(table);
      const query = [`limit=${limit}`, filter].filter(Boolean).join("&");
      const data = await restRequest(`/rest/v1/${safeTable}?${query}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
