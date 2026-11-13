"""Vorab berechnete Beleuchtung für „Sherlock Holmes – Die Berliner Fälle“ (III. Etage).

Aufruf:
  python .claude/scripts/holmes_licht.py empfange [datei]
      Wartet auf 127.0.0.1:8765 auf das Raummodell, das die Spielseite schickt
      (lokal: __debug.sendeLichtModell()), und speichert es (Vorgabe: .claude/scripts/holmes_lichtmodell.json).
  python .claude/scripts/holmes_licht.py berechne [modell] [zielordner]
      Berechnet Lichtgitter und Lichtkarte und schreibt licht-etage3.png, licht-etage3-karte.png
      und licht-etage3.json (Vorgabe-Ziel: docs/holmes-berliner-faelle/licht/).

Grundregel (siehe welt/lichtmodell.js):
  - Lichtkarte: Statische Quader und Flächen (Wände, Boden, Decke, Möbel aus Quadern) bekommen ihr Licht
    je 10-cm-Bildpunkt, direkt auf der Fläche berechnet.
  - Lichtgitter (0,4 m, je Punkt 6 Richtungen): für alles andere (runde Formen, Figuren, Personen) und als
    Quelle des zurückgeworfenen Lichts.

Verfahren (Strahlverfolgung):
  - Raummodell: Quader genau wie im Spiel, auch gedreht, mit Rückstrahlwert (Albedo, linear).
  - Himmel: bedeckter Himmel nach CIE (Leuchtdichte (1 + 2·sin α)/3 · Lz), unter dem Horizont
    reflektierter Boden (Annahme 20 %). Licht kommt nur durch die Fensteröffnungen herein.
  - Direktes Himmelslicht: Fensterflächen gezielt abtasten (Sichtprüfung) – glatt, ohne Zufallsflecken.
  - Lichtgitter: zurückgeworfenes Licht in mehreren Durchgängen (Strahlen in alle Richtungen), geglättet.
  - Lichtkarte: direktes Licht + einmal gesammeltes zurückgeworfenes Licht (Strahlen in die Halbkugel vor
    der Fläche, Licht der getroffenen Flächen aus dem fertigen Gitter); dazu die Verdeckung durch Nahes
    (Alphakanal, für den Bodenglanz).
  - Beschleunigung: je Raum nur die Quader in der Nähe; Strahlen, die den Bereich verlassen, werden gegen
    alle Quader geprüft (Ergebnis exakt). Parallel auf allen Prozessorkernen.
"""

from __future__ import annotations

import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
MODELL_VORGABE = WURZEL / ".claude" / "scripts" / "holmes_lichtmodell.json"
ZIEL_VORGABE = WURZEL / "docs" / "holmes-berliner-faelle" / "licht"

# Innenraum der III. Etage (Meter)
RAUM_MIN = (0.0, 0.0, 0.0)
RAUM_MAX = (9.0, 4.0, 27.5)
SCHRITT = 0.4            # Gitterabstand
STRAHLEN = 192           # Strahlen je Gitterpunkt
DURCHGAENGE = 4          # 1 = nur Himmel, weitere = Reflexionen
KARTE_STRAHLEN = 96      # Strahlen je Lichtkarten-Bildpunkt (Halbkugel, nach Kosinus verteilt)
NAH = 1.0                # Verdeckung: Treffer näher als NAH (m) zählen als verdeckt
PROBEN_GITTER = (8, 6)   # Abtastpunkte je Fenster (Breite × Höhe) für das Gitter
PROBEN_KARTE = (6, 5)    # … für die Lichtkarte
HIMMEL = (0.92, 0.96, 1.0)    # Farbe des bedeckten Himmels (Annahme)
BODEN_AUSSEN = (0.80, 0.78, 0.72)
BODEN_REFLEXION = 0.2    # Anteil reflektierten Lichts von Straße/Gebäuden draußen (Annahme)
STUECK = 2500            # Strahlen je Arbeitspaket (Speicher: Strahlen × Quader)


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
            print(f"gespeichert: {datei} ({len(daten.get('quader', []))} Quader, {len(daten.get('flaechen', []))} Lichtkarten-Seiten)")
            self.server.fertig = True  # type: ignore[attr-defined]

        def log_message(self, *args) -> None:  # leise
            pass

    server = HTTPServer(("127.0.0.1", 8765), Handler)
    server.fertig = False  # type: ignore[attr-defined]
    print("warte auf das Raummodell auf http://127.0.0.1:8765 …")
    while not server.fertig:  # type: ignore[attr-defined]
        server.handle_request()
    return 0


# ---------------------------------------------------------------- Strahlverfolgung (auch in Hilfsprozessen)

