// Stuck und Gold (Feinschliff D): Ornament-Texturen und Texturkoordinaten für Gesims, Deckenrahmen,
// Rosette und Kapitell. Rokoko-angelehnt und stilisiert; Muster und Formen sind Annahme (belegt nur
// „Rococoschmuck“ und „Goldstuck-Decken“, Werbeblatt 1888).
// Das Relief des Stucks ist in die Farbe eingemalt (Licht von oben links), weil die Räume ihr Licht nur
// aus Lichtkarte und Lichtgitter bekommen – Normalenkarten wirken auf den matten Stuck dort nicht.
// Gold spiegelt die Umgebung; dort bricht eine Normalenkarte die Spiegelung am Relief.
import * as THREE from 'three';
import { leinwand, alsTextur } from './texturen.js';

/**
 * Aufteilung der Stucktextur (1024 × 1024): Zeilen [oben, unten] in Bildpunkten; Bänder wiederholen sich
 * waagerecht alle `periode` Bildpunkte (Perlstab alle `perlPeriode`). Rosette als Quadrat [x0, y0, x1, y1].
 */
export const STUCK = {
  breite: 1024, hoehe: 1024, periode: 256, perlPeriode: 64,
  fries: [0, 128], rahmen: [128, 256], perlen: [256, 320], profil: [320, 384], glatt: [384, 512],
  rosette: [0, 512, 512, 1024],
};

/** Aufteilung der Goldtextur (1024 × 512): Perlstab, glatt, Blattkranz des Kapitells (4 Blätter je Breite) */
export const GOLD = { breite: 1024, hoehe: 512, perlPeriode: 64, blattPeriode: 256, perlen: [0, 64], glatt: [64, 128], blaetter: [128, 512] };

const STUCK_GRUND = '#e8e2d4';
const STUCK_TIEF = '#d0c6b0';
const STUCK_HELL = '#fffcf4';
// Erhabene Teile etwas heller als der vertiefte Grund
const STUCK_ERHABEN = '#f0ebdf';
const STUCK_SCHATTEN = 'rgba(90,72,46,0.72)';

/**
 * @typedef {{ grund?: string, hell?: string, dunkel?: string, v?: number }} Farben
 */

/**
 * Zeichnet eine Form als Relief: Schatten nach rechts unten, Licht nach links oben, dann die Form selbst.
 * @param {CanvasRenderingContext2D} ctx
 * @param {(farbe: string) => void} zeichne zeichnet die Form mit der Farbe (Füllung oder Strich)
 * @param {Farben} [o]
 */
function relief(ctx, zeichne, { grund = STUCK_ERHABEN, hell = STUCK_HELL, dunkel = STUCK_SCHATTEN, v = 3 } = {}) {
  // Versatz in Bildschirmrichtung, auch in gedrehten Zeichenlagen (Licht bleibt oben links)
  const m = ctx.getTransform();
  const versetzt = (/** @type {number} */ d, /** @type {string} */ farbe) => {
    ctx.save();
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e + d, m.f + d);
    zeichne(farbe);
    ctx.restore();
  };
  versetzt(v, dunkel);
  versetzt(-v * 0.6, hell);
  zeichne(grund);
}

/** Pfad füllen (für relief) */
const fuelle = (/** @type {CanvasRenderingContext2D} */ ctx, /** @type {() => void} */ pfad) => (/** @type {string} */ f) => {
  ctx.fillStyle = f;
  ctx.beginPath();
  pfad();
  ctx.fill();
};
/** Pfad ziehen (für relief) */
const ziehe = (/** @type {CanvasRenderingContext2D} */ ctx, /** @type {() => void} */ pfad, /** @type {number} */ breite) => (/** @type {string} */ f) => {
  ctx.strokeStyle = f;
  ctx.lineWidth = breite;
  ctx.lineCap = 'round';
  ctx.beginPath();
  pfad();
  ctx.stroke();
};

/**
 * Zeile [y0, y1] beschneiden und mit Grund füllen (danach ctx.restore()); liefert die Mitte.
 * @param {CanvasRenderingContext2D} ctx @param {number[]} bereich @param {number} breite @param {string} grund
 */
function zeile(ctx, [y0, y1], breite, grund) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, breite, y1 - y0);
  ctx.clip();
  ctx.fillStyle = grund;
  ctx.fillRect(0, y0, breite, y1 - y0);
  return (y0 + y1) / 2;
}

