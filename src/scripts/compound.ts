// The fixed scenario the whole page argues from: one principal, one rate,
// one horizon. No controls change these — the point is the gap between a
// guess and this exact number, not a general-purpose calculator.
export const PRINCIPAL = 1000;
export const RATE = 0.1;
export const YEARS = 30;

// Slider ceiling: comfortably above the true final value so the reveal
// doesn't land at the edge of the range.
export const MAX_GUESS = 20000;

// The second, always-live chart: same principal, but the visitor drives rate
// and years directly. Defaults now match the fixed scenario (PRINCIPAL/RATE/
// YEARS) on purpose, so the formula's r and t visibly start at the numbers
// the reveal just explained, then invite the visitor to move away from them.
export const EXPLORE_RATE_MIN = 0.01;
export const EXPLORE_RATE_MAX = 0.15;
export const EXPLORE_RATE_DEFAULT = 0.1;
export const EXPLORE_YEARS_MIN = 1;
export const EXPLORE_YEARS_MAX = 40;
export const EXPLORE_YEARS_DEFAULT = 30;

// Shared fractions both charts' axis ticks are drawn at.
export const TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 320;
// Extra right margin makes room for the on-chart value labels next to each
// line's year-30 endpoint; extra bottom margin makes room for the x-axis
// caption under the tick labels; extra top margin makes room for the y-axis
// caption sitting above the plot. Left margin has to fit the widest tick
// text the explore chart can show (full currency, not the fixed chart's
// "$20k" shorthand — up to "$268,588" at its rate/years ceiling).
export const MARGIN = { top: 24, right: 60, bottom: 48, left: 84 };
export const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
export const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

export interface CompoundPoint {
  year: number;
  value: number;
}

export function valueAtYear(
  principal: number,
  rate: number,
  year: number,
): number {
  return principal * (1 + rate) ** year;
}

export function compoundSeries(
  principal: number,
  rate: number,
  years: number,
): CompoundPoint[] {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    value: valueAtYear(principal, rate, year),
  }));
}

// Generic coordinate mapping, parameterized by the chart's own axis maximums
// rather than the fixed scenario's — the explore chart reuses these with its
// own current rate/years instead of a second copy of the same math.
export function xFor(year: number, maxYears: number): number {
  return MARGIN.left + (year / maxYears) * PLOT_WIDTH;
}

export function yFor(value: number, maxValue: number): number {
  return MARGIN.top + PLOT_HEIGHT - (value / maxValue) * PLOT_HEIGHT;
}

export function xForYear(year: number): number {
  return xFor(year, YEARS);
}

export function yForValue(value: number): number {
  return yFor(value, MAX_GUESS);
}

export function pathD(
  series: CompoundPoint[],
  maxYears: number,
  maxValue: number,
): string {
  return series
    .map(
      ({ year, value }, index) =>
        `${index === 0 ? "M" : "L"} ${xFor(year, maxYears)} ${yFor(value, maxValue)}`,
    )
    .join(" ");
}

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
