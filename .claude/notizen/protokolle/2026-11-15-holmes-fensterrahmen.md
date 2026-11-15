# Fensterlaibungen/Fensterbank physikalisch plausibel (holmes-berliner-faelle)
Ziel: Laibungen + Fensterbänke innen (III. Etage, Raum A/B, Werkstatt) dunkler als der sichtbare Himmel, Verlauf außen → innen | Abnahme: Zahlen im linearen Licht + Vorher/Nachher-Bilder an BP 2, 4, 5, 7; übriger Raum wie vorher; 60 Bilder/s; check.py 0; Rundgang | Nicht dazu: Himmel/Ausblick, Belichtung/Augenanpassung | Runden: 0/unbegrenzt | Sitzung: Aufgabensitzung Fensterrahmen

## 17:35 Start
- erledigt: Protokoll angelegt, Notizen gelesen.
- offen / nächster Schritt: Vorher-Bilder + Messung (linear) an BP 2, 4, 5, 7.

## 18:05 Vorher-Messung (linear, vor ACES) – Messhilfe `.claude/scripts/holmes_fenster_messen.js` (`__fm.messe()`)
- Verfahren: Szene in Float-Ziel ohne Farbkurve, Wert = Belichtung · Leuchtdichte; Himmel (toneMapped false) als ACES-Umkehrwert („wie hell müsste eine Fläche vor ACES sein“). Bildwert 232 ⇔ vor ACES ≈ 1,18.
- BP 2 (Raum A, nach oben, Bel. 1,25): Himmel 1,03 | Laibung 10–20 cm 1,59, 20–32 cm (am Rahmen) 1,70 (max 3,0) = 1,5–1,65× Himmel | Sturz 0,96–1,0 | Wand neben Öffnung 0,07–0,09 | Raum Median 0,17 (p90 0,24) | Fassade 0,28.
- BP 4 (Bel. 1,41): kaum Laibung im Bild; Himmel 1,47, Raum 0,08, Sturz außen 0,69.
- BP 5 (Bel. 1,25): Himmel 1,17 | Fensterbank 5,26–5,33 (= 4,5× Himmel, Bildwert 251) | Laibung am Rahmen 1,92 (1,6×) | Sturz 0,94–1,02 | Raum 0,075.
- BP 7 Werkstatt (Bel. 1,36, kein Himmel im Bild): Fensterbank 8,3 (253) | Laibung 0–10 cm 3,43, 10–20 cm 3,79, am Rahmen 2,05 (p90 4,46) | Sturz 1,5–1,57 | Raum 0,10.
- Bilder vorher (Scratchpad `bilder/vorher-bp2/4/5.jpg`, BP 7 folgt).

## 18:15 Ursache
- Lichtkarte selbst physikalisch plausibel: Laibung ρE/π ≈ 0,06 (E/π ≈ 0,095 bei Zenit = 1) → ≈ 0,2–0,3 der Himmelsleuchtdichte am Horizont; Fensterbank (ρ 0,78) E/π ≈ 0,25 → 0,5–0,75 Himmel. Werkstatt ≈ doppelt so hell (keine Vorhänge).
- Darstellung passt nicht zusammen: Raumlicht × 22 × Belichtung 1,25, der Himmel dagegen fest gemalt (Bildwert 232 ⇔ vor ACES 1,18 ⇔ nur ≈ 0,04 in Spieleinheiten statt 0,33–1). Der Raum ist also gegenüber dem Himmel ~10× angehoben (gewollt, Augenanpassung/stilisiert). Was am Fenster viel Himmel sieht, wird mit angehoben und überholt den gemalten Himmel.
- Zusätzlich: Weichzeichnen σ 25 cm über eine 31 cm tiefe Laibung (3 Bildpunkte) verwischt den Verlauf außen → innen.
- offen / nächster Schritt: Weg vorlegen (A Helligkeitskurve im Shader, B weniger Weichzeichnen an schmalen Fensterflächen + Neuberechnung).

