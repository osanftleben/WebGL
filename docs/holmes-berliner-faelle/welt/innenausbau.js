// Innenausbau (Wände und Türen): Tapete, Holz-Lambris, Ölfarbsockel, Kalkputz, Füllungstüren mit
// Bekleidung, Futter und Verdachung. Als Bausteine angelegt, damit weitere Räume (z. B. der Vorraum mit
// Kasse) sie übernehmen können: Materialien über `innenMaterialien()`, Wandteile über `wand()` in
// bauteile.js (Optionen `sockel`, Öffnung `verdachung`), Türflügel und Rahmen auch einzeln.
// Relief (Füllungen, Fasen, Profile) ist wie beim Stuck in die Farbe gemalt (Licht oben links), weil die
// Räume ihr Licht nur aus Lichtkarte und Lichtgitter bekommen – Normalenkarten wirken dort nicht.
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
 * Füllung mit Profilleiste und Fase, eingemalt (Licht von oben links).
 * Rahmen innen (x0, y0)–(x1, y1); `profil` = Breite der Kehlleiste, `fase` = Breite der Abschrägung.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1
 * @param {{ grund: number[], maser: boolean, profil: number, fase: number, linie?: string, linieBreite?: number, z: () => number }} o
 */
function fuellung(ctx, x0, y0, x1, y1, { grund, maser, profil, fase, linie, linieBreite = 3, z }) {
  // Schattenkante oben/links (Rahmen wirft Schatten in die Vertiefung), Lichtkante unten/rechts
  const trapez = (/** @type {number[][]} */ p, /** @type {string} */ f) => {
    ctx.fillStyle = f;
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
    ctx.fill();
  };
  // Profilleiste (Kehle): Ring aus vier Trapezen
  const ring = (/** @type {number} */ a, /** @type {number} */ d, /** @type {string[]} */ f) => {
    const [ax0, ay0, ax1, ay1] = [x0 + a, y0 + a, x1 - a, y1 - a];
    const [bx0, by0, bx1, by1] = [ax0 + d, ay0 + d, ax1 - d, ay1 - d];
    trapez([[ax0, ay0], [ax1, ay0], [bx1, by0], [bx0, by0]], f[0]); // oben
    trapez([[ax0, ay0], [bx0, by0], [bx0, by1], [ax0, ay1]], f[1]); // links
    trapez([[ax0, ay1], [bx0, by1], [bx1, by1], [ax1, ay1]], f[2]); // unten
    trapez([[ax1, ay0], [ax1, ay1], [bx1, by1], [bx1, by0]], f[3]); // rechts
  };
  // Grund der Füllung (Spiegel) zuerst
  if (maser) maserung(ctx, x0, y0, x1 - x0, y1 - y0, grund, true, z);
  else {
    ctx.fillStyle = rgb(grund);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // Profil: erst dunkle Kehle (oben/links tief im Schatten), dann helle Rundung
  ring(0, profil * 0.45, [rgb(grund, 0.55), rgb(grund, 0.62), rgb(grund, 1.12), rgb(grund, 1.05)]);
  ring(profil * 0.45, profil * 0.55, [rgb(grund, 1.16), rgb(grund, 1.1), rgb(grund, 0.72), rgb(grund, 0.78)]);
  // Fase des erhabenen Spiegels: oben/links Licht, unten/rechts Schatten
  if (fase > 0) ring(profil, fase, [rgb(grund, 1.1, 0.75), rgb(grund, 1.05, 0.75), rgb(grund, 0.8, 0.75), rgb(grund, 0.85, 0.75)]);
  if (linie) {
    // feine Zierlinie (z. B. Gold) auf dem Spiegel
    const a = profil + fase + 4;
    ctx.strokeStyle = linie;
    ctx.lineWidth = linieBreite;
    ctx.strokeRect(x0 + a, y0 + a, x1 - x0 - 2 * a, y1 - y0 - 2 * a);
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
  const riegel = 52; // Quer-Rahmen oben/unten (≈ 10 cm bei 0,98 m Feldhöhe)
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
  for (const [a, b] of felder) {
    fuellung(ctx, a, riegel, b, H - riegel, { grund: holz.map((c) => c * (maser ? 0.94 : 0.97)), maser, profil: 14, fase: 26, linie, linieBreite: 6, z });
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
  const s = p(0.12);
  const teile = [[0.24, 0.84], [1.0, hoehe - 0.62], [hoehe - 0.48, hoehe - 0.13]];
  for (const [u, o] of teile) {
    fuellung(ctx, s, y(o), B - s, y(u), { grund: holz.map((c) => c * 0.95), maser, profil: 12, fase: 22, linie, z });
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
  g.add(teil(new THREE.BoxGeometry(breite, hoehe, dicke), tuerMaterial(breite, hoehe, holz), 0, hoehe / 2, 0));
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
  const laenge = b - a;
  if (laenge < 0.05) return [];
  const { dicke, feld, deckHoehe, deckTiefe, fuss } = LAMBRIS;
  const teile = [];
  const hFeld = hoehe - deckHoehe - fuss;
  if (hFeld > 0.3) {
    if (laenge >= 1.2) {
      const felder = Math.max(1, Math.round(laenge / feld));
      const geo = lambrisUV(new THREE.BoxGeometry(laenge, hFeld, dicke), felder);
      teile.push(teil(geo, m.lambris, (a + b) / 2, fuss + hFeld / 2, dicke / 2));
    } else {
      // kurzes Stück: nur schmale, hochgestellte Felder (sonst würde das lange Feld gestaucht)
      const { uSchmal, breiteSchmal } = lambrisTeilung();
      const n = Math.max(1, Math.round(laenge / breiteSchmal));
      const w = laenge / n;
      for (let k = 0; k < n; k++) {
        const geo = lambrisUV(new THREE.BoxGeometry(w, hFeld, dicke), 1 - uSchmal, uSchmal);
        teile.push(teil(geo, m.lambris, a + (k + 0.5) * w, fuss + hFeld / 2, dicke / 2));
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
