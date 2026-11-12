// ressourcen-v1: GPU-Ressourcen (Geometrien, Materialien, Texturen) freigeben.

/**
 * Gibt ein Material und alle daran hängenden Texturen frei
 * (auch Texturen in `uniforms` von ShaderMaterial).
 * Achtung: Wird das Material oder eine Textur noch von anderen Objekten genutzt,
 * ist sie danach auch dort freigegeben.
 *
 * @param {import('three').Material} material
 */
export function gibMaterialFrei(material) {
  for (const wert of Object.values(material)) {
    if (wert && wert.isTexture) wert.dispose();
  }
  const uniforms = /** @type {any} */ (material).uniforms;
  if (uniforms) {
    for (const uniform of Object.values(uniforms)) {
      if (uniform && uniform.value && uniform.value.isTexture) uniform.value.dispose();
    }
  }
  material.dispose();
}

/**
 * Gibt Geometrien, Materialien und Texturen eines Objekts und aller Kinder frei.
 * Das Objekt selbst wird nicht aus der Szene entfernt (dafür `objekt.removeFromParent()`).
 *
 * @param {import('three').Object3D} objekt
 */
export function gibFrei(objekt) {
  objekt.traverse((kind) => {
    const k = /** @type {any} */ (kind);
    if (k.geometry) k.geometry.dispose();
    if (k.material) {
      const materialien = Array.isArray(k.material) ? k.material : [k.material];
      materialien.forEach(gibMaterialFrei);
    }
  });
}
