// Pickelhaube für Schutzleute: Glocke, Vorder- und Nackenschirm, Wappenplatte, Spitze.
//
// Belegt: Lederhelm mit Spitze und Messing-/Neusilberbeschlägen (DHM). Form, Maße und Sitz sind
// Gestaltung (stilisiert). Alle Maße werden an den Netzen des Kopfes gemessen (Haut, Haar, Bart),
// damit der Helm auch nach einem Umbau von `kopf()` richtig sitzt.
import * as THREE from 'three';

const PI = Math.PI;
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
 * Sitz: vorn knapp über den Augenbrauen, hinten tiefer über dem Hinterkopf; Vorderschirm schräg über
 * den Augen, Nackenschirm länger und steiler abwärts.
 * @param {THREE.Object3D} k Kopfgruppe
 * @param {THREE.Material} leder Glocke und Schirme
 * @param {THREE.Material} messing Wappenplatte, Sockel und Spitze
 * @returns {THREE.Group}
 */
export function baueHelm(k, leder, messing) {
  const kopf = messeKopf(k);
  const hoehe = kopf.yMax - kopf.yMin;
  const yTop = kopf.yMax + 0.012;
  const yStirn = kopf.yMax - 0.31 * hoehe; // Unterkante vorn: knapp über den Brauen
  const yNacken = kopf.yMax - 0.69 * hoehe; // Unterkante hinten: über dem Hinterkopf
  const ySchulter = kopf.yMax - 0.03; // ab hier wölbt sich die Kuppel über den Scheitel

  /** Unterkante der Glocke über dem Winkel (0 = vorn, π = hinten) */
  const rand = (/** @type {number} */ th) => yStirn - (yStirn - yNacken) * ((1 - Math.cos(th)) / 2) ** 1.2;

  /**
   * Punkt der Glocke: th rundum (0 = vorn), u von oben (0) bis zur Unterkante (1); aus = Abstand nach außen
   * @param {number} th @param {number} u @param {number} [aus]
   */
  const punkt = (th, u, aus = 0) => {
    const y = yTop - (yTop - rand(th)) * u;
    let [b, vo, hi] = kopf.umfang(Math.min(y, ySchulter));
    if (y > ySchulter) {
      const s = (y - ySchulter) / (yTop - ySchulter);
      const f = Math.max(Math.sqrt(1 - s * s), 0.45);
      b *= f; vo *= f; hi *= f;
    }
    const m = 0.009 + 0.005 * u ** 3 + aus; // Luft zum Kopf, unten leicht ausgestellt
    const c = Math.cos(th);
    return [Math.sin(th) * (b + m), y, c >= 0 ? c * (vo + m) : -c * (hi - m)];
  };

  const glocke = gitter(28, 9, (s, t) => punkt(2 * PI * s, t), { geschlossen: true });

  /**
   * Schirm: Streifen entlang der Unterkante, nach außen und unten geneigt; doppelt (oben und unten sichtbar)
   * @param {number} mitte Winkel der Mitte @param {number} halb halbe Breite (Bogenmaß)
   * @param {number} laenge größte Länge @param {number} neigung Abfall je Länge @param {boolean} unten Unterseite
   */
  const schirm = (mitte, halb, laenge, neigung, unten) => gitter(16, 3, (s, t) => {
    const phi = (2 * s - 1) * halb;
    const th = mitte + phi;
    const [x, y, z] = punkt(th, 1);
    const l = laenge * Math.max(0, Math.cos((phi / halb) * (PI / 2))) ** 0.5 * t;
    const dx = Math.sin(th) * 0.55;
    const dz = Math.cos(th);
    const d = Math.hypot(dx, dz);
    // gewölbt: außen fällt der Schirm stärker ab
    return [x + (dx / d) * l, y - neigung * l * (1 + 0.6 * t) - (unten ? 0.0025 : 0), z + (dz / d) * l];
  }, { umdrehen: unten });

  /** Wappenplatte vorn: Teil der Glockenfläche, 2,5 mm davor (elliptisch) */
  const platte = gitter(16, 3, (s, t) => {
    const phi = 2 * PI * s;
    return punkt(0.33 * t * Math.cos(phi), 0.46 + 0.27 * t * Math.sin(phi), 0.0025);
  }, { umdrehen: true });

  const helm = new THREE.Group();
  helm.add(new THREE.Mesh(glocke, leder));
  for (const unten of [false, true]) {
    helm.add(new THREE.Mesh(schirm(0, 1.15, 0.06, 0.32, unten), leder));
    helm.add(new THREE.Mesh(schirm(PI, 1.05, 0.07, 0.5, unten), leder));
  }
  helm.add(new THREE.Mesh(platte, messing));
  // Spitze: Sockel auf der Kuppel, darüber der Kegel
  const sockel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.03, 12), messing);
  sockel.position.y = yTop + 0.008;
  helm.add(sockel);
  const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 10), messing);
  spitze.position.y = yTop + 0.073;
  helm.add(spitze);
  return helm;
}
