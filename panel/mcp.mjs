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
import { buscarNotas, codigoLectura, idDeFrase, leerCerebro, leerPorCodigo, resumirNotas } from './cerebro.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const PANEL_URI = 'ui://research-academy/panel';
export const DOCS_URI = 'ui://research-academy/docs';
export const CONFIG_URI = 'ui://research-academy/config';
export const CODIGO_URI = 'ui://research-academy/codigo';
export const TRES_URI = 'ui://research-academy/3d';
export const MODELO_POR_DEFECTO = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const VERSION = '0.13.0';

// Metadatos de la interfaz: a qué dominios puede conectarse el panel y de dónde carga módulos.
export function metaUi() {
  const ui = {
    csp: {
      connectDomains: ['https://openrouter.ai', 'https://mcp.parallel.ai', 'https://generativelanguage.googleapis.com', 'https://api.groq.com', 'https://api.cerebras.ai', 'https://api.mistral.ai', ...(cerebroUrl() ? [new URL(cerebroUrl()).origin] : [])],
      resourceDomains: ['https://unpkg.com', 'https://cdnjs.cloudflare.com', ...(cerebroUrl() ? [new URL(cerebroUrl()).origin] : [])],
    },
    permissions: { clipboardWrite: {} },
    prefersBorder: true,
  };
  // Origen estable del panel en claude.ai: así localStorage (la llave) sobrevive entre conversaciones.
  const url = process.env.SERVER_URL;
  if (url) ui.domain = createHash('sha256').update(url).digest('hex').slice(0, 32) + '.claudemcpcontent.com';
  return ui;
}

// Base del almacén del cerebro: CEREBRO_URL explícita, o SERVER_URL sin /mcp. Vacío = solo local.
export const conVersion = (html) => html.split('__CEREBRO_URL__/proveedores.js').join(`__CEREBRO_URL__/proveedores.js?v=${VERSION}`).split('__CEREBRO_URL__/docs-extra.js').join(`__CEREBRO_URL__/docs-extra.js?v=${VERSION}`).split('__CEREBRO_URL__/comun.css').join(`__CEREBRO_URL__/comun.css?v=${VERSION}`).split('__VERSION__').join(VERSION);
export const cerebroUrl = () => (process.env.CEREBRO_URL || (process.env.SERVER_URL ? process.env.SERVER_URL.replace(/\/mcp\/?$/, '') : '')).replace(/\/$/, '');

const esGratis = (modelo) => typeof modelo === 'string' && modelo.endsWith(':free');

const rechazo = (modelo) => ({
  isError: true,
  content: [{ type: 'text', text: `Modelo rechazado: «${modelo}» no termina en :free. Este panel solo usa modelos gratuitos de OpenRouter.` }],
});

const linea = (modelo) => ({
  type: 'text',
  text: `Panel abierto con ${modelo}. El alumno ve la respuesta ahí. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.`,
});

const NO_REPETIR = 'El resultado se muestra en el panel, no a ti: responde solo «Listo, revisa el panel.» y el pie Consumo.';

const modelo = z.string().default(MODELO_POR_DEFECTO).describe('Modelo OpenRouter :free.');
const maxPalabras = z.number().int().min(20).max(1200).default(150).describe('Palabras máximas.');

