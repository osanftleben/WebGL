# Werkstatt der III. Etage ausstatten (holmes-berliner-faelle)
Ziel: Werkstatt (z 19,75–27,5, schräge Ecke) als glaubwürdige Wachsfiguren-Werkstatt um 1892; Inhalt nach Recherche mit dem Nutzer | Abnahme: BP 7, BP 8, Blick auf Werkbank mit Wachsplatte (scale 0,5); keine Wand leer, Funde klar erkennbar und antippbar, keine neuen Teile wirken wie Hinweise; 60 Bilder/s PC; Fleckprüfung 0; Lichtmodell neu; Nutzer bestätigt | Nicht dazu: Wände/Türen, Licht (nur echte Fehler), Raum A/B, Vorraum | Runden: 0/2 | Sitzung: Aufgabensitzung Werkstatt

## Start
- erledigt: Projektnotiz, Skill auftrag, Bau-Abschnitt holmes-fall1.md gelesen; Code: Werkstatt in `welt/etage3.js` Z. 263–305 (Werkbank 2,4×0,9 bei 4,6|23,0 mit Wachstopf + 2 Gipsformen; Werkbank 2 bei 3,2|26,75; Regal 1,8×2,2 an x=0 bei z 21,2 mit 9 Rohköpfen; Wachsblöcke 7,6|20,6; 2 Hocker; Hängelampe 4,6|23,0); Funde in `welt/fundstuecke.js` (Figur auf Böcken 7,4|23,0 entlang z, Wachsplatte 4,0|23,2)
- Wände Werkstatt: x=0 mit Tür z 23,5; x=9 Fenster z 22,4 (bis z 25); z=27,5 Fenster x 4,8 und 1,8; Schräge 9|25 → 6,5|27,5 leer
- offen / nächster Schritt: Recherche über Agent `recherche` (Thema `holmes-werkstatt-1890`)

## Recherche gestartet, Ist-Zustand angesehen
- Recherche-Agent läuft (Thema `holmes-werkstatt-1890`, Ergebnis `.claude/notizen/recherche/2026-11-15-holmes-werkstatt-1890.md`)
- BP 7/8 vorher: Werkstatt sehr leer; schräge Wand und Wand z=19,75 rechts vom Durchgang (Heizkörper bei x 3,5) ohne Möbel; Fensterwand x=9 nur Wachsblöcke
- Technik: statische Teile in der Werkstatt-Gruppe werden automatisch verschmolzen + Zellen zugeordnet; runde Teile brauchen `userData.lichtHuelle`; Figuren-/Kopfteile mit `alsStufe`
- offen / nächster Schritt: Recherche-Ergebnis abwarten, Vorschlag an Nutzer

## Neustart der Sitzung (Hauptsitzung)
- erste Sitzung endete während der Recherche; Recherche-Datei blieb leer, keine Auszüge unter `recherche/quellen/holmes-werkstatt-1890/`
- Code noch unverändert; Recherche-Agent wird neu gestartet (gleiche Datei)
- offen / nächster Schritt: Recherche abwarten, Vorschlag an Nutzer

## Recherche fertig
- Agent fertig: 5 Fundstellen in der Recherche-Datei; Kernquelle [2] Berliner Morgenpost 16. 11. 1898 (Passage-Panopticum, 5 Abb.), Bild nach Ja des Nutzers geladen und ausgewertet (`recherche/quellen/holmes-werkstatt-1890/bilder/01-…jpg`)
- belegt (Bild/Text [2]): hoher Holzbock mit gedrechselten Beinen + Ablage für Köpfe (Bemalen), runder Ständer (Frisieren), Wandbord mit Gipsköpfen, angelehnte Bretter, flacher Holzkasten als Gipswanne, Stützstab, helle Kittel; Köpfe roh „wachsbleich“ ohne Haar, Glasaugen, Echthaar, Pinsel + Terpentin, Gipskörper (Berlin), Glieder abschraubbar
- nicht belegt: Ofen/Herd, Werkbänke, Regale, Schränke, Wachssorte; für Castan selbst keine Werkstattbeschreibung
- offen / nächster Schritt: Vorschlag an Nutzer, nach Ja bauen

