// Weicher Glanz gewachster Dielen: Spiegelung der hellen Fenster im Boden.
// Statt die Szene ein zweites Mal zu zeichnen (zu teuer fürs Handy), rechnet der Shader für jeden
// Bodenpunkt aus, ob der gespiegelte Blickstrahl eine Fensteröffnung trifft. Die Ränder werden mit
// der Entfernung weicher (raue Wachsoberfläche). Wände, Möbel und Figuren spiegeln sich nicht –
// bei mattem Holz fällt das kaum auf; die hellen Fenster sind das, was man sieht.
import * as THREE from 'three';

/** Grundstärke des Glanzes (Faktor auf die Fensterhelligkeit, Annahme: gewachste Dielen) */
export const GLANZ_STAERKE = 1.6;
/** Unschärfe: Breite des weichen Rands je Meter Abstand zwischen Boden und Fenster */
export const GLANZ_UNSCHAERFE = 0.35;

/**
 * @typedef {object} LichtFenster Fensteröffnung wie für die Lichtberechnung (Ebene = Außenseite der Wand)
 * @property {'x' | 'z'} achse Wand liegt quer zur x- bzw. z-Achse
 * @property {number} ebene Lage der Wand-Außenseite
 * @property {number[]} min [entlang der Wand, Höhe] unten links
 * @property {number[]} max [entlang der Wand, Höhe] oben rechts
 */

/**
 * Ergänzt ein Boden-Material (Lambert) um die Spiegelung der Fenster.
 * @param {THREE.MeshLambertMaterial} material Bodenmaterial (Oberseite zeigt nach +y)
 * @param {LichtFenster[]} fenster Fensteröffnungen
 * @param {number[][]} raeumeZ Räume als z-Bereiche [von, bis]; ein Fenster spiegelt sich nur im eigenen Raum
 * @param {{ wandDicke?: number, scheibe?: number, farbe?: THREE.Color, staerke?: number, unschaerfe?: number }} [o]
 *   wandDicke: Dicke der Außenwand; scheibe: Abstand der Scheibe von der Innenseite der Wand
 * @returns {{ bgStaerke: { value: number }, bgUnschaerfe: { value: number } }} Werte zum Abstimmen
 */
export function bodenGlanz(material, fenster, raeumeZ, o = {}) {
  const wandDicke = o.wandDicke ?? 0.5;
  const scheibe = o.scheibe ?? 0.35;
  const n = fenster.length;
  const ebenen = [];
  const rechtecke = [];
  const raeume = [];
  for (const f of fenster) {
    const innen = f.ebene - wandDicke;
    ebenen.push(new THREE.Vector4(f.achse === 'x' ? 0 : 1, innen, innen + scheibe, 0));
    rechtecke.push(new THREE.Vector4(f.min[0], f.max[0], f.min[1], f.max[1]));
    // Raum, in dem das Fenster liegt (Wand quer zu z: der Raum, der an diese Wand stößt)
    const z = f.achse === 'x' ? (f.min[0] + f.max[0]) / 2 : innen - 0.1;
    const raum = raeumeZ.find(([von, bis]) => z >= von && z <= bis) ?? [-1e4, 1e4];
    raeume.push(new THREE.Vector2(raum[0], raum[1]));
  }
  const uniforms = {
    bgEbene: { value: ebenen },
    bgRechteck: { value: rechtecke },
    bgRaum: { value: raeume },
    // Farbe der Fensterflächen (wie m.fensterGlas), linear
    bgFarbe: { value: o.farbe ?? new THREE.Color(0xe4e8ea) },
    bgStaerke: { value: o.staerke ?? GLANZ_STAERKE },
    bgUnschaerfe: { value: o.unschaerfe ?? GLANZ_UNSCHAERFE },
  };
  const vorher = material.onBeforeCompile;
  const vorherSchluessel = material.customProgramCacheKey;
  material.onBeforeCompile = (/** @type {any} */ shader, /** @type {any} */ r) => {
    if (vorher) vorher.call(material, shader, r);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBgWelt;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tvBgWelt = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
#define BG_N ${n}
varying vec3 vBgWelt;
uniform vec4 bgEbene[ BG_N ];
uniform vec4 bgRechteck[ BG_N ];
uniform vec2 bgRaum[ BG_N ];
uniform vec3 bgFarbe;
uniform float bgStaerke;
uniform float bgUnschaerfe;
// Anteil eines weichen Fensters der Breite w um u, der in [a, b] liegt (Kastenfilter)
float bgAnteil( float u, float a, float b, float w ) {
	return clamp( ( min( u + 0.5 * w, b ) - max( u - 0.5 * w, a ) ) / w, 0.0, 1.0 );
}
// Wie stark sieht der gespiegelte Blickstrahl von p aus ein Fenster (0..1)?
float bgFensterTreffer( vec3 p, vec3 r ) {
	float summe = 0.0;
	for ( int i = 0; i < BG_N; i ++ ) {
		vec4 e = bgEbene[ i ];
		vec4 q = bgRechteck[ i ];
		vec2 raum = bgRaum[ i ];
		if ( p.z < raum.x || p.z > raum.y ) continue;
		// pw/rw: Lage und Richtung quer zur Wand, pa/ra: entlang der Wand
		float pw = e.x < 0.5 ? p.x : p.z;
		float rw = e.x < 0.5 ? r.x : r.z;
		float pa = e.x < 0.5 ? p.z : p.x;
		float ra = e.x < 0.5 ? r.z : r.x;
		if ( rw <= 0.001 ) continue;
		// Treffer in der Wandöffnung (Innenseite) und an der Scheibe – die Laibung verdeckt schräge Blicke
		float t1 = ( e.y - pw ) / rw;
		float t2 = ( e.z - pw ) / rw;
		if ( t1 < 0.0 ) continue;
		float w1 = bgUnschaerfe * t1 + 0.02;
		float w2 = bgUnschaerfe * t2 + 0.02;
		float c1 = bgAnteil( pa + ra * t1, q.x, q.y, w1 ) * bgAnteil( p.y + r.y * t1, q.z, q.w, w1 );
		float c2 = bgAnteil( pa + ra * t2, q.x, q.y, w2 ) * bgAnteil( p.y + r.y * t2, q.z, q.w, w2 );
		summe += min( c1, c2 );
	}
	return min( summe, 1.0 );
}`)
      .replace('#include <opaque_fragment>', `{
		vec3 bgN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
		if ( bgN.y > 0.9 ) {
			vec3 bgV = normalize( vBgWelt - cameraPosition );
			vec3 bgR = reflect( bgV, vec3( 0.0, 1.0, 0.0 ) );
			// Fresnel (Schlick, F0 = 0,04): bei flachem Blick glänzt es stärker; raues Wachs erreicht
			// auch ganz flach nicht den vollen Spiegelglanz (Obergrenze 0,35 statt 1)
			float bgCos = clamp( - bgV.y, 0.0, 1.0 );
			float bgFresnel = 0.04 + 0.31 * pow( 1.0 - bgCos, 5.0 );
			float bgAo = 1.0;
			#ifdef USE_AOMAP
				// unter Möbeln und an Wänden (Bodenabdunkelung) glänzt es weniger
				bgAo = texture2D( aoMap, vAoMapUv ).r;
				bgAo *= bgAo;
			#endif
			outgoingLight += bgFarbe * bgFensterTreffer( vBgWelt, bgR ) * bgFresnel * bgAo * bgStaerke;
		}
	}
	#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => (vorherSchluessel ? vorherSchluessel.call(material) : '') + '|bodenglanz';
  material.needsUpdate = true;
  return uniforms;
}
