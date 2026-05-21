#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = path.join(root, "blog");
const articles = fs
  .readdirSync(blogDir)
  .filter((f) => f.endsWith(".html") && f !== "index.html");

const assetLinks = `    <script>
      (function () {
        const stored = localStorage.getItem("theme");
        const preferredDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        const theme = stored || (preferredDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", theme);
      })();
    </script>
    <link rel="stylesheet" href="../assets/tokens.css" />
    <link rel="stylesheet" href="../assets/base.css" />
    <link rel="stylesheet" href="../assets/article.css" />`;

for (const file of articles) {
  let html = fs.readFileSync(path.join(blogDir, file), "utf8");
  const head = html.match(/<head>([\s\S]*?)<\/head>/);
  if (!head) continue;

  const title = head[1].match(/<title>[\s\S]*?<\/title>/)?.[0] ?? "";
  const desc = head[1].match(/<meta\s+name="description"[\s\S]*?\/>/)?.[0] ?? "";
  const canonical = head[1].match(/<link\s+rel="canonical"[\s\S]*?\/>/)?.[0] ?? "";

  const newHead = `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${title}
    ${desc}
    ${canonical}
${assetLinks}
  </head>`;

  html = html.replace(/<head>[\s\S]*?<\/head>/, newHead);
  fs.writeFileSync(path.join(blogDir, file), html);
  console.log("Fixed", path.join("blog", file));
}
