// Ausstattung der Werkstatt (III. Etage, z 19,75 … 27,5) – Auftrag 2, November 2026.
//
// Grundlage: Werkstattbericht „Hinter den Coulissen des Panoptikums“, Berliner Morgenpost 16. 11. 1898
// (Passage-Panopticum Berlin, 5 Zeichnungen) und Lehrbücher zum Modellieren in Ton und Wachs (London 1891/92);
// Fundstellen in .claude/notizen/holmes-quellen.md.
// Belegt (Zeichnungen/Text 1898): Wandbord mit Gipsköpfen, angelehnte Bretter, niedriger Holzkasten zum
// Eingipsen, Gipsbrocken, Büste auf Brett über einem Hocker mit runder Sitzplatte (Bemalen), Kopf liegend auf
// rundem Tisch (Frisieren), helle Arbeitskittel, Gipskörper, Wachshände, Glasaugen, Echthaar.
// Lehrbücher (nicht Berlin): Modellierbock mit Drehplatte, Tonkiste mit Zinkblech.
// Angenommen: alle Maße, Aufstellung, Farben, Wandhaken, Näpfchen; die Werkstatt-Köpfe bleiben unbemalt
// (keine Gesichter der Besetzung, damit nichts wie ein Hinweis wirkt).
import * as THREE from 'three';
import { box } from './bauteile.js';
import { kopf, hand } from './menschen.js';
import { holzTextur } from './texturen.js';

/**
 * @typedef {import('steuerung/kollision.js').Hindernis} Hindernis
 * @typedef {ReturnType<typeof import('./bauteile.js').erstelleMaterialien>} Materialien
 */

/** Feuchter Ton (grau-braun) und Zinkblech (Farben angenommen) */
const ton = new THREE.MeshLambertMaterial({ color: 0x75685a });
const zink = new THREE.MeshLambertMaterial({ color: 0x8e9396 });
const glasauge = new THREE.MeshLambertMaterial({ color: 0xf2efe8 });
/** Bretter: Maserung längs (Textur um 90° gedreht), zwei Holztöne */
const planke = [[150, 112, 72, 51], [124, 92, 60, 52]].map(([r, g, b, saat]) => {
  const tex = holzTextur([r, g, b], saat);
  tex.center.set(0.5, 0.5);
  tex.rotation = Math.PI / 2;
  tex.repeat.set(1, 0.3);
  return new THREE.MeshLambertMaterial({ map: tex });
});
/**
 * Skizzenblätter: Kohlestudien von Köpfen (gezeichnet, nicht belegt). Drei verschiedene Blätter:
 * 0 = Kopf von vorn und im Profil, 1 = großes Profil mit Augenstudien, 2 = Frauenkopf mit Ohr- und Nasenstudie.
 */
