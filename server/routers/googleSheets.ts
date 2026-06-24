import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { google } from "googleapis";
import { getDb } from "../db";
import { positions, portfolios } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const sheets = google.sheets("v4");

export const googleSheetsRouter = router({
  // Get Google OAuth URL for user authorization
  getAuthUrl: protectedProcedure.query(async ({ ctx }) => {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      `${process.env.VITE_FRONTEND_FORGE_API_URL?.replace(/\/+$/, "")}/api/oauth/google/callback`
    );

    const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state: ctx.user.id.toString(),
    });

    return { authUrl };
  }),

  // Sync positions from Google Sheets
  syncFromSheets: protectedProcedure
    .input(
      z.object({
        portfolioId: z.number(),
        accessToken: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Verify portfolio belongs to user
        const portfolio = await db
          .select()
          .from(portfolios)
          .where(eq(portfolios.id, input.portfolioId))
          .limit(1);

        if (!portfolio.length || portfolio[0].userId !== ctx.user.id) {
          throw new Error("Portfolio not found");
        }

        // Create OAuth client with access token
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_OAUTH_CLIENT_ID,
          process.env.GOOGLE_OAUTH_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ access_token: input.accessToken });

        // Fetch data from Google Sheets
        const response = await sheets.spreadsheets.values.get({
          auth: oauth2Client,
          spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
          range: process.env.GOOGLE_SHEETS_RANGE || "Sheet1!A1:Z100",
        });

        const values = response.data.values || [];
        if (values.length === 0) {
          throw new Error("No data found in Google Sheet");
        }

        // Parse sheet data (assuming first row is header)
        const headers = values[0] as string[];
        const dataRows = values.slice(1);

        let syncedCount = 0;

        // Process each row
        for (const row of dataRows) {
          if (!row || row.length === 0) continue;

          // Map sheet columns to position data
          const symbol = row[headers.indexOf("Symbol")] || "";
          const entryPrice = parseFloat(row[headers.indexOf("Entry Price")] || "0");
          const currentPrice = parseFloat(row[headers.indexOf("Current Price")] || "0");
          const quantity = parseFloat(row[headers.indexOf("Quantity")] || "0");
          const stopLoss = parseFloat(row[headers.indexOf("Stop Loss")] || "0");
          const takeProfit = parseFloat(row[headers.indexOf("Take Profit")] || "0");

          if (!symbol || !entryPrice) continue;

          // Check if position already exists
          const existing = await db
            .select()
            .from(positions)
            .where(eq(positions.portfolioId, input.portfolioId))
            .limit(1);

          // Create or update position
          if (!existing.length) {
            await db.insert(positions).values({
              portfolioId: input.portfolioId,
              ticker: symbol,
              drName: symbol,
              entryPrice: entryPrice.toString(),
              currentPrice: (currentPrice || entryPrice).toString(),
              quantity: quantity.toString(),
              stopLoss: stopLoss.toString(),
              takeProfit: takeProfit.toString(),
              status: "open",
            });
          }

          syncedCount++;
        }

        return {
          success: true,
          syncedCount,
          message: `Successfully synced ${syncedCount} positions from Google Sheets`,
        };
      } catch (error) {
        console.error("Google Sheets sync error:", error);
        throw new Error(
          `Failed to sync from Google Sheets: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  // Get sync status
  getSyncStatus: protectedProcedure
    .input(z.object({ portfolioId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const portfolio = await db
        .select()
        .from(portfolios)
        .where(eq(portfolios.id, input.portfolioId))
        .limit(1);

      if (!portfolio.length || portfolio[0].userId !== ctx.user.id) {
        throw new Error("Portfolio not found");
      }

      const positionCount = await db
        .select()
        .from(positions)
        .where(eq(positions.portfolioId, input.portfolioId));

      return {
        positionCount: positionCount.length,
        message: "Portfolio sync status retrieved",
      };
    }),
});
