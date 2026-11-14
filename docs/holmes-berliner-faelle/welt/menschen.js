// Menschliche Formen für Wachsfiguren und Personen (Feinschliff C): geformter Kopf mit gemaltem
// Gesicht (Gesichtstafel in texturen.js), Haar, Bart, Hals, Hände, Arme und Rumpf mit Kleidung.
// Stilisiert; alle Geometrien werden einmal angelegt und geteilt. Alle Geometrien haben Index,
// Normalen und uv – sonst ließen sie sich in verschmelzen.js nicht zusammenfassen.
// Keine Quader oder Flächen (Box-/PlaneGeometry): die zählten sonst im Lichtmodell mit.
// Besetzung: Haar und Kleidung können statt eines Materials einen „Stoff“ mit Farbe tragen
// ({ farbig, farbe }); dann bekommt die Geometrie Vertex-Farben und alle Farben teilen sich ein
// Material (ein Draw-Call). Mit einem Material bleibt alles wie in Feinschliff C.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { zellenUV } from './texturen.js';

const PI = Math.PI;
const glatt = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Gewicht der Vorderseite (0 hinten … 1 vorn), weich */
const vornWeich = (/** @type {number} */ dz) => Math.max(0, dz) ** 2;
/** Gaußsche Beule */
const g2 = (/** @type {number} */ dx, /** @type {number} */ sx, /** @type {number} */ dy, /** @type {number} */ sy) => Math.exp(-((dx / sx) ** 2) - (dy / sy) ** 2);
/** Stückweise lineare Kurve [[x, y], …] (x aufsteigend) */
function kurve(/** @type {number[][]} */ punkte, /** @type {number} */ x) {
  if (x <= punkte[0][0]) return punkte[0][1];
  for (let i = 1; i < punkte.length; i++) {
    if (x <= punkte[i][0]) {
      const [x0, y0] = punkte[i - 1];
      const [x1, y1] = punkte[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return punkte[punkte.length - 1][1];
}

/**
 * Gitterfläche aus einer Parameterfunktion: s (0…1) läuft quer (Spalten), t (0…1) längs (Zeilen).
 * Bei der üblichen Lage (s nach rechts, t nach unten) zeigen die Dreiecke nach außen.
 * @param {number} ns @param {number} nt
 * @param {(s: number, t: number) => number[]} punkt
 * @param {(s: number, t: number) => number[]} [uvFn]
 * @param {FarbFn} [farbFn] Helligkeit und Hautanteil je Punkt (für Vertex-Farben, siehe gefaerbt)
 */
function gitter(ns, nt, punkt, uvFn = () => [0, 0], farbFn) {
  const pos = [];
  const uv = [];
  const idx = [];
  /** @type {number[]} */
  const farbe = [];
  for (let j = 0; j <= nt; j++) {
    for (let i = 0; i <= ns; i++) {
      pos.push(...punkt(i / ns, j / nt));
      uv.push(...uvFn(i / ns, j / nt));
      if (farbFn) farbe.push(...farbFn(i / ns, j / nt));
    }
  }
  for (let j = 0; j < nt; j++) {
    for (let i = 0; i < ns; i++) {
      const a = j * (ns + 1) + i;
      const c = a + ns + 1;
      idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  glatteNormalen(geo);
  if (farbFn) geo.userData.farbe = new Float32Array(farbe);
  return geo;
}

/** @typedef {(s: number, t: number) => number[]} FarbFn → [Helligkeit (1 = Grundfarbe), Hautanteil 0…1] */

/**
 * Stoff: ein Material (wie bisher) oder eine Farbe (sRGB-Hex) auf dem gemeinsamen Vertex-Farben-Material.
 * @typedef {THREE.Material | { farbig: THREE.Material, farbe: number }} Stoff
 */

/** Hautton der Wachsköpfe (sRGB), in den Haar- und Bartränder weich übergehen */
const HAUT = 0xd0aa8c;
const farbeA = new THREE.Color();
const farbeB = new THREE.Color();

/**
 * Kopie einer Geometrie mit Vertex-Farben (Attribut `color`, linear). Trägt die Geometrie
 * `userData.farbe` (aus gitter), wird je Punkt aufgehellt/abgedunkelt und zum Rand hin mit Haut gemischt.
 * @param {THREE.BufferGeometry} geo @param {number} farbe sRGB-Hex
 * @param {boolean} [einmalig=false] true: Geometrie selbst färben (wird nicht geteilt)
 */
function gefaerbt(geo, farbe, einmalig = false) {
  const bau = () => {
    const g = einmalig ? geo : geo.clone();
    const n = g.getAttribute('position').count;
    const f = /** @type {Float32Array | undefined} */ (geo.userData.farbe);
    farbeA.setHex(farbe);
    farbeB.setHex(HAUT);
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const h = f ? f[2 * i] : 1;
      const r = f ? f[2 * i + 1] : 0;
      c[3 * i] = farbeA.r * h * (1 - r) + farbeB.r * r;
      c[3 * i + 1] = farbeA.g * h * (1 - r) + farbeB.g * r;
      c[3 * i + 2] = farbeA.b * h * (1 - r) + farbeB.b * r;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  };
  return einmalig ? bau() : gemerkt(`farbe|${geo.uuid}|${farbe}`, bau);
}

/**
 * Mesh aus Geometrie und Stoff.
 * @param {THREE.BufferGeometry} geo @param {Stoff} stoff @param {boolean} [einmalig=false] siehe gefaerbt
 */
function stoffMesh(geo, stoff, einmalig = false) {
  if (/** @type {any} */ (stoff).isMaterial) return new THREE.Mesh(geo, /** @type {THREE.Material} */ (stoff));
  const st = /** @type {{ farbig: THREE.Material, farbe: number }} */ (stoff);
  return new THREE.Mesh(gefaerbt(geo, st.farbe, einmalig), st.farbig);
}

/** Ob ein Stoff eine Farbe auf dem Vertex-Farben-Material ist */
const istFarbe = (/** @type {Stoff | null | undefined} */ stoff) => Boolean(stoff && !(/** @type {any} */ (stoff).isMaterial));

/**
 * Fasst Teile zusammen und hängt ihre Farbwerte (userData.farbe) aneinander.
 * @param {THREE.BufferGeometry[]} teile
 */
function verbinde(teile) {
  const g = /** @type {THREE.BufferGeometry} */ (mergeGeometries(teile));
  const n = teile.reduce((a, t) => a + t.getAttribute('position').count, 0);
  const f = new Float32Array(2 * n);
  let o = 0;
  for (const t of teile) {
    const tf = /** @type {Float32Array | undefined} */ (t.userData.farbe);
    const k = t.getAttribute('position').count;
    for (let i = 0; i < k; i++) {
      f[2 * (o + i)] = tf ? tf[2 * i] : 1;
      f[2 * (o + i) + 1] = tf ? tf[2 * i + 1] : 0;
    }
    o += k;
    t.dispose();
  }
  g.userData = { farbe: f };
  return g;
}

/**
 * Mittelt die Normalen von Punkten, die an derselben Stelle liegen (Naht, Pole) – sonst sähe man Kanten.
 * @param {THREE.BufferGeometry} geo
 */
function glatteNormalen(geo) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  /** @type {Map<string, number[]>} */
  const gruppen = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
    const g = gruppen.get(k);
    if (g) g.push(i);
    else gruppen.set(k, [i]);
  }
  const n = new THREE.Vector3();
  for (const liste of gruppen.values()) {
    if (liste.length < 2) continue;
    n.set(0, 0, 0);
    for (const i of liste) n.x += nor.getX(i), n.y += nor.getY(i), n.z += nor.getZ(i);
    n.normalize();
    for (const i of liste) nor.setXYZ(i, n.x, n.y, n.z);
  }
}

/**
 * Setzt alle uv einer Geometrie auf einen Punkt (einfarbige Stelle der Gesichtstafel).
 * @param {THREE.BufferGeometry} geo @param {number[]} uv
 */
function einfarbigUV(geo, uv) {
  const a = geo.getAttribute('uv');
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0], uv[1]);
  return geo;
}

/** Einfarbige Hautstelle einer Zelle (linker Rand) */
const hautUV = (/** @type {number} */ zelle) => zellenUV(zelle, 0.02, 0.5);

// ---------- Kopf ----------

// Halbachsen des Kopfes (Meter); Mitte etwa auf Augenhöhe
const RX = 0.074;
const RY = 0.112;
const RZ = 0.096;

/**
 * Kopfformen: Kieferverjüngung, Kinn, Nasengröße, Breite, Höhe, Tiefe, Ohrgröße, Wangenknochen,
 * Nasenform (spitze: < 1,4 gerade, > 1,4 zur Spitze hin kräftiger), Brauenbogen
 */
const VARIANTEN = [
  { kiefer: 0.3, kinn: 0.014, nase: 0.021, breite: 1.0, hoehe: 1.0, tiefe: 1.0, ohr: 0.016, wange: 0.0018, spitze: 1.4, brauen: 0.007 },
  { kiefer: 0.22, kinn: 0.017, nase: 0.024, breite: 1.04, hoehe: 0.96, tiefe: 1.02, ohr: 0.019, wange: 0.004, spitze: 1.1, brauen: 0.009 },
  { kiefer: 0.36, kinn: 0.012, nase: 0.019, breite: 0.95, hoehe: 1.05, tiefe: 0.98, ohr: 0.014, wange: 0.0015, spitze: 1.8, brauen: 0.006 },
  { kiefer: 0.18, kinn: 0.02, nase: 0.022, breite: 1.07, hoehe: 0.98, tiefe: 1.0, ohr: 0.017, wange: 0.003, spitze: 1.3, brauen: 0.008 },
  { kiefer: 0.4, kinn: 0.009, nase: 0.027, breite: 0.94, hoehe: 1.07, tiefe: 1.04, ohr: 0.02, wange: 0.001, spitze: 2.1, brauen: 0.005 },
  { kiefer: 0.28, kinn: 0.015, nase: 0.017, breite: 1.02, hoehe: 1.02, tiefe: 0.96, ohr: 0.013, wange: 0.005, spitze: 1.0, brauen: 0.01 },
];

/**
 * Nase als Erhebung vorn (U quer, D Höhe; Werte in Metern).
 * @param {number} U @param {number} D @param {{ nase: number, spitze: number }} v
 */
function nase(U, D, v) {
  const t = (0.1 - D) / 0.44; // 0 an der Wurzel … 1 unter der Spitze
  let w = 0.005 * g2(Math.abs(U) - 0.13, 0.06, D + 0.31, 0.05); // Nasenflügel
  if (t <= 0 || t >= 1.05) return w;
  let h = v.nase * (0.12 + 0.88 * Math.pow(Math.min(t, 0.84) / 0.84, v.spitze)) * glatt(0, 0.15, t);
  if (t > 0.84) h *= 1 - glatt(0.84, 1.04, t);
  const s = 0.085 + 0.08 * Math.min(t, 1);
  w += h * Math.exp(-((U / s) ** 2));
  return w;
}

/**
 * Punkt auf dem Kopf zu Winkel a (um die Hochachse, vorn 0, +x bei a > 0) und Polwinkel p (oben 0).
 * @param {number} a @param {number} p @param {typeof VARIANTEN[0]} v
 * @returns {number[]}
 */
function kopfPunkt(a, p, v) {
  const sp = Math.sin(p);
  const D = Math.cos(p);
  const dz = sp * Math.cos(a);
  const U = Math.abs(a) <= PI / 2 ? Math.sin(a) : Math.sign(a);
  let x = RX * v.breite * sp * Math.sin(a);
  const y = RY * v.hoehe * D;
  let z = RZ * v.tiefe * dz;
  const unten = Math.max(0, -D);
  // Kiefer und Kinn schmaler als der Schädel
  x *= 1 - v.kiefer * unten ** 2.6;
  // Kieferwinkel: unter den Ohren kantig ausgestellt
  x *= 1 + 0.05 * Math.exp(-(((D + 0.55) / 0.18) ** 2)) * (1 - 0.6 * vornWeich(dz));
  // Schläfen und Scheitelbein etwas breiter (breiteste Stelle über den Ohren)
  x *= 1 + 0.1 * Math.exp(-(((D - 0.3) / 0.38) ** 2));
  // Hinterkopf voller, Nacken eingezogen
  if (dz < 0) z *= 1 + 0.08 * Math.exp(-(((D - 0.15) / 0.5) ** 2)) - 0.28 * unten * unten;
  // Gesicht etwas flacher als eine Kugel
  const vorn = Math.max(0, dz);
  z -= 0.007 * vorn ** 6;
  // Gesichtszüge
  let d = 0;
  for (const s of [-1, 1]) {
    d -= 0.009 * g2(U - s * 0.41, 0.18, D - 0.06, 0.1); // Augenhöhle
    d += v.wange * g2(U - s * 0.5, 0.2, D + 0.15, 0.14); // Wange
  }
  d += v.brauen * g2(U, 0.6, D - 0.2, 0.07); // Brauenbogen
  d += nase(U, D, v);
  d += 0.002 * g2(U, 0.3, D + 0.5, 0.05); // Oberlippe
  d += 0.0018 * g2(U, 0.26, D + 0.6, 0.05); // Unterlippe
  d -= 0.002 * g2(U, 0.3, D + 0.7, 0.05); // Kinnfalte
  d += v.kinn * g2(U, 0.42, D + 0.84, 0.13); // Kinn (breit)
  z += d * glatt(0.1, 0.6, dz);
  // Altersstufen (Besetzung): Tränensäcke; alt zusätzlich eingefallene Wangen und Schläfen, Hängebacken
  const alt = /** @type {any} */ (v).alt ?? 0;
  if (alt) {
    let da = 0;
    for (const s of [-1, 1]) {
      da += 0.0016 * alt * g2(U - s * 0.4, 0.14, D + 0.07, 0.045);
      if (alt > 1) da -= 0.006 * g2(U - s * 0.56, 0.16, D + 0.32, 0.13);
    }
    z += da * glatt(0.1, 0.6, dz);
    if (alt > 1) {
      const aa = Math.abs(a);
      x *= 1 - 0.04 * g2(aa - 1.05, 0.25, D - 0.22, 0.18) + 0.035 * g2(aa - 0.95, 0.35, D + 0.68, 0.12);
    }
  }
  // Ohren
  const ohr = v.ohr * g2(Math.abs(a) - 1.62, 0.13, D + 0.02, 0.15);
  x += Math.sign(a) * ohr;
  z -= ohr * 0.3;
  return [x, y, z];
}

/**
 * Gitterparameter → (a, p); vorn und um Nase/Mund dichter.
 * @param {number} s @param {number} t
 */
function kopfWinkel(s, t) {
  const ts = 2 * s - 1;
  const a = PI * (0.35 * ts + 0.65 * ts ** 3);
  const tt = 2 * t - 1;
  const w = 0.45 * tt + 0.55 * tt ** 3;
  const pc = 1.72;
  const p = tt < 0 ? pc * (1 + w) : pc + (PI - pc) * w;
  return [a, p];
}

/** @type {Map<string, THREE.BufferGeometry>} */
const cache = new Map();
/**
 * @param {string} k @param {() => THREE.BufferGeometry} bau
 */
function gemerkt(k, bau) {
  let g = cache.get(k);
  if (!g) {
    g = bau();
    cache.set(k, g);
  }
  return g;
}

/** @type {Map<string, typeof VARIANTEN[0]>} */
const variantenMitAlter = new Map();
/**
 * Kopfform mit Altersstufe: im Alter etwas größere Nase und Ohren (Stufe 0 = Form unverändert).
 * @param {number} variante @param {number} alt 0 jung, 1 mittel, 2 alt
 */
function form(variante, alt) {
  const grund = VARIANTEN[variante % VARIANTEN.length];
  if (!alt) return grund;
  const k = `${variante}|${alt}`;
  let v = variantenMitAlter.get(k);
  if (!v) {
    v = { ...grund, nase: grund.nase * (1 + 0.08 * alt), ohr: grund.ohr * (1 + 0.15 * alt), alt };
    variantenMitAlter.set(k, v);
  }
  return v;
}

/**
 * Kopfgeometrie (Mitte im Ursprung, Gesicht nach +z) mit uv auf eine Zelle der Gesichtstafel.
 * @param {number} variante @param {number} zelle @param {boolean} fein @param {number} [alt=0]
 * @param {number[] | null} [raster=null] eigenes Gitter [quer, längs] statt fein/grob
 */
function kopfGeometrie(variante, zelle, fein, alt = 0, raster = null) {
  return gemerkt(`kopf|${variante}|${zelle}|${fein}${alt ? `|${alt}` : ''}${raster ? `|${raster}` : ''}`, () => {
    const v = form(variante, alt);
    return gitter(raster?.[0] ?? (fein ? 40 : 26), raster?.[1] ?? (fein ? 30 : 20), (s, t) => {
      const [a, p] = kopfWinkel(s, t);
      return kopfPunkt(a, p, v);
    }, (s, t) => {
      const [a, p] = kopfWinkel(s, t);
      const U = Math.abs(a) <= PI / 2 ? Math.sin(a) : Math.sign(a);
      return zellenUV(zelle, 0.5 + 0.5 * U, 0.5 + 0.5 * Math.cos(p));
    });
  });
}

/**
 * Fläche, die dem Kopf in Abstand `dicke` folgt (für Haar und Bart).
 * @param {typeof VARIANTEN[0]} v @param {number} ns @param {number} nt
 * @param {(s: number, t: number) => number[]} winkel → [a, D]
 * @param {(s: number, t: number, D: number) => number} dicke
 * @param {FarbFn} [farbFn]
 */
function kopfSchale(v, ns, nt, winkel, dicke, farbFn) {
  return gitter(ns, nt, (s, t) => {
    const [a, D] = winkel(s, t);
    const p = Math.acos(Math.max(-1, Math.min(1, D)));
    const [x, y, z] = kopfPunkt(a, p, v);
    const l = Math.hypot(x, y, z);
    const f = (l + dicke(s, t, D)) / l;
    return [x * f, y * f, z * f];
  }, undefined, farbFn);
}

/** Haaransatz (Höhe D) über dem Winkel |a| */
const HAARANSATZ = {
  voll: [[0, 0.6], [0.8, 0.45], [1.35, 0.25], [1.85, 0.02], [PI, -0.45]],
  kurz: [[0, 0.7], [0.8, 0.53], [1.4, 0.3], [1.9, 0.08], [PI, -0.38]],
  lang: [[0, 0.56], [0.8, 0.4], [1.35, 0.14], [1.85, -0.16], [PI, -0.62]],
  // Haarkranz (Glatze oben): untere Grenze, nur seitlich und hinten
  kranz: [[0, 0.3], [1.0, 0.22], [1.5, 0.17], [1.8, 0.1], [2.1, -0.4], [PI, -0.88]],
};
/** Obere Grenze des Haarkranzes */
const KRANZ_OBEN = [[0, 0.3], [1.0, 0.32], [1.5, 0.5], [2.2, 0.62], [PI, 0.66]];

/**
 * Frisuren. Neu mit der Besetzung (nur mit Stoff-Farbe): scheitel (Seitenscheitel, voller oben),
 * locken, ecken (Geheimratsecken), licht (hohe Stirn, dünnes Haar), unterHut (nur unter dem Hutrand);
 * ungepflegt: zerzaust (wirr, Büschel in der Stirn), straehnig (zu lang, über Ohren und Nacken).
 * @typedef {'voll' | 'kurz' | 'lang' | 'kranz' | 'scheitel' | 'locken' | 'ecken' | 'licht' | 'unterHut' | 'zerzaust' | 'straehnig'} HaarStil
 */
/**
 * Bärte; ungepflegt (nur Besetzung): stoppel (Bartstoppeln), struppig (wirrer Vollbart), schnurrStruppig.
 * @typedef {'voll' | 'schnurr' | 'kinn' | 'backen' | 'lang' | 'stoppel' | 'struppig' | 'schnurrStruppig' | 'keiner'} BartStil
 */

/** Haaransatz der neuen Frisuren (Höhe D über |a|) */
const HAARANSATZ_NEU = {
  voll: HAARANSATZ.voll,
  kurz: HAARANSATZ.kurz,
  lang: HAARANSATZ.lang,
  scheitel: [[0, 0.58], [0.8, 0.44], [1.35, 0.24], [1.85, 0.0], [PI, -0.46]],
  locken: [[0, 0.56], [0.8, 0.42], [1.35, 0.2], [1.85, -0.02], [PI, -0.5]],
  ecken: [[0, 0.6], [0.28, 0.64], [0.55, 0.8], [0.85, 0.6], [1.35, 0.27], [1.85, 0.04], [PI, -0.42]],
  licht: [[0, 0.82], [0.45, 0.9], [0.85, 0.68], [1.35, 0.3], [1.85, 0.06], [PI, -0.4]],
  unterHut: HAARANSATZ.kurz,
  zerzaust: [[0, 0.52], [0.8, 0.38], [1.35, 0.14], [1.85, -0.12], [PI, -0.58]],
  straehnig: [[0, 0.5], [0.8, 0.3], [1.35, -0.02], [1.85, -0.35], [PI, -0.78]],
};
/**
 * Form der neuen Frisuren: Grunddicke, Fülle oben, Strähnenrippen, Zacken im Haaransatz,
 * Scheitel (Winkel), Locken, obere Grenze (unter dem Hut), Wirrheit (ungepflegt).
 * @type {Record<string, { grund: number, fuelle: number, rippe: number, zacke: number, scheitel?: number, locken?: number, oben?: number, wirr?: number }>}
 */
const FRISUR = {
  voll: { grund: 0.006, fuelle: 0.005, rippe: 0.0014, zacke: 0.03 },
  kurz: { grund: 0.0035, fuelle: 0.0025, rippe: 0.0008, zacke: 0.02 },
  lang: { grund: 0.008, fuelle: 0.006, rippe: 0.0018, zacke: 0.035 },
  scheitel: { grund: 0.006, fuelle: 0.006, rippe: 0.0014, zacke: 0.025, scheitel: 0.4 },
  locken: { grund: 0.008, fuelle: 0.006, rippe: 0, zacke: 0.04, locken: 0.005 },
  ecken: { grund: 0.0045, fuelle: 0.003, rippe: 0.001, zacke: 0.02 },
  licht: { grund: 0.003, fuelle: 0.0012, rippe: 0.0006, zacke: 0.015 },
  unterHut: { grund: 0.0035, fuelle: 0, rippe: 0.0008, zacke: 0.02, oben: 0.62 },
  zerzaust: { grund: 0.006, fuelle: 0.005, rippe: 0.002, zacke: 0.06, wirr: 0.011 },
  straehnig: { grund: 0.004, fuelle: 0.004, rippe: 0.004, zacke: 0.09, wirr: 0.005 },
};

/**
 * @param {number} variante @param {HaarStil} stil @param {boolean} fein
 */
function haarGeometrie(variante, stil, fein) {
  return gemerkt(`haar|${variante}|${stil}|${fein}`, () => {
    const v = VARIANTEN[variante % VARIANTEN.length];
    const ansatz = HAARANSATZ[stil];
    if (stil === 'kranz') {
      // von Schläfe zu Schläfe über den Hinterkopf
      return kopfSchale(v, fein ? 28 : 16, fein ? 6 : 4, (s, t) => {
        let a = 1.0 + s * (2 * PI - 2.0);
        if (a > PI) a -= 2 * PI;
        const oben = kurve(KRANZ_OBEN, Math.abs(a));
        return [a, oben + (kurve(ansatz, Math.abs(a)) - oben) * t];
      }, (s, t) => 0.0012 + 0.005 * glatt(0, 0.3, t) * glatt(1, 0.75, t) * glatt(0, 0.12, s) * glatt(1, 0.88, s));
    }
    const grund = { voll: 0.006, kurz: 0.0035, lang: 0.008 }[stil];
    const fuelle = { voll: 0.006, kurz: 0.002, lang: 0.007 }[stil];
    return kopfSchale(v, fein ? 32 : 18, fein ? 9 : 6, (s, t) => {
      const a = PI * (2 * s - 1);
      const dl = kurve(ansatz, Math.abs(a));
      // t = 0 oben (Scheitel) … 1 am Haaransatz
      return [a, 1 - t * (1 - dl)];
    }, (s, t) => 0.0012 + (grund + fuelle * (1 - t) ** 2) * glatt(1, 0.75, t));
  });
}

/**
 * Haar der Besetzung: Strähnen (Rippen und helle/dunkle Bahnen), gezackter Haaransatz,
 * Rand weich in die Haut übergehend (gegen den „Kappen“-Eindruck).
 * @param {number} variante @param {HaarStil} stil @param {boolean} fein @param {number} alt
 */
function haarGeometrieNeu(variante, stil, fein, alt) {
  return gemerkt(`haarNeu|${variante}|${stil}|${fein}|${alt}`, () => {
    const v = form(variante, alt);
    if (stil === 'kranz') {
      return kopfSchale(v, fein ? 28 : 16, fein ? 6 : 4, (s, t) => {
        let a = 1.0 + s * (2 * PI - 2.0);
        if (a > PI) a -= 2 * PI;
        const oben = kurve(KRANZ_OBEN, Math.abs(a)) + 0.03 * Math.sin(a * 11);
        const unten = kurve(HAARANSATZ.kranz, Math.abs(a)) + 0.025 * Math.sin(a * 13 + 1);
        return [a, oben + (unten - oben) * t];
      }, (s, t) => 0.0012 + (0.0055 + 0.001 * Math.sin(s * 70)) * glatt(0, 0.3, t) * glatt(1, 0.75, t) * glatt(0, 0.12, s) * glatt(1, 0.88, s),
      (s, t) => [0.88 + 0.12 * Math.sin(s * 90 + 2 * Math.sin(s * 17)), 0.5 * Math.max(glatt(0.3, 0, t), glatt(0.75, 1, t), glatt(0.12, 0, s), glatt(0.88, 1, s))]);
    }
    const f = FRISUR[stil] ?? FRISUR.voll;
    const ansatz = /** @type {number[][]} */ (/** @type {any} */ (HAARANSATZ_NEU)[stil] ?? HAARANSATZ.voll);
    const oben = f.oben ?? 1;
    // Strähnen und Farbwechsel laufen vom Scheitelpunkt zum Ansatz; dort treffen alle Spalten zusammen
    const pol = (/** @type {number} */ t) => (oben < 1 ? 1 : glatt(0, 0.3, t));
    return kopfSchale(v, fein ? 36 : 20, fein ? 9 : 5, (s, t) => {
      const a = PI * (2 * s - 1);
      const aa = Math.abs(a);
      // gezackter Haaransatz, vorn in der Mitte ruhiger
      const zacke = f.zacke * (0.6 * Math.sin(a * 9 + 1.3) + 0.4 * Math.sin(a * 17 + 0.4)) * glatt(0.12, 0.6, aa);
      let dl = kurve(ansatz, aa) + zacke;
      // ungepflegt: Büschel hängen in die Stirn
      if (f.wirr) dl -= 0.09 * Math.max(0, Math.sin(a * 11 + 0.5)) * glatt(0.9, 0.1, aa);
      return [a, oben - t * (oben - dl)];
    }, (s, t) => {
      const a = PI * (2 * s - 1);
      // Fülle oben gleichmäßig gewölbt (mit (1 − t)² lief das Haar am Scheitelpunkt spitz zu)
      let d = 0.0012 + (f.grund + f.fuelle * (1 - t * t)) * glatt(1, 0.75, t);
      d += f.rippe * (0.5 + 0.5 * Math.sin(a * 23 + 2 * Math.sin(a * 4))) * glatt(1, 0.6, t) * pol(t);
      if (f.locken) d += f.locken * (0.5 + 0.5 * Math.sin(a * 10) * Math.cos(t * PI * 5 + a * 3)) * glatt(1, 0.7, t) * pol(t);
      if (f.wirr) d += f.wirr * (0.5 + 0.35 * Math.sin(a * 7 + 3 * Math.sin(t * 9 + a * 2)) * Math.cos(t * 11 + a * 5) + 0.25 * Math.sin(a * 13 + t * 17)) * glatt(1, 0.85, t) * pol(t);
      if (f.scheitel !== undefined) {
        // Scheitellinie vom Ansatz nach hinten oben; die größere Seite (a < Scheitel) ist voller
        d -= (f.grund + 0.6 * f.fuelle) * g2(a - f.scheitel, 0.06, (t - 0.65) / 0.45, 1) * glatt(0.1, 0.35, t);
        d += 0.003 * glatt(f.scheitel, f.scheitel - 0.8, a) * glatt(1, 0.5, t) * glatt(0, 0.4, t);
      }
      return d;
    }, (s, t) => {
      const a = PI * (2 * s - 1);
      let h = 1 + (0.13 * Math.sin(a * 19 + 3 * Math.sin(a * 5)) + 0.07 * Math.sin(a * 41 + 1.7) + (f.wirr ? 0.12 * Math.sin(a * 29 + t * 8) : 0)) * pol(t);
      if (f.scheitel !== undefined) h *= 1 - 0.35 * g2(a - f.scheitel, 0.05, (t - 0.65) / 0.45, 1) * glatt(0.1, 0.35, t);
      return [h, 0.55 * glatt(0.8, 1, t)];
    });
  });
}

/** Obere Grenze des Vollbarts (Höhe D) über |a| */
const BARTGRENZE = [[0, -0.64], [0.3, -0.5], [0.6, -0.26], [1.1, -0.03], [1.45, 0.18], [1.65, 0.24]];

/**
 * Bart: Schnurrbart allein oder mit Vollbart, Kinnbart oder Backenbart.
 * Mit Farbwerten (Strähnen, Rand zur Haut) für Stoff-Farben; die Form ist dieselbe wie in Feinschliff C.
 * 'lang' (Besetzung): Vollbart, unter dem Kinn deutlich dicker. Ungepflegt: 'stoppel' (dünne, halb
 * hautfarbene Schicht über Wangen, Kinn und Oberlippe), 'struppig', 'schnurrStruppig' (ausgefranst).
 * @param {number} variante @param {Exclude<BartStil, 'keiner'>} stil @param {boolean} fein @param {number} [alt=0]
 */
function bartGeometrie(variante, stil, fein, alt = 0) {
  return gemerkt(`bart|${variante}|${stil}|${fein}${alt ? `|${alt}` : ''}`, () => {
    const v = form(variante, alt);
    /** Strähnen quer (s) und weicher oberer Rand (t = 0) */
    const strich = (/** @type {number} */ k) => (/** @type {number} */ s, /** @type {number} */ t) => [0.9 + 0.12 * Math.sin(s * k + 2 * Math.sin(s * 7)), 0.45 * glatt(0.3, 0, t)];
    /** Fläche des Vollbarts (s quer, t von der oberen Grenze nach unten); `zack` macht die Grenze unregelmäßig */
    const vollFlaeche = (/** @type {number} */ zack) => (/** @type {number} */ s, /** @type {number} */ t) => {
      const a = 1.65 * (2 * s - 1);
      const oben = kurve(BARTGRENZE, Math.abs(a)) + zack * Math.sin(a * 13 + 0.7);
      return [a, oben + (-0.97 - zack * 0.5 - oben) * t];
    };
    /** Fläche des Schnurrbarts; `wild` lässt die Enden tiefer und ausgefranst hängen */
    const schnurrFlaeche = (/** @type {number} */ wild) => (/** @type {number} */ s, /** @type {number} */ t) => {
      const a = 0.62 * (2 * s - 1);
      const e = (a / 0.62) ** 2;
      const oben = -0.352 - 0.1 * e;
      const unten = -0.465 - 0.12 * e - wild * (0.05 * e + 0.035 * Math.abs(Math.sin(s * 29)));
      return [a, oben + (unten - oben) * t];
    };
    if (stil === 'stoppel') {
      // Stoppeln: hauchdünn, Farbe zur Hälfte Haut, körnig
      const korn = (/** @type {number} */ s, /** @type {number} */ t) => [0.85 + 0.25 * Math.sin(s * 97 + t * 13), 0.5 + 0.1 * Math.sin(s * 53 + t * 5) + 0.3 * glatt(0.3, 0, t)];
      return verbinde([
        kopfSchale(v, fein ? 18 : 10, fein ? 4 : 3, schnurrFlaeche(0), () => 0.0012, korn),
        kopfSchale(v, fein ? 28 : 16, fein ? 9 : 5, vollFlaeche(0.02), () => 0.0012, korn),
      ]);
    }
    const wild = stil === 'struppig' || stil === 'schnurrStruppig' ? 1 : 0;
    // Schnurrbart: zwischen Nase und Oberlippe, Enden leicht herabhängend (wild = 0: Form wie Feinschliff C)
    const schnurr = kopfSchale(v, fein ? 18 : 10, fein ? 5 : 3, schnurrFlaeche(wild),
      (s, t) => 0.0012 + 0.005 * (1 + 0.5 * wild) * Math.sin(PI * t) * Math.sin(PI * s) ** 0.5 * (1 + 0.5 * wild * Math.sin(s * 41 + t * 7)),
      (s, t) => [0.9 + 0.12 * Math.sin(s * 60) + wild * 0.12 * Math.sin(s * 23 + t * 5), 0]);
    if (stil === 'schnurr' || stil === 'schnurrStruppig') return schnurr;
    /** @type {THREE.BufferGeometry[]} */
    const teile = [schnurr];
    if (stil === 'struppig') {
      // wirrer Vollbart: ungleich dick, ausgefranste Ränder
      teile.push(kopfSchale(v, fein ? 28 : 16, fein ? 9 : 5, vollFlaeche(0.045),
        (s, t, D) => 0.0012 + (0.006 + 0.018 * glatt(-0.5, -0.95, D)) * (0.75 + 0.25 * Math.sin(s * 47 + t * 9)) * glatt(0, 0.25, t) * glatt(1, 0.85, Math.abs(2 * s - 1)),
        (s, t) => [0.85 + 0.25 * Math.sin(s * 47 + t * 9), 0.35 * glatt(0.3, 0, t)]));
    } else if (stil === 'voll' || stil === 'lang') {
      const unten = stil === 'lang' ? 0.03 : 0.013;
      teile.push(kopfSchale(v, fein ? 28 : 16, fein ? 9 : 5, vollFlaeche(0), (s, t, D) => 0.0012 + (0.004 + unten * glatt(-0.5, -0.95, D)) * glatt(0, 0.3, t) * glatt(1, 0.85, Math.abs(2 * s - 1)), strich(80)));
    } else if (stil === 'kinn') {
      // Kinnbart unter der Unterlippe, nach unten schmaler
      teile.push(kopfSchale(v, fein ? 12 : 8, fein ? 7 : 4, (s, t) => {
        const a = 0.42 * (2 * s - 1) * (1 - 0.45 * t);
        return [a, -0.62 - 0.05 * (a / 0.42) ** 2 - 0.35 * t];
      }, (s, t, D) => 0.0012 + (0.004 + 0.012 * glatt(-0.6, -0.95, D)) * glatt(0, 0.25, t) * Math.sin(PI * s) ** 0.6, strich(40)));
    } else {
      // Backenbart: von den Schläfen über die Wangen, Kinn frei (s läuft immer von vorn nach hinten)
      for (const seite of [-1, 1]) {
        const teil = kopfSchale(v, fein ? 12 : 8, fein ? 8 : 5, (s, t) => {
          const aa = seite > 0 ? 0.4 + s * 1.25 : 1.65 - s * 1.25;
          const oben = kurve(BARTGRENZE, aa);
          const unten = -0.45 - 0.4 * glatt(0.4, 0.75, aa);
          return [seite * aa, oben + (unten - oben) * t];
        }, (s, t) => 0.0012 + 0.008 * Math.sin(PI * t) ** 0.6 * glatt(0, 0.2, s) * glatt(1, 0.8, s),
        (s, t) => [0.9 + 0.12 * Math.sin(t * 30 + s * 9), 0.45 * Math.max(glatt(0.25, 0, t), glatt(0.75, 1, t), glatt(0.25, 0, s))]);
        teile.push(teil);
      }
    }
    return verbinde(teile);
  });
}

/**
 * Kopf mit gemaltem Gesicht, Haar und Bart. Ursprung in der Kopfmitte (Augenhöhe), Gesicht nach +z;
 * Kinn bei y ≈ −0,105, Scheitel bei +0,112.
 * @param {object} o
 * @param {THREE.Material} o.haut Material mit Gesichtstafel (oder ohne Textur für Rohlinge)
 * @param {number} [o.zelle=0] Zelle der Gesichtstafel
 * @param {number} [o.variante=0] Kopfform
 * @param {boolean} [o.fein=true] feines oder gröberes Gitter
 * @param {Stoff | null} [o.haar=null] Haarmaterial oder -farbe (null: kahl). Mit Farbe: neue Frisuren mit Strähnen
 * @param {HaarStil} [o.haarStil='voll']
 * @param {BartStil} [o.bart='keiner']
 * @param {Stoff | null} [o.bartMaterial] sonst wie Haar
 * @param {number} [o.alter=0] Altersstufe der Kopfform (0 jung = Form wie bisher, 1 mittel, 2 alt)
 * @param {number[] | null} [o.raster=null] eigenes Kopfgitter [quer, längs] (z. B. sparsamer für Schrankköpfe)
 * @returns {THREE.Group}
 */
export function kopf({ haut, zelle = 0, variante = 0, fein = true, haar = null, haarStil = 'voll', bart = 'keiner', bartMaterial = null, alter = 0, raster = null }) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(kopfGeometrie(variante, zelle, fein, alter, raster), haut));
  if (haar) {
    const geo = istFarbe(haar)
      ? haarGeometrieNeu(variante, haarStil, fein, alter)
      : haarGeometrie(variante, /** @type {'voll' | 'kurz' | 'lang' | 'kranz'} */ (haarStil), fein);
    g.add(stoffMesh(geo, haar));
  }
  const bm = bartMaterial ?? haar;
  if (bart !== 'keiner' && bm) g.add(stoffMesh(bartGeometrie(variante, bart, fein, alter), bm));
  return g;
}