const skizzen = [0, 1, 2].map((variante) => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  x.fillStyle = ['#e0d6ba', '#ddd3b6', '#e3dac0'][variante];
  x.fillRect(0, 0, 256, 512);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  const kohle = 'rgba(38,34,30,0.8)';
  /** @param {() => void} f */
  const strich = (f) => { x.beginPath(); f(); x.stroke(); };
  /** Zeichenbereich verschieben/skalieren; Strichstärke bleibt gleich. @param {number} dx @param {number} dy @param {number} s @param {() => void} f */
  const bereich = (dx, dy, s, f) => {
    x.save(); x.translate(dx, dy); x.scale(s, s);
    x.strokeStyle = kohle; x.fillStyle = kohle; x.lineWidth = 3 / s;
    f();
    x.restore();
  };
  /** Kopf von vorn (Bereich 0–256 × 0–256). @param {boolean} knoten Haarknoten statt Scheitel */
  const vorn = (knoten) => {
    strich(() => {
      x.moveTo(128, 44);
      x.bezierCurveTo(176, 44, 184, 110, 178, 140);
      x.bezierCurveTo(170, 182, 150, 206, 128, 208);
      x.bezierCurveTo(106, 206, 86, 182, 78, 140);
      x.bezierCurveTo(72, 110, 80, 44, 128, 44);
    });
    strich(() => {
      x.moveTo(78, 124); x.bezierCurveTo(64, 52, 100, 24, 128, 26);
      x.bezierCurveTo(158, 24, 194, 52, 178, 124);
      if (knoten) { // straff zurückgekämmt, Knoten oben
        x.moveTo(100, 34); x.quadraticCurveTo(110, 60, 104, 90);
        x.moveTo(156, 34); x.quadraticCurveTo(146, 60, 152, 90);
        x.moveTo(146, 14); x.arc(128, 14, 18, 0, Math.PI * 2);
      } else { // Seitenscheitel
        x.moveTo(116, 28); x.quadraticCurveTo(100, 50, 84, 96);
        x.moveTo(116, 28); x.quadraticCurveTo(150, 46, 174, 92);
      }
    });
    strich(() => {
      x.moveTo(90, 106); x.quadraticCurveTo(104, 98, 118, 106);
      x.moveTo(138, 106); x.quadraticCurveTo(152, 98, 166, 106);
      x.moveTo(92, 120); x.quadraticCurveTo(105, 110, 118, 120); x.quadraticCurveTo(105, 127, 92, 120);
      x.moveTo(138, 120); x.quadraticCurveTo(151, 110, 164, 120); x.quadraticCurveTo(151, 127, 138, 120);
      x.moveTo(124, 122); x.lineTo(118, 154); x.quadraticCurveTo(128, 162, 140, 154);
      x.moveTo(108, 178); x.quadraticCurveTo(118, 172, 128, 176); x.quadraticCurveTo(138, 172, 148, 178);
      x.moveTo(112, 179); x.quadraticCurveTo(128, 188, 144, 179);
      x.moveTo(79, 122); x.quadraticCurveTo(64, 136, 80, 154);
      x.moveTo(177, 122); x.quadraticCurveTo(192, 136, 176, 154);
      x.moveTo(108, 202); x.lineTo(106, 236); x.quadraticCurveTo(76, 242, 44, 252);
      x.moveTo(148, 202); x.lineTo(150, 236); x.quadraticCurveTo(180, 242, 212, 252);
    });
    x.beginPath(); x.arc(105, 119, 3.5, 0, Math.PI * 2); x.arc(151, 119, 3.5, 0, Math.PI * 2); x.fill();
  };
  /** Kopf im Profil, Blick nach rechts (Bereich 0–256 × 0–256) */
  const profil = () => {
    strich(() => {
      x.moveTo(150, 44); x.bezierCurveTo(124, 20, 68, 28, 64, 84);
      x.bezierCurveTo(60, 124, 80, 154, 98, 170); x.lineTo(102, 226);
      x.moveTo(150, 44); x.bezierCurveTo(160, 58, 162, 78, 158, 90);
      x.lineTo(178, 128); x.lineTo(160, 134); x.lineTo(163, 144);
      x.lineTo(158, 149); x.lineTo(162, 155); x.lineTo(156, 160);
      x.quadraticCurveTo(162, 178, 146, 184); x.quadraticCurveTo(128, 186, 116, 174);
      x.moveTo(142, 184); x.lineTo(148, 226);
      x.moveTo(140, 98); x.lineTo(153, 102); x.lineTo(142, 107);
      x.moveTo(134, 90); x.quadraticCurveTo(146, 84, 157, 90);
      x.moveTo(146, 48); x.quadraticCurveTo(120, 56, 110, 94);
    });
    strich(() => { x.ellipse(108, 116, 9, 16, 0, 0, Math.PI * 2); });
    x.strokeStyle = 'rgba(38,34,30,0.35)';
    x.lineWidth *= 0.5;
    strich(() => { // leichte Kohleschraffur an Wange und Hinterkopf
      for (let i = 0; i < 6; i++) {
        x.moveTo(120 + i * 5, 128); x.lineTo(110 + i * 5, 154);
        x.moveTo(72 + i * 5, 62 + i * 2); x.lineTo(66 + i * 5, 94 + i * 2);
      }
    });
  };
  /** einzelnes Auge mit Braue, Mitte (0,0) */
  const auge = () => {
    strich(() => {
      x.moveTo(-20, 0); x.quadraticCurveTo(0, -16, 20, 0); x.quadraticCurveTo(0, 11, -20, 0);
      x.moveTo(-22, -18); x.quadraticCurveTo(0, -30, 22, -18);
    });
    x.beginPath(); x.arc(0, -1, 6, 0, Math.PI * 2); x.fill();
  };
  if (variante === 0) {
    bereich(0, 0, 1, () => vorn(false));
    bereich(0, 256, 1, profil);
  } else if (variante === 1) {
    // großes Profil, gespiegelt (Blick nach links), darunter zwei Augenstudien
    x.save(); x.translate(313, -9); x.scale(-1.45, 1.45);
    x.strokeStyle = kohle; x.fillStyle = kohle; x.lineWidth = 3 / 1.45;
    profil();
    x.restore();
    bereich(80, 430, 1.4, auge);
    bereich(176, 440, 1.2, auge);
  } else {
    // Frauenkopf mit Haarknoten, darunter Ohr- und Nasenstudie
    bereich(13, 30, 0.9, () => vorn(true));
    bereich(70, 390, 1.6, () => strich(() => { // Ohr
      x.moveTo(-6, -30); x.bezierCurveTo(22, -36, 26, 6, 10, 18);
      x.quadraticCurveTo(4, 30, -6, 30);
      x.moveTo(0, -18); x.bezierCurveTo(14, -20, 14, 0, 4, 6);
    }));
    bereich(180, 390, 1.6, () => strich(() => { // Nase im Profil
      x.moveTo(-14, -34); x.lineTo(10, 10); x.lineTo(-6, 16); x.quadraticCurveTo(-12, 12, -10, 6);
    }));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: tex });
});

