#!/usr/bin/env node
/**
 * Add skip link + <main id="main"> wrapper to HTML pages.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const skip = `    <a class="skip-link" href="#main">Skip to main content</a>\n`;

function hasSkip(html) {
  return html.includes('class="skip-link"');
}

function addSkipAfterBody(html) {
  if (hasSkip(html)) return html;
  return html.replace(/<body>\s*\n/, `<body>\n${skip}`);
}

function wrapHome(html) {
  if (html.includes('<main id="main">')) return html;
  return html
    .replace(
      /(\s*)<section id="hero">/,
      `$1<main id="main">\n$1<section id="hero">`,
    )
    .replace(/(\s*)<footer>/, `$1</main>\n$1<footer>`);
}

function wrapBlogIndex(html) {
  if (html.includes('<main id="main">')) return html;
  return html
    .replace(/(\s*)<div class="page-header">/, `$1<main id="main">\n$1<div class="page-header">`)
    .replace(
      /(\s*)<\/div>\s*\n(\s*)<footer>/,
      (m, indent, footerIndent) => {
        if (m.includes("</main>")) return m;
        return `${indent}</div>\n${indent}</main>\n${footerIndent}<footer>`;
      },
    );
}

function wrapArticle(html) {
  if (html.includes('<main id="main">')) return html;
  return html
    .replace(/(\s*)<div class="article-hero">/, `$1<main id="main">\n$1<div class="article-hero">`)
    .replace(
      /(\s*)<footer>/,
      (m, indent) => `${indent}</main>\n${indent}<footer>`,
    );
}

const files = [
  { path: "index.html", fn: (h) => wrapHome(addSkipAfterBody(h)) },
  { path: "blog/index.html", fn: (h) => wrapBlogIndex(addSkipAfterBody(h)) },
];

for (const f of fs.readdirSync(path.join(root, "blog"))) {
  if (f.endsWith(".html") && f !== "index.html") {
    files.push({
      path: `blog/${f}`,
      fn: (h) => wrapArticle(addSkipAfterBody(h)),
    });
  }
}

for (const { path: rel, fn } of files) {
  const p = path.join(root, rel);
  const html = fs.readFileSync(p, "utf8");
  const next = fn(html);
  if (next !== html) {
    fs.writeFileSync(p, next);
    console.log("Updated", rel);
  }
}

console.log("Done.");
