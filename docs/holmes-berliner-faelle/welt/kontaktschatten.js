// Weiche Kontaktschatten an Wänden hinter wandnahen Gegenständen (z. B. Büstensockel).
// Bei weichem Tageslicht verdeckt ein Gegenstand dicht vor der Wand einen Teil des Raumlichts:
// Die Wand dahinter ist etwas dunkler. Das Lichtgitter ist dafür zu grob, die Schattenkarten
// erreichen diese Stellen nicht – daher gleichmäßige, weiche „Schattenflecken“ als Flächen.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * @typedef {object} Wandebene
 * @property {'x' | 'z'} achse Ebene x = wert oder z = wert
 * @property {number} wert
 * @property {1 | -1} richtung Blickrichtung der Wandoberfläche in den Raum (+1 / −1 entlang der Achse)
 */

/** Weicher Fleck (Deckkraft im Grünkanal): seitlich und oben weich auslaufend, unten am Boden am dunkelsten. */
function fleckTextur() {
  const n = 64;
  const daten = new Uint8Array(n * n * 4);
  /** @param {number} a @param {number} b @param {number} x */
  const glatt = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let j = 0; j < n; j++) {
    const v = (j + 0.5) / n; // 0 = unten (Boden), 1 = oben
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const seitlich = glatt(0, 0.38, u) * glatt(0, 0.38, 1 - u);
      const oben = glatt(0, 0.3, 1 - v);
      const wert = seitlich * oben * (1 - 0.35 * v);
      const k = (j * n + i) * 4;
      daten[k] = daten[k + 1] = daten[k + 2] = Math.round(wert * 255);
      daten[k + 3] = 255;
    }
  }
  const textur = new THREE.DataTexture(daten, n, n);
  textur.magFilter = THREE.LinearFilter;
  textur.minFilter = THREE.LinearFilter;
  textur.needsUpdate = true;
  return textur;
}

/**
 * Legt für wandnahe Gegenstände weiche Schattenflecken auf die nächste Wand.
 * @param {THREE.Object3D[]} gegenstaende Gegenstände (Weltlage aktuell)
 * @param {Wandebene[]} waende in Frage kommende Wandoberflächen
 * @param {object} [o]
 * @param {number} [o.reichweite=0.6] größter Abstand Gegenstand–Wand in Metern
 * @param {number} [o.staerke=0.5] Deckkraft in der Mitte des Flecks
 * @returns {THREE.Mesh | null} ein zusammengefasstes Mesh (oder null, wenn nichts in Wandnähe ist)
 */
export function kontaktschattenAnWaenden(gegenstaende, waende, { reichweite = 0.6, staerke = 0.5 } = {}) {
  const box = new THREE.Box3();
  /** @type {THREE.BufferGeometry[]} */
  const flaechen = [];
  for (const g of gegenstaende) {
    g.updateWorldMatrix(true, true);
    box.setFromObject(g);
    /** @type {{ wand: Wandebene, abstand: number } | null} */
    let beste = null;
    for (const w of waende) {
      const abstand = w.richtung > 0 ? box.min[w.achse] - w.wert : w.wert - box.max[w.achse];
      if (abstand < -0.05 || abstand > reichweite) continue;
      if (!beste || abstand < beste.abstand) beste = { wand: w, abstand };
    }
    if (!beste) continue;
    const { wand } = beste;
    const quer = wand.achse === 'x' ? 'z' : 'x';
    const breite = box.max[quer] - box.min[quer] + 0.5;
    const hoehe = box.max.y + 0.2;
    const geo = new THREE.PlaneGeometry(breite, hoehe);
    const mitteQuer = (box.min[quer] + box.max[quer]) / 2;
    const lage = wand.wert + wand.richtung * 0.004;
    // Ebene in die Wand drehen, Vorderseite zum Raum
    if (wand.achse === 'x') geo.rotateY(wand.richtung > 0 ? Math.PI / 2 : -Math.PI / 2);
    else if (wand.richtung < 0) geo.rotateY(Math.PI);
    geo.translate(wand.achse === 'x' ? lage : mitteQuer, hoehe / 2, wand.achse === 'x' ? mitteQuer : lage);
    flaechen.push(geo);
  }
  if (flaechen.length === 0) return null;
  const zusammen = mergeGeometries(flaechen, false);
  for (const f of flaechen) f.dispose();
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    alphaMap: fleckTextur(),
    transparent: true,
    opacity: staerke,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const mesh = new THREE.Mesh(zusammen, material);
  mesh.name = 'Kontaktschatten';
  mesh.renderOrder = 1;
  return mesh;
}
