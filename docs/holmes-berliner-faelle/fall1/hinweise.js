// Fall 1 „Die Leiche im Panoptikum“: Hinweise (Texte erfunden, Spielhandlung).
// Reihenfolge = Nummer im Entwurf; im Notizbuch erscheinen sie in der Reihenfolge des Findens.

/**
 * @typedef {object} Hinweis
 * @property {string} id
 * @property {string} titel
 * @property {string} ort Fundort, kurz
 * @property {string} text Sigersons Beobachtung
 */

/** @type {Hinweis[]} */
export const HINWEISE = [
  {
    id: 'figur-werkstatt',
    titel: 'Die fehlende Figur',
    ort: 'Werkstatt',
    text:
      'Unter dem Leinentuch liegt die Wachsfigur, deren Platz im Saal der Tote einnimmt – ohne ihr Kostüm. ' +
      'Jemand hat sie in der Nacht hierher getragen. Wer das tat, kannte das Haus und besaß einen Schlüssel.',
  },
  {
    id: 'wachs-fingernaegel',
    titel: 'Wachs unter den Fingernägeln',
    ort: 'Schreckenskammer, an der Leiche',
    text:
      'Unter den Nägeln der rechten Hand sitzt dunkles, hartes Wachs. Es gleicht nicht dem hellen Wachs, ' +
      'aus dem die Figuren geformt sind. Kurz vor seinem Ende hatte der Tote etwas anderes in den Händen.',
  },
  {
    id: 'wachsplatte',
    titel: 'Wachsplatte, Späne und Gießlöffel',
    ort: 'Werkstatt, auf der Werkbank',
    text:
      'In der dunklen Wachsplatte sind die Bärte mehrerer Schlüssel abgedrückt. Daneben liegen frische ' +
      'Messingspäne und ein Gießlöffel mit Metallresten. Hier hat jemand Schlüssel nachgegossen – und gewiss nicht für das Panoptikum.',
  },
];

/**
 * Sucht einen Hinweis nach seiner Kennung.
 * @param {string} id
 * @returns {Hinweis | undefined}
 */
export function findeHinweis(id) {
  return HINWEISE.find((h) => h.id === id);
}
