// Bauteile für Innenräume: Wände mit Öffnungen, Möbel, Ausstellungsstücke.
// Alles stilisiert aus einfachen Formen; Maße in Metern.
import * as THREE from 'three';
import { dielenTextur, putzTextur, holzTextur, heizkoerperTextur, nummernAtlas, glasTextur, gesichtsTafel, NUMMERN_RASTER, skaliereUV, zufall } from './texturen.js';
import { kopf, hals, arm, oberkoerper, stoffTeil } from './menschen.js';

/** @type {Map<number, THREE.BufferGeometry>} Vorhang-Geometrien je Höhe (werden geteilt) */
const vorhangCache = new Map();

/**
 * Vorhangschal mit Falten (senkrechte Wellen), 0,55 m breit, Vorderseite nach +z.
 * @param {number} hoehe
 */
function vorhangGeometrie(hoehe) {
  const schluessel = Math.round(hoehe * 100);
  const vorhanden = vorhangCache.get(schluessel);
  if (vorhanden) return vorhanden;
  const geo = new THREE.PlaneGeometry(0.55, hoehe, 16, 1);
  const pos = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('position'));
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / 0.55) * Math.PI * 7) * 0.035);
  geo.computeVertexNormals();
  vorhangCache.set(schluessel, geo);
  return geo;
}

/** @typedef {ReturnType<typeof erstelleMaterialien>} Materialien */

/**
 * Markiert ein durchsichtiges Material als zusammenfassbar (siehe verschmelzen.js) –
 * nur für Flächen, die sich nicht überlappen (z. B. Fensterscheiben).
 * @template {THREE.Material} M
 * @param {M} material
 * @returns {M} dasselbe Material
 */
function verschmelzbar(material) {
  material.userData.verschmelzbar = true;
  return material;
}

/**
 * Unterdrückt bei einem MeshStandardMaterial das direkte Glanzlicht der Lichtquellen;
 * Spiegelungen der Umgebung bleiben erhalten.
 * @param {THREE.MeshStandardMaterial} material
 * @returns {THREE.MeshStandardMaterial} dasselbe Material
 */
function ohneDirektenGlanz(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      '#include <lights_fragment_end>\n\treflectedLight.directSpecular = vec3( 0.0 );',
    );
  };
  material.customProgramCacheKey = () => 'ohneDirektenGlanz';
  return material;
}

/**
 * Legt alle gemeinsam genutzten Materialien einmal an.
 */
export function erstelleMaterialien() {
  const lambert = (/** @type {THREE.MeshLambertMaterialParameters} */ p) => new THREE.MeshLambertMaterial(p);
  // Glänzende Oberflächen (Feinschliff B): spiegeln die Umgebung (scene.environment)
  const glanz = (/** @type {THREE.MeshStandardMaterialParameters} */ p) => new THREE.MeshStandardMaterial(p);
  return {
    dielen: lambert({ map: dielenTextur() }),
    // Säle hell (Werbeblatt 1888: „weit, bequem und hell“, Rokoko-Schmuck); Farbton angenommen
    putzSaal: lambert({ map: putzTextur('#ddd2bb', 5) }),
    putzHell: lambert({ map: putzTextur('#cdc6b6', 9) }),
    decke: lambert({ map: putzTextur('#f0eadc', 13) }),
    lampenGlas: lambert({ color: 0xf3efe4, emissive: 0x2a2620 }),
    emaille: lambert({ color: 0x2f4637, side: THREE.DoubleSide }),
    gesims: lambert({ color: 0xe8e2d4 }),
    fussleiste: lambert({ map: holzTextur([58, 38, 24], 21) }),
    holzDunkel: glanz({ map: holzTextur([66, 44, 28], 31), roughness: 0.55, metalness: 0, envMapIntensity: 0.3 }),
    holzHell: lambert({ map: holzTextur([150, 112, 72], 41) }),
    fensterRahmen: lambert({ color: 0xe9e5db }),
    // Mattes Tageslicht hinter den Scheiben (bewusst ohne Außenansicht)
    fensterGlas: new THREE.MeshBasicMaterial({ color: 0xe4e8ea, toneMapped: false }),
    // Vorhangstoff (Farbe angenommen) und Nummerntafeln (eine gemeinsame Textur für alle Nummern)
    vorhang: lambert({ color: 0x5c2a26 }),
    nummern: lambert({ map: nummernAtlas() }),
    gold: glanz({ color: 0xd8ae52, metalness: 1, roughness: 0.22, envMapIntensity: 1.6 }),
    messing: glanz({ color: 0xc9a058, metalness: 1, roughness: 0.25, envMapIntensity: 1.5 }),
    // Säulenschäfte (Marmor angenommen; Marmortreppen im Haus belegt)
    marmor: glanz({ color: 0xece6da, metalness: 0, roughness: 0.15, envMapIntensity: 1.0 }),
    stoffRot: lambert({ color: 0x6e1d1d }),
    podest: lambert({ color: 0x3b1f1a }),
    metall: glanz({ color: 0xc8ccd0, metalness: 1, roughness: 0.14, envMapIntensity: 1.6 }),
    eisen: glanz({ color: 0x2e2e30, metalness: 0.6, roughness: 0.6, envMapIntensity: 0.3 }),
    // Wachs hat einen leichten, weichen Schimmer; Hautton und Gesichter kommen aus der Gesichtstafel
    wachs: glanz({ map: gesichtsTafel(), color: 0xffffff, metalness: 0, roughness: 0.42, envMapIntensity: 0.5 }),
    wachsBlass: glanz({ color: 0xe6dac4, metalness: 0, roughness: 0.48, envMapIntensity: 0.4 }),
    haar: lambert({ color: 0x2a211b }),
    // Dunkle Stoffe nicht zu dunkel wählen, damit Licht und Schatten darauf sichtbar bleiben
    kleidDunkel: lambert({ color: 0x38332d }),
    kleidBraun: lambert({ color: 0x4b3a2b }),
    kleidGrau: lambert({ color: 0x55565a }),
    leinen: lambert({ color: 0xcfc6b2 }),
    gips: lambert({ color: 0xe9e6de }),
    // Haar und Kleidung der Wachsfiguren (Besetzung): Farbe je Punkt (Vertex-Farben), ein Material für alle
    farbig: lambert({ color: 0xffffff, vertexColors: true }),
    // Glas: leicht getönt mit Lichtstreifen (Textur) und Spiegelungen; Sichtbarkeit über den Alphakanal
    // Spiegelschicht über dem Glas: schwarze Grundfarbe, nur die Spiegelung wird hinzuaddiert
    // (am Rand und bei flachem Blick stärker – wie bei echtem Glas)
    // Spiegelschicht des Glases: schwarz, additiv, nur Spiegelung des Raums (leicht weich, mit
    // physikalischem Randeffekt). Das direkte Glanzlicht der Lichtquelle wird unterdrückt
    // (es wirkte wie eine Lampe), siehe ohneDirektenGlanz().
    glasSpiegel: ohneDirektenGlanz(glanz({ color: 0x000000, metalness: 0, roughness: 0.1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, envMapIntensity: 2.2 })),
    // Fensterscheiben: ganz schwache Spiegelung des Raums (tagsüber überstrahlt das Licht von draußen fast alles);
    // darf trotz Durchsichtigkeit zusammengefasst werden (Scheiben überlappen nicht)
    fensterSpiegel: verschmelzbar(ohneDirektenGlanz(glanz({ color: 0x000000, metalness: 0, roughness: 0.06, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, envMapIntensity: 1.8 }))),
    glas: glanz({ map: glasTextur(), color: 0xffffff, metalness: 0, roughness: 0.03, transparent: true, opacity: 1, depthWrite: false, envMapIntensity: 1.2, side: THREE.DoubleSide }),
    heizung: lambert({ map: heizkoerperTextur() }),
  };
}

