# Agent Instructions — infrabyfrancis.me Portfolio

This is a **static personal portfolio and engineering blog** built with HTML, CSS, JavaScript, and Node.js build scripts.

## Quick Start

```bash
npm run build        # Regenerate blog listings from articles.json
npm run start        # Local preview at http://localhost:8080
npm run build:all    # Alias for build
```

## Project Structure

```
assets/              Shared CSS (tokens, base, home, blog, article) + site.js
assets/icons/        Vendored AWS Architecture Icons + brand SVGs for the service architecture diagram
assets/favicon.svg   Browser tab icon (dark tile + orange `>_` prompt); PNGs are
                     raster fallbacks — regenerate with sharp, see Design System
blog/
  index.html         Blog index (filters, featured, listings; markers filled by build)
  *.html             Published article pages
  *.md               Optional markdown drafts (coexist with .html)
articles.json        Blog manifest: filters, featured article, all published posts
design/              Reference designs incl. the service architecture source (not published)
images/              Article images
index.html           Homepage (single-page SRE site; includes blog preview cards)
scripts/
  build.mjs          Generates blog/index.html + index.html listings from articles.json
  generate-css.mjs   Legacy extractor, unused (CSS is edited directly)
  fix-article-heads.mjs  Patches article header structure
  patch-html.mjs     General HTML patching utilities
  relocate-blog.mjs  Helpers for moving articles
```

## Design System

Single dark-first design system (orange accent, JetBrains Mono + Space Grotesk).
The nav theme toggle switches light/dark, persists the choice in `localStorage`
(`theme`), and falls back to the OS preference when unset. Every page runs a
small inline script before its stylesheets so the stored theme applies without
a flash. A page can still force a theme with `<html data-theme="light">` or
`<html data-theme="dark">`.

- `assets/tokens.css` — Palette, fonts, spacing, legacy token aliases
- `assets/base.css` — Reset, grid background, nav, footer, buttons, cards, reveal
- `assets/home.css` — Homepage hero, terminal, stats, interactive architecture, timeline, cards
- `assets/blog.css` — Blog index header, filters, featured block, article grid
- `assets/article.css` — Article hero, prose, code, callouts, diagrams, author card
- `assets/site.js` — Scroll reveal, blog filters, homepage terminal typing, QC domain picker, theme toggle

### Favicon

`assets/favicon.svg` is the canonical icon (32×32 art: `#0b0d10` tile, `#ff7a1a`
chevron, light underscore — the `~/francis` terminal prompt). Every page links
the SVG plus PNG fallbacks for browsers without SVG favicon support:

```html
<link rel="icon" href="assets/favicon.svg?v=…" type="image/svg+xml" />
<link rel="icon" href="assets/favicon-32.png?v=…" sizes="32x32" type="image/png" />
<link rel="icon" href="assets/favicon-16.png?v=…" sizes="16x16" type="image/png" />
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png?v=…" />
<meta name="theme-color" content="#0b0d10" />
```

Blog pages use the `../assets/` prefix. If you edit the SVG, re-rasterise the
PNGs and bump the `?v=` value:

```bash
npx sharp-cli -i assets/favicon.svg -o assets/favicon-32.png resize 32 32
npx sharp-cli -i assets/favicon.svg -o assets/favicon-16.png resize 16 16
npx sharp-cli -i assets/apple-touch-icon.svg -o assets/apple-touch-icon.png resize 180 180
```

Legacy token names (`--text`, `--accent`, `--border`, `--bg2`, …) are aliases in
`tokens.css`, so article components keep working. Prefer the newer names
(`--tx`, `--ac`, `--line`, `--panel`) in new CSS.

### Page shell

Every page uses the same shell:

```html
<nav>
  <div class="wrap">
    <b>~/francis</b>
    <a href="…">topology</a> … <a href="…" class="active">writing</a>
  </div>
</nav>
<main class="wrap">…</main>
<footer>© 2026 Francis Morkeh Mensah · built with care, deployed without drama</footer>
<script src="…/assets/site.js" defer></script>
```

