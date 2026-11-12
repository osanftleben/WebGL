---
name: lib-version
description: Legt eine neue Hauptversion einer eigenen Bibliothek an (z. B. shader-v1 → shader-v2), wenn ein inkompatibler Umbau nötig ist. Die alte Version bleibt unverändert.
argument-hint: <bibliotheksname>
disable-model-invocation: true
---

# Neue Hauptversion einer Bibliothek

Bibliothek: `$ARGUMENTS`

1. `python .claude/scripts/libs.py liste` – aktuelle Versionen zeigen.
2. Erklären, **warum** der Umbau inkompatibel ist und welche Projekte die alte Version nutzen (`check.py --uebersicht`). **Auf Ja warten.**
3. `python .claude/scripts/libs.py hauptversion <name>` – kopiert `<name>-v<n>` nach `<name>-v<n+1>` (Version `<n+1>.0.0`).
4. Umbau nur in der neuen Kopie; `CHANGELOG.md` dort mit den inkompatiblen Änderungen ergänzen.
5. Fragen, welche Projekte auf die neue Version wechseln sollen; nur deren Import-Map ändern.
6. `python .claude/scripts/check.py` und `/visuell-pruefen` für jedes umgestellte Projekt.
