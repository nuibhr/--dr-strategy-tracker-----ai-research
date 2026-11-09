import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "dotenv";

const root = fileURLToPath(new URL("../", import.meta.url));
const staged = process.argv.includes("--staged");
const git = args => execFileSync("git", ["-c", `safe.directory=${root.replace(/\\/g, "/").replace(/\/$/, "")}`, ...args], {
  cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
});
const files = [...new Set(git(staged
  ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
  : ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean))];
const envPath = path.join(root, ".env");
const configured = existsSync(envPath) ? parse(readFileSync(envPath)) : {};
const known = Object.entries(configured).filter(([key, value]) =>
  /PASSWORD|SECRET|TOKEN|API_KEY|APP_ID|ENCRYPTION_KEY/.test(key) && value.length >= 12
);
const patterns = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["telegram-token", /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
];
const findings = [];
let scanned = 0;
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && file !== ".env.example" ||
      /(^|\/)(?:logs|\.manus-logs)\//.test(file) || /\.(?:pem|p12|pfx)$/.test(file)) {
    findings.push({ file, reason: "private-runtime-file" });
    continue;
  }
  let data;
  try { data = staged ? Buffer.from(git(["show", `:${file}`])) : readFileSync(path.join(root, file)); }
  catch { continue; }
  if (data.includes(0)) continue;
  const text = data.toString("utf8"); scanned++;
  for (const [name, pattern] of patterns) if (pattern.test(text)) findings.push({ file, reason: name });
  for (const [key, value] of known) {
    if (text.includes(value)) findings.push({ file, reason: `configured-secret:${key}` });
  }
}
console.log(JSON.stringify({ scope: staged ? "staged" : "working-tree", scanned, findings }, null, 2));
process.exitCode = findings.length ? 1 : 0;
