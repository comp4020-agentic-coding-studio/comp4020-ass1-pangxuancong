import {
  PRINCIPAL,
  RATE,
  YEARS,
  compoundSeries,
  formatCurrency,
  xForYear,
  yForValue,
} from "./compound";

// Exported so spec/assignment-1.test.ts can wire a JSDOM document directly,
// rather than trying to execute this file's bundled build output.
export function wirePredictor(doc: Document): void {
  const slider = doc.querySelector<HTMLInputElement>(
    '[data-testid="guess-slider"]',
  );
  const guessValue = doc.querySelector<HTMLElement>(
    '[data-testid="guess-value"]',
  );
  const guessMarker = doc.querySelector<SVGLineElement>(
    '[data-testid="guess-marker"]',
  );
  const revealButton = doc.querySelector<HTMLButtonElement>(
    '[data-testid="reveal-button"]',
  );
  const actualCurve = doc.querySelector<SVGPathElement>(
    '[data-testid="actual-curve"]',
  );
  const actualValue = doc.querySelector<HTMLElement>(
    '[data-testid="actual-value"]',
  );
  const result = doc.querySelector<HTMLElement>('[data-testid="result"]');

  function updateGuess(): void {
    if (!slider || !guessValue || !guessMarker) return;
    const guess = Number(slider.value);
    guessValue.textContent = formatCurrency(guess);
    const y = String(yForValue(guess));
    guessMarker.setAttribute("y1", y);
    guessMarker.setAttribute("y2", y);
  }

  slider?.addEventListener("input", updateGuess);
  updateGuess();

  revealButton?.addEventListener("click", () => {
    if (!slider || !actualCurve || !actualValue || !result) return;

    const series = compoundSeries(PRINCIPAL, RATE, YEARS);
    const last = series.at(-1);
    if (!last) return;

    const d = series
      .map(
        ({ year, value }, index) =>
          `${index === 0 ? "M" : "L"} ${xForYear(year)} ${yForValue(value)}`,
      )
      .join(" ");

    actualCurve.setAttribute("d", d);
    actualCurve.classList.remove("is-hidden");
    actualValue.textContent = formatCurrency(last.value);
    result.removeAttribute("hidden");
    slider.disabled = true;
  });

  doc.body.dataset.ready = "true";
}

if (typeof document !== "undefined") {
  wirePredictor(document);
}
