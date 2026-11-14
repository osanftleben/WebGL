"""Strahlverfolgung für holmes_licht.py: räumliches Raster (Vorsortierung), CPU-Weg (numpy) und
Grafikkarten-Weg (moderngl, Compute-Shader).

Raster: gleichmäßige Würfelzellen über die ganze Szene. Jede Zelle kennt die Quader, deren umgebender
Kasten sie berührt (mit kleinem Sicherheitsrand). Ein Strahl läuft Zelle für Zelle vorwärts (DDA) und
prüft nur die Quader der Zelle; liegt der beste Treffer vor dem Ausgang der Zelle, ist er fertig.

CPU-Weg: rechnet je Quader genau dieselben float32-Schritte wie die frühere Prüfung gegen alle Quader
und wählt bei gleichem Abstand wie zuvor (achsenparallel vor gedreht, dann kleinere Nummer) – das
Ergebnis ist bitgleich.

Grafikkarte: dieselbe Rechnung in GLSL (float32, Abweichungen nur durch Rundung). Neben der reinen
Strahlprüfung laufen dort auch direktes Licht, die Gitter-Durchgänge und das Sammeln der Lichtkarte,
damit keine Strahlen zwischen Grafikkarte und numpy hin- und hergeschoben werden müssen.
"""

from __future__ import annotations

import time

import numpy as np

ZELLE = 0.5          # Kantenlänge einer Rasterzelle (m); 0,35 und 0,75 waren auf der CPU nicht schneller
ZELL_RAND = 0.03     # Sicherheitsrand beim Einsortieren (m), deckt Rundung der Zellgrenzen ab
GROSS = np.int64(1) << 40


# ---------------------------------------------------------------- Raster aufbauen

def baue_raster(bmin: np.ndarray, bmax: np.ndarray, raum_min, raum_max, zelle: float = ZELLE) -> dict:
    """Zellen mit Quaderlisten (CSR: start[z]..start[z+1] in liste), Zellnummer = (x·ny + y)·nz + z."""
    lo = np.minimum(bmin.min(axis=0).astype(np.float64), raum_min) - 0.1
    hi = np.maximum(bmax.max(axis=0).astype(np.float64), raum_max) + 0.1
    n = np.ceil((hi - lo) / zelle).astype(np.int64)
    a = np.clip(np.floor((bmin.astype(np.float64) - ZELL_RAND - lo) / zelle).astype(np.int64), 0, n - 1)
    b = np.clip(np.floor((bmax.astype(np.float64) + ZELL_RAND - lo) / zelle).astype(np.int64), 0, n - 1)
    zellen, quader = [], []
    for k in range(len(bmin)):
        gx, gy, gz = np.meshgrid(np.arange(a[k, 0], b[k, 0] + 1), np.arange(a[k, 1], b[k, 1] + 1),
                                 np.arange(a[k, 2], b[k, 2] + 1), indexing="ij")
        z = ((gx * n[1] + gy) * n[2] + gz).ravel()
        zellen.append(z)
        quader.append(np.full(len(z), k, dtype=np.int64))
    zellen = np.concatenate(zellen)
    quader = np.concatenate(quader)
    ordnung = np.lexsort((quader, zellen))
    zellen, quader = zellen[ordnung], quader[ordnung]
    anzahl = int(np.prod(n))
    start = np.zeros(anzahl + 1, dtype=np.int64)
    np.add.at(start, zellen + 1, 1)
    start = np.cumsum(start)
    return {"r_lo": lo, "r_zelle": float(zelle), "r_n": n, "r_start": start, "r_liste": quader}


def _paare(S: dict, zellen: np.ndarray, nummern: np.ndarray):
    """Alle Paare (Nummer, Quader) für die Quaderlisten der angegebenen Zellen."""
    s0 = S["r_start"][zellen]
    cnt = S["r_start"][zellen + 1] - s0
    tot = int(cnt.sum())
    anf = np.cumsum(cnt) - cnt
    return np.repeat(nummern, cnt), S["r_liste"][np.repeat(s0 - anf, cnt) + np.arange(tot)]


