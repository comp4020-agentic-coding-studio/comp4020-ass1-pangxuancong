import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  compoundSeries,
  PRINCIPAL,
  RATE,
  YEARS,
} from "../src/scripts/compound";
import { wirePredictor } from "../src/scripts/main";

// This file turns the assignment-1 spec line "the visitor does something
// that changes what they see" into a contract: a single-round guess, a
// live readout while dragging, and a one-way reveal that locks the guess.
// It runs against the BUILT page (dist/index.html), same as invariants.test.ts.
const distPath = resolve("dist/index.html");

describe("assignment-1: compound-interest predictor", () => {
  it("built the page", () => {
    expect(existsSync(distPath)).toBe(true);
  });

  const html = readFileSync(distPath, "utf8");

  it("ships exactly one action, and the result starts hidden", () => {
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector('[data-testid="guess-slider"]')).toBeTruthy();
    expect(doc.querySelector('[data-testid="guess-value"]')).toBeTruthy();

    const reveal = doc.querySelector<HTMLButtonElement>(
      '[data-testid="reveal-button"]',
    );
    expect(reveal?.disabled).toBe(false);

    // No reset/replay control anywhere on the page — a single round is the
    // whole design, not one option among several.
    expect(doc.querySelectorAll("button").length).toBe(1);

    expect(
      doc.querySelector('[data-testid="result"]')?.hasAttribute("hidden"),
    ).toBe(true);
    expect(
      doc
        .querySelector('[data-testid="actual-curve"]')
        ?.classList.contains("is-hidden"),
    ).toBe(true);
  });

  describe("the interaction", () => {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    wirePredictor(doc);

    const slider = doc.querySelector<HTMLInputElement>(
      '[data-testid="guess-slider"]',
    )!;
    const guessValue = doc.querySelector('[data-testid="guess-value"]')!;
    const revealButton = doc.querySelector<HTMLButtonElement>(
      '[data-testid="reveal-button"]',
    )!;
    const actualCurve = doc.querySelector('[data-testid="actual-curve"]')!;
    const result = doc.querySelector('[data-testid="result"]')!;

    it("updates the guess readout live, before any reveal", () => {
      slider.value = "5000";
      slider.dispatchEvent(new dom.window.Event("input", { bubbles: true }));

      expect(guessValue.textContent).toContain("5,000");
      expect(actualCurve.classList.contains("is-hidden")).toBe(true);
      expect(result.hasAttribute("hidden")).toBe(true);
      expect(slider.disabled).toBe(false);
    });

    it("reveals the true curve and value on the reveal action, and locks the guess", () => {
      revealButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

      expect(actualCurve.classList.contains("is-hidden")).toBe(false);
      expect(actualCurve.getAttribute("d")).not.toBe("");
      expect(result.hasAttribute("hidden")).toBe(false);
      expect(slider.disabled).toBe(true);
    });
  });
});

describe("compoundSeries", () => {
  it("compounds annually and matches this page's stated scenario", () => {
    const series = compoundSeries(PRINCIPAL, RATE, YEARS);
    expect(series[0]).toEqual({ year: 0, value: PRINCIPAL });

    const last = series.at(-1)!;
    expect(last.year).toBe(YEARS);
    expect(last.value).toBeCloseTo(PRINCIPAL * (1 + RATE) ** YEARS, 5);
  });
});
