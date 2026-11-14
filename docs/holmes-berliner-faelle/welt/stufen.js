// Detailstufen (LOD) für Figuren, Büsten und Köpfe: aus der Nähe die volle Form, ab einem Abstand
// eine sparsamere Fassung (gröberes Gitter, siehe `sparsam` in welt/menschen.js).
//
// Verfahren:
// - Beim Bau markiert `alsStufe(gruppe, bauSparsam, { abstand })` eine Gruppe als Einheit; `bauSparsam()`
//   baut dieselbe Gruppe noch einmal in der sparsamen Stufe (gleiche lokale Lage, ohne Lichtangaben).
// - `baueStufen` läuft in etage3.js NACH dem Sammeln von Lichtmodell und Kontaktflecken (die sehen nur
//   die volle Form, nichts wird doppelt erfasst) und VOR dem Verschmelzen der Zellen: Jede Einheit wird
//   je Material zu einem Netz zusammengefasst (volle und sparsame Stufe getrennt), in eine Hülle
//   gesteckt und aus der Gruppe genommen. `einhaengen` (nach dem Verschmelzen) setzt die Hüllen ein und
//   meldet sie in ihrer 1-m-Zelle der Sichtbarkeitsprüfung an.
// - Pro Bild (nach der Sichtbarkeit) wählt `aktualisiere` für die sichtbaren Einheiten die Stufe nach
//   dem Abstand der Kamera zum Umriss der Einheit. Der Umschaltabstand wächst mit der Fensterhöhe in
//   Bildpunkten (Bezug 1080), mit 10 % Spielraum gegen Flackern; unter MIN_NAH immer voll.
// - Antippen und Spiegelungsaufnahme sehen die volle Form (`verdecker`; Anfangszustand voll).
// - Kranich, Leiche und verdeckte Figur: eigenes `baueStufen` je Objekt (Hüllen im Objekt, drehen also
//   mit), `einhaengen(null)` und danach `verknuepfe` mit der Zelle, in der das ganze Objekt angemeldet
//   ist; `alleStufen` fasst alles für die Bildschleife zusammen (main.js).
// - Alle Figuren der Zukunft: Gruppe mit `alsStufe(teil, () => sparsam(bau), { abstand })` markieren.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Bezug für `abstand`: Bildhöhe in Bildpunkten bei 70° senkrechtem Sichtfeld */
const BEZUG_HOEHE = 1080;
const BEZUG_BRENNWEITE = BEZUG_HOEHE / (2 * Math.tan(THREE.MathUtils.degToRad(35)));
/** Spielraum: fern ab abstand · SPIELRAUM, zurück zu voll unter abstand */
const SPIELRAUM = 1.1;
/** Näher als so viele Meter bleibt alles voll (auch im kleinen Fenster) */
const MIN_NAH = 1.5;

/**
 * Markiert eine Gruppe als Detailstufen-Einheit (Gruppe = volle Stufe).
 * @param {THREE.Object3D} gruppe
 * @param {() => THREE.Object3D} bauSparsam baut die sparsame Fassung in denselben lokalen Koordinaten
 *   (meist `() => sparsam(() => bau())`); Lage, Drehung und Größe übernimmt sie von `gruppe`
 * @param {{ abstand: number, beweglich?: boolean }} o Umschaltabstand (m) bei 1080 Bildpunkten Bildhöhe;
 *   `beweglich`: das Objekt dreht sich (Kranich), Umriss pro Bild neu
 * @returns {THREE.Object3D} die Gruppe
 */
export function alsStufe(gruppe, bauSparsam, { abstand, beweglich = false }) {
  gruppe.userData.stufe = { bauSparsam, abstand, beweglich };
  return gruppe;
}

/**
 * Fasst mehrere Ergebnisse von `baueStufen` (Etage, Fundstücke, Kranich) für die Bildschleife zusammen.
 * @param {ReturnType<typeof baueStufen>[]} liste
 */
