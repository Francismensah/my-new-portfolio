#!/usr/bin/env node
/** Fix relative paths after moving blog content into /blog */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = path.join(root, "blog");

function patchFile(filePath, replacements) {
  let html = fs.readFileSync(filePath, "utf8");
  for (const [from, to] of replacements) {
    html = html.split(from).join(to);
  }
  fs.writeFileSync(filePath, html);
}

const blogIndexReplacements = [
  ['href="assets/', 'href="../assets/'],
  ['src="assets/', 'src="../assets/'],
  ['href="index.html"', 'href="../index.html"'],
  ['href="blog.html"', 'href="index.html"'],
  ['href="index.html#', 'href="../index.html#'],
];

const articleReplacements = [
  ['href="assets/', 'href="../assets/'],
  ['src="assets/', 'src="../assets/'],
  ['src="images/', 'src="../images/'],
  ['href="index.html"', 'href="../index.html"'],
  ['href="blog.html"', 'href="index.html"'],
  ['href="index.html#', 'href="../index.html#'],
  ["https://infrabyfrancis.me/", "https://infrabyfrancis.me/blog/"],
];

for (const name of fs.readdirSync(blogDir)) {
  if (!name.endsWith(".html")) continue;
  const p = path.join(blogDir, name);
  const reps = name === "index.html" ? blogIndexReplacements : articleReplacements;
  patchFile(p, reps);
  console.log("Patched", path.join("blog", name));
}

const rootIndexReplacements = [
  ['href="blog.html"', 'href="blog/"'],
  ['href="building-and-deploying-my-portfolio.html"', 'href="blog/building-and-deploying-my-portfolio.html"'],
  ['href="cloudflare-522-ec2-public-ip-change.html"', 'href="blog/cloudflare-522-ec2-public-ip-change.html"'],
  [
    'href="building-scalable-elastic-infrastructure-aws-cloudflare.html"',
    'href="blog/building-scalable-elastic-infrastructure-aws-cloudflare.html"',
  ],
  ['href="nginx-502-fix.html"', 'href="blog/nginx-502-fix.html"'],
  ['href="systemd-decommission-fix.html"', 'href="blog/systemd-decommission-fix.html"'],
  ['href="slo-alerting-framework.html"', 'href="blog/slo-alerting-framework.html"'],
];

patchFile(path.join(root, "index.html"), rootIndexReplacements);
console.log("Patched index.html");