def innen_raster(S: dict, p: np.ndarray, rand: float) -> np.ndarray:
    """Liegt der Punkt in einem Quader (um `rand` vergrößert, rand ≤ ZELL_RAND)? Prüft nur die Quader der
    eigenen Zelle; gleiche Vergleiche wie holmes_licht.innen, also gleiches Ergebnis."""
    lo, z, n = S["r_lo"], S["r_zelle"], S["r_n"]
    c = np.clip(np.floor((p - lo) / z), 0, n - 1).astype(np.int64)
    ray, box = _paare(S, (c[:, 0] * n[1] + c[:, 1]) * n[2] + c[:, 2], np.arange(len(p)))
    erg = np.zeros(len(p), dtype=bool)
    par = S["parallel"][box]
    r, k = ray[par], box[par]
    drin = np.all((p[r] > S["bmin"][k] - rand) & (p[r] < S["bmax"][k] + rand), axis=1)
    erg[r[drin]] = True
    r, k = ray[~par], box[~par]
    x = p[r] - S["mitte"][k]
    A = S["achsen"][k].astype(np.float64)
    lokal = A[:, :, 0] * x[:, 0:1] + A[:, :, 1] * x[:, 1:2] + A[:, :, 2] * x[:, 2:3]
    drin = np.all(np.abs(lokal) < S["halb"][k] + rand, axis=1)
    erg[r[drin]] = True
    return erg


# ---------------------------------------------------------------- CPU-Weg (numpy, bitgleich zur Prüfung gegen alle)

def _tein_paare(S: dict, o, d, inv, ray, box):
    """Eintrittsabstand je Paar (Strahl, Quader), float32 wie die frühere Prüfung; inf = kein Treffer."""
    t = np.full(len(ray), np.inf, dtype=np.float32)
    par = S["parallel"][box]
    p = np.nonzero(par)[0]
    if len(p):
        r, k = ray[p], box[p]
        oo, ii = o[r], inv[r]
        t1 = (S["bmin"][k] - oo) * ii
        t2 = (S["bmax"][k] - oo) * ii
        tein = np.minimum(t1, t2).max(axis=1)
        taus = np.maximum(t1, t2).min(axis=1)
        t[p] = np.where((taus >= tein) & (tein > 1e-4), tein, np.inf)
    q = np.nonzero(~par)[0]
    if len(q):
        r, k = ray[q], box[q]
        ol, dl = _lokal(S, o[r], d[r], k)
        invl = 1.0 / np.where(np.abs(dl) < 1e-7, 1e-7, dl)
        h = S["halb"][k]
        t1 = (-h - ol) * invl
        t2 = (h - ol) * invl
        tein = np.minimum(t1, t2).max(axis=1)
        taus = np.maximum(t1, t2).min(axis=1)
        t[q] = np.where((taus >= tein) & (tein > 1e-4), tein, np.inf)
    return t


def _lokal(S: dict, o, d, k):
    """Ursprung und Richtung in lokalen Achsen gedrehter Quader (gleiche Rundung wie einsum)."""
    A = S["achsen"][k]
    x = o - S["mitte"][k]
    ol = A[:, :, 0] * x[:, 0:1] + A[:, :, 1] * x[:, 1:2] + A[:, :, 2] * x[:, 2:3]
    dl = A[:, :, 0] * d[:, 0:1] + A[:, :, 1] * d[:, 1:2] + A[:, :, 2] * d[:, 2:3]
    return ol, dl


def _normalen(S: dict, o, d, inv, ray, box):
    """Normale an der Eintrittsseite (wie zuvor: Achse mit größtem Eintritt, gegen die Strahlrichtung)."""
    nn = np.zeros((len(ray), 3), dtype=np.float32)
    par = S["parallel"][box]
    p = np.nonzero(par)[0]
    if len(p):
        r, k = ray[p], box[p]
        oo, ii = o[r], inv[r]
        tnah = np.minimum((S["bmin"][k] - oo) * ii, (S["bmax"][k] - oo) * ii)
        ax = tnah.argmax(axis=1)
        m = np.zeros((len(p), 3), dtype=np.float32)
        m[np.arange(len(p)), ax] = -np.sign(d[r, ax])
        nn[p] = m
    q = np.nonzero(~par)[0]
    if len(q):
        r, k = ray[q], box[q]
        ol, dl = _lokal(S, o[r], d[r], k)
        invl = 1.0 / np.where(np.abs(dl) < 1e-7, 1e-7, dl)
        h = S["halb"][k]
        tnah = np.minimum((-h - ol) * invl, (h - ol) * invl)
        ax = tnah.argmax(axis=1)
        rr = np.arange(len(q))
        vorz = -np.sign(dl[rr, ax])
        nn[q] = (S["achsen"][k][rr, ax] * vorz[:, None]).astype(np.float32)
    return nn


