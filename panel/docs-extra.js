// Funciones puras del panel Documentos (Fase 1 y 2): crear Excel y Word, comparar, limpiar, mensajes, gráfico, convertir.
// Sin DOM ni red: reciben las librerías (XLSX, docx, jsPDF) como argumentos para poder probarse en Node.
(function (global) {
  const num = (v) => { if (typeof v === 'number') return v; const s = String(v ?? '').replace(/\s/g, '').replace(/^S\/\.?/i, '').replace(/[^\d.,-]/g, ''); if (!s) return NaN; const n = Number(s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, '')); return n; };
  const txt = (v) => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
  const colIdx = (cab, nombre) => cab.findIndex((c) => String(c).trim().toLowerCase() === String(nombre).trim().toLowerCase());

  // ---------- Crear Excel desde un guion del modelo ----------
  // guion: {hojas:[{nombre, columnas:[...], filas:[[...]], formulas:[{celda, formula}], anchos?:[...]}], ayuda?: "texto"}
  function crearExcel(XLSX, guion) {
    const wb = XLSX.utils.book_new();
    let n = 0;
    for (const h of (guion.hojas || []).slice(0, 8)) {
      const cab = (h.columnas || []).map((c) => String(c).slice(0, 40));
      if (!cab.length) continue;
      const filas = (h.filas || []).slice(0, 500).map((f) => cab.map((_, i) => (f && f[i] !== undefined ? f[i] : null)));
      const ws = XLSX.utils.aoa_to_sheet([cab, ...filas]);
      for (const f of h.formulas || []) {
        if (!f || !/^[A-Z]{1,3}\d{1,6}$/.test(String(f.celda || '')) || typeof f.formula !== 'string' || /^=/.test(f.formula) || /[<>]/.test(f.formula)) continue;
        ws[f.celda] = { t: 'n', f: f.formula.slice(0, 300) };
      }
      const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      for (const f of h.formulas || []) { const c = XLSX.utils.decode_cell(String(f.celda || 'A1')); if (c.r > ref.e.r) ref.e.r = c.r; if (c.c > ref.e.c) ref.e.c = c.c; }
      ws['!ref'] = XLSX.utils.encode_range(ref);
      ws['!cols'] = cab.map((c, i) => ({ wch: Math.min(40, Math.max(10, (h.anchos && h.anchos[i]) || String(c).length + 4)) }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws, String(h.nombre || `Hoja${n + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
      n++;
    }
    if (guion.ayuda) {
      const ws = XLSX.utils.aoa_to_sheet([['Cómo usar esta plantilla'], ...String(guion.ayuda).split('\n').map((l) => [l])]);
      ws['!cols'] = [{ wch: 90 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Ayuda');
    }
    if (!wb.SheetNames.length) throw new Error('el guion no tiene hojas con columnas');
    wb.Workbook = wb.Workbook || {}; wb.Workbook.CalcPr = { fullCalcOnLoad: true };
    return wb;
  }

  // ---------- Crear Word desde texto con markdown mínimo ----------
  function bloquesMd(texto) {
    const out = [];
    for (const linea of String(texto).split(/\n/)) {
      const l = linea.trim(); if (!l) continue;
      const m = l.match(/^(#{1,3})\s+(.*)$/);
      if (m) out.push({ tipo: 'h' + m[1].length, texto: m[2] });
      else if (/^[-*•]\s+/.test(l)) out.push({ tipo: 'vineta', texto: l.replace(/^[-*•]\s+/, '') });
      else if (/^\d+[.)]\s+/.test(l)) out.push({ tipo: 'num', texto: l.replace(/^\d+[.)]\s+/, '') });
      else out.push({ tipo: 'p', texto: l });
    }
    return out;
  }
  function runsNegrita(docx, texto) {
    const partes = String(texto).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return partes.map((p) => (/^\*\*[^*]+\*\*$/.test(p) ? new docx.TextRun({ text: p.slice(2, -2), bold: true }) : new docx.TextRun(p)));
  }
  function crearWord(docx, titulo, texto, meta = {}) {
    const H = docx.HeadingLevel;
    const parrafos = [];
    if (titulo) parrafos.push(new docx.Paragraph({ text: String(titulo).slice(0, 200), heading: H.TITLE }));
    if (meta.subtitulo) parrafos.push(new docx.Paragraph({ children: [new docx.TextRun({ text: String(meta.subtitulo), italics: true })], spacing: { after: 240 } }));
    for (const b of bloquesMd(texto)) {
      if (b.tipo === 'h1') parrafos.push(new docx.Paragraph({ text: b.texto, heading: H.HEADING_1, spacing: { before: 240, after: 120 } }));
      else if (b.tipo === 'h2') parrafos.push(new docx.Paragraph({ text: b.texto, heading: H.HEADING_2, spacing: { before: 200, after: 100 } }));
      else if (b.tipo === 'h3') parrafos.push(new docx.Paragraph({ text: b.texto, heading: H.HEADING_3 }));
      else if (b.tipo === 'vineta') parrafos.push(new docx.Paragraph({ children: runsNegrita(docx, b.texto), bullet: { level: 0 } }));
      else if (b.tipo === 'num') parrafos.push(new docx.Paragraph({ children: runsNegrita(docx, b.texto), numbering: { reference: 'lista', level: 0 } }));
      else parrafos.push(new docx.Paragraph({ children: runsNegrita(docx, b.texto), spacing: { after: 120 } }));
    }
    if (meta.pie) parrafos.push(new docx.Paragraph({ children: [new docx.TextRun({ text: String(meta.pie), size: 16, color: '777777' })], spacing: { before: 400 } }));
    return new docx.Document({
      creator: 'Research Academy',
      title: String(titulo || 'Documento'),
      numbering: { config: [{ reference: 'lista', levels: [{ level: 0, format: docx.LevelFormat.DECIMAL, text: '%1.', alignment: docx.AlignmentType.START }] }] },
      styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
      sections: [{ children: parrafos }],
    });
  }

  // ---------- Comparar dos tablas por columna clave ----------
  // a, b: {cabecera, filas}; clave: nombre de columna; devuelve {soloA, soloB, cambios, iguales, columnasNum}
  function comparar(a, b, clave) {
    const ia = colIdx(a.cabecera, clave), ib = colIdx(b.cabecera, clave);
    if (ia < 0 || ib < 0) throw new Error(`la columna «${clave}» no está en los dos archivos`);
    const comunes = a.cabecera.filter((c) => colIdx(b.cabecera, c) >= 0 && colIdx(a.cabecera, c) !== ia);
    const mapaB = new Map(b.filas.map((f) => [txt(f[ib]).trim().toLowerCase(), f]));
    const vistos = new Set();
    const soloA = [], cambios = []; let iguales = 0;
    for (const fa of a.filas) {
      const k = txt(fa[ia]).trim().toLowerCase(); if (!k) continue;
      const fb = mapaB.get(k);
      if (!fb) { soloA.push(fa); continue; }
      vistos.add(k);
      const difs = [];
      for (const c of comunes) {
        const va = fa[colIdx(a.cabecera, c)], vb = fb[colIdx(b.cabecera, c)];
        const na = num(va), nb = num(vb);
        if (Number.isFinite(na) && Number.isFinite(nb)) { if (Math.abs(na - nb) > 1e-9) difs.push({ columna: c, a: na, b: nb, delta: Math.round((nb - na) * 100) / 100 }); }
        else if (txt(va).trim() !== txt(vb).trim()) difs.push({ columna: c, a: txt(va), b: txt(vb), delta: '' });
      }
      if (difs.length) cambios.push({ clave: txt(fa[ia]), difs }); else iguales++;
    }
    const soloB = b.filas.filter((f) => { const k = txt(f[ib]).trim().toLowerCase(); return k && !vistos.has(k) && !a.filas.some((fa) => txt(fa[ia]).trim().toLowerCase() === k); });
    return { soloA, soloB, cambios, iguales, comunes };
  }
  function libroComparacion(XLSX, a, b, clave, r) {
    const wb = XLSX.utils.book_new();
    const resumen = [['Resumen de la comparación'], ['Columna clave', clave], ['Filas solo en A', r.soloA.length], ['Filas solo en B', r.soloB.length], ['Filas con cambios', r.cambios.length], ['Filas iguales', r.iguales]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Clave', 'Columna', 'Valor en A', 'Valor en B', 'Diferencia'], ...r.cambios.flatMap((c) => c.difs.map((d) => [c.clave, d.columna, d.a, d.b, d.delta]))]), 'Cambios');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([a.cabecera, ...r.soloA]), 'Solo en A');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([b.cabecera, ...r.soloB]), 'Solo en B');
    return wb;
  }

  // ---------- Limpiar datos ----------
  // reglas: {espacios, mayusculas:'titulo'|'mayus'|'minus'|'', duplicados, fechas, telefonos, montos}
  function limpiar(cabecera, filas, reglas, tipos = {}) {
    const informe = { espacios: 0, mayusculas: 0, duplicados: 0, fechas: 0, telefonos: 0, montos: 0 };
    const titulo = (s) => s.toLowerCase().replace(/(^|\s|[-'])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
    const fecha = (v) => {
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      const s = txt(v).trim(); let m;
      if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/))) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
      return null;
    };
    const telefono = (v) => { const d = txt(v).replace(/\D/g, ''); const n = d.startsWith('51') && d.length === 11 ? d.slice(2) : d; return n.length === 9 ? n : null; };
    const salida = [];
    const vistas = new Set();
    for (const f of filas) {
      const nf = f.slice();
      cabecera.forEach((c, i) => {
        let v = nf[i]; if (v === null || v === undefined) return;
        const t = (tipos[c] || '').toLowerCase(), nombre = String(c).toLowerCase();
        if (reglas.espacios && typeof v === 'string') { const s = v.replace(/\s+/g, ' ').trim(); if (s !== v) { v = s; informe.espacios++; } }
        if (reglas.mayusculas && typeof v === 'string' && t !== 'numero' && !/fecha|correo|email|url|dni|ruc/.test(nombre)) { const s = reglas.mayusculas === 'titulo' ? titulo(v) : reglas.mayusculas === 'mayus' ? v.toUpperCase() : v.toLowerCase(); if (s !== v) { v = s; informe.mayusculas++; } }
        if (reglas.fechas && (t === 'fecha' || /fecha|date|dia|día/.test(nombre))) { const s = fecha(v); if (s && s !== v) { v = s; informe.fechas++; } }
        if (reglas.telefonos && /tel|cel|whatsapp|movil|móvil/.test(nombre)) { const s = telefono(v); if (s && s !== txt(v)) { v = s; informe.telefonos++; } }
        if (reglas.montos && (t === 'numero' || /monto|precio|total|venta|importe|saldo|deuda|costo/.test(nombre)) && typeof v === 'string') { const n = num(v); if (Number.isFinite(n)) { v = n; informe.montos++; } }
        nf[i] = v;
      });
      if (reglas.duplicados) { const k = nf.map((x) => txt(x).trim().toLowerCase()).join('\u0001'); if (vistas.has(k)) { informe.duplicados++; continue; } vistas.add(k); }
      salida.push(nf);
    }
    return { filas: salida, informe };
  }

  // ---------- Mensajes personalizados ----------
  // plantilla con {Columna}; devuelve [{clave, texto}]
  function mensajes(cabecera, filas, plantilla, max = 500) {
    const campos = [...String(plantilla).matchAll(/\{([^}]+)\}/g)].map((m) => m[1].trim());
    const faltan = campos.filter((c) => colIdx(cabecera, c) < 0);
    if (faltan.length) throw new Error(`columnas que no existen: ${faltan.join(', ')}`);
    return filas.slice(0, max).map((f, i) => {
      let t = String(plantilla);
      for (const c of campos) { const v = f[colIdx(cabecera, c)]; t = t.split(`{${c}}`).join(typeof v === 'number' ? v.toLocaleString('es-PE') : txt(v)); }
      return { n: i + 1, clave: txt(f[0]), texto: t };
    });
  }

  // ---------- Serie y gráfico en canvas (PNG) ----------
  function serie(cabecera, filas, catCol, valCol, max = 12) {
    const ci = colIdx(cabecera, catCol), vi = colIdx(cabecera, valCol);
    if (ci < 0 || vi < 0) throw new Error('columna no encontrada');
    const acc = new Map(), orden = [];
    for (const f of filas) { const k = txt(f[ci]).trim(); const v = num(f[vi]); if (!k || !Number.isFinite(v)) continue; if (!acc.has(k)) orden.push(k); acc.set(k, (acc.get(k) || 0) + v); }
    const esTiempo = orden.every((k) => /^\d{4}-\d{2}/.test(k));
    const pares = (esTiempo ? orden.map((k) => [k, acc.get(k)]).sort((a, b) => a[0].localeCompare(b[0])) : [...acc].sort((a, b) => b[1] - a[1])).slice(0, max);
    return { labels: pares.map((p) => p[0]), values: pares.map((p) => Math.round(p[1] * 100) / 100), esTiempo };
  }
  function dibujar(canvas, tipo, s, opciones = {}) {
    const W = canvas.width = opciones.ancho || 1200, H = canvas.height = opciones.alto || 675;
    const ctx = canvas.getContext('2d');
    const fondo = '#ffffff', tinta = '#1d1c24', gris = '#6b6980', acento = opciones.color || '#1f7a4d', paleta = ['#1f7a4d', '#5a49d6', '#c2622d', '#2a7fbf', '#8a4a9e', '#d4a017', '#2d9d8f', '#777777', '#b42318', '#4b6c3a', '#9c6b2f', '#3a3f8f'];
    ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = tinta; ctx.font = 'bold 34px system-ui, sans-serif'; ctx.textBaseline = 'top'; ctx.fillText(String(opciones.titulo || '').slice(0, 60), 48, 36);
    ctx.font = '20px system-ui, sans-serif'; ctx.fillStyle = gris; ctx.fillText(String(opciones.subtitulo || '').slice(0, 90), 48, 84);
    const fmt = (n) => Math.round(n).toLocaleString('es-PE');
    const total = s.values.reduce((a, b) => a + b, 0);
    if (tipo === 'pie') {
      const cx = W * 0.36, cy = H * 0.56, r = Math.min(W, H) * 0.3; let a0 = -Math.PI / 2;
      s.values.forEach((v, i) => { const a1 = a0 + (total ? (v / total) * Math.PI * 2 : 0); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fillStyle = paleta[i % paleta.length]; ctx.fill(); ctx.strokeStyle = fondo; ctx.lineWidth = 3; ctx.stroke(); a0 = a1; });
      ctx.font = '20px system-ui, sans-serif'; ctx.textBaseline = 'middle';
      s.labels.forEach((l, i) => { const y = H * 0.28 + i * 34; ctx.fillStyle = paleta[i % paleta.length]; ctx.fillRect(W * 0.66, y - 9, 18, 18); ctx.fillStyle = tinta; ctx.fillText(`${l.slice(0, 22)}  ${fmt(s.values[i])} (${total ? Math.round((100 * s.values[i]) / total) : 0}%)`, W * 0.66 + 28, y); });
      return canvas;
    }
    const mL = 110, mR = 40, mT = 130, mB = 110, pw = W - mL - mR, ph = H - mT - mB;
    const max = Math.max(...s.values, 0) || 1, min = Math.min(...s.values, 0);
    const y = (v) => mT + ph - ((v - min) / (max - min || 1)) * ph;
    ctx.strokeStyle = '#e4e2ee'; ctx.lineWidth = 1; ctx.fillStyle = gris; ctx.font = '18px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) { const v = min + ((max - min) * i) / 4; const yy = y(v); ctx.beginPath(); ctx.moveTo(mL, yy); ctx.lineTo(W - mR, yy); ctx.stroke(); ctx.fillText(fmt(v), mL - 12, yy); }
    const n = s.values.length, paso = pw / Math.max(n, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (tipo === 'line') {
      ctx.strokeStyle = acento; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
      s.values.forEach((v, i) => { const x = mL + paso * (i + 0.5); i ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); }); ctx.stroke();
      s.values.forEach((v, i) => { const x = mL + paso * (i + 0.5); ctx.fillStyle = acento; ctx.beginPath(); ctx.arc(x, y(v), 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = tinta; ctx.font = '17px system-ui, sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(v), x, y(v) - 12); ctx.textBaseline = 'top'; ctx.fillStyle = gris; ctx.fillText(s.labels[i].slice(0, 14), x, mT + ph + 12); });
    } else {
      const bw = Math.min(90, paso * 0.62);
      s.values.forEach((v, i) => { const x = mL + paso * (i + 0.5) - bw / 2; ctx.fillStyle = opciones.multicolor ? paleta[i % paleta.length] : acento; const top = y(Math.max(v, 0)), base = y(Math.min(v, 0)); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, top, bw, Math.max(2, base - top), 6) : ctx.rect(x, top, bw, Math.max(2, base - top)); ctx.fill(); ctx.fillStyle = tinta; ctx.font = '17px system-ui, sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(v), x + bw / 2, top - 8); ctx.textBaseline = 'top'; ctx.fillStyle = gris; ctx.fillText(s.labels[i].slice(0, 14), x + bw / 2, mT + ph + 12); });
    }
    ctx.textAlign = 'left'; ctx.fillStyle = gris; ctx.font = '15px system-ui, sans-serif'; ctx.fillText(String(opciones.pie || 'Research Academy · cifras calculadas sobre el archivo'), 48, H - 36);
    return canvas;
  }

  // ---------- Convertir ----------
  function pdfAWordBloques(textoPorPaginas) {
    const out = [];
    textoPorPaginas.forEach((t, i) => { out.push({ tipo: 'h2', texto: `Página ${i + 1}` }); for (const p of String(t).split(/\n{2,}|(?<=[.!?])\s{2,}/)) { const s = p.replace(/\s+/g, ' ').trim(); if (s) out.push({ tipo: 'p', texto: s }); } });
    return out;
  }
  function excelAPdf(jsPDF, hojas, titulo) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), m = 36;
    hojas.forEach((h, hi) => {
      if (hi) doc.addPage();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(`${titulo} · ${h.nombre}`, m, m);
      const cols = h.cabecera.slice(0, 12), cw = (W - 2 * m) / cols.length, lh = 16;
      let y = m + 24;
      const fila = (vals, negrita) => { doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(9); vals.forEach((v, i) => doc.text(String(v ?? '').slice(0, Math.floor(cw / 5)), m + i * cw + 3, y)); y += lh; if (y > H - m) { doc.addPage(); y = m; } };
      fila(cols, true);
      for (const f of h.filas.slice(0, 2000)) fila(cols.map((_, i) => (f[i] instanceof Date ? f[i].toISOString().slice(0, 10) : typeof f[i] === 'number' ? f[i].toLocaleString('es-PE') : f[i])), false);
    });
    return doc;
  }

  global.RA_extra = { num, txt, colIdx, crearExcel, bloquesMd, crearWord, comparar, libroComparacion, limpiar, mensajes, serie, dibujar, pdfAWordBloques, excelAPdf };
})(typeof window !== 'undefined' ? window : globalThis);