/** Erhabene Randleiste (Plättchen) oben und unten in einer Zeile */
function randleisten(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number[]} */ [y0, y1], /** @type {number} */ breite, /** @type {number} */ dicke) {
  relief(ctx, fuelle(ctx, () => ctx.rect(-10, y0 + 3, breite + 20, dicke)), { v: 2 });
  relief(ctx, fuelle(ctx, () => ctx.rect(-10, y1 - 3 - dicke, breite + 20, dicke)), { v: 2 });
}

/**
 * C-Schwung mit eingerollter Spitze (Rocaille), beginnt im Ursprung, läuft nach +x, Größe s.
 * @param {CanvasRenderingContext2D} ctx @param {number} s
 */
function cSchwung(ctx, s) {
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(s * 0.35, -s * 0.45, s * 0.8, -s * 0.4, s * 0.9, -s * 0.05);
  ctx.arc(s * 0.78, -s * 0.05, s * 0.12, 0, Math.PI * 1.6);
}

/** Spitzes Blatt von (0, 0) nach (l, bogen), Breite b */
function blatt(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ l, /** @type {number} */ b, bogen = 0) {
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(l * 0.45, -b, l, bogen);
  ctx.quadraticCurveTo(l * 0.45, b, 0, 0);
}

/** Muschel (Fächer aus Rippen), Fuß im Ursprung, öffnet nach −y, Radius r */
function muschel(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ r, /** @type {Farben} */ farben = {}) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + ((i - (n - 1) / 2) / (n - 1)) * Math.PI * 0.85;
    const da = 0.11;
    relief(ctx, fuelle(ctx, () => {
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - da) * r, Math.sin(a - da) * r);
      ctx.quadraticCurveTo(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12, Math.cos(a + da) * r, Math.sin(a + da) * r);
      ctx.closePath();
    }), { v: 1.8, ...farben });
  }
  relief(ctx, fuelle(ctx, () => ctx.ellipse(0, 0, r * 0.22, r * 0.16, 0, 0, Math.PI * 2)), { v: 1.5, ...farben });
}

/** Perlstab: Perle und zwei Scheibchen je Periode, Mitte my, Zeilenhöhe hoehe */
function perlstab(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ breite, /** @type {number} */ my, /** @type {number} */ hoehe, /** @type {number} */ periode, /** @type {Farben} */ farben = {}) {
  for (let x0 = -periode; x0 < breite + periode; x0 += periode) {
    relief(ctx, fuelle(ctx, () => ctx.ellipse(x0 + periode * 0.34, my, periode * 0.26, hoehe * 0.34, 0, 0, Math.PI * 2)), { v: 2, ...farben });
    for (const dx of [0.74, 0.9]) {
      relief(ctx, fuelle(ctx, () => ctx.ellipse(x0 + periode * dx, my, periode * 0.05, hoehe * 0.26, 0, 0, Math.PI * 2)), { v: 1.5, ...farben });
    }
  }
}

