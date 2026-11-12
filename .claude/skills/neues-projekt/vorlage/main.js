// {{TITEL}} – Einstiegspunkt
import * as THREE from 'three';
import { erstelleRenderer } from 'render/renderer.js';
import { starteSchleife } from 'render/schleife.js';
import { ladeShader } from 'shader/laden.js';
import { stelleBereit } from 'debug/debug.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 4);

const { renderer } = erstelleRenderer({ kamera: camera });

const shader = await ladeShader(
  new URL('./shaders/basis.vert', import.meta.url),
  new URL('./shaders/basis.frag', import.meta.url),
);
const material = new THREE.ShaderMaterial({
  ...shader,
  uniforms: { uZeit: { value: 0 } },
});
const wuerfel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), material);
scene.add(wuerfel);

// Nur lokal: window.__debug für Prüfungen (/perf-check)
stelleBereit({ renderer, scene, camera });

starteSchleife(renderer, ({ delta, gesamt }) => {
  wuerfel.rotation.x += delta * 0.4;
  wuerfel.rotation.y += delta * 0.6;
  material.uniforms.uZeit.value = gesamt;
  renderer.render(scene, camera);
});
