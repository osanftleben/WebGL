# Schwerttafel – Stoffbezug, Klingen, Griffe (holmes-berliner-faelle)
Ziel: Richtschwerter auf der Schwerttafel gut erkennbar (Kontrast, Form) | Abnahme: Blick wie Vorher-Bild + schräg, check.py 0, Rundgang voll, 60 Bilder/s | Runden: 0/2 | Sitzung: holmes-schwerter (Befund 1)

## 19:21 Start
- erledigt: Protokoll angelegt
- offen / nächster Schritt: Notizen, Quellen, Bauteil lesen

## 19:45 Umbau + Licht
- erledigt: Schwerttafel umgebaut: Tuchbezug `stoffBezug` (Textur `stoffTextur`, texturen.js) vor dem Holzrahmen (7 cm Rand); Klinge `klingenGeometrie` (ExtrudeGeometry, Fase 28 % je Seite, Ende abgerundet, 0,9 m); neue Materialien `klinge`, `stahl` (Parierstange, Zwingen, Knauf), `griffLeder`; Stahlzwingen an beiden Griffenden.
- Licht neu berechnet (993 Quader, 4,2 s Grafikkarte); Werkstattschatten neu gebacken (Atlas verschoben; 185 Flächen, 23 s).
- Dateien: welt/bauteile.js, welt/texturen.js, licht/licht-etage3*, licht/werkstatt-schatten.*
- offen: Abnahme-Blicke, Rundgang

## 20:05 Feinschliff + Prüfung (Runde 0)
- erledigt: Stoff heller ([160,40,42] statt [112,26,30], war fast schwarz), Wolken in der Stofftextur schwächer (wirkten wie Flecken); Fasen-Normalen stilisiert ×4 gekippt (≈ 40° statt 11°), Klinge roughness 0,14 → Fase als Tonwechsel sichtbar.
- Licht erneut berechnet (Rückstrahlwert Stoff geändert, 4,7 s); Werkstattschatten unverändert gültig (Aufteilung gleich).
- Messwerte: check.py 0 Fehler; 60 Bilder/s; 41 Draw-Calls, 26 170 Dreiecke (Blick Tafel); keine Konsolenfehler; alle Anfragen an 127.0.0.1.
- Rundgang voll (1–8 inkl. 3a, 6 beide): unauffällig. Abnahme-Blicke vorn + schräg + zweite Tafel Hofwand: Griff dunkel vor Rot, Parierstange/Zwingen/Knauf hell, Klingen mit Fase und runden Enden.
- offen: Firefox-Prüfung und Abnahme durch den Nutzer, dann /abschluss

## 20:15 Abschluss
- Ergebnis: Nutzer hat in Firefox abgenommen (Runde 0/2). Projektnotiz, Befunde-Datei (Punkt 1 erledigt) und Verlauf aktualisiert.
- Restfehler: keine bekannt. Nicht committet (nur auf Wunsch).