def schnitt_raster(S: dict, o: np.ndarray, d: np.ndarray, bis: np.ndarray | None = None):
    """Nächster Treffer (t, Quader-Index, Normale) über das Raster; t = inf ohne Treffer.
    bis: nur die Strecke bis dahin zählt (Sichtprüfung) – danach endet der Lauf; ein gefundener Treffer
    näher als bis ist dann richtig, weiter entfernte sind für die Sichtprüfung belanglos."""
    n = len(o)
    t_best = np.full(n, np.inf, dtype=np.float32)
    k_best = np.full(n, GROSS, dtype=np.int64)
    i_best = np.full(n, -1, dtype=np.int64)
    n_best = np.zeros((n, 3), dtype=np.float32)
    if n == 0:
        return t_best, i_best, n_best
    nq = len(S["bmin"])
    inv = 1.0 / np.where(np.abs(d) < 1e-7, 1e-7, d)
    lo, z, nz3 = S["r_lo"], S["r_zelle"], S["r_n"]
    start, liste = S["r_start"], S["r_liste"]
    o64, d64 = o.astype(np.float64), d.astype(np.float64)
    null = d64 == 0
    with np.errstate(divide="ignore", invalid="ignore"):
        invg = np.where(null, 0.0, 1.0 / np.where(null, 1.0, d64))
        ta = np.where(null, -np.inf, (lo - o64) * invg)
        tb = np.where(null, np.inf, (lo + nz3 * z - o64) * invg)
    t0 = np.maximum(np.minimum(ta, tb).max(axis=1), 0.0)
    t1 = np.maximum(ta, tb).min(axis=1)
    c = np.clip(np.floor((o64 + d64 * t0[:, None] - lo) / z), 0, nz3 - 1).astype(np.int64)
    st = np.sign(d64).astype(np.int64)
    with np.errstate(invalid="ignore"):
        tmax = np.where(null, np.inf, ((c + (st > 0)) * z + lo - o64) * invg)
        tdel = np.where(null, np.inf, z * np.abs(invg))
    grenze = np.full(n, np.inf) if bis is None else np.asarray(bis, dtype=np.float64)
    verdeckt_ab = np.full(n, -np.inf) if bis is None else grenze - 0.02
    ids = np.nonzero(t0 <= t1)[0]
    while len(ids):
        cc = c[ids]
        zl = (cc[:, 0] * nz3[1] + cc[:, 1]) * nz3[2] + cc[:, 2]
        s0 = start[zl]
        cnt = start[zl + 1] - s0
        voll = cnt > 0
        if voll.any():
            cv, sv, rv = cnt[voll], s0[voll], ids[voll]
            tot = int(cv.sum())
            anf = np.cumsum(cv) - cv
            ray = np.repeat(rv, cv)
            box = liste[np.repeat(sv - anf, cv) + np.arange(tot)]
            t = _tein_paare(S, o, d, inv, ray, box)
            schl = np.where(S["parallel"][box], 0, nq) + box
            tmin = np.minimum.reduceat(t, anf)
            schl_m = np.where(t == np.repeat(tmin, cv), schl, GROSS)
            kmin = np.minimum.reduceat(schl_m, anf)
            gewinn = (schl_m == np.repeat(kmin, cv)) & np.isfinite(t)
            wr, wt, wk, wb = ray[gewinn], t[gewinn], schl[gewinn], box[gewinn]
            besser = (wt < t_best[wr]) | ((wt == t_best[wr]) & (wk < k_best[wr]))
            if besser.any():
                wr, wt, wk, wb = wr[besser], wt[besser], wk[besser], wb[besser]
                t_best[wr], k_best[wr], i_best[wr] = wt, wk, wb
                n_best[wr] = _normalen(S, o, d, inv, wr, wb)
        tm = tmax[ids]
        texit = tm.min(axis=1)
        tb = t_best[ids]
        # Sichtprüfung: ein Treffer vor „bis − 2 cm“ heißt verdeckt (wie in _direkt_paket) – mehr braucht es nicht
        weiter = ~((tb < texit - 1e-3) | (texit >= grenze[ids]) | (tb < verdeckt_ab[ids]))
        ids, tm = ids[weiter], tm[weiter]
        ax = tm.argmin(axis=1)
        c[ids, ax] += st[ids, ax]
        tmax[ids, ax] += tdel[ids, ax]
        ids = ids[(c[ids, ax] >= 0) & (c[ids, ax] < nz3[ax])]
    return t_best, i_best, n_best


# ---------------------------------------------------------------- Grafikkarte (moderngl)

