// Bauteile für Innenräume: Wände mit Öffnungen, Möbel, Ausstellungsstücke.
// Alles stilisiert aus einfachen Formen; Maße in Metern.
import * as THREE from 'three';
import { dielenTextur, putzTextur, holzTextur, heizkoerperTextur, nummernAtlas, glasTextur, gesichtsTafel, NUMMERN_RASTER, skaliereUV, zufall } from './texturen.js';
import { kopf, hals, arm, oberkoerper, stoffTeil, sparsam, istSparsam } from './menschen.js';
import { alsStufe } from './stufen.js';

/** Umschaltabstände der Detailstufen (m bei 1080 Bildpunkten Bildhöhe), aus dem Bildvergleich */
export const STUFEN_ABSTAND = { bueste: 3.0, figur: 3.5, schrankkopf: 2.5 };

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

// Aufhellung (Nutzer 14. 11.: Boden und dunkles Holz in Firefox zu dunkel), ohne neue Lichtberechnung:
// Faktor auf die Grundfarbe der Dielen und des dunklen Holzes (Büstensockel, Türen, Geländer, Tische,
// auch das Podest der Figurengruppe)
const DIELEN_HELLIGKEIT = 1.5;
const HOLZ_DUNKEL_HELLIGKEIT = 1.4;
/** @param {[number, number, number]} rgb sRGB 0–255 @param {number} f @returns {[number, number, number]} */
const heller = (rgb, f) => [Math.round(rgb[0] * f), Math.round(rgb[1] * f), Math.round(rgb[2] * f)];

/**
 * Legt alle gemeinsam genutzten Materialien einmal an.
 */