/**
 * Hals (Zylinder, einfarbige Haut der Zelle), Mitte im Ursprung, 0,13 m hoch.
 * @param {THREE.Material} haut @param {number} [zelle=0]
 */
export function hals(haut, zelle = 0) {
  const geo = gemerkt(`hals|${zelle}`, () => einfarbigUV(new THREE.CylinderGeometry(0.055, 0.06, 0.13, 14, 1), hautUV(zelle)));
  return new THREE.Mesh(geo, haut);
}

// ---------- Hände ----------

/** Finger: Längenfaktor und Lage quer (Zeigefinger vorn bei +z) */
const FINGER = [[0.95, 0.026], [1.06, 0.009], [1.0, -0.008], [0.8, -0.025]];
/** Krümmung der Finger zur Handfläche (Bogenmaß) */
const KRUEMMUNG = 0.22;

/**
 * Lage der Nagelränder an den vier Fingerspitzen (Handrücken), in Koordinaten der Hand.
 * @param {number} seite wie bei hand()
 * @returns {number[][]} je Finger [x, y, z]
 */
export function fingerspitzen(seite) {
  return FINGER.map(([k, z]) => {
    const L = 0.036 * k;
    return [-seite * 2 * L * Math.sin(KRUEMMUNG) + seite * 0.0062, -0.09 - 2 * L * Math.cos(KRUEMMUNG) + 0.009, z];
  });
}

