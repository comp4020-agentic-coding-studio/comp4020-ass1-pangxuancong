// The fixed scenario the whole page argues from: one principal, one rate,
// one horizon. No controls change these — the point is the gap between a
// guess and this exact number, not a general-purpose calculator.
export const PRINCIPAL = 1000;
export const RATE = 0.1;
export const YEARS = 30;

// Slider ceiling: comfortably above the true final value so the reveal
// doesn't land at the edge of the range.
export const MAX_GUESS = 20000;

export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 320;
export const MARGIN = { top: 16, right: 16, bottom: 32, left: 64 };
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

export function xForYear(year: number): number {
  return MARGIN.left + (year / YEARS) * PLOT_WIDTH;
}

export function yForValue(value: number): number {
  return MARGIN.top + PLOT_HEIGHT - (value / MAX_GUESS) * PLOT_HEIGHT;
}

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
