// Spielstand von Fall 1 im Browser speichern (localStorage). Nichts verlässt das Gerät.
// Ist das Speichern nicht erlaubt (z. B. privater Modus), läuft das Spiel ohne Speicherstand weiter.

const SCHLUESSEL = 'holmes-berliner-faelle/fall1';
const VERSION = 1;

/**
 * @typedef {object} Spielstand
 * @property {string[]} hinweise Gefundene Hinweise in der Reihenfolge des Findens
 * @property {string[]} aussagen Kennungen der Aussagen im Notizbuch
 * @property {string[]} fragen Bereits gestellte Fragen
 * @property {{ x: number, z: number, blick: number }} [ort] Standort und Blickrichtung
 */

/** @param {unknown} wert */
const istTextListe = (wert) => Array.isArray(wert) && wert.every((x) => typeof x === 'string');

/**
 * Lädt den gespeicherten Spielstand oder `null`, wenn keiner da ist oder er nicht passt.
 * @returns {Spielstand | null}
 */
export function ladeSpielstand() {
  try {
    const text = localStorage.getItem(SCHLUESSEL);
    if (!text) return null;
    const d = JSON.parse(text);
    if (!d || d.version !== VERSION) return null;
    if (!istTextListe(d.hinweise) || !istTextListe(d.aussagen) || !istTextListe(d.fragen)) return null;
    /** @type {Spielstand} */
    const stand = { hinweise: d.hinweise, aussagen: d.aussagen, fragen: d.fragen };
    const o = d.ort;
    if (o && [o.x, o.z, o.blick].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      stand.ort = { x: o.x, z: o.z, blick: o.blick };
    }
    return stand;
  } catch {
    return null;
  }
}

/**
 * Speichert den Spielstand (Fehler werden still übergangen).
 * @param {Spielstand} stand
 */
export function speichereSpielstand(stand) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ version: VERSION, ...stand }));
  } catch {
    // Speichern nicht möglich – Spiel läuft ohne Speicherstand weiter.
  }
}

/** Löscht den Spielstand (für „Fall neu beginnen“). */
export function loescheSpielstand() {
  try {
    localStorage.removeItem(SCHLUESSEL);
  } catch {
    // nichts zu tun
  }
}

const TON_SCHLUESSEL = 'holmes-berliner-faelle/ton';

/** @returns {boolean} true, wenn der Ton an sein soll (Vorgabe: an) */
export function ladeTonAn() {
  try {
    return localStorage.getItem(TON_SCHLUESSEL) !== 'aus';
  } catch {
    return true;
  }
}

/** @param {boolean} an */
export function speichereTonAn(an) {
  try {
    localStorage.setItem(TON_SCHLUESSEL, an ? 'an' : 'aus');
  } catch {
    // nichts zu tun
  }
}