/**
 * Hängende Hand: Handgelenk im Ursprung, Finger nach −y, Daumen nach +z (vorn).
 * Die Handfläche zeigt zur Körpermitte: bei seite = +1 (Hand bei +x) nach −x.
 * @param {number} seite +1 oder −1 @param {number} zelle
 */
function handGeometrie(seite, zelle) {
  return gemerkt(`hand|${seite}|${zelle}`, () => {
    /** @type {THREE.BufferGeometry[]} */
    const teile = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const teil = (/** @type {number[]} */ gr, /** @type {number[]} */ lage, rx = 0, rz = 0, fein = 12) => {
      const geo = new THREE.SphereGeometry(1, fein, Math.round(fein * 0.7));
      q.setFromEuler(e.set(rx, 0, rz));
      m.compose(new THREE.Vector3(...lage), q, new THREE.Vector3(...gr));
      geo.applyMatrix4(m);
      teile.push(geo);
    };
    // Handfläche
    teil([0.017, 0.052, 0.042], [0, -0.048, 0]);
    // Finger, leicht zur Handfläche gekrümmt (Zeigefinger vorn)
    for (const [k, z] of FINGER) {
      const L = 0.036 * k;
      teil([0.0085, L, 0.0085], [-seite * L * Math.sin(KRUEMMUNG), -0.09 - L * Math.cos(KRUEMMUNG), z], 0, -seite * KRUEMMUNG, 8);
    }
    // Daumen vorn, schräg nach vorn-unten zur Handfläche hin
    teil([0.0095, 0.027, 0.0095], [-seite * 0.012, -0.058, 0.042], -0.35, -seite * 0.35, 8);
    const geo = /** @type {THREE.BufferGeometry} */ (mergeGeometries(teile));
    for (const t of teile) t.dispose();
    return einfarbigUV(geo, hautUV(zelle));
  });
}

