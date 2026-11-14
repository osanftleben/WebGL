// Stilisierter Straßenausblick hinter den Fenstern der Außenwände (Behren- und Friedrichstraße).
//
// Annahme (Spiel-Hinweis): anonyme Gründerzeit-Mietshäuser gegenüber, keine bestimmten Gebäude;
// Straßenbreite, Haushöhen, Farben, Dächer und Straßenniveau geschätzt; bedeckter, dunstiger Tag.
//
// Aufbau: ein einziges Netz (ein Draw-Call) mit einer selbst gemalten Canvas-Textur (Atlas):
// Straße (waagerecht, unten), Fassaden (senkrecht, gegenüber), schräge Dächer, Schornsteine und
// Brandwände, dahinter weit entfernt der Himmel. Weil alles an seinem echten Ort im Raum steht,
// verschiebt sich der Ausblick beim Gehen gegen den Fensterrahmen (Tiefenwirkung ohne Zusatzkosten).
// Unbeleuchtet (MeshBasic, ohne Farbkurve wie zuvor das Fensterlicht) und nicht Teil der
// Lichtberechnung; Dunst nach Entfernung im Shader.
import * as THREE from 'three';
import { zufall } from './texturen.js';

/** Größe des Atlas in Bildpunkten */
const W = 2048;
const H = 2048;
/** Bildpunkte je Meter in den Hauszellen (Zelle 512 × 1024 = 16 m × 32 m) */
const PX = 32;
const ZELLE_B = 512;
const ZELLE_H = 1024;
/** Straßenniveau unter dem Fußboden der III. Etage (Annahme: hohes EG und drei Obergeschosse) */
const STRASSE_Y = -14;
/** Abstand Außenwand – gegenüberliegende Fassade (Annahme) */
const STRASSE_BREITE = 18;
/** Schräges Dach hinter dem Hauptgesims: Tiefe und Höhe in Metern */
const DACH_TIEFE = 2.4;
const DACH_HOEHE = 4.6;
const DACH_LAENGE = Math.hypot(DACH_TIEFE, DACH_HOEHE);
/** Himmelsfläche: Abstand von der Außenwand und Oberkante */
const HIMMEL_ABSTAND = 60;
const HIMMEL_OBEN = 160;
/** Dächer schauen zum Himmel und sind heller als die Fassaden (unabhängig von der Himmelsrichtung) */
const DACH_LICHT = 1.3;

/** Bereiche im unteren Teil des Atlas (Bildpunkte, y von oben) */
const BEREICH = {
  strasse: { x: 0, y: 1024, b: 2048, h: 256 },
  himmel: { x: 0, y: 1280, b: 2048, h: 512 },
  schornstein: { x: 0, y: 1792, b: 64, h: 256 }, // 8 Stück nebeneinander, je 2 m × 8 m
  brandwand: { x: 512, y: 1792, b: 512, h: 256 },
  stein: { x: 1024, y: 1792, b: 64, h: 64 }, // Sohlbank oben
  steinDunkel: { x: 1088, y: 1792, b: 64, h: 64 }, // Sohlbank vorn und seitlich
  gold: { x: 1152, y: 1792, b: 64, h: 64 }, // Endpfosten und Wandanker des Brüstungsgitters
};

/**
 * Hausarten (eine Zelle je Art). Traufe = Oberkante Hauptgesims über der Straße.
 * Maße und Farben stilisiert (Annahme).
 * @typedef {{ farbe: number[], dach: number[], eg: number, geschoss: number, anzahl: number, achsen: number, verdachung: 'dreieck' | 'gerade', balkon: boolean }} HausArt
 */
/** @type {HausArt[]} */
const HAUSARTEN = [
  { farbe: [204, 192, 168], dach: [124, 129, 134], eg: 5.0, geschoss: 3.9, anzahl: 4, achsen: 5, verdachung: 'dreieck', balkon: true },
  { farbe: [192, 189, 181], dach: [108, 112, 120], eg: 4.6, geschoss: 3.7, anzahl: 4, achsen: 6, verdachung: 'gerade', balkon: false },
  { farbe: [208, 188, 146], dach: [118, 122, 127], eg: 5.2, geschoss: 4.2, anzahl: 3, achsen: 5, verdachung: 'gerade', balkon: true },
  { farbe: [198, 174, 156], dach: [104, 102, 102], eg: 5.0, geschoss: 4.0, anzahl: 4, achsen: 5, verdachung: 'dreieck', balkon: false },
];

/** Traufhöhe einer Hausart (Meter über der Straße), inklusive 1 m Hauptgesims */
const traufe = (/** @type {HausArt} */ a) => a.eg + a.anzahl * a.geschoss + 1.0;

/**
 * @param {number[]} c
 * @param {number} [d=0] Aufhellung (+) / Abdunklung (−) in Farbwerten
 * @param {number} [a=1]
 */
