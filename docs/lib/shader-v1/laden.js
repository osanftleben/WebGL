// shader-v1: Shader-Dateien (.vert/.frag) als Text laden.

/**
 * Lädt eine Textdatei.
 * Tipp: Pfade relativ zum aufrufenden Modul angeben, z. B.
 * `new URL('./shaders/basis.vert', import.meta.url)` – dann stimmen sie lokal und auf GitHub Pages.
 *
 * @param {string | URL} url
 * @returns {Promise<string>}
 */
export async function ladeText(url) {
  const antwort = await fetch(url);
  if (!antwort.ok) {
    throw new Error(`Datei konnte nicht geladen werden: ${url} (HTTP ${antwort.status})`);
  }
  return antwort.text();
}

/**
 * Lädt Vertex- und Fragment-Shader gleichzeitig.
 * Das Ergebnis passt direkt in `new THREE.ShaderMaterial({ ...shader, uniforms })`.
 *
 * @param {string | URL} vertexUrl
 * @param {string | URL} fragmentUrl
 * @returns {Promise<{ vertexShader: string, fragmentShader: string }>}
 */
export async function ladeShader(vertexUrl, fragmentUrl) {
  const [vertexShader, fragmentShader] = await Promise.all([ladeText(vertexUrl), ladeText(fragmentUrl)]);
  return { vertexShader, fragmentShader };
}
