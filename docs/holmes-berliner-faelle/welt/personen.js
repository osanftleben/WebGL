// Ansprechbare Personen (Fall 1). Alle Personen sind erfunden.
//
// Schutzmann Kranich (~28, gedienter Unteroffizier) – belegt (Quellen-Notiz, Block „Uniform und Ausrüstung
// der Berliner Schutzmannschaft um 1890“): Lederhelm mit Spitze und Messing-/Neusilberbeschlägen (DHM);
// Tuchhose und kurze Stiefel, Säbelkoppel, Säbel mit Portepee, Wildlederhandschuhe (Verwaltungsberichte
// 1882/1892); zweireihiger Rock mit hellen Knöpfen, bis Mitte Oberschenkel, Stehkragen und Ärmelaufschlag mit
// hellem Rand, Achselklappe mit Nummer (Baedeker 1891, Gartenlaube 1891), weiße Handschuhe, Koppel unter dem
// Rock, Säbel links mit dunkler Scheide und hellem Ortband, Hand auf dem Säbelgriff (Bilder 1891/1899);
// Farben nach der Figur der Polizeihistorischen Sammlung (Sicherheit mittel). Kräftige Statur, Schnurrbart.
// Annahmen: genaue Knopfzahl (6 je Reihe), Farbe von Rand, Aufschlagstreifen und Troddel, Stiefelform.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { weicherFleck } from './fleck.js';
import { kopf, hals, arm, oberkoerper, rumpfPunkt, stoffTeil, aufnaht, sparsam, vollStufe, istSparsam } from './menschen.js';
import { alsStufe, baueStufen } from './stufen.js';
import { STUFEN_ABSTAND } from './bauteile.js';
import { gesichtsTafel, GESICHT } from './texturen.js';
import { baueHelm } from './helm.js';
import { stoffStruktur } from './stoffstruktur.js';

/**
 * Rock des Schutzmanns (Profil: y, halbe Breite, halbe Tiefe, Versatz z, Rundlichkeit): Schoß rundum
 * geschlossen, gerade und schmal bis knapp unter den Schritt (0,70 m), leicht tailliert, kräftiger Rumpf mit
 * vorgewölbter Brust, breite gerade Schultern (Runde 4 nach der PHS-Figur 1898), Stehkragen ab 1,61 m
 */
// Runde 5: kaum tailliert, fällt fast kastig von den Achseln (PHS-Figur 1898)
// Saum vorn tiefer: der vorgestellte linke Oberschenkel drückte durch den Rock (Saum wirkte schräg)
const ROCK = [[0.7, 0.192, 0.16, -0.004, 2.3], [0.8, 0.19, 0.148, -0.002, 2.3], [0.92, 0.189, 0.135, 0, 2.25],
  [1.03, 0.188, 0.131, 0.008, 2.2], [1.13, 0.191, 0.135, 0.014, 2.25], [1.26, 0.2, 0.14, 0.018, 2.35],
  [1.37, 0.206, 0.136, 0.018, 2.4], [1.45, 0.216, 0.124, 0.012, 2.3], [1.5, 0.218, 0.114, 0.007, 2.2],
  // Runde 6 (Nutzer: Schultern gerade): Schulterlinie fällt vom Kragen zur Kante nur etwa 5 cm (PHS-Figur 1898)
  [1.54, 0.215, 0.106, 0.004, 2.15], [1.565, 0.2, 0.1, 0.002, 2.1], [1.585, 0.168, 0.092, 0, 2.0],
  [1.6, 0.12, 0.08, -0.002, 2.0], [1.612, 0.068, 0.066, -0.005, 2.0]];

/**
 * Farben (sRGB) auf dem Vertex-Farben-Material: Rock mittleres Blau, gedämpft (Figur 1898; Nutzer Runde 1),
 * Hose dunkelblau; Handschuhe gebrochenes Weiß (Wildleder), Achselklappe etwas dunkler als der Rock
 */
const FARBE = { rock: 0x2b3b5e, hose: 0x1b1f2d, rand: 0xcdcbc2, handschuh: 0xd4cfc1, troddel: 0xc6c3b8, klappe: 0x243250 };
/** Kopf etwas größer als der gemeinsame Kopf (Nutzer Runde 1); der Helm wächst mit */
const KOPF = 1.08;
/**
 * Säbel (Runde 2): Mundblech/Stichblatt an der linken Hüfte am Rand des Rocks; der Griff zeigt nach vorn
 * oben (Richtung GRIFF), die Scheide läuft unter dem Schoß schräg nach hinten unten (Richtung SCHEIDE)
 */
