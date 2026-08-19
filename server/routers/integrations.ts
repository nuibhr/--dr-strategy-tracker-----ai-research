import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { integrationProcedure, router } from "../_core/trpc";
import { scanDR80, type DR80ScanResult } from "../services/dr80ScannerService";

const DR_SOURCE = "settrade";

function underlyingSymbol(symbol: string): string {
  return symbol.replace(/(?:23|80)$/, "");
}

function confidenceFromScore(totalScore: number): number {
  // This is a normalized scanner score, not a probability of profit.
  const maxScore = 20;
  return Math.max(0, Math.min(100, Math.round((totalScore / maxScore) * 100)));
}

function toAiPick(pick: DR80ScanResult, scannedAt: Date) {
  return {
    symbol: pick.symbol,
    underlyingSymbol: underlyingSymbol(pick.symbol),
    companyName: null as string | null,
    currentPrice: pick.currentPrice,
    changePct: pick.changePct,
    totalScore: pick.totalScore,
    confidence: confidenceFromScore(pick.totalScore),
    setup: "DR80 Technical Scan",
    entry: pick.entry,
    tp1: pick.tp1,
    tp2: pick.tp2,
    sl: pick.sl,
    riskReward: pick.riskReward,
    reason: pick.reason,
    source: DR_SOURCE,
    scannedAt: scannedAt.toISOString(),
  };
}

function toPlan(pick: DR80ScanResult, fetchedAt: Date) {
  return {
    symbol: pick.symbol,
    support: {
      s1: pick.camarilla.S1,
      s2: pick.camarilla.S2,
      s3: pick.camarilla.S3,
      s4: pick.camarilla.S4,
    },
    resistance: {
      r1: pick.camarilla.R1,
      r2: pick.camarilla.R2,
      r3: pick.camarilla.R3,
      r4: pick.camarilla.R4,
    },
    entry: pick.entry,
    tp1: pick.tp1,
    tp2: pick.tp2,
    sl: pick.sl,
    riskReward: pick.riskReward,
    rationale: pick.reason,
    invalidation: `แผนยกเลิกเมื่อราคาต่ำกว่า SL ${pick.sl}`,
    source: DR_SOURCE,
    fetchedAt: fetchedAt.toISOString(),
  };
}

export const integrationsRouter = router({
  dr: router({
    aiPicks: integrationProcedure.query(async () => {
      const scannedAt = new Date();
      const picks = await scanDR80(4);
      return {
        picks: picks.map(pick => toAiPick(pick, scannedAt)),
        scannedAt: scannedAt.toISOString(),
      };
    }),

    plan: integrationProcedure
      .input(z.object({ symbol: z.string().regex(/^[A-Z0-9]+$/) }))
      .query(async ({ input }) => {
        const scannedAt = new Date();
        const picks = await scanDR80(4);
        const pick = picks.find(item => item.symbol === input.symbol.toUpperCase());

        if (!pick) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Symbol is not a published DR AI Pick",
          });
        }

        return toPlan(pick, scannedAt);
      }),
  }),
});
