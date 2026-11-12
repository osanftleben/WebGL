// render-v1: Render-Schleife mit Zeitdifferenz zwischen den Bildern.

/**
 * @typedef {object} Bildzeit
 * @property {number} delta Sekunden seit dem letzten Bild (begrenzt, z. B. nach Tab-Wechsel).
 * @property {number} gesamt Sekunden seit Start der Schleife (Summe der begrenzten Deltas).
 */

/**
 * Startet eine Render-Schleife über renderer.setAnimationLoop.
 * Pro Bild wird `proBild` mit der vergangenen Zeit aufgerufen; das Zeichnen
 * (renderer.render) erledigt `proBild` selbst.
 *
 * @param {import('three').WebGLRenderer} renderer
 * @param {(zeit: Bildzeit) => void} proBild
 * @param {object} [optionen]
 * @param {number} [optionen.maxDelta=0.1] Obergrenze für delta in Sekunden (verhindert Sprünge).
 * @returns {{ stoppen: () => void }}
 */
export function starteSchleife(renderer, proBild, { maxDelta = 0.1 } = {}) {
  /** @type {number | null} */
  let letzte = null;
  let gesamt = 0;
  // Ein Objekt für alle Bilder: keine neuen Objekte pro Bild.
  /** @type {Bildzeit} */
  const zeit = { delta: 0, gesamt: 0 };

  renderer.setAnimationLoop((zeitstempel) => {
    const delta = letzte === null ? 0 : Math.min((zeitstempel - letzte) / 1000, maxDelta);
    letzte = zeitstempel;
    gesamt += delta;
    zeit.delta = delta;
    zeit.gesamt = gesamt;
    proBild(zeit);
  });

  return {
    /** Hält die Schleife an. */
    stoppen() {
      renderer.setAnimationLoop(null);
      letzte = null;
    },
  };
}
