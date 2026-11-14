// Pickelhaube für Schutzleute: Glocke, Vorder- und Nackenschirm, Wappenplatte, Spitze.
//
// Belegt: Lederhelm mit Spitze und Messing-/Neusilberbeschlägen (DHM). Form, Maße und Sitz sind
// Gestaltung (stilisiert). Alle Maße werden an den Netzen des Kopfes gemessen (Haut, Haar, Bart),
// damit der Helm auch nach einem Umbau von `kopf()` richtig sitzt.
import * as THREE from 'three';
import { istSparsam } from './menschen.js';

const PI = Math.PI;
/** Teilungen voll / sparsam (Detailstufe, welt/stufen.js); gemessen wird immer am vollen Kopf */
const n = (/** @type {number} */ voll, /** @type {number} */ spar) => (istSparsam() ? spar : voll);
/** Schrittweite der Kopfmessung in Metern */
const SCHRITT = 0.005;

/**
 * Misst den Kopf: halbe Breite sowie vorderste und hinterste Lage (z) je Höhe y.
 * @param {THREE.Object3D} k Kopfgruppe (Netze direkt als Kinder, Ursprung = Kopfmitte)
 */
function messeKopf(k) {
  const netze = /** @type {THREE.Mesh[]} */ (k.children.filter((c) => /** @type {THREE.Mesh} */ (c).isMesh));
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const m of netze) {
    const p = m.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      yMin = Math.min(yMin, p.getY(i));
      yMax = Math.max(yMax, p.getY(i));
    }
  }
  const n = Math.round((yMax - yMin) / SCHRITT) + 1;
  const breit = new Float32Array(n);
  const vorn = new Float32Array(n).fill(-1);
  const hinten = new Float32Array(n).fill(1);
  const belegt = new Uint8Array(n);
  for (const m of netze) {
    const p = m.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const b = Math.round((p.getY(i) - yMin) / SCHRITT);
      breit[b] = Math.max(breit[b], Math.abs(p.getX(i)));
      vorn[b] = Math.max(vorn[b], p.getZ(i));
      hinten[b] = Math.min(hinten[b], p.getZ(i));
      belegt[b] = 1;
    }
  }
  // Lücken von den Nachbarn füllen, dann je Stufe das Maximum aus ±1 Stufe (sicherer Abstand)
  for (const feld of [breit, vorn, hinten]) {
    for (let i = 1; i < n; i++) if (!belegt[i] && belegt[i - 1]) feld[i] = feld[i - 1];
    for (let i = n - 2; i >= 0; i--) if (!belegt[i] && belegt[i + 1]) feld[i] = feld[i + 1];
  }
  const glatt = (/** @type {Float32Array} */ f, /** @type {number} */ vz) => f.map((_, i) => {
    const a = f[Math.max(0, i - 1)];
    const c = f[Math.min(n - 1, i + 1)];
    return vz > 0 ? Math.max(a, f[i], c) : Math.min(a, f[i], c);
  });
  const B = glatt(breit, 1);
  const V = glatt(vorn, 1);
  const H = glatt(hinten, -1);
  /** @param {number} y @returns {number[]} [halbe Breite, vorn, hinten] */
  const umfang = (y) => {
    const t = Math.max(0, Math.min(n - 1, (y - yMin) / SCHRITT));
    const i = Math.min(n - 2, Math.floor(t));
    const f = t - i;
    return [B[i] + (B[i + 1] - B[i]) * f, V[i] + (V[i + 1] - V[i]) * f, H[i] + (H[i + 1] - H[i]) * f];
  };
  return { yMin, yMax, umfang };
}

/**
 * Gitter aus Punktfunktion: Positionen, Normalen, leere UVs, Index (wie die Grundkörper von three.js,
 * damit es sich mit ihnen verschmelzen lässt).
 * @param {number} ns Segmente in s @param {number} nt Segmente in t
 * @param {(s: number, t: number) => number[]} punkt
 * @param {{ geschlossen?: boolean, umdrehen?: boolean }} [opt] geschlossen: s läuft rundum (letzte Spalte = erste)
 */
