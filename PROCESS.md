# Process overview

A reading-guide to how this came together, not an essay about it.

## What I built

A guess-and-reveal explainer for compound interest: a visitor first guesses
what $1,000 becomes after 30 years at 10% a year, then reveals the actual
compound curve against their (almost always too-linear) guess, followed by a
plain-language explanation of why linear intuition gets this wrong, the
formula behind the curve, and a live explore chart where they can drag rate
and years themselves. A light/dark "night edition" toggle and an editorial,
newspaper-style visual treatment run through the whole page.

## The moments that mattered

### 1. An animation that "passed" but never actually played

This is the second or third time this exact failure has bitten me this
course: Claude writes an animation, the build and tests come back green, and
it reports the work done — without ever having actually watched the
animation run. Here, the reveal curve was supposed to draw itself in when you
click Reveal. It didn't. The CSS transition it wrote collapsed into a single
paint, so the curve just snapped straight to its final shape with nothing
visible in between, and nothing in the check suite caught that because
nothing in the check suite looks at a rendered page.

Instead of just re-prompting to fix this one animation, I turned it into a
standing rule: before writing any animation, clarify duration, trigger, and
`prefers-reduced-motion` behaviour first; after writing it, verify it in an
actual browser (devtools or a screenshot) instead of trusting a green build.
That rule is now in `CLAUDE.md`, so it applies to every animation from here
on, not just this one.

[`b20610d`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-pangxuancong/commit/b20610d7527aed0ac8ec16d4a3c79fae74c01092)
replaced the transition with a manual `requestAnimationFrame` loop and is the
fix itself;
[`f5a84ed`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-pangxuancong/commit/f5a84ed410b8cea0a060e5ca840bd1af187059e3)
is the `CLAUDE.md` rule it produced.

### 2. A toggle that looked fine and ate its own clicks

Added a light/dark edition switch next to the nav. Visually it was
indistinguishable from working: track, thumb, and label all rendered
exactly where they should. It just didn't do anything when clicked.

Rather than trust the screenshot, I ran Playwright click-testing against it
as part of verification, and that's what actually caught it — the
visually-hidden checkbox and its visible track had landed on the same paint
tier inside the flex nav, and the track (later in DOM order) was silently
eating every click before it reached the input. Fixed with an explicit
z-index on the input. Looking right and being right turned out to be two
different questions here, and only one of them shows up in a screenshot.

[`7877107`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-pangxuancong/commit/787710790ccde33911d80d3aa109f06cc07bbbc7)

### 3. The two graded viewports aren't "big" and "small" of the same layout

First time this one has actually bitten me. While checking the page at the
two viewports this course marks against — 1920×1080 and 390×844, not
"responsive in general" — I found two separate real bugs that a generic
resize test wouldn't have surfaced: the explore section's slider labels
wrapped awkwardly at 390px width, and at 1920px the y-axis caption
overlapped the currency tick labels once the sliders were pushed to their
extreme values. Both fixed.

What I'm still deciding is whether this needs a standing rule the way the
animation bug did. I've drafted one but haven't committed it yet, since this
is only the first time it's come up and I want to see whether the pattern
actually repeats before I write a permanent rule against it:

> The two target marking viewports are:
>
> - Desktop: 1920 × 1080
> - Phone: 390 × 844
>
> Treat these as first-class layouts, not just scaled versions of one
> another.
>
> For 1920 × 1080:
> - use the available horizontal space intentionally
> - keep prose narrow for readability
> - allow charts and major interactive modules to expand substantially wider
> - avoid the appearance of a mobile-width column floating in the center of a
>   large screen
>
> For 390 × 844:
> - use a clean single-column layout
> - keep comfortable side padding
> - ensure sliders, buttons, charts, legends, formula, and explanatory text
>   remain readable and usable
> - do not shrink typography excessively

[`e12ab9c`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-pangxuancong/commit/e12ab9c9751ce66aba3e3ce60fd89b68ecd10ab4)
