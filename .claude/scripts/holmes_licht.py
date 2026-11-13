"""Vorab berechnete Lichtverteilung für „Sherlock Holmes – Die Berliner Fälle“ (III. Etage).

Aufruf:
  python .claude/scripts/holmes_licht.py empfange [datei]
      Wartet auf 127.0.0.1:8765 auf das Raummodell, das die Spielseite schickt
      (lokal: __debug.sendeLichtModell()), und speichert es (Vorgabe: .claude/scripts/holmes_lichtmodell.json).
  python .claude/scripts/holmes_licht.py berechne [modell] [zielordner]
      Berechnet das Lichtgitter und schreibt licht-etage3.png und licht-etage3.json
      (Vorgabe-Ziel: docs/holmes-berliner-faelle/licht/).

Verfahren (Strahlverfolgung, Monte Carlo):
  - Raummodell: achsenparallele Quader mit Rückstrahlwert (Albedo, linear).
  - Himmel: bedeckter Himmel nach CIE (Leuchtdichte (1 + 2·sin α)/3 · Lz), unter dem Horizont
    reflektierter Boden (Annahme 20 %). Licht kommt nur durch die Fensteröffnungen herein.
  - Direktes Himmelslicht: Für jeden Gitterpunkt werden die Fensterflächen gezielt abgetastet
    (Sichtprüfung gegen alle Quader) – glatt, ohne Zufallsflecken.
  - Zurückgeworfenes Licht: Strahlen in alle Richtungen; trifft einer eine Fläche, bringt er deren
    zurückgeworfenes Licht (Albedo · Bestrahlungsstärke / π) aus dem vorigen Durchgang mit.
    Mehrere Durchgänge = mehrfache Reflexion; leicht geglättet gegen Rauschen.
  - Gespeichert wird je Gitterpunkt die Bestrahlungsstärke aus 6 Richtungen (+x, −x, +y, −y, +z, −z).
  - Deckenkarte (licht-etage3-decke.png): 10-cm-Raster direkt auf den nach unten zeigenden Flächen
    unter der Decke (Decke, Gesims-Unterseiten); dort ist das 0,4-m-Gitter zu grob.
"""

from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
MODELL_VORGABE = WURZEL / ".claude" / "scripts" / "holmes_lichtmodell.json"
ZIEL_VORGABE = WURZEL / "docs" / "holmes-berliner-faelle" / "licht"

# Innenraum der III. Etage (Meter)
RAUM_MIN = (0.0, 0.0, 0.0)
RAUM_MAX = (9.0, 4.0, 27.5)
SCHRITT = 0.4          # Gitterabstand
STRAHLEN = 192         # Strahlen je Gitterpunkt
DURCHGAENGE = 4        # 1 = nur Himmel, weitere = Reflexionen
HIMMEL = (0.92, 0.96, 1.0)    # Farbe des bedeckten Himmels (Annahme)
BODEN_AUSSEN = (0.80, 0.78, 0.72)
BODEN_REFLEXION = 0.2  # Anteil reflektierten Lichts von Straße/Gebäuden draußen (Annahme)
GROSS_AB = 1.5        # Bauteile ab dieser größten Kantenlänge (m) zählen im Lichtgitter
DECKE_SCHRITT = 0.1   # Rasterabstand der Deckenkarte
DECKE_AB = 3.7        # Deckenkarte gilt für nach unten zeigende Flächen oberhalb dieser Höhe
DECKE_STRAHLEN = 128  # Strahlen je Punkt der Deckenkarte (untere Halbkugel)


# ---------------------------------------------------------------- Empfangen

