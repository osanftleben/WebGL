// Menschliche Formen für Wachsfiguren und Personen (Feinschliff C): geformter Kopf mit gemaltem
// Gesicht (Gesichtstafel in texturen.js), Haar, Bart, Hals, Hände, Arme und Rumpf mit Kleidung.
// Stilisiert; alle Geometrien werden einmal angelegt und geteilt. Alle Geometrien haben Index,
// Normalen und uv – sonst ließen sie sich in verschmelzen.js nicht zusammenfassen.
// Keine Quader oder Flächen (Box-/PlaneGeometry): die zählten sonst im Lichtmodell mit.
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
 */
function gitter(ns, nt, punkt, uvFn = () => [0, 0]) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let j = 0; j <= nt; j++) {
    for (let i = 0; i <= ns; i++) {
      pos.push(...punkt(i / ns, j / nt));
      uv.push(...uvFn(i / ns, j / nt));
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
  return geo;
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

/**
 * Kopfgeometrie (Mitte im Ursprung, Gesicht nach +z) mit uv auf eine Zelle der Gesichtstafel.
 * @param {number} variante @param {number} zelle @param {boolean} fein
 */
function kopfGeometrie(variante, zelle, fein) {
  return gemerkt(`kopf|${variante}|${zelle}|${fein}`, () => {
    const v = VARIANTEN[variante % VARIANTEN.length];
    return gitter(fein ? 40 : 26, fein ? 30 : 20, (s, t) => {
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
 */
function kopfSchale(v, ns, nt, winkel, dicke) {
  return gitter(ns, nt, (s, t) => {
    const [a, D] = winkel(s, t);
    const p = Math.acos(Math.max(-1, Math.min(1, D)));
    const [x, y, z] = kopfPunkt(a, p, v);
    const l = Math.hypot(x, y, z);
    const f = (l + dicke(s, t, D)) / l;
    return [x * f, y * f, z * f];
  });
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

/** @typedef {'voll' | 'kurz' | 'lang' | 'kranz'} HaarStil */
/** @typedef {'voll' | 'schnurr' | 'kinn' | 'backen' | 'keiner'} BartStil */

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

/** Obere Grenze des Vollbarts (Höhe D) über |a| */
const BARTGRENZE = [[0, -0.64], [0.3, -0.5], [0.6, -0.26], [1.1, -0.03], [1.45, 0.18], [1.65, 0.24]];

/**
 * Bart: Schnurrbart allein oder mit Vollbart, Kinnbart oder Backenbart.
 * @param {number} variante @param {Exclude<BartStil, 'keiner'>} stil @param {boolean} fein
 */
function bartGeometrie(variante, stil, fein) {
  return gemerkt(`bart|${variante}|${stil}|${fein}`, () => {
    const v = VARIANTEN[variante % VARIANTEN.length];
    // Schnurrbart: zwischen Nase und Oberlippe, Enden leicht herabhängend
    const schnurr = kopfSchale(v, fein ? 18 : 10, fein ? 5 : 3, (s, t) => {
      const a = 0.62 * (2 * s - 1);
      const e = (a / 0.62) ** 2;
      const oben = -0.352 - 0.1 * e;
      const unten = -0.465 - 0.12 * e;
      return [a, oben + (unten - oben) * t];
    }, (s, t) => 0.0012 + 0.005 * Math.sin(PI * t) * Math.sin(PI * s) ** 0.5);
    if (stil === 'schnurr') return schnurr;
    /** @type {THREE.BufferGeometry[]} */
    const teile = [schnurr];
    if (stil === 'voll') {
      teile.push(kopfSchale(v, fein ? 28 : 16, fein ? 9 : 5, (s, t) => {
        const a = 1.65 * (2 * s - 1);
        const oben = kurve(BARTGRENZE, Math.abs(a));
        return [a, oben + (-0.97 - oben) * t];
      }, (s, t, D) => 0.0012 + (0.004 + 0.013 * glatt(-0.5, -0.95, D)) * glatt(0, 0.3, t) * glatt(1, 0.85, Math.abs(2 * s - 1))));
    } else if (stil === 'kinn') {
      // Kinnbart unter der Unterlippe, nach unten schmaler
      teile.push(kopfSchale(v, fein ? 12 : 8, fein ? 7 : 4, (s, t) => {
        const a = 0.42 * (2 * s - 1) * (1 - 0.45 * t);
        return [a, -0.62 - 0.05 * (a / 0.42) ** 2 - 0.35 * t];
      }, (s, t, D) => 0.0012 + (0.004 + 0.012 * glatt(-0.6, -0.95, D)) * glatt(0, 0.25, t) * Math.sin(PI * s) ** 0.6));
    } else {
      // Backenbart: von den Schläfen über die Wangen, Kinn frei (s läuft immer von vorn nach hinten)
      for (const seite of [-1, 1]) {
        const teil = kopfSchale(v, fein ? 12 : 8, fein ? 8 : 5, (s, t) => {
          const aa = seite > 0 ? 0.4 + s * 1.25 : 1.65 - s * 1.25;
          const oben = kurve(BARTGRENZE, aa);
          const unten = -0.45 - 0.4 * glatt(0.4, 0.75, aa);
          return [seite * aa, oben + (unten - oben) * t];
        }, (s, t) => 0.0012 + 0.008 * Math.sin(PI * t) ** 0.6 * glatt(0, 0.2, s) * glatt(1, 0.8, s));
        teile.push(teil);
      }
    }
    const g = /** @type {THREE.BufferGeometry} */ (mergeGeometries(teile));
    for (const t of teile) t.dispose();
    return g;
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
 * @param {THREE.Material | null} [o.haar=null] Haarmaterial (null: kahl)
 * @param {HaarStil} [o.haarStil='voll']
 * @param {BartStil} [o.bart='keiner']
 * @param {THREE.Material | null} [o.bartMaterial] sonst wie Haar
 * @returns {THREE.Group}
 */
export function kopf({ haut, zelle = 0, variante = 0, fein = true, haar = null, haarStil = 'voll', bart = 'keiner', bartMaterial = null }) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(kopfGeometrie(variante, zelle, fein), haut));
  if (haar) g.add(new THREE.Mesh(haarGeometrie(variante, haarStil, fein), haar));
  const bm = bartMaterial ?? haar;
  if (bart !== 'keiner' && bm) g.add(new THREE.Mesh(bartGeometrie(variante, bart, fein), bm));
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
 * @param {THREE.Material} o.stoff Ärmel
 * @param {THREE.Material} o.haut
 * @param {number} o.zelle
 * @param {number} o.seite +1 (bei +x) oder −1
 * @param {number[]} o.schulter [x, y, z] @param {number[]} o.ellbogen @param {number[]} o.handgelenk
 * @param {THREE.Material | null} [o.manschette=null]
 * @param {number} [o.dicke=1]
 * @returns {{ gruppe: THREE.Group, hand: THREE.Mesh }}
 */
export function arm({ stoff, haut, zelle, seite, schulter, ellbogen, handgelenk, manschette = null, dicke = 1 }) {
  const g = new THREE.Group();
  const p = [schulter, ellbogen, handgelenk].map((w) => new THREE.Vector3(...w));
  g.add(new THREE.Mesh(aermelGeometrie(p, [0.052 * dicke, 0.047 * dicke, 0.041 * dicke]), stoff));
  const kugel = new THREE.Mesh(kugelGeo, stoff);
  kugel.scale.set(0.05 * dicke, 0.042 * dicke, 0.054 * dicke);
  kugel.position.copy(p[0]).add(new THREE.Vector3(0, -0.01, 0));
  g.add(kugel);
  const richtung = p[2].clone().sub(p[1]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), richtung);
  if (manschette) {
    const m = new THREE.Mesh(manschetteGeo, manschette);
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
 * @typedef {number[][]} Profil Punkte [y, halbe Breite, halbe Tiefe, Versatz z], y aufsteigend
 */

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
  const s = Math.sin(th);
  const c = Math.cos(th);
  const x = hw * Math.sign(s) * Math.abs(s) ** (2 / N);
  const z = hd * Math.sign(c) * Math.abs(c) ** (2 / N);
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
  return Math.sign(x) * Math.asin(Math.min(1, Math.abs(x) / hw) ** (N / 2));
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
 * Oberkörper mit Kleidung: Rumpf (Rock), optional V-Ausschnitt mit Revers, Weste, Hemdbrust,
 * Krawatte, Knöpfen und Stehkragen. Nur vorhandene Materialien.
 * @param {object} o
 * @param {Profil} o.profil
 * @param {THREE.Material} o.rock
 * @param {boolean} [o.untenZu=false]
 * @param {{ unten: number, breite: number, weste: THREE.Material, hemd: THREE.Material,
 *   krawatte: THREE.Material, knopf: THREE.Material, rockKnoepfe?: number }} [o.ausschnitt]
 * @param {THREE.Material | null} [o.kragen=null] Hemdkragen am Hals
 * @returns {THREE.Group}
 */
export function oberkoerper({ profil, rock, untenZu = false, ausschnitt, kragen = null }) {
  const g = new THREE.Group();
  const schluessel = JSON.stringify(profil) + untenZu;
  g.add(new THREE.Mesh(gemerkt(`rumpf|${schluessel}`, () => rumpfGeometrie(profil, untenZu)), rock));
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
    g.add(new THREE.Mesh(teile.weste, weste), new THREE.Mesh(teile.revers, rock), new THREE.Mesh(teile.hemd, hemd), new THREE.Mesh(teile.krawatte, krawatte));
    // Westenknöpfe auf der Mittellinie, Rockknöpfe unter dem V (zweireihig)
    for (let i = 0; i < 3; i++) {
      const y = unten + 0.02 + i * ((hemdAb - unten - 0.02) / 3);
      const k = new THREE.Mesh(knopfGeo, knopf);
      k.scale.setScalar(0.0055);
      k.position.set(...rumpfPunkt(profil, 0, y, 0.0045));
      g.add(k);
    }
    for (let i = 0; i < rockKnoepfe; i++) {
      for (const sx of [-1, 1]) {
        const y = unten - 0.035 - i * 0.1;
        const k = new THREE.Mesh(knopfGeo, knopf);
        k.scale.setScalar(0.008);
        k.position.set(...rumpfPunkt(profil, winkelBei(profil, y, sx * 0.05), y, 0.002));
        g.add(k);
      }
    }
    // Krawattenknoten
    const knoten = new THREE.Mesh(knopfGeo, krawatte);
    knoten.scale.set(0.016, 0.013, 0.01);
    knoten.position.set(...rumpfPunkt(profil, 0, vOben - 0.002, 0.008));
    g.add(knoten);
  }
  if (kragen) {
    const k = new THREE.Mesh(gemerkt('kragen', () => new THREE.CylinderGeometry(0.064, 0.067, 0.045, 16, 1)), kragen);
    k.position.set(0, oben + 0.012, profil[profil.length - 1][3] - 0.012);
    g.add(k);
  }
  return g;
}

/**
 * Gürtel bzw. Band rund um den Rumpf.
 * @param {Profil} profil @param {number} yu @param {number} yo @param {THREE.Material} material @param {number} [aus=0.004]
 */
export function band(profil, yu, yo, material, aus = 0.004) {
  return new THREE.Mesh(gemerkt(`band|${JSON.stringify(profil)}|${yu}|${yo}`, () => flicken(profil, yu, yo, () => [-PI, PI], aus, 32)), material);
}
