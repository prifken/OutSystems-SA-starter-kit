#!/usr/bin/env node
/* ============================================================
   scan-secrets.js — mechanical gate before anything gets pushed
   to this repo. Motivated directly by a real finding during this
   kit's development: the source SA workspace's own
   .claude/settings.local.json had plaintext AWS keys, a Postgres
   password, and an Azure DevOps PAT sitting in a tracked file.
   That can't be "remember not to do that" — it needs a check.

   Usage: node scan-secrets.js [path-to-scan]   (defaults to repo root)

   This is a blunt instrument on purpose: broad regexes, some false
   positives expected (an "example password" in docs, etc.) — better
   to over-flag and let a human clear it than to under-flag and miss
   a real credential. Exits non-zero if anything matches, so it can
   gate a commit (see the pre-commit hook note at the bottom of this
   file) — it does not delete or modify anything itself.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

const scanRoot = path.resolve(process.argv[2] || path.join(__dirname, ".."));

const SKIP_DIRS = new Set([".git", "node_modules", "_verify-output"]);
const SKIP_EXT = new Set([".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".ttf"]);

const PATTERNS = [
  { name: "AWS Access Key ID", re: /AKIA[0-9A-Z]{16}/g },
  { name: "AWS Secret Access Key (heuristic)", re: /aws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9\/+=]{40}['"]?/gi },
  { name: "Private key header", re: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { name: "Generic API key / token / secret assignment", re: /\b(api[_-]?key|secret|token|password|passwd|pwd)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/gi },
  { name: "Slack token", re: /xox[baprs]-[0-9A-Za-z-]{10,}/g },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: "Generic connection string with embedded credentials", re: /\w+:\/\/[^:\/\s]+:[^@\/\s]+@[^\/\s]+/g }
];

function walk(dir, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".gitignore") {
      if (SKIP_DIRS.has(entry.name)) continue;
    }
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else {
      if (SKIP_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      let text;
      try {
        text = fs.readFileSync(full, "utf8");
      } catch (e) {
        continue; // binary or unreadable — skip rather than crash the scan
      }
      const lines = text.split("\n");
      for (const { name, re } of PATTERNS) {
        lines.forEach((line, i) => {
          const matches = line.match(re);
          if (matches) {
            results.push({ file: path.relative(scanRoot, full), line: i + 1, pattern: name, snippet: line.trim().slice(0, 120) });
          }
        });
      }
    }
  }
}

const results = [];
walk(scanRoot, results);

if (results.length === 0) {
  console.log(`No matches across ${scanRoot}. Clean.`);
  process.exit(0);
}

console.log(`${results.length} potential match(es) — review each, this WILL include false positives:\n`);
for (const r of results) {
  console.log(`${r.file}:${r.line}  [${r.pattern}]`);
  console.log(`    ${r.snippet}`);
}
console.log(`\nIf any of these are real, remove them and rewrite history before this ever gets pushed —`);
console.log(`a commit made and reverted later still has the secret in git history.`);
process.exit(1);

/* To run this automatically before every commit, add to .git/hooks/pre-commit:
     #!/bin/sh
     node scripts/scan-secrets.js || exit 1
   (then chmod +x .git/hooks/pre-commit) — not wired up automatically here
   since hook installation is a decision, not something to do silently. */
