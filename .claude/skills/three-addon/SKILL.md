---
name: three-addon
description: Holt einen three.js-Zusatz (z. B. OrbitControls, GLTFLoader) samt Abhängigkeiten aus dem lokalen Vorrat nach docs/lib/three-r<nr>/addons/. Verwenden, bevor ein Projekt etwas aus 'three/addons/' importiert.
argument-hint: <suchbegriff oder pfad>
---

# three.js-Zusatz holen

Gesucht: `$ARGUMENTS`

1. Suchen: `python .claude/scripts/three_addon.py liste <suchbegriff>`
2. Passenden Pfad wählen (bei mehreren Treffern nachfragen). Gibt es mehrere three.js-Versionen, fragen, für welche (`--three r<nr>`) – maßgeblich ist die Version in der Import-Map des Projekts.
3. Holen: `python .claude/scripts/three_addon.py hole <pfad> [--three r<nr>]`
4. Hinweise des Skripts beachten (z. B. DRACO/KTX2 brauchen lokale Dekoder – Pfad im Code auf den lokalen Ordner setzen).
5. Import im Projekt: `import { … } from 'three/addons/<pfad>'`.
6. `python .claude/scripts/check.py` ausführen.

Nie Dateien in `docs/lib/three-r*/` von Hand anlegen oder ändern (Hook sperrt das).
