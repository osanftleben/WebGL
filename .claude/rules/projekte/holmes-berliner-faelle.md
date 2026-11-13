---
paths:
  - "docs/holmes-berliner-faelle/**"
---

# Projekt: Sherlock Holmes – Die Berliner Fälle

- Ordner: `docs/holmes-berliner-faelle/`, online unter `…/WebGL/holmes-berliner-faelle/`
- Nicht verwechseln mit den alten, gesperrten Ordnern `sherlock-holmes-in-berlin/`, `sherlock/`, `sherlock2/` im Hauptordner (nicht lesen, nicht ändern).

## Arbeitsstand (zuletzt 13. 11. 2026)
- **Fertig und committet:** Version 1 (bis e104b58), Grafik-Feinschliff A und B (baf7cd9).
- **Licht committet** (Flächen-Lichtkarten, zuletzt im Commit „Beleuchtung: Flächen-Lichtkarten …“). **Offen:** Rundgang und Prüfung durch den Nutzer in Firefox („Beleuchtung: Lichtkarte aktiv“, schräge Werkstattwand glatt). Zurückgestellt: Lichtberechnung auf der Grafikkarte (erst beim nächsten Ort).
- **Vereinbart mit dem Nutzer (Nov. 2026):** Beim Licht keine weiteren Feinschliff-Schleifen. Kleine Schönheitsfehler hier notieren und weitermachen, nur echte Fehler sofort beheben. Für jede größere Teilaufgabe eine neue Sitzung.
- **Bekannte kleine Schönheitsfehler Licht:** Fenster ohne Überstrahlen (Geschmackssache, kostet Leistung).
- **Danach:** Feinschliff C (bessere Wachsfiguren: Körperform, Hände, Gesichter, Kleidung) – vorher Abnahme festlegen (siehe CLAUDE.md „Grafik und Feinschliff“), dann D (Stuck, Beschläge). Danach weitere Inhalte von Fall 1 (siehe Ausbaustufen).
- Prüfhilfen: Vorschau `webgl-vorschau`; Blickpunkte siehe „Rundgang“. `ERR_CONNECTION_REFUSED` (Port 8765) = Empfänger nicht gestartet, harmlos.

## Ziel und Rahmen (Kurzfassung; vollständig: `.claude/notizen/holmes-rahmen.md`)
- Browserspiel (Deutsch, Erwachsene), Ich-Perspektive, Handy und PC; Sherlock Holmes als „Sigerson“, Berlin 1892, mehrere Fälle.
- **Keine historischen Fehler:** jede historische Angabe belegt (`.claude/notizen/holmes-quellen.md`), Unbelegtes mit dem Nutzer klären.
- Grafik stilisiert und selbst erzeugt; Leistung ≥ 30 Bilder/s Mittelklasse-Handy, 60 am PC; Ladegröße < 20 MB pro Fall. Pushen nur auf Wunsch.

## Grafik (Einzelheiten: `.claude/notizen/holmes-verlauf.md`)
- Feinschliff A (Licht) und B (Glanz, Glas) fertig; C (Wachsfiguren) und D (Stuck, Beschläge) offen.
- Beleuchtung vorab berechnet (`.claude/scripts/holmes_licht.py`): Lichtkarte (10 cm) für statische Quader/Flächen, Lichtgitter (0,4 m) für den Rest; keine Lampen. Runde Teile verdecken nur mit `userData.lichtHuelle`.
- **Nach jeder Änderung an Räumen, Möbeln, Fenstern neu berechnen:** `holmes_licht.py empfange` → im Spiel `await __debug.sendeLichtModell()` → `holmes_licht.py berechne` (≈ 10 min, im Terminal-Panel). Konsole beim Start: „Beleuchtung: Lichtkarte aktiv“.
- Bodenglanz (`welt/bodenglanz.js`): Dielen spiegeln die Fenster weich.

## Rundgang (feste Blickpunkte für `/visuell-pruefen`)
Im Browser: `__debug.steuerung.setzePosition(x, z, blick)` (Blick vorwärts = (−sin, −cos)); für Decke/Gesims mit der Maus nach oben ziehen.
1. Raum A gesamt: `(1,1, 0,5, π+0,45)`
2. Raum A Fensterwand mit Gesims und Decke: `(5,5, 4,75, −π/2)`, nach oben schauen
3. Raum A Hofwand mit Büsten: `(6,0, 3,0, π/2+0,3)`; Büsten nah: `(2,6, 6,2, 0,95)`
4. Ecke Fensterwand/Trennwand A|B: `(7,6, 8,0, −3π/4−0,15)`, leicht nach oben
5. Fensterecke Raum A: `(7,0, 1,6, −1,25)`
6. Raum B mit Kranich: `(5,3, 12,8, π)` und `(2,5, 11,0, π+0,6)`
7. Werkstatt gesamt: `(2,0, 20,5, π+0,5)`
8. Schräge Werkstattwand: `(5,6, 23,6, −3π/4+0,1)`

## Ausbaustufen
- **Grafik-Feinschliff direkt nach Version 1** (vom Nutzer so entschieden; Stil bleibt stilisiert und selbst erzeugt, handytauglich): weiche Schatten und Abdunkelung in Ecken/unter Möbeln, glänzende Materialien (Gold, Messing, Glas, poliertes Holz), bessere Wachsfiguren (Körperform, Hände, Gesichter, Kleidung), feinere Details (Stuckornamente, Beschläge), einheitliche Farbstimmung. Vorrang haben die spielwichtigen Gegenstände.
- Schwierigkeitsstufen, Droschkenfahrt, Startmenü mit Grafikeinstellung
- Hinweise verknüpfen, Auflösung (Wer/Wie/Warum)
- übrige Orte von Fall 1, danach weitere Fälle (je eigenes Viertel)

## Weitere Notizen (nicht automatisch geladen, bei Bedarf lesen)
- `.claude/notizen/holmes-fall1.md` – Fall 1 (Entwurf, Figuren, Hinweise), offene Recherchepunkte, Bau der III. Etage (Koordinaten, Module, Annahmen für den Spiel-Hinweis)
- `.claude/notizen/holmes-quellen.md` – alle Fundstellen; neue hier eintragen
- `.claude/notizen/holmes-verlauf.md` – Verlauf und Zahlenwerte von Grafik und Beleuchtung

## Kurzüberblick Spiel
- Koordinaten: x zur Behrenstraße, z zur Friedrichstraße; Raum A z 0–9,5, Raum B 9,75–19,5, Werkstatt 19,75–27,5 (abgeschrägte Ecke); Breite x 0–9; Höhe 4,0 m.
