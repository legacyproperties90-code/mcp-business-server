import { z } from "zod";
import { google } from "googleapis";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const KNOWN_SHEETS: Record<string, string> = {
  "1964 pinedale": "1iz4YAXxQ3MQdNJ7DgswPcWUE-9YnJPQQHoFiOPo0IeU",
  "3665 brookcrest": "1QSDLFMvTGnLPJDS9hAXp1Pgf3oz1KEkxZO7WUbe09OY",
  "1968 don juan": "1uCGK-oESRaQO-KL0Lgiq8XsaapR9G4-kEDYzETOHbfg",
  "pagos gustavo 2026": "1EMEAbc43SvedSACys4yufQ8gYyatAQK23Othmdqgv8M",
  "legacy propiedades": "1X25Yusy3Cvd57kHeIpVHqncLdITjZM-EOyowsKhFTdU",
};

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export function registerSheetsTools(server: McpServer) {
  server.registerTool(
    "sheets_list_known",
    {
      title: "Listar hojas de Google Sheets conocidas",
      description:
        "Lista los nombres cortos de las hojas de propiedades que este servidor puede leer (ej. '1964 pinedale', 'pagos gustavo 2026').",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: Object.keys(KNOWN_SHEETS).join("\n") }],
    })
  );

  server.registerTool(
    "sheets_read_range",
    {
      title: "Leer un rango de una hoja de Google Sheets",
      description:
        "Lee un rango de celdas de una de las hojas conocidas de propiedades/pagos. Usa sheets_list_known para ver los nombres válidos. El rango usa notación A1, ej. 'Gastos Generales!A1:F250'.",
      inputSchema: {
        sheet: z.string().describe("Nombre corto de la hoja, ej. '1964 pinedale'"),
        range: z.string().describe("Rango en notación A1, ej. 'Gastos Generales!A1:F250'"),
      },
    },
    async ({ sheet, range }) => {
      const auth = getAuth();
      if (!auth) {
        return {
          content: [
            {
              type: "text",
              text: "Google Sheets no está configurado todavía (falta GOOGLE_SERVICE_ACCOUNT_JSON).",
            },
          ],
        };
      }
      const spreadsheetId = KNOWN_SHEETS[sheet.toLowerCase()];
      if (!spreadsheetId) {
        return {
          content: [
            {
              type: "text",
              text: `Hoja desconocida: "${sheet}". Usa sheets_list_known para ver las válidas.`,
            },
          ],
        };
      }
      const sheets = google.sheets({ version: "v4", auth });
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      return {
        content: [{ type: "text", text: JSON.stringify(res.data.values ?? [], null, 2) }],
      };
    }
  );
}
