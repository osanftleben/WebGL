// Sichtbarkeit je Zelle: Jedes Bild nur zeichnen, was vom Standort aus zu sehen sein kann.
//
// Verfahren (stilisiert, „im Zweifel mitzeichnen“):
// - Die Etage ist in ein festes Raster aus 1 × 1-m-Zellen geteilt; Zellen an einer Trennwand
//   werden an der Raumgrenze geteilt (jede Zelle gehört zu genau einem Raum). Ein Teil kommt in
//   die Zelle seiner Mitte; die Zelle wird mit dem echten Umriss ihrer Teile geprüft.
// - Teile, die über eine Raumgrenze reichen oder in der Wandfuge liegen (Boden, Decke, lange Wände,
//   Trennwände), heißen „allgemein“ und werden immer gezeichnet. Sehr große Teile innerhalb eines
//   Raums kommen in eine Raumzelle („gross“), damit die 1-m-Zellen klein bleiben.
// - Im Raum, in dem die Kamera steht, gilt das Sichtfeld. In einen Nachbarraum sieht man nur durch
//   einen offenen Durchgang: Liegt er im Sichtfeld, wird ein Sichtkegel von der Kamera durch die
//   (etwas vergrößerte) Öffnung gebildet, und nur Zellen in diesem Kegel werden gezeichnet. Das
//   setzt sich über weitere Durchgänge fort (Raum A → Raum B → Werkstatt, Kegel wird enger).
//
// Für die Detailstufen (LOD, Teil 2): `registriere(objekt)` hängt weitere Objekte an eine Zelle;
// `zelleSichtbar(schluessel)` bzw. `werte` zeigen, welche Zellen im letzten Bild sichtbar waren.
import * as THREE from 'three';

/**
 * @typedef {Object} Durchgang Offene Wandöffnung zwischen zwei Räumen (Wand quer zu z)
 * @property {[number, number]} zwischen Raumnummern (Index in `raeumeZ`)
 * @property {[number, number]} x Öffnung von … bis
 * @property {[number, number]} y Boden … Sturz
 * @property {[number, number]} z beide Wandflächen
 */

/**
 * @typedef {Object} Zelle
 * @property {string} schluessel
 * @property {number} raum
 * @property {THREE.Box3} box Weltquader aller Teile der Zelle
 * @property {THREE.Object3D[]} objekte
 * @property {boolean} sichtbar Ergebnis des letzten Tests
 */

/** Zelle „immer zeichnen“ */
export const ALLGEMEIN = 'allgemein';

/**
 * Baut die Sichtbarkeitsprüfung.
 * @param {Object} o
 * @param {number[][]} o.raeumeZ Räume als z-Bereiche [von, bis] (Wandfugen dazwischen)
 * @param {Durchgang[]} o.durchgaenge
 * @param {number} [o.zelle=1] Kantenlänge einer Zelle (m)
 * @param {number} [o.toleranz=0.3] So weit darf ein Teil eines Raums über dessen Grenze ragen (m)
 * @param {number} [o.gross=2] Teile, die in x oder z länger sind, kommen in die Raumzelle
 * @param {number} [o.rand=0.1] Öffnungen werden um so viel größer gerechnet (gegen Aufploppen)
 * @param {number} [o.standRand=0.3] Kamera so nah an einer Raumgrenze → beide Räume gelten als Standort
 */