/** Stucktextur (Farbe mit eingemaltem Relief), Aufteilung siehe STUCK */
export function stuckTextur() {
  const { breite: B, periode: P } = STUCK;
  const { canvas, ctx } = leinwand(B, STUCK.hoehe);
  ctx.fillStyle = STUCK_GRUND;
  ctx.fillRect(0, 0, B, STUCK.hoehe);

  // Fries des Gesimses: Muschel in der Mitte, C-Schwünge mit Blättern zu beiden Seiten
  let my = zeile(ctx, STUCK.fries, B, STUCK_TIEF);
  randleisten(ctx, STUCK.fries, B, 9);
  for (let x0 = -P; x0 < B + P; x0 += P) {
    const cx = x0 + P / 2;
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + sx * 24, my + 16);
      ctx.scale(sx, 1);
      relief(ctx, ziehe(ctx, () => cSchwung(ctx, 92), 7));
      for (const [bx, by, w] of [[38, -18, -0.5], [64, -16, 0.4], [18, 2, 0.3]]) {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(w);
        relief(ctx, fuelle(ctx, () => blatt(ctx, 22, 7, 2)), { v: 1.8 });
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(cx, my + 24);
    muschel(ctx, 40);
    ctx.restore();
    // kleine Blüte zwischen den Gruppen
    relief(ctx, fuelle(ctx, () => ctx.arc(x0, my + 4, 6, 0, Math.PI * 2)), { v: 1.5 });
  }
  ctx.restore();

  // Band des Deckenrahmens: wellenförmige Ranke mit Einrollungen und Blättern
  my = zeile(ctx, STUCK.rahmen, B, STUCK_TIEF);
  randleisten(ctx, STUCK.rahmen, B, 8);
  const welle = (/** @type {number} */ x) => my + 22 * Math.sin((x / P) * Math.PI * 2);
  relief(ctx, ziehe(ctx, () => {
    ctx.moveTo(-20, welle(-20));
    for (let x = -20; x <= B + 20; x += 4) ctx.lineTo(x, welle(x));
  }, 7));
  for (let x0 = -P; x0 < B + P; x0 += P) {
    for (const [xa, seite] of [[P * 0.25, 1], [P * 0.75, -1]]) {
      // Einrollung vom Wellenberg zur Mitte hin, zwei Blätter daneben
      ctx.save();
      ctx.translate(x0 + xa - 10, welle(x0 + xa));
      ctx.scale(1, seite);
      relief(ctx, ziehe(ctx, () => cSchwung(ctx, 44), 5));
      ctx.restore();
      for (const w of [-1, 1]) {
        const xb = x0 + xa + w * 30;
        ctx.save();
        ctx.translate(xb, welle(xb));
        ctx.rotate(-seite * Math.PI / 2 + w * 0.6);
        relief(ctx, fuelle(ctx, () => blatt(ctx, 24, 7, 3)), { v: 1.8 });
        ctx.restore();
      }
    }
    relief(ctx, fuelle(ctx, () => ctx.arc(x0, my, 7, 0, Math.PI * 2)), { v: 1.5 });
  }
  ctx.restore();

  // Perlstab
  my = zeile(ctx, STUCK.perlen, B, STUCK_TIEF);
  perlstab(ctx, B, my, STUCK.perlen[1] - STUCK.perlen[0], STUCK.perlPeriode);
  ctx.restore();

  // Profil: Kehle von hell nach dunkel (Unterseiten, kleine Leisten)
  zeile(ctx, STUCK.profil, B, STUCK_GRUND);
  const g = ctx.createLinearGradient(0, STUCK.profil[0], 0, STUCK.profil[1]);
  g.addColorStop(0, '#f6f1e6');
  g.addColorStop(0.55, STUCK_GRUND);
  g.addColorStop(1, '#cfc6b3');
  ctx.fillStyle = g;
  ctx.fillRect(0, STUCK.profil[0], B, STUCK.profil[1] - STUCK.profil[0]);
  ctx.restore();

  maleRosette(ctx);
  return alsTextur(canvas);
}

/** Deckenrosette: Akanthuskranz, Perlring, Muschelblätter, Knauf */
function maleRosette(/** @type {CanvasRenderingContext2D} */ ctx) {
  const [x0, y0, x1, y1] = STUCK.rosette;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  const ring = (/** @type {number} */ r, /** @type {number} */ d) => relief(ctx, ziehe(ctx, () => ctx.arc(cx, cy, r, 0, Math.PI * 2), d), { v: 1.8 });
  const rippe = { grund: '#cbc2ae', v: 1 };
  // vertiefter Grund der Rosette
  ctx.fillStyle = STUCK_TIEF;
  ctx.beginPath();
  ctx.arc(cx, cy, 246, 0, Math.PI * 2);
  ctx.fill();
  ring(244, 6);
  // äußerer Kranz: 20 Akanthusblätter mit leicht umgebogener Spitze
  for (let i = 0; i < 20; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 20) * Math.PI * 2);
    ctx.translate(122, 0);
    relief(ctx, fuelle(ctx, () => blatt(ctx, 112, 30, 10)));
    relief(ctx, ziehe(ctx, () => { ctx.moveTo(6, 0); ctx.quadraticCurveTo(60, 1, 100, 8); }, 2.5), rippe);
    for (const sy of [-1, 1]) relief(ctx, ziehe(ctx, () => { ctx.moveTo(40, sy * 3); ctx.lineTo(62, sy * 15); }, 2), rippe);
    ctx.restore();
  }
  // Perlring
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    relief(ctx, fuelle(ctx, () => ctx.arc(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112, 6.5, 0, Math.PI * 2)), { v: 1.5 });
  }
  ring(100, 4);
  // innerer Kranz: acht Muschelblätter
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.translate(0, -40);
    muschel(ctx, 48);
    ctx.restore();
  }
  // Knauf
  const k = ctx.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, 40);
  k.addColorStop(0, STUCK_HELL);
  k.addColorStop(0.6, STUCK_GRUND);
  k.addColorStop(1, '#bfb5a0');
  ctx.fillStyle = k;
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Goldornamente: Farbe (Gold mit dunklen Fugen) und Normalenkarte aus der Helligkeit. Aufteilung siehe GOLD.
 * @returns {{ farbe: THREE.CanvasTexture, normalen: THREE.CanvasTexture }}
 */
