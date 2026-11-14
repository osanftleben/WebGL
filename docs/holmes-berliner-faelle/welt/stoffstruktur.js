import * as THREE from 'three';

/**
 * Stoffstruktur für Tuch und Wildleder (nur volle Detailstufe, Nutzer: zusätzliche Effekte nur in der
 * höchsten Stufe). Erweitert ein MeshLambertMaterial im Shader, ohne Texturkoordinaten:
 * - Wolken: leichte Hell-dunkel-Schwankung (zwei Rauschlagen, ~2 cm und ~7 mm), wie ungleich gewalktes Tuch
 * - Köper: feine schräge Rippen (~1,5 mm); werden ausgeblendet, sobald sie kleiner als ein Pixel wären
 *   (sonst Moiré in der Ferne)
 * - Flaum: Wollstoff hellt an streifenden Kanten etwas auf
 * Die mittlere Helligkeit bleibt gleich, damit der Wechsel zur sparsamen Stufe nicht auffällt.
 * Die Rechnung läuft im Raum der Netzpunkte (nach dem Verschmelzen: Raum der Figur, Meter).
 * @template {THREE.Material} T
 * @param {T} mat
 * @returns {T}
 */
export function stoffStruktur(mat) {
  const vorher = mat.onBeforeCompile;
  const vorherSchluessel = mat.customProgramCacheKey;
  mat.onBeforeCompile = (/** @type {any} */ shader, /** @type {any} */ r) => {
    if (vorher) vorher.call(mat, shader, r);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStoffOrt;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvStoffOrt = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vStoffOrt;
float stoffZufall( vec3 p ) {
	p = fract( p * 0.3183099 + 0.1 );
	p *= 17.0;
	return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}
float stoffRauschen( vec3 x ) {
	vec3 i = floor( x );
	vec3 f = fract( x );
	f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( mix( stoffZufall( i ), stoffZufall( i + vec3( 1, 0, 0 ) ), f.x ),
			mix( stoffZufall( i + vec3( 0, 1, 0 ) ), stoffZufall( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
		mix( mix( stoffZufall( i + vec3( 0, 0, 1 ) ), stoffZufall( i + vec3( 1, 0, 1 ) ), f.x ),
			mix( stoffZufall( i + vec3( 0, 1, 1 ) ), stoffZufall( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
	{
		float wolke = stoffRauschen( vStoffOrt * 50.0 ) * 0.6 + stoffRauschen( vStoffOrt * 140.0 ) * 0.4;
		float s = ( vStoffOrt.x + vStoffOrt.y * 0.8 + vStoffOrt.z ) * 4200.0;
		float sichtbar = clamp( 1.5 - fwidth( s ) * 0.5, 0.0, 1.0 );
		float koeper = sin( s ) * sichtbar;
		float flaum = pow( 1.0 - abs( dot( normal, normalize( vViewPosition ) ) ), 3.0 );
		diffuseColor.rgb *= 1.0 + ( wolke - 0.5 ) * 0.26 + koeper * 0.06 + flaum * 0.45;
	}`);
  };
  mat.customProgramCacheKey = () => (vorherSchluessel ? vorherSchluessel.call(mat) : '') + '|stoff';
  mat.needsUpdate = true;
  return mat;
}