export function buildServer() {
  const server = new McpServer({ name: 'research-academy-panel', version: VERSION });

  registerAppTool(
    server,
    'delegar',
    {
      title: 'Delegar a un modelo gratuito',
      description: 'USAR CUANDO: explica, qué es, cómo funciona, diferencia entre (conocimiento estable). ' + NO_REPETIR,
      inputSchema: {
        pregunta: z.string().min(1).describe('Pregunta en español.'),
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
      description: 'USAR CUANDO: investiga, busca, vigente, actual, precio, ranking, ley, cifra de hoy. Búsqueda web con 1 a 3 consultas de 3 a 6 palabras y síntesis con fuentes. ' + NO_REPETIR,
      inputSchema: {
        pregunta: z.string().min(1).describe('Qué averiguar, en español.'),
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
          .describe('1 a 3 consultas de 3 a 6 palabras.'),
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

  registerAppTool(
    server,
    'mapa',
    {
      title: 'Mapa mental del cerebro del alumno',
      description: 'USAR CUANDO: mapa mental, mi cerebro, qué tengo guardado, repasar lo investigado. ' + NO_REPETIR,
      inputSchema: {
        tema: z.string().optional().describe('Filtro por tema.'),
      },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ tema }) => ({
      content: [{ type: 'text', text: `Mapa mental abierto en el panel${tema ? ` (tema: ${tema})` : ''}. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }],
      structuredContent: { modo: 'mapa', tema: tema || '' },
    }),
  );

  server.registerTool(
    'cerebro_buscar',
    {
      title: 'Buscar en el cerebro del alumno',
      description: 'Devuelve hasta 5 notas del cerebro del alumno (entran a tu contexto). Solo si lo pide y da su frase clave o un código de lectura.',
      inputSchema: {
        frase_clave: z.string().optional().describe('Frase clave del alumno.'),
        codigo_lectura: z.string().optional().describe('Código de lectura de 12 caracteres.'),
        tema: z.string().optional().describe('Tema a buscar.'),
      },
    },
    async ({ frase_clave, codigo_lectura, tema }) => {
      if (!frase_clave && !codigo_lectura) return { isError: true, content: [{ type: 'text', text: 'Falta la frase clave o un código de lectura.' }] };
      const cerebro = codigo_lectura ? await leerPorCodigo(codigo_lectura.trim().toLowerCase()) : await leerCerebro(idDeFrase(frase_clave));
      const notas = buscarNotas(cerebro.notas, tema);
      return {
        content: [{ type: 'text', text: `${notas.length} de ${cerebro.notas.length} notas.\n\n${resumirNotas(notas)}` }],
        structuredContent: { total: cerebro.notas.length, devueltas: notas.length },
      };
    },
  );

  registerAppTool(
    server,
    'docs_analizar',
    {
      title: 'Analizar un archivo del alumno (Excel, CSV, PDF, Word)',
      description: 'USAR CUANDO: resume/analiza/corrige este Excel, CSV, PDF, Word, foto o audio, o ppt de este archivo, AUNQUE el archivo no esté adjunto: el alumno lo suelta en el panel, nunca lo pidas. Responde solo «Listo, suelta el archivo en el panel.» y el pie Consumo.',
      inputSchema: {
        instruccion: z.string().default('').describe('Qué quiere hacer el alumno.'),
        accion: z.enum(['', 'resumen', 'informe', 'ppt', 'corregir', 'anadir', 'referencias', 'estudiar', 'originalidad', 'ocr', 'redes', 'graficar', 'comparar', 'limpiar', 'mensajes', 'convertir', 'excel_corregir']).default('').describe('Acción pedida; vacío si solo analizar.'),
        modelo,
      },
      _meta: { ui: { resourceUri: DOCS_URI } },
    },
    async ({ instruccion, accion, modelo }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return {
        content: [{ type: 'text', text: `Panel Documentos abierto con ${modelo}. El alumno suelta el archivo ahí y luego lo envía al chat si quiere. Responde solo: "Listo, suelta el archivo en el panel." más el pie Consumo.` }],
        structuredContent: { modo: 'docs', instruccion, accion, modelo },
      };
    },
  );

  registerAppTool(
    server,
    'docs_crear',
    {
      title: 'Crear un Excel o Word desde cero',
      description: 'USAR CUANDO: hazme una plantilla, crea un Excel, redacta un Word, carta, solicitud o informe nuevo (sin archivo previo). ' + NO_REPETIR,
      inputSchema: {
        tipo: z.enum(['excel', 'word']).describe('excel o word'),
        instruccion: z.string().min(3).describe('Qué debe contener.'),
        modelo,
      },
      _meta: { ui: { resourceUri: DOCS_URI } },
    },
    async ({ tipo, instruccion, modelo }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return { content: [{ type: 'text', text: `Panel Documentos abierto para crear un ${tipo}. Responde solo: "Listo, genera el archivo en el panel." más el pie Consumo.` }], structuredContent: { modo: 'docs', accion: 'crear', tipo, instruccion, modelo } };
    },
  );

  registerAppTool(
    server,
    'citar',
    {
      title: 'Citas en APA desde URLs',
      description: 'USAR CUANDO: cita, referencia APA, bibliografía de URLs. ' + NO_REPETIR,
      inputSchema: { urls: z.array(z.string().url()).min(1).max(10).describe('URLs a citar.'), modelo },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ urls, modelo }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return { content: [{ type: 'text', text: `Panel abierto con ${urls.length} URL(s) para citar. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }], structuredContent: { modo: 'citar', urls, modelo } };
    },
  );

  registerAppTool(
    server,
    'calcular',
    {
      title: 'Calculadoras fijas',
      description: 'USAR CUANDO: igv, punto de equilibrio, préstamo o cuota, margen o precio. ' + NO_REPETIR,
      inputSchema: { tipo: z.enum(['igv', 'punto_equilibrio', 'prestamo', 'margen']).describe('Calculadora a abrir.') },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ tipo }) => ({ content: [{ type: 'text', text: `Calculadora ${tipo} abierta en el panel. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }], structuredContent: { modo: 'calcular', tipo } }),
  );

  server.registerTool(
    'cerebro_compartir',
    {
      title: 'Código de solo lectura del cerebro',
      description: 'Código de solo lectura del cerebro del alumno (docente o asesor). Solo si lo pide y da su frase clave.',
      inputSchema: { frase_clave: z.string().min(4) },
    },
    async ({ frase_clave }) => {
      const id = idDeFrase(frase_clave);
      const c = await leerCerebro(id);
      return { content: [{ type: 'text', text: c.notas.length ? `Código de lectura: ${codigoLectura(id)} (${c.notas.length} notas). Quien lo tenga puede leer, no modificar. Se usa en el panel Research («Ver cerebro compartido») o con cerebro_buscar(codigo_lectura).` : 'Ese cerebro no tiene notas todavía.' }] };
    },
  );

  registerAppTool(
    server,
    'configurar',
    {
      title: 'Configuración del kit',
      description: 'Panel Configuración: OpenRouter, llaves de Gemini, Groq, Cerebras y Mistral, orden por tarea, cerebro. Nunca pidas una llave en el chat. Responde solo «Listo, configura en el panel.» y el pie Consumo.',
      inputSchema: {},
      _meta: { ui: { resourceUri: CONFIG_URI } },
    },
    async () => ({ content: [{ type: 'text', text: 'Panel Configuración abierto. Responde solo: "Listo, configura en el panel; las llaves se pegan ahí, nunca en el chat." más el pie Consumo.' }], structuredContent: { modo: 'config' } }),
  );

  registerAppTool(
    server,
    'codigo',
    {
      title: 'Código con proveedores gratuitos',
      description: 'USAR CUANDO: código, función, script, error, bug, corrige este error, tests, convertir lenguaje. Nunca escribas el código tú. Arquitectura o seguridad: directo. ' + NO_REPETIR,
      inputSchema: {
        accion: z.enum(['escribir', 'corregir', 'explicar', 'revisar', 'tests', 'convertir']).default('escribir'),
        lenguaje: z.enum(['javascript', 'typescript', 'html', 'css', 'python', 'sql', 'java', 'php', 'bash', 'react', 'otro']).default('javascript'),
        instruccion: z.string().default('').describe('Qué necesita.'),
        codigo: z.string().max(6000).default('').describe('Código o error, si es corto.'),
      },
      _meta: { ui: { resourceUri: CODIGO_URI } },
    },
    async ({ accion, lenguaje, instruccion, codigo }) => ({ content: [{ type: 'text', text: `Panel Código abierto (${accion}, ${lenguaje}). Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }], structuredContent: { modo: 'codigo', accion, lenguaje, instruccion, codigo } }),
  );

  registerAppTool(
    server,
    'render3d',
    {
      title: 'Objeto en 3D',
      description: 'USAR CUANDO: 3d, modelo 3d, render de un objeto, desde descripción o foto. ' + NO_REPETIR,
      inputSchema: {
        descripcion: z.string().default('').describe('Objeto a modelar; vacío si subirá foto.'),
        estilo: z.enum(['realista', 'lowpoly', 'juguete', 'esquema']).default('realista'),
      },
      _meta: { ui: { resourceUri: TRES_URI } },
    },
    async ({ descripcion, estilo }) => ({ content: [{ type: 'text', text: `Panel 3D abierto${descripcion ? ` para «${descripcion.slice(0, 60)}»` : ''}. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }], structuredContent: { modo: '3d', descripcion, estilo } }),
  );

  for (const [uri, archivo, nombre, desc] of [[CONFIG_URI, 'config.html', 'Configuración de Research Academy', 'Llaves, proveedores y preferencias, solo en el navegador del alumno.'], [CODIGO_URI, 'codigo.html', 'Panel Código de Research Academy', 'Código con proveedores gratuitos, vista previa y ejecución.'], [TRES_URI, 'tres.html', 'Panel 3D de Research Academy', 'Objetos en 3D con three.js a partir de texto o foto.']]) {
    registerAppResource(server, nombre, uri, { description: desc, mimeType: RESOURCE_MIME_TYPE, _meta: { ui: metaUi() } }, async () => ({
      contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: conVersion(await readFile(join(AQUI, archivo), 'utf8')).split('__CEREBRO_URL__').join(cerebroUrl()), _meta: { ui: metaUi() } }],
    }));
  }

  registerAppResource(
    server,
    'Panel Documentos de Research Academy',
    DOCS_URI,
    { description: 'Panel donde el alumno suelta un archivo y lo analiza sin pasar por Claude.', mimeType: RESOURCE_MIME_TYPE, _meta: { ui: metaUi() } },
    async () => ({
      contents: [{ uri: DOCS_URI, mimeType: RESOURCE_MIME_TYPE, text: conVersion(await readFile(join(AQUI, 'docs.html'), 'utf8')).split('__CEREBRO_URL__').join(cerebroUrl()), _meta: { ui: metaUi() } }],
    }),
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
          text: (await readFile(join(AQUI, 'panel.html'), 'utf8')).replace('__CEREBRO_URL__', cerebroUrl()),
          _meta: { ui: metaUi() },
        },
      ],
    }),
  );

  return server;
}