/**
 * Zylinder als Mesh (rund: verdeckt in der Lichtberechnung nur unter `lichtHuelle`).
 * @param {number} rOben @param {number} rUnten @param {number} h @param {THREE.Material} mat
 * @param {number} x @param {number} y @param {number} z @param {number} [seg=14]
 */
function zyl(rOben, rUnten, h, mat, x, y, z, seg = 14) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rOben, rUnten, h, seg), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * Roher Wachs- oder Gipskopf ohne Haar (wie die Köpfe im Regal), Gesicht nach lokal +z.
 * @param {THREE.Material} haut @param {number} variante @param {THREE.Material | null} [haar]
 */
function rohKopf(haut, variante, haar = null) {
  return kopf({ haut, variante: variante % 6, fein: false, haar, haarStil: 'voll' });
}

/**
 * Schulteransatz einer Büste: oben schmal und gerundet, unten breit (flach gedrückter Kegelstumpf).
 * @param {THREE.Material} mat @param {number} r halbe Schulterbreite @param {number} h Höhe
 */
function schultern(mat, r, h) {
  const s = zyl(r * 0.45, r, h, mat, 0, h / 2, 0, 20);
  s.scale.z = 0.5;
  return s;
}

/**
 * Kleine Gipsbüste (Schulteransatz, Hals, Kopf) für die Wandborde, Ursprung unten, Gesicht nach lokal +z.
 * @param {Materialien} m @param {number} variante
 */
function gipsBueste(m, variante) {
  const g = new THREE.Group();
  // runde Teile verdecken in der Lichtberechnung als umgebende Quader (Schatten auf Bord und Wand)
  g.userData.lichtHuelle = true;
  g.add(schultern(m.gips, 0.17, 0.11));
  g.add(zyl(0.05, 0.055, 0.08, m.gips, 0, 0.14, 0, 10));
  const k = rohKopf(m.gips, variante);
  k.position.set(0, 0.27, 0.01);
  g.add(k);
  return g;
}

/** Nähte und Kanten am Kittel, etwas dunkler */
const kittelSaum = new THREE.MeshLambertMaterial({ color: 0xa9aba4 });

/** Heller Kittelstoff, beidseitig (Stoffflächen ohne Dicke; Farbe angenommen) */
const kittelFlaeche = new THREE.MeshLambertMaterial({ color: 0xb3b5ae, side: THREE.DoubleSide });

/**
 * Fein unterteilte Stofffläche: Zeilen von y0 (oben) bis y1 (unten), je Zeile von rand(y)[0] bis rand(y)[1],
 * Tiefe aus hoehe(x, y). So entstehen Falten, die eine flache Form nicht hätte.
 * @param {(y: number) => number[]} rand @param {number} y0 @param {number} y1 @param {number} nx @param {number} ny
 * @param {(x: number, y: number) => number} hoehe
 */
function stoffFlaeche(rand, y0, y1, nx, ny, hoehe) {
  const geo = new THREE.PlaneGeometry(1, 1, nx, ny);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5;
    const v = pos.getY(i) + 0.5;
    const y = y1 + (y0 - y1) * v;
    const [a, b] = rand(y);
    const x = a + (b - a) * u;
    pos.setXYZ(i, x, y, hoehe(x, y));
  }
  geo.computeVertexNormals();
  return geo;
}

