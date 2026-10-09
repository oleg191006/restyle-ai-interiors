# ADR 0013: Editorial redesign within the performance budget

- Status: accepted
- Date: 2026-10-09

## Context

The site worked but looked like a tidy draft: a text-only home page while 21 before/after pairs
sat unused on landing pages, a header with no navigation, room and style cards that were grey
boxes and colour strips, and a tool built from browser-default controls (a "Choose file" input,
two `<select>`s with style names people do not know). The redesign had to keep every earlier
constraint: static pages, Lighthouse CI budgets on the median of five mobile runs (LCP ≤ 2.5 s,
CLS ≤ 0.1, TBT ≤ 200 ms, JS ≤ 200 KB), real 404s, no third-party scripts.

A mock-up was agreed first (canvas artboards: home, tool, landing, home on a phone), then built.

## Decision

**An editorial look**: warm paper background, ink text, one terracotta accent, Playfair Display
for headings only, large real photos, and an interactive before/after slider wherever a pair
exists. Colours are tokens in `globals.css` for light and dark; `--on-accent` exists because the
dark-mode accent is light and white text on it was 2.6:1.

Page by page:

- **Header**: navigation (styles, rooms, pricing), account, language, a primary "Try it" button.
  Plain links: still no session read while rendering (ADR 0010).
- **Home**: the slider on a real pair in the first screen, three steps, "one room, many
  characters" (the living room in every style that has an example), rooms as photo cards, and
  the plans with limits from `lib/entitlements.ts` and the price from Stripe (hidden without it).
- **Tool**: a drop zone, rooms as chips and styles as cards with the example for the chosen room
  (palette swatches where none exists), six styles first and "show all"; progress steps during
  generation; the result in the slider with Download and "another style". Rooms and styles are
  radio inputs styled as chips and cards, so keyboard, screen readers and tests keep working.
- **Landing pages**: title and call to action beside the slider; palette and materials as cards;
  numbered tips; FAQ as `<details>` (the answers stay in the HTML); other styles as photo cards;
  a closing call to action.
- **Hubs and account**: the same card and heading system.

## What the budget changed

Every step was measured with the CI configuration. The first version of the home page failed:

| Step | Home LCP (median, /uk · /en) | Finding |
| --- | --- | --- |
| First build | 3.0 · 3.0 s | FCP and Speed Index were 0.78 s; LCP "render delay" 2.3 s |
| Real Chrome, 4× CPU | 0.65 s | No re-render or late paint: the 3 s is Lighthouse's network model |
| `content-visibility: auto` below the fold | 2.64 · 2.77 s | 9 lazy gallery images had started before LCP |
| LCP image at high priority | 2.67 · 2.77 s | It was requested at Low; fixed, little effect |
| Hero images at quality 60 | 2.63 · 2.78 s | Image bytes were not the problem |
| Without the heading font (control) | 2.42 · 2.58 s | The font costs ~250 ms of lab LCP |
| Below-fold images mounted near the viewport | 2.57 · 2.53 s | /en had been loading them: shorter text, closer sections |
| **Playfair on wide screens only** | **2.30 · 2.22 s** | No font files on phones |

Lessons recorded here because they are not obvious:

1. **Lab LCP is a model.** Lighthouse's simulated throttling estimates LCP from every request
   that started before LCP in the unthrottled trace. Below-the-fold lazy images that Chrome
   starts early (within ~1,250 px) count against LCP even though they never delay the paint.
   The fix is to not start them, not to make them smaller.
2. **`NearViewport`** mounts decorative images only when their card is within 300 px of the
   viewport (IntersectionObserver). Links and text stay in the server HTML; the same images are
   on the landing pages and in the image sitemap.
3. **`content-visibility: auto`** on below-the-fold sections keeps their layout and paint off the
   main thread until they are near: without it the home page's median TBT was 202 ms (over
   budget), with it ~130 ms. Side effect: full-page screenshots show
   those sections blank until scrolled; real scrolling renders them.
4. **The heading font is a per-device choice.** next/font self-hosts Playfair; it is referenced
   only above 1024 px (`--heading-font`), so phones never download it and use the system serif
   (New York on iOS, Noto Serif on Android). Not preloaded; `display: swap` with next/font's
   metric-matched fallback keeps the swap free of layout shift on desktop.
5. **A static page that reads the query string.** The tool reads `?room=&style=` with
   `useSearchParams`, which on a prerendered page renders the Suspense fallback on the server.
   An empty fallback let the form appear only in the browser and push the page down (CLS 0.157).
   Making the fallback the same form at its defaults fixed CLS, but React then swapped the
   fallback for the real form after hydration, and a photo picked in that moment was lost (an
   e2e test caught it). Final version: one form, no Suspense; it reads `location.search` through
   `useSyncExternalStore` (empty on the server, the real query in the browser) and derives the
   selection from it until the person picks. CLS 0, nothing swapped.
6. **Two buttons with the same name** ("Try another style" for regenerate and for scrolling to
   the styles) were found by an e2e locator, and were confusing for people too: the form's
   button became "Generate again".

## Consequences

- `CompareSlider` is under a kilobyte of client JS; the two images are server-rendered. The range
  input is transparent and the handle is a plain element styled by `peer-focus-visible`: restyling
  the native thumb through `::-webkit-slider-thumb` left the blue system slider visible in one browser.
- Mobile and desktop headings use different typefaces by design.
- The home page has three new client islands per below-fold card (`NearViewport`); fine at
  nine cards, worth revisiting if a page grows to dozens.
- `BeforeAfter` and `Palette` components were removed; `ExampleThumb` serves all hub cards.
