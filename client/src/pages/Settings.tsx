import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";
import TelegramSettings from "@/components/TelegramSettings";

export default function Settings() {
  const [googleSheetSettings, setGoogleSheetSettings] = useState({
    spreadsheetId: "",
    range: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("googleSheetSettings");
    if (saved) {
      try {
        setGoogleSheetSettings(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  const handleSaveSettings = async () => {
    if (!googleSheetSettings.spreadsheetId.trim()) {
      toast.error("Please enter Spreadsheet ID");
      return;
    }
    if (!googleSheetSettings.range.trim()) {
      toast.error("Please enter Range (e.g., Sheet1!A1:Z100)");
      return;
    }

    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem("googleSheetSettings", JSON.stringify(googleSheetSettings));
      toast.success("✅ Google Sheets settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Settings</h1>
              <p className="text-xs text-slate-400">Configure your DR Strategy Tracker</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Google Sheets Configuration */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span>🔗 Google Sheets Configuration</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Connect your personal Google Sheet to sync DR positions
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">How to find your Spreadsheet ID:</h3>
                <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                  <li>Open your Google Sheet</li>
                  <li>Copy the URL: <code className="bg-slate-600 px-2 py-1 rounded text-xs">https://docs.google.com/spreadsheets/d/<span className="text-amber-400">SPREADSHEET_ID</span>/edit</code></li>
                  <li>Paste the <span className="text-amber-400">SPREADSHEET_ID</span> part below</li>
                </ol>
              </div>

              {/* Spreadsheet ID Input */}
              <div className="space-y-2">
                <Label htmlFor="spreadsheetId" className="text-slate-300">Spreadsheet ID</Label>
                <Input
                  id="spreadsheetId"
                  placeholder="e.g., 1BxiMVs0XRA5nFMKtKLonq5IlqfZeHg6sFqFSnA1234"
                  value={googleSheetSettings.spreadsheetId}
                  onChange={(e) => setGoogleSheetSettings({ ...googleSheetSettings, spreadsheetId: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500">
                  Find this in your Google Sheet URL between /d/ and /edit
                </p>
              </div>

              {/* Range Input */}
              <div className="space-y-2">
                <Label htmlFor="range" className="text-slate-300">Sheet Range</Label>
                <Input
                  id="range"
                  placeholder="e.g., Sheet1!A1:Z100"
                  value={googleSheetSettings.range}
                  onChange={(e) => setGoogleSheetSettings({ ...googleSheetSettings, range: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500">
                  Format: SheetName!A1:Z100 (include headers)
                </p>
              </div>

              {/* Expected Columns */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Expected columns in your sheet:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                  <div>• Symbol (e.g., ASTS03)</div>
                  <div>• Entry Price</div>
                  <div>• Current Price</div>
                  <div>• Quantity</div>
                  <div>• Stop Loss</div>
                  <div>• Take Profit</div>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full bg-amber-500 hover:bg-amber-600"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>

              {/* Current Settings Display */}
              {googleSheetSettings.spreadsheetId && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-400 font-semibold mb-2">✅ Settings Saved</p>
                  <p className="text-xs text-green-300">
                    Spreadsheet ID: <code className="bg-green-600/20 px-2 py-1 rounded">{googleSheetSettings.spreadsheetId.substring(0, 20)}...</code>
                  </p>
                  <p className="text-xs text-green-300 mt-1">
                    Range: <code className="bg-green-600/20 px-2 py-1 rounded">{googleSheetSettings.range}</code>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Telegram Settings */}
          <TelegramSettings />

          {/* Info Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>1. ✅ Configure your Google Sheet settings above</p>
              <p>2. Go to <span className="text-amber-400">My Portfolio</span></p>
              <p>3. Click <span className="text-amber-400">Sync Google Sheets</span> button</p>
              <p>4. Authorize with your Google account</p>
              <p>5. Your positions will be synced automatically</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