/** stückweise linear zwischen Stützpunkten [y, wert] (y fallend) */
function verlauf(/** @type {number[][]} */ punkte, /** @type {number} */ y) {
  for (let k = 1; k < punkte.length; k++) {
    const [ya, wa] = punkte[k - 1];
    const [yb, wb] = punkte[k];
    if (y >= yb) return wa + ((wb - wa) * (ya - y)) / (ya - yb);
  }
  return punkte[punkte.length - 1][1];
}

/**
 * Langer heller Arbeitskittel am Haken (Zeichnungen 1898), Ursprung am Haken, Vorderseite lokal +z.
 * Weich hängend: senkrechte Falten, nach unten stärker; Ärmel rund vor dem Körper; Saum wellig.
 * @param {Materialien} m @param {number} [phase=0] Faltenlage (je Kittel anders)
 */
function kittel(m, phase = 0) {
  const g = new THREE.Group();
  // Stoffflächen verdecken als umgebende Quader: die Wand dahinter wird dunkler (sonst wirkt der Kittel aufgeklebt)
  g.userData.lichtHuelle = true;
  g.add(box(0.025, 0.05, 0.07, 0, 0, -0.02, m.eisen));
  // Schultern fallen vom Haken steil ab (Stoff an einem Haken hängt durch)
  const halb = [[-0.02, 0.04], [-0.08, 0.1], [-0.2, 0.18], [-0.4, 0.2], [-1.18, 0.265]];
  // Tiefe des Körpers: Brust etwas vor, Falten ab der Taille kräftiger
  const koerper = (/** @type {number} */ x, /** @type {number} */ y) => {
    const t = Math.min(1, Math.max(0, (-y - 0.2) / 0.95));
    const falten = (0.003 + 0.024 * t) * (0.7 * Math.sin(x * 23 + phase) + 0.3 * Math.sin(x * 47 + phase * 2.3));
    const brust = 0.022 * Math.exp(-(((y + 0.38) / 0.22) ** 2)) * Math.cos(x * 5);
    return 0.022 + brust + falten;
  };
  g.add(new THREE.Mesh(stoffFlaeche((y) => [-verlauf(halb, y), verlauf(halb, y)], -0.02, -1.18, 24, 30, koerper), kittelFlaeche));
  // Ärmel: rund (Querschnitt als Bogen), leicht nach außen, wenige Querfalten
  for (const s of [-1, 1]) {
    const mitte = (/** @type {number} */ y) => s * verlauf([[-0.2, 0.175], [-0.78, 0.225]], y);
    const breite = (/** @type {number} */ y) => verlauf([[-0.2, 0.05], [-0.78, 0.045]], y);
    const aermel = (/** @type {number} */ x, /** @type {number} */ y) => {
      const q = (x - mitte(y)) / breite(y);
      return 0.035 + 0.022 * Math.cos(Math.min(1, Math.abs(q)) * Math.PI / 2) + 0.004 * Math.sin(y * 28 + phase + s);
    };
    g.add(new THREE.Mesh(stoffFlaeche((y) => [mitte(y) - breite(y), mitte(y) + breite(y)], -0.19, -0.78, 6, 16, aermel), kittelFlaeche));
  }
  // Knopfleiste folgt den Falten, Knöpfe und Revers sitzen auf der Fläche
  g.add(new THREE.Mesh(stoffFlaeche(() => [-0.012, 0.012], -0.14, -1.16, 1, 24, (x, y) => koerper(x, y) + 0.003), kittelSaum));
  for (let i = 0; i < 4; i++) {
    const y = -0.3 - i * 0.2;
    g.add(box(0.016, 0.016, 0.01, 0, y, koerper(0, y) + 0.007, m.holzDunkel));
  }
  for (const s of [-1, 1]) {
    const revers = box(0.035, 0.16, 0.01, s * 0.045, -0.1, koerper(s * 0.045, -0.1) + 0.006, kittelSaum);
    revers.rotation.z = s * 0.45;
    g.add(revers);
  }
  return g;
}

/**
 * Wandbord mit zwei Konsolen, Ursprung an der Wand in Höhe der Bordoberkante, Tiefe nach lokal +z.
 * @param {Materialien} m @param {number} breite
 */
