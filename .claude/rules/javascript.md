---
paths:
  - "docs/**/*.js"
---

# Regeln für JavaScript

- ES-Module: `import`/`export`. Nackte Angaben (`'three'`, `'render/renderer.js'`) nur, wenn sie in der Import-Map der `index.html` stehen; sonst relative Pfade (`./`, `../`). Nie absolute Pfade (`/…`) – auf GitHub Pages liegt alles unter `/WebGL/`.
- Dateipfade zu Ressourcen relativ zum Modul: `new URL('./shaders/x.vert', import.meta.url)`.
- JSDoc für alle exportierten Funktionen (`@param`, `@returns`); Typen von three.js als `import('three').Mesh`.
- Kommentare auf Deutsch, Namen bevorzugt deutsch (`erstelleRenderer`, `gibFrei`); three.js-Namen (`scene`, `camera`, `renderer`) bleiben englisch.
- Pro Bild keine neuen Objekte (`new Vector3()` usw.) – vorab anlegen und wiederverwenden.
- Nicht mehr gebrauchte Geometrien, Materialien und Texturen freigeben (`ressourcen/aufraeumen.js`).
- Größe und Pixeldichte über `render/renderer.js`, die Schleife über `render/schleife.js` (mit `delta` statt fester Schritte).
- Zusätze aus three.js: `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'` – vorher mit `/three-addon` holen.
- Lader mit Dekodern (DRACO, KTX2, Basis): Dekoder-Pfad immer auf den lokalen Ordner setzen, nie auf einen fremden Server.
- In `docs/lib/` gelten zusätzlich die Regeln aus `lib.md`.
