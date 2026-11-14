// Raummodell und Lichtkarten-Atlas für die vorab berechnete Beleuchtung (.claude/scripts/holmes_licht.py).
//
// Grundregel: Statische Quader und ebene Flächen (Wände, Boden, Decke, Gesims, Möbel aus Quadern)
// bekommen ihr Licht aus einer Lichtkarte, die direkt auf der Fläche berechnet wird (10-cm-Raster).
// Alles andere (runde Formen, Figuren, Personen, Fundstücke) nimmt das grobe Lichtgitter.
// Im Raummodell stehen alle Quader genau so, wie sie im Spiel stehen – auch gedreht.
import * as THREE from 'three';

/** Kantenlänge eines Lichtkarten-Bildpunkts in Metern; auch kleinste Größe für Verdecker und Lichtkarten-Seiten */
export const TEXEL = 0.1;
/** Breite des Atlas in Bildpunkten */
const ATLAS_BREITE = 1024;
/** Randpunkte je Seite (gegen Ausbluten beim weichen Filtern) */
const RAND = 1;
/** Reservierter Block links oben: „keine Lichtkarte“ (Alpha 0) – Meshes ohne eigene Koordinaten landen hier */
const RESERVIERT = 4;

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
 * @typedef {object} LichtSzene
 * @property {number[][]} quader Verdecker: [Mitte (3), Halbmaße (3), lokale Achsen in Welt (9), Albedo (3)]
 * @property {number[][]} flaechen Lichtkarten-Seiten: [Rechteck x, y, Breite, Höhe (Bildpunkte),
 *   Ecke (3), Kante u (3), Kante v (3), Normale (3)] – Bildpunkt (i, j) liegt bei Ecke + (i+½)/Breite·u + (j+½)/Höhe·v
 * @property {number[]} atlas [Breite, Höhe] in Bildpunkten
 * @property {string} pruefsumme ändert sich, sobald sich Lage oder Größe einer Lichtkarten-Seite ändert
 * @property {Map<THREE.Mesh, Float32Array>} koordinaten Lichtkarten-Koordinaten je Mesh (für verschmelze)
 */

/**
 * Sammelt das Raummodell (Verdecker) und legt den Lichtkarten-Atlas an. Vor dem Verschmelzen aufrufen.
 * Ausgelassen werden: unsichtbare, durchsichtige, unbeleuchtete Teile und Teile unter einem Vorfahren
 * mit `userData.keinLichtModell`. Runde Formen zählen nur als Verdecker, wenn ein Vorfahr
 * `userData.lichtHuelle` trägt (dann mit ihrem umgebenden Quader, z. B. Vorhänge und Säulenschäfte).
 * Figuren mit `userData.lichtZonen` verdecken als mehrere kleine Quader (siehe `huellZonen`).
 * @param {THREE.Object3D} gruppe
 * @param {boolean} [nurVerdecker] ohne Lichtkarten-Seiten (für `sammleVerdecker`)
 * @returns {LichtSzene}
 */