// Geometrien, die oft gebraucht werden, einmal anlegen
const einheitsBox = new THREE.BoxGeometry(1, 1, 1);

/**
 * Quader mit Mittelpunkt (x, y, z); Textur-Kacheln nach Größe (je 2 m).
 * @param {number} b Breite (x) @param {number} h Höhe (y) @param {number} t Tiefe (z)
 * @param {number} x @param {number} y @param {number} z
 * @param {THREE.Material} material
 * @param {boolean} [kacheln=false] UVs nach Größe skalieren (für Putz/Holz)
 */
export function box(b, h, t, x, y, z, material, kacheln = false) {
  const geo = kacheln ? skaliereUV(new THREE.BoxGeometry(b, h, t), Math.max(b, t) / 2, h / 2) : einheitsBox;
  const mesh = new THREE.Mesh(geo, material);
  if (!kacheln) mesh.scale.set(b, h, t);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * @typedef {object} Oeffnung
 * @property {number} pos Mitte der Öffnung entlang der Wand (m ab Wandanfang)
 * @property {number} breite
 * @property {number} hoehe
 * @property {number} [unten=0] Brüstungshöhe (Fenster)
 * @property {'fenster' | 'durchgang' | 'tuer'} art
 */

/**
 * Baut eine Wand entlang der lokalen x-Achse (0 … laenge). Die Innenseite liegt bei z = 0
 * und schaut nach +z, die Wand reicht nach −z (Dicke).
 * Liefert die Gruppe und die Teile, die als Hindernis zählen (Pfeiler, Brüstungen, geschlossene Türen).
 *
 * @param {object} o
 * @param {number} o.laenge
 * @param {number} o.hoehe
 * @param {number} o.dicke
 * @param {Oeffnung[]} [o.oeffnungen=[]]
 * @param {THREE.Material} o.material Putz der Innenseite
 * @param {Materialien} o.m
 * @param {boolean} [o.gelaender=false] Vergoldete Brüstungsgitter vor den Fenstern (außen)
 * @param {boolean} [o.beidseitig=false] Fußleiste und Gesims auch auf der Rückseite (Trennwände)
 * @param {boolean} [o.goldleiste=false] Vergoldete Zierleiste unter dem Gesims (Goldstuck)
 * @param {boolean} [o.vorhaenge=false] Vorhangschals an den Fenstern (Raumseite)
 * @returns {{ gruppe: THREE.Group, hindernisse: THREE.Object3D[] }}
 */
export function wand({ laenge, hoehe, dicke, oeffnungen = [], material, m, gelaender = false, beidseitig = false, goldleiste = false, vorhaenge = false }) {
  const gruppe = new THREE.Group();
  /** @type {THREE.Object3D[]} */
  const hindernisse = [];
  const zMitte = -dicke / 2;
  const sortiert = [...oeffnungen].sort((a, b) => a.pos - b.pos);
  let x = 0;

  const pfeiler = (/** @type {number} */ von, /** @type {number} */ bis) => {
    if (bis - von < 0.01) return;
    const teil = box(bis - von, hoehe, dicke, (von + bis) / 2, hoehe / 2, zMitte, material, true);
    gruppe.add(teil);
    hindernisse.push(teil);
  };

  for (const o of sortiert) {
    const links = o.pos - o.breite / 2;
    const rechts = o.pos + o.breite / 2;
    const unten = o.unten ?? 0;
    pfeiler(x, links);
    // Sturz über der Öffnung
    const oben = unten + o.hoehe;
    if (hoehe - oben > 0.01) gruppe.add(box(o.breite, hoehe - oben, dicke, o.pos, (oben + hoehe) / 2, zMitte, material, true));

    if (o.art === 'fenster') {
      if (unten > 0.01) {
        const bruestung = box(o.breite, unten, dicke, o.pos, unten / 2, zMitte, material, true);
        gruppe.add(bruestung);
        hindernisse.push(bruestung);
      }
      // Helles, mattes Tageslicht hinter dem Fenster (ohne Außenansicht); das Gitter davor bleibt sichtbar
      const licht = new THREE.Mesh(new THREE.PlaneGeometry(o.breite + 0.8, o.hoehe + 0.8), m.fensterGlas);
      licht.position.set(o.pos, unten + o.hoehe / 2, -dicke - 0.35);
      gruppe.add(licht);
      // Scheibe mit ganz schwacher Spiegelung (Raumseite)
      const scheibe = new THREE.Mesh(new THREE.PlaneGeometry(o.breite - 0.1, o.hoehe - 0.1), m.fensterSpiegel);
      scheibe.position.set(o.pos, unten + o.hoehe / 2, -dicke * 0.7 + 0.04);
      scheibe.renderOrder = 3;
      gruppe.add(scheibe);
      const r = 0.07;
      const zr = -dicke * 0.7;
      gruppe.add(box(o.breite, r, r, o.pos, unten + r / 2, zr, m.fensterRahmen));
      gruppe.add(box(o.breite, r, r, o.pos, oben - r / 2, zr, m.fensterRahmen));
      gruppe.add(box(r, o.hoehe, r, links + r / 2, unten + o.hoehe / 2, zr, m.fensterRahmen));
      gruppe.add(box(r, o.hoehe, r, rechts - r / 2, unten + o.hoehe / 2, zr, m.fensterRahmen));
      gruppe.add(box(0.05, o.hoehe, 0.05, o.pos, unten + o.hoehe / 2, zr, m.fensterRahmen));
      gruppe.add(box(o.breite, 0.05, 0.05, o.pos, unten + o.hoehe * 0.68, zr, m.fensterRahmen));
      // Fensterbank innen
      gruppe.add(box(o.breite + 0.1, 0.04, dicke * 0.55, o.pos, unten + 0.02, -dicke * 0.25, m.fensterRahmen));
      if (gelaender) {
        // Brüstungsgitter vor dem Fenster (außen), bis etwa 0,95 m über dem Boden
        const hg = Math.max(0.95 - unten, 0.3);
        const zg = -dicke - 0.06;
        gruppe.add(box(o.breite, 0.04, 0.03, o.pos, unten + hg, zg, m.gold));
        for (let s = links + 0.08; s < rechts - 0.05; s += 0.12) gruppe.add(box(0.02, hg, 0.02, s, unten + hg / 2, zg, m.gold));
      }
      if (vorhaenge) {
        // Zwei zur Seite gezogene Vorhangschals an einer Messingstange (üblich um 1890, für Castan nicht belegt)
        const stangeY = Math.min(oben + 0.3, hoehe - 0.3);
        gruppe.add(box(o.breite + 1.0, 0.035, 0.035, o.pos, stangeY, 0.12, m.messing));
        for (const seite of [-1, 1]) {
          const schal = new THREE.Mesh(vorhangGeometrie(stangeY - 0.05), m.vorhang);
          schal.position.set(o.pos + seite * (o.breite / 2 + 0.12), (stangeY - 0.05) / 2 + 0.05, 0.1);
          // Verdeckt in der Lichtberechnung als umgebender Quader (Stoff mit Falten ist kein Quader)
          schal.userData.lichtHuelle = true;
          gruppe.add(schal);
        }
      }
    } else if (o.art === 'tuer') {
      // Geschlossene Doppeltür mit Füllungen
      const fluegel = (/** @type {number} */ mitte) => {
        const f = box(o.breite / 2 - 0.02, o.hoehe - 0.02, 0.06, mitte, o.hoehe / 2, zMitte, m.holzDunkel);
        gruppe.add(f);
        hindernisse.push(f);
        gruppe.add(box(o.breite / 2 - 0.2, o.hoehe * 0.35, 0.02, mitte, o.hoehe * 0.7, zMitte + 0.04, m.holzHell));
        gruppe.add(box(o.breite / 2 - 0.2, o.hoehe * 0.3, 0.02, mitte, o.hoehe * 0.25, zMitte + 0.04, m.holzHell));
      };
      fluegel(o.pos - o.breite / 4);
      fluegel(o.pos + o.breite / 4);
      // Unsichtbare Sperre über die ganze Wanddicke: man bleibt vor der Tür stehen, nicht in der Nische
      const sperre = box(o.breite, o.hoehe, dicke, o.pos, o.hoehe / 2, zMitte, m.holzDunkel);
      sperre.visible = false;
      gruppe.add(sperre);
      hindernisse.push(sperre);
      gruppe.add(box(0.03, 0.18, 0.04, o.pos - 0.07, o.hoehe * 0.48, zMitte + 0.06, m.messing));
    }
    // Türrahmen (Bekleidung) innen
    if (o.art !== 'fenster') {
      gruppe.add(box(0.1, o.hoehe + 0.1, 0.04, links - 0.05, o.hoehe / 2, 0.02, m.holzDunkel));
      gruppe.add(box(0.1, o.hoehe + 0.1, 0.04, rechts + 0.05, o.hoehe / 2, 0.02, m.holzDunkel));
      gruppe.add(box(o.breite + 0.3, 0.12, 0.04, o.pos, o.hoehe + 0.06, 0.02, m.holzDunkel));
    }
    x = rechts;
  }
  pfeiler(x, laenge);

  // Fußleiste und Gesims (bei Durchgängen/Türen unterbrochen); bei Trennwänden auf beiden Seiten
  const seiten = beidseitig ? [1, -1] : [1];
  for (const seite of seiten) {
    const zLeiste = seite > 0 ? 0.015 : -dicke - 0.015;
    const zGesims = seite > 0 ? 0.06 : -dicke - 0.06;
    let start = 0;
    for (const o of sortiert) {
      if (o.art === 'fenster') continue;
      const ende = o.pos - o.breite / 2 - 0.1;
      if (ende - start > 0.05) gruppe.add(box(ende - start, 0.16, 0.03, (start + ende) / 2, 0.08, zLeiste, m.fussleiste));
      start = o.pos + o.breite / 2 + 0.1;
    }
    if (laenge - start > 0.05) gruppe.add(box(laenge - start, 0.16, 0.03, (start + laenge) / 2, 0.08, zLeiste, m.fussleiste));
    gruppe.add(box(laenge, 0.18, 0.12, laenge / 2, hoehe - 0.09, zGesims, m.gesims));
    if (goldleiste) gruppe.add(box(laenge, 0.035, 0.025, laenge / 2, hoehe - 0.24, seite > 0 ? 0.012 : -dicke - 0.012, m.gold));
  }

  return { gruppe, hindernisse };
}

/**
 * Boden oder Decke als Fläche mit gekachelter Textur.
 * @param {number} breite (x) @param {number} tiefe (z)
 * @param {THREE.Material} material
 * @param {number} kachel Kachelgröße in Metern
 * @param {boolean} [decke=false]
 */
export function flaeche(breite, tiefe, material, kachel, decke = false) {
  const geo = skaliereUV(new THREE.PlaneGeometry(breite, tiefe), breite / kachel, tiefe / kachel);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = decke ? Math.PI / 2 : -Math.PI / 2;
  return mesh;
}

/**
 * Rippenheizkörper unter einem Fenster (Zentralheizung im Haus belegt).
 * @param {Materialien} m @param {number} breite
 */
export function heizkoerper(m, breite) {
  const g = new THREE.Group();
  const geo = skaliereUV(new THREE.BoxGeometry(breite, 0.62, 0.1), breite, 1);
  const k = new THREE.Mesh(geo, m.heizung);
  k.position.y = 0.43;
  g.add(k);
  g.add(box(0.05, 0.12, 0.08, -breite / 2 + 0.1, 0.06, 0, m.eisen));
  g.add(box(0.05, 0.12, 0.08, breite / 2 - 0.1, 0.06, 0, m.eisen));
  return g;
}

// ---------- Ausstellungsstücke ----------

// ---------- Besetzung der Wachsfiguren ----------
// Feste Rollen statt Zufall: Alter, Statur, Haar, Bart und Kleidung je Figur bewusst verteilt
// (keine Namen, keine echten Personen). Farben laufen über Vertex-Farben auf `m.farbig`, daher
// kosten weitere Farben keinen Draw-Call.

/** Haarfarben (sRGB) */
export const HAARFARBE = {
  schwarz: 0x1d1a18, dunkelbraun: 0x3b2719, braun: 0x6a4527, dunkelblond: 0x8c6a3e, blond: 0xc19a5b,
  rot: 0x8e3d1a, rotblond: 0xb0673a, meliert: 0x6e6862, grau: 0x9a9690, weiss: 0xe2ddd3,
};
/** Stofffarben (sRGB) */
export const STOFF = {
  schwarz: 0x2a2725, anthrazit: 0x38332d, grau: 0x55565a, hellgrau: 0x85837d, braun: 0x4b3a2b, tabak: 0x6b5136,
  tweed: 0x6e6551, blau: 0x2c3550, gruen: 0x34402f, bordeaux: 0x55232a, beige: 0x9c8a68, creme: 0xd9cfb8,
  weiss: 0xe9e6de, rot: 0x7a1f1f, horn: 0x2a221c, messing: 0xa8854a,
};

/**
 * Rolle einer Wachsfigur. Gesicht = Zelle der Gesichtstafel passend zur Altersstufe
 * (jung 0, 1, 4, 8 · mittel 3, 5, 9, 11 · alt 2, 6, 7, 10; Brauenfarbe siehe texturen.js), form = Kopfform 0–5.
 * @typedef {object} Rolle
 * @property {0 | 1 | 2} alter 0 jung, 1 mittel, 2 alt
 * @property {number} gesicht
 * @property {number} form
 * @property {keyof typeof HAARFARBE | null} haar null = Glatze
 * @property {import('./menschen.js').HaarStil} frisur
 * @property {import('./menschen.js').BartStil} bart
 * @property {keyof typeof HAARFARBE} [bartFarbe] sonst wie das Haar
 * @property {'schmal' | 'mittel' | 'kraeftig'} [statur]
 * @property {keyof typeof STOFF} [rock] @property {keyof typeof STOFF} [weste]
 * @property {keyof typeof STOFF} [krawatte] @property {keyof typeof STOFF} [hose]
 * @property {boolean} [frauPlatz] vorgesehen für eine Frauenfigur (Sitzung B); bis dahin steht hier ein Mann
 */

/**
 * Kurzform für eine Rolle.
 * @param {0 | 1 | 2} alter @param {number} gesicht @param {number} form @param {keyof typeof HAARFARBE | null} haar
 * @param {import('./menschen.js').HaarStil} [frisur='voll'] @param {import('./menschen.js').BartStil} [bart='keiner']
 * @param {Partial<Rolle>} [mehr]
 * @returns {Rolle}
 */
const R = (alter, gesicht, form, haar, frisur = 'voll', bart = 'keiner', mehr = {}) => ({ alter, gesicht, form, haar, frisur, bart, ...mehr });

/**
 * Besetzungsliste der Schreckenskammer. Reihenfolge = Aufstellung in etage3.js. Gestaltung (keine
 * historische Angabe): überwiegend jung bis mittelalt (etwa 20–40), nur wenige Alte; Haar und Bart
 * meist ungepflegt (zerzaust, strähnig, Stoppeln, struppig). Gepflegt nur zwei „feine“ Betrüger
 * (Büste 0 und 8). Nachbarn unterscheiden sich in Alter, Haarfarbe und Frisur; jeder Blickpunkt zeigt
 * drei Altersstufen und mindestens vier Haarfarben. `frauPlatz` markiert die Plätze für Frauenfiguren.
 */
export const BESETZUNG = {
  // Büsten in Raum A: 0–5 an der Hofwand (z 1,6 → 7,85), 6–8 an der Trennwand zu Raum B (x 6,75 → 8,45)
  buesten: [
    R(0, 1, 0, 'blond', 'scheitel', 'schnurr', { statur: 'schmal', rock: 'tabak', weste: 'creme', krawatte: 'blau' }),
    R(2, 6, 4, 'grau', 'kranz', 'stoppel', { rock: 'schwarz', weste: 'grau', krawatte: 'schwarz' }),
    R(1, 11, 3, 'rot', 'zerzaust', 'struppig', { statur: 'kraeftig', rock: 'gruen', weste: 'beige', krawatte: 'schwarz', frauPlatz: true }),
    R(0, 8, 5, 'schwarz', 'straehnig', 'stoppel', { statur: 'schmal', rock: 'blau', weste: 'hellgrau', krawatte: 'rot' }),
    R(1, 9, 1, 'meliert', 'kurz', 'schnurrStruppig', { statur: 'kraeftig', rock: 'grau', weste: 'schwarz', krawatte: 'bordeaux' }),
    R(0, 0, 2, 'dunkelbraun', 'zerzaust', 'stoppel', { rock: 'braun', weste: 'beige', krawatte: 'schwarz' }),
    R(0, 4, 2, 'rotblond', 'straehnig', 'keiner', { statur: 'schmal', rock: 'bordeaux', weste: 'schwarz', krawatte: 'schwarz' }),
    R(1, 3, 0, 'schwarz', 'ecken', 'struppig', { statur: 'kraeftig', rock: 'schwarz', weste: 'hellgrau', krawatte: 'schwarz', frauPlatz: true }),
    R(1, 5, 4, 'dunkelblond', 'scheitel', 'voll', { rock: 'tweed', weste: 'braun', krawatte: 'gruen' }),
  ],
  // Glasschränke in Raum B (z 11,0 und 13,2): je 12 Köpfe, Boden 0 (unten) bis 2, je Boden 4 Plätze; je Schrank 2 Alte
  schrank: [
    [
      R(0, 8, 0, 'schwarz', 'zerzaust', 'stoppel'), R(1, 11, 1, 'rot', 'kurz', 'schnurrStruppig'), R(2, 10, 4, 'weiss', 'kranz', 'struppig'), R(0, 1, 2, 'blond', 'straehnig'),
      R(1, 9, 2, 'meliert', 'ecken', 'stoppel'), R(0, 0, 5, 'braun', 'straehnig', 'backen'), R(0, 4, 3, 'rotblond', 'zerzaust'), R(1, 3, 0, 'schwarz', 'licht', 'schnurrStruppig'),
      R(1, 3, 4, 'dunkelbraun', 'zerzaust', 'struppig', { frauPlatz: true }), R(0, 8, 1, 'schwarz', 'locken', 'stoppel'), R(1, 5, 5, 'dunkelblond', 'kurz', 'schnurr'), R(2, 7, 3, 'grau', 'licht', 'stoppel'),
    ],
    [
      R(1, 9, 1, 'meliert', 'zerzaust', 'struppig'), R(0, 4, 0, 'rot', 'straehnig', 'stoppel'), R(2, 6, 3, 'grau', 'ecken', 'schnurrStruppig'), R(0, 1, 5, 'blond', 'kurz', 'stoppel'),
      R(0, 0, 4, 'dunkelbraun', 'locken'), R(1, 11, 2, 'rotblond', 'ecken', 'backen'), R(1, 5, 1, 'dunkelblond', 'zerzaust', 'stoppel', { frauPlatz: true }), R(0, 8, 3, 'schwarz', 'straehnig', 'schnurrStruppig'),
      R(1, 3, 5, 'schwarz', 'kurz', 'struppig'), R(0, 0, 2, 'braun', 'zerzaust'), R(2, 2, 4, 'weiss', 'kranz', 'stoppel'), R(1, 9, 0, 'meliert', 'straehnig', 'schnurr'),
    ],
  ],
  // Figurengruppe in Raum B: 0 mit Hut, 1 ohne, 2 (neu) hinten links neben dem Platz der Leiche
  gruppe: [
    R(1, 11, 1, 'rot', 'kurz', 'struppig', { statur: 'kraeftig', rock: 'grau', weste: 'anthrazit', krawatte: 'bordeaux', hose: 'anthrazit' }),
    R(2, 10, 4, 'weiss', 'kranz', 'schnurrStruppig', { rock: 'anthrazit', weste: 'grau', krawatte: 'schwarz', hose: 'schwarz' }),
    R(0, 8, 0, 'schwarz', 'zerzaust', 'stoppel', { statur: 'schmal', rock: 'tabak', weste: 'creme', krawatte: 'gruen', hose: 'braun', frauPlatz: true }),
  ],
};

/** Statur: Breite und Tiefe des Rumpfs, Bauch (nur Ganzfiguren), Kopfmaße */
const STATUR = {
  schmal: { breite: 0.92, tiefe: 0.94, bauch: 0, kopf: [0.96, 1.03, 0.98] },
  mittel: { breite: 1, tiefe: 1, bauch: 0, kopf: [1, 1, 1] },
  kraeftig: { breite: 1.08, tiefe: 1.1, bauch: 0.03, kopf: [1.05, 0.98, 1.03] },
};

/**
 * Farbe als Stoff auf dem Vertex-Farben-Material.
 * @param {Materialien} m @param {number} hex sRGB
 * @returns {import('./menschen.js').Stoff}
 */
const farbe = (m, hex) => ({ farbig: m.farbig, farbe: hex });

/**
 * Profil nach Statur verbreitern bzw. verschmälern; Bauch zwischen 0,9 und 1,3 m nach vorn.
 * @param {number[][]} profil @param {typeof STATUR.mittel} st
 */
function profilNachStatur(profil, st) {
  return profil.map(([y, hw, hd, zo, n]) => {
    const b = st.bauch * Math.exp(-(((y - 1.1) / 0.14) ** 2));
    return [y, hw * st.breite, hd * st.tiefe + b, zo + b * 0.8, n];
  });
}

/**
 * Wachskopf nach Rolle.
 * @param {Materialien} m @param {Rolle} rolle
 * @param {boolean} [fein=true]
 * @param {boolean} [hut=false] unter einem Hut nur das Haar unter dem Hutrand
 */
function wachskopf(m, rolle, fein = true, hut = false) {
  const haar = rolle.haar ? farbe(m, HAARFARBE[rolle.haar]) : null;
  const bartFarbe = rolle.bartFarbe ? farbe(m, HAARFARBE[rolle.bartFarbe]) : haar;
  const k = kopf({
    haut: m.wachs, zelle: rolle.gesicht, variante: rolle.form, fein, alter: rolle.alter,
    // Schrankköpfe (grob) mit etwas sparsamerem Gitter: hält die Dreiecke im Blick unter ~135 000
    raster: fein ? null : [22, 17],
    haar, haarStil: hut ? 'unterHut' : rolle.frisur, bart: rolle.bart, bartMaterial: bartFarbe,
  });
  k.scale.set(...STATUR[rolle.statur ?? 'mittel'].kopf);
  return k;
}

/** Schultern einer Büste (Profil: y, halbe Breite, halbe Tiefe, Versatz z, Rundlichkeit); schräge, runde Schultern */
const BUESTE = [[1.15, 0.165, 0.1, 0, 2.6], [1.22, 0.177, 0.108, 0.005, 2.5], [1.26, 0.18, 0.104, 0.004, 2.35], [1.285, 0.167, 0.094, 0.002, 2.15],
  [1.305, 0.138, 0.082, 0, 2.0], [1.325, 0.1, 0.07, 0, 2.0], [1.345, 0.063, 0.056, 0, 2.0]];

/**
 * Wachskopf als Büste auf einem Sockel (Kopf eines Verbrechers – ohne Namen, stilisiert).
 * @param {Materialien} m @param {Rolle} rolle aus BESETZUNG.buesten
 */
export function buesteAufSockel(m, rolle) {
  const g = new THREE.Group();
  g.add(box(0.36, 1.1, 0.36, 0, 0.55, 0, m.holzDunkel));
  g.add(box(0.42, 0.05, 0.42, 0, 1.125, 0, m.holzDunkel));
  const st = STATUR[rolle.statur ?? 'mittel'];
  g.add(oberkoerper({
    profil: profilNachStatur(BUESTE, { ...st, bauch: 0 }), rock: farbe(m, STOFF[rolle.rock ?? 'anthrazit']), untenZu: true, kragen: farbe(m, STOFF.weiss), schnitt: 2,
    ausschnitt: { unten: 1.2, breite: 0.055, weste: farbe(m, STOFF[rolle.weste ?? 'grau']), hemd: farbe(m, STOFF.weiss), krawatte: farbe(m, STOFF[rolle.krawatte ?? 'schwarz']), knopf: farbe(m, STOFF.horn), rockKnoepfe: 0 },
  }));
  const h = hals(m.wachs);
  h.position.set(0, 1.39, -0.012);
  g.add(h);
  const k = wachskopf(m, rolle);
  k.position.y = 1.46;
  g.add(k);
  return g;
}

const klingeGeo = new THREE.BoxGeometry(0.065, 0.9, 0.008);
const griffGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.26, 10);
const knaufGeo = new THREE.SphereGeometry(0.03, 10, 8);

