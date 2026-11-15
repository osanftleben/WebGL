// Innenausbau (Wände und Türen): Tapete, Holz-Lambris, Ölfarbsockel, Kalkputz, Füllungstüren mit
// Bekleidung, Futter und Verdachung. Als Bausteine angelegt, damit weitere Räume (z. B. der Vorraum mit
// Kasse) sie übernehmen können: Materialien über `innenMaterialien()`, Wandteile über `wand()` in
// bauteile.js (Optionen `sockel`, Öffnung `verdachung`), Türflügel und Rahmen auch einzeln.
// Füllungen von Lambris und Türen (Befund 2): Profilleiste und erhabener Spiegel mit Fase sind echte Form
// (`profilRing`), als Kind vor dem Quader. Sie nehmen das Licht der Lichtkarte ihres Trägers, je Richtung
// mit dem Verhältnis aus dem Lichtgitter angepasst (`userData.lkTraeger`, Attribut `lgTraeger`,
// siehe lichtmodell.js und lichtgitter.js); Eckenverschattung je Eckpunkt (Attribut `lgProfil`), aus der Ferne weich ausgeblendet. Übriges Relief
// (Deckleiste) ist weiter in die Farbe gemalt.
// Farben, Muster und Maße sind Gestaltung (Annahme), siehe Quellen-Notiz.
import * as THREE from 'three';
import { leinwand, alsTextur, zufall } from './texturen.js';

/** Maße (m). Lambris: Gesamthöhe mit Deckleiste; unten deckt die Fußleiste (0,16 m) den Sockel ab. */
// Lambris 1,2 m (Hirth 1886: höchstens 1/3 der Raumhöhe, nicht unter dem Fensterbrett); feld = Kachelbreite
// (langes + schmales Feld). Ölfarbsockel 1,5 m (belegt sind 1,0 und 1,8 m; Wahl des Nutzers).
export const LAMBRIS = { hoehe: 1.2, dicke: 0.02, feld: 1.6, deckHoehe: 0.06, deckTiefe: 0.045, fuss: 0.16 };
/** Ölfarbsockel (Werkstatt): Höhe und Abstand vor der Wand (gegen Flimmern) */
export const OELSOCKEL = { hoehe: 1.5, dicke: 0.005 };
/** Kachelgröße der Wandtexturen (m): Tapete eine Musterkachel, Kalkputz */
export const KACHEL = { tapete: 0.5, kalk: 2 };
/** Quer-Rahmen der Lambris oben/unten als Anteil der Feldhöhe (52 von 512 Bildpunkten) */
const LAMBRIS_RIEGEL = 52 / 512;
/** Füllungstür: Breite der senkrechten Friese (m) */
const TUER = { fries: 0.12 };

/**
 * Füllungen einer Tür (von unten, Meter): untere Füllung, hohe Füllung, kleine Füllung.
 * @param {number} hoehe Flügelhöhe
 * @returns {number[][]} [unten, oben] je Füllung
 */
function tuerTeilung(hoehe) {
  return [[0.24, 0.84], [1.0, hoehe - 0.62], [hoehe - 0.48, hoehe - 0.13]];
}

// ---------- Profil der Füllungen (Befund 2) ----------

/** Querschnitt [d, h, Verschattung] von außen (Feldrand) nach innen: d = Abstand vom Feldrand,
 *  h = Höhe vor der Trägerfläche (m), Verschattung je Eckpunkt (1 = frei, kleiner = in einer Ecke).
 *  Aufgesetzte Profilleiste (Stufe, Plättchen, Rundstab, Plättchen, Hohlkehle), schmaler Grund, Fase und
 *  erhabener Spiegel. Form angenommen (Profilleisten aufgeleimt: Handbuch 1896, Fig. 335). */
const PROFIL = (() => {
  /** @type {{ d: number, h: number, ao: number, fern: number, flach: number, glatt: boolean }[]} */
  const p = [];
  // Aus der Ferne (Bildpunkt größer als die Stufen, siehe lichtgitter.js): Leiste als ruhiger, etwas dunklerer
  // Ring (fern 0,86, Richtungslicht aus), Fase und Spiegel behalten ihr Richtungslicht (breit genug)
  const pkt = (/** @type {number} */ d, /** @type {number} */ h, /** @type {number} */ ao, glatt = false) =>
    p.push({ d, h, ao, fern: d < 0.035 ? 0.86 : d < 0.039 ? 0.95 : 1, flach: d < 0.035 ? 1 : 0, glatt });
  pkt(0, 0, 0.5); // Fuß auf dem Rahmen (einspringende Ecke)
  pkt(0, 0.0025, 0.82);
  pkt(0, 0.006, 0.96); // äußere Stufe 6 mm
  pkt(0.003, 0.006, 1); // Plättchen
  // Rundstab r = 5 mm
  for (let i = 1; i <= 6; i++) {
    const t = Math.PI * (1 - i / 6);
    pkt(0.008 + 0.005 * Math.cos(t), 0.006 + 0.005 * Math.sin(t), i === 6 ? 0.9 : 1, i < 6);
  }
  pkt(0.013, 0.004, 0.78); // kleine Stufe hinab
  pkt(0.015, 0.004, 0.86);
  // Hohlkehle (Viertelellipse) bis knapp über den Grund
  for (let i = 1; i <= 5; i++) {
    const t = (Math.PI / 2) * (i / 5);
    pkt(0.025 - 0.01 * Math.cos(t), 0.004 - 0.002 * Math.sin(t), 0.86 - 0.24 * (i / 5), i < 5);
  }
  pkt(0.028, 0.002, 0.88); // Grund (2 mm vor dem Träger: kein Flimmern)
  pkt(0.034, 0.002, 0.88);
  pkt(0.036, 0.002, 0.62); // Fuß der Fase (einspringende Ecke)
  pkt(0.04, 0.0033, 0.9);
  pkt(0.061, 0.01, 1); // Fase (≈ 16°) bis zur Spiegelkante
  pkt(0.063, 0.0105, 1, true); // gebrochene Kante
  pkt(0.066, 0.0105, 1);
  return { punkte: p, breite: 0.066, linie: 0.072 };
})();