export function erstelleMaterialien() {
  const lambert = (/** @type {THREE.MeshLambertMaterialParameters} */ p) => new THREE.MeshLambertMaterial(p);
  // Glänzende Oberflächen (Feinschliff B): spiegeln die Umgebung (scene.environment)
  const glanz = (/** @type {THREE.MeshStandardMaterialParameters} */ p) => new THREE.MeshStandardMaterial(p);
  return {
    dielen: lambert({ map: dielenTextur(DIELEN_HELLIGKEIT) }),
    // Säle hell (Werbeblatt 1888: „weit, bequem und hell“, Rokoko-Schmuck); Farbton angenommen
    putzSaal: lambert({ map: putzTextur('#ddd2bb', 5) }),
    putzHell: lambert({ map: putzTextur('#cdc6b6', 9) }),
    decke: lambert({ map: putzTextur('#f0eadc', 13) }),
    lampenGlas: lambert({ color: 0xf3efe4, emissive: 0x2a2620 }),
    emaille: lambert({ color: 0x2f4637, side: THREE.DoubleSide }),
    gesims: lambert({ color: 0xe8e2d4 }),
    fussleiste: lambert({ map: holzTextur([58, 38, 24], 21) }),
    holzDunkel: glanz({ map: holzTextur(heller([66, 44, 28], HOLZ_DUNKEL_HELLIGKEIT), 31), roughness: 0.55, metalness: 0, envMapIntensity: 0.3 }),
    holzHell: lambert({ map: holzTextur([150, 112, 72], 41) }),
    fensterRahmen: lambert({ color: 0xe9e5db }),
    // Vorhangstoff (Farbe angenommen) und Nummerntafeln (eine gemeinsame Textur für alle Nummern)
    vorhang: lambert({ color: 0x5c2a26 }),
    nummern: lambert({ map: nummernAtlas() }),
    gold: glanz({ color: 0xd8ae52, metalness: 1, roughness: 0.22, envMapIntensity: 1.6 }),
    messing: glanz({ color: 0xc9a058, metalness: 1, roughness: 0.25, envMapIntensity: 1.5 }),
    // Säulenschäfte (Marmor angenommen; Marmortreppen im Haus belegt)
    marmor: glanz({ color: 0xece6da, metalness: 0, roughness: 0.15, envMapIntensity: 1.0 }),
    stoffRot: lambert({ color: 0x6e1d1d }),
    podest: lambert({ color: new THREE.Color().setRGB(...heller([59, 31, 26], HOLZ_DUNKEL_HELLIGKEIT).map((c) => c / 255), THREE.SRGBColorSpace) }),
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
      // Hinter dem Fenster liegt der Straßenausblick (welt/ausblick.js), nicht Teil der Wand
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
// Feste Rollen statt Zufall: Stand, Alter, Statur, Haar, Bart, Kleidung und Merkmale je Figur bewusst
// verteilt (keine Namen, keine echten Personen). Farben laufen über Vertex-Farben auf `m.farbig`, daher
// kosten weitere Farben keinen Draw-Call. Stände, Kleidung und Narben sind Gestaltung, keine belegte Angabe.

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
  // Besetzung A2 (Kleidung nach Stand)
  leinen: 0xb8ab90, grauweiss: 0xc9c3b5, kittelblau: 0x3b577c, loden: 0x4b5437, marine: 0x232a3d, senf: 0x8a6a2b,
  rostbraun: 0x6c3a24, nickel: 0x9d9b93,
  // Frauen B1 (Farben nach den Bildquellen, siehe holmes-quellen.md: dunkle Taillen, rotes/lila Tuch, gelb-weiße Schürze)
  blaugrau: 0x46505c, tuchrot: 0x8a2c24, lila: 0x5c3d5c, gelbweiss: 0xd6cba0, dunkelgruen: 0x26332a,
};

/**
 * Frauenrollen (Sitzung B1; Gestaltung nach den Quellen, ungepflegt wie die Männer): Taille (eng
 * anliegendes, hochgeschlossenes Oberteil mit Stehkragen und Knopfreihe), wahlweise Latzschürze und
 * Schultertuch. Die Rolle kann Farben überschreiben (rock = Taille, schuerze, tuch, kragen).
 * @type {Record<string, { taille: keyof typeof STOFF, schuerze: keyof typeof STOFF | null, streifen?: boolean, tuch: keyof typeof STOFF | null, kragen: keyof typeof STOFF | null, abgetragen: number }>}
 */
export const FRAU_STAND = {
  // Dienstmagd: dunkles Kleid, helle Latzschürze, kleiner weißer Kragen (Paulsen 1881, Limmer 1889)
  dienstmagd: { taille: 'schwarz', schuerze: 'weiss', tuch: null, kragen: 'weiss', abgetragen: 0.4 },
  // Wäscherin: Taille, gestreifte Latzschürze (Paulsen), ausgeblichen
  waescherin: { taille: 'blaugrau', schuerze: 'gelbweiss', streifen: true, tuch: null, kragen: null, abgetragen: 0.9 },
  // Giftmischerin: schwarze Taille, Tuch über den Schultern (Kraus, Paulsen)
  giftmischerin: { taille: 'schwarz', schuerze: null, tuch: 'lila', kragen: null, abgetragen: 0.3 },
};

/**
 * Stände der Schreckenskammer (Gestaltung): Tracht und Halsbinde, Hemdfarbe, wie abgetragen.
 * Trachten: gehrock (langer Rock, Weste, Revers), joppe (kurze Jacke mit Revers), weste (Hemdsärmel,
 * hochgekrempelt, mit Weste), kittel (Fuhrmannskittel mit Passe), troyer (Wollpullover mit Rollkragen).
 * Halsbinde ist die Ausnahme (Wunsch des Nutzers): Krawatte nur bei den „feinen“ Betrügern, Halstuch mit
 * seitlichem Knoten nur bei Zuhälter und Fuhrknecht, sonst offener Hemdkragen bzw. Rollkragen.
 * Frauenrollen für Sitzung B (bis dahin steht an diesen Plätzen ein Mann): dienstmagd, waescherin, giftmischerin.
 * @type {Record<string, { tracht: 'gehrock' | 'joppe' | 'weste' | 'kittel' | 'troyer', binder: 'krawatte' | 'tuch' | 'offen' | 'keiner', hemd: keyof typeof STOFF, abgetragen: number }>}
 */
export const STAND = {
  betrueger: { tracht: 'gehrock', binder: 'krawatte', hemd: 'weiss', abgetragen: 0 }, // Hochstapler, Heiratsschwindler
  hausierer: { tracht: 'gehrock', binder: 'offen', hemd: 'leinen', abgetragen: 1 }, // alter, geflickter Rock
  zuhaelter: { tracht: 'joppe', binder: 'tuch', hemd: 'creme', abgetragen: 0 }, // auffällige Farben
  einbrecher: { tracht: 'joppe', binder: 'offen', hemd: 'grauweiss', abgetragen: 0.6 },
  hehler: { tracht: 'joppe', binder: 'offen', hemd: 'leinen', abgetragen: 0.8 },
  wilddieb: { tracht: 'joppe', binder: 'offen', hemd: 'leinen', abgetragen: 0.8 }, // Lodenjoppe
  tageloehner: { tracht: 'weste', binder: 'offen', hemd: 'leinen', abgetragen: 1 },
  taschendieb: { tracht: 'weste', binder: 'offen', hemd: 'grauweiss', abgetragen: 0.5 },
  fuhrknecht: { tracht: 'kittel', binder: 'tuch', hemd: 'leinen', abgetragen: 0.5 },
  seemann: { tracht: 'troyer', binder: 'keiner', hemd: 'grauweiss', abgetragen: 0.4 },
  schlaeger: { tracht: 'troyer', binder: 'keiner', hemd: 'grauweiss', abgetragen: 0.7 },
};

/**
 * Rolle einer Wachsfigur. Gesicht = Zelle der Gesichtstafel passend zur Altersstufe
 * (jung 0, 1, 4, 8 · mittel 3, 5, 9, 11 · alt 2, 6, 7, 10; mit Narben 16–22, siehe NARBEN in texturen.js;
 * Brauenfarbe siehe texturen.js), form = Kopfform 0–5.
 * @typedef {object} Rolle
 * @property {0 | 1 | 2} alter 0 jung, 1 mittel, 2 alt
 * @property {number} gesicht
 * @property {number} form
 * @property {keyof typeof HAARFARBE | null} haar null = Glatze
 * @property {import('./menschen.js').HaarStil} frisur
 * @property {import('./menschen.js').BartStil} bart
 * @property {keyof typeof HAARFARBE} [bartFarbe] sonst wie das Haar
 * @property {'schmal' | 'mittel' | 'kraeftig'} [statur]
 * @property {keyof typeof STAND} [stand] Stand bzw. Rolle (bestimmt Tracht und Halsbinde)
 * @property {keyof typeof STOFF} [rock] Rock, Jacke, Weste (Tracht weste), Kittel oder Pullover
 * @property {keyof typeof STOFF} [weste] Weste unter Rock/Jacke
 * @property {keyof typeof STOFF} [krawatte] Krawatte bzw. Halstuch (nur wenn der Stand eine Halsbinde trägt)
 * @property {keyof typeof STOFF} [hose] @property {keyof typeof STOFF} [hemd] sonst nach Stand
 * @property {keyof typeof STOFF} [flicken] aufgesetzter Flicken in dieser Farbe
 * @property {keyof typeof STOFF} [muetze] Schiebermütze (Haar darunter kurz)
 * @property {'zylinder' | 'melone'} [hut] Form des Huts, wenn die Figur einen trägt
 * @property {{ nase?: number, ohr?: -1 | 1, klappe?: -1 | 1, brille?: 'nickel' | 'monokel' }} [merkmale]
 * @property {boolean} [frauPlatz] vorgesehen für eine Frauenfigur (Sitzung B); bis dahin steht hier ein Mann
 * @property {'dienstmagd' | 'waescherin' | 'giftmischerin'} [frauRolle] Rolle der Frau (Kleidung nach FRAU_STAND)
 * @property {'mann' | 'frau'} [art] Figurenart; 'frau' (B1): Büste und Schrankkopf mit Frauenkopf, Taille, Stehkragen
 *   (Gesicht 14, 15 oder 23, Form 6 oder 7, Frisur 'hochgesteckt' oder 'dutt'); Ganzfigur (B2) mit bodenlangem Kleid.
 * @property {keyof typeof STOFF} [schuerze] @property {keyof typeof STOFF} [tuch] @property {keyof typeof STOFF} [kragen]
 *   Frauen: Farben von Schürze, Schultertuch und Kragen (sonst nach FRAU_STAND)
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
 * meist ungepflegt (zerzaust, strähnig, Stoppeln, struppig). Fast alle aus den unteren Ständen
 * (Tagelöhner, Fuhrknecht, Seemann, Hausierer, Zuhälter, Einbrecher, Wilddieb …), nur zwei „feine“
 * Betrüger im Gehrock (Büste 0 und 8). Narben und Entstellungen bei etwa einem Drittel.
 * Nachbarn unterscheiden sich in Alter, Haarfarbe und Frisur; jeder Blickpunkt zeigt drei
 * Altersstufen und mindestens vier Haarfarben. `frauPlatz` markiert die Plätze für Frauenfiguren.
 */
export const BESETZUNG = {
  // Büsten in Raum A: 0–5 an der Hofwand (z 1,6 → 7,85), 6–8 an der Trennwand zu Raum B (x 6,75 → 8,45).
  // Seite −1 (lokal −x) ist vom Blickpunkt „Büsten nah“ aus zu sehen.
  buesten: [
    R(0, 16, 0, 'blond', 'scheitel', 'schnurr', { stand: 'betrueger', statur: 'schmal', rock: 'schwarz', weste: 'creme', krawatte: 'blau', merkmale: { brille: 'monokel' } }),
    R(2, 6, 4, 'grau', 'kranz', 'stoppel', { stand: 'wilddieb', rock: 'loden', weste: 'braun', krawatte: 'tabak', merkmale: { ohr: -1 } }),
    R(0, 14, 6, 'rot', 'hochgesteckt', 'keiner', { art: 'frau', frauPlatz: true, frauRolle: 'waescherin', flicken: 'tweed' }),
    R(0, 17, 5, 'schwarz', 'straehnig', 'stoppel', { stand: 'taschendieb', statur: 'schmal', rock: 'braun', krawatte: 'bordeaux' }),
    R(1, 21, 1, 'meliert', 'kurz', 'schnurrStruppig', { stand: 'schlaeger', statur: 'kraeftig', rock: 'marine', merkmale: { klappe: -1, nase: -0.07 } }),
    R(0, 0, 2, 'dunkelbraun', 'zerzaust', 'stoppel', { stand: 'tageloehner', rock: 'grau', krawatte: 'blau' }),
    R(0, 22, 2, 'rotblond', 'straehnig', 'keiner', { stand: 'seemann', statur: 'schmal', rock: 'blau' }),
    R(1, 23, 7, 'dunkelbraun', 'dutt', 'keiner', { art: 'frau', frauPlatz: true, frauRolle: 'giftmischerin' }),
    R(1, 5, 4, 'dunkelblond', 'scheitel', 'voll', { stand: 'betrueger', rock: 'tweed', weste: 'braun', krawatte: 'gruen', merkmale: { brille: 'nickel' } }),
  ],
  // Glasschränke in Raum B (z 11,0 und 13,2): je 12 Köpfe, Boden 0 (unten) bis 2, je Boden 4 Plätze; je Schrank 2 Alte.
  // Von den Schrankköpfen ist nur der Kragen bzw. das Halstuch zu sehen (nach Stand).
  schrank: [
    [
      R(0, 8, 0, 'schwarz', 'zerzaust', 'stoppel', { stand: 'tageloehner', krawatte: 'rot' }), R(1, 11, 1, 'rot', 'kurz', 'schnurrStruppig', { stand: 'einbrecher', krawatte: 'schwarz' }),
      R(2, 10, 4, 'weiss', 'kranz', 'struppig', { stand: 'hausierer', krawatte: 'braun' }), R(0, 1, 2, 'blond', 'straehnig', 'keiner', { stand: 'taschendieb', krawatte: 'blau' }),
      R(1, 18, 2, 'meliert', 'ecken', 'stoppel', { stand: 'hehler', krawatte: 'gruen' }), R(0, 0, 5, 'braun', 'straehnig', 'backen', { stand: 'seemann', rock: 'marine' }),
      R(0, 4, 3, 'rotblond', 'zerzaust', 'keiner', { stand: 'fuhrknecht', krawatte: 'bordeaux' }), R(1, 3, 0, 'schwarz', 'licht', 'schnurrStruppig', { stand: 'zuhaelter', krawatte: 'senf' }),
      R(0, 14, 7, 'blond', 'dutt', 'keiner', { art: 'frau', frauPlatz: true, frauRolle: 'dienstmagd' }), R(0, 17, 1, 'schwarz', 'locken', 'stoppel', { stand: 'einbrecher', krawatte: 'rot' }),
      R(1, 5, 5, 'dunkelblond', 'kurz', 'schnurr', { stand: 'betrueger', krawatte: 'bordeaux', merkmale: { brille: 'nickel' } }), R(2, 7, 3, 'grau', 'licht', 'stoppel', { stand: 'wilddieb', krawatte: 'gruen' }),
    ],
    [
      R(1, 9, 1, 'meliert', 'zerzaust', 'struppig', { stand: 'schlaeger', rock: 'anthrazit' }), R(0, 22, 0, 'rot', 'straehnig', 'stoppel', { stand: 'taschendieb', krawatte: 'schwarz' }),
      R(2, 6, 3, 'grau', 'ecken', 'schnurrStruppig', { stand: 'hausierer', krawatte: 'rot' }), R(0, 1, 5, 'blond', 'kurz', 'stoppel', { stand: 'einbrecher', krawatte: 'braun', merkmale: { klappe: 1 } }),
      R(0, 0, 4, 'dunkelbraun', 'locken', 'keiner', { stand: 'seemann', rock: 'blau' }), R(1, 20, 2, 'rotblond', 'ecken', 'backen', { stand: 'zuhaelter', krawatte: 'rot' }),
      R(1, 15, 6, 'braun', 'dutt', 'keiner', { art: 'frau', frauPlatz: true, frauRolle: 'waescherin', rock: 'dunkelgruen' }), R(0, 8, 3, 'schwarz', 'straehnig', 'schnurrStruppig', { stand: 'tageloehner', krawatte: 'gruen' }),
      R(1, 3, 5, 'schwarz', 'kurz', 'struppig', { stand: 'schlaeger', rock: 'grau', merkmale: { nase: 0.07 } }), R(0, 0, 2, 'braun', 'zerzaust', 'keiner', { stand: 'hehler', krawatte: 'senf' }),
      R(2, 2, 4, 'weiss', 'kranz', 'stoppel', { stand: 'wilddieb', krawatte: 'tabak' }), R(1, 9, 0, 'meliert', 'straehnig', 'schnurr', { stand: 'einbrecher', krawatte: 'bordeaux' }),
    ],
  ],
  // Figurengruppe in Raum B: 0 mit Hut (Melone), 1 ohne, 2 hinten links neben dem Platz der Leiche (Frau, B2)
  gruppe: [
    R(1, 20, 1, 'rot', 'kurz', 'struppig', { stand: 'zuhaelter', statur: 'kraeftig', rock: 'tabak', weste: 'senf', krawatte: 'rot', hose: 'hellgrau', hut: 'melone', merkmale: { nase: 0.06 } }),
    R(2, 10, 4, 'weiss', 'kranz', 'schnurrStruppig', { stand: 'hausierer', rock: 'braun', weste: 'grau', krawatte: 'schwarz', hose: 'tweed', flicken: 'tweed', merkmale: { ohr: 1 } }),
    // B2: Dienstmagd als Ganzfigur (bodenlanges dunkles Kleid, lange weiße Schürze, weißer Kragen)
    R(1, 23, 6, 'dunkelblond', 'hochgesteckt', 'keiner', { art: 'frau', frauPlatz: true, frauRolle: 'dienstmagd' }),
  ],
};

/** Statur: Breite und Tiefe des Rumpfs, Bauch und Taille (nur Ganzfiguren; Taille = Breite, die
 * um 1,06 m dazukommt, d. h. weniger Taille), Kopfmaße */
const STATUR = {
  schmal: { breite: 0.92, tiefe: 0.94, bauch: 0, taille: 0, kopf: [0.96, 1.03, 0.98] },
  mittel: { breite: 1, tiefe: 1, bauch: 0, taille: 0, kopf: [1, 1, 1] },
  kraeftig: { breite: 1.08, tiefe: 1.1, bauch: 0.03, taille: 0.012, kopf: [1.05, 0.98, 1.03] },
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
    const t = st.taille * Math.exp(-(((y - 1.06) / 0.12) ** 2));
    return [y, (hw + t) * st.breite, hd * st.tiefe + b, zo + b * 0.8, n];
  });
}

