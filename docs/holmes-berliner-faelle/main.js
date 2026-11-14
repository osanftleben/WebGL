// Sherlock Holmes – Die Berliner Fälle – Einstiegspunkt
// Fall 1, erster Ort: Castans Panoptikum, III. Etage (Schreckenskammer und Werkstatt), Oktober 1892.
import * as THREE from 'three';
import { erstelleRenderer } from 'render/renderer.js';
import { starteSchleife } from 'render/schleife.js';
import { stelleBereit } from 'debug/debug.js';
import { erstelleAugenanpassung } from 'belichtung/augenanpassung.js';
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
import { ladeSpielstand, speichereSpielstand, loescheSpielstand, ladeTonAn, speichereTonAn } from './fall1/spielstand.js';
import { erstelleKlaenge } from './ton/klaenge.js';
import { richteRendererEin, AUGEN_OPTIONEN, aktiviereSchatten, schattenNeu, erzeugeUmgebung, fensterLichtAbfall } from './welt/licht.js';
import { ladeLichtgitter, wendeLichtgitterAn } from './welt/lichtgitter.js';
import { bodenGlanz } from './welt/bodenglanz.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 60);

const { renderer } = erstelleRenderer({ kamera: camera });
richteRendererEin(renderer);

// ---- Ort und Fundstücke ----
const etage = baueEtage3(scene);
const funde = setzeFundstuecke(scene, etage.materialien);

// Schutzmann Kranich steht in Raum B vor der Figurengruppe und schaut zum Durchgang (−z)
const kranich = baueSchutzmann();
kranich.position.set(5.3, 0, 15.6);
kranich.rotation.y = Math.PI;
scene.add(kranich);
aktiviereSchatten(funde.gruppe);
aktiviereSchatten(kranich);
const kranichHindernis = { minX: 5.0, maxX: 5.6, minZ: 15.3, maxZ: 15.9 };
// Vorab berechnete Beleuchtung (Strahlverfolgung): Lichtkarte für statische Quader und Flächen,
// Lichtgitter für alles andere. Fehlt sie, gilt die alte Näherung mit Lampen.
// Aufhellung ohne Neuberechnung (Nutzer 14. 11.: Figuren und Ecken zu dunkel):
/** Zusätzlicher Faktor fürs Lichtgitter (Wachsfiguren, Büsten, runde Teile) */
const LICHTGITTER_FAKTOR = 1.3;
/** Mindest-Grundhelligkeit im indirekten Licht (Einheit wie das Licht nach dem Faktor 22) */
const LICHT_GRUND = 0.15;
/** @type {any} */
let lichtgitterWerte = null;
/** @type {any} */
let bodenGlanzWerte = null;
try {
  const gitter = await ladeLichtgitter(new URL('./licht/', import.meta.url), etage.lichtSzene.pruefsumme);
  // Helligkeitsfaktor: das Gitter rechnet mit Himmelsleuchtdichte 1, im Innenraum kommen nur wenige Prozent an
  lichtgitterWerte = wendeLichtgitterAn(scene, gitter, 22, {
    // Figuren und runde Teile (Lichtgitter) heller als die Flächen mit Lichtkarte
    gitterFaktor: LICHTGITTER_FAKTOR,
    // Ecken und Stellen unter Möbeln saufen nicht ab; helle Stellen bleiben praktisch gleich
    grund: LICHT_GRUND,
  });
  // Kurze Meldung, welche Beleuchtung aktiv ist (hilft bei der Fehlersuche auf anderen Rechnern)
  console.info(gitter.karte
    ? `Beleuchtung: Lichtkarte aktiv (Prüfsumme ${etage.lichtSzene.pruefsumme})`
    : `Beleuchtung: nur Lichtgitter (Prüfsumme Raum ${etage.lichtSzene.pruefsumme}, Datei ${gitter.info.lichtkarte?.pruefsumme ?? 'ohne Lichtkarte'})`);
  // Das Gitter enthält das ganze Tageslicht: Lampen und Schattenkarten werden nicht mehr gebraucht
  // (die schattenwerfenden Fensterlichter zeichneten sonnenartige Lichtbahnen, unpassend bei bedecktem Himmel)
  etage.direktLichter.forEach((l) => (l.visible = false));
  renderer.shadowMap.enabled = false;
  // Gewachste Dielen spiegeln die hellen Fenster weich (unter Möbeln gedämpft über die Lichtkarte)
  bodenGlanzWerte = bodenGlanz(etage.materialien.dielen, etage.lichtFenster, etage.raeumeZ, { wandDicke: 0.5 });
} catch (fehler) {
  console.warn('Lichtgitter nicht geladen, verwende Näherung:', fehler);
  fensterLichtAbfall(scene);
}
// Spiegelungen aus dem echten Raum, nur für glänzende Materialien (Gold, Messing, Glas, Holz, Wachs)
// Aufnahmepunkt frei im Raum A, mit Abstand zu Vitrine und Kronleuchter (nahe Gegenstände
// erscheinen in der Spiegelung sonst übergroß, z. B. die Messingkanten der Vitrine)
erzeugeUmgebung(renderer, scene, new THREE.Vector3(4.5, 2.4, 2.4));

