import { env } from "cloudflare:workers";
import { Container, getContainer } from "@cloudflare/containers";

/**
 * Cloudflare Container wrapper for the existing Node/Express API.
 *
 * The application itself remains in the Dockerfile at the repository root.
 * This wrapper only provides the Cloudflare Worker entrypoint, routing every
 * request to one stable container instance so cookies and in-memory process
 * state behave like the current single-machine deployment.
 */
export class DrStrategyTrackerContainer extends Container {
  defaultPort = 3000;
  sleepAfter = "10m";

  // Worker secrets/vars are injected into the container at startup. Values
  // stay server-side; none of these are exposed to the browser.
  envVars = {
    NODE_ENV: "production",
    PORT: "3000",
    JWT_SECRET: env.JWT_SECRET,
    ADMIN_EMAIL: env.ADMIN_EMAIL,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD,
    ADMIN_NAME: env.ADMIN_NAME,
    FRONTEND_ORIGIN: env.FRONTEND_ORIGIN,
    VITE_APP_ID: env.VITE_APP_ID,
    VITE_OAUTH_PORTAL_URL: env.VITE_OAUTH_PORTAL_URL,
    OAUTH_SERVER_URL: env.OAUTH_SERVER_URL,
    OWNER_OPEN_ID: env.OWNER_OPEN_ID,
    DATABASE_URL: env.DATABASE_URL,
    BROKER_CREDENTIALS_ENCRYPTION_KEY: env.BROKER_CREDENTIALS_ENCRYPTION_KEY,
    SETTRADE_BROKER_ID: env.SETTRADE_BROKER_ID,
    SETTRADE_APP_CODE: env.SETTRADE_APP_CODE,
    BROKER_APP_ID: env.BROKER_APP_ID,
    BROKER_API_SECRET: env.BROKER_API_SECRET,
    SETTRADE_REQUIRE_REALTIME: env.SETTRADE_REQUIRE_REALTIME,
    DR_UNIVERSE: env.DR_UNIVERSE,
    DR_UNIVERSE_EXTRA: env.DR_UNIVERSE_EXTRA,
    DR_ALLOWED_SUFFIXES: env.DR_ALLOWED_SUFFIXES,
    DR_INCLUDE_GENERATED_VARIANTS: env.DR_INCLUDE_GENERATED_VARIANTS,
    DR_SCAN_BATCH_SIZE: env.DR_SCAN_BATCH_SIZE,
    DR_TRACKER_SERVICE_TOKEN: env.DR_TRACKER_SERVICE_TOKEN,
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
    BUILT_IN_FORGE_API_URL: env.BUILT_IN_FORGE_API_URL,
    BUILT_IN_FORGE_API_KEY: env.BUILT_IN_FORGE_API_KEY,
    GOOGLE_OAUTH_CLIENT_ID: env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_SHEETS_SPREADSHEET_ID: env.GOOGLE_SHEETS_SPREADSHEET_ID,
    GOOGLE_SHEETS_RANGE: env.GOOGLE_SHEETS_RANGE,
    VITE_FRONTEND_FORGE_API_URL: env.VITE_FRONTEND_FORGE_API_URL,
  };
}

interface Env {
  DR_CONTAINER: DurableObjectNamespace;
}

export default {
  async fetch(request, workerEnv: Env): Promise<Response> {
    // One stable name keeps this API on a single container instance. Database
    // state is in TiDB; the container filesystem is not used for persistence.
    const container = getContainer(workerEnv.DR_CONTAINER, "primary");
    return container.fetch(request);
  },
};
