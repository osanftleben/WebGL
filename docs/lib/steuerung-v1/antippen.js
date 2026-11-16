// steuerung-v1: Objekte antippen (Touch) oder anklicken (Maus, mit Fadenkreuz bei eingefangener Maus).
import * as THREE from 'three';

/** Länger gedrückt oder weiter bewegt ist kein Antippen mehr (ms / CSS-Pixel). */
const TIPP_DAUER = 450;
const TIPP_WEG = 10;

/**
 * @typedef {object} Antippen
 * @property {() => void} aktualisiere Pro Bild aufrufen: prüft bei eingefangener Maus,
 *   worauf das Fadenkreuz zielt, und meldet Wechsel über `beiZielWechsel`.
 * @property {(liste: readonly import('three').Object3D[]) => void} setzeObjekte Ersetzt die antippbaren Objekte.
 * @property {(liste: readonly import('three').Object3D[]) => void} setzeVerdecker Ersetzt die Objekte, die die Sicht versperren.
 * @property {(an: boolean) => void} setzeAktiv Schaltet das Antippen an oder aus.
 * @property {() => import('three').Object3D | null} gibZiel Objekt unter dem Fadenkreuz (nur bei eingefangener Maus).
 * @property {() => void} entfernen Entfernt Ereignis-Abhörer und Fadenkreuz.
 */

/**
 * Macht Objekte antippbar.
 * Touch: kurzes Antippen ohne Wischen wählt das Objekt unter dem Finger.
 * Maus: ist sie eingefangen (Pointer Lock), wählt ein Klick das Objekt in der Bildmitte (Fadenkreuz);
 * sonst das Objekt unter dem Mauszeiger.
 * Gemeldet wird immer das Objekt aus `objekte` (auch wenn ein Kind davon getroffen wurde).
 *
 * @param {object} optionen
 * @param {import('three').Camera} optionen.kamera
 * @param {HTMLElement} optionen.element Element, das Maus/Touch empfängt (meist renderer.domElement).
 * @param {readonly import('three').Object3D[]} [optionen.objekte=[]] Antippbare Objekte.
 * @param {readonly import('three').Object3D[]} [optionen.verdecker=[]] Objekte, die antippbare verdecken (z. B. Wände).
 * @param {number} [optionen.maxEntfernung=3] Größte Entfernung in Metern.
 * @param {(objekt: import('three').Object3D, treffer: import('three').Intersection) => void} [optionen.beiAntippen]
 * @param {(neu: import('three').Object3D | null, alt: import('three').Object3D | null) => void} [optionen.beiZielWechsel]
 *   Wird gerufen, wenn das Fadenkreuz auf ein anderes antippbares Objekt zeigt (oder auf keins mehr).
 * @param {boolean} [optionen.fadenkreuz=true] Fadenkreuz anzeigen, solange die Maus eingefangen ist.
 * @param {boolean} [optionen.mitteImmer=false] Touch-Modus: Fadenkreuz immer sichtbar, Ziel immer die Bildmitte,
 *   Antippen an beliebiger Stelle gilt dem Fadenkreuz.
 * @returns {Antippen}
 */
