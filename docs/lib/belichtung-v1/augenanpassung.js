// belichtung-v1: Augenanpassung – misst regelmäßig die Bildhelligkeit und führt die Belichtung
// (renderer.toneMappingExposure) weich nach: in hellen Blicken etwas dunkler, in dunklen etwas heller.
//
// Messung: Die Szene wird wenige Male pro Sekunde zusätzlich in ein kleines Bild (z. B. 32 × 32)
// gezeichnet. three.js wendet beim Zeichnen in ein Renderziel keine Farbkurve und keine Belichtung
// an – gemessen wird also die echte Helligkeit der Szene, unabhängig von der aktuellen Belichtung
// (keine Rückkopplung). Ausgelesen wird ohne Warten (readRenderTargetPixelsAsync); das Ergebnis
// kommt ein paar Millisekunden später an, das Bild läuft währenddessen weiter.
//
// Hinweis für Projekte: Beim ersten Zeichnen in das Renderziel legt three.js für jedes Material
// eine zweite Shader-Fassung an (ohne Farbkurve). Wer in `onBeforeCompile` eigene Uniforms
// einhängt, muss dieselben Uniform-Objekte wiederverwenden (z. B. `Object.assign(shader.uniforms,
// meineUniforms)`), sonst wirken spätere Änderungen nur auf eine der beiden Fassungen.
import * as THREE from 'three';

/**
 * @typedef {object} AugenOptionen
 * @property {number} [grundBelichtung] Belichtung ohne Anpassung; Vorgabe: der aktuelle Wert von
 *   `renderer.toneMappingExposure` beim Erstellen.
 * @property {number} [bezugsHelligkeit=0.18] Gemessene mittlere Helligkeit (linear, vor der Belichtung),
 *   bei der genau die Grundbelichtung gilt. Hellere Blicke → weniger, dunklere → mehr Belichtung.
 * @property {number} [staerke=0.5] Wie stark ausgeglichen wird (0 = gar nicht, 1 = voll).
 * @property {number} [minFaktor=0.7] Untergrenze der Belichtung als Vielfaches der Grundbelichtung.
 * @property {number} [maxFaktor=1.3] Obergrenze der Belichtung als Vielfaches der Grundbelichtung.
 * @property {number} [zeitHell=0.5] Zeitkonstante in Sekunden, wenn der Blick heller wird (Auge blendet schnell ab).
 * @property {number} [zeitDunkel=3] Zeitkonstante in Sekunden, wenn der Blick dunkler wird (Auge gewöhnt sich langsam).
 * @property {number} [messungenProSekunde=4] Wie oft gemessen wird.
 * @property {number} [aufloesung=32] Kantenlänge des Messbilds in Pixeln.
 * @property {number} [mittenbetonung=1] Gewicht der Bildmitte gegenüber dem Rand (0 = alles gleich,
 *   1 = Mitte zählt doppelt so viel wie der Rand).
 * @property {number} [totzone=0.03] Kleinere relative Änderungen des Zielwerts werden ignoriert
 *   (verhindert ständiges Nachregeln bei kleinen Bewegungen).
 * @property {boolean} [an=true] Gleich beim Erstellen eingeschaltet.
 */

/**
 * @typedef {object} AugenWerte Aktueller Zustand (zum Prüfen, z. B. über `__debug.belichtung.werte`).
 * @property {boolean} an
 * @property {number} belichtung aktuell gesetzte `toneMappingExposure`
 * @property {number} faktor aktuelle Belichtung / Grundbelichtung
 * @property {number} zielFaktor Faktor, auf den gerade hingeführt wird
 * @property {number | null} messung letzte gemessene mittlere Helligkeit (logarithmisches Mittel)
 * @property {number} messungen Anzahl ausgewerteter Messungen
 * @property {number} messDrawCalls Draw-Calls des letzten Messbilds (zusätzlich zum normalen Bild)
 * @property {number | null} lesedauerMs Zeit vom Start des Auslesens bis zum Ergebnis
 * @property {'float' | 'byte'} messart Gleitkomma-Messbild oder (Ersatz) 8-Bit-Messbild
 * @property {string | null} fehler Meldung, falls das Auslesen nicht klappt (dann ist die Anpassung aus)
 */

/**
 * @typedef {object} Augenanpassung
 * @property {AugenWerte} werte Aktueller Zustand (wird laufend aktualisiert, nicht verändern).
 * @property {Required<Omit<AugenOptionen, 'an'>>} einstellungen Die Einstellungen; dürfen zur Laufzeit geändert werden.
 * @property {(delta: number) => void} aktualisiere Einmal pro Bild **vor** `renderer.render` aufrufen.
 * @property {(an: boolean) => void} schalte Ein- oder ausschalten; aus = Grundbelichtung.
 * @property {(sekunden?: number, schritt?: number) => Promise<Array<{ t: number, belichtung: number, ziel: number, messung: number | null }>>} aufzeichnen
 *   Zeichnet Belichtung, Ziel und Messung über die Zeit auf (gerundet), zum Prüfen.
 * @property {() => void} entfernen Gibt das Messbild frei und setzt die Grundbelichtung zurück.
 */

