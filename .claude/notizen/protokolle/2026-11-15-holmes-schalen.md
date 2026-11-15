# Schalen mit Wandstärke – Befund 6 (holmes-berliner-faelle)
Ziel: Schalen bekommen echte Wandstärke (außen, innen, Rand), aus keinem Blickwinkel fehlt eine Wand | Abnahme: Nutzerblick + vorn/seitlich/schräg oben ohne fehlende Wand, Rand sichtbar; check.py 0; Rundgang ohne Auffälligkeiten, keine Konsolenfehler, Anfragen nur an 127.0.0.1 | Runden: 0/2 | Sitzung: holmes-schalen

## 18:13 Protokoll angelegt, Bauteil gefunden
- erledigt: Die „Schalen“ sind die beiden **Gipsformen** (`gipsform` in `welt/bauteile.js`, aufgestellt in `welt/etage3.js` Werkstatt bei x 3,8/4,25, z 22,85/22,95 auf der Werkbank), nicht die Näpfchen. Ursache: `SphereGeometry`-Halbkugel (einseitig, FrontSide), um x gedreht → Innenseite der vorderen Wand ist Rückseite und wird weggeschnitten.
- Gleicher Fehler vermutlich auch: `wachstopf` (offener Zylinder `topf`, m.eisen einseitig) und Gießlöffel in `welt/fundstuecke.js` (offene Halbkugel). Nur melden / nach Rücksprache mitbeheben.
- Unkritisch: Lampenschirm (emaille DoubleSide), Kragen, Melone (innen verdeckt).
- offen / nächster Schritt: Gipsform als Lathe-Profil mit Wandstärke bauen.

## 18:16 Gipsform neu gebaut
- erledigt: `schalenForm(radius, hoehe, wand, teile, stufen)` in `welt/bauteile.js` (LatheGeometry: Außenwand Viertelellipse, flacher Rand, Innenwand; je Randkante ein doppelter Punkt für scharfe Kanten). Gipsform: r 0,12 (Tiefe ×1,2), h 0,09, Wand 0,015, 16 Teile, 5 Stufen → 16·13·2 = 416 Dreiecke je Form (vorher 240). Unterseite 1 cm in der Platte (y 0,01), Rand wie vorher bei y 0,1.
- Lichtmodell/Schatten: runde Teile ohne `lichtHuelle` gehen nicht ins Lichtmodell, Gipsform ist kein `wsWirft`-Werfer → kein Neuberechnen/Neubacken nötig. Detailstufen nur für Figuren/Büsten/Köpfe → keine Stufe nötig (LOD ohnehin zurückgestellt).
- Dateien: `docs/holmes-berliner-faelle/welt/bauteile.js`
- offen / nächster Schritt: visuell prüfen.

## 18:19 Sichtprüfung
- erledigt: Umfang 16 → 24 Teile (Rand wirkte eckig) → 24·13·2 = 624 Dreiecke je Form. Abnahme-Blicke (Kamera direkt gesetzt, Steuerung im Browser abgeschaltet): Nutzerblick (3,6|1,45|22,2 → 4,05|0,95|22,9), vorn (4,0|1,03|22,25), seitlich (3,0|1,08|22,9), schräg oben (4,0|1,75|22,45): keine fehlende Wand, Rand sichtbar. check.py: 0 Fehler. Keine Konsolenfehler, Anfragen nur an 127.0.0.1 (ein Ladevorgang scheiterte mit ERR_CONNECTION_REFUSED am Vorschauserver Port 8001, Neuladen ok).
- Dateien: `docs/holmes-berliner-faelle/welt/bauteile.js`
- Rundgang angehalten: Nutzer fragt, warum Rundgang bei rein örtlicher Änderung → Entscheidung des Nutzers abwarten (weglassen oder doch machen).
- offen / nächster Schritt: Entscheidung Rundgang; Wachstopf/Gießlöffel nach Rücksprache; dann /abschluss.

## 18:21 Abschluss
- Ergebnis: Gipsformen mit Wandstärke fertig, Abnahme-Blicke ok, check.py 0 Fehler. Rundgang örtlich (Nutzer: volle Rundgänge nur, wenn sinnvoll) – Werkstatt gesamt ok, keine Konsolenfehler beim aktuellen Laden, Anfragen nur an 127.0.0.1.
- Setup angepasst (Nutzerwunsch): Regel voll/örtlich in `CLAUDE.md` („Wann ist etwas fertig?“), Skills `visuell-pruefen`, `auftrag`, `abschluss`.
- Nicht committet. Restfehler/offen: Firefox-Prüfung; Wachstopf und Gießlöffel vermutlich gleicher Fehler (ungeprüft).
- Projektnotiz: Block „Aktueller Auftrag“ ersetzt; Befunde-Datei Punkt 6 erledigt.
- Nachtrag: Nutzer fragt nach Schatten der Gipsformen auf die Platte → bekannter Restpunkt (wsWirft früher entfernt wegen Flecken); Vorschlag: bei Befund 3/7 mit Neubacken lösen. Sitzung beendet.
