// Transporte Streamable HTTP sin sesiones, para agregarlo en claude.ai como conector por URL HTTPS.
// Cada POST /mcp crea su propio servidor y transporte; GET y DELETE no aplican sin sesiones.
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { buildServer } from './mcp.mjs';
import { estadoAlmacen, guardarCerebro, leerCerebro, MAX_BYTES } from './cerebro.mjs';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const allowedHosts = process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',').map((h) => h.trim()) : undefined;
const app = createMcpExpressApp({ host: HOST, ...(allowedHosts ? { allowedHosts } : {}) });

// Algunos clientes mandan solo Accept: application/json; el SDK exige ambos tipos y responde 406.
app.use('/mcp', (req, _res, next) => {
  const a = req.headers.accept || '';
  if (!a.includes('text/event-stream') || !a.includes('application/json')) req.headers.accept = 'application/json, text/event-stream';
  next();
});

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

// ---- Cerebro: almacén de notas por id (SHA-256 de la frase clave). CORS abierto: lo llama el panel desde su iframe.
const limites = new Map(); // ip -> [marcaMinuto, cuenta]
function limitar(req, res, next) {
  const ip = req.ip || 'x';
  const ahora = Math.floor(Date.now() / 60000);
  const e = limites.get(ip) || [ahora, 0];
  if (e[0] !== ahora) { e[0] = ahora; e[1] = 0; }
  e[1]++;
  limites.set(ip, e);
  if (limites.size > 5000) limites.clear();
  if (e[1] > 60) return res.status(429).json({ error: 'demasiadas peticiones, espera un minuto' });
  next();
}
app.use('/cerebro', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}, limitar);
app.get('/cerebro/:id', async (req, res) => {
  try { res.json(await leerCerebro(req.params.id)); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});
app.put('/cerebro/:id', express.json({ limit: MAX_BYTES + 1024 }), async (req, res) => {
  try { res.json(await guardarCerebro(req.params.id, req.body)); }
  catch (e) { res.status(e.status || (e.type === 'entity.too.large' ? 413 : 500)).json({ error: e.message }); }
});
app.get('/salud', async (_req, res) => res.json({ ok: true, almacen: await estadoAlmacen() }));

const noPermitido = (_req, res) =>
  res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Método no permitido: este servidor no usa sesiones.' }, id: null });
app.get('/mcp', noPermitido);
app.delete('/mcp', noPermitido);

app.listen(PORT, HOST, () => console.log(`research-academy-panel en http://${HOST}:${PORT}/mcp`));
