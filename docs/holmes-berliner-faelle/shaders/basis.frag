// Basis-Fragment-Shader: Farbverlauf über die Zeit, einfache Beleuchtung
uniform float uZeit;
varying vec3 vNormale;
varying vec2 vUv;

void main() {
  vec3 licht = normalize(vec3(0.5, 0.8, 0.6));
  float helligkeit = 0.35 + 0.65 * max(dot(normalize(vNormale), licht), 0.0);
  vec3 farbe = 0.5 + 0.5 * cos(uZeit + vUv.xyx + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(farbe * helligkeit, 1.0);
}
