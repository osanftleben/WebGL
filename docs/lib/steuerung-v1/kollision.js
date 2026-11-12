// steuerung-v1: einfache Kollision im Grundriss (Kreis gegen achsenparallele Rechtecke).
import * as THREE from 'three';

/**
 * Ein Hindernis im Grundriss (Draufsicht, x/z-Ebene), achsenparallel.
 * @typedef {object} Hindernis
 * @property {number} minX
 * @property {number} maxX
 * @property {number} minZ
 * @property {number} maxZ
 */

const _box = new THREE.Box3();

/**
 * Erzeugt ein Hindernis aus der Hülle (Bounding Box) eines Objekts in Weltkoordinaten.
 * Das Objekt muss schon an seiner endgültigen Stelle stehen (Weltmatrix aktuell).
 * Gedrehte Objekte ergeben die umschließende, achsenparallele Hülle.
 *
 * @param {import('three').Object3D} objekt
 * @param {number} [rand=0] Zusätzlicher Abstand in Metern auf allen Seiten.
 * @returns {Hindernis}
 */
export function alsHindernis(objekt, rand = 0) {
  objekt.updateWorldMatrix(true, true);
  _box.setFromObject(objekt);
  return {
    minX: _box.min.x - rand,
    maxX: _box.max.x + rand,
    minZ: _box.min.z - rand,
    maxZ: _box.max.z + rand,
  };
}

/**
 * Schiebt einen Kreis (Spieler) aus allen Hindernissen heraus.
 * Bewegt sich der Spieler schräg gegen eine Wand, gleitet er daran entlang.
 * Ändert `position.x` und `position.z` direkt (keine neuen Objekte).
 *
 * @param {import('three').Vector3} position Mittelpunkt des Spielers (y wird ignoriert).
 * @param {number} radius Radius des Spielers in Metern.
 * @param {readonly Hindernis[]} hindernisse
 * @param {number} [durchgaenge=2] Wiederholungen für Ecken mit mehreren Hindernissen.
 */
export function schiebeHeraus(position, radius, hindernisse, durchgaenge = 2) {
  for (let d = 0; d < durchgaenge; d++) {
    let verschoben = false;
    for (const h of hindernisse) {
      // Nächster Punkt des Rechtecks zum Kreismittelpunkt
      const nx = Math.min(Math.max(position.x, h.minX), h.maxX);
      const nz = Math.min(Math.max(position.z, h.minZ), h.maxZ);
      const dx = position.x - nx;
      const dz = position.z - nz;
      const abstand2 = dx * dx + dz * dz;
      if (abstand2 >= radius * radius) continue;

      if (abstand2 > 1e-12) {
        // Mittelpunkt außerhalb: entlang der Verbindungslinie hinausschieben
        const abstand = Math.sqrt(abstand2);
        const schub = (radius - abstand) / abstand;
        position.x += dx * schub;
        position.z += dz * schub;
      } else {
        // Mittelpunkt innerhalb: zur nächstgelegenen Kante hinaus
        const links = position.x - h.minX;
        const rechts = h.maxX - position.x;
        const vorn = position.z - h.minZ;
        const hinten = h.maxZ - position.z;
        const kleinste = Math.min(links, rechts, vorn, hinten);
        if (kleinste === links) position.x = h.minX - radius;
        else if (kleinste === rechts) position.x = h.maxX + radius;
        else if (kleinste === vorn) position.z = h.minZ - radius;
        else position.z = h.maxZ + radius;
      }
      verschoben = true;
    }
    if (!verschoben) break;
  }
}
