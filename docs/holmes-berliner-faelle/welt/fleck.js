// Weicher, dunkler Fleck unter Beweglichem (Personen, kleine Fundstücke), die nicht im Lichtmodell stehen
// und daher keinen vorberechneten Kontaktschatten werfen. Feststehendes (Möbel, Figuren, Büsten) bekommt
// seinen Kontaktschatten aus der Lichtkarte (welt/lichtmodell.js), nicht von hier.
// Alle Flecken teilen Geometrie, Textur und Material.
import * as THREE from 'three';

/** Größte Abdunkelung (0 … 1), im linearen Licht vor der Farbkurve gemischt. Verlauf: 0,42 mit Kosinus-
 *  Glocke kaum zu sehen; 0,75 mit flachem Kern wirkte wie Brandlöcher (Nutzer); jetzt 0,58 fast ohne Kern */
const STAERKE = 0.58;
/** Anteil des Halbmessers mit voller Stärke; dahin weich (glatt) bis zum Rand auf 0 */
const KERN = 0.1;
/** Eckige Kontaktflecken (Beine, Sockel): Stärke und Anteil mit voller Stärke; Abstand als Superellipse
 *  (Hochzahl 4: Quadrat mit runden Ecken – mit reiner Max-Norm wirkten die Flecken wie Untersetzer) */
const STAERKE_ECKIG = 0.42;
const KERN_ECKIG = 0.15;
/** Rand der Kontaktflecken um die Auflage eines Beins (m, je Seite) */
const BEIN_RAND = 0.07;
/** Dünne Beine: größte Grundkante (m) */
const BEIN_DICKE = 0.13;
/** Anhebung über die Fläche gegen Flimmern (zusätzlich polygonOffset) */
const ANHEBUNG = 0.004;

/** @type {THREE.MeshBasicMaterial | null} */
let material = null;
/** Waagerechte Fläche 1 × 1 m (nur Geometrie für Flecken; Material schließt sie aus dem Lichtmodell aus) */
// Die Textur hat zwei Hälften: links rund (Personen, Füße), rechts eckig (Beine, Sockel)
const geometrie = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
{
  const uv = geometrie.getAttribute('uv');
  for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * 0.5);
}

/**
 * Gemeinsames Material: schwarz, Deckkraft als weicher Verlauf (flache Mitte, glatt zum Rand auf 0).
 * Datentextur statt Canvas: Browser behandeln halbdurchsichtige Canvas-Bildpunkte verschieden.
 */
function fleckMaterial() {
  if (material) return material;
  const n = 64;
  const daten = new Uint8Array(2 * n * n * 4);
  const glatt = (/** @type {number} */ r, /** @type {number} */ kern) => {
    const t = Math.min(1, Math.max(0, (1 - r) / (1 - kern)));
    return t * t * (3 - 2 * t);
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * 2 - 1;
      const y = ((j + 0.5) / n) * 2 - 1;
      const rund = STAERKE * glatt(Math.min(1, Math.hypot(x, y)), KERN);
      const eckig = STAERKE_ECKIG * glatt(Math.min(1, Math.pow(x ** 4 + y ** 4, 0.25)), KERN_ECKIG);
      daten[(j * 2 * n + i) * 4 + 3] = Math.round(255 * rund);
      daten[(j * 2 * n + n + i) * 4 + 3] = Math.round(255 * eckig);
    }
  }
  const textur = new THREE.DataTexture(daten, 2 * n, n);
  textur.magFilter = THREE.LinearFilter;
  textur.minFilter = THREE.LinearMipmapLinearFilter;
  textur.generateMipmaps = true;
  textur.needsUpdate = true;
  material = new THREE.MeshBasicMaterial({
    color: 0x000000, map: textur, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
  });
  return material;
}

/**
 * Erzeugt einen weichen Fleck (waagerecht, Mitte im Ursprung, knapp über y = 0). Als Kind des Beweglichen
 * anhängen, dann wandert er mit. Nicht antippbar (kein Treffer beim Zielen).
 * @param {number} breite Durchmesser entlang x (m)
 * @param {number} [tiefe] Durchmesser entlang z (m), Standard wie breite
 * @returns {THREE.Mesh}
 */
export function weicherFleck(breite, tiefe = breite) {
  const fleck = new THREE.Mesh(geometrie, fleckMaterial());
  fleck.name = 'Fleck';
  fleck.scale.set(breite, 1, tiefe);
  fleck.position.y = ANHEBUNG;
  fleck.renderOrder = 1;
  fleck.raycast = () => {};
  fleck.userData.keinLichtModell = true;
  return fleck;
}

/**
 * @typedef {object} KontaktFleck Fleck in Weltkoordinaten
 * @property {number} x @property {number} y @property {number} z Mitte (y = Auflagefläche)
 * @property {number} breite @property {number} tiefe @property {number} drehY @property {boolean} eckig
 */

