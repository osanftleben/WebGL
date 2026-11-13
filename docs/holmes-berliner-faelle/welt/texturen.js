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
