// Servidor MCP del panel de delegación. No guarda llaves ni llama a ningún modelo: solo registra las
// herramientas y entrega panel.html. La consulta la hace el panel desde el navegador del usuario, con su
// propia llave de OpenRouter, para que la respuesta no entre al contexto de Claude.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const PANEL_URI = 'ui://research-academy/panel';
export const MODELO_POR_DEFECTO = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const VERSION = '0.4.0';

// Metadatos de la interfaz: a qué dominios puede conectarse el panel y de dónde carga módulos.
export function metaUi() {
  const ui = {
    csp: {
      connectDomains: ['https://openrouter.ai', 'https://mcp.parallel.ai'],
      resourceDomains: ['https://unpkg.com'],
    },
    permissions: { clipboardWrite: {} },
    prefersBorder: true,
  };
  // Origen estable del panel en claude.ai: así localStorage (la llave) sobrevive entre conversaciones.
  const url = process.env.SERVER_URL;
  if (url) ui.domain = createHash('sha256').update(url).digest('hex').slice(0, 32) + '.claudemcpcontent.com';
  return ui;
}

const esGratis = (modelo) => typeof modelo === 'string' && modelo.endsWith(':free');

const rechazo = (modelo) => ({
  isError: true,
  content: [{ type: 'text', text: `Modelo rechazado: «${modelo}» no termina en :free. Este panel solo usa modelos gratuitos de OpenRouter.` }],
});

const linea = (modelo) => ({
  type: 'text',
  text: `Panel abierto con ${modelo}. El alumno ve la respuesta ahí. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.`,
});

const NO_REPETIR =
  'La respuesta se muestra al usuario en un panel y NO llega a ti. No repitas, no resumas ni completes lo que muestra el panel; ' +
  "responde solo «Listo, revisa el panel.» y el pie de consumo.";

const modelo = z
  .string()
  .default(MODELO_POR_DEFECTO)
  .describe('Id de un modelo gratuito de OpenRouter; debe terminar en :free.');
const maxPalabras = z.number().int().min(20).max(1200).default(150).describe('Largo máximo de la respuesta, en palabras.');

export function buildServer() {
  const server = new McpServer({ name: 'research-academy-panel', version: VERSION });

  registerAppTool(
    server,
    'delegar',
    {
      title: 'Delegar a un modelo gratuito',
      description:
        'Envía una pregunta a un modelo gratuito de OpenRouter. El modelo la responde en español dentro de un panel que ve el usuario. ' +
        NO_REPETIR,
      inputSchema: {
        pregunta: z.string().min(1).describe('La pregunta, en español, tal como la debe responder el modelo externo.'),
        modelo,
        max_palabras: maxPalabras,
      },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ pregunta, modelo, max_palabras }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return { content: [linea(modelo)], structuredContent: { modo: 'delegar', pregunta, modelo, max_palabras } };
    },
  );

  registerAppTool(
    server,
    'investigar',
    {
      title: 'Investigar en la web con un modelo gratuito',
      description:
        'Busca en la web (Parallel) con 1 a 3 consultas cortas y pide a un modelo gratuito de OpenRouter una respuesta en español ' +
        'que cite solo esas fuentes con [n]. Todo ocurre en un panel que ve el usuario. ' +
        NO_REPETIR,
      inputSchema: {
        pregunta: z.string().min(1).describe('Lo que se quiere averiguar, en español.'),
        consultas: z
          .array(
            z
              .string()
              .refine((s) => {
                const n = s.trim().split(/\s+/).filter(Boolean).length;
                return n >= 3 && n <= 6;
              }, 'Cada consulta debe tener de 3 a 6 palabras.'),
          )
          .min(1)
          .max(3)
          .describe('De 1 a 3 consultas de búsqueda, de 3 a 6 palabras cada una.'),
        modelo,
        max_palabras: maxPalabras,
      },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ pregunta, consultas, modelo, max_palabras }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return { content: [linea(modelo)], structuredContent: { modo: 'investigar', pregunta, consultas, modelo, max_palabras } };
    },
  );

  registerAppResource(
    server,
    'Panel de Research Academy',
    PANEL_URI,
    { description: 'Panel donde el usuario ve la respuesta del modelo gratuito.', mimeType: RESOURCE_MIME_TYPE, _meta: { ui: metaUi() } },
    async () => ({
      contents: [
        {
          uri: PANEL_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readFile(join(AQUI, 'panel.html'), 'utf8'),
          _meta: { ui: metaUi() },
        },
      ],
    }),
  );

  return server;
}
