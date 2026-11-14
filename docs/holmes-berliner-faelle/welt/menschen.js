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
  // 6, 7: Frauen (Sitzung B1) – schmaler Kiefer, kleines Kinn, kleine Nase, kaum Brauenwulst
  { kiefer: 0.44, kinn: 0.007, nase: 0.016, breite: 0.95, hoehe: 0.97, tiefe: 0.97, ohr: 0.013, wange: 0.0032, spitze: 1.2, brauen: 0.002 },
  { kiefer: 0.38, kinn: 0.009, nase: 0.0185, breite: 0.97, hoehe: 1.0, tiefe: 0.98, ohr: 0.014, wange: 0.0045, spitze: 1.6, brauen: 0.003 },
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
  // weichere Seiten (Kranich): Kieferwinkel und Ohransatz flacher, sonst 0 (Form unverändert)
  const weich = /** @type {any} */ (v).weich ?? 0;
  // Kiefer und Kinn schmaler als der Schädel
  x *= 1 - v.kiefer * unten ** 2.6;
  // Kieferwinkel: unter den Ohren kantig ausgestellt
  x *= 1 + 0.05 * (1 - 0.8 * weich) * Math.exp(-(((D + 0.55) / 0.18) ** 2)) * (1 - 0.6 * vornWeich(dz));
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
  // Besetzung: schiefe (gebrochene) Nase – Spitze seitlich versetzt, Höcker auf dem Rücken
  const schief = /** @type {any} */ (v).schief ?? 0;
  d += nase(schief ? U - schief * glatt(0.1, -0.34, D) : U, D, v);
  if (schief) d += 0.0022 * g2(U - schief * 0.35, 0.08, D + 0.06, 0.06);
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
  // eingerissenes Ohr (Besetzung): auf dieser Seite nur ein flacher Ansatz, das Ohr ist ein eigenes Formteil
  const riss = /** @type {any} */ (v).ohrRiss ?? 0;
  const ohr = v.ohr * g2(Math.abs(a) - 1.62, 0.13 + 0.07 * weich, D + 0.02, 0.15 + 0.05 * weich) * (1 - 0.45 * weich)
    * (riss && Math.sign(a) === riss ? 0.3 : 1);
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

// ---------- Detailstufe (LOD) ----------
// Innerhalb von `sparsam(() => …)` entstehen alle Formen dieses Moduls mit gröberem Gitter (ferne
// Detailstufe, siehe welt/stufen.js). Kleine Teile (Ohren, Brille, Augenklappe, Mütze) bleiben gleich,
// Knöpfe werden einfachere Kugeln. Außerhalb ist alles unverändert (volle Stufe).
// Kleidung: Rumpf und alles Aufliegende (Weste, Hemd, Revers, Krawatte, Flicken, Gürtel, Knöpfe) liegen
// in der sparsamen Stufe auf DERSELBEN groben Rumpffläche (gemeinsames Raster, `rumpfPunkt`), die
// Zeilen der aufliegenden Teile fallen auf die Rasterzeilen des Rumpfs. So bleibt jede Lage wie in der
// vollen Stufe über der darunter (sonst stach das Hemd stellenweise durch den Rock).
let SPAR = false;
/** Anteil der Gitterspalten/-zeilen in der sparsamen Stufe (Kopf, Ärmel, Rumpf) */
const SPAR_ANTEIL = 0.55;
/** Anteil beim Kopf (mit Haar und Bart): feiner, sonst verrutschen gemalte Augen und Brauen beim Umschalten */
const KOPF_ANTEIL = 0.8;
/** @param {number} n Gitterteilung der vollen Stufe @param {number} [min=3] @param {number} [anteil=SPAR_ANTEIL] */
const teilung = (n, min = 3, anteil = SPAR_ANTEIL) => (SPAR ? Math.max(min, Math.round(n * anteil)) : n);
/** Zeilenabstand des Rumpfs (m): voll, sparsam */
const RUMPF_ZEILE = { voll: 0.032, spar: 0.045 };
/** Spalten des Rumpfs rundum: voll, sparsam */
const RUMPF_SPALTEN = { voll: 26, spar: 18 };

/** @returns {boolean} true innerhalb von `sparsam(…)` (für Formen in anderen Modulen) */
export function istSparsam() {
  return SPAR;
}

/**
 * Baut etwas in der sparsamen Detailstufe (gröberes Gitter für Kopf, Haar, Bart, Hals, Hände, Ärmel, Rumpf und Kleidung).
 * @template T @param {() => T} bau @returns {T}
 */
export function sparsam(bau) {
  return mitStufe(true, bau);
}

/**
 * Baut etwas in der vollen Stufe, auch innerhalb von `sparsam` (z. B. eine Form, an der gemessen wird).
 * @template T @param {() => T} bau @returns {T}
 */
export function vollStufe(bau) {
  return mitStufe(false, bau);
}

/**
 * @template T @param {boolean} spar @param {() => T} bau @returns {T}
 */
function mitStufe(spar, bau) {
  const vorher = SPAR;
  SPAR = spar;
  try {
    return bau();
  } finally {
    SPAR = vorher;
  }
}

/** @type {Map<string, THREE.BufferGeometry>} */
const cache = new Map();
/**
 * @param {string} k @param {() => THREE.BufferGeometry} bau
 */