import numpy as np  # noqa: E402

_S: dict = {}   # Szene je Prozess (über _init gesetzt)


def _init(szene: dict) -> None:
    global _S
    _S = szene


def baue_szene(modell: dict) -> dict:
    """Quader aus dem Modell: achsenparallele als min/max, gedrehte mit lokalen Achsen; Bereiche je Raum."""
    q = np.array(modell["quader"], dtype=np.float64)
    mitte, halb, achsen, albedo = q[:, 0:3], q[:, 3:6], q[:, 6:15].reshape(-1, 3, 3), q[:, 15:18]
    # Achsenparallel: jede lokale Achse zeigt (fast) genau entlang einer Weltachse
    parallel = np.all(np.abs(np.abs(achsen).max(axis=2) - 1) < 1e-4, axis=1)
    weltHalb = np.einsum("kij,ki->kj", np.abs(achsen), halb)   # umgebender achsenparalleler Quader
    bmin, bmax = mitte - weltHalb, mitte + weltHalb
    raeume = modell.get("raeume") or [[RAUM_MIN[2], RAUM_MAX[2]]]
    grenzen = [raeume[0][0] - 1]
    for a, b in zip(raeume[:-1], raeume[1:]):
        grenzen.append((a[1] + b[0]) / 2)
    grenzen.append(raeume[-1][1] + 1)
    bereiche, auswahl = [], []
    for i in range(len(raeume)):
        lo = np.array([RAUM_MIN[0] - 0.6, RAUM_MIN[1] - 0.6, grenzen[i] - 0.6])
        hi = np.array([RAUM_MAX[0] + 0.6, RAUM_MAX[1] + 0.6, grenzen[i + 1] + 0.6])
        bereiche.append((lo, hi))
        auswahl.append(np.nonzero(np.all((bmax >= lo) & (bmin <= hi), axis=1))[0])
    return {
        "bmin": bmin.astype(np.float32), "bmax": bmax.astype(np.float32), "albedo": albedo.astype(np.float32),
        "parallel": parallel, "mitte": mitte.astype(np.float32), "halb": halb.astype(np.float32),
        "achsen": achsen.astype(np.float32), "grenzen": np.array(grenzen), "bereiche": bereiche, "auswahl": auswahl,
        "fenster": modell.get("fenster", []),
    }


def _schnitt_teil(o: np.ndarray, d: np.ndarray, idx: np.ndarray):
    """Nächster Treffer unter den Quadern idx: (t, Quader-Index, Normale); t = inf ohne Treffer."""
    S = _S
    n = len(o)
    t_best = np.full(n, np.inf, dtype=np.float32)
    i_best = np.full(n, -1, dtype=np.int64)
    n_best = np.zeros((n, 3), dtype=np.float32)
    if len(idx) == 0:
        return t_best, i_best, n_best
    r = np.arange(n)
    inv = 1.0 / np.where(np.abs(d) < 1e-7, 1e-7, d)
    par = idx[S["parallel"][idx]]
    if len(par):
        t1 = (S["bmin"][par][None] - o[:, None]) * inv[:, None]
        t2 = (S["bmax"][par][None] - o[:, None]) * inv[:, None]
        tnah = np.minimum(t1, t2)
        tein = tnah.max(axis=2)
        taus = np.maximum(t1, t2).min(axis=2)
        tein = np.where((taus >= tein) & (tein > 1e-4), tein, np.inf)
        b = tein.argmin(axis=1)
        t = tein[r, b]
        ax = tnah[r, b].argmax(axis=1)
        besser = t < t_best
        t_best = np.where(besser, t, t_best)
        i_best = np.where(besser, par[b], i_best)
        nn = np.zeros((n, 3), dtype=np.float32)
        nn[r, ax] = -np.sign(d[r, ax])
        n_best = np.where(besser[:, None], nn, n_best)
    rot = idx[~S["parallel"][idx]]
    if len(rot):
        A = S["achsen"][rot]                      # (k, 3, 3): Zeilen = lokale Achsen in Welt
        ol = np.einsum("kij,rkj->rki", A, o[:, None, :] - S["mitte"][rot][None])
        dl = np.einsum("kij,rj->rki", A, d)
        invl = 1.0 / np.where(np.abs(dl) < 1e-7, 1e-7, dl)
        h = S["halb"][rot][None]
        t1 = (-h - ol) * invl
        t2 = (h - ol) * invl
        tnah = np.minimum(t1, t2)
        tein = tnah.max(axis=2)
        taus = np.maximum(t1, t2).min(axis=2)
        tein = np.where((taus >= tein) & (tein > 1e-4), tein, np.inf)
        b = tein.argmin(axis=1)
        t = tein[r, b]
        ax = tnah[r, b].argmax(axis=1)
        besser = t < t_best
        t_best = np.where(besser, t, t_best)
        i_best = np.where(besser, rot[b], i_best)
        vorz = -np.sign(dl[r, b, ax])
        nn = (A[b, ax] * vorz[:, None]).astype(np.float32)
        n_best = np.where(besser[:, None], nn, n_best)
    return t_best, i_best, n_best


