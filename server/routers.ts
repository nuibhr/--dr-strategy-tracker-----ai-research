import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { verifyPassword } from "./_core/passwords";
import { getUserByEmail, upsertUser } from "./db";
import { portfolioRouter } from "./routers/portfolio";
import { googleSheetsRouter } from "./routers/googleSheets";
import { drAutoSaveRouter } from "./routers/drAutoSave";
import { telegramRouter } from "./routers/telegram";
import { algoEqRouter } from "./routers/algoEq";
import { dailyPicksRouter } from "./routers/dailyPicks";
import { drPicksRouter } from "./routers/drPicks";
import { dr80ScannerRouter } from "./routers/dr80Scanner";
import { marketSummaryRouter } from "./routers/marketSummary";
import { adminUsersRouter } from "./routers/adminUsers";
import { integrationsRouter } from "./routers/integrations";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD ?? "";
        let user = await getUserByEmail(email);

        if (adminEmail && adminPassword && email === adminEmail && input.password === adminPassword) {
          const openId = `password:${email}`;
          await upsertUser({
            openId,
            name: process.env.ADMIN_NAME || "Admin",
            email,
            loginMethod: "password",
            role: "admin",
            lastSignedIn: new Date(),
          });
          user = await getUserByEmail(email);
        } else if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
          });
        }

        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ไม่สามารถสร้าง session ได้",
          });
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email || "User",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return {
          user,
          sessionToken,
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  portfolio: portfolioRouter,
  googleSheets: googleSheetsRouter,
  drAutoSave: drAutoSaveRouter,
  telegram: telegramRouter,
  algoEq: algoEqRouter,
  dailyPicks: dailyPicksRouter,
  drPicks: drPicksRouter,
  dr80Scanner: dr80ScannerRouter,
  marketSummary: marketSummaryRouter,
  adminUsers: adminUsersRouter,
  integrations: integrationsRouter,
});

export type AppRouter = typeof appRouter;
