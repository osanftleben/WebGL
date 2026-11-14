// Castans Panoptikum, III. Etage (Oktober 1892) – erster spielbarer Ort.
//
// Grundlage (siehe Projektnotizen, Abschnitt Quellen):
// - Grundriss III. Etage aus dem Werbeblatt 1888 (Ausstellungsräume im Behrenstraßen-Flügel).
// - Deutsche Bauzeitung 1889: Werkstätten im III. OG, Geschosshöhe 4,40 m, eiserne Treppe
//   mit Aufzug zur Behrenstraße, Zentralheizung, Fassade mit Brüstungsgittern am III. OG,
//   abgeschrägte Ecke Friedrich-/Behrenstraße oberhalb des Erdgeschosses ohne Öffnungen.
// - Schreckenskammer mit Verbrecherköpfen, Richtschwertern, Folterwerkzeugen (Führer um 1900).
// Annahmen (im Spiel-Hinweis zu nennen): Lage der Schreckenskammer und der Werkstatt in der Etage,
// Raumteilung, Wandfarben, Fußboden, Möblierung, Maße (Maßstab über den Haupthof geschätzt).
//
// Koordinaten: x zeigt zur Behrenstraße (Norden), z zur Friedrichstraße (Osten), Meter.
import * as THREE from 'three';
import { verschmelze } from './verschmelzen.js';
import { kopf as rohKopf } from './menschen.js';
import { sammleLichtSzene } from './lichtmodell.js';
import { aktiviereSchatten, schattenLicht } from './licht.js';
import { alsHindernis } from 'steuerung/kollision.js';
import {
  erstelleMaterialien, wand, flaeche, box, heizkoerper, buesteAufSockel, schwertTafel,
  vitrine, figur, holzgelaender, werkbank, regal, hocker, gipsform, wachstopf,
  stuckdecke, kronleuchter, haengelampe, kopfschrank, saeule, nummernTafel, BESETZUNG,
} from './bauteile.js';

/** Lichte Raumhöhe (Geschosshöhe 4,40 m belegt; Deckenstärke angenommen). */
const H = 4.0;
/** Außenwand / Innenwand */
const DA = 0.5;
const DI = 0.25;

/** Fenster im III. OG: tief herabgezogen mit Brüstungsgitter (Gitter am III. OG belegt, Maße angenommen). */
const FENSTER = { breite: 1.3, hoehe: 2.7, unten: 0.35, art: /** @type {const} */ ('fenster') };

/**
 * @typedef {import('steuerung/kollision.js').Hindernis} Hindernis
 */

/**
 * Baut die III. Etage, hängt sie in die Szene und liefert Hindernisse und Startpunkt.
 * @param {THREE.Scene} scene
 * @returns {{
 *   gruppe: THREE.Group,
 *   hindernisse: Hindernis[],
 *   verdecker: THREE.Object3D[],
 *   start: { x: number, z: number, blick: number },
 *   materialien: ReturnType<typeof erstelleMaterialien>,
 *   lichtSzene: import('./lichtmodell.js').LichtSzene,
 * }}
 */
