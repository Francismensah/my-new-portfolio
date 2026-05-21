# Agent Instructions — infrabyfrancis.me Portfolio

This is a **static personal portfolio and engineering blog** built with HTML, CSS, JavaScript, and Node.js build scripts.

## Quick Start

```bash
npm run build        # Regenerate blog listings from articles.json
npm run start        # Local preview at http://localhost:8080
npm run build:css    # Re-extract CSS (legacy; edit assets/*.css directly instead)
npm run build:all    # Both build:css and build
```

## Project Structure

```
assets/              Shared CSS (tokens, base, home, blog, article) + site.js
blog/
  index.html         Auto-generated blog index (filters, featured, listings)
  *.html             Published article pages
  *.md               Optional markdown drafts (coexist with .html)
articles.json        Blog manifest: filters, featured article, all published posts
images/              Article images
index.html           Homepage (includes featured block + blog preview cards)
scripts/
  build.mjs          Generates blog/index.html + index.html listings from articles.json
  generate-css.mjs   Legacy: extracts CSS (use direct editing instead)
  fix-article-heads.mjs  Patches article header structure
  patch-html.mjs     General HTML patching utilities
  relocate-blog.mjs  Helpers for moving articles
```

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

### Design System

Edit colors/fonts/themes in:

- `assets/tokens.css` — Design tokens (colors, fonts, spacing)
- `assets/base.css` — Nav, footer, buttons, cursor
- `assets/home.css` — Homepage sections
- `assets/blog.css` — Blog index page
- `assets/article.css` — Article layout & components
- `assets/site.js` — Theme toggles, filters, reveal animations

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
| Change colors/fonts  | `assets/tokens.css`                                                    | Just save (CSS is embedded) |
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