def schnitt(o: np.ndarray, d: np.ndarray, raum: int, bis: np.ndarray | None = None):
    """Nächster Treffer: erst gegen die Quader des Raumbereichs; verlässt der Strahl den Bereich ohne
    Treffer darin, gegen alle Quader (so bleibt das Ergebnis exakt).
    bis: wird nur die Strecke bis zu dieser Entfernung gebraucht (Sichtprüfung) und liegt ihr Ende im Bereich,
    genügt die Auswahl (ein Quader außerhalb des Bereichs kann die Strecke nicht schneiden)."""
    S = _S
    t, i, nrm = _schnitt_teil(o, d, S["auswahl"][raum])
    lo, hi = S["bereiche"][raum]
    p = o + d * np.where(np.isfinite(t), t, 0)[:, None]
    drin = np.isfinite(t) & np.all((p >= lo) & (p <= hi), axis=1)
    if bis is not None:
        ende = o + d * bis[:, None]
        drin |= np.all((ende >= lo) & (ende <= hi), axis=1)
    nach = np.nonzero(~drin)[0]
    if len(nach):
        t2, i2, n2 = _schnitt_teil(o[nach], d[nach], np.arange(len(S["bmin"])))
        t[nach], i[nach], nrm[nach] = t2, i2, n2
    return t, i, nrm


def raum_von(p: np.ndarray) -> np.ndarray:
    return np.clip(np.searchsorted(_S["grenzen"], p[:, 2]) - 1, 0, len(_S["auswahl"]) - 1)


def innen(p: np.ndarray, rand: float) -> np.ndarray:
    """Liegt der Punkt in einem Quader (um `rand` vergrößert)?"""
    S = _S
    erg = np.zeros(len(p), dtype=bool)
    par = np.nonzero(S["parallel"])[0]
    for s in range(0, len(par), 64):
        k = par[s:s + 64]
        erg |= np.any(np.all((p[:, None] > S["bmin"][k][None] - rand) & (p[:, None] < S["bmax"][k][None] + rand), axis=2), axis=1)
    for k in np.nonzero(~S["parallel"])[0]:
        lokal = (p - S["mitte"][k]) @ S["achsen"][k].T
        erg |= np.all(np.abs(lokal) < S["halb"][k] + rand, axis=1)
    return erg


def himmel(richtung: np.ndarray) -> np.ndarray:
    """Leuchtdichte des bedeckten Himmels (CIE) bzw. des Bodens draußen, je Richtung."""
    sinus = richtung[:, 1]
    h = ((1 + 2 * np.clip(sinus, 0, 1)) / 3)[:, None] * np.array(HIMMEL, dtype=np.float32)
    b = (BODEN_REFLEXION * 7 / 9) * np.array(BODEN_AUSSEN, dtype=np.float32)
    return np.where((sinus >= 0)[:, None], h, b[None, :])


def _fenster_proben(f: dict, proben: tuple[int, int]):
    su, sv = proben
    uu, vv = np.meshgrid((np.arange(su) + 0.5) / su, (np.arange(sv) + 0.5) / sv, indexing="ij")
    uu, vv = uu.ravel(), vv.ravel()
    a0, b0 = f["min"]
    a1, b1 = f["max"]
    flaeche = (a1 - a0) * (b1 - b0) / len(uu)
    pu = a0 + uu * (a1 - a0)
    pv = b0 + vv * (b1 - b0)
    if f["achse"] == "x":
        pkt = np.stack([np.full_like(pu, f["ebene"]), pv, pu], 1)
        n_f = np.array([1.0, 0.0, 0.0])
    else:
        pkt = np.stack([pu, pv, np.full_like(pu, f["ebene"])], 1)
        n_f = np.array([0.0, 0.0, 1.0])
    return pkt, n_f, flaeche


_ACHSEN = np.array([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], dtype=np.float64)