export function goldTexturen() {
  const { breite: B, hoehe: H } = GOLD;
  const { canvas, ctx } = leinwand(B, H);
  /** @type {Farben} */
  const gold = { grund: '#dcb35a', hell: '#f7dc94', dunkel: 'rgba(70,45,12,0.75)' };
  ctx.fillStyle = '#d8ae52';
  ctx.fillRect(0, 0, B, H);

  // Perlstab
  let my = zeile(ctx, GOLD.perlen, B, '#7a5a26');
  perlstab(ctx, B, my, GOLD.perlen[1] - GOLD.perlen[0], GOLD.perlPeriode, gold);
  ctx.restore();

  // Blattkranz des Kapitells: 4 Blätter je Breite, Spitze nach außen eingerollt, kleine Voluten dazwischen
  my = zeile(ctx, GOLD.blaetter, B, '#a87c34');
  const [b0, b1] = GOLD.blaetter;
  const hb = b1 - b0;
  const P = GOLD.blattPeriode;
  /** @type {Farben} */
  const fuge = { grund: '#7a5a26', hell: '#f2d48a', dunkel: 'rgba(50,30,8,0.5)', v: 1.2 };
  for (let x0 = -P; x0 < B + P; x0 += P) {
    const cx = x0 + P / 2;
    relief(ctx, ziehe(ctx, () => ctx.arc(x0, b0 + 60, 22, Math.PI * 0.2, Math.PI * 2.0), 10), gold);
    relief(ctx, fuelle(ctx, () => {
      ctx.moveTo(cx - 96, b1);
      ctx.bezierCurveTo(cx - 120, b1 - hb * 0.45, cx - 70, b0 + 80, cx - 18, b0 + 46);
      ctx.quadraticCurveTo(cx + 10, b0 + 18, cx + 34, b0 + 40);
      ctx.bezierCurveTo(cx + 70, b0 + 80, cx + 120, b1 - hb * 0.45, cx + 96, b1);
      ctx.closePath();
    }), gold);
    relief(ctx, ziehe(ctx, () => ctx.arc(cx + 16, b0 + 40, 16, Math.PI, Math.PI * 2.7), 8), gold);
    relief(ctx, ziehe(ctx, () => { ctx.moveTo(cx, b1 - 6); ctx.quadraticCurveTo(cx - 4, b0 + hb * 0.4, cx + 6, b0 + 62); }, 4), fuge);
    for (const sx of [-1, 1]) {
      for (const t of [0.3, 0.55, 0.78]) {
        const y = b0 + hb * t;
        relief(ctx, ziehe(ctx, () => { ctx.moveTo(cx + sx * 6, y + 30); ctx.quadraticCurveTo(cx + sx * 40, y + 6, cx + sx * (60 + t * 30), y - 4); }, 3), fuge);
      }
    }
  }
  ctx.restore();
  const farbe = alsTextur(canvas);

  // Normalenkarte aus der weichgezeichneten Helligkeit: hell = erhaben
  const { canvas: nc, ctx: nctx } = leinwand(B, H);
  nctx.filter = 'blur(1.5px)';
  nctx.drawImage(canvas, 0, 0);
  nctx.filter = 'none';
  const hoehe = nctx.getImageData(0, 0, B, H).data;
  const aus = nctx.createImageData(B, H);
  const h = (/** @type {number} */ x, /** @type {number} */ y) => {
    const i = (Math.min(H - 1, Math.max(0, y)) * B + ((x + B) % B)) * 4;
    return (hoehe[i] * 0.3 + hoehe[i + 1] * 0.55 + hoehe[i + 2] * 0.15) / 255;
  };
  const staerke = 3;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < B; x++) {
      const du = (h(x + 1, y) - h(x - 1, y)) * staerke;
      const dv = (h(x, y - 1) - h(x, y + 1)) * staerke;
      const l = Math.hypot(du, dv, 1);
      const i = (y * B + x) * 4;
      aus.data[i] = (-du / l * 0.5 + 0.5) * 255;
      aus.data[i + 1] = (-dv / l * 0.5 + 0.5) * 255;
      aus.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      aus.data[i + 3] = 255;
    }
  }
  nctx.putImageData(aus, 0, 0);
  const normalen = alsTextur(nc);
  normalen.colorSpace = THREE.NoColorSpace;
  return { farbe, normalen };
}

// ---------- Texturkoordinaten ----------

