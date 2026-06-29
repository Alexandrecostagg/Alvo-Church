#!/usr/bin/env node
// Patch handler.mjs to neutralize eval/Function-constructor calls that are
// blocked in Cloudflare Workers ("Code generation from strings disallowed").
//
// Three patterns addressed:
//
// 1. inquire (protobufjs):
//      eval("quire".replace(/^/,"re"))(moduleName)  →  null
//    Already caught by try/catch internally; returning null is safe.
//
// 2. lodash global-object detection:
//      Function("return this")()  →  globalThis
//    Fallback used when both `global` and `self` are unavailable.
//    Workers have globalThis so this is safe.
//
// 3. protobufjs codegen (generates optimised encoder/decoders at runtime):
//    The module (webpack id 17245) uses Function.apply / Function(code)() to
//    evaluate generated code. We replace the entire codegen body with a
//    stub that throws a descriptive error — protobufjs will fall back to
//    its static encode/decode paths (it checks for errors from codegen).
//    Pattern:  Function.apply(null,h).apply(null,i)  →  (()=>{throw new Error("codegen disabled")})()
//              Function(c2)()                         →  (()=>{throw new Error("codegen disabled")})()

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const handlerPath = resolve(
  import.meta.dirname,
  "../.open-next/server-functions/default/apps/web/handler.mjs"
);

let content = readFileSync(handlerPath, "utf8");
let totalPatches = 0;

function patch(description, regex, replacement) {
  const before = content;
  const matches = before.match(regex) || [];
  if (matches.length > 0) {
    // Print first match in context so we can verify the pattern was correct
    const idx = before.search(regex);
    const ctx = before.slice(Math.max(0, idx - 30), idx + 80).replace(/\n/g, " ");
    console.log(`patch-eval [${description}]: ${matches.length} occurrence(s) — context: ...${ctx}...`);
  } else {
    console.log(`patch-eval [${description}]: not found — skipping`);
  }
  content = content.replace(regex, replacement);
  totalPatches += matches.length;
}

// 1. inquire eval
patch(
  "inquire eval",
  /eval\("quire"\.replace\([^)]+\)\)\(moduleName\)/g,
  "null"
);

// 2. lodash / global-object Function("return this")()
patch(
  "Function(return this)",
  /Function\(["']return this["']\)\(\)/g,
  "globalThis"
);

// 3. protobufjs codegen: Function.apply(null,<args>).apply(null,<scope>)
// Wrap in try/catch so Cloudflare Workers' "Code generation from strings
// disallowed" error is caught here and returns null, allowing protobufjs to
// fall back to its static encode/decode paths (it handles null from codegen).
// Uses \w+ to match any minifier-generated identifier (a, h, c2, a1, etc).
patch(
  "protobufjs codegen apply",
  /Function\.apply\(null,(\w+)\)\.apply\(null,(\w+)\)/g,
  "(()=>{try{return Function.apply(null,$1).apply(null,$2)}catch(_){return null}})()"
);

// 4. protobufjs codegen: return Function(<code>)() — single-arg string eval
// Same approach: catch the Workers sandbox error and return null.
patch(
  "protobufjs codegen call",
  /\breturn Function\((\w+)\)\(\)/g,
  "try{return Function($1)()}catch(_){return null}"
);

// 5. Catch-all: any remaining direct eval() calls not covered above.
patch(
  "remaining eval calls",
  /\beval\s*\(([^)]+)\)/g,
  "(()=>{try{return eval($1)}catch(_){return null}})()"
);

if (totalPatches === 0) {
  console.log("patch-eval: no patterns found — already patched or build changed");
} else {
  console.log(`patch-eval: total ${totalPatches} replacement(s) applied`);
}

// Verify no eval/Function-as-eval left
const remaining = (content.match(/\beval\s*\(|Function\s*\(["']/g) || []).length;
if (remaining > 0) {
  console.warn(`patch-eval WARNING: ${remaining} eval/Function(string) call(s) may still remain`);
} else {
  console.log("patch-eval: verification OK — no eval/Function(string) calls remain");
}

writeFileSync(handlerPath, content, "utf8");
