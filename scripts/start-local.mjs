import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const serverBundle = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const child = spawn(process.execPath, [serverBundle], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
});

child.on("exit", code => {
  process.exit(code ?? 1);
});

child.on("error", error => {
  console.error("[local-start] Unable to start the production server:", error);
  process.exit(1);
});
