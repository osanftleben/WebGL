# Wandschatten Werkstatt + Kleinteil-Schatten (holmes-berliner-faelle)
Ziel: Schatten an der Werkstattwand stimmen; Gipsformen/Wachstopf/Gießlöffel werfen Schatten auf Unterlage | Abnahme: kein Fleck über Wandbrett/Köpfen, Schattenkante unter Wandbrett, Brettschatten endet unter Oberkante, Vorher-Blick + Rundgang 7/8 ok, Kleinteile fleckfreier Schatten, check.py 0, Rundgang voll | Runden: 0 (ohne Obergrenze) | Sitzung: Aufgabensitzung Befund 7

## START Protokoll angelegt
- erledigt: Protokoll angelegt
- offen / nächster Schritt: Projektnotiz + Verlauf lesen

## 18:50 Ursache eingegrenzt (Chromium, Blick (5,75 | 24,25, −3π/4))
- Fleck kommt nur aus dem gebackenen Schattenbild: wsSchatten 0 → Wand sauber (Lichtkarte zeigt dort fast nichts, auch keine Kante unter dem Bord).
- Fenster reichen von 0,35 bis 3,05 m. Gewicht im Backen: Himmel (1+2·d.y)/3, „von unten“ (Strahl steigt, also Straße) 0,15 – aber innerhalb pow(…, MISCH 0,5) → effektiv ≈ 0,39 statt 0,15. Gemessen (Wandpunkt Schräge, Bordmitte): Anteil Licht von unten bei 2,6 m Höhe 75 %, bei 1,8 m 40 %. Die Abwärts-Schatten von Köpfen/Brettern liegen verdeckt hinter Bord/Brett → sichtbar bleiben nur die Aufwärts-Schatten = Wolke über Köpfen und Brettern.
- Zusätzlich (bekannt aus Teil 3): Abdunkeln 0,65 wirkt auf das ganze Licht, auch an der streifend beleuchteten Schrägwand, wo Fensterdirektlicht nur ein kleiner Teil ist; gleiche Ursache wie die zu dunklen Topf-/Formenschatten auf Werkbank 1 (damals wsWirft entfernt) → zweiter Fehler, gleiche Ursache.
- Test nur im Browser-Speicher (Modul als Blob mit geänderter Gewichtung, senden:false, keine Datei geändert): Himmel außerhalb pow, unten 0 → Wolke über Köpfen/Brettern weg, Schatten fallen nach unten/seitlich; Kante unter Bord weich sichtbar. Himmel-Hochzahl 2 statt 1: kein sichtbarer Unterschied. BP 7 unauffällig.
- Bilder: `.claude/notizen/bilder/2026-11-15-befund7-test-vorher.jpg` / `-nachher.jpg`
- offen / nächster Schritt: Befund + Vorschlag an Nutzer, auf Ja warten.

## 19:05 Nutzer: „von Grund auf schief?“ – Blick von der Büste, Fensteranteil gemessen
- Kamera am Kopf von Büste 2 (8,10 | 2,3 | 25,68), Blick in den Raum, fov 110: Fenster nur als schmale Streifen am Bildrand (streifend + 0,5 m Laibung). Bild `bilder/2026-11-15-befund7-blick-von-bueste.jpg`.
- Fensteranteil (kosinusgewichteter Raumwinkel der Öffnungen durch die Laibung, = Formfaktor): Schrägwand 2,6 m 0,26 % (19 % davon von oben), 1,8 m 0,27 %; Boden Raummitte 2,96 %; Werkbank 1 1,39 %; Wand x 0 2,71 %; Wand zu B 4,01 %. → Schrägwand bekommt 10–15× weniger Fensterlicht.
- Grundfehler bestätigt: Backen speichert nur das VERHÄLTNIS verdeckt/gesamt je Punkt (1 − r/g) und dunkelt damit das ganze Licht (inkl. Raum-/Deckenlicht) um bis 65 % ab – unabhängig davon, wie viel Fensterlicht überhaupt ankommt. Gleiche Ursache wie die zu dunklen Topf-/Formenschatten auf Werkbank 1.
- holmes_licht.py rechnet Direktlicht als E = Σ Himmel(Richtung)·cos·dΩ (Himmel 1 im Zenit, Boden 0,2·7/9·Farbe) → gleiche Einheit im Backen nachbildbar.
- Vorschlag an Nutzer: verdecktes Fensterlicht absolut backen und im Shader abziehen (lgE − verdeckt, begrenzt). Wartet auf Nutzer.

