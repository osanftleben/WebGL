// Licht und Schatten (Grafik-Feinschliff A): Farbkurve, einmalig berechnete Schatten,
// abgedunkelte Bodenbereiche an Wänden und unter Möbeln.
import * as THREE from 'three';

/**
 * Einstellungen der Augenanpassung (Bibliothek belichtung-v1) für diese Szene: nur aufhellen, nie abdunkeln
 * (die Szene ist eher zu dunkel; minFaktor 1 = Grundbelichtung 1,25 ist die Untergrenze).
 * Gemessene mittlere Helligkeit (vor der Belichtung, Stand 14. 11. nach der Aufhellung): Figurengruppe
 * hinter dem Kranich ≈ 0,052, nah ≈ 0,034, übliche Raumblicke ≈ 0,045–0,054, Fensterecke ≈ 0,075,
 * Werkstatt ≈ 0,09. Faktor = (Bezug / Messung)^0,5: Bezug 0,075 → Gruppe ≈ 1,2, Fensterecke und
 * Werkstatt 1,0, dunkle Blicke bis 1,3 (+30 %).
 */
export const AUGEN_OPTIONEN = {
  bezugsHelligkeit: 0.075,
  minFaktor: 1,
  maxFaktor: 1.3,
};

/**
 * Stellt Farbkurve und Schatten des Renderers ein. Die Schatten werden nicht in jedem Bild
 * neu berechnet (der Raum steht still), sondern nur auf Anforderung (`schattenNeu`).
 * @param {THREE.WebGLRenderer} renderer
 */
export function richteRendererEin(renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  // PCF mit Weichzeichnung (radius); wird nur einmal berechnet (autoUpdate = false)
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
}

/**
 * Fordert eine einmalige Neuberechnung der Schatten an (z. B. wenn sich eine Person dreht).
 * @param {THREE.WebGLRenderer} renderer
 */
export function schattenNeu(renderer) {
  renderer.shadowMap.needsUpdate = true;
}

/**
 * Schaltet Schattenwurf und -empfang für alle Meshes unter `wurzel` ein.
 * Durchsichtiges und unbeleuchtete Flächen (Fensterlicht) werfen keine Schatten.
 * @param {THREE.Object3D} wurzel
 */
export function aktiviereSchatten(wurzel) {
  wurzel.traverse((o) => {
    const mesh = /** @type {THREE.Mesh} */ (o);
    if (!mesh.isMesh) return;
    const mat = /** @type {THREE.Material} */ (mesh.material);
    const unbeleuchtet = /** @type {any} */ (mat).isMeshBasicMaterial;
    mesh.castShadow = !mat.transparent && !unbeleuchtet;
    mesh.receiveShadow = !unbeleuchtet;
  });
}

/**
 * Richtet das Fensterlicht als Schattenwerfer ein (weiche Schatten, Bereich über die ganze Etage).
 * @param {THREE.DirectionalLight} licht
 * @param {number} umfang halbe Kantenlänge des Schattenbereichs in Metern
 * @param {number} [groesse=2048] Auflösung der Schattenkarte
 */
export function schattenLicht(licht, umfang, groesse = 2048) {
  licht.castShadow = true;
  licht.shadow.mapSize.set(groesse, groesse);
  const kamera = licht.shadow.camera;
  kamera.left = -umfang;
  kamera.right = umfang;
  kamera.top = umfang;
  kamera.bottom = -umfang;
  kamera.near = 1;
  kamera.far = 80;
  kamera.updateProjectionMatrix();
  // normalBias gegen Streifen/Zacken auf flachen Flächen (Tuch, Tischplatten) bei schrägem Licht
  licht.shadow.bias = -0.0005;
  licht.shadow.normalBias = 0.05;
  licht.shadow.radius = 4;
}

/**
 * Erzeugt die Spiegelungen aus dem **echten Raum**: Die Szene wird einmal von einem Punkt aus
 * in alle sechs Richtungen aufgenommen (CubeCamera) und daraus eine Spiegelungs-Umgebung
 * berechnet. So spiegeln Gold, Messing, Glas und Klingen die hellen Fenster und die Wände.
 * Die Umgebung bekommen **nur** glänzende Materialien (MeshStandardMaterial); Wände und Böden
 * (Lambert) bleiben unberührt. Nach dem Aufbau der Szene und dem Einschalten der Schatten aufrufen.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} ort Aufnahmepunkt (Raummitte in Augenhöhe)
 * @param {THREE.Object3D} [wurzel=scene] nur Materialien unter dieser Wurzel bekommen die Umgebung
 *   (z. B. eine eigene Aufnahme für eine einzelne Figur)
 * @param {(mat: THREE.Material) => boolean} [nur] zusätzlich nur Materialien, für die das gilt
 * @returns {THREE.Texture}
 */
export function erzeugeUmgebung(renderer, scene, ort, wurzel = scene, nur = () => true) {
  const ziel = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType });
  // Fernebene 200 m: auch der Himmel des Straßenausblicks wird mit aufgenommen
  const wuerfelKamera = new THREE.CubeCamera(0.1, 200, ziel);
  wuerfelKamera.position.copy(ort);
  wuerfelKamera.update(renderer, scene);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const textur = pmrem.fromCubemap(ziel.texture).texture;
  pmrem.dispose();
  ziel.dispose();
  wurzel.traverse((o) => {
    const mat = /** @type {any} */ (/** @type {THREE.Mesh} */ (o).material);
    if (mat && mat.isMeshStandardMaterial && nur(mat)) {
      mat.envMap = textur;
      mat.needsUpdate = true;
    }
  });
  return textur;
}

/**
 * Lichtabfall mit dem Abstand zu den Fenstern (für alle beleuchteten Materialien unter `wurzel`):
 * Je weiter eine Stelle von der Fensterwand entfernt ist, desto weniger Tageslicht kommt an.
 * Außerdem bekommen Flächen, die den Fenstern zugewandt sind, mehr Umgebungslicht als
 * abgewandte (z. B. die Wandpfeiler zwischen den Fenstern).
 * Fenster der III. Etage: Behrenstraße bei x = 9 (Blick nach +x); in der Werkstatt (z > 19,75)
 * zusätzlich Friedrichstraße bei z = 27,5 (+z).
 * @param {THREE.Object3D} wurzel
 */
export function fensterLichtAbfall(wurzel) {
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
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFensterWelt;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n\tvFensterWelt = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vFensterWelt;
float fensterAbstand( vec3 p ) {
	float d = 9.0 - p.x;
	if ( p.z > 19.75 ) d = min( d, 27.5 - p.z );
	return max( d, 0.0 );
}
vec3 fensterRichtung( vec3 p ) {
	return p.z > 19.75 ? normalize( vec3( 0.5, 0.0, 0.85 ) ) : vec3( 1.0, 0.0, 0.0 );
}`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
	{
		float abfall = 1.0 - 0.45 * smoothstep( 0.5, 8.5, fensterAbstand( vFensterWelt ) );
		vec3 weltNormale = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
		float zugewandt = 0.5 + 0.5 * dot( weltNormale, fensterRichtung( vFensterWelt ) );
		reflectedLight.indirectDiffuse *= abfall * mix( 0.6, 1.15, zugewandt );
		reflectedLight.directDiffuse *= abfall;
	}`);
    };
    mat.customProgramCacheKey = () => (vorherSchluessel ? vorherSchluessel.call(mat) : '') + '|fensterAbfall';
    mat.needsUpdate = true;
  });
}
