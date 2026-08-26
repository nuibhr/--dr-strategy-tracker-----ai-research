import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import crypto from "node:crypto";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

function hasValidServiceToken(authorization: string | undefined): boolean {
  const expected = process.env.DR_TRACKER_SERVICE_TOKEN?.trim();
  if (!expected || !authorization?.startsWith("Bearer ")) return false;

  const provided = authorization.slice("Bearer ".length).trim();
  const expectedBytes = Buffer.from(expected, "utf8");
  const providedBytes = Buffer.from(provided, "utf8");
  return expectedBytes.length === providedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, providedBytes);
}

/** Server-to-server, read-only integration boundary. */
export const integrationProcedure = t.procedure.use(async opts => {
  if (opts.type !== "query") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Read-only integration" });
  }

  const authorization = opts.ctx.req.headers.authorization;
  const header = Array.isArray(authorization) ? authorization[0] : authorization;

  if (!hasValidServiceToken(header)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid integration credentials" });
  }

  return opts.next();
});

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (ctx.user.role !== "admin" && ctx.user.accessEnabled === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "บัญชีนี้ถูกปิดสิทธิ์การเข้าดูข้อมูล" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
