"""Empfänger für die gebackenen Werkstatt-Fensterschatten (Holmes, III. Etage) und für Prüfbilder.

Aufruf (immer über den Wächter, 2-Minuten-Grenze):
  python .claude/hooks/zeitlimit.py python .claude/scripts/holmes_schatten.py empfange [--bilder ORDNER] [--sekunden S]
      Wartet auf 127.0.0.1:8765 (gleicher Anschluss wie holmes_licht.py, nicht gleichzeitig starten).
      Endet nach dem Schattenbild, nach POST /ende oder nach S Sekunden (Vorgabe 110).
      POST /bild?name=x.png   Prüfbild (PNG) → ORDNER/x.png (Vorgabe: Scratchpad muss angegeben werden)
      POST /schatten          gebackenes Schattenbild → docs/holmes-berliner-faelle/licht/werkstatt-schatten.png/.json
                              Inhalt: 4 Byte Länge (little endian) + Kopf (JSON) + Sichtbarkeit als Uint16 je Bildpunkt
                              (Zeile 0 = unten, wie im WebGL-Lesepuffer; 65535 = frei, 0 = ganz verdeckt).

Im Spiel (nur 127.0.0.1): await __debug.backeWerkstattSchatten() – rechnet und schickt das Ergebnis hierher.

Entrauschen: je Fläche (Ausschnitt samt Rand) weich zeichnen (Gauß, Sigma GLAETTE Bildpunkte), nur innerhalb
des Ausschnitts, damit keine Nachbarfläche hineinblutet. Ergebnis 8 Bit Grau.
"""

from __future__ import annotations

import json
import struct
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

WURZEL = Path(__file__).resolve().parents[2]
ZIEL = WURZEL / "docs" / "holmes-berliner-faelle" / "licht"
NAME = "werkstatt-schatten"
GLAETTE = 1.0  # Sigma in Bildpunkten (5 mm bzw. 1 cm)


def _gauss_kern(sigma: float):
    import numpy as np
    r = max(1, int(round(3 * sigma)))
    x = np.arange(-r, r + 1, dtype=np.float64)
    k = np.exp(-0.5 * (x / sigma) ** 2)
    return k / k.sum(), r


def _glaette_block(blk, sigma: float):
    """Gauß getrennt in x und y, Rand durch Wiederholen der Randwerte (nur innerhalb des Blocks)."""
    import numpy as np
    if sigma <= 0:
        return blk
    k, r = _gauss_kern(sigma)
    out = blk
    for achse in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[achse] = (r, r)
        p = np.pad(out, pad, mode="edge")
        acc = np.zeros_like(out)
        n = out.shape[achse]
        for i, g in enumerate(k):
            acc += g * (p[i:i + n, :] if achse == 0 else p[:, i:i + n])
        out = acc
    return out


def verarbeite(roh: bytes) -> dict:
    import numpy as np
    from PIL import Image
    laenge = struct.unpack("<I", roh[:4])[0]
    kopf = json.loads(roh[4:4 + laenge].decode("utf-8"))
    breite, hoehe = kopf["breite"], kopf["hoehe"]
    daten = np.frombuffer(roh[4 + laenge:], dtype="<u2")
    if daten.size != breite * hoehe:
        raise ValueError(f"Datenlänge {daten.size} passt nicht zu {breite} × {hoehe}")
    sicht = daten.reshape(hoehe, breite).astype(np.float64) / 65535.0
    sigma = float(kopf.get("glaette", GLAETTE))
    rand = int(kopf["rand"])
    ergebnis = np.ones_like(sicht)
    for f in kopf["flaechen"]:
        x, y, w, h = f["x"] - rand, f["y"] - rand, f["w"] + 2 * rand, f["h"] + 2 * rand
        ergebnis[y:y + h, x:x + w] = _glaette_block(sicht[y:y + h, x:x + w], sigma)
    bild = np.clip(np.rint(ergebnis * 255.0), 0, 255).astype(np.uint8)
    # Bildzeile 0 = Lesepuffer-Zeile 0 (unten): im Spiel flipY = false, Koordinate y wie beim Backen
    ZIEL.mkdir(parents=True, exist_ok=True)
    png = ZIEL / f"{NAME}.png"
    Image.fromarray(bild, "L").save(png, optimize=True)
    info = {k: v for k, v in kopf.items() if k not in ("glaette",)}
    info["datei"] = png.name
    info["glaette"] = sigma
    (ZIEL / f"{NAME}.json").write_text(json.dumps(info, separators=(",", ":")), encoding="utf-8")
    return {
        "png_kb": round(png.stat().st_size / 1024),
        "json_kb": round((ZIEL / f"{NAME}.json").stat().st_size / 1024),
        "breite": breite, "hoehe": hoehe, "flaechen": len(kopf["flaechen"]),
        "anteil_schatten": round(float((bild < 250).mean()), 4),
    }


