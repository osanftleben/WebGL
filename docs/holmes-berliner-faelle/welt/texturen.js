// Selbst erzeugte Texturen (Canvas) – keine Bilddateien, keine fremden Quellen.
import * as THREE from 'three';

/**
 * Einfacher, wiederholbarer Zufallsgenerator (gleiches Muster bei jedem Laden).
 * @param {number} saat
 * @returns {() => number} Zahlen von 0 bis < 1
 */
export function zufall(saat) {
  let s = saat % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * @param {number} breite
 * @param {number} hoehe
 */
function leinwand(breite, hoehe) {
  const canvas = document.createElement('canvas');
  canvas.width = breite;
  canvas.height = hoehe;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  return { canvas, ctx };
}

/** @param {HTMLCanvasElement} canvas */
function alsTextur(canvas) {
  const textur = new THREE.CanvasTexture(canvas);
  textur.wrapS = THREE.RepeatWrapping;
  textur.wrapT = THREE.RepeatWrapping;
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.anisotropy = 4;
  return textur;
}

/**
 * Dielenboden: 8 Bretter je Kachel. Eine Kachel = 1,6 m × 1,6 m (Brett 20 cm breit).
 * @returns {THREE.CanvasTexture}
 */
export function dielenTextur() {
  const { canvas, ctx } = leinwand(512, 512);
  const z = zufall(7);
  const brett = 64;
  for (let i = 0; i < 8; i++) {
    const ton = 0.85 + z() * 0.25;
    ctx.fillStyle = `rgb(${Math.round(118 * ton)},${Math.round(84 * ton)},${Math.round(54 * ton)})`;
    ctx.fillRect(0, i * brett, 512, brett);
    // Maserung
    for (let m = 0; m < 14; m++) {
      ctx.strokeStyle = `rgba(60,38,20,${0.08 + z() * 0.12})`;
      ctx.lineWidth = 1 + z() * 1.5;
      const y = i * brett + 4 + z() * (brett - 8);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + m) * 2 * z());
      ctx.stroke();
    }
    // Fuge und Stoß
    ctx.fillStyle = 'rgba(30,20,12,0.85)';
    ctx.fillRect(0, i * brett, 512, 2);
    const stoss = Math.floor(z() * 512);
    ctx.fillRect(stoss, i * brett, 2, brett);
  }
  return alsTextur(canvas);
}

/**
 * Putz mit leichter Unregelmäßigkeit. Eine Kachel = 2 m × 2 m.
 * @param {string} farbe CSS-Farbe des Anstrichs
 * @param {number} [saat=3]
 * @returns {THREE.CanvasTexture}
 */
export function putzTextur(farbe, saat = 3) {
  const { canvas, ctx } = leinwand(256, 256);
  const z = zufall(saat);
  ctx.fillStyle = farbe;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    const hell = z() < 0.5;
    ctx.fillStyle = hell ? `rgba(255,255,255,${z() * 0.05})` : `rgba(0,0,0,${z() * 0.06})`;
    const r = 1 + z() * 4;
    ctx.fillRect(z() * 256, z() * 256, r, r);
  }
  return alsTextur(canvas);
}

/**
 * Holz für Möbel (Maserung längs). Eine Kachel = 1 m × 1 m.
 * @param {[number, number, number]} rgb Grundfarbe
 * @param {number} [saat=11]
 * @returns {THREE.CanvasTexture}
 */
