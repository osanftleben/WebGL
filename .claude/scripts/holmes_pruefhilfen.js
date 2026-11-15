// Prüfhilfen für „Sherlock Holmes – Die Berliner Fälle“ (nur lokal, braucht window.__debug).
// Gebrauch: den ganzen Inhalt in die Browser-Konsole bzw. in javascript_tool einfügen; danach gibt es
// window.__pruef mit den Funktionen unten. Nichts davon wird im Browser gespeichert (Regel in CLAUDE.md):
// nach jedem Neuladen neu einfügen, Ergebnisse ins Protokoll schreiben.
//
//   await __pruef.messe()                     Draw-Calls / Dreiecke an den Rundgang-Blickpunkten
//   await __pruef.fps(3)                      Bildrate (Sekunden)
//   await __pruef.nah(x, z, zielX, zielZ, fov, dy)  Nahansicht: Blick von (x, z) auf (zielX, zielZ),
//                                             Sichtfeld fov (Grad), dy = Bildausschnitt nach unten (0…1)
//   __pruef.zurueck()                         Sichtfeld und Ausschnitt wieder normal
//   await __pruef.kranich('vorn')             Nahblick Kranich: 'vorn' | 'seitlich' | 'hinten' (danach zurueck())
//   await __pruef.blick(x, z, blick, neigung) Blickpunkt mit Neigung (positiv = nach oben, z. B. 0,6)
//   __pruef.einheitBei(x, z)                Nummern der Detailstufen-Einheiten nahe (x, z)
//   __pruef.fleck(nr, richtung)               Fleckprüfung einer Einheit (siehe unten)
//
// Fleckprüfung (Verfahren aus der LOD-Aufgabe, Verlauf „Teil 2 LOD“): Einheit allein (Kamera-Ebene 7),
// 1920 × 1080, Pixeldichte 1, Sichtfeld 70°, Kamera in Augenhöhe 1,65 m im Umschaltabstand der Einheit
// zum Umriss, 3 Richtungen (Vorderseite `richtung` ±0,6 rad, Weltwinkel: Blickrichtung zur Kamera =
// (sin, cos)). Volle und sparsame Stufe direkt nacheinander zeichnen, Bildpunkte vergleichen.
// „Kern“ = Bildpunkt, dessen ganze 3 × 3-Umgebung in einem Kanal > 24 Stufen abweicht. Abnahme: 0 Kerne.
(() => {
  const d = window.__debug;
  if (!d) throw new Error('__debug fehlt (nur auf 127.0.0.1)');
  const warte = (ms) => new Promise((r) => setTimeout(r, ms));
  const V = d.camera.position.constructor;
  const Kamera = d.camera.constructor;
  const PI = Math.PI;

  /** Rundgang-Blickpunkte (Projektnotiz) */
  const RUNDGANG = [
    ['A gesamt', 1.1, 0.5, PI + 0.45], ['A Fensterwand', 5.5, 4.75, -PI / 2], ['A Hofwand', 6.0, 3.0, PI / 2 + 0.3],
    ['Büsten nah', 2.6, 6.2, 0.95], ['Gruppe nah', 4.6, 16.6, PI / 2], ['Kopfschrank nah', 2.6, 12.1, PI / 2],
    ['Ecke A|B', 7.6, 8.0, -3 * PI / 4 - 0.15], ['Fensterecke A', 7.0, 1.6, -1.25], ['B Kranich', 5.3, 12.8, PI],
    ['B schräg', 2.5, 11.0, PI + 0.6], ['Werkstatt', 2.0, 20.5, PI + 0.5], ['Schräge Wand', 5.6, 23.6, -3 * PI / 4 + 0.1],
  ];

  async function messe(punkte = RUNDGANG) {
    const aus = [];
    for (const [name, x, z, b] of punkte) {
      d.steuerung.setzePosition(x, z, b);
      await warte(2000);
      const i = d.renderer.info.render;
      aus.push([name, i.calls, i.triangles]);
    }
    return { fenster: [innerWidth, innerHeight], pixeldichte: d.renderer.getPixelRatio(), werte: aus };
  }

  async function nah(x, z, zx, zz, fov = 40, dy = 0) {
    d.steuerung.setzePosition(x, z, Math.atan2(-(zx - x), -(zz - z)));
    const c = d.camera;
    c.fov = fov;
    if (dy) c.setViewOffset(1000, 1000, 0, dy * 1000, 1000, 1000);
    else c.clearViewOffset();
    c.updateProjectionMatrix();
    await warte(1200);
  }

  function zurueck() {
    const c = d.camera;
    c.fov = FOV0;
    c.clearViewOffset();
    c.updateProjectionMatrix();
  }
  const FOV0 = d.camera.fov;

  function einheitBei(x, z, r = 0.6) {
    const m = new V();
    return d.stufen.werte.einheiten.map((e, i) => [i, e.box.getCenter(m).clone(), e.abstand])
      .filter(([, c]) => Math.hypot(c.x - x, c.z - z) < r)
      .map(([i, c, a]) => ({ nr: i, mitte: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), abstand: a }));
  }

  /** Bild der Einheit (nur Ebene 7) in 1920 × 1080 zeichnen und auslesen */
  function bild(cam, W, H) {
    const r = d.renderer;
    r.render(d.scene, cam);
    const gl = r.getContext();
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  }

  function fleck(nr, richtung, { winkel = [-0.6, 0, 0.6], grenze = 24, augen = 1.65 } = {}) {
    const e = d.stufen.werte.einheiten[nr];
    const W = 1920;
    const H = 1080;
    const r = d.renderer;
    const groesse = r.getSize(new V());
    const dichte = r.getPixelRatio();
    const mitte = e.box.getCenter(new V());
    // Ebene 7: nur die Einheit und die Lichter
    const ebene = (o, an) => (an ? o.layers.enable(7) : o.layers.disable(7));
    e.huelle.traverse((o) => ebene(o, true));
    d.scene.traverse((o) => { if (o.isLight) ebene(o, true); });
    const cam = new Kamera(70, W / H, 0.05, 100);
    cam.layers.set(7);
    const vorher = [e.voll.visible, e.spar.visible];
    const ergebnis = [];
    try {
      r.setPixelRatio(1);
      r.setSize(W, H, false);
      for (const w of winkel) {
        const a = richtung + w;
        const dir = new V(Math.sin(a), 0, Math.cos(a));
        // Abstand zum Umriss = Umschaltabstand (Bisektion entlang der Richtung)
        let lo = 0;
        let hi = 20;
        const p = new V();
        for (let k = 0; k < 40; k++) {
          const m = (lo + hi) / 2;
          p.copy(mitte).addScaledVector(dir, m).setY(augen);
          if (e.box.distanceToPoint(p) < e.abstand) lo = m;
          else hi = m;
        }
        cam.position.copy(p);
        cam.lookAt(mitte);
        cam.updateMatrixWorld();
        e.voll.visible = true;
        e.spar.visible = false;
        const a1 = bild(cam, W, H);
        e.voll.visible = false;
        e.spar.visible = true;
        const a2 = bild(cam, W, H);
        // Abweichung je Bildpunkt (größter Kanal), Figurpunkte = in einem der Bilder nicht Hintergrund
        const ab = new Uint8Array(W * H);
        let figur = 0;
        let ueber = 0;
        const hg = [a1[0], a1[1], a1[2]];
        for (let i = 0; i < W * H; i++) {
          const j = 4 * i;
          const dm = Math.max(Math.abs(a1[j] - a2[j]), Math.abs(a1[j + 1] - a2[j + 1]), Math.abs(a1[j + 2] - a2[j + 2]));
          if (dm > grenze) { ab[i] = 1; ueber++; }
          if (a1[j] !== hg[0] || a1[j + 1] !== hg[1] || a1[j + 2] !== hg[2]) figur++;
        }
        let kerne = 0;
        const orte = [];
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            let alle = true;
            for (let dy = -1; dy <= 1 && alle; dy++) for (let dx = -1; dx <= 1 && alle; dx++) alle = ab[(y + dy) * W + x + dx] === 1;
            if (alle) { kerne++; if (orte.length < 5) orte.push([x, H - 1 - y]); }
          }
        }
        ergebnis.push({ winkel: w, kamera: [p.x, p.z].map((v) => +v.toFixed(2)), figurpunkte: figur, ueber24: ueber, kerne, orte });
      }
    } finally {
      e.voll.visible = vorher[0];
      e.spar.visible = vorher[1];
      e.huelle.traverse((o) => ebene(o, false));
      d.scene.traverse((o) => { if (o.isLight) ebene(o, false); });
      r.setPixelRatio(dichte);
      r.setSize(groesse.x, groesse.y, false);
    }
    return { nr, abstand: e.abstand, ergebnis };
  }

  /** Nahblicke auf Schutzmann Kranich (5,3 | 15,6, Blick −z), Abnahme „Kranich neu“: ganze Figur im Bild */
  // hinten: (3,6 | 17,8) wurde von einem Hindernis auf x 4,4 geschoben → (5,9 | 17,5)
  const KRANICH_NAH = { vorn: [5.3, 12.6], seitlich: [8.2, 15.6], hinten: [5.9, 17.5] };
  async function kranich(name = 'vorn') {
    const [x, z] = KRANICH_NAH[name];
    await nah(x, z, 5.3, 15.6, 50, 0.22);
  }

  /**
   * Blick mit Neigung (für Decke/Gesims): Neigung in Bogenmaß, positiv = nach oben.
   * Die Steuerung setzt die Neigung jedes Bild neu; daher wird ihr aktualisiere() einmalig umhüllt.
   * Neigung bleibt, bis blick(…, 0) oder setzePosition aufgerufen wird.
   */
  let neigung = 0;
  if (!d.steuerung.__neigungUmhuellt) {
    const orig = d.steuerung.aktualisiere.bind(d.steuerung);
    d.steuerung.aktualisiere = (dt) => { orig(dt); if (neigung) d.camera.rotation.x = neigung; };
    d.steuerung.__neigungUmhuellt = true;
  }
  async function blick(x, z, b, n = 0) {
    d.steuerung.setzePosition(x, z, b);
    neigung = n;
    await warte(1200);
  }

  window.__pruef = { messe, fps: (s = 3) => d.messeFps(s), nah, zurueck, einheitBei, fleck, kranich, blick, RUNDGANG, KRANICH_NAH };
  return 'Prüfhilfen bereit: ' + Object.keys(window.__pruef).join(', ');
})();
