// steuerung-v1: Ich-Perspektive für PC (Tastatur + Maus) und Touch (Joystick + Wischen).
import * as THREE from 'three';
import { erstelleJoystickAnzeige } from './joystick.js';
import { schiebeHeraus } from './kollision.js';

/** Tasten nach Lage auf der Tastatur (event.code) – gilt auch für QWERTZ. */
const TASTEN = {
  KeyW: 'vor',
  ArrowUp: 'vor',
  KeyS: 'zurueck',
  ArrowDown: 'zurueck',
  KeyA: 'links',
  ArrowLeft: 'links',
  KeyD: 'rechts',
  ArrowRight: 'rechts',
};

/** Ab dieser Bewegung in CSS-Pixeln ist ein Mausklick kein Klick mehr, sondern Ziehen. */
const KLICK_TOLERANZ = 8;

/**
 * @typedef {import('./kollision.js').Hindernis} Hindernis
 */

/**
 * @typedef {object} IchSteuerung
 * @property {(delta: number) => void} aktualisiere Pro Bild aufrufen (delta in Sekunden).
 * @property {(x: number, z: number, blickWinkel?: number) => void} setzePosition
 *   Stellt den Spieler an eine Stelle; blickWinkel (Bogenmaß) dreht ihn um die Hochachse (0 = Blick nach −z).
 * @property {(liste: readonly Hindernis[]) => void} setzeHindernisse Ersetzt die Hindernisliste.
 * @property {(an: boolean) => void} setzeAktiv Schaltet die Steuerung an oder aus (z. B. während eines Gesprächs).
 * @property {() => boolean} istMausGefangen true, wenn die Maus am PC eingefangen ist (Pointer Lock).
 * @property {() => void} entfernen Entfernt alle Ereignis-Abhörer und die Joystick-Anzeige.
 */

/**
 * Erstellt eine Ich-Steuerung, die direkt die Kamera bewegt und dreht.
 *
 * PC: Klick ins Bild fängt die Maus ein (Esc gibt sie frei); Maus dreht die Sicht,
 * W/A/S/D oder Pfeiltasten laufen. Ohne eingefangene Maus dreht Ziehen mit gedrückter Taste die Sicht.
 * Touch: linke Hälfte des Elements = Joystick (erscheint unter dem Daumen),
 * rechte Hälfte = Wischen zum Umsehen. Funktioniert hochkant und quer.
 *
 * @param {object} optionen
 * @param {import('three').PerspectiveCamera} optionen.kamera Wird bewegt und gedreht.
 * @param {HTMLElement} optionen.element Element, das Maus/Touch empfängt (meist renderer.domElement).
 * @param {number} [optionen.augenhoehe=1.65] Höhe der Kamera über dem Boden in Metern.
 * @param {number} [optionen.tempo=1.4] Gehtempo in Metern pro Sekunde.
 * @param {number} [optionen.radius=0.3] Radius des Spielers für die Kollision in Metern.
 * @param {readonly Hindernis[]} [optionen.hindernisse=[]] Hindernisse im Grundriss.
 * @param {number} [optionen.mausEmpfindlichkeit=0.0022] Drehung in Bogenmaß pro Mauspixel.
 * @param {number} [optionen.touchEmpfindlichkeit=0.006] Drehung in Bogenmaß pro Touch-Pixel.
 * @param {number} [optionen.nickGrenze=1.35] Größter Blickwinkel nach oben/unten in Bogenmaß.
 * @param {number} [optionen.joystickRadius=60] Radius des Joysticks in CSS-Pixeln.
 * @returns {IchSteuerung}
 */
