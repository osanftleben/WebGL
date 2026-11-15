# Wände und Türen der III. Etage (holmes-berliner-faelle)
Ziel: Raum A/B Holz-Lambris (~1 m, mit Feldern) + Tapete mit dezentem Muster; Werkstatt Ölfarbsockel + heller Kalkputz; Türen mit Rahmen und Füllungen; alles als wiederverwendbare Bauteile/Materialien (Vorraum übernimmt sie) | Abnahme: Blickpunkte 1, 3, 4, 6, 7, 8 (scale 0,5); Tapete ohne Wiederholungskanten/Flimmern, nah keine Wasserflecken; 60 Bilder/s PC; Fleckprüfung 0; Lichtmodell neu; Nutzer bestätigt | Nicht dazu: Werkstatt-Ausstattung, Vorraum, Licht (nur echte Fehler), Stuck/Gesims | Runden: 0/2 | Sitzung: Aufgabensitzung Wände + Türen

## Start
- erledigt: Projektnotiz, Skill auftrag, Bau-Abschnitt holmes-fall1.md gelesen; Code: `wand()` in `welt/bauteile.js` (Pfeiler/Sturz als Quader mit `putzSaal`/`putzHell`, Fußleiste 0,16 m `fussleiste`, Tür = 2 Flügel `holzDunkel` + 2 aufgesetzte `holzHell`-Felder, Bekleidung 3 Quader); `putzTextur` (256², 2500 Flecken, Kachel 2 m) in `welt/texturen.js`; Wände in `welt/etage3.js` Z. 90–151; offener Werkstatt-Türflügel = schlichter Quader (etage3 Z. 135)
- Technik-Rahmen: Licht nur aus Lichtkarte (Quader-Seiten ≥ 10 cm) und Gitter → Relief in die Farbtextur malen (wie Stuck D); Albedo für Licht = Mittelfarbe der Textur
- offen / nächster Schritt: Recherche über Agent `recherche`

## Recherche gestartet, Bausteine vorab (Farben vorläufig)
- Recherche-Agent läuft (Thema `holmes-waende-tueren-1890`)
- erledigt (vorab, Farben noch nicht freigegeben): neues Modul `welt/innenausbau.js` – Texturen `tapetenTextur` (Damast-Medaillon im Versatz, 512², Kachel 0,5 m), `lambrisTextur` (ein Feld je Kachel, Fase/Profil eingemalt), `oelsockelTextur` (Begleitstrich oben), `kalkputzTextur` (nur feines Korn), `tuerTextur` (3 Füllungen je Flügel); `wandUV` (Textur läuft über Pfeiler/Sturz/Brüstung durch), `lambrisUV`; Materialien `innenMaterialien()`; Bauteile `tuerFluegel`, `tuerRahmen` (Bekleidung + Wulst, Verdachung), `tuerFutter`, `lambrisStueck`, `oelsockelStueck`
- bauteile.js `wand()`: Optionen `sockel: 'lambris'|'oel'`, `verdachung`; Wandteile mit `wandUV` bei `material.userData.weltKachel`; Doppeltür = 2 Füllungsflügel + Schwelle + Futter; Durchgänge mit Futter; Bekleidung bei Trennwänden beidseitig; Fußleiste endet an der Bekleidung (0,13)
- etage3.js: A/B `m.tapete` + Lambris + Verdachung, Werkstatt `m.kalkputz` + Ölsockel; offener Werkstattflügel = `tuerFluegel` vor der Bekleidung; Kopfschränke 0,02 → 0,05 von der Wand
- Erster Blick (alte Lichtkarte): Tür Treppenhaus, BP 1 sehen stimmig aus; `putzSaal`/`putzHell` jetzt unbenutzt (Entfernen erst nach Ja)
- offen / nächster Schritt: Recherche-Ergebnis abwarten, Gestaltung vorschlagen

