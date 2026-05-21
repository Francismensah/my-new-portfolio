# infrabyfrancis.me — Portfolio

Static personal site and engineering blog for Francis Morkeh Mensah (SRE).

## Structure

```
assets/              Shared CSS and JavaScript
blog/
  index.html         Blog listing
  *.html             Article pages
  *.md               Draft / source markdown (optional)
articles.json        Blog manifest (titles, excerpts, filters, homepage previews)
images/              Article images
index.html           Portfolio homepage
scripts/build.mjs    Generates blog/index.html + index.html listing blocks
```

## Commands

```bash
npm run build       # Regenerate blog listings from articles.json
npm run start       # Local preview at http://localhost:8080
npm run build:css   # Re-extract assets/*.css (legacy; edit CSS directly instead)
```

See **[PUBLISHING.md](./PUBLISHING.md)** for how to add posts and deploy.

## URLs (local)

- Homepage: http://localhost:8080/
- Blog: http://localhost:8080/blog/

## Live site

https://infrabyfrancis.me