export function alleStufen(liste) {
  return {
    /** @param {THREE.PerspectiveCamera} camera @param {THREE.WebGLRenderer} renderer */
    aktualisiere(camera, renderer) {
      for (const s of liste) s.aktualisiere(camera, renderer);
    },
    /** @param {'voll' | 'spar' | null} modus */
    erzwinge(modus) {
      for (const s of liste) s.erzwinge(modus);
    },
    werte: {
      get einheiten() {
        return liste.flatMap((s) => s.werte.einheiten);
      },
      get fern() {
        return liste.reduce((n, s) => n + s.werte.fern, 0);
      },
      get wechsel() {
        return liste.reduce((n, s) => n + s.werte.wechsel, 0);
      },
    },
  };
}

/**
 * Fasst alle sichtbaren Netze unter `wurzel` je Material zusammen (Weltkoordinaten → `inverse`).
 * @param {THREE.Object3D} wurzel @param {THREE.Matrix4} inverse
 * @returns {THREE.Mesh[]}
 */
function zusammenfassen(wurzel, inverse) {
  /** @type {Map<THREE.Material, THREE.BufferGeometry[]>} */
  const jeMaterial = new Map();
  wurzel.traverse((o) => {
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh || !mesh.visible || mesh.userData.nurTreffer) return;
    const material = /** @type {THREE.Material} */ (mesh.material);
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    if (!jeMaterial.has(material)) jeMaterial.set(material, []);
    /** @type {THREE.BufferGeometry[]} */ (jeMaterial.get(material)).push(geo);
  });
  /** @type {THREE.Mesh[]} */
  const netze = [];
  for (const [material, geos] of jeMaterial) {
    const zusammen = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!zusammen) {
      console.warn('Detailstufe: Teile ließen sich nicht zusammenfassen', material);
      continue;
    }
    zusammen.applyMatrix4(inverse);
    zusammen.computeBoundingSphere();
    netze.push(new THREE.Mesh(zusammen, material));
  }
  return netze;
}

/**
 * @typedef {Object} Einheit
 * @property {THREE.Group} huelle in der Sichtbarkeitszelle angemeldet
 * @property {THREE.Group} voll @property {THREE.Group} spar
 * @property {THREE.Box3} box Weltumriss der vollen Stufe
 * @property {string} zelle Schlüssel der Sichtbarkeitszelle
 * @property {number} abstand Umschaltabstand bei 1080 Bildpunkten
 * @property {boolean} fern aktuell sparsame Stufe
 * @property {boolean} beweglich Umriss pro Bild neu (dreht sich)
 */

/**
 * @typedef {{ registriere: (o: THREE.Object3D, opt?: { schluessel?: string }) => string, zelleSichtbar: (k: string) => boolean }} Sichtbarkeit
 */

/**
 * Legt zu allen markierten Einheiten in `gruppe` die Stufen an und nimmt die Einheiten heraus
 * (siehe Kopf der Datei). Danach verschmelzen, dann `einhaengen(sichtbarkeit)` aufrufen.
 * @param {THREE.Group} gruppe
 */