function gitter(ns, nt, punkt, { geschlossen = false, umdrehen = false } = {}) {
  const spalten = geschlossen ? ns : ns + 1;
  const pos = [];
  for (let j = 0; j <= nt; j++) for (let i = 0; i < spalten; i++) pos.push(...punkt(i / ns, j / nt));
  const idx = [];
  for (let j = 0; j < nt; j++) {
    for (let i = 0; i < ns; i++) {
      const a = j * spalten + i;
      const b = j * spalten + ((i + 1) % spalten);
      const c = a + spalten;
      const d = b + spalten;
      if (umdrehen) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Baut die Pickelhaube passend zum Kopf. Rückgabe: Gruppe in Kopfkoordinaten (Ursprung = Kopfmitte);
 * der Aufrufer setzt sie an die Lage des Kopfes.
 * Vorlage (Quellen-Notiz, Helm-Bilder 2026-11-14; Berliner Darstellungen Allers 1889, Gartenlaube 1891;
 * Berliner Helm 1898): kompakte Glocke mit runder Kuppel, kurzer steiler Vorderschirm und runder
 * Nackenschirm mit Metallrand (Vorderschirm endet über den Brauen), Spitze mit Lochkragen, Zwiebel und Knopf
 * auf einem Kreuzblatt mit Nieten, Nackenschiene, vorn königlicher Namenszug mit Krone (stilisiert),
 * Schuppenkette angelegt (unter dem Kinn), kleine Rosetten mit Haken, Kokarde rechts. Beschläge silbern.
 * @param {THREE.Object3D} k Kopfgruppe
 * @param {THREE.Material} leder Glocke, Schirme, schwarze Ringe der Kokarde
 * @param {THREE.Material} metall alle Beschläge
 * @param {THREE.Material} [haar] kurzes Nackenhaar unter dem Helm (ohne: keins)
 * @returns {THREE.Group}
 */
export function baueHelm(k, leder, metall, haar) {
  const kopf = messeKopf(k);
  const hoehe = kopf.yMax - kopf.yMin;
  const yTop = kopf.yMax + 0.028; // Glocke etwas höher als der Scheitel (Berliner Helm 1898: kompakt)
  const yStirn = kopf.yMax - 0.26 * hoehe; // Unterkante vorn: auf der Stirn (Schirm endet über den Brauen)
  const yNacken = kopf.yMax - 0.76 * hoehe; // Unterkante hinten: tief am Hinterkopf (Runde 5, PHS-Figur 1898)
  const ySchulter = kopf.yMax - 0.06; // bis hier steile Seiten, darüber die runde Kuppel
  // breiteste Stelle des Kopfes zwischen Unterkante und Kuppel: darüber werden die Seiten nicht enger
  let yBreit = ySchulter;
  for (let y = yNacken; y <= ySchulter; y += 0.005) if (kopf.umfang(y)[0] > kopf.umfang(yBreit)[0]) yBreit = y;
  const [bMax, vMax, hMax] = kopf.umfang(yBreit);

  /** Unterkante der Glocke über dem Winkel (0 = vorn, π = hinten) */
  const rand = (/** @type {number} */ th) => yStirn - (yStirn - yNacken) * ((1 - Math.cos(th)) / 2) ** 0.95; // Runde 5: seitlich tiefer (sitzt im Kopf statt darauf)

  /**
   * Punkt der Glocke: th rundum (0 = vorn, π/2 = links bei +x), u von oben (0) bis zur Unterkante (1);
   * aus = Abstand nach außen
   * @param {number} th @param {number} u @param {number} [aus]
   */
  const punkt = (th, u, aus = 0) => {
    const y = yTop - (yTop - rand(th)) * u;
    let [b, vo, hi] = kopf.umfang(Math.min(y, ySchulter));
    if (y > yBreit) {
      // fast senkrechte Seiten: oberhalb der breitesten Stelle nicht enger als dort (leicht eingezogen)
      const e = 1 - 0.07 * Math.min(1, (y - yBreit) / (ySchulter - yBreit + 1e-6));
      b = Math.max(b, bMax * e); vo = Math.max(vo, vMax * e); hi = Math.min(hi, hMax * e);
    }
    if (y > ySchulter) {
      // runde Kuppel bis zum Pol (die Spitze deckt die Mitte)
      const s = (y - ySchulter) / (yTop - ySchulter);
      const f = Math.sqrt(Math.max(0, 1 - s * s));
      b *= f; vo *= f; hi *= f;
    }
    // Abstand zum Kopf: Runde 4 (PHS-Figur 1898) breiter, der Helm wirkte klein auf dem Kopf
    const m = (0.016 + 0.005 * u ** 3) * (y > ySchulter ? 0.4 + 0.6 * (1 - (y - ySchulter) / (yTop - ySchulter)) : 1) + aus;
    const c = Math.cos(th);
    return [Math.sin(th) * (b + m), y, c >= 0 ? c * (vo + m) : -c * (hi - m)];
  };
  /** u einer Höhe y im Winkel th */
  const uBei = (/** @type {number} */ th, /** @type {number} */ y) => (yTop - y) / (yTop - rand(th));

  const glocke = gitter(n(28, 20), n(16, 11), (s, t) => punkt(2 * PI * s, t), { geschlossen: true });

  /**
   * Schirm: Streifen entlang der Unterkante, nach außen und unten geneigt; doppelt (oben und unten sichtbar)
   * @param {number} mitte Winkel der Mitte @param {number} halb halbe Breite (Bogenmaß)
   * @param {number} laenge größte Länge @param {number} neigung Abfall je Länge
   * @param {number} form Verlauf der Länge zur Seite: < 0,5 eckig, 1 rund, > 1 spitz
   * @param {boolean} unten Unterseite
   */
  const schirmPunkt = (/** @type {number} */ mitte, /** @type {number} */ halb, /** @type {number} */ laenge,
    /** @type {number} */ neigung, /** @type {number} */ form, /** @type {number} */ s, /** @type {number} */ t, unten = false) => {
    const phi = (2 * s - 1) * halb;
    const th = mitte + phi;
    const [x, y, z] = punkt(th, 1);
    const q = Math.abs(phi / halb);
    const l = laenge * (form > 1 ? Math.max(0, 1 - q) ** (form - 1) * Math.max(0, Math.cos(q * (PI / 2))) ** 0.5
      : Math.max(0, Math.cos(q * (PI / 2))) ** form) * t;
    const dx = Math.sin(th) * 0.55;
    const dz = Math.cos(th);
    const d = Math.hypot(dx, dz);
    // gewölbt: außen fällt der Schirm stärker ab
    return [x + (dx / d) * l, y - neigung * l * (1 + 0.6 * t) - (unten ? 0.0025 : 0), z + (dz / d) * l];
  };
  // Vorderschirm in beiden Stufen gleich fein: der Metallrand folgt genau seiner Kante (sonst stand er über)
  const SCHIRM_SPALTEN = 24;
  const schirm = (/** @type {number[]} */ p, /** @type {boolean} */ unten, /** @type {number} */ ns) =>
    gitter(ns, 3, (s, t) => schirmPunkt(p[0], p[1], p[2], p[3], p[4], s, t, unten), { umdrehen: unten });
  // Vorderschirm länger und steil abwärts, zur Seite eckig; Nackenschirm kurz und spitz
  // (steiler als bisher, aber nicht so tief wie am Original: die Augen bleiben aus Augenhöhe sichtbar)
  // Nutzer (Vergleich mit den Berliner Darstellungen 1889/91): Helm sitzt höher auf der Stirn, der
  // Schirm ist länger als zuvor und steil, endet aber über den Brauen (Augen frei)
  // Runde 3 (Vergleich Seitenansicht 1898): kürzer und steiler, Ecken runder
  const VORN = [0, 1.15, 0.042, 0.62, 0.55];
  // Nackenschirm nach der Berliner Seitenansicht 1898: steil, setzt die Glocke fast fort, rund statt spitz;
  // schmaler und kürzer, damit er von hinten nicht wie eine Klappe wirkt
  const HINTEN = [PI, 1.1, 0.034, 1.2, 1];
  const HINTEN_SPALTEN = 18;

  const helm = new THREE.Group();
  helm.add(new THREE.Mesh(glocke, leder));
  for (const unten of [false, true]) {
    helm.add(new THREE.Mesh(schirm(VORN, unten, SCHIRM_SPALTEN), leder));
    helm.add(new THREE.Mesh(schirm(HINTEN, unten, HINTEN_SPALTEN), leder));
  }
  // Metallrand an Vorder- und Nackenschirm (Seitenansicht 1898): genau durch die Eckpunkte der Schirmkante,
  // von Ansatz zu Ansatz (bündig); beide Schirme dafür in beiden Stufen gleich fein
  for (const [p, sp] of /** @type {[number[], number][]} */ ([[VORN, SCHIRM_SPALTEN], [HINTEN, HINTEN_SPALTEN]])) {
    const randWeg = new THREE.CurvePath();
    const randPunkt = (/** @type {number} */ i) =>
      new THREE.Vector3(...schirmPunkt(p[0], p[1], p[2], p[3], p[4], i / sp, 1, false)).add(new THREE.Vector3(0, -0.0012, 0));
    for (let i = 0; i < sp; i++) randWeg.add(new THREE.LineCurve3(randPunkt(i), randPunkt(i + 1)));
    helm.add(new THREE.Mesh(new THREE.TubeGeometry(/** @type {any} */ (randWeg), 2 * sp, 0.0024, 5), metall));
  }
  // kurzes Nackenhaar unter dem Helm (der Kopf hat dort keins, wirkte von der Seite kahl): dünne Schale
  // knapp über dem Hinterkopf von der Helmkante bis zum Ohrläppchen
  if (haar) {
    const yHaar = kopf.yMax - 0.86 * hoehe;
    const nacken = gitter(n(14, 8), n(5, 3), (s, t) => {
      const th = PI + (2 * s - 1) * 1.45;
      const y = rand(th) + 0.01 - (rand(th) + 0.01 - yHaar) * t;
      const [b, , hi] = kopf.umfang(y);
      const c = Math.cos(th);
      const si = Math.sin(th);
      // etwas eckiger als eine Ellipse (Kopf ist hinten breit), 2,5 mm über der Haut
      const f = (/** @type {number} */ q) => Math.sign(q) * Math.abs(q) ** 0.8;
      return [f(si) * (b + 0.0025), y, f(-c) * (hi - 0.0025)];
    });
    helm.add(new THREE.Mesh(nacken, haar));
  }

  // Vorn der königliche Namenszug „WR“ (Wilhelm Rex) unter der Krone (Nutzer; Deutung nach DHM-Helm um 1900,
  // Bild 03, und 1881/90, Bild 02: verschlungenes Schreibschrift-Monogramm; Allers 1889: Krone mit Schnörkeln).
  // Vorlage Gartenlaube 1891 (Bild 01, Entscheidung Claude nach „entscheide du“): Schreibschrift aus
  // Schwellbändern (Nutzer: „Schwellbänder“): flache, leicht gewölbte Metallbänder auf der Glocke, Abstriche
  // breit, Aufstriche und Schlaufen schmal wie mit der Feder; in beiden Stufen gleich (hell auf Schwarz,
  // Fleckprüfung).
  const BAND_DUENN = 0.0012; // halbe Breite im Haarstrich
  const BAND_DICK = 0.0052; // halbe Breite im Abstrich
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _s = new THREE.Vector3();
  /**
   * Schwellband entlang Punkten (th, u): Mittellinie als Kurve in (th, u), je Stelle Breite nach der
   * Richtung (abwärts breit), Querschnitt mit vier Punkten (Ränder flach auf dem Leder, Mitte gewölbt).
   * @param {number[][]} pkt
   * @param {number} [staerke=1] Faktor auf die Breiten
   */
  const schwellband = (pkt, staerke = 1) => {
    const kurve = new THREE.CatmullRomCurve3(pkt.map(([th, u]) => new THREE.Vector3(th, u, 0)));
    const anzahl = 10 * pkt.length;
    const tu = kurve.getPoints(anzahl);
    const quer = [-1, -0.45, 0.45, 1];
    const hoch = [0.0005, 0.0019, 0.0019, 0.0005];
    /** @type {number[]} */
    const pos = [];
    /** @type {number[]} */
    const idx = [];
    for (let i = 0; i <= anzahl; i++) {
      const p = tu[i];
      const vor = tu[Math.min(i + 1, anzahl)];
      const nach = tu[Math.max(i - 1, 0)];
      _a.set(...punkt(vor.x, vor.y, 0));
      _b.set(...punkt(nach.x, nach.y, 0));
      _t.subVectors(_a, _b).normalize();
      const mitte = punkt(p.x, p.y, 0);
      _n.set(...punkt(p.x, p.y, 0.01)).sub(_a.set(...mitte)).normalize();
      _s.crossVectors(_t, _n).normalize();
      // abwärts (−y) = Abstrich: breit; weich übergehend, an den Enden etwas schmaler
      const ab = THREE.MathUtils.smoothstep(-_t.y, -0.1, 0.85);
      const ende = Math.min(1, Math.min(i, anzahl - i) / 6);
      const w = (BAND_DUENN + (BAND_DICK - BAND_DUENN) * ab * (0.4 + 0.6 * ende)) * staerke;
      for (let j = 0; j < 4; j++) {
        pos.push(
          mitte[0] + _s.x * quer[j] * w + _n.x * hoch[j],
          mitte[1] + _s.y * quer[j] * w + _n.y * hoch[j],
          mitte[2] + _s.z * quer[j] * w + _n.z * hoch[j],
        );
      }
      if (i > 0) {
        const o = (i - 1) * 4;
        for (let j = 0; j < 3; j++) idx.push(o + j, o + j + 1, o + j + 4, o + j + 1, o + j + 5, o + j + 4);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    // uv nur, damit das Band mit den übrigen Metallteilen verschmolzen werden kann (gleiche Attribute)
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    helm.add(new THREE.Mesh(geo, metall));
  };
  /** Rohr entlang Punkten (th, u) auf der Glocke */
  const zug = (/** @type {number[][]} */ pkt, /** @type {number} */ r, aus = 0.0028) => {
    const weg = new THREE.CatmullRomCurve3(pkt.map(([th, u]) => new THREE.Vector3(...punkt(th, u, aus))));
    helm.add(new THREE.Mesh(new THREE.TubeGeometry(weg, 6 * pkt.length, r, 5), metall));
  };
  /** Monogramm-Fläche: X −1 … 1 quer, Y 0 (oben) … 1 (unten) → (th, u) */
  // Größe nach Gartenlaube 1891 (Bild 01) und Allers 1889 (Bild 02): groß, füllt die Front fast vom
  // Spitzenfuß bis zum Schirm und zieht sich weit zur Seite (u 0,36 … 0,86). Schreibschrift leicht nach
  // rechts geneigt (oben weiter rechts als unten)
  const mg = (/** @type {number[][]} */ pkt) => pkt.map(([x, y]) => [(x + (0.5 - y) * 0.22) * 0.72, 0.36 + y * 0.5]);
  // W und R in einem Zug wie Schreibschrift (Bild 01): W beginnt mit einer Schlaufe links, hohe Mittelspitze
  // (liest sich als W, nicht als V), der letzte Aufstrich läuft über einen Bogen in den R-Stamm, der Stamm endet
  // in einer Fußschlaufe
  schwellband(mg([[-0.7, 0.5], [-0.86, 0.42], [-0.98, 0.26], [-0.94, 0.08], [-0.82, 0.04], [-0.74, 0.14], [-0.7, 0.36],
    [-0.65, 0.66], [-0.6, 0.94], [-0.52, 0.7], [-0.42, 0.4], [-0.34, 0.16], [-0.3, 0.1], [-0.24, 0.2], [-0.16, 0.45],
    [-0.08, 0.72], [-0.02, 0.94], [0.06, 0.7], [0.14, 0.42], [0.22, 0.2], [0.3, 0.08], [0.4, 0.02], [0.5, 0.06],
    [0.52, 0.2], [0.52, 0.45], [0.5, 0.72], [0.46, 0.9], [0.38, 0.98], [0.3, 0.94], [0.34, 0.86], [0.42, 0.88]]));
  // R: Bauch oben, daraus das Bein mit großem Endschwung nach rechts unten, der sich einrollt
  schwellband(mg([[0.52, 0.16], [0.62, 0.04], [0.78, 0.0], [0.92, 0.08], [0.94, 0.22], [0.82, 0.34], [0.6, 0.4], [0.68, 0.48],
    [0.78, 0.64], [0.88, 0.84], [0.98, 0.96], [1.1, 0.98], [1.16, 0.88], [1.08, 0.82]]), 0.92);
  // Krone über dem Namenszug, direkt unter dem Spitzenfuß (Bild 02): Reif mit Perlen, drei Bügel,
  // Reichsapfel; etwas breiter (KB) passend zum großen Monogramm
  const KU = 0.285;
  const KB = 2.1;
  zug([[-0.15 * KB, KU + 0.045], [0, KU + 0.055], [0.15 * KB, KU + 0.045]], 0.0036);
  for (const sx of [-1, 0, 1]) zug([[sx * 0.14 * KB, KU + 0.045], [sx * 0.11 * KB, KU - 0.03], [sx * 0.03 * KB, KU - 0.07], [0, KU - 0.075]], 0.0024);
  for (const sx of [-1, -0.5, 0.5, 1]) {
    const perle = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 8, 6), metall);
    perle.position.set(...punkt(sx * 0.13 * KB, KU - 0.005, 0.0045));
    helm.add(perle);
  }
  const reichsapfel = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 6), metall);
  reichsapfel.position.set(...punkt(0, KU - 0.09, 0.005));
  helm.add(reichsapfel);

  // Nackenschiene: schmaler Streifen hinten von der Kuppel bis zur Unterkante
  const schiene = gitter(2, n(10, 6), (s, t) => punkt(PI + (2 * s - 1) * (0.03 + 0.04 * t), 0.2 + 0.8 * t, 0.0022));
  helm.add(new THREE.Mesh(schiene, metall));

  // Kreuzblatt: runder Fuß, vier Arme auf der Kuppel (vorn, hinten, seitlich), Nieten an den Enden
  const fuss = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.01, n(14, 8)), metall);
  fuss.position.y = yTop - 0.002;
  helm.add(fuss);
  // breite Arme wie an der Berliner Seitenansicht 1898: liegen als gebogene Streifen auf der Kuppel an
  // (gerade Körper standen an der gewölbten Kuppel ab), zum Ende hin schmaler mit runder Spitze;
  // in beiden Stufen gleich fein (hell auf Schwarz)
  for (const th of [0, PI / 2, PI, -PI / 2]) {
    const u1 = uBei(th, yTop - 0.004);
    // vorn kürzer: der Arm soll nicht in die Krone des Namenszugs reichen
    const u2 = th === 0 ? Math.min(uBei(th, yTop - 0.05), 0.17) : uBei(th, yTop - 0.05);
    const arm = gitter(4, 8, (s, t) => {
      const u = u1 + (u2 - u1) * t;
      const [x, , z] = punkt(th, u);
      const breit = 0.016 * (1 - 0.35 * t) * (t > 0.75 ? Math.sqrt(Math.max(0, 1 - ((t - 0.75) / 0.25) ** 2)) : 1);
      return punkt(th + (2 * s - 1) * (breit / Math.hypot(x, z)), u, 0.0022);
    });
    helm.add(new THREE.Mesh(arm, metall));
    const niete = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 8, 6), metall);
    niete.position.set(...punkt(th, u1 + (u2 - u1) * 0.62, 0.0035));
    helm.add(niete);
  }
  // Spitze nach der Berliner Seitenansicht 1898 (Nutzer: niedrig): Fuß mit Perlring, Kragen mit
  // Luftlöchern, darauf eine gerippte Zwiebel mit Hals und ein Knopf; etwa 0,5 × Glockenhöhe
  const profil = [[0.0, 0.0], [0.016, 0.0], [0.016, 0.003], [0.0105, 0.005], [0.0105, 0.019], [0.0125, 0.0205],
    [0.0175, 0.025], [0.0175, 0.028], [0.0155, 0.035], [0.011, 0.043], [0.0065, 0.049], [0.005, 0.054],
    [0.0062, 0.0565], [0.0062, 0.058], [0.0, 0.058]].map(([r, y]) => new THREE.Vector2(r, y));
  const spitze = new THREE.LatheGeometry(profil, 18);
  // acht Rippen an der Zwiebel (zum Hals hin auslaufend)
  const sp = spitze.getAttribute('position');
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i);
    if (y < 0.026 || y > 0.05) continue;
    const w = Math.atan2(sp.getX(i), sp.getZ(i));
    const f = 1 + 0.07 * Math.cos(8 * w) * Math.sin(((y - 0.026) / 0.024) * PI);
    sp.setXYZ(i, sp.getX(i) * f, y, sp.getZ(i) * f);
  }
  spitze.computeVertexNormals();
  const spitzeMesh = new THREE.Mesh(spitze, metall);
  spitzeMesh.position.y = yTop + 0.003;
  helm.add(spitzeMesh);
  // Perlring am Fuß und Luftlöcher im Kragen (dunkle Scheibchen); in beiden Stufen gleich (hell auf Schwarz)
  for (let i = 0; i < 14; i++) {
    const w = (2 * PI * i) / 14;
    const perle = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 6, 4), metall);
    perle.position.set(0.0118 * Math.sin(w), yTop + 0.003 + 0.0055, 0.0118 * Math.cos(w));
    helm.add(perle);
  }
  const zy = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 4; i++) {
    // je Seite ein Loch mittig (wie an der Seitenansicht; zwei je Seite wirkten wie Augen)
    const w = (PI / 2) * i;
    const loch = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.001, 8), leder);
    const nl = new THREE.Vector3(Math.sin(w), 0, Math.cos(w));
    loch.position.copy(nl).multiplyScalar(0.0108).setY(yTop + 0.003 + 0.0125);
    loch.quaternion.setFromUnitVectors(zy, nl);
    helm.add(loch);
  }
  const kugel = new THREE.Mesh(new THREE.SphereGeometry(0.0072, 10, 8), metall);
  kugel.position.y = yTop + 0.003 + 0.064;
  helm.add(kugel);

  // Schuppenkette angelegt (Nutzer; Gartenlaube 1891, Allers 1889): von der Rosette an der Wange vor dem Ohr
  // hinunter, am Kiefer entlang und unter dem Kinn herum. Flache Schuppen, dachziegelartig überlappend,
  // flach auf der Haut liegend. In beiden Stufen gleich (hell, Fleckprüfung).
  const yKette = (/** @type {number} */ th) => rand(th) + 0.012;
  const KETTE = 1.42; // Winkel der Rosetten
  const yK = kopf.yMin; // Kinn unten
  /** Punkt seitlich am Gesicht in Höhe y (Seite sx), etwas vor der breitesten Stelle (vor dem Ohr) */
  const wange = (/** @type {number} */ sx, /** @type {number} */ y, /** @type {number} */ vor, /** @type {number} */ quer) => {
    const [b, vo] = kopf.umfang(y);
    return new THREE.Vector3(sx * (b * quer + 0.005), y, vo * vor);
  };
  /** @type {THREE.Vector3[]} */
  const kettePkt = [];
  for (const sx of [1, -1]) {
    const th = sx * KETTE;
    const r = new THREE.Vector3(...punkt(th, uBei(th, yKette(th)), 0.004));
    const seite = [r, wange(sx, r.y - 0.03, 0.2, 0.86), wange(sx, -0.03, 0.32, 0.8), wange(sx, -0.065, 0.5, 0.76),
      new THREE.Vector3(sx * 0.03, yK + 0.008, kopf.umfang(yK + 0.015)[1] - 0.018)];
    // Reihenfolge: Rosette (+x) … Kinn … Rosette (−x)
    if (sx < 0) seite.reverse();
    kettePkt.push(...seite);
  }
  const kettenWeg = new THREE.CatmullRomCurve3(kettePkt);
  const laenge = kettenWeg.getLength();
  const anzahl = Math.round(laenge / 0.0062);
  const schuppeGeo = new THREE.SphereGeometry(1, 10, 6);
  const mitteK = new THREE.Vector3(0, -0.02, 0);
  const T = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  for (let i = 1; i < anzahl; i++) {
    const t = i / anzahl;
    const p = kettenWeg.getPointAt(t);
    kettenWeg.getTangentAt(t, T);
    // Normale: von der Mitte des Unterkopfs nach außen, senkrecht zur Kette
    N.copy(p).sub(mitteK).addScaledVector(T, -N.copy(p).sub(mitteK).dot(T)).normalize();
    B.crossVectors(T, N);
    const schuppe = new THREE.Mesh(schuppeGeo, metall);
    schuppe.scale.set(0.0009, 0.0068, 0.0058);
    schuppe.position.copy(p).addScaledVector(N, 0.0017);
    // x = Normale (flach), y = quer zur Kette, z = entlang der Kette; leicht gekippt (Dachziegel)
    schuppe.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(N, B, T))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.28));
    helm.add(schuppe);
  }
  // Lederband unter den Schuppen (dunkle Fugen zwischen den Schuppen statt einer hellen Kordel)
  helm.add(new THREE.Mesh(new THREE.TubeGeometry(kettenWeg, 40, 0.0042, 6), leder));
  // Rosetten, rechts (−x) darunter die preußische Kokarde (schwarz-weiß-schwarz)
  const y0 = new THREE.Vector3(0, 1, 0);
  for (const sx of [-1, 1]) {
    const th = sx * KETTE;
    const p = new THREE.Vector3(...punkt(th, uBei(th, yKette(th))));
    const nrm = new THREE.Vector3(Math.sin(th), 0, Math.cos(th)).normalize();
    const scheibe = (/** @type {number} */ r, /** @type {number} */ aus, /** @type {THREE.Material} */ mat) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.003, n(16, 8)), mat);
      m.position.copy(p).addScaledVector(nrm, aus);
      m.quaternion.setFromUnitVectors(y0, nrm);
      helm.add(m);
    };
    // Runde 3: kleiner (Seitenansicht 1898), Kokarde bleibt erkennbar
    if (sx < 0) {
      scheibe(0.017, 0.002, leder);
      scheibe(0.0138, 0.0035, metall);
      scheibe(0.0102, 0.005, leder);
    }
    scheibe(0.0082, sx < 0 ? 0.0065 : 0.004, metall);
    const knopf = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 8, 6), metall);
    knopf.position.copy(p).addScaledVector(nrm, sx < 0 ? 0.0085 : 0.006);
    helm.add(knopf);
    // Haken am Knopf, in den die Kette eingehängt ist
    const ha = p.clone().addScaledVector(nrm, sx < 0 ? 0.009 : 0.0065);
    const haken = new THREE.CatmullRomCurve3([ha, ha.clone().add(new THREE.Vector3(0, -0.006, 0)).addScaledVector(nrm, 0.002),
      ha.clone().add(new THREE.Vector3(0, -0.011, 0)).addScaledVector(nrm, -0.001)]);
    helm.add(new THREE.Mesh(new THREE.TubeGeometry(haken, 6, 0.0016, 5), metall));
  }
  return helm;
}
