import {
  PRINCIPAL,
  RATE,
  YEARS,
  compoundSeries,
  formatCurrency,
  valueAtYear,
  xForYear,
  yForValue,
} from "./compound";

function setText(el: HTMLElement | null, text: string): void {
  if (el) el.textContent = text;
}

// Draws the actual-curve path stroke over time rather than popping it in at
// full length, so a visitor can watch the growth happen instead of just
// reading a finished chart. JSDOM has no SVG geometry engine, so
// getTotalLength() throws there; falling back to an instant reveal keeps the
// spec suite (which never runs a real animation frame) correct either way.
function animateCurveDraw(path: SVGPathElement): void {
  let length: number;
  try {
    length = path.getTotalLength();
  } catch {
    return;
  }
  if (!Number.isFinite(length) || length <= 0) return;

  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;

  const view = path.ownerDocument.defaultView;
  const raf = view?.requestAnimationFrame?.bind(view);
  if (!raf) {
    path.style.strokeDashoffset = "0";
    return;
  }
  raf(() => {
    path.style.strokeDashoffset = "0";
  });
}

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
  const firstStart = doc.querySelector<HTMLElement>(
    '[data-testid="explain-first-start"]',
  );
  const firstEnd = doc.querySelector<HTMLElement>(
    '[data-testid="explain-first-end"]',
  );
  const firstGain = doc.querySelector<HTMLElement>(
    '[data-testid="explain-first-gain"]',
  );
  const lastStart = doc.querySelector<HTMLElement>(
    '[data-testid="explain-last-start"]',
  );
  const lastEnd = doc.querySelector<HTMLElement>(
    '[data-testid="explain-last-end"]',
  );
  const lastGain = doc.querySelector<HTMLElement>(
    '[data-testid="explain-last-gain"]',
  );

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
    if (!slider || !actualCurve || !actualValue || !result || !guessMarker) {
      return;
    }

    const guess = Number(slider.value);
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
    animateCurveDraw(actualCurve);
    actualValue.textContent = formatCurrency(last.value);

    // The guess line stops reading as "your flat guess level" and becomes
    // the linear-growth path a visitor implicitly assumed: a straight line
    // from the real starting principal to their guess at year 30, laid over
    // the real exponential curve so the gap between the two is the point.
    guessMarker.setAttribute("y1", String(yForValue(PRINCIPAL)));
    guessMarker.setAttribute("y2", String(yForValue(guess)));

    const firstDecadeEnd = valueAtYear(PRINCIPAL, RATE, 10);
    const lastDecadeStart = valueAtYear(PRINCIPAL, RATE, 20);

    setText(firstStart, formatCurrency(PRINCIPAL));
    setText(firstEnd, formatCurrency(firstDecadeEnd));
    setText(firstGain, formatCurrency(firstDecadeEnd - PRINCIPAL));
    setText(lastStart, formatCurrency(lastDecadeStart));
    setText(lastEnd, formatCurrency(last.value));
    setText(lastGain, formatCurrency(last.value - lastDecadeStart));

    result.removeAttribute("hidden");
    slider.disabled = true;
  });

  doc.body.dataset.ready = "true";
}

if (typeof document !== "undefined") {
  wirePredictor(document);
}
