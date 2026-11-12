---
name: neues-projekt
description: Legt ein neues three.js-Projekt in docs/<name>/ aus der Vorlage an (Import-Map mit neuesten Versionen, Startseiten-Eintrag, Projektnotizen). Verwenden, wenn ein neues WebGL-Projekt beginnen soll.
argument-hint: <ordnername> "<Titel>"
disable-model-invocation: true
---

# Neues Projekt anlegen

Argumente: `$ARGUMENTS`

1. Fehlen Ordnername oder Titel, frage danach. Ordnername: klein, a–z, 0–9, Bindestrich (z. B. `sonnensystem`). Er wird Teil der Web-Adresse `…/WebGL/<name>/`.
2. Ausführen:
   ```
   python .claude/skills/neues-projekt/scripts/anlegen.py <ordnername> "<Titel>"
   ```
   Das Skript kopiert die Vorlage (drehender Würfel mit eigenem Shader), setzt die neuesten Versionen von three.js und allen Bibliotheken in die Import-Map, legt `.claude/rules/projekte/<name>.md` an und aktualisiert die Startseite.
3. Frage nach dem Ziel des Projekts und trage es (nach Ja) in `.claude/rules/projekte/<name>.md` ein.
4. `python .claude/scripts/check.py` ausführen, danach `/visuell-pruefen <name>`.
5. Kurz berichten: Ordner, verwendete Versionen, Screenshot.
