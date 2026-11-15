// Schwebeprüfung Werkstatt (holmes-berliner-faelle): findet Teile, die über ihrer Auflage schweben.
// Gebrauch: Inhalt in die Browser-Konsole bzw. javascript_tool einfügen (Spielseite auf 127.0.0.1).
// Baut die Werkstatt-Ausstattung (welt/werkstatt.js) zusammen mit Boden und den beiden Werkbänken
// ein zweites Mal in eine eigene Gruppe (nicht in die Szene), schießt von der Unterkante jedes Teils
// Strahlen nach unten und meldet Lücken über 1 cm. Hängende Teile (Wandborde, Kittel, Skizzen) melden
// große Lücken – die sind gewollt und in der Liste an ihrer Höhe zu erkennen.
(async () => {
  const T = await import('three');
  const B = await import('/holmes-berliner-faelle/welt/bauteile.js');
  const W = await import('/holmes-berliner-faelle/welt/werkstatt.js');
  const m = B.erstelleMaterialien();
  const g = new T.Group();
  const boden = new T.Mesh(new T.PlaneGeometry(9, 8), m.dielen);
  boden.rotation.x = -Math.PI / 2;
  boden.position.set(4.5, 0, 23.6);
  g.add(boden);
  for (const [b, t, x, z] of [[2.4, 0.9, 4.6, 23.0], [2.0, 0.7, 3.2, 26.75]]) {
    const w = B.werkbank(m, b, t);
    w.position.set(x, 0, z);
    g.add(w);
  }
  const vorher = g.children.length;
  W.baueWerkstattAusstattung(g, m, [], []);
  g.updateWorldMatrix(true, true);
  const alle = [];
  g.traverse((o) => { if (o.isMesh) alle.push(o); });
  const rc = new T.Raycaster();
  const kasten = new T.Box3();
  const unten = new T.Vector3(0, -1, 0);
  const funde = [];
  // nur die neuen Teile prüfen
  const neu = new Set();
  g.children.slice(vorher).forEach((c) => c.traverse((o) => { if (o.isMesh) neu.add(o); }));
  for (const mesh of neu) {
    kasten.setFromObject(mesh);
    if (kasten.min.y < 0.005) continue;
    const andere = alle.filter((o) => o !== mesh);
    const c = kasten.getCenter(new T.Vector3());
    let best = Infinity;
    for (const [fx, fz] of [[0, 0], [-0.3, 0], [0.3, 0], [0, -0.3], [0, 0.3]]) {
      const p = new T.Vector3(c.x + fx * (kasten.max.x - kasten.min.x), kasten.min.y + 0.002, c.z + fz * (kasten.max.z - kasten.min.z));
      rc.set(p, unten);
      const h = rc.intersectObjects(andere, false)[0];
      if (h) best = Math.min(best, h.distance - 0.002);
    }
    if (best > 0.01) {
      funde.push({ teil: mesh.geometry.type, mitte: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), unterkante: +kasten.min.y.toFixed(3), luecke: best === Infinity ? 'nichts darunter' : +best.toFixed(3) });
    }
  }
  return funde;
})();
