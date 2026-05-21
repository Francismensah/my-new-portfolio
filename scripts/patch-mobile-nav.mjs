#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = path.join(root, "blog");

const navLinks = `          <ul class="nav-links">
            <li><a href="../index.html#about">About</a></li>
            <li><a href="../index.html#experience">Experience</a></li>
            <li><a href="../index.html#skills">Skills</a></li>
            <li><a href="../index.html#projects">Projects</a></li>
            <li><a href="index.html" class="active">Blog</a></li>
            <li><a href="../index.html#contact">Contact</a></li>
          </ul>`;

const mobileNav = `    <nav id="nav" class="nav-solid">
      <a href="../index.html" class="nav-logo">infrabyfrancis.me</a>
      <div class="nav-controls">
        <button
          type="button"
          class="nav-menu-btn"
          id="navMenuBtn"
          aria-expanded="false"
          aria-controls="navMenu"
          aria-label="Open menu"
        >
          <span class="nav-menu-bar"></span>
          <span class="nav-menu-bar"></span>
          <span class="nav-menu-bar"></span>
        </button>
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
      <div class="nav-panel" id="navMenu">
${navLinks}
      </div>
    </nav>`;

const oldNavRe = /<nav id="nav" class="nav-solid">[\s\S]*?<\/nav>/;

for (const file of fs.readdirSync(blogDir)) {
  if (!file.endsWith(".html") || file === "index.html") continue;
  const filePath = path.join(blogDir, file);
  let html = fs.readFileSync(filePath, "utf8");
  if (!oldNavRe.test(html)) {
    console.log("Skip (nav already patched):", file);
    continue;
  }
  html = html.replace(oldNavRe, mobileNav);
  if (!html.includes("site.js")) {
    html = html.replace("</body>", '    <script src="../assets/site.js" defer></script>\n  </body>');
  }
  fs.writeFileSync(filePath, html);
  console.log("Patched", file);
}
