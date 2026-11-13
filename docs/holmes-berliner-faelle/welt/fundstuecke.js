// Fall 1: Leiche und Fundstücke (Hinweise) in der III. Etage.
// Alles hier ist Spielhandlung und damit erfunden (siehe Projektnotizen, Entwurf Fall 1).
// Antippbare Teile bleiben einzelne Objekte (nicht verschmolzen) und bekommen eigene
// Material-Kopien, damit eine Hervorhebung nur sie betrifft.
import * as THREE from 'three';
import { box } from './bauteile.js';
import { alsHindernis } from 'steuerung/kollision.js';
import { verschmelze } from './verschmelzen.js';

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
  const koerper = new THREE.Group();
  const haut = new THREE.MeshLambertMaterial({ color: 0xcdc3b4 });
  const mantel = m.kleidDunkel;

  // Beine, Schuhe
  for (const s of [-1, 1]) {
    const bein = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.82, 10), m.kleidGrau);
    bein.position.set(s * 0.09, 0.41, 0);
    koerper.add(bein);
    koerper.add(box(0.1, 0.06, 0.24, s * 0.09, 0.03, 0.05, m.eisen));
  }
  // Langer Mantel (Kostüm), Oberkörper leicht nach vorn gesackt
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.6, 16), mantel);
  rock.position.y = 0.88;
  koerper.add(rock);
  const rumpf = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.72, 16), mantel);
  rumpf.position.set(0, 1.26, 0.03);
  rumpf.rotation.x = 0.08;
  koerper.add(rumpf);
  // Linker Arm hängt schlaff
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.64, 10), mantel);
  armL.position.set(0.25, 1.3, 0.02);
  armL.rotation.z = 0.06;
  koerper.add(armL);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), haut);
  handL.position.set(0.27, 0.95, 0.03);
  koerper.add(handL);
  // Kopf gesenkt und leicht zur Seite geneigt, darauf der Hut des Kostüms
  const kopfGruppe = new THREE.Group();
  kopfGruppe.position.set(0, 1.66, 0.05);
  kopfGruppe.rotation.set(0.42, 0, 0.12);
  const hals = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 12), haut);
  hals.position.y = 0.02;
  kopfGruppe.add(hals);
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), haut);
  kopf.scale.set(0.9, 1.18, 1);
  kopf.position.y = 0.14;
  kopfGruppe.add(kopf);
  const hut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 16), mantel);
  hut.position.y = 0.3;
  kopfGruppe.add(hut);
  const krempe = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.015, 20), mantel);
  krempe.position.y = 0.23;
  kopfGruppe.add(krempe);
  koerper.add(kopfGruppe);
  // Eisernes Standgestell hinter dem Körper mit Schnur um die Brust (Annahme)
  koerper.add(box(0.035, 1.5, 0.035, 0, 0.75, -0.3, m.eisen));
  koerper.add(box(0.34, 0.03, 0.03, 0, 1.42, -0.3, m.eisen));
  koerper.add(box(0.3, 0.025, 0.04, 0, 0.02, -0.25, m.eisen));
  const schnur = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.008, 6, 32), m.leinen);
  schnur.rotation.x = Math.PI / 2;
  schnur.scale.set(1, 1.35, 1);
  schnur.position.set(0, 1.38, -0.05);
  koerper.add(schnur);

  // Rechter Arm mit Hand: antippbar (Hinweis 2)
  const hand = new THREE.Group();
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.64, 10), mantel.clone());
  armR.position.set(-0.26, 1.3, 0.04);
  armR.rotation.set(-0.12, 0, -0.1);
  hand.add(armR);
  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), haut.clone());
  handR.scale.set(0.9, 1.2, 0.7);
  handR.position.set(-0.29, 0.95, 0.09);
  hand.add(handR);
  // Dunkle Ränder unter den Nägeln, nur aus der Nähe zu erkennen
  const naegel = box(0.05, 0.012, 0.02, -0.29, 0.9, 0.12, new THREE.MeshLambertMaterial({ color: 0x2e2419 }));
  hand.add(naegel);
  const treffer = trefferKugel(0.16);
  treffer.position.set(-0.28, 1.0, 0.08);
  hand.add(treffer);

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
  // Tuch über dem Körper (gewölbt), Kopf und Füße schauen heraus
  const tuch = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.55, 18, 1, false, -Math.PI / 2, Math.PI), m.leinen);
  tuch.rotation.x = -Math.PI / 2; // Wölbung nach oben
  tuch.scale.set(1, 1, 0.75);
  tuch.position.set(0, 0.49, -0.05);
  g.add(tuch);
  // Herabhängende Tuchkanten
  g.add(box(0.015, 0.22, 1.55, -0.27, 0.4, -0.05, m.leinen));
  g.add(box(0.015, 0.22, 1.55, 0.27, 0.4, -0.05, m.leinen));
  // Kopf (unbekleidete Wachsfigur, ohne Haar) am Ende +z
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12), m.wachs);
  kopf.scale.set(0.9, 1.0, 1.18);
  kopf.position.set(0, 0.6, 0.86);
  g.add(kopf);
  // Wachsfüße am anderen Ende
  for (const x of [-0.08, 0.08]) {
    const fuss = box(0.08, 0.2, 0.06, x, 0.6, -0.86, m.wachs);
    g.add(fuss);
  }
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
 * @returns {{ gruppe: THREE.Group, antippbar: THREE.Object3D[], hindernisse: Hindernis[] }}
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
  gruppe.add(leiche);
  hand.userData.hinweisId = 'wachs-fingernaegel';
  eigeneMaterialien(hand);
  antippbar.push(hand);

  // Hinweis 1: verdeckte Figur in der Werkstatt
  const figur = baueVerdeckteFigur(m);
  figur.position.set(7.4, 0, 23.0);
  figur.userData.hinweisId = 'figur-werkstatt';
  gruppe.add(figur);
  eigeneMaterialien(figur);
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

  // Fundstücke je Material zusammenfassen (weniger Draw-Calls); Trefferkörper bleiben erhalten
  for (const g of [hand, figur, fund]) verschmelze(g);

  // Der Körper der Leiche ist nicht antippbar: zu einem Mesh je Material zusammenfassen
  const koerperGruppe = new THREE.Group();
  leiche.add(koerperGruppe);
  koerperGruppe.add(koerper);
  leiche.updateWorldMatrix(true, true);
  verschmelze(koerperGruppe);

  return { gruppe, antippbar, hindernisse };
}
