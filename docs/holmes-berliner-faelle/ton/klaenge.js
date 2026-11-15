// Selbst erzeugte Klänge (Web Audio) – keine Tondateien.
// Schritte auf Dielen, gedämpfter Straßenlärm mit gelegentlichem Fuhrwerk (Hufe, Räder),
// Papierrascheln, Bleistiftkratzen. Pferdebahnen an der Ecke Friedrich-/Behrenstraße sind belegt (Baedeker 1891);
// die einzelnen Geräusche sind angenommen. Bewusst keine Glocken, Pfiffe o. Ä.

/**
 * @typedef {object} Klaenge
 * @property {() => void} starte AudioContext anlegen bzw. fortsetzen (nach einer Nutzeraktion aufrufen).
 * @property {(an: boolean) => void} setzeAn Ton an/aus.
 * @property {() => boolean} istAn
 * @property {() => void} schritt Ein Schritt auf den Dielen.
 * @property {() => void} papier Papierrascheln (Notizbuch, Hinweiskarte).
 * @property {() => void} bleistift Kurzes Kratzen eines Bleistifts (Schlussfolgerung notiert).
 * @property {(naehe: number) => void} setzeStrassenNaehe 0 = weit von den Straßenfenstern, 1 = direkt davor.
 */

/**
 * Erstellt die Klangerzeugung. Ton entsteht erst nach `starte()` (Browser verlangen eine Nutzeraktion).
 * @param {object} [optionen]
 * @param {boolean} [optionen.an=true]
 * @returns {Klaenge}
 */
