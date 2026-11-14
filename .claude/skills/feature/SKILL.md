---
name: feature
description: Setzt eine Funktion oder Änderung in einem WebGL-Projekt um – mit Plan, Freigabe, Prüfung und Sichtkontrolle im Browser.
argument-hint: <projekt> <was soll passieren>
---

# Funktion umsetzen

Auftrag: `$ARGUMENTS`

1. **Verstehen:** Projekt bestimmen (`python .claude/scripts/projekte.py liste`), relevante Dateien und `.claude/rules/projekte/<projekt>.md` lesen. Unklarheiten erst klären.
2. **Plan zeigen:** kurz, in einfachen Worten – welche Dateien sich ändern, ob eigene Bibliotheken oder three.js-Zusätze betroffen sind. **Auf das Ja warten.**
3. **Umsetzen** nach den Regeln in `.claude/rules/`. In einer Aufgabensitzung nach jedem fertigen Schritt und jeder Messung kurz ins Protokoll schreiben (Aufbau: Skill `auftrag`). Zusätze nur über `/three-addon`. Änderungen an `docs/lib/<name>-v<n>/` nur rückwärtskompatibel, mit `lib.json`-Version und `CHANGELOG.md`.
4. **Prüfen:** `python .claude/scripts/check.py` bis 0 Fehler.
5. **Sichtkontrolle:** `/visuell-pruefen <projekt>`. Wurde eine Bibliothek geändert: alle Projekte prüfen, die sie nutzen (`check.py --uebersicht`).
6. **Bericht:** was geändert wurde, Screenshot, offene Punkte. Nicht committen, außer der Nutzer bittet darum.