/**
 * Hand als Mesh (siehe handGeometrie).
 * @param {THREE.Material} haut @param {number} seite +1 (linke Hand der Figur, bei +x) oder −1 @param {number} [zelle=0]
 */
export function hand(haut, seite, zelle = 0) {
  return new THREE.Mesh(handGeometrie(seite, zelle), haut);
}

/**
 * Nackter Fuß (Wachsfigur), Ursprung in der Mitte; lang entlang y, Zehen nach +y.
 * @param {THREE.Material} haut @param {number} [zelle=0]
 */
export function fuss(haut, zelle = 0) {
  const geo = gemerkt(`fuss|${zelle}`, () => {
    const g = new THREE.SphereGeometry(1, 12, 8);
    g.scale(0.042, 0.1, 0.034);
    return einfarbigUV(g, hautUV(zelle));
  });
  return new THREE.Mesh(geo, haut);
}

// ---------- Arme ----------

const kugelGeo = new THREE.SphereGeometry(1, 14, 10);
const knopfGeo = new THREE.SphereGeometry(1, 8, 6);
const manschetteGeo = new THREE.CylinderGeometry(0.041, 0.041, 0.02, 14, 1);

/**
 * Ärmel als Röhre entlang einer Kurve mit abnehmendem Radius.
 * @param {THREE.Vector3[]} punkte @param {number[]} radien je Punkt
 */
