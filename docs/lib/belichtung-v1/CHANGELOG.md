# belichtung – Änderungen

## 1.0.0 – 2026-11-14

- Erste Version: `augenanpassung.js` – misst die Bildhelligkeit ~4×/s in einem kleinen Messbild
  (asynchron ausgelesen) und führt `toneMappingExposure` weich nach (hell schnell, dunkel langsam,
  begrenzt auf ±30 % um die Grundbelichtung). Abschaltbar, Werte über `werte` und `aufzeichnen()`.