function wandBord(m, breite) {
  const g = new THREE.Group();
  g.add(box(breite, 0.035, 0.3, 0, -0.0175, 0.16, m.holzDunkel));
  for (const s of [-1, 1]) g.add(box(0.035, 0.22, 0.22, s * (breite / 2 - 0.2), -0.145, 0.12, m.holzDunkel));
  return g;
}

/**
 * Hocker mit runder Sitzplatte, darauf ein Brett mit Büste und Farbnäpfchen (Zeichnung „Das Bemalen“).
 * Ursprung am Boden, Vorderseite lokal +z.
 * @param {Materialien} m
 */
function bemalBock(m) {
  const g = new THREE.Group();
  // vier kantige Beine mit Querstreben (Beine leicht schräg wirkt auf der Zeichnung; hier senkrecht)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.05, 0.86, 0.05, sx * 0.17, 0.43, sz * 0.17, m.holzHell));
  g.add(box(0.36, 0.03, 0.03, 0, 0.3, 0.17, m.holzHell), box(0.36, 0.03, 0.03, 0, 0.3, -0.17, m.holzHell));
  g.add(box(0.03, 0.03, 0.36, 0.17, 0.3, 0, m.holzHell), box(0.03, 0.03, 0.36, -0.17, 0.3, 0, m.holzHell));
  const sitz = zyl(0.27, 0.27, 0.05, m.holzHell, 0, 0.885, 0, 20);
  g.add(sitz);
  // Brett auf dem Hocker, darauf Büste (Schulteransatz, Hals, Kopf) und Näpfchen
  g.add(box(0.62, 0.03, 0.46, 0, 0.925, 0, m.holzDunkel));
  const bueste = new THREE.Group();
  bueste.userData.lichtHuelle = true;
  bueste.position.set(-0.05, 0.94, -0.02);
  bueste.add(schultern(m.wachsBlass, 0.2, 0.13));
  bueste.add(zyl(0.05, 0.055, 0.08, m.wachsBlass, 0, 0.16, 0.0, 10));
  const k = rohKopf(m.wachsBlass, 4);
  k.position.set(0, 0.29, 0.01);
  bueste.add(k);
  bueste.rotation.y = 0.35;
  g.add(bueste);
  g.add(zyl(0.05, 0.04, 0.025, m.gips, 0.22, 0.952, 0.12, 12));
  // Pinsel im Näpfchen
  for (const [dx, dz, nx, nz] of [[-0.01, 0, 0.25, 0.1], [0.012, 0.008, -0.2, 0.2], [0, -0.012, 0.05, -0.28]]) {
    const p = box(0.008, 0.22, 0.008, 0.22 + dx, 1.05, 0.12 + dz, m.holzDunkel);
    p.rotation.set(nx, 0, nz);
    g.add(p);
  }
  g.add(zyl(0.04, 0.032, 0.02, m.eisen, 0.2, 0.95, -0.12, 12));
  return g;
}

/**
 * Brett mit Werkzeugen am Boden (Zeichnung „Das Bemalen“: langes Gerät auf flachem Brett).
 * @param {Materialien} m
 */
function werkzeugBrett(m) {
  const g = new THREE.Group();
  g.add(box(0.7, 0.025, 0.32, 0, 0.0125, 0, m.holzHell));
  for (const [x, z, l, r] of [[-0.02, -0.08, 0.6, 0.05], [0.05, 0.02, 0.45, -0.08], [-0.08, 0.1, 0.38, 0.12]]) {
    const s = box(l, 0.015, 0.018, x, 0.033, z, m.holzDunkel);
    s.rotation.y = r;
    g.add(s);
  }
  return g;
}

/**
 * Runder Tisch mit Tuch, darauf ein Kopf mit Haar auf der Seite (Zeichnung „Das Frisiren“).
 * @param {Materialien} m
 */
