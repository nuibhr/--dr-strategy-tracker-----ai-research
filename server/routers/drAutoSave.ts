import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { google } from "googleapis";
import { getDb } from "../db";

/**
 * DR Auto-Save Router
 * Automatically saves daily DR picks to Google Sheets
 */

export const drAutoSaveRouter = router({
  /**
   * Save daily DR picks to Google Sheets
   * Called when user requests "ขอ DR วันนี้"
   */
  saveDailyDRPicks: protectedProcedure
    .input(
      z.object({
        picks: z.array(
          z.object({
            symbol: z.string(),
            companyName: z.string(),
            entryPrice: z.number(),
            currentPrice: z.number(),
            stopLoss: z.number(),
            takeProfit: z.number(),
            drRatio: z.string(),
            news: z.string(),
            outlook: z.string(),
            notes: z.string().optional(),
          })
        ),
        date: z.string(),
        spreadsheetId: z.string(),
        range: z.string(),
        accessToken: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      try {
        // Initialize Google Sheets API with access token
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: input.accessToken });

        const sheets = google.sheets({ version: "v4", auth });

        // Prepare data for Google Sheets
        const values = [
          [
            "Date",
            "Symbol",
            "Company Name",
            "Entry Price (บาท)",
            "Current Price (บาท)",
            "Stop Loss (บาท)",
            "Take Profit (บาท)",
            "DR Ratio",
            "News",
            "Outlook",
            "Notes",
          ],
          ...input.picks.map((pick: any) => [
            input.date,
            pick.symbol,
            pick.companyName,
            pick.entryPrice,
            pick.currentPrice,
            pick.stopLoss,
            pick.takeProfit,
            pick.drRatio,
            pick.news,
            pick.outlook,
            pick.notes || "",
          ]),
        ];

        // Append data to Google Sheets
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: input.spreadsheetId,
          range: input.range,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values,
          },
        });

        // Save to database for tracking
        const db = await getDb();
        if (db) {
          // TODO: Add database table for DR auto-save history
          console.log("[DR Auto-Save] Saved to Google Sheets:", response.data.updates);
        }

        return {
          success: true,
          message: `✅ บันทึก ${input.picks.length} DR picks ลงไปแล้ว`,
          updatedRows: response.data.updates?.updatedRows || 0,
          updatedCells: response.data.updates?.updatedCells || 0,
        };
      } catch (error) {
        console.error("[DR Auto-Save] Error:", error);
        throw new Error(`Failed to save DR picks: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  /**
   * Get Google Sheets authorization URL
   */
  getAuthUrl: protectedProcedure.query(() => {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      `${process.env.OAUTH_SERVER_URL}/api/oauth/callback`
    );

    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state: JSON.stringify({ action: "dr-auto-save" }),
    });

    return {
      authUrl,
      message: "Click the link to authorize Google Sheets access",
    };
  }),

  /**
   * Get saved DR picks history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }: any) => {
      // TODO: Implement database query for DR auto-save history
      return {
        history: [],
        message: "History feature coming soon",
      };
    }),
});
