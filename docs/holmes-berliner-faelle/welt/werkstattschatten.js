// Fensterschatten nur in der Werkstatt (III. Etage, z 19,75 … 27,5) – Aufträge „Werkstatt Teil 2/3“, 15. 11. 2026.
//
// Die vorab berechnete Beleuchtung (Lichtkarte 10 cm, Lichtgitter 0,4 m) ist für kleine und runde Teile zu grob:
// Gipsbrocken, Wachshände, Büsten, Kittel wirkten flach und schwebend. Ergänzung:
// - Schattenbild (≈ 5 mm je Bildpunkt) für jede ebene Fläche mit Lichtkarte in der Werkstatt, einmal im Browser
//   gebacken (Auftrag „Schatten backen“, nur lokal: `__debug.backeWerkstattSchatten()` → holmes_schatten.py →
//   `licht/werkstatt-schatten.png/.json`); das Spiel lädt nur das Bild (`ladeWerkstattSchatten`).
//   Lichtquelle sind die Fensteröffnungen (bedeckter Himmel, angenommen): einige tausend gestreute Punkte auf den
//   Fenstern, je Punkt werden die Werfer (`userData.wsWirft`) exakt auf die Ebene der Fläche projiziert
//   (Schnitt des Schattenvolumens mit der Ebene). Ein Zählwert im Tiefenpuffer zählt jede Stelle je Lichtpunkt nur
//   einmal. Gemittelt über alle Punkte (gewichtet nach Einfallswinkel, Abstand, Himmelshelligkeit) entsteht ein
//   weicher Schatten: am Fuß fast scharf, mit dem Abstand zum Werfer immer weicher. (Früher 198 feste Punkte beim
//   Start: ab ≈ 1 m vom Bein lagen die Einzelschatten nebeneinander, „Fächer“.)
// - Formlicht für runde Teile (nur Lichtgitter): die dem Fenster zugewandte Seite heller, die abgewandte dunkler;
// - etwas mehr Helligkeitsunterschied im Raum (hell am Fenster, dunkler in den Ecken).
// Alles nur in der Werkstatt: weicher Übergang in der Trennwand zu Raum B, Raum A und B bleiben unverändert.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Werkstatt-Bereich (Welt), in dem Flächen ein Schattenbild bekommen */
const BEREICH = new THREE.Box3(new THREE.Vector3(-0.05, -0.05, 19.7), new THREE.Vector3(9.05, 4.05, 27.55));
/** Kantenlänge eines Schattenbild-Punkts (m) */
const RASTER = 0.005;
/** Gröberes Raster für große Flächen (Boden, Wände): Fläche über RASTER_GRENZE m² */
const RASTER_GROSS = 0.01;
const RASTER_GRENZE = 2;
/** Randpunkte je Fläche im Schattenbild (gegen Ausbluten beim weichen Filtern) */
const RAND = 2;
/** Lichtpunkte je Fenster beim Backen (gestreut: je Zelle eines Rasters ein Zufallspunkt) */
const PUNKTE_JE_FENSTER = 1024;
/** Lichtpunkte je Zeichenauftrag */
const STAPEL = 256;
/** Werfer, die näher als das an der Fläche liegen, zählen nicht (eigene Auflage, Rechenrauschen) */
const ABSTAND_MIN = 0.0015;
/** Mauerdicke an den Fenstern (m): Lichtpunkte an der Innenseite, Strahlen müssen auch durch die Außenöffnung passen */
const LAIBUNG = 0.5;
/**
 * Gewichtung der Lichtpunkte (Hochzahl auf Winkel · Himmel / Abstand²): 1 = physikalisch, dann bestimmt die Lage
 * im Raum, welches Fenster überwiegt (ferne/schräge Fenster werfen kaum sichtbare Schatten); 0 = jedes Fenster,
 * das die Stelle erreicht, zählt gleich. Nutzer: 0,5 (Auftrag Beinschatten).
 */
const MISCH = 0.5;

/**
 * Sammelt die Schattenwerfer der Werkstatt (Meshes unter einer Gruppe mit `userData.wsWirft`) als eine
 * Geometrie in Weltkoordinaten (nur Lage, ohne Index). Vor dem Verschmelzen aufrufen.
 * `userData.teile` hält je Mesh den Bereich (erstes Dreieck × 3, Eckenzahl) und den umgebenden Quader.
 * @param {THREE.Object3D} gruppe
 * @returns {THREE.BufferGeometry | null}
 */
export function sammleSchattenWerfer(gruppe) {
  gruppe.updateWorldMatrix(true, true);
  /** @type {THREE.BufferGeometry[]} */
  const teile = [];
  /** @type {{ start: number, anzahl: number, min: number[], max: number[] }[]} */
  const bereiche = [];
  let start = 0;
  gruppe.traverse((o) => {
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh || !mesh.visible || mesh.userData.nurTreffer) return;
    // Werfer: ein Vorfahr trägt `wsWirft`; `wsNicht` schließt aus (z. B. Blätter flach an der Wand)
    let p = /** @type {THREE.Object3D | null} */ (mesh);
    while (p && !p.userData.wsWirft) {
      if (p.userData.wsNicht) return;
      p = p.parent;
    }
    if (!p) return;
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', mesh.geometry.attributes.position.clone());
    if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
    g.applyMatrix4(mesh.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    g.computeBoundingBox();
    const box = /** @type {THREE.Box3} */ (g.boundingBox);
    const anzahl = g.attributes.position.count;
    bereiche.push({ start, anzahl, min: box.min.toArray(), max: box.max.toArray() });
    start += anzahl;
    teile.push(g);
  });
  if (!teile.length) return null;
  const geo = mergeGeometries(teile);
  teile.forEach((t) => t.dispose());
  geo.userData.teile = bereiche;
  return geo;
}

/**
 * Fasst mehrere Werfer-Geometrien aus `sammleSchattenWerfer` zusammen (z. B. Etage und Fundstücke).
 * @param {(THREE.BufferGeometry | null)[]} liste
 * @returns {THREE.BufferGeometry | null}
 */
export function vereineSchattenWerfer(liste) {
  const geos = /** @type {THREE.BufferGeometry[]} */ (liste.filter(Boolean));
  if (geos.length < 2) return geos[0] ?? null;
  /** @type {{ start: number, anzahl: number, min: number[], max: number[] }[]} */
  const bereiche = [];
  let start = 0;
  for (const g of geos) {
    for (const t of g.userData.teile) bereiche.push({ ...t, start: t.start + start });
    start += g.attributes.position.count;
  }
  // die Einzelgeometrien bleiben erhalten (Kennung beim Laden, erneutes Backen)
  const geo = mergeGeometries(geos);
  geo.userData.teile = bereiche;
  return geo;
}

