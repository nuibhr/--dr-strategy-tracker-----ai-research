import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { portfolioRouter } from "./routers/portfolio";
import { googleSheetsRouter } from "./routers/googleSheets";
import { drAutoSaveRouter } from "./routers/drAutoSave";
import { telegramRouter } from "./routers/telegram";
import { algoEqRouter } from "./routers/algoEq";
import { dailyPicksRouter } from "./routers/dailyPicks";
import { drPicksRouter } from "./routers/drPicks";
import { dr80ScannerRouter } from "./routers/dr80Scanner";
import { marketSummaryRouter } from "./routers/marketSummary";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
});

export type AppRouter = typeof appRouter;