/**
 * Tafel mit drei Richtschwertern (breite Klinge, stumpfes Ende – ohne Spitze).
 * Die Tafel hängt an einer Wand; Rückseite bei z = 0, Vorderseite nach +z.
 * @param {Materialien} m
 */
export function schwertTafel(m) {
  const g = new THREE.Group();
  g.add(box(1.5, 1.35, 0.04, 0, 0, 0.02, m.holzDunkel));
  g.add(box(1.6, 0.06, 0.06, 0, 0.7, 0.03, m.gold));
  g.add(box(1.6, 0.06, 0.06, 0, -0.7, 0.03, m.gold));
  for (let i = -1; i <= 1; i++) {
    const s = new THREE.Group();
    const klinge = new THREE.Mesh(klingeGeo, m.metall);
    klinge.position.y = -0.25;
    s.add(klinge);
    s.add(box(0.3, 0.03, 0.03, 0, 0.215, 0, m.eisen));
    const griff = new THREE.Mesh(griffGeo, m.holzDunkel);
    griff.position.y = 0.36;
    s.add(griff);
    const knauf = new THREE.Mesh(knaufGeo, m.eisen);
    knauf.position.y = 0.5;
    s.add(knauf);
    s.position.set(i * 0.42, 0.05, 0.07);
    s.rotation.z = i * 0.08;
    g.add(s);
  }
  return g;
}