/** Projektion der Werfer auf die Ebene der Fläche (Lichtpunkt → Ebene), Ausgabe im Schattenbild */
const WERFER_VERT = `
uniform vec4 fEbene;   // Normale, Abstand: n·x + d = 0
uniform vec3 fEcke;
uniform vec3 fU;       // Kante u / |u|²
uniform vec3 fV;
uniform vec4 fAbb;     // Fläche → Ausschnitt: x = fAbb.x · a + fAbb.z, y = fAbb.y · b + fAbb.w (Clip-Raum)
uniform vec2 fStreu;   // Clip-Raum je Bildpunkt
// je Instanz ein Lichtpunkt
attribute vec3 lPunkt;
attribute vec3 lNormale;
attribute vec4 lRahmen;  // Fensteröffnung in der Wandebene: a0, y0, a1, y1 (a = z bei x-Fenstern, sonst x)
attribute vec2 lStreu;  // Versatz innerhalb eines Bildpunkts (glatte Kanten)
attribute float lNr;    // Zählwert 0 … 1 (Tiefe): jeder Bildpunkt zählt je Lichtpunkt nur einmal
varying float vAbstand;
varying vec3 vPunkt;
varying vec3 vNormale;
varying vec4 vRahmen;
flat varying float vNr;
void main() {
	vPunkt = lPunkt;
	vNormale = lNormale;
	vRahmen = lRahmen;
	vNr = lNr;
	float pl = dot( fEbene.xyz, lPunkt ) + fEbene.w;
	float pp = dot( fEbene.xyz, position ) + fEbene.w;
	vAbstand = pp;
	// Lichtpunkt hinter der Fläche: nichts zeichnen
	if ( pl <= 0.01 ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); return; }
	// Schattenpunkt homogen: (pl · P − pp · L, pl − pp); hinter dem Licht (pp > pl) wird w < 0 und abgeschnitten
	vec4 q = vec4( pl * position - pp * lPunkt, pl - pp );
	vec3 rel = q.xyz - fEcke * q.w;
	vec2 o = fAbb.zw + lStreu * fStreu;
	gl_Position = vec4( fAbb.x * dot( rel, fU ) + o.x * q.w, fAbb.y * dot( rel, fV ) + o.y * q.w, 0.0, q.w );
}`;

/** Gewicht eines Lichtpunkts für einen Punkt der Fläche (Bildpunkt aus gl_FragCoord) */
const GEWICHT = `
uniform vec4 fEbene;
uniform vec3 fEcke;
uniform vec3 fKu;      // Kante u (ganz)
uniform vec3 fKv;
uniform vec4 fPix;     // Ausschnitt der Fläche im Schattenbild: x0, y0, Breite, Höhe (Bildpunkte, ohne Rand)
uniform float fSkala;
uniform float fMisch;  // Hochzahl der Gewichtung: 0 = jeder erreichende Lichtpunkt gleich, 1 = nach Abstand und Winkel
float gewicht( vec3 L, vec3 nL, vec4 rahmen ) {
	vec2 f = ( gl_FragCoord.xy - fPix.xy ) / fPix.zw;
	vec3 Q = fEcke + f.x * fKu + f.y * fKv;
	vec3 d = L - Q;
	float r2 = max( dot( d, d ), 1e-4 );
	d *= inversesqrt( r2 );
	float cq = dot( fEbene.xyz, d );
	float cl = -dot( nL, d );
	if ( cq <= 0.0 || cl <= 0.0 ) return 0.0;
	// Fensterlaibung: der Strahl muss auch durch die Öffnung in der Außenebene passen (Mauerdicke ${LAIBUNG}),
	// sonst trifft er die Laibung (deren zurückgeworfenes Licht steckt schon in der Lichtkarte)
	vec3 aussen = L + d * ( ${LAIBUNG} / cl );
	float aa = abs( nL.x ) > 0.5 ? aussen.z : aussen.x;
	if ( aa < rahmen.x || aa > rahmen.z || aussen.y < rahmen.y || aussen.y > rahmen.w ) return 0.0;
	// bedeckter Himmel: von oben heller als am Horizont, darunter (Straße) wenig
	float himmel = d.y > 0.0 ? ( 1.0 + 2.0 * d.y ) / 3.0 : 0.15;
	return pow( max( cq * cl * himmel / r2, 1e-12 ), fMisch ) * fSkala;
}`;

const WERFER_FRAG = `
${GEWICHT}
varying float vAbstand;
varying vec3 vPunkt;
varying vec3 vNormale;
varying vec4 vRahmen;
flat varying float vNr;
void main() {
	if ( vAbstand < ${ABSTAND_MIN} ) discard;
	// Tiefentest „ungleich“: der erste Treffer je Lichtpunkt trägt dessen Zählwert ein, weitere fallen weg
	gl_FragDepth = vNr;
	gl_FragColor = vec4( gewicht( vPunkt, vNormale, vRahmen ), 0.0, 0.0, 0.0 );
}`;

const SUMME_VERT = `
attribute vec3 lPunkt;
attribute vec3 lNormale;
attribute vec4 lRahmen;  // Fensteröffnung in der Wandebene: a0, y0, a1, y1 (a = z bei x-Fenstern, sonst x)
varying vec3 vPunkt;
varying vec3 vNormale;
varying vec4 vRahmen;
void main() {
	vPunkt = lPunkt;
	vNormale = lNormale;
	vRahmen = lRahmen;
	gl_Position = vec4( position.xy, 0.0, 1.0 );
}`;

const SUMME_FRAG = `
${GEWICHT}
varying vec3 vPunkt;
varying vec3 vNormale;
varying vec4 vRahmen;
void main() {
	gl_FragColor = vec4( 0.0, gewicht( vPunkt, vNormale, vRahmen ), 0.0, 0.0 );
}`;

/**
 * @typedef {object} Empfaenger
 * @property {number} nr Nummer der Lichtkarten-Seite
 * @property {THREE.Vector3} n @property {THREE.Vector3} ecke Ecke des Ausschnitts
 * @property {THREE.Vector3} u @property {THREE.Vector3} v Kanten des Ausschnitts
 * @property {number[]} ab Ausschnitt der Seite: a0, b0, a1 − a0, b1 − b0 (Anteile 0 … 1)
 * @property {number} w @property {number} h Bildpunkte ohne Rand
 * @property {number[]} teile Nummern der Werfer-Teile, deren Schatten die Fläche treffen kann
 * @property {number} [x] @property {number} [y] Lage im Schattenbild (ohne Rand)
 */