// ---- Anzeige auf der Seite ----
const istTouch = matchMedia('(pointer: coarse)').matches;
const hilfe = document.createElement('div');
hilfe.className = 'hilfe';
hilfe.textContent = istTouch
  ? 'Links: Daumen zum Laufen · Rechts: wischen zum Umsehen · Auffälliges antippen'
  : 'Ins Bild klicken · W/A/S/D laufen · Maus: umsehen · Klick: untersuchen · N: Notizbuch · Esc: Maus frei';
document.body.appendChild(hilfe);

// Sanfte Abdunkelung zum Bildrand (reines CSS, kostet keine Rechenleistung)
const vignette = document.createElement('div');
vignette.className = 'vignette';
document.body.appendChild(vignette);

// Knopfleiste oben rechts: Ton an/aus und Notizbuch
const knopfleiste = document.createElement('div');
knopfleiste.className = 'knopfleiste';
document.body.appendChild(knopfleiste);
const klaenge = erstelleKlaenge({ an: ladeTonAn() });
const tonKnopf = document.createElement('button');
tonKnopf.type = 'button';
tonKnopf.className = 'ton-knopf';
function zeigeTonZustand() {
  tonKnopf.textContent = klaenge.istAn() ? 'Ton: an' : 'Ton: aus';
  tonKnopf.setAttribute('aria-pressed', String(klaenge.istAn()));
}
tonKnopf.addEventListener('click', () => {
  klaenge.starte();
  klaenge.setzeAn(!klaenge.istAn());
  speichereTonAn(klaenge.istAn());
  zeigeTonZustand();
});
zeigeTonZustand();
knopfleiste.appendChild(tonKnopf);
// Browser erlauben Ton erst nach einer Nutzeraktion: bei der ersten Berührung/Taste starten
for (const art of ['pointerdown', 'keydown']) window.addEventListener(art, () => klaenge.starte(), { once: true });

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
    klaenge.papier();
    aktualisiereSpielAktiv();
  },
  beiSchliessen: () => aktualisiereSpielAktiv(),
  beiNeustart: () => {
    neustartLaeuft = true;
    loescheSpielstand();
    location.reload();
  },
  knopfContainer: knopfleiste,
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
  schattenNeu(renderer);
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
          speichere();
        },
      });
      return;
    }
    const hinweis = findeHinweis(objekt.userData.hinweisId);
    if (!hinweis) return;
    const neu = notizbuch.fuegeHinzu(hinweis.id);
    klaenge.papier();
    karte.zeige(hinweis, neu);
    if (neu) speichere();
    aktualisiereSpielAktiv();
  },
  beiZielWechsel: (neu, alt) => {
    hebeHervor(alt, 0x000000);
    hebeHervor(neu, 0x3a3020);
  },
});

