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
  enableInternet = true;
  pingEndpoint = "/api/health";

  private static value(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  // Worker secrets/vars are injected into the container at startup. Values
  // stay server-side; none of these are exposed to the browser.
  envVars = {
    NODE_ENV: "production",
    PORT: "3000",
    JWT_SECRET: DrStrategyTrackerContainer.value(env.JWT_SECRET),
    ADMIN_EMAIL: DrStrategyTrackerContainer.value(env.ADMIN_EMAIL),
    ADMIN_PASSWORD: DrStrategyTrackerContainer.value(env.ADMIN_PASSWORD),
    ADMIN_NAME: DrStrategyTrackerContainer.value(env.ADMIN_NAME),
    FRONTEND_ORIGIN: DrStrategyTrackerContainer.value(env.FRONTEND_ORIGIN),
    VITE_APP_ID: DrStrategyTrackerContainer.value(env.VITE_APP_ID),
    VITE_OAUTH_PORTAL_URL: DrStrategyTrackerContainer.value(env.VITE_OAUTH_PORTAL_URL),
    OAUTH_SERVER_URL: DrStrategyTrackerContainer.value(env.OAUTH_SERVER_URL),
    OWNER_OPEN_ID: DrStrategyTrackerContainer.value(env.OWNER_OPEN_ID),
    DATABASE_URL: DrStrategyTrackerContainer.value(env.DATABASE_URL),
    BROKER_CREDENTIALS_ENCRYPTION_KEY: DrStrategyTrackerContainer.value(env.BROKER_CREDENTIALS_ENCRYPTION_KEY),
    SETTRADE_BROKER_ID: DrStrategyTrackerContainer.value(env.SETTRADE_BROKER_ID),
    SETTRADE_APP_CODE: DrStrategyTrackerContainer.value(env.SETTRADE_APP_CODE),
    BROKER_APP_ID: DrStrategyTrackerContainer.value(env.BROKER_APP_ID),
    BROKER_API_SECRET: DrStrategyTrackerContainer.value(env.BROKER_API_SECRET),
    SETTRADE_REQUIRE_REALTIME: DrStrategyTrackerContainer.value(env.SETTRADE_REQUIRE_REALTIME),
    DR_UNIVERSE: DrStrategyTrackerContainer.value(env.DR_UNIVERSE),
    DR_UNIVERSE_EXTRA: DrStrategyTrackerContainer.value(env.DR_UNIVERSE_EXTRA),
    DR_ALLOWED_SUFFIXES: DrStrategyTrackerContainer.value(env.DR_ALLOWED_SUFFIXES),
    DR_INCLUDE_GENERATED_VARIANTS: DrStrategyTrackerContainer.value(env.DR_INCLUDE_GENERATED_VARIANTS),
    DR_SCAN_BATCH_SIZE: DrStrategyTrackerContainer.value(env.DR_SCAN_BATCH_SIZE),
    DR_TRACKER_SERVICE_TOKEN: DrStrategyTrackerContainer.value(env.DR_TRACKER_SERVICE_TOKEN),
    TELEGRAM_BOT_TOKEN: DrStrategyTrackerContainer.value(env.TELEGRAM_BOT_TOKEN),
    TELEGRAM_CHAT_ID: DrStrategyTrackerContainer.value(env.TELEGRAM_CHAT_ID),
    BUILT_IN_FORGE_API_URL: DrStrategyTrackerContainer.value(env.BUILT_IN_FORGE_API_URL),
    BUILT_IN_FORGE_API_KEY: DrStrategyTrackerContainer.value(env.BUILT_IN_FORGE_API_KEY),
    GOOGLE_OAUTH_CLIENT_ID: DrStrategyTrackerContainer.value(env.GOOGLE_OAUTH_CLIENT_ID),
    GOOGLE_OAUTH_CLIENT_SECRET: DrStrategyTrackerContainer.value(env.GOOGLE_OAUTH_CLIENT_SECRET),
    GOOGLE_SHEETS_SPREADSHEET_ID: DrStrategyTrackerContainer.value(env.GOOGLE_SHEETS_SPREADSHEET_ID),
    GOOGLE_SHEETS_RANGE: DrStrategyTrackerContainer.value(env.GOOGLE_SHEETS_RANGE),
    VITE_FRONTEND_FORGE_API_URL: DrStrategyTrackerContainer.value(env.VITE_FRONTEND_FORGE_API_URL),
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
