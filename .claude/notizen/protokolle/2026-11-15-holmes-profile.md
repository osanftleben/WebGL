# Profile Lambris + Türen, Befund 2 (holmes-berliner-faelle)
Ziel: Füllungen von Lambris und Türen mit echtem Profil (feine Stufen/Kanten, kleine Schattenkanten) statt aufgemalter Schrägen | Abnahme: Blick wie Vorher-Bild nicht mehr „aufgemalt“, Hell-Dunkel-Kanten an den Stufen, Türen passend; 60 Bilder/s PC; check.py 0; Rundgang voll | Runden: 0/2 | Sitzung: holmes-profile

## 18:59 Start
- erledigt: Protokoll angelegt; Projektnotiz, Verlauf (Wände + Türen), Recherche (Abschn. 2, 4, Bildauswertung) gelesen.
- offen / nächster Schritt: Aufbau der Füllungen in `welt/innenausbau.js` ansehen, Vorschlag vorlegen.

## ~19:03 Bestand + Vorschlag
- Bestand: Füllungen nur in die Textur gemalt (`fuellung()` in innenausbau.js: Kehle + Rundung + Fase als einfarbige Trapez-Ringe, Licht fest „oben links“). Lambris = 1 Quader je Wandstück (Lichtkarte), Türflügel = 1 Quader (`tuerFluegel`, Textur je Größe, auch Rückseite). Nicht-Quader bekommen nur das Lichtgitter (6 Richtungen, 0,4 m) und zählen nicht als Verdecker.
- Türen sind keine Werkstatt-Werfer (`wsWirft`) → Werkstattschatten voraussichtlich nicht neu backen.
- Vorschlag (vorgelegt, wartet auf Ja): echte Profilform je Füllung (aufgesetzte Profilleiste + erhabener Spiegel mit Fase) als eigene Geometrie vor dem Quader; Licht = Lichtkarte des Trägers (projiziert, keine Nahtkanten) × Richtungsverhältnis aus dem Lichtgitter; Eckenverschattung als Eckpunktfarben; gemalte Ringe entfallen, Goldlinie bleibt.

## ~19:08 Umsetzung (Nutzer: Ja)
- erledigt: `innenausbau.js`: gemalte Ringe entfernt (`fuellung` nur Grund + Goldlinie, Abstand PROFIL.linie 7,2 cm); `PROFIL` (Querschnitt mit Verschattung), `profilGeometrie`, `profilMaterial` (Klon mit vertexColors + `LG_TRAEGER`), `haengeProfilAn` (Kind des Quaders, `userData.lkTraeger`); Türen beide Seiten (`tuerTeilung`, `TUER.fries`), Lambris lang/kurz (`LAMBRIS_RIEGEL`). `lichtmodell.js`: Profilformen projizieren auf die Lichtkarte des Trägers (Atlas unverändert). `verschmelzen.js`: `dreheRichtung` für Attribut `lgTraeger`. `lichtgitter.js`: unter `LG_TRAEGER` Lichtkarte × Verhältnis Gitter(eigene Normale)/Gitter(Trägernormale), begrenzt 0,25–2.
- check.py: 0 Fehler.
- offen: Sichtprüfung, Licht neu berechnen.

## ~19:12 Licht, Rundgang, Messung
- Feinwert: Richtungsverhältnis hoch 1,6 (Stufen deutlicher, stilisiert) in lichtgitter.js.
- Licht neu: `holmes_licht.py empfange` → `sendeLichtModell` → `berechne` (6,1 s, 997 Quader, 982 Seiten); Prüfsumme unverändert c7334418 → Werkstattschatten passen weiter, nicht neu gebacken (Türen keine Werfer).
- Rundgang voll (BP 1–8, 3a, Werkstatt-Tür offen): keine Auffälligkeiten; Konsole ohne Fehler; alle Anfragen an 127.0.0.1 (8001 + Lichtempfang 8765).
- Bildrate (Pane sichtbar): Abnahme-Blick 60,0, BP 1 60,1, BP 6a 60,0, BP 6b 60,0, BP 7 60,1. (Vorher 1 Bild/s = Pane verdeckt, kein Fehler.)
- Nachher-Bild: `.claude/notizen/bilder/2026-11-15-befund2-nachher.jpg`. check.py 0 Fehler.
- offen: Urteil Nutzer (Runde 0/2), Firefox-Prüfung, /abschluss.

## ~19:16 Runde 1/2: Artefakte aus der Ferne (Nutzer-Bild Lambris an der Säule A|B)
- Ursache: Stufen 2–6 mm schmaler als ein Bildpunkt → helle/dunkle Pünktchen, Flimmern (Aliasing).
- Lösung: Verschattung nicht mehr als Eckpunktfarbe, sondern Attribut `lgProfil` (nah, fern, flach); in lichtgitter.js je Bildpunktgröße auf der Wand (`length(fwidth(vLgWelt))`, smoothstep 4–10 mm) ausgeblendet: Leiste → ruhiger Ring (0,86, ohne Richtungslicht), Fase/Spiegel behalten Richtungslicht. Erst 1,8–5 mm probiert: schon aus 1,5 m flach → verworfen.
- Geprüft (Chromium): Abnahme-Blick Kanten sichtbar, Blick an der Säule (3,2 | 6,0) und (2,6 | 7,4) ruhig, Konsole ohne Fehler. Bildrate 60. check.py 0.
- offen: Nutzer prüft in Firefox; /abschluss.

## 19:18 Abschluss
- Ergebnis: Befund 2 erledigt, Nutzer „passt“ (Firefox ok nach Runde 1/2). Commit 5c1c78c.
- Notizen: Projektnotiz (Eintrag statt „Aktueller Auftrag“), Verlauf (Abschnitt „Profile Lambris und Türen“), Befunde Punkt 2 erledigt.
- Restpunkte: keine vom Nutzer genannt. Projektnotiz weiter > 5 KB (6,1 KB) – Kürzen offen.
- Hinweis: Uhrzeiten der Einträge ~19:03–19:16 nachträglich geschätzt (vorher falsch eingetragen).
