import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { config } from "dotenv";

const root = fileURLToPath(new URL("../", import.meta.url));
config({ path: path.join(root, ".env"), quiet: true });
const port = Number(process.env.LAN_PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("LAN_PORT must be an integer between 1 and 65535.");
  process.exit(1);
}
const env = {
  ...process.env,
  NODE_ENV: "production",
  HOST: "0.0.0.0",
  PORT: String(port),
  LAN_PUBLIC_SCANNER: "true",
  LOCAL_DEV_BYPASS_AUTH: "false",
  // Vite gives explicit environment variables priority over old Fly/Cloudflare .env values.
  VITE_API_BASE_URL: "",
};

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Process stopped (${signal || code}).`));
    });
  });
}

function showLinks() {
  console.log(`\n[LAN] This computer: http://localhost:${port}/dr`);
  for (const network of Object.values(networkInterfaces()).flat()) {
    if (network?.family === "IPv4" && !network.internal && !network.address.startsWith("169.254.")) {
      console.log(`[LAN] Share with this network: http://${network.address}:${port}/dr`);
    }
  }
}

try {
  // Opening the launcher twice should not interrupt an existing LAN server.
  const running = await Promise.all([
    fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) }).then(r => r.json()),
    fetch(`http://127.0.0.1:${port}/api/trpc/dr80Scanner.getAccessMode`, { signal: AbortSignal.timeout(2000) }).then(r => r.json()),
  ]).then(([health, access]) => health.service === "dr-strategy-tracker-api" &&
    access.result?.data?.json?.lanPublicScanner === true).catch(() => false);
  if (running) {
    console.log("[LAN] DR Scanner is already running.");
    showLinks();
  } else {
    if (!process.argv.includes("--skip-build")) {
      console.log("[LAN] Building the app for this computer...");
      await run([path.join(root, "node_modules/vite/bin/vite.js"), "build"]);
      await run([path.join(root, "node_modules/esbuild/bin/esbuild"),
        "server/_core/index.ts", "--platform=node", "--packages=external", "--bundle",
        "--format=esm", "--outdir=dist"]);
    }
    showLinks();
    console.log("[LAN] Keep this computer awake. Press Ctrl+C to stop.");
    await run([path.join(root, "dist/index.js")]);
  }
} catch (error) {
  console.error("[LAN]", error.message);
  process.exitCode = 1;
}
