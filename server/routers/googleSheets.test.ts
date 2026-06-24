import { describe, it, expect } from "vitest";

describe("Google Sheets OAuth Integration", () => {
  it("should validate Google Sheets API credentials (optional)", async () => {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE || "Sheet1!A1:Z100";

    // If credentials are not set, skip the test (Google Sheets is optional)
    if (!spreadsheetId) {
      console.log("[Test] GOOGLE_SHEETS_SPREADSHEET_ID not set, skipping Google Sheets test");
      return;
    }

    expect(spreadsheetId).toBeDefined();
    expect(range).toBeDefined();
    expect(spreadsheetId).toMatch(/^[a-zA-Z0-9-_]+$/);
    expect(range).toMatch(/^[a-zA-Z0-9!:]+$/);
  });

  it("should have valid Google OAuth credentials format (optional)", () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    // If credentials are not set, skip the test (Google OAuth is optional)
    if (!clientId || !clientSecret) {
      console.log("[Test] Google OAuth credentials not set, skipping Google OAuth test");
      return;
    }

    expect(clientId).toBeDefined();
    expect(clientSecret).toBeDefined();
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });
});