_GLSL_KOPF = """
#version 430
layout(local_size_x = 64) in;
struct Quader { vec4 bmin; vec4 bmax; vec4 mitte; vec4 halb; vec4 a0; vec4 a1; vec4 a2; vec4 albedo; };
layout(std430, binding = 0) readonly buffer BQ { Quader Q[]; };
layout(std430, binding = 1) readonly buffer BS { uint ZSTART[]; };
layout(std430, binding = 2) readonly buffer BL { uint ZLISTE[]; };
uniform vec3 r_lo;
uniform float r_zelle;
uniform ivec3 r_n;
uniform uint u_start;
uniform uint u_anzahl;
const float UNENDLICH = 3.0e38;             // „kein Treffer“ (beim Zurücklesen ≥ 1e38 = inf)

vec3 klein7(vec3 v) { return vec3(abs(v.x) < 1e-7 ? 1e-7 : v.x, abs(v.y) < 1e-7 ? 1e-7 : v.y, abs(v.z) < 1e-7 ? 1e-7 : v.z); }

// Eintrittsabstand in Quader k (inf ohne Treffer), dazu nahe Abstände je Achse für die Normale
float tein_quader(uint k, vec3 o, vec3 d, vec3 inv, out vec3 tnah, out vec3 dl) {
    Quader q = Q[k];
    vec3 t1, t2;
    if (q.bmin.w > 0.5) {                       // achsenparallel
        t1 = (q.bmin.xyz - o) * inv;
        t2 = (q.bmax.xyz - o) * inv;
        dl = d;
    } else {                                    // gedreht: in lokale Achsen
        vec3 x = o - q.mitte.xyz;
        vec3 ol = vec3(dot(q.a0.xyz, x), dot(q.a1.xyz, x), dot(q.a2.xyz, x));
        dl = vec3(dot(q.a0.xyz, d), dot(q.a1.xyz, d), dot(q.a2.xyz, d));
        vec3 invl = 1.0 / klein7(dl);
        t1 = (-q.halb.xyz - ol) * invl;
        t2 = (q.halb.xyz - ol) * invl;
    }
    tnah = min(t1, t2);
    vec3 tf = max(t1, t2);
    float te = max(max(tnah.x, tnah.y), tnah.z);
    float ta = min(min(tf.x, tf.y), tf.z);
    return (ta >= te && te > 1e-4) ? te : UNENDLICH;
}

vec3 normale(uint k, vec3 tnah, vec3 dl) {
    int ax = (tnah.x >= tnah.y && tnah.x >= tnah.z) ? 0 : (tnah.y >= tnah.z ? 1 : 2);
    float vorz = -sign(dl[ax]);
    Quader q = Q[k];
    if (q.bmin.w > 0.5) { vec3 n = vec3(0.0); n[ax] = vorz; return n; }
    vec3 a = ax == 0 ? q.a0.xyz : (ax == 1 ? q.a1.xyz : q.a2.xyz);
    return a * vorz;
}

// Nächster Treffer über das Raster. sicht > 0: nur Sichtprüfung bis „sicht“ (true = verdeckt)
bool verfolge(vec3 o, vec3 d, float sicht, out float tbest, out int ibest, out vec3 nbest) {
    tbest = UNENDLICH; ibest = -1; nbest = vec3(0.0);
    vec3 inv = 1.0 / klein7(d);
    vec3 hi = r_lo + vec3(r_n) * r_zelle;
    vec3 ta, tb;
    for (int a = 0; a < 3; a++) {
        if (d[a] == 0.0) { ta[a] = -UNENDLICH; tb[a] = UNENDLICH; }
        else { ta[a] = (r_lo[a] - o[a]) / d[a]; tb[a] = (hi[a] - o[a]) / d[a]; }
    }
    vec3 tn = min(ta, tb), tf = max(ta, tb);
    float t0 = max(max(max(tn.x, tn.y), tn.z), 0.0);
    float t1 = min(min(tf.x, tf.y), tf.z);
    if (t0 > t1) return false;
    ivec3 c = clamp(ivec3(floor((o + d * t0 - r_lo) / r_zelle)), ivec3(0), r_n - 1);
    ivec3 st = ivec3(sign(d));
    vec3 tmax, tdel;
    for (int a = 0; a < 3; a++) {
        if (d[a] == 0.0) { tmax[a] = UNENDLICH; tdel[a] = UNENDLICH; }
        else {
            tmax[a] = (float(c[a] + (st[a] > 0 ? 1 : 0)) * r_zelle + r_lo[a] - o[a]) / d[a];
            tdel[a] = r_zelle / abs(d[a]);
        }
    }
    float grenze = sicht > 0.0 ? sicht : UNENDLICH;
    uint kbest = 0u; vec3 tnb = vec3(0.0), dlb = vec3(0.0);
    for (int schritt = 0; schritt < 1024; schritt++) {
        uint zl = uint((c.x * r_n.y + c.y) * r_n.z + c.z);
        for (uint j = ZSTART[zl]; j < ZSTART[zl + 1u]; j++) {
            uint k = ZLISTE[j];
            vec3 tnah, dl;
            float te = tein_quader(k, o, d, inv, tnah, dl);
            if (te < tbest) {
                if (sicht > 0.0 && te < sicht - 0.02) { tbest = te; return true; }
                tbest = te; kbest = k; tnb = tnah; dlb = dl; ibest = int(k);
            }
        }
        float texit = min(min(tmax.x, tmax.y), tmax.z);
        if (tbest < texit - 1e-3 || texit >= grenze) break;
        int ax = (tmax.x <= tmax.y && tmax.x <= tmax.z) ? 0 : (tmax.y <= tmax.z ? 1 : 2);
        c[ax] += st[ax];
        tmax[ax] += tdel[ax];
        if (c[ax] < 0 || c[ax] >= r_n[ax]) break;
    }
    if (ibest >= 0 && sicht <= 0.0) nbest = normale(kbest, tnb, dlb);
    return false;
}
"""

