# Publishing workflow

Blog listings are generated from **`articles.json`**. Shared styles and scripts live under **`assets/`**. All posts live in **`blog/`**.

## Add or update an article

1. **Create the article page**  
   Copy `blog/nginx-502-fix.html` (or another post), save as `blog/your-article-slug.html`, and update hero/body content.

2. **Set canonical URL**  
   Use `https://infrabyfrancis.me/blog/your-article-slug.html`.

3. **Register it in `articles.json`**  
   Add an entry under `published` with:
   - `href` — filename only, e.g. `your-article-slug.html` (relative to `blog/`)
   - `tag`, `title`, `excerpt`, `year`, `readMinutes`
   - `filters` — used by the blog filter bar (e.g. `["Incident", "Nginx"]`)
   - `homePreview: true` — show on the homepage blog grid (~4 cards)
   - `homeTag` — optional tag line for homepage cards

4. **Optional: set featured**  
   Update the top-level `featured` object (`href` is also filename-only).

5. **Run the build**

   ```bash
   npm run build
   ```

   This refreshes:
   - `blog/index.html` — filters, featured block, article grid
   - `index.html` — homepage blog preview cards (links use `blog/…`)

6. **Deploy**  
   Sync the whole repo to your EC2 docroot. Configure Nginx so `/blog/` serves the `blog/` directory (or keep flat redirects from old URLs if needed).

## Edit shared design

| Task | File |
|------|------|
| Colors / fonts | `assets/tokens.css` |
| Nav, footer, buttons, cursor | `assets/base.css` |
| Homepage sections | `assets/home.css` |
| Blog index | `assets/blog.css` |
| Article layout & components | `assets/article.css` |
| Theme, cursor, filters, reveal | `assets/site.js` |

## Markdown drafts

Optional drafts can live in `blog/` next to the HTML (e.g. `blog/my-post.md`). The live page is the matching `.html` file.