function gemerkt(k, bau) {
  // Sparsame Stufe getrennt merken (gleicher Schlüssel, gröberes Gitter)
  if (SPAR) k = `spar|${k}`;
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
 * @param {{ schief?: number, ohrRiss?: number } | null} [mehr=null] Entstellungen der Besetzung (schiefe Nase, eingerissenes Ohr)
 */
function form(variante, alt, mehr = null) {
  const grund = VARIANTEN[variante % VARIANTEN.length];
  if (!alt && !mehr) return grund;
  const k = `${variante}|${alt}${mehr ? `|${JSON.stringify(mehr)}` : ''}`;
  let v = variantenMitAlter.get(k);
  if (!v) {
    v = { ...grund, nase: grund.nase * (1 + 0.08 * alt), ohr: grund.ohr * (1 + 0.15 * alt), alt, ...(mehr ?? {}) };
    variantenMitAlter.set(k, v);
  }
  return v;
}

/**
 * Kopfgeometrie (Mitte im Ursprung, Gesicht nach +z) mit uv auf eine Zelle der Gesichtstafel.
 * @param {number} variante @param {number} zelle @param {boolean} fein @param {number} [alt=0]
 * @param {number[] | null} [raster=null] eigenes Gitter [quer, längs] statt fein/grob
 * @param {{ schief?: number, ohrRiss?: number } | null} [mehr=null] siehe form
 */
function kopfGeometrie(variante, zelle, fein, alt = 0, raster = null, mehr = null) {
  return gemerkt(`kopf|${variante}|${zelle}|${fein}${alt ? `|${alt}` : ''}${raster ? `|${raster}` : ''}${mehr ? `|${JSON.stringify(mehr)}` : ''}`, () => {
    const v = form(variante, alt, mehr);
    return gitter(teilung(raster?.[0] ?? (fein ? 40 : 26), 3, KOPF_ANTEIL), teilung(raster?.[1] ?? (fein ? 30 : 20), 3, KOPF_ANTEIL), (s, t) => {
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
 * Frauen (Sitzung B1): Haar über die Ohren nach hinten genommen, Knoten am Hinterkopf (hochgesteckt)
 * bzw. oben auf dem Kopf (dutt), ungepflegt mit losen Strähnen an Schläfen und Nacken.
 * @typedef {'voll' | 'kurz' | 'lang' | 'kranz' | 'scheitel' | 'locken' | 'ecken' | 'licht' | 'unterHut' | 'zerzaust' | 'straehnig'
 *   | 'hochgesteckt' | 'dutt'} HaarStil
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
  // Frauen: Stirn frei, Schläfen und obere Ohrränder bedeckt, Nacken hoch (Haar nach oben genommen)
  hochgesteckt: [[0, 0.55], [0.6, 0.45], [1.15, 0.2], [1.6, 0.03], [2.2, -0.2], [PI, -0.36]],
  dutt: [[0, 0.57], [0.6, 0.47], [1.15, 0.22], [1.6, 0.05], [2.2, -0.16], [PI, -0.32]],
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
  // glatt zurückgekämmt (Rippen laufen zum Scheitelpunkt), aber nicht sauber: etwas wirr; Scheitel mittig
  hochgesteckt: { grund: 0.006, fuelle: 0.007, rippe: 0.0024, zacke: 0.022, wirr: 0.0065, scheitel: 0 },
  dutt: { grund: 0.006, fuelle: 0.009, rippe: 0.0022, zacke: 0.024, wirr: 0.008, scheitel: 0.25 },
};

/**
 * Haarknoten der Frauenfrisuren: Lage auf dem Kopf (Höhe D am Hinterkopf, a = π), Halbachsen (m),
 * Anzahl der Windungen. Dazu lose Strähnen: [Winkel a, Ansatzhöhe D, Länge (in D), Schwung].
 * @type {Record<string, { D: number, r: number[], windungen: number, straehnen: number[][] }>}
 */
const KNOTEN = {
  // am Hinterkopf, eher breit, hoch genug, dass er von vorn über dem Scheitel zu sehen ist; Strähnen an beiden Schläfen und im Nacken
  hochgesteckt: { D: 0.52, r: [0.04, 0.032, 0.03], windungen: 3, straehnen: [[1.2, 0.2, 0.62, 0.6], [-1.25, 0.18, 0.5, -0.8], [2.75, -0.3, 0.42, 0.5], [-2.9, -0.28, 0.36, -0.4]] },
  // oben auf dem Kopf, höher und runder; Strähnen hängen an einer Schläfe und hinten
  dutt: { D: 0.8, r: [0.033, 0.036, 0.03], windungen: 4, straehnen: [[-1.15, 0.22, 0.66, -0.7], [1.3, 0.12, 0.4, 0.5], [2.6, -0.26, 0.48, 0.6], [-2.6, -0.24, 0.44, -0.5]] },
};

/**
 * Haarknoten und lose Strähnen einer Frauenfrisur (Teile mit Strähnen-Farbwerten, wie das übrige Haar).
 * @param {typeof VARIANTEN[0]} v @param {string} stil @param {number} dicke Haardicke über der Haut
 */
function frauenHaarTeile(v, stil, dicke) {
  const k = KNOTEN[stil];
  // Mitte des Knotens: knapp über der Haaroberfläche, entlang der Kopfnormale versetzt
  const basis = aufKopf(v, PI, k.D, dicke);
  const n = basis.clone().normalize();
  const mitte = basis.clone().addScaledVector(n, k.r[2] * 0.75);
  // Achsen des Knotens: e1 quer (x), e2 entlang des Kopfes, e3 = Normale
  const e1 = new THREE.Vector3(1, 0, 0);
  const e3 = n;
  const e2 = new THREE.Vector3().crossVectors(e3, e1).normalize();
  const knoten = gitter(teilung(22, 8, KOPF_ANTEIL), teilung(14, 6, KOPF_ANTEIL), (s, t) => {
    const w = 2 * PI * s;
    const p = PI * t;
    // gewundener Zopf: Wülste entlang der Spirale, dazu Wirrheit (ungepflegt)
    const wulst = 1 + 0.12 * Math.sin(k.windungen * w + 3 * p) + 0.05 * Math.sin(w * 7 + p * 5);
    const r = (q = 1) => Math.sin(p) * wulst * q;
    const x = k.r[0] * r() * Math.cos(w);
    const y = k.r[1] * r() * Math.sin(w);
    // flach zum Kopf hin (Rückseite liegt am Haar an)
    const zc = Math.cos(p);
    const z = k.r[2] * (zc > 0 ? zc : 0.35 * zc) * wulst;
    return [mitte.x + e1.x * x + e2.x * y + e3.x * z, mitte.y + e1.y * x + e2.y * y + e3.y * z, mitte.z + e1.z * x + e2.z * y + e3.z * z];
  }, undefined, (s, t) => [0.82 + 0.18 * Math.sin(2 * PI * s * k.windungen + 3 * PI * t) + 0.08 * Math.sin(s * 53), 0]);
  /** Lose Strähne: flaches Band (elliptischer Querschnitt), vom Ansatz am Kopf entlang nach unten */
  const straehne = (/** @type {number[]} */ [a0, D0, laenge, schwung]) => {
    const nl = teilung(10, 5);
    const nq = 6;
    return gitter(nq, nl, (s, t) => {
      const D = D0 - laenge * t;
      const a = a0 + schwung * 0.18 * Math.sin(t * PI * 1.3) * t;
      // liegt am Kopf an, hängt nur zum Ende hin etwas ab
      const aus = dicke * (1 - 0.6 * t) + 0.0012 + 0.003 * t * t;
      const p = aufKopf(v, a, D, aus);
      const nn = p.clone().normalize();
      const quer = aufKopf(v, a + 0.02, D, aus).sub(p).normalize();
      // fast runder Querschnitt: auch von vorn (Kante) als Strähne zu sehen
      const breite = 0.0075 * (1 - 0.55 * t);
      // gegen den Uhrzeigersinn (von außen gesehen läuft s nach rechts) – sonst zeigen die Dreiecke nach innen
      const w = -2 * PI * s;
      const dx = Math.cos(w) * breite;
      const dn = Math.sin(w) * 0.0042 * (1 - 0.5 * t);
      return [p.x + quer.x * dx + nn.x * dn, p.y + quer.y * dx + nn.y * dn, p.z + quer.z * dx + nn.z * dn];
    }, undefined, (s, t) => [0.85 + 0.15 * Math.sin(s * 2 * PI * 2 + t * 6), 0]);
  };
  return [knoten, ...k.straehnen.map(straehne)];
}

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
    const schale = kopfSchale(v, fein ? 36 : 20, fein ? 9 : 5, (s, t) => {
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
    // Frauenfrisur: Knoten und lose Strähnen in derselben Geometrie (gleiche Farbe, kein eigenes Netz)
    return KNOTEN[stil] ? verbinde([schale, ...frauenHaarTeile(v, stil, haarDicke(stil) * 0.8)]) : schale;
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

// ---------- Merkmale der Besetzung: Entstellungen, Brille, Mütze (Gestaltung, keine belegte Angabe) ----------

/**
 * Merkmale einer Figur. Narben und Pockennarben sind auf die Gesichtstafel gemalt (texturen.js);
 * hier nur, was eine Form braucht.
 * @typedef {object} Merkmale
 * @property {number} [nase] schiefe Nase: seitlicher Versatz der Spitze (etwa ±0,07), mit Höcker
 * @property {-1 | 1} [ohr] eingerissenes Ohr auf dieser Seite (+1 = +x)
 * @property {number} [weich] Kranich (0…1): Kieferwinkel und Ohransatz weicher (runde Wangen, Gesicht gleich)
 * @property {-1 | 1} [klappe] Augenklappe über diesem Auge, Riemen über den Kopf
 * @property {'nickel' | 'monokel'} [brille] Nickelbrille (zwei Ringe, Steg, Bügel) oder Monokel (vor dem Auge bei +x)
 * @property {Stoff} [metall] Farbe der Fassung
 * @property {Stoff} [leder] Farbe von Augenklappe und Riemen
 */

/** Winkel auf (−π, π] bringen */
const winkelNorm = (/** @type {number} */ a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Punkt auf dem Kopf zu (a, D), nach außen versetzt um `aus`.
 * @param {typeof VARIANTEN[0]} v @param {number} a @param {number} D @param {number} [aus=0]
 */
function aufKopf(v, a, D, aus = 0) {
  const [x, y, z] = kopfPunkt(winkelNorm(a), Math.acos(Math.max(-1, Math.min(1, D))), v);
  const f = (Math.hypot(x, y, z) + aus) / Math.hypot(x, y, z);
  return new THREE.Vector3(x * f, y * f, z * f);
}

/**
 * Eingerissenes Ohr: flache Muschel mit Kerbe hinten oben, Außenseite nach +x (seite −1: gespiegelt).
 * @param {number} seite @param {number} zelle
 */
function ohrGeometrie(seite, zelle) {
  return gemerkt(`ohrRiss|${seite}|${zelle}`, () => einfarbigUV(gitter(18, 8, (s, t) => {
    const th = 2 * PI * (seite > 0 ? 1 - s : s);
    const ph = PI * t;
    const kerbe = 1 - 0.55 * Math.exp(-(((th - 2.25) / 0.22) ** 2));
    const r = kerbe * Math.sin(ph);
    const hz = 0.0165 * (1 - 0.3 * Math.max(0, -Math.sin(th)));
    // Rand (Krempe) dicker, Muschel innen eingesenkt, Rückseite flach am Kopf
    const c = Math.cos(ph);
    const x = 0.004 * Math.sin(ph) ** 6 + (c > 0 ? 0.0015 : 0.0025) * c;
    return [seite * x, 0.029 * r * Math.sin(th), hz * r * Math.cos(th)];
  }), hautUV(zelle)));
}

/**
 * Größte Dicke einer Frisur (für Riemen, die über das Haar laufen).
 * @param {HaarStil | null} stil
 */
function haarDicke(stil) {
  if (!stil) return 0;
  if (stil === 'kranz') return 0.0075;
  const f = FRISUR[stil] ?? FRISUR.voll;
  return 0.0012 + f.grund + f.fuelle + f.rippe + (f.wirr ?? 0) + (f.locken ?? 0);
}

/**
 * Augenklappe mit Riemen: Klappe über der Augenhöhle, ein Riemen schräg über die Stirn,
 * einer über dem Ohr um den Hinterkopf; beide treffen sich hinter der anderen Schläfe.
 * @param {typeof VARIANTEN[0]} v @param {number} seite @param {HaarStil | null} stil
 */
function klappeGeometrie(v, seite, stil) {
  const hd = haarDicke(stil);
  const ansatz = stil && stil !== 'kranz' ? /** @type {number[][]} */ (/** @type {any} */ (HAARANSATZ_NEU)[stil] ?? HAARANSATZ.voll) : null;
  /** Abstand über der Haut: auf dem Haar dicker */
  const dicke = (/** @type {number} */ a, /** @type {number} */ D) => {
    if (!stil) return 0.0022;
    const dl = ansatz ? kurve(ansatz, Math.abs(winkelNorm(a))) : 0.12;
    return 0.0022 + hd * glatt(dl - 0.03, dl + 0.08, D);
  };
  const ua = Math.asin(0.41) * seite;
  // Klappe: Scheibe um die Augenmitte (U ±0,19, D ±0,13), in der Mitte gewölbt
  const klappe = gitter(18, 4, (s, t) => {
    const w = 2 * PI * s;
    const U = seite * 0.41 + 0.19 * t * Math.cos(w);
    const D = 0.06 + 0.13 * t * Math.sin(w);
    const p = aufKopf(v, Math.asin(U), D, 0.0022 + 0.0065 * (1 - t * t));
    return [p.x, p.y, p.z];
  }, undefined, (s, t) => [0.75 + 0.25 * (1 - t), 0]);
  /**
   * Riemen entlang a von a0 nach a1, Höhe D(q) (q = 0…1), Breite 0,07 in D.
   * @param {number} a0 @param {number} a1 @param {(q: number) => number} Dq
   */
  const riemen = (a0, a1, Dq) => {
    const r = Math.sign(a1 - a0);
    return gitter(34, 2, (s, t) => {
      const a = a0 + (a1 - a0) * s;
      const D = Dq(s) + (r > 0 ? 0.5 - t : t - 0.5) * 0.07;
      const p = aufKopf(v, a, D, dicke(a, D) + 0.0008);
      return [p.x, p.y, p.z];
    }, undefined, (s, t) => [t > 0.01 && t < 0.99 ? 1 : 0.8, 0]);
  };
  const ende = -seite * 1.75;
  return verbinde([
    klappe,
    // über die Stirn steil nach oben zur anderen Seite
    riemen(ua - seite * 0.12, ende, (q) => 0.17 + 0.36 * (1 - (1 - q) ** 2.5)),
    // vom äußeren Rand über das Ohr um den Hinterkopf
    riemen(ua + seite * 0.22, seite * (2 * PI - 1.75), (q) => 0.08 + 0.45 * (1 - (1 - q) ** 2)),
  ]);
}

/**
 * Nickelbrille (Ringe, Steg, Bügel bis hinter die Ohren) oder Monokel (Ring vor dem Auge bei +x).
 * Ohne Gläser. Alle Teile mit Index, Normalen und uv (für das gemeinsame Vertex-Farben-Material).
 * @param {typeof VARIANTEN[0]} v @param {'nickel' | 'monokel'} art
 */
function brillenGeometrie(v, art) {
  const ea = Math.asin(0.41);
  const auge = aufKopf(v, ea, 0.05);
  const braue = aufKopf(v, ea, 0.2);
  const wange = aufKopf(v, ea, -0.12);
  if (art === 'monokel') {
    // klemmt zwischen Braue und Wange in der Augenhöhle
    const ring = new THREE.TorusGeometry(0.0155, 0.0016, 6, 24);
    ring.translate(auge.x, auge.y, braue.z - 0.002);
    return ring;
  }
  const r = 0.0165;
  const z = Math.max(braue.z, wange.z) + 0.004;
  /** @type {THREE.BufferGeometry[]} */
  const teile = [];
  for (const s of [-1, 1]) {
    const ring = new THREE.TorusGeometry(r, 0.0011, 5, 22);
    ring.translate(s * auge.x, auge.y, z);
    teile.push(ring);
    const buegel = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * (auge.x + r), auge.y, z),
      aufKopf(v, s * 0.95, 0.09, 0.004), aufKopf(v, s * 1.25, 0.09, 0.0045),
      aufKopf(v, s * 1.55, 0.1, 0.0045), aufKopf(v, s * 1.78, -0.02, 0.003),
    ]);
    teile.push(new THREE.TubeGeometry(buegel, 16, 0.001, 4, false));
  }
  const xi = auge.x - r;
  const steg = new THREE.CatmullRomCurve3([new THREE.Vector3(-xi, auge.y, z), new THREE.Vector3(0, auge.y + 0.005, z + 0.004), new THREE.Vector3(xi, auge.y, z)]);
  teile.push(new THREE.TubeGeometry(steg, 6, 0.001, 4, false));
  return /** @type {THREE.BufferGeometry} */ (mergeGeometries(teile));
}

/** Rand der Schiebermütze (Höhe D) über |a| */
const MUETZE_RAND = [[0, 0.5], [1.2, 0.42], [2.0, 0.33], [PI, 0.3]];

/**
 * Schiebermütze: flacher, nach vorn überstehender Deckel und kurzer Schirm (doppelt, damit von
 * oben und unten sichtbar). Haar darunter: Frisur 'unterHut'.
 * @param {typeof VARIANTEN[0]} v
 */
function muetzeGeometrie(v) {
  const deckel = kopfSchale(v, 24, 6, (s, t) => {
    const a = PI * (2 * s - 1);
    return [a, 1 - t * (1 - kurve(MUETZE_RAND, Math.abs(a)))];
  }, (s, t) => {
    const vorn = glatt(1.7, 0.3, Math.abs(PI * (2 * s - 1)));
    return 0.0075 + 0.013 * vorn * Math.sin(PI * Math.min(1, t * 1.25)) ** 0.8 + 0.003 * Math.sin(PI * t);
  }, (s, t) => [0.92 + 0.06 * Math.sin(s * 70 + t * 3) + 0.1 * (1 - t), 0]);
  /** Schirm: s quer (a), t vom Rand nach außen; `unten` = Unterseite (gespiegelte Laufrichtung) */
  const schirm = (/** @type {boolean} */ unten) => gitter(12, 2, (s, t) => {
    const a = 0.9 * (unten ? 1 - 2 * s : 2 * s - 1);
    const b = aufKopf(v, a, kurve(MUETZE_RAND, Math.abs(a)) + 0.02, 0.0075);
    const l = Math.hypot(b.x, b.z);
    const lang = 0.05 * Math.max(0, Math.cos((a / 0.9) * (PI / 2))) ** 0.4;
    return [b.x + (b.x / l) * lang * t, b.y - 0.014 * t - (unten ? 0.0022 : 0), b.z + (b.z / l) * lang * t];
  }, undefined, () => [unten ? 0.7 : 0.9, 0]);
  return verbinde([deckel, schirm(false), schirm(true)]);
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
 * @param {Merkmale | null} [o.merkmale=null] Entstellungen und Brille (Besetzung)
 * @param {Stoff | null} [o.muetze=null] Schiebermütze in dieser Farbe (Haar dann als 'unterHut' angeben)
 * @returns {THREE.Group}
 */
export function kopf({ haut, zelle = 0, variante = 0, fein = true, haar = null, haarStil = 'voll', bart = 'keiner', bartMaterial = null, alter = 0, raster = null, merkmale = null, muetze = null }) {
  const g = new THREE.Group();
  const mk = merkmale ?? {};
  /** @type {{ schief?: number, ohrRiss?: number, weich?: number } | null} */
  const mehr = mk.nase || mk.ohr || mk.weich
    ? { ...(mk.nase ? { schief: mk.nase } : {}), ...(mk.ohr ? { ohrRiss: mk.ohr } : {}), ...(mk.weich ? { weich: mk.weich } : {}) }
    : null;
  g.add(new THREE.Mesh(kopfGeometrie(variante, zelle, fein, alter, raster, mehr), haut));
  if (haar) {
    const geo = istFarbe(haar)
      ? haarGeometrieNeu(variante, haarStil, fein, alter)
      : haarGeometrie(variante, /** @type {'voll' | 'kurz' | 'lang' | 'kranz'} */ (haarStil), fein);
    g.add(stoffMesh(geo, haar));
  }
  const bm = bartMaterial ?? haar;
  if (bart !== 'keiner' && bm) g.add(stoffMesh(bartGeometrie(variante, bart, fein, alter), bm));
  const v = form(variante, alter, mehr);
  const schluessel = `${variante}|${alter}|${JSON.stringify(mehr)}`;
  if (mk.ohr) {
    const o = new THREE.Mesh(ohrGeometrie(mk.ohr, zelle), haut);
    const p = aufKopf(v, mk.ohr * 1.62, 0.03);
    o.position.set(p.x + mk.ohr * 0.002, p.y, p.z - 0.002);
    o.rotation.set(-0.25, -mk.ohr * 0.35, 0);
    g.add(o);
  }
  if (mk.klappe && mk.leder) {
    const stil = haar ? haarStil : null;
    g.add(stoffMesh(gemerkt(`klappe|${schluessel}|${mk.klappe}|${stil}`, () => klappeGeometrie(v, mk.klappe ?? 1, stil)), mk.leder));
  }
  if (mk.brille && mk.metall) {
    g.add(stoffMesh(gemerkt(`brille|${schluessel}|${mk.brille}`, () => brillenGeometrie(v, mk.brille ?? 'nickel')), mk.metall));
  }
  if (muetze) g.add(stoffMesh(gemerkt(`muetze|${schluessel}`, () => muetzeGeometrie(v)), muetze));
  return g;
}

/**
 * Hals (Zylinder, einfarbige Haut der Zelle), Mitte im Ursprung, 0,13 m hoch.
 * @param {THREE.Material} haut @param {number} [zelle=0]
 */
export function hals(haut, zelle = 0) {
  const geo = gemerkt(`hals|${zelle}`, () => einfarbigUV(new THREE.CylinderGeometry(0.055, 0.06, 0.13, SPAR ? 10 : 14, 1), hautUV(zelle)));
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
      // sparsame Stufe: Handfläche 8, Finger 5 Teilungen
      if (SPAR) fein = fein > 8 ? 8 : 5;
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
    const g = SPAR ? new THREE.SphereGeometry(1, 8, 6) : new THREE.SphereGeometry(1, 12, 8);
    g.scale(0.042, 0.1, 0.034);
    return einfarbigUV(g, hautUV(zelle));
  });
  return new THREE.Mesh(geo, haut);
}

// ---------- Arme ----------

const KUGEL_GEO = { voll: new THREE.SphereGeometry(1, 14, 10), spar: new THREE.SphereGeometry(1, 10, 7) };
const KNOPF_GEO = { voll: new THREE.SphereGeometry(1, 8, 6), spar: new THREE.SphereGeometry(1, 5, 4) };
const MANSCHETTE_GEO = { voll: new THREE.CylinderGeometry(0.041, 0.041, 0.02, 14, 1), spar: new THREE.CylinderGeometry(0.041, 0.041, 0.02, 10, 1) };/** Geteilte Grundformen der aktuellen Stufe */
const stufenForm = (/** @type {{ voll: THREE.BufferGeometry, spar: THREE.BufferGeometry }} */ f) => (SPAR ? f.spar : f.voll);
/** Winkel des Halstuch-Knotens um den Rumpf (vorn 0): seitlich, damit das Tuch nicht wie eine Krawatte wirkt */
const TUCH_KNOTEN = 0.32;

/**
 * Ärmel als Röhre entlang einer Kurve mit abnehmendem Radius.
 * @param {THREE.Vector3[]} punkte @param {number[]} radien je Punkt
 */
function aermelGeometrie(punkte, radien) {
  const weg = new THREE.CatmullRomCurve3(punkte);
  const lang = teilung(12);
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  const tang = new THREE.Vector3();
  const mitte = new THREE.Vector3();
  // rundum in beiden Stufen 12 Kanten: gleicher Querschnitt am Handgelenk wie die Manschette erwartet
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
 * @param {number} [o.krempel=0] hochgekrempelter Ärmel (Besetzung): Anteil des Unterarms, ab dem die
 *   Haut zu sehen ist (z. B. 0,45); 0 = Ärmel bis zum Handgelenk
 * @param {number[]} [o.radien] Ärmelradien an Schulter, Ellbogen, Handgelenk (vor `dicke`);
 *   Besetzung: schlanker und stärker verjüngt. Schulterkugel, Manschette und Umschlag passen sich an.
 * @param {number} [o.handGroesse=1] Größe der Hand (Besetzung: kleiner)
 * @returns {{ gruppe: THREE.Group, hand: THREE.Mesh }}
 */
export function arm({ stoff, haut, zelle, seite, schulter, ellbogen, handgelenk, manschette = null, dicke = 1, kugel: kg = 1, krempel = 0,
  radien = [0.052, 0.047, 0.041], handGroesse = 1 }) {
  const g = new THREE.Group();
  const p = [schulter, ellbogen, handgelenk].map((w) => new THREE.Vector3(...w));
  const [r0, r1, r2] = radien.map((r) => r * dicke);
  // Manschette (Grundmaß 0,041) im Verhältnis zum Ärmel am Handgelenk
  const km = r2 / 0.041;
  if (krempel > 0) {
    // Ärmel bis zur Mitte des Unterarms, dort ein dicker Umschlag, darunter Haut
    const mitte = p[1].clone().lerp(p[2], krempel);
    g.add(stoffMesh(aermelGeometrie([p[0], p[1], mitte], [r0, r1, r1 * 0.98]), stoff, true));
    const unterarm = einfarbigUV(aermelGeometrie([mitte, p[2]], [r2 * 0.88, r2 * 0.76]), hautUV(zelle));
    g.add(new THREE.Mesh(unterarm, haut));
    const um = stoffMesh(stufenForm(MANSCHETTE_GEO), stoff);
    um.position.copy(mitte);
    um.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), p[2].clone().sub(p[1]).normalize());
    const ku = (1.2 * r1) / 0.047;
    um.scale.set(ku, 1.6, ku);
    g.add(um);
  } else {
    g.add(stoffMesh(aermelGeometrie(p, [r0, r1, r2]), stoff, true));
  }
  const kugel = stoffMesh(stufenForm(KUGEL_GEO), stoff);
  const kk = (kg * r0) / 0.052;
  kugel.scale.set(0.05 * kk, 0.042 * kk, 0.054 * kk);
  kugel.position.copy(p[0]).add(new THREE.Vector3(0, -0.01, 0));
  g.add(kugel);
  const richtung = p[2].clone().sub(p[1]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), richtung);
  if (manschette) {
    // beide Stufen gleich (wie der Ärmelquerschnitt): die Ecken der Manschette stechen leicht durch den
    // Ärmel; gröber stäche sie an anderen Stellen durch (heller Fleck beim Umschalten)
    const m = stoffMesh(MANSCHETTE_GEO.voll, manschette);
    m.position.copy(p[2]).addScaledVector(richtung, -0.004);
    m.quaternion.copy(q);
    m.scale.set(km, 1, km);
    g.add(m);
  }
  const h = hand(haut, seite, zelle);
  h.position.copy(p[2]).addScaledVector(richtung, 0.004);
  h.quaternion.copy(q);
  h.scale.setScalar(handGroesse);
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
  if (!SPAR) return rumpfPunktGlatt(profil, th, y, aus);
  // Sparsame Stufe: Punkt auf der groben Rumpffläche (dieselben Dreiecke wie rumpfGeometrie),
  // versetzt entlang der Normale der glatten Fläche
  const { y0, y1, reihen, spalten } = grobRaster(profil);
  if (y > y1 || y < y0) return rumpfPunktGlatt(profil, th, y, aus);
  // Winkel auf −π … π, Lage im Raster: Spalte (th = π(2s − 1)), Zeile von oben
  const w = ((((th / PI + 1) % 2) + 2) % 2) - 1;
  const fu = ((w + 1) / 2) * spalten;
  const fv = ((y1 - y) / (y1 - y0)) * reihen;
  const i = Math.min(spalten - 1, Math.floor(fu));
  const j = Math.min(reihen - 1, Math.floor(fv));
  const u = fu - i;
  const v = fv - j;
  const ecke = (/** @type {number} */ di, /** @type {number} */ dj) =>
    rumpfPunktGlatt(profil, PI * ((2 * (i + di)) / spalten - 1), y1 - ((j + dj) / reihen) * (y1 - y0));
  // Dreiecksteilung wie in gitter(): (a, c, a+1) für u + v ≤ 1, sonst (a+1, c, c+1)
  /** @type {number[]} */
  let p;
  const b = ecke(1, 0);
  const c = ecke(0, 1);
  if (u + v <= 1) {
    const a = ecke(0, 0);
    p = [0, 1, 2].map((k) => a[k] + u * (b[k] - a[k]) + v * (c[k] - a[k]));
  } else {
    const d = ecke(1, 1);
    p = [0, 1, 2].map((k) => d[k] + (1 - u) * (c[k] - d[k]) + (1 - v) * (b[k] - d[k]));
  }
  if (aus) {
    const g = rumpfPunktGlatt(profil, th, y, 0);
    const n = rumpfPunktGlatt(profil, th, y, 1);
    for (const k of [0, 2]) p[k] += aus * (n[k] - g[k]);
  }
  return p;
}

/**
 * Raster der groben Rumpffläche (sparsame Stufe), gemeinsam für Rumpf und alles Aufliegende.
 * @param {Profil} profil
 */
function grobRaster(profil) {
  const y0 = profil[0][0];
  const y1 = profil[profil.length - 1][0];
  return { y0, y1, reihen: Math.max(8, Math.round((y1 - y0) / RUMPF_ZEILE.spar)), spalten: RUMPF_SPALTEN.spar };
}

/**
 * Höhen der Zeilen eines aufliegenden Teils von yo nach yu: gleichmäßig, `schritt` Abstand, mindestens
 * `min` Zeilen. Sparsam zusätzlich die Rasterzeilen des groben Rumpfs, damit das Teil nicht über eine
 * Kante der groben Fläche gespannt wird und in sie einsinkt (die eigenen Zeilen halten die Umrisse
 * der Teile, z. B. geschwungene Ränder, wie in der vollen Stufe).
 * @param {Profil} profil @param {number} yu @param {number} yo @param {number} schritt @param {number} min
 * @returns {number[]}
 */
function zeilen(profil, yu, yo, schritt, min) {
  const nt = Math.max(min, Math.round((yo - yu) / schritt));
  const ys = Array.from({ length: nt + 1 }, (_, j) => yo - (j / nt) * (yo - yu));
  if (!SPAR) return ys;
  const { y0, y1, reihen } = grobRaster(profil);
  for (let k = 0; k <= reihen; k++) {
    const y = y1 - (k / reihen) * (y1 - y0);
    // nur Rasterzeilen, die nicht (fast) auf einer eigenen Zeile liegen
    if (y < yo && y > yu && ys.every((z) => Math.abs(z - y) > 0.002)) ys.push(y);
  }
  return ys.sort((a, b) => b - a);
}

/**
 * Punkt auf der glatten Rumpffläche (volle Stufe), siehe rumpfPunkt.
 * @param {Profil} profil @param {number} th @param {number} y @param {number} [aus=0]
 * @returns {number[]}
 */
function rumpfPunktGlatt(profil, th, y, aus = 0) {
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
 * @param {number} [abgetragen=0] Besetzung: fleckige, ausgeblichene Vertex-Farben (0…1)
 */
function rumpfGeometrie(profil, untenZu, abgetragen = 0, falten = null) {
  const y0 = profil[0][0];
  const y1 = profil[profil.length - 1][0];
  // sparsam: grobes Raster (gemeinsam mit allem Aufliegenden, siehe rumpfPunkt)
  const reihen = SPAR ? grobRaster(profil).reihen : Math.max(8, Math.round((y1 - y0) / RUMPF_ZEILE.voll));
  const spalten = SPAR ? grobRaster(profil).spalten : RUMPF_SPALTEN.voll;
  // Zeile 0: Deckel oben, dann von oben nach unten, ggf. Deckel unten
  const nt = reihen + 1 + (untenZu ? 1 : 0);
  /** Höhe einer Zeile (ohne Deckel) */
  const yBei = (/** @type {number} */ t) => y1 - ((Math.round(t * nt) - 1) / reihen) * (y1 - y0);
  /**
   * Falten im Schoß (Kranich): jede zweite Spalte leicht nach innen, zum Saum hin tiefer, vorn glatt.
   * Gleiches Muster in beiden Stufen (Spaltenwechsel), nur so tief, dass die Fleckprüfung nicht anschlägt.
   */
  const falte = (/** @type {number} */ s, /** @type {number} */ t) => {
    if (!falten) return 0;
    const y = yBei(t);
    const th = PI * (2 * s - 1);
    const tief = falten.tiefe * glatt(falten.oben, y0, y) * glatt(falten.vorn, falten.vorn + 0.5, Math.abs(th));
    return Math.round(s * spalten) % 2 ? tief : 0;
  };
  /**
   * Kranich (Runde 2, optional in `falten`): Schulterblätter leicht gewölbt, flache Rückenrinne
   * (nur hinten, vorn liegt nichts darauf), Wert nach außen in Metern
   */
  const ruecken = (/** @type {number} */ th, /** @type {number} */ y) => {
    if (!falten?.ruecken) return 0;
    const a = Math.abs(th);
    return falten.ruecken * (g2(a - (PI - 0.62), 0.32, y - 1.4, 0.075) - 0.45 * g2(a - PI, 0.16, y - 1.28, 0.2));
  };
  /** Saum: hinten tiefer, an Seiten und Rücken leicht gewellt (vorn gerade, dort liegt die Rockkante auf) */
  const saumY = (/** @type {number} */ th) => {
    if (!falten?.saum) return 0;
    const a = Math.abs(th);
    return -falten.saum.hinten * glatt(0.9, PI, a) - falten.saum.welle * Math.sin(7 * a) * glatt(0.8, 1.4, a);
  };
  /** @type {FarbFn | undefined} */
  const farbFn = abgetragen || falten
    ? (s, t) => [(1 + abgetragen * (0.08 * Math.sin(s * 19 + t * 7) * Math.sin(t * 13 + s * 3) + 0.05 * Math.sin(s * 41 + t * 29) + 0.06 * glatt(0.3, 0, t) - 0.05 * glatt(0.6, 1, t)))
      * (falten ? 1 - (falte(s, t) / falten.tiefe) * falten.dunkel : 1), 0]
    : undefined;
  return gitter(spalten, nt, (s, t) => {
    const j = Math.round(t * nt);
    const th = PI * (2 * s - 1);
    if (j === 0) return [0, y1, profilBei(profil, y1)[2]];
    if (untenZu && j === nt) return [0, y0, profilBei(profil, y0)[2]];
    const y = yBei(t);
    const p = rumpfPunktGlatt(profil, th, y, ruecken(th, y) - falte(s, t));
    // unterste Zeile = Saum
    if (j === reihen + 1) p[1] += saumY(th);
    return p;
  }, undefined, farbFn);
}

/**
 * Ausschnitt eines Profils zwischen y0 und y1 (Endpunkte eingefügt), optional verkleinert.
 * @param {Profil} profil @param {number} y0 @param {number} y1 @param {number} [k=1] Faktor für Breite und Tiefe
 * @returns {Profil}
 */
function profilZwischen(profil, y0, y1, k = 1) {
  const punkt = (/** @type {number} */ y) => {
    const [hw, hd, zo] = profilBei(profil, y);
    return profil[0].length > 4 ? [y, hw, hd, zo, rundBei(profil, y)] : [y, hw, hd, zo];
  };
  const innen = profil.filter((p) => p[0] > y0 + 1e-6 && p[0] < y1 - 1e-6);
  return [punkt(y0), ...innen, punkt(y1)].map((p) => [p[0], p[1] * k, p[2] * k, ...p.slice(3)]);
}

/**
 * Aufliegendes Stück Stoff auf dem Rumpf (Weste, Revers, Hemd, Krawatte, Gürtel).
 * @param {Profil} profil @param {number} yu @param {number} yo
 * @param {(y: number) => number[]} bereich Winkelbereich [th0, th1] in Höhe y
 * @param {number} aus Abstand zur Rumpfoberfläche
 * @param {number} [ns=8]
 * @param {FarbFn} [farbFn]
 */
function flicken(profil, yu, yo, bereich, aus, ns = 8, farbFn) {
  const ys = zeilen(profil, yu, yo, 0.025, 3);
  const nt = ys.length - 1;
  return gitter(ns, nt, (s, t) => {
    const y = ys[Math.round(t * nt)];
    const [a, b] = bereich(y);
    return rumpfPunkt(profil, a + (b - a) * s, y, aus);
  }, undefined, farbFn);
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
  const ys = zeilen(profil, unten, vOben, 0.016, 6);
  const nt = ys.length - 1;
  /** @type {THREE.BufferGeometry[]} */
  const teile = [];
  for (const sx of [-1, 1]) {
    // s läuft mit x (Außenseite nach außen); innen (am V) 0, außen 1
    const innen = (/** @type {number} */ s) => (sx > 0 ? s : 1 - s);
    teile.push(gitter(6, nt, (s, t) => {
      const y = ys[Math.round(t * nt)];
      const k = innen(s);
      const x = sx * (w(y) + lw(y) * k);
      return rumpfPunkt(profil, winkelBei(profil, y, x), y, 0.006 + 0.0045 * Math.sin(PI * k));
    }, undefined, (s) => [0.5 + 1.0 * Math.sin(PI * innen(s)) ** 0.7, 0]));
  }
  // Rockkragen: steht hinten und seitlich um den Hals, unten auf der Schulter
  const th0 = PI * 0.42;
  const kragen = (/** @type {number} */ aus, /** @type {boolean} */ innenSeite) => gitter(teilung(18, 12), 3, (s, t) => {
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
 * Besetzung (Kleidung nach Stand): kurze Jacke (saum), Hemdsärmel mit Weste (schulter), Kittel (passe),
 * Halstuch statt Krawatte (binder 'tuch'), Rollkragen, abgetragene Farben und aufgesetzte Flicken.
 * @param {object} o
 * @param {Profil} o.profil
 * @param {Stoff} o.rock Rock, Jacke, Weste, Kittel oder Pullover – was außen am Rumpf liegt
 * @param {boolean} [o.untenZu=false]
 * @param {{ unten: number, breite: number, weste: Stoff, hemd: Stoff,
 *   krawatte: Stoff, knopf: Stoff, rockKnoepfe?: number }} [o.ausschnitt]
 * @param {Stoff | null} [o.kragen=null] Hemdkragen am Hals (bei 'roll'/'tuch': Pullover bzw. Halstuch)
 * @param {number} [o.schnitt=1] 1 wie Feinschliff C; 2 (Besetzung) deutliches Revers mit Kerbe und Rockkragen
 * @param {boolean} [o.revers=true] false: kein Revers (Weste, Kittel)
 * @param {'krawatte' | 'tuch' | 'offen' | 'keiner'} [o.binder='krawatte'] Halstuch: Knoten seitlich, kurze Zipfel;
 *   offen/keiner: keine Halsbinde (im V-Ausschnitt nur das Hemd)
 * @param {'steh' | 'roll' | 'tuch' | 'offen' | 'hoch'} [o.kragenForm='steh'] offen: Hemdkragen mit Lücke vorn; hoch: Stehkragen der Frauentaille
 * @param {number} [o.abgetragen=0] fleckig, ausgeblichen (0…1)
 * @param {number | null} [o.saum=null] Unterkante des Rocks, wenn höher als das Profil (kurze Jacke, Weste)
 * @param {Stoff | null} [o.unterteil=null] Hose zwischen Saum und Beinen
 * @param {Stoff | null} [o.schulter=null] Hemd über den Schultern (Weste ohne Ärmel)
 * @param {Stoff | null} [o.passe=null] Naht der Kittelpasse (Band rund um die Brust)
 * @param {boolean} [o.knoepfeMitte=false] Rockknöpfe einreihig auf der Mitte (Weste)
 * @param {Array<{ stoff: Stoff, y: number, th: number, b?: number, h?: number }>} [o.flecken=[]] aufgesetzte Flicken
 * @param {{ stoff: Stoff, anzahl: number } | null} [o.knopfleiste=null] Frauen (B1): Knopfreihe der Taille vom Hals abwärts
 * @param {{ stoff: Stoff, oben: number, breite: number, streifen?: boolean, unten?: number, rockBreite?: number,
 *   taille?: number, band?: boolean } | null} [o.schuerze=null] Latzschürze bis `oben`; Ganzfigur (B2): ab `unten`,
 *   unter `taille` halb `rockBreite` breit, `band` = Schürzenband mit Knoten hinten
 * @param {{ stoff: Stoff, tiefe: number } | null} [o.schultertuch=null] Tuch um die Schultern, vorn gekreuzt und geknotet
 * @param {{ oben: number, tiefe: number, vorn: number, dunkel: number, ruecken?: number,
 *   saum?: { hinten: number, welle: number } } | null} [o.falten=null] Kranich: leichte Falten; optional
 *   gewölbte Schulterblätter (`ruecken`, m) und ein Saum, der hinten tiefer liegt und leicht gewellt ist
 *   im Schoß unter `oben`, `tiefe` (m) am Saum, vorn bis Winkel `vorn` glatt, Faltentäler um `dunkel` dunkler
 * @returns {THREE.Group}
 */
export function oberkoerper({ profil: grundProfil, rock, untenZu = false, ausschnitt, kragen = null, schnitt = 1,
  revers = true, binder = 'krawatte', kragenForm = 'steh', abgetragen = 0, saum = null, unterteil = null, schulter = null, passe = null, knoepfeMitte = false, flecken = [],
  knopfleiste = null, schuerze = null, schultertuch = null, falten = null }) {
  const g = new THREE.Group();
  const oben = grundProfil[grundProfil.length - 1][0];
  const profil = saum !== null && saum > grundProfil[0][0] ? profilZwischen(grundProfil, saum, oben) : grundProfil;
  const schluessel = JSON.stringify(profil) + untenZu;
  const fs = falten ? JSON.stringify(falten) : '';
  g.add(stoffMesh(gemerkt(`rumpf|${schluessel}|${abgetragen}${fs}`, () => rumpfGeometrie(profil, untenZu || profil !== grundProfil, abgetragen, falten)), rock));
  if (profil !== grundProfil && unterteil && saum !== null) {
    // Hose: vom Schritt bis knapp über den Saum, etwas schmaler als der Rock
    const roh = profilZwischen(grundProfil, Math.max(grundProfil[0][0], 0.74), saum + 0.05, 0.975);
    // nach unten nicht breiter als oben: die Hose folgt nicht dem ausgestellten Rockschoß
    // und zum Schritt hin schmaler und flacher, damit dort keine Stufe zu den Beinen entsteht
    const [yo, bo, to] = roh[roh.length - 1];
    const yu = roh[0][0];
    const hose = roh.map((p) => {
      const k = Math.min(1, (p[0] - yu) / (0.6 * (yo - yu)));
      return [p[0], Math.min(p[1], bo) * (0.88 + 0.12 * k), Math.min(p[2], to) * (0.68 + 0.32 * k), ...p.slice(3)];
    });
    g.add(stoffMesh(gemerkt(`hose|${JSON.stringify(hose)}`, () => rumpfGeometrie(hose, true)), unterteil));
  }
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
    g.add(stoffMesh(teile.weste, weste), stoffMesh(teile.hemd, hemd));
    if (revers) {
      const rv = schnitt === 2 ? gemerkt(`revers2|${schluessel}|${unten}|${breite}`, () => reversGeometrie(profil, unten, vOben, oben, w)) : teile.revers;
      g.add(stoffMesh(rv, rock));
    }
    if (binder === 'krawatte') g.add(stoffMesh(teile.krawatte, krawatte));
    if (binder === 'offen' || binder === 'keiner') {
      // ohne Halsbinde: Hemd bis zum Hals, sonst ist zwischen V und Kragen der Rumpf (Rockfarbe) zu sehen
      const hb = 0.9 * w(vOben) + 0.004;
      const ho = gemerkt(`hemdOben|${schluessel}|${unten}|${breite}`, () => flicken(profil, vOben - 0.01, oben + 0.004,
        (y) => [winkelBei(profil, y, -hb), winkelBei(profil, y, hb)], 0.0045, 3));
      g.add(stoffMesh(ho, hemd));
    }
    if (binder === 'tuch') {
      // Halstuch: Knoten seitlich am Hals, zwei kurze Zipfel schräg nach außen (keine Krawattenform in der Mitte)
      const enden = gemerkt(`tuchEnden2|${schluessel}`, () => verbinde([
        flicken(profil, vOben - 0.065, vOben, (y) => {
          const q = (vOben - y) / 0.065;
          const m = TUCH_KNOTEN + 0.3 * q;
          return [m - 0.04 - 0.02 * q, m + 0.04 + 0.02 * q];
        }, 0.0068, 3, (s, t) => [0.9 + 0.1 * Math.sin(s * 9 + t * 4), 0]),
        flicken(profil, vOben - 0.045, vOben, (y) => {
          const q = (vOben - y) / 0.045;
          const m = TUCH_KNOTEN - 0.02 + 0.1 * q;
          return [m - 0.035 - 0.015 * q, m + 0.035 + 0.015 * q];
        }, 0.0062, 3, (s, t) => [0.85 + 0.1 * Math.sin(s * 7 + t * 5), 0]),
      ]));
      g.add(stoffMesh(enden, krawatte));
    }
    // Westenknöpfe auf der Mittellinie, Rockknöpfe unter dem V (zweireihig oder auf der Mitte)
    for (let i = 0; i < 3; i++) {
      const y = unten + 0.02 + i * ((hemdAb - unten - 0.02) / 3);
      const k = stoffMesh(stufenForm(KNOPF_GEO), knopf);
      k.scale.setScalar(0.0055);
      k.position.set(...rumpfPunkt(profil, 0, y, 0.0045));
      g.add(k);
    }
    for (let i = 0; i < rockKnoepfe; i++) {
      for (const sx of knoepfeMitte ? [0] : [-1, 1]) {
        const y = unten - 0.035 - i * (knoepfeMitte ? 0.06 : 0.1);
        if (y < profil[0][0] + 0.02) continue;
        const k = stoffMesh(stufenForm(KNOPF_GEO), knopf);
        k.scale.setScalar(knoepfeMitte ? 0.006 : 0.008);
        k.position.set(...rumpfPunkt(profil, winkelBei(profil, y, sx * 0.05), y, 0.002));
        g.add(k);
      }
    }
    if (binder === 'krawatte' || binder === 'tuch') {
      // Krawattenknoten mittig bzw. dicker Knoten des Halstuchs seitlich
      // Knoten (bis 4 cm groß) auch in der sparsamen Stufe mit voller Kugel
      const knoten = stoffMesh(KNOPF_GEO.voll, krawatte);
      if (binder === 'tuch') knoten.scale.set(0.02, 0.017, 0.014);
      else knoten.scale.set(0.016, 0.013, 0.01);
      knoten.position.set(...rumpfPunkt(profil, binder === 'tuch' ? TUCH_KNOTEN : 0, vOben - 0.002, binder === 'tuch' ? 0.011 : 0.008));
      g.add(knoten);
    }
  }
  if (schulter) {
    // Hemd über den Schultern (die Weste hat dort nur schmale Träger)
    const sch = gemerkt(`schulter|${schluessel}`, () => mergeGeometries([0.62, -2.42].map((th0) =>
      flicken(profil, oben - 0.12, oben - 0.006, (y) => [th0, th0 + 1.8 * glatt(oben - 0.12, oben - 0.07, y) + 0.001], 0.0022, 8))));
    g.add(stoffMesh(/** @type {THREE.BufferGeometry} */ (sch), schulter));
  }
  if (passe) {
    const ps = gemerkt(`passe|${schluessel}`, () => flicken(profil, oben - 0.175, oben - 0.155, () => [-PI, PI], 0.0025, 26));
    g.add(stoffMesh(ps, passe));
  }
  for (const f of flecken) {
    const b = f.b ?? 0.16;
    const h = f.h ?? 0.08;
    const fl = gemerkt(`fleck|${schluessel}|${f.y}|${f.th}|${b}|${h}`, () => flicken(profil, f.y - h / 2, f.y + h / 2, () => [f.th - b, f.th + b], 0.0035, 4,
      (s, t) => [Math.min(s, 1 - s, t, 1 - t) < 0.01 ? 0.7 : 1, 0]));
    g.add(stoffMesh(fl, f.stoff));
  }
  if (schuerze) {
    // Latz: vorn vom unteren Rand bis `oben`, oben etwas schmaler; Ränder dunkler, wahlweise Längsstreifen.
    // Ganzfigur (B2): lange Schürze ab `unten`, unter der Taille `rockBreite` breit, Band um die Taille
    const { breite: sb, oben: so, streifen = false, unten = profil[0][0], rockBreite = 0, taille = 0, band = false } = schuerze;
    // gestreift: je Streifen zwei Spalten, damit die Farbe nicht verwischt
    const farbFn = (/** @type {number} */ s, /** @type {number} */ t) => [(Math.min(s, 1 - s) < 0.01 || t < 0.01 ? 0.8 : 1) * (streifen && Math.round(s * 18) % 4 < 2 ? 0.62 : 1), 0];
    const teil = (/** @type {number} */ yu, /** @type {number} */ yo, /** @type {(y: number) => number} */ b, /** @type {number} */ ns) =>
      flicken(profil, yu, yo, (y) => [winkelBei(profil, y, -b(y)), winkelBei(profil, y, b(y))], 0.0042, ns, farbFn);
    const latz = gemerkt(`latz|${schluessel}|${so}|${sb}|${streifen}|${unten}|${rockBreite}|${taille}`, () => (rockBreite
      // Ganzfigur: Latz über und Rockteil unter der Taille, Stoß genau unter dem Schürzenband (sonst sieht
      // man im Übergang dunkle Zwickel des Kleides); unten leicht weiter (hängt über dem Rock)
      ? verbinde([
        teil(unten, taille, (y) => rockBreite * (1 + 0.12 * glatt(taille, unten, y)), 14),
        teil(taille, so, (y) => sb * (1 - 0.15 * glatt(taille, so, y)), 10),
      ])
      : teil(unten, so, (y) => sb * (1 - 0.15 * glatt(unten, so, y)), streifen ? 18 : 10)));
    g.add(stoffMesh(latz, schuerze.stoff));
    if (band && taille) {
      // Schürzenband um die Taille, hinten geknotet, zwei kurze Enden hängen herab (Limmer 1889: „hinten mit Schleife“)
      const bd = gemerkt(`schuerzenband|${schluessel}|${taille}`, () => verbinde([
        // 36 Teile in beiden Stufen: jeder zweite Punkt liegt auf einer Spalte des groben Rumpfs (18),
        // sonst sinkt das Band sparsam zwischen seinen Punkten in den Rumpf ein (Fleckprüfung)
        flicken(profil, taille - 0.014, taille + 0.014, () => [-PI, PI], 0.0058, 2 * RUMPF_SPALTEN.spar, (s) => [0.92 + 0.08 * Math.sin(s * 40), 0]),
        ...[-1, 1].map((sx) => flicken(profil, taille - 0.24, taille - 0.01, (y) => {
          const q = (taille - y) / 0.23;
          const m = PI + sx * (0.06 + 0.05 * q);
          return [m - 0.045, m + 0.045];
        }, 0.0062, 3, (s, t) => [t > 0.98 ? 0.8 : 0.95, 0])),
      ]));
      g.add(stoffMesh(bd, schuerze.stoff));
      const knoten = stoffMesh(KNOPF_GEO.voll, schuerze.stoff);
      knoten.scale.set(0.028, 0.02, 0.014);
      knoten.position.set(...rumpfPunkt(profil, PI, taille, 0.014));
      g.add(knoten);
    }
  }
  if (knopfleiste) {
    // Knopfreihe der Taille vom Hals abwärts (über dem Latz, falls einer da ist)
    for (let i = 0; i < knopfleiste.anzahl; i++) {
      const y = oben - 0.03 - i * 0.028;
      if (y < profil[0][0] + 0.01) break;
      // unter dem Latz verdeckt
      if (schuerze && y < schuerze.oben + 0.008) continue;
      const k = stoffMesh(stufenForm(KNOPF_GEO), knopfleiste.stoff);
      k.scale.setScalar(0.0045);
      k.position.set(...rumpfPunkt(profil, 0, y, 0.003));
      g.add(k);
    }
  }
  if (schultertuch) {
    // Tuch über den Schultern: hinten und seitlich bis `tiefe` unter den Hals, vorn offen und unten gekreuzt
    const yu = oben - schultertuch.tiefe;
    const yo = oben - 0.004;
    const tuch = gemerkt(`schultertuch|${schluessel}|${schultertuch.tiefe}`, () => flicken(profil, yu, yo, (y) => {
      const q = (y - yu) / (yo - yu);
      const off = 0.1 + 0.85 * q ** 1.3;
      return [off, 2 * PI - off];
    }, 0.0075, teilung(26, 14), (s, t) => [(Math.min(s, 1 - s) < 0.012 || t > 0.99 ? 0.72 : 1) * (1 + 0.05 * Math.sin(s * 70 + t * 4)), 0]));
    g.add(stoffMesh(tuch, schultertuch.stoff));
    // Knoten vorn, wo sich die Enden treffen (auch sparsam mit voller Kugel, wie der Halstuchknoten)
    const knoten = stoffMesh(KNOPF_GEO.voll, schultertuch.stoff);
    knoten.scale.set(0.02, 0.015, 0.011);
    knoten.position.set(...rumpfPunkt(profil, 0, yu + 0.012, 0.012));
    g.add(knoten);
  }
  if (kragen) {
    const art = kragenForm;
    // sparsame Stufe: 10 Teilungen wie der Hals darunter (Ecken übereinander, kein Durchstechen)
    const n = (/** @type {number} */ voll) => (SPAR ? 10 : voll);
    const geo = gemerkt(`kragen|${art}`, () => (art === 'roll'
      ? new THREE.CylinderGeometry(0.071, 0.078, 0.06, n(18), 1)
      : art === 'tuch' ? new THREE.CylinderGeometry(0.066, 0.072, 0.034, n(16), 1)
        // offener Hemdkragen: oben etwas weiter, vorn eine Lücke (dort sieht man den Hals)
        : art === 'offen' ? new THREE.CylinderGeometry(0.073, 0.068, 0.036, n(16), 1, true, 0.55, Math.PI * 2 - 1.1)
          // hoher Stehkragen der Frauentaille (enger Hals, siehe bauteile.js)
          : art === 'hoch' ? new THREE.CylinderGeometry(0.052, 0.057, 0.05, n(16), 1)
            : new THREE.CylinderGeometry(0.064, 0.067, 0.045, n(16), 1)));
    const k = stoffMesh(geo, kragen);
    k.position.set(0, oben + (art === 'roll' ? 0.02 : art === 'tuch' || art === 'offen' ? 0.006 : art === 'hoch' ? 0.014 : 0.012), profil[profil.length - 1][3] - 0.012);
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
 * Aufliegendes Stück Stoff auf dem Rumpf als Mesh (eigene Kleidungsteile, z. B. die Kante eines zweireihigen
 * Rocks). In der sparsamen Stufe liegt es wie alle aufliegenden Teile auf der groben Rumpffläche.
 * @param {Profil} profil @param {number} yu @param {number} yo
 * @param {(y: number) => number[]} bereich Winkelbereich [th0, th1] in Höhe y
 * @param {Stoff} stoff
 * @param {{ aus?: number, ns?: number, farbFn?: FarbFn }} [opt] Abstand zur Fläche, Spalten, Helligkeit je Punkt
 * @returns {THREE.Mesh}
 */
export function aufnaht(profil, yu, yo, bereich, stoff, { aus = 0.003, ns = 8, farbFn } = {}) {
  return stoffMesh(flicken(profil, yu, yo, bereich, aus, ns, farbFn), stoff, true);
}

/**
 * Gürtel bzw. Band rund um den Rumpf.
 * @param {Profil} profil @param {number} yu @param {number} yo @param {THREE.Material} material @param {number} [aus=0.004]
 */
export function band(profil, yu, yo, material, aus = 0.004) {
  return new THREE.Mesh(gemerkt(`band|${JSON.stringify(profil)}|${yu}|${yo}`, () => flicken(profil, yu, yo, () => [-PI, PI], aus, 32)), material);
}