## Zeitungsbilder einzeln abgelegt (Wunsch des Nutzers)
- 5 Zeichnungen aus der Morgenpost-Seite ausgeschnitten: `recherche/quellen/holmes-werkstatt-1890/bilder/01a…01e-*.png`; Nachsicht in voller Auflösung in der Recherche-Datei (Bemalen: Büste auf Brett über Hocker mit runder Sitzplatte, kantige Beine; Frisieren: Kopf liegend auf rundem Tisch mit Tuch; Eingypsen: Podest-Kasten, Gipsbrocken-Haufen, hohes Wandbord mit Köpfen, angelehnte Bretter)
- offen / nächster Schritt: angepassten Vorschlag bestätigen lassen, dann bauen

## Gebaut (Runde 1 zur Ansicht)
- Neues Modul `welt/werkstatt.js` (`baueWerkstattAusstattung`), eingehängt in `welt/etage3.js` nach den Hockern
- Schräge: Wandbord 2,0 m mit 4 Gipsbüsten, 3 angelehnte Bretter, Holzkasten mit Gipsplatte, Gipsbrocken; Wand z=19,75: Wandbord 1,6 m mit 3 Gipsbüsten, Bemal-Hocker mit Brett/Büste/Näpfchen (5,3|20,35), Werkzeugbrett am Boden, Frisiertisch mit liegendem Kopf + Haarbündel (6,55|20,35); Hofwand: Modellierbock mit Tonkopf (0,75|24,8), Tonkiste mit Zinkdeckel, Hakenleiste mit 2 Kitteln; Fensterwand x=9: Gipskörper auf Sockel (8,45|21,3, lichtHuelle); Werkbank 2: 2 Wachshände, Unterarm, Glasaugen-Kästchen, Haarbündel
- Abweichung vom Vorschlag: Büste zum Bemalen bleibt unbemalt (Gesichter der Tafel gehören zur Besetzung → könnte wie Hinweis wirken)
- Korrekturen beim Bauen: Gipsköpfe → kleine Büsten (Köpfe allein zu klein), Kittel mit Ärmeln/grauer als Putz, Hände flach (Modell hängt nach −y)
- Licht neu berechnet (958 Quader, 1040 Seiten, 3,3 s), Konsole „Lichtkarte aktiv (848677f)“; keine neuen Detailstufen → Fleckprüfung entfällt (0)
- BP 7 60,3 / BP 8 60,1 Bilder/s; Funde frei treffbar (Strahl auf Platte und Figur trifft zuerst die Fundstücke); Netzwerk nur 127.0.0.1; check.py 0 Fehler
- offen / nächster Schritt: Nutzer sieht sich Werkstatt an (Runde 1/2), Rundgang aller BP, Quellen übertragen

