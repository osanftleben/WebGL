// Vereinfachtes Raummodell für die vorab berechnete Lichtverteilung (Python, .claude/scripts/holmes_licht.py).
// Jedes Bauteil wird als achsenparalleler Quader mit Rückstrahlwert (Albedo, linear) beschrieben.
// Wird nur für den Export gebraucht (lokal über __debug), nicht im Spielablauf.
import * as THREE from 'three';

/** @type {Map<THREE.Texture, number[]>} mittlere Farbe je Textur (linear) */
const texturMittel = new Map();

/** sRGB (0..1) → linear */
const linear = (/** @type {number} */ c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/**
 * Mittlere Farbe einer Canvas-Textur (linear), für den Rückstrahlwert.
 * @param {THREE.Texture} textur
 */
function mittelfarbe(textur) {
  const vorhanden = texturMittel.get(textur);
  if (vorhanden) return vorhanden;
  const bild = /** @type {HTMLCanvasElement} */ (textur.image);
  const klein = document.createElement('canvas');
  klein.width = 16;
  klein.height = 16;
  const ctx = /** @type {CanvasRenderingContext2D} */ (klein.getContext('2d'));
  ctx.drawImage(bild, 0, 0, 16, 16);
  const daten = ctx.getImageData(0, 0, 16, 16).data;
  const summe = [0, 0, 0];
  for (let i = 0; i < daten.length; i += 4) for (let k = 0; k < 3; k++) summe[k] += linear(daten[i + k] / 255);
  const n = daten.length / 4;
  const ergebnis = summe.map((s) => s / n);
  texturMittel.set(textur, ergebnis);
  return ergebnis;
}

/**
 * Rückstrahlwert eines Materials (linear, RGB): Grundfarbe × mittlere Texturfarbe.
 * @param {THREE.Material} material
 */
function albedo(material) {
  const m = /** @type {any} */ (material);
  // Material-Farben sind in three.js bereits linear gespeichert
  const farbe = m.color ? [m.color.r, m.color.g, m.color.b] : [0.5, 0.5, 0.5];
  if (m.map && m.map.image && m.map.image.getContext) {
    const t = mittelfarbe(m.map);
    return farbe.map((c, i) => c * t[i]);
  }
  return farbe;
}

/**
 * Sammelt die Quader des Raummodells (Weltkoordinaten). Teile, deren Vorfahr
 * `userData.keinLichtModell` trägt, werden ausgelassen (z. B. die gedrehte Eckwand).
 * Ausgelassen werden außerdem durchsichtige, unbeleuchtete, unsichtbare und sehr kleine Teile.
 * @param {THREE.Object3D} gruppe
 * @param {{ min: number[], max: number[], albedo: number[], mauerwerk?: boolean }[]} zusatz von Hand ergänzte Quader
 */
export function sammleLichtModell(gruppe, zusatz = []) {
  gruppe.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const groesse = new THREE.Vector3();
  /** @type {{ min: number[], max: number[], albedo: number[], mauerwerk?: boolean }[]} */
  const quader = [];
  gruppe.traverse((o) => {
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh || !mesh.visible) return;
    let p = /** @type {THREE.Object3D | null} */ (mesh);
    while (p) {
      if (p.userData.keinLichtModell) return;
      p = p.parent;
    }
    const mat = /** @type {any} */ (mesh.material);
    if (mat.transparent || mat.isMeshBasicMaterial) return;
    box.setFromObject(mesh);
    box.getSize(groesse);
    // Flächen ohne Dicke (Boden, Decke) etwas aufdicken
    for (const achse of /** @type {const} */ (['x', 'y', 'z'])) {
      if (groesse[achse] < 0.01) {
        box.min[achse] -= 0.01;
        box.max[achse] += 0.01;
      }
    }
    box.getSize(groesse);
    const volumen = groesse.x * groesse.y * groesse.z;
    if (volumen < 3e-4 && Math.max(groesse.x, groesse.y, groesse.z) < 0.6) return;
    const r = (/** @type {number} */ v) => Math.round(v * 1000) / 1000;
    quader.push({
      min: [r(box.min.x), r(box.min.y), r(box.min.z)],
      max: [r(box.max.x), r(box.max.y), r(box.max.z)],
      albedo: albedo(mat).map((v) => Math.round(v * 1000) / 1000),
      // Mauerwerk (Pfeiler, Sturz, Brüstung) bleibt in der Berechnung, auch wenn es klein ist
      mauerwerk: mesh.userData.mauerwerk === true,
    });
  });
  return [...quader, ...zusatz];
}
