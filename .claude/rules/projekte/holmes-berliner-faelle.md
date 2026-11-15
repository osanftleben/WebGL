---
paths:
  - "docs/holmes-berliner-faelle/**"
---

# Projekt: Sherlock Holmes – Die Berliner Fälle

- Ordner: `docs/holmes-berliner-faelle/`, online unter `…/WebGL/holmes-berliner-faelle/`
- Nicht verwechseln mit den alten, gesperrten Ordnern `sherlock-holmes-in-berlin/`, `sherlock/`, `sherlock2/`.

## Arbeitsstand (zuletzt 15. 11. 2026)
- **LOD zurückgestellt** (bis Projektende; Sichtbarkeit 4eb7f01, Stufen 019022f). Offen: 50-%-Regel.
- Fertig, Firefox ok (Einzelheiten im Verlauf): Licht + Kontaktschatten, Augenanpassung, Fensterausblick, Besetzung, Feinschliff C und D (Stuck, Beschläge), B1, B2, Kranich, Hinweise verknüpfen (9d07847). **Licht abgeschlossen** (776b9ed): nur echte Fehler beheben.
- **Zusätzliche Effekte nur in der vollen Detailstufe** (Nutzer, fest); sparsame Stufe: gleiche Grundfarben, Fleckprüfung 0.
- **Drehbuch Vormittag** abgenommen: `.claude/notizen/holmes-fall1-drehbuch-vormittag.md`.
- **Wände + Türen** (f2c9acc), Firefox ok: `welt/innenausbau.js` (auch für den Vorraum).
- **Werkstatt** (715ad95) + **Teil 2/3 + Beinschatten** (4add9dc) + **Schatten gebacken** (87cf3af), Firefox ok (auch Raum A/B ohne Beinflecken): Schatten in `licht/werkstatt-schatten.*`. **Werfer geändert → neu backen:** `holmes_schatten.py empfange` → `await __debug.backeWerkstattSchatten()`. Offen: Gitter-Zufall, Gipsformen/Topf/Holz, Wurfschatten auf runden Teilen. Keine Kontaktflecken mehr unter Möbelbeinen (alle Räume).
- Weitere Restpunkte im Verlauf (u. a. Gesims-Fuge, Kranich-Monogramm).
- **Als Nächstes:** Einbau Vormittag (Teil 2), in 3 Sitzungen: Vorraum, Figuren, Gespräche.
- **Leistung: nur die Bildrate zählt** (Nutzer, fest); Draw-Calls sind keine Grenze, nicht danach fragen.
- Prüfhilfen: Vorschau `webgl-vorschau`; `.claude/scripts/holmes_pruefhilfen.js` in die Konsole. Port-8765-Fehler harmlos.

## Ziel und Rahmen (Kurzfassung; vollständig: `.claude/notizen/holmes-rahmen.md`)
- Browserspiel (Deutsch, Erwachsene), Ich-Perspektive, Handy und PC; Sherlock Holmes als „Sigerson“, Berlin 1892, mehrere Fälle.
- **Keine historischen Fehler:** jede historische Angabe belegt (`.claude/notizen/holmes-quellen.md`), Unbelegtes mit dem Nutzer klären.
- Grafik stilisiert und selbst erzeugt; Leistung ≥ 30 Bilder/s Mittelklasse-Handy, 60 am PC; Ladegröße < 20 MB pro Fall. Pushen nur auf Wunsch.

## Grafik (Einzelheiten: `.claude/notizen/holmes-verlauf.md`)
- Beleuchtung vorab berechnet (`.claude/scripts/holmes_licht.py`): Lichtkarte (10 cm) für statische Quader/Flächen, Lichtgitter (0,4 m) für den Rest; keine Lampen. Runde Teile verdecken nur mit `userData.lichtHuelle`.
- **Nach jeder Änderung an Räumen, Möbeln, Fenstern neu berechnen:** `holmes_licht.py empfange` → im Spiel `await __debug.sendeLichtModell()` → `holmes_licht.py berechne` (über den Wächter; Grafikkarte ≈ 3 s, mit `--cpu` ≈ 100 s). Konsole beim Start: „Beleuchtung: Lichtkarte aktiv“.
- Sichtbarkeit je 1-m-Zelle (`welt/sichtbarkeit.js`): statische Teile ordnet `verschmelze` selbst zu; eigene Objekte (Personen, Funde) mit `etage.sichtbarkeit.registriere()` anmelden. Neue offene Durchgänge dort eintragen, sonst fehlt der Nachbarraum.
- Detailstufen (`welt/stufen.js`): jede neue Figur mit `alsStufe(teil, () => sparsam(bau), { abstand })` markieren (drehende: `beweglich: true`), vor dem Verschmelzen `baueStufen`; danach Fleckprüfung (Verlauf).

## Rundgang (feste Blickpunkte für `/visuell-pruefen`)
Im Browser: `__debug.steuerung.setzePosition(x, z, blick)` (Blick vorwärts = (−sin, −cos)); nach oben: `__pruef.blick(x, z, blick, neigung)`.
1. Raum A gesamt: `(1,1, 0,5, π+0,45)`
2. Raum A Fensterwand mit Gesims und Decke: `(5,5, 4,75, −π/2)`, nach oben schauen
3. Raum A Hofwand mit Büsten: `(6,0, 3,0, π/2+0,3)`; Büsten nah: `(2,6, 6,2, 0,95)`
3a. Figurengruppe nah `(4,6, 16,6, π/2)`, Kopfschrank nah `(2,6, 12,1, π/2)`, Dienstmagd seitlich `(3,0, 18,8, 0,85)`
4. Ecke Fensterwand/Trennwand A|B: `(7,6, 8,0, −3π/4−0,15)`, leicht nach oben
5. Fensterecke Raum A: `(7,0, 1,6, −1,25)`
6. Raum B mit Kranich: `(5,3, 12,8, π)` und `(2,5, 11,0, π+0,6)`
7. Werkstatt gesamt: `(2,0, 20,5, π+0,5)`
8. Schräge Werkstattwand: `(5,6, 23,6, −3π/4+0,1)`

## Ausbaustufen
- **Grafik-Feinschliff** (stilisiert, selbst erzeugt, handytauglich; spielwichtige Gegenstände zuerst): A–D fertig.
- Schwierigkeitsstufen, Droschkenfahrt, Startmenü mit Grafikeinstellung
- Hinweise verknüpfen (erste fertig), Auflösung (Wer/Wie/Warum)
- übrige Orte von Fall 1, danach weitere Fälle (je eigenes Viertel)

## Weitere Notizen (nicht automatisch geladen, bei Bedarf lesen)
- `.claude/notizen/holmes-fall1.md` – Fall 1 (Entwurf, Figuren, Hinweise, Recherchepunkte), Bau der III. Etage
- `.claude/notizen/holmes-quellen.md` – alle Fundstellen; neue hier eintragen
- `.claude/notizen/holmes-verlauf.md` – Verlauf und Zahlenwerte von Grafik und Beleuchtung

## Kurzüberblick Spiel
- Koordinaten: x zur Behrenstraße, z zur Friedrichstraße; Raum A z 0–9,5, Raum B 9,75–19,5, Werkstatt 19,75–27,5 (abgeschrägte Ecke); Breite x 0–9; Höhe 4,0 m.
