// Sherlock Holmes – Die Berliner Fälle – Einstiegspunkt
// Fall 1, erster Ort: Castans Panoptikum, III. Etage (Schreckenskammer und Werkstatt), Oktober 1892.
import * as THREE from 'three';
import { erstelleRenderer } from 'render/renderer.js';
import { starteSchleife } from 'render/schleife.js';
import { stelleBereit } from 'debug/debug.js';
import { erstelleIchSteuerung } from 'steuerung/ich-steuerung.js';
import { erstelleAntippen } from 'steuerung/antippen.js';
import { baueEtage3 } from './welt/etage3.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 60);

const { renderer } = erstelleRenderer({ kamera: camera });

// ---- Ort bauen ----
const etage = baueEtage3(scene);

// ---- Anzeige auf der Seite ----
const hilfe = document.createElement('div');
hilfe.className = 'hilfe';
hilfe.textContent = matchMedia('(pointer: coarse)').matches
  ? 'Links: Daumen zum Laufen · Rechts: wischen zum Umsehen'
  : 'Ins Bild klicken · W/A/S/D oder Pfeiltasten laufen · Maus: umsehen · Esc: Maus frei';
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
  meldungTimer = setTimeout(() => meldung.classList.remove('sichtbar'), 2500);
}

// ---- Steuerung ----
const steuerung = erstelleIchSteuerung({
  kamera: camera,
  element: renderer.domElement,
  hindernisse: etage.hindernisse,
});
steuerung.setzePosition(etage.start.x, etage.start.z, etage.start.blick);

// Antippbare Hinweise kommen in Schritt 2 dazu
const antippen = erstelleAntippen({
  kamera: camera,
  element: renderer.domElement,
  objekte: [],
  verdecker: etage.verdecker,
  maxEntfernung: 3,
  beiAntippen: (objekt) => zeigeMeldung(objekt.name),
});

// Nur lokal: window.__debug für Prüfungen (/perf-check); steuerung/antippen für Tests
stelleBereit({ renderer, scene, camera });
if (/** @type {any} */ (window).__debug) Object.assign(/** @type {any} */ (window).__debug, { steuerung, antippen, etage });

starteSchleife(renderer, ({ delta }) => {
  steuerung.aktualisiere(delta);
  antippen.aktualisiere();
  renderer.render(scene, camera);
});