/**
 * Sammelt Kontaktflecken unter Feststehendem, das zu dünn für die Lichtkarte ist (10-cm-Bildpunkte):
 * 1. Gruppen mit `userData.kontaktFleck` ({ breite, tiefe, dx?, dz?, eckig? }, lokal; z. B. Figurenfüße, Büstensockel),
 * 2. dünne, stehende Quader (Beine, Pfosten; Grundkante ≤ BEIN_DICKE), die auf einer großen waagerechten
 *    Fläche bis 0,3 m Höhe stehen (Boden, Podest – per Strahl nach unten; schmale Leisten zählen nicht; höher
 *    hingen Flecken an Kanten über, z. B. Messingleiste vor dem Kopfschrank-Sockel).
 * Vor dem Verschmelzen aufrufen (Teile noch einzeln, Weltmatrizen aktuell).
 * @param {THREE.Object3D} gruppe
 * @returns {KontaktFleck[]}
 */
export function sammleKontaktFlecken(gruppe) {
  gruppe.updateWorldMatrix(true, true);
  /** @type {KontaktFleck[]} */
  const liste = [];
  /** @type {THREE.Mesh[]} */
  const flaechen = [];
  /** @type {THREE.Mesh[]} */
  const beine = [];
  const kasten = new THREE.Box3();
  const groesse = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const skal = new THREE.Vector3();
  const euler = new THREE.Euler();
  gruppe.traverse((o) => {
    const k = o.userData.kontaktFleck;
    if (k) {
      o.matrixWorld.decompose(pos, quat, skal);
      euler.setFromQuaternion(quat, 'YXZ');
      const mitte = new THREE.Vector3(k.dx ?? 0, 0, k.dz ?? 0).applyMatrix4(o.matrixWorld);
      liste.push({ x: mitte.x, y: mitte.y, z: mitte.z, breite: k.breite, tiefe: k.tiefe, drehY: euler.y, eckig: !!k.eckig });
    }
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh || !mesh.visible || mesh.userData.nurTreffer) return;
    const mat = /** @type {any} */ (mesh.material);
    if (mat.transparent || mat.isMeshBasicMaterial) return;
    kasten.setFromObject(mesh);
    kasten.getSize(groesse);
    // Auflageflächen: breit genug (Boden, Podest, Tischplatten)
    if (Math.min(groesse.x, groesse.z) >= 0.4) flaechen.push(mesh);
    if (/** @type {any} */ (mesh.geometry).type !== 'BoxGeometry') return;
    const dicke = Math.max(groesse.x, groesse.z);
    if (dicke <= BEIN_DICKE && groesse.y >= 0.1 && groesse.y >= dicke && kasten.min.y < 0.3) beine.push(mesh);
  });
  const strahl = new THREE.Raycaster();
  strahl.far = 0.03;
  const unten = new THREE.Vector3(0, -1, 0);
  for (const bein of beine) {
    kasten.setFromObject(bein);
    kasten.getCenter(pos);
    kasten.getSize(groesse);
    strahl.set(new THREE.Vector3(pos.x, kasten.min.y + 0.01, pos.z), unten);
    const treffer = strahl.intersectObjects(flaechen, false)[0];
    let y = 0;
    if (treffer && treffer.face && treffer.face.normal.clone().transformDirection(treffer.object.matrixWorld).y >= 0.9) y = treffer.point.y;
    // Boden (y = 0) gilt immer als Auflage – auch für Gruppen ohne eigenen Boden (Fundstücke)
    else if (Math.abs(kasten.min.y) > 0.01) continue;
    // gedrehte Beine (z. B. Vitrine quer): umgebender Kasten reicht bei so kleinen Grundflächen
    liste.push({
      x: pos.x, y, z: pos.z, breite: groesse.x + 2 * BEIN_RAND, tiefe: groesse.z + 2 * BEIN_RAND, drehY: 0, eckig: true,
    });
  }
  return liste;
}

/**
 * Ein Netz für alle Kontaktflecken (ein Draw-Call; gemeinsames Material mit `weicherFleck`).
 * @param {KontaktFleck[]} liste
 * @returns {THREE.Mesh}
 */
export function baueKontaktFlecken(liste) {
  const lage = new Float32Array(liste.length * 4 * 3);
  const uv = new Float32Array(liste.length * 4 * 2);
  const index = [];
  liste.forEach((f, n) => {
    const c = Math.cos(f.drehY);
    const s = Math.sin(f.drehY);
    const u0 = f.eckig ? 0.5 : 0;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], e) => {
      const lx = (a * f.breite) / 2;
      const lz = (b * f.tiefe) / 2;
      lage.set([f.x + c * lx + s * lz, f.y + ANHEBUNG, f.z - s * lx + c * lz], (n * 4 + e) * 3);
      uv.set([u0 + ((a + 1) / 2) * 0.5, (b + 1) / 2], (n * 4 + e) * 2);
    });
    index.push(n * 4, n * 4 + 2, n * 4 + 1, n * 4, n * 4 + 3, n * 4 + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(lage, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  const netz = new THREE.Mesh(geo, fleckMaterial());
  netz.name = 'Kontaktflecken';
  netz.renderOrder = 1;
  netz.raycast = () => {};
  netz.userData.keinLichtModell = true;
  return netz;
}