/** Vorlage für Profilmaterialien: Trägerlicht + Verschattung (`LG_TRAEGER`), je Grundmaterial */
const profilCache = new WeakMap();

/**
 * Material für die Profilform: wie das Trägermaterial (gleiche Textur), mit Schalter
 * `LG_TRAEGER` für das Licht (lichtgitter.js).
 * @param {THREE.Material} traeger
 */
function profilMaterial(traeger) {
  let mat = profilCache.get(traeger);
  if (!mat) {
    mat = /** @type {THREE.MeshLambertMaterial} */ (traeger).clone();
    // Verschattung je Eckpunkt über das Attribut `lgProfil` (lichtgitter.js, abstandsabhängig)
    mat.defines = { ...(mat.defines || {}), LG_TRAEGER: '' };
    profilCache.set(traeger, mat);
  }
  return mat;
}

/**
 * Profilringe um rechteckige Felder auf der Vorder- (seite +1, Fläche z = zFlaeche) oder Rückseite (−1)
 * eines Quaders. Lokale Koordinaten des Trägers; `uv(x, y)` liefert die Texturkoordinate des Trägers an
 * dieser Stelle (gleiche Textur → Zierlinie liegt auf dem Spiegel).
 * @param {{ felder: number[][], seite: number, zFlaeche: number, uv: (x: number, y: number) => number[] }[]} teile
 *   felder: [x0, y0, x1, y1] je Feld
 * @returns {THREE.BufferGeometry | null}
 */
function profilGeometrie(teile) {
  /** @type {number[]} */ const pos = [];
  /** @type {number[]} */ const nor = [];
  /** @type {number[]} */ const uvs = [];
  /** @type {number[]} */ const profil = [];
  /** @type {number[]} */ const traeger = [];
  const P = PROFIL.punkte;
  // Normale je Abschnitt im Querschnitt (nach innen, nach vorn)
  const nAbschnitt = [];
  for (let i = 0; i + 1 < P.length; i++) {
    const dd = P[i + 1].d - P[i].d;
    const dh = P[i + 1].h - P[i].h;
    const l = Math.hypot(dd, dh) || 1;
    nAbschnitt.push([-dh / l, dd / l]);
  }
  const nPunkt = (/** @type {number} */ i, /** @type {number} */ k) => {
    // k = Abschnitt; an glatten Punkten Mittel der Nachbarabschnitte
    if (!P[i].glatt) return nAbschnitt[k];
    const a = nAbschnitt[Math.max(0, i - 1)];
    const b = nAbschnitt[Math.min(nAbschnitt.length - 1, i)];
    const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1;
    return [(a[0] + b[0]) / l, (a[1] + b[1]) / l];
  };
  for (const { felder, seite, zFlaeche, uv } of teile) {
    /** @param {number[][]} ecken je [x, y, z, nx, ny, nz, ao, aoFern, flachFern] */
    const viereck = (ecken) => {
      // Umlaufsinn so, dass die Vorderseite zur Normale zeigt
      const [a, b, c] = ecken;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const kreuz = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const n = [a[3] + b[3] + c[3] + ecken[3][3], a[4] + b[4] + c[4] + ecken[3][4], a[5] + b[5] + c[5] + ecken[3][5]];
      const folge = kreuz[0] * n[0] + kreuz[1] * n[1] + kreuz[2] * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      for (const j of folge) {
        const e = ecken[j];
        pos.push(e[0], e[1], e[2]);
        nor.push(e[3], e[4], e[5]);
        uvs.push(...uv(e[0], e[1]));
        profil.push(e[6], e[7], e[8]);
        traeger.push(0, 0, seite);
      }
    };
    for (const [x0, y0, x1, y1] of felder) {
      // zu kleine Felder: Querschnitt in d stauchen (kurze Wandstücke)
      const s = Math.min(1, (Math.min(x1 - x0, y1 - y0) / 2 - 0.02) / PROFIL.breite);
      if (s < 0.3) continue;
      const z = (/** @type {number} */ h) => zFlaeche + seite * h;
      // vier Seiten: Ecke am Rand (bei d), Richtung entlang der Kante, Richtung nach innen
      const seiten = [
        { a: (/** @type {number} */ d) => [x0 + d, y0 + d], b: (/** @type {number} */ d) => [x1 - d, y0 + d], innen: [0, 1] },
        { a: (/** @type {number} */ d) => [x1 - d, y0 + d], b: (/** @type {number} */ d) => [x1 - d, y1 - d], innen: [-1, 0] },
        { a: (/** @type {number} */ d) => [x1 - d, y1 - d], b: (/** @type {number} */ d) => [x0 + d, y1 - d], innen: [0, -1] },
        { a: (/** @type {number} */ d) => [x0 + d, y1 - d], b: (/** @type {number} */ d) => [x0 + d, y0 + d], innen: [1, 0] },
      ];
      for (const sk of seiten) {
        for (let k = 0; k + 1 < P.length; k++) {
          const ecke = (/** @type {number} */ i, /** @type {(d: number) => number[]} */ f) => {
            const [nd, nh] = nPunkt(i, k);
            const [x, y] = f(P[i].d * s);
            return [x, y, z(P[i].h), sk.innen[0] * nd, sk.innen[1] * nd, seite * nh, P[i].ao, P[i].fern, P[i].flach];
          };
          viereck([ecke(k, sk.a), ecke(k, sk.b), ecke(k + 1, sk.b), ecke(k + 1, sk.a)]);
        }
      }
      // Spiegel (oberste Fläche)
      const d = P[P.length - 1].d * s;
      const h = P[P.length - 1].h;
      viereck([[x0 + d, y0 + d, z(h), 0, 0, seite, 1, 1, 0], [x1 - d, y0 + d, z(h), 0, 0, seite, 1, 1, 0],
        [x1 - d, y1 - d, z(h), 0, 0, seite, 1, 1, 0], [x0 + d, y1 - d, z(h), 0, 0, seite, 1, 1, 0]]);
    }
  }
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('lgProfil', new THREE.Float32BufferAttribute(profil, 3));
  geo.setAttribute('lgTraeger', new THREE.Float32BufferAttribute(traeger, 3));
  return geo;
}