def _direkt_paket(args):
    """Direktes Himmelslicht für Punkte eines Raums. normalen=None: 6 Richtungen (Gitter), sonst je Punkt."""
    pkte, normalen, raum, proben = args
    n = len(pkte)
    erg = np.zeros((n, 6, 3) if normalen is None else (n, 3), dtype=np.float64)
    for f in _S["fenster"]:
        pkt, n_f, flaeche = _fenster_proben(f, proben)
        d = pkt[None] - pkte[:, None]
        rr = np.linalg.norm(d, axis=2)
        w = d / rr[..., None]
        cos_f = w @ n_f
        gew = np.clip(w @ _ACHSEN.T, 0, None) if normalen is None else np.clip(np.einsum("pk,psk->ps", normalen, w), 0, None)[..., None]
        nutz = (cos_f > 0) & (gew.max(axis=-1) > 0)
        if not nutz.any():
            continue
        pi, si = np.nonzero(nutz)
        for s in range(0, len(pi), STUECK):
            a, b = pi[s:s + STUECK], si[s:s + STUECK]
            ww = w[a, b]
            t, _, _ = schnitt(pkte[a].astype(np.float32), ww.astype(np.float32), raum, bis=rr[a, b])
            frei = t >= rr[a, b] - 0.02
            raumwinkel = flaeche * cos_f[a, b] / np.maximum(rr[a, b], 0.05) ** 2
            L = himmel(ww) * (raumwinkel * frei)[:, None]
            beitrag = gew[a, b][..., None] * L[:, None, :] if normalen is None else gew[a, b] * L
            np.add.at(erg, a, beitrag)
    return erg


def _strahlen_paket(args):
    """Strahlen verfolgen: (t, Quader-Index, Normale) je Strahl."""
    o, d, raum = args
    return schnitt(o, d, raum)


def _nachschlagen(feld: np.ndarray, info: tuple, p: np.ndarray, nrm: np.ndarray) -> np.ndarray:
    """Bestrahlungsstärke aus dem Gitter an Punkten p für Normalen nrm (trilinear, 6 Richtungen)."""
    nx, ny, nz = info
    rmin = np.array(RAUM_MIN)
    g = (p - rmin) / SCHRITT - 0.5
    hoechst = np.array([nx - 1, ny - 1, nz - 1], dtype=np.float64)
    g = np.clip(g, 0, hoechst - 1e-4)
    i0 = np.floor(g).astype(int)
    f = g - i0
    i1 = np.minimum(i0 + 1, hoechst.astype(int))
    F = feld.reshape(nx, ny, nz, 6, 3)
    erg = np.zeros((len(p), 6, 3))
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


