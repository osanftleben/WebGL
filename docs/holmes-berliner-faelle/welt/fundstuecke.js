// Fall 1: Leiche und Fundstücke (Hinweise) in der III. Etage.
// Alles hier ist Spielhandlung und damit erfunden (siehe Projektnotizen, Entwurf Fall 1).
// Antippbare Teile bleiben einzelne Objekte (nicht verschmolzen) und bekommen eigene
// Material-Kopien, damit eine Hervorhebung nur sie betrifft.
import * as THREE from 'three';
import { box, GEHROCK, FIGUR_ZONEN, FIGUR_FLECK, STUFEN_ABSTAND } from './bauteile.js';
import { kopf, hals, arm, fuss, oberkoerper, fingerspitzen, sparsam, istSparsam } from './menschen.js';
import { alsStufe, baueStufen } from './stufen.js';
import { gesichtsTafel, GESICHT } from './texturen.js';
import { alsHindernis } from 'steuerung/kollision.js';
import { verschmelze } from './verschmelzen.js';
import { sammleVerdecker } from './lichtmodell.js';
import { weicherFleck, sammleKontaktFlecken } from './fleck.js';
import { sammleSchattenWerfer } from './werkstattschatten.js';

/** @typedef {import('./bauteile.js').Materialien} Materialien */
/** @typedef {import('steuerung/kollision.js').Hindernis} Hindernis */

/**
 * Gibt jedem Mesh einer Gruppe eine eigene Kopie seines Materials (für die Hervorhebung).
 * @param {THREE.Object3D} gruppe
 */
function eigeneMaterialien(gruppe) {
  /** @type {Map<THREE.Material, THREE.Material>} */
  const kopien = new Map();
  gruppe.traverse((o) => {
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh) return;
    const alt = /** @type {THREE.Material} */ (mesh.material);
    if (!kopien.has(alt)) kopien.set(alt, alt.clone());
    mesh.material = /** @type {THREE.Material} */ (kopien.get(alt));
  });
}

/**
 * Unsichtbarer, größerer Trefferkörper, damit kleine Dinge gut antippbar sind.
 * (Der Raycaster trifft auch unsichtbare Objekte.)
 * @param {number} radius
 */
function trefferKugel(radius) {
  const kugel = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), new THREE.MeshBasicMaterial());
  kugel.visible = false;
  kugel.userData.nurTreffer = true;
  return kugel;
}

/**
 * Baut die Leiche im Kostüm einer Mörderfigur, an das eiserne Standgestell gebunden
 * (Gestell: Annahme). Darstellung nur angedeutet – kein Blut, keine Wunde.
 * Die Figur schaut nach +z; die rechte Hand liegt bei −x.
 * @param {Materialien} m
 * @returns {{ koerper: THREE.Group, hand: THREE.Group }}
 */