def empfange(bilder: Path | None, sekunden: float) -> int:
    class Handler(BaseHTTPRequestHandler):
        def _kopf(self, code: int, typ: str = "text/plain") -> None:
            self.send_response(code)
            herkunft = self.headers.get("Origin", "")
            if herkunft.startswith("http://127.0.0.1:"):
                self.send_header("Access-Control-Allow-Origin", herkunft)
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Type", typ)
            self.end_headers()

        def do_OPTIONS(self) -> None:  # noqa: N802
            self._kopf(204)

        def do_POST(self) -> None:  # noqa: N802
            url = urlparse(self.path)
            roh = self.rfile.read(int(self.headers.get("Content-Length", "0")))
            try:
                if url.path == "/bild":
                    if bilder is None:
                        raise ValueError("kein --bilder-Ordner angegeben")
                    name = Path(parse_qs(url.query).get("name", ["bild.png"])[0]).name
                    bilder.mkdir(parents=True, exist_ok=True)
                    (bilder / name).write_bytes(roh)
                    antwort = {"gespeichert": str(bilder / name)}
                elif url.path == "/schatten":
                    t = time.time()
                    antwort = verarbeite(roh)
                    antwort["python_s"] = round(time.time() - t, 2)
                    self.server.fertig = True  # type: ignore[attr-defined]
                elif url.path == "/ende":
                    antwort = {"ende": True}
                    self.server.fertig = True  # type: ignore[attr-defined]
                else:
                    raise ValueError(f"unbekannt: {url.path}")
                self._kopf(200, "application/json")
                self.wfile.write(json.dumps(antwort).encode("utf-8"))
                print(json.dumps(antwort), flush=True)
            except Exception as fehler:  # noqa: BLE001
                self._kopf(500)
                self.wfile.write(str(fehler).encode("utf-8"))
                print("FEHLER:", fehler, flush=True)

        def log_message(self, *args) -> None:
            pass

    server = HTTPServer(("127.0.0.1", 8765), Handler)
    server.timeout = 1.0
    server.fertig = False  # type: ignore[attr-defined]
    ende = time.time() + sekunden
    print(f"warte auf 127.0.0.1:8765 (höchstens {sekunden:.0f} s) …", flush=True)
    while not server.fertig and time.time() < ende:  # type: ignore[attr-defined]
        server.handle_request()
    server.server_close()
    print("beendet", flush=True)
    return 0


def main() -> int:
    args = sys.argv[1:]
    if not args or args[0] != "empfange":
        print(__doc__)
        return 2
    bilder = None
    sekunden = 110.0
    if "--bilder" in args:
        bilder = Path(args[args.index("--bilder") + 1])
    if "--sekunden" in args:
        sekunden = min(110.0, float(args[args.index("--sekunden") + 1]))
    return empfange(bilder, sekunden)


if __name__ == "__main__":
    sys.exit(main())