export function baueEtage3(scene) {
  const m = erstelleMaterialien();
  const gruppe = new THREE.Group();
  gruppe.name = 'Etage3';
  scene.add(gruppe);

  /** @type {THREE.Object3D[]} Teile, deren Hülle als Hindernis dient */
  const kollision = [];
  /** @type {Hindernis[]} zusätzlich von Hand festgelegte Hindernisse */
  const handHindernisse = [];

  /**
   * Wand einsetzen.
   * @param {Parameters<typeof wand>[0]} o
   * @param {number} x @param {number} z @param {number} drehung
   */
  function setzeWand(o, x, z, drehung) {
    const w = wand(o);
    w.gruppe.position.set(x, 0, z);
    w.gruppe.rotation.y = drehung;
    gruppe.add(w.gruppe);
    return w;
  }

  // ---------- Boden und Decke ----------
  const boden = flaeche(9, 27.5, m.dielen, 1.6);
  boden.position.set(4.5, 0, 13.75);
  gruppe.add(boden);
  const decke = flaeche(9, 27.5, m.decke, 2, true);
  decke.position.set(4.5, H, 13.75);
  gruppe.add(decke);

  // ---------- Außenwand Behrenstraße (x = 9): Schreckenskammer (z 0 … 19,625), Werkstatt hell (bis 25) ----------
  const fensterZ = [1.9, 4.75, 7.6, 11.5, 14.6, 17.7];
  kollision.push(...setzeWand({
    laenge: 19.625, hoehe: H, dicke: DA, material: m.putzSaal, m, gelaender: true, goldleiste: true, vorhaenge: true,
    oeffnungen: fensterZ.map((pos) => ({ ...FENSTER, pos })),
  }, 9, 0, -Math.PI / 2).hindernisse);
  kollision.push(...setzeWand({
    laenge: 25 - 19.625, hoehe: H, dicke: DA, material: m.putzHell, m, gelaender: true,
    oeffnungen: [{ ...FENSTER, pos: 22.4 - 19.625 }],
  }, 9, 19.625, -Math.PI / 2).hindernisse);

  // ---------- Innenwand zum Hof / übrigen Geschoss (x = 0) ----------
  // Werkstatt-Abschnitt (z 27,5 … 19,625, hell) mit geschlossener Tür zu den übrigen Räumen des III. OG (z = 23,5)
  kollision.push(...setzeWand({
    laenge: 27.5 - 19.625, hoehe: H, dicke: DA, material: m.putzHell, m,
    oeffnungen: [{ pos: 27.5 - 23.5, breite: 1.2, hoehe: 2.6, art: 'tuer' }],
  }, 0, 27.5, Math.PI / 2).hindernisse);
  // Schreckenskammer-Abschnitt (z 19,625 … 0)
  kollision.push(...setzeWand({
    laenge: 19.625, hoehe: H, dicke: DA, material: m.putzSaal, m, goldleiste: true,
  }, 0, 19.625, Math.PI / 2).hindernisse);

  // ---------- Wand zum Treppenhaus (z = 0): geschlossene Tür zur eisernen Treppe mit Aufzug ----------
  kollision.push(...setzeWand({
    laenge: 9, hoehe: H, dicke: DA, material: m.putzSaal, m, goldleiste: true,
    oeffnungen: [{ pos: 6.5, breite: 1.4, hoehe: 2.8, art: 'tuer' }],
  }, 0, 0, 0).hindernisse);

  // ---------- Trennwand Raum A | Raum B (z = 9,5 … 9,75) mit breitem Durchgang ----------
  kollision.push(...setzeWand({
    laenge: 9, hoehe: H, dicke: DI, material: m.putzSaal, m, beidseitig: true, goldleiste: true,
    oeffnungen: [{ pos: 4.5, breite: 2.4, hoehe: 3.0, art: 'durchgang' }],
  }, 0, 9.75, 0).hindernisse);

  // ---------- Trennwand Raum B | Werkstatt (z = 19,5 … 19,75): zwei Hälften, je eigene Farbe ----------
  // Durchgang bei x = 2,0 (Breite 1,2 m)
  kollision.push(...setzeWand({
    laenge: 9, hoehe: H, dicke: DI / 2, material: m.putzSaal, m, goldleiste: true,
    oeffnungen: [{ pos: 9 - 2.0, breite: 1.2, hoehe: 2.5, art: 'durchgang' }],
  }, 9, 19.5, Math.PI).hindernisse);
  kollision.push(...setzeWand({
    laenge: 9, hoehe: H, dicke: DI / 2, material: m.putzHell, m,
    oeffnungen: [{ pos: 2.0, breite: 1.2, hoehe: 2.5, art: 'durchgang' }],
  }, 0, 19.75, 0).hindernisse);
  // Offen stehender Türflügel an der Werkstattseite
  const fluegel = box(1.15, 2.45, 0.05, 0, 1.225, 0, m.holzDunkel);
  fluegel.position.set(1.4 - 0.03, 1.225, 19.75 + 0.6);
  fluegel.rotation.y = Math.PI / 2;
  gruppe.add(fluegel);
  kollision.push(fluegel);

  // ---------- Werkstatt: Außenwand Friedrichstraße (z = 27,5), x von 6,5 bis 0 ----------
  // Die Werkstatt-Wände innen hell (Werkstatt), die Außenwand-Abschnitte dort ebenfalls.
  kollision.push(...setzeWand({
    laenge: 6.5, hoehe: H, dicke: DA, material: m.putzHell, m, gelaender: true,
    oeffnungen: [{ ...FENSTER, pos: 1.7 }, { ...FENSTER, pos: 4.7 }],
  }, 6.5, 27.5, Math.PI).hindernisse);

  // ---------- Abgeschrägte Ecke (oberhalb des EG ohne Öffnungen, belegt) ----------
  const schraeg = 2.5 * Math.SQRT2;
  setzeWand({ laenge: schraeg, hoehe: H, dicke: DA, material: m.putzHell, m }, 9, 25, (-3 * Math.PI) / 4);
  // Hindernisse entlang der Schräge als kleine Quadrate (die Hülle der gedrehten Wand wäre zu groß)
  for (let t = 0; t <= 1.0001; t += 0.1) {
    const px = 9 - 2.5 * t + 0.12;
    const pz = 25 + 2.5 * t + 0.12;
    handHindernisse.push({ minX: px - 0.2, maxX: px + 0.2, minZ: pz - 0.2, maxZ: pz + 0.2 });
  }

  // ---------- Heizkörper (Zentralheizung belegt; Lage angenommen) ----------
  for (const [x, z, dreh] of /** @type {[number, number, number][]} */ ([
    [0.08, 9.0, Math.PI / 2], [7.5, 9.75 + 0.08, 0], [3.5, 19.75 + 0.08, 0], [0.08, 26.6, Math.PI / 2],
  ])) {
    const hk = heizkoerper(m, 1.1);
    hk.position.set(x, 0, z);
    hk.rotation.y = dreh;
    gruppe.add(hk);
    kollision.push(hk);
  }

  // ================= Raum A: Verbrecherköpfe, Richtschwerter, Vitrine =================
  let nummer = 1;
  /** Nummerntafel an ein Objekt heften (lokale Lage, Blick nach lokal +z bzw. gedreht). */
  const tafelAn = (/** @type {THREE.Object3D} */ ziel, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z, drehY = 0, neigung = 0) => {
    const t = nummernTafel(m, nummer++);
    t.position.set(x, y, z);
    t.rotation.set(neigung, drehY, 0, 'YXZ');
    ziel.add(t);
  };
  for (let i = 0; i < 6; i++) {
    const b = buesteAufSockel(m, BESETZUNG.buesten[i]);
    b.position.set(0.5, 0, 1.6 + i * 1.25);
    b.rotation.y = Math.PI / 2;
    tafelAn(b, 0, 0.95, 0.182);
    gruppe.add(b);
    kollision.push(b);
  }
  for (let i = 0; i < 3; i++) {
    const b = buesteAufSockel(m, BESETZUNG.buesten[6 + i]);
    b.position.set(6.75 + i * 0.85, 0, 9.2);
    b.rotation.y = Math.PI;
    tafelAn(b, 0, 0.95, 0.182);
    gruppe.add(b);
    kollision.push(b);
  }
  const tafel = schwertTafel(m);
  tafel.position.set(2.6, 1.95, 0);
  for (const sx of [-0.42, 0, 0.42]) tafelAn(tafel, sx, -0.79, 0.012);
  gruppe.add(tafel);
  const tafel2 = schwertTafel(m);
  // zweite Tafel an der Hofwand über den Büsten
  tafel2.position.set(0, 2.55, 4.4);
  tafel2.rotation.y = Math.PI / 2;
  for (const sx of [-0.42, 0, 0.42]) tafelAn(tafel2, sx, -0.79, 0.012);
  gruppe.add(tafel2);
  const v = vitrine(m, 1.6, 0.8);
  v.position.set(5.0, 0, 5.0);
  tafelAn(v, 0, 0.82, 0.401);
  gruppe.add(v);
  kollision.push(v);

  // ================= Raum B: Köpfe in Glasschränken, eine Figurengruppe =================
  /**
   * Podest mit Figuren und Absperrung davor.
   * @param {number} x0 @param {number} z0 @param {number} b @param {number} t
   * @param {Array<[import('./bauteile.js').Rolle, boolean, number, number, boolean?]>} figuren
   *   Rolle, Hut, x-Versatz, z-Versatz, Quader-Schuhe (Standard ja; neue Figuren ohne, siehe figur())
   */
  function figurengruppe(x0, z0, b, t, figuren) {
    const g = new THREE.Group();
    g.position.set(x0, 0, z0);
    g.add(box(b, 0.25, t, b / 2, 0.125, t / 2, m.podest));
    figuren.forEach(([rolle, hut, dx, dz, quaderSchuhe = true], i) => {
      const f = figur(m, rolle, { hut, quaderSchuhe, armWinkel: 0.1 + i * 0.05 });
      f.position.set(dx, 0.25, dz);
      f.rotation.y = Math.PI / 2 + (i - 1) * 0.25;
      g.add(f);
    });
    // Holzgeländer entlang der offenen Seite (zum Raum hin, +x) und an den Enden (Form angenommen)
    g.add(holzgelaender(m, [[0.0, -0.45], [b + 0.45, -0.45], [b + 0.45, t + 0.45], [0.0, t + 0.45]]));
    tafelAn(g, b + 0.49, 0.8, t / 2, Math.PI / 2, -0.2);
    gruppe.add(g);
    g.updateWorldMatrix(true, true);
    handHindernisse.push({ minX: x0, maxX: x0 + b + 0.5, minZ: z0 - 0.5, maxZ: z0 + t + 0.5 });
    return g;
  }
  // Glasschränke mit Verbrecherköpfen an der Hofwand (Köpfe belegt, Schränke angenommen)
  for (const [z, rollen] of /** @type {Array<[number, import('./bauteile.js').Rolle[]]>} */ ([[11.0, BESETZUNG.schrank[0]], [13.2, BESETZUNG.schrank[1]]])) {
    const schrank = kopfschrank(m, 1.9, rollen);
    schrank.position.set(0.02, 0, z);
    schrank.rotation.y = Math.PI / 2;
    tafelAn(schrank, 0, 0.2, 0.501);
    gruppe.add(schrank);
    kollision.push(schrank);
  }
  // Zweite Gruppe: rechts ein freier Platz (für Schritt 2: dort steht die Leiche im Kostüm).
  // Rollen aus der Besetzungsliste; die dritte Figur (Besetzung) steht hinten links, ohne Quader-Schuhe,
  // damit das Lichtmodell unverändert bleibt.
  figurengruppe(0.6, 15.2, 3.0, 2.8, [
    [BESETZUNG.gruppe[0], true, 0.9, 0.7],
    [BESETZUNG.gruppe[1], false, 1.6, 1.4],
    [BESETZUNG.gruppe[2], false, 0.75, 2.05, false],
  ]);
  const v2 = vitrine(m, 1.4, 0.7);
  v2.position.set(6.6, 0, 14.7);
  v2.rotation.y = Math.PI / 2;
  tafelAn(v2, 0, 0.82, 0.351);
  gruppe.add(v2);
  kollision.push(v2);

  // ================= Werkstatt =================
  const bank = werkbank(m, 2.4, 0.9);
  bank.position.set(4.6, 0, 23.0);
  gruppe.add(bank);
  kollision.push(bank);
  const topf = wachstopf(m);
  topf.position.set(5.4, 0.895, 23.0);
  gruppe.add(topf);
  for (let i = 0; i < 2; i++) {
    const form = gipsform(m);
    form.position.set(3.8 + i * 0.45, 0.895, 22.85 + i * 0.1);
    gruppe.add(form);
  }
  const bank2 = werkbank(m, 2.0, 0.7);
  bank2.position.set(3.2, 0, 26.75);
  gruppe.add(bank2);
  kollision.push(bank2);
  const r = regal(m, 1.8, 2.2, 0.45, 4);
  r.position.set(0.02, 0, 21.2);
  r.rotation.y = Math.PI / 2;
  gruppe.add(r);
  kollision.push(r);
  // Unfertige Wachsköpfe auf dem Regal
  // geformt, aber noch unbemalt und ohne Haar (Wachs ohne Gesichtstafel), Gesicht zum Raum
  for (let fach = 1; fach <= 3; fach++) {
    for (let k = 0; k < 3; k++) {
      const kopf = rohKopf({ haut: m.wachsBlass, variante: (fach * 3 + k) % 6, fein: false });
      kopf.rotation.y = Math.PI / 2;
      kopf.position.set(0.25, 0.1 + (fach * 2.05) / 4 + 0.13, 20.6 + k * 0.6);
      gruppe.add(kopf);
    }
  }
  // Wachsblöcke gestapelt
  for (let i = 0; i < 5; i++) {
    gruppe.add(box(0.4, 0.2, 0.3, 7.6 + (i % 2) * 0.05, 0.1 + i * 0.2, 20.6 + (i % 3) * 0.02, m.wachsBlass));
  }
  handHindernisse.push({ minX: 7.35, maxX: 7.85, minZ: 20.4, maxZ: 20.8 });
  for (const [x, z] of [[4.0, 22.2], [2.8, 26.1]]) {
    const h = hocker(m);
    h.position.set(x, 0, z);
    gruppe.add(h);
  }

  // ================= Raumschmuck: Säulen, Stuckdecken, Leuchten =================
  // Säulenpaar am Durchgang A|B (Säulen in den Sälen belegt, Stellung angenommen)
  for (const x of [3.3 - 0.3, 5.7 + 0.3]) {
    const s = saeule(m, H);
    s.position.set(x, 0, 9.5 - 0.24);
    gruppe.add(s);
    kollision.push(s);
  }
  // Stuckdecken mit Goldleisten in beiden Räumen der Schreckenskammer
  const deckeA = stuckdecke(m, 9, 9.5);
  deckeA.position.set(0, H, 0);
  gruppe.add(deckeA);
  const deckeB = stuckdecke(m, 9, 9.75);
  deckeB.position.set(0, H, 9.75);
  gruppe.add(deckeB);
  // Deckenkronen (elektrisches Licht im Haus belegt, Form angenommen; am Morgen ausgeschaltet)
  for (const z of [4.75, 14.6]) {
    const k = kronleuchter(m);
    k.position.set(4.5, H - 0.05, z);
    gruppe.add(k);
  }
  const lampe = haengelampe(m, 1.7);
  lampe.position.set(4.6, H, 23.0);
  gruppe.add(lampe);

  // ---------- Licht: Tageslicht durch die Fenster (bedeckt, ohne direkte Sonne – Wetter unbelegt) ----------
  const himmel = new THREE.HemisphereLight(0xe2e4e2, 0xb3a48e, 1.1);
  gruppe.add(himmel);
  const fensterLicht = new THREE.DirectionalLight(0xf0f0ec, 2.4);
  // Himmelslicht fällt steiler ein (etwa 35°) – weniger Schattenfehler auf flachen Flächen
  fensterLicht.position.set(30, 18, 10);
  fensterLicht.target.position.set(4.5, 0, 12);
  schattenLicht(fensterLicht, 16);
  gruppe.add(fensterLicht, fensterLicht.target);
  // Seitliche Aufhellung von der Fensterseite (Behrenstraße, +x), ohne Schatten: Fenster geben
  // Licht aus vielen Winkeln, auch flach. Die dem Fenster zugewandte Seite von Figuren und
  // Gegenständen ist dadurch heller als die abgewandte – auch tief im Raum, wo das steile
  // Fensterlicht (oben) wegen der Wand über den Fenstern nicht mehr hinkommt.
  const fensterSeite = new THREE.DirectionalLight(0xe6ebef, 1.5);
  fensterSeite.position.set(20, 4, 12);
  fensterSeite.target.position.set(4.5, 0.5, 12);
  gruppe.add(fensterSeite, fensterSeite.target);
  // Himmelslicht durch die Fenster zur Friedrichstraße (Werkstatt), ebenfalls mit Schatten,
  // damit auch dort Lichtbahnen entstehen (sonst erhellte es die ganze Etage durch die Wände)
  const ostLicht = new THREE.DirectionalLight(0xf0f0ec, 1.8);
  ostLicht.position.set(4.5, 14, 42);
  ostLicht.target.position.set(4.5, 0, 22);
  schattenLicht(ostLicht, 10, 1024);
  gruppe.add(ostLicht, ostLicht.target);

  // ---------- Hindernisse berechnen, dann statische Teile verschmelzen ----------
  gruppe.updateWorldMatrix(true, true);
  const hindernisse = [...kollision.map((o) => alsHindernis(o)), ...handHindernisse];
  // Raummodell und Lichtkarten-Atlas für die vorab berechnete Beleuchtung (vor dem Verschmelzen,
  // solange die Teile einzeln sind)
  const lichtSzene = sammleLichtSzene(gruppe);
  // Fensteröffnungen für die Lichtberechnung: Rechteck in der Außenebene der Wand (Himmelslicht kommt
  // nur hier herein). Behrenstraße: Ebene x = 9,5 (Wandaußenseite), Friedrichstraße: Ebene z = 28
  const lichtFenster = [
    ...[...fensterZ, 22.4].map((z) => ({ achse: 'x', ebene: 9 + DA, min: [z - FENSTER.breite / 2, FENSTER.unten], max: [z + FENSTER.breite / 2, FENSTER.unten + FENSTER.hoehe] })),
    ...[6.5 - 1.7, 6.5 - 4.7].map((x) => ({ achse: 'z', ebene: 27.5 + DA, min: [x - FENSTER.breite / 2, FENSTER.unten], max: [x + FENSTER.breite / 2, FENSTER.unten + FENSTER.hoehe] })),
  ];
  const verdecker = verschmelze(gruppe, lichtSzene.koordinaten);
  aktiviereSchatten(gruppe);

  // Mit Lichtgitter entfallen alle vier Lampen: Das Gitter enthält das Himmelslicht durch die Fenster
  // schon vollständig. Die schattenwerfenden Fensterlichter kamen aus einer festen Richtung und zeichneten
  // parallele, sonnenartige Lichtbahnen – bei bedecktem Himmel unnatürlich (Hinweis des Nutzers).
  // Ohne Gitter (Ersatzlösung) bleiben sie in voller Stärke.
  const direktLichter = [himmel, fensterSeite, fensterLicht, ostLicht];
  return {
    gruppe, hindernisse, verdecker, start: { x: 6.5, z: 1.3, blick: Math.PI }, materialien: m, lichtSzene, lichtFenster,
    direktLichter,
    // Räume als z-Bereiche (Raum A, Raum B, Werkstatt), z. B. für die Fensterspiegelung im Boden
    raeumeZ: [[0, 9.5], [9.75, 19.5], [19.75, 27.5]],
  };
}
