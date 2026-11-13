// Ansprechbare Personen (Fall 1). Alle Personen sind erfunden.
//
// Schutzmann Kranich – belegt: Lederhelm mit Spitze und Messing-/Neusilberbeschlägen (DHM),
// Säbel für Schutzleute zu Fuß, Nummer auf der Achsel (Baedeker 1891, S. 34).
// Annahmen: Farbe von Rock und Hose (dunkelblau), Knöpfe, Koppel, Schnurrbart, Statur.
import * as THREE from 'three';
import { verschmelze } from './verschmelzen.js';

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
 * Baut Schutzmann Kranich (etwa 1,78 m, Blick nach +z). Eigene Materialien,
 * damit die Hervorhebung beim Anvisieren nur ihn betrifft.
 * @returns {THREE.Group} Gruppe mit `userData.person = 'kranich'` und unsichtbarem Trefferkörper
 */
export function baueSchutzmann() {
  const lambert = (/** @type {number} */ farbe) => new THREE.MeshLambertMaterial({ color: farbe });
  // Dunkelblau, aber nicht fast schwarz – sonst sind Licht und Schatten auf dem Stoff kaum zu sehen
  const rock = lambert(0x34405f);
  const hose = lambert(0x2a3042);
  const leder = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.38, metalness: 0, envMapIntensity: 0.8 });
  const messing = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.22, metalness: 1, envMapIntensity: 1.5 });
  const haut = lambert(0xd9b49a);
  const haar = lambert(0x4a3524);
  const stahl = new THREE.MeshStandardMaterial({ color: 0xb4b9be, roughness: 0.15, metalness: 1, envMapIntensity: 1.5 });

  const koerper = new THREE.Group();
  // Beine und Stiefel
  for (const s of [-1, 1]) {
    koerper.add(teil(new THREE.CylinderGeometry(0.068, 0.06, 0.84, 10), hose, s * 0.095, 0.42, 0));
    const stiefel = teil(new THREE.BoxGeometry(0.11, 0.1, 0.27), leder, s * 0.095, 0.05, 0.04);
    koerper.add(stiefel);
  }
  // Waffenrock mit Schößen, Koppel mit Schloss, Knopfreihe
  koerper.add(teil(new THREE.CylinderGeometry(0.21, 0.25, 0.32, 16), rock, 0, 0.95, 0));
  koerper.add(teil(new THREE.CylinderGeometry(0.19, 0.22, 0.5, 16), rock, 0, 1.33, 0));
  koerper.add(teil(new THREE.CylinderGeometry(0.222, 0.222, 0.06, 16), leder, 0, 1.1, 0));
  koerper.add(teil(new THREE.BoxGeometry(0.07, 0.055, 0.02), messing, 0, 1.1, 0.222));
  for (let i = 0; i < 6; i++) koerper.add(teil(new THREE.SphereGeometry(0.012, 8, 6), messing, 0, 1.18 + i * 0.065, 0.2));
  // Stehkragen
  koerper.add(teil(new THREE.CylinderGeometry(0.075, 0.08, 0.07, 14), rock, 0, 1.6, 0));
  // Schulterstücke mit Nummer (Messing)
  for (const s of [-1, 1]) {
    koerper.add(teil(new THREE.BoxGeometry(0.1, 0.02, 0.07), rock, s * 0.16, 1.585, 0));
    koerper.add(teil(new THREE.BoxGeometry(0.04, 0.012, 0.03), messing, s * 0.17, 1.6, 0.0));
  }
  // Arme, Hände
  for (const s of [-1, 1]) {
    const arm = teil(new THREE.CylinderGeometry(0.055, 0.05, 0.6, 10), rock, s * 0.255, 1.3, 0);
    arm.rotation.z = s * 0.08;
    koerper.add(arm);
    koerper.add(teil(new THREE.SphereGeometry(0.046, 10, 8), haut, s * 0.285, 0.97, 0.01));
  }
  // Kopf mit Schnurrbart
  koerper.add(teil(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 12), haut, 0, 1.66, 0));
  const kopf = teil(new THREE.SphereGeometry(0.1, 20, 14), haut, 0, 1.77, 0);
  kopf.scale.set(0.9, 1.15, 1);
  koerper.add(kopf);
  const bart = teil(new THREE.BoxGeometry(0.1, 0.018, 0.03), haar, 0, 1.735, 0.085);
  koerper.add(bart);
  // Helm mit Spitze: Lederglocke, Vorder- und Nackenschirm, Beschlag vorn, Spitze aus Messing
  const glocke = teil(new THREE.SphereGeometry(0.115, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), leder, 0, 1.84, 0);
  glocke.scale.set(0.95, 1.05, 1.08);
  koerper.add(glocke);
  const schirmV = teil(new THREE.BoxGeometry(0.17, 0.012, 0.08), leder, 0, 1.845, 0.12);
  schirmV.rotation.x = 0.25;
  koerper.add(schirmV);
  const schirmH = teil(new THREE.BoxGeometry(0.15, 0.012, 0.08), leder, 0, 1.85, -0.12);
  schirmH.rotation.x = -0.35;
  koerper.add(schirmH);
  koerper.add(teil(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 12), messing, 0, 1.97, 0));
  koerper.add(teil(new THREE.ConeGeometry(0.018, 0.1, 10), messing, 0, 2.03, 0));
  const beschlag = teil(new THREE.CircleGeometry(0.05, 14), messing, 0, 1.9, 0.122);
  beschlag.rotation.x = -0.35;
  koerper.add(beschlag);
  // Säbel an der linken Hüfte (Scheide schräg nach hinten), Griff mit Messingbügel
  const saebel = new THREE.Group();
  saebel.add(teil(new THREE.BoxGeometry(0.03, 0.85, 0.018), stahl, 0, -0.42, 0));
  saebel.add(teil(new THREE.BoxGeometry(0.02, 0.13, 0.025), leder, 0, 0.07, 0));
  saebel.add(teil(new THREE.TorusGeometry(0.05, 0.007, 6, 16, Math.PI), messing, 0, 0.07, 0.02));
  saebel.position.set(0.26, 1.03, -0.02);
  saebel.rotation.set(-0.45, 0, 0.12);
  koerper.add(saebel);

  const person = new THREE.Group();
  person.name = 'Schutzmann Kranich';
  person.userData.person = 'kranich';
  const verschmolzen = new THREE.Group();
  verschmolzen.add(koerper);
  person.add(verschmolzen);
  person.updateWorldMatrix(true, true);
  verschmelze(verschmolzen);

  // Großer, unsichtbarer Trefferkörper: leicht anzutippen
  const treffer = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.9, 8), new THREE.MeshBasicMaterial());
  treffer.position.y = 0.95;
  treffer.visible = false;
  treffer.userData.nurTreffer = true;
  person.add(treffer);
  return person;
}
