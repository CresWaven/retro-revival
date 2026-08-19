# Beehiiv HTML Blocks — how to use these

## The most important thing to understand first

**Do not build your email capture form in an HTML block.** A hand-coded `<form>` has nothing to submit to — it will not create subscribers, and you'd silently lose signups.

Split the work like this:

| Use Beehiiv's **native** blocks for | Use these **HTML blocks** for |
|---|---|
| Subscribe forms (the actual email capture) | Ticker / marquee bar |
| Post feeds and the archive | Win98 window cards |
| Nav bar and buttons that link somewhere | CRT terminal card |
| Testimonials, socials, recommendations | Stats band |
| Anything wired to your subscriber data | Perforated dividers |

Native blocks are styleable from the design panel on the right — set your colors, fonts, borders, and shadows there and they'll match these components. HTML blocks are for the *chrome* Beehiiv can't produce natively.

**Set your three fonts globally** in the builder's design panel first (Beehiiv supports any Google Font): Anton, Space Mono, Inter. Then every native block inherits them and matches these components automatically.

## Beehiiv's HTML block rules

These blocks are written to respect all of them ([Beehiiv docs](https://www.beehiiv.com/support/article/40444576905111)):

- ✅ Each file is **one container `<div>`** wrapping everything
- ✅ All CSS is **scoped to a `.tmp-` prefixed class** so it can't leak into the rest of your site
- ❌ No `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` — HTML blocks are fragments injected into an existing page
- ❌ No global resets (`*`, `body`, `html`) — these break the page layout
- ❌ No `100vh` or `position: fixed` — these conflict with the page structure
- ℹ️ 50,000 character limit across the whole editor; split large work across multiple blocks
- ℹ️ `<link>` tags work inside the block even without a `<head>`

## Adding one

1. **Website → Builder**
2. Click **+** in the left panel → under Advanced blocks, drag **HTML** onto the canvas
3. Select the block → **Configure** in the right panel → **Code** tab
4. Paste the file contents → switch to **Preview** tab → **Save**
5. **Publish** (top right) — changes are not live until you publish

**Interactive and animated elements do not run inside the editor** — the ticker will look frozen and broken on the canvas. That's expected. Always check **Preview** mode, not the canvas.

## Files

| File | Where it goes |
|---|---|
| `01-ticker.html` | Very top of the homepage, above the nav |
| `02-crt-card.html` | Hero, right column — beside a native subscribe form |
| `03-window-cards.html` | "What's inside" section |
| `04-stats-band.html` | Below the hero |
| `05-divider.html` | Between any two sections |

## Editing them

Every file starts with a token block:

```css
.tmp-root{
  --paper:#F5F1E8; --ink:#14131A; --blue:#2340C8;
  --red:#E8452C; --yellow:#FFC93C; --teal:#12A594;
}
```

Change a value there and it updates throughout that block. Keep the values identical across all five files or your page will drift out of sync.
