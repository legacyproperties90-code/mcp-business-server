import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerEasypanelTools } from "./tools/easypanel.js";
import { registerSupabaseTools } from "./tools/supabase.js";
import { registerSheetsTools } from "./tools/sheets.js";

const PORT = Number(process.env.PORT ?? 3000);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN ?? "";

if (!AUTH_TOKEN) {
  console.error("FATAL: MCP_AUTH_TOKEN no está configurado. El servidor no puede arrancar sin un token de autenticación.");
  process.exit(1);
}

function buildServer() {
  const server = new McpServer({ name: "legacy732-business-mcp", version: "1.0.0" });
  registerEasypanelTools(server);
  registerSupabaseTools(server);
  registerSheetsTools(server);
  return server;
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/mcp", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const expected = `Bearer ${AUTH_TOKEN}`;
  if (authHeader !== expected) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  // Stateless mode: a fresh server + transport per request.
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`MCP business server listening on :${PORT}`);
});
