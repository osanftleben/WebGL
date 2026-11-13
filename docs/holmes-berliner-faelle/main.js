// Sherlock Holmes – Die Berliner Fälle – Einstiegspunkt
// Fall 1, erster Ort: Castans Panoptikum, III. Etage (Schreckenskammer und Werkstatt), Oktober 1892.
import * as THREE from 'three';
import { erstelleRenderer } from 'render/renderer.js';
import { starteSchleife } from 'render/schleife.js';
import { stelleBereit } from 'debug/debug.js';
import { erstelleIchSteuerung } from 'steuerung/ich-steuerung.js';
import { erstelleAntippen } from 'steuerung/antippen.js';
import { baueEtage3 } from './welt/etage3.js';
import { setzeFundstuecke } from './welt/fundstuecke.js';
import { HINWEISE, findeHinweis } from './fall1/hinweise.js';
import { erstelleHinweiskarte } from './ui/hinweiskarte.js';
import { erstelleNotizbuch } from './ui/notizbuch.js';
import { erstelleGespraech } from './ui/gespraech.js';
import { baueSchutzmann } from './welt/personen.js';
import { GESPRAECH_KRANICH } from './fall1/gespraech-kranich.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 60);

const { renderer } = erstelleRenderer({ kamera: camera });

// ---- Ort und Fundstücke ----
const etage = baueEtage3(scene);
const funde = setzeFundstuecke(scene, etage.materialien);

// Schutzmann Kranich steht in Raum B vor der Figurengruppe und schaut zum Durchgang (−z)
const kranich = baueSchutzmann();
kranich.position.set(5.3, 0, 15.6);
kranich.rotation.y = Math.PI;
scene.add(kranich);
const kranichHindernis = { minX: 5.0, maxX: 5.6, minZ: 15.3, maxZ: 15.9 };

// ---- Anzeige auf der Seite ----
const istTouch = matchMedia('(pointer: coarse)').matches;
const hilfe = document.createElement('div');
hilfe.className = 'hilfe';
hilfe.textContent = istTouch
  ? 'Links: Daumen zum Laufen · Rechts: wischen zum Umsehen · Auffälliges antippen'
  : 'Ins Bild klicken · W/A/S/D laufen · Maus: umsehen · Klick: untersuchen · N: Notizbuch · Esc: Maus frei';
document.body.appendChild(hilfe);

// ---- Steuerung ----
const steuerung = erstelleIchSteuerung({
  kamera: camera,
  element: renderer.domElement,
  hindernisse: [...etage.hindernisse, ...funde.hindernisse, kranichHindernis],
});
steuerung.setzePosition(etage.start.x, etage.start.z, etage.start.blick);

/** Steuerung und Antippen nur, solange weder Karte, Notizbuch noch Gespräch offen sind. */
function aktualisiereSpielAktiv() {
  const an = !karte.istOffen() && !notizbuch.istOffen() && !gespraech.istOffen();
  steuerung.setzeAktiv(an);
  antippen.setzeAktiv(an);
}

const karte = erstelleHinweiskarte({ beiSchliessen: () => aktualisiereSpielAktiv() });
const notizbuch = erstelleNotizbuch({
  hinweise: HINWEISE,
  beiOeffnen: () => {
    if (karte.istOffen()) karte.schliesse();
    aktualisiereSpielAktiv();
  },
  beiSchliessen: () => aktualisiereSpielAktiv(),
});
const gespraech = erstelleGespraech({ beiAenderung: () => aktualisiereSpielAktiv() });

/**
 * Hervorhebung, solange das Fadenkreuz auf ein Fundstück zeigt (PC).
 * @param {THREE.Object3D | null} objekt @param {number} farbe
 */
function hebeHervor(objekt, farbe) {
  objekt?.traverse((o) => {
    const mat = /** @type {THREE.MeshLambertMaterial} */ (/** @type {THREE.Mesh} */ (o).material);
    if (mat && mat.emissive) mat.emissive.setHex(farbe);
  });
}

// ---- Personen wenden sich beim Ansprechen dem Spieler zu ----
/** @type {{ person: THREE.Object3D, ziel: number } | null} */
let wendung = null;

/**
 * Lässt eine Person sich zum Spieler drehen (sanft, siehe Schleife).
 * Personen schauen in ihrer Grundstellung nach lokal +z.
 * @param {THREE.Object3D} person
 */
function wendeZu(person) {
  const ziel = Math.atan2(camera.position.x - person.position.x, camera.position.z - person.position.z);
  wendung = { person, ziel };
}

/**
 * Dreht die Person schrittweise auf den Zielwinkel (kürzester Weg).
 * @param {number} delta Sekunden
 */
function aktualisiereWendung(delta) {
  if (!wendung) return;
  const { person, ziel } = wendung;
  let rest = ziel - person.rotation.y;
  rest = Math.atan2(Math.sin(rest), Math.cos(rest));
  const schritt = 4.0 * delta;
  if (Math.abs(rest) <= schritt) {
    person.rotation.y = ziel;
    wendung = null;
  } else {
    person.rotation.y += Math.sign(rest) * schritt;
  }
}

const antippen = erstelleAntippen({
  kamera: camera,
  element: renderer.domElement,
  objekte: [...funde.antippbar, kranich],
  verdecker: etage.verdecker,
  maxEntfernung: 3,
  beiAntippen: (objekt) => {
    if (objekt.userData.person === 'kranich') {
      wendeZu(kranich);
      gespraech.starte(GESPRAECH_KRANICH, {
        istFrei: (frage) => !frage.braucht || notizbuch.hat(frage.braucht),
        beiFrage: (frage) => {
          if (frage.aussage) notizbuch.fuegeAussageHinzu(frage.aussage);
        },
      });
      return;
    }
    const hinweis = findeHinweis(objekt.userData.hinweisId);
    if (!hinweis) return;
    const neu = notizbuch.fuegeHinzu(hinweis.id);
    karte.zeige(hinweis, neu);
    aktualisiereSpielAktiv();
  },
  beiZielWechsel: (neu, alt) => {
    hebeHervor(alt, 0x000000);
    hebeHervor(neu, 0x3a3020);
  },
});

// Nur lokal: window.__debug für Prüfungen (/perf-check); weitere Objekte für Tests
stelleBereit({ renderer, scene, camera });
if (/** @type {any} */ (window).__debug) {
  Object.assign(/** @type {any} */ (window).__debug, { steuerung, antippen, etage, funde, notizbuch, karte, gespraech, kranich });
}

starteSchleife(renderer, ({ delta }) => {
  steuerung.aktualisiere(delta);
  aktualisiereWendung(delta);
  antippen.aktualisiere();
  renderer.render(scene, camera);
});