/**
 * Vitrine (Tisch mit Glashaube) mit kleinen eisernen Gegenständen.
 * @param {Materialien} m @param {number} breite @param {number} tiefe
 */
export function vitrine(m, breite, tiefe) {
  const g = new THREE.Group();
  g.add(box(breite, 0.08, tiefe, 0, 0.82, 0, m.holzDunkel));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(box(0.06, 0.78, 0.06, sx * (breite / 2 - 0.06), 0.39, sz * (tiefe / 2 - 0.06), m.holzDunkel));
  }
  g.add(box(breite - 0.02, 0.02, tiefe - 0.02, 0, 0.87, 0, m.stoffRot));
  const z = zufall(breite * 100);
  for (let i = 0; i < 6; i++) {
    const teil = box(0.08 + z() * 0.14, 0.03 + z() * 0.04, 0.05 + z() * 0.06, (z() - 0.5) * (breite - 0.3), 0.9, (z() - 0.5) * (tiefe - 0.2), m.eisen);
    teil.rotation.y = z() * Math.PI;
    g.add(teil);
  }
  // Glashaube mit Kanten
  // Glashaube knapp über dem Tuch (Unterseite bei 0,89 m): lag sie genau auf dem Tuch,
  // flimmerten beide Flächen als Streifenmuster (gleiche Höhe)
  const haube = box(breite - 0.01, 0.38, tiefe - 0.01, 0, 1.08, 0, m.glas);
  haube.renderOrder = 2;
  g.add(haube, spiegelschicht(haube, m));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(box(0.025, 0.4, 0.025, sx * (breite / 2), 1.08, sz * (tiefe / 2), m.messing));
  }
  // Messingrahmen der Glashaube oben (nur Kanten, die Haube bleibt durchsichtig)
  g.add(box(breite, 0.025, 0.025, 0, 1.28, -tiefe / 2, m.messing));
  g.add(box(breite, 0.025, 0.025, 0, 1.28, tiefe / 2, m.messing));
  g.add(box(0.025, 0.025, tiefe, -breite / 2, 1.28, 0, m.messing));
  g.add(box(0.025, 0.025, tiefe, breite / 2, 1.28, 0, m.messing));
  return g;
}

const beinGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.82, 10);
const hutGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16);
const krempeGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.015, 20);

/** Körper im Gehrock (Profil: y, halbe Breite, halbe Tiefe, Versatz z); Saum bei 0,6 m, Hals bei 1,52 m */
export const GEHROCK = [[0.6, 0.205, 0.15, -0.005], [0.8, 0.19, 0.135, 0], [0.98, 0.172, 0.118, 0], [1.06, 0.16, 0.11, 0], [1.2, 0.17, 0.118, 0.006],
  [1.33, 0.182, 0.122, 0.01], [1.4, 0.184, 0.112, 0.005], [1.44, 0.168, 0.1, 0.002], [1.47, 0.138, 0.085, 0], [1.5, 0.1, 0.07, 0], [1.52, 0.065, 0.058, 0]];

/** Gehrock der Besetzung: wie GEHROCK, aber schräge, runde Schultern (5. Wert: Rundlichkeit) */
const GEHROCK_RUND = [[0.6, 0.205, 0.15, -0.005, 2.6], [0.8, 0.19, 0.135, 0, 2.6], [0.98, 0.172, 0.118, 0, 2.6], [1.06, 0.16, 0.11, 0, 2.6],
  [1.2, 0.17, 0.118, 0.006, 2.6], [1.33, 0.178, 0.12, 0.01, 2.5], [1.39, 0.18, 0.11, 0.005, 2.3], [1.425, 0.166, 0.098, 0.002, 2.1],
  [1.455, 0.14, 0.086, 0, 2.0], [1.485, 0.104, 0.072, 0, 2.0], [1.52, 0.065, 0.058, 0, 2.0]];
