// Vorab berechnete Beleuchtung (Strahlverfolgung mit .claude/scripts/holmes_licht.py) einlesen
// und als Umgebungslicht für alle beleuchteten Materialien verwenden.
//
// Zwei Teile:
// - Lichtkarte: je Bildpunkt (10 cm) das Licht auf einer Seite eines statischen Quaders oder einer Fläche
//   (Wände, Boden, Decke, Möbel aus Quadern). Koordinaten im Attribut `lkUv` (siehe lichtmodell.js).
// - Lichtgitter (0,4 m): je Punkt die Bestrahlungsstärke aus 6 Richtungen (+x, −x, +y, −y, +z, −z),
//   für alles ohne Lichtkarte (runde Formen, Figuren, Personen, Fundstücke).
import * as THREE from 'three';

/**
 * @typedef {object} Lichtgitter
 * @property {THREE.Data3DTexture} textur
 * @property {{ nx: number, ny: number, nz: number, schritt: number, ursprung: number[], hoechstwert: number, gamma: number,
 *   lichtkarte?: { datei: string, breite: number, hoehe: number, hoechstwert: number, pruefsumme: string } }} info
 * @property {THREE.Texture | null} karte Lichtkarte (nur, wenn sie zum aktuellen Raum passt)
 */

/**
 * Lädt Lichtgitter und Lichtkarte (lokale Dateien).
 * @param {URL} ordner Ordner mit licht-etage3.png, licht-etage3-karte.png und licht-etage3.json
 * @param {string} pruefsumme Prüfsumme des aktuellen Lichtkarten-Atlas (lichtmodell.js); passt die Datei
 *   nicht dazu (Raum umgebaut, Licht nicht neu berechnet), bleibt die Lichtkarte aus
 * @returns {Promise<Lichtgitter>}
 */
export async function ladeLichtgitter(ordner, pruefsumme) {
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

  /** @type {THREE.Texture | null} */
  let karte = null;
  if (info.lichtkarte && info.lichtkarte.pruefsumme === pruefsumme) {
    // Ohne Umweg über ein Canvas laden: der Alphakanal (Verdeckung) bliebe sonst nicht exakt erhalten
    const blob = await (await fetch(new URL(info.lichtkarte.datei, ordner))).blob();
    const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    karte = new THREE.Texture(bitmap);
    karte.flipY = false; // Bildzeile 0 = v 0, wie in lichtmodell.js
    karte.premultiplyAlpha = false;
    karte.colorSpace = THREE.NoColorSpace;
    karte.generateMipmaps = false;
    karte.minFilter = THREE.LinearFilter;
    karte.magFilter = THREE.LinearFilter;
    karte.needsUpdate = true;
  } else if (info.lichtkarte) {
    console.warn('Lichtkarte passt nicht zum Raum (umgebaut?) – Licht neu berechnen (holmes_licht.py). Bis dahin nur Lichtgitter.');
  }
  return { textur, info, karte };
}

/**
 * @typedef {object} LichtZusatz Ergänzung des Licht-Shaders
 * @property {string} name Teil des Programm-Schlüssels
 * @property {Record<string, { value: any }>} uniforms
 * @property {string} kopf GLSL-Deklarationen (nach <common>)
 * @property {string} code GLSL-Anweisungen, die `lgE` verändern
 */

/**
 * Ersetzt bei allen beleuchteten Materialien unter `wurzel` das Umgebungslicht: Lichtkarte, wo vorhanden,
 * sonst Lichtgitter. Definiert `LK_KARTE` (für Ergänzungen wie den Bodenglanz: `vLkUv`, `lkKarte`, `lkAn`).
 * @param {THREE.Object3D} wurzel
 * @param {Lichtgitter} gitter
 * @param {number} staerke Helligkeitsfaktor
 * @param {{ gitterFaktor?: number, grund?: number }} [feinwerte]
 *   gitterFaktor: zusätzlicher Faktor nur fürs Lichtgitter (Figuren, runde Teile), 1 = wie Lichtkarte;
 *   grund: Mindest-Grundhelligkeit im indirekten Licht (gleiche Einheit wie das Licht nach `staerke`),
 *   hebt nur dunkle Stellen weich an, helle bleiben praktisch gleich; 0 = aus
 * @param {LichtZusatz[]} [zusaetze] Ergänzungen, die das Licht `lgE` vor der Grundhelligkeit verändern
 *   (z. B. Werkstattschatten); verfügbar: vLgWelt, lgNormale (Weltnormale), lgKarteAn (1 = Lichtkarte)
 */