## 19:30 Umbau „verdeckte Bestrahlung abziehen“ (Nutzer: „Ja, umbauen“)
- `welt/werkstattschatten.js`: Gewicht = Himmel(Richtung, wie holmes_licht.py: (1+2 sin)/3·0,955, Boden 0,121) · cos·cos/r² · Fensterfläche je Punkt (MISCH und Normierung je Fläche entfernt; `flaechenJePunkt` prüft gleiche Abtastung). Gespeichert 1 − √(verdeckt / BEZUG 0,25). Kopf Version 2 + `bezug`; Laden lehnt Version 1 ab. Shader: wsF = max(1 − wsSchatten · BEZUG · v² · lgStaerke / wsL, wsUntergrenze 0,25), wsSchatten 1 (physikalisch).
- `welt/etage3.js`: Topf und Gipsformen – runde Teile `wsWirft` (Kasten/Formplatte nicht, stecken in der Lichtkarte). `welt/fundstuecke.js`: Gießlöffel (Schale + Stiel) `wsWirft`, Werfer jetzt aus ganzer Fundstück-Gruppe gesammelt.
- `.claude/scripts/holmes_schatten.py`: nur Kommentar (Bedeutung des Werts).
- Neu gebacken: 185 Flächen, 3102 Lichtpunkte, 22 s, PNG 376 KB (vorher 523), Anteil Schatten 52 %. check.py 0 Fehler (vor dem Backen).
- Ergebnis (Chromium): Schrägwand ohne Wolke, praktisch keine Fensterschatten (erwartet, 0,26 % Fensteranteil) – auch keine Kante unter dem Wandbrett. Werkbank 1: Schalen werfen schwache Schatten auf ihre Platten (nach −x, passt). Werkbank 2 am Fenster: Hände, Arm, Kästchen, Hocker mit sichtbaren Schatten. BP 7 unauffällig. Bilder `bilder/2026-11-15-befund7-neu-*.{jpg,png}`.
- offen: Nutzerurteil (Kante unter Wandbrett fehlt nun – Abnahmepunkt), danach voller Rundgang, Firefox, Abschluss. Sitzung lang (3,8 MB) → ggf. neue Sitzung mit diesem Protokoll.

## 19:45 Nutzer „So lassen, Rundgang“ – voller Rundgang (Chromium)
- Blickpunkte 1, 2 (oben), 3, 3 Büsten nah, 3a (Gruppe, Kopfschrank, Dienstmagd), 4 (leicht oben), 5, 6 (beide), 7, 8: unauffällig. Dazu Abnahme-Blicke (Vorher-Bild, Werkbank 1, Werkbank 2) siehe oben.
- Keine Konsolenfehler, 47 Anfragen alle 127.0.0.1, 60,2 Bilder/s an BP 7. check.py 0 Fehler.
- Restpunkt (vom Nutzer so belassen): keine Schattenkante unter dem Wandbrett der Schrägwand (dort kaum Fensterlicht; nur weiche Lichtkarte).
- offen: Firefox (Nutzer), /abschluss.

## 19:50 Abschluss
- Ergebnis: Fensterschatten der Werkstatt nach neuem Verfahren (verdeckte Bestrahlung abziehen), neu gebacken; Wolke über Köpfen/Brettern weg; Topf, Gipsschalen, Gießlöffel werfen. check.py 0 Fehler, voller Rundgang unauffällig, 60 Bilder/s, keine Konsolenfehler, nur 127.0.0.1.
- Committet: 257f432. Dateien: welt/werkstattschatten.js, welt/etage3.js, welt/fundstuecke.js, licht/werkstatt-schatten.png/.json, .claude/scripts/holmes_schatten.py (Kommentar), Notizen (Projektnotiz, Verlauf, Befunde Punkt 7, dieses Protokoll).
- Restfehler: keine Kante unter dem Wandbrett (Nutzer: so lassen); Firefox offen; Projektnotiz 5,9 KB (> 5 KB, war schon vorher drüber).
- Hinweis für Befund 3: neues Verfahren übernehmen.