export function erstelleIchSteuerung({
  kamera,
  element,
  augenhoehe = 1.65,
  tempo = 1.4,
  radius = 0.3,
  hindernisse = [],
  mausEmpfindlichkeit = 0.0022,
  touchEmpfindlichkeit = 0.006,
  nickGrenze = 1.35,
  joystickRadius = 60,
}) {
  /** @type {readonly Hindernis[]} */
  let aktuelleHindernisse = hindernisse;
  let aktiv = true;

  // Blickrichtung aus der Kamera übernehmen (Reihenfolge YXZ: erst Gieren, dann Nicken).
  kamera.rotation.order = 'YXZ';
  let gier = kamera.rotation.y;
  let nick = kamera.rotation.x;
  kamera.position.y = augenhoehe;

  /** Gedrückte Richtungstasten */
  const tasten = { vor: false, zurueck: false, links: false, rechts: false };
  /** Analoge Joystick-Werte (−1 … 1) */
  const joystickWert = { vor: 0, seit: 0 };

  // Touch-Zustand
  /** @type {number | null} */ let joystickId = null;
  let joystickStartX = 0;
  let joystickStartY = 0;
  /** @type {number | null} */ let blickId = null;
  let blickX = 0;
  let blickY = 0;

  // Maus-Zustand (Ziehen ohne Pointer Lock)
  /** @type {number | null} */ let mausId = null;
  let mausX = 0;
  let mausY = 0;
  let mausWeg = 0;

  const anzeige = erstelleJoystickAnzeige({ radius: joystickRadius });
  const vorherigesTouchAction = element.style.touchAction;
  element.style.touchAction = 'none';

  function begrenzeNick() {
    nick = Math.max(-nickGrenze, Math.min(nickGrenze, nick));
  }

  function drehe(dx, dy, empfindlichkeit) {
    gier -= dx * empfindlichkeit;
    nick -= dy * empfindlichkeit;
    begrenzeNick();
  }

  const istGefangen = () => document.pointerLockElement === element;

  /** Zeiger an das Element binden, damit Bewegungen außerhalb weiter ankommen. */
  function binde(/** @type {number} */ id) {
    try {
      element.setPointerCapture(id);
    } catch {
      // Zeiger schon beendet – nichts zu tun.
    }
  }

  // ---- Tastatur ----
  /** @param {KeyboardEvent} e */
  function tasteRunter(e) {
    if (!aktiv) return;
    const ziel = /** @type {HTMLElement} */ (e.target);
    if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA' || ziel.isContentEditable)) return;
    const richtung = TASTEN[/** @type {keyof typeof TASTEN} */ (e.code)];
    if (!richtung) return;
    tasten[richtung] = true;
    if (e.code.startsWith('Arrow')) e.preventDefault();
  }
  /** @param {KeyboardEvent} e */
  function tasteHoch(e) {
    const richtung = TASTEN[/** @type {keyof typeof TASTEN} */ (e.code)];
    if (richtung) tasten[richtung] = false;
  }
  function allesLoslassen() {
    tasten.vor = tasten.zurueck = tasten.links = tasten.rechts = false;
    joystickWert.vor = joystickWert.seit = 0;
    joystickId = blickId = mausId = null;
    anzeige.verstecke();
  }

  // ---- Maus (Pointer Lock) ----
  /** @param {MouseEvent} e */
  function mausBewegt(e) {
    if (!aktiv || !istGefangen()) return;
    drehe(e.movementX, e.movementY, mausEmpfindlichkeit);
  }

  // ---- Zeiger (Maus ohne Lock, Touch, Stift) ----
  /** @param {PointerEvent} e */
  function zeigerRunter(e) {
    if (!aktiv) return;
    if (e.pointerType === 'mouse') {
      if (istGefangen() || e.button !== 0) return;
      mausId = e.pointerId;
      mausX = e.clientX;
      mausY = e.clientY;
      mausWeg = 0;
      binde(e.pointerId);
      return;
    }
    const rechteck = element.getBoundingClientRect();
    const linkeHaelfte = e.clientX < rechteck.left + rechteck.width / 2;
    if (linkeHaelfte && joystickId === null) {
      joystickId = e.pointerId;
      joystickStartX = e.clientX;
      joystickStartY = e.clientY;
      anzeige.zeige(e.clientX, e.clientY);
      binde(e.pointerId);
    } else if (!linkeHaelfte && blickId === null) {
      blickId = e.pointerId;
      blickX = e.clientX;
      blickY = e.clientY;
      binde(e.pointerId);
    }
  }

  /** @param {PointerEvent} e */
  function zeigerBewegt(e) {
    if (!aktiv) return;
    if (e.pointerId === mausId) {
      const dx = e.clientX - mausX;
      const dy = e.clientY - mausY;
      mausX = e.clientX;
      mausY = e.clientY;
      mausWeg += Math.abs(dx) + Math.abs(dy);
      if (mausWeg > KLICK_TOLERANZ) drehe(dx, dy, mausEmpfindlichkeit * 1.5);
    } else if (e.pointerId === joystickId) {
      let dx = e.clientX - joystickStartX;
      let dy = e.clientY - joystickStartY;
      const laenge = Math.hypot(dx, dy);
      if (laenge > joystickRadius) {
        dx *= joystickRadius / laenge;
        dy *= joystickRadius / laenge;
      }
      anzeige.bewege(dx, dy);
      joystickWert.seit = dx / joystickRadius;
      joystickWert.vor = -dy / joystickRadius;
    } else if (e.pointerId === blickId) {
      drehe(e.clientX - blickX, e.clientY - blickY, touchEmpfindlichkeit);
      blickX = e.clientX;
      blickY = e.clientY;
    }
  }

  /** @param {PointerEvent} e */
  function zeigerHoch(e) {
    if (e.pointerId === mausId) {
      // Kurzer Klick ohne Ziehen: Maus einfangen
      if (aktiv && mausWeg <= KLICK_TOLERANZ && e.type === 'pointerup') fangeMaus();
      mausId = null;
    } else if (e.pointerId === joystickId) {
      joystickId = null;
      joystickWert.vor = joystickWert.seit = 0;
      anzeige.verstecke();
    } else if (e.pointerId === blickId) {
      blickId = null;
    }
  }

  function fangeMaus() {
    try {
      const ergebnis = /** @type {any} */ (element.requestPointerLock());
      // Neuere Browser geben ein Promise zurück; Ablehnung still ignorieren (Ziehen geht weiter).
      if (ergebnis && typeof ergebnis.catch === 'function') ergebnis.catch(() => {});
    } catch {
      // Pointer Lock nicht verfügbar: Ziehen zum Umsehen bleibt möglich.
    }
  }

  function kontextmenueVerhindern(/** @type {Event} */ e) {
    e.preventDefault();
  }

  window.addEventListener('keydown', tasteRunter);
  window.addEventListener('keyup', tasteHoch);
  window.addEventListener('blur', allesLoslassen);
  document.addEventListener('mousemove', mausBewegt);
  element.addEventListener('pointerdown', zeigerRunter);
  element.addEventListener('pointermove', zeigerBewegt);
  element.addEventListener('pointerup', zeigerHoch);
  element.addEventListener('pointercancel', zeigerHoch);
  element.addEventListener('contextmenu', kontextmenueVerhindern);

  // Vorab angelegt: keine neuen Objekte pro Bild
  const vorwaerts = new THREE.Vector3();
  const seitwaerts = new THREE.Vector3();

  return {
    aktualisiere(delta) {
      if (aktiv) {
        let vor = joystickWert.vor + (tasten.vor ? 1 : 0) - (tasten.zurueck ? 1 : 0);
        let seit = joystickWert.seit + (tasten.rechts ? 1 : 0) - (tasten.links ? 1 : 0);
        const laenge = Math.hypot(vor, seit);
        if (laenge > 1) {
          vor /= laenge;
          seit /= laenge;
        }
        if (laenge > 0.02) {
          vorwaerts.set(-Math.sin(gier), 0, -Math.cos(gier));
          seitwaerts.set(Math.cos(gier), 0, -Math.sin(gier));
          const weg = tempo * delta;
          kamera.position.x += (vorwaerts.x * vor + seitwaerts.x * seit) * weg;
          kamera.position.z += (vorwaerts.z * vor + seitwaerts.z * seit) * weg;
        }
        schiebeHeraus(kamera.position, radius, aktuelleHindernisse);
      }
      kamera.position.y = augenhoehe;
      kamera.rotation.set(nick, gier, 0);
    },
    setzePosition(x, z, blickWinkel) {
      kamera.position.set(x, augenhoehe, z);
      if (blickWinkel !== undefined) {
        gier = blickWinkel;
        nick = 0;
      }
      kamera.rotation.set(nick, gier, 0);
    },
    setzeHindernisse(liste) {
      aktuelleHindernisse = liste;
    },
    setzeAktiv(an) {
      aktiv = an;
      if (!an) {
        allesLoslassen();
        if (istGefangen()) document.exitPointerLock();
      }
    },
    istMausGefangen: istGefangen,
    entfernen() {
      window.removeEventListener('keydown', tasteRunter);
      window.removeEventListener('keyup', tasteHoch);
      window.removeEventListener('blur', allesLoslassen);
      document.removeEventListener('mousemove', mausBewegt);
      element.removeEventListener('pointerdown', zeigerRunter);
      element.removeEventListener('pointermove', zeigerBewegt);
      element.removeEventListener('pointerup', zeigerHoch);
      element.removeEventListener('pointercancel', zeigerHoch);
      element.removeEventListener('contextmenu', kontextmenueVerhindern);
      element.style.touchAction = vorherigesTouchAction;
      if (istGefangen()) document.exitPointerLock();
      anzeige.entfernen();
    },
  };
}
