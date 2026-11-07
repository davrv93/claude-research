import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

// URL publica del servidor (https://host/mcp). Define ui.domain para Claude.
const SERVER_URL = process.env.SERVER_URL ?? '';
const UI_DOMAIN = SERVER_URL
  ? createHash('sha256').update(SERVER_URL).digest('hex').slice(0, 32) + '.claudemcpcontent.com'
  : undefined;
const PANEL_URI = 'ui://research-academy/panel';
const PANEL_HTML = readFileSync(new URL('./panel.html', import.meta.url), 'utf8');
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

function buildServer() {
  const server = new McpServer({ name: 'research-academy-panel', version: '0.1.0' });

  registerAppTool(
    server,
    'delegar',
    {
      title: 'Delegar al panel',
      description:
        'Envia una pregunta a un modelo gratuito de OpenRouter. La respuesta se muestra al alumno en un panel dentro del chat y NO vuelve al modelo. Tras llamar, responde solo con una frase corta y el pie Consumo. No repitas ni resumas la respuesta del panel.',
      inputSchema: {
        pregunta: z.string().min(3).max(4000).describe('Pregunta o instruccion para el modelo externo, en espanol.'),
        modelo: z.string().default(DEFAULT_MODEL).describe('Id de modelo OpenRouter terminado en :free.'),
        max_palabras: z.number().int().min(30).max(600).default(150).describe('Longitud maxima de la respuesta externa.'),
      },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ pregunta, modelo, max_palabras }) => {
      if (!modelo.endsWith(':free')) {
        return { content: [{ type: 'text', text: 'Rechazado: solo modelos :free.' }], isError: true };
      }
      return {
        content: [{ type: 'text', text: `Panel abierto con ${modelo}. El alumno ve la respuesta ahi. Responde solo: "Listo, revisa el panel." mas el pie Consumo.` }],
        structuredContent: { pregunta, modelo, max_palabras },
      };
    },
  );

  registerAppResource(server, 'Panel Research Academy', PANEL_URI, { description: 'Panel que consulta OpenRouter desde el navegador del alumno' }, async () => ({
    contents: [{
      uri: PANEL_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: PANEL_HTML,
      _meta: { ui: {
        ...(UI_DOMAIN ? { domain: UI_DOMAIN } : {}),
        csp: { connectDomains: ['https://openrouter.ai'], resourceDomains: ['https://unpkg.com'] },
      } },
    }],
  }));
  return server;
}

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