def empfange(datei: Path) -> int:
    class Handler(BaseHTTPRequestHandler):
        def _kopf(self, code: int) -> None:
            self.send_response(code)
            # Nur die lokale Vorschau darf senden (Anschluss je nach Vorschau-Server 8000, 8001, …)
            herkunft = self.headers.get("Origin", "")
            if herkunft.startswith("http://127.0.0.1:"):
                self.send_header("Access-Control-Allow-Origin", herkunft)
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def do_OPTIONS(self) -> None:  # noqa: N802
            self._kopf(204)

        def do_POST(self) -> None:  # noqa: N802
            laenge = int(self.headers.get("Content-Length", "0"))
            daten = json.loads(self.rfile.read(laenge).decode("utf-8"))
            datei.write_text(json.dumps(daten), encoding="utf-8")
            self._kopf(200)
            self.wfile.write(b"ok")
            print(f"gespeichert: {datei} ({len(daten.get('quader', []))} Quader)")
            self.server.fertig = True  # type: ignore[attr-defined]

        def log_message(self, *args) -> None:  # leise
            pass

    server = HTTPServer(("127.0.0.1", 8765), Handler)
    server.fertig = False  # type: ignore[attr-defined]
    print("warte auf das Raummodell auf http://127.0.0.1:8765 …")
    while not server.fertig:  # type: ignore[attr-defined]
        server.handle_request()
    return 0


# ---------------------------------------------------------------- Berechnen