export function sammleLichtSzene(gruppe, nurVerdecker = false) {
  gruppe.updateWorldMatrix(true, true);
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const skal = new THREE.Vector3();
  const drehung = new THREE.Matrix4();
  const huelle = new THREE.Box3();
  /** @type {number[][]} */
  const quader = [];
  /** @type {{ mesh: THREE.Mesh, achse: number, vorz: number, b: number, c: number, groesse: number[],
   *   w: number, h: number, ecke: number[], u: number[], v: number[], n: number[], x?: number, y?: number }[]} */
  const seiten = [];
  const r = (/** @type {number} */ x) => Math.round(x * 1e4) / 1e4;

  gruppe.traverse((o) => {
    if (o.userData.lichtZonen) huellZonen(o, quader);
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh || !mesh.visible || mesh.userData.nurTreffer) return;
    let p = /** @type {THREE.Object3D | null} */ (mesh);
    let istHuelle = false;
    while (p) {
      if (p.userData.keinLichtModell) return;
      if (p.userData.lichtHuelle) istHuelle = true;
      p = p.parent;
    }
    const mat = /** @type {any} */ (mesh.material);
    if (mat.transparent || mat.isMeshBasicMaterial) return;
    const geo = /** @type {any} */ (mesh.geometry);
    const alb = albedo(mat).map(r);
    const istQuader = geo.type === 'BoxGeometry';
    const istFlaeche = geo.type === 'PlaneGeometry' && geo.parameters.widthSegments === 1 && geo.parameters.heightSegments === 1;

    if (!istQuader && !istFlaeche) {
      // Runde Formen: nur als umgebender Quader, wenn ausdrücklich gewünscht
      if (!istHuelle) return;
      huelle.setFromObject(mesh);
      const mitte = huelle.getCenter(new THREE.Vector3());
      const halb = huelle.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      if (r(Math.max(halb.x, halb.y, halb.z) * 2) < TEXEL) return;
      quader.push([mitte.x, mitte.y, mitte.z, halb.x, halb.y, halb.z, 1, 0, 0, 0, 1, 0, 0, 0, 1, ...alb].map(r));
      return;
    }

    mesh.matrixWorld.decompose(pos, quat, skal);
    drehung.makeRotationFromQuaternion(quat);
    const e = drehung.elements;
    const achsen = [[e[0], e[1], e[2]], [e[4], e[5], e[6]], [e[8], e[9], e[10]]];
    // Größe in Metern (lokale Größe × Skalierung); Flächen bekommen 1 cm Dicke. Auf 0,1 mm runden:
    // Browser rechnen Drehungen in den letzten Stellen verschieden – ohne Rundung kippte z. B. 0,25 m / 0,1 m
    // mal auf 2, mal auf 3 Bildpunkte, der Atlas sah anders aus und die Lichtkarte passte nicht (Firefox)
    const groesse = (istQuader
      ? [geo.parameters.width * Math.abs(skal.x), geo.parameters.height * Math.abs(skal.y), geo.parameters.depth * Math.abs(skal.z)]
      : [geo.parameters.width * Math.abs(skal.x), geo.parameters.height * Math.abs(skal.y), 0.01]).map(r);
    if (Math.max(...groesse) < TEXEL) return;
    quader.push([pos.x, pos.y, pos.z, groesse[0] / 2, groesse[1] / 2, groesse[2] / 2, ...achsen.flat(), ...alb].map(r));

    // Seiten mit Lichtkarte: beide Kanten mindestens einen Bildpunkt lang
    if (nurVerdecker) return;
    const kandidaten = istQuader ? [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]] : [[2, 1]];
    for (const [achse, vorz] of kandidaten) {
      const b = (achse + 1) % 3;
      const c = (achse + 2) % 3;
      if (groesse[b] < TEXEL || groesse[c] < TEXEL) continue;
      const ecke = [0, 1, 2].map((k) => pos.getComponent(k)
        + achsen[achse][k] * vorz * groesse[achse] / 2 - achsen[b][k] * groesse[b] / 2 - achsen[c][k] * groesse[c] / 2);
      seiten.push({
        mesh, achse, vorz, b, c, groesse,
        w: Math.max(1, Math.round(groesse[b] / TEXEL)),
        h: Math.max(1, Math.round(groesse[c] / TEXEL)),
        ecke, u: achsen[b].map((k) => k * groesse[b]), v: achsen[c].map((k) => k * groesse[c]),
        n: achsen[achse].map((k) => k * vorz),
      });
    }
  });

  // Atlas: Regalpacken (nach Höhe sortiert), Reihenfolge eindeutig
  const reihenfolge = seiten.map((s, i) => i).sort((a, b) => seiten[b].h - seiten[a].h || seiten[b].w - seiten[a].w || a - b);
  let x = RESERVIERT;
  let y = 0;
  let zeilenHoehe = RESERVIERT;
  for (const i of reihenfolge) {
    const s = seiten[i];
    const bw = s.w + 2 * RAND;
    const bh = s.h + 2 * RAND;
    if (bw > ATLAS_BREITE) throw new Error(`Lichtkarten-Seite zu breit: ${s.w} Bildpunkte`);
    if (x + bw > ATLAS_BREITE) {
      x = 0;
      y += zeilenHoehe;
      zeilenHoehe = 0;
    }
    s.x = x + RAND;
    s.y = y + RAND;
    x += bw;
    zeilenHoehe = Math.max(zeilenHoehe, bh);
  }
  const atlasHoehe = y + zeilenHoehe;

  // Lichtkarten-Koordinaten je Mesh: Ecken jeder Seite auf ihr Rechteck, übrige Seiten auf den reservierten Block
  /** @type {Map<THREE.Mesh, Float32Array>} */
  const koordinaten = new Map();
  /** @type {Map<THREE.Mesh, typeof seiten>} */
  const jeMesh = new Map();
  for (const s of seiten) {
    if (!jeMesh.has(s.mesh)) jeMesh.set(s.mesh, []);
    /** @type {typeof seiten} */ (jeMesh.get(s.mesh)).push(s);
  }
  for (const [mesh, liste] of jeMesh) {
    const geo = /** @type {any} */ (mesh.geometry);
    const lage = geo.getAttribute('position');
    const normale = geo.getAttribute('normal');
    const lokal = geo.type === 'BoxGeometry'
      ? [geo.parameters.width, geo.parameters.height, geo.parameters.depth]
      : [geo.parameters.width, geo.parameters.height, 1];
    const uv = new Float32Array(lage.count * 2).fill(1 / ATLAS_BREITE);
    for (let k = 0; k < lage.count; k++) {
      uv[2 * k + 1] = 1 / atlasHoehe;
      const nk = [normale.getX(k), normale.getY(k), normale.getZ(k)];
      const achse = nk.findIndex((w) => Math.abs(w) > 0.5);
      const s = liste.find((t) => t.achse === achse && Math.sign(nk[achse]) === t.vorz);
      if (!s || s.x === undefined || s.y === undefined) continue;
      const lk = [lage.getX(k), lage.getY(k), lage.getZ(k)];
      const fu = lk[s.b] / lokal[s.b] + 0.5;
      const fv = lk[s.c] / lokal[s.c] + 0.5;
      uv[2 * k] = (s.x + fu * s.w) / ATLAS_BREITE;
      uv[2 * k + 1] = (s.y + fv * s.h) / atlasHoehe;
    }
    koordinaten.set(mesh, uv);
  }

  const flaechen = seiten.map((s) => [s.x ?? 0, s.y ?? 0, s.w, s.h, ...s.ecke, ...s.u, ...s.v, ...s.n].map(r));
  return { quader, flaechen, atlas: [ATLAS_BREITE, atlasHoehe], pruefsumme: pruefsumme(flaechen, atlasHoehe), koordinaten };
}