_GLSL_LICHT = """
uniform vec3 g_min;
uniform float g_schritt;
uniform ivec3 g_n;
layout(std430, binding = 5) readonly buffer BF { float FELD[]; };

// Bestrahlungsstärke aus dem Gitter (trilinear, 6 Richtungen), wie _nachschlagen
vec3 nachschlagen(vec3 p, vec3 nrm) {
    vec3 hoechst = vec3(g_n - 1);
    vec3 g = clamp((p - g_min) / g_schritt - 0.5, vec3(0.0), hoechst - 1e-4);
    ivec3 i0 = ivec3(floor(g));
    vec3 f = g - vec3(i0);
    ivec3 i1 = min(i0 + 1, g_n - 1);
    vec3 erg[6];
    for (int a = 0; a < 6; a++) erg[a] = vec3(0.0);
    for (int dx = 0; dx < 2; dx++) for (int dy = 0; dy < 2; dy++) for (int dz = 0; dz < 2; dz++) {
        int ix = dx == 1 ? i1.x : i0.x, iy = dy == 1 ? i1.y : i0.y, iz = dz == 1 ? i1.z : i0.z;
        float w = (dx == 1 ? f.x : 1.0 - f.x) * (dy == 1 ? f.y : 1.0 - f.y) * (dz == 1 ? f.z : 1.0 - f.z);
        int basis = ((ix * g_n.y + iy) * g_n.z + iz) * 18;
        for (int a = 0; a < 6; a++)
            erg[a] += w * vec3(FELD[basis + a * 3], FELD[basis + a * 3 + 1], FELD[basis + a * 3 + 2]);
    }
    vec3 n2 = nrm * nrm;
    return n2.x * erg[nrm.x > 0.0 ? 0 : 1] + n2.y * erg[nrm.y > 0.0 ? 2 : 3] + n2.z * erg[nrm.z > 0.0 ? 4 : 5];
}
"""

# Direktes Himmelslicht: je Punkt alle Fensterproben (wie _direkt_paket)
_GLSL_DIREKT = """
layout(std430, binding = 3) readonly buffer BP { vec4 PUNKT[]; };      // xyz Punkt
layout(std430, binding = 4) readonly buffer BN { vec4 NORMALE[]; };    // xyz Normale (nur Lichtkarte)
layout(std430, binding = 6) readonly buffer BW { vec4 PROBE[]; };      // xyz Probe, w Fläche je Probe
layout(std430, binding = 7) readonly buffer BWN { vec4 PROBE_N[]; };   // xyz Fensternormale
layout(std430, binding = 8) writeonly buffer BE { vec4 ERG[]; };       // 6 (Gitter) bzw. 1 (Karte) je Punkt
uniform uint u_proben;
uniform int u_gitter;
uniform vec3 himmel_farbe;
uniform vec3 boden_farbe;

vec3 himmel(vec3 w) {
    if (w.y >= 0.0) return ((1.0 + 2.0 * clamp(w.y, 0.0, 1.0)) / 3.0) * himmel_farbe;
    return boden_farbe;
}

void main() {
    uint i = gl_GlobalInvocationID.x;
    if (i >= u_anzahl) return;
    uint pi = u_start + i;
    vec3 p = PUNKT[pi].xyz;
    vec3 nrm = NORMALE[pi].xyz;
    vec3 e[6];
    for (int a = 0; a < 6; a++) e[a] = vec3(0.0);
    for (uint s = 0u; s < u_proben; s++) {
        vec3 dv = PROBE[s].xyz - p;
        float rr = length(dv);
        vec3 w = dv / rr;
        float cosf = dot(w, PROBE_N[s].xyz);
        if (cosf <= 0.0) continue;
        float g[6];
        float gmax;
        if (u_gitter == 1) {
            g[0] = max(w.x, 0.0); g[1] = max(-w.x, 0.0); g[2] = max(w.y, 0.0);
            g[3] = max(-w.y, 0.0); g[4] = max(w.z, 0.0); g[5] = max(-w.z, 0.0);
            gmax = max(max(max(g[0], g[1]), max(g[2], g[3])), max(g[4], g[5]));
        } else {
            g[0] = max(dot(nrm, w), 0.0);
            gmax = g[0];
        }
        if (gmax <= 0.0) continue;
        float t; int idx; vec3 nn;
        if (verfolge(p, w, rr, t, idx, nn)) continue;          // verdeckt
        if (t < rr - 0.02) continue;
        float raumwinkel = PROBE[s].w * cosf / pow(max(rr, 0.05), 2.0);
        vec3 L = himmel(w) * raumwinkel;
        if (u_gitter == 1) { for (int a = 0; a < 6; a++) e[a] += g[a] * L; }
        else e[0] += g[0] * L;
    }
    if (u_gitter == 1) { for (int a = 0; a < 6; a++) ERG[i * 6u + uint(a)] = vec4(e[a], 0.0); }
    else ERG[i] = vec4(e[0], 0.0);
}
"""

