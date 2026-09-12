const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "www");

const topLevelFiles = [
  "Index.html",
  "home.html",
  "library.html",
  "social.html",
  "settings.html",
  "store.html",
  "profile.html",
  "search.html",
  "story.html",
  "reader.html",
  "signup.html",
  "forgot-password.html",
  "onboarding.html",
  "privacy.html",
  "terms.html",
  "404.html",
  "500.html",
  "manifest.json",
  "sw.js"
];

const directories = ["assets", "css", "data", "js"];

function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else if (entry.isFile()) copyFile(source, target);
  }
}

removeDir(outDir);
fs.mkdirSync(outDir, { recursive: true });

for (const file of topLevelFiles) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) copyFile(source, path.join(outDir, file));
}

for (const dir of directories) {
  const source = path.join(root, dir);
  if (fs.existsSync(source)) copyDir(source, path.join(outDir, dir));
}

console.log(`Prepared Capacitor web assets in ${outDir}`);
