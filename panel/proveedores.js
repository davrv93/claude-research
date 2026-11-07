// Capa de proveedores de modelos para los paneles (OpenAI-compatible, streaming SSE). Llaves solo en localStorage del panel.
(function (global) {
  const PROVEEDORES = {
    gemini: { nombre: 'Gemini (Google AI Studio)', base: 'https://generativelanguage.googleapis.com/v1beta/openai', clave: 'ra-key-gemini', ayuda: 'https://aistudio.google.com/apikey', gratis: 'nivel gratuito: 1 500 peticiones/día en Flash', modelos: { codigo: 'gemini-3.8-flash', texto: 'gemini-3.8-flash', vision: 'gemini-3.8-flash' }, elegir: { codigo: [/^gemini-[\d.]+-flash$/, /^gemini-[\d.]+-pro$/, /^gemini-[\d.]+-flash-lite$/], texto: [/^gemini-[\d.]+-flash$/, /^gemini-[\d.]+-flash-lite$/, /^gemini-[\d.]+-pro$/], vision: [/^gemini-[\d.]+-flash$/, /^gemini-[\d.]+-pro$/] } },
    mistral: { nombre: 'Mistral', base: 'https://api.mistral.ai/v1', clave: 'ra-key-mistral', ayuda: 'https://console.mistral.ai/api-keys', gratis: 'plan experimental gratuito con límite de ritmo', modelos: { codigo: 'codestral-latest', texto: 'mistral-small-latest', vision: 'pixtral-12b-2409' }, elegir: { codigo: [/^codestral-latest$/, /^codestral/, /^devstral/, /^mistral-small-latest$/], texto: [/^mistral-small-latest$/, /^mistral-medium-latest$/, /^mistral-small/], vision: [/^pixtral-large-latest$/, /^pixtral/, /^mistral-medium-latest$/] } },
    groq: { nombre: 'Groq', base: 'https://api.groq.com/openai/v1', clave: 'ra-key-groq', ayuda: 'https://console.groq.com/keys', gratis: 'nivel gratuito con límite por minuto y día', modelos: { codigo: 'llama-3.3-70b-versatile', texto: 'llama-3.3-70b-versatile' }, elegir: { codigo: [/^llama-3\.3-70b-versatile$/, /qwen.*coder/i, /llama.*70b/, /^llama/], texto: [/^llama-3\.3-70b-versatile$/, /llama.*70b/, /^llama/, /gemma/] } },
    cerebras: { nombre: 'Cerebras', base: 'https://api.cerebras.ai/v1', clave: 'ra-key-cerebras', ayuda: 'https://cloud.cerebras.ai', gratis: 'nivel gratuito con límite por minuto', modelos: { codigo: 'llama-3.3-70b', texto: 'llama-3.3-70b' }, elegir: { codigo: [/^llama-3\.3-70b$/, /qwen.*coder/i, /llama.*70b/, /^llama/, /^qwen/], texto: [/^llama-3\.3-70b$/, /llama.*70b/, /^llama/, /^qwen/] } },
    openrouter: { nombre: 'OpenRouter (modelos :free)', base: 'https://openrouter.ai/api/v1', clave: 'ra-openrouter-key', ayuda: 'https://openrouter.ai', gratis: '50 peticiones/día sin créditos, 1 000 con US$10', extra: { 'X-Title': 'Research Academy' }, modelos: { codigo: 'cohere/north-mini-code:free', texto: 'nvidia/nemotron-3-ultra-550b-a55b:free', vision: 'nvidia/nemotron-3.5-super-vl:free', audio: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free' } },
  };
  const ORDEN_POR_DEFECTO = { codigo: ['gemini', 'mistral', 'groq', 'cerebras', 'openrouter'], texto: ['openrouter', 'gemini', 'groq', 'mistral', 'cerebras'], vision: ['gemini', 'openrouter', 'mistral'], audio: ['openrouter'] };
  const guardado = { leer(k) { try { return localStorage.getItem(k); } catch { return null; } }, escribir(k, v) { try { localStorage.setItem(k, v); } catch {} }, borrar(k) { try { localStorage.removeItem(k); } catch {} } };

  const leerLlave = (id) => guardado.leer(PROVEEDORES[id]?.clave || '');
  const guardarLlave = (id, v) => guardado.escribir(PROVEEDORES[id].clave, String(v).trim());
  const borrarLlave = (id) => guardado.borrar(PROVEEDORES[id].clave);
  const configurados = () => Object.keys(PROVEEDORES).filter((id) => !!leerLlave(id));
  const enmascarar = (k) => (k ? k.slice(0, 4) + '…' + k.slice(-4) : '');
  function orden(tarea) {
    let pref = [];
    try { pref = JSON.parse(guardado.leer('ra-pref-' + tarea) || '[]'); } catch {}
    const base = ORDEN_POR_DEFECTO[tarea] || ORDEN_POR_DEFECTO.texto;
    const lista = [...pref.filter((p) => PROVEEDORES[p]), ...base.filter((p) => !pref.includes(p))];
    return lista.filter((id) => PROVEEDORES[id].modelos[tarea] && leerLlave(id));
  }
  const guardarOrden = (tarea, lista) => guardado.escribir('ra-pref-' + tarea, JSON.stringify(lista));

  // Lista de modelos del proveedor (GET /models), en caché 24 h. Evita nombres viejos que devuelven 404.
  const EXCLUIR = /embed|tts|audio|image|imagen|live|realtime|vision-only|whisper|guard|moderation|rerank|ocr|transcribe|veo|preview-\d{2}-\d{2}$/i;
  async function listarModelos(proveedor, forzar = false) {
    const p = PROVEEDORES[proveedor]; const clave = 'ra-modelos-' + proveedor;
    if (!forzar) { try { const c = JSON.parse(guardado.leer(clave) || 'null'); if (c && Date.now() - c.t < 86400000 && Array.isArray(c.ids)) return c.ids; } catch {} }
    const llave = leerLlave(proveedor); if (!llave) return [];
    try {
      const r = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${llave}`, ...(p.extra || {}) } });
      if (!r.ok) return [];
      const j = await r.json();
      const ids = (j.data || j.models || []).map((m) => String(m.id || m.name || '').replace(/^models\//, '')).filter(Boolean);
      guardado.escribir(clave, JSON.stringify({ t: Date.now(), ids }));
      return ids;
    } catch { return []; }
  }
  const version = (id) => { const m = id.match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  async function elegirModelo(proveedor, tarea, forzar = false) {
    const p = PROVEEDORES[proveedor];
    const porDefecto = p.modelos[tarea] || p.modelos.texto;
    if (!p.elegir || !p.elegir[tarea]) return porDefecto;
    const ids = (await listarModelos(proveedor, forzar)).filter((id) => !EXCLUIR.test(id));
    if (!ids.length) return porDefecto;
    for (const re of p.elegir[tarea]) {
      const cand = ids.filter((id) => re.test(id)).sort((a, b) => version(b) - version(a));
      if (cand.length) return cand[0];
    }
    return ids.includes(porDefecto) ? porDefecto : porDefecto;
  }

  async function llamar({ proveedor, tarea = 'texto', modelo, mensajes, maxTokens = 1500, temperatura, alTexto, stream = true, _reintento = false }) {
    const p = PROVEEDORES[proveedor]; if (!p) throw new Error('proveedor desconocido');
    const llave = leerLlave(proveedor); if (!llave) throw Object.assign(new Error(`${p.nombre}: sin llave`), { sinLlave: true });
    const mod = modelo || await elegirModelo(proveedor, tarea);
    const cuerpo = { model: mod, messages: mensajes, max_tokens: maxTokens, stream };
    if (temperatura !== undefined) cuerpo.temperature = temperatura;
    if (proveedor === 'openrouter') { cuerpo.usage = { include: true }; cuerpo.reasoning = { enabled: false }; }
    const cabeceras = { 'Content-Type': 'application/json', Authorization: `Bearer ${llave}`, ...(p.extra || {}) };
    const inicio = Date.now();
    let r = await fetch(`${p.base}/chat/completions`, { method: 'POST', headers: cabeceras, body: JSON.stringify(cuerpo) });
    if (proveedor === 'openrouter' && r.status === 400) { cuerpo.reasoning = { exclude: true }; cuerpo.max_tokens = maxTokens + 2048; r = await fetch(`${p.base}/chat/completions`, { method: 'POST', headers: cabeceras, body: JSON.stringify(cuerpo) }); }
    if (r.status === 404 && !modelo && !_reintento) { const nuevo = await elegirModelo(proveedor, tarea, true); if (nuevo !== mod) return llamar({ proveedor, tarea, modelo: nuevo, mensajes, maxTokens, temperatura, alTexto, stream, _reintento: true }); }
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw Object.assign(new Error(`${p.nombre} respondió ${r.status}: ${typeof j.error === 'string' ? j.error : j.error?.message || ''} (modelo ${mod})`.trim()), { status: r.status }); }
    let texto = '', usage = {}, finish;
    if (!stream) { const j = await r.json(); texto = j.choices?.[0]?.message?.content || ''; usage = j.usage || {}; finish = j.choices?.[0]?.finish_reason; }
    else {
      const lector = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await lector.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
          const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!l.startsWith('data: ') || l === 'data: [DONE]') continue;
          let j; try { j = JSON.parse(l.slice(6)); } catch { continue; }
          if (j.error) throw new Error(j.error.message || 'error del modelo');
          const c = j.choices?.[0]; if (c?.delta?.content) { texto += c.delta.content; alTexto?.(texto); } if (c?.finish_reason) finish = c.finish_reason; if (j.usage) usage = j.usage;
        }
      }
    }
    return { texto: texto.trim(), usage, finish, proveedor, modelo: mod, ms: Date.now() - inicio };
  }

  // Intenta por orden de preferencia; salta proveedores sin llave o con error de cuota/servidor.
  async function llamarConRespaldo(opts) {
    const lista = opts.proveedor ? [opts.proveedor] : orden(opts.tarea || 'texto');
    if (!lista.length) throw Object.assign(new Error('No hay proveedores configurados para esta tarea. Pide a Claude «research-academy configurar».'), { sinLlave: true });
    const errores = [];
    for (const id of lista) {
      try { return await llamar({ ...opts, proveedor: id }); }
      catch (e) { errores.push(`${id}: ${e.message}`); if (e.sinLlave || e.status === 401 || e.status === 403 || e.status === 429 || (e.status || 0) >= 500 || /fetch/i.test(e.message)) continue; throw e; }
    }
    throw new Error('Todos los proveedores fallaron. ' + errores.join(' | '));
  }

  async function probar(id) {
    try { const r = await llamar({ proveedor: id, tarea: 'texto', mensajes: [{ role: 'user', content: 'Responde solo: ok' }], maxTokens: 8, stream: false }); return { ok: true, modelo: r.modelo, ms: r.ms, texto: r.texto.slice(0, 20) }; }
    catch (e) { return { ok: false, error: e.message }; }
  }

  function exportarConfig() {
    const cfg = { version: 1, preferencias: {}, permisos: {} };
    for (const t of Object.keys(ORDEN_POR_DEFECTO)) { try { cfg.preferencias[t] = JSON.parse(guardado.leer('ra-pref-' + t) || '[]'); } catch {} }
    cfg.permisos.docs = guardado.leer('ra-docs-permiso');
    cfg.cerebro_auto = guardado.leer('ra-cerebro-auto');
    return cfg; // sin llaves ni frase clave
  }
  function importarConfig(cfg) {
    for (const [t, l] of Object.entries(cfg.preferencias || {})) if (Array.isArray(l)) guardarOrden(t, l.filter((p) => PROVEEDORES[p]));
    if (cfg.permisos?.docs != null) guardado.escribir('ra-docs-permiso', cfg.permisos.docs);
    if (cfg.cerebro_auto != null) guardado.escribir('ra-cerebro-auto', cfg.cerebro_auto);
  }

  global.RA_prov = { listarModelos, elegirModelo, PROVEEDORES, ORDEN_POR_DEFECTO, leerLlave, guardarLlave, borrarLlave, configurados, enmascarar, orden, guardarOrden, llamar, llamarConRespaldo, probar, exportarConfig, importarConfig, guardado };
})(typeof window !== 'undefined' ? window : globalThis);
