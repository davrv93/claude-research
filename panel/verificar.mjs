// Ejecuta contra mcp.parallel.ai la misma lógica de búsqueda que usa panel.html y muestra las fuentes.
const PARALLEL = 'https://mcp.parallel.ai/mcp';
const objetivo = process.argv[2] || '¿Qué es el protocolo MCP de Anthropic y para qué sirve?';
const consultas = process.argv.slice(3).length ? process.argv.slice(3) : ['Model Context Protocol Anthropic', 'MCP servidores herramientas'];

const r = await fetch(PARALLEL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'web_search', arguments: { objective: objetivo, search_queries: consultas } } }),
});
console.log('HTTP', r.status, '· CORS', r.headers.get('access-control-allow-origin'));
const crudo = await r.text();
const linea = crudo.split('\n').find((l) => l.startsWith('data: '));
const rpc = JSON.parse(linea ? linea.slice(6) : crudo);
if (rpc.error) throw new Error(JSON.stringify(rpc.error));
const datos = JSON.parse(rpc.result.content[0].text);
const fuentes = (datos.results || []).slice(0, 5).map((x) => ({ url: x.url, title: x.title, extracto: (x.excerpts || []).join(' … ').slice(0, 900) }));
console.log(`recibidos ${crudo.length} caracteres · ${datos.results?.length ?? 0} resultados · usados ${fuentes.length}`);
fuentes.forEach((f, i) => console.log(`[${i + 1}] ${f.title}\n    ${f.url}\n    ${f.extracto.slice(0, 140).replace(/\s+/g, ' ')}…`));
if (fuentes.length !== 5) process.exit(1);