## Recherche fertig, Gestaltung vom Nutzer gewählt, umgesetzt
- Recherche: `.claude/notizen/recherche/2026-11-15-holmes-waende-tueren-1890.md` (11 Fundstellen, 5 Bilder nach Ja des Nutzers geladen und ausgewertet; 03 ohne Ertrag, 04 falsche Seite – Türteilungen vermutlich Scan n171)
- Nutzer (alle Empfehlungen): Lambris + Türen elfenbein mit Goldlinie (Hirth 1886: Rokoko-Lambris hell, Holzfarbe „nahezu“ ausgeschlossen; Pschorr-EG „lichte, durch Vergoldung belebte Wandtäfelungen“), Tapete warmes Ocker Ton in Ton, Lambris 1,2 m lang + schmal (Koch 1903), Werkstatt-Ölsockel 1,5 m graugrün mit Begleitstrich (Strich/Farbe Annahme)
- Umsetzung: `STIL` in innenausbau.js (`holz` bleibt als Variante, `STIL_WAHL = 'weiss'`); Lambris-Kachel 1,6 m = langes Feld + schmales hochgestelltes; Leisten/Bekleidung glatt gefasst; Goldlinie 3 Bildpunkte
- Licht neu: 857 Quader, 834 Lichtkarten-Seiten, Grafikkarte 3,6 s, Prüfsumme 570b8e41, Konsole „Lichtkarte aktiv“
- Messwerte: 60 / 60 / 60,2 Bilder/s (BP 1, 6, 7); Fleckprüfung Büste 0 und Schrankkopf 10: je 0/0/0 Kerne
- Rundgang BP 1–8, 3a (Kopfschrank), Nahblicke Treppenhaustür, Werkstatttür (B), Werkstatt-Hoftür, Tapete am Fenster: unauffällig, Tapete nah ohne Flecken/Kanten, Kalkputz glatt; keine Konsolenfehler, alle Anfragen an 127.0.0.1; check.py 0 Fehler
- Beobachtung: Laibungen der Fenster tragen die Tapete (vertretbar); Werkstatttüren ebenfalls elfenbein (gleiches Material)
- offen / nächster Schritt: Abnahme durch Nutzer (Runde 0/2), Firefox, Notizen, /abschluss

## Korrekturrunde 1 (Runde 1/2; Nutzer: „entscheide du“)
- Claude-Auswahl aus den Verbesserungsvorschlägen: (1) Fensterlaibung bei Tapete glatt verputzt (`tapete.userData.laibung`, Futter 1 cm bis an den Rahmen, auch unten), (2) Tapetenmuster dezenter (muster [203,184,143], glanz [220,204,168]), (4) kurze Lambris-Stücke < 1,2 m nur mit schmalen Feldern (`lambrisTeilung().uSchmal`, `lambrisUV(geo, felder, von)`), (5) Fußleiste unter der Lambris `m.lambrisFuss` (glatt [128,116,96]); nicht gemacht: (3) Werkstatttüren bleiben elfenbein (Hirth: Lambris und Türen passend)
- Licht neu: Grafikkarte 3,7 s, Prüfsumme c89d3127, „Lichtkarte aktiv“
- Messwerte: 60,2 / 60,2 / 60,3 Bilder/s (BP 1, 6, 7); check.py 0 Fehler; Fleckprüfung nicht neu gemessen (Detailstufen unverändert, vorher 0)
- Rundgang BP 1, 3, 4, 5, 6, 7 + Fensterecke nah: unauffällig
- Folgeaufträge (nicht in diesem Auftrag): Schreckenskammer als Kerkerkulisse nach Holzstich 1890; Supraporten über den Türen; Decke hat noch die fleckige Putztextur (`m.decke`); `putzSaal`/`putzHell` ungenutzt (Entfernen nur mit Ja)
- offen / nächster Schritt: Abnahme durch Nutzer, Firefox, /abschluss

## Korrekturrunde 2 (Runde 2/2, letzte; Nutzer: „entscheide du“)
- Claude-Auswahl: (1) Tapeten-Bordüre 0,16 m direkt unter der Goldleiste (`borduerenTextur`, `BORDUERE`, `tapete.userData.borduere`; Grund 0,86 × Tapetengrund, Welle mit Blättchen, Goldlinien an den Rändern; nur Wände mit `goldleiste`), (2) Deckleiste der Lambris mit eingemaltem Profil (`deckleistenTextur`, `m.lambrisDeckleiste`), (4) Goldlinie kräftiger (rgba(198,148,48,0.95), Lambris 6 Bildpunkte, Türen 3)
- Licht neu: Grafikkarte 3,4 s, Prüfsumme f88656b3, „Lichtkarte aktiv“
- Messwerte: 60 / 60,3 / 60,1 Bilder/s (BP 1, 6, 7); check.py 0 Fehler; Fleckprüfung nicht neu (Detailstufen unverändert, zuletzt 0)
- Sicht: Bordüre aus der Ferne nur als dunkleres Band erkennbar (dezent), Goldlinie und Deckleistenprofil nah gut sichtbar; BP 1, 6 unauffällig
- Prüfbrowser hing einmal nach dem Laden (schwarz, kein __debug) – nach erneutem Aufruf normal, kein Fehler im Code
- offen / nächster Schritt: Abnahme durch Nutzer; danach Restpunkte notieren, Firefox, /abschluss

## Abschluss
- Ergebnis: Wände/Türen nach 2/2 Runden; Nutzer: „Restpunkte notieren“ (keine ausdrückliche Abnahme); check.py 0 Fehler; Lichtkarte aktiv (f88656b3); 60 Bilder/s; Rundgang Chromium unauffällig
- Restfehler/Restpunkte: Bordüre aus der Ferne nur dunkles Band; Werkstatttüren elfenbein; `putzSaal`/`putzHell` ungenutzt; Firefox offen
- Folgeaufträge: Kerkerkulisse Schreckenskammer, Supraporten, fleckige Decke (Verlauf „Wände und Türen“)
- Commit: f2c9acc (auf Wunsch des Nutzers)