const MUND = [0.215, 0.86, 0.04];
const GRIFF = [0, 0.64, 0.77];
const SCHEIDE = [0.17, -0.9, -0.4];
/** sanfter Übergang 0 → 1 zwischen a und b */
const glatt = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Stückweise lineare Kurve [[x, y], …] (x aufsteigend) */
function kurve(/** @type {number[][]} */ punkte, /** @type {number} */ x) {
  if (x <= punkte[0][0]) return punkte[0][1];
  for (let i = 1; i < punkte.length; i++) {
    if (x <= punkte[i][0]) {
      const [x0, y0] = punkte[i - 1];
      const [x1, y1] = punkte[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return punkte[punkte.length - 1][1];
}

/**
 * Hosenbein als geschlossene Röhre entlang Hüfte → Knie → Knöchel, Radius je Länge (t 0…1),
 * vorn am Knie leicht ausgebeult. Ohne doppelte Naht (keine Kante in den Normalen).
 * Falten (Runde 3, Gestaltung): Querfalten in der Kniekehle, Zugfalten vorn am Oberschenkel, Stauchung über
 * dem Stiefel (schräge Ringe), Innenseite etwas dunkler; Faltentäler dunkler (Vertex-Farbe). Nur mit
 * genügend Teilungen sinnvoll (sparsame Stufe: ohne Falten).
 * @param {number[][]} punkte @param {number[][]} radien [[t, r], …] @param {number} nr rundum @param {number} nl längs
 * @param {{ knie?: number, stauch?: number, seite?: number }} [falten] Stärke 0…1; seite = Lage des Beins (±1)
 */
function hosenbein(punkte, radien, nr, nl, { knie: kf = 0, stauch = 0, seite = 0 } = {}) {
  const weg = new THREE.CatmullRomCurve3(punkte.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Vector3();
  const tg = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const pos = [];
  const hell = [];
  const T = 2 * Math.PI;
  for (let j = 0; j <= nl; j++) {
    const t = j / nl;
    weg.getPointAt(t, m);
    weg.getTangentAt(t, tg);
    a.set(1, 0, 0).addScaledVector(tg, -tg.x).normalize();
    b.crossVectors(tg, a); // nach vorn (+z)
    const r = kurve(radien, t);
    const knie = Math.exp(-(((t - 0.5) / 0.09) ** 2));
    for (let i = 0; i < nr; i++) {
      const w = (2 * Math.PI * i) / nr;
      const c = Math.cos(w);
      const s = Math.sin(w);
      let rr = r * (s > 0 ? 1.04 : 1) + 0.008 * (0.7 + 0.6 * kf) * knie * Math.max(0, s) ** 2;
      let h = 1;
      // Kniekehle: Querfalten hinten
      const kk = kf * Math.max(0, -s) ** 1.5 * Math.exp(-(((t - 0.52) / 0.06) ** 2));
      const wk = Math.sin((T * (t - 0.52)) / 0.034 + 0.8 * c);
      rr += 0.006 * kk * wk;
      h -= 0.4 * kk * Math.max(0, -wk);
      // Zugfalten vorn am Oberschenkel (vom gebeugten Knie zur Hüfte, schräg)
      const zf = kf * Math.max(0, s) ** 2 * glatt(0.26, 0.32, t) * (1 - glatt(0.4, 0.46, t));
      const wz = Math.sin((T * (t - 0.3)) / 0.05 + 1.6 * c * seite);
      rr += 0.004 * zf * wz;
      h -= 0.25 * zf * Math.max(0, -wz);
      // Stauchung über dem Stiefel: schräge Ringe
      const st = stauch * glatt(0.8, 0.87, t);
      const ws = Math.sin((T * (t - 0.8)) / 0.055 + 1.4 * c);
      rr += 0.0065 * st * ws;
      h -= 0.38 * st * Math.max(0, -ws);
      // Innenseite (zum anderen Bein) etwas dunkler
      if (seite) h *= 1 - 0.2 * Math.max(0, -c * seite) ** 2;
      pos.push(m.x + rr * (c * a.x + s * b.x), m.y + rr * (c * a.y + s * b.y), m.z + rr * (c * a.z + s * b.z));
      hell.push(h, 0);
    }
  }
  const idx = [];
  for (let j = 0; j < nl; j++) {
    for (let i = 0; i < nr; i++) {
      const p = j * nr + i;
      const q = j * nr + ((i + 1) % nr);
      idx.push(p, q, p + nr, q, q + nr, p + nr);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // leere UVs wie die Grundkörper von three.js (zum Verschmelzen nötig)
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.userData.farbe = new Float32Array(hell);
  return geo;
}

/**
 * Handschuh (Wildleder): Handfläche, vier Finger aus je zwei Gliedern, abgesetzter Daumen, Handgelenk.
 * Lage wie die Hand aus menschen.js: Handgelenk im Ursprung, Finger nach −y, Daumen nach +z,
 * Handfläche zur Körpermitte (seite +1: nach −x). In beiden Stufen gleich fein (helle Fläche, Fleckprüfung).
 * @param {number} seite +1 oder −1 @param {number} krumm Beugung der Finger zur Handfläche (Bogenmaß)
 */
function handschuh(seite, krumm) {
  const teile = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const unten = new THREE.Vector3(0, -1, 0);
  /** Ellipsoid (Halbachsen gr) bei lage, lange Achse (y) entlang richtung */
  const kugel = (/** @type {number[]} */ gr, /** @type {THREE.Vector3} */ lage, /** @type {THREE.Vector3} */ richtung = unten) => {
    const geo = new THREE.SphereGeometry(1, 10, 7);
    q.setFromUnitVectors(unten, richtung.clone().normalize());
    m.compose(lage, q, new THREE.Vector3(...gr));
    geo.applyMatrix4(m);
    teile.push(geo);
  };
  // Handgelenk (Stulpe) und Handfläche
  kugel([0.021, 0.024, 0.027], new THREE.Vector3(0, -0.006, 0));
  kugel([0.0165, 0.042, 0.04], new THREE.Vector3(0, -0.044, 0));
  // Finger: Zeigefinger (+z, beim Daumen) … kleiner Finger; zwei Glieder, zur Handfläche gebeugt
  const FINGER = [[0.018, -0.077, 0.025, 0.021, 0.0079], [0.006, -0.08, 0.027, 0.023, 0.0082],
    [-0.006, -0.078, 0.025, 0.021, 0.0079], [-0.017, -0.073, 0.02, 0.017, 0.007]];
  for (const [z, y, l1, l2, r] of FINGER) {
    const a1 = krumm * 0.5;
    const a2 = krumm * 1.25;
    const d1 = new THREE.Vector3(-seite * Math.sin(a1), -Math.cos(a1), 0);
    const d2 = new THREE.Vector3(-seite * Math.sin(a2), -Math.cos(a2), 0);
    const p0 = new THREE.Vector3(0, y, z);
    kugel([r, l1 / 2 + r * 0.5, r], p0.clone().addScaledVector(d1, l1 / 2), d1);
    const p1 = p0.clone().addScaledVector(d1, l1);
    kugel([r * 0.95, l2 / 2 + r * 0.5, r * 0.95], p1.addScaledVector(d2, l2 / 2), d2);
  }
  // Daumen: vom Ballen schräg nach vorn unten zur Handfläche
  const t1 = new THREE.Vector3(-seite * 0.25, -0.7, 0.55).normalize();
  const t2 = new THREE.Vector3(-seite * 0.5, -0.8, 0.2).normalize();
  const b = new THREE.Vector3(-seite * 0.006, -0.028, 0.03);
  kugel([0.0098, 0.017, 0.0098], b.clone().addScaledVector(t1, 0.013), t1);
  kugel([0.009, 0.015, 0.009], b.addScaledVector(t1, 0.026).addScaledVector(t2, 0.011), t2);
  const geo = /** @type {THREE.BufferGeometry} */ (mergeGeometries(teile));
  for (const t of teile) t.dispose();
  return geo;
}

/**
 * Hilfsfunktion: Zylinder von a nach b (Radius oben bei b).
 * @param {THREE.Vector3} a @param {THREE.Vector3} b @param {number} ra @param {number} rb
 * @param {number} seg @param {THREE.Material} mat
 */
function stab(a, b, ra, rb, seg, mat) {
  const l = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, l, seg), mat);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/**
 * Hilfsfunktion: Mesh mit Lage.
 * @param {THREE.BufferGeometry} geo @param {THREE.Material} mat
 * @param {number} x @param {number} y @param {number} z
 */
function teil(geo, mat, x, y, z) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * Kopie einer Geometrie mit einheitlicher Vertex-Farbe (für Teile mit eigener Geometrie, z. B. Handschuhe).
 * @param {THREE.BufferGeometry} geo @param {number} hex sRGB
 */
function einfarbig(geo, hex) {
  const g = geo.clone();
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const f = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) f.set([c.r, c.g, c.b], 3 * i);
  g.setAttribute('color', new THREE.BufferAttribute(f, 3));
  return g;
}

/**
 * Winkel um den Rumpf (vorn 0), unter dem der Rumpf in Höhe y die Seitenlage x erreicht.
 * @param {number[][]} profil @param {number} y @param {number} x
 */
function winkelFuerX(profil, y, x) {
  let lo = 0;
  let hi = Math.PI / 2;
  for (let k = 0; k < 30; k++) {
    const m = (lo + hi) / 2;
    if (rumpfPunkt(profil, m, y)[0] < Math.abs(x)) lo = m;
    else hi = m;
  }
  return Math.sign(x) * lo;
}

/**
 * Baut Schutzmann Kranich (etwa 1,78 m, Blick nach +z). Eigene Materialien,
 * damit die Hervorhebung beim Anvisieren nur ihn betrifft.
 * @returns {THREE.Group} Gruppe mit `userData.person = 'kranich'` und unsichtbarem Trefferkörper
 */
export function baueSchutzmann() {
  // Ein Vertex-Farben-Material für alles Tuch (Rock, Hose, Ränder, Handschuhe): ein Draw-Call je Stufe
  const tuch = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
  // `farbig` liest den Materialsatz der Stufe, die gerade gebaut wird (siehe unten, `m`)
  const stoff = (/** @type {number} */ farbe) => ({ get farbig() { return m.tuch; }, farbe });
  const rock = stoff(FARBE.rock);
  const hose = stoff(FARBE.hose);
  const rand = stoff(FARBE.rand);
  // Stiefel, Säbelscheide, Griff: schwarz und blank poliert (Annahme; belegt sind nur „kurze Stiefel“)
  const leder = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.22, metalness: 0, envMapIntensity: 1.1 });
  // Lebendige Haut mit gemaltem Gesicht (eigene Zelle der Gesichtstafel)
  const haut = new THREE.MeshLambertMaterial({ color: 0xffffff, map: gesichtsTafel() });
  const zelle = GESICHT.kranich;
  const haar = new THREE.MeshLambertMaterial({ color: 0x4a3524 });
  // Silberne Knöpfe, Nummer, Säbelbeschläge
  const stahl = new THREE.MeshStandardMaterial({ color: 0xb4b9be, roughness: 0.15, metalness: 1, envMapIntensity: 1.5 });
  // Helmbeschläge Neusilber (Berliner Helm 1898): kühler und blanker als der Stahl, damit sie im warmen
  // Raum silbern statt cremefarben wirken (scharfe Spiegelung mit hellen und dunklen Stellen)
  const silber = new THREE.MeshStandardMaterial({ color: 0xc9d0d8, roughness: 0.08, metalness: 1, envMapIntensity: 1.25 });
  // Rockknöpfe (Runde 5, PHS-Figur 1898): kleiner und matt silbergrau statt hell weiß
  const knopfMat = new THREE.MeshStandardMaterial({ color: 0x8f969e, roughness: 0.42, metalness: 1, envMapIntensity: 0.9 });
  // Materialsätze je Stufe (Nutzer: zusätzliche Effekte nur in der höchsten Stufe). Voll: Tuch mit
  // Stoffstruktur (welt/stoffstruktur.js), Leder und Metall mit eigener Spiegelung aus Raum B (main.js,
  // `eigeneSpiegelung`). Sparsam: dieselben Grundwerte ohne Zusätze (Fleckprüfung).
  const spiegelnd = (/** @type {THREE.MeshStandardMaterial} */ mat) => {
    const c = mat.clone();
    c.userData.eigeneSpiegelung = true;
    return c;
  };
  const matVoll = { tuch: stoffStruktur(tuch.clone()), leder: spiegelnd(leder), stahl: spiegelnd(stahl), knopf: spiegelnd(knopfMat) };
  const matSpar = { tuch, leder, stahl, knopf: knopfMat };
  let m = matVoll;

  // Körper je Detailstufe (welt/stufen.js): voll und sparsam aus demselben Bauplan
  const baueKoerper = () => {
    // Materialsatz für diesen Bau festlegen (auch für Teile, die per `vollStufe` gebaut werden)
    m = istSparsam() ? matSpar : matVoll;
    // Teilungen runder Teile: voll / sparsam
    const n = (/** @type {number} */ voll, /** @type {number} */ spar) => (istSparsam() ? spar : voll);
    const koerper = new THREE.Group();
    const knopfGeo = new THREE.SphereGeometry(1, n(8, 5), n(6, 4));

    // Beine: lockere Stellung (Stich 1891: Gewicht auf einem Bein). Rechtes Bein (−x) trägt und steht gerade,
    // linkes ist entlastet: Knie leicht gebeugt, Fuß etwas vor und nach außen gedreht. Hose mit angedeutetem
    // Knie, zum Knöchel schmaler, unten wieder etwas weiter (fällt auf den Stiefel).
    // Runde 4 (PHS-Figur 1898): weit und gerade, unten über dem Stiefel gestaucht
    const hosenRadien = [[0, 0.08], [0.25, 0.074], [0.5, 0.068], [0.66, 0.067], [0.88, 0.065], [1, 0.07]];
    // Runde 2: Spielbein deutlicher (Knie weiter vor, Fuß weiter vor und außen), Hose endet höher über dem
    // Stiefelschaft (kurze Stiefel, Hose darüber; ein Stück Schaft bleibt sichtbar)
    // Runde 3: Standbein (rechts) steht schräg unter dem Körper, Hüfte der Spielbeinseite tiefer, Spielbein
    // weiter vor und außen mit stärker gebeugtem Knie; Hose mit Falten (Kniekehle, Stauchung)
    const beine = [
      { s: -1, huefte: [-0.095, 0.905, 0], knie: [-0.088, 0.5, 0.0], fuss: [-0.074, 0, -0.01], dreh: -0.1, knieF: 0.35, stauch: 1 },
      { s: 1, huefte: [0.1, 0.886, 0], knie: [0.125, 0.49, 0.085], fuss: [0.185, 0, 0.11], dreh: 0.6, knieF: 1, stauch: 0.8 },
    ];
    for (const b of beine) {
      const knoechel = [b.fuss[0], 0.075, b.fuss[2]];
      const falten = istSparsam() ? undefined : { knie: b.knieF, stauch: b.stauch, seite: b.s };
      koerper.add(stoffTeil(hosenbein([b.huefte, b.knie, knoechel], hosenRadien, n(16, 8), n(44, 7), falten), hose));
      // Stiefel: Vorfuß flach und lang, Ferse/Knöchel höher (untere Hälften im Boden: flache Sohle), Schaft
      const stiefel = new THREE.Group();
      const vorfuss = teil(new THREE.SphereGeometry(1, n(12, 8), n(8, 6)), m.leder, 0, 0.012, 0.06);
      vorfuss.scale.set(0.05, 0.056, 0.125);
      const ferse = teil(new THREE.SphereGeometry(1, n(12, 8), n(8, 6)), m.leder, 0, 0.03, -0.012);
      ferse.scale.set(0.054, 0.09, 0.072);
      const schaft = teil(new THREE.CylinderGeometry(0.049, 0.054, 0.13, n(12, 8)), m.leder, 0, 0.085, -0.006);
      stiefel.add(vorfuss, ferse, schaft);
      stiefel.position.set(...b.fuss);
      stiefel.rotation.y = b.dreh;
      koerper.add(stiefel);
    }

    // Rock (Koppel unsichtbar darunter); leichte Falten im Schoß an Seiten und Rücken (Gestaltung)
    // Runde 2: Schulterblätter und Rückenrinne angedeutet, Saum hinten tiefer und leicht gewellt
    koerper.add(oberkoerper({ profil: ROCK, rock, falten: { oben: 0.97, tiefe: 0.004, vorn: 0.9, dunkel: 0.12,
      ruecken: 0.007, saum: { hinten: 0.025, welle: 0.006 } } }));
    // Taillennaht: schmale dunklere Linie rundum (36 Teile: auch sparsam ohne Einsinken)
    koerper.add(aufnaht(ROCK, 0.982, 0.992, () => [-Math.PI, Math.PI], rock, { aus: 0.0018, ns: 36, farbFn: () => [0.9, 0] }));
    // Kante des zweireihigen Rocks: die linke Vorderseite liegt über der rechten, Kante außerhalb der rechten
    // Knopfreihe, läuft mit den Reihen auseinander und oben zum Kragen (dunkle Linie mit leichter Stufe)
    const kanteX = (/** @type {number} */ y) => -kurve([[1.08, 0.075], [1.42, 0.162], [1.5, 0.15], [1.565, 0.104], [1.6, 0.048]], y);
    koerper.add(aufnaht(ROCK, 0.665, 1.6, (y) => {
      const th = vollStufe(() => winkelFuerX(ROCK, y, kanteX(y)));
      return [th, th + 0.075];
    }, rock, { aus: 0.0025, ns: 3, farbFn: (s) => [0.5 + 0.5 * Math.min(1, s * 1.6), 0] }));
    // Zwei Knopfreihen zu je 6, nach oben auseinanderlaufend (Gartenlaube 1891, Figur 1898)
    for (let i = 0; i < 6; i++) {
      const y = 1.08 + i * 0.068;
      // Runde 4 (PHS-Figur 1898): oben fast schulterbreit, zur Taille stark zusammenlaufend
      const dx = 0.045 + 0.088 * (i / 5) ** 1.15;
      for (const s of [-1, 1]) {
        const th = winkelFuerX(ROCK, y, s * dx);
        const k = teil(knopfGeo, m.knopf, ...rumpfPunkt(ROCK, th, y, 0.0025));
        k.scale.set(0.0088, 0.0088, 0.0052);
        k.rotation.y = th;
        koerper.add(k);
      }
    }
    // Stehkragen mit hellem Rand oben
    // Runde 5: höher (PHS-Figur 1898), 1,605 … 1,665 m
    koerper.add(stoffTeil(new THREE.CylinderGeometry(0.066, 0.07, 0.06, n(16, 10)), rock).translateY(1.635).translateZ(-0.009));
    koerper.add(stoffTeil(new THREE.CylinderGeometry(0.0675, 0.0675, 0.008, n(16, 10), 1, true), rand).translateY(1.662).translateZ(-0.009));
    // Runde 4: helle Litzen vorn am Kragen, je Seite zwei waagerechte Streifen (PHS-Figur 1898; Sicherheit
    // niedrig–mittel); in beiden Stufen gleich (hell auf Blau)
    for (const sx of [-1, 1]) {
      for (const ly of [1.626, 1.645]) {
        const th = sx * 0.42;
        const litze = stoffTeil(new THREE.BoxGeometry(0.03, 0.0065, 0.003), rand);
        litze.position.set(Math.sin(th) * 0.0705, ly, Math.cos(th) * 0.0705 - 0.009);
        litze.rotation.y = th;
        koerper.add(litze);
      }
    }
    // Achselklappen (Runde 2): flach aufliegender Stoffstreifen über der Schulter vom Ärmelansatz zum Kragen
    // (liegt wie die Rockkante auf der Rumpffläche, auch in der sparsamen Stufe), etwas dunkler als der Rock,
    // etwa 4,5 cm breit, zum Kragen hin abgerundet; darauf hell aufgenäht die Nummer
    const tiefeBei = (/** @type {number} */ y) => kurve(ROCK.map((p) => [p[0], p[2]]), y);
    for (const s of [-1, 1]) {
      const th0 = (s * Math.PI) / 2;
      koerper.add(aufnaht(ROCK, 1.535, 1.604, (y) => {
        const w = (0.0225 / tiefeBei(y)) * (1 - 0.4 * glatt(1.59, 1.604, y));
        return [th0 - w, th0 + w];
      }, stoff(FARBE.klappe), { aus: 0.0028, ns: 5 }));
      // Nummer in beiden Stufen gleich (auf der glatten Fläche): hell auf dunkel, sonst sprang sie an der
      // Schulterkante beim Umschalten (Fleckprüfung von schräg hinten)
      koerper.add(vollStufe(() => aufnaht(ROCK, 1.562, 1.582, (y) => {
        const w = 0.0075 / tiefeBei(y);
        return [th0 - w, th0 + w];
      }, rand, { aus: 0.0042, ns: 2 })));
    }

    // Arme: rechter hängt locker mit leichtem Ellbogenknick, linke Hand liegt auf dem Säbelgriff
    // (Foto 1899): Handfläche flach von oben, Finger nach vorn über Griff und Bügel gekrümmt, Daumen innen.
    // Weiße Handschuhe. Linker Ellbogen weit außen: der Arm bleibt auch von hinten sichtbar (Runde 2).
    const radien = [0.055, 0.052, 0.049]; // Runde 4: weite Tuchärmel (PHS-Figur 1898)
    const mund = new THREE.Vector3(...MUND);
    const griff = new THREE.Vector3(...GRIFF).normalize();
    const griffMitte = mund.clone().addScaledVector(griff, 0.06);
    // linke Hand: Fingerrichtung F (am Griff entlang nach vorn, etwas nach außen), Handfläche P (nach unten)
    const F = new THREE.Vector3(0.3, 0.15, 0.94).normalize();
    const P = new THREE.Vector3(0, -1, 0).addScaledVector(F, F.y).normalize();
    // Mitte der Handfläche 2,8 cm über der Griffmitte, Handgelenk 4,6 cm dahinter
    const gelenk = griffMitte.clone().addScaledVector(P, -0.028).addScaledVector(F, -0.046);
    const X = P.clone().negate();
    const Y = F.clone().negate();
    const lage = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, X.clone().cross(Y)));
    // Runde 3: rechte Hand vor der Brust in die Rockkante eingehakt (Gartenlaube 1891, Künstlerpose):
    // Handfläche auf der Brust, Finger nach innen unter die übergreifende linke Vorderseite gekrümmt,
    // Daumen oben draußen; Ellbogen seitlich nach außen
    const F2 = new THREE.Vector3(0.97, -0.12, 0.08).normalize();
    const P2 = new THREE.Vector3(0.423, 0, -0.906);
    P2.addScaledVector(F2, -P2.dot(F2)).normalize();
    const gelenk2 = new THREE.Vector3(-0.149, 1.26, 0.148);
    const Y2 = F2.clone().negate();
    const lage2 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(P2, Y2, P2.clone().cross(Y2)));
    const arme = [
      { s: -1, schulter: [-0.178, 1.53, 0], ellbogen: [-0.355, 1.31, -0.04], handgelenk: gelenk2.toArray(), krumm: 0.7, lage: lage2 },
      { s: 1, schulter: [0.178, 1.53, 0], ellbogen: [0.258, 1.245, -0.07], handgelenk: gelenk.toArray(), krumm: 1.05, lage },
    ];
    for (const a of arme) {
      // Runde 3: Arme in beiden Stufen gleich fein – der stark angewinkelte rechte Ellbogen steht frei im Umriss
      // (gröberer Ärmel ergab Flecken vor dem Hintergrund, Fleckprüfung)
      const { gruppe, hand } = vollStufe(() => arm({ stoff: rock, haut, zelle, seite: a.s, radien, ...a }));
      // Schulterkugel flach statt rund: deckt das obere Ende des Ärmels und geht weich in die (breitere)
      // Schulter über, wölbt sich aber nicht über die Schulterlinie (keine Polster, vor allem von hinten)
      const kugel = gruppe.children[1];
      kugel.scale.set(0.058, 0.03, 0.06); // Runde 5: flacher, kein Absatz an der Schulter
      kugel.position.set(...a.schulter).add(new THREE.Vector3(-a.s * 0.004, -0.004, 0));
      // Handschuh: eigene Form mit Fingern und Daumen
      hand.geometry = einfarbig(handschuh(a.s, a.krumm), FARBE.handschuh);
      hand.material = m.tuch;
      if (a.lage) {
        hand.quaternion.copy(a.lage);
        hand.position.set(...a.handgelenk);
      }
      koerper.add(gruppe);
      // Ärmelaufschlag (etwas weiter als der Ärmel) mit hellem Streifen am oberen Rand; in beiden Stufen gleich
      // fein (Runde 3: der angewinkelte rechte Arm zeigt den hellen Streifen im Umriss, Fleckprüfung)
      const p1 = new THREE.Vector3(...a.ellbogen);
      const p2 = new THREE.Vector3(...a.handgelenk);
      const richtung = p2.clone().sub(p1).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), richtung);
      const auf = stoffTeil(new THREE.CylinderGeometry(radien[2] * 1.16, radien[2] * 1.14, 0.075, 12), rock);
      auf.position.copy(p2).addScaledVector(richtung, -0.04);
      auf.quaternion.copy(q);
      koerper.add(auf);
      const streifen = stoffTeil(new THREE.CylinderGeometry(radien[2] * 1.2, radien[2] * 1.2, 0.012, 12, 1, true), rand);
      streifen.position.copy(p2).addScaledVector(richtung, -0.074);
      streifen.quaternion.copy(q);
      koerper.add(streifen);
      // Runde 4: zweiter Streifen darunter – breites helles Band wie an der PHS-Figur 1898
      const streifen2 = streifen.clone();
      streifen2.position.copy(p2).addScaledVector(richtung, -0.056);
      koerper.add(streifen2);
      // Runde 3: senkrechte Ärmelpatte mit 2 kleinen Knöpfen über dem Aufschlag (Gruppenfoto 1899,
      // Gartenlaube 1891), auf der Außenseite des Unterarms (Seite des Handrückens); in beiden Stufen gleich
      const ruecken = new THREE.Vector3(a.s, 0, 0).applyQuaternion(a.lage ?? new THREE.Quaternion());
      const aussen = ruecken.addScaledVector(richtung, -ruecken.dot(richtung)).normalize();
      const zurueck = richtung.clone().negate();
      const quer = zurueck.clone().cross(aussen);
      const pLage = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(quer, zurueck, aussen));
      const pMitte = p2.clone().addScaledVector(richtung, -0.112).addScaledVector(aussen, radien[2] * 1.12 + 0.002);
      const patte = stoffTeil(new THREE.BoxGeometry(0.02, 0.07, 0.004), stoff(FARBE.klappe));
      patte.position.copy(pMitte);
      patte.quaternion.copy(pLage);
      koerper.add(patte);
      for (const d of [-0.017, 0.017]) {
        const kn = teil(new THREE.SphereGeometry(1, 8, 6), m.knopf, ...pMitte.clone().addScaledVector(richtung, d).addScaledVector(aussen, 0.003).toArray());
        kn.scale.set(0.0058, 0.0058, 0.0035);
        kn.quaternion.copy(pLage);
        koerper.add(kn);
      }
    }

    // Kopf mit Schnurrbart (Haar kurz unter dem Helm), etwas größer; Kinn bleibt über dem Kragen
    const h = hals(haut, zelle);
    h.position.set(0, 1.665, -0.012);
    koerper.add(h);
    // weich: runde Wangen (Kieferwinkel und Ohransatz flacher, Runde 2), Gesicht unverändert
    const kopfArt = () => kopf({ haut, zelle, variante: 1, haar, haarStil: 'kurz', bart: 'schnurr', merkmale: { weich: 1 } });
    const k = kopfArt();
    k.position.y = 1.756;
    k.scale.setScalar(KOPF);
    koerper.add(k);
    // Helm mit Spitze: Maße werden am Kopf gemessen (welt/helm.js), sitzt tief über Brauen und Hinterkopf.
    // Gemessen wird immer am vollen Kopf, damit der Helm in beiden Stufen gleich groß ist.
    const kMess = istSparsam() ? vollStufe(kopfArt) : k;
    kMess.position.copy(k.position);
    // Helmglocke aus Leder (Baedeker 1891, DHM), schwarz lackiert und blank (Nutzer: „glänzen und
    // Spiegelungen“): Klarlack-Schicht über dunklem Grund spiegelt Fenster und Raum scharf. Nur in der
    // vollen Stufe (Nutzer: zusätzliche Effekte nur in der höchsten Stufe); die sparsame nimmt das
    // einfache Materialien (ohne Lackschicht, Spiegelung aus Raum A wie alles andere) mit derselben
    // Grundfarbe, damit der Stufenwechsel nicht auffällt (Fleckprüfung). `eigeneSpiegelung`: main.js gibt
    // diesen Materialien die Aufnahme aus Raum B (licht.js, erzeugeUmgebung)
    /** @type {THREE.MeshStandardMaterial} */
    let helmLeder = new THREE.MeshStandardMaterial({ color: 0x040405, roughness: 0.2, metalness: 0, envMapIntensity: 1.4 });
    let helmSilber = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.04, metalness: 1, envMapIntensity: 1 });
    if (!istSparsam()) {
      helmLeder = new THREE.MeshPhysicalMaterial({
        color: 0x040405, roughness: 0.9, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.2, // 1,4: Fleck hinten
      });
      // dunkler als das gemeinsame Silber: spiegelt sonst nur helle Wände und wirkt wie weißes Porzellan
      helmSilber = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.04, metalness: 1, envMapIntensity: 1 });
      helmLeder.userData.eigeneSpiegelung = true;
      helmSilber.userData.eigeneSpiegelung = true;
    }
    const helm = baueHelm(kMess, helmLeder, helmSilber, haar);
    helm.position.copy(k.position);
    helm.scale.setScalar(KOPF);
    koerper.add(helm);

    // Säbel links (+x, Runde 2): Stichblatt an der Hüfte am Rand des Rocks, Griff nach vorn oben unter der
    // linken Hand, Knauf, Bügel auf der Unterseite; die dunkle Scheide läuft unter dem Schoß schräg nach
    // hinten unten (leicht gekrümmt), helles Mundblech und Ortband; Troddel (Portepee) hängt vom Bügel herab.
    const saebel = new THREE.Group();
    const knauf = mund.clone().addScaledVector(griff, 0.125);
    saebel.add(stab(mund.clone().addScaledVector(griff, 0.008), knauf, 0.0155, 0.0135, n(8, 6), m.leder));
    const kp = teil(new THREE.SphereGeometry(1, n(8, 6), n(6, 4)), m.stahl, ...knauf.toArray());
    kp.scale.set(0.016, 0.019, 0.016);
    kp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), griff);
    saebel.add(kp);
    // Stichblatt: flache Platte quer zum Griff, nach unten-vorn (Seite des Bügels) länger
    const unterseite = new THREE.Vector3(0, -griff.z, griff.y);
    const blatt = teil(new THREE.SphereGeometry(1, n(10, 6), n(6, 4)), m.stahl, ...mund.clone().addScaledVector(unterseite, 0.012).toArray());
    blatt.scale.set(0.02, 0.005, 0.033);
    blatt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), griff);
    saebel.add(blatt);
    // Bügel vom Stichblatt im Bogen unter dem Griff zum Knauf (beide Stufen gleich: dünn und hell)
    const buegelWeg = new THREE.QuadraticBezierCurve3(mund.clone().addScaledVector(unterseite, 0.04),
      mund.clone().addScaledVector(griff, 0.07).addScaledVector(unterseite, 0.058), knauf.clone().addScaledVector(unterseite, 0.008));
    saebel.add(new THREE.Mesh(new THREE.TubeGeometry(buegelWeg, 10, 0.0042, 5), m.stahl));
    // Scheide: leicht gekrümmt, Rücken nach hinten
    const ab = new THREE.Vector3(...SCHEIDE).normalize();
    const L = 0.84;
    const weg = new THREE.QuadraticBezierCurve3(mund.clone().addScaledVector(ab, 0.004),
      mund.clone().addScaledVector(ab, L / 2).add(new THREE.Vector3(0, -0.01, 0.022)), mund.clone().addScaledVector(ab, L));
    const RS = 0.0165;
    saebel.add(new THREE.Mesh(new THREE.TubeGeometry(weg, n(12, 8), RS, n(8, 6)), m.leder));
    /** Blechhülse auf der Scheide zwischen t0 und t1 */
    const huelse = (/** @type {number} */ t0, /** @type {number} */ t1) => {
      const w = new THREE.CurvePath();
      w.add(new THREE.LineCurve3(weg.getPoint(t0), weg.getPoint(t1)));
      return new THREE.Mesh(new THREE.TubeGeometry(/** @type {any} */ (w), 1, RS + 0.0016, n(8, 6)), m.stahl);
    };
    saebel.add(huelse(0, 0.05), huelse(0.9, 1));
    const spitze = teil(new THREE.SphereGeometry(1, n(8, 6), n(5, 4)), m.stahl, ...weg.getPoint(1).toArray());
    spitze.scale.setScalar(RS + 0.0016);
    saebel.add(spitze);
    // Troddel (Portepee): Riemen vom Bügel senkrecht herab, Knoten, Quaste
    const haken = buegelWeg.getPoint(0.45);
    const fuss = haken.clone().add(new THREE.Vector3(0, -0.09, 0));
    const riemen = stoffTeil(new THREE.BoxGeometry(0.008, 0.09, 0.012), stoff(FARBE.troddel));
    riemen.position.copy(haken).lerp(fuss, 0.5);
    saebel.add(riemen);
    const kn = stoffTeil(new THREE.SphereGeometry(1, n(8, 6), n(6, 4)), stoff(FARBE.troddel));
    kn.scale.setScalar(0.012);
    kn.position.copy(fuss).add(new THREE.Vector3(0, -0.004, 0));
    saebel.add(kn);
    const quaste = stoffTeil(new THREE.CylinderGeometry(0.012, 0.021, 0.05, n(10, 6)), stoff(FARBE.troddel));
    quaste.position.copy(fuss).add(new THREE.Vector3(0, -0.037, 0));
    saebel.add(quaste);
    koerper.add(saebel);
    return koerper;
  };

  const person = new THREE.Group();
  person.name = 'Schutzmann Kranich';
  person.userData.person = 'kranich';
  const verschmolzen = new THREE.Group();
  // Detailstufen statt einfachem Verschmelzen: je Stufe ein Netz je Material, Hüllen drehen mit der Person
  verschmolzen.add(alsStufe(baueKoerper(), () => sparsam(baueKoerper), { abstand: STUFEN_ABSTAND.figur, beweglich: true }));
  person.add(verschmolzen);
  person.updateWorldMatrix(true, true);
  const stufen = baueStufen(verschmolzen);
  stufen.einhaengen(null);
  // main.js verknüpft die Stufen mit der Sichtbarkeitszelle des Kranichs
  person.userData.stufen = stufen;

  // Großer, unsichtbarer Trefferkörper: leicht anzutippen
  const treffer = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.9, 8), new THREE.MeshBasicMaterial());
  treffer.position.y = 0.95;
  treffer.visible = false;
  treffer.userData.nurTreffer = true;
  person.add(treffer);
  // Kontaktschatten: weicher Fleck unter den Stiefeln (Personen stehen nicht im Lichtmodell), wandert mit
  const fleck = weicherFleck(1.0, 0.9);
  fleck.position.z = 0.04;
  person.add(fleck);
  return person;
}