## Runde 1/2 (Nutzer: „entscheide du“, Punkte 1–5 der Verbesserungsliste)
- Gipsbrocken auf dem Boden (2 schwebten), Bretter einzeln mit Längsmaserung (Textur gedreht, 2 Holztöne, Lücken), 3 Skizzenblätter (Kopf vorn/Profil, Canvas-Textur, Papier #d6cbad) zwischen den Fenstern z=27,5, 3 Pinsel im Näpfchen, 14 Gipsspritzer um den Holzkasten; zusätzlich Schulterteil der Büsten rund (Kegelstumpf statt Quader)
- weggelassen: Büste bemalen (eigene Gesichtszelle), Kittel weicher – nur falls Nutzer in Firefox stört
- Licht neu berechnet (3,1 s), „Lichtkarte aktiv (8105c6b4)“; BP 7 60,0 / BP 8 60,1 Bilder/s; check.py 0 Fehler; Rundgang BP 1 und 6 unauffällig
- offen / nächster Schritt: Nutzer prüft in Firefox; danach Quellen übertragen, /abschluss

## Runde 2/2 (Hinweis des Nutzers: Tonkopf schwebt)
- Ursache: Kopfmitte liegt 0,1075 m über der Kinnkante, Versatz war zu groß. Tonkopf tiefer (1,27) mit längerem Hals, liegender Kopf auf dem Frisiertisch tiefer (0,94), Regalköpfe in `etage3.js` 0,13 → 0,123 (schwebten ~7 mm, bestehender Fehler gleicher Ursache)
- Lichtkarte bleibt gültig (runde Teile, Prüfsumme 8105c6b4 unverändert); check.py 0 Fehler
- offen / nächster Schritt: Nutzer bestätigt in Firefox; dann Quellen übertragen, /abschluss

## Zusatzrunde auf Wunsch des Nutzers: Kittel
- Kittel aus Kästen waren nicht erkennbar (Bild des Nutzers). Neu: ausgeschnittener Umriss (`THREE.Shape` + `ExtrudeGeometry` mit Fase): Kragen, schräge Schultern, Ärmel, Saum weiter; Revers, Knopfleiste, 4 Knöpfe, Ärmelnähte (Material `kittelSaum`), Haken
- Licht neu (3,1 s), „Lichtkarte aktiv (11b3a79a)“; BP 7/8 60,3 Bilder/s; check.py 0 Fehler
- offen / nächster Schritt: Nutzer bestätigt in Firefox; Quellen übertragen, /abschluss
- Nutzer: Kittel „sehr steif“ → neu als fein unterteilte Stoffflächen (`stoffFlaeche`: PlaneGeometry je Zeile auf den Umriss gezogen, Tiefe als Funktion): senkrechte Falten nach unten stärker, Brust leicht vor, Ärmel rund vor dem Körper, Saum wellig, Knopfleiste folgt den Falten; Stoff 0xb3b5ae beidseitig. Licht neu (3,2 s), Lichtkarte aktiv (11b3a79a), BP 7/8 60 Bilder/s, check.py 0 Fehler

## Weiter auf Wunsch des Nutzers („Werkstatt noch nicht fertig“)
- Holzkasten → Kiste mit Rand, Gips 6 cm unter dem Rand; 2 Gipsarme (mit Gipshänden) zwischen Sockel und Wand (erst im Laufweg, wirkte wie Hinweis → verlegt); Büsten auf den Borden 0,9–1,1-fach; Kittel-Schultern fallen vom Haken steil ab
- Licht neu (3,1 s), Lichtkarte aktiv (c7334418); BP 7/8 60 Bilder/s; check.py 0 Fehler
- eigene Beobachtung: Gipskörper wirkt grob (kantige Zylinder)
- offen / nächster Schritt: Nutzer sagt, was noch fehlt

## Fehlersuche (Nutzer: „erst die Fehler beheben“)
- Neue Prüfhilfe `.claude/scripts/holmes_schwebepruefung.js` (baut Werkstatt-Ausstattung + Boden + Werkbänke getrennt, Strahlen von jeder Unterkante nach unten, Lücken > 1 cm). Ergebnis: einziger echter Fehler Gipshände ~1 cm über dem Boden → y 0,03 → 0,018; übrige Meldungen gewollt (Hängendes, Querstreben) oder Teile in anderen Teilen (Hals in Schultern u. Ä.)
- Licht neu berechnet; check.py 0 Fehler
- Nutzer (Bild): offener Türflügel am Durchgang B|Werkstatt ohne Klinke → in `etage3.js` Langschild, Drücker, Schlüsselloch auf beiden Seiten nahe der freien Kante ergänzt (wie geschlossene Türen, `keinLichtModell`). Eigentlich Bereich Wände/Türen, aber echter Fehler.

## Helligkeitsübergang am Sturz (Bild des Nutzers) – Ursache gefunden, nicht behoben
- Sichtbar: Sturz über Türen/Durchgängen heller als Pfeiler daneben, harte senkrechte Kanten (Hoftür z 22,9/24,1: gezeichnet 130→135 und 143→148)
- Ausgeschlossen: Lichtkarten-Koordinaten (stimmen), geladene Karte (stimmt), Putztextur (Sprung bleibt ohne Textur); ohne Lichtkarte (nur Gitter) kein Sprung
- Ursache: `glaette_karte`/`_gauss_seite` in `holmes_licht.py` zeichnet je Seite weich (Sigma 2,5 Bildpunkte), am Rand normiert. Auf einem Helligkeitsverlauf zieht das die Randpunkte zur Seitenmitte → große Pfeiler werden am Rand flach, der kleine Sturz behält den Anstieg → an jeder Stückgrenze ~1 Stufe Sprung, als gerade Linie sichtbar. Betrifft vermutlich alle Wände mit Öffnungen, nicht nur die Werkstatt.
- Lösungsidee: Rand beim Weichzeichnen linear fortsetzen (Spiegelung „odd“) statt normieren, oder gleich ausgerichtete, aneinanderstoßende Seiten gemeinsam weichzeichnen. Wirkt auf die ganze Lichtkarte → Rundgang aller BP + Firefox.

## Licht und Schatten (auf Nutzerwunsch „entscheide du“)
- `userData.lichtHuelle = true` für Kittel, Gipsbüsten (Borde), Bemal-Büste, Tonkopf, Frisierkopf → verdecken jetzt Licht (als Quader).
- Licht neu berechnet (4,6 s), Prüfsumme c7334418; check.py 0 Fehler; BP 7 60,0 / BP 8 60,1 Bilder/s.
- Sichtprüfung Kittel an der Hofwand: Schatten auf der Wand dezent, keine neuen Flecken oder Kanten.
- Für Folgeauftrag „Werkstatt Teil 2“: Kontaktschatten unter Kleinteilen, Frisierkopf/Gipsarme, Gipskörper Fensterseite.

## Skizzenblätter neu (Nutzerbild „was ist das?“)
- Alte Skizzen wirkten wie Fadenkreuz und Vogel. Neu gezeichnet (Canvas 256×512): Kopf von vorn mit Haar, Augen, Nase, Mund, Ohren, Hals; Profil mit Nase, Lippen, Kinn, Ohr, leichter Schraffur; Papier heller. Nur Textur geändert, Licht unverändert.
- Danach (Nutzer: „warum dreimal dieselben?“) drei verschiedene Blätter: 0 Kopf vorn + Profil, 1 großes Profil + zwei Augenstudien, 2 Frauenkopf mit Haarknoten + Ohr- und Nasenstudie.

## Gesims-Flecken über der schrägen Wand (Nutzerbild)
- Helle Flecken am Gesims über der Schräge; mit lkAn = 0 weg → Lichtkarte. An Sitzung licht-wandkanten übergeben (nicht hier beheben). Deckenpunkte = gewollte Putztextur.
- Behoben von licht-wandkanten (lichtlose Gitterpunkte hinter der Schräge aus Nachbarn aufgefüllt, Licht neu berechnet); hier in Chromium nachgeprüft: Gesims gleichmäßig. Firefox offen.

## 11:47 Abschluss
- Ergebnis: Werkstatt ausgestattet (`welt/werkstatt.js`), Funde frei, BP 7 60,1 / BP 8 60,3 Bilder/s, check.py 0 Fehler, keine Konsolenfehler, nur 127.0.0.1. Licht aktuell (Gesims-Fix der Sitzung licht-wandkanten enthalten).
- Nicht committet. Firefox-Bestätigung der Werkstatt steht aus.
- Restfehler: Skizzenblätter (Nutzer „naja“), Kontaktschatten unter Kleinteilen, Frisierkopf/Gipsarme, Gipskörper flach im Gegenlicht → Folgeauftrag „Werkstatt Teil 2“ (Verlauf).
- Fundstellen in `holmes-quellen.md` übertragen, Projektnotiz 5,0 KB.
