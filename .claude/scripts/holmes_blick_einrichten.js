// Kurzfassung der Werkstatt-Blicke (Holmes, nur lokal): nach dem Laden in javascript_tool einfügen.
// Legt window.__w mit blick/auf an (Neigung bleibt erhalten); wartet vorher, bis __debug da ist.
(async () => {
  while (!window.__debug) await new Promise((r) => setTimeout(r, 300));
  await new Promise((r) => setTimeout(r, 3000));
  const d = window.__debug;
  const w = (window.__w = { neig: 0, fov0: d.camera.fov });
  const o = d.steuerung.aktualisiere.bind(d.steuerung);
  d.steuerung.aktualisiere = (dt) => { o(dt); if (w.neig) d.camera.rotation.x = w.neig; };
  w.blick = async (x, z, b, n = 0, fov = null) => {
    w.letzt = [x, z, b, n, fov];
    d.steuerung.setzePosition(x, z, b);
    w.neig = n;
    d.camera.fov = fov || w.fov0;
    d.camera.updateProjectionMatrix();
    await new Promise((r) => setTimeout(r, 1200));
  };
  w.auf = (x, z, zx, zz, n = 0, fov = null) => w.blick(x, z, Math.atan2(-(zx - x), -(zz - z)), n, fov);
  return 'bereit';
})();