function baueLeiche(m) {
  // Blasse Haut mit geschlossenen Augen (eigene Zelle der Gesichtstafel)
  const haut = new THREE.MeshLambertMaterial({ color: 0xffffff, map: gesichtsTafel() });
  const zelle = GESICHT.leiche;
  const mantel = m.kleidDunkel;
  const nagelRand = new THREE.MeshLambertMaterial({ color: 0x2e2419 });
  // Teilungen runder Teile: voll / sparsam (Detailstufen, welt/stufen.js)
  const n = (/** @type {number} */ voll, /** @type {number} */ spar) => (istSparsam() ? spar : voll);
  // Oberkörper leicht nach vorn gesackt (Drehung um die Hüfte); innen Maße wie bei stehenden Figuren
  const gesackt = () => {
    const aussen = new THREE.Group();
    aussen.position.y = 0.95;
    aussen.rotation.x = 0.07;
    const innen = new THREE.Group();
    innen.position.y = -0.95;
    aussen.add(innen);
    return { aussen, innen };
  };

  // Körper (ohne die antippbare rechte Hand), je Detailstufe aus demselben Bauplan
  const baueKoerper = () => {
    const koerper = new THREE.Group();
    // Beine, Schuhe
    for (const s of [-1, 1]) {
      const bein = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.82, n(10, 8)), m.kleidGrau);
      bein.position.set(s * 0.09, 0.41, 0);
      koerper.add(bein);
      koerper.add(box(0.1, 0.06, 0.24, s * 0.09, 0.03, 0.05, m.eisen));
    }
    const oben = gesackt();
    koerper.add(oben.aussen);
    // Langer Mantel des Kostüms mit Weste, Hemd und Krawatte
    oben.innen.add(oberkoerper({
      profil: GEHROCK, rock: mantel, kragen: m.leinen,
      ausschnitt: { unten: 1.28, breite: 0.07, weste: m.kleidGrau, hemd: m.leinen, krawatte: mantel, knopf: m.eisen },
    }));
    // Linker Arm hängt schlaff
    oben.innen.add(arm({
      stoff: mantel, haut, zelle, seite: 1, manschette: m.leinen,
      schulter: [0.158, 1.405, 0], ellbogen: [0.185, 1.14, 0.02], handgelenk: [0.195, 0.9, 0.03],
    }).gruppe);
    // Kopf gesenkt und leicht zur Seite geneigt, darauf der Hut des Kostüms
    const kopfGruppe = new THREE.Group();
    kopfGruppe.position.set(0, 1.5, 0);
    kopfGruppe.rotation.set(0.42, 0, 0.12);
    const h = hals(haut, zelle);
    h.position.set(0, 0.055, -0.012);
    kopfGruppe.add(h);
    const k = kopf({ haut, zelle, variante: 1, haar: mantel, haarStil: 'kurz' });
    k.position.y = 0.135;
    kopfGruppe.add(k);
    const hut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, n(16, 10)), mantel);
    hut.scale.set(0.85, 1, 1);
    hut.position.set(0, 0.282, -0.004);
    kopfGruppe.add(hut);
    const krempe = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.015, n(20, 12)), mantel);
    krempe.scale.set(0.88, 1, 1);
    krempe.position.set(0, 0.207, -0.004);
    kopfGruppe.add(krempe);
    oben.innen.add(kopfGruppe);
    // Eisernes Standgestell hinter dem Körper mit Schnur um die Brust (Annahme)
    koerper.add(box(0.035, 1.5, 0.035, 0, 0.75, -0.3, m.eisen));
    koerper.add(box(0.34, 0.03, 0.03, 0, 1.42, -0.3, m.eisen));
    koerper.add(box(0.3, 0.025, 0.04, 0, 0.02, -0.25, m.eisen));
    const schnur = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.008, n(6, 4), n(32, 20)), m.leinen);
    schnur.rotation.x = Math.PI / 2;
    schnur.scale.set(1, 1.17, 1);
    schnur.position.set(0, 1.36, -0.085);
    oben.innen.add(schnur);
    return koerper;
  };

  // Rechter Arm mit Hand: antippbar (Hinweis 2); gleiche Haltung des Oberkörpers
  const baueArm = () => {
    const g = new THREE.Group();
    const rechts = gesackt();
    g.add(rechts.aussen);
    const { gruppe: armR, hand: handR } = arm({
      stoff: mantel, haut, zelle, seite: -1,
      schulter: [-0.158, 1.405, 0], ellbogen: [-0.195, 1.14, 0.06], handgelenk: [-0.205, 0.91, 0.1],
    });
    rechts.innen.add(armR);
    // Dunkle Ränder unter den Nägeln an den Fingerspitzen (Handrücken außen), nur aus der Nähe zu erkennen
    for (const [x, y, z] of fingerspitzen(-1)) handR.add(box(0.004, 0.009, 0.013, x, y, z, nagelRand));
    return g;
  };

  const koerper = alsStufe(baueKoerper(), () => sparsam(baueKoerper), { abstand: STUFEN_ABSTAND.figur });
  const hand = new THREE.Group();
  hand.add(alsStufe(baueArm(), () => sparsam(baueArm), { abstand: STUFEN_ABSTAND.figur }));
  // Trefferkörper außerhalb der Detailstufe (bleibt beim Zusammenfassen stehen)
  const amArm = gesackt();
  const treffer = trefferKugel(0.16);
  treffer.position.set(-0.21, 0.86, 0.09);
  amArm.innen.add(treffer);
  hand.add(amArm.aussen);

  return { koerper, hand };
}

/**
 * Hinweis 1: die echte Wachsfigur unter einem Leinentuch auf zwei Böcken (Werkstatt).
 * Liegt entlang +z; Ursprung am Boden in der Mitte.
 * @param {Materialien} m
 */