/**
 * Wachskopf nach Rolle.
 * @param {Materialien} m @param {Rolle} rolle
 * @param {boolean} [fein=true]
 * @param {boolean} [hut=false] unter einem Hut nur das Haar unter dem Hutrand (ebenso unter der Mütze)
 */
function wachskopf(m, rolle, fein = true, hut = false) {
  const haar = rolle.haar ? farbe(m, HAARFARBE[rolle.haar]) : null;
  const bartFarbe = rolle.bartFarbe ? farbe(m, HAARFARBE[rolle.bartFarbe]) : haar;
  const mk = rolle.merkmale;
  const k = kopf({
    haut: m.wachs, zelle: rolle.gesicht, variante: rolle.form, fein, alter: rolle.alter,
    // Schrankköpfe (grob) mit etwas sparsamerem Gitter: hält die Dreiecke im Blick unter ~135 000
    raster: fein ? null : [21, 16],
    haar, haarStil: hut || rolle.muetze ? 'unterHut' : rolle.frisur, bart: rolle.bart, bartMaterial: bartFarbe,
    merkmale: mk ? { ...mk, metall: farbe(m, mk.brille === 'monokel' ? STOFF.messing : STOFF.nickel), leder: farbe(m, STOFF.schwarz) } : null,
    muetze: rolle.muetze ? farbe(m, STOFF[rolle.muetze]) : null,
  });
  k.scale.set(...STATUR[rolle.statur ?? 'mittel'].kopf);
  // Frauenkopf etwas kleiner
  if (rolle.art === 'frau') k.scale.multiply(FRAU_KOPF);
  return k;
}

