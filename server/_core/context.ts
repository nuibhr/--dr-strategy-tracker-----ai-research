import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Never expose the development bootstrap account on a shared/local tunnel.
  // It is available only when explicitly opted into for private testing.
  if (
    !user &&
    !ENV.isProduction &&
    !ENV.oAuthServerUrl &&
    process.env.LOCAL_DEV_BYPASS_AUTH === "true"
  ) {
    const now = new Date();
    user = {
      id: 1,
      openId: "bootstrap-admin",
      name: "Bootstrap Admin",
      email: "admin@example.test",
      passwordHash: null,
      loginMethod: "bootstrap",
      role: "admin",
      accessEnabled: 1,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