export function holzTextur(rgb, saat = 11) {
  const { canvas, ctx } = leinwand(256, 256);
  const z = zufall(saat);
  ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  ctx.fillRect(0, 0, 256, 256);
  for (let m = 0; m < 40; m++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.05 + z() * 0.1})`;
    ctx.lineWidth = 0.5 + z() * 1.5;
    const y = z() * 256;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + m) * 1.5);
    ctx.stroke();
  }
  return alsTextur(canvas);
}

/**
 * Rippenheizkörper (senkrechte Rippen). Eine Kachel = 1 m breit, volle Höhe.
 * @returns {THREE.CanvasTexture}
 */
export function heizkoerperTextur() {
  const { canvas, ctx } = leinwand(128, 64);
  ctx.fillStyle = '#6f6a62';
  ctx.fillRect(0, 0, 128, 64);
  for (let x = 0; x < 128; x += 8) {
    ctx.fillStyle = '#8c867c';
    ctx.fillRect(x + 1, 0, 4, 64);
    ctx.fillStyle = '#4a463f';
    ctx.fillRect(x + 6, 0, 2, 64);
  }
  return alsTextur(canvas);
}

/**
 * Glasscheibe: ganz leicht grünlich getönte Fläche, zur Kante hin etwas kräftiger
 * (durch die Kante blickt man durch mehr Glas). Spiegelungen kommen aus der Spiegelschicht.
 * Der Alphakanal bestimmt, wie stark die Scheibe sichtbar ist.
 * @returns {THREE.CanvasTexture}
 */
export function glasTextur() {
  const { canvas, ctx } = leinwand(256, 256);
  ctx.fillStyle = 'rgba(205,228,218,0.09)';
  ctx.fillRect(0, 0, 256, 256);
  // Kante: nach außen kräftiger grünlich
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(150,190,172,${0.12 + i * 0.1})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(7 - i * 2, 7 - i * 2, 242 + i * 4, 242 + i * 4);
  }
  const textur = new THREE.CanvasTexture(canvas);
  textur.colorSpace = THREE.SRGBColorSpace;
  return textur;
}

/** Raster des Nummern-Atlas: 8 × 8 Felder für die Nummern 1 … 64 */
export const NUMMERN_RASTER = 8;

/**
 * Atlas mit nummerierten Tafeln (cremefarbener Grund, schwarzer Rand, Nummer in Serifenschrift
 * des Systems – keine Schriftdatei). Feld k (0-basiert) enthält die Nummer k + 1.
 * @returns {THREE.CanvasTexture}
 */
export function nummernAtlas() {
  const feld = 64;
  const { canvas, ctx } = leinwand(feld * NUMMERN_RASTER, feld * NUMMERN_RASTER);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < NUMMERN_RASTER * NUMMERN_RASTER; k++) {
    const x = (k % NUMMERN_RASTER) * feld;
    const y = Math.floor(k / NUMMERN_RASTER) * feld;
    ctx.fillStyle = '#efe8d6';
    ctx.fillRect(x, y, feld, feld);
    ctx.strokeStyle = '#2a241c';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 8, feld - 8, feld - 16);
    ctx.fillStyle = '#1e1a14';
    ctx.font = 'bold 28px serif';
    ctx.fillText(String(k + 1), x + feld / 2, y + feld / 2 + 1);
  }
  const textur = alsTextur(canvas);
  textur.wrapS = THREE.ClampToEdgeWrapping;
  textur.wrapT = THREE.ClampToEdgeWrapping;
  return textur;
}

/**
 * Skaliert die UV-Koordinaten einer Geometrie, damit eine Textur in Metern gekachelt wird.
 * @param {THREE.BufferGeometry} geometrie
 * @param {number} su Faktor für u
 * @param {number} sv Faktor für v
 * @returns {THREE.BufferGeometry} dieselbe Geometrie
 */
export function skaliereUV(geometrie, su, sv) {
  const uv = /** @type {THREE.BufferAttribute} */ (geometrie.getAttribute('uv'));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geometrie;
}

// ---------- Gesichtstafel (Feinschliff C) ----------

/**
 * Aufteilung der Gesichtstafel: 4 × 4 Zellen zu 256 Bildpunkten. Zellen 0–11: Wachsgesichter,
 * 12: Leiche (blass, Augen geschlossen), 13: Schutzmann Kranich (lebendige Haut), 14–15 frei.
 * Innerhalb einer Zelle: u = 0,5 + 0,5·U (U = Sinus des Winkels um den Kopf, vorn 0), v = 0,5 + 0,5·D
 * (D = Höhe auf der Kopfkugel, oben 1). Der Rand der Zelle ist einfarbige Haut (für Hals, Hände, Hinterkopf).
 */
export const GESICHT = { breite: 1024, hoehe: 1024, zelle: 256, rand: 4, spalten: 4, leiche: 12, kranich: 13, wachsZellen: 12 };

/**
 * Texturkoordinaten eines Punkts (u, v ∈ [0, 1]) in einer Zelle der Gesichtstafel.
 * @param {number} zelle @param {number} u @param {number} v
 * @returns {[number, number]}
 */
export function zellenUV(zelle, u, v) {
  const { breite, hoehe, zelle: gr, rand, spalten } = GESICHT;
  const x = (zelle % spalten) * gr + rand + u * (gr - 2 * rand);
  const y = Math.floor(zelle / spalten) * gr + rand + (1 - v) * (gr - 2 * rand);
  return [x / breite, 1 - y / hoehe];
}

/**
 * @typedef {{ grund: number[], auge?: string, braue: string, brauDicke: number, lippe: number[], roete: number,
 *   bart: number, alter?: number, falte?: boolean, geschlossen?: boolean, ringe?: number,
 *   augAbst?: number, augGr?: number, brauWinkel?: number, mund?: number, mal?: number[] | null }} Gesicht
 * grund: Hautton (sRGB); auge: Irisfarbe; braue: Farbe, brauDicke: Stärke; lippe: Lippenfarbe; roete: Wangenröte;
 * bart: Bartschatten; alter: Falten; falte: Zornesfalte; geschlossen: Augen zu; ringe: Augenringe;
 * augAbst: Augenmitte (U), augGr: Augengröße, brauWinkel: Neigung der Brauen außen, mund: Mundbreite, mal: Muttermal [U, D]
 */

const AUGEN = ['#4d6d8c', '#5a3d26', '#6c767c', '#3b2b1f', '#56718b', '#6e5e3e', '#4a5a4c'];
const BRAUEN = ['#4a3626', '#2a1d14', '#2e2218', '#3e2e22', '#5a4030', '#33261c', '#4a3a2c'];

/**
 * Zwölf erfundene Wachsgesichter (keine echten Personen), Merkmale aus fester Zufallsfolge.
 * @returns {Gesicht[]}
 */
function wachsGesichter() {
  const z = zufall(4711);
  return Array.from({ length: 12 }, (_, k) => {
    const t = (z() - 0.5) * 16;
    const alt = k % 4 === 2 || k === 7;
    return {
      grund: [214 + t, 178 + t * 0.9, 148 + t * 0.8].map(Math.round),
      auge: AUGEN[k % AUGEN.length],
      braue: alt ? '#7c7468' : BRAUEN[(k * 3) % BRAUEN.length],
      brauDicke: 1.1 + z() * 1.0,
      brauWinkel: (z() - 0.45) * 0.07,
      lippe: [160 + Math.round(z() * 16), 112 + Math.round(z() * 14), 98 + Math.round(z() * 14)],
      roete: z() * 0.1,
      bart: 0.14 + z() * 0.26,
      alter: alt ? 1 : 0,
      falte: z() < 0.35,
      augAbst: 0.38 + z() * 0.06,
      augGr: 0.88 + z() * 0.22,
      mund: 0.85 + z() * 0.3,
      mal: z() < 0.3 ? [(z() < 0.5 ? -1 : 1) * (0.3 + z() * 0.3), -0.1 - z() * 0.5] : null,
    };
  });
}

/** @type {Gesicht[]} */
const GESICHTER = [
  ...wachsGesichter(),
  { grund: [205, 196, 182], braue: '#4e4236', brauDicke: 1.5, lippe: [146, 128, 126], roete: 0, bart: 0.26, geschlossen: true, ringe: 0.32 },
  { grund: [214, 172, 146], auge: '#4c6c90', braue: '#4a3524', brauDicke: 1.6, lippe: [172, 118, 102], roete: 0.16, bart: 0.24 },
];

/**
 * Ob das Gesicht einer Zelle älter gemalt ist (dann passt graues oder weißes Haar).
 * @param {number} zelle
 */
export function gesichtIstAlt(zelle) {
  return Boolean(GESICHTER[zelle]?.alter);
}

/** @type {THREE.CanvasTexture | null} einmal gemalte Gesichtstafel (wird geteilt) */
let tafel = null;

/**
 * Gesichtstafel (wird nur einmal gemalt und dann geteilt).
 * @returns {THREE.CanvasTexture}
 */
export function gesichtsTafel() {
  if (!tafel) tafel = maleGesichtsTafel();
  return tafel;
}

/**
 * Malt die Gesichtstafel: je Zelle Hautgrund, Augen, Brauen, Nase, Lippen, Wangenröte, Bartschatten.
 * @returns {THREE.CanvasTexture}
 */
function maleGesichtsTafel() {
  const { breite, hoehe, zelle: gr, rand, spalten } = GESICHT;
  const { canvas, ctx } = leinwand(breite, hoehe);
  const innen = gr - 2 * rand;
  GESICHTER.forEach((f, k) => {
    const x0 = (k % spalten) * gr;
    const y0 = Math.floor(k / spalten) * gr;
    /** Bildpunkt zu (U, D) der Zelle */
    const P = (/** @type {number} */ U, /** @type {number} */ D) => /** @type {[number, number]} */ ([x0 + rand + (0.5 + 0.5 * U) * innen, y0 + rand + (0.5 - 0.5 * D) * innen]);
    const z = zufall(k * 131 + 17);
    const [r, g, b] = f.grund;
    const rgba = (/** @type {number[]} */ c, /** @type {number} */ a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, gr, gr);
    ctx.clip();
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x0, y0, gr, gr);
    // Leichte Flecken in der Haut
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = z() < 0.5 ? `rgba(255,240,230,${z() * 0.05})` : `rgba(120,70,50,${z() * 0.05})`;
      const s = 1 + z() * 3;
      ctx.fillRect(x0 + z() * gr, y0 + z() * gr, s, s);
    }
    /** weicher runder Fleck (Farbe als [r, g, b], Deckkraft a) */
    const fleck = (/** @type {[number, number]} */ m, /** @type {number} */ rad, /** @type {number[]} */ c, /** @type {number} */ a, sy = 1) => {
      ctx.save();
      ctx.translate(m[0], m[1]);
      ctx.scale(1, sy);
      const verlauf = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      verlauf.addColorStop(0, rgba(c, a));
      verlauf.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = verlauf;
      ctx.fillRect(-rad, -rad, 2 * rad, 2 * rad);
      ctx.restore();
    };
    /** Quadratische Kurve durch drei Punkte (Anfang, Mitte, Ende) */
    const bogen = (/** @type {[number, number]} */ a, /** @type {[number, number]} */ m, /** @type {[number, number]} */ e, neu = true) => {
      if (neu) ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(2 * m[0] - (a[0] + e[0]) / 2, 2 * m[1] - (a[1] + e[1]) / 2, e[0], e[1]);
    };

    // Wangenröte, Augenhöhlen, Augenringe, Bartschatten
    for (const s of [-1, 1]) {
      if (f.roete) fleck(P(s * 0.5, -0.2), 30, [200, 92, 80], f.roete);
      fleck(P(s * 0.4, 0.07), 22, [110, 68, 48], 0.16, 0.7);
      if (f.ringe) fleck(P(s * 0.4, 0.0), 22, [100, 88, 118], f.ringe, 0.8);
    }
    if (f.bart) {
      fleck(P(0, -0.72), 74, [60, 60, 68], f.bart * 0.6, 0.6);
      fleck(P(0, -0.44), 26, [60, 60, 68], f.bart * 0.45, 0.35);
      for (let i = 0; i < 4200; i++) {
        const U = (z() * 2 - 1) * 0.8;
        const D = -0.36 - z() * 0.62;
        const au = Math.abs(U);
        if (D > -0.37 || (au > 0.3 && D > -0.5 + 0.3 * au) || (au > 0.55 && D < -0.85)) continue;
        const [px, py] = P(U, D);
        ctx.fillStyle = `rgba(50,48,52,${f.bart * (0.25 + z() * 0.35)})`;
        ctx.fillRect(px, py, 1, 1);
      }
    }
    if (f.mal) {
      ctx.fillStyle = 'rgba(80,50,36,0.8)';
      ctx.beginPath();
      ctx.arc(...P(f.mal[0], f.mal[1]), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nase: Schatten an den Seiten und darunter, Nasenlöcher
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(120,70,50,0.06)';
      ctx.beginPath();
      ctx.ellipse(...P(s * 0.16, -0.12), 5, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(60,30,24,0.75)';
      ctx.beginPath();
      ctx.ellipse(...P(s * 0.1, -0.338), 3.6, 1.8, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    fleck(P(0, -0.37), 11, [100, 55, 40], 0.16, 0.35);
    fleck(P(0, -0.24), 6, [255, 238, 226], 0.16);
    // Leichte Nasolabialfalten bei allen (wirken weniger glatt und jung)
    ctx.strokeStyle = 'rgba(110,62,46,0.14)';
    ctx.lineWidth = 1.4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      bogen(P(s * 0.16, -0.31), P(s * 0.28, -0.42), P(s * 0.33, -0.58));
      ctx.stroke();
    }
    // Falten
    if (f.alter) {
      ctx.strokeStyle = 'rgba(110,62,46,0.28)';
      ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        bogen(P(s * 0.14, -0.3), P(s * 0.27, -0.42), P(s * 0.31, -0.6));
        ctx.stroke();
        ctx.beginPath();
        bogen(P(s * 0.3, 0.0), P(s * 0.41, -0.035), P(s * 0.52, 0.005));
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(110,62,46,0.13)';
      for (const D of [0.36, 0.44, 0.52]) {
        ctx.beginPath();
        bogen(P(-0.36, D - 0.015), P(0, D + 0.01), P(0.36, D - 0.015));
        ctx.stroke();
      }
    }
    if (f.falte) {
      ctx.strokeStyle = 'rgba(100,58,42,0.3)';
      ctx.lineWidth = 1.2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        bogen(P(s * 0.05, 0.27), P(s * 0.04, 0.21), P(s * 0.055, 0.15));
        ctx.stroke();
      }
    }
    // Augen (Lage, Größe und Brauenneigung je Gesicht)
    const am = f.augAbst ?? 0.41;
    const ag = f.augGr ?? 1;
    const bw = f.brauWinkel ?? 0;
    for (const s of [-1, 1]) {
      const PA = (/** @type {number} */ X, /** @type {number} */ Y) => P(s * (am + (X - 0.41) * ag), 0.06 + (Y - 0.06) * ag + (Y > 0.15 ? (bw * (X - 0.41)) / 0.2 : 0));
      const ai = PA(0.225, 0.05);
      const aa = PA(0.6, 0.07);
      if (f.geschlossen) {
        ctx.fillStyle = rgba([r - 18, g - 20, b - 16], 0.5);
        ctx.beginPath();
        bogen(ai, PA(0.4, 0.105), aa);
        bogen(aa, PA(0.4, 0.03), ai, false);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,44,40,0.8)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        bogen(ai, PA(0.4, 0.03), aa);
        ctx.stroke();
      } else {
        ctx.save();
        ctx.beginPath();
        bogen(ai, PA(0.4, 0.098), aa);
        bogen(aa, PA(0.4, 0.022), ai, false);
        ctx.fillStyle = '#e4d9cb';
        ctx.fill();
        ctx.clip();
        const iris = PA(0.41, 0.058);
        ctx.fillStyle = /** @type {string} */ (f.auge);
        ctx.beginPath();
        ctx.arc(iris[0], iris[1], 6.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,16,14,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#120e0c';
        ctx.beginPath();
        ctx.arc(iris[0], iris[1], 2.7, 0, Math.PI * 2);
        ctx.fill();
        // Schatten des Oberlids auf dem Auge
        const sch = ctx.createLinearGradient(0, iris[1] - 7, 0, iris[1] + 1);
        sch.addColorStop(0, 'rgba(60,36,28,0.55)');
        sch.addColorStop(1, 'rgba(60,36,28,0)');
        ctx.fillStyle = sch;
        ctx.fillRect(iris[0] - 25, iris[1] - 8, 50, 9);
        // Glanzpunkt (Glasauge)
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(iris[0] - 2.5, iris[1] - 2.5, 1.6, 1.6);
        ctx.restore();
        ctx.strokeStyle = 'rgba(52,36,28,0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        bogen(ai, PA(0.4, 0.098), aa);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(96,62,50,0.5)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        bogen(ai, PA(0.4, 0.022), aa);
        ctx.stroke();
      }
      // Lidfalte
      ctx.strokeStyle = 'rgba(118,74,54,0.18)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      bogen(PA(0.25, 0.09), PA(0.42, 0.145), PA(0.59, 0.097));
      ctx.stroke();
      // Braue: gefüllte, nach außen dünner werdende Form, darüber einzelne Härchen
      const d = f.brauDicke;
      ctx.fillStyle = f.braue;
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      bogen(PA(0.2, 0.178 + 0.016 * d), PA(0.4, 0.205 + 0.02 * d), PA(0.62, 0.188 + 0.008 * d));
      bogen(PA(0.62, 0.17), PA(0.4, 0.178), PA(0.2, 0.155), false);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = f.braue;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 40; i++) {
        const t = z();
        const [px, py] = PA((0.21 + t * 0.4), 0.175 + 0.02 * Math.sin(t * Math.PI) + (z() - 0.5) * 0.035 * d);
        ctx.beginPath();
        ctx.moveTo(px, py + 2);
        ctx.lineTo(px + s * (2 + t * 2), py - 1.5);
        ctx.stroke();
      }
    }
    // Lippen: Oberlippe mit Amorbogen, Unterlippe voller und heller, Mundspalte
    const lip = f.lippe;
    const mb = f.mund ?? 1;
    const PM = (/** @type {number} */ U, /** @type {number} */ D) => P(U * mb, D);
    ctx.fillStyle = rgba(lip, 0.9);
    ctx.beginPath();
    ctx.moveTo(...PM(-0.31, -0.545));
    bogen(PM(-0.31, -0.545), PM(-0.161, -0.512), PM(-0.043, -0.51), false);
    ctx.lineTo(...PM(0, -0.518));
    ctx.lineTo(...PM(0.043, -0.51));
    bogen(PM(0.043, -0.51), PM(0.161, -0.512), PM(0.31, -0.545), false);
    bogen(PM(0.31, -0.545), PM(0, -0.555), PM(-0.31, -0.545), false);
    ctx.fill();
    ctx.fillStyle = rgba(lip.map((c) => Math.min(255, c + 14)), 0.85);
    ctx.beginPath();
    bogen(PM(-0.291, -0.548), PM(0, -0.558), PM(0.291, -0.548));
    bogen(PM(0.291, -0.548), PM(0, -0.625), PM(-0.291, -0.548), false);
    ctx.fill();
    ctx.strokeStyle = 'rgba(78,40,34,0.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    bogen(PM(-0.329, -0.542), PM(0, -0.558), PM(0.329, -0.542));
    ctx.stroke();
    fleck(P(0, -0.69), 12, [100, 55, 40], 0.13, 0.3);
    ctx.restore();
  });
  const textur = alsTextur(canvas);
  textur.wrapS = THREE.ClampToEdgeWrapping;
  textur.wrapT = THREE.ClampToEdgeWrapping;
  return textur;
}
