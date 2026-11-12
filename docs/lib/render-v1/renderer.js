// render-v1: Renderer erstellen und Größe/Pixeldichte aktuell halten.
import * as THREE from 'three';

/**
 * Erstellt einen WebGLRenderer, hängt seine Zeichenfläche an den Container
 * und passt Größe, Pixeldichte und Kamera-Seitenverhältnis automatisch an.
 *
 * @param {object} [optionen]
 * @param {HTMLElement} [optionen.container=document.body] Element, das die Zeichenfläche aufnimmt.
 * @param {THREE.PerspectiveCamera} [optionen.kamera] Wird bei Größenänderung mit angepasst.
 * @param {number} [optionen.maxPixelRatio=2] Obergrenze für die Pixeldichte (schont schwache Grafikkarten).
 * @param {boolean} [optionen.antialias=true] Kantenglättung.
 * @param {(breite: number, hoehe: number) => void} [optionen.beiGroesse] Wird nach jeder Größenänderung aufgerufen.
 * @returns {{ renderer: THREE.WebGLRenderer, entfernen: () => void }}
 */
export function erstelleRenderer({
  container = document.body,
  kamera,
  maxPixelRatio = 2,
  antialias = true,
  beiGroesse,
} = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias });
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  function anpassen() {
    const breite = container.clientWidth || window.innerWidth;
    const hoehe = container.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.setSize(breite, hoehe);
    if (kamera) {
      kamera.aspect = breite / hoehe;
      kamera.updateProjectionMatrix();
    }
    if (beiGroesse) beiGroesse(breite, hoehe);
  }

  const beobachter = new ResizeObserver(anpassen);
  beobachter.observe(container);
  anpassen();

  return {
    renderer,
    /** Beendet die Größenüberwachung, gibt den Renderer frei und entfernt die Zeichenfläche. */
    entfernen() {
      beobachter.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
