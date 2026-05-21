#!/usr/bin/env node
/**
 * One-time / on-demand CSS extraction from legacy inline styles.
 * Run: node scripts/generate-css.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "assets");

/** Legacy extractor — requires inline &lt;style&gt; in source HTML. */
function readLegacyCss(filename) {
  const p = path.join(root, filename);
  if (!fs.existsSync(p)) return "";
  const html = fs.readFileSync(p, "utf8");
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  return m ? m[1].trim() : "";
}

const indexCss = readLegacyCss("index.html");
const blogCss = readLegacyCss("blog.html");
const articleCss = readLegacyCss("nginx-502-fix.html");

if (!indexCss || !blogCss || !articleCss) {
  console.error(
    "generate-css needs legacy inline styles, or edit assets/*.css directly.",
  );
  process.exit(1);
}

const fontImport = `@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,600;1,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,600&family=DM+Sans:wght@300;400;500&display=swap");\n`;

const tokens = `${fontImport}
:root {
  --bg: #090909;
  --bg2: #101012;
  --bg3: #141416;
  --border: #222226;
  --border2: #2c2c32;
  --accent: #f97316;
  --accent-dim: rgba(249, 115, 22, 0.1);
  --text: #e2e0db;
  --muted: #666;
  --muted2: #444;
  --white: #f5f3ee;
  --copy: #9a9aa0;
  --copy-soft: #83838b;
  --green: #4ade80;
  --red: #f87171;
  --blue: #60a5fa;
  --code-bg: #0d0d0f;
  --inline-code-bg: rgba(255, 255, 255, 0.04);
  --inline-code-text: #f3f3f4;
  --pre-code-text: #d6d6d8;
  --info-text: #e8c9a8;
  --takeaway-text: #bbe7cb;
}
html[data-theme="light"] {
  --bg: #f8f8f6;
  --bg2: #ffffff;
  --bg3: #efefea;
  --border: #d8d8d0;
  --border2: #bdbdb3;
  --accent: #dd6413;
  --accent-dim: rgba(221, 100, 19, 0.12);
  --text: #1e1f22;
  --muted: #4a4c52;
  --muted2: #666a74;
  --white: #151617;
  --copy: #3f4249;
  --copy-soft: #525661;
  --code-bg: #f1f2ef;
  --inline-code-bg: rgba(0, 0, 0, 0.06);
  --inline-code-text: #1f2329;
  --pre-code-text: #2a2d33;
  --info-text: #5b3c1f;
  --takeaway-text: #1f5e3a;
}
`;

const base = `
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html {
  scroll-behavior: smooth;
}
body {
  background: var(--bg);
  color: var(--text);
  font-family: "DM Sans", sans-serif;
  font-size: 16px;
  line-height: 1.7;
  overflow-x: hidden;
  cursor: none;
}
.cursor {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  transition: width 0.2s, height 0.2s;
}
.cursor-ring {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(249, 115, 22, 0.4);
  border-radius: 50%;
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9998;
  transform: translate(-50%, -50%);
  transition: all 0.15s ease;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.025;
  pointer-events: none;
  z-index: 0;
}
nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 3rem;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s, background 0.3s;
}
nav.scrolled,
nav.nav-solid {
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(12px);
  border-color: var(--border);
}
.nav-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.nav-logo {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.8rem;
  color: var(--accent);
  letter-spacing: 0.05em;
  text-decoration: none;
}
.nav-links {
  display: flex;
  gap: 2rem;
  list-style: none;
}
.nav-links a {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.72rem;
  color: var(--muted);
  text-decoration: none;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.2s;
}
.nav-links a:hover,
.nav-links a.active {
  color: var(--accent);
}
.theme-toggle {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  background: var(--bg2);
  border: 1px solid var(--border2);
  border-radius: 999px;
  padding: 0.4rem 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, transform 0.2s;
}
.theme-toggle:hover {
  color: var(--accent);
  border-color: var(--accent);
  transform: translateY(-1px);
}
.theme-toggle .theme-icon {
  font-size: 0.85rem;
  line-height: 1;
}
.btn-primary {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #000;
  background: var(--accent);
  padding: 0.85rem 1.75rem;
  text-decoration: none;
  border-radius: 2px;
  transition: opacity 0.2s, transform 0.2s;
  border: none;
  cursor: pointer;
}
.btn-primary:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}
.btn-secondary {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--border2);
  padding: 0.85rem 1.75rem;
  text-decoration: none;
  border-radius: 2px;
  transition: color 0.2s, border-color 0.2s, transform 0.2s;
  cursor: pointer;
}
.btn-secondary:hover {
  color: var(--accent);
  border-color: var(--accent);
  transform: translateY(-1px);
}
footer {
  border-top: 1px solid var(--border);
  padding: 2rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}
.footer-copy,
.footer-tagline {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.7rem;
  color: var(--muted2);
  letter-spacing: 0.06em;
}
.footer-tagline span {
  color: var(--accent);
}
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.6);
    opacity: 0;
  }
}
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
@media (max-width: 900px) {
  nav {
    padding: 1rem 1.5rem;
  }
  .nav-links {
    display: none;
  }
  .theme-toggle {
    font-size: 0.62rem;
    padding: 0.35rem 0.6rem;
  }
  body {
    cursor: auto;
  }
  .cursor,
  .cursor-ring {
    display: none;
  }
  footer {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }
}
`;

function sliceBetween(css, start, end) {
  const a = css.indexOf(start);
  if (a === -1) return "";
  const b = end ? css.indexOf(end, a) : css.length;
  if (b === -1) return css.slice(a);
  return css.slice(a, b);
}

const home = sliceBetween(indexCss, "#hero {", "/* Blog preview on homepage */") +
  sliceBetween(indexCss, "/* Blog preview on homepage */", ".contact-grid {") +
  sliceBetween(indexCss, ".contact-grid {", "footer {");

const blogPreview = sliceBetween(indexCss, ".blog-preview-grid {", ".contact-grid {");

const blogLight = sliceBetween(
  blogCss,
  'html[data-theme="light"] .featured-visual',
  ".page-header {",
).replace(/^      /gm, "");
const blogPage = sliceBetween(blogCss, ".page-header {", "footer {").replace(
  /^      /gm,
  "",
);

const articleBody =
  sliceBetween(articleCss, "/* Article layout */", "/* Back / next nav */") +
  sliceBetween(articleCss, "/* Back / next nav */", ".footer-copy {") +
  `
@media (max-width: 900px) {
  .article-hero {
    padding: 7rem 1.5rem 3rem;
  }
  .article-body {
    padding: 3rem 1.5rem 4rem;
  }
}
`;

fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(path.join(assetsDir, "tokens.css"), tokens.trim() + "\n");
fs.writeFileSync(path.join(assetsDir, "base.css"), base.trim() + "\n");
fs.writeFileSync(
  path.join(assetsDir, "home.css"),
  (home + blogPreview).trim() + "\n",
);
fs.writeFileSync(
  path.join(assetsDir, "blog.css"),
  (blogLight + "\n" + blogPage).trim() + "\n",
);
fs.writeFileSync(path.join(assetsDir, "article.css"), articleBody.trim() + "\n");

console.log("Wrote assets/*.css");