/**
 * Band-Koordinaten für einen Quader (eigene BoxGeometry, nicht die geteilte Einheitsbox): jede Seite zeigt
 * die Zeile [y0, y1] der Textur, entlang der längeren waagerechten Achse wiederholt. Quer zur Zeile ist auf
 * senkrechten Seiten die Höhe, auf waagerechten die kürzere waagerechte Kante. Die Musterlänge ergibt sich
 * aus dem Seitenverhältnis der Zeile (Ornament unverzerrt).
 * @param {THREE.BoxGeometry} geo
 * @param {number[]} bereich Zeile [y0, y1] in Bildpunkten von oben
 * @param {{ breite: number, hoehe: number }} tex Größe der Textur
 * @param {number} periodePx Musterlänge in Bildpunkten
 */
export function bandUV(geo, [y0, y1], tex, periodePx) {
  const p = geo.parameters;
  const langX = p.width >= p.depth;
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const uv = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('uv'));
  const zeilenPx = y1 - y0;
  const rand = 2;
  for (let i = 0; i < uv.count; i++) {
    const waagerecht = Math.abs(nor.getY(i)) > 0.5;
    const stirn = Math.abs(langX ? nor.getX(i) : nor.getZ(i)) > 0.5;
    const entlang = stirn ? (langX ? pos.getZ(i) : pos.getX(i)) : (langX ? pos.getX(i) : pos.getZ(i));
    const quer = waagerecht ? (langX ? pos.getZ(i) : pos.getX(i)) : pos.getY(i);
    const querGr = waagerecht ? (langX ? p.depth : p.width) : p.height;
    const periodeM = (periodePx * querGr) / zeilenPx;
    const t = quer / querGr + 0.5;
    const y = y1 - rand - t * (zeilenPx - 2 * rand);
    uv.setXY(i, (entlang / periodeM) * (periodePx / tex.breite), 1 - y / tex.hoehe);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Alle Punkte auf eine Stelle der Textur (einfarbige Teile, z. B. Voluten auf glattem Gold).
 * @param {THREE.BufferGeometry} geo @param {number[]} bereich Zeile [y0, y1] @param {{ hoehe: number }} tex
 */
export function flachUV(geo, [y0, y1], tex) {
  const uv = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('uv'));
  const v = 1 - (y0 + y1) / 2 / tex.hoehe;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, v);
  uv.needsUpdate = true;
  return geo;
}

/**
 * Deckenrosette als flache, nach unten gewölbte Drehform mit Ornament von unten (Draufsicht-Abbildung).
 * Ursprung an der Decke, Radius r.
 * @param {number} r
 */
export function rosettenGeometrie(r) {
  // Profil von der Mitte (unten, Knauf) zum Rand (an der Decke)
  const profil = [[0, -0.13], [0.05, -0.125], [0.075, -0.1], [0.08, -0.075], [0.12, -0.068], [0.25, -0.07], [0.42, -0.06], [0.5, -0.04], [0.58, -0.022], [0.6, -0.005], [0.6, 0]]
    .map(([x, y]) => new THREE.Vector2((x / 0.6) * r, y * (r / 0.6)));
  const geo = new THREE.LatheGeometry(profil, 48);
  const pos = geo.getAttribute('position');
  const uv = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('uv'));
  const [x0, y0, x1, y1] = STUCK.rosette;
  for (let i = 0; i < uv.count; i++) {
    // Draufsicht: x, z → Rosettenquadrat (Ornament-Rand bei 244 von 256 Bildpunkten Radius)
    const s = 244 / 256;
    const px = (x0 + x1) / 2 + (pos.getX(i) / r) * s * ((x1 - x0) / 2);
    const py = (y0 + y1) / 2 + (pos.getZ(i) / r) * s * ((y1 - y0) / 2);
    uv.setXY(i, px / STUCK.breite, 1 - py / STUCK.hoehe);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Kapitell als Glocke (Drehform) mit Blattkranz; unten Radius r0, oben r1, Höhe h.
 * @param {number} r0 @param {number} r1 @param {number} h
 */
export function kapitellGeometrie(r0, r1, h) {
  const profil = [[0, 0], [0.04, 0.12], [0.15, 0.3], [0.35, 0.55], [0.65, 0.8], [1, 1]]
    .map(([t, y]) => new THREE.Vector2(r0 + (r1 - r0) * t, y * h));
  const geo = new THREE.LatheGeometry(profil, 24);
  const uv = /** @type {THREE.BufferAttribute} */ (geo.getAttribute('uv'));
  const [b0, b1] = GOLD.blaetter;
  // 8 Blätter rundum: Textur zeigt 4 je Breite → u verdoppeln
  for (let i = 0; i < uv.count; i++) {
    const y = b1 - 2 - uv.getY(i) * (b1 - b0 - 4);
    uv.setXY(i, uv.getX(i) * 2, 1 - y / GOLD.hoehe);
  }
  uv.needsUpdate = true;
  return geo;
}