/** Frauen (B1): Kopf etwas kleiner, Hals schmaler (der hohe Stehkragen sitzt eng am Hals) */
const FRAU_KOPF = new THREE.Vector3(0.94, 0.96, 0.95);
const FRAU_HALS = 0.86;

/**
 * Hals einer Büste oder eines Schrankkopfs; bei Frauen schmaler.
 * @param {Materialien} m @param {Rolle} rolle
 */
function halsNachArt(m, rolle) {
  const h = hals(m.wachs);
  if (rolle.art === 'frau') h.scale.set(FRAU_HALS, 1, FRAU_HALS);
  return h;
}

/** Schultern einer Büste (Profil: y, halbe Breite, halbe Tiefe, Versatz z, Rundlichkeit); schräge, runde Schultern */
const BUESTE = [[1.15, 0.165, 0.1, 0, 2.6], [1.22, 0.177, 0.108, 0.005, 2.5], [1.26, 0.18, 0.104, 0.004, 2.35], [1.285, 0.167, 0.094, 0.002, 2.15],
  [1.305, 0.138, 0.082, 0, 2.0], [1.325, 0.1, 0.07, 0, 2.0], [1.345, 0.063, 0.056, 0, 2.0]];
/** Büste einer Frau (B1): schmalere, stärker abfallende Schultern, Brust nach vorn angedeutet, enger Hals */
const BUESTE_FRAU = [[1.15, 0.148, 0.106, 0.01, 2.4], [1.19, 0.153, 0.112, 0.014, 2.3], [1.23, 0.158, 0.1, 0.008, 2.2],
  [1.265, 0.15, 0.088, 0.003, 2.1], [1.29, 0.124, 0.074, 0, 2.0], [1.315, 0.085, 0.062, 0, 2.0], [1.345, 0.055, 0.05, 0, 2.0]];

/**
 * Wachskopf als Büste auf einem Sockel (Kopf eines Verbrechers – ohne Namen, stilisiert).
 * @param {Materialien} m @param {Rolle} rolle aus BESETZUNG.buesten
 */
export function buesteAufSockel(m, rolle) {
  const g = new THREE.Group();
  // Kontaktschatten: Schultern, Hals und Kopf verdecken in der Lichtberechnung als Scheiben (lichtmodell.js)
  g.userData.lichtZonen = [1.12, 1.25, 1.34, 1.45, 1.6, 1.95];
  // Fuge am Sockelfuß (für die Lichtkarte zu schmal): eckiger Kontaktfleck (welt/fleck.js)
  g.userData.kontaktFleck = { breite: 0.5, tiefe: 0.5, eckig: true };
  g.add(box(0.36, 1.1, 0.36, 0, 0.55, 0, m.holzDunkel));
  g.add(box(0.42, 0.05, 0.42, 0, 1.125, 0, m.holzDunkel));
  const st = STATUR[rolle.statur ?? 'mittel'];
  // Schultern, Hals und Kopf: Detailstufen (welt/stufen.js), der Sockel bleibt
  const figurTeil = () => {
    const t = new THREE.Group();
    // Schultern und Kragen nach Stand bzw. Frauenrolle (kleidung() steht weiter unten bei figur)
    const frau = rolle.art === 'frau';
    t.add(oberkoerper({ profil: profilNachStatur(frau ? BUESTE_FRAU : BUESTE, { ...st, bauch: 0, taille: 0 }), ...(frau ? kleidungFrau(m, rolle) : kleidung(m, rolle, true).o) }));
    const h = halsNachArt(m, rolle);
    h.position.set(0, 1.39, -0.012);
    t.add(h);
    const k = wachskopf(m, rolle);
    k.position.y = 1.46;
    t.add(k);
    return t;
  };
  g.add(alsStufe(figurTeil(), () => sparsam(figurTeil), { abstand: STUFEN_ABSTAND.bueste }));
  return g;
}

