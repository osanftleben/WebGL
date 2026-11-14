---
name: abschluss
description: Schließt eine Aufgabe sauber ab – Prüfung, Arbeitsstand in den Projektnotizen, Commit auf Wunsch, Meldung an die Hauptsitzung. Am Ende jeder Aufgabe oder wenn der Hook zur Sitzungslänge meldet.
argument-hint: <projekt>
---

# Aufgabe abschließen

Projekt: `$ARGUMENTS`

1. **Prüfen:** `python .claude/scripts/check.py` (0 Fehler). Wurde `docs/` geändert: `/visuell-pruefen <projekt>` mit Rundgang.
2. **Arbeitsstand** in `.claude/rules/projekte/<projekt>.md` aktualisieren – kurz, Datei ≤ 5 KB:
   erledigt (mit Commit-Kürzel, falls committet), offen, bekannte Restfehler, nächster Schritt.
   Den Block „Aktueller Auftrag“ entfernen. Einzelheiten und Verlauf nach `.claude/notizen/`.
   **Protokoll** (`.claude/notizen/protokolle/…`): Schlusseintrag „## <HH:MM> Abschluss“ mit Ergebnis, Commit-Kürzel (falls committet) und Restfehlern. Die Datei bleibt liegen; beim Commit mit vormerken.
3. **Commit nur auf Wunsch anbieten.** Dann:
   - nur die Dateien dieser Aufgabe mit Pfad vormerken (`git add <pfade>`, nie `git add -A` oder `.`),
   - vorher `git diff --cached --stat` ansehen: nichts Fremdes dabei (auch keine früher vorgemerkten Löschungen)?
   - Nachricht auf Deutsch.
4. **Melden statt neue Sitzung:** In einer Aufgabensitzung keine neue Sitzung vorschlagen. Zum Schluss kurz melden: erledigt, offen, nächster Schritt. Die Meldung erreicht die Hauptsitzung automatisch, dort wird die nächste Aufgabe vergeben.
   - Die Hauptsitzung erhält nur die **ersten 400 Zeichen der letzten Antwort**. Die Meldung daher an den Anfang stellen, höchstens 400 Zeichen, eingeleitet mit „**Meldung an die Hauptsitzung:**“.
   - Stellt der Nutzer danach noch Fragen, **jede weitere Antwort mit derselben Meldung beginnen** (bei neuem Stand aktualisiert), sonst kommt in der Hauptsitzung nur die letzte Nebenantwort an.
   - Dem Nutzer sagen: Die Meldung kommt in der Hauptsitzung an, sobald er dort wieder schreibt.
