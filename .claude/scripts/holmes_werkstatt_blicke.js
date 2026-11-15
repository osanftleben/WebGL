// Blickpunkte für die Abnahme „Werkstatt Teil 2/3“ (Holmes, nur lokal, braucht window.__debug).
// Gebrauch: Inhalt in die Konsole bzw. javascript_tool einfügen; danach window.__w:
//   await __w.blick(x, z, blick, neigung, fov)   Blickpunkt mit Neigung (positiv = nach oben) und Sichtfeld
//   await __w.auf(x, z, zielX, zielZ, neigung, fov)  Blick von (x, z) auf (zielX, zielZ)
//   await __w.geh('bp7')                          benannter Blickpunkt aus __w.PUNKTE
//   __w.ws(name, wert)                            Wert der Werkstattschatten setzen (z. B. 'wsForm', 0.5)
(() => {
  const d = window.__debug;
  if (!d) throw new Error('__debug fehlt (nur auf 127.0.0.1)');
  const w = (window.__w = { neig: 0, fov0: d.camera.fov });
  if (!d.steuerung.__wU) {
    const o = d.steuerung.aktualisiere.bind(d.steuerung);
    d.steuerung.aktualisiere = (dt) => { o(dt); if (w.neig) d.camera.rotation.x = w.neig; };
    d.steuerung.__wU = true;
  }
  w.blick = async (x, z, b, n = 0, fov = null) => {
    w.letzt = [x, z, b, n, fov];
    d.steuerung.setzePosition(x, z, b);
    w.neig = n;
    d.camera.fov = fov || w.fov0;
    d.camera.updateProjectionMatrix();
    await new Promise((r) => setTimeout(r, 1200));
  };
  w.auf = (x, z, zx, zz, n = 0, fov = null) => w.blick(x, z, Math.atan2(-(zx - x), -(zz - z)), n, fov);
  const PI = Math.PI;
  w.PUNKTE = {
    bp7: () => w.blick(2.0, 20.5, PI + 0.5),
    bp8: () => w.blick(5.6, 23.6, -3 * PI / 4 + 0.1),
    werkbank: () => w.auf(3.2, 25.3, 3.2, 26.7, -0.55, 50),
    gips: () => w.auf(6.3, 22.6, 8.4, 21.3, -0.05, 60),
    bemal: () => w.auf(5.9, 21.9, 6.0, 20.2, -0.3, 60),
    brocken: () => w.auf(5.2, 25.0, 6.9, 26.4, -0.6, 55),
    kittel: () => w.auf(2.2, 24.8, 0.1, 24.8, -0.1, 60),
    // Teil 3: Büsten auf dem Bord der schrägen Wand, Kleinteile auf Werkbank 2 ganz nah, Gipsbrocken nah
    bord: () => w.auf(7.0, 24.95, 8.03, 25.97, 0.2, 45),
    kleinteile: () => w.auf(3.3, 25.9, 3.35, 26.65, -0.9, 30),
    brockenNah: () => w.auf(6.5, 25.3, 7.08, 26.14, -0.85, 35),
    // Teil 3 (alle werfen): Werkbank 1, Fensterwand Friedrichstraße, Bein-/Hockerschatten vor Werkbank 2
    werkbank1: () => w.auf(4.6, 21.3, 4.6, 23.0, -0.45, 60),
    fensterwand: () => w.auf(3.3, 23.6, 3.3, 27.5, -0.25, 70),
    beine: () => w.auf(3.2, 24.6, 3.2, 26.9, -0.5, 50),
    // schräge Wand mit Bord weit (hier zeigte das Verhältnis-Verfahren Flecken)
    wand: () => w.auf(6.2, 23.4, 8.0, 25.8, 0.15, 70),
  };
  w.geh = (name) => w.PUNKTE[name]();
  w.ws = (name, wert) => {
    const u = d.werkstattSchattenWerte[name];
    if (u.value && u.value.set && Array.isArray(wert)) u.value.set(...wert);
    else u.value = wert;
    // das Spiel zeichnet nur nach Bewegung neu: letzten Blick wiederholen
    return w.letzt ? w.blick(...w.letzt) : null;
  };
  return 'Werkstatt-Blicke bereit: ' + Object.keys(w.PUNKTE).join(', ');
})();