# Strahlen des Gitters verfolgen und Treffer auf der Grafikkarte behalten
_GLSL_STRAHLEN = """
layout(std430, binding = 3) readonly buffer BO { vec4 URSPRUNG[]; };   // je Gitterpunkt
layout(std430, binding = 4) readonly buffer BD { vec4 RICHTUNG[]; };   // je Strahl
layout(std430, binding = 6) buffer BT { vec4 TREFFER[]; };             // xyz Trefferpunkt + Normale·Versatz, w Quader (-1)
layout(std430, binding = 7) buffer BTN { vec4 TREFFER_N[]; };          // xyz Normale
uniform uint u_strahlen;
uniform float u_versatz;

void main() {
    uint i = gl_GlobalInvocationID.x;
    if (i >= u_anzahl) return;
    uint s = u_start + i;
    vec3 o = URSPRUNG[s / u_strahlen].xyz;
    vec3 d = RICHTUNG[s].xyz;
    float t; int idx; vec3 nn;
    verfolge(o, d, 0.0, t, idx, nn);
    if (idx >= 0) {
        TREFFER[s] = vec4(o + d * t + nn * u_versatz, float(idx));
        TREFFER_N[s] = vec4(nn, 0.0);
    } else {
        TREFFER[s] = vec4(0.0, 0.0, 0.0, -1.0);
        TREFFER_N[s] = vec4(0.0);
    }
}
"""

# Ein Gitter-Durchgang: zurückgeworfenes Licht je Gitterpunkt aus den gespeicherten Treffern
_GLSL_DURCHGANG = """
layout(std430, binding = 4) readonly buffer BD { vec4 RICHTUNG[]; };
layout(std430, binding = 6) readonly buffer BT { vec4 TREFFER[]; };
layout(std430, binding = 7) readonly buffer BTN { vec4 TREFFER_N[]; };
layout(std430, binding = 8) writeonly buffer BE { vec4 ERG[]; };
uniform uint u_strahlen;

void main() {
    uint i = gl_GlobalInvocationID.x;
    if (i >= u_anzahl) return;
    uint p = u_start + i;
    vec3 e[6];
    for (int a = 0; a < 6; a++) e[a] = vec3(0.0);
    float gew = 4.0 * 3.14159265358979 / float(u_strahlen);
    for (uint r = 0u; r < u_strahlen; r++) {
        uint s = p * u_strahlen + r;
        vec4 h = TREFFER[s];
        if (h.w < 0.0) continue;
        vec3 E = nachschlagen(h.xyz, TREFFER_N[s].xyz);
        vec3 L = Q[uint(h.w)].albedo.xyz * E / 3.14159265358979;
        vec3 w = RICHTUNG[s].xyz;
        e[0] += max(w.x, 0.0) * gew * L; e[1] += max(-w.x, 0.0) * gew * L;
        e[2] += max(w.y, 0.0) * gew * L; e[3] += max(-w.y, 0.0) * gew * L;
        e[4] += max(w.z, 0.0) * gew * L; e[5] += max(-w.z, 0.0) * gew * L;
    }
    for (int a = 0; a < 6; a++) ERG[i * 6u + uint(a)] = vec4(e[a], 0.0);
}
"""