const klingeGeo = new THREE.BoxGeometry(0.065, 0.9, 0.008);
const griffGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.26, 10);
const knaufGeo = new THREE.SphereGeometry(0.03, 10, 8);

/**
 * Scheiben (lokales y, Meter) für die Verdecker einer stehenden Figur (lichtmodell.js): Füße, Unter-/Oberschenkel,
 * Hüfte, Rumpf mit Armen, Schultern, Hals, Kopf, Hut. Auch für die Leiche (fundstuecke.js).
 */
export const FIGUR_ZONEN = [0, 0.15, 0.45, 0.8, 1.05, 1.3, 1.48, 1.6, 1.78, 2.05];
/** Kontaktfleck unter den Füßen einer stehenden Figur (welt/fleck.js; Füße sind für die Lichtkarte zu klein) */
export const FIGUR_FLECK = { breite: 0.44, tiefe: 0.42, dz: 0.05 };

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

/**
 * Farbe mit Faktor abgedunkelt (sRGB-Hex).
 * @param {number} hex @param {number} f
 */
const dunkler = (hex, f) => (Math.round(((hex >> 16) & 255) * f) << 16) | (Math.round(((hex >> 8) & 255) * f) << 8) | Math.round((hex & 255) * f);

/**
 * Kleidung nach Stand: Angaben für oberkoerper() (ohne Profil) und für die Arme.
 * @param {Materialien} m @param {Rolle} rolle @param {boolean} bueste Büste (nur Schultern) oder Ganzfigur
 */
function kleidung(m, rolle, bueste) {
  const st = STAND[rolle.stand ?? 'betrueger'];
  const f = (/** @type {keyof typeof STOFF} */ k) => farbe(m, STOFF[k]);
  const rockHex = STOFF[rolle.rock ?? 'anthrazit'];
  const rock = farbe(m, rockHex);
  const hemd = f(rolle.hemd ?? st.hemd);
  const tuch = st.binder === 'tuch';
  const binde = f(rolle.krawatte ?? (tuch ? 'rot' : 'schwarz'));
  const knopf = f('horn');
  const unten = bueste ? 1.2 : 1.28;
  const breite = bueste ? 0.055 : 0.07;
  /** @type {Omit<Parameters<typeof oberkoerper>[0], 'profil'>} */
  const o = {
    rock, schnitt: 2, untenZu: bueste, binder: st.binder, abgetragen: st.abgetragen,
    kragen: tuch ? binde : hemd, kragenForm: tuch ? 'tuch' : st.binder === 'offen' ? 'offen' : 'steh',
  };
  /** @type {{ stoff: import('./menschen.js').Stoff, manschette: import('./menschen.js').Stoff | null, krempel: number }} */
  let aermel = { stoff: rock, manschette: hemd, krempel: 0 };
  if (st.tracht === 'gehrock' || st.tracht === 'joppe') {
    o.ausschnitt = { unten, breite, weste: f(rolle.weste ?? 'grau'), hemd, krawatte: binde, knopf, rockKnoepfe: bueste ? 0 : 2 };
    // Joppe: kurze Jacke bis zur Hüfte
    if (st.tracht === 'joppe' && !bueste) o.saum = 0.8;
  } else if (st.tracht === 'weste') {
    // Hemdsärmel mit Weste: außen die Weste, im V und über den Schultern das Hemd
    o.ausschnitt = { unten: unten + 0.03, breite: breite * 0.9, weste: hemd, hemd, krawatte: binde, knopf, rockKnoepfe: bueste ? 1 : 4 };
    o.revers = false;
    o.knoepfeMitte = true;
    o.schulter = hemd;
    if (!bueste) {
      o.saum = 0.92;
      o.unterteil = f(rolle.hose ?? 'anthrazit');
    }
    aermel = { stoff: hemd, manschette: null, krempel: 0.45 };
  } else if (st.tracht === 'kittel') {
    // Fuhrmannskittel: kleiner Schlitz am Hals, Naht der Passe über der Brust
    o.ausschnitt = { unten: bueste ? 1.27 : 1.42, breite: 0.035, weste: hemd, hemd, krawatte: binde, knopf, rockKnoepfe: 0 };
    o.revers = false;
    o.passe = farbe(m, dunkler(rockHex, 0.7));
    if (!bueste) o.saum = 0.68;
    aermel = { stoff: rock, manschette: null, krempel: 0 };
  } else {
    // Troyer: Wollpullover mit Rollkragen
    o.kragen = rock;
    o.kragenForm = 'roll';
    o.binder = 'keiner';
    if (!bueste) {
      o.saum = 0.88;
      o.unterteil = f(rolle.hose ?? 'anthrazit');
    }
    aermel = { stoff: rock, manschette: null, krempel: 0 };
  }
  if (rolle.flicken) {
    const fl = f(rolle.flicken);
    o.flecken = bueste ? [{ stoff: fl, y: 1.235, th: -1.05, b: 0.22, h: 0.06 }] : [{ stoff: fl, y: 1.02, th: -0.75 }, { stoff: fl, y: 1.3, th: 2.5 }];
  }
  return { o, aermel };
}

/**
 * Kleidung einer Frauenbüste (B1): Taille mit hohem Stehkragen und Knopfreihe, nach Rolle Latzschürze
 * oder Schultertuch, ausgeblichen; Flicken wie bei den Männern.
 * @param {Materialien} m @param {Rolle} rolle @param {boolean} [ganz=false] Ganzfigur (B2) statt Büste
 * @returns {Omit<Parameters<typeof oberkoerper>[0], 'profil'>}
 */
function kleidungFrau(m, rolle, ganz = false) {
  const fs = FRAU_STAND[rolle.frauRolle ?? 'waescherin'];
  // Ganzfigur (B2): Oberteil wie die Büste, 0,085 m höher (KLEID_FRAU); Schürze lang bis knapp über den Saum
  const dy = ganz ? KLEID_FRAU_HOEHER : 0;
  const f = (/** @type {keyof typeof STOFF} */ k) => farbe(m, STOFF[k]);
  const taille = f(rolle.rock ?? fs.taille);
  const schuerze = rolle.schuerze ?? fs.schuerze;
  const tuch = rolle.tuch ?? fs.tuch;
  const kragen = rolle.kragen ?? fs.kragen;
  return {
    rock: taille, untenZu: true, revers: false, binder: 'keiner', abgetragen: fs.abgetragen,
    kragen: kragen ? f(kragen) : taille, kragenForm: 'hoch',
    knopfleiste: { stoff: f('horn'), anzahl: 6 },
    schuerze: schuerze ? {
      stoff: f(schuerze), oben: 1.255 + dy, breite: 0.085, streifen: fs.streifen ?? false,
      ...(ganz ? { unten: 0.09, rockBreite: 0.18, taille: KLEID_FRAU_TAILLE, band: true } : {}),
    } : null,
    schultertuch: tuch ? { stoff: f(tuch), tiefe: 0.15 } : null,
    flecken: rolle.flicken ? [{ stoff: f(rolle.flicken), y: 1.215 + dy, th: 1.15, b: 0.2, h: 0.05 }] : [],
  };
}

