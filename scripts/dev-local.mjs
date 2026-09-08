import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const tsxCli = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));

const requiredForPersistentLogin = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];
const missing = requiredForPersistentLogin.filter(key => !process.env[key]?.trim());
if (missing.length > 0) {
  console.warn(`[local-dev] Missing .env values: ${missing.join(", ")}`);
  console.warn("[local-dev] The app can start, but database persistence or password login will not work until these are set.");
}

const child = spawn(process.execPath, [tsxCli, "watch", "server/_core/index.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
  },
});

child.on("exit", code => {
  process.exit(code ?? 1);
});

child.on("error", error => {
  console.error("[local-dev] Unable to start tsx:", error);
  process.exit(1);
});