const schuhGeo = new THREE.SphereGeometry(1, 12, 8);

/**
 * Lebensgroße, stilisierte Wachsfigur (etwa 1,75 m) im Gehrock mit Weste, Hemd und Krawatte.
 * Die Figur schaut nach +z.
 * @param {Materialien} m
 * @param {Rolle} rolle aus BESETZUNG.gruppe
 * @param {object} [o]
 * @param {boolean} [o.hut=false]
 * @param {number} [o.armWinkel=0.12] Abspreizung der Arme
 * @param {boolean} [o.quaderSchuhe=true] Schuhe als Quader (die zählen im Lichtmodell mit; nur die
 *   beiden Figuren von Feinschliff C haben sie, neue Figuren bekommen runde Schuhe)
 */
export function figur(m, rolle, { hut = false, armWinkel = 0.12, quaderSchuhe = true } = {}) {
  const g = new THREE.Group();
  const st = STATUR[rolle.statur ?? 'mittel'];
  const kleid = farbe(m, STOFF[rolle.rock ?? 'anthrazit']);
  const weiss = farbe(m, STOFF.weiss);
  for (const s of [-1, 1]) {
    const bein = stoffTeil(beinGeo, farbe(m, STOFF[rolle.hose ?? 'anthrazit']));
    bein.scale.set(st.breite, 1, st.breite);
    bein.position.set(s * 0.09, 0.41, 0);
    g.add(bein);
    if (quaderSchuhe) {
      g.add(box(0.1, 0.06, 0.24, s * 0.09, 0.03, 0.05, m.eisen));
    } else {
      const schuh = stoffTeil(schuhGeo, farbe(m, STOFF.horn));
      schuh.scale.set(0.05, 0.035, 0.125);
      schuh.position.set(s * 0.09, 0.03, 0.05);
      g.add(schuh);
    }
  }
  g.add(oberkoerper({
    profil: profilNachStatur(GEHROCK_RUND, st), rock: kleid, kragen: weiss, schnitt: 2,
    ausschnitt: { unten: 1.28, breite: 0.07, weste: farbe(m, STOFF[rolle.weste ?? 'grau']), hemd: weiss, krawatte: farbe(m, STOFF[rolle.krawatte ?? 'schwarz']), knopf: farbe(m, STOFF.horn) },
  }));
  const sw = Math.sin(armWinkel);
  const b = st.breite;
  for (const s of [-1, 1]) {
    g.add(arm({
      stoff: kleid, haut: m.wachs, zelle: 0, seite: s, manschette: weiss, kugel: 0.82,
      schulter: [s * 0.156 * b, 1.39, 0], ellbogen: [s * (0.195 * b + sw * 0.26), 1.14, 0.03], handgelenk: [s * (0.205 * b + sw * 0.5), 0.9, 0.05],
    }).gruppe);
  }
  // Alte Figuren: Kopf leicht nach vorn geneigt
  const neigung = rolle.alter === 2 ? 0.14 : 0;
  const h = hals(m.wachs);
  h.position.set(0, 1.555, -0.012 + neigung * 0.05);
  h.rotation.x = neigung * 0.6;
  g.add(h);
  const k = wachskopf(m, rolle, true, hut);
  k.position.set(0, 1.635 - neigung * 0.03, neigung * 0.16);
  k.rotation.x = neigung;
  g.add(k);
  if (hut) {
    const hh = stoffTeil(hutGeo, farbe(m, STOFF.schwarz));
    hh.scale.set(0.85, 1, 1);
    hh.position.set(0, 1.787, -0.004);
    g.add(hh);
    const kr = stoffTeil(krempeGeo, farbe(m, STOFF.schwarz));
    kr.scale.set(0.88, 1, 1);
    kr.position.set(0, 1.707, -0.004);
    g.add(kr);
  }
  return g;
}

const pfostenGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.9, 10);
const fussGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16);

/**
 * Absperrung aus Messingpfosten mit durchhängender roter Kordel.
 * @param {Materialien} m
 * @param {[number, number][]} punkte Pfostenstandorte (x, z) in Gruppen-Koordinaten
 */
