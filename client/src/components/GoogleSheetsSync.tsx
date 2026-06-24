import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

interface GoogleSheetsSyncProps {
  portfolioId: number;
  onSyncComplete?: () => void;
}

export function GoogleSheetsSync({ portfolioId, onSyncComplete }: GoogleSheetsSyncProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getAuthUrl = trpc.googleSheets.getAuthUrl.useQuery(undefined, {
    enabled: false,
  });

  const syncFromSheets = trpc.googleSheets.syncFromSheets.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      setOpen(false);
      onSyncComplete?.();
    },
    onError: (error) => {
      toast.error(`❌ Sync failed: ${error.message}`);
    },
  });

  const handleGetAuthUrl = async () => {
    setIsLoading(true);
    try {
      const result = await getAuthUrl.refetch();
      if (result.data?.authUrl) {
        window.open(result.data.authUrl, "_blank", "width=600,height=700");
      }
    } catch (error) {
      toast.error("Failed to get authorization URL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (accessToken: string) => {
    await syncFromSheets.mutateAsync({
      portfolioId,
      accessToken,
    });
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Sync Google Sheets
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sync from Google Sheets</DialogTitle>
            <DialogDescription>
              Connect your Google account to sync DR positions from your personal Google Sheet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Your Google Sheet should have these columns:
              </p>
              <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                <li>• Symbol (e.g., ASTS03)</li>
                <li>• Entry Price</li>
                <li>• Current Price</li>
                <li>• Quantity</li>
                <li>• Stop Loss</li>
                <li>• Take Profit</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleGetAuthUrl}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  "1. Authorize with Google"
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                A new window will open to authorize access to your Google Sheets
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                2. After authorization, paste your access token:
              </p>
              <input
                type="password"
                placeholder="Paste access token here"
                className="w-full px-3 py-2 border rounded-md text-sm"
                id="accessToken"
              />
              <Button
                onClick={() => {
                  const token = (document.getElementById("accessToken") as HTMLInputElement)?.value;
                  if (token) {
                    handleSync(token);
                  } else {
                    toast.error("Please paste the access token");
                  }
                }}
                disabled={syncFromSheets.isPending}
                className="w-full mt-2"
              >
                {syncFromSheets.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  "Sync Positions"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
