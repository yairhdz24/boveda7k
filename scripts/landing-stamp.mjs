// Sella docs/index.html con el hash de landing.css y landing.js, para que el navegador no mezcle una página nueva con archivos viejos en caché.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const page = new URL("../docs/index.html", import.meta.url);
let html = readFileSync(page, "utf8");
for (const file of ["landing.css", "landing.js"]) {
  const hash = createHash("sha256").update(readFileSync(new URL(`../docs/${file}`, import.meta.url))).digest("hex").slice(0, 10);
  html = html.replace(new RegExp(`${file.replace(".", "\\.")}(\\?v=[0-9a-f]+)?"`), `${file}?v=${hash}"`);
}
writeFileSync(page, html);
