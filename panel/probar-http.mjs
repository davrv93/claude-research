// Prueba server.mjs por HTTP: tools/list con _meta.ui.resourceUri, delegar con modelo de pago (isError),
// delegar con modelo :free (una línea + structuredContent) y GET /mcp → 405.
const URL_MCP = process.env.URL_MCP || 'http://127.0.0.1:3917/mcp';
async function rpc(method, params) {
  const r = await fetch(URL_MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const t = await r.text();
  const l = t.split('\n').find((x) => x.startsWith('data: '));
  return JSON.parse(l ? l.slice(6) : t);
}
const tools = (await rpc('tools/list', {})).result.tools;
console.log('tools/list:', tools.map((t) => `${t.name} → ${t._meta?.ui?.resourceUri}`).join(', '));
const pago = (await rpc('tools/call', { name: 'delegar', arguments: { pregunta: 'hola', modelo: 'openai/gpt-4o' } })).result;
console.log('delegar con modelo de pago → isError:', pago.isError, '·', pago.content[0].text);
const gratis = (await rpc('tools/call', { name: 'delegar', arguments: { pregunta: '¿Qué es un índice en SQL?' } })).result;
console.log('delegar :free → isError:', !!gratis.isError, '·', gratis.content.length, 'línea:', gratis.content[0].text);
console.log('   structuredContent:', JSON.stringify(gratis.structuredContent));
const inv = (await rpc('tools/call', { name: 'investigar', arguments: { pregunta: 'x', consultas: ['una'] } })).result;
console.log('investigar con consulta de 1 palabra → isError:', inv.isError);
const get = await fetch(URL_MCP);
console.log('GET /mcp →', get.status);
const ok = tools.every((t) => t._meta?.ui?.resourceUri) && pago.isError === true && !gratis.isError && gratis.content.length === 1 && inv.isError === true && get.status === 405;
process.exit(ok ? 0 : 1);
