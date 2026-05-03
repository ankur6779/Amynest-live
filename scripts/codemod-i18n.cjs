#!/usr/bin/env node
/* eslint-disable */
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverseMod = require("@babel/traverse");
const generateMod = require("@babel/generator");
const t = require("@babel/types");

const traverse = traverseMod.default || traverseMod;
const generate = generateMod.default || generateMod;

const ROOT = path.resolve(__dirname, "..");
const KS = path.join(ROOT, "artifacts/kidschedule");

const PROPS = new Set(["placeholder", "aria-label", "title", "alt"]);
const HAS_ENGLISH_RE = /[A-Za-z]{3,}/;

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "x";
}

function fileNamespace(rel) {
  // e.g. src/components/games/CardFlip.tsx -> components.games.card_flip
  return rel
    .replace(/^src\//, "")
    .replace(/\.tsx$/, "")
    .split("/")
    .map((p) => p.replace(/[^A-Za-z0-9]+/g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase())
    .join(".");
}

// Determine if a node is inside an i18n-ignore-start/end block or has i18n-ok
function lineHasMarker(loc, sourceLines) {
  if (!loc) return false;
  const ln = loc.start.line - 1;
  const line = sourceLines[ln] || "";
  const prev = ln > 0 ? sourceLines[ln - 1] : "";
  if (line.includes("i18n-ok") || prev.includes("i18n-ok")) return true;
  // Walk up for ignore-start
  let inIgnore = false;
  for (let i = 0; i <= ln; i++) {
    const l = sourceLines[i] || "";
    if (l.includes("i18n-ignore-start")) inIgnore = true;
    if (l.includes("i18n-ignore-end")) inIgnore = false;
  }
  return inIgnore;
}

function generateUniqueKey(usedKeys, base) {
  let key = base;
  let n = 2;
  while (usedKeys.has(key)) {
    key = `${base}_${n}`;
    n++;
  }
  return key;
}

function collectFunctionPath(p) {
  // Find nearest enclosing function (FunctionDeclaration, FunctionExpression, ArrowFunctionExpression)
  let cur = p;
  while (cur) {
    const n = cur.node;
    if (
      t.isFunctionDeclaration(n) ||
      t.isFunctionExpression(n) ||
      t.isArrowFunctionExpression(n) ||
      t.isObjectMethod(n) ||
      t.isClassMethod(n)
    ) {
      return cur;
    }
    cur = cur.parentPath;
  }
  return null;
}

// Returns true if function looks like a React component / hook (returns JSX, or contains JSX)
function functionHasJsx(funcPath) {
  let has = false;
  funcPath.traverse({
    JSXElement() { has = true; },
    JSXFragment() { has = true; },
    Function(p) { p.skip(); },
  });
  return has;
}

function processFile(rel) {
  const abs = path.join(KS, rel);
  const code = fs.readFileSync(abs, "utf8");
  const sourceLines = code.split("\n");

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      attachComment: true,
    });
  } catch (e) {
    console.error(`Parse error in ${rel}: ${e.message}`);
    return null;
  }

  const ns = fileNamespace(rel);
  const usedKeys = new Set();
  const additions = {}; // key -> english text

  // Pass 1: collect all JSXText and target prop values that are user-facing
  const replacements = []; // { path, key }

  function maybeReplaceText(p) {
    const node = p.node;
    const raw = node.value;
    const trimmed = raw.trim();
    if (!HAS_ENGLISH_RE.test(trimmed)) return;
    if (lineHasMarker(node.loc, sourceLines)) return;
    // Determine surrounding whitespace to preserve
    const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const leading = m[1];
    const trailing = m[3];
    const inner = m[2];
    if (!HAS_ENGLISH_RE.test(inner)) return;

    const baseKey = slugify(inner);
    const key = generateUniqueKey(usedKeys, baseKey);
    usedKeys.add(key);
    additions[key] = inner;

    const tCall = t.jsxExpressionContainer(
      t.callExpression(t.identifier("t"), [t.stringLiteral(`${ns}.${key}`)])
    );

    // Replace text node with optional whitespace text + expression
    const out = [];
    if (leading) out.push(t.jsxText(leading));
    out.push(tCall);
    if (trailing) out.push(t.jsxText(trailing));
    p.replaceWithMultiple(out);

    const fp = collectFunctionPath(p);
    if (fp) functionsNeedingHook.add(fp);
  }

  function maybeReplacePropString(p) {
    const node = p.node; // JSXAttribute
    if (!node.name || !node.name.name) return;
    const propName =
      typeof node.name.name === "string"
        ? node.name.name
        : node.name.name.name;
    if (!PROPS.has(propName)) return;
    if (!node.value) return;
    if (node.value.type !== "StringLiteral") return;
    const val = node.value.value;
    if (!HAS_ENGLISH_RE.test(val)) return;
    if (lineHasMarker(node.loc, sourceLines)) return;

    const baseKey = slugify(val);
    const key = generateUniqueKey(usedKeys, baseKey);
    usedKeys.add(key);
    additions[key] = val;

    node.value = t.jsxExpressionContainer(
      t.callExpression(t.identifier("t"), [t.stringLiteral(`${ns}.${key}`)])
    );

    const fp = collectFunctionPath(p);
    if (fp) functionsNeedingHook.add(fp);
  }

  const functionsNeedingHook = new Set();

  traverse(ast, {
    JSXText(p) {
      maybeReplaceText(p);
    },
    JSXAttribute(p) {
      maybeReplacePropString(p);
    },
  });

  // Also: any function that already calls t(...) but lacks the hook should get it.
  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      if (callee.type === "Identifier" && callee.name === "t") {
        const fp = collectFunctionPath(p);
        if (fp) functionsNeedingHook.add(fp);
      }
    },
  });

  if (Object.keys(additions).length === 0 && functionsNeedingHook.size === 0) {
    return { rel, additions, changed: false };
  }

  // Ensure useTranslation import
  let hasUseTranslationImport = false;
  let reactI18nImport = null;
  traverse(ast, {
    ImportDeclaration(p) {
      if (p.node.source.value === "react-i18next") {
        reactI18nImport = p;
        for (const sp of p.node.specifiers) {
          if (
            sp.type === "ImportSpecifier" &&
            sp.imported.name === "useTranslation"
          ) {
            hasUseTranslationImport = true;
          }
        }
      }
    },
  });
  if (!hasUseTranslationImport) {
    if (reactI18nImport) {
      reactI18nImport.node.specifiers.push(
        t.importSpecifier(
          t.identifier("useTranslation"),
          t.identifier("useTranslation")
        )
      );
    } else {
      // Insert after last import
      const body = ast.program.body;
      let lastImportIdx = -1;
      for (let i = 0; i < body.length; i++) {
        if (body[i].type === "ImportDeclaration") lastImportIdx = i;
      }
      const imp = t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier("useTranslation"),
            t.identifier("useTranslation")
          ),
        ],
        t.stringLiteral("react-i18next")
      );
      body.splice(lastImportIdx + 1, 0, imp);
    }
  }

  // Inject const { t } = useTranslation(); in each function that needs it (and contains JSX)
  for (const fp of functionsNeedingHook) {
    const node = fp.node;
    let body = node.body;
    // Arrow function with expression body -> wrap in block
    if (
      (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) &&
      !t.isBlockStatement(body)
    ) {
      node.body = t.blockStatement([t.returnStatement(body)]);
      body = node.body;
    }
    if (!t.isBlockStatement(body)) continue;
    // Check if a `const { t } = useTranslation()` is already there at the top level
    const already = body.body.some((stmt) => {
      if (stmt.type !== "VariableDeclaration") return false;
      for (const d of stmt.declarations) {
        if (
          d.init &&
          d.init.type === "CallExpression" &&
          d.init.callee.type === "Identifier" &&
          d.init.callee.name === "useTranslation"
        ) {
          return true;
        }
      }
      return false;
    });
    if (already) continue;
    // Check if this function actually contains JSX or uses t — if not, skip
    if (!functionHasJsx(fp)) {
      // It might still call t(); but if no JSX and no t, skip — though we wouldn't have added it.
      let usesT = false;
      fp.traverse({
        Identifier(p2) {
          if (
            p2.node.name === "t" &&
            p2.parent.type === "CallExpression" &&
            p2.parent.callee === p2.node
          )
            usesT = true;
        },
        Function(p2) { p2.skip(); },
      });
      if (!usesT) continue;
    }
    const decl = t.variableDeclaration("const", [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(
            t.identifier("t"),
            t.identifier("t"),
            false,
            true
          ),
        ]),
        t.callExpression(t.identifier("useTranslation"), [])
      ),
    ]);
    body.body.unshift(decl);
  }

  const out = generate(ast, {
    retainLines: false,
    jsescOption: { minimal: true },
  }, code);

  fs.writeFileSync(abs, out.code, "utf8");
  return { rel, additions, changed: true, ns };
}

// Build deferred list from check-i18n.cjs
function loadDeferred() {
  const src = fs.readFileSync(path.join(KS, "scripts/check-i18n.cjs"), "utf8");
  const m = src.match(/const DEFERRED_FILES = new Set\(\[([\s\S]*?)\]\);/);
  if (!m) throw new Error("DEFERRED_FILES not found");
  const items = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  return items;
}

const allAdditions = {}; // ns -> { key: en }
const list = loadDeferred();
for (const rel of list) {
  const res = processFile(rel);
  if (res && Object.keys(res.additions).length) {
    allAdditions[res.ns] = res.additions;
  }
}

fs.writeFileSync(
  path.join(KS, "scripts/.i18n-codemod-additions.json"),
  JSON.stringify(allAdditions, null, 2)
);
console.log(
  `Processed ${list.length} files. Wrote additions for ${Object.keys(allAdditions).length} namespaces.`
);