/**
 * Lichtpunkte auf den Fenstern der Werkstatt (Innenseite der Wand), gestreut: Raster mit etwa `jeFenster` Zellen,
 * je Zelle ein Zufallspunkt (feste Folge, gleiches Ergebnis bei jedem Backen).
 * @param {{ achse: string, ebene: number, min: number[], max: number[] }[]} fenster
 * @param {number} jeFenster
 * @returns {{ punkte: { p: THREE.Vector3, n: THREE.Vector3, rahmen: number[] }[], ecken: THREE.Vector3[][] }}
 */
function lichtPunkte(fenster, jeFenster) {
  /** @type {{ p: THREE.Vector3, n: THREE.Vector3, rahmen: number[] }[]} */
  const punkte = [];
  /** @type {THREE.Vector3[][]} Ecken je Fenster */
  const ecken = [];
  let zufall = 12345;
  const rnd = () => ((zufall = (zufall * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (const f of fenster) {
    // Innenseite: Behrenstraße x = 9, Friedrichstraße z = 27,5 (Wanddicke 0,5)
    const innen = f.ebene - LAIBUNG;
    const n = f.achse === 'x' ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, -1);
    const mitte = f.achse === 'x'
      ? new THREE.Vector3(innen, (f.min[1] + f.max[1]) / 2, (f.min[0] + f.max[0]) / 2)
      : new THREE.Vector3((f.min[0] + f.max[0]) / 2, (f.min[1] + f.max[1]) / 2, innen);
    if (!BEREICH.containsPoint(mitte)) continue;
    const breite = f.max[0] - f.min[0];
    const hoehe = f.max[1] - f.min[1];
    const e = innen;
    const lage = (/** @type {number} */ a, /** @type {number} */ y) => (f.achse === 'x' ? new THREE.Vector3(e, y, a) : new THREE.Vector3(a, y, e));
    ecken.push([lage(f.min[0], f.min[1]), lage(f.max[0], f.min[1]), lage(f.min[0], f.max[1]), lage(f.max[0], f.max[1])]);
    const nu = Math.max(1, Math.round(Math.sqrt((jeFenster * breite) / hoehe)));
    const nv = Math.max(1, Math.round(jeFenster / nu));
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = f.min[0] + ((i + rnd()) / nu) * breite;
        const y = f.min[1] + ((j + rnd()) / nv) * hoehe;
        punkte.push({ p: lage(a, y), n, rahmen: [f.min[0], f.min[1], f.max[0], f.max[1]] });
      }
    }
  }
  return { punkte, ecken };
}

/**
 * Wählt die Empfangsflächen: Lichtkarten-Seiten im Werkstatt-Bereich, die Fensterlicht bekommen und
 * von einem Werfer beschattet werden können.
 * @param {number[][]} flaechen aus `sammleLichtSzene`
 * @param {{ start: number, anzahl: number, min: number[], max: number[] }[]} teile
 * @param {{ p: THREE.Vector3 }[]} punkte
 * @param {THREE.Vector3[][]} fensterEcken Ecken je Fenster: der Schatten von jedem Punkt des Fensters liegt in der
 *   Hülle der Schatten von den Ecken (Projektion erhält gerade Linien)
 * @param {(e: Empfaenger) => boolean} [auswahl]
 * @returns {Empfaenger[]}
 */
function waehleEmpfaenger(flaechen, teile, punkte, fensterEcken, auswahl) {
  /** @type {Empfaenger[]} */
  const liste = [];
  const ecken = (/** @type {THREE.Box3} */ b) => Array.from({ length: 8 }, (_, i) => new THREE.Vector3(
    i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
  const bereichEcken = ecken(BEREICH);
  const q = new THREE.Vector3();
  flaechen.forEach((f, nr) => {
    const e0 = new THREE.Vector3(f[4], f[5], f[6]);
    const u0 = new THREE.Vector3(f[7], f[8], f[9]);
    const v0 = new THREE.Vector3(f[10], f[11], f[12]);
    const n = new THREE.Vector3(f[13], f[14], f[15]).normalize();
    // Ausschnitt im Bereich: Spanne der Bereichsecken in Flächenanteilen
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity, s0 = Infinity, s1 = -Infinity;
    for (const c of bereichEcken) {
      q.subVectors(c, e0);
      const a = q.dot(u0) / u0.lengthSq();
      const b = q.dot(v0) / v0.lengthSq();
      const s = q.dot(n);
      a0 = Math.min(a0, a); a1 = Math.max(a1, a);
      b0 = Math.min(b0, b); b1 = Math.max(b1, b);
      s0 = Math.min(s0, s); s1 = Math.max(s1, s);
    }
    if (s0 > 0 || s1 < 0) return;
    // Unterseiten (Decke, Plattenunterseiten) bekommen kaum Fensterlicht von unten: kein Schattenbild
    if (n.y < -0.5) return;
    a0 = Math.max(a0, 0); a1 = Math.min(a1, 1); b0 = Math.max(b0, 0); b1 = Math.min(b1, 1);
    // auch Flächen, die nur teilweise im Bereich liegen (Boden und Decke reichen über die ganze Etage)
    const lu = (a1 - a0) * u0.length();
    const lv = (b1 - b0) * v0.length();
    if (lu < 0.02 || lv < 0.02) return;
    const ecke = e0.clone().addScaledVector(u0, a0).addScaledVector(v0, b0);
    const u = u0.clone().multiplyScalar(a1 - a0);
    const v = v0.clone().multiplyScalar(b1 - b0);
    const d = -n.dot(ecke);
    const vorne = punkte.filter((l) => n.dot(l.p) + d > 0.01);
    if (!vorne.length) return;
    // Fenster auf den Teil vor der Ebene beschneiden (Ecken im Umlauf 0, 1, 3, 2)
    /** @type {THREE.Vector3[]} */
    const lichter = [];
    for (const f of fensterEcken) {
      const ring = [f[0], f[1], f[3], f[2]];
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % 4];
        const sa = n.dot(a) + d - 0.01;
        const sb = n.dot(b) + d - 0.01;
        if (sa >= 0) lichter.push(a);
        if ((sa >= 0) !== (sb >= 0)) lichter.push(a.clone().lerp(b, sa / (sa - sb)));
      });
    }
    // Werfer, deren Schatten (von irgendeinem Lichtpunkt) auf den Ausschnitt fallen kann
    const box = new THREE.Box3();
    /** @type {number[]} */
    const treffer = [];
    teile.forEach((t, k) => {
      box.min.fromArray(t.min);
      box.max.fromArray(t.max);
      const be = ecken(box);
      const abst = be.map((c) => n.dot(c) + d);
      const hoch = Math.max(...abst);
      if (hoch < ABSTAND_MIN) return;
      const tief = Math.max(Math.min(...abst), 0);
      let pa0 = Infinity, pa1 = -Infinity, pb0 = Infinity, pb1 = -Infinity;
      for (const l of lichter) {
        // Schnittpunkte liegen 1 cm vor der Ebene: pl ≥ 0,01
        const pl = Math.max(n.dot(l) + d, 0.01);
        // nur der Teil des Werfers zwischen Ebene und Lichtpunkt wirft; als Prisma: Ecken auf die Ebenen
        // „Abstand tief“ und „Abstand oben“ verschoben (enthält den beschnittenen Quader)
        const oben = Math.min(hoch, pl - 0.001);
        if (oben <= tief) continue;
        for (let i = 0; i < 16; i++) {
          const pp = i < 8 ? tief : oben;
          q.copy(be[i & 7]).addScaledVector(n, pp - abst[i & 7]);
          q.multiplyScalar(pl).addScaledVector(l, -pp).multiplyScalar(1 / (pl - pp)).sub(ecke);
          const a = q.dot(u) / u.lengthSq();
          const b = q.dot(v) / v.lengthSq();
          pa0 = Math.min(pa0, a); pa1 = Math.max(pa1, a); pb0 = Math.min(pb0, b); pb1 = Math.max(pb1, b);
        }
      }
      if (pa1 < 0 || pa0 > 1 || pb1 < 0 || pb0 > 1) return;
      treffer.push(k);
    });
    if (!treffer.length) return;
    const raster = lu * lv > RASTER_GRENZE ? RASTER_GROSS : RASTER;
    const e = /** @type {Empfaenger} */ ({
      nr, n, ecke, u, v, ab: [a0, b0, a1 - a0, b1 - b0],
      w: Math.max(1, Math.ceil(lu / raster)), h: Math.max(1, Math.ceil(lv / raster)), teile: treffer,
    });
    if (!auswahl || auswahl(e)) liste.push(e);
  });
  return liste;
}

