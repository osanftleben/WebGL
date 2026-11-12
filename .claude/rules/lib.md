---
paths:
  - "docs/lib/**"
---

# Regeln für Bibliotheken in docs/lib/

## Fremdcode: `three-r<nr>/`
- Gesperrt (Hook). Nur `python .claude/scripts/three_addon.py hole <pfad>` darf Zusätze ergänzen.
- Neue three.js-Version: nur nach Rückfrage herunterladen, als neuer Ordner `three-r<nr>/` neben die alten.

## Eigene Bibliotheken: `<name>-v<haupt>/`
- Jede Änderung trifft **alle Projekte**, deren Import-Map diese Hauptversion nutzt.
- Innerhalb einer Hauptversion nur **rückwärtskompatibel**: Neues hinzufügen und Fehler beheben ja; bestehende Funktionen nicht umbenennen, keine Parameter entfernen oder umdeuten, Verhalten nicht ändern.
- Jede Änderung: Version in `lib.json` erhöhen (Fehlerkorrektur → 1.0.1, Ergänzung → 1.1.0) und `CHANGELOG.md` mit `## <version> – <datum>` ergänzen. `check.py` prüft das.
- Inkompatibler Umbau: `python .claude/scripts/libs.py hauptversion <name>` (Skill `/lib-version`) und nur in der neuen Kopie ändern.
- `lib.json`: `three` = Liste der getesteten three.js-Versionen (leer = unabhängig), `braucht` = andere eigene Bibliotheken, z. B. `{"render": "v1"}`.
- Bibliotheken binden andere Bibliotheken und three.js nur über Import-Map-Namen ein (`'three'`, `'render/renderer.js'`), nie über feste Pfade – die Version bestimmt das Projekt.
- Neue Bibliothek: nach Thema schneiden (`python .claude/scripts/libs.py neu <name> "<beschreibung>"`, Skill `/neue-lib`).
- Nach einer Änderung alle nutzenden Projekte im Browser prüfen (`/visuell-pruefen`).