export function wendeLichtgitterAn(wurzel, gitter, staerke, feinwerte = {}, zusaetze = []) {
  const { info } = gitter;
  const uniforms = {
    lichtGitter: { value: gitter.textur },
    lgUrsprung: { value: new THREE.Vector3(...info.ursprung) },
    lgSchritt: { value: info.schritt },
    lgN: { value: new THREE.Vector3(info.nx, info.ny, info.nz) },
    lgMax: { value: info.hoechstwert },
    lgGamma: { value: info.gamma },
    lgStaerke: { value: staerke },
    lgGitterFaktor: { value: feinwerte.gitterFaktor ?? 1 },
    lgGrund: { value: feinwerte.grund ?? 0 },
    lkKarte: { value: gitter.karte },
    lkAn: { value: gitter.karte ? 1 : 0 },
    lkMax: { value: gitter.karte && info.lichtkarte ? info.lichtkarte.hoechstwert : 0 },
  };
  for (const z of zusaetze) Object.assign(uniforms, z.uniforms);
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
      // Meshes ohne `lkUv` lesen (0, 0): dort liegt im Atlas „keine Lichtkarte“ (Alpha 0)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLgWelt;\nattribute vec2 lkUv;\nvarying vec2 vLkUv;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n\tvLgWelt = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\n\tvLkUv = lkUv;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
#define LK_KARTE
varying vec3 vLgWelt;
varying vec2 vLkUv;
uniform highp sampler3D lichtGitter;
uniform vec3 lgUrsprung;
uniform float lgSchritt;
uniform vec3 lgN;
uniform float lgMax;
uniform float lgGamma;
uniform float lgStaerke;
uniform float lgGitterFaktor;
uniform float lgGrund;
uniform sampler2D lkKarte;
uniform float lkAn;
uniform float lkMax;
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
}
${zusaetze.map((z) => z.kopf).join('\n')}`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
	{
		vec3 lgE;
		float lgKarteAn = 0.0;
		vec3 lgNormale = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
		vec4 lk = texture2D( lkKarte, vLkUv );
		if ( lkAn > 0.5 && lk.a > 0.5 / 255.0 ) {
			// Statische Quader und Flächen: Lichtkarte (direkt auf der Fläche berechnet)
			lgE = pow( lk.rgb, vec3( lgGamma ) ) * lkMax;
			lgKarteAn = 1.0;
		} else {
			lgE = lgBestrahlung( vLgWelt + lgNormale * 0.15, lgNormale ) * lgGitterFaktor;
		}
		lgE *= lgStaerke;
${zusaetze.map((z) => z.code).join('\n')}
		// Mindest-Grundhelligkeit: weiches Maximum aus Helligkeit l und lgGrund (sqrt(l² + g²)),
		// als neutrales Grau addiert – bei l = 0 kommt g dazu, bei l ≫ g fast nichts
		float lgL = dot( lgE, vec3( 0.2126, 0.7152, 0.0722 ) );
		lgE += vec3( lgGrund * lgGrund / ( sqrt( lgL * lgL + lgGrund * lgGrund ) + lgL + 1e-6 ) );
		reflectedLight.indirectDiffuse = lgE * BRDF_Lambert( material.diffuseColor );
	}`);
    };
    mat.customProgramCacheKey = () => (vorherSchluessel ? vorherSchluessel.call(mat) : '') + '|lichtgitter'
      + zusaetze.map((z) => '|' + z.name).join('');
    mat.needsUpdate = true;
  });
  return uniforms;
}