/**
 * Packt die Flächen ins Schattenbild (Oberkante der schon gepackten Flächen als Linie, „Skyline“; höchste zuerst,
 * jede an die Stelle, an der sie am wenigsten hoch hinausragt), in Streifen der Höhe `seite`: jeder Streifen wird
 * für sich gerechnet (kleiner Zwischenspeicher), keine Fläche reicht über eine Streifengrenze.
 * @param {Empfaenger[]} liste @param {number} breite @param {number} seite
 * @returns {number} Höhe des Schattenbilds
 */
function packe(liste, breite, seite) {
  const folge = [...liste].sort((a, b) => b.h - a.h || b.w - a.w || a.nr - b.nr);
  /** @type {{ x: number, y: number, w: number }[]} Oberkante: Abschnitte von links nach rechts */
  let linie = [{ x: 0, y: 0, w: breite }];
  let hoehe = 0;
  for (const e of folge) {
    const bw = e.w + 2 * RAND;
    const bh = e.h + 2 * RAND;
    let beste = null;
    for (let i = 0; i < linie.length; i++) {
      const x = linie[i].x;
      if (x + bw > breite) break;
      let y = 0;
      for (let j = i, rest = bw; rest > 0; j++) {
        y = Math.max(y, linie[j].y);
        rest -= linie[j].w;
      }
      const s0 = Math.floor(y / seite) * seite;
      if (y + bh > s0 + seite) y = s0 + seite;
      if (!beste || y + bh < beste.y + bh || (y + bh === beste.y + bh && x < beste.x)) beste = { x, y };
    }
    if (!beste) throw new Error(`Werkstattschatten: Fläche zu breit (${bw})`);
    e.x = beste.x + RAND;
    e.y = beste.y + RAND;
    hoehe = Math.max(hoehe, beste.y + bh);
    // Oberkante erneuern: [x, x + bw) liegt jetzt bei y + bh
    const x0 = beste.x;
    const x1 = beste.x + bw;
    /** @type {{ x: number, y: number, w: number }[]} */
    const neu = [];
    for (const a of linie) {
      const ende = a.x + a.w;
      if (ende <= x0 || a.x >= x1) { neu.push(a); continue; }
      if (a.x < x0) neu.push({ x: a.x, y: a.y, w: x0 - a.x });
      if (a.x <= x0) neu.push({ x: x0, y: beste.y + bh, w: bw });
      if (ende > x1) neu.push({ x: x1, y: a.y, w: ende - x1 });
    }
    // gleich hohe Nachbarn zusammenfassen
    linie = [];
    for (const a of neu) {
      const l = linie[linie.length - 1];
      if (l && l.y === a.y) l.w += a.w;
      else linie.push({ ...a });
    }
  }
  return hoehe;
}

/** Name der gebackenen Dateien in `licht/` (Bild und Beschreibung) */
const DATEI = 'werkstatt-schatten';

/**
 * Kennung der Werfer und Fenster zum Abgleich „passt die gebackene Datei noch zum Raum?“: nur ganze Zahlen
 * (Eckenzahl je Teil, umgebender Quader in cm, Fenster in cm), damit Firefox und Chromium gleich rechnen.
 * @param {(THREE.BufferGeometry | null)[]} werferListe Geometrien aus `sammleSchattenWerfer` (in fester Reihenfolge)
 * @param {{ achse: string, ebene: number, min: number[], max: number[] }[]} fenster
 * @returns {{ werfer: number[][], fenster: (string | number)[][] }}
 */
export function schattenKennung(werferListe, fenster) {
  const cm = (/** @type {number} */ x) => Math.round(x * 100);
  return {
    werfer: werferListe.filter(Boolean).flatMap((g) => /** @type {THREE.BufferGeometry} */ (g).userData.teile
      .map((/** @type {{ anzahl: number, min: number[], max: number[] }} */ t) => [t.anzahl, ...t.min.map(cm), ...t.max.map(cm)])),
    fenster: fenster.map((f) => [f.achse, cm(f.ebene), ...f.min.map(cm), ...f.max.map(cm)]),
  };
}

/**
 * Vergleicht zwei Kennungen; Zahlen dürfen um 1 abweichen (Rundung an der Grenze, andere Gleitkommawege).
 * @param {any[][]} a @param {any[][]} b
 * @returns {boolean}
 */
function kennungGleich(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((zeile, i) => zeile.length === b[i].length && zeile.every((x, j) => (typeof x === 'number'
    ? Math.abs(x - b[i][j]) <= 1 : x === b[i][j])));
}

/**
 * Backt die Fensterschatten der Werkstatt (nur lokal über `__debug.backeWerkstattSchatten()`): viele gestreute
 * Lichtpunkte, in Stapeln gezeichnet, Summen in 32-Bit-Gleitkomma; Ergebnis (Sichtbarkeit je Bildpunkt) geht an
 * `.claude/scripts/holmes_schatten.py empfange`, das entrauscht und `licht/werkstatt-schatten.png/.json` schreibt.
 * @param {THREE.WebGLRenderer} renderer
 * @param {(THREE.BufferGeometry | null)[]} werferListe aus `sammleSchattenWerfer` (Etage, Fundstücke)
 * @param {{ fenster: { achse: string, ebene: number, min: number[], max: number[] }[],
 *   lichtSzene: import('./lichtmodell.js').LichtSzene }} etage
 * @param {{ jeFenster?: number, auswahl?: (e: Empfaenger) => boolean, glaette?: number, senden?: boolean }} [optionen]
 *   Lichtpunkte je Fenster; `auswahl` beschränkt die Flächen (zum Messen); Glättung (Sigma, Bildpunkte) für Python
 * @returns {Promise<Record<string, any>>} Messwerte (und Antwort des Empfängers)
 */