def _sammle_paket(args):
    """Lichtkarte, zurückgeworfenes Licht: Strahlen in die Halbkugel (nach Kosinus), Licht der Trefferflächen
    aus dem Gitter. Liefert (Bestrahlungsstärke RGB, freie Sicht 0..1) je Punkt."""
    pkte, normalen, raum, saat = args
    feld, info = _S["feld"], _S["info"]
    k = KARTE_STRAHLEN
    j = np.arange(k) + 0.5
    rad = np.sqrt(j / k)
    phi = j * np.pi * (3 - np.sqrt(5))
    rng = np.random.default_rng(saat)
    n = len(pkte)
    E = np.zeros((n, 3))
    frei = np.zeros(n)
    for s in range(0, n, max(1, STUECK // k)):
        p = pkte[s:s + STUECK // k]
        nn = normalen[s:s + STUECK // k]
        m = len(p)
        # Tangentialebene je Punkt, zufällig gedreht
        hilf = np.where(np.abs(nn[:, 1:2]) < 0.9, [[0, 1, 0]], [[1, 0, 0]])
        tu = np.cross(hilf, nn)
        tu /= np.linalg.norm(tu, axis=1, keepdims=True)
        tv = np.cross(nn, tu)
        dreh = rng.uniform(0, 2 * np.pi, m)
        cphi = np.cos(phi[None] + dreh[:, None])
        sphi = np.sin(phi[None] + dreh[:, None])
        hoch = np.sqrt(1 - rad ** 2)[None]
        d = (tu[:, None] * (rad[None] * cphi)[..., None] + tv[:, None] * (rad[None] * sphi)[..., None]
             + nn[:, None] * hoch[..., None])
        o2 = np.repeat(p, k, axis=0).astype(np.float32)
        d2 = d.reshape(-1, 3).astype(np.float32)
        t, idx, nrm = schnitt(o2, d2, raum)
        g = np.isfinite(t)
        L = np.zeros((len(o2), 3))
        if g.any():
            hit = o2[g] + d2[g] * t[g][:, None]
            Eh = _nachschlagen(feld, info, hit + nrm[g] * (SCHRITT * 0.5), nrm[g])
            L[g] = _S["albedo"][idx[g]] * Eh          # Albedo · E / π · π (Kosinus-Verteilung)
        E[s:s + m] = L.reshape(m, k, 3).mean(axis=1)
        frei[s:s + m] = 1 - (g & (t < NAH)).reshape(m, k).mean(axis=1)
    return E, frei


def _innen_paket(args):
    p, rand = args
    return innen(p, rand)


# ---------------------------------------------------------------- Berechnen

def berechne(modell_datei: Path, ziel: Path) -> int:
    from multiprocessing import Pool
    from PIL import Image

    beginn = time.time()
    modell = json.loads(modell_datei.read_text(encoding="utf-8"))
    if "flaechen" not in modell:
        print("Das Raummodell ist im alten Format – bitte neu senden (__debug.sendeLichtModell()).")
        return 1
    szene = baue_szene(modell)
    _init(szene)
    kerne = os.cpu_count() or 4
    print(f"{len(szene['bmin'])} Quader ({int((~szene['parallel']).sum())} gedreht), {len(szene['fenster'])} Fenster, "
          f"{len(modell['flaechen'])} Lichtkarten-Seiten, {kerne} Prozesse")

    rmin = np.array(RAUM_MIN)
    rmax = np.array(RAUM_MAX)
    nx, ny, nz = (int(v) for v in np.ceil((rmax - rmin) / SCHRITT))
    gx, gy, gz = np.meshgrid(np.arange(nx), np.arange(ny), np.arange(nz), indexing="ij")
    punkte = rmin + (np.stack([gx, gy, gz], -1).reshape(-1, 3) + 0.5) * SCHRITT
    anzahl = len(punkte)

    with Pool(kerne, initializer=_init, initargs=(szene,)) as pool:
        # ---------- Lichtgitter
        # Punkte in Quadern und genau auf Oberflächen (± 2 cm) sind ungültig, werden aus Nachbarn aufgefüllt
        teile = np.array_split(punkte, kerne * 4)
        gueltig = ~np.concatenate(pool.map(_innen_paket, [(t, 0.02) for t in teile]))
        idx = np.nonzero(gueltig)[0]
        raum_g = raum_von(punkte[idx])
        print(f"Lichtgitter {nx} × {ny} × {nz} = {anzahl} Punkte ({len(idx)} gültig)")

        def je_raum(liste, raeume, groesse):
            """Indizes nach Raum ordnen und in Pakete teilen."""
            pakete = []
            for r in np.unique(raeume):
                sel = liste[raeume == r]
                for s in range(0, len(sel), groesse):
                    pakete.append((r, sel[s:s + groesse]))
            return pakete

        direkt = np.zeros((anzahl, 6, 3))
        pakete = je_raum(np.arange(len(idx)), raum_g, 64)
        for (r, sel), erg in zip(pakete, pool.imap(_direkt_paket, [(punkte[idx[sel]], None, int(r), PROBEN_GITTER) for r, sel in pakete])):
            direkt[idx[sel]] = erg
        print(f"  direktes Licht: {time.time() - beginn:.0f} s")

        kk = np.arange(STRAHLEN) + 0.5
        phi = np.arccos(1 - 2 * kk / STRAHLEN)
        theta = np.pi * (1 + 5 ** 0.5) * kk
        basis = np.stack([np.cos(theta) * np.sin(phi), np.cos(phi), np.sin(theta) * np.sin(phi)], -1)
        rng = np.random.default_rng(1892)
        drehw = rng.uniform(0, 2 * np.pi, len(idx))
        c, si = np.cos(drehw), np.sin(drehw)
        richt = np.empty((len(idx), STRAHLEN, 3), dtype=np.float32)
        richt[..., 0] = c[:, None] * basis[None, :, 0] - si[:, None] * basis[None, :, 2]
        richt[..., 1] = basis[None, :, 1]
        richt[..., 2] = si[:, None] * basis[None, :, 0] + c[:, None] * basis[None, :, 2]
        tref_t = np.full((len(idx), STRAHLEN), np.inf, dtype=np.float32)
        tref_i = np.full((len(idx), STRAHLEN), -1, dtype=np.int64)
        tref_n = np.zeros((len(idx), STRAHLEN, 3), dtype=np.float32)
        pakete = je_raum(np.arange(len(idx)), raum_g, max(1, STUECK // STRAHLEN))
        auftraege = [(np.repeat(punkte[idx[sel]], STRAHLEN, axis=0).astype(np.float32), richt[sel].reshape(-1, 3), int(r)) for r, sel in pakete]
        for (r, sel), (t, i, nrm) in zip(pakete, pool.imap(_strahlen_paket, auftraege, chunksize=4)):
            tref_t[sel] = t.reshape(-1, STRAHLEN)
            tref_i[sel] = i.reshape(-1, STRAHLEN)
            tref_n[sel] = nrm.reshape(-1, STRAHLEN, 3)
        print(f"  Strahlen verfolgt: {time.time() - beginn:.0f} s")
        gewicht = np.clip(np.einsum("prk,ak->pra", richt, _ACHSEN), 0, None) * (4 * np.pi / STRAHLEN)

        def schiebe(a: np.ndarray, sch: int, ax: int) -> np.ndarray:
            """Wie np.roll, aber ohne Umlauf: Am Rand rückt eine Null nach."""
            erg = np.zeros_like(a)
            quelle = [slice(None)] * a.ndim
            zielsl = [slice(None)] * a.ndim
            if sch > 0:
                quelle[ax], zielsl[ax] = slice(0, -sch), slice(sch, None)
            else:
                quelle[ax], zielsl[ax] = slice(-sch, None), slice(0, sch)
            erg[tuple(zielsl)] = a[tuple(quelle)]
            return erg

        def fuelle(feld: np.ndarray) -> np.ndarray:
            """Ungültige Gitterpunkte aus gültigen Nachbarn auffüllen (mehrfach)."""
            f = feld.reshape(nx, ny, nz, 6, 3).copy()
            ok = gueltig.reshape(nx, ny, nz).copy()
            for _ in range(6):
                if ok.all():
                    break
                summe = np.zeros_like(f)
                zahl = np.zeros((nx, ny, nz))
                for ax in range(3):
                    for sch in (-1, 1):
                        summe += schiebe(f * ok[..., None, None], sch, ax)
                        zahl += schiebe(ok, sch, ax)
                neu = (~ok) & (zahl > 0)
                f[neu] = summe[neu] / zahl[neu][..., None, None]
                ok |= neu
            return f.reshape(-1, 6, 3)

        def glaette(feld: np.ndarray) -> np.ndarray:
            """Leichtes Glätten über gültige Nachbarn (gegen Zufallsrauschen)."""
            f = feld.reshape(nx, ny, nz, 6, 3)
            ok = gueltig.reshape(nx, ny, nz).astype(np.float64)
            summe = f * ok[..., None, None] * 2.0
            zahl = ok * 2.0
            for ax in range(3):
                for sch in (-1, 1):
                    summe += schiebe(f * ok[..., None, None], sch, ax)
                    zahl += schiebe(ok, sch, ax)
            erg = np.where(zahl[..., None, None] > 0, summe / np.maximum(zahl, 1e-6)[..., None, None], f)
            return erg.reshape(-1, 6, 3)

        direkt = fuelle(direkt)
        feld = direkt.copy()
        print(f"Gitter, direktes Himmelslicht: mittlere Helligkeit {feld[gueltig].mean():.4f}")
        hb = tref_i >= 0
        pf = punkte[idx][:, None] + richt * np.where(hb, tref_t, 0)[..., None]
        for durchgang in range(1, DURCHGAENGE):
            L = np.zeros((len(idx), STRAHLEN, 3))
            E = _nachschlagen(feld, (nx, ny, nz), pf[hb] + tref_n[hb] * (SCHRITT * 0.5), tref_n[hb])
            L[hb] = szene["albedo"][tref_i[hb]] * E / np.pi
            indirekt = np.zeros((anzahl, 6, 3))
            indirekt[idx] = np.einsum("pra,prc->pac", gewicht, L)
            # Erst glätten, dann auffüllen: Punkte auf Wänden übernehmen so geglättete Nachbarwerte
            indirekt = fuelle(glaette(indirekt))
            feld = direkt + indirekt
            print(f"Gitter, Durchgang {durchgang + 1}: mittlere Helligkeit {feld[gueltig].mean():.4f}")
        del tref_t, tref_i, tref_n, richt, pf, gewicht

    # ---------- Lichtkarte (neuer Prozess-Pool: kennt das fertige Gitter)
    szene["feld"] = feld
    szene["info"] = (nx, ny, nz)
    _init(szene)
    fl = np.array(modell["flaechen"], dtype=np.float64)
    breite, hoehe = (int(v) for v in modell["atlas"])
    pos_l, nrm_l, ziel_l, seite_l = [], [], [], []
    for s, f in enumerate(fl):
        x0, y0, w, h = (int(v) for v in f[0:4])
        ecke, u, v, n = f[4:7], f[7:10], f[10:13], f[13:16]
        ii, jj = np.meshgrid(np.arange(w), np.arange(h), indexing="ij")
        p = ecke + ((ii.ravel()[:, None] + 0.5) / w) * u + ((jj.ravel()[:, None] + 0.5) / h) * v
        pos_l.append(p + n * 0.01)
        nrm_l.append(np.repeat(n[None], len(p), axis=0))
        ziel_l.append(np.stack([x0 + ii.ravel(), y0 + jj.ravel()], 1))
        seite_l.append(np.full(len(p), s))
    kp = np.concatenate(pos_l)
    kn = np.concatenate(nrm_l)
    kz = np.concatenate(ziel_l)
    print(f"Lichtkarte {breite} × {hoehe}: {len(kp)} Bildpunkte")

    with Pool(kerne, initializer=_init, initargs=(szene,)) as pool:
        teile = np.array_split(np.arange(len(kp)), kerne * 8)
        k_gueltig = ~np.concatenate(pool.map(_innen_paket, [(kp[t], 0.0) for t in teile]))
        ki = np.nonzero(k_gueltig)[0]
        raum_k = raum_von(kp[ki])
        print(f"  sichtbare Bildpunkte: {len(ki)}")
        E_dir = np.zeros((len(kp), 3))
        E_ind = np.zeros((len(kp), 3))
        frei = np.ones(len(kp))
        pakete = []
        for r in np.unique(raum_k):
            sel = ki[raum_k == r]
            for s in range(0, len(sel), 48):
                pakete.append((int(r), sel[s:s + 48]))
        for (r, sel), erg in zip(pakete, pool.imap(_direkt_paket, [(kp[sel], kn[sel], r, PROBEN_KARTE) for r, sel in pakete], chunksize=4)):
            E_dir[sel] = erg
        print(f"  direktes Licht: {time.time() - beginn:.0f} s")
        auftraege = [(kp[sel], kn[sel], r, 1000 + nr) for nr, (r, sel) in enumerate(pakete)]
        for (r, sel), (e, fr) in zip(pakete, pool.imap(_sammle_paket, auftraege, chunksize=4)):
            E_ind[sel] = e
            frei[sel] = fr
        print(f"  zurückgeworfenes Licht: {time.time() - beginn:.0f} s")

    # Je Seite: zurückgeworfenes Licht leicht glätten, verdeckte Bildpunkte aus Nachbarn füllen, Rand auffüllen
    atlas = np.zeros((hoehe, breite, 3))
    alpha = np.zeros((hoehe, breite))
    start = 0
    for s, f in enumerate(fl):
        x0, y0, w, h = (int(v) for v in f[0:4])
        anz = w * h
        sl = slice(start, start + anz)
        start += anz
        ok = k_gueltig[sl].reshape(w, h)
        ind = E_ind[sl].reshape(w, h, 3)
        okf = ok.astype(np.float64)
        summe = ind * okf[..., None] * 2
        zahl = okf * 2
        for ax in range(2):
            for sch in (-1, 1):
                summe += np.roll(ind * okf[..., None], sch, ax) * _randmaske(w, h, sch, ax)[..., None]
                zahl += np.roll(okf, sch, ax) * _randmaske(w, h, sch, ax)
        ind = np.where(zahl[..., None] > 0, summe / np.maximum(zahl, 1e-9)[..., None], ind)
        wert = E_dir[sl].reshape(w, h, 3) + ind
        fr = frei[sl].reshape(w, h)
        wert, fr = _fuelle_seite(wert, fr, ok)
        # in den Atlas (Zeile = y, Spalte = x), dazu ein Randpunkt ringsum als Kopie der Kante
        block = np.pad(wert.transpose(1, 0, 2), ((1, 1), (1, 1), (0, 0)), mode="edge")
        fblock = np.pad(fr.T, 1, mode="edge")
        atlas[y0 - 1:y0 + h + 1, x0 - 1:x0 + w + 1] = block
        alpha[y0 - 1:y0 + h + 1, x0 - 1:x0 + w + 1] = 1 + np.round(254 * np.clip(fblock, 0, 1))

    glaette_karte(atlas, fl)
    hoechst_k = float(atlas.max())
    rgb = (np.clip(atlas / hoechst_k, 0, 1) ** (1 / 2.2) * 255 + 0.5).astype(np.uint8)
    bild_k = np.dstack([rgb, alpha.astype(np.uint8)])
    ziel.mkdir(parents=True, exist_ok=True)
    Image.fromarray(bild_k, "RGBA").save(ziel / "licht-etage3-karte.png", optimize=True)

    # Lichtgitter speichern: Breite nx·6 (Richtungen nebeneinander), Höhe ny·nz (Schichten entlang z untereinander)
    hoechstwert = float(feld.max())
    werte = np.clip(feld / hoechstwert, 0, 1) ** (1 / 2.2)
    bild = np.zeros((nz * ny, nx * 6, 3), dtype=np.uint8)
    F = (werte.reshape(nx, ny, nz, 6, 3) * 255 + 0.5).astype(np.uint8)
    for a in range(6):
        for z in range(nz):
            bild[z * ny:(z + 1) * ny, a * nx:(a + 1) * nx] = F[:, :, z, a].transpose(1, 0, 2)
    Image.fromarray(bild, "RGB").save(ziel / "licht-etage3.png", optimize=True)
    info = {
        "nx": nx, "ny": ny, "nz": nz, "schritt": SCHRITT, "ursprung": list(RAUM_MIN),
        "hoechstwert": hoechstwert, "gamma": 2.2,
        "richtungen": ["+x", "-x", "+y", "-y", "+z", "-z"],
        "lichtkarte": {
            "datei": "licht-etage3-karte.png", "breite": breite, "hoehe": hoehe,
            "hoechstwert": hoechst_k, "pruefsumme": modell["pruefsumme"],
        },
        "hinweis": "Vorab berechnet mit .claude/scripts/holmes_licht.py (bedeckter Himmel, Annahmen siehe dort)",
    }
    (ziel / "licht-etage3.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    for name in ("licht-etage3.png", "licht-etage3-karte.png"):
        print(f"geschrieben: {ziel / name} ({(ziel / name).stat().st_size // 1024} KB)")
    print(f"fertig nach {time.time() - beginn:.0f} s")
    return 0


KARTE_UNSCHAERFE = 2.5   # Weichzeichnung der Lichtkarte je Seite (Bildpunkte, Gauß-Sigma) gegen Wolken/Flecken


def glaette_karte(atlas: np.ndarray, fl: np.ndarray, sigma: float = KARTE_UNSCHAERFE) -> None:
    """Lichtkarte je Seite weichzeichnen (Gauß, nur innerhalb der Seite, am Rand normiert) und den Randpunkt
    ringsum neu als Kopie der Kante setzen. Ohne das bleibt das Zufallsrauschen des zurückgeworfenen Lichts
    als wolkige Flecken auf Wänden und Decken sichtbar (Hinweis des Nutzers)."""
    r = int(np.ceil(3 * sigma))
    kern = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    for f in fl:
        x0, y0, w, h = (int(v) for v in f[0:4])
        blk = atlas[y0:y0 + h, x0:x0 + w]
        eins = np.ones((h, w))
        for ax in (0, 1):
            summe = np.zeros_like(blk)
            gew = np.zeros_like(eins)
            n = blk.shape[ax]
            for k, g in zip(range(-r, r + 1), kern):
                if abs(k) >= n:
                    continue
                q = [slice(None), slice(None)]
                z = [slice(None), slice(None)]
                q[ax] = slice(max(0, -k), n - max(0, k))
                z[ax] = slice(max(0, k), n - max(0, -k))
                summe[tuple(z)] += g * blk[tuple(q)]
                gew[tuple(z)] += g * eins[tuple(q)]
            blk = summe / gew[..., None]
        atlas[y0:y0 + h, x0:x0 + w] = blk
        atlas[y0 - 1:y0 + h + 1, x0 - 1:x0 + w + 1] = np.pad(blk, ((1, 1), (1, 1), (0, 0)), mode="edge")


def _randmaske(w: int, h: int, sch: int, ax: int) -> np.ndarray:
    """1, wo np.roll einen echten Nachbarn liefert, 0 am umgelaufenen Rand."""
    m = np.ones((w, h))
    if ax == 0:
        m[0 if sch > 0 else -1, :] = 0
    else:
        m[:, 0 if sch > 0 else -1] = 0
    return m


def _fuelle_seite(wert: np.ndarray, fr: np.ndarray, ok: np.ndarray):
    """Verdeckte Bildpunkte einer Seite aus sichtbaren Nachbarn füllen (ganz verdeckte Seiten: schwarz)."""
    if ok.all() or not ok.any():
        return wert, fr
    w, h = ok.shape
    wert, fr, ok = wert.copy(), fr.copy(), ok.copy()
    for _ in range(w + h):
        if ok.all():
            break
        summe = np.zeros_like(wert)
        fsum = np.zeros_like(fr)
        zahl = np.zeros_like(fr)
        for ax in range(2):
            for sch in (-1, 1):
                mk = _randmaske(w, h, sch, ax) * np.roll(ok, sch, ax)
                summe += np.roll(wert, sch, ax) * mk[..., None]
                fsum += np.roll(fr, sch, ax) * mk
                zahl += mk
        neu = (~ok) & (zahl > 0)
        wert[neu] = summe[neu] / zahl[neu][:, None]
        fr[neu] = fsum[neu] / zahl[neu]
        ok |= neu
    return wert, fr


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
