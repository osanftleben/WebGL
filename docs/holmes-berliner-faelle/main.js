// Sherlock Holmes – Die Berliner Fälle – Einstiegspunkt
// Derzeit: grauer Testraum zum Ausprobieren der Steuerung (keine historischen Inhalte).
import * as THREE from 'three';
import { erstelleRenderer } from 'render/renderer.js';
import { starteSchleife } from 'render/schleife.js';
import { stelleBereit } from 'debug/debug.js';
import { erstelleIchSteuerung } from 'steuerung/ich-steuerung.js';
import { erstelleAntippen } from 'steuerung/antippen.js';
import { alsHindernis } from 'steuerung/kollision.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 50);

const { renderer } = erstelleRenderer({ kamera: camera });

// ---- Licht ----
scene.add(new THREE.HemisphereLight(0xdedad0, 0x2a2622, 1.6));
const sonne = new THREE.DirectionalLight(0xffffff, 1.2);
sonne.position.set(3, 6, 2);
scene.add(sonne);

// ---- Testraum: 8 m × 6 m, 3 m hoch ----
const BREITE = 8;
const TIEFE = 6;
const HOEHE = 3;
const WAND = 0.2;

const bodenMaterial = new THREE.MeshLambertMaterial({ color: 0x55504a });
const wandMaterial = new THREE.MeshLambertMaterial({ color: 0x8a8580 });
const kistenMaterial = new THREE.MeshLambertMaterial({ color: 0x6b5e50 });
const sockelMaterial = new THREE.MeshLambertMaterial({ color: 0x9a948c });

const boden = new THREE.Mesh(new THREE.PlaneGeometry(BREITE, TIEFE), bodenMaterial);
boden.rotation.x = -Math.PI / 2;
scene.add(boden);

const decke = new THREE.Mesh(new THREE.PlaneGeometry(BREITE, TIEFE), wandMaterial);
decke.rotation.x = Math.PI / 2;
decke.position.y = HOEHE;
scene.add(decke);

/** @type {THREE.Object3D[]} Alles, was die Sicht auf antippbare Objekte versperrt */
const verdecker = [boden];
/** @type {import('steuerung/kollision.js').Hindernis[]} */
const hindernisse = [];

/**
 * Stellt einen Quader in den Raum, der den Weg versperrt.
 * @param {number} b Breite (x) @param {number} h Höhe @param {number} t Tiefe (z)
 * @param {number} x @param {number} z
 * @param {THREE.Material} material
 */
function quader(b, h, t, x, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), material);
  mesh.position.set(x, h / 2, z);
  scene.add(mesh);
  verdecker.push(mesh);
  hindernisse.push(alsHindernis(mesh));
  return mesh;
}

// Wände
quader(BREITE + 2 * WAND, HOEHE, WAND, 0, -TIEFE / 2 - WAND / 2, wandMaterial);
quader(BREITE + 2 * WAND, HOEHE, WAND, 0, TIEFE / 2 + WAND / 2, wandMaterial);
quader(WAND, HOEHE, TIEFE, -BREITE / 2 - WAND / 2, 0, wandMaterial);
quader(WAND, HOEHE, TIEFE, BREITE / 2 + WAND / 2, 0, wandMaterial);

// Kisten als Hindernisse
quader(1.2, 0.9, 0.8, -1.5, -0.5, kistenMaterial);
quader(0.8, 1.6, 0.8, 2.2, 1.2, kistenMaterial);

// ---- Drei antippbare Platzhalter auf Sockeln ----
/** @type {THREE.Object3D[]} */
const antippbar = [];
/** @type {[string, number, number, number][]} Name, Farbe, x, z */
const platzhalter = [
  ['Platzhalter A', 0xb04a3a, -3, -2.3],
  ['Platzhalter B', 0x3a7ab0, 0.5, -2.3],
  ['Platzhalter C', 0x4f9a4a, 3, -1.5],
];
const kugelGeometrie = new THREE.SphereGeometry(0.18, 24, 16);
for (const [name, farbe, x, z] of platzhalter) {
  quader(0.5, 1, 0.5, x, z, sockelMaterial);
  const kugel = new THREE.Mesh(kugelGeometrie, new THREE.MeshLambertMaterial({ color: farbe }));
  kugel.position.set(x, 1.18, z);
  kugel.name = name;
  scene.add(kugel);
  antippbar.push(kugel);
}

// ---- Anzeige auf der Seite ----
const hilfe = document.createElement('div');
hilfe.className = 'hilfe';
hilfe.textContent = matchMedia('(pointer: coarse)').matches
  ? 'Links: Daumen zum Laufen · Rechts: wischen zum Umsehen · Kugeln antippen'
  : 'Ins Bild klicken · W/A/S/D oder Pfeiltasten laufen · Maus: umsehen · Klick: Kugel wählen · Esc: Maus frei';
document.body.appendChild(hilfe);

const meldung = document.createElement('div');
meldung.className = 'meldung';
document.body.appendChild(meldung);
/** @type {number | undefined} */
let meldungTimer;

/** @param {string} text */
function zeigeMeldung(text) {
  meldung.textContent = text;
  meldung.classList.add('sichtbar');
  clearTimeout(meldungTimer);
  meldungTimer = setTimeout(() => meldung.classList.remove('sichtbar'), 2000);
}

// ---- Steuerung ----
const steuerung = erstelleIchSteuerung({
  kamera: camera,
  element: renderer.domElement,
  hindernisse,
});
steuerung.setzePosition(0, 2, 0);

const antippen = erstelleAntippen({
  kamera: camera,
  element: renderer.domElement,
  objekte: antippbar,
  verdecker,
  maxEntfernung: 3,
  beiAntippen: (objekt) => zeigeMeldung(`Angetippt: ${objekt.name}`),
  beiZielWechsel: (neu, alt) => {
    // Hervorhebung, solange das Fadenkreuz auf eine Kugel zeigt (PC)
    if (alt) /** @type {THREE.MeshLambertMaterial} */ (/** @type {THREE.Mesh} */ (alt).material).emissive.setHex(0x000000);
    if (neu) /** @type {THREE.MeshLambertMaterial} */ (/** @type {THREE.Mesh} */ (neu).material).emissive.setHex(0x333333);
  },
});

// Nur lokal: window.__debug für Prüfungen (/perf-check); steuerung/antippen für Tests
stelleBereit({ renderer, scene, camera });
if (/** @type {any} */ (window).__debug) Object.assign(/** @type {any} */ (window).__debug, { steuerung, antippen });

starteSchleife(renderer, ({ delta }) => {
  steuerung.aktualisiere(delta);
  antippen.aktualisiere();
  renderer.render(scene, camera);
});
