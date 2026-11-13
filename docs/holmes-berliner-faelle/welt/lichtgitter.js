// Vorab berechnetes Lichtgitter (Strahlverfolgung mit .claude/scripts/holmes_licht.py) einlesen
// und als Umgebungslicht für alle beleuchteten Materialien verwenden.
// Das Gitter speichert je Punkt die Bestrahlungsstärke aus 6 Richtungen (+x, −x, +y, −y, +z, −z).
import * as THREE from 'three';

/**
 * @typedef {object} Lichtgitter
 * @property {THREE.Data3DTexture} textur
 * @property {{ nx: number, ny: number, nz: number, schritt: number, ursprung: number[], hoechstwert: number, gamma: number }} info
 */

/**
 * Lädt Bild und Beschreibung des Lichtgitters (lokale Dateien).
 * @param {URL} ordner Ordner mit licht-etage3.png und licht-etage3.json
 * @returns {Promise<Lichtgitter>}
 */
export async function ladeLichtgitter(ordner) {
  const info = await (await fetch(new URL('licht-etage3.json', ordner))).json();
  const bild = new Image();
  bild.src = new URL('licht-etage3.png', ordner).href;
  await bild.decode();
  const breite = info.nx * 6;
  const hoehe = info.ny;
  const tiefe = info.nz;
  const canvas = document.createElement('canvas');
  canvas.width = bild.width;
  canvas.height = bild.height;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d', { willReadFrequently: true }));
  ctx.drawImage(bild, 0, 0);
  // Bildzeile z·ny + y, Spalte x  →  Texel (x, y, z): die Zeilen liegen bereits in dieser Reihenfolge
  const daten = new Uint8Array(ctx.getImageData(0, 0, breite, hoehe * tiefe).data.buffer);
  const textur = new THREE.Data3DTexture(daten, breite, hoehe, tiefe);
  textur.format = THREE.RGBAFormat;
  textur.type = THREE.UnsignedByteType;
  textur.minFilter = THREE.LinearFilter;
  textur.magFilter = THREE.LinearFilter;
  textur.unpackAlignment = 1;
  textur.needsUpdate = true;
  return { textur, info };
}

/**
 * Ersetzt bei allen beleuchteten Materialien unter `wurzel` das Umgebungslicht durch das Lichtgitter.
 * (Direkte Lichtquellen mit Schatten bleiben unberührt.)
 * @param {THREE.Object3D} wurzel
 * @param {Lichtgitter} gitter
 * @param {number} staerke Helligkeitsfaktor
 */
export function wendeLichtgitterAn(wurzel, gitter, staerke) {
  const { info } = gitter;
  const uniforms = {
    lichtGitter: { value: gitter.textur },
    lgUrsprung: { value: new THREE.Vector3(...info.ursprung) },
    lgSchritt: { value: info.schritt },
    lgN: { value: new THREE.Vector3(info.nx, info.ny, info.nz) },
    lgMax: { value: info.hoechstwert },
    lgGamma: { value: info.gamma },
    lgStaerke: { value: staerke },
  };
  /** @type {Set<THREE.Material>} */
  const erledigt = new Set();
  wurzel.traverse((o) => {
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh) return;
    const mat = /** @type {any} */ (mesh.material);
    if (!mat || erledigt.has(mat)) return;
    if (!(mat.isMeshLambertMaterial || mat.isMeshStandardMaterial)) return;
    if (mat.blending === THREE.AdditiveBlending) return;
    erledigt.add(mat);
    const vorher = mat.onBeforeCompile;
    const vorherSchluessel = mat.customProgramCacheKey;
    mat.onBeforeCompile = (/** @type {any} */ shader, /** @type {any} */ r) => {
      if (vorher) vorher.call(mat, shader, r);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLgWelt;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n\tvLgWelt = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vLgWelt;
uniform highp sampler3D lichtGitter;
uniform vec3 lgUrsprung;
uniform float lgSchritt;
uniform vec3 lgN;
uniform float lgMax;
uniform float lgGamma;
uniform float lgStaerke;
vec3 lgWert( vec3 g, float richtung ) {
	vec3 c = clamp( g, vec3( 0.5 ), lgN - 0.5 );
	vec3 uvw = vec3( ( richtung * lgN.x + c.x ) / ( 6.0 * lgN.x ), c.y / lgN.y, c.z / lgN.z );
	return pow( texture( lichtGitter, uvw ).rgb, vec3( lgGamma ) ) * lgMax;
}
vec3 lgBestrahlung( vec3 p, vec3 n ) {
	vec3 g = ( p - lgUrsprung ) / lgSchritt;
	vec3 n2 = n * n;
	return n2.x * lgWert( g, n.x > 0.0 ? 0.0 : 1.0 )
		+ n2.y * lgWert( g, n.y > 0.0 ? 2.0 : 3.0 )
		+ n2.z * lgWert( g, n.z > 0.0 ? 4.0 : 5.0 );
}`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
	{
		vec3 lgNormale = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
		vec3 lgE = lgBestrahlung( vLgWelt + lgNormale * 0.15, lgNormale );
		reflectedLight.indirectDiffuse = lgE * BRDF_Lambert( material.diffuseColor ) * lgStaerke;
	}`);
    };
    mat.customProgramCacheKey = () => (vorherSchluessel ? vorherSchluessel.call(mat) : '') + '|lichtgitter';
    mat.needsUpdate = true;
  });
  return uniforms;
}
