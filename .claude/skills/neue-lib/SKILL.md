---
name: neue-lib
description: Legt eine neue eigene, thematisch geschnittene Bibliothek in docs/lib/<name>-v1/ an (mit lib.json und CHANGELOG.md), wenn mehrere Projekte dieselben Funktionen brauchen.
argument-hint: <name> "<beschreibung>"
disable-model-invocation: true
---

# Neue Bibliothek anlegen

Auftrag: `$ARGUMENTS`

1. Prüfen, ob eine bestehende Bibliothek thematisch passt (`python .claude/scripts/libs.py liste`) – dann dort rückwärtskompatibel ergänzen statt neu anlegen. Vorschlag machen, **auf Ja warten**.
2. Name: ein Thema, klein, ohne Versionsendung (z. B. `kamera`, `partikel`, `eingabe`).
3. `python .claude/scripts/libs.py neu <name> "<beschreibung>"`
4. Module anlegen (JSDoc Pflicht), Dateiliste in `lib.json` unter `dateien` pflegen; braucht die Bibliothek eine andere eigene Bibliothek, in `braucht` eintragen.
5. In den Projekten, die sie nutzen sollen, die Import-Map ergänzen: `"<name>/": "../lib/<name>-v1/"`.
6. `python .claude/scripts/check.py`, danach `/visuell-pruefen` der betroffenen Projekte.