function baueVerdeckteFigur(m) {
  const g = new THREE.Group();
  // Brett auf zwei Böcken
  g.add(box(0.62, 0.04, 1.95, 0, 0.47, 0, m.holzHell));
  for (const z of [-0.7, 0.7]) {
    g.add(box(0.6, 0.06, 0.08, 0, 0.42, z, m.holzDunkel));
    for (const x of [-0.25, 0.25]) g.add(box(0.05, 0.42, 0.05, x, 0.21, z, m.holzDunkel));
  }
  // Tuchkanten, Tuch, Kopf und Füße: Detailstufen (welt/stufen.js). Die Kanten gehören mit in die Stufe,
  // damit das Leinen ein Netz bleibt (berühren das Tuch, sonst wechselt die Zeichenreihenfolge)
  const baueFigur = () => {
    const t = new THREE.Group();
    // Herabhängende Tuchkanten
    t.add(box(0.015, 0.22, 1.55, -0.27, 0.4, -0.05, m.leinen));
    t.add(box(0.015, 0.22, 1.55, 0.27, 0.4, -0.05, m.leinen));
    // Tuch über dem Körper (gewölbt), Kopf und Füße schauen heraus
    const tuch = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.55, istSparsam() ? 12 : 18, 1, false, -Math.PI / 2, Math.PI), m.leinen);
    tuch.rotation.x = -Math.PI / 2; // Wölbung nach oben
    tuch.scale.set(1, 1, 0.75);
    tuch.position.set(0, 0.49, -0.05);
    t.add(tuch);
    // Kopf (fertige Wachsfigur, ohne Haar) am Ende +z: liegt auf dem Hinterkopf, Scheitel nach +z
    const k = kopf({ haut: m.wachs, zelle: 0, variante: 2 });
    k.rotation.set(-Math.PI / 2, Math.PI, 0, 'YXZ');
    k.position.set(0, 0.595, 0.86);
    t.add(k);
    // Wachsfüße am anderen Ende, Zehen nach oben
    for (const x of [-0.08, 0.08]) {
      const f = fuss(m.wachs);
      f.position.set(x, 0.6, -0.86);
      t.add(f);
    }
    return t;
  };
  g.add(alsStufe(baueFigur(), () => sparsam(baueFigur), { abstand: STUFEN_ABSTAND.figur }));
  return g;
}

/**
 * Hinweis 3: Wachsplatte mit Abdrücken von Schlüsselbärten, Messingspäne und Gießlöffel.
 * Ursprung auf der Tischplatte.
 * @param {Materialien} m
 */
function baueWerkbankFund(m) {
  const g = new THREE.Group();
  const wachsDunkel = new THREE.MeshLambertMaterial({ color: 0x3b2d20 });
  const vertiefung = new THREE.MeshLambertMaterial({ color: 0x1d150e });
  g.add(box(0.3, 0.025, 0.2, 0, 0.0125, 0, wachsDunkel));
  // Abdrücke von drei Schlüsselbärten (gestufte Kerben)
  for (let k = 0; k < 3; k++) {
    const x = -0.09 + k * 0.09;
    g.add(box(0.012, 0.004, 0.11, x, 0.026, 0.0, vertiefung));
    for (let s = 0; s < 3; s++) g.add(box(0.02 + ((k + s) % 3) * 0.008, 0.004, 0.012, x + 0.014, 0.026, -0.03 + s * 0.028, vertiefung));
  }
  // Messingspäne
  for (let i = 0; i < 9; i++) {
    const span = box(0.012, 0.004, 0.004, 0.24 + (i % 3) * 0.02, 0.002, -0.04 + Math.floor(i / 3) * 0.03, m.messing);
    span.rotation.y = i * 0.7;
    g.add(span);
  }
  // Gießlöffel
  const loeffel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.eisen);
  loeffel.position.set(-0.05, 0.04, 0.17);
  g.add(loeffel);
  const stiel = box(0.24, 0.012, 0.015, -0.21, 0.045, 0.17, m.eisen);
  g.add(stiel);
  const rest = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 12), m.metall);
  rest.position.set(-0.05, 0.03, 0.17);
  g.add(rest);
  const treffer = trefferKugel(0.22);
  treffer.position.set(0, 0.05, 0.05);
  g.add(treffer);
  return g;
}

/**
 * Setzt Leiche und Fundstücke in die Szene.
 * @param {THREE.Scene} scene
 * @param {Materialien} m
 * @returns {{ gruppe: THREE.Group, antippbar: THREE.Object3D[], hindernisse: Hindernis[], verdecker: number[][],
 *   kontaktFlecken: import('./fleck.js').KontaktFleck[], werkstattWerfer: THREE.BufferGeometry | null,
 *   stufen: { leiche: ReturnType<typeof baueStufen>[], figur: ReturnType<typeof baueStufen> } }}
 *   `stufen`: Detailstufen (welt/stufen.js) der Leiche (Körper, Hand) und der verdeckten Figur
 *   `verdecker`: Quader für die Lichtberechnung (an `etage.lichtSzene.quader` anhängen),
 *   `kontaktFlecken`: Flecken unter Böcken und Leiche (mit denen der Etage zu einem Netz bauen)
 */