function aermelGeometrie(punkte, radien) {
  const weg = new THREE.CatmullRomCurve3(punkte);
  const lang = 12;
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  const tang = new THREE.Vector3();
  const mitte = new THREE.Vector3();
  return gitter(12, lang, (s, t) => {
    weg.getPointAt(t, mitte);
    weg.getTangentAt(t, tang);
    n.set(1, 0, 0).addScaledVector(tang, -tang.x).normalize();
    b.crossVectors(n, tang);
    const r = kurve(radien.map((rad, i) => [i / (radien.length - 1), rad]), t);
    const w = 2 * PI * s;
    return [mitte.x + r * (Math.cos(w) * n.x + Math.sin(w) * b.x), mitte.y + r * (Math.cos(w) * n.y + Math.sin(w) * b.y), mitte.z + r * (Math.cos(w) * n.z + Math.sin(w) * b.z)];
  });
}

/**
 * Arm mit Schulterkugel, Ärmel, Manschette und Hand.
 * @param {object} o
 * @param {Stoff} o.stoff Ärmel
 * @param {THREE.Material} o.haut
 * @param {number} o.zelle
 * @param {number} o.seite +1 (bei +x) oder −1
 * @param {number[]} o.schulter [x, y, z] @param {number[]} o.ellbogen @param {number[]} o.handgelenk
 * @param {Stoff | null} [o.manschette=null]
 * @param {number} [o.dicke=1]
 * @param {number} [o.kugel=1] Größe der Schulterkugel (Besetzung: kleiner, gegen klobige Schultern)
 * @returns {{ gruppe: THREE.Group, hand: THREE.Mesh }}
 */