export function erstelleKlaenge({ an = true } = {}) {
  /** @type {AudioContext | null} */
  let ctx = null;
  /** @type {GainNode | null} */
  let gesamt = null;
  /** @type {GainNode | null} */
  let strasse = null;
  /** @type {AudioBuffer | null} */
  let rauschen = null;
  let istAn = an;
  let naehe = 0;
  /** @type {number | undefined} */
  let fuhrwerkTimer;

  const LAUTSTAERKE = 0.7;

  /** Weißes Rauschen (2 s), einmal erzeugt und immer wieder verwendet. */
  function rauschpuffer(/** @type {AudioContext} */ c) {
    const puffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const daten = puffer.getChannelData(0);
    for (let i = 0; i < daten.length; i++) daten[i] = Math.random() * 2 - 1;
    return puffer;
  }

  /**
   * Kurzer Rauschstoß durch einen Filter mit Hüllkurve.
   * @param {object} o
   * @param {BiquadFilterType} o.typ @param {number} o.frequenz @param {number} o.guete
   * @param {number} o.dauer Sekunden @param {number} o.pegel @param {number} [o.start] Startzeit
   * @param {AudioNode} [o.ziel]
   */
  function stoss({ typ, frequenz, guete, dauer, pegel, start, ziel }) {
    if (!ctx || !rauschen || !gesamt) return;
    const t = start ?? ctx.currentTime;
    const quelle = ctx.createBufferSource();
    quelle.buffer = rauschen;
    const filter = ctx.createBiquadFilter();
    filter.type = typ;
    filter.frequency.value = frequenz;
    filter.Q.value = guete;
    const huelle = ctx.createGain();
    huelle.gain.setValueAtTime(0, t);
    huelle.gain.linearRampToValueAtTime(pegel, t + 0.005);
    huelle.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    quelle.connect(filter).connect(huelle).connect(ziel ?? gesamt);
    quelle.start(t, Math.random() * 1.5);
    quelle.stop(t + dauer + 0.05);
  }

  /** Ein Fuhrwerk fährt draußen vorbei: Räderrollen und Hufschläge, an- und abschwellend. */
  function fuhrwerk() {
    if (!ctx || !strasse || !rauschen) return;
    const t0 = ctx.currentTime + 0.05;
    const dauer = 3 + Math.random() * 2.5;
    // Räder: tiefes Rumpeln, das an- und abschwillt
    const quelle = ctx.createBufferSource();
    quelle.buffer = rauschen;
    quelle.loop = true;
    const tief = ctx.createBiquadFilter();
    tief.type = 'lowpass';
    tief.frequency.value = 160;
    const huelle = ctx.createGain();
    huelle.gain.setValueAtTime(0, t0);
    huelle.gain.linearRampToValueAtTime(0.5, t0 + dauer * 0.5);
    huelle.gain.linearRampToValueAtTime(0, t0 + dauer);
    quelle.connect(tief).connect(huelle).connect(strasse);
    quelle.start(t0);
    quelle.stop(t0 + dauer + 0.1);
    // Hufschläge im Viertakt, unregelmäßig, lauter in der Mitte der Vorbeifahrt
    let t = t0;
    let schlag = 0;
    while (t < t0 + dauer) {
      const anteil = (t - t0) / dauer;
      const pegel = 0.35 * Math.sin(Math.PI * anteil);
      stoss({ typ: 'bandpass', frequenz: 1400 + Math.random() * 600, guete: 4, dauer: 0.04, pegel, start: t, ziel: strasse });
      t += schlag % 4 === 3 ? 0.22 + Math.random() * 0.04 : 0.1 + Math.random() * 0.03;
      schlag++;
    }
  }

  function planeFuhrwerk() {
    clearTimeout(fuhrwerkTimer);
    fuhrwerkTimer = setTimeout(() => {
      if (ctx && ctx.state === 'running' && istAn) fuhrwerk();
      planeFuhrwerk();
    }, 6000 + Math.random() * 10000);
  }

  function setzeStrassenPegel() {
    if (!ctx || !strasse) return;
    // Durch geschlossene Fenster: insgesamt leise, nahe den Fenstern etwas lauter
    strasse.gain.setTargetAtTime(0.12 + 0.5 * naehe, ctx.currentTime, 0.4);
  }

  return {
    starte() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return;
      }
      const AudioKlasse = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
      if (!AudioKlasse) return;
      ctx = new AudioKlasse();
      rauschen = rauschpuffer(ctx);
      gesamt = ctx.createGain();
      gesamt.gain.value = istAn ? LAUTSTAERKE : 0;
      gesamt.connect(ctx.destination);
      // Straßenlärm: dauerhaftes, stark gedämpftes Rauschen + Fuhrwerke
      strasse = ctx.createGain();
      const daempfung = ctx.createBiquadFilter();
      daempfung.type = 'lowpass';
      daempfung.frequency.value = 900;
      strasse.connect(daempfung).connect(gesamt);
      const grund = ctx.createBufferSource();
      grund.buffer = rauschen;
      grund.loop = true;
      const grundFilter = ctx.createBiquadFilter();
      grundFilter.type = 'lowpass';
      grundFilter.frequency.value = 250;
      const grundPegel = ctx.createGain();
      grundPegel.gain.value = 0.25;
      grund.connect(grundFilter).connect(grundPegel).connect(strasse);
      grund.start();
      setzeStrassenPegel();
      planeFuhrwerk();
    },
    setzeAn(neu) {
      istAn = neu;
      if (ctx && gesamt) gesamt.gain.setTargetAtTime(neu ? LAUTSTAERKE : 0, ctx.currentTime, 0.05);
    },
    istAn: () => istAn,
    schritt() {
      if (!ctx || !istAn) return;
      // Dumpfer Schritt: tiefer Rauschstoß + kurzer tiefer Ton
      stoss({ typ: 'lowpass', frequenz: 500 + Math.random() * 150, guete: 0.7, dauer: 0.09, pegel: 0.5 });
      const t = ctx.currentTime;
      const ton = ctx.createOscillator();
      ton.frequency.setValueAtTime(95, t);
      ton.frequency.exponentialRampToValueAtTime(55, t + 0.08);
      const h = ctx.createGain();
      h.gain.setValueAtTime(0.25, t);
      h.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      ton.connect(h).connect(/** @type {GainNode} */ (gesamt));
      ton.start(t);
      ton.stop(t + 0.12);
      // Gelegentlich ein leises Knarzen der Dielen
      if (Math.random() < 0.12) {
        const knarz = ctx.createOscillator();
        knarz.type = 'sawtooth';
        knarz.frequency.setValueAtTime(260 + Math.random() * 80, t + 0.03);
        knarz.frequency.linearRampToValueAtTime(190, t + 0.22);
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 700;
        band.Q.value = 6;
        const hk = ctx.createGain();
        hk.gain.setValueAtTime(0, t + 0.03);
        hk.gain.linearRampToValueAtTime(0.05, t + 0.08);
        hk.gain.linearRampToValueAtTime(0, t + 0.24);
        knarz.connect(band).connect(hk).connect(/** @type {GainNode} */ (gesamt));
        knarz.start(t + 0.03);
        knarz.stop(t + 0.26);
      }
    },
    papier() {
      if (!ctx || !istAn) return;
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        stoss({ typ: 'bandpass', frequenz: 2500 + Math.random() * 1500, guete: 1.2, dauer: 0.12, pegel: 0.18, start: t + i * 0.06 });
      }
    },
    bleistift() {
      if (!ctx || !istAn) return;
      const t = ctx.currentTime;
      // Zwei Striche (Schreiben, dann Unterstreichen) aus vielen winzigen, hellen Rauschkörnern
      const striche = [
        { start: 0, koerner: 9, abstand: 0.028 },
        { start: 0.34, koerner: 12, abstand: 0.022 },
      ];
      for (const s of striche) {
        for (let i = 0; i < s.koerner; i++) {
          stoss({
            typ: 'bandpass',
            frequenz: 3200 + Math.random() * 1800,
            guete: 2.5,
            dauer: 0.035,
            pegel: 0.07 + Math.random() * 0.05,
            start: t + s.start + i * s.abstand,
          });
        }
      }
    },
    setzeStrassenNaehe(wert) {
      const neu = Math.max(0, Math.min(1, wert));
      if (Math.abs(neu - naehe) < 0.02) return;
      naehe = neu;
      setzeStrassenPegel();
    },
  };
}