# Lichtkarte, zurückgeworfenes Licht: Halbkugel nach Kosinus, Licht der Trefferflächen aus dem Gitter
_GLSL_SAMMELN = """
layout(std430, binding = 3) readonly buffer BP { vec4 PUNKT[]; };      // xyz Punkt, w Drehwinkel
layout(std430, binding = 4) readonly buffer BN { vec4 NORMALE[]; };
layout(std430, binding = 8) writeonly buffer BE { vec4 ERG[]; };       // xyz E, w freie Sicht
uniform int u_k;
uniform float u_nah;
uniform float u_versatz;

void main() {
    uint i = gl_GlobalInvocationID.x;
    if (i >= u_anzahl) return;
    uint pi = u_start + i;
    vec3 p = PUNKT[pi].xyz;
    float dreh = PUNKT[pi].w;
    vec3 nn = NORMALE[pi].xyz;
    vec3 hilf = abs(nn.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tu = normalize(cross(hilf, nn));
    vec3 tv = cross(nn, tu);
    vec3 E = vec3(0.0);
    float verdeckt = 0.0;
    for (int j = 0; j < u_k; j++) {
        float jj = float(j) + 0.5;
        float rad = sqrt(jj / float(u_k));
        float phi = jj * 3.14159265358979 * (3.0 - sqrt(5.0)) + dreh;
        vec3 d = tu * (rad * cos(phi)) + tv * (rad * sin(phi)) + nn * sqrt(1.0 - rad * rad);
        float t; int idx; vec3 nrm;
        verfolge(p, d, 0.0, t, idx, nrm);
        if (idx < 0) continue;
        vec3 hit = p + d * t;
        E += Q[uint(idx)].albedo.xyz * nachschlagen(hit + nrm * u_versatz, nrm);
        if (t < u_nah) verdeckt += 1.0;
    }
    ERG[i] = vec4(E / float(u_k), 1.0 - verdeckt / float(u_k));
}
"""


