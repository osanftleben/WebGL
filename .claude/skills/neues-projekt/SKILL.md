---
name: neues-projekt
description: Legt ein neues three.js-Projekt in docs/<name>/ an – zuerst Rückfragen in Runden, bis der Nutzer keine mehr beantworten möchte; dann Zusammenfassung, Freigabe und Anlegen aus der Vorlage (Import-Map mit neuesten Versionen, Startseiten-Eintrag, Projektnotizen). Verwenden, wenn ein neues WebGL-Projekt beginnen soll.
argument-hint: [ordnername] ["<Titel>"] [Idee]
disable-model-invocation: true
---

# Neues Projekt anlegen

Mitgegeben: `$ARGUMENTS`

## 1. Rückfragen – so lange, bis der Nutzer aufhört

Vor dem Anlegen wird **nichts** erstellt. Stelle Rückfragen in Runden mit dem Dialog (`AskUserQuestion`):

- **Je Runde höchstens 3 inhaltliche Fragen** plus als letzte Frage immer:
  „Weiter mit Rückfragen?“ – Optionen „Ja, weiter fragen“ / „Nein, genug – Zusammenfassung zeigen“.
- Jede Frage muss für sich verständlich sein (der Nutzer sieht evtl. nur den Dialog). 2–4 sinnvolle Antwortmöglichkeiten, Empfehlung zuerst mit „(Empfohlen)“. Freitext ist immer möglich.
- Bereits Beantwortetes (auch aus `$ARGUMENTS`) nicht erneut fragen. Antworten der Vorrunde aufgreifen und vertiefen.
- Reihenfolge: vom Groben zum Feinen. Themen zur Auswahl:
  1. **Idee und Ziel:** Was soll man sehen und erleben? Für wen? Spiel, Visualisierung, Experiment, Lernprojekt?
  2. **Name:** Ordnername (klein, a–z, 0–9, Bindestrich – wird Teil der Adresse `…/WebGL/<name>/`) und Titel.
  3. **Szene und Inhalt:** Objekte, Umgebung, Licht, Kamera (fest, Orbit, Ego-Perspektive), 2D oder 3D.
  4. **Interaktion:** Maus, Tastatur, Touch, Bedienelemente/Texte auf der Seite, Klänge.
  5. **Aussehen:** Stil (realistisch, flach, Low-Poly, abstrakt), Farben, eigene Shader-Effekte.
  6. **Ressourcen:** Modelle, Texturen, Schriften – vorhanden oder selbst erzeugt? (Alles muss lokal im Repo liegen, nichts aus dem Internet; Lizenzen klären.)
  7. **three.js-Zusätze:** z. B. OrbitControls, GLTFLoader, Nachbearbeitung (Postprocessing).
  8. **Geräte und Leistung:** Handy/Tablet wichtig? Mindest-Bildrate?
  9. **Umfang:** erste Version (was muss sie können?) und spätere Ausbaustufen.
  10. **Wiederverwendung:** Funktionen, die auch andere Projekte brauchen könnten (→ eigene Bibliothek).
- Gehen dir die sinnvollen Fragen aus, sag das ehrlich und biete an, zur Zusammenfassung überzugehen – erfinde keine Fragen.
- Wählt der Nutzer „Nein, genug“ (oder sagt es in eigenen Worten), sofort aufhören.

## 2. Zusammenfassung und Freigabe

Zeige kurz und in einfachen Worten:
- Ordnername, Titel, Ziel in einem Satz
- Anforderungen der ersten Version (Liste)
- spätere Ausbaustufen und **offene Punkte** (was nicht geklärt wurde – keine Annahmen erfinden)
- welche three.js-Zusätze / Bibliotheken gebraucht werden

**Auf das Ja warten.** Änderungswünsche einarbeiten und erneut zeigen.

## 3. Anlegen

1. Ausführen:
   ```
   python .claude/skills/neues-projekt/scripts/anlegen.py <ordnername> "<Titel>"
   ```
   Das Skript kopiert die Vorlage (drehender Würfel mit eigenem Shader), setzt die neuesten Versionen von three.js und allen Bibliotheken in die Import-Map, legt `.claude/rules/projekte/<name>.md` an und aktualisiert die Startseite.
2. Die Zusammenfassung aus Schritt 2 in `.claude/rules/projekte/<name>.md` eintragen (Abschnitte: Ziel, Anforderungen erste Version, Ausbaustufen, Offene Punkte, Besonderheiten).
3. Benötigte Zusätze mit `/three-addon` holen (nur die bereits feststehenden).
4. `python .claude/scripts/check.py` ausführen, danach `/visuell-pruefen <name>`.
5. Kurz berichten: Ordner, verwendete Versionen, Screenshot. Vorschlag für den ersten Umsetzungsschritt mit `/feature` machen – nicht ungefragt loslegen.
