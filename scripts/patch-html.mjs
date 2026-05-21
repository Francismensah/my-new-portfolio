#!/usr/bin/env node
/**
 * Replace inline <style> / shared <script> with asset links.
 * Run once after pulling legacy HTML: node scripts/patch-html.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const themeScript = `    <script>
      (function () {
        const stored = localStorage.getItem("theme");
        const preferredDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        const theme = stored || (preferredDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", theme);
      })();
    </script>`;

const sheets = {
  home: `    <link rel="stylesheet" href="assets/tokens.css" />
    <link rel="stylesheet" href="assets/base.css" />
    <link rel="stylesheet" href="assets/home.css" />`,
  blog: `    <link rel="stylesheet" href="assets/tokens.css" />
    <link rel="stylesheet" href="assets/base.css" />
    <link rel="stylesheet" href="assets/blog.css" />`,
  article: `    <link rel="stylesheet" href="assets/tokens.css" />
    <link rel="stylesheet" href="assets/base.css" />
    <link rel="stylesheet" href="assets/article.css" />`,
};

const siteScript = `    <script src="assets/site.js" defer></script>`;

function stripStyle(html) {
  return html.replace(/\s*<style>[\s\S]*?<\/style>\s*/g, "\n");
}

function stripTrailingScript(html) {
  return html.replace(
    /\s*<script>[\s\S]*?(cursor|themeToggle|filter-btn)[\s\S]*?<\/script>\s*(?=<\/body>)/,
    "\n",
  );
}

function patchIndex(html) {
  html = stripStyle(html);
  html = stripTrailingScript(html);
  html = html.replace(
    /(<link rel="canonical" href="https:\/\/infrabyfrancis.me" \/>)/,
    `$1\n${themeScript}\n${sheets.home}`,
  );
  html = html.replace('<nav id="nav">', '<nav id="nav" class="nav-scroll">');
  if (!html.includes("themeToggle")) {
    html = html.replace(
      /(<ul class="nav-links">[\s\S]*?<\/ul>)\s*(<\/div>\s*<\/nav>)/,
      `$1
        <button
          class="theme-toggle"
          id="themeToggle"
          type="button"
          aria-label="Toggle color theme"
          aria-pressed="false"
        >
          <span class="theme-icon" id="themeIcon">☀</span>
          <span id="themeLabel">Light</span>
        </button>
      $2`,
    );
    html = html.replace(
      /(<a href="index.html" class="nav-logo">[\s\S]*?<\/a>)\s*(<div class="nav-controls">)/,
      `$1
      $2`,
    );
  }
  const blogGridStart = html.indexOf('<div class="blog-preview-grid reveal">');
  const blogGridEnd = html.indexOf(
    '</div>\n      <div class="reveal">\n        <a href="blog.html"',
  );
  if (blogGridStart !== -1 && blogGridEnd !== -1) {
    const innerStart = html.indexOf(">", blogGridStart) + 1;
    html =
      html.slice(0, innerStart) +
      "\n        <!-- build:home-blog-previews -->\n" +
      html.slice(innerStart, blogGridEnd) +
      "\n        <!-- /build:home-blog-previews -->\n      " +
      html.slice(blogGridEnd);
  }
  html = html.replace("</body>", `${siteScript}\n  </body>`);
  return html;
}

function patchBlog(html) {
  html = stripStyle(html);
  html = html.replace(/\s*<script>[\s\S]*?document\.documentElement[\s\S]*?<\/script>\s*/, "\n");
  html = stripTrailingScript(html);
  html = html.replace(
    /(<meta[\s\S]*?production systems by Francis Morkeh Mensah\."\s*\/>)/,
    `$1\n${themeScript}\n${sheets.blog}`,
  );
  html = html.replace("<nav>", '<nav class="nav-solid">');
  html = html.replace(
    /(<ul class="nav-links">[\s\S]*?<\/ul>)\s*(<\/nav>)/,
    `<div class="nav-controls">
      $1
        <button
          class="theme-toggle"
          id="themeToggle"
          type="button"
          aria-label="Toggle color theme"
          aria-pressed="false"
        >
          <span class="theme-icon" id="themeIcon">☀</span>
          <span id="themeLabel">Light</span>
        </button>
      </div>
    $2`,
  );
  html = html.replace(
    /<div class="filter-bar">[\s\S]*?<\/div>\s*\n\s*<!-- Featured -->/,
    `<div class="filter-bar reveal">
        <!-- build:filters -->
        <button type="button" class="filter-btn active" data-filter="All">All</button>
        <!-- /build:filters -->
      </div>

      <!-- Featured -->`,
  );
  html = html.replace(
    /<!-- Featured -->[\s\S]*?<!-- All articles -->/,
    `<!-- Featured -->
      <!-- build:featured -->
      <!-- /build:featured -->

      <!-- All articles -->`,
  );
  html = html.replace(
    /<div class="articles-grid reveal">[\s\S]*?<\/div>\s*\n\s*<!-- Newsletter -->/,
    `<div class="articles-grid reveal">
        <!-- build:articles-grid -->
        <!-- /build:articles-grid -->
      </div>

      <!-- Newsletter -->`,
  );
  html = html.replace("</body>", `${siteScript}\n  </body>`);
  return html;
}

function patchArticle(html) {
  html = stripStyle(html);
  html = html.replace(/\s*<script>[\s\S]*?document\.documentElement[\s\S]*?<\/script>\s*/, "\n");
  html = stripTrailingScript(html);
  const canonicalMatch = html.match(/<link rel="canonical"[^>]*>/);
  if (canonicalMatch) {
    html = html.replace(
      canonicalMatch[0],
      `${canonicalMatch[0]}\n${themeScript}\n${sheets.article}`,
    );
  } else {
    html = html.replace("</title>", `</title>\n${themeScript}\n${sheets.article}`);
  }
  html = html.replace("<nav>", '<nav class="nav-solid">');
  html = html.replace("</body>", `${siteScript}\n  </body>`);
  return html;
}

const articleFiles = fs
  .readdirSync(root)
  .filter((f) => f.endsWith(".html") && f !== "index.html" && f !== "blog.html");

fs.writeFileSync(path.join(root, "index.html"), patchIndex(fs.readFileSync(path.join(root, "index.html"), "utf8")));
fs.writeFileSync(path.join(root, "blog.html"), patchBlog(fs.readFileSync(path.join(root, "blog.html"), "utf8")));

for (const file of articleFiles) {
  const p = path.join(root, file);
  let html = fs.readFileSync(p, "utf8");
  // Handle pages with multiple style blocks
  while (html.includes("<style>")) {
    html = stripStyle(html);
  }
  fs.writeFileSync(p, patchArticle(html));
}

console.log(`Patched index.html, blog.html, and ${articleFiles.length} articles.`);