/**
 * Hängt die Profilform als Kind an den Träger-Quader (gleiche lokale Koordinaten, ohne eigene Lage).
 * @param {THREE.Mesh} traeger @param {THREE.BufferGeometry | null} geo
 */
function haengeProfilAn(traeger, geo) {
  if (!geo) return;
  const profil = new THREE.Mesh(geo, profilMaterial(/** @type {THREE.Material} */ (traeger.material)));
  // Licht aus der Lichtkarte des Trägers (lichtmodell.js); kein eigener Verdecker
  profil.userData.lkTraeger = traeger;
  traeger.add(profil);
}

// ---------- Hilfen zum Malen ----------

/** sRGB-Farbe als CSS-Text, mit Faktor auf die Helligkeit */
const rgb = (/** @type {number[]} */ c, f = 1, a = 1) =>
  `rgba(${Math.min(255, Math.round(c[0] * f))},${Math.min(255, Math.round(c[1] * f))},${Math.min(255, Math.round(c[2] * f))},${a})`;

/**
 * Feines Korn (Papier, Putz, Holzporen): je Bildpunkt ±stufen Helligkeit. Mittelwert bleibt gleich, aus der
 * Ferne also keine Flecken (die Mip-Stufen mitteln das Korn weg).
 * @param {CanvasRenderingContext2D} ctx @param {number} b @param {number} h @param {number} stufen @param {number} saat
 */
function korn(ctx, b, h, stufen, saat) {
  const z = zufall(saat);
  const bild = ctx.getImageData(0, 0, b, h);
  const d = bild.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (z() + z() - 1) * stufen;
    d[i] += v;
    d[i + 1] += v;
    d[i + 2] += v;
  }
  ctx.putImageData(bild, 0, 0);
}

/**
 * Holzmaserung in einem Rechteck (längs = senkrecht oder waagerecht).
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} b @param {number} h
 * @param {number[]} farbe sRGB 0–255 @param {boolean} senkrecht @param {() => number} z
 */