function rgb(c, d = 0, a = 1) {
  const k = (/** @type {number} */ v) => Math.max(0, Math.min(255, Math.round(v + d)));
  return `rgba(${k(c[0])},${k(c[1])},${k(c[2])},${a})`;
}

/**
 * Malt eine Hausart in ihre Zelle: Erdgeschoss mit Läden, Obergeschosse mit Fensterachsen,
 * Gurtgesimse, Hauptgesims und darüber die Dachfläche mit Gauben.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0 linke Kante der Zelle
 * @param {HausArt} a
 * @param {() => number} z Zufall
 */
function maleHaus(ctx, x0, a, z) {
  const y = (/** @type {number} */ h) => ZELLE_H - h * PX; // Meter über der Straße → Bildzeile
  const rx = (/** @type {number} */ m) => x0 + m * PX;
  const rect = (/** @type {number} */ l, /** @type {number} */ unten, /** @type {number} */ b, /** @type {number} */ hoch) => ctx.fillRect(rx(l), y(unten + hoch), b * PX, hoch * PX);
  const breite = ZELLE_B / PX;
  const tr = traufe(a);

  // Putzgrund und leichte Unruhe (Ruß, Ausbesserungen)
  ctx.fillStyle = rgb(a.farbe);
  ctx.fillRect(x0, 0, ZELLE_B, ZELLE_H);
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = rgb(a.farbe, z() < 0.5 ? -18 : 12, 0.12);
    ctx.fillRect(x0 + z() * ZELLE_B, z() * ZELLE_H, 4 + z() * 30, 3 + z() * 14);
  }

  // Erdgeschoss: Quaderung und Läden
  ctx.fillStyle = rgb(a.farbe, -10);
  rect(0, 0, breite, a.eg);
  ctx.fillStyle = rgb(a.farbe, -32, 0.8);
  for (let h = 0.55; h < a.eg - 0.4; h += 0.55) rect(0, h, breite, 0.05);
  const achsBreite = breite / a.achsen;
  for (let i = 0; i < a.achsen; i++) {
    const mitte = (i + 0.5) * achsBreite;
    const tuer = i === Math.floor(a.achsen / 2);
    const lb = tuer ? 1.3 : achsBreite - 0.8;
    const lh = tuer ? 2.8 : a.eg - 1.6;
    ctx.fillStyle = rgb([226, 222, 212]);
    rect(mitte - lb / 2 - 0.1, 0.3, lb + 0.2, lh + 0.1);
    ctx.fillStyle = tuer ? 'rgb(74,58,46)' : 'rgb(66,72,78)';
    rect(mitte - lb / 2, 0.35, lb, lh);
    if (!tuer) {
      // Ladenschild (ohne Schrift) über dem Schaufenster
      ctx.fillStyle = z() < 0.5 ? 'rgb(60,78,64)' : 'rgb(96,70,52)';
      rect(mitte - lb / 2, 0.35 + lh + 0.25, lb, 0.5);
    }
  }
  // Gurtgesims über dem Erdgeschoss
  ctx.fillStyle = rgb(a.farbe, 22);
  rect(0, a.eg - 0.35, breite, 0.35);
  ctx.fillStyle = rgb(a.farbe, -45, 0.7);
  rect(0, a.eg - 0.43, breite, 0.08);

  // Obergeschosse
  for (let g = 0; g < a.anzahl; g++) {
    const boden = a.eg + g * a.geschoss;
    if (g > 0) {
      ctx.fillStyle = rgb(a.farbe, 18);
      rect(0, boden - 0.05, breite, 0.16);
      ctx.fillStyle = rgb(a.farbe, -40, 0.6);
      rect(0, boden - 0.11, breite, 0.06);
    }
    const fh = Math.min(2.4, a.geschoss - 1.4);
    const fb = Math.min(1.25, achsBreite * 0.48);
    const brh = boden + 0.85; // Brüstungshöhe
    const balkonHier = a.balkon && g === 0;
    for (let i = 0; i < a.achsen; i++) {
      const l = (i + 0.5) * achsBreite - fb / 2;
      // Rußfahne unter der Fensterbank
      const russ = ctx.createLinearGradient(0, y(brh), 0, y(brh - 0.9));
      russ.addColorStop(0, rgb(a.farbe, -40, 0.35));
      russ.addColorStop(1, rgb(a.farbe, -40, 0));
      ctx.fillStyle = russ;
      rect(l + 0.1, brh - 0.9, fb - 0.2, 0.9);
      // Brüstungsfeld (Beletage)
      if (g === 0) {
        ctx.fillStyle = rgb(a.farbe, 14);
        rect(l, boden + 0.15, fb, 0.55);
      }
      // Faschen (Rahmung)
      ctx.fillStyle = rgb(a.farbe, 24);
      rect(l - 0.16, brh - 0.05, fb + 0.32, fh + 0.21);
      // Glas: oben spiegelt der helle Himmel, unten dunkel
      const glas = ctx.createLinearGradient(0, y(brh + fh), 0, y(brh));
      glas.addColorStop(0, 'rgb(150,158,164)');
      glas.addColorStop(0.45, 'rgb(92,100,108)');
      glas.addColorStop(1, 'rgb(62,68,76)');
      ctx.fillStyle = glas;
      rect(l, brh, fb, fh);
      // Gardinen (zufällig): seitliche Schals oder Scheibengardine
      const art = z();
      ctx.fillStyle = 'rgba(232,228,218,0.9)';
      if (art < 0.35) {
        rect(l, brh, fb * 0.22, fh);
        rect(l + fb * 0.78, brh, fb * 0.22, fh);
      } else if (art < 0.6) {
        rect(l, brh, fb, fh * 0.45);
      }
      // Fensterkreuz
      ctx.fillStyle = 'rgb(222,220,212)';
      rect(l + fb / 2 - 0.04, brh, 0.08, fh);
      rect(l, brh + fh * 0.68, fb, 0.08);
      ctx.strokeStyle = 'rgb(222,220,212)';
      ctx.lineWidth = 3;
      ctx.strokeRect(rx(l), y(brh + fh), fb * PX, fh * PX);
      // Fensterbank mit Schatten
      ctx.fillStyle = rgb(a.farbe, 30);
      rect(l - 0.22, brh - 0.12, fb + 0.44, 0.12);
      ctx.fillStyle = rgb(a.farbe, -50, 0.6);
      rect(l - 0.2, brh - 0.18, fb + 0.4, 0.06);
      // Verdachung: Beletage nach Hausart, II. Obergeschoss gerade, darüber keine
      const oben = brh + fh + 0.16;
      if (g === 0 && a.verdachung === 'dreieck') {
        ctx.fillStyle = rgb(a.farbe, 30);
        ctx.beginPath();
        ctx.moveTo(rx(l - 0.3), y(oben + 0.12));
        ctx.lineTo(rx(l + fb + 0.3), y(oben + 0.12));
        ctx.lineTo(rx(l + fb / 2), y(oben + 0.75));
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgb(a.farbe, -50, 0.6);
        rect(l - 0.25, oben, fb + 0.5, 0.08);
      } else if (g <= 1) {
        ctx.fillStyle = rgb(a.farbe, 30);
        rect(l - 0.28, oben + 0.08, fb + 0.56, 0.2);
        ctx.fillStyle = rgb(a.farbe, -50, 0.6);
        rect(l - 0.25, oben, fb + 0.5, 0.08);
      }
    }
    if (balkonHier) {
      // Balkon mit eisernem Gitter über den mittleren Achsen
      const l = (Math.floor(a.achsen / 2) - 0.5) * achsBreite;
      const b = achsBreite * 2;
      ctx.fillStyle = rgb(a.farbe, 26);
      rect(l, boden - 0.05, b, 0.22);
      ctx.fillStyle = 'rgba(50,52,54,0.9)';
      rect(l, boden + 0.95, b, 0.06);
      for (let s = l; s <= l + b + 0.01; s += 0.14) rect(s, boden + 0.17, 0.035, 0.8);
    }
  }

  // Hauptgesims: Fries mit Konsolen, Zahnschnitt, Ausladung mit Schattenkante
  const fries = tr - 1.0;
  ctx.fillStyle = rgb(a.farbe, -8);
  rect(0, fries, breite, 0.45);
  ctx.fillStyle = rgb(a.farbe, 26);
  for (let s = 0.2; s < breite; s += 0.8) rect(s, fries + 0.05, 0.22, 0.4);
  ctx.fillStyle = rgb(a.farbe, 20);
  rect(0, fries + 0.45, breite, 0.2);
  ctx.fillStyle = rgb(a.farbe, -30);
  for (let s = 0; s < breite; s += 0.24) rect(s, fries + 0.47, 0.1, 0.12);
  ctx.fillStyle = rgb(a.farbe, -60, 0.75);
  rect(0, fries + 0.65, breite, 0.1);
  ctx.fillStyle = rgb(a.farbe, 34);
  rect(0, fries + 0.75, breite, 0.25);

  // Dachfläche (schräg nach hinten, im Atlas direkt über dem Gesims)
  const dachVerlauf = ctx.createLinearGradient(0, y(tr + DACH_LAENGE), 0, y(tr));
  dachVerlauf.addColorStop(0, rgb(a.dach, 26));
  dachVerlauf.addColorStop(1, rgb(a.dach, -6));
  ctx.fillStyle = dachVerlauf;
  rect(0, tr, breite, DACH_LAENGE + 0.3);
  // Stehfalze
  ctx.fillStyle = rgb(a.dach, 16, 0.5);
  for (let s = 0.3; s < breite; s += 0.6) rect(s, tr, 0.04, DACH_LAENGE + 0.3);
  // Dachrinne
  ctx.fillStyle = rgb(a.dach, -40);
  rect(0, tr, breite, 0.12);
  // Gauben
  const gauben = 2 + Math.floor(z() * 2);
  for (let i = 0; i < gauben; i++) {
    const m = ((i + 0.5) / gauben) * breite + (z() - 0.5) * 1.2;
    const gb = 1.3;
    const unten = tr + 1.0;
    ctx.fillStyle = rgb(a.dach, 10);
    rect(m - gb / 2 - 0.15, unten, gb + 0.3, 1.7);
    ctx.fillStyle = 'rgb(70,76,84)';
    rect(m - gb / 2 + 0.1, unten + 0.2, gb - 0.2, 1.1);
    ctx.fillStyle = 'rgb(214,212,204)';
    rect(m - 0.03, unten + 0.2, 0.06, 1.1);
    ctx.fillStyle = rgb(a.dach, -20);
    ctx.beginPath();
    ctx.moveTo(rx(m - gb / 2 - 0.3), y(unten + 1.7));
    ctx.lineTo(rx(m + gb / 2 + 0.3), y(unten + 1.7));
    ctx.lineTo(rx(m), y(unten + 2.3));
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Malt den ganzen Atlas (Häuser, Straße, Himmel, Schornsteine, Brandwand).
 * @returns {THREE.CanvasTexture}
 */
function ausblickTextur() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const z = zufall(1892);

  HAUSARTEN.forEach((a, i) => maleHaus(ctx, i * ZELLE_B, a, z));

  // Straße: quer (Bildzeilen) von der eigenen Seite (unten) zur Gegenseite (oben), längs = Bildspalten
  {
    const { x, y, b, h } = BEREICH.strasse;
    const proM = h / STRASSE_BREITE;
    const zeile = (/** @type {number} */ t) => y + h - t * proM;
    ctx.fillStyle = 'rgb(132,128,121)';
    ctx.fillRect(x, y, b, h);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = z() < 0.5 ? 'rgba(96,92,86,0.35)' : 'rgba(160,156,148,0.3)';
      ctx.fillRect(x + z() * b, y + z() * h, 3, 2);
    }
    for (const [von, bis] of [[0, 3.6], [STRASSE_BREITE - 3.6, STRASSE_BREITE]]) {
      ctx.fillStyle = 'rgb(172,169,162)';
      ctx.fillRect(x, zeile(bis), b, (bis - von) * proM);
      ctx.fillStyle = 'rgba(120,118,112,0.6)';
      for (let s = 0; s < b; s += 26) ctx.fillRect(x + s, zeile(bis), 2, (bis - von) * proM);
    }
    // Bordsteine und Rinnsteine
    ctx.fillStyle = 'rgb(196,194,188)';
    ctx.fillRect(x, zeile(3.6) - 2, b, 4);
    ctx.fillRect(x, zeile(STRASSE_BREITE - 3.6) - 2, b, 4);
    ctx.fillStyle = 'rgba(70,68,64,0.7)';
    ctx.fillRect(x, zeile(3.8) - 2, b, 3);
    ctx.fillRect(x, zeile(STRASSE_BREITE - 3.8) - 1, b, 3);
  }

  // Himmel: bedeckt, oben etwas heller, zum Horizont dunstig; weiche Wolkenbänke
  {
    const { x, y, b, h } = BEREICH.himmel;
    const verlauf = ctx.createLinearGradient(0, y, 0, y + h);
    verlauf.addColorStop(0, 'rgb(236,239,241)');
    verlauf.addColorStop(0.55, 'rgb(229,233,235)');
    verlauf.addColorStop(0.9, 'rgb(220,224,226)');
    verlauf.addColorStop(1, 'rgb(218,222,224)');
    ctx.fillStyle = verlauf;
    ctx.fillRect(x, y, b, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, b, h);
    ctx.clip();
    for (let i = 0; i < 70; i++) {
      const cx = x + z() * b;
      const cy = y + z() * h * 0.92;
      const r = 40 + z() * 110;
      const dunkler = z() < 0.6;
      const farbe = dunkler ? '206,211,215' : '244,246,247';
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(${farbe},${dunkler ? 0.35 : 0.45})`);
      g.addColorStop(1, `rgba(${farbe},0)`);
      ctx.setTransform(3.2, 0, 0, 0.7, cx, cy);
      ctx.fillStyle = g;
      ctx.fillRect(-r, -r, 2 * r, 2 * r);
    }
    ctx.restore();
  }

  // Schornsteine: Ziegel oder verputzt, Abdeckplatte, oben verrußt
  {
    const { x, y, b, h } = BEREICH.schornstein;
    for (let k = 0; k < 8; k++) {
      const x0 = x + k * b;
      const verputzt = k % 3 === 2;
      const grund = verputzt ? [182, 172, 158] : k % 2 ? [146, 96, 78] : [128, 86, 72];
      ctx.fillStyle = rgb(grund);
      ctx.fillRect(x0, y, b, h);
      if (!verputzt) {
        ctx.fillStyle = 'rgba(190,180,168,0.45)';
        for (let r = 0; r < h; r += 8) {
          ctx.fillRect(x0, y + r, b, 1.5);
          for (let s = (r / 8) % 2 ? 0 : 8; s < b; s += 16) ctx.fillRect(x0 + s, y + r, 1.5, 8);
        }
      }
      const russ = ctx.createLinearGradient(0, y, 0, y + 70);
      russ.addColorStop(0, 'rgba(40,36,34,0.55)');
      russ.addColorStop(1, 'rgba(40,36,34,0)');
      ctx.fillStyle = russ;
      ctx.fillRect(x0, y, b, 70);
      ctx.fillStyle = 'rgb(168,166,160)';
      ctx.fillRect(x0, y + 4, b, 7);
      ctx.fillStyle = 'rgb(54,50,48)';
      ctx.fillRect(x0, y, b, 4);
    }
  }

  // Brandwand: schlichter Putz mit Flecken
  {
    const { x, y, b, h } = BEREICH.brandwand;
    ctx.fillStyle = 'rgb(176,168,154)';
    ctx.fillRect(x, y, b, h);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = z() < 0.6 ? 'rgba(130,122,110,0.18)' : 'rgba(200,194,182,0.2)';
      ctx.fillRect(x + z() * b, y + z() * h, 8 + z() * 50, 6 + z() * 30);
    }
  }

  // Sandstein der Sohlbänke unter den eigenen Fenstern (oben hell, Stirn und Seiten im Schatten)
  for (const [bereich, grund] of /** @type {const} */ ([[BEREICH.stein, [168, 163, 154]], [BEREICH.steinDunkel, [112, 108, 102]]])) {
    ctx.fillStyle = rgb(/** @type {number[]} */ ([...grund]));
    ctx.fillRect(bereich.x, bereich.y, bereich.b, bereich.h);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rgb(/** @type {number[]} */ ([...grund]), z() < 0.5 ? -14 : 10, 0.25);
      ctx.fillRect(bereich.x + z() * bereich.b, bereich.y + z() * bereich.h, 3 + z() * 8, 2 + z() * 5);
    }
  }

  // Schatten des Gitters auf der Sohlbank: Streifen dort, wo die Stäbe stehen (28–47 % der Tiefe von der Wand)
  {
    const { x, y, b, h } = BEREICH.stein;
    const schatten = ctx.createLinearGradient(0, y + h * (1 - 0.6), 0, y + h * (1 - 0.15));
    schatten.addColorStop(0, 'rgba(50,46,40,0)');
    schatten.addColorStop(0.4, 'rgba(50,46,40,0.45)');
    schatten.addColorStop(0.6, 'rgba(50,46,40,0.45)');
    schatten.addColorStop(1, 'rgba(50,46,40,0)');
    ctx.fillStyle = schatten;
    ctx.fillRect(x, y, b, h);
  }
  // Gold der Pfosten und Anker (mittlerer Ton des beleuchteten Gitters)
  ctx.fillStyle = 'rgb(196,128,48)';
  ctx.fillRect(BEREICH.gold.x, BEREICH.gold.y, BEREICH.gold.b, BEREICH.gold.h);

  const textur = new THREE.CanvasTexture(canvas);
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.anisotropy = 8;
  return textur;
}

/**
 * Sammelt Vierecke mit Atlas-Koordinaten in einer Geometrie.
 */
class Bauplan {
  constructor() {
    /** @type {number[]} */ this.pos = [];
    /** @type {number[]} */ this.uv = [];
    /** @type {number[]} */ this.dunst = [];
    /** @type {number[]} */ this.licht = [];
    /** @type {number[]} */ this.index = [];
  }

  /**
   * @param {number[][]} p vier Punkte [x, y, z]: unten links, unten rechts, oben rechts, oben links (vom Betrachter aus)
   * @param {{ x: number, y: number, b: number, h: number }} r Atlas-Bereich in Bildpunkten (y von oben)
   * @param {number} [dunst=1] 0 = ohne Entfernungsdunst und ohne Straßenschlucht (Himmel)
   * @param {number} [licht=1] Helligkeitsfaktor (Dächer heller, Himmelsrichtung)
   */
  viereck(p, r, dunst = 1, licht = 1) {
    const n = this.pos.length / 3;
    const u0 = r.x / W;
    const u1 = (r.x + r.b) / W;
    const v0 = 1 - (r.y + r.h) / H; // unten
    const v1 = 1 - r.y / H; // oben
    const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    for (let i = 0; i < 4; i++) {
      this.pos.push(...p[i]);
      this.uv.push(...uvs[i]);
      this.dunst.push(dunst);
      this.licht.push(licht);
    }
    this.index.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }

  geometrie() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('dunst', new THREE.Float32BufferAttribute(this.dunst, 1));
    geo.setAttribute('licht', new THREE.Float32BufferAttribute(this.licht, 1));
    geo.setIndex(this.index);
    return geo;
  }
}

/**
 * Eine Straße vor einer Außenwand. Lage über `ursprung` (Punkt auf der Wandaußenseite, [x, z]) und
 * `n` (Blickrichtung hinaus); s läuft entlang der Wand nach rechts (vom Betrachter aus), t hinaus.
 * Die Bereiche sind so begrenzt, dass sich die beiden Straßen an der Ecke nicht überlappen.
 * `licht`: Himmelsrichtung der gegenüberliegenden Fassade. Auch bei bedecktem Himmel ist der Himmel auf der
 * Sonnenseite (Süden) etwas heller: Südfassaden ein wenig heller als West- oder Ostfassaden (gering, ~10 %).
 * @typedef {{ ursprung: number[], n: number[], haeuser: number[], strasse: number[], himmel: number[], saat: number, licht: number }} Strasse
 */
/** @type {Strasse[]} */
const STRASSEN = [
  // Behrenstraße vor der Außenwand x = 9,5 (Blick nach +x, rechts = +z); Fassade gegenüber schaut nach Süden
  { ursprung: [9.5, 0], n: [1, 0], haeuser: [-64, 46], strasse: [-64, 28], himmel: [-200, 88], saat: 5, licht: 1.0 },
  // Friedrichstraße vor der Werkstattwand z = 28 (Blick nach +z, rechts = −x); Fassade gegenüber schaut nach Westen
  { ursprung: [0, 28], n: [0, 1], haeuser: [-27.5, 70], strasse: [-27.5, 70], himmel: [-69.5, 200], saat: 9, licht: 0.9 },
];

/**
 * @param {Bauplan} bp
 * @param {Strasse} st
 */
function baueStrasse(bp, st) {
  const [nx, nz] = st.n;
  const [ax, az] = [-nz, nx]; // rechts vom Betrachter
  const P = (/** @type {number} */ s, /** @type {number} */ t, /** @type {number} */ y) => [st.ursprung[0] + ax * s + nx * t, y, st.ursprung[1] + az * s + nz * t];
  const z = zufall(st.saat);
  const yG = STRASSE_Y;
  const tF = STRASSE_BREITE;

  // Straße
  {
    const [s0, s1] = st.strasse;
    bp.viereck([P(s0, 0, yG), P(s1, 0, yG), P(s1, tF, yG), P(s0, tF, yG)], BEREICH.strasse, 1, st.licht);
  }
  // Himmel weit hinten
  {
    const [s0, s1] = st.himmel;
    const t = HIMMEL_ABSTAND;
    bp.viereck([P(s0, t, yG), P(s1, t, yG), P(s1, t, HIMMEL_OBEN), P(s0, t, HIMMEL_OBEN)], BEREICH.himmel, 0);
  }

  // Häuserzeile gegenüber
  let s = st.haeuser[0];
  let vorher = -1;
  let traufeVorher = 0;
  while (s < st.haeuser[1] - 0.01) {
    let art = Math.floor(z() * HAUSARTEN.length);
    if (art === vorher) art = (art + 1) % HAUSARTEN.length;
    const a = HAUSARTEN[art];
    const volleBreite = 16 * (0.92 + z() * 0.16);
    const b = Math.min(volleBreite, st.haeuser[1] - s);
    const anteil = b / volleBreite;
    const tr = traufe(a);
    const yT = yG + tr;
    const x0 = art * ZELLE_B;
    // Fassade
    bp.viereck([P(s, tF, yG), P(s + b, tF, yG), P(s + b, tF, yT), P(s, tF, yT)],
      { x: x0, y: ZELLE_H - tr * PX, b: ZELLE_B * anteil, h: tr * PX }, 1, st.licht);
    // Dach (schräg nach hinten)
    bp.viereck([P(s, tF, yT), P(s + b, tF, yT), P(s + b, tF + DACH_TIEFE, yT + DACH_HOEHE), P(s, tF + DACH_TIEFE, yT + DACH_HOEHE)],
      { x: x0, y: ZELLE_H - (tr + DACH_LAENGE) * PX, b: ZELLE_B * anteil, h: DACH_LAENGE * PX }, 1, DACH_LICHT);
    // Brandwand zum Nachbarn, wo die Häuser verschieden hoch sind (Umriss des höheren Hauses)
    if (vorher >= 0 && Math.abs(tr - traufeVorher) > 0.05) {
      const hoch = Math.max(tr, traufeVorher);
      const tief = tF + DACH_TIEFE + 0.4;
      bp.viereck([P(s, tF, yG), P(s, tief, yG), P(s, tief, yG + hoch + DACH_HOEHE + 0.3), P(s, tF, yG + hoch + 0.3)], BEREICH.brandwand, 1, 0.95);
    }
    // Schornsteine auf dem Dach
    const anzahl = b > 6 ? 2 + Math.floor(z() * 2) : 1;
    for (let i = 0; i < anzahl; i++) {
      const sb = 0.9 + z() * 0.6;
      const sm = s + ((i + 0.5) / anzahl) * b + (z() - 0.5) * 2;
      if (sm - sb / 2 < s + 0.3 || sm + sb / 2 > s + b - 0.3) continue;
      const tc = tF + DACH_TIEFE * (0.35 + z() * 0.45);
      const fuss = yT + (DACH_HOEHE * (tc - tF)) / DACH_TIEFE - 0.3;
      const kopf = yT + DACH_HOEHE + 0.8 + z() * 1.6;
      const k = Math.floor(z() * 8);
      const r = BEREICH.schornstein;
      bp.viereck([P(sm - sb / 2, tc, fuss), P(sm + sb / 2, tc, fuss), P(sm + sb / 2, tc, kopf), P(sm - sb / 2, tc, kopf)],
        { x: r.x + k * r.b, y: r.y, b: r.b, h: (kopf - fuss) * PX }, 1, st.licht);
    }
    vorher = art;
    traufeVorher = tr;
    s += b;
  }
}

/** Sohlbank außen: Überstand vor der Wand, Höhe, seitlicher Überstand (Meter) */
const SOHLBANK = { tiefe: 0.16, hoehe: 0.18, seitlich: 0.15 };

/**
 * Steinerne Sohlbank außen unter einem eigenen Fenster: Darauf steht das vergoldete Brüstungsgitter
 * (bauteile.js, 6 cm vor der Wand), das sonst frei in der Luft hinge. Teil des Ausblick-Netzes, damit
 * Lichtdaten und Draw-Calls unverändert bleiben; ohne Dunst und Straßenschlucht (dunst = 0), die Helligkeit
 * steckt in den beiden Steinfarben.
 * @param {Bauplan} bp
 * @param {{ achse: string, ebene: number, min: number[], max: number[] }} f
 */
function sohlbank(bp, f) {
  const P = (/** @type {number} */ a, /** @type {number} */ t, /** @type {number} */ y) => (f.achse === 'x' ? [f.ebene + t, y, a] : [a, y, f.ebene + t]);
  const a0 = f.min[0] - SOHLBANK.seitlich;
  const a1 = f.max[0] + SOHLBANK.seitlich;
  const oben = f.min[1];
  const unten = oben - SOHLBANK.hoehe;
  const t = SOHLBANK.tiefe;
  bp.viereck([P(a0, 0, oben), P(a1, 0, oben), P(a1, t, oben), P(a0, t, oben)], BEREICH.stein, 0);
  bp.viereck([P(a0, t, unten), P(a1, t, unten), P(a1, t, oben), P(a0, t, oben)], BEREICH.steinDunkel, 0);
  bp.viereck([P(a0, 0, unten), P(a0, t, unten), P(a0, t, oben), P(a0, 0, oben)], BEREICH.steinDunkel, 0);
  bp.viereck([P(a1, 0, unten), P(a1, t, unten), P(a1, t, oben), P(a1, 0, oben)], BEREICH.steinDunkel, 0);
  // Brüstungsgitter (bauteile.js): Stäbe 6 cm vor der Wand (t 0,045 … 0,075), Handlauf bei 0,95 m.
  // Je Seite ein Endpfosten an der Öffnungskante und ein Wandanker vom Handlauf zur Wand (schließt den Spalt)
  const ta = 0.045;
  const tb = 0.075;
  const handlauf = Math.max(0.95, oben + 0.3);
  for (const [kante, aussen] of [[f.min[0], -1], [f.max[0], 1]]) {
    const innen = kante - aussen * 0.025;
    kasten(bp, P, Math.min(kante, innen), Math.max(kante, innen), ta, tb, oben, handlauf + 0.02);
    const wand = kante + aussen * 0.08;
    kasten(bp, P, Math.min(kante, wand), Math.max(kante, wand), 0, tb, handlauf - 0.03, handlauf + 0.02);
  }
}

/**
 * Kleiner Quader in Gold ohne Rückseite (die liegt an der Wand), für Pfosten und Anker.
 * @param {Bauplan} bp
 * @param {(a: number, t: number, y: number) => number[]} P
 * @param {number} a0 @param {number} a1 entlang der Wand
 * @param {number} t0 @param {number} t1 vor der Wand
 * @param {number} y0 @param {number} y1 Höhe
 */
function kasten(bp, P, a0, a1, t0, t1, y0, y1) {
  const g = BEREICH.gold;
  bp.viereck([P(a0, t1, y0), P(a1, t1, y0), P(a1, t1, y1), P(a0, t1, y1)], g, 0);
  bp.viereck([P(a0, t0, y1), P(a1, t0, y1), P(a1, t1, y1), P(a0, t1, y1)], g, 0);
  bp.viereck([P(a0, t0, y0), P(a1, t0, y0), P(a1, t1, y0), P(a0, t1, y0)], g, 0);
  bp.viereck([P(a0, t0, y0), P(a0, t1, y0), P(a0, t1, y1), P(a0, t0, y1)], g, 0);
  bp.viereck([P(a1, t0, y0), P(a1, t1, y0), P(a1, t1, y1), P(a1, t0, y1)], g, 0);
}

/**
 * Baut den Straßenausblick für beide Außenwände als ein Netz.
 * @param {{ achse: string, ebene: number, min: number[], max: number[] }[]} [fenster=[]] Fensteröffnungen in der
 *   Außenebene der Wand (wie `lichtFenster` in etage3.js); jedes bekommt außen eine Sohlbank.
 * @returns {{ mesh: THREE.Mesh, werte: Record<string, { value: any }> }}
 *   `werte` sind die Shader-Werte von Dunst und Straßenschlucht (zum Abstimmen über __debug).
 */
export function baueAusblick(fenster = []) {
  const bp = new Bauplan();
  for (const st of STRASSEN) baueStrasse(bp, st);
  for (const f of fenster) sohlbank(bp, f);
  const werte = {
    // Dunstfarbe wie der Himmel am Horizont; Weite: nach so vielen Metern ist der Dunst zu 63 % dicht
    dunstFarbe: { value: new THREE.Color(0xdde1e3) },
    dunstWeite: { value: 110 },
    dunstMax: { value: 0.7 },
    // Straßenschlucht: zwischen den Häusern sieht jede Stelle nur einen Teil des Himmels. Die Helligkeit
    // steigt von der Straße (schluchtUnten) bis zur Traufhöhe (schluchtHoehe über der Straße, schluchtOben)
    strasseY: { value: STRASSE_Y },
    schluchtHoehe: { value: 22 },
    schluchtUnten: { value: 0.3 },
    schluchtOben: { value: 0.55 },
  };
  const material = new THREE.MeshBasicMaterial({ map: ausblickTextur(), toneMapped: false, side: THREE.DoubleSide, fog: false });
  material.onBeforeCompile = (/** @type {any} */ shader) => {
    // Dieselben Uniform-Objekte für beide Shader-Fassungen (siehe belichtung-v1)
    Object.assign(shader.uniforms, werte);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float dunst;\nattribute float licht;\nvarying float vDunst;\nvarying float vLicht;\nvarying vec3 vAusblickWelt;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tvDunst = dunst;\n\tvLicht = licht;\n\tvAusblickWelt = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDunst;\nvarying float vLicht;\nvarying vec3 vAusblickWelt;\nuniform vec3 dunstFarbe;\nuniform float dunstWeite;\nuniform float dunstMax;\nuniform float strasseY;\nuniform float schluchtHoehe;\nuniform float schluchtUnten;\nuniform float schluchtOben;')
      .replace('#include <opaque_fragment>', [
        // Straßenschlucht und Lichtfaktor (nicht für Himmel und Sohlbänke, erkennbar an dunst = 0)
        'float schlucht = mix( schluchtUnten, schluchtOben, smoothstep( 0.0, 1.0, ( vAusblickWelt.y - strasseY ) / schluchtHoehe ) );',
        'outgoingLight *= mix( 1.0, schlucht * vLicht, step( 0.5, vDunst ) );',
        'float ausblickDunst = vDunst * min( 1.0 - exp( - distance( vAusblickWelt, cameraPosition ) / dunstWeite ), dunstMax );',
        'outgoingLight = mix( outgoingLight, dunstFarbe, ausblickDunst );',
        '#include <opaque_fragment>',
      ].join('\n\t'));
  };
  material.customProgramCacheKey = () => 'ausblick';
  const mesh = new THREE.Mesh(bp.geometrie(), material);
  mesh.name = 'ausblick';
  // Nicht Teil der Lichtberechnung (MeshBasic wird dort ohnehin übergangen)
  mesh.userData.keinLichtModell = true;
  return { mesh, werte };
}