/**
 * Hosenbein (0,82 m, Mitte im Ursprung): oben kräftig, über dem Knie schmal, Knie vorn angedeutet,
 * Wade hinten, zum Knöchel verjüngt. Gedrechselt (Naht hinten), dann Knie und Wade aus der Achse geschoben.
 */
function beinForm(/** @type {number} */ teile) {
  // [Radius, y] vom Knöchel zur Hüfte
  const punkte = [[0.035, -0.41], [0.034, -0.33], [0.042, -0.21], [0.048, -0.1], [0.045, 0.01], [0.047, 0.08], [0.049, 0.15],
    [0.055, 0.25], [0.06, 0.35], [0.062, 0.41]].map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(punkte, teile, Math.PI);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(pos.getX(i), z) || 1;
    const vorn = Math.max(0, z / r) ** 2;
    const hinten = Math.max(0, -z / r) ** 2;
    pos.setZ(i, z + 0.008 * vorn * Math.exp(-(((y - 0.08) / 0.035) ** 2)) - 0.006 * hinten * Math.exp(-(((y + 0.1) / 0.07) ** 2)));
  }
  geo.computeVertexNormals();
  // Naht (erste und letzte Spalte) glätten
  const nor = geo.attributes.normal;
  const np = punkte.length;
  for (let j = 0; j < np; j++) {
    const a = j;
    const b = teile * np + j;
    const n = new THREE.Vector3().fromBufferAttribute(nor, a).add(new THREE.Vector3().fromBufferAttribute(nor, b)).normalize();
    nor.setXYZ(a, n.x, n.y, n.z);
    nor.setXYZ(b, n.x, n.y, n.z);
  }
  return geo;
}

// Geteilte Formen der Figuren je Detailstufe (voll / sparsam, siehe jeStufe und welt/stufen.js)
const BEIN_GEO = { voll: beinForm(10), spar: beinForm(7) };
const HUT_GEO = { voll: new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16), spar: new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10) };
const KREMPE_GEO = { voll: new THREE.CylinderGeometry(0.16, 0.16, 0.015, 20), spar: new THREE.CylinderGeometry(0.16, 0.16, 0.015, 12) };
const MELONE_GEO = {
  voll: new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  spar: new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2),
};
const MELONE_RAND_GEO = { voll: new THREE.TorusGeometry(1, 0.06, 4, 22), spar: new THREE.TorusGeometry(1, 0.06, 4, 12) };

/**
 * Form der aktuellen Detailstufe: innerhalb von `sparsam(…)` die sparsame, sonst die volle.
 * @template T @param {{ voll: T, spar: T }} f @returns {T}
 */
export const jeStufe = (f) => (istSparsam() ? f.spar : f.voll);

/** Körper im Gehrock (Profil: y, halbe Breite, halbe Tiefe, Versatz z); Saum bei 0,6 m, Hals bei 1,52 m */
export const GEHROCK = [[0.6, 0.205, 0.15, -0.005], [0.8, 0.19, 0.135, 0], [0.98, 0.172, 0.118, 0], [1.06, 0.16, 0.11, 0], [1.2, 0.17, 0.118, 0.006],
  [1.33, 0.182, 0.122, 0.01], [1.4, 0.184, 0.112, 0.005], [1.44, 0.168, 0.1, 0.002], [1.47, 0.138, 0.085, 0], [1.5, 0.1, 0.07, 0], [1.52, 0.065, 0.058, 0]];

/**
 * Gehrock der Besetzung: schräge, runde Schultern (5. Wert: Rundlichkeit), schmaler als GEHROCK,
 * mit Taille bei 1,04 m und ausgestelltem Schoß; Querschnitt unten runder (weniger Röhre)
 */
const GEHROCK_RUND = [[0.6, 0.198, 0.14, -0.005, 2.4], [0.8, 0.177, 0.122, 0, 2.3], [0.94, 0.157, 0.107, 0, 2.25], [1.04, 0.143, 0.099, 0.002, 2.2],
  [1.12, 0.147, 0.103, 0.004, 2.25], [1.22, 0.159, 0.111, 0.008, 2.35], [1.32, 0.166, 0.116, 0.01, 2.4], [1.38, 0.167, 0.107, 0.005, 2.3],
  [1.418, 0.155, 0.096, 0.002, 2.1], [1.452, 0.133, 0.085, 0, 2.0], [1.485, 0.103, 0.072, 0, 2.0], [1.52, 0.065, 0.058, 0, 2.0]];
const SCHUH_GEO = { voll: new THREE.SphereGeometry(1, 12, 8), spar: new THREE.SphereGeometry(1, 8, 6) };

/** Ganzfigur einer Frau (B2): Oberteil = BUESTE_FRAU um so viel höher, Taille (Schürzenband) in dieser Höhe */
const KLEID_FRAU_HOEHER = 0.085;
const KLEID_FRAU_TAILLE = 1.0;
/**
 * Kleid einer Frau (B2) vom Saum bis zum Hals, als ein Rumpfprofil (y, halbe Breite, halbe Tiefe, Versatz z,
 * Rundlichkeit): weiter, bodenlanger Rock (Koch 1890, Limmer 1889), schmale Taille (Korsett), oben die Form
 * der Frauenbüste. Etwa 1,66 m groß (Männer 1,76 m).
 * @type {number[][]}
 */
const KLEID_FRAU = [[0.015, 0.272, 0.25, -0.012, 2.0], [0.1, 0.266, 0.244, -0.012, 2.0], [0.32, 0.243, 0.222, -0.011, 2.0],
  [0.58, 0.205, 0.182, -0.008, 2.05], [0.78, 0.17, 0.138, -0.004, 2.1], [0.9, 0.148, 0.108, 0, 2.15],
  [KLEID_FRAU_TAILLE, 0.124, 0.088, 0.003, 2.15], [1.09, 0.13, 0.094, 0.008, 2.2], [1.17, 0.142, 0.104, 0.014, 2.3],
  ...BUESTE_FRAU.map(([y, ...r]) => [Math.round((y + KLEID_FRAU_HOEHER) * 1000) / 1000, ...r])];
