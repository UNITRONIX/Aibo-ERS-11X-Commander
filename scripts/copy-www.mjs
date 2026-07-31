import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const www = path.join(root, "www");

const files = [
  "index.html",
  "sw.js",
  "manifest.webmanifest",
  "css/remote.css",
  "js/audio.js",
  "js/commands.js",
  "js/remote.js",
  "data/commands.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

fs.rmSync(www, { recursive: true, force: true });
for (const f of files) {
  const src = path.join(root, f);
  const dst = path.join(www, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
console.log("www ready:", files.length, "files");