export function arm({ stoff, haut, zelle, seite, schulter, ellbogen, handgelenk, manschette = null, dicke = 1, kugel: kg = 1 }) {
  const g = new THREE.Group();
  const p = [schulter, ellbogen, handgelenk].map((w) => new THREE.Vector3(...w));
  g.add(stoffMesh(aermelGeometrie(p, [0.052 * dicke, 0.047 * dicke, 0.041 * dicke]), stoff, true));
  const kugel = stoffMesh(kugelGeo, stoff);
  kugel.scale.set(0.05 * dicke * kg, 0.042 * dicke * kg, 0.054 * dicke * kg);
  kugel.position.copy(p[0]).add(new THREE.Vector3(0, -0.01, 0));
  g.add(kugel);
  const richtung = p[2].clone().sub(p[1]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), richtung);
  if (manschette) {
    const m = stoffMesh(manschetteGeo, manschette);
    m.position.copy(p[2]).addScaledVector(richtung, -0.004);
    m.quaternion.copy(q);
    g.add(m);
  }
  const h = hand(haut, seite, zelle);
  h.position.copy(p[2]).addScaledVector(richtung, 0.004);
  h.quaternion.copy(q);
  g.add(h);
  return { gruppe: g, hand: h };
}

// ---------- Rumpf und Kleidung ----------

