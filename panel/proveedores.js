// Capa de proveedores de modelos para los paneles (OpenAI-compatible, streaming SSE). Llaves solo en localStorage del panel.
(function (global) {
  const PROVEEDORES = {
    gemini: { nombre: 'Gemini (Google AI Studio)', base: 'https://generativelanguage.googleapis.com/v1beta/openai', nativo: 'https://generativelanguage.googleapis.com/v1beta', clave: 'ra-key-gemini', ayuda: 'https://aistudio.google.com/apikey', gratis: 'nivel gratuito: 1 500 peticiones/día en Flash', modelos: { codigo: 'gemini-2.5-flash', texto: 'gemini-2.5-flash', vision: 'gemini-2.5-flash' }, elegir: { codigo: [/^gemini-[\d.]+-flash$/, /^gemini-[\d.]+-pro$/, /^gemini-[\d.]+-flash-lite$/], texto: [/^gemini-[\d.]+-flash$/, /^gemini-[\d.]+-flash-lite$/, /^gemini-[\d.]+-pro$/], vision: [/^gemini-[\d.]+-flash$/, /^gemini-[\d.]+-pro$/] } },
    mistral: { nombre: 'Mistral', base: 'https://api.mistral.ai/v1', clave: 'ra-key-mistral', ayuda: 'https://console.mistral.ai/api-keys', gratis: 'plan experimental gratuito con límite de ritmo', modelos: { codigo: 'codestral-latest', texto: 'mistral-small-latest', vision: 'pixtral-12b-2409' }, elegir: { codigo: [/^codestral-latest$/, /^codestral/, /^devstral/, /^mistral-small-latest$/], texto: [/^mistral-small-latest$/, /^mistral-medium-latest$/, /^mistral-small/], vision: [/^pixtral-large-latest$/, /^pixtral/, /^mistral-medium-latest$/] } },
    groq: { nombre: 'Groq', base: 'https://api.groq.com/openai/v1', clave: 'ra-key-groq', ayuda: 'https://console.groq.com/keys', gratis: 'nivel gratuito con límite por minuto y día', modelos: { codigo: 'llama-3.3-70b-versatile', texto: 'llama-3.3-70b-versatile' }, elegir: { codigo: [/^llama-3\.3-70b-versatile$/, /qwen.*coder/i, /llama.*70b/, /^llama/], texto: [/^llama-3\.3-70b-versatile$/, /llama.*70b/, /^llama/, /gemma/] } },
    cerebras: { nombre: 'Cerebras', base: 'https://api.cerebras.ai/v1', clave: 'ra-key-cerebras', ayuda: 'https://cloud.cerebras.ai', gratis: 'nivel gratuito con límite por minuto', modelos: { codigo: 'llama-3.3-70b', texto: 'llama-3.3-70b' }, elegir: { codigo: [/^llama-3\.3-70b$/, /qwen.*coder/i, /llama.*70b/, /^llama/, /^qwen/], texto: [/^llama-3\.3-70b$/, /llama.*70b/, /^llama/, /^qwen/] } },
    openrouter: { nombre: 'OpenRouter (modelos :free)', base: 'https://openrouter.ai/api/v1', clave: 'ra-openrouter-key', ayuda: 'https://openrouter.ai', gratis: '50 peticiones/día sin créditos, 1 000 con US$10', extra: { 'X-Title': 'Research Academy' }, modelos: { codigo: 'cohere/north-mini-code:free', texto: 'nvidia/nemotron-3-ultra-550b-a55b:free', vision: 'nvidia/nemotron-3.5-super-vl:free', audio: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free' } },
  };
  const ORDEN_POR_DEFECTO = { codigo: ['gemini', 'mistral', 'groq', 'cerebras', 'openrouter'], texto: ['openrouter', 'gemini', 'groq', 'mistral', 'cerebras'], vision: ['gemini', 'openrouter', 'mistral'], audio: ['openrouter'] };
  const guardado = { leer(k) { try { return localStorage.getItem(k); } catch { return null; } }, escribir(k, v) { try { localStorage.setItem(k, v); } catch {} }, borrar(k) { try { localStorage.removeItem(k); } catch {} } };

  // fetch con tiempo límite: ninguna llamada deja el panel colgado en «probando…».
  const PRIMER_TOKEN_MS = 15000;
  async function fetchT(url, opts = {}, ms = 20000) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), ms) : null;
    try { const r = await fetch(url, ctl ? { ...opts, signal: ctl.signal } : opts); if (r && ctl) r._ctl = ctl; return r; }
    catch (e) { if (e && e.name === 'AbortError') throw Object.assign(new Error(`sin respuesta en ${Math.round(ms / 1000)} s`), { timeout: true }); throw Object.assign(new Error(`no se pudo conectar (${e.message}); si es la primera vez, puede ser el CSP del panel`), { red: true }); }
    finally { if (t) clearTimeout(t); }
  }
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
      const r = p.nativo
        ? await fetchT(`${p.nativo}/models?pageSize=200`, { headers: { 'x-goog-api-key': llave } }, 15000)
        : await fetchT(`${p.base}/models`, { headers: { Authorization: `Bearer ${llave}`, ...(p.extra || {}) } }, 15000);
      if (!r.ok) return [];
      const j = await r.json();
      const lista = (j.data || j.models || []).filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'));
      const ids = lista.map((m) => String(m.id || m.name || '').replace(/^models\//, '')).filter(Boolean);
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

  // Modelos candidatos de un proveedor para una tarea, en orden: el elegido y luego los demás que cumplen las reglas.
  async function candidatos(proveedor, tarea, forzar = false) {
    const p = PROVEEDORES[proveedor];
    const porDefecto = p.modelos[tarea] || p.modelos.texto;
    if (!p.elegir || !p.elegir[tarea]) return [porDefecto];
    const ids = (await listarModelos(proveedor, forzar)).filter((id) => !EXCLUIR.test(id));
    const out = [];
    for (const re of p.elegir[tarea]) for (const id of ids.filter((x) => re.test(x)).sort((a, b) => version(b) - version(a))) if (!out.includes(id)) out.push(id);
    if (!out.length) out.push(porDefecto);
    return out.slice(0, 4);
  }
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  // 503 y 429 son saturación o cuota del momento: se reintenta una vez y luego se prueba el siguiente modelo del proveedor.
  async function llamar(opts) {
    if (opts.modelo) return llamarUno(opts);
    const lista = await candidatos(opts.proveedor, opts.tarea || 'texto');
    let ultimo;
    for (const modelo of lista) {
      opts.alPaso?.(`probando ${modelo}…`);
      try { return await llamarUno({ ...opts, modelo, _reintento: true }); }
      catch (e) { ultimo = e; if (e.timeout || e.status === 503 || e.status === 429 || e.status === 500 || e.status === 502 || e.status === 404 || e.status === 599) continue; throw e; }
    }
    throw ultimo;
  }

  // Gemini nativo: mensajes OpenAI -> systemInstruction + contents (texto e imagenes data:), respuesta por SSE.
  function aGemini(mensajes) {
    const sys = mensajes.filter((m) => m.role === 'system').map((m) => (typeof m.content === 'string' ? m.content : (m.content || []).map((c) => c.text || '').join('\n'))).join('\n');
    const contents = mensajes.filter((m) => m.role !== 'system').map((m) => {
      const partes = typeof m.content === 'string' ? [{ text: m.content }] : (m.content || []).map((c) => {
        if (c.type === 'text') return { text: c.text };
        if (c.type === 'image_url') { const u = c.image_url?.url || ''; const mm = u.match(/^data:([^;]+);base64,(.+)$/); return mm ? { inlineData: { mimeType: mm[1], data: mm[2] } } : { text: u }; }
        if (c.type === 'input_audio') return { inlineData: { mimeType: 'audio/' + (c.input_audio?.format || 'mp3'), data: c.input_audio?.data || '' } };
        return { text: JSON.stringify(c) };
      });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: partes };
    });
    return { sys, contents };
  }
  async function llamarGeminiNativo({ p, llave, mod, mensajes, maxTokens, temperatura, alTexto, stream }) {
    const { sys, contents } = aGemini(mensajes);
    const cuerpo = { contents, generationConfig: { maxOutputTokens: maxTokens, ...(temperatura !== undefined ? { temperature: temperatura } : {}) } };
    if (sys) cuerpo.systemInstruction = { parts: [{ text: sys }] };
    const url = `${p.nativo}/models/${mod}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`;
    const r = await fetchT(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': llave }, body: JSON.stringify(cuerpo) }, stream ? PRIMER_TOKEN_MS : 60000);
    return r;
  }
  // Lee un cuerpo SSE con tope entre trozos: si el proveedor se queda mudo, aborta y el bucle pasa al siguiente modelo.
  async function leerSse(r, porLinea, msEntreTrozos = PRIMER_TOKEN_MS) {
    const lector = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      let timer; const guardia = new Promise((_, rej) => { timer = setTimeout(() => { try { r._ctl?.abort(); } catch {} rej(Object.assign(new Error(`sin respuesta en ${Math.round(msEntreTrozos / 1000)} s`), { status: 599, timeout: true })); }, msEntreTrozos); });
      let paso; try { paso = await Promise.race([lector.read(), guardia]); } finally { clearTimeout(timer); }
      const { value, done } = paso; if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l.startsWith('data: ')) porLinea(l.slice(6)); }
    }
  }
  function usoGemini(u) { return u ? { prompt_tokens: u.promptTokenCount || 0, completion_tokens: u.candidatesTokenCount || 0, total_tokens: u.totalTokenCount || 0 } : {}; }

  async function llamarUno({ proveedor, tarea = 'texto', modelo, mensajes, maxTokens = 1500, temperatura, alTexto, stream = true, _reintento = false }) {
    const p = PROVEEDORES[proveedor]; if (!p) throw new Error('proveedor desconocido');
    const llave = leerLlave(proveedor); if (!llave) throw Object.assign(new Error(`${p.nombre}: sin llave`), { sinLlave: true });
    const mod = modelo || await elegirModelo(proveedor, tarea);
    if (p.nativo) {
      const inicio = Date.now();
      const r = await llamarGeminiNativo({ p, llave, mod, mensajes, maxTokens, temperatura, alTexto, stream });
      if (!r.ok) { const crudo = typeof r.text === 'function' ? await r.text().catch(() => '') : ''; let j = {}; try { j = JSON.parse(crudo); } catch {} const motivo = j.error?.message || (r.status === 503 ? 'servicio saturado en este momento' : r.status === 429 ? 'límite de peticiones alcanzado' : ''); throw Object.assign(new Error(`${p.nombre} respondió ${r.status}: ${motivo} (modelo ${mod})`.trim()), { status: r.status, cuerpo: crudo.slice(0, 500) }); }
      let texto = '', usage = {}, finish;
      if (!stream) { const j = await r.json(); texto = (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join(''); usage = usoGemini(j.usageMetadata); finish = j.candidates?.[0]?.finishReason; }
      else {
        await leerSse(r, (d) => {
          let j; try { j = JSON.parse(d); } catch { return; }
          const t = (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join(''); if (t) { texto += t; alTexto?.(texto); }
          if (j.candidates?.[0]?.finishReason) finish = j.candidates[0].finishReason; if (j.usageMetadata) usage = usoGemini(j.usageMetadata);
        });
      }
      return { texto: texto.trim(), usage, finish, proveedor, modelo: mod, ms: Date.now() - inicio };
    }
    const cuerpo = { model: mod, messages: mensajes, max_tokens: maxTokens, stream };
    if (temperatura !== undefined) cuerpo.temperature = temperatura;
    if (proveedor === 'openrouter') { cuerpo.usage = { include: true }; cuerpo.reasoning = { enabled: false }; }
    const cabeceras = { 'Content-Type': 'application/json', Authorization: `Bearer ${llave}`, ...(p.extra || {}) };
    const inicio = Date.now();
    let r = await fetchT(`${p.base}/chat/completions`, { method: 'POST', headers: cabeceras, body: JSON.stringify(cuerpo) }, stream ? PRIMER_TOKEN_MS : 60000);
    if (proveedor === 'openrouter' && r.status === 400) { cuerpo.reasoning = { exclude: true }; cuerpo.max_tokens = maxTokens + 2048; r = await fetchT(`${p.base}/chat/completions`, { method: 'POST', headers: cabeceras, body: JSON.stringify(cuerpo) }, stream ? PRIMER_TOKEN_MS : 60000); }
    if (r.status === 404 && !modelo && !_reintento) { const nuevo = await elegirModelo(proveedor, tarea, true); if (nuevo !== mod) return llamarUno({ proveedor, tarea, modelo: nuevo, mensajes, maxTokens, temperatura, alTexto, stream, _reintento: true }); }
    if (!r.ok) { const crudo = typeof r.text === 'function' ? await r.text().catch(() => '') : ''; let j = {}; try { j = JSON.parse(crudo); } catch { j = typeof r.json === 'function' ? await r.json().catch(() => ({})) : {}; } const motivo = typeof j.error === 'string' ? j.error : j.error?.message || (r.status === 503 ? 'servicio saturado en este momento' : r.status === 429 ? 'límite de peticiones alcanzado' : ''); throw Object.assign(new Error(`${p.nombre} respondió ${r.status}: ${motivo} (modelo ${mod})${!j.error && crudo ? ' · ' + crudo.replace(/\s+/g, ' ').slice(0, 160) : ''}`.trim()), { status: r.status, cuerpo: crudo.slice(0, 500) }); }
    let texto = '', usage = {}, finish;
    if (!stream) { const j = await r.json(); texto = j.choices?.[0]?.message?.content || ''; usage = j.usage || {}; finish = j.choices?.[0]?.finish_reason; }
    else {
      await leerSse(r, (d) => {
        if (d === '[DONE]') return;
        let j; try { j = JSON.parse(d); } catch { return; }
        if (j.error) throw new Error(j.error.message || 'error del modelo');
        const c = j.choices?.[0]; if (c?.delta?.content) { texto += c.delta.content; alTexto?.(texto); } if (c?.finish_reason) finish = c.finish_reason; if (j.usage) usage = j.usage;
      });
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
      catch (e) { errores.push(`${id}: ${e.message}`); if (e.sinLlave || e.timeout || e.red || e.status === 401 || e.status === 403 || e.status === 404 || e.status === 429 || (e.status || 0) >= 500 || /fetch/i.test(e.message)) continue; throw e; }
    }
    throw new Error('Todos los proveedores fallaron. ' + errores.join(' | '));
  }

  async function probar(id, alPaso) {
    try { alPaso?.('listando modelos…'); const ids = await listarModelos(id, true); const mod = await elegirModelo(id, 'texto'); alPaso?.(`probando ${mod}… (si está saturado reintenta y cambia de modelo)`); const r = await llamar({ proveedor: id, tarea: 'texto', mensajes: [{ role: 'user', content: 'Responde solo: ok' }], maxTokens: 8, stream: false, alPaso }); return { ok: true, modelo: r.modelo, ms: r.ms, texto: r.texto.slice(0, 20), modelos: ids.length }; }
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

  global.RA_prov = { fetchT, listarModelos, elegirModelo, candidatos, PROVEEDORES, ORDEN_POR_DEFECTO, leerLlave, guardarLlave, borrarLlave, configurados, enmascarar, orden, guardarOrden, llamar, llamarConRespaldo, probar, exportarConfig, importarConfig, guardado };
})(typeof window !== 'undefined' ? window : globalThis);
