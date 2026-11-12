// debug-v1: Debug-Zugang für die lokale Vorschau (für Claude und /perf-check).
// Auf der veröffentlichten Seite (GitHub Pages) passiert hier nichts.

/** true, wenn die Seite lokal (Vorschau-Server) läuft. */
export const istLokal = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);

/**
 * Stellt Renderer, Szene und Kamera unter `window.__debug` bereit – nur lokal.
 *
 * Danach im Browser verfügbar:
 * - `__debug.info()`       → Draw-Calls, Dreiecke, Geometrien, Texturen, Shader-Programme
 * - `__debug.messeFps(3)`  → durchschnittliche Bildrate über 3 Sekunden (Promise)
 *
 * @param {object} objekte
 * @param {import('three').WebGLRenderer} objekte.renderer
 * @param {import('three').Scene} [objekte.scene]
 * @param {import('three').Camera} [objekte.camera]
 */
export function stelleBereit({ renderer, scene, camera }) {
  if (!istLokal) return;

  /** @type {any} */ (window).__debug = {
    renderer,
    scene,
    camera,
    info() {
      const { render, memory, programs } = renderer.info;
      return {
        drawCalls: render.calls,
        dreiecke: render.triangles,
        punkte: render.points,
        linien: render.lines,
        geometrien: memory.geometries,
        texturen: memory.textures,
        shaderProgramme: programs ? programs.length : null,
        pixelRatio: renderer.getPixelRatio(),
      };
    },
    /**
     * Misst die durchschnittliche Bildrate.
     * @param {number} [sekunden=3]
     * @returns {Promise<{ fps: number, bilder: number, sekunden: number }>}
     */
    messeFps(sekunden = 3) {
      return new Promise((fertig) => {
        let bilder = 0;
        const start = performance.now();
        function zaehlen() {
          bilder++;
          const vergangen = (performance.now() - start) / 1000;
          if (vergangen < sekunden) {
            requestAnimationFrame(zaehlen);
          } else {
            fertig({ fps: Math.round((bilder / vergangen) * 10) / 10, bilder, sekunden: vergangen });
          }
        }
        requestAnimationFrame(zaehlen);
      });
    },
  };
}