## 18:25 Nutzer: Weg A und B
## 18:35 A umgesetzt – Helligkeitskurve im Licht-Shader
- Dateien: `welt/lichtgitter.js` (Option `hell` → Uniform `lgHell`, nach den Zusätzen, vor der Grundhelligkeit: l → l/(1+(l/grenze)^haerte)^(daempfung/haerte), gleicher Faktor für r, g, b), `main.js` (`LICHT_HELL = { grenze: 1.78, haerte: 3, daempfung: 0.85 }`; 1,78 ⇔ weiße Fläche bei 0,6 Himmel bei Belichtung 1,25).
- Messwerte (vor ACES, Himmel = 1): BP 5 Fensterbank 0,67 (vorher 4,5), Laibung 0,49 (1,6), Sturz 0,43 (0,8–0,87), Raum 0,075 (0,075) · BP 2 Laibung 0,53–0,56 (1,5–1,65), Sturz 0,49, Raum Median 0,163 (0,166), p90 0,232 (0,236) · BP 7 Werkstatt (Bezug gemalter Himmel 1,18–1,22): Fensterbank 0,77, Laibung 0,56–0,62.
## 18:45 B umgesetzt – Weichzeichnen in Fensteröffnungen
- Datei: `.claude/scripts/holmes_licht.py`: `_gauss_seite` mit Sigma je Richtung, `_tiefenachse` (Seite liegt in einer Fensteröffnung und hat eine Kante quer zur Wand), quer zur Wand σ `KARTE_UNSCHAERFE_TIEFE` 0,6 statt 2,5 Bildpunkte; 102 Seiten betroffen.
- Lichtmodell neu empfangen (bytegleich zum alten), neu gerechnet (Grafikkarte 4,9 s), Prüfsumme c7334418 unverändert → Werkstattschatten gültig (Konsole ok). Vergleich alt ↔ neu: 1,35 % der Kartenpunkte verschieden (nur Öffnungsseiten), Gitter unverändert.
- Verlauf (ohne Kurve, roh): Werkstatt Laibung 0–8 cm 2,86 → 16–24 cm 3,20 (+12 %), Fensterbank 7,3 → 9,3 (+27 %); am Rahmen (24–32 cm) dunkler (Rahmen verschattet). Nachgerechnet (Formfaktor, gleichmäßiger Himmel, Fenster 1,3 × 2,7 m): direktes Licht innen 0,31 → am Rahmen 0,41 (+30 %); mit dem gleichmäßigeren zurückgeworfenen Licht sind +12–27 % plausibel.
- Mit Kurve (Endstand, Himmel = 1): BP 2 Laibung 8–16 cm 0,54 → 24–32 cm 0,60, Sturz 0,48 → 0,56 · BP 5 Laibung 0,49–0,50, Fensterbank 0,65–0,68, Sturz 0,42 → 0,50 · BP 7 Laibung 0,57–0,58, Fensterbank 0,73–0,76, Sturz 0,51–0,53. Verlauf vorhanden, aber schwach (die Kurve drückt ihn auf ~¼).
- Bilder (Scratchpad `bilder/`): vorher/nachher BP 2, 4, 5, 7; Werkstattfenster nah mit/ohne Kurve.
## 18:55 Prüfung
- Rundgang BP 1, 2, 3, 3a (Figurengruppe), 4, 5, 6, 7, 8 ohne Auffälligkeiten; Nahblick Werkstattfenster ohne Flecken. Konsole ohne Fehler, keine Anfragen außer 127.0.0.1. 60 Bilder/s (Werkstatt, BP 5). check.py 0 Fehler.
- Runden: 0 (Nutzer noch nicht gesehen).
- offen / nächster Schritt: Bilder dem Nutzer zeigen, Rückmeldung; Firefox-Prüfung durch den Nutzer; danach /abschluss.

## 19:05 Abschluss
- Nutzer: „Passt, abschließen“ (Runden 0). Ergebnis: Laibung 0,49–0,60, Fensterbank 0,65–0,76, Sturz 0,42–0,56 der Himmelshelligkeit (vor ACES), Raum unverändert; check.py 0 Fehler, Rundgang ok, 60 Bilder/s.
- Nicht committet (nur auf Wunsch). Dateien: `docs/holmes-berliner-faelle/main.js`, `welt/lichtgitter.js`, `licht/licht-etage3*.{png,json}`, `.claude/scripts/holmes_licht.py`, `.claude/scripts/holmes_fenster_messen.js`, Notizen.
- Restfehler: Verlauf außen → innen schwach; Firefox-Prüfung durch den Nutzer offen.
