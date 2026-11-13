// Statische Teile einer Gruppe je Material zusammenfassen (weniger Draw-Calls).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Fasst alle undurchsichtigen Meshes einer Gruppe je Material zu einem Mesh zusammen
 * (weniger Draw-Calls, wichtig fürs Handy). Durchsichtige Teile bleiben einzeln.
 * @param {THREE.Group} gruppe
 * @returns {THREE.Mesh[]} die neuen, zusammengefassten Meshes
 */
export function verschmelze(gruppe) {
  /** @type {Map<THREE.Material, THREE.BufferGeometry[]>} */
  const jeMaterial = new Map();
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
    if (!jeMaterial.has(material)) jeMaterial.set(material, []);
    /** @type {THREE.BufferGeometry[]} */ (jeMaterial.get(material)).push(geo);
    alte.push(mesh);
  });
  for (const mesh of alte) mesh.removeFromParent();
  // Leere Untergruppen bleiben stehen (schaden nicht); neue Meshes direkt in die Gruppe (ohne Transformation)
  gruppe.updateWorldMatrix(true, false);
  const inverse = gruppe.matrixWorld.clone().invert();
  /** @type {THREE.Mesh[]} */
  const neue = [];
  for (const [material, geos] of jeMaterial) {
    const zusammen = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!zusammen) continue;
    zusammen.applyMatrix4(inverse);
    const mesh = new THREE.Mesh(zusammen, material);
    gruppe.add(mesh);
    neue.push(mesh);
  }
  return neue;
}
