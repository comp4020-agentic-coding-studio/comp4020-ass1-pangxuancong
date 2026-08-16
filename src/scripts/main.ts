import {
  MAX_GUESS,
  PRINCIPAL,
  RATE,
  YEARS,
  compoundSeries,
  formatCurrency,
  pathD,
  valueAtYear,
  yForValue,
} from "./compound";

function setText(el: HTMLElement | null, text: string): void {
  if (el) el.textContent = text;
}

const REVEAL_DURATION_MS = 1600;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

// Draws the actual-curve path stroke over time, and swings the guess line
// from its flat pre-reveal reading up to the linear-growth line at the same
// time, so a visitor watches the real (compound) and assumed (linear) paths
// diverge instead of seeing a finished chart pop in. Driven by a manual rAF
// loop rather than a CSS transition: a CSS transition on stroke-dashoffset
// only animates reliably if the browser paints the "undrawn" state before
// the "drawn" one is applied, which a synchronous style write followed by a
// same-frame change doesn't guarantee. A hand-rolled loop sidesteps that
// entirely and is also easy to keep both lines in lockstep.
//
// JSDOM has no SVG geometry engine, so getTotalLength() throws there (and it
// has no requestAnimationFrame in this project's Vitest setup); either gap
// falls through to setting the final state directly, which is what the spec
// suite asserts on.
function animateReveal(
  actualCurve: SVGPathElement,
  guessMarker: SVGLineElement,
  guessMarkerFromY1: number,
  guessMarkerToY1: number,
): void {
  const finish = (): void => {
    actualCurve.style.strokeDasharray = "";
    actualCurve.style.strokeDashoffset = "";
    guessMarker.setAttribute("y1", String(guessMarkerToY1));
  };

  const view = actualCurve.ownerDocument.defaultView;
  const raf = view?.requestAnimationFrame?.bind(view);
  const reducedMotion = view?.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  let length: number;
  try {
    length = actualCurve.getTotalLength();
  } catch {
    finish();
    return;
  }
  if (!raf || !view || reducedMotion || !Number.isFinite(length) || length <= 0) {
    finish();
    return;
  }

  actualCurve.style.strokeDasharray = `${length}`;
  actualCurve.style.strokeDashoffset = `${length}`;

  const start = view.performance.now();
  const step = (): void => {
    const t = Math.min(1, (view.performance.now() - start) / REVEAL_DURATION_MS);
    const eased = easeOutCubic(t);

    actualCurve.style.strokeDashoffset = `${length * (1 - eased)}`;
    guessMarker.setAttribute(
      "y1",
      String(guessMarkerFromY1 + (guessMarkerToY1 - guessMarkerFromY1) * eased),
    );

    if (t < 1) {
      raf(step);
    } else {
      finish();
    }
  };

  raf(step);
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
  const guessMarkerLabel = doc.querySelector<SVGTextElement>(
    '[data-testid="guess-marker-label"]',
  );
  const actualCurveLabel = doc.querySelector<SVGTextElement>(
    '[data-testid="actual-curve-label"]',
  );
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

    if (guessMarkerLabel) {
      guessMarkerLabel.textContent = formatCurrency(guess);
      guessMarkerLabel.setAttribute("y", y);
    }
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

    actualCurve.setAttribute("d", pathD(series, YEARS, MAX_GUESS));
    actualCurve.classList.remove("is-hidden");
    actualValue.textContent = formatCurrency(last.value);

    if (actualCurveLabel) {
      actualCurveLabel.textContent = formatCurrency(last.value);
      actualCurveLabel.setAttribute("y", String(yForValue(last.value)));
      actualCurveLabel.classList.remove("is-hidden");
    }

    // The guess line stops reading as "your flat guess level" and animates
    // into the linear-growth path a visitor implicitly assumed: a straight
    // line from the real starting principal to their guess at year 30, laid
    // over the real exponential curve so the gap between the two is the
    // point. It swings into place in step with the curve drawing in below.
    animateReveal(
      actualCurve,
      guessMarker,
      yForValue(guess),
      yForValue(PRINCIPAL),
    );

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
    revealButton.disabled = true;

    // Reveal the result a frame late so the browser paints the pre-fade
    // state first — same reason animateReveal above drives strokeDashoffset
    // by hand rather than trusting a same-tick CSS transition to catch it.
    const view = result.ownerDocument.defaultView;
    const raf = view?.requestAnimationFrame?.bind(view);
    if (raf) {
      raf(() => raf(() => result.classList.add("is-revealed")));
    } else {
      result.classList.add("is-revealed");
    }
  });

  doc.body.dataset.ready = "true";
}

// The second chart is a live exploration, not a reveal: it has no hidden
// state and no guess to lock, so it just recomputes and repaints on every
// slider input. Tick *positions* never move (see compound.ts's xFor/yFor —
// a tick drawn at a fixed fraction of the current axis max sits at the same
// pixel regardless of what that max is), so only label text and the path's
// `d` need updating here, never DOM structure.
export function wireExplorer(doc: Document): void {
  const rateSlider = doc.querySelector<HTMLInputElement>(
    '[data-testid="explore-rate-slider"]',
  );
  const yearsSlider = doc.querySelector<HTMLInputElement>(
    '[data-testid="explore-years-slider"]',
  );
  const rateValue = doc.querySelector<HTMLElement>(
    '[data-testid="explore-rate-value"]',
  );
  const yearsValue = doc.querySelector<HTMLElement>(
    '[data-testid="explore-years-value"]',
  );
  const finalValue = doc.querySelector<HTMLElement>(
    '[data-testid="explore-final-value"]',
  );
  const curve = doc.querySelector<SVGPathElement>(
    '[data-testid="explore-curve"]',
  );
  const yTickLabels = doc.querySelectorAll<SVGTextElement>(
    '[data-testid="explore-y-tick-label"]',
  );
  const xTickLabels = doc.querySelectorAll<SVGTextElement>(
    '[data-testid="explore-x-tick-label"]',
  );

  function update(): void {
    if (!rateSlider || !yearsSlider || !curve) return;

    const rate = Number(rateSlider.value) / 100;
    const years = Number(yearsSlider.value);

    setText(rateValue, `${rateSlider.value}%`);
    setText(yearsValue, `${years} ${years === 1 ? "year" : "years"}`);

    const series = compoundSeries(PRINCIPAL, rate, years);
    const last = series.at(-1);
    if (!last) return;

    // The axis max is pinned to the curve's own endpoint, so the line always
    // spans the full plot height exactly — no headroom to compute or clamp.
    const maxValue = last.value;

    curve.setAttribute("d", pathD(series, years, maxValue));
    setText(finalValue, formatCurrency(last.value));

    yTickLabels.forEach((el) => {
      const fraction = Number(el.getAttribute("data-fraction"));
      el.textContent = formatCurrency(maxValue * fraction);
    });
    xTickLabels.forEach((el) => {
      const fraction = Number(el.getAttribute("data-fraction"));
      el.textContent = `Yr ${Math.round(years * fraction)}`;
    });
  }

  rateSlider?.addEventListener("input", update);
  yearsSlider?.addEventListener("input", update);
  update();
}

if (typeof document !== "undefined") {
  wirePredictor(document);
  wireExplorer(document);
}