export function erstelleAntippen({
  kamera,
  element,
  objekte = [],
  verdecker = [],
  maxEntfernung = 3,
  beiAntippen,
  beiZielWechsel,
  fadenkreuz = true,
  mitteImmer = false,
}) {
  /** @type {readonly import('three').Object3D[]} */
  let antippbar = objekte;
  /** @type {readonly import('three').Object3D[]} */
  let sperren = verdecker;
  /** @type {Set<import('three').Object3D>} */
  let menge = new Set(antippbar);
  /** @type {import('three').Object3D[]} */
  let pruefliste = [...antippbar, ...sperren];
  let aktiv = true;
  /** @type {import('three').Object3D | null} */
  let ziel = null;

  const raycaster = new THREE.Raycaster();
  raycaster.far = maxEntfernung;
  const punkt = new THREE.Vector2();
  /** @type {import('three').Intersection[]} */
  const treffer = [];
  const mitte = new THREE.Vector2(0, 0);

  /** Zeiger, die gerade gedrückt sind: id → Startwerte */
  /** @type {Map<number, { x: number, y: number, zeit: number, weg: number }>} */
  const gedrueckt = new Map();

  // Fadenkreuz (nur sichtbar bei eingefangener Maus)
  const kreuz = document.createElement('div');
  Object.assign(kreuz.style, {
    position: 'fixed',
    left: '50%',
    top: '50%',
    width: '6px',
    height: '6px',
    marginLeft: '-3px',
    marginTop: '-3px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.85)',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
    display: 'none',
    zIndex: '10',
  });
  if (fadenkreuz) document.body.appendChild(kreuz);
  if (mitteImmer) kreuz.style.display = 'block';

  const istGefangen = () => mitteImmer || document.pointerLockElement === element;

  function sperreGeaendert() {
    if (mitteImmer) return;
    kreuz.style.display = fadenkreuz && istGefangen() ? 'block' : 'none';
    if (!istGefangen()) setzeZiel(null);
  }

  /** Sucht das antippbare Objekt, zu dem ein getroffenes (Kind-)Objekt gehört. */
  function findeAntippbar(/** @type {import('three').Object3D | null} */ objekt) {
    while (objekt) {
      if (menge.has(objekt)) return objekt;
      objekt = objekt.parent;
    }
    return null;
  }

  /**
   * Prüft den Strahl durch einen Bildpunkt (−1 … 1). Liefert das erste Objekt,
   * wenn es antippbar ist – ein Verdecker davor blockiert.
   * @param {THREE.Vector2} ndc
   */
  function pruefe(ndc) {
    raycaster.setFromCamera(ndc, kamera);
    treffer.length = 0;
    raycaster.intersectObjects(pruefliste, true, treffer);
    if (treffer.length === 0) return null;
    const erster = treffer[0];
    const objekt = findeAntippbar(erster.object);
    return objekt ? { objekt, treffer: erster } : null;
  }

  function setzeZiel(/** @type {import('three').Object3D | null} */ neu) {
    if (neu === ziel) return;
    const alt = ziel;
    ziel = neu;
    if (beiZielWechsel) beiZielWechsel(neu, alt);
  }

  /** @param {PointerEvent} e */
  function zeigerRunter(e) {
    if (!aktiv) return;
    gedrueckt.set(e.pointerId, { x: e.clientX, y: e.clientY, zeit: performance.now(), weg: 0 });
  }

  /** @param {PointerEvent} e */
  function zeigerBewegt(e) {
    const start = gedrueckt.get(e.pointerId);
    if (!start) return;
    // Bei eingefangener Maus bleibt clientX gleich; Bewegung steckt in movementX.
    start.weg += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    start.weg = Math.max(start.weg, Math.hypot(e.clientX - start.x, e.clientY - start.y));
  }

  /** @param {PointerEvent} e */
  function zeigerHoch(e) {
    const start = gedrueckt.get(e.pointerId);
    gedrueckt.delete(e.pointerId);
    if (!start || !aktiv || e.type !== 'pointerup') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (performance.now() - start.zeit > TIPP_DAUER || start.weg > TIPP_WEG) return;

    let ergebnis;
    if (mitteImmer || (e.pointerType === 'mouse' && istGefangen())) {
      ergebnis = pruefe(mitte);
    } else {
      const rechteck = element.getBoundingClientRect();
      punkt.set(
        ((e.clientX - rechteck.left) / rechteck.width) * 2 - 1,
        -((e.clientY - rechteck.top) / rechteck.height) * 2 + 1,
      );
      ergebnis = pruefe(punkt);
    }
    if (ergebnis && beiAntippen) beiAntippen(ergebnis.objekt, ergebnis.treffer);
  }

  element.addEventListener('pointerdown', zeigerRunter);
  element.addEventListener('pointermove', zeigerBewegt);
  element.addEventListener('pointerup', zeigerHoch);
  element.addEventListener('pointercancel', zeigerHoch);
  document.addEventListener('pointerlockchange', sperreGeaendert);

  return {
    aktualisiere() {
      if (!aktiv || !istGefangen()) return;
      const ergebnis = pruefe(mitte);
      setzeZiel(ergebnis ? ergebnis.objekt : null);
    },
    setzeObjekte(liste) {
      antippbar = liste;
      menge = new Set(antippbar);
      pruefliste = [...antippbar, ...sperren];
      if (ziel && !menge.has(ziel)) setzeZiel(null);
    },
    setzeVerdecker(liste) {
      sperren = liste;
      pruefliste = [...antippbar, ...sperren];
    },
    setzeAktiv(an) {
      aktiv = an;
      gedrueckt.clear();
      if (!an) setzeZiel(null);
    },
    gibZiel: () => ziel,
    entfernen() {
      element.removeEventListener('pointerdown', zeigerRunter);
      element.removeEventListener('pointermove', zeigerBewegt);
      element.removeEventListener('pointerup', zeigerHoch);
      element.removeEventListener('pointercancel', zeigerHoch);
      document.removeEventListener('pointerlockchange', sperreGeaendert);
      kreuz.remove();
    },
  };
}
