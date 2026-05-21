#!/usr/bin/env node
/**
 * Inject blog listings from articles.json into index.html and blog.html.
 * Run: node scripts/build.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "articles.json"), "utf8"));

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderFeatured(f) {
  const visualLines = f.visual
    .map(
      (line) =>
        `            <div>${esc(line.label)} <span>${esc(line.highlight)}</span></div>`,
    )
    .join("\n");
  const tags = f.tags
    .map((t) => `            <span class="featured-tag">${esc(t)}</span>`)
    .join("\n");

  return `      <a
        href="${esc(f.href)}"
        class="featured-article reveal"
      >
        <span class="featured-label">Featured</span>
        <div class="featured-content">
          <div class="featured-meta">${esc(f.meta)}</div>
          <div class="featured-title">${esc(f.title)}</div>
          <div class="featured-excerpt">${esc(f.excerpt)}</div>
          <div class="featured-tags">
${tags}
          </div>
          <div class="featured-read">Read Article →</div>
        </div>
        <div class="featured-visual">
          <div class="featured-visual-inner">
${visualLines}
          </div>
        </div>
      </a>`;
}

function renderArticleCard(a, { comingSoon = false } = {}) {
  if (comingSoon) {
    const filterAttr = (a.filters || []).join(" ");
    return `        <div class="article-card coming-soon" data-filter="${esc(filterAttr)}">
          <div class="article-tag">${esc(a.tag)}</div>
          <div class="article-title">${esc(a.title)}</div>
          <div class="article-excerpt">${esc(a.excerpt)}</div>
          <div class="article-meta"><span>Coming soon</span></div>
        </div>`;
  }
  const filterAttr = (a.filters || []).join(" ");
  return `        <a href="${esc(a.href)}" class="article-card" data-filter="${esc(filterAttr)}">
          <div class="article-tag">${esc(a.tag)}</div>
          <div class="article-title">${esc(a.title)}</div>
          <div class="article-excerpt">${esc(a.excerpt)}</div>
          <div class="article-meta">
            <span>${esc(a.year)}</span><span>·</span><span>${esc(a.readMinutes)}</span>
          </div>
          <div class="article-read">Read →</div>
        </a>`;
}

function renderHomePreview(a) {
  const href = a.href.startsWith("blog/") ? a.href : `blog/${a.href}`;
  return `        <a href="${esc(href)}" class="blog-preview-card">
          <div class="blog-card-tag">${esc(a.homeTag || a.tag)}</div>
          <div class="blog-card-title">${esc(a.title)}</div>
          <div class="blog-card-excerpt">${esc(a.excerpt)}</div>
          <div class="blog-card-meta">
            <span>${esc(a.year)}</span><span>·</span><span>${esc(a.readMinutes)} read</span>
          </div>
          <div class="blog-card-read">Read Article →</div>
        </a>`;
}

function renderFilters(filters) {
  return filters
    .map((f, i) => {
      const active = i === 0 ? " active" : "";
      const dataFilter = f === "All" ? "All" : f;
      return `        <button type="button" class="filter-btn${active}" data-filter="${esc(dataFilter)}">${esc(f)}</button>`;
    })
    .join("\n");
}

function replaceBlock(html, startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error(`Markers not found: ${startMarker} / ${endMarker}`);
  }
  return (
    html.slice(0, start + startMarker.length) +
    "\n" +
    replacement +
    "\n      " +
    html.slice(end)
  );
}

const publishedCount = data.published.length;
const featuredHtml = renderFeatured(data.featured);
const filtersHtml = renderFilters(data.filters);
const gridHtml = [
  ...data.published.map((a) => renderArticleCard(a)),
  ...data.comingSoon.map((a) => renderArticleCard(a, { comingSoon: true })),
].join("\n");
const homeHtml = data.published
  .filter((a) => a.homePreview)
  .map(renderHomePreview)
  .join("\n");

const blogIndexPath = path.join(root, "blog", "index.html");
let blogHtml = fs.readFileSync(blogIndexPath, "utf8");
blogHtml = replaceBlock(
  blogHtml,
  "<!-- build:filters -->",
  "<!-- /build:filters -->",
  filtersHtml,
);
blogHtml = replaceBlock(
  blogHtml,
  "<!-- build:featured -->",
  "<!-- /build:featured -->",
  featuredHtml,
);
blogHtml = replaceBlock(
  blogHtml,
  "<!-- build:articles-grid -->",
  "<!-- /build:articles-grid -->",
  gridHtml,
);
blogHtml = blogHtml.replace(
  /(All Articles — )\d+( published · more coming soon)/,
  `$1${publishedCount}$2`,
);
fs.writeFileSync(blogIndexPath, blogHtml);

let indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
indexHtml = replaceBlock(
  indexHtml,
  "<!-- build:home-blog-previews -->",
  "<!-- /build:home-blog-previews -->",
  homeHtml,
);
fs.writeFileSync(path.join(root, "index.html"), indexHtml);

console.log(
  `Built blog listings: ${publishedCount} published, ${data.published.filter((a) => a.homePreview).length} home previews`,
);