export function erstelleSichtbarkeit({ raeumeZ, durchgaenge, zelle = 1, toleranz = 0.3, gross = 2, rand = 0.1, standRand = 0.3 }) {
  /** @type {Map<string, Zelle>} */
  const zellen = new Map();
  /** @type {Zelle[][]} Zellen je Raum */
  const jeRaum = raeumeZ.map(() => []);
  const dg = durchgaenge.map((d) => ({
    ...d,
    box: new THREE.Box3(new THREE.Vector3(d.x[0] - rand, d.y[0] - rand, d.z[0] - rand), new THREE.Vector3(d.x[1] + rand, d.y[1] + rand, d.z[1] + rand)),
  }));
  let aktiv = true;

  // Vorab angelegt (pro Bild keine neuen Objekte)
  const frustum = new THREE.Frustum();
  const matrix = new THREE.Matrix4();
  /** Ebenenstapel der Sichtkegel (je Durchgang 4 Ebenen, höchstens so viele Durchgänge hintereinander wie Räume) */
  const ebenen = Array.from({ length: 4 * raeumeZ.length }, () => new THREE.Plane());
  const ecken = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const mitte = new THREE.Vector3();
  const kamera = new THREE.Vector3();
  const hilfsBox = new THREE.Box3();

  /**
   * Zelle zu einem Weltquader (für `verschmelze` und `registriere`).
   * @param {THREE.Box3} box
   * @returns {string}
   */
  function schluessel(box) {
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    const r = raeumeZ.findIndex(([von, bis]) => cz >= von && cz <= bis);
    if (r < 0) return ALLGEMEIN;
    const [von, bis] = raeumeZ[r];
    if (box.min.z < von - toleranz || box.max.z > bis + toleranz) return ALLGEMEIN;
    if (box.max.x - box.min.x > gross || box.max.z - box.min.z > gross) return `${r}:gross`;
    return `${r}:${Math.floor(cx / zelle)}:${Math.floor(cz / zelle)}`;
  }

  /**
   * Hängt ein Objekt an eine Zelle (allgemeine Teile werden nicht angehängt, bleiben also immer sichtbar).
   * Nur Objekte anmelden, die sonst sichtbar sind – die Prüfung schaltet `visible`.
   * @param {THREE.Object3D} objekt
   * @param {{ schluessel?: string, rand?: number }} [o] fester Schlüssel; Rand um den Quader (z. B. für Drehungen)
   * @returns {string} Schlüssel der Zelle
   */
  function registriere(objekt, o = {}) {
    objekt.updateWorldMatrix(true, true);
    hilfsBox.setFromObject(objekt);
    if (o.rand) hilfsBox.expandByScalar(o.rand);
    const k = o.schluessel || schluessel(hilfsBox);
    const raum = Number(k.split(':')[0]);
    // Unbekannter Schlüssel → sicherheitshalber immer zeichnen
    if (k === ALLGEMEIN || !(raum >= 0 && raum < raeumeZ.length)) return ALLGEMEIN;
    let z = zellen.get(k);
    if (!z) {
      z = { schluessel: k, raum, box: new THREE.Box3(), objekte: [], sichtbar: true };
      zellen.set(k, z);
      jeRaum[z.raum].push(z);
    }
    z.box.union(hilfsBox);
    z.objekte.push(objekt);
    return k;
  }

  /** Liegt der Quader (wenigstens teilweise) auf der Innenseite der ersten `bis` Kegelebenen? */
  function imKegel(/** @type {THREE.Box3} */ box, /** @type {number} */ bis) {
    for (let i = 0; i < bis; i++) {
      const n = ebenen[i].normal;
      // Ecke des Quaders, die am weitesten auf der Innenseite liegt
      const d = n.x * (n.x > 0 ? box.max.x : box.min.x) + n.y * (n.y > 0 ? box.max.y : box.min.y) + n.z * (n.z > 0 ? box.max.z : box.min.z) + ebenen[i].constant;
      if (d < 0) return false;
    }
    return true;
  }

  /**
   * Legt die 4 Ebenen des Sichtkegels durch einen Durchgang ab `tiefe` an.
   * @returns {number} neue Tiefe (unverändert, wenn die Kamera praktisch in der Öffnung steht)
   */
  function kegelDurch(/** @type {typeof dg[number]} */ d, /** @type {number} */ tiefe) {
    // Die Wandfläche auf der Kameraseite: von dort aus ist die Öffnung am weitesten (sicherer Rand)
    const zp = Math.abs(kamera.z - d.z[0]) < Math.abs(kamera.z - d.z[1]) ? d.z[0] : d.z[1];
    if (Math.abs(kamera.z - zp) < 0.05) return tiefe;
    const x0 = d.x[0] - rand, x1 = d.x[1] + rand, y0 = d.y[0] - rand, y1 = d.y[1] + rand;
    ecken[0].set(x0, y0, zp);
    ecken[1].set(x1, y0, zp);
    ecken[2].set(x1, y1, zp);
    ecken[3].set(x0, y1, zp);
    mitte.set((x0 + x1) / 2, (y0 + y1) / 2, zp);
    for (let i = 0; i < 4; i++) {
      const e = ebenen[tiefe + i];
      e.setFromCoplanarPoints(kamera, ecken[i], ecken[(i + 1) % 4]);
      if (e.distanceToPoint(mitte) < 0) e.negate();
    }
    return tiefe + 4;
  }

  /**
   * Markiert die sichtbaren Zellen eines Raums und geht durch offene Durchgänge weiter.
   * @param {number} raum @param {number} tiefe Zahl der gültigen Kegelebenen @param {number} besucht Bitmaske der Räume auf dem Weg
   */
  function besuche(raum, tiefe, besucht) {
    for (const z of jeRaum[raum]) {
      if (!z.sichtbar && frustum.intersectsBox(z.box) && imKegel(z.box, tiefe)) z.sichtbar = true;
    }
    for (const d of dg) {
      const ziel = d.zwischen[0] === raum ? d.zwischen[1] : d.zwischen[1] === raum ? d.zwischen[0] : -1;
      if (ziel < 0 || besucht & (1 << ziel)) continue;
      if (!frustum.intersectsBox(d.box) || !imKegel(d.box, tiefe)) continue;
      besuche(ziel, kegelDurch(d, tiefe), besucht | (1 << ziel));
    }
  }

  /** Schaltet `visible` der Objekte nach dem Testergebnis (nur bei Änderung). */
  function anwenden() {
    for (const z of zellen.values()) {
      for (const o of z.objekte) if (o.visible !== z.sichtbar) o.visible = z.sichtbar;
    }
  }

  return {
    schluessel,
    registriere,
    /**
     * Pro Bild vor dem Zeichnen (und vor dem Messbild der Augenanpassung) aufrufen.
     * @param {THREE.PerspectiveCamera} camera
     */
    aktualisiere(camera) {
      if (!aktiv) return;
      camera.updateMatrixWorld();
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
      kamera.setFromMatrixPosition(camera.matrixWorld);
      for (const z of zellen.values()) z.sichtbar = false;
      raeumeZ.forEach(([von, bis], r) => {
        if (kamera.z >= von - standRand && kamera.z <= bis + standRand) besuche(r, 0, 1 << r);
      });
      anwenden();
    },
    /**
     * Führt `fn` mit allem sichtbar aus (z. B. Spiegelungsaufnahme) und stellt danach den Zustand wieder her.
     * @template T @param {() => T} fn @returns {T}
     */
    alles(fn) {
      const vorher = [...zellen.values()].map((z) => z.sichtbar);
      for (const z of zellen.values()) z.sichtbar = true;
      anwenden();
      try {
        return fn();
      } finally {
        [...zellen.values()].forEach((z, i) => (z.sichtbar = vorher[i]));
        anwenden();
      }
    },
    /** Prüfung ein-/ausschalten (aus: alles sichtbar). @param {boolean} an */
    setzeAktiv(an) {
      aktiv = an;
      if (!an) {
        for (const z of zellen.values()) z.sichtbar = true;
        anwenden();
      }
    },
    /** @param {string} k @returns {boolean} */
    zelleSichtbar(k) {
      return k === ALLGEMEIN || (zellen.get(k)?.sichtbar ?? true);
    },
    /** Für Prüfungen: Zellen und Zahl der sichtbaren */
    werte: {
      zellen,
      get sichtbar() {
        let n = 0;
        for (const z of zellen.values()) if (z.sichtbar) n++;
        return n;
      },
      get aktiv() {
        return aktiv;
      },
    },
  };
}
