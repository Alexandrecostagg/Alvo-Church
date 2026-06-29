#!/usr/bin/env node
// Patch all compiled Worker bundles under .open-next/ to neutralize
// eval/Function-constructor calls that are blocked in Cloudflare Workers
// ("Code generation from strings disallowed").
//
// Searches every .js/.mjs file under .open-next/ so we don't depend on
// a specific file-path that may change across opennextjs-cloudflare versions.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const openNextDir = resolve(import.meta.dirname, "../.open-next");

// Collect all JS/MJS files recursively
function findJsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...findJsFiles(full));
    } else if (/\.(m?js)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

const files = findJsFiles(openNextDir);
console.log(`patch-eval: scanning ${files.length} file(s) under .open-next/`);

let grandTotal = 0;

for (const filePath of files) {
  let content = readFileSync(filePath, "utf8");
  let filePatchCount = 0;

  function patch(description, regex, replacement) {
    const matches = content.match(regex) || [];
    if (matches.length > 0) {
      const idx = content.search(regex);
      const ctx = content.slice(Math.max(0, idx - 30), idx + 80).replace(/\n/g, " ");
      console.log(`  [${description}] ${matches.length} hit(s) — ...${ctx}...`);
      content = content.replace(regex, replacement);
      filePatchCount += matches.length;
    }
  }

  // 1. inquire eval: eval("quire".replace(...)) → null
  patch(
    "inquire eval",
    /eval\("quire"\.replace\([^)]+\)\)\(moduleName\)/g,
    "null"
  );

  // 2. lodash global-object: Function("return this")() → globalThis
  patch(
    "Function(return this)",
    /Function\(["']return this["']\)\(\)/g,
    "globalThis"
  );

  // 3. protobufjs codegen: Function.apply(null,X).apply(null,Y)
  // Returns a no-op function (not null!) so callers can safely access .prototype
  // and call the result without crashing. protobufjs uses this as its
  // generated encoder/decoder — a no-op causes it to fall through to
  // the static encode/decode paths.
  patch(
    "protobufjs codegen apply",
    /Function\.apply\(null,(\w+)\)\.apply\(null,(\w+)\)/g,
    "(()=>{try{return Function.apply(null,$1).apply(null,$2)}catch(_){return function(_m,w){return w}}})()"
  );

  // 4. protobufjs codegen: return Function(X)()
  // Same: return a passthrough stub instead of null.
  patch(
    "protobufjs codegen call",
    /\breturn Function\((\w+)\)\(\)/g,
    "try{return Function($1)()}catch(_){return function(_m,w){return w}}"
  );

  // 5. new Function(X) without immediate call — wrap constructor
  patch(
    "new Function(str)",
    /\bnew Function\((\w+)\)/g,
    "(()=>{try{return new Function($1)}catch(_){return function(){}}})()"
  );

  if (filePatchCount > 0) {
    const rel = filePath.replace(openNextDir, ".open-next");
    console.log(`patch-eval: patched ${filePatchCount} pattern(s) in ${rel}`);
    writeFileSync(filePath, content, "utf8");
    grandTotal += filePatchCount;
  }
}

if (grandTotal === 0) {
  console.log("patch-eval: no patterns found in any file — already patched or build structure changed");
} else {
  console.log(`patch-eval: total ${grandTotal} replacement(s) across all files`);
}