function maserung(ctx, x, y, b, h, farbe, senkrecht, z) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, b, h);
  ctx.clip();
  ctx.fillStyle = rgb(farbe);
  ctx.fillRect(x, y, b, h);
  const laenge = senkrecht ? h : b;
  const quer = senkrecht ? b : h;
  const n = Math.max(4, Math.round(quer / 5));
  for (let i = 0; i < n; i++) {
    const q = z() * quer;
    const welle = 0.5 + z() * 2;
    const phase = z() * 6;
    ctx.strokeStyle = z() < 0.5 ? `rgba(40,22,10,${0.05 + z() * 0.09})` : `rgba(255,235,200,${0.03 + z() * 0.04})`;
    ctx.lineWidth = 0.6 + z() * 1.6;
    ctx.beginPath();
    for (let s = 0; s <= laenge; s += 8) {
      const d = q + Math.sin(s * 0.03 + phase) * welle;
      if (senkrecht) (s ? ctx.lineTo : ctx.moveTo).call(ctx, x + d, y + s);
      else (s ? ctx.lineTo : ctx.moveTo).call(ctx, x + s, y + d);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Grund einer Füllung mit Zierlinie. Profilleiste und Fase sind seit Befund 2 echte Form (`profilRing`),
 * hier wird nur die Fläche darunter gemalt. Rahmen innen (x0, y0)–(x1, y1).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1
 * @param {{ grund: number[], maser: boolean, randX: number, randY: number, linie?: string, linieBreite?: number, z: () => number }} o
 *   randX/randY: Abstand der Zierlinie vom Feldrand in Bildpunkten (liegt auf dem Spiegel, siehe PROFIL.linie)
 */
function fuellung(ctx, x0, y0, x1, y1, { grund, maser, randX, randY, linie, linieBreite = 3, z }) {
  if (maser) maserung(ctx, x0, y0, x1 - x0, y1 - y0, grund, true, z);
  else {
    ctx.fillStyle = rgb(grund);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  if (linie) {
    // feine Zierlinie (z. B. Gold) auf dem Spiegel
    ctx.strokeStyle = linie;
    ctx.lineWidth = linieBreite;
    ctx.strokeRect(x0 + randX, y0 + randY, x1 - x0 - 2 * randX, y1 - y0 - 2 * randY);
  }
}

// ---------- Texturen ----------

/**
 * Tapete mit Damast-Muster (Medaillon im Versatz), nahtlos; eine Kachel = KACHEL.tapete Meter.
 * Geringer Kontrast, damit nichts flimmert.
 * @param {{ grund: number[], muster: number[], glanz?: number[], saat?: number }} o Farben sRGB 0–255
 */
export function tapetenTextur({ grund, muster, glanz = grund, saat = 51 }) {
  const N = 512;
  const { canvas, ctx } = leinwand(N, N);
  ctx.fillStyle = rgb(grund);
  ctx.fillRect(0, 0, N, N);

  /** Halbes Medaillon (rechte Seite), gespiegelt gezeichnet; Mitte (0, 0), Höhe etwa ±120 */
  const haelfte = () => {
    // äußerer Bogen aus C-Schwüngen
    ctx.moveTo(0, -122);
    ctx.bezierCurveTo(26, -112, 52, -88, 58, -58);
    ctx.bezierCurveTo(64, -30, 88, -18, 96, 4);
    ctx.bezierCurveTo(104, 28, 84, 52, 62, 58);
    ctx.bezierCurveTo(40, 66, 30, 92, 0, 120);
  };
  const palmette = () => {
    // innere Palmette: Mittelblatt mit drei Lappen je Seite
    ctx.moveTo(0, -84);
    ctx.bezierCurveTo(14, -70, 22, -52, 14, -38);
    ctx.bezierCurveTo(34, -40, 44, -22, 30, -8);
    ctx.bezierCurveTo(50, -4, 54, 22, 32, 30);
    ctx.bezierCurveTo(24, 50, 12, 62, 0, 70);
    ctx.lineTo(0, -84);
  };
  const medaillon = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ s) => {
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx * s, s);
      // Bogen: Glanzkante leicht versetzt, dann Musterfarbe
      for (const [farbe, d] of /** @type {[number[], number][]} */ ([[glanz, -1.5], [muster, 0]])) {
        ctx.strokeStyle = rgb(farbe);
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.save();
        ctx.translate(d, d);
        haelfte();
        ctx.restore();
        ctx.stroke();
      }
      // Einrollung an der Seite
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(80, 6, 13, Math.PI * 0.2, Math.PI * 1.9);
      ctx.stroke();
      // Palmette
      ctx.fillStyle = rgb(muster);
      ctx.beginPath();
      palmette();
      ctx.fill();
      // Blattrippen etwas heller
      ctx.strokeStyle = rgb(glanz);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -60);
      ctx.quadraticCurveTo(20, -30, 18, 10);
      ctx.stroke();
      // Knospe oben und Tropfen unten
      ctx.fillStyle = rgb(muster);
      ctx.beginPath();
      ctx.ellipse(0, -100, 9, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 94, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  // kleine Streublume (vier Blättchen) zwischen den Medaillons
  const streublume = (/** @type {number} */ x, /** @type {number} */ y) => {
    ctx.fillStyle = rgb(muster);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 14, y + Math.sin(a) * 14, 11, 5.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = rgb(glanz);
    ctx.fill();
  };
  // Medaillons an den Ecken und in der Mitte (Versatz) → nahtlos
  for (const [x, y] of [[0, 0], [N, 0], [0, N], [N, N], [N / 2, N / 2]]) medaillon(x, y, 0.95);
  for (const [x, y] of [[N / 2, 0], [N / 2, N], [0, N / 2], [N, N / 2]]) streublume(x, y);
  korn(ctx, N, N, 3, saat);
  return alsTextur(canvas);
}

/**
 * Teilung der Lambris-Kachel in Bildpunkten (Breite B): Stabbreite, Beginn des Stabs vor dem schmalen Feld,
 * und `uSchmal` = u, ab dem nur noch das schmale Feld mit seinen halben Stäben folgt (für kurze Wandstücke).
 * @param {number} [B=1024]
 */
export function lambrisTeilung(B = 1024) {
  // (Quer-Rahmen oben/unten: LAMBRIS_RIEGEL)
  const proM = B / LAMBRIS.feld; // Bildpunkte je Meter waagerecht
  const stab = Math.round(0.11 * proM); // Rahmenbreite zwischen zwei Feldern
  const schmal = Math.round(0.3 * proM);
  const x2 = B - stab / 2 - schmal - stab;
  return { stab, schmal, x2, uSchmal: (x2 + stab / 2) / B, breiteSchmal: (schmal + stab) / proM };
}

/**
 * Lambris: eine Kachel (LAMBRIS.feld m breit) = langes Feld + schmales, hochgestelltes Feld im Wechsel
 * (Koch 1903: lange Füllungen im Wechsel mit schmalen); in v die ganze Höhe zwischen Fußleiste und
 * Deckleiste. Kacheln je Wandstück werden über die UVs ganzzahlig eingepasst (lambrisUV).
 * @param {{ holz: number[], maser?: boolean, linie?: string, saat?: number }} o Holz- bzw. Anstrichfarbe
 *   sRGB 0–255; maser = Holzmaserung (sonst glatt gefasst); linie = Zierlinie auf dem Spiegel (z. B. Gold)
 */
export function lambrisTextur({ holz, maser = true, linie, saat = 61 }) {
  const B = 1024;
  const H = 512;
  const { canvas, ctx } = leinwand(B, H);
  const z = zufall(saat);
  const { stab, x2 } = lambrisTeilung(B);
  const riegel = LAMBRIS_RIEGEL * H; // Quer-Rahmen oben/unten (≈ 10 cm bei 0,98 m Feldhöhe)
  // Felder [x0, x1]: halber Stab am Rand, langes Feld, Stab, schmales Feld, halber Stab
  const x1 = stab / 2;
  const felder = [[x1, x2], [x2 + stab, B - stab / 2]];
  if (maser) {
    // Rahmen: Querriegel waagerecht gemasert, Stäbe senkrecht
    maserung(ctx, 0, 0, B, riegel, holz, false, z);
    maserung(ctx, 0, H - riegel, B, riegel, holz, false, z);
    for (const xs of [0, x2, B - stab / 2]) maserung(ctx, xs, 0, xs === 0 || xs === B - stab / 2 ? stab / 2 : stab, H, holz, true, z);
  } else {
    // gefasst (Ölfarbe): glatt
    ctx.fillStyle = rgb(holz);
    ctx.fillRect(0, 0, B, H);
  }
  // Fuge zwischen den Stäben zweier Kacheln
  ctx.fillStyle = rgb(holz, 0.6);
  ctx.fillRect(0, 0, 1.5, H);
  const randX = PROFIL.linie * (B / LAMBRIS.feld);
  const randY = PROFIL.linie * (H / (LAMBRIS.hoehe - LAMBRIS.deckHoehe - LAMBRIS.fuss));
  for (const [a, b] of felder) {
    fuellung(ctx, a, riegel, b, H - riegel, { grund: holz.map((c) => c * (maser ? 0.94 : 0.97)), maser, randX, randY, linie, linieBreite: 6, z });
  }
  korn(ctx, B, H, maser ? 2 : 1.5, saat + 1);
  return alsTextur(canvas);
}

/**
 * Ölfarbsockel: glatter Anstrich mit feinen waagerechten Pinselspuren, oben ein Begleitstrich.
 * u: 1 m je Kachel, v: ganze Sockelhöhe (0 unten, 1 oben).
 * @param {{ farbe: number[], strich: number[], saat?: number }} o
 */
export function oelsockelTextur({ farbe, strich, saat = 71 }) {
  const B = 256;
  const H = 512;
  const { canvas, ctx } = leinwand(B, H);
  const z = zufall(saat);
  ctx.fillStyle = rgb(farbe);
  ctx.fillRect(0, 0, B, H);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = z() < 0.5 ? `rgba(255,255,255,${0.012 + z() * 0.012})` : `rgba(0,0,0,${0.012 + z() * 0.012})`;
    const y = z() * H;
    ctx.fillRect(z() * B - 60, y, 80 + z() * 160, 1 + z() * 1.5);
  }
  // Begleitstrich oben (Annahme): 6 Bildpunkte ≈ 1,8 cm bei 1,5 m Sockelhöhe
  ctx.fillStyle = rgb(strich);
  ctx.fillRect(0, 0, B, 6);
  korn(ctx, B, H, 1.5, saat + 1);
  return alsTextur(canvas);
}

/**
 * Heller Kalkputz: fast gleichmäßig, nur feines Korn (keine Flecken). Eine Kachel = KACHEL.kalk Meter.
 * @param {{ farbe: number[], saat?: number }} o
 */
export function kalkputzTextur({ farbe, saat = 81 }) {
  const N = 512;
  const { canvas, ctx } = leinwand(N, N);
  ctx.fillStyle = rgb(farbe);
  ctx.fillRect(0, 0, N, N);
  korn(ctx, N, N, 4, saat);
  return alsTextur(canvas);
}

/**
 * Füllungstür (ein Flügel), Textur für die Vorderseite in den Maßen des Flügels.
 * Teilung (von unten): Sockelriegel, untere Füllung, Schlossriegel, hohe Füllung, Querriegel, kleine Füllung, Kopfriegel.
 * @param {number} breite @param {number} hoehe Flügelmaße (m)
 * @param {{ holz: number[], maser?: boolean, linie?: string }} o
 */
export function tuerTextur(breite, hoehe, { holz, maser = true, linie }) {
  const proM = 300; // Bildpunkte je Meter
  const B = Math.round(breite * proM);
  const H = Math.round(hoehe * proM);
  const { canvas, ctx } = leinwand(B, H);
  const z = zufall(91 + B + H);
  const p = (/** @type {number} */ m) => m * proM;
  const y = (/** @type {number} */ m) => H - p(m); // Meter von unten → Bildzeile
  if (maser) {
    maserung(ctx, 0, 0, B, H, holz, false, z);
    maserung(ctx, 0, 0, p(0.12), H, holz, true, z);
    maserung(ctx, B - p(0.12), 0, p(0.12), H, holz, true, z);
  } else {
    ctx.fillStyle = rgb(holz);
    ctx.fillRect(0, 0, B, H);
  }
  const s = p(TUER.fries);
  for (const [u, o] of tuerTeilung(hoehe)) {
    fuellung(ctx, s, y(o), B - s, y(u), { grund: holz.map((c) => c * 0.95), maser, randX: p(PROFIL.linie), randY: p(PROFIL.linie), linie, z });
  }
  // Fuge an den Kanten (Flügel stoßen aneinander)
  ctx.strokeStyle = rgb(holz, 0.5);
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, B - 2, H - 2);
  if (maser) korn(ctx, B, H, 2, 93);
  const t = alsTextur(canvas);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * Deckleiste der Lambris: Profil quer eingemalt (v = 1 oben): Plättchen, Kehle, Wulst, Unterkante.
 * Die Textur ändert sich nur in v, daher stört die Streckung entlang der Leiste nicht.
 * @param {{ holz: number[] }} o Anstrichfarbe sRGB 0–255
 */
export function deckleistenTextur({ holz }) {
  const { canvas, ctx } = leinwand(16, 128);
  // Bänder von oben nach unten: [Anteil, Helligkeit]
  const baender = [[0.12, 1.1], [0.06, 0.8], [0.16, 0.62], [0.1, 0.85], [0.28, 1.12], [0.14, 0.92], [0.08, 0.7], [0.06, 0.95]];
  let y = 0;
  for (const [anteil, f] of baender) {
    const h = anteil * 128;
    ctx.fillStyle = rgb(holz, f);
    ctx.fillRect(0, Math.round(y), 16, Math.ceil(h) + 1);
    y += h;
  }
  const t = alsTextur(canvas);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Breite (m) einer Musterlänge der Bordüre; Höhe des Bands (m) */
export const BORDUERE = { periode: 0.25, hoehe: 0.16 };

/**
 * Tapeten-Bordüre (Fries unter dem Gesims): dunklerer Grund, Ränder mit Goldlinie, laufende Ranke
 * (Wellenband mit Blättchen). u: eine Musterlänge = BORDUERE.periode, v: ganze Bandhöhe.
 * @param {{ grund: number[], muster: number[], gold: string }} o
 */
export function borduerenTextur({ grund, muster, gold }) {
  const B = 256;
  const H = 160;
  const { canvas, ctx } = leinwand(B, H);
  ctx.fillStyle = rgb(grund);
  ctx.fillRect(0, 0, B, H);
  // Ränder: helle Linie, Goldlinie
  for (const y0 of [6, H - 12]) {
    ctx.fillStyle = rgb(muster);
    ctx.fillRect(0, y0, B, 6);
    ctx.fillStyle = gold;
    ctx.fillRect(0, y0 + (y0 < H / 2 ? 9 : -6), B, 3);
  }
  // laufende Welle (zwei Bögen je Musterlänge → nahtlos)
  const my = H / 2;
  ctx.strokeStyle = rgb(muster);
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -4; x <= B + 4; x += 2) {
    const y = my + Math.sin((x / B) * Math.PI * 2) * 24;
    if (x === -4) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Blättchen und Einrollungen in den Bögen
  ctx.fillStyle = rgb(muster);
  for (const [x, oben] of /** @type {[number, boolean][]} */ ([[B * 0.25, true], [B * 0.75, false]])) {
    const s = oben ? -1 : 1;
    for (const w of [-0.6, 0.6]) {
      ctx.save();
      ctx.translate(x, my + s * 24);
      ctx.rotate(w + (oben ? 0 : Math.PI));
      ctx.beginPath();
      ctx.ellipse(0, 18, 7, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(x, my - s * 14, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  korn(ctx, B, H, 2, 57);
  const t = alsTextur(canvas);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------- Texturkoordinaten ----------

/**
 * Wandkoordinaten: Textur läuft über alle Teile einer Wand durch (Pfeiler, Sturz, Brüstung), damit an
 * Fenstern und Türen keine Musterkanten entstehen. Die Lage (cx, cy, cz) ist die Mitte des Quaders in der Wand.
 * @param {THREE.BoxGeometry} geo @param {number} cx @param {number} cy @param {number} cz @param {number} kachel
 */
export function wandUV(geo, cx, cy, cz, kachel) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const uv = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('uv'));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const y = pos.getY(i) + cy;
    const zz = pos.getZ(i) + cz;
    const nx = nor.getX(i);
    const ny = nor.getY(i);
    const nz = nor.getZ(i);
    if (Math.abs(nz) > 0.5) uv.setXY(i, (nz > 0 ? x : -x) / kachel, y / kachel);
    else if (Math.abs(nx) > 0.5) uv.setXY(i, (nx > 0 ? -zz : zz) / kachel, y / kachel);
    else uv.setXY(i, x / kachel, (ny > 0 ? -zz : zz) / kachel);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Lambris-Koordinaten: Vorderseite u = 0 … felder, v = 0 … 1; übrige Seiten einfarbig (Mitte eines Stabs).
 * @param {THREE.BoxGeometry} geo @param {number} felder Breite des u-Bereichs (Kacheln) @param {number} [von=0] Beginn in u
 */
export function lambrisUV(geo, felder, von = 0) {
  const nor = geo.getAttribute('normal');
  const uv = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('uv'));
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(nor.getZ(i)) > 0.5) uv.setXY(i, von + uv.getX(i) * felder, uv.getY(i));
    else uv.setXY(i, 0.01, 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

// ---------- Materialien ----------

/** @typedef {ReturnType<typeof innenMaterialien>} InnenMaterialien */

/**
 * Materialien des Innenausbaus (Farben = Gestaltung). Wandmaterialien tragen `userData.weltKachel`,
 * damit `wand()` die Texturkoordinaten durchlaufen lässt.
 * @param {{ holzTextur: (rgb: number[], saat: number) => THREE.Texture }} hilfen
 */
export function innenMaterialien({ holzTextur }) {
  const lambert = (/** @type {THREE.MeshLambertMaterialParameters} */ p) => new THREE.MeshLambertMaterial(p);
  const mitKachel = (/** @type {THREE.Material} */ mat, /** @type {number} */ k) => {
    mat.userData.weltKachel = k;
    return mat;
  };
  const s = STIL[STIL_WAHL];
  /** Leisten/Rahmen: gemasertes Holz oder glatter Anstrich */
  const leiste = (/** @type {Fassung} */ f, /** @type {number} */ saat) =>
    lambert(f.maser ? { map: holzTextur(f.holz, saat) } : { color: new THREE.Color().setRGB(...srgb(f.holz), THREE.SRGBColorSpace) });
  const farbe = (/** @type {number[]} */ c) => lambert({ color: new THREE.Color().setRGB(...srgb(c), THREE.SRGBColorSpace) });
  const tapete = mitKachel(lambert({ map: tapetenTextur(s.tapete) }), KACHEL.tapete);
  // Fensterlaibungen bei Tapete: glatt verputzt und gestrichen (wand() setzt ein Laibungsfutter)
  tapete.userData.laibung = farbe(s.laibung);
  // Bordüre unter dem Gesims (Runde 2): Grund dunkler als die Tapete, Muster im Tapetengrund
  tapete.userData.borduere = lambert({ map: borduerenTextur({ grund: s.tapete.grund.map((c) => c * 0.86), muster: s.tapete.glanz, gold: 'rgba(198,148,48,0.95)' }) });
  return {
    tapete,
    kalkputz: mitKachel(lambert({ map: kalkputzTextur({ farbe: [222, 217, 204] }) }), KACHEL.kalk),
    lambris: lambert({ map: lambrisTextur(s.lambris) }),
    lambrisLeiste: leiste({ ...s.lambris, holz: s.lambris.holz.map((c) => c * 0.96) }, 63),
    /** Deckleiste der Lambris mit eingemaltem Profil (gefasst) bzw. Holz */
    lambrisDeckleiste: s.lambris.maser ? leiste(s.lambris, 64) : lambert({ map: deckleistenTextur(s.lambris) }),
    /** Fußleiste unter der Lambris (dunklerer Ton der Fassung) */
    lambrisFuss: leiste(s.fuss, 65),
    oelsockel: lambert({ map: oelsockelTextur({ farbe: [118, 122, 104], strich: [58, 54, 44] }) }),
    tuerRahmen: leiste(s.tuer, 95),
    /** Fassung der Türflügel (Textur je Flügelgröße, siehe tuerMaterial) */
    tuerHolz: s.tuer,
  };
}

/** @typedef {{ holz: number[], maser: boolean, linie?: string }} Fassung Holz gemasert oder glatt gefasst */

const srgb = (/** @type {number[]} */ c) => /** @type {[number, number, number]} */ (c.map((v) => v / 255));

/** Gestaltungsvarianten (Annahme): Holz = Eiche dunkel; weiß = Rokoko-Fassung elfenbein mit Goldlinie */
const STIL = {
  holz: {
    tapete: { grund: [214, 196, 158], muster: [198, 177, 134], glanz: [222, 206, 170] },
    lambris: { holz: [104, 70, 42], maser: true },
    tuer: { holz: [98, 64, 38], maser: true },
    fuss: { holz: [58, 38, 24], maser: true },
    laibung: [222, 210, 182],
  },
  // Korrekturrunde 1: Muster näher am Grund (dezenter), Fußleiste im dunklen Ton der Fassung
  weiss: {
    tapete: { grund: [214, 196, 158], muster: [203, 184, 143], glanz: [220, 204, 168] },
    lambris: { holz: [232, 226, 210], maser: false, linie: 'rgba(198,148,48,0.95)' },
    tuer: { holz: [232, 226, 210], maser: false, linie: 'rgba(198,148,48,0.95)' },
    fuss: { holz: [128, 116, 96], maser: false },
    laibung: [222, 210, 182],
  },
};
/** @type {keyof typeof STIL} */
const STIL_WAHL = 'weiss';

/** @type {Map<string, THREE.Material>} Türflügel-Materialien je Größe und Fassung */
const tuerCache = new Map();

/**
 * Material eines Türflügels (eigene Textur je Flügelgröße, wird geteilt).
 * @param {number} breite @param {number} hoehe @param {Fassung} fassung
 */
export function tuerMaterial(breite, hoehe, fassung) {
  const schluessel = `${Math.round(breite * 100)}x${Math.round(hoehe * 100)}:${JSON.stringify(fassung)}`;
  let mat = tuerCache.get(schluessel);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({ map: tuerTextur(breite, hoehe, fassung) });
    tuerCache.set(schluessel, mat);
  }
  return mat;
}

// ---------- Bauteile ----------

/**
 * Quader mit Mittelpunkt (x, y, z).
 * @param {THREE.BufferGeometry} geo @param {THREE.Material} mat @param {number} x @param {number} y @param {number} z
 */
function teil(geo, mat, x, y, z) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * Türflügel als Quader mit Füllungstextur (Vorderseite +z). Ursprung der Gruppe: Mitte unten.
 * (Geometrie bleibt mittig – das Lichtmodell erwartet Quader um ihren Mittelpunkt.)
 * @param {number} breite @param {number} hoehe @param {number} dicke @param {Fassung} holz Fassung (m.tuerHolz)
 * @returns {THREE.Group}
 */
export function tuerFluegel(breite, hoehe, dicke, holz) {
  const g = new THREE.Group();
  const blatt = teil(new THREE.BoxGeometry(breite, hoehe, dicke), tuerMaterial(breite, hoehe, holz), 0, hoehe / 2, 0);
  g.add(blatt);
  // Profilform der Füllungen auf beiden Seiten (Textur der Rückseite ist gespiegelt: u = 0,5 − x/Breite)
  const x0 = -breite / 2 + TUER.fries;
  const felder = tuerTeilung(hoehe).map(([u, o]) => [x0, u - hoehe / 2, -x0, o - hoehe / 2]);
  haengeProfilAn(blatt, profilGeometrie([1, -1].map((seite) => ({
    felder, seite, zFlaeche: seite * dicke / 2,
    uv: (/** @type {number} */ x, /** @type {number} */ y) => [0.5 + seite * x / breite, y / hoehe + 0.5],
  }))));
  return g;
}

/**
 * Türbekleidung (Rahmen um die Öffnung) mit Wulst innen, optional Verdachung (Fries + Gesims).
 * Ursprung: Mitte der Öffnung am Boden, Wandfläche bei z = 0, Vorderseite +z.
 * @param {number} breite @param {number} hoehe Öffnung
 * @param {THREE.Material} mat
 * @param {{ verdachung?: boolean, bekleidung?: number }} [o]
 * @returns {THREE.Group}
 */
export function tuerRahmen(breite, hoehe, mat, { verdachung = false, bekleidung = 0.13 } = {}) {
  const g = new THREE.Group();
  const b = bekleidung;
  const halb = breite / 2;
  const box = (/** @type {number} */ bx, /** @type {number} */ by, /** @type {number} */ bz, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z) =>
    g.add(teil(new THREE.BoxGeometry(bx, by, bz), mat, x, y, z));
  // flaches Brett und Wulst an der Öffnung
  for (const s of [-1, 1]) {
    box(b, hoehe + b, 0.025, s * (halb + b / 2), (hoehe + b) / 2, 0.0125);
    box(0.035, hoehe + 0.035, 0.04, s * (halb + 0.0175), (hoehe + 0.035) / 2, 0.02);
  }
  box(breite + 2 * b, b, 0.025, 0, hoehe + b / 2, 0.0125);
  box(breite + 0.07, 0.035, 0.04, 0, hoehe + 0.0175, 0.02);
  if (verdachung) {
    // Fries über der Bekleidung, darüber ein Gesims mit Plättchen
    const yf = hoehe + b;
    box(breite + 2 * b, 0.17, 0.03, 0, yf + 0.085, 0.015);
    box(breite + 2 * b + 0.08, 0.03, 0.06, 0, yf + 0.17 + 0.015, 0.03);
    box(breite + 2 * b + 0.18, 0.06, 0.1, 0, yf + 0.2 + 0.03, 0.05);
  }
  return g;
}

/**
 * Futter: Holzverkleidung der Laibung (links, rechts, oben) über die Tiefe `tiefe` ab der Wandfläche.
 * Ursprung wie tuerRahmen; die Laibung reicht nach −z.
 * @param {number} breite @param {number} hoehe @param {number} tiefe @param {THREE.Material} mat @param {number} [d=0.025] Brettdicke
 */
export function tuerFutter(breite, hoehe, tiefe, mat, d = 0.025) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(teil(new THREE.BoxGeometry(d, hoehe, tiefe), mat, s * (breite / 2 - d / 2), hoehe / 2, -tiefe / 2));
  g.add(teil(new THREE.BoxGeometry(breite, d, tiefe), mat, 0, hoehe - d / 2, -tiefe / 2));
  return g;
}

/**
 * Lambris-Stück von a bis b entlang der Wand (lokale x-Achse, Wandfläche z = 0, Vorderseite +z).
 * Felder werden ganzzahlig eingepasst; unter `LAMBRIS.fuss` liegt die Fußleiste der Wand.
 * @param {number} a @param {number} b @param {number} hoehe Gesamthöhe mit Deckleiste
 * @param {{ lambris: THREE.Material, lambrisLeiste: THREE.Material, lambrisDeckleiste: THREE.Material }} m
 * @returns {THREE.Mesh[]}
 */
export function lambrisStueck(a, b, hoehe, m) {
  /**
   * Profilform der Felder an einen Lambris-Quader hängen. Die Felder kommen aus derselben Teilung wie die
   * Textur (u = von + (x/laenge + ½)·kacheln); nur Felder, die ganz im u-Bereich des Quaders liegen.
   * @param {THREE.Mesh} mesh @param {number} laenge @param {number} hFeld @param {number} kacheln @param {number} von
   */
  const lambrisProfil = (mesh, laenge, hFeld, kacheln, von) => {
    const B = 1024;
    const { stab, x2 } = lambrisTeilung(B);
    const bereiche = [[stab / 2 / B, x2 / B], [(x2 + stab) / B, 1 - stab / 2 / B]];
    const xVonU = (/** @type {number} */ u) => ((u - von) / kacheln - 0.5) * laenge;
    const yu = (0.5 - LAMBRIS_RIEGEL) * hFeld;
    /** @type {number[][]} */
    const felder = [];
    for (let k = Math.floor(von); k < von + kacheln; k++) {
      for (const [fa, fb] of bereiche) {
        if (k + fa >= von - 1e-6 && k + fb <= von + kacheln + 1e-6) felder.push([xVonU(k + fa), -yu, xVonU(k + fb), yu]);
      }
    }
    haengeProfilAn(mesh, profilGeometrie([{
      felder, seite: 1, zFlaeche: LAMBRIS.dicke / 2,
      uv: (x, y) => [von + (x / laenge + 0.5) * kacheln, y / hFeld + 0.5],
    }]));
    return mesh;
  };
  const laenge = b - a;
  if (laenge < 0.05) return [];
  const { dicke, feld, deckHoehe, deckTiefe, fuss } = LAMBRIS;
  const teile = [];
  const hFeld = hoehe - deckHoehe - fuss;
  if (hFeld > 0.3) {
    if (laenge >= 1.2) {
      const felder = Math.max(1, Math.round(laenge / feld));
      const geo = lambrisUV(new THREE.BoxGeometry(laenge, hFeld, dicke), felder);
      teile.push(lambrisProfil(teil(geo, m.lambris, (a + b) / 2, fuss + hFeld / 2, dicke / 2), laenge, hFeld, felder, 0));
    } else {
      // kurzes Stück: nur schmale, hochgestellte Felder (sonst würde das lange Feld gestaucht)
      const { uSchmal, breiteSchmal } = lambrisTeilung();
      const n = Math.max(1, Math.round(laenge / breiteSchmal));
      const w = laenge / n;
      for (let k = 0; k < n; k++) {
        const geo = lambrisUV(new THREE.BoxGeometry(w, hFeld, dicke), 1 - uSchmal, uSchmal);
        teile.push(lambrisProfil(teil(geo, m.lambris, a + (k + 0.5) * w, fuss + hFeld / 2, dicke / 2), w, hFeld, 1 - uSchmal, uSchmal));
      }
    }
    teile.push(teil(new THREE.BoxGeometry(laenge, deckHoehe, deckTiefe), m.lambrisDeckleiste, (a + b) / 2, hoehe - deckHoehe / 2, deckTiefe / 2));
  } else {
    // niedrig (unter Fenstern): glattes Brett ohne Felder
    teile.push(teil(new THREE.BoxGeometry(laenge, hoehe - fuss, dicke), m.lambrisLeiste, (a + b) / 2, fuss + (hoehe - fuss) / 2, dicke / 2));
  }
  return teile;
}

/**
 * Ölfarbsockel von a bis b (knapp vor der Wandfläche).
 * @param {number} a @param {number} b @param {number} hoehe @param {THREE.Material} mat
 * @returns {THREE.Mesh[]}
 */
export function oelsockelStueck(a, b, hoehe, mat) {
  const laenge = b - a;
  if (laenge < 0.05) return [];
  const geo = new THREE.BoxGeometry(laenge, hoehe, OELSOCKEL.dicke);
  // u in Metern (Kachel 1 m), v über die Höhe
  const uv = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('uv'));
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * laenge);
  uv.needsUpdate = true;
  return [teil(geo, mat, (a + b) / 2, hoehe / 2, OELSOCKEL.dicke / 2)];
}
