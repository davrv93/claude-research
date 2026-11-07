import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

// URL publica del servidor (https://host/mcp). Define ui.domain para Claude.
const SERVER_URL = process.env.SERVER_URL ?? '';
export const UI_DOMAIN = SERVER_URL
  ? createHash('sha256').update(SERVER_URL).digest('hex').slice(0, 32) + '.claudemcpcontent.com'
  : undefined;
const PANEL_URI = 'ui://research-academy/panel';
const PANEL_HTML = readFileSync(new URL('./panel.html', import.meta.url), 'utf8');
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

export function buildServer() {
  const server = new McpServer({ name: 'research-academy-panel', version: '0.3.0' });

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
        structuredContent: { modo: 'delegar', pregunta, modelo, max_palabras },
      };
    },
  );

  registerAppTool(
    server,
    'investigar',
    {
      title: 'Investigar en el panel',
      description:
        'Investigacion web completa fuera de Claude: el panel busca en la web (Parallel) y un modelo gratuito de OpenRouter redacta la sintesis con fuentes. El alumno ve todo en el panel; nada vuelve al modelo. Usar para actualidad, precios, rankings, normativa, estadisticas. Tras llamar, responde solo con una frase corta y el pie Consumo.',
      inputSchema: {
        pregunta: z.string().min(3).max(2000).describe('Lo que el alumno quiere saber, en espanol.'),
        consultas: z.array(z.string().min(3).max(80)).min(1).max(3).describe('2 o 3 consultas de busqueda de 3 a 6 palabras, relacionadas con la pregunta.'),
        modelo: z.string().default(DEFAULT_MODEL).describe('Id de modelo OpenRouter terminado en :free.'),
        max_palabras: z.number().int().min(50).max(400).default(150).describe('Longitud maxima de la sintesis.'),
      },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ pregunta, consultas, modelo, max_palabras }) => {
      if (!modelo.endsWith(':free')) {
        return { content: [{ type: 'text', text: 'Rechazado: solo modelos :free.' }], isError: true };
      }
      return {
        content: [{ type: 'text', text: `Panel investigando con Parallel + ${modelo}. El alumno ve fuentes y sintesis ahi. Responde solo: "Listo, revisa el panel." mas el pie Consumo.` }],
        structuredContent: { modo: 'investigar', pregunta, consultas, modelo, max_palabras },
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
        csp: { connectDomains: ['https://openrouter.ai', 'https://mcp.parallel.ai'], resourceDomains: ['https://unpkg.com'] },
      } },
    }],
  }));
  return server;
}
