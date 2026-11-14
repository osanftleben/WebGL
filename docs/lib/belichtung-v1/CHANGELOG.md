# belichtung – Änderungen

## 1.0.1 – 2026-11-14

- Messbild jetzt 16 Bit (`HalfFloatType`) statt 32 Bit: durchsichtige Teile lassen sich so ohne die
  Erweiterung `EXT_float_blend` überblenden (Firefox-Warnung, fehlt auf manchen Handys). `werte.messart`
  meldet jetzt `'half'` (statt `'float'`) oder `'byte'`. Lässt sich das 16-Bit-Bild nicht lesen,
  fällt die Augenanpassung selbst auf 8 Bit zurück, statt sich auszuschalten.
## 1.0.0 – 2026-11-14

- Erste Version: `augenanpassung.js` – misst die Bildhelligkeit ~4×/s in einem kleinen Messbild
  (asynchron ausgelesen) und führt `toneMappingExposure` weich nach (hell schnell, dunkel langsam,
  begrenzt auf ±30 % um die Grundbelichtung). Abschaltbar, Werte über `werte` und `aufzeichnen()`.