export function baueStufen(gruppe) {
  gruppe.updateWorldMatrix(true, true);
  const inverse = gruppe.matrixWorld.clone().invert();
  /** @type {THREE.Object3D[]} */
  const markiert = [];
  gruppe.traverse((o) => {
    if (o.userData.stufe) markiert.push(o);
  });
  /** @type {Einheit[]} */
  const einheiten = [];
  /** @type {THREE.Mesh[]} */
  const verdecker = [];
  for (const e of markiert) {
    const { bauSparsam, abstand, beweglich } = e.userData.stufe;
    const parent = /** @type {THREE.Object3D} */ (e.parent);
    const sp = bauSparsam();
    sp.position.copy(e.position);
    sp.quaternion.copy(e.quaternion);
    sp.scale.copy(e.scale);
    parent.add(sp);
    sp.updateWorldMatrix(true, true);
    const huelle = new THREE.Group();
    huelle.name = 'Detailstufe';
    const voll = new THREE.Group();
    const spar = new THREE.Group();
    voll.add(...zusammenfassen(e, inverse));
    spar.add(...zusammenfassen(sp, inverse));
    spar.visible = false;
    e.removeFromParent();
    sp.removeFromParent();
    huelle.add(voll, spar);
    verdecker.push(.../** @type {THREE.Mesh[]} */ (voll.children));
    einheiten.push({ huelle, voll, spar, box: new THREE.Box3(), zelle: '', abstand, fern: false, beweglich });
  }
  /** @type {Sichtbarkeit | null} */
  let sichtbarkeit = null;

  const kamera = new THREE.Vector3();
  /** @type {'voll' | 'spar' | null} */
  let erzwungen = null;
  let wechsel = 0;
  const setze = (/** @type {Einheit} */ e, /** @type {boolean} */ fern) => {
    if (e.fern === fern) return;
    e.fern = fern;
    e.voll.visible = !fern;
    e.spar.visible = fern;
    wechsel++;
  };

  return {
    /** Volle Netze (für das Antippen: Strahl trifft wie bisher die volle Form) */
    verdecker,
    /**
     * Setzt die Hüllen in die Gruppe (nach dem Verschmelzen) und meldet sie in ihrer Zelle an.
     * @param {Sichtbarkeit} s
     */
    einhaengen(s) {
      sichtbarkeit = s;
      for (const e of einheiten) {
        gruppe.add(e.huelle);
        e.huelle.updateWorldMatrix(true, true);
        e.box.setFromObject(e.voll);
        e.zelle = s ? s.registriere(e.huelle) : '';
      }
    },
    /**
     * Für Objekte, die als Ganzes in der Sichtbarkeit angemeldet sind (Kranich, Leiche, Fundstücke):
     * nach `einhaengen(null)` und der Anmeldung des Objekts dessen Zelle übernehmen.
     * @param {Sichtbarkeit} s @param {string} schluessel
     */
    verknuepfe(s, schluessel) {
      sichtbarkeit = s;
      for (const e of einheiten) e.zelle = schluessel;
    },
    /**
     * Pro Bild nach `sichtbarkeit.aktualisiere` aufrufen (vor Messbild und Hauptbild).
     * @param {THREE.PerspectiveCamera} camera @param {THREE.WebGLRenderer} renderer
     */
    aktualisiere(camera, renderer) {
      kamera.setFromMatrixPosition(camera.matrixWorld);
      // Brennweite in Bildpunkten: größeres Fenster → später umschalten
      const hoehe = renderer.getContext().drawingBufferHeight;
      const faktor = hoehe / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.zoom) / BEZUG_BRENNWEITE;
      for (const e of einheiten) {
        if (erzwungen) {
          setze(e, erzwungen === 'spar');
          continue;
        }
        if (sichtbarkeit && !sichtbarkeit.zelleSichtbar(e.zelle)) continue;
        // Bewegliche Einheiten (Kranich dreht sich): Umriss neu (Begrenzungsquader der Netze, billig)
        if (e.beweglich) e.box.setFromObject(e.fern ? e.spar : e.voll);
        const d = e.box.distanceToPoint(kamera);
        const grenze = Math.max(MIN_NAH, e.abstand * faktor);
        if (e.fern) {
          if (d < grenze) setze(e, false);
        } else if (d > grenze * SPIELRAUM) setze(e, true);
      }
    },
    /** Für Prüfungen: Stufe für alle erzwingen ('voll' | 'spar') oder Abstandswahl (null). @param {'voll' | 'spar' | null} modus */
    erzwinge(modus) {
      erzwungen = modus;
    },
    /** Für Prüfungen */
    werte: {
      einheiten,
      get fern() {
        return einheiten.filter((e) => e.fern).length;
      },
      get wechsel() {
        return wechsel;
      },
    },
  };
}
