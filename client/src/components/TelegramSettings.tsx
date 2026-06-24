import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Bell, Send } from "lucide-react";

export default function TelegramSettings() {
  const [chatId, setChatId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const setChatIdMutation = trpc.telegram.setChatId.useMutation();
  const sendTestMutation = trpc.telegram.sendTestNotification.useMutation();
  const getSettingsMutation = trpc.telegram.getSettings.useQuery();

  const handleSaveChatId = async () => {
    if (!chatId.trim()) {
      toast.error("Please enter your Telegram Chat ID");
      return;
    }

    setIsSaving(true);
    try {
      await setChatIdMutation.mutateAsync({ chatId });
      toast.success("✅ Telegram Chat ID saved!");
      localStorage.setItem("telegram_chat_id", chatId);
    } catch (error) {
      toast.error(`Failed to save Chat ID: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!chatId.trim()) {
      toast.error("Please save Chat ID first");
      return;
    }

    setIsTesting(true);
    try {
      await sendTestMutation.mutateAsync({ chatId });
      toast.success("✅ Test notification sent!");
    } catch (error) {
      toast.error(`Failed to send test: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          <div>
            <CardTitle className="text-white">Telegram Alerts</CardTitle>
            <CardDescription>Get notified when positions hit TP or SL</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="bg-slate-700/50 rounded p-4 space-y-2">
          <p className="text-sm font-semibold text-white">How to set up:</p>
          <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
            <li>Open Telegram and search for <strong>@hoonthai555bot</strong></li>
            <li>Send <code className="bg-slate-600 px-2 py-1 rounded text-xs">/start</code></li>
            <li>Copy your Chat ID from the response</li>
            <li>Paste it below</li>
          </ol>
        </div>

        {/* Chat ID Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Telegram Chat ID</label>
          <Input
            type="text"
            placeholder="Enter your Telegram Chat ID (e.g., 123456789)"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSaveChatId}
            disabled={isSaving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isSaving ? "Saving..." : "Save Chat ID"}
          </Button>
          <Button
            onClick={handleSendTest}
            disabled={isTesting || !chatId.trim()}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {isTesting ? "Sending..." : "Send Test"}
          </Button>
        </div>

        {/* Alert Types */}
        <div className="bg-slate-700/50 rounded p-4 space-y-2">
          <p className="text-sm font-semibold text-white">Alert Types:</p>
          <div className="space-y-1 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-green-400">🎉</span>
              <span>Take Profit (TP) Hit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">🛑</span>
              <span>Stop Loss (SL) Hit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">📊</span>
              <span>Daily DR Picks</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
