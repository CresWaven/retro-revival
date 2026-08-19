# The Millennial Plug 🔌 — Site Design

A professional-but-nostalgic redesign for [The Millennial Plug](https://themillennialplug.beehiiv.com/), a 90s/Y2K nostalgia newsletter.

### 👉 [View the live mockup](https://creswaven.github.io/retro-revival/millennial-plug/preview.html)

---

## The idea in one line

> **Nostalgia lives in the chrome, never in the content.**

Window frames, chunky beveled buttons, scanlines, ticker bars — chrome. Headlines and body copy stay clean and modern. That contrast is what separates *designed* from *costume*, and it's exactly how [Big Desk Energy](https://mail.bigdeskenergy.com/) pulls off Windows 98 styling while still reading as a serious publication.

## Files

| File | What it is |
|---|---|
| [`preview.html`](preview.html) | Full homepage mockup, self-contained. Edit the `:root` token block at the top to try variations. |
| [`BRAND-SYSTEM.md`](BRAND-SYSTEM.md) | Palette, type system, spacing, homepage section order, guardrails |
| [`beehiiv-blocks/`](beehiiv-blocks/) | Paste-ready components for Beehiiv HTML blocks, style-scoped so they can't leak |
| [`TUTORIALS.md`](TUTORIALS.md) | Curated learning path — 41 minutes to cover most of the gap. All links verified. |

## The system

**Color** — warm newsprint base, one primary, three accents used sparingly:

`#F5F1E8` paper · `#EAE3D2` band · `#14131A` ink · `#2340C8` blue (primary) · `#E8452C` red · `#FFC93C` yellow · `#12A594` teal

Never pure `#FFF` or pure `#000`. That one swap does most of the work.

**Type** — three fonts, strict non-overlapping roles:

- **Anton** — headlines, logo, big stat numbers. Never body copy.
- **Space Mono** (700, uppercase, wide tracking) — eyebrows, buttons, tags, dates. The MVP: retro-computer *and* editorial at 12px.
- **Inter** — every paragraph. Reading measure capped at 680px.

**Structure** — 2px black borders, hard offset shadows with **zero blur** (`4px 4px 0`), 4px radius, 8pt spacing grid.

## Start here

1. Open the [live mockup](https://creswaven.github.io/retro-revival/millennial-plug/preview.html)
2. Read `BRAND-SYSTEM.md` §4 for the homepage section order
3. Use **native** Beehiiv blocks for anything that captures email — a hand-coded form has nothing to submit to and would silently lose signups. Use `beehiiv-blocks/` for the retro chrome only.
4. Build the **Advertise** page. With 1.5M+ followers, that's the one with revenue attached.