export async function backeWerkstattSchatten(renderer, werferListe, etage, optionen = {}) {
  const start = performance.now();
  const werfer = vereineSchattenWerfer(werferListe);
  if (!werfer) throw new Error('Werkstattschatten: keine Werfer');
  if (!renderer.extensions.has('EXT_color_buffer_float') || !renderer.extensions.has('EXT_float_blend')) {
    throw new Error('Werkstattschatten: Backen braucht EXT_color_buffer_float und EXT_float_blend');
  }
  const { punkte, ecken: fensterEcken } = lichtPunkte(etage.fenster, optionen.jeFenster ?? PUNKTE_JE_FENSTER);
  const flaechen = etage.lichtSzene.flaechen;
  const teile = /** @type {{ start: number, anzahl: number, min: number[], max: number[] }[]} */ (werfer.userData.teile);
  const liste = waehleEmpfaenger(flaechen, teile, punkte, fensterEcken, optionen.auswahl);
  if (!liste.length) throw new Error('Werkstattschatten: keine Flächen');
  const groesste = Math.min(4096, renderer.capabilities.maxTextureSize);
  // Breite: die mit der kleinsten Gesamtfläche (Versuche in 32er-Schritten), mindestens die breiteste Fläche;
  // Streifenhöhe: Zwischenspeicher etwa 2 Mio. Bildpunkte (32-Bit-RGBA + Tiefe ≈ 40 MB), mindestens die höchste Fläche
  const breitMin = Math.max(64, ...liste.map((e) => e.w + 2 * RAND));
  const hochMin = Math.max(1, ...liste.map((e) => e.h + 2 * RAND));
  let bildBreite = breitMin;
  let seite = hochMin;
  let bildHoehe = Infinity;
  for (let b = breitMin; b <= groesste; b += 32) {
    const sb = Math.max(Math.ceil(2.1e6 / b), hochMin);
    if (b > breitMin && b * sb > 2.2e6) continue;
    const hb = packe(liste, b, sb);
    if (hb <= groesste && b * hb < bildBreite * bildHoehe) {
      bildBreite = b;
      seite = sb;
      bildHoehe = hb;
    }
  }
  bildHoehe = Math.max(1, packe(liste, bildBreite, seite));
  if (bildHoehe > groesste) throw new Error(`Werkstattschatten: Schattenbild zu groß (${bildBreite} × ${bildHoehe})`);

  // ---- Zeichnen: Summe der Gewichte (g) und der verdeckten Gewichte (r) je Bildpunkt ----
  const summe = new THREE.WebGLRenderTarget(bildBreite, Math.min(seite, bildHoehe), {
    type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false,
  });
  const gemeinsam = {
    fEbene: { value: new THREE.Vector4() }, fEcke: { value: new THREE.Vector3() }, fU: { value: new THREE.Vector3() },
    fV: { value: new THREE.Vector3() }, fKu: { value: new THREE.Vector3() }, fKv: { value: new THREE.Vector3() },
    fAbb: { value: new THREE.Vector4() }, fPix: { value: new THREE.Vector4() }, fSkala: { value: 1 },
    fStreu: { value: new THREE.Vector2() }, fMisch: { value: MISCH },
  };
  // Zähler je Bildpunkt: Tiefentest „ungleich“ mit dem Zählwert des Lichtpunkts (eindeutig über alle Stapel) –
  // jeder Bildpunkt zählt je Lichtpunkt nur einmal, auch wo sich Teile überlappen
  const werferMat = new THREE.ShaderMaterial({
    vertexShader: WERFER_VERT, fragmentShader: WERFER_FRAG, uniforms: gemeinsam,
    side: THREE.DoubleSide, depthTest: true, depthWrite: true, depthFunc: THREE.NotEqualDepth,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const summeMat = new THREE.ShaderMaterial({
    vertexShader: SUMME_VERT, fragmentShader: SUMME_FRAG, uniforms: gemeinsam,
    depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  // Lichtpunkte in Stapeln (je Zeichenauftrag höchstens STAPEL Instanzen: die Grafikkarte bleibt ansprechbar)
  const stapel = [];
  for (let s = 0; s < punkte.length; s += STAPEL) {
    const teil = punkte.slice(s, s + STAPEL);
    stapel.push({
      anzahl: teil.length,
      lPunkt: new THREE.InstancedBufferAttribute(new Float32Array(teil.flatMap((l) => l.p.toArray())), 3),
      lNormale: new THREE.InstancedBufferAttribute(new Float32Array(teil.flatMap((l) => l.n.toArray())), 3),
      lRahmen: new THREE.InstancedBufferAttribute(new Float32Array(teil.flatMap((l) => l.rahmen)), 4),
      // Streuung innerhalb eines Bildpunkts (glatte Kanten), R2-Folge
      lStreu: new THREE.InstancedBufferAttribute(new Float32Array(teil.flatMap((_, i) => {
        const k = s + i;
        return [(((k * 0.7548776662) % 1) - 0.5) * 0.999, (((k * 0.569840291) % 1) - 0.5) * 0.999];
      })), 2),
      lNr: new THREE.InstancedBufferAttribute(new Float32Array(teil.map((_, i) => (s + i + 0.5) / punkte.length)), 1),
    });
  }
  const viereck = new THREE.InstancedBufferGeometry();
  viereck.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  const summeNetz = new THREE.Mesh(viereck, summeMat);
  summeNetz.frustumCulled = false;
  const summeSzene = new THREE.Scene().add(summeNetz);
  const werferSzene = new THREE.Scene();
  const kamera = new THREE.Camera();
  const setzeLichter = (/** @type {THREE.InstancedBufferGeometry} */ geo, /** @type {any} */ st) => {
    for (const name of ['lPunkt', 'lNormale', 'lRahmen', 'lStreu', 'lNr']) geo.setAttribute(name, st[name]);
    geo.instanceCount = st.anzahl;
  };
  // Gewichte je Fläche etwa auf 1 bringen: Summe in der Mitte der Fläche (alle Lichtpunkte)
  const dd = new THREE.Vector3();
  for (const e of liste) {
    const mitte = e.ecke.clone().addScaledVector(e.u, 0.5).addScaledVector(e.v, 0.5);
    let gs = 0;
    for (const l of punkte) {
      dd.copy(l.p).sub(mitte);
      const r2 = Math.max(dd.lengthSq(), 1e-4);
      dd.normalize();
      const cq = e.n.dot(dd);
      const cl = -l.n.dot(dd);
      if (cq > 0 && cl > 0) gs += Math.max((cq * cl * (dd.y > 0 ? (1 + 2 * dd.y) / 3 : 0.15)) / r2, 1e-12) ** MISCH;
    }
    /** @type {any} */ (e).skala = gs > 1e-6 ? 1 / gs : 1;
  }

  const vorher = renderer.getRenderTarget();
  const farbeVorher = renderer.getClearColor(new THREE.Color());
  const alphaVorher = renderer.getClearAlpha();
  const autoVorher = renderer.autoClear;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  const lage = /** @type {Float32Array} */ (werfer.attributes.position.array);
  const eins = new Float32Array(4);
  // auf die Grafikkarte warten (ein Bildpunkt lesen), dann dem Browser kurz Luft lassen. Vorher den Renderer
  // zurückstellen: das Spiel zeichnet in der Pause sein Bild weiter und träfe sonst den Zwischenspeicher
  // (Fehler im ersten Versuch: Spielbild in der Summe → falsche, zu dunkle Schatten)
  const warte = async () => {
    renderer.readRenderTargetPixels(summe, 0, 0, 1, 1, eins);
    renderer.setRenderTarget(vorher);
    renderer.autoClear = autoVorher;
    renderer.setClearColor(farbeVorher, alphaVorher);
    await new Promise((r) => setTimeout(r, 0));
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
  };
  /** Sichtbarkeit 0 … 65535 je Bildpunkt (Zeile 0 = unten) */
  const sicht = new Uint16Array(bildBreite * bildHoehe).fill(65535);
  let dreiecke = 0;
  try {
    for (let s0 = 0; s0 < bildHoehe; s0 += seite) {
      const hoch = Math.min(seite, bildHoehe - s0);
      summe.viewport.set(0, 0, bildBreite, summe.height);
      renderer.setRenderTarget(summe);
      renderer.clear(true, true, true);
      // Werfer je Fläche dieses Streifens in eine Geometrie (für alle Stapel)
      const streifen = liste.filter((e) => /** @type {number} */ (e.y) >= s0 && /** @type {number} */ (e.y) < s0 + seite).map((e) => {
        const anzahl = e.teile.reduce((s, k) => s + teile[k].anzahl, 0);
        const feld = new Float32Array(anzahl * 3);
        let o = 0;
        for (const k of e.teile) {
          const t = teile[k];
          feld.set(lage.subarray(t.start * 3, (t.start + t.anzahl) * 3), o);
          o += t.anzahl * 3;
        }
        const geo = new THREE.InstancedBufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(feld, 3));
        const netz = new THREE.Mesh(geo, werferMat);
        netz.frustumCulled = false;
        return { e, geo, netz, anzahl };
      });
      for (const st of stapel) {
        setzeLichter(viereck, st);
        for (const { e, geo, netz, anzahl } of streifen) {
          const x0 = /** @type {number} */ (e.x);
          const y0 = /** @type {number} */ (e.y) - s0;
          const vw = e.w + 2 * RAND;
          const vh = e.h + 2 * RAND;
          summe.viewport.set(x0 - RAND, y0 - RAND, vw, vh);
          renderer.setRenderTarget(summe);
          const g = gemeinsam;
          g.fEbene.value.set(e.n.x, e.n.y, e.n.z, -e.n.dot(e.ecke));
          g.fEcke.value.copy(e.ecke);
          g.fU.value.copy(e.u).multiplyScalar(1 / e.u.lengthSq());
          g.fV.value.copy(e.v).multiplyScalar(1 / e.v.lengthSq());
          g.fKu.value.copy(e.u);
          g.fKv.value.copy(e.v);
          g.fPix.value.set(x0, y0, e.w, e.h);
          g.fAbb.value.set((2 * e.w) / vw, (2 * e.h) / vh, (2 * RAND) / vw - 1, (2 * RAND) / vh - 1);
          g.fStreu.value.set(2 / vw, 2 / vh);
          g.fSkala.value = /** @type {any} */ (e).skala;
          renderer.render(summeSzene, kamera);
          setzeLichter(geo, st);
          werferSzene.add(netz);
          renderer.render(werferSzene, kamera);
          werferSzene.remove(netz);
          dreiecke += (anzahl / 3) * st.anzahl;
        }
        await warte();
      }
      // Streifen lesen: Sichtbarkeit = 1 − verdeckt / gesamt
      const px = new Float32Array(bildBreite * hoch * 4);
      summe.viewport.set(0, 0, bildBreite, summe.height);
      renderer.readRenderTargetPixels(summe, 0, 0, bildBreite, hoch, px);      for (let i = 0; i < bildBreite * hoch; i++) {
        const gs = px[4 * i + 1];
        const v = gs > 1e-7 ? Math.min(Math.max(1 - px[4 * i] / gs, 0), 1) : 1;
        sicht[s0 * bildBreite + i] = Math.round(v * 65535);
      }
      for (const { geo } of streifen) {
        for (const name of ['lPunkt', 'lNormale', 'lRahmen', 'lStreu', 'lNr']) geo.deleteAttribute(name);
        geo.dispose();
      }
    }
  } finally {
    renderer.setRenderTarget(vorher);
    renderer.setClearColor(farbeVorher, alphaVorher);
    renderer.autoClear = autoVorher;
    summe.dispose();
    werferMat.dispose();
    summeMat.dispose();
    viereck.dispose();
  }
  const zeitRechnen = performance.now() - start;
  const kopf = {
    version: 1, breite: bildBreite, hoehe: bildHoehe, rand: RAND, glaette: optionen.glaette ?? 1,
    pruefsumme: etage.lichtSzene.pruefsumme, atlas: etage.lichtSzene.atlas,
    kennung: schattenKennung(werferListe, etage.fenster),
    lichtpunkte: punkte.length, misch: MISCH,
    // Ausschnitt der Seite in Anteilen auf 6 Stellen (nur Lage im Bild, kein Abgleich)
    flaechen: liste.map((e) => ({ nr: e.nr, ab: e.ab.map((x) => Math.round(x * 1e6) / 1e6), x: e.x, y: e.y, w: e.w, h: e.h })),
  };
  const info = {
    flaechen: liste.length, bildBreite, bildHoehe, lichtpunkte: punkte.length, stapel: stapel.length,
    dreiecke, zeitRechnenS: Math.round(zeitRechnen / 100) / 10,
  };
  console.info('Werkstattschatten gebacken:', JSON.stringify(info));
  // ohne Senden (zum Prüfen): Rohdaten mitgeben
  if (optionen.senden === false) return { ...info, kopf, sicht };
  // Senden: 4 Byte Kopflänge, Kopf (JSON), Sichtbarkeit (Uint16, little endian wie die Grafikkarte)
  const kopfBytes = new TextEncoder().encode(JSON.stringify(kopf));
  const laenge = new Uint8Array(4);
  new DataView(laenge.buffer).setUint32(0, kopfBytes.length, true);
  const daten = new Blob([laenge, kopfBytes, new Uint8Array(sicht.buffer)]);
  /** @type {any} */ (window).__werkstattSchattenDaten = daten; // zum erneuten Senden, falls der Empfänger fehlte
  try {
    const antwort = await fetch(`${location.protocol}//${location.hostname}:8765/schatten`, { method: 'POST', body: daten });
    return { ...info, empfaenger: await antwort.text() };
  } catch (fehler) {
    return { ...info, empfaenger: `nicht erreichbar (${fehler}); erneut: fetch(…/schatten, { method: 'POST', body: __werkstattSchattenDaten })` };
  }
}

/**
 * Lädt das gebackene Schattenbild und liefert die Shader-Ergänzung für `wendeLichtgitterAn`. Fehlt die Datei oder passt
 * sie nicht mehr zum Raum (Lichtkarten-Aufteilung, Werfer, Fenster), bleibt das Schattenbild aus (Konsolenhinweis);
 * Formlicht runder Teile und Raumkontrast gelten trotzdem.
 * @param {URL} ordner Ordner `licht/`
 * @param {(THREE.BufferGeometry | null)[]} werferListe aus `sammleSchattenWerfer` (nur für den Abgleich)
 * @param {{ fenster: { achse: string, ebene: number, min: number[], max: number[] }[],
 *   lichtSzene: import('./lichtmodell.js').LichtSzene }} etage
 * @returns {Promise<{ zusatz: import('./lichtgitter.js').LichtZusatz, werte: Record<string, { value: any }>,
 *   info: Record<string, any> }>}
 */
export async function ladeWerkstattSchatten(ordner, werferListe, etage) {
  const start = performance.now();
  const flaechen = etage.lichtSzene.flaechen;
  /** @type {THREE.Texture | null} */
  let bildTex = null;
  /** @type {{ nr: number, ab: number[], x: number, y: number, w: number, h: number }[]} */
  let liste = [];
  let groesse = [1, 1];
  let grund = '';
  try {
    const antwort = await fetch(new URL(`${DATEI}.json`, ordner));
    if (!antwort.ok) grund = 'Datei fehlt';
    else {
      const info = await antwort.json();
      const kennung = schattenKennung(werferListe, etage.fenster);
      if (info.pruefsumme !== etage.lichtSzene.pruefsumme) grund = 'Lichtkarten-Aufteilung geändert';
      else if (!kennungGleich(info.kennung?.fenster, kennung.fenster)) grund = 'Fenster geändert';
      else if (!kennungGleich(info.kennung?.werfer, kennung.werfer)) grund = 'Werfer geändert';
      else if (info.flaechen.some((/** @type {{ nr: number }} */ f) => !flaechen[f.nr])) grund = 'Fläche fehlt';
      else {
        const blob = await (await fetch(new URL(info.datei, ordner))).blob();
        const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        if (bitmap.width !== info.breite || bitmap.height !== info.hoehe) grund = 'Bildgröße passt nicht';
        else {
          bildTex = new THREE.Texture(bitmap);
          bildTex.format = THREE.RedFormat;
          bildTex.type = THREE.UnsignedByteType;
          bildTex.flipY = false; // Bildzeile 0 = Zeile 0 beim Backen
          bildTex.premultiplyAlpha = false;
          bildTex.colorSpace = THREE.NoColorSpace;
          bildTex.generateMipmaps = false;
          bildTex.minFilter = THREE.LinearFilter;
          bildTex.magFilter = THREE.LinearFilter;
          bildTex.needsUpdate = true;
          liste = info.flaechen;
          groesse = [info.breite, info.hoehe];
        }
      }
    }
  } catch (fehler) {
    grund = String(fehler);
  }
  if (grund) {
    console.warn(`Werkstattschatten: ohne Schattenbild (${grund}) – neu backen: holmes_schatten.py empfange, dann await __debug.backeWerkstattSchatten()`);
  }
  const ergebnis = baueZusatz(bildTex, liste, groesse, etage);
  ergebnis.info = { flaechen: liste.length, bildBreite: groesse[0], bildHoehe: groesse[1], zeitMs: Math.round(performance.now() - start), grund };
  console.info('Werkstattschatten:', JSON.stringify(ergebnis.info));
  return ergebnis;
}

/**
 * Zuordnung Lichtkarten-Seite → Ausschnitt im Schattenbild und Shader-Ergänzung.
 * @param {THREE.Texture | null} bildTex Schattenbild (null: überall frei)
 * @param {{ nr: number, ab: number[], x: number, y: number, w: number, h: number }[]} liste
 * @param {number[]} groesse Breite, Höhe des Schattenbilds
 * @param {{ fenster: { achse: string, ebene: number, min: number[], max: number[] }[],
 *   lichtSzene: import('./lichtmodell.js').LichtSzene }} etage
 * @returns {{ zusatz: import('./lichtgitter.js').LichtZusatz, werte: Record<string, { value: any }>, info: Record<string, any> }}
 */
function baueZusatz(bildTex, liste, groesse, etage) {
  const flaechen = etage.lichtSzene.flaechen;
  const [lkBreite, lkHoehe] = etage.lichtSzene.atlas;
  const [bildBreite, bildHoehe] = groesse;
  // Index je Lichtkarten-Bildpunkt (16 Bit in r, g; 0 = keine), Daten je Nummer: Lichtkarten-Rechteck,
  // Ausschnitt der Seite (Anteile), Lage im Schattenbild (0 … 1)
  const index = new Uint8Array(lkBreite * lkHoehe * 2);
  const daten = new Float32Array(3 * 4 * (liste.length + 1));
  liste.forEach((e, i) => {
    const id = i + 1;
    const [sx, sy, sw, sh] = flaechen[e.nr];
    for (let y = Math.max(0, sy - 1); y < Math.min(lkHoehe, sy + sh + 1); y++) {
      for (let x = Math.max(0, sx - 1); x < Math.min(lkBreite, sx + sw + 1); x++) {
        index[2 * (y * lkBreite + x)] = id & 255;
        index[2 * (y * lkBreite + x) + 1] = id >> 8;
      }
    }
    daten.set([sx, sy, sw, sh], 12 * id);
    daten.set(e.ab, 12 * id + 4);
    daten.set([e.x / bildBreite, e.y / bildHoehe, e.w / bildBreite, e.h / bildHoehe], 12 * id + 8);
  });
  const indexTex = new THREE.DataTexture(index, lkBreite, lkHoehe, THREE.RGFormat, THREE.UnsignedByteType);
  const datenTex = new THREE.DataTexture(daten, 3, liste.length + 1, THREE.RGBAFormat, THREE.FloatType);
  for (const t of [indexTex, datenTex]) {
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.unpackAlignment = 1;
    t.needsUpdate = true;
  }
  // Ersatz, wenn kein Schattenbild geladen wurde (1 × 1, frei)
  const weiss = new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType);
  weiss.needsUpdate = true;
  const fenster = etage.fenster
    .map((f) => {
      const a = (f.min[0] + f.max[0]) / 2;
      const y = (f.min[1] + f.max[1]) / 2;
      return f.achse === 'x'
        ? { mitte: new THREE.Vector3(9.0, y, a), richtung: new THREE.Vector3(-1, -0.7, 0).normalize() }
        : { mitte: new THREE.Vector3(a, y, 27.5), richtung: new THREE.Vector3(0, -0.7, -1).normalize() };
    })
    .filter((f) => BEREICH.containsPoint(f.mitte));
  const N = 4; // höchstens 4 Fenster in der Werkstatt
  const werte = {
    // an, auch ohne Schattenbild: dann nur Formlicht runder Teile und Raumkontrast (wsSicht liefert 1)
    wsAn: { value: 1 },
    wsIndex: { value: indexTex },
    wsDaten: { value: datenTex },
    wsBild: { value: bildTex ?? weiss },
    wsLkGroesse: { value: new THREE.Vector2(lkBreite, lkHoehe) },
    wsBildGroesse: { value: new THREE.Vector2(bildBreite, bildHoehe) },
    wsFenster: { value: Array.from({ length: N }, (_, i) => (fenster[i] ? fenster[i].mitte.clone() : new THREE.Vector3(0, -100, 0))) },
    wsRichtung: { value: Array.from({ length: N }, (_, i) => (fenster[i] ? fenster[i].richtung.clone().negate() : new THREE.Vector3(0, 1, 0))) },
    wsAnzahl: { value: Math.min(N, fenster.length) },
    /** Abdunkelung im vollen Schatten (Flächen) */
    wsSchatten: { value: 0.65 },
    /** Formlicht runder Teile: Abdunkelung abgewandt, Aufhellung zugewandt */
    wsForm: { value: new THREE.Vector2(0.75, 0.15) },
    /** Raumkontrast: Hochzahl und Bezugshelligkeit */
    wsKontrast: { value: new THREE.Vector2(0.5, 1.5) },
    /** Schulter für runde Teile (Lichtgitter): Licht L wird zu L / (1 + L / wsGitter); nahe am Fenster brannte Gips aus */
    wsGitter: { value: 1.5 },
  };
  const kopf = `
uniform float wsAn;
uniform highp sampler2D wsIndex;
uniform highp sampler2D wsDaten;
uniform sampler2D wsBild;
uniform vec2 wsLkGroesse;
uniform vec2 wsBildGroesse;
uniform vec3 wsFenster[ ${N} ];
uniform vec3 wsRichtung[ ${N} ];
uniform int wsAnzahl;
uniform float wsSchatten;
uniform vec2 wsForm;
uniform vec2 wsKontrast;
uniform float wsGitter;
// Sichtbarkeit des Fensterlichts aus dem Schattenbild (1 = frei); nur Flächen mit Lichtkarte
float wsSicht( vec2 lkUv ) {
	vec2 p = lkUv * wsLkGroesse;
	vec2 idf = texelFetch( wsIndex, clamp( ivec2( p ), ivec2( 0 ), ivec2( wsLkGroesse ) - 1 ), 0 ).rg * 255.0;
	int id = int( idf.x + 0.5 ) + 256 * int( idf.y + 0.5 );
	if ( id == 0 ) return 1.0;
	vec4 r = texelFetch( wsDaten, ivec2( 0, id ), 0 );
	vec4 a = texelFetch( wsDaten, ivec2( 1, id ), 0 );
	vec4 b = texelFetch( wsDaten, ivec2( 2, id ), 0 );
	vec2 g = ( ( p - r.xy ) / r.zw - a.xy ) / a.zw;
	if ( any( lessThan( g, vec2( 0.0 ) ) ) || any( greaterThan( g, vec2( 1.0 ) ) ) ) return 1.0;
	vec2 halb = 0.5 / wsBildGroesse;
	return textureLod( wsBild, clamp( b.xy + g * b.zw, b.xy + halb, b.xy + b.zw - halb ), 0.0 ).r;
}`;
  const code = `
	if ( wsAn > 0.5 ) {
		// nur in der Werkstatt; Übergang innerhalb der Trennwand zu Raum B (z 19,5 … 19,75)
		float wsMaske = smoothstep( 19.52, 19.73, vLgWelt.z );
		if ( wsMaske > 0.0 ) {
			float wsF;
			float wsL = max( dot( lgE, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-4 );
			if ( lgKarteAn > 0.5 ) {
				// Flächen: Schatten aus dem Schattenbild und Raumkontrast (hell bleibt hell, dunkel wird dunkler)
				// (nur Teile, die die Lichtkarte nicht oder nur grob kennt, werfen: sonst doppelter Schatten)
				wsF = 1.0 - wsSchatten * ( 1.0 - wsSicht( vLkUv ) );
				wsF *= clamp( pow( wsL / wsKontrast.y, wsKontrast.x ), 0.5, 1.5 );
			} else {
				// runde Teile: helle Werte weich begrenzen (am Fenster bis 9× heller als in Raum A, Weiß brannte aus),
				// dann Formlicht je Fenster nach Abstand gewichtet: zugewandt etwas heller, abgewandt deutlich dunkler
				float wsSumme = 0.0;
				float wsFormF = 0.0;
				for ( int i = 0; i < ${N}; i ++ ) {
					if ( i >= wsAnzahl ) break;
					vec3 d = wsFenster[ i ] - vLgWelt;
					float g = 1.0 / ( 1.0 + dot( d, d ) * 0.25 );
					vec3 l = normalize( normalize( d ) + wsRichtung[ i ] );
					float nl = dot( lgNormale, l );
					wsSumme += g;
					wsFormF += g * ( 1.0 + wsForm.x * min( nl, 0.0 ) + wsForm.y * max( nl, 0.0 ) );
				}
				wsF = wsFormF / max( wsSumme, 1e-4 ) / ( 1.0 + wsL / wsGitter );
			}
			lgE *= mix( 1.0, wsF, wsMaske );
		}
	}`;
  return { zusatz: { name: 'werkstattschatten', uniforms: werte, kopf, code }, werte, info: {} };
}
