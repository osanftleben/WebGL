// Basis-Vertex-Shader für THREE.ShaderMaterial
// (three.js ergänzt #version, Präzision, Matrizen und Attribute)
varying vec3 vNormale;
varying vec2 vUv;

void main() {
  vNormale = normalize(normalMatrix * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