function frisierTisch(m) {
  const g = new THREE.Group();
  // Säule kantig (bekommt so einen Kontaktfleck), Fußkreuz
  g.add(box(0.08, 0.78, 0.08, 0, 0.42, 0, m.holzDunkel));
  g.add(box(0.6, 0.05, 0.08, 0, 0.025, 0, m.holzDunkel), box(0.08, 0.05, 0.6, 0, 0.025, 0, m.holzDunkel));
  g.add(zyl(0.36, 0.36, 0.04, m.holzDunkel, 0, 0.83, 0, 24));
  g.add(zyl(0.375, 0.375, 0.008, m.leinen, 0, 0.854, 0, 24));
  const k = rohKopf(m.wachsBlass, 1, m.haar);
  k.userData.lichtHuelle = true;
  k.rotation.set(0, 0.6, Math.PI / 2);
  // liegend: halbe Kopfbreite (0,084 m) über dem Tuch
  k.position.set(0.02, 0.94, 0);
  g.add(k);
  // Haarbündel daneben
  const buendel = zyl(0.02, 0.025, 0.24, m.haar, -0.18, 0.88, 0.12, 8);
  buendel.rotation.set(Math.PI / 2, 0, 0.5);
  g.add(buendel);
  return g;
}

/**
 * Modellierbock mit Drehplatte und Tonkopf (Lehrbücher 1891/92: Bock etwa 1,07 m, Drehplatte).
 * @param {Materialien} m
 */
function modellierBock(m) {
  const g = new THREE.Group();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.05, 1.02, 0.05, sx * 0.16, 0.51, sz * 0.16, m.holzDunkel));
  g.add(box(0.34, 0.03, 0.34, 0, 0.35, 0, m.holzDunkel));
  g.add(box(0.42, 0.04, 0.42, 0, 1.04, 0, m.holzDunkel));
  g.add(zyl(0.17, 0.17, 0.03, m.holzHell, 0, 1.075, 0, 20));
  // Tonkopf auf kurzem Hals
  // Hals reicht in den Kopf hinein (Kopfmitte etwa 0,11 m über der Kinnunterkante), damit nichts schwebt
  g.add(zyl(0.055, 0.075, 0.13, ton, 0, 1.155, -0.015, 12));
  const k = rohKopf(ton, 2);
  k.userData.lichtHuelle = true;
  k.position.set(0, 1.27, 0.01);
  g.add(k);
  return g;
}

/**
 * Gipskörper ohne Kopf und Arme auf niedrigem Sockel (Gipskörper im Passage-Panopticum belegt).
 * Rund: verdeckt als Hülle in der Lichtberechnung.
 * @param {Materialien} m
 */
function gipsKoerper(m) {
  const g = new THREE.Group();
  g.add(box(0.5, 0.12, 0.42, 0, 0.06, 0, m.holzDunkel));
  const k = new THREE.Group();
  k.userData.lichtHuelle = true;
  for (const s of [-1, 1]) {
    k.add(zyl(0.055, 0.045, 0.42, m.gips, s * 0.09, 0.33, 0, 10));
    k.add(zyl(0.075, 0.06, 0.42, m.gips, s * 0.09, 0.75, 0, 10));
  }
  const huefte = zyl(0.17, 0.16, 0.18, m.gips, 0, 1.03, 0, 14);
  huefte.scale.z = 0.7;
  const rumpf = zyl(0.19, 0.15, 0.48, m.gips, 0, 1.36, 0, 14);
  rumpf.scale.z = 0.62;
  const schulter = zyl(0.13, 0.19, 0.08, m.gips, 0, 1.64, 0, 14);
  schulter.scale.z = 0.62;
  k.add(huefte, rumpf, schulter, zyl(0.045, 0.05, 0.06, m.gips, 0, 1.71, 0, 10));
  g.add(k);
  // zwei abgeschraubte Gipsarme liegen ordentlich zwischen Sockel und Wand (Glieder abschraubbar, belegt 1898;
  // nicht im Laufweg, damit sie nicht wie ein Hinweis wirken)
  for (const [x, z, dreh, seite] of [[-0.06, -0.28, 0.03, 1], [0.04, -0.38, -0.04, -1]]) {
    const a = new THREE.Group();
    a.userData.lichtHuelle = true;
    const oben = zyl(0.045, 0.035, 0.32, m.gips, -0.16, 0.042, 0, 10);
    oben.rotation.z = Math.PI / 2;
    const unten = zyl(0.035, 0.028, 0.28, m.gips, 0.14, 0.036, 0, 10);
    unten.rotation.z = Math.PI / 2;
    const h = hand(m.gips, seite);
    h.rotation.z = Math.PI / 2;
    h.position.set(0.28, 0.018, 0);
    a.add(oben, unten, h);
    a.position.set(x, 0, z);
    a.rotation.y = dreh;
    g.add(a);
  }
  return g;
}