/** Hüllquader runder Figuren: waagerechte Halbmaße schrumpfen (Kreis statt Ecke, Fläche ≈ π/4) */
const ZONEN_SCHRUMPF = 0.88;
/** Rückstrahlwert der Hüllquader (Wachs, Stoff gemischt; nur fürs zurückgeworfene Licht) */
const ZONEN_ALBEDO = [0.3, 0.26, 0.22];

/**
 * Verdecker für eine Figur (Gruppe mit `userData.lichtZonen`): Die runden Teile der Gruppe werden in
 * Scheiben entlang einer lokalen Achse geschnitten (Standard: y, Schnitte in lokalen Metern), je Scheibe
 * ein Quader um alle Eckpunkte darin – gedreht wie die Gruppe. Mehrere kleine Quader folgen der Gestalt
 * (Beine, Rumpf, Kopf) und werfen weiche Kontaktschatten statt eines großen Kastens. Quader der Gruppe
 * (Sockel, Schuhe) bleiben eigene Verdecker. Nur Verdecker, keine Lichtkarten-Seiten (Atlas bleibt gleich).
 * @param {THREE.Object3D} o @param {number[][]} quader Ziel
 */
function huellZonen(o, quader) {
  const z = o.userData.lichtZonen;
  const achse = Array.isArray(z) ? 1 : z.achse;
  const schnitte = Array.isArray(z) ? z : z.schnitte;
  const n = schnitte.length - 1;
  const mins = Array.from({ length: n }, () => [Infinity, Infinity, Infinity]);
  const maxs = Array.from({ length: n }, () => [-Infinity, -Infinity, -Infinity]);
  const inv = new THREE.Matrix4().copy(o.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  o.traverse((t) => {
    const mesh = /** @type {THREE.Mesh} */ (t);
    if (!mesh.isMesh || !mesh.visible || mesh.userData.nurTreffer) return;
    const geo = /** @type {any} */ (mesh.geometry);
    if (geo.type === 'BoxGeometry' || /** @type {any} */ (mesh.material).transparent) return;
    m.multiplyMatrices(inv, mesh.matrixWorld);
    const lage = geo.getAttribute('position');
    for (let k = 0; k < lage.count; k++) {
      p.fromBufferAttribute(lage, k).applyMatrix4(m);
      const w = p.getComponent(achse);
      let s = 0;
      while (s < n && w >= schnitte[s + 1]) s++;
      if (s >= n || w < schnitte[0]) continue;
      for (let a = 0; a < 3; a++) {
        const v = a === achse ? Math.min(Math.max(p.getComponent(a), schnitte[s]), schnitte[s + 1]) : p.getComponent(a);
        if (v < mins[s][a]) mins[s][a] = v;
        if (v > maxs[s][a]) maxs[s][a] = v;
      }
    }
  });
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const skal = new THREE.Vector3();
  o.matrixWorld.decompose(pos, quat, skal);
  const e = new THREE.Matrix4().makeRotationFromQuaternion(quat).elements;
  const achsen = [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]];
  const r = (/** @type {number} */ x) => Math.round(x * 1e4) / 1e4;
  for (let s = 0; s < n; s++) {
    if (mins[s][0] === Infinity) continue;
    // Scheibe an die Gestalt anpassen: an der Schnittachse bis zu den Schnitten, wenn sie dort weitergeht
    const lo = [...mins[s]];
    const hi = [...maxs[s]];
    if (s > 0 && maxs[s - 1][0] !== -Infinity) lo[achse] = schnitte[s];
    if (s < n - 1 && mins[s + 1][0] !== Infinity) hi[achse] = schnitte[s + 1];
    const mitte = new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2).applyMatrix4(o.matrixWorld);
    const halb = [0, 1, 2].map((a) => ((hi[a] - lo[a]) / 2) * Math.abs(skal.getComponent(a)) * (a === achse ? 1 : ZONEN_SCHRUMPF));
    if (Math.max(...halb) * 2 < TEXEL) continue;
    quader.push([mitte.x, mitte.y, mitte.z, ...halb, ...achsen, ...ZONEN_ALBEDO].map(r));
  }
}

