// Statische Teile einer Gruppe je Material zusammenfassen (weniger Draw-Calls).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Fasst alle undurchsichtigen Meshes einer Gruppe je Material zu einem Mesh zusammen
 * (weniger Draw-Calls, wichtig fürs Handy). Durchsichtige Teile bleiben einzeln.
 * @param {THREE.Group} gruppe
 * @param {Map<THREE.Mesh, Float32Array>} [lichtkarte] Lichtkarten-Koordinaten je Mesh (Attribut `lkUv`);
 *   Meshes ohne Eintrag bekommen (0, 0) = „keine Lichtkarte“
 * @param {{ schluessel?: (box: THREE.Box3) => string }} [optionen]
 *   `schluessel`: teilt zusätzlich nach Ort auf (z. B. Sichtbarkeitszelle aus dem Weltquader des Teils);
 *   die neuen Meshes tragen ihn in `userData.zelle`
 * @returns {THREE.Mesh[]} die neuen, zusammengefassten Meshes
 */
export function verschmelze(gruppe, lichtkarte, optionen = {}) {
  /** @type {Map<string, { material: THREE.Material, zelle: string, geos: THREE.BufferGeometry[] }>} */
  const jeMaterial = new Map();
  /** @type {Map<THREE.Material, number>} */
  const materialNr = new Map();
  const box = new THREE.Box3();
  /** @type {THREE.Mesh[]} */
  const alte = [];
  gruppe.traverse((o) => {
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh) return;
    // Unsichtbare Trefferkörper fürs Antippen bleiben unverändert stehen
    if (mesh.userData.nurTreffer) return;
    // Unsichtbare Hilfskörper (nur für Hindernisse) entfernen, nicht zeichnen
    if (!mesh.visible) {
      alte.push(mesh);
      return;
    }
    const material = /** @type {THREE.Material} */ (mesh.material);
    // Durchsichtiges bleibt einzeln (Sortierung), außer es ist ausdrücklich als verschmelzbar markiert
    if (material.transparent && !material.userData.verschmelzbar) return;
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    const lk = lichtkarte?.get(mesh);
    if (lk) geo.setAttribute('lkUv', new THREE.BufferAttribute(lk, 2));
    let zelle = '';
    if (optionen.schluessel) {
      geo.computeBoundingBox();
      zelle = optionen.schluessel(box.copy(/** @type {THREE.Box3} */ (geo.boundingBox)));
    }
    if (!materialNr.has(material)) materialNr.set(material, materialNr.size);
    const k = `${materialNr.get(material)}|${zelle}`;
    if (!jeMaterial.has(k)) jeMaterial.set(k, { material, zelle, geos: [] });
    /** @type {{ geos: THREE.BufferGeometry[] }} */ (jeMaterial.get(k)).geos.push(geo);
    alte.push(mesh);
  });
  for (const mesh of alte) mesh.removeFromParent();
  // Leere Untergruppen bleiben stehen (schaden nicht); neue Meshes direkt in die Gruppe (ohne Transformation)
  gruppe.updateWorldMatrix(true, false);
  const inverse = gruppe.matrixWorld.clone().invert();
  /** @type {THREE.Mesh[]} */
  const neue = [];
  for (const { material, zelle, geos } of jeMaterial.values()) {
    // Zusammenfassen geht nur mit gleichen Attributen: fehlende Lichtkarten-Koordinaten mit (0, 0) ergänzen
    if (geos.some((g) => g.getAttribute('lkUv'))) {
      for (const g of geos) {
        if (!g.getAttribute('lkUv')) g.setAttribute('lkUv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
      }
    }
    const zusammen = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!zusammen) continue;
    zusammen.applyMatrix4(inverse);
    const mesh = new THREE.Mesh(zusammen, material);
    if (optionen.schluessel) mesh.userData.zelle = zelle;
    gruppe.add(mesh);
    neue.push(mesh);
  }
  return neue;
}