export function absperrung(m, punkte) {
  const g = new THREE.Group();
  for (const [x, z] of punkte) {
    const p = new THREE.Mesh(pfostenGeo, m.messing);
    p.position.set(x, 0.45, z);
    g.add(p);
    const f = new THREE.Mesh(fussGeo, m.messing);
    f.position.set(x, 0.02, z);
    g.add(f);
  }
  for (let i = 0; i < punkte.length - 1; i++) {
    const [ax, az] = punkte[i];
    const [bx, bz] = punkte[i + 1];
    const kurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(ax, 0.86, az),
      new THREE.Vector3((ax + bx) / 2, 0.62, (az + bz) / 2),
      new THREE.Vector3(bx, 0.86, bz),
    );
    g.add(new THREE.Mesh(new THREE.TubeGeometry(kurve, 16, 0.014, 6, false), m.stoffRot));
  }
  return g;
}

// ---------- Werkstatt ----------

/**
 * Werkbank mit Ablage. Mittelpunkt am Boden, lange Seite entlang x.
 * @param {Materialien} m @param {number} breite @param {number} tiefe
 */
export function werkbank(m, breite, tiefe) {
  const g = new THREE.Group();
  g.add(box(breite, 0.07, tiefe, 0, 0.86, 0, m.holzHell, true));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(box(0.08, 0.83, 0.08, sx * (breite / 2 - 0.08), 0.415, sz * (tiefe / 2 - 0.08), m.holzDunkel));
  }
  g.add(box(breite - 0.1, 0.04, tiefe - 0.1, 0, 0.18, 0, m.holzDunkel));
  return g;
}

/**
 * Wandregal mit Fächern. Rückseite bei z = 0.
 * @param {Materialien} m @param {number} breite @param {number} hoehe @param {number} tiefe @param {number} faecher
 */
export function regal(m, breite, hoehe, tiefe, faecher) {
  const g = new THREE.Group();
  g.add(box(0.04, hoehe, tiefe, -breite / 2, hoehe / 2, tiefe / 2, m.holzDunkel));
  g.add(box(0.04, hoehe, tiefe, breite / 2, hoehe / 2, tiefe / 2, m.holzDunkel));
  for (let i = 0; i <= faecher; i++) {
    g.add(box(breite, 0.03, tiefe, 0, 0.1 + (i * (hoehe - 0.15)) / faecher, tiefe / 2, m.holzDunkel));
  }
  return g;
}

/** Hocker. @param {Materialien} m */
export function hocker(m) {
  const g = new THREE.Group();
  const sitz = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), m.holzHell);
  sitz.position.y = 0.6;
  g.add(sitz);
  for (let i = 0; i < 3; i++) {
    const w = (i / 3) * Math.PI * 2;
    const bein = box(0.035, 0.6, 0.035, Math.cos(w) * 0.12, 0.3, Math.sin(w) * 0.12, m.holzDunkel);
    g.add(bein);
  }
  return g;
}

const schaleGeo = new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);

/**
 * Gipsform-Hälfte (Hohlform für einen Kopf), liegt mit der Öffnung nach oben.
 * @param {Materialien} m
 */
export function gipsform(m) {
  const s = new THREE.Mesh(schaleGeo, m.gips);
  s.rotation.x = Math.PI;
  s.scale.set(1, 0.8, 1.2);
  s.position.y = 0.1;
  const g = new THREE.Group();
  g.add(s);
  g.add(box(0.3, 0.02, 0.34, 0, 0.01, 0, m.gips));
  return g;
}

/**
 * Gasbrenner mit Topf zum Schmelzen von Wachs (Gasleitung im Haus belegt; Gerät stilisiert).
 * @param {Materialien} m
 */
export function wachstopf(m) {
  const g = new THREE.Group();
  g.add(box(0.26, 0.1, 0.26, 0, 0.05, 0, m.eisen));
  const topf = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.16, 16, 1, true), m.eisen);
  topf.position.y = 0.19;
  g.add(topf);
  const inhalt = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.01, 16), m.wachsBlass);
  inhalt.position.y = 0.24;
  g.add(inhalt);
  return g;
}

// ---------- Ergänzungen: Stuckdecke, Leuchten, Geländer, Kopfschrank, Säule ----------

/**
 * Stuckrahmen mit Goldleisten und Rosette an der Decke eines Raums (Goldstuck-Decken belegt, Muster angenommen).
 * Ursprung in der Raumecke unter der Decke; der Raum erstreckt sich nach +x (breite) und +z (tiefe).
 * @param {Materialien} m @param {number} breite @param {number} tiefe
 */
export function stuckdecke(m, breite, tiefe) {
  const g = new THREE.Group();
  /** Rechteckiger Rahmen aus vier Leisten */
  const rahmen = (/** @type {number} */ einzug, /** @type {number} */ staerke, /** @type {THREE.Material} */ mat, /** @type {number} */ y) => {
    const b = breite - 2 * einzug;
    const t = tiefe - 2 * einzug;
    g.add(box(b, 0.04, staerke, breite / 2, y, einzug, mat));
    g.add(box(b, 0.04, staerke, breite / 2, y, tiefe - einzug, mat));
    g.add(box(staerke, 0.04, t, einzug, y, tiefe / 2, mat));
    g.add(box(staerke, 0.04, t, breite - einzug, y, tiefe / 2, mat));
  };
  rahmen(0.7, 0.12, m.gesims, -0.02);
  rahmen(0.86, 0.04, m.gold, -0.03);
  rahmen(1.4, 0.06, m.gesims, -0.02);
  const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.05, 32), m.gesims);
  rosette.position.set(breite / 2, -0.025, tiefe / 2);
  g.add(rosette);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 8, 40), m.gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(breite / 2, -0.05, tiefe / 2);
  g.add(ring);
  return g;
}

/**
 * Deckenkrone mit sechs Glühlampen (elektrische Beleuchtung im Haus belegt; Form angenommen, unbeleuchtet).
 * Ursprung am Aufhängepunkt an der Decke.
 * @param {Materialien} m
 */
export function kronleuchter(m) {
  const g = new THREE.Group();
  const stange = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 8), m.messing);
  stange.position.y = -0.5;
  g.add(stange);
  const koerper = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), m.messing);
  koerper.position.y = -1.05;
  g.add(koerper);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.014, 8, 36), m.messing);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.08;
  g.add(ring);
  const birne = new THREE.SphereGeometry(0.04, 12, 10);
  for (let i = 0; i < 6; i++) {
    const w = (i / 6) * Math.PI * 2;
    const arm = box(0.012, 0.012, 0.34, Math.sin(w) * 0.17, -1.07, Math.cos(w) * 0.17, m.messing);
    arm.rotation.y = w;
    g.add(arm);
    const b = new THREE.Mesh(birne, m.lampenGlas);
    b.scale.set(1, 1.3, 1);
    b.position.set(Math.sin(w) * 0.34, -1.0, Math.cos(w) * 0.34);
    g.add(b);
  }
  return g;
}

/**
 * Einfache Hängelampe mit Emailleschirm (Form angenommen, unbeleuchtet). Ursprung an der Decke.
 * @param {Materialien} m @param {number} [laenge=1.6]
 */
