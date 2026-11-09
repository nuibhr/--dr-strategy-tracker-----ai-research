import { randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

export async function setupLocalAdmin(root) {
  const envPath = path.join(root, ".env");
  const original = await readFile(envPath, "utf8");
  const existing = parse(original);
  const defaults = {
    ADMIN_EMAIL: () => "nuibhr@gmail.com",
    ADMIN_PASSWORD: () => randomBytes(18).toString("base64url"),
    ADMIN_NAME: () => "nuideeppeak",
    JWT_SECRET: () => randomBytes(48).toString("base64url"),
  };
  const additions = [];
  for (const [name, generate] of Object.entries(defaults)) {
    // Preserve configured assignments verbatim: dotenv is not a JSON parser,
    // and even whitespace can be part of an existing password or signing key.
    if (existing[name] === undefined || existing[name] === "") {
      additions.push(`${name}=${generate()}`);
    }
  }
  if (existing.LOCAL_DEV_BYPASS_AUTH !== "false") {
    additions.push("LOCAL_DEV_BYPASS_AUTH=false");
  }
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const updated = additions.length === 0 ? original :
    original + (original === "" || original.endsWith("\n") ? "" : newline) +
    additions.join(newline) + newline;
  if (await readFile(envPath, "utf8") !== original) {
    throw new Error("The .env changed during setup. Run setup again; no configuration was overwritten.");
  }
  if (updated !== original) await writeFile(envPath, updated, { mode: 0o600 });
  const configured = parse(updated);
  const email = configured.ADMIN_EMAIL;
  const password = configured.ADMIN_PASSWORD;
  const logDir = path.join(root, "logs");
  await mkdir(logDir, { recursive: true });
  const credentialsPath = path.join(logDir, "local-admin-credentials.txt");
  const port = configured.LAN_PORT || "3000";
  await writeFile(credentialsPath, [
  "DR Strategy Tracker - Local Administrator",
  `Login on this computer: http://localhost:${port}/dashboard`,
  `Email: ${email}`,
  `Password: ${password}`,
  "",
  "Keep this file private. It is excluded from Git and is not served by the web app.",
  "The .env keeps the admin login across restarts. Database-backed records require DATABASE_URL.",
  "",
  ].join("\n"), { mode: 0o600 });
  return {
    adminEmail: email,
    passwordConfigured: true,
    jwtConfigured: true,
    credentialsPath,
    databaseConfigured: Boolean(configured.DATABASE_URL?.trim()),
    restartRequired: updated !== original,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  console.log(JSON.stringify(await setupLocalAdmin(root)));
}