/**
 * Nur die Verdecker einer Gruppe, die nicht zur Etage gehört (z. B. Fundstücke): gleiche Regeln wie
 * `sammleLichtSzene`, aber ohne Lichtkarten-Seiten (die Teile nehmen das Lichtgitter). Vor dem Verschmelzen.
 * @param {THREE.Object3D} gruppe
 * @returns {number[][]} Quader im Format von `LichtSzene.quader`
 */
export function sammleVerdecker(gruppe) {
  return sammleLichtSzene(gruppe, true).quader;
}

/**
 * Kurze Prüfsumme über die Aufteilung des Atlas (Lage und Größe jeder Seite in ganzen Bildpunkten).
 * Bewusst ohne Meterwerte: die rechnen Browser in den letzten Stellen verschieden. Ein Umbau, der die
 * Aufteilung nicht ändert (z. B. ein Schrank nur verschoben), wird daher nicht erkannt – nach Umbauten
 * das Licht ohnehin neu berechnen.
 * @param {number[][]} flaechen @param {number} hoehe
 */
function pruefsumme(flaechen, hoehe) {
  let h = 2166136261 ^ hoehe ^ (flaechen.length << 12);
  for (const f of flaechen) {
    for (let k = 0; k < 4; k++) {
      h ^= f[k];
      h = Math.imul(h, 16777619);
    }
  }
  return (h >>> 0).toString(16);
}