export function setzeFundstuecke(scene, m) {
  const gruppe = new THREE.Group();
  gruppe.name = 'Fundstuecke';
  scene.add(gruppe);
  /** @type {THREE.Object3D[]} */
  const antippbar = [];
  /** @type {Hindernis[]} */
  const hindernisse = [];

  // Leiche auf dem freien Platz der Figurengruppe in Raum B (Podest bei x 0,6 … 3,6, z 15,2 … 18,0)
  const { koerper, hand } = baueLeiche(m);
  const leiche = new THREE.Group();
  leiche.name = 'Leiche';
  leiche.add(koerper, hand);
  leiche.position.set(2.8, 0.25, 17.3);
  leiche.rotation.y = Math.PI / 2 - 0.15;
  leiche.userData.lichtZonen = FIGUR_ZONEN;
  leiche.userData.kontaktFleck = FIGUR_FLECK;
  gruppe.add(leiche);
  hand.userData.hinweisId = 'wachs-fingernaegel';
  antippbar.push(hand);

  // Hinweis 1: verdeckte Figur in der Werkstatt
  const figur = baueVerdeckteFigur(m);
  figur.position.set(7.4, 0, 23.0);
  // liegt entlang z: Tuch, Kopf und Füße verdecken als Scheiben entlang z
  figur.userData.lichtZonen = { achse: 2, schnitte: [-1.05, -0.6, -0.2, 0.2, 0.6, 1.05] };
  figur.userData.hinweisId = 'figur-werkstatt';
  gruppe.add(figur);
  antippbar.push(figur);

  // Hinweis 3: auf der großen Werkbank (Tischplatte bei y = 0,895)
  const fund = baueWerkbankFund(m);
  fund.position.set(4.0, 0.895, 23.2);
  fund.userData.hinweisId = 'wachsplatte';
  gruppe.add(fund);
  eigeneMaterialien(fund);
  antippbar.push(fund);

  gruppe.updateWorldMatrix(true, true);
  hindernisse.push(alsHindernis(figur, 0.02));
  // Verdecker für die Lichtberechnung (vor dem Verschmelzen): Böcke, Brett, Gestell als Quader, Figuren als Scheiben
  const verdecker = sammleVerdecker(gruppe);
  const kontaktFlecken = sammleKontaktFlecken(gruppe);
  // Fensterschatten der Werkstatt (welt/werkstattschatten.js): die verdeckte Figur mit Brett und Böcken wirft
  // (in der Lichtkarte nur schwach, nahes Fenster und 10-cm-Raster); volle Form, vor Stufen und Verschmelzen
  figur.userData.wsWirft = true;
  const werkstattWerfer = sammleSchattenWerfer(figur);

  // Detailstufen (welt/stufen.js) nach Lichtmodell und Kontaktflecken (die sehen nur die volle Form),
  // vor dem Verschmelzen: Hand und verdeckte Figur, unten der Körper der Leiche
  const stufenHand = baueStufen(hand);
  const stufenFigur = baueStufen(figur);
  // Fundstücke je Material zusammenfassen (weniger Draw-Calls); Trefferkörper bleiben erhalten
  for (const g of [hand, figur, fund]) verschmelze(g);
  // Kleine Fundstücke auf der Werkbank: weicher Fleck darunter (zu klein fürs Lichtmodell; Gruppe hat keine Drehung)
  const umriss = new THREE.Box3();
  fund.traverse((o) => {
    if (/** @type {THREE.Mesh} */ (o).isMesh && !o.userData.nurTreffer) umriss.expandByObject(o, true);
  });
  const fleck = weicherFleck(umriss.max.x - umriss.min.x + 0.1, umriss.max.z - umriss.min.z + 0.1);
  fleck.position.set((umriss.min.x + umriss.max.x) / 2, fund.position.y + 0.003, (umriss.min.z + umriss.max.z) / 2);
  gruppe.add(fleck);

  // Der Körper der Leiche ist nicht antippbar: je Detailstufe ein Mesh je Material
  const koerperGruppe = new THREE.Group();
  leiche.add(koerperGruppe);
  koerperGruppe.add(koerper);
  leiche.updateWorldMatrix(true, true);
  const stufenKoerper = baueStufen(koerperGruppe);
  for (const s of [stufenHand, stufenFigur, stufenKoerper]) s.einhaengen(null);
  // Antippbares bekommt eigene Materialien (Hervorhebung), beide Stufen dieselben Kopien
  eigeneMaterialien(hand);
  eigeneMaterialien(figur);

  // stufen.leiche: in main.js mit der Sichtbarkeitszelle der Leiche verknüpfen; die verdeckte Figur
  // ist nicht in der Sichtbarkeit angemeldet und wählt ihre Stufe immer
  return { gruppe, antippbar, hindernisse, verdecker, kontaktFlecken, werkstattWerfer, stufen: { leiche: [stufenKoerper, stufenHand], figur: stufenFigur } };
}