// ---- Spielstand ----
let neustartLaeuft = false;
/** Alle Aussagen des Falls nach Kennung (zum Wiederherstellen) */
const aussagenNachId = new Map(
  GESPRAECH_KRANICH.fragen.filter((f) => f.aussage).map((f) => [/** @type {any} */ (f.aussage).id, f.aussage]),
);

function speichere() {
  if (neustartLaeuft) return;
  speichereSpielstand({
    hinweise: notizbuch.gefunden(),
    aussagen: notizbuch.aussagenIds(),
    fragen: gespraech.gestellt(),
    ort: { x: camera.position.x, z: camera.position.z, blick: camera.rotation.y },
  });
}

const stand = ladeSpielstand();
if (stand) {
  for (const id of stand.hinweise) if (findeHinweis(id)) notizbuch.fuegeHinzu(id);
  for (const id of stand.aussagen) {
    const aussage = aussagenNachId.get(id);
    if (aussage) notizbuch.fuegeAussageHinzu(aussage);
  }
  gespraech.setzeGestellt(stand.fragen);
  // Standort nur übernehmen, wenn er innerhalb der Etage liegt
  const o = stand.ort;
  if (o && o.x > 0 && o.x < 9 && o.z > 0 && o.z < 27.5) steuerung.setzePosition(o.x, o.z, o.blick);
}
setInterval(speichere, 5000);
window.addEventListener('pagehide', speichere);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') speichere();
});

// Augenanpassung: Belichtung folgt weich der Bildhelligkeit (Grundbelichtung aus welt/licht.js)
const auge = erstelleAugenanpassung(renderer, scene, camera, AUGEN_OPTIONEN);

// Nur lokal: window.__debug für Prüfungen (/perf-check); weitere Objekte für Tests
stelleBereit({ renderer, scene, camera });
if (/** @type {any} */ (window).__debug) {
  Object.assign(/** @type {any} */ (window).__debug, { steuerung, antippen, etage, funde, notizbuch, karte, gespraech, kranich, klaenge, speichere, lichtgitterWerte, bodenGlanzWerte, belichtung: auge });
  // Nur lokal: Raummodell an das Lichtberechnungs-Programm schicken (python .claude/scripts/holmes_licht.py empfange)
  /** @type {any} */ (window).__debug.sendeLichtModell = () =>
    // Gleicher Rechner wie die Vorschau, anderer Anschluss (8765); nur lokal aktiv
    fetch(`${location.protocol}//${location.hostname}:8765/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Verdecker, Lichtkarten-Seiten mit Atlas-Lage, Fensteröffnungen (Aufbau siehe welt/lichtmodell.js)
      body: JSON.stringify({
        quader: etage.lichtSzene.quader, flaechen: etage.lichtSzene.flaechen, atlas: etage.lichtSzene.atlas,
        pruefsumme: etage.lichtSzene.pruefsumme, fenster: etage.lichtFenster, raeume: etage.raeumeZ,
      }),
    }).then((r) => r.text());
}

// Schritte: alle ~0,7 m ein Schrittgeräusch
const letzterOrt = camera.position.clone();
let wegSeitSchritt = 0;

starteSchleife(renderer, ({ delta }) => {
  steuerung.aktualisiere(delta);
  const weg = Math.hypot(camera.position.x - letzterOrt.x, camera.position.z - letzterOrt.z);
  letzterOrt.copy(camera.position);
  if (weg > 0 && weg < 0.5) {
    wegSeitSchritt += weg;
    if (wegSeitSchritt >= 0.7) {
      wegSeitSchritt = 0;
      klaenge.schritt();
    }
  }
  // Straßenlärm lauter nahe den Fenstern (Behrenstraße bei x = 9, Friedrichstraße bei z = 27,5)
  klaenge.setzeStrassenNaehe(Math.max((camera.position.x - 4) / 5, (camera.position.z - 22) / 5));
  aktualisiereWendung(delta);
  antippen.aktualisiere();
  auge.aktualisiere(delta);
  renderer.render(scene, camera);
});
