import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { buildServer, UI_DOMAIN } from './mcp.mjs';

const app = createMcpExpressApp();
app.get('/', (_req, res) => res.type('text/plain').send('research-academy-panel ok. MCP en /mcp'));
app.post('/mcp', async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
const notAllowed = (_req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
app.get('/mcp', notAllowed);
app.delete('/mcp', notAllowed);

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
app.listen(PORT, HOST, (err) => {
  if (err) { console.error(err.message); process.exit(1); }
  console.log(`research-academy-panel en http://${HOST}:${PORT}/mcp` + (UI_DOMAIN ? ` ui.domain=${UI_DOMAIN}` : ' (sin SERVER_URL: ui.domain no definido)'));
});