/** Rundlichkeit des Rumpfquerschnitts (2 = Ellipse, größer = kantiger) */
const N = 2.6;

/**
 * @typedef {number[][]} Profil Punkte [y, halbe Breite, halbe Tiefe, Versatz z, Rundlichkeit?], y aufsteigend
 * (Rundlichkeit wie N; fehlt sie, gilt N – so bleiben ältere Profile unverändert)
 */

/**
 * Rundlichkeit des Querschnitts in Höhe y.
 * @param {Profil} profil @param {number} y
 */
function rundBei(profil, y) {
  if (profil[0].length < 5) return N;
  return kurve(profil.map((p) => [p[0], p[4] ?? N]), y);
}

/**
 * Maße des Profils in Höhe y (linear dazwischen).
 * @param {Profil} profil @param {number} y
 */
function profilBei(profil, y) {
  return [1, 2, 3].map((k) => kurve(profil.map((p) => [p[0], p[k]]), y));
}

/**
 * Punkt auf dem Rumpf: Winkel th (vorn 0, +x bei th > 0), Höhe y, nach außen versetzt um `aus`.
 * @param {Profil} profil @param {number} th @param {number} y @param {number} [aus=0]
 * @returns {number[]}
 */
export function rumpfPunkt(profil, th, y, aus = 0) {
  const [hw, hd, zo] = profilBei(profil, y);
  const n = rundBei(profil, y);
  const s = Math.sin(th);
  const c = Math.cos(th);
  const x = hw * Math.sign(s) * Math.abs(s) ** (2 / n);
  const z = hd * Math.sign(c) * Math.abs(c) ** (2 / n);
  const nx = x / (hw * hw);
  const nz = z / (hd * hd);
  const nl = Math.hypot(nx, nz) || 1;
  return [x + (aus * nx) / nl, y, zo + z + (aus * nz) / nl];
}

/**
 * Winkel auf dem Rumpf (vorn), an dem die Vorderseite die Breite x erreicht.
 * @param {Profil} profil @param {number} y @param {number} x
 */
function winkelBei(profil, y, x) {
  const hw = profilBei(profil, y)[0];
  return Math.sign(x) * Math.asin(Math.min(1, Math.abs(x) / hw) ** (rundBei(profil, y) / 2));
}

/**
 * Rumpfgeometrie: oben geschlossen (Hals), unten offen oder geschlossen.
 * @param {Profil} profil @param {boolean} untenZu
 */
function rumpfGeometrie(profil, untenZu) {
  const y0 = profil[0][0];
  const y1 = profil[profil.length - 1][0];
  const reihen = Math.max(8, Math.round((y1 - y0) / 0.032));
  // Zeile 0: Deckel oben, dann von oben nach unten, ggf. Deckel unten
  const nt = reihen + 1 + (untenZu ? 1 : 0);
  return gitter(26, nt, (s, t) => {
    const j = Math.round(t * nt);
    const th = PI * (2 * s - 1);
    if (j === 0) return [0, y1, profilBei(profil, y1)[2]];
    if (untenZu && j === nt) return [0, y0, profilBei(profil, y0)[2]];
    return rumpfPunkt(profil, th, y1 - ((j - 1) / reihen) * (y1 - y0));
  });
}

/**
 * Aufliegendes Stück Stoff auf dem Rumpf (Weste, Revers, Hemd, Krawatte, Gürtel).
 * @param {Profil} profil @param {number} yu @param {number} yo
 * @param {(y: number) => number[]} bereich Winkelbereich [th0, th1] in Höhe y
 * @param {number} aus Abstand zur Rumpfoberfläche
 * @param {number} [ns=8]
 */
function flicken(profil, yu, yo, bereich, aus, ns = 8) {
  const nt = Math.max(3, Math.round((yo - yu) / 0.025));
  return gitter(ns, nt, (s, t) => {
    const y = yo - t * (yo - yu);
    const [a, b] = bereich(y);
    return rumpfPunkt(profil, a + (b - a) * s, y, aus);
  });
}

/**
 * Revers (Schnitt 2): breiter, mit Kerbe oben, gewölbt und mit dunklen Kanten (Vertex-Farben),
 * dazu der Rockkragen hinten um den Hals.
 * @param {Profil} profil @param {number} unten @param {number} vOben @param {number} oben
 * @param {(y: number) => number} w halbe Breite des V in Höhe y
 */
