// Messhilfe Fensterlaibungen (Holmes, nur lokal, braucht window.__debug): in javascript_tool einfügen.
// Legt window.__fm an:
//   __fm.messe()   misst das aktuelle Bild im linearen Licht (vor der ACES-Farbkurve):
//                  zeichnet die Szene in ein Gleitkomma-Ziel (ohne Farbkurve), dazu Weltlage und Normale
//                  je Bildpunkt; ordnet die Punkte Laibung (nach Tiefe), Fensterbank, Sturz, Rahmen,
//                  Fensterwand, Raum, Fassade, Himmel zu.
// Werte: „vorAces“ = Belichtung · Leuchtdichte (Rec. 709), also der Wert, den ACES bekommt.
// Der Himmel (MeshBasic, toneMapped: false) läuft nicht durch ACES; sein „vorAces“ ist der Wert, den eine
// Fläche vor ACES haben müsste, um gleich hell zu erscheinen (ACES umgekehrt). So sind alle Werte vergleichbar.
// „bild“ = Bildwert 0–255 (sRGB) nach ACES zum Median, zum Abgleich mit Bildschirmfotos.
// Nichts wird im Browser gespeichert; Ergebnisse ins Protokoll.
(() => {
  const d = window.__debug;
  if (!d) throw new Error('__debug fehlt (nur auf 127.0.0.1)');
  const { renderer, scene, camera } = d;
  // three.js vorher bereitlegen: window.__THREE = await import('three')
  const THREE = /** @type {any} */ (window).__THREE || null;

  // ACES wie three.js (ACESFilmicToneMapping), für Grau: y = f(x / 0,6)
  const fit = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  const aces = (x) => Math.min(1, Math.max(0, fit(x / 0.6)));
  const acesUmgekehrt = (y) => {
    let lo = 0, hi = 1000;
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (aces(m) < y) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const srgb = (l) => Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055));

  async function messe({ breite = 480 } = {}) {
    // three aus einem vorhandenen Objekt holen (kein Import nötig)
    const T = THREE || (await import('three'));
    const W = breite, H = Math.round(breite / camera.aspect);
    const ziel = new T.WebGLRenderTarget(W, H, { type: T.FloatType, depthBuffer: true });
    const lese = () => { const a = new Float32Array(W * H * 4); renderer.readRenderTargetPixels(ziel, 0, 0, W, H, a); return a; };
    const alt = renderer.getRenderTarget();
    // 1) Bild, linear, ohne Farbkurve (in Render-Ziele zeichnet three.js ohne Tonemapping)
    renderer.setRenderTarget(ziel);
    renderer.render(scene, camera);
    const farbe = lese();
    // 2)+3) Weltlage und Weltnormale; durchsichtige Teile (Scheiben, Glas) ausblenden
    const versteckt = [];
    scene.traverse((o) => {
      if (o.isMesh && o.visible && o.material && (o.material.transparent || o.material.blending === T.AdditiveBlending)) { o.visible = false; versteckt.push(o); }
    });
    const vert = 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }';
    const matLage = new T.ShaderMaterial({ vertexShader: vert, fragmentShader: 'varying vec3 vW; varying vec3 vN; void main(){ gl_FragColor = vec4(vW, 1.0); }', side: T.DoubleSide });
    const matNorm = new T.ShaderMaterial({ vertexShader: vert, fragmentShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec3 n = normalize(vN); gl_FragColor = vec4(gl_FrontFacing ? n : -n, 1.0); }', side: T.DoubleSide });
    const hg = scene.background;
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    scene.overrideMaterial = matLage; renderer.render(scene, camera); const lage = lese();
    scene.overrideMaterial = matNorm; renderer.render(scene, camera); const norm = lese();
    scene.overrideMaterial = null;
    scene.background = hg;
    versteckt.forEach((o) => (o.visible = true));
    renderer.setRenderTarget(alt);
    ziel.dispose(); matLage.dispose(); matNorm.dispose();

    const exp = renderer.toneMappingExposure;
    const fenster = d.etage.lichtFenster;
    /** @type {Record<string, number[]>} */
    const gruppen = {};
    const dazu = (k, v) => (gruppen[k] ||= []).push(v);
    const cp = camera.position;
    for (let i = 0; i < W * H; i++) {
      const j = i * 4;
      if (lage[j + 3] === 0) continue;
      const x = lage[j], y = lage[j + 1], z = lage[j + 2];
      const nx = norm[j], ny = norm[j + 1], nz = norm[j + 2];
      const Y = 0.2126 * farbe[j] + 0.7152 * farbe[j + 1] + 0.0722 * farbe[j + 2];
      const ab = Math.hypot(x - cp.x, y - cp.y, z - cp.z);
      if (ab > 50) { dazu('himmel', acesUmgekehrt(Y)); continue; }
      if (x > 9.55 || z > 28.05) { dazu('fassade', acesUmgekehrt(Y)); continue; }
      const v = exp * Y;
      // Fensteröffnung: Tiefe t ab der Innenseite der Wand (0 = innen, 0,5 = Außenebene)
      let t = -1, quer = 0, nQ = 0, nT = 0, nH = ny;
      for (const f of fenster) {
        const innen = f.ebene - 0.5;
        const p = f.achse === 'x' ? x : z;
        const a = f.achse === 'x' ? z : x;
        if (p > innen - 0.03 && p < f.ebene + 0.02 && a > f.min[0] - 0.08 && a < f.max[0] + 0.08 && y > f.min[1] - 0.06 && y < f.max[1] + 0.06) {
          t = p - innen; nT = f.achse === 'x' ? nx : nz; nQ = f.achse === 'x' ? nz : nx; quer = a; break;
        }
      }
      if (t >= 0) {
        // Tiefe in 8-cm-Stufen ab der Wandinnenseite (24–32 cm = am Rahmen)
        const tn = ['0–8', '8–16', '16–24', '24–32'][Math.min(3, Math.max(0, Math.floor(t / 0.08)))] + ' cm';
        if (nH > 0.7) dazu('bank ' + tn, v);
        else if (nH < -0.7) dazu('sturz ' + tn, v);
        else if (Math.abs(nQ) > 0.7) dazu('laibung ' + tn, v);
        else if (nT < -0.7 && t > 0.25) dazu('rahmen', v);
        else if (nT < -0.7) dazu('wand an der Öffnung', v);
        continue;
      }
      const amFenster = fenster.some((f) => {
        const p = f.achse === 'x' ? x : z, a = f.achse === 'x' ? z : x;
        return Math.abs(p - (f.ebene - 0.5)) < 0.03 && a > f.min[0] - 0.6 && a < f.max[0] + 0.6;
      });
      if (amFenster && (Math.abs(nx) > 0.7 || Math.abs(nz) > 0.7)) dazu('fensterwand ≤ 60 cm neben Öffnung', v);
      else dazu('raum', v);
    }
    const erg = {};
    for (const [k, a] of Object.entries(gruppen)) {
      if (a.length < 5) continue;
      a.sort((p, q) => p - q);
      const q = (s) => a[Math.min(a.length - 1, Math.floor(s * a.length))];
      erg[k] = { n: a.length, median: +q(0.5).toFixed(3), p90: +q(0.9).toFixed(3), max: +a[a.length - 1].toFixed(3), bild: srgb(aces(q(0.5))) };
    }
    // Bezug: sichtbarer Himmel; ist keiner im Bild, der gemalte Himmel mit Bildwert 232
    const himmel = erg.himmel ? erg.himmel.median : acesUmgekehrt(Math.pow((232 / 255 + 0.055) / 1.055, 2.4));
    for (const k of Object.keys(erg)) erg[k].zuHimmel = +(erg[k].median / himmel).toFixed(2);
    return { belichtung: +exp.toFixed(3), himmelBezug: +himmel.toFixed(3), ...erg };
  }
  window.__fm = { messe, aces, acesUmgekehrt };
  return 'Messhilfe bereit: __fm.messe()';
})();
