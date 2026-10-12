import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const EASYPANEL_URL = process.env.EASYPANEL_URL ?? "http://127.0.0.1:3000";
const EASYPANEL_API_KEY = process.env.EASYPANEL_API_KEY ?? "";

async function callEasypanel(procedure: string) {
  const res = await fetch(`${EASYPANEL_URL}/api/trpc/${procedure}`, {
    headers: { Authorization: `Bearer ${EASYPANEL_API_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Easypanel API ${procedure} -> HTTP ${res.status}`);
  }
  const body = (await res.json()) as { json: unknown };
  return body.json;
}

export function registerEasypanelTools(server: McpServer) {
  server.registerTool(
    "easypanel_list_projects",
    {
      title: "Listar proyectos y servicios de EasyPanel",
      description:
        "Devuelve los proyectos y servicios desplegados en el servidor EasyPanel (solo lectura: nombre, tipo, estado habilitado/deshabilitado, fuente de despliegue). No incluye variables de entorno ni secretos.",
      inputSchema: {},
    },
    async () => {
      const data = (await callEasypanel("projects.listProjectsAndServices")) as {
        projects: { name: string; createdAt: string }[];
        services: { projectName: string; name: string; type: string; enabled: boolean }[];
      };
      const summary = {
        projects: data.projects,
        services: data.services.map((s) => ({
          project: s.projectName,
          service: s.name,
          type: s.type,
          enabled: s.enabled,
        })),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  server.registerTool(
    "easypanel_panel_domain",
    {
      title: "Ver dominio configurado del panel de EasyPanel",
      description: "Muestra si EasyPanel tiene un dominio personalizado configurado y cuál es el dominio por defecto.",
      inputSchema: {},
    },
    async () => {
      const data = await callEasypanel("settings.getPanelDomain");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