export function haengelampe(m, laenge = 1.6) {
  const g = new THREE.Group();
  const kabel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, laenge, 6), m.eisen);
  kabel.position.y = -laenge / 2;
  g.add(kabel);
  const schirm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.24, 0.16, 20, 1, true), m.emaille);
  schirm.position.y = -laenge - 0.08;
  g.add(schirm);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), m.lampenGlas);
  b.position.y = -laenge - 0.12;
  g.add(b);
  return g;
}

/**
 * Hölzernes Geländer mit Handlauf (statt Kordeln). Punkte = Eckpunkte (x, z) in Gruppen-Koordinaten.
 * @param {Materialien} m @param {[number, number][]} punkte
 */
export function holzgelaender(m, punkte) {
  const g = new THREE.Group();
  for (let i = 0; i < punkte.length - 1; i++) {
    const [ax, az] = punkte[i];
    const [bx, bz] = punkte[i + 1];
    const laenge = Math.hypot(bx - ax, bz - az);
    const teil = new THREE.Group();
    teil.position.set(ax, 0, az);
    teil.rotation.y = Math.atan2(bx - ax, bz - az);
    teil.add(box(0.07, 0.05, laenge + 0.07, 0, 0.9, laenge / 2, m.holzDunkel));
    teil.add(box(0.04, 0.03, laenge, 0, 0.93, laenge / 2, m.messing));
    teil.add(box(0.05, 0.05, laenge, 0, 0.12, laenge / 2, m.holzDunkel));
    const anzahl = Math.max(1, Math.round(laenge / 0.9));
    for (let k = 0; k <= anzahl; k++) teil.add(box(0.06, 0.9, 0.06, 0, 0.45, (k * laenge) / anzahl, m.holzDunkel));
    for (let k = 0; k < anzahl * 6; k++) teil.add(box(0.025, 0.73, 0.025, 0, 0.51, ((k + 0.5) * laenge) / (anzahl * 6), m.holzDunkel));
    g.add(teil);
  }
  return g;
}

/**
 * Glasschrank mit Wachsköpfen auf drei Böden (Darstellung angenommen). Rückseite bei z = 0, Front nach +z.
 * @param {Materialien} m @param {number} breite
 * @param {Rolle[]} rollen aus BESETZUNG.schrank, je Boden (unten zuerst) von links nach rechts
 */
export function kopfschrank(m, breite, rollen) {
  const hoehe = 2.3;
  const tiefe = 0.5;
  const g = new THREE.Group();
  g.add(box(breite, hoehe, 0.03, 0, hoehe / 2, 0.015, m.holzDunkel));
  g.add(box(0.05, hoehe, tiefe, -breite / 2, hoehe / 2, tiefe / 2, m.holzDunkel));
  g.add(box(0.05, hoehe, tiefe, breite / 2, hoehe / 2, tiefe / 2, m.holzDunkel));
  g.add(box(breite + 0.1, 0.12, tiefe + 0.05, 0, hoehe + 0.06, tiefe / 2, m.holzDunkel));
  g.add(box(breite + 0.12, 0.03, 0.03, 0, hoehe + 0.02, tiefe + 0.04, m.gold));
  g.add(box(breite, 0.35, tiefe, 0, 0.175, tiefe / 2, m.holzDunkel));
  for (let boden = 0; boden < 3; boden++) {
    const y = 0.35 + boden * 0.62;
    g.add(box(breite, 0.03, tiefe - 0.04, 0, y, tiefe / 2, m.holzDunkel));
    g.add(box(breite, 0.01, tiefe - 0.06, 0, y + 0.02, tiefe / 2, m.stoffRot));
    const anzahl = Math.max(2, Math.floor(breite / 0.45));
    for (let k = 0; k < anzahl; k++) {
      const x = -breite / 2 + ((k + 0.5) * breite) / anzahl;
      const h = hals(m.wachs);
      h.position.set(x, y + 0.09, tiefe / 2 - 0.012);
      g.add(h);
      const wk = wachskopf(m, rollen[(boden * anzahl + k) % rollen.length], false);
      wk.position.set(x, y + 0.235, tiefe / 2);
      g.add(wk);
    }
  }
  // Glasfront mit Messingrahmen
  const glas = box(breite - 0.05, hoehe - 0.4, 0.01, 0, 0.35 + (hoehe - 0.4) / 2, tiefe, m.glas);
  glas.renderOrder = 2;
  g.add(glas, spiegelschicht(glas, m));
  g.add(box(0.03, hoehe - 0.4, 0.02, 0, 0.35 + (hoehe - 0.4) / 2, tiefe + 0.005, m.messing));
  return g;
}

/**
 * Säule mit vergoldetem Kapitell (Säulen in den Sälen belegt, Form angenommen).
 * @param {Materialien} m @param {number} hoehe
 */
export function saeule(m, hoehe) {
  const g = new THREE.Group();
  // Runde Teile (Schaft, Kapitell) verdecken in der Lichtberechnung als umgebender Quader
  g.userData.lichtHuelle = true;
  g.add(box(0.42, 0.2, 0.42, 0, 0.1, 0, m.gesims));
  const schaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, hoehe - 0.55, 24), m.marmor);
  schaft.position.y = 0.2 + (hoehe - 0.55) / 2;
  g.add(schaft);
  const kapitell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.22, 20), m.gold);
  kapitell.position.y = hoehe - 0.35 + 0.11;
  g.add(kapitell);
  g.add(box(0.46, 0.13, 0.46, 0, hoehe - 0.065, 0, m.gesims));
  return g;
}

/**
 * Kleine Nummerntafel (Katalognummer wie im gedruckten Führer; Form angenommen).
 * Alle Tafeln teilen eine Textur, damit sie zu einem Draw-Call verschmolzen werden können.
 * Vorderseite nach +z, Mittelpunkt im Ursprung.
 * @param {Materialien} m @param {number} nummer 1 … 64
 */
export function nummernTafel(m, nummer) {
  const k = Math.max(0, Math.min(NUMMERN_RASTER * NUMMERN_RASTER - 1, nummer - 1));
  const feld = 1 / NUMMERN_RASTER;
  // Ausschnitt innerhalb des Feldes (der gezeichnete Rahmen), Canvas-Zeile 0 liegt oben
  const u0 = (k % NUMMERN_RASTER) * feld + feld * (2 / 64);
  const u1 = u0 + feld * (60 / 64);
  const v1 = 1 - Math.floor(k / NUMMERN_RASTER) * feld - feld * (6 / 64);
  const v0 = v1 - feld * (52 / 64);
  const geo = new THREE.PlaneGeometry(0.1, 0.087);
  const uv = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('uv'));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
  uv.needsUpdate = true;
  return new THREE.Mesh(geo, m.nummern);
}

/**
 * Zweite Schicht über einer Glasscheibe, die nur Spiegelungen hinzufügt (additiv).
 * Bei normalem durchsichtigem Material würden Spiegelungen mit der Durchsichtigkeit mit ausgeblendet.
 * @param {THREE.Mesh} glas
 * @param {Materialien} m
 */
export function spiegelschicht(glas, m) {
  const schicht = glas.clone();
  schicht.material = m.glasSpiegel;
  schicht.renderOrder = 3;
  return schicht;
}