/** Kontaktfleck unter dem Rock (breiter als die Füße eines Mannes) */
const FRAU_FLECK = { breite: 0.6, tiefe: 0.56, dz: -0.012 };

/**
 * Lebensgroße, stilisierte Wachsfigur (etwa 1,75 m), gekleidet nach Stand (Gehrock, Joppe,
 * Hemdsärmel mit Weste, Kittel oder Troyer). Die Figur schaut nach +z.
 * @param {Materialien} m
 * @param {Rolle} rolle aus BESETZUNG.gruppe
 * @param {object} [o]
 * @param {boolean} [o.hut=false] Hut nach rolle.hut (Zylinder oder Melone)
 * @param {number} [o.armWinkel=0.12] Abspreizung der Arme
 * @param {boolean} [o.quaderSchuhe=true] Schuhe als Quader (die zählen im Lichtmodell mit; nur die
 *   beiden Figuren von Feinschliff C haben sie, neue Figuren bekommen runde Schuhe)
 */
export function figur(m, rolle, { hut = false, armWinkel = 0.12, quaderSchuhe = true } = {}) {
  const g = new THREE.Group();
  const frau = rolle.art === 'frau';
  g.userData.lichtZonen = FIGUR_ZONEN;
  g.userData.kontaktFleck = frau ? FRAU_FLECK : FIGUR_FLECK;
  const st = STATUR[rolle.statur ?? 'mittel'];
  // Quader-Schuhe zählen im Lichtmodell (Lichtkarte) und bleiben außerhalb der Detailstufen
  if (quaderSchuhe && !frau) for (const s of [-1, 1]) g.add(box(0.1, 0.06, 0.24, s * 0.09, 0.03, 0.05, m.eisen));
  // Alles Runde (Beine, Rumpf, Arme, Kopf, Hut): Detailstufen (welt/stufen.js)
  const figurTeil = () => (frau ? frauKoerper(m, rolle, armWinkel) : figurKoerper(m, rolle, st, { hut, armWinkel, quaderSchuhe }));
  g.add(alsStufe(figurTeil(), () => sparsam(figurTeil), { abstand: STUFEN_ABSTAND.figur }));
  return g;
}

/**
 * Runde Teile einer Wachsfigur (siehe figur), als eigene Gruppe für die Detailstufen.
 * @param {Materialien} m @param {Rolle} rolle @param {typeof STATUR[keyof typeof STATUR]} st
 * @param {{ hut: boolean, armWinkel: number, quaderSchuhe: boolean }} o
 */