Blog pages link `../assets/tokens.css`, `base.css`, then `blog.css` or
`article.css`, all with the same `?v=` cache-busting value.

## Publishing an Article

See [PUBLISHING.md](./PUBLISHING.md) for complete workflow. Quick summary:

1. **Create** `blog/your-article-slug.html` (copy from existing post)
2. **Set canonical URL** to `https://infrabyfrancis.me/blog/your-article-slug.html`
3. **Register in `articles.json`**:
   - `href`: filename only (e.g. `your-article-slug.html`)
   - `tag`, `title`, `excerpt`, `year`, `readMinutes`, `filters`
   - `homePreview: true` to show on homepage (limit ~4 cards)
   - `homeTag`: optional homepage card label
4. **Optional**: Update top-level `featured` object to feature an article
5. **Build**: `npm run build`
6. **Deploy**: Sync repo to EC2, configure Nginx to serve `blog/` directory

## Key Conventions

### Article Metadata (`articles.json`)

- **`filters`** (array, top-level): Available filter tags for the blog filter bar (e.g., "SRE", "Deployment", "Nginx", "Terraform", "Kubernetes", "Observability", "Incident")
- **`featured`** (object): Single featured article displayed prominently on homepage
  - `visual`: Array of label/highlight pairs for visual indicators
- **`published`** (array): All published articles
  - `filters` (required): Subset of top-level `filters` that apply to this article
  - `homePreview` (optional): Show this article on homepage blog grid
  - Articles must have a matching `.html` file in `blog/`

### Slugs and URLs

- Article slug = filename without `.html` (e.g. `nginx-502-fix.html` → `nginx-502-fix`)
- All article links in `articles.json` use filename only; build script prepends `blog/`
- Homepage links generated as `blog/{filename}`
- Canonical URL format: `https://infrabyfrancis.me/blog/{slug}.html`

## Common Tasks

| Task                 | File(s)                                                                | Command                     |
| -------------------- | ---------------------------------------------------------------------- | --------------------------- |
| Add new article      | Create `blog/slug.html`, update `articles.json`                        | `npm run build`             |
| Feature an article   | Update `articles.json` `featured` object                               | `npm run build`             |
| Change colors/fonts  | `assets/tokens.css`                                                    | Save + bump `?v=`           |
| Add homepage preview | Add `homePreview: true` to article in `articles.json`                  | `npm run build`             |
| Update blog filters  | Edit `filters` array in `articles.json` (and article `filters` fields) | `npm run build`             |
| Local testing        | `npm run start` then visit `http://localhost:8080`                     | —                           |
| Deploy               | Sync repo to EC2, configure Nginx for `/blog/` directory               | —                           |

## Potential Pitfalls

- ⚠️ **`npm run build` must run** after any `articles.json` changes; blog listings won't update without it
- ⚠️ **Article slug must match** between `articles.json` `href` and `blog/{slug}.html` filename
- ⚠️ **`filters` array** (top-level in `articles.json`) defines available tags; articles must use only these tags
- ⚠️ **Homepage preview limit**: Only ~4 articles show on homepage; use `homePreview: true` selectively
- ⚠️ **Canonical URL** must be set in each article's HTML `<link rel="canonical">`
- ⚠️ **Old URL redirects**: Nginx may need redirect rules if articles are renamed/moved

## Live Site

- Homepage: https://infrabyfrancis.me/
- Blog: https://infrabyfrancis.me/blog/
- Deployment target: EC2 instance with Nginx configured to serve the repo

## Build Process

`build.mjs` reads `articles.json` and:

1. Generates `blog/index.html` with all articles, featured block, and client-side filtering
2. Injects featured article + preview cards into `index.html`
3. Uses simple HTML templating with string interpolation

Key patterns:

- `esc(string)` for HTML entity escaping (XSS prevention)
- Featured article gets visual indicators; preview articles show tags + excerpts
- All links are relative (`blog/slug.html`) for portability