class Grafikkarte:
    """Rechenweg über moderngl. Wirft beim Anlegen eine Ausnahme, wenn moderngl oder OpenGL 4.3 fehlt."""

    ZIEL_S = 0.25        # angestrebte Dauer je Aufruf (Windows bricht ab ~2 s ab, TDR)

    def __init__(self, szene: dict):
        import moderngl
        self.ctx = moderngl.create_standalone_context(require=430)
        self.name = self.ctx.info.get("GL_RENDERER", "?")
        S = szene
        nq = len(S["bmin"])
        q = np.zeros((nq, 8, 4), dtype=np.float32)
        q[:, 0, :3], q[:, 0, 3] = S["bmin"], S["parallel"].astype(np.float32)
        q[:, 1, :3], q[:, 2, :3], q[:, 3, :3] = S["bmax"], S["mitte"], S["halb"]
        q[:, 4:7, :3] = S["achsen"]
        q[:, 7, :3] = S["albedo"]
        self.puffer = {}
        self._puffer(0, q)
        self._puffer(1, S["r_start"].astype(np.uint32))
        self._puffer(2, S["r_liste"].astype(np.uint32))
        self.raster = (tuple(float(v) for v in S["r_lo"]), float(S["r_zelle"]), tuple(int(v) for v in S["r_n"]))
        self.prog = {}
        for name, teil in (("direkt", _GLSL_DIREKT), ("strahlen", _GLSL_STRAHLEN),
                           ("durchgang", _GLSL_LICHT + _GLSL_DURCHGANG), ("sammeln", _GLSL_LICHT + _GLSL_SAMMELN)):
            self.prog[name] = self.ctx.compute_shader(_GLSL_KOPF + teil)
        self.zeiten: dict[str, float] = {}

    def _puffer(self, bindung: int, daten: np.ndarray | None, groesse: int = 0):
        alt = self.puffer.pop(bindung, None)
        if alt is not None:
            alt.release()
        if daten is not None:
            b = self.ctx.buffer(np.ascontiguousarray(daten).tobytes())
        else:
            b = self.ctx.buffer(reserve=max(16, groesse))
        b.bind_to_storage_buffer(bindung)
        self.puffer[bindung] = b
        return b

    @staticmethod
    def _setze(prog, **werte):
        for k, v in werte.items():
            u = prog.get(k, None)            # vom Übersetzer entfernte Uniforms überspringen
            if u is not None:
                u.value = v

    def _laufen(self, name: str, anzahl: int, kosten: float, ergebnis: int | None = None, je: int = 0,
                **werte) -> np.ndarray | None:
        """Kernel in Paketen ausführen; Paketgröße nach gemessener Dauer (kosten = geschätzte Strahlen je Element)."""
        prog = self.prog[name]
        lo, zelle, n = self.raster
        self._setze(prog, r_lo=lo, r_zelle=zelle, r_n=n, **werte)
        aus = None
        if ergebnis is not None:
            aus = np.zeros((anzahl, je, 4), dtype=np.float32)
        paket = max(64, int(200_000 / max(kosten, 1)))       # Startwert: ~200 000 Strahlen
        pos = 0
        while pos < anzahl:
            m = min(paket, anzahl - pos)
            if ergebnis is not None:
                buf = self._puffer(ergebnis, None, m * je * 16)
            self._setze(prog, u_start=pos, u_anzahl=m)
            t = time.perf_counter()
            prog.run(group_x=(m + 63) // 64)
            self.ctx.finish()
            dauer = time.perf_counter() - t
            if ergebnis is not None:
                aus[pos:pos + m] = np.frombuffer(buf.read(), dtype=np.float32).reshape(m, je, 4)
            pos += m
            if dauer > 1.0:
                print(f"  Hinweis: ein Aufruf „{name}“ dauerte {dauer:.2f} s – Pakete werden kleiner")
            # nächste Paketgröße so, dass ein Aufruf etwa ZIEL_S dauert (höchstens verdoppeln)
            paket = max(64, min(paket * 2, int(m * self.ZIEL_S / max(dauer, 1e-4)), 65535 * 64))
        return aus

    # -- Phasen

    def direkt(self, punkte: np.ndarray, normalen: np.ndarray | None, proben: np.ndarray, proben_n: np.ndarray,
               himmel_farbe, boden_farbe) -> np.ndarray:
        gitter = normalen is None
        n = len(punkte)
        p4 = np.zeros((n, 4), dtype=np.float32)
        p4[:, :3] = punkte
        n4 = np.zeros((n, 4), dtype=np.float32)
        if not gitter:
            n4[:, :3] = normalen
        self._puffer(3, p4)
        self._puffer(4, n4)
        self._puffer(6, proben.astype(np.float32))
        self._puffer(7, proben_n.astype(np.float32))
        aus = self._laufen("direkt", n, len(proben), ergebnis=8, je=6 if gitter else 1,
                           u_proben=len(proben), u_gitter=1 if gitter else 0,
                           himmel_farbe=tuple(float(v) for v in himmel_farbe),
                           boden_farbe=tuple(float(v) for v in boden_farbe))
        return aus[..., :3].astype(np.float64) if gitter else aus[:, 0, :3].astype(np.float64)

    def strahlen(self, ursprung: np.ndarray, richt: np.ndarray, versatz: float) -> None:
        """Gitterstrahlen verfolgen; Treffer bleiben auf der Grafikkarte (für durchgang)."""
        n, k = richt.shape[:2]
        u4 = np.zeros((n, 4), dtype=np.float32)
        u4[:, :3] = ursprung
        r4 = np.zeros((n * k, 4), dtype=np.float32)
        r4[:, :3] = richt.reshape(-1, 3)
        self._puffer(3, u4)
        self._puffer(4, r4)
        self._puffer(6, None, n * k * 16)
        self._puffer(7, None, n * k * 16)
        self._strahlen_anzahl = (n, k)
        self._laufen("strahlen", n * k, 1, u_strahlen=k, u_versatz=float(versatz))

    def _feld(self, feld: np.ndarray, info, schritt: float, ursprung) -> dict:
        self._puffer(5, feld.astype(np.float32).ravel())
        return {"g_min": tuple(float(v) for v in ursprung), "g_schritt": float(schritt),
                "g_n": tuple(int(v) for v in info)}

    def durchgang(self, feld: np.ndarray, info, schritt: float, ursprung) -> np.ndarray:
        n, k = self._strahlen_anzahl
        werte = self._feld(feld, info, schritt, ursprung)
        aus = self._laufen("durchgang", n, k, ergebnis=8, je=6, u_strahlen=k, **werte)
        return aus[..., :3].astype(np.float64)

    def sammeln(self, punkte: np.ndarray, normalen: np.ndarray, dreh: np.ndarray, feld: np.ndarray, info,
                schritt: float, ursprung, k: int, nah: float, versatz: float):
        n = len(punkte)
        p4 = np.zeros((n, 4), dtype=np.float32)
        p4[:, :3], p4[:, 3] = punkte, dreh
        n4 = np.zeros((n, 4), dtype=np.float32)
        n4[:, :3] = normalen
        self._puffer(3, p4)
        self._puffer(4, n4)
        werte = self._feld(feld, info, schritt, ursprung)
        aus = self._laufen("sammeln", n, k, ergebnis=8, je=1, u_k=int(k), u_nah=float(nah),
                           u_versatz=float(versatz), **werte)
        return aus[:, 0, :3].astype(np.float64), aus[:, 0, 3].astype(np.float64)

    def schliessen(self) -> None:
        for b in self.puffer.values():
            b.release()
        self.puffer.clear()
        self.ctx.release()
