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
export function leinwand(breite, hoehe) {
  const canvas = document.createElement('canvas');
  canvas.width = breite;
  canvas.height = hoehe;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  return { canvas, ctx };
}

/** @param {HTMLCanvasElement} canvas */
export function alsTextur(canvas) {
  const textur = new THREE.CanvasTexture(canvas);
  textur.wrapS = THREE.RepeatWrapping;
  textur.wrapT = THREE.RepeatWrapping;
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.anisotropy = 4;
  return textur;
}

/**
 * Dielenboden: 8 Bretter je Kachel. Eine Kachel = 1,6 m × 1,6 m (Brett 20 cm breit).
 * @param {number} [helligkeit=1] Faktor auf die Grundfarbe der Bretter (Maserung und Fugen bleiben)
 * @returns {THREE.CanvasTexture}
 */
export function dielenTextur(helligkeit = 1) {
  const { canvas, ctx } = leinwand(512, 512);
  const z = zufall(7);
  const brett = 64;
  for (let i = 0; i < 8; i++) {
    const ton = (0.85 + z() * 0.25) * helligkeit;
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
 * Stoffbezug (Tuch, z. B. auf der Schwerttafel): leicht wolkig mit feinem senkrechtem Fadenlauf.
 * Die mittlere Helligkeit bleibt bei der Grundfarbe. Eine Kachel = 2 m × 2 m (box mit `kacheln`).
 * @param {[number, number, number]} rgb Grundfarbe (sRGB 0–255)
 * @param {number} [saat=7]
 * @returns {THREE.CanvasTexture}
 */
export function stoffTextur(rgb, saat = 7) {
  const { canvas, ctx } = leinwand(256, 256);
  const z = zufall(saat);
  ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  ctx.fillRect(0, 0, 256, 256);
  // Wolken: weiche helle und dunkle Flecken gleich oft (ungleich gespanntes Tuch)
  for (let i = 0; i < 160; i++) {
    const hell = i % 2 === 0;
    const x = z() * 256;
    const y = z() * 256;
    const r = 8 + z() * 26;
    const verlauf = ctx.createRadialGradient(x, y, 0, x, y, r);
    verlauf.addColorStop(0, hell ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)');
    verlauf.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = verlauf;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // Fadenlauf: feine senkrechte Streifen
  for (let x = 0; x < 256; x++) {
    ctx.fillStyle = z() < 0.5 ? `rgba(255,255,255,${z() * 0.035})` : `rgba(0,0,0,${z() * 0.045})`;
    ctx.fillRect(x, 0, 1, 256);
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
 * Aufteilung der Gesichtstafel: 4 × 6 Zellen zu 256 Bildpunkten. Zellen 0–11: Wachsgesichter,
 * 12: Leiche (blass, Augen geschlossen), 13: Schutzmann Kranich (lebendige Haut), 14–15: Frauengesichter
 * (FRAUEN, Sitzung B1), 16–22: Wachsgesichter mit Narben (Kopien von 0–11, siehe NARBEN), 23: Frau mit Narbe.
 * Innerhalb einer Zelle: u = 0,5 + 0,5·U (U = Sinus des Winkels um den Kopf, vorn 0), v = 0,5 + 0,5·D
 * (D = Höhe auf der Kopfkugel, oben 1). Der Rand der Zelle ist einfarbige Haut (für Hals, Hände, Hinterkopf).
 */
export const GESICHT = { breite: 1024, hoehe: 1536, zelle: 256, rand: 4, spalten: 4, leiche: 12, kranich: 13, wachsZellen: 12 };

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
 *   augAbst?: number, augGr?: number, brauWinkel?: number, mund?: number, mal?: number[] | null,
 *   stufe?: number, bartFarbe?: number[], finster?: number, frau?: boolean,
 *   narben?: Array<{ art: 'schmiss' | 'pocken' | 'wange' | 'auge' | 'stirn' | 'kinn', seite?: number }> }} Gesicht
 * grund: Hautton (sRGB); auge: Irisfarbe; braue: Farbe, brauDicke: Stärke; lippe: Lippenfarbe; roete: Wangenröte;
 * bart: Bartschatten; alter: Falten; falte: Zornesfalte; geschlossen: Augen zu; ringe: Augenringe;
 * augAbst: Augenmitte (U), augGr: Augengröße, brauWinkel: Neigung der Brauen außen, mund: Mundbreite, mal: Muttermal [U, D];
 * stufe: Altersstufe der Besetzung (0 jung, 1 mittel, 2 alt; fehlt = alte Malweise); bartFarbe: Farbe des Bartschattens;
 * finster: finsterer Ausdruck 0…1 (tiefere, schräge Brauen, Augenschatten, harte Mundwinkel);
 * frau: Frauengesicht (Sitzung B1: kräftiger Lidstrich und Wimpern, vollere Lippen, kein Bartschatten);
 * narben: Narben der Besetzung (siehe maleNarben)
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

/**
 * Besetzung: Altersstufe und Brauenfarbe (passend zur Haarfarbe) der Wachsgesichter 1–11.
 * Zelle 0 bleibt unverändert – sie trägt auch die Originalfigur im Atelier.
 * Zellen nach Stufe: jung 0, 1, 4, 8 · mittel 3, 5, 9, 11 · alt 2, 6, 7, 10.
 * Brauen: 1 blond, 4 rot, 5 dunkelblond, 8 schwarz, 9 meliert, 11 rot, 3 dunkel, 2/6/7/10 grau bis weiß.
 * @type {Record<number, Partial<Gesicht>>}
 */
const UEBERARBEITUNG = {
  // 1: der einzige gepflegte, freundlich-glatte Kopf (der „feine“ Betrüger)
  1: { stufe: 0, braue: '#a07e4c', bart: 0.1, bartFarbe: [120, 96, 70], roete: 0.1, finster: 0.3 },
  2: { stufe: 2, alter: 1, braue: '#d0cac0', brauDicke: 1.9, finster: 1, bart: 0.4, bartFarbe: [120, 118, 116] },
  3: { stufe: 1, braue: '#2a1d14', brauDicke: 2.0, finster: 1, bart: 0.45 },
  4: { stufe: 0, braue: '#8e4c2a', bart: 0.3, bartFarbe: [130, 80, 56], roete: 0.12, finster: 0.8 },
  5: { stufe: 1, braue: '#86683f', bartFarbe: [110, 90, 66], bart: 0.35, finster: 0.9 },
  6: { stufe: 2, alter: 1, braue: '#a29c92', brauDicke: 1.8, finster: 1, bart: 0.4, bartFarbe: [110, 108, 106] },
  7: { stufe: 2, alter: 1, braue: '#c8c2b6', brauDicke: 2.0, finster: 0.8 },
  8: { stufe: 0, braue: '#1e1612', roete: 0.08, brauDicke: 1.9, finster: 1, bart: 0.42 },
  9: { stufe: 1, braue: '#5c524a', finster: 1, bart: 0.4 },
  10: { stufe: 2, alter: 1, braue: '#b8b2a8', brauDicke: 1.7, finster: 0.9 },
  11: { stufe: 1, braue: '#7a3e20', bartFarbe: [120, 72, 50], bart: 0.35, finster: 1 },
};

/**
 * Gesichter mit Narben (Besetzung; Gestaltung, keine belegte Angabe): Zelle → [Vorlage, Narben].
 * Die Vorlage bleibt unverändert (sie wird auch von anderen Köpfen benutzt). Stilisiert, ohne Blut.
 * @type {Record<number, [number, NonNullable<Gesicht['narben']>]>}
 */
const NARBEN = {
  16: [1, [{ art: 'schmiss', seite: -1 }]], // „feiner“ Betrüger mit Mensurschmiss auf der linken Wange
  17: [8, [{ art: 'pocken' }]], // jung, pockennarbig
  18: [9, [{ art: 'pocken' }, { art: 'kinn' }]], // mittel, Pocken und Kinnnarbe
  19: [3, [{ art: 'wange', seite: 1 }]], // mittel, Messernarbe über die Wange
  20: [11, [{ art: 'wange', seite: -1 }]], // mittel, rot, Messernarbe
  21: [9, [{ art: 'auge', seite: -1 }]], // Narbe durch Braue und Auge (unter der Augenklappe)
  22: [4, [{ art: 'stirn' }]], // jung, rot, Narbe quer über die Stirn
  23: [15, [{ art: 'wange', seite: -1 }]], // Frau, mittel, Messernarbe (Giftmischerin)
};

/**
 * Frauengesichter der Besetzung (Sitzung B1; Gestaltung, keine belegte Angabe): ungepflegt und finster
 * wie die Männer – Augenringe, Zornesfalte, harte Mundwinkel –, aber ohne Bartschatten, mit schmaleren
 * Brauen, kräftigem Lidstrich und volleren Lippen. 14 jung (etwa 25), 15 mittel (etwa 40).
 * @type {Gesicht[]}
 */
const FRAUEN = [
  { grund: [222, 186, 158], auge: '#5a3d26', braue: '#6a4426', brauDicke: 0.75, brauWinkel: 0.02, lippe: [178, 102, 94], roete: 0.13,
    bart: 0, stufe: 0, finster: 0.9, ringe: 0.24, falte: true, augAbst: 0.4, augGr: 1.06, mund: 0.84, mal: [0.34, -0.3], frau: true },
  { grund: [214, 180, 154], auge: '#4d6d8c', braue: '#4a3020', brauDicke: 0.85, brauWinkel: -0.01, lippe: [164, 98, 92], roete: 0.07,
    bart: 0, stufe: 1, finster: 1, ringe: 0.32, falte: true, augAbst: 0.41, augGr: 0.97, mund: 0.88, mal: null, frau: true },
];

/** @type {Array<Gesicht | null>} */
const GESICHTER = [
  ...wachsGesichter().map((f, k) => ({ ...f, ...(UEBERARBEITUNG[k] ?? {}) })),
  { grund: [205, 196, 182], braue: '#4e4236', brauDicke: 1.5, lippe: [146, 128, 126], roete: 0, bart: 0.26, geschlossen: true, ringe: 0.32 },
  { grund: [214, 172, 146], auge: '#4c6c90', braue: '#4a3524', brauDicke: 1.6, lippe: [172, 118, 102], roete: 0.16, bart: 0.24 },
  ...FRAUEN,
];
for (const [zelle, [vorlage, narben]] of Object.entries(NARBEN)) GESICHTER[Number(zelle)] = { .../** @type {Gesicht} */ (GESICHTER[vorlage]), narben };

/**
 * Ob das Gesicht einer Zelle älter gemalt ist (dann passt graues oder weißes Haar).
 * @param {number} zelle
 */
export function gesichtIstAlt(zelle) {
  return Boolean(GESICHTER[zelle]?.alter);
}

/**
 * Malt Altersspuren der Besetzung: Stufe 1 (mittel) leichte Stirn- und Augenfalten,
 * Stufe 2 (alt) tiefe Stirnfalten, Krähenfüße, Tränensäcke, eingefallene Wangen,
 * Falten von den Mundwinkeln abwärts und Altersflecken.
 * @param {CanvasRenderingContext2D} ctx
 * @param {(U: number, D: number) => [number, number]} P Bildpunkt zu (U, D)
 * @param {Function} fleck weicher Fleck (Mitte, Radius, Farbe, Deckkraft, Stauchung)
 * @param {Function} bogen Kurve durch drei Punkte
 * @param {number} stufe 1 oder 2
 * @param {() => number} z Zufallsfolge der Zelle
 */
function maleAlter(ctx, P, fleck, bogen, stufe, z) {
  const alt = stufe >= 2;
  const linie = (/** @type {number} */ a, /** @type {number} */ w) => {
    ctx.strokeStyle = `rgba(104,58,42,${a})`;
    ctx.lineWidth = w;
  };
  // Stirnfalten
  linie(alt ? 0.26 : 0.12, alt ? 1.5 : 1.2);
  for (const D of alt ? [0.33, 0.4, 0.47, 0.54] : [0.4, 0.48]) {
    ctx.beginPath();
    bogen(P(-0.4, D - 0.02), P(0, D + 0.012), P(0.4, D - 0.02));
    ctx.stroke();
  }
  for (const s of [-1, 1]) {
    // Krähenfüße am äußeren Augenwinkel
    linie(alt ? 0.3 : 0.13, 1.1);
    for (const w of alt ? [-0.06, 0, 0.06] : [-0.03, 0.03]) {
      ctx.beginPath();
      bogen(P(s * 0.61, 0.07 + w * 0.5), P(s * 0.66, 0.07 + w * 0.9), P(s * 0.71, 0.07 + w * 1.5));
      ctx.stroke();
    }
    // Unterlid-/Tränensackfalte
    linie(alt ? 0.32 : 0.14, 1.2);
    ctx.beginPath();
    bogen(P(s * 0.28, -0.03), P(s * 0.42, -0.085), P(s * 0.57, -0.03));
    ctx.stroke();
    if (!alt) continue;
    fleck(P(s * 0.42, -0.06), 16, [110, 72, 60], 0.18, 0.5);
    // eingefallene Wange unter dem Wangenknochen
    fleck(P(s * 0.55, -0.34), 34, [96, 60, 46], 0.2, 1.3);
    // Falten von den Mundwinkeln zum Kinn
    linie(0.26, 1.4);
    ctx.beginPath();
    bogen(P(s * 0.33, -0.56), P(s * 0.36, -0.66), P(s * 0.34, -0.8));
    ctx.stroke();
    // Kieferlinie (Hängebacken)
    linie(0.14, 1.6);
    ctx.beginPath();
    bogen(P(s * 0.5, -0.62), P(s * 0.58, -0.75), P(s * 0.52, -0.86));
    ctx.stroke();
  }
  if (alt) {
    // Altersflecken
    for (let i = 0; i < 9; i++) {
      const U = (z() * 2 - 1) * 0.7;
      const D = 0.2 + z() * 0.45;
      fleck(P(U, D), 3 + z() * 4, [128, 82, 52], 0.25 + z() * 0.2);
    }
    // Zornesfalte über der Nase
    linie(0.22, 1.2);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      bogen(P(s * 0.06, 0.26), P(s * 0.05, 0.2), P(s * 0.065, 0.14));
      ctx.stroke();
    }
  }
}

/**
 * Malt einen finsteren Ausdruck: Schatten in den Augenhöhlen und unter den Brauen, harte, herabgezogene
 * Mundwinkel, Zornesfalte.
 * @param {CanvasRenderingContext2D} ctx
 * @param {(U: number, D: number) => [number, number]} P Bildpunkt zu (U, D)
 * @param {Function} fleck @param {Function} bogen
 * @param {number} fi Stärke 0…1
 */
function maleFinster(ctx, P, fleck, bogen, fi) {
  for (const s of [-1, 1]) {
    fleck(P(s * 0.4, 0.1), 30, [70, 42, 34], 0.22 * fi, 0.6);
    fleck(P(s * 0.42, -0.02), 20, [80, 56, 60], 0.16 * fi, 0.5);
    ctx.strokeStyle = `rgba(90,48,38,${0.38 * fi})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    bogen(P(s * 0.31, -0.535), P(s * 0.345, -0.565), P(s * 0.37, -0.61));
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(96,52,40,${0.3 * fi})`;
  ctx.lineWidth = 1.3;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    bogen(P(s * 0.055, 0.25), P(s * 0.045, 0.19), P(s * 0.06, 0.13));
    ctx.stroke();
  }
}

/**
 * Malt Narben (Besetzung), stilisiert und ohne Blut: heller, leicht glänzender Wulst mit dunklem Rand,
 * bei Messernarben feine Stichspuren. Pocken: viele kleine Grübchen mit hellem Rand.
 * @param {CanvasRenderingContext2D} ctx
 * @param {(U: number, D: number) => [number, number]} P Bildpunkt zu (U, D)
 * @param {Function} fleck
 * @param {NonNullable<Gesicht['narben']>} narben
 * @param {() => number} z Zufallsfolge der Zelle
 */
function maleNarben(ctx, P, fleck, narben, z) {
  /**
   * Narbe entlang einer Kurve durch a, m, e (U/D-Werte).
   * @param {number[]} a @param {number[]} m @param {number[]} e @param {number} breite @param {boolean} [stiche=false]
   */
  const narbe = (a, m, e, breite, stiche = false) => {
    const A = P(a[0], a[1]);
    const M = P(m[0], m[1]);
    const E = P(e[0], e[1]);
    const K = [2 * M[0] - (A[0] + E[0]) / 2, 2 * M[1] - (A[1] + E[1]) / 2];
    const pfad = () => {
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.quadraticCurveTo(K[0], K[1], E[0], E[1]);
    };
    ctx.save();
    ctx.lineCap = 'round';
    pfad();
    ctx.strokeStyle = 'rgba(122,66,54,0.34)';
    ctx.lineWidth = breite + 3;
    ctx.stroke();
    pfad();
    ctx.strokeStyle = 'rgba(238,210,196,0.88)';
    ctx.lineWidth = breite;
    ctx.stroke();
    pfad();
    ctx.strokeStyle = 'rgba(150,84,72,0.45)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (stiche) {
      // feine Stichspuren quer zur Narbe
      ctx.strokeStyle = 'rgba(140,82,70,0.5)';
      ctx.lineWidth = 1;
      for (let u = 0.1; u < 0.95; u += 0.13) {
        const x = (1 - u) ** 2 * A[0] + 2 * u * (1 - u) * K[0] + u * u * E[0];
        const y = (1 - u) ** 2 * A[1] + 2 * u * (1 - u) * K[1] + u * u * E[1];
        const tx = 2 * (1 - u) * (K[0] - A[0]) + 2 * u * (E[0] - K[0]);
        const ty = 2 * (1 - u) * (K[1] - A[1]) + 2 * u * (E[1] - K[1]);
        const l = Math.hypot(tx, ty) || 1;
        const q = breite * 0.5 + 3;
        ctx.beginPath();
        ctx.moveTo(x - (ty / l) * q, y + (tx / l) * q);
        ctx.lineTo(x + (ty / l) * q, y - (tx / l) * q);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  for (const n of narben) {
    const s = n.seite ?? 1;
    if (n.art === 'schmiss') {
      // Mensurschmiss: zwei schräge Hiebe auf der Wange, vom Ohr zum Mundwinkel
      narbe([s * 0.66, 0.0], [s * 0.5, -0.17], [s * 0.3, -0.36], 3.2);
      narbe([s * 0.7, -0.2], [s * 0.6, -0.3], [s * 0.48, -0.4], 2.4);
    } else if (n.art === 'wange') {
      narbe([s * 0.62, 0.14], [s * 0.5, -0.16], [s * 0.3, -0.5], 3.6, true);
    } else if (n.art === 'auge') {
      narbe([s * 0.34, 0.45], [s * 0.42, 0.06], [s * 0.5, -0.32], 3.4);
    } else if (n.art === 'stirn') {
      narbe([-0.42, 0.52], [-0.1, 0.42], [0.22, 0.28], 3.2, true);
    } else if (n.art === 'kinn') {
      narbe([-0.08, -0.7], [0.04, -0.8], [0.18, -0.86], 2.8);
    } else if (n.art === 'pocken') {
      for (let i = 0; i < 190; i++) {
        const U = (z() * 2 - 1) * 0.78;
        const D = -0.6 + z() * 1.15;
        const au = Math.abs(U);
        // nicht in Augen, Lippen und Nasenlöcher
        if ((Math.abs(D - 0.06) < 0.08 && Math.abs(au - 0.41) < 0.19) || (D < -0.48 && D > -0.64 && au < 0.36) || (au < 0.14 && D < -0.28 && D > -0.4)) continue;
        const [px, py] = P(U, D);
        const r = 1.3 + z() * 1.4;
        fleck([px + 0.8, py + 0.8], r + 0.8, [255, 236, 222], 0.28);
        fleck([px, py], r, [112, 66, 52], 0.42);
      }
    }
  }
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
    if (!f) return;
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
      const bs = f.bartFarbe ?? [60, 60, 68];
      fleck(P(0, -0.72), 74, bs, f.bart * 0.6, 0.6);
      fleck(P(0, -0.44), 26, bs, f.bart * 0.45, 0.35);
      for (let i = 0; i < 4200; i++) {
        const U = (z() * 2 - 1) * 0.8;
        const D = -0.36 - z() * 0.62;
        const au = Math.abs(U);
        if (D > -0.37 || (au > 0.3 && D > -0.5 + 0.3 * au) || (au > 0.55 && D < -0.85)) continue;
        const [px, py] = P(U, D);
        const bf = f.bartFarbe ?? [50, 48, 52];
        ctx.fillStyle = `rgba(${bf[0]},${bf[1]},${bf[2]},${f.bart * (0.25 + z() * 0.35)})`;
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
    ctx.strokeStyle = f.stufe === 0 ? 'rgba(110,62,46,0.07)' : 'rgba(110,62,46,0.14)';
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
    if (f.stufe) maleAlter(ctx, P, fleck, bogen, f.stufe, z);
    if (f.finster) maleFinster(ctx, P, fleck, bogen, f.finster);
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
    // finster: Brauen tiefer, außen angehoben (innen zur Nase herabgezogen)
    const fi = f.finster ?? 0;
    const bw = (f.brauWinkel ?? 0) + 0.06 * fi;
    const tief = 0.03 * fi;
    for (const s of [-1, 1]) {
      const PA = (/** @type {number} */ X, /** @type {number} */ Y) => P(s * (am + (X - 0.41) * ag), 0.06 + (Y - 0.06) * ag + (Y > 0.15 ? (bw * (X - 0.41)) / 0.2 - tief : 0));
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
        ctx.strokeStyle = f.frau ? 'rgba(30,20,16,0.95)' : 'rgba(52,36,28,0.9)';
        ctx.lineWidth = f.frau ? 2.6 : 1.5;
        ctx.beginPath();
        bogen(ai, PA(0.4, 0.098), aa);
        ctx.stroke();
        if (f.frau) {
          // Wimpern am Oberlid, nach außen länger (aus der Ferne: dunkler, betonter Augenrand)
          ctx.lineWidth = 1.1;
          for (let i = 0; i <= 9; i++) {
            const t = 0.25 + (i / 9) * 0.35;
            const q = (t - 0.225) / (0.6 - 0.225);
            const [px, py] = PA(t, 0.022 + 0.076 * 4 * q * (1 - q) + 0.002);
            const l = 2 + 3 * q;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + s * l * 0.6, py - l);
            ctx.stroke();
          }
        }
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
    const lip = f.stufe === 2 ? f.lippe.map((c, i) => Math.round(c * 0.55 + f.grund[i] * 0.45)) : f.lippe;
    const mb = f.mund ?? 1;
    // Frauen: vollere Lippen (Höhe um die Mundspalte bei D −0,545 gestreckt)
    const lv = f.frau ? 1.45 : 1;
    const PM = (/** @type {number} */ U, /** @type {number} */ D) => P(U * mb, -0.545 + (D + 0.545) * lv);
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
    if (f.narben) maleNarben(ctx, P, fleck, f.narben, z);
    ctx.restore();
  });
  const textur = alsTextur(canvas);
  textur.wrapS = THREE.ClampToEdgeWrapping;
  textur.wrapT = THREE.ClampToEdgeWrapping;
  return textur;
}
