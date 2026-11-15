# Feinschliff D: Stuck und Beschläge (holmes-berliner-faelle)
Ziel: Rokoko-angelehnter Stuck (Rosette, Deckenrahmen, Gesims, Goldleiste, Kapitelle) und Beschläge (Türklinken, Bänder, Fenstergriffe), stilisiert, Muster = Annahme | Abnahme: Blickpunkt 2 (nach oben), 4, 5 + Nahblick Tür/Fenster; 60 Bilder/s; Lichtkarte neu und aktiv; Rundgang unauffällig; check.py 0; Firefox durch Nutzer | Nicht dazu: Recherche, Wände/Möbel sonst | Runden: 0/2 | Sitzung: Aufgabensitzung Feinschliff D

## Start
- erledigt: Projektnotiz, Verlauf (Bau III. Etage), Kranich-Protokoll gelesen; bauteile.js: stuckdecke (Quader-Rahmen + Zylinder-Rosette + Torus), Gesims = 1 Quader 0,18 × 0,12, Goldleiste Quader, saeule (Zylinder-Kapitell), Tür nur Messingstab, Fenster ohne Beschläge
- Nutzer: Umfang „entscheide du“ → alle vier, leicht gebaut; Stil Rokoko-angelehnt; keine Recherche (Annahme); Abnahme wie Vorschlag; 2 Runden; Plan „Ja, umsetzen“
- Technik: Relief in die Farbtextur gemalt (Licht nur aus Lichtkarte/Gitter, keine Lampen → Normalenkarten wirken auf Lambert nicht); Gold mit Normalenkarte (wirkt auf Spiegelung)
- offen / nächster Schritt: Ausgangswerte messen

## Ausgangswerte gemessen
- Messwerte (Stand 878f4b3, 736 × 630, Pixeldichte 2; Draw-Calls / Dreiecke): A Fensterwand (BP 2, waagerecht) 36 / 2310 · Ecke A|B (BP 4) 25 / 15 116 · Fensterecke A (BP 5) 23 / 1778 · Tür nah `nah(6.5, 2.6, 6.5, 0, 50)` 18 / 1564 · Fenster nah `nah(7.6, 3.0, 9, 1.9, 50)` 22 / 1774 · 60,3 Bilder/s
- Prüfhilfe neu: `__pruef.blick(x, z, b, neigung)` (Neigung nach oben, umhüllt steuerung.aktualisiere) in `.claude/scripts/holmes_pruefhilfen.js`; BP 2 oben = `blick(5.5, 4.75, -π/2, 0.7)`
- Befund: BP 4 zeigt die Säulen nicht (liegen links außerhalb) → Kapitell-Nahblick nötig: `blick(4.5, 6.5, atan2(-(6-4.5), -(9.26-6.5)), 0.5)`
- Lichtkarte aktiv, Prüfsumme 77bcb35e
- offen / nächster Schritt: Texturen (Stuck, Gold) in texturen.js, dann bauteile.js

## Umsetzung, Licht neu
- erledigt: neues Modul `welt/stuck.js` (Stucktextur 1024² mit Fries, Rahmenband, Perlstab, Profil, Rosette; Goldtextur 1024 × 512 mit Perlstab und Blattkranz + Normalenkarte; bandUV, flachUV, rosettenGeometrie (Drehform), kapitellGeometrie (Glocke)); texturen.js: leinwand/alsTextur exportiert
- bauteile.js: Materialien `stuck` (Lambert, Textur), `goldOrnament` (Standard, Normalenkarte); Gesims = Deckplatte 0,06 × 0,15 + Fries 0,18 × 0,09 (Ornament nur mit goldleiste, Werkstatt glatt) + Perlstab 0,04 × 0,05 + Goldleiste 0,05 (Perlstab Gold, y H−0,31); Deckenrahmen 0,24 (Ranke) / Gold 0,05 / innen 0,08 (Perlstab); Rosette r 0,62 gewölbt + Goldring; Kapitell Glocke + Halsring + 4 Voluten; Beschläge mit `keinLichtModell` (Tür: Langschild, Drücker, Schlüsselloch, 3 Bänder je Flügel; Fenster: Olive, 2 Bänder je Seite)
- Kontrast nachgeschärft (Grund tiefer, erhabene Teile heller, Schatten 0,72)
- Licht neu (Grafikkarte 3,9 s): 764 Quader, 724 Seiten, Prüfsumme fee3a9c8, Konsole „Lichtkarte aktiv“
- offen / nächster Schritt: Fensterrahmen wirkten mit nur Lichtgitter orange → mit Lichtkarte prüfen; Messung, Blickpunkte

## Messung nach Umbau, Rundgang, check.py
- Messwerte (Draw-Calls / Dreiecke, vorher → nachher): BP 2 36/2310 → 42/2646 · BP 2 oben 39/3338 · BP 4 25/15 116 → 26/15 224 · BP 5 23/1778 → 26/1970 · Tür nah 18/1564 → 19/1672 · Fenster nah 22/1774 → 25/1966 · Kapitell nah `nah(4.6, 7.4, 6.0, 9.26, 35, 0.75)` 23/3316 · 60 Bilder/s (BP 2 oben und BP 1)
- Draw-Calls +1…+6: zwei neue Materialien (stuck, goldOrnament) je Sichtbarkeitszelle; nach fester Nutzerregel zählt nur die Bildrate
- Fensterrahmen wirken nah orange-bräunlich: schon vorher so (Vergleich BP 2 vorher/nachher gleich), nicht Teil von D
- Deckplatte des Gesimses: Unterseite lag als dunkler, bläulicher Streifen (Lichtkarte im Innenwinkel) → Überstand 6 → 2 cm, Licht neu (Prüfsumme bleibt fee3a9c8, aktiv); Reststreifen wirkt als Schattenfuge; Abakus-Oberseite ebenso dunkel (schon vorher)
- Rundgang BP 1, 2, 3, 6, 7, 8 + Nahblicke ohne Auffälligkeiten (Werkstatt-Gesims glatt); keine Konsolenfehler außer altem 404 meines Abrufs, alle Anfragen an 127.0.0.1; check.py 0 Fehler
- offen / nächster Schritt: Abnahme durch Nutzer (Runde 0/2), danach Firefox, /abschluss

## Abschluss
- Ergebnis: Abnahme vom Nutzer bestätigt („Ja, bestanden“), Runde 0/2; check.py 0 Fehler; Rundgang Chromium unauffällig; Lichtkarte aktiv (fee3a9c8); 60 Bilder/s
- Firefox: offen (Nutzer noch nicht geprüft)
- Restfehler: schmale dunkle Fuge unter der Gesims-Deckplatte und auf dem Abakus; Draw-Calls +1…+6 (nur Bildrate zählt)
- Notizen: Projektnotiz (Arbeitsstand, 5,1 KB), Verlauf (Abschnitt D), Quellen (Annahme D)
- Commit: 19566e2 (auf Wunsch des Nutzers)