function reversGeometrie(profil, unten, vOben, oben, w) {
  const q = (/** @type {number} */ y) => Math.max(0, (y - unten) / (vOben - unten));
  // Breite des Revers; oben schmaler (Kerbe zum Kragen)
  const lw = (/** @type {number} */ y) => (0.026 + 0.05 * q(y)) * (1 - 0.45 * glatt(0.8, 0.9, q(y)));
  const nt = Math.max(6, Math.round((vOben - unten) / 0.016));
  /** @type {THREE.BufferGeometry[]} */
  const teile = [];
  for (const sx of [-1, 1]) {
    // s läuft mit x (Außenseite nach außen); innen (am V) 0, außen 1
    const innen = (/** @type {number} */ s) => (sx > 0 ? s : 1 - s);
    teile.push(gitter(6, nt, (s, t) => {
      const y = vOben - t * (vOben - unten);
      const k = innen(s);
      const x = sx * (w(y) + lw(y) * k);
      return rumpfPunkt(profil, winkelBei(profil, y, x), y, 0.006 + 0.0045 * Math.sin(PI * k));
    }, undefined, (s) => [0.5 + 1.0 * Math.sin(PI * innen(s)) ** 0.7, 0]));
  }
  // Rockkragen: steht hinten und seitlich um den Hals, unten auf der Schulter
  const th0 = PI * 0.42;
  const kragen = (/** @type {number} */ aus, /** @type {boolean} */ innenSeite) => gitter(18, 3, (s, t) => {
    const th = th0 + (innenSeite ? 1 - s : s) * (2 * PI - 2 * th0);
    const yo = oben + 0.03;
    const yu = oben - 0.03;
    const o = [0.078 * Math.sin(th) * aus, yo, -0.01 + 0.088 * Math.cos(th) * aus];
    const u = rumpfPunkt(profil, th, yu, 0.004 + (aus - 1) * 0.05);
    return [o[0] + (u[0] - o[0]) * t, o[1] + (u[1] - o[1]) * t, o[2] + (u[2] - o[2]) * t];
  }, undefined, (s, t) => [t < 0.01 ? 0.6 : 0.95, 0]);
  teile.push(kragen(1, false), kragen(0.93, true));
  return verbinde(teile);
}

/**
 * Oberkörper mit Kleidung: Rumpf (Rock), optional V-Ausschnitt mit Revers, Weste, Hemdbrust,
 * Krawatte, Knöpfen und Stehkragen. Stoffe als Material oder als Farbe (Vertex-Farben).
 * @param {object} o
 * @param {Profil} o.profil
 * @param {Stoff} o.rock
 * @param {boolean} [o.untenZu=false]
 * @param {{ unten: number, breite: number, weste: Stoff, hemd: Stoff,
 *   krawatte: Stoff, knopf: Stoff, rockKnoepfe?: number }} [o.ausschnitt]
 * @param {Stoff | null} [o.kragen=null] Hemdkragen am Hals
 * @param {number} [o.schnitt=1] 1 wie Feinschliff C; 2 (Besetzung) deutliches Revers mit Kerbe und Rockkragen
 * @returns {THREE.Group}
 */
export function oberkoerper({ profil, rock, untenZu = false, ausschnitt, kragen = null, schnitt = 1 }) {
  const g = new THREE.Group();
  const schluessel = JSON.stringify(profil) + untenZu;
  g.add(stoffMesh(gemerkt(`rumpf|${schluessel}`, () => rumpfGeometrie(profil, untenZu)), rock));
  const oben = profil[profil.length - 1][0];
  if (ausschnitt) {
    const { unten, breite, weste, hemd, krawatte, knopf, rockKnoepfe = 2 } = ausschnitt;
    // V bis knapp unter den Hals; halbe Breite w(y)
    const vOben = oben - 0.035;
    const w = (/** @type {number} */ y) => breite * Math.max(0, (y - unten) / (vOben - unten)) ** 0.85;
    const hemdAb = unten + 0.5 * (vOben - unten);
    const teile = gemerkt(`kleid|${schluessel}|${unten}|${breite}`, () => {
      const b = (/** @type {number} */ y, /** @type {number} */ x0, /** @type {number} */ x1) => [winkelBei(profil, y, x0), winkelBei(profil, y, x1)];
      const lw = (/** @type {number} */ y) => 0.022 + 0.04 * Math.max(0, (y - unten) / (vOben - unten));
      const geo = {
        weste: flicken(profil, unten, vOben, (y) => b(y, -w(y) - 0.015, w(y) + 0.015), 0.003),
        revers: /** @type {THREE.BufferGeometry} */ (mergeGeometries([
          flicken(profil, unten, vOben, (y) => b(y, w(y), w(y) + lw(y)), 0.0065, 4),
          flicken(profil, unten, vOben, (y) => b(y, -w(y) - lw(y), -w(y)), 0.0065, 4),
        ])),
        hemd: flicken(profil, hemdAb, vOben + 0.01, (y) => {
          const h = w(y) * 0.9 * glatt(hemdAb, vOben, y) + 0.004;
          return b(y, -h, h);
        }, 0.0045),
        krawatte: flicken(profil, hemdAb + 0.01, vOben, () => [-0.07, 0.07], 0.0062, 3),
      };
      return geo;
    });
    const revers = schnitt === 2 ? gemerkt(`revers2|${schluessel}|${unten}|${breite}`, () => reversGeometrie(profil, unten, vOben, oben, w)) : teile.revers;
    g.add(stoffMesh(teile.weste, weste), stoffMesh(revers, rock), stoffMesh(teile.hemd, hemd), stoffMesh(teile.krawatte, krawatte));
    // Westenknöpfe auf der Mittellinie, Rockknöpfe unter dem V (zweireihig)
    for (let i = 0; i < 3; i++) {
      const y = unten + 0.02 + i * ((hemdAb - unten - 0.02) / 3);
      const k = stoffMesh(knopfGeo, knopf);
      k.scale.setScalar(0.0055);
      k.position.set(...rumpfPunkt(profil, 0, y, 0.0045));
      g.add(k);
    }
    for (let i = 0; i < rockKnoepfe; i++) {
      for (const sx of [-1, 1]) {
        const y = unten - 0.035 - i * 0.1;
        const k = stoffMesh(knopfGeo, knopf);
        k.scale.setScalar(0.008);
        k.position.set(...rumpfPunkt(profil, winkelBei(profil, y, sx * 0.05), y, 0.002));
        g.add(k);
      }
    }
    // Krawattenknoten
    const knoten = stoffMesh(knopfGeo, krawatte);
    knoten.scale.set(0.016, 0.013, 0.01);
    knoten.position.set(...rumpfPunkt(profil, 0, vOben - 0.002, 0.008));
    g.add(knoten);
  }
  if (kragen) {
    const k = stoffMesh(gemerkt('kragen', () => new THREE.CylinderGeometry(0.064, 0.067, 0.045, 16, 1)), kragen);
    k.position.set(0, oben + 0.012, profil[profil.length - 1][3] - 0.012);
    g.add(k);
  }
  return g;
}

/**
 * Mesh aus einer beliebigen Geometrie und einem Stoff (Material oder Farbe), z. B. Hut, Beine, Schuhe.
 * Geteilte Geometrien werden je Farbe einmal gefärbt.
 * @param {THREE.BufferGeometry} geo @param {Stoff} stoff
 * @returns {THREE.Mesh}
 */
export function stoffTeil(geo, stoff) {
  return stoffMesh(geo, stoff);
}

/**
 * Gürtel bzw. Band rund um den Rumpf.
 * @param {Profil} profil @param {number} yu @param {number} yo @param {THREE.Material} material @param {number} [aus=0.004]
 */
export function band(profil, yu, yo, material, aus = 0.004) {
  return new THREE.Mesh(gemerkt(`band|${JSON.stringify(profil)}|${yu}|${yo}`, () => flicken(profil, yu, yo, () => [-PI, PI], aus, 32)), material);
}