/**
 * Stellt die Ausstattung in die Etagen-Gruppe und ergänzt die Hindernisse.
 * @param {THREE.Group} gruppe @param {Materialien} m
 * @param {THREE.Object3D[]} kollision @param {Hindernis[]} handHindernisse
 */
export function baueWerkstattAusstattung(gruppe, m, kollision, handHindernisse) {
  // ---------- Schräge Wand (9|25 → 6,5|27,5): lokal x entlang der Wand, +z in den Raum ----------
  const schraeg = new THREE.Group();
  schraeg.position.set(7.75, 0, 26.25);
  schraeg.rotation.y = (-3 * Math.PI) / 4;
  gruppe.add(schraeg);
  // Wandbord mit Gipsköpfen (Zeichnung „Beim Eingypsen“), zwei Konsolen
  const bord = wandBord(m, 2.0);
  bord.position.set(-0.4, 1.968, 0);
  schraeg.add(bord);
  [-1.15, -0.65, -0.15, 0.35].forEach((x, i) => {
    const b = gipsBueste(m, i * 2 + 1);
    b.scale.setScalar([1, 0.9, 1.1, 0.95][i]);
    b.position.set(x, 1.968, 0.15);
    b.rotation.y = (i - 1.5) * 0.15;
    schraeg.add(b);
  });
  // angelehnte Bretter rechts
  for (const [x, h, neig, mat] of /** @type {[number, number, number, THREE.Material][]} */ ([
    [0.84, 1.75, -0.16, planke[0]], [1.1, 1.95, -0.14, planke[1]], [1.36, 1.6, -0.18, planke[0]],
  ])) {
    const b = box(0.22, h, 0.025, x, 0, 0, mat);
    const fuss = 0.06 + Math.sin(-neig) * h;
    b.rotation.x = neig;
    b.position.set(x, (Math.cos(neig) * h) / 2, fuss - (Math.sin(-neig) * h) / 2);
    schraeg.add(b);
  }
  // niedriger Holzkasten mit Gipsplatte (zum Eingipsen) und Gipsbrocken daneben
  const kasten = new THREE.Group();
  kasten.position.set(-0.55, 0, 0.75);
  kasten.add(box(1.0, 0.04, 0.8, 0, 0.02, 0, m.holzDunkel));
  for (const s of [-1, 1]) {
    kasten.add(box(1.0, 0.2, 0.035, 0, 0.14, s * 0.3825, m.holzDunkel));
    kasten.add(box(0.035, 0.2, 0.73, s * 0.4825, 0.14, 0, m.holzDunkel));
  }
  // Gipsplatte im Kasten, Oberkante 6 cm unter dem Rand
  kasten.add(box(0.93, 0.15, 0.73, 0, 0.115, 0, m.gips));
  schraeg.add(kasten);
  kollision.push(kasten);
  for (let i = 0; i < 7; i++) {
    const s = 0.1 + ((i * 37) % 7) * 0.012;
    const b = box(s, s * 0.7, s * 0.9, 0.25 + ((i * 53) % 5) * 0.07, s * 0.33, 0.45 + ((i * 29) % 4) * 0.08, m.gips);
    b.rotation.set(0.2 * (i % 3), i * 0.9, 0.15 * ((i + 1) % 2));
    schraeg.add(b);
  }

  // Gipsspritzer auf dem Boden (Zeichnung „Beim Eingypsen“)
  for (let i = 0; i < 14; i++) {
    const w = i * 2.4;
    const r = 0.6 + ((i * 41) % 9) * 0.05;
    const s = 0.03 + ((i * 23) % 7) * 0.012;
    const f = box(s, 0.002, s * 0.7, -0.55 + Math.cos(w) * r * 0.9, 0.001, 0.75 + Math.sin(w) * r * 0.7, m.gips);
    f.rotation.y = w;
    schraeg.add(f);
  }

  // ---------- Fensterwand Friedrichstraße (z = 27,5): Skizzenblätter zwischen den Fenstern ----------
  for (const [x, y, dreh, nr] of [[2.95, 1.95, 0.03, 1], [3.35, 1.85, -0.04, 0], [3.75, 1.98, 0.02, 2]]) {
    const blatt = box(0.3, 0.42, 0.004, x, y, 27.5 - 0.004, skizzen[nr]);
    blatt.rotation.set(0, Math.PI, dreh);
    gruppe.add(blatt);
  }

  // ---------- Wand zu Raum B (z = 19,75), rechts vom Heizkörper ----------
  const bemal = bemalBock(m);
  bemal.position.set(5.3, 0, 20.35);
  bemal.rotation.y = -0.25;
  gruppe.add(bemal);
  kollision.push(bemal);
  // zweites Wandbord mit Gipsbüsten über dem Platz zum Bemalen
  const bord2 = wandBord(m, 1.6);
  bord2.position.set(6.0, 1.95, 19.75);
  gruppe.add(bord2);
  [5.5, 6.0, 6.5].forEach((x, i) => {
    const b = gipsBueste(m, i * 2 + 2);
    b.scale.setScalar([0.92, 1.08, 1][i]);
    b.position.set(x, 1.95, 19.9);
    b.rotation.y = (i - 1) * 0.2;
    gruppe.add(b);
  });
  const brett = werkzeugBrett(m);
  brett.position.set(4.75, 0, 20.15);
  brett.rotation.y = 0.15;
  gruppe.add(brett);
  const frisier = frisierTisch(m);
  frisier.position.set(6.55, 0, 20.35);
  gruppe.add(frisier);
  kollision.push(frisier);

  // ---------- Hofwand (x = 0) zwischen Tür und Heizkörper ----------
  const bock = modellierBock(m);
  bock.position.set(0.75, 0, 24.8);
  bock.rotation.y = Math.PI / 2;
  gruppe.add(bock);
  kollision.push(bock);
  // Tonkiste mit Zinkblech-Deckel
  gruppe.add(box(0.5, 0.62, 0.55, 0.3, 0.31, 25.7, m.holzDunkel));
  gruppe.add(box(0.52, 0.02, 0.57, 0.3, 0.63, 25.7, zink));
  handHindernisse.push({ minX: 0, maxX: 0.6, minZ: 25.4, maxZ: 26.0 });
  // Hakenleiste mit zwei hellen Arbeitskitteln neben der Tür
  gruppe.add(box(0.03, 0.08, 0.9, 0.035, 1.95, 24.8, m.holzDunkel));
  for (const [z, dreh, dx] of [[24.55, 0.1, 0.08], [25.08, -0.08, 0.13]]) {
    const k = kittel(m, z * 7);
    k.position.set(dx, 1.95, z);
    k.rotation.y = Math.PI / 2 + dreh;
    gruppe.add(k);
  }

  // ---------- Fensterwand Behrenstraße (x = 9) zwischen Wachsblöcken und Fenster ----------
  const koerper = gipsKoerper(m);
  koerper.position.set(8.45, 0, 21.3);
  koerper.rotation.y = -Math.PI / 2;
  gruppe.add(koerper);
  handHindernisse.push({ minX: 8.2, maxX: 9.0, minZ: 21.0, maxZ: 21.6 });

  // ---------- Werkbank 2 an der Fensterwand Friedrichstraße (Platte bei y 0,895) ----------
  const y = 0.895;
  for (const [x, z, seite, dreh] of [[2.55, 26.6, 1, 0.4], [2.8, 26.75, -1, -0.3]]) {
    const h = hand(m.wachsBlass, seite);
    // Hand hängt im Modell nach unten (−y): um z kippen (flach), dann um y drehen
    h.rotation.set(0, dreh, Math.PI / 2);
    h.position.set(x, y + 0.025, z);
    gruppe.add(h);
  }
  // abgeschraubter Unterarm
  const arm = zyl(0.035, 0.03, 0.3, m.wachsBlass, 3.15, y + 0.035, 26.65, 10);
  arm.rotation.set(0, 0, Math.PI / 2 + 0.05);
  arm.rotation.order = 'YXZ';
  arm.rotation.y = 0.3;
  gruppe.add(arm);
  // Kästchen mit Glasaugen
  gruppe.add(box(0.16, 0.04, 0.11, 3.6, y + 0.02, 26.6, m.holzDunkel));
  for (let i = 0; i < 6; i++) {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glasauge);
    a.position.set(3.55 + (i % 3) * 0.045, y + 0.045, 26.58 + Math.floor(i / 3) * 0.04);
    gruppe.add(a);
  }
  // Haarbündel
  const haar = zyl(0.018, 0.022, 0.26, m.haar, 3.9, y + 0.02, 26.85, 8);
  haar.rotation.set(Math.PI / 2, 0, 0.8);
  gruppe.add(haar);
}
