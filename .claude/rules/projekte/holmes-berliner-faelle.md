---
paths:
  - "docs/holmes-berliner-faelle/**"
---

# Projekt: Sherlock Holmes – Die Berliner Fälle

- Ordner: `docs/holmes-berliner-faelle/`, online unter `…/WebGL/holmes-berliner-faelle/`
- Nicht verwechseln mit den alten, gesperrten Ordnern `sherlock-holmes-in-berlin/`, `sherlock/`, `sherlock2/` im Hauptordner (nicht lesen, nicht ändern).

## Arbeitsstand (zuletzt 14. 11. 2026)
- **Auftrag Besetzung** (Wachsfiguren mit festen Rollen; Ziel, Abnahme, Runden in `holmes-verlauf.md`). **Frauen = Annahme** (anonym, ohne historischen Anspruch). Nicht dazu: Leiche, Originalfigur, Kranich, Rohköpfe.
  - A, A2 und Runde 1 (Halsbinde nur Ausnahme) committet. **Runde 2/2 erledigt 14. 11.:** Ganzfiguren schlanker (Taille, schmalere Schultern, dünne angewinkelte Arme, kleinere Hände, Beine mit Knie). Keine weiteren Runden; Restfehler im Verlauf. Messung: Draw-Calls 20/37/26, Dreiecke Gruppe 133 344, 60 Bilder/s.
  - **Vorschlag vor B (Hauptsitzung entscheidet): Sichtbarkeit je Raum / LOD.** Im Blick „Figurengruppe nah“ stecken ~97 700 Dreiecke in zwei Paketen über Raum A und B (Büsten hinter der Wand werden mitgezeichnet), Werkstatt ~9 500 → großes Sparpotenzial ohne Detailverlust.
  - **Danach: Sitzung B** (Frauenfiguren an den `frauPlatz`-Plätzen nach `frauRolle`). Ohne Sichtbarkeit bleiben nur ~1 650 Dreiecke bis 135 000.
- Feinschliff C fertig (e191cab), Firefox-Abnahme durch den Nutzer offen. Version 1, Feinschliff A/B committet.
- **Licht abgeschlossen** (776b9ed, Firefox-Abnahme 13. 11.); keine weiteren Feinschliff-Schleifen, nur echte Fehler beheben. Zurückgestellt: Lichtberechnung auf der Grafikkarte, Fenster-Überstrahlen.
- **Danach:** D (Stuck, Beschläge), dann weitere Inhalte von Fall 1 (siehe Ausbaustufen).
- Prüfhilfen: Vorschau `webgl-vorschau`; Blickpunkte siehe „Rundgang“. `ERR_CONNECTION_REFUSED` (Port 8765) = Empfänger nicht gestartet, harmlos.

## Ziel und Rahmen (Kurzfassung; vollständig: `.claude/notizen/holmes-rahmen.md`)
- Browserspiel (Deutsch, Erwachsene), Ich-Perspektive, Handy und PC; Sherlock Holmes als „Sigerson“, Berlin 1892, mehrere Fälle.
- **Keine historischen Fehler:** jede historische Angabe belegt (`.claude/notizen/holmes-quellen.md`), Unbelegtes mit dem Nutzer klären.
- Grafik stilisiert und selbst erzeugt; Leistung ≥ 30 Bilder/s Mittelklasse-Handy, 60 am PC; Ladegröße < 20 MB pro Fall. Pushen nur auf Wunsch.

## Grafik (Einzelheiten: `.claude/notizen/holmes-verlauf.md`)
- Feinschliff A (Licht), B (Glanz, Glas) und C (Wachsfiguren, `welt/menschen.js`) fertig; D (Stuck, Beschläge) offen.
- Beleuchtung vorab berechnet (`.claude/scripts/holmes_licht.py`): Lichtkarte (10 cm) für statische Quader/Flächen, Lichtgitter (0,4 m) für den Rest; keine Lampen. Runde Teile verdecken nur mit `userData.lichtHuelle`.
- **Nach jeder Änderung an Räumen, Möbeln, Fenstern neu berechnen:** `holmes_licht.py empfange` → im Spiel `await __debug.sendeLichtModell()` → `holmes_licht.py berechne` (≈ 10 min, im Terminal-Panel). Konsole beim Start: „Beleuchtung: Lichtkarte aktiv“.
- Bodenglanz (`welt/bodenglanz.js`): Dielen spiegeln die Fenster weich.

## Rundgang (feste Blickpunkte für `/visuell-pruefen`)
Im Browser: `__debug.steuerung.setzePosition(x, z, blick)` (Blick vorwärts = (−sin, −cos)); für Decke/Gesims mit der Maus nach oben ziehen.
1. Raum A gesamt: `(1,1, 0,5, π+0,45)`
2. Raum A Fensterwand mit Gesims und Decke: `(5,5, 4,75, −π/2)`, nach oben schauen
3. Raum A Hofwand mit Büsten: `(6,0, 3,0, π/2+0,3)`; Büsten nah: `(2,6, 6,2, 0,95)`
3a. Figurengruppe nah `(4,6, 16,6, π/2)`, Kopfschrank nah `(2,6, 12,1, π/2)`
4. Ecke Fensterwand/Trennwand A|B: `(7,6, 8,0, −3π/4−0,15)`, leicht nach oben
5. Fensterecke Raum A: `(7,0, 1,6, −1,25)`
6. Raum B mit Kranich: `(5,3, 12,8, π)` und `(2,5, 11,0, π+0,6)`
7. Werkstatt gesamt: `(2,0, 20,5, π+0,5)`
8. Schräge Werkstattwand: `(5,6, 23,6, −3π/4+0,1)`

## Ausbaustufen
- **Grafik-Feinschliff** (stilisiert, selbst erzeugt, handytauglich; spielwichtige Gegenstände zuerst): A–C fertig, Besetzung läuft, D offen (Liste im Verlauf).
- Schwierigkeitsstufen, Droschkenfahrt, Startmenü mit Grafikeinstellung
- Hinweise verknüpfen, Auflösung (Wer/Wie/Warum)
- übrige Orte von Fall 1, danach weitere Fälle (je eigenes Viertel)

## Weitere Notizen (nicht automatisch geladen, bei Bedarf lesen)
- `.claude/notizen/holmes-fall1.md` – Fall 1 (Entwurf, Figuren, Hinweise), offene Recherchepunkte, Bau der III. Etage (Koordinaten, Module, Annahmen für den Spiel-Hinweis)
- `.claude/notizen/holmes-quellen.md` – alle Fundstellen; neue hier eintragen
- `.claude/notizen/holmes-verlauf.md` – Verlauf und Zahlenwerte von Grafik und Beleuchtung

## Kurzüberblick Spiel
- Koordinaten: x zur Behrenstraße, z zur Friedrichstraße; Raum A z 0–9,5, Raum B 9,75–19,5, Werkstatt 19,75–27,5 (abgeschrägte Ecke); Breite x 0–9; Höhe 4,0 m.