/**
 * Erstellt eine Augenanpassung für einen Renderer. Sie ändert nur `renderer.toneMappingExposure`
 * und wirkt deshalb nur, wenn der Renderer eine Farbkurve nutzt (`toneMapping` ≠ NoToneMapping).
 *
 * Mehr Draw-Calls entstehen nur in den Bildern, in denen gemessen wird (die Szene wird dort ein
 * zweites Mal in das kleine Messbild gezeichnet).
 *
 * @example
 * const auge = erstelleAugenanpassung(renderer, scene, camera, { zeitDunkel: 3 });
 * starteSchleife(renderer, ({ delta }) => {
 *   auge.aktualisiere(delta);
 *   renderer.render(scene, camera);
 * });
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {AugenOptionen} [optionen]
 * @returns {Augenanpassung}
 */
export function erstelleAugenanpassung(renderer, scene, camera, optionen = {}) {
  const { an: anfangsAn = true, ...rest } = optionen;
  /** @type {Required<Omit<AugenOptionen, 'an'>>} */
  const einstellungen = {
    grundBelichtung: renderer.toneMappingExposure,
    bezugsHelligkeit: 0.18,
    staerke: 0.5,
    minFaktor: 0.7,
    maxFaktor: 1.3,
    zeitHell: 0.5,
    zeitDunkel: 3,
    messungenProSekunde: 4,
    aufloesung: 32,
    mittenbetonung: 1,
    totzone: 0.03,
    ...rest,
  };

  // Gleitkomma-Messbild, wenn die Grafikkarte es kann (fast überall); sonst 8 Bit (helle Fenster
  // werden dann bei 1,0 abgeschnitten, dunkle Stellen grob gestuft – die Anpassung bleibt grob nutzbar).
  const kannFloat = renderer.extensions.has('EXT_color_buffer_float');
  const n = Math.max(4, Math.round(einstellungen.aufloesung));
  const ziel = new THREE.WebGLRenderTarget(n, n, {
    type: kannFloat ? THREE.FloatType : THREE.UnsignedByteType,
    depthBuffer: true,
    generateMipmaps: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  const puffer = kannFloat ? new Float32Array(n * n * 4) : new Uint8Array(n * n * 4);
  const teiler = kannFloat ? 1 : 255;

  // Gewicht jedes Pixels einmal vorab: Bildmitte stärker (wie die mittenbetonte Messung einer Kamera)
  const gewichte = new Float32Array(n * n);
  function berechneGewichte() {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = ((x + 0.5) / n) * 2 - 1;
        const dy = ((y + 0.5) / n) * 2 - 1;
        const r2 = Math.min(1, dx * dx + dy * dy);
        gewichte[y * n + x] = 1 + einstellungen.mittenbetonung * (1 - r2);
      }
    }
  }
  berechneGewichte();
  let gewichtBasis = einstellungen.mittenbetonung;

  /** @type {AugenWerte} */
  const werte = {
    an: anfangsAn,
    belichtung: einstellungen.grundBelichtung,
    faktor: 1,
    zielFaktor: 1,
    messung: null,
    messungen: 0,
    messDrawCalls: 0,
    lesedauerMs: null,
    messart: kannFloat ? 'float' : 'byte',
    fehler: null,
  };

  // Belichtung wird logarithmisch geglättet (gleich große Schritte nach oben und unten fühlen sich gleich an)
  let lnFaktor = 0;
  let lnZiel = 0;
  let seitMessung = Infinity;
  let leseLaeuft = false;
  let bereit = false;
  let entfernt = false;

  // Shader-Fassungen für das Messbild vorab und möglichst parallel übersetzen, damit die erste
  // Messung nicht ruckelt. Bis dahin wird nicht gemessen.
  {
    const vorher = renderer.getRenderTarget();
    renderer.setRenderTarget(ziel);
    const warten = renderer.compileAsync(scene, camera);
    renderer.setRenderTarget(vorher);
    warten.then(() => { bereit = true; }, () => { bereit = true; });
  }

  /** Wertet das ausgelesene Messbild aus (logarithmisches Mittel der Helligkeit). */
  function auswerten() {
    if (gewichtBasis !== einstellungen.mittenbetonung) {
      berechneGewichte();
      gewichtBasis = einstellungen.mittenbetonung;
    }
    let summe = 0;
    let summeGewicht = 0;
    for (let i = 0, p = 0; i < n * n; i++, p += 4) {
      const hell = (0.2126 * puffer[p] + 0.7152 * puffer[p + 1] + 0.0722 * puffer[p + 2]) / teiler;
      // Untergrenze gegen log(0); Obergrenze, damit einzelne extreme Lichter nicht alles bestimmen
      const h = Math.min(Math.max(hell, 1e-4), 1e4);
      const g = gewichte[i];
      summe += g * Math.log(h);
      summeGewicht += g;
    }
    const mittel = Math.exp(summe / summeGewicht);
    werte.messung = mittel;
    werte.messungen++;

    const { bezugsHelligkeit, staerke, minFaktor, maxFaktor, totzone } = einstellungen;
    const lnNeu = Math.min(Math.max(staerke * Math.log(bezugsHelligkeit / mittel), Math.log(minFaktor)), Math.log(maxFaktor));
    // Totzone: kleine Schwankungen des Ziels nicht weitergeben (kein Pumpen bei kleinen Bewegungen)
    if (Math.abs(lnNeu - lnZiel) > Math.log(1 + totzone)) lnZiel = lnNeu;
    werte.zielFaktor = Math.exp(lnZiel);
  }

  /** Zeichnet das Messbild und startet das Auslesen ohne Warten. */
  function messe() {
    const vorher = renderer.getRenderTarget();
    renderer.setRenderTarget(ziel);
    renderer.render(scene, camera);
    renderer.setRenderTarget(vorher);
    werte.messDrawCalls = renderer.info.render.calls;

    leseLaeuft = true;
    const start = performance.now();
    renderer.readRenderTargetPixelsAsync(ziel, 0, 0, n, n, puffer)
      .then(() => {
        if (entfernt) return;
        werte.lesedauerMs = Math.round(performance.now() - start);
        auswerten();
      })
      .catch((/** @type {any} */ e) => {
        // Auslesen klappt hier nicht: Anpassung ausschalten statt in jedem Bild Fehler zu werfen
        werte.fehler = String(e && e.message ? e.message : e);
        console.warn('Augenanpassung ausgeschaltet, Messbild nicht lesbar:', werte.fehler);
        schalte(false);
      })
      .finally(() => { leseLaeuft = false; });
  }

  /** @param {number} delta Sekunden seit dem letzten Bild */
  function aktualisiere(delta) {
    if (!werte.an || entfernt) return;

    seitMessung += delta;
    if (bereit && !leseLaeuft && seitMessung >= 1 / einstellungen.messungenProSekunde) {
      seitMessung = 0;
      messe();
    }

    // Weich nachführen: wird der Blick heller (Ziel kleiner), schnell; wird er dunkler, langsam
    const zeit = lnZiel < lnFaktor ? einstellungen.zeitHell : einstellungen.zeitDunkel;
    const k = 1 - Math.exp(-delta / Math.max(zeit, 1e-3));
    lnFaktor += (lnZiel - lnFaktor) * k;

    werte.faktor = Math.exp(lnFaktor);
    werte.belichtung = einstellungen.grundBelichtung * werte.faktor;
    renderer.toneMappingExposure = werte.belichtung;
  }

  /** @param {boolean} an */
  function schalte(an) {
    werte.an = an;
    lnFaktor = 0;
    lnZiel = 0;
    seitMessung = Infinity;
    werte.faktor = 1;
    werte.zielFaktor = 1;
    werte.belichtung = einstellungen.grundBelichtung;
    renderer.toneMappingExposure = einstellungen.grundBelichtung;
  }

  /**
   * @param {number} [sekunden=6]
   * @param {number} [schritt=0.25]
   */
  function aufzeichnen(sekunden = 6, schritt = 0.25) {
    /** @type {Array<{ t: number, belichtung: number, ziel: number, messung: number | null }>} */
    const reihe = [];
    const start = performance.now();
    const r3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;
    return new Promise((fertig) => {
      function schreibe() {
        const t = (performance.now() - start) / 1000;
        reihe.push({
          t: Math.round(t * 100) / 100,
          belichtung: r3(werte.belichtung),
          ziel: r3(einstellungen.grundBelichtung * werte.zielFaktor),
          messung: werte.messung === null ? null : r3(werte.messung),
        });
        if (t < sekunden) setTimeout(schreibe, schritt * 1000);
        else fertig(reihe);
      }
      schreibe();
    });
  }

  function entfernen() {
    schalte(false);
    entfernt = true;
    ziel.dispose();
  }

  schalte(anfangsAn);
  return { werte, einstellungen, aktualisiere, schalte, aufzeichnen, entfernen };
}
