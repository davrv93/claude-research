// Transporte Streamable HTTP sin sesiones, para agregarlo en claude.ai como conector por URL HTTPS.
// Cada POST /mcp crea su propio servidor y transporte; GET y DELETE no aplican sin sesiones.
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from './mcp.mjs';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const allowedHosts = process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',').map((h) => h.trim()) : undefined;
const app = createMcpExpressApp({ host: HOST, ...(allowedHosts ? { allowedHosts } : {}) });

app.post('/mcp', async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('error en /mcp:', err);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Error interno' }, id: null });
  }
});

const noPermitido = (_req, res) =>
  res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Método no permitido: este servidor no usa sesiones.' }, id: null });
app.get('/mcp', noPermitido);
app.delete('/mcp', noPermitido);

app.listen(PORT, HOST, () => console.log(`research-academy-panel en http://${HOST}:${PORT}/mcp`));
