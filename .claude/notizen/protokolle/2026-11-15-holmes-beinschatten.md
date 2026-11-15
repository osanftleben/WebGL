# Beinschatten von allen Fenstern (holmes-berliner-faelle)
Ziel: Jede Stelle der Werkstatt bekommt Beinschatten von allen Fenstern, deren Licht sie erreicht | Abnahme: Nutzer-Blick (Kamera 3,27|20,84, rot.y −1,95, rot.x −0,56) Werkbank-1-Beine und Hocker mit Schatten aus allen passenden Richtungen; BP 7/8 ohne neue Fehler; Raum A/B und Lichtkarte (c7334418) unverändert; 60 Bilder/s; Start ≤ 1,5 s; check.py 0 Fehler | Runden: 0 (unbegrenzt) | Sitzung: Aufgabensitzung Beinschatten

## 16:25 Start
- erledigt: Protokoll angelegt; Vorgeschichte gelesen (Protokoll `2026-11-15-holmes-werkstatt-3.md`, Nachtrag + Arbeitsstand).
- offen / nächster Schritt: Werfer-Auswahl je Empfangsfläche in `welt/werkstattschatten.js` prüfen, dann Bodenteilung.

## Ursache (Nutzer)
- Werfer-Auswahl je Fläche gelesen: für den Boden rechnerisch richtig (alle Fensterecken vor der Ebene, Prisma enthält den Werfer) – lässt keine Fenster fallen.
- Nutzer: Ursache ist die Gewichtung nach Lage im Raum. Im Code: `gewicht()` (GEWICHT, werkstattschatten.js) – je Lichtpunkt cos(Einfall) · cos(Austritt am Fenster) · Himmel / Abstand²; Schatten = 0,65 · verdeckter Anteil. Fenster, die eine Stelle schräg/weit treffen, haben kleinen Anteil → ihr Schatten ist kaum sichtbar (Werkbank 1 früher geschätzt 40/38/22 %).
- Vorübergehend eingebaut (noch drin): `?wsfenster=i`, `window.__wsTest`.
- offen: Nutzer wählt Lösung (Fenster gleich gewichten).

## Mischwert eingebaut (Nutzer: B)
- `werkstattschatten.js`: `MISCH` = Hochzahl auf das Lichtpunkt-Gewicht (Uniform `fMisch`, auch in der Normierung `fSkala`); 0 = jeder erreichende Lichtpunkt gleich, 1 = wie bisher. Vorübergehend Schalter `?wsmisch=` (Vorgabe 0,5).
- Prüfhilfe neu: `.claude/scripts/holmes_bodenschatten_bild.js` (Schattenbild des Bodens als Bild über dem Spiel; braucht `__wsTest`).
- Vergleich Boden um Werkbank 1/Hocker (x 3,0–6,4, z 21,6–24,0): 1 = rechte Beine fast nur Behrenstraße-Schatten; 0,5 = Friedrichstraße-Fächer sichtbar; 0 = alle Richtungen etwa gleich kräftig. Bilder im Scratchpad (`boden_misch_*.png`).
- Messwerte: Start 1,34–1,46 s (185 Flächen, unverändert).
- offen: Nutzer wählt Wert.

## Fächer (Nutzer-Bild), Entscheidung
- Nutzer: Schatten wirken „aufgefächert“. Ursache: 64 feste Lichtpunkte je Fenster (6 × 11, ≈ 22 cm Abstand), dieselben für alle Bodenpunkte → ab ≈ 1 m vom Bein liegen die Einzelschatten nebeneinander. Gleiches Verfahren wie die früheren Fehler → Verfahren aufgeben statt flicken.
- Nutzer: „zu viel Gefrickel“ → professionelle Lösung erklärt (vorab gebackene feine Lichtkarte mit Zufallsstrahlen je Bildpunkt + Entrauschen, alle Teile werfen). Nutzer: Mischwert 0,5 festlegen; professionelle Schattenberechnung als neue Sitzung von der Hauptsitzung aus.
- Fächer bleibt als Restfehler bis zur neuen Lösung.

## Gegenprüfung
- `MISCH = 0.5` fest, Schalter `?wsfenster`, `?wsmisch`, `__wsTest` entfernt; Prüfhilfe-Kopf ergänzt.
- Messwerte: Start 1,37 s (185 Flächen), 60 Bilder/s an BP 7, BP 8, Nutzer-Blick; Lichtkarte aktiv, Prüfsumme c7334418; keine fremden Anfragen; BP 7, BP 8, BP 1 (Raum A) unauffällig; check.py 0 Fehler. (Ein „connection refused“ beim Neuladen: Server kurz weg, danach normal.)
- Runden: 1 (Fächer-Rückmeldung).
- Firefox ungeprüft (Nutzer).

## 16:40 Abschluss
- Ergebnis: Ursache = Gewichtung der Lichtpunkte nach Abstand/Winkel (Lage im Raum bestimmt, welches Fenster überwiegt). Behoben mit Hochzahl `MISCH` 0,5 in `gewicht()` und Normierung (`welt/werkstattschatten.js`): Schatten aller erreichenden Fenster sichtbar. Start 1,37 s, 60 Bilder/s, Lichtkarte c7334418, check.py 0 Fehler.
- Nicht committet (kein Wunsch; ein Commit enthielte auch die offenen Werkstatt-Teil-2/3-Änderungen).
- Restfehler: Fächer aus festen Lichtpunkten → neuer Auftrag „professionelle Schattenberechnung“ (Hauptsitzung). Firefox ungeprüft.
- Neue Prüfhilfe: `.claude/scripts/holmes_bodenschatten_bild.js`.
