// Prüfhilfe (Holmes, nur lokal, Auftrag Beinschatten): zeigt das Werkstatt-Schattenbild des Bodens in einem
// Weltausschnitt als Bild über dem Spiel (weiß = frei, dunkel = Schatten). Braucht window.__wsTest = { liste }:
// dazu vorübergehend in werkstattschatten.js nach `waehleEmpfaenger(…)` die Zeile `window.__wsTest = { liste };`
// einfügen und danach wieder entfernen. In javascript_tool einfügen; Aufruf: await __bodenBild(x0, z0, x1, z1, px)
window.__bodenBild = async (x0 = 2.2, z0 = 19.8, x1 = 6.2, z1 = 23.2, px = 160) => {
  const THREE = await import('three');
  const d = window.__debug;
  const t = window.__wsTest;
  const r = d.renderer ?? d.steuerung?.renderer;
  // Bodenfläche: Normale nach oben, tiefste Lage, enthält den Ausschnitt
  const boden = t.liste.filter((e) => e.n.y > 0.9 && e.ecke.y < 0.05);
  const tex = d.werkstattSchattenWerte.wsBild.value;
  const B = d.werkstattSchattenWerte.wsBildGroesse.value;
  const ziel = new THREE.WebGLRenderTarget(B.x, B.y, { depthBuffer: false });
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
    fragmentShader: 'uniform sampler2D b; void main() { float v = texelFetch( b, ivec2( gl_FragCoord.xy ), 0 ).r; gl_FragColor = vec4( v, v, v, 1.0 ); }',
    uniforms: { b: { value: tex } }, depthTest: false, depthWrite: false,
  });
  const netz = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  netz.frustumCulled = false;
  const szene = new THREE.Scene().add(netz);
  const vorher = r.getRenderTarget();
  r.setRenderTarget(ziel);
  r.render(szene, new THREE.Camera());
  const daten = new Uint8Array(B.x * B.y * 4);
  r.readRenderTargetPixels(ziel, 0, 0, B.x, B.y, daten);
  r.setRenderTarget(vorher);
  ziel.dispose(); mat.dispose(); netz.geometry.dispose();
  const bw = Math.round(((x1 - x0) / (z1 - z0)) * px);
  const cv = document.createElement('canvas');
  cv.width = bw; cv.height = px;
  const cx = cv.getContext('2d');
  const img = cx.createImageData(bw, px);
  const q = new THREE.Vector3();
  let minW = 255;
  for (let j = 0; j < px; j++) {
    for (let i = 0; i < bw; i++) {
      // Bild: x nach rechts, z nach unten
      q.set(x0 + ((i + 0.5) / bw) * (x1 - x0), 0, z0 + ((j + 0.5) / px) * (z1 - z0));
      let v = 128;
      for (const e of boden) {
        const rel = q.clone().sub(e.ecke);
        const a = rel.dot(e.u) / e.u.lengthSq();
        const b = rel.dot(e.v) / e.v.lengthSq();
        if (a < 0 || a > 1 || b < 0 || b > 1) continue;
        const sx = Math.min(e.x + e.w - 1, Math.floor(e.x + a * e.w));
        const sy = Math.min(e.y + e.h - 1, Math.floor(e.y + b * e.h));
        v = daten[4 * (sy * B.x + sx)];
        break;
      }
      minW = Math.min(minW, v);
      const o = 4 * (j * bw + i);
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  document.getElementById('__bodenBild')?.remove();
  cv.id = '__bodenBild';
  Object.assign(cv.style, { position: 'fixed', left: '0', top: '0', width: `${bw * 3}px`, height: `${px * 3}px`, zIndex: 9999, imageRendering: 'pixelated' });
  document.body.appendChild(cv);
  return { boden: boden.length, minW };
};
