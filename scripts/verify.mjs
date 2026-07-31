import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "commands.json"), "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(data.notes["*"] === "C", "note * should be C");
assert(data.notes["1"] === "A", "note 1 should be A");
assert(data.game["2"] === "FORWARD", "game 2 forward");
assert(data.game["5"] === "STOP", "game 5 stop");
assert(data.numeric["12"] === "SIT", "12 sit");
assert(data.numeric["00"] === "GOAUTO", "00 auto");
assert(data.numeric["01"] === "GOGAME", "01 game");
assert(data.scmd.SIT.notes.join("") === "CGD#", "SIT melody");
assert(data.scmd.SLEEP.notes.join("") === "DCE", "SLEEP melody");
assert(data.noteMs === 640, "noteMs");

const required = [
  "index.html",
  "css/remote.css",
  "js/audio.js",
  "js/commands.js",
  "js/remote.js",
  "sw.js",
  "manifest.webmanifest",
  "capacitor.config.json",
];
for (const f of required) {
  assert(fs.existsSync(path.join(root, f)), "missing " + f);
}

// Melody duration math (same as audio.js)
const noteSec = data.noteMs / 1000;
const xf = data.crossfadeMs / 1000;
const dur3 = 3 * noteSec - 2 * xf;
assert(Math.abs(dur3 - 1.84) < 0.001, "3-note duration ~1.84s, got " + dur3);

console.log("verify ok");
console.log("SIT:", data.scmd.SIT.notes.join("-"));
console.log("SLEEP:", data.scmd.SLEEP.notes.join("-"));
console.log("3-note duration_ms:", Math.round(dur3 * 1000));
