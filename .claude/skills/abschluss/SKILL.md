---
name: abschluss
description: Schließt eine Aufgabe sauber ab – Prüfung, Arbeitsstand in den Projektnotizen, Commit auf Wunsch, neue Sitzung vorschlagen. Am Ende jeder Aufgabe oder wenn der Hook zur Sitzungslänge meldet.
argument-hint: <projekt>
---

# Aufgabe abschließen

Projekt: `$ARGUMENTS`

1. **Prüfen:** `python .claude/scripts/check.py` (0 Fehler). Wurde `docs/` geändert: `/visuell-pruefen <projekt>` mit Rundgang.
2. **Arbeitsstand** in `.claude/rules/projekte/<projekt>.md` aktualisieren – kurz, Datei ≤ 5 KB:
   erledigt (mit Commit-Kürzel, falls committet), offen, bekannte Restfehler, nächster Schritt.
   Den Block „Aktueller Auftrag“ entfernen. Einzelheiten und Verlauf nach `.claude/notizen/`.
3. **Commit nur auf Wunsch anbieten.** Dann:
   - nur die Dateien dieser Aufgabe mit Pfad vormerken (`git add <pfade>`, nie `git add -A` oder `.`),
   - vorher `git diff --cached --stat` ansehen: nichts Fremdes dabei (auch keine früher vorgemerkten Löschungen)?
   - Nachricht auf Deutsch.
4. **Neue Sitzung vorschlagen** für die nächste Aufgabe, mit einem Satz als Auftrag (z. B. „/auftrag holmes-berliner-faelle Wachsfiguren …“).