def berechne(modell_datei: Path, ziel: Path) -> int:
    import numpy as np
    from PIL import Image

    modell = json.loads(modell_datei.read_text(encoding="utf-8"))
    q = np.array(modell["quader"], dtype=np.float32)
    fenster = modell.get("fenster", [])
    # Nur große Bauteile werfen im Lichtgitter Schatten (Wände, Boden, Decke, Türen, Vorhänge, Schränke,
    # Werkbänke, Podest). Kleine Gegenstände (Sockel, Büsten, Figurenteile, Leisten) würden im 0,4-m-Gitter
    # ungleichmäßige Flecken hinter sich erzeugen – je nachdem, wie sie zum Gitter liegen. Ihre Schatten
    # kommen im Spiel aus den Schattenkarten und der Bodenabdunkelung.
    # Mauerwerk (Spalte 10: Pfeiler, Sturz und Brüstung der Wände) bleibt immer – sonst hätte jedes Fenster
    # in der Rechnung ein Loch bis zur Decke, und Licht fiele durch den Sturz auf Decke und Gesims.
    groesse = q[:, 3:6] - q[:, 0:3]
    mauerwerk = q[:, 9] > 0.5 if q.shape[1] > 9 else np.zeros(len(q), dtype=bool)
    behalten = (groesse.max(axis=1) >= GROSS_AB) | mauerwerk
    q = q[behalten]
    bmin, bmax, albedo = q[:, 0:3], q[:, 3:6], q[:, 6:9]
    print(f"{len(q)} Quader, {len(fenster)} Fenster im Lichtmodell")

    rmin = np.array(RAUM_MIN, dtype=np.float32)
    rmax = np.array(RAUM_MAX, dtype=np.float32)
    n = np.ceil((rmax - rmin) / SCHRITT).astype(int)
    nx, ny, nz = (int(v) for v in n)
    gx, gy, gz = np.meshgrid(np.arange(nx), np.arange(ny), np.arange(nz), indexing="ij")
    punkte = rmin + (np.stack([gx, gy, gz], -1).reshape(-1, 3).astype(np.float32) + 0.5) * SCHRITT
    anzahl = len(punkte)
    print(f"Lichtgitter {nx} × {ny} × {nz} = {anzahl} Punkte")

    # Punkte in Quadern (Wände, Möbel) sind ungültig, werden später aus Nachbarn aufgefüllt.
    # Auch Punkte genau auf einer Oberfläche (± 2 cm) zählen als ungültig: Strahlen von dort laufen
    # sonst ungehindert durch die Wand und holen Licht von draußen (z. B. Gitterebene x = 9,0 = Fensterwand).
    RAND = 0.02
    innen = np.zeros(anzahl, dtype=bool)
    for i in range(len(q)):
        innen |= np.all((punkte > bmin[i] - RAND) & (punkte < bmax[i] + RAND), axis=1)
    gueltig = ~innen
    idx = np.nonzero(gueltig)[0]
    achsen = np.array([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], dtype=np.float32)
    rng = np.random.default_rng(1892)

    def schnitt(o2: np.ndarray, d2: np.ndarray):
        """Nächster Quadertreffer je Strahl: (t, Quader-Index, Normale); t = inf ohne Treffer."""
        inv = 1.0 / np.where(np.abs(d2) < 1e-6, 1e-6, d2)
        t1 = (bmin[None] - o2[:, None]) * inv[:, None]
        t2 = (bmax[None] - o2[:, None]) * inv[:, None]
        tnah = np.minimum(t1, t2)
        tein = tnah.max(axis=2)
        taus = np.maximum(t1, t2).min(axis=2)
        tein = np.where((taus >= tein) & (tein > 1e-4), tein, np.inf)
        beste = tein.argmin(axis=1)
        r = np.arange(len(o2))
        t = tein[r, beste]
        achse = tnah[r, beste].argmax(axis=1)
        normale = np.zeros_like(d2)
        normale[r, achse] = -np.sign(d2[r, achse])
        return t, beste, normale

    def himmel(richtung: np.ndarray) -> np.ndarray:
        """Leuchtdichte des bedeckten Himmels (CIE) bzw. des Bodens draußen, je Richtung."""
        sinus = richtung[:, 1]
        h = ((1 + 2 * np.clip(sinus, 0, 1)) / 3)[:, None] * np.array(HIMMEL, dtype=np.float32)
        b = (BODEN_REFLEXION * 7 / 9) * np.array(BODEN_AUSSEN, dtype=np.float32)
        return np.where((sinus >= 0)[:, None], h, b[None, :])

    # ---------- 1. Direktes Himmelslicht: Fensterflächen gezielt abtasten (glatt, ohne Zufallsflecken)
    def direkt_licht(pkte: np.ndarray, melden: bool = True) -> np.ndarray:
        """Direktes Himmelslicht durch die Fenster je Punkt, aufgeteilt auf die 6 Richtungen."""
        erg = np.zeros((len(pkte), 6, 3), dtype=np.float32)
        for nr, f in enumerate(fenster):
            erg += fenster_licht(pkte, f)
            if melden:
                print(f"  Fenster {nr + 1}/{len(fenster)} abgetastet")
        return erg

    PRO_FENSTER = (8, 6)

    def fenster_licht(pkte: np.ndarray, f: dict) -> np.ndarray:
        """Beitrag eines Fensters (Himmel bzw. Boden draußen) je Punkt und Richtung."""
        erg = np.zeros((len(pkte), 6, 3), dtype=np.float32)
        su, sv = PRO_FENSTER
        u = (np.arange(su) + 0.5) / su
        v = (np.arange(sv) + 0.5) / sv
        uu, vv = np.meshgrid(u, v, indexing="ij")
        uu = uu.ravel()
        vv = vv.ravel()
        a0, b0 = f["min"]
        a1, b1 = f["max"]
        flaeche = (a1 - a0) * (b1 - b0) / len(uu)
        pu = a0 + uu * (a1 - a0)
        pv = b0 + vv * (b1 - b0)
        if f["achse"] == "x":
            proben = np.stack([np.full_like(pu, f["ebene"]), pv, pu], 1).astype(np.float32)
            n_f = np.array([1, 0, 0], dtype=np.float32)
        else:
            proben = np.stack([pu, pv, np.full_like(pu, f["ebene"])], 1).astype(np.float32)
            n_f = np.array([0, 0, 1], dtype=np.float32)
        stueck = max(1, 8000 // len(proben))
        for s in range(0, len(pkte), stueck):
            o = pkte[s:s + stueck]
            d = proben[None, :, :] - o[:, None, :]
            r = np.linalg.norm(d, axis=2)
            w = d / r[..., None]
            cos_f = w @ n_f
            o2 = np.repeat(o, len(proben), axis=0)
            w2 = w.reshape(-1, 3)
            t, _, _ = schnitt(o2, w2)
            frei = (t >= r.reshape(-1) - 0.02) & (cos_f.reshape(-1) > 0)
            raumwinkel = flaeche * np.clip(cos_f.reshape(-1), 0, None) / np.maximum(r.reshape(-1), 0.05) ** 2
            L = himmel(w2) * (raumwinkel * frei)[:, None]
            gew = np.clip(w2 @ achsen.T, 0, None)
            erg[s:s + stueck] = np.einsum("ka,kc->kac", gew, L).reshape(len(o), len(proben), 6, 3).sum(axis=1)
        return erg

    direkt = np.zeros((anzahl, 6, 3), dtype=np.float32)
    direkt[idx] = direkt_licht(punkte[idx])

    # ---------- 2. Zurückgeworfenes Licht: Strahlen in alle Richtungen, Treffer auf Flächen
    k = np.arange(STRAHLEN) + 0.5
    phi = np.arccos(1 - 2 * k / STRAHLEN)
    theta = np.pi * (1 + 5 ** 0.5) * k
    basis = np.stack([np.cos(theta) * np.sin(phi), np.cos(phi), np.sin(theta) * np.sin(phi)], -1).astype(np.float32)
    tref_box = np.full((len(idx), STRAHLEN), -1, dtype=np.int32)
    tref_p = np.zeros((len(idx), STRAHLEN, 3), dtype=np.float32)
    tref_n = np.zeros((len(idx), STRAHLEN, 3), dtype=np.float32)
    richtungen = np.zeros((len(idx), STRAHLEN, 3), dtype=np.float32)
    stueck = max(1, 6000 // STRAHLEN)
    for s in range(0, len(idx), stueck):
        teil = idx[s:s + stueck]
        m = len(teil)
        w = rng.uniform(0, 2 * np.pi, m).astype(np.float32)
        c, si = np.cos(w), np.sin(w)
        d = np.empty((m, STRAHLEN, 3), dtype=np.float32)
        d[..., 0] = c[:, None] * basis[None, :, 0] - si[:, None] * basis[None, :, 2]
        d[..., 1] = basis[None, :, 1]
        d[..., 2] = si[:, None] * basis[None, :, 0] + c[:, None] * basis[None, :, 2]
        o2 = np.repeat(punkte[teil], STRAHLEN, axis=0)
        d2 = d.reshape(-1, 3)
        t, beste, normale = schnitt(o2, d2)
        getroffen = np.isfinite(t)
        p = o2 + d2 * np.where(getroffen, t, 0)[:, None]
        sl = slice(s, s + m)
        tref_box[sl] = np.where(getroffen, beste, -1).reshape(m, STRAHLEN)
        tref_p[sl] = p.reshape(m, STRAHLEN, 3)
        tref_n[sl] = normale.reshape(m, STRAHLEN, 3)
        richtungen[sl] = d
        if (s // stueck) % 40 == 0:
            print(f"  Strahlen verfolgt: {min(s + stueck, len(idx))}/{len(idx)}")
    gewicht = np.clip(np.einsum("prk,ak->pra", richtungen, achsen), 0, None) * (4 * np.pi / STRAHLEN)

    def schiebe(a: np.ndarray, sch: int, ax: int) -> np.ndarray:
        """Wie np.roll, aber ohne Umlauf: Am Rand rückt eine Null nach (kein Licht von der Gegenseite)."""
        erg = np.zeros_like(a)
        quelle = [slice(None)] * a.ndim
        ziel = [slice(None)] * a.ndim
        if sch > 0:
            quelle[ax], ziel[ax] = slice(0, -sch), slice(sch, None)
        else:
            quelle[ax], ziel[ax] = slice(-sch, None), slice(0, sch)
        erg[tuple(ziel)] = a[tuple(quelle)]
        return erg

    def fuelle(feld: np.ndarray) -> np.ndarray:
        """Ungültige Gitterpunkte aus gültigen Nachbarn auffüllen (mehrfach)."""
        f = feld.reshape(nx, ny, nz, 6, 3).copy()
        ok = gueltig.reshape(nx, ny, nz).copy()
        for _ in range(6):
            if ok.all():
                break
            summe = np.zeros_like(f)
            zahl = np.zeros((nx, ny, nz), dtype=np.float32)
            for ax in range(3):
                for sch in (-1, 1):
                    summe += schiebe(f * ok[..., None, None], sch, ax)
                    zahl += schiebe(ok, sch, ax).astype(np.float32)
            neu = (~ok) & (zahl > 0)
            f[neu] = summe[neu] / zahl[neu][..., None, None]
            ok |= neu
        return f.reshape(-1, 6, 3)

    def glaette(feld: np.ndarray) -> np.ndarray:
        """Leichtes Glätten über gültige Nachbarn (gegen Zufallsrauschen im zurückgeworfenen Licht)."""
        f = feld.reshape(nx, ny, nz, 6, 3)
        ok = gueltig.reshape(nx, ny, nz).astype(np.float32)
        summe = f * ok[..., None, None] * 2.0
        zahl = ok * 2.0
        for ax in range(3):
            for sch in (-1, 1):
                summe += schiebe(f * ok[..., None, None], sch, ax)
                zahl += schiebe(ok, sch, ax)
        erg = np.where(zahl[..., None, None] > 0, summe / np.maximum(zahl, 1e-6)[..., None, None], f)
        return erg.reshape(-1, 6, 3)

    def nachschlagen(feld: np.ndarray, p: np.ndarray, nrm: np.ndarray) -> np.ndarray:
        """Bestrahlungsstärke an Punkten p für Normalen nrm (trilinear, Ambient Cube)."""
        g = (p - rmin) / SCHRITT - 0.5
        hoechst = np.array([nx - 1, ny - 1, nz - 1], dtype=np.float32)
        g = np.clip(g, 0, hoechst - 1e-4)
        i0 = np.floor(g).astype(int)
        f = g - i0
        i1 = np.minimum(i0 + 1, hoechst.astype(int))
        F = feld.reshape(nx, ny, nz, 6, 3)
        erg = np.zeros((len(p), 6, 3), dtype=np.float32)
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    ix = i1[:, 0] if dx else i0[:, 0]
                    iy = i1[:, 1] if dy else i0[:, 1]
                    iz = i1[:, 2] if dz else i0[:, 2]
                    w = (f[:, 0] if dx else 1 - f[:, 0]) * (f[:, 1] if dy else 1 - f[:, 1]) * (f[:, 2] if dz else 1 - f[:, 2])
                    erg += F[ix, iy, iz] * w[:, None, None]
        n2 = nrm * nrm
        wahl = np.stack([np.where(nrm[:, 0] > 0, 0, 1), np.where(nrm[:, 1] > 0, 2, 3), np.where(nrm[:, 2] > 0, 4, 5)], 1)
        r = np.arange(len(p))
        return n2[:, 0:1] * erg[r, wahl[:, 0]] + n2[:, 1:2] * erg[r, wahl[:, 1]] + n2[:, 2:3] * erg[r, wahl[:, 2]]

    direkt = fuelle(direkt)
    feld = direkt.copy()
    print(f"Direktes Himmelslicht: mittlere Helligkeit {feld[gueltig].mean():.4f}")
    hb = tref_box >= 0
    for durchgang in range(1, DURCHGAENGE):
        L = np.zeros_like(tref_p)
        pf = tref_p[hb]
        nf = tref_n[hb]
        E = nachschlagen(feld, pf + nf * (SCHRITT * 0.5), nf)
        L[hb] = albedo[tref_box[hb]] * E / np.pi
        indirekt = np.zeros((anzahl, 6, 3), dtype=np.float32)
        indirekt[idx] = np.einsum("pra,prc->pac", gewicht, L)
        # Erst glätten, dann auffüllen: Punkte auf Wänden übernehmen so geglättete Nachbarwerte
        # (vorher verrauschte – helle und dunkle Flecken an Wandkanten und in Ecken)
        indirekt = fuelle(glaette(indirekt))
        feld = direkt + indirekt
        print(f"Durchgang {durchgang + 1}: mittlere Helligkeit {feld[gueltig].mean():.4f}")

    # ---------- 3. Deckenkarte: feines Raster direkt auf den nach unten zeigenden Flächen unter der Decke
    # (Decke, Gesims- und Leisten-Unterseiten). Das 0,4-m-Gitter mischt dort Werte von knapp über den
    # Fenstern ein, die viel Licht von unten sehen – an der Gesims-Unterseite entstand ein helles Band.
    dnx = int(round((rmax[0] - rmin[0]) / DECKE_SCHRITT))
    dnz = int(round((rmax[2] - rmin[2]) / DECKE_SCHRITT))
    kx, kz = np.meshgrid(np.arange(dnx), np.arange(dnz), indexing="ij")
    start = np.stack([
        rmin[0] + (kx.ravel() + 0.5) * DECKE_SCHRITT,
        np.full(dnx * dnz, DECKE_AB),
        rmin[2] + (kz.ravel() + 0.5) * DECKE_SCHRITT,
    ], 1).astype(np.float32)
    # Von DECKE_AB senkrecht nach oben: die erste getroffene Unterseite ist die Fläche dieses Rasterpunkts.
    # Startpunkte in Wänden, Säulen usw. sind ungültig und werden aus Nachbarn aufgefüllt.
    d_innen = np.zeros(len(start), dtype=bool)
    for i in range(len(q)):
        d_innen |= np.all((start > bmin[i]) & (start < bmax[i]), axis=1)
    hoch = np.tile(np.array([0, 1, 0], dtype=np.float32), (len(start), 1))
    t_hoch = np.full(len(start), np.inf, dtype=np.float32)
    for s in range(0, len(start), 2000):
        t_hoch[s:s + 2000], _, _ = schnitt(start[s:s + 2000], hoch[s:s + 2000])
    d_ok = ~d_innen & np.isfinite(t_hoch)
    di = np.nonzero(d_ok)[0]
    pk = start[di].copy()
    pk[:, 1] += t_hoch[di] - 0.01
    print(f"Deckenkarte {dnx} × {dnz} = {len(start)} Punkte ({len(di)} gültig)")

    e_direkt = direkt_licht(pk, melden=False)[:, 3]
    print(f"  direktes Licht: mittlere Helligkeit {e_direkt.mean():.4f}")

    # Zurückgeworfenes Licht: Strahlen in die untere Halbkugel; Licht der getroffenen Flächen aus dem Gitter
    ganz = 2 * DECKE_STRAHLEN
    k2 = np.arange(ganz) + 0.5
    phi2 = np.arccos(1 - 2 * k2 / ganz)
    theta2 = np.pi * (1 + 5 ** 0.5) * k2
    kugel = np.stack([np.cos(theta2) * np.sin(phi2), np.cos(phi2), np.sin(theta2) * np.sin(phi2)], -1).astype(np.float32)
    unten = kugel[kugel[:, 1] < 0]
    e_indirekt = np.zeros((len(pk), 3), dtype=np.float32)
    stueck = max(1, 6000 // len(unten))
    for s in range(0, len(pk), stueck):
        o = pk[s:s + stueck]
        m = len(o)
        w = rng.uniform(0, 2 * np.pi, m).astype(np.float32)
        c, si = np.cos(w), np.sin(w)
        d = np.empty((m, len(unten), 3), dtype=np.float32)
        d[..., 0] = c[:, None] * unten[None, :, 0] - si[:, None] * unten[None, :, 2]
        d[..., 1] = unten[None, :, 1]
        d[..., 2] = si[:, None] * unten[None, :, 0] + c[:, None] * unten[None, :, 2]
        o2 = np.repeat(o, len(unten), axis=0)
        d2 = d.reshape(-1, 3)
        t, beste, normale = schnitt(o2, d2)
        g = np.isfinite(t)
        L = np.zeros((len(o2), 3), dtype=np.float32)
        if g.any():
            p = o2[g] + d2[g] * t[g][:, None]
            E = nachschlagen(feld, p + normale[g] * (SCHRITT * 0.5), normale[g])
            L[g] = albedo[beste[g]] * E / np.pi
        gew = -d2[:, 1] * (4 * np.pi / ganz)
        e_indirekt[s:s + m] = (L * gew[:, None]).reshape(m, len(unten), 3).sum(axis=1)
    print(f"  zurückgeworfenes Licht: mittlere Helligkeit {e_indirekt.mean():.4f}")

    def fuelle2(karte: np.ndarray, ok: np.ndarray, runden: int = 40) -> np.ndarray:
        """Ungültige Rasterpunkte der Deckenkarte aus gültigen Nachbarn auffüllen."""
        f = karte.copy()
        ok = ok.copy()
        for _ in range(runden):
            if ok.all():
                break
            summe = np.zeros_like(f)
            zahl = np.zeros(ok.shape, dtype=np.float32)
            for ax in range(2):
                for sch in (-1, 1):
                    summe += schiebe(f * ok[..., None], sch, ax)
                    zahl += schiebe(ok, sch, ax).astype(np.float32)
            neu = (~ok) & (zahl > 0)
            f[neu] = summe[neu] / zahl[neu][..., None]
            ok |= neu
        return f

    def glaette2(karte: np.ndarray, ok: np.ndarray) -> np.ndarray:
        """Zurückgeworfenes Licht leicht glätten (gegen Zufallsrauschen), nur über gültige Nachbarn."""
        okf = ok.astype(np.float32)
        summe = karte * okf[..., None] * 2.0
        zahl = okf * 2.0
        for ax in range(2):
            for sch in (-1, 1):
                summe += schiebe(karte * okf[..., None], sch, ax)
                zahl += schiebe(okf, sch, ax)
        return np.where(zahl[..., None] > 0, summe / np.maximum(zahl, 1e-6)[..., None], karte)

    ok2 = d_ok.reshape(dnx, dnz)
    ind2 = np.zeros((dnx * dnz, 3), dtype=np.float32)
    ind2[di] = e_indirekt
    ind2 = glaette2(glaette2(ind2.reshape(dnx, dnz, 3), ok2), ok2)
    dir2 = np.zeros((dnx * dnz, 3), dtype=np.float32)
    dir2[di] = e_direkt
    decke = fuelle2(dir2.reshape(dnx, dnz, 3) + ind2, ok2)

    # Speichern: Breite nx·6 (Richtungen nebeneinander), Höhe ny·nz (Schichten entlang z untereinander)
    hoechstwert = float(feld.max())
    werte = np.clip(feld / hoechstwert, 0, 1) ** (1 / 2.2)
    bild = np.zeros((nz * ny, nx * 6, 3), dtype=np.uint8)
    F = (werte.reshape(nx, ny, nz, 6, 3) * 255 + 0.5).astype(np.uint8)
    for a in range(6):
        for z in range(nz):
            bild[z * ny:(z + 1) * ny, a * nx:(a + 1) * nx] = F[:, :, z, a].transpose(1, 0, 2)
    ziel.mkdir(parents=True, exist_ok=True)
    Image.fromarray(bild, "RGB").save(ziel / "licht-etage3.png", optimize=True)
    # Deckenkarte: Zeile = z, Spalte = x
    decke_max = float(decke.max())
    dbild = (np.clip(decke / decke_max, 0, 1) ** (1 / 2.2) * 255 + 0.5).astype(np.uint8).transpose(1, 0, 2)
    Image.fromarray(np.ascontiguousarray(dbild), "RGB").save(ziel / "licht-etage3-decke.png", optimize=True)
    info = {
        "nx": nx, "ny": ny, "nz": nz, "schritt": SCHRITT, "ursprung": list(RAUM_MIN),
        "hoechstwert": hoechstwert, "gamma": 2.2,
        "richtungen": ["+x", "-x", "+y", "-y", "+z", "-z"],
        # Licht von unten auf nach unten zeigende Flächen oberhalb von „ab“ (Decke, Gesims-Unterseiten)
        "decke": {
            "datei": "licht-etage3-decke.png", "nx": dnx, "nz": dnz, "schritt": DECKE_SCHRITT,
            "ursprung": [RAUM_MIN[0], RAUM_MIN[2]], "ab": DECKE_AB, "hoechstwert": decke_max,
        },
        "hinweis": "Vorab berechnet mit .claude/scripts/holmes_licht.py (bedeckter Himmel, Annahmen siehe dort)",
    }
    (ziel / "licht-etage3.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    print(f"geschrieben: {ziel / 'licht-etage3.png'} ({(ziel / 'licht-etage3.png').stat().st_size // 1024} KB)")
    return 0


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in ("empfange", "berechne"):
        print(__doc__)
        return 2
    if sys.argv[1] == "empfange":
        return empfange(Path(sys.argv[2]) if len(sys.argv) > 2 else MODELL_VORGABE)
    modell = Path(sys.argv[2]) if len(sys.argv) > 2 else MODELL_VORGABE
    ziel = Path(sys.argv[3]) if len(sys.argv) > 3 else ZIEL_VORGABE
    return berechne(modell, ziel)


if __name__ == "__main__":
    sys.exit(main())
