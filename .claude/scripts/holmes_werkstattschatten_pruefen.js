// Prüft das Schattenbild der Werkstatt (welt/werkstattschatten.js) auf allen Flächen (Holmes, nur lokal, braucht
// window.__debug). Gebrauch: Inhalt in die Konsole bzw. javascript_tool einfügen; Ergebnis als JSON-Text.
// Je Fläche (ohne Rand): Bildpunkte, dunkelster Wert, Anteil im Schatten (< 0,9), Flecken (Punkt weicht um mehr
// als 0,1 vom Mittel seiner 4 Nachbarn ab), Kantensprung (mittlerer Unterschied äußerste ↔ zweite Reihe),
// Streifen (Zeilen- bzw. Spaltenmittel springen um mehr als 0,05 gegenüber beiden Nachbarn).
// Werte 0 … 1 (1 = frei). Liefert die auffälligsten Flächen zuerst.
(() => {
  const d = window.__debug;
  if (!d) throw new Error('__debug fehlt (nur auf 127.0.0.1)');
  const W = d.werkstattSchattenWerte;
  const bild = W.wsBild.value;
  const daten = W.wsDaten.value.image.data;
  const [bw, bh] = [W.wsBildGroesse.value.x, W.wsBildGroesse.value.y];
  const gl = d.renderer.getContext();
  // Schattenbild in ein RGBA8-Ziel kopieren und lesen (R8 lässt sich nicht überall direkt lesen)
  const vs = '#version 300 es\nin vec2 p; void main() { gl_Position = vec4( p, 0.0, 1.0 ); }';
  const fs = '#version 300 es\nprecision highp float; uniform sampler2D b; out vec4 f; void main() { f = vec4( texelFetch( b, ivec2( gl_FragCoord.xy ), 0 ).r ); }';
  const sh = (t, q) => { const s = gl.createShader(t); gl.shaderSource(s, q); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, bw, bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(prog);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, d.renderer.properties.get(bild).__webglTexture);
  gl.uniform1i(gl.getUniformLocation(prog, 'b'), 0);
  gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE);
  gl.viewport(0, 0, bw, bh);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const px = new Uint8Array(bw * bh * 4);
  gl.readPixels(0, 0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindVertexArray(null);
  [tex].forEach((t) => gl.deleteTexture(t));
  gl.deleteFramebuffer(fb); gl.deleteBuffer(buf); gl.deleteVertexArray(vao); gl.deleteProgram(prog);
  d.renderer.resetState();
  const wert = (x, y) => px[4 * (y * bw + x)] / 255;
  const n = daten.length / 12 - 1;
  const ergebnis = [];
  for (let id = 1; id <= n; id++) {
    const o = 12 * id;
    const lk = Array.from(daten.slice(o, o + 4));
    const x0 = Math.round(daten[o + 8] * bw);
    const y0 = Math.round(daten[o + 9] * bh);
    const w = Math.round(daten[o + 10] * bw);
    const h = Math.round(daten[o + 11] * bh);
    let min = 1, schatten = 0, flecken = 0;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const v = wert(x, y);
        min = Math.min(min, v);
        if (v < 0.9) schatten++;
        if (x > x0 && x < x0 + w - 1 && y > y0 && y < y0 + h - 1) {
          const m = (wert(x - 1, y) + wert(x + 1, y) + wert(x, y - 1) + wert(x, y + 1)) / 4;
          if (Math.abs(v - m) > 0.1) flecken++;
        }
      }
    }
    // Kantensprung: äußerste gegen zweite Reihe/Spalte
    let kante = 0, kn = 0;
    if (w > 2 && h > 2) {
      for (let x = x0; x < x0 + w; x++) { kante += Math.abs(wert(x, y0) - wert(x, y0 + 1)) + Math.abs(wert(x, y0 + h - 1) - wert(x, y0 + h - 2)); kn += 2; }
      for (let y = y0; y < y0 + h; y++) { kante += Math.abs(wert(x0, y) - wert(x0 + 1, y)) + Math.abs(wert(x0 + w - 1, y) - wert(x0 + w - 2, y)); kn += 2; }
    }
    // Streifen: Zeilen- und Spaltenmittel
    const zeilen = [], spalten = [];
    for (let y = y0; y < y0 + h; y++) { let s = 0; for (let x = x0; x < x0 + w; x++) s += wert(x, y); zeilen.push(s / w); }
    for (let x = x0; x < x0 + w; x++) { let s = 0; for (let y = y0; y < y0 + h; y++) s += wert(x, y); spalten.push(s / h); }
    const sprung = (a) => a.filter((v, i) => i > 0 && i < a.length - 1 && Math.abs(v - a[i - 1]) > 0.05 && Math.abs(v - a[i + 1]) > 0.05).length;
    const streifen = sprung(zeilen) + sprung(spalten);
    ergebnis.push({ id, lk, w, h, min: +min.toFixed(2), schatten: +(schatten / (w * h)).toFixed(3), flecken, kante: +(kn ? kante / kn : 0).toFixed(3), streifen });
  }
  const auffaellig = [...ergebnis].sort((a, b) => (b.flecken + 50 * b.streifen + 1000 * b.kante) - (a.flecken + 50 * a.streifen + 1000 * a.kante));
  return JSON.stringify({ flaechen: n, mitSchatten: ergebnis.filter((e) => e.schatten > 0).length,
    fleckenGesamt: ergebnis.reduce((s, e) => s + e.flecken, 0), streifenGesamt: ergebnis.reduce((s, e) => s + e.streifen, 0),
    kanteMax: Math.max(...ergebnis.map((e) => e.kante)), auffaellig: auffaellig.slice(0, 12) });
})();