function figurKoerper(m, rolle, st, { hut, armWinkel, quaderSchuhe }) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const bein = stoffTeil(jeStufe(BEIN_GEO), farbe(m, STOFF[rolle.hose ?? 'anthrazit']));
    bein.scale.set(st.breite, 1, st.breite);
    bein.position.set(s * 0.08, 0.41, 0);
    g.add(bein);
    if (!quaderSchuhe) {
      const schuh = stoffTeil(jeStufe(SCHUH_GEO), farbe(m, STOFF.horn));
      schuh.scale.set(0.05, 0.035, 0.125);
      schuh.position.set(s * 0.09, 0.03, 0.05);
      g.add(schuh);
    }
  }
  const { o, aermel } = kleidung(m, rolle, false);
  g.add(oberkoerper({ profil: profilNachStatur(GEHROCK_RUND, st), ...o }));
  const sw = Math.sin(armWinkel);
  const b = st.breite;
  for (const s of [-1, 1]) {
    g.add(arm({
      stoff: aermel.stoff, haut: m.wachs, zelle: 0, seite: s, manschette: aermel.manschette, kugel: 1.1, krempel: aermel.krempel,
      // schlanke, verjüngte Ärmel (Statur über die Dicke), kleinere Hände; Ellbogen leicht zurück,
      // Handgelenk vor: Arme leicht angewinkelt. Schulterkugel etwas größer als der Ärmel, damit sein
      // oberes Ende nicht über die Schulter ragt.
      radien: [0.044, 0.038, 0.031], dicke: Math.sqrt(b), handGroesse: 0.86,
      schulter: [s * 0.142 * b, 1.375, 0], ellbogen: [s * (0.187 * b + sw * 0.26), 1.13, -0.012], handgelenk: [s * (0.192 * b + sw * 0.5), 0.895, 0.075],
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
  if (hut && rolle.hut === 'melone') {
    // Melone: runder Kopf, schmale, am Rand aufgerollte Krempe
    const schwarz = farbe(m, STOFF.schwarz);
    const kr = stoffTeil(jeStufe(MELONE_GEO), schwarz);
    kr.scale.set(0.092, 0.1, 0.104);
    kr.position.set(0, 1.71, -0.004);
    g.add(kr);
    const rand = stoffTeil(jeStufe(KREMPE_GEO), schwarz);
    rand.scale.set(0.76, 0.7, 0.86);
    rand.position.set(0, 1.71, -0.004);
    g.add(rand);
    const roll = stoffTeil(jeStufe(MELONE_RAND_GEO), schwarz);
    roll.scale.set(0.122, 0.137, 0.12);
    roll.rotation.x = Math.PI / 2;
    roll.position.set(0, 1.713, -0.004);
    g.add(roll);
  } else if (hut) {
    const hh = stoffTeil(jeStufe(HUT_GEO), farbe(m, STOFF.schwarz));
    hh.scale.set(0.85, 1, 1);
    hh.position.set(0, 1.787, -0.004);
    g.add(hh);
    const kr = stoffTeil(jeStufe(KREMPE_GEO), farbe(m, STOFF.schwarz));
    kr.scale.set(0.88, 1, 1);
    kr.position.set(0, 1.707, -0.004);
    g.add(kr);
  }
  return g;
}

/**
 * Runde Teile einer Frauenfigur (B2): Kleid mit bodenlangem Rock (KLEID_FRAU) und Kleidung nach FRAU_STAND,
 * lange, enge Ärmel ohne Manschette (Limmer 1889), Schuhspitzen unter dem Saum (Schuhe nicht belegt, daher
 * nur angedeutet), Hals und Kopf wie bei der Frauenbüste.
 * @param {Materialien} m @param {Rolle} rolle @param {number} armWinkel
 */
function frauKoerper(m, rolle, armWinkel) {
  const g = new THREE.Group();
  const o = kleidungFrau(m, rolle, true);
  for (const s of [-1, 1]) {
    const schuh = stoffTeil(jeStufe(SCHUH_GEO), farbe(m, STOFF.schwarz));
    schuh.scale.set(0.042, 0.03, 0.1);
    schuh.position.set(s * 0.07, 0.03, 0.17);
    schuh.rotation.y = s * 0.15;
    g.add(schuh);
  }
  g.add(oberkoerper({ profil: KLEID_FRAU, ...o }));
  const sw = Math.sin(armWinkel);
  for (const s of [-1, 1]) {
    g.add(arm({
      stoff: o.rock, haut: m.wachs, zelle: 0, seite: s, manschette: null, kugel: 1.1, krempel: 0,
      // schmaler als bei den Männern, Schultern tiefer und enger (BUESTE_FRAU), Hände kleiner
      radien: [0.04, 0.034, 0.028], handGroesse: 0.8,
      schulter: [s * 0.128, 1.3, 0.004], ellbogen: [s * (0.162 + sw * 0.24), 1.07, -0.008], handgelenk: [s * (0.168 + sw * 0.46), 0.85, 0.07],
    }).gruppe);
  }
  const oben = KLEID_FRAU[KLEID_FRAU.length - 1][0];
  const h = halsNachArt(m, rolle);
  h.position.set(0, oben + 0.045, -0.012);
  g.add(h);
  const k = wachskopf(m, rolle, true);
  k.position.y = oben + 0.115;
  g.add(k);
  return g;
}

// Halsabschluss der Schrankköpfe sparsam (offene Zylinder, kleiner Knoten): 24 Köpfe im Blick
// sparsame Stufe: 10 Teilungen wie der Hals darunter
const KRAGEN_STEH_GEO = { voll: new THREE.CylinderGeometry(0.064, 0.068, 0.04, 12, 1, true), spar: new THREE.CylinderGeometry(0.064, 0.068, 0.04, 10, 1, true) };
const KRAGEN_ROLL_GEO = { voll: new THREE.CylinderGeometry(0.068, 0.075, 0.05, 12, 1, true), spar: new THREE.CylinderGeometry(0.068, 0.075, 0.05, 10, 1, true) };
// offener Hemdkragen: vorn eine Lücke, dort sieht man den Hals
const KRAGEN_OFFEN_GEO = {
  voll: new THREE.CylinderGeometry(0.07, 0.066, 0.034, 12, 1, true, 0.55, Math.PI * 2 - 1.1),
  spar: new THREE.CylinderGeometry(0.07, 0.066, 0.034, 10, 1, true, 0.55, Math.PI * 2 - 1.1),
};
const KNOTEN_GEO = { voll: new THREE.SphereGeometry(1, 7, 4), spar: new THREE.SphereGeometry(1, 5, 4) };
// Frauen (B1): hoher Stehkragen am schmaleren Hals (Hals 0,86 × 0,055…0,06 m)
const KRAGEN_HOCH_GEO = { voll: new THREE.CylinderGeometry(0.052, 0.057, 0.058, 12, 1, true), spar: new THREE.CylinderGeometry(0.052, 0.057, 0.058, 10, 1, true) };

/**
 * Abschluss am Hals eines Schrankkopfs nach Stand: Rollkragen, offener Hemdkragen, Halstuch mit
 * seitlichem Knoten oder weißer Stehkragen mit Krawattenknoten. Mitte am Halsansatz, vorn = +z.
 * @param {Materialien} m @param {Rolle} rolle
 */
function halsAbschluss(m, rolle) {
  const st = STAND[rolle.stand ?? 'betrueger'];
  const g = new THREE.Group();
  if (rolle.art === 'frau') {
    // hoher Stehkragen der Taille (Dienstmagd: weißer Kragen) am schmaleren Hals
    const fs = FRAU_STAND[rolle.frauRolle ?? 'waescherin'];
    const k = stoffTeil(jeStufe(KRAGEN_HOCH_GEO), farbe(m, STOFF[rolle.kragen ?? fs.kragen ?? rolle.rock ?? fs.taille]));
    k.position.y = 0.012;
    g.add(k);
    return g;
  }
  if (st.tracht === 'troyer') {
    g.add(stoffTeil(jeStufe(KRAGEN_ROLL_GEO), farbe(m, STOFF[rolle.rock ?? 'marine'])));
    return g;
  }
  if (st.binder === 'offen' || st.binder === 'keiner') {
    g.add(stoffTeil(jeStufe(KRAGEN_OFFEN_GEO), farbe(m, STOFF[rolle.hemd ?? st.hemd])));
    return g;
  }
  const tuch = st.binder === 'tuch';
  const binde = farbe(m, STOFF[rolle.krawatte ?? (tuch ? 'rot' : 'schwarz')]);
  const ring = stoffTeil(jeStufe(KRAGEN_STEH_GEO), tuch ? binde : farbe(m, STOFF.weiss));
  if (tuch) ring.scale.set(1.04, 0.8, 1.04);
  g.add(ring);
  const knoten = stoffTeil(jeStufe(KNOTEN_GEO), binde);
  if (tuch) {
    // Halstuch-Knoten seitlich (wie bei den Ganzfiguren)
    knoten.scale.set(0.02, 0.017, 0.014);
    knoten.position.set(0.021, -0.006, 0.063);
  } else {
    knoten.scale.set(0.014, 0.012, 0.009);
    knoten.position.set(0, -0.006, 0.066);
  }
  g.add(knoten);
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
      const rolle = rollen[(boden * anzahl + k) % rollen.length];
      // je Kopf eine Gruppe: verdeckt in der Lichtberechnung als zwei Scheiben (Hals, Kopf)
      const kg = new THREE.Group();
      kg.position.set(x, y, tiefe / 2);
      kg.userData.lichtZonen = [0.025, 0.16, 0.45];
      // Hals, Kragen und Kopf: Detailstufen je Kopf (welt/stufen.js)
      const kopfTeil = () => {
        const t = new THREE.Group();
        const h = halsNachArt(m, rolle);
        h.position.set(0, 0.09, -0.012);
        t.add(h);
        const ab = halsAbschluss(m, rolle);
        ab.position.set(0, 0.045, -0.012);
        t.add(ab);
        const wk = wachskopf(m, rolle, false);
        wk.position.set(0, 0.235, 0);
        t.add(wk);
        return t;
      };
      kg.add(alsStufe(kopfTeil(), () => sparsam(kopfTeil), { abstand: STUFEN_ABSTAND.schrankkopf }));
      g.add(kg);
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
