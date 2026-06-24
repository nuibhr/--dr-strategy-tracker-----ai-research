import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface DRPickData {
  symbol: string;
  companyName: string;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  drRatio: string;
  news: string;
  outlook: string;
  notes?: string;
}

export function DRAutoSave() {
  const [open, setOpen] = useState(false);
  const [drPicks, setDrPicks] = useState<DRPickData[]>([
    {
      symbol: "",
      companyName: "",
      entryPrice: 0,
      currentPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      drRatio: "1:1",
      news: "",
      outlook: "",
    },
  ]);

  const saveMutation = trpc.drAutoSave.saveDailyDRPicks.useMutation();

  const handleAddPick = () => {
    setDrPicks([
      ...drPicks,
      {
        symbol: "",
        companyName: "",
        entryPrice: 0,
        currentPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        drRatio: "1:1",
        news: "",
        outlook: "",
      },
    ]);
  };

  const handleRemovePick = (index: number) => {
    setDrPicks(drPicks.filter((_, i) => i !== index));
  };

  const handlePickChange = (index: number, field: keyof DRPickData, value: string | number) => {
    const updated = [...drPicks];
    updated[index] = { ...updated[index], [field]: value } as DRPickData;
    setDrPicks(updated);
  };

  const handleSave = async () => {
    try {
      // Validate picks
      const validPicks = drPicks.filter((pick) => pick.symbol && pick.companyName && pick.entryPrice);

      if (validPicks.length === 0) {
        toast.error("Please fill in at least one DR pick (Symbol, Company, Entry Price)");
        return;
      }

      // Get settings from localStorage or use defaults
      const settings = {
        spreadsheetId: localStorage.getItem("googleSheetsId") || "",
        range: localStorage.getItem("googleSheetsRange") || "Sheet1!A1:Z100",
        accessToken: localStorage.getItem("googleAccessToken") || "",
      };

      if (!settings.spreadsheetId || !settings.accessToken) {
        toast.error("Please configure Google Sheets in Settings first");
        return;
      }

      await saveMutation.mutateAsync({
        picks: validPicks,
        date: new Date().toISOString().split("T")[0],
        spreadsheetId: settings.spreadsheetId,
        range: settings.range,
        accessToken: settings.accessToken,
      });

      toast.success(`✅ Saved ${validPicks.length} DR picks to Google Sheets!`);
      setOpen(false);
      setDrPicks([
        {
          symbol: "",
          companyName: "",
          entryPrice: 0,
          currentPrice: 0,
          stopLoss: 0,
          takeProfit: 0,
          drRatio: "1:1",
          news: "",
          outlook: "",
        },
      ]);
    } catch (error) {
      toast.error(`Failed to save DR picks: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Save className="w-4 h-4" />
          Save Today's DR Picks
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Daily DR Picks to Google Sheets</DialogTitle>
          <DialogDescription>
            Add today's DR stock picks and save them directly to your Google Sheet for tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {drPicks.map((pick, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Pick #{index + 1}</h4>
                {drPicks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePick(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Symbol *</Label>
                  <Input
                    placeholder="e.g., ASTS03"
                    value={pick.symbol}
                    onChange={(e) => handlePickChange(index, "symbol", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Company Name *</Label>
                  <Input
                    placeholder="e.g., AST SpaceMobile"
                    value={pick.companyName}
                    onChange={(e) => handlePickChange(index, "companyName", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Entry Price (บาท) *</Label>
                  <Input
                    placeholder="e.g., 2.92"
                    type="number"
                    step="0.01"
                    value={pick.entryPrice || ""}
                    onChange={(e) => handlePickChange(index, "entryPrice", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Current Price (บาท)</Label>
                  <Input
                    placeholder="e.g., 3.25"
                    type="number"
                    step="0.01"
                    value={pick.currentPrice || ""}
                    onChange={(e) => handlePickChange(index, "currentPrice", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Stop Loss (บาท)</Label>
                  <Input
                    placeholder="e.g., 2.80"
                    type="number"
                    step="0.01"
                    value={pick.stopLoss || ""}
                    onChange={(e) => handlePickChange(index, "stopLoss", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Take Profit (บาท)</Label>
                  <Input
                    placeholder="e.g., 3.50"
                    type="number"
                    step="0.01"
                    value={pick.takeProfit || ""}
                    onChange={(e) => handlePickChange(index, "takeProfit", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>DR Ratio</Label>
                  <Input
                    placeholder="e.g., 1:1 or 1:10"
                    value={pick.drRatio}
                    onChange={(e) => handlePickChange(index, "drRatio", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>News</Label>
                <Textarea
                  placeholder="Latest news about this stock..."
                  value={pick.news}
                  onChange={(e) => handlePickChange(index, "news", e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label>Outlook</Label>
                <Textarea
                  placeholder="Market outlook and analysis..."
                  value={pick.outlook}
                  onChange={(e) => handlePickChange(index, "outlook", e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={handleAddPick} className="w-full">
            + Add Another Pick
          </Button>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save to Google Sheets
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
