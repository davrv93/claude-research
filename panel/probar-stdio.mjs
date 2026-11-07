// Habla con stdio.mjs por stdin/stdout: initialize, initialized, tools/list y resources/read del panel.
import { spawn } from 'node:child_process';
const hijo = spawn(process.execPath, [new URL('./stdio.mjs', import.meta.url).pathname], { stdio: ['pipe', 'pipe', 'inherit'] });
const enviar = (m) => hijo.stdin.write(JSON.stringify(m) + '\n');
const respuestas = new Map();
let buf = '';
hijo.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const l = buf.slice(0, i); buf = buf.slice(i + 1);
    if (l.trim()) { const m = JSON.parse(l); if (m.id) respuestas.set(m.id, m); }
  }
});
const esperar = (id) => new Promise((ok, mal) => {
  const t = Date.now();
  const v = setInterval(() => { if (respuestas.has(id)) { clearInterval(v); ok(respuestas.get(id)); } else if (Date.now() - t > 8000) { clearInterval(v); mal(new Error('sin respuesta ' + id)); } }, 20);
});
enviar({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'prueba', version: '1' } } });
const ini = await esperar(1);
console.log('initialize:', ini.result.serverInfo.name, ini.result.serverInfo.version);
enviar({ jsonrpc: '2.0', method: 'notifications/initialized' });
enviar({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
const tools = (await esperar(2)).result.tools;
console.log('tools:', tools.map((t) => `${t.name} → ${t._meta?.ui?.resourceUri}`).join(', '));
enviar({ jsonrpc: '2.0', id: 3, method: 'resources/read', params: { uri: 'ui://research-academy/panel' } });
const c = (await esperar(3)).result.contents[0];
console.log('resource:', c.mimeType, '·', c.text.length, 'caracteres HTML · csp', JSON.stringify(c._meta?.ui?.csp));
hijo.kill();
const ok = ['delegar', 'investigar'].every((n) => tools.some((t) => t.name === n)) && c.text.startsWith('<!doctype html>') && c._meta?.ui?.csp;
process.exit(ok ? 0 : 1);
