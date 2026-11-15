// Abnahme-Blicke „Werkstattschatten backen“ (Holmes, nur lokal): nach dem Laden in javascript_tool einfügen.
// Legt window.__w an (wie holmes_blick_einrichten.js) mit __w.P: nutzer, beine (Werkbank 2), bp7, bp8.
// Gebrauch: await __w.P.nutzer()
(async () => {
  while (!window.__debug) await new Promise((r) => setTimeout(r, 300));
  await new Promise((r) => setTimeout(r, 1500));
  const d = window.__debug;
  const w = (window.__w = { neig: 0, fov0: d.camera.fov });
  const o = d.steuerung.aktualisiere.bind(d.steuerung);
  d.steuerung.aktualisiere = (dt) => { o(dt); if (w.neig) d.camera.rotation.x = w.neig; };
  w.blick = async (x, z, b, n = 0, fov = null) => {
    d.steuerung.setzePosition(x, z, b);
    w.neig = n;
    d.camera.fov = fov || w.fov0;
    d.camera.updateProjectionMatrix();
    await new Promise((r) => setTimeout(r, 1200));
  };
  w.auf = (x, z, zx, zz, n = 0, fov = null) => w.blick(x, z, Math.atan2(-(zx - x), -(zz - z)), n, fov);
  const PI = Math.PI;
  w.P = {
    nutzer: () => w.blick(3.27, 20.84, -1.95, -0.56),
    beine: () => w.auf(3.2, 24.6, 3.2, 26.9, -0.5, 50),
    bp7: () => w.blick(2.0, 20.5, PI + 0.5),
    bp8: () => w.blick(5.6, 23.6, -3 * PI / 4 + 0.1),
  };
  // Bild der Spielansicht an holmes_schatten.py empfange --bilder ORDNER schicken (halbe Größe)
  w.foto = (name) => new Promise((fertig) => requestAnimationFrame(() => {
    const quelle = d.renderer.domElement;
    const c = document.createElement('canvas');
    c.width = Math.round(quelle.width / 2);
    c.height = Math.round(quelle.height / 2);
    c.getContext('2d').drawImage(quelle, 0, 0, c.width, c.height);
    c.toBlob((b) => fetch(`http://127.0.0.1:8765/bild?name=${encodeURIComponent(name)}`, { method: 'POST', body: b })
      .then((r) => r.text()).then(fertig, (e) => fertig(String(e))), 'image/png');
  }));
  w.alle = async (vorsilbe) => {
    const aus = [];
    for (const n of ['nutzer', 'beine', 'bp7', 'bp8']) { await w.P[n](); aus.push(await w.foto(`${vorsilbe}_${n}.png`)); }
    return aus;
  };
  return 'bereit';
})();
