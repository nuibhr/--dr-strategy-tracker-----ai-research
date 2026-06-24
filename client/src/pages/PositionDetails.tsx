import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Edit2, Bell, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";

export default function PositionDetails() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [match, params] = useRoute("/positions/:id");
  const positionId = params?.id ? parseInt(params.id) : 0;

  const { data: position, isLoading, refetch } = trpc.portfolio.getPosition.useQuery(
    { positionId },
    { enabled: !!positionId && match }
  );

  const { data: alerts = [] } = trpc.portfolio.getAlerts.useQuery(
    { positionId },
    { enabled: !!positionId }
  );

  const updatePositionMutation = trpc.portfolio.updatePosition.useMutation({
    onSuccess: () => {
      toast.success("Position updated");
      setIsEditOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const createAlertMutation = trpc.portfolio.createAlert.useMutation({
    onSuccess: () => {
      toast.success("Alert created");
      setIsAlertOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const persistPriceMutation = trpc.portfolio.updatePosition.useMutation({
    onSuccess: () => {
      toast.success(`✅ Price persisted to database`);
      refetch();
      setIsRefreshing(false);
    },
    onError: (error) => {
      toast.error(`Failed to persist price: ${error.message}`);
      setIsRefreshing(false);
    },
  });

  const refreshPriceMutation = trpc.algoEq.updatePositionPrice.useMutation({
    onSuccess: (data) => {
      persistPriceMutation.mutate({
        positionId: data.positionId,
        currentPrice: data.currentPrice.toString(),
      });
    },
    onError: (error) => {
      toast.error(`Failed to refresh price: ${error.message}`);
      setIsRefreshing(false);
    },
  });

  const handleRefreshPrice = async () => {
    if (!position) return;
    setIsRefreshing(true);
    try {
      await refreshPriceMutation.mutateAsync({
        positionId: position.id,
        symbol: position.ticker,
      });
    } catch (error) {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading position...</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Position not found</p>
      </div>
    );
  }

  const currentPrice = parseFloat(position.currentPrice || "0");
  const entryPrice = parseFloat(position.entryPrice || "0");
  const pnl = currentPrice - entryPrice;
  const pnlPercent = entryPrice > 0 ? ((pnl / entryPrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{position.ticker}</h1>
                <p className="text-xs text-slate-400">{position.drName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Position Card */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{position.companyName}</CardTitle>
                    <CardDescription className="text-slate-400">
                      Status: {position.status}
                    </CardDescription>
                  </div>
                  <Badge className={`${
                    pnl >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Price Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">Entry Price (THB)</p>
                    <p className="text-2xl font-bold text-white">฿{position.entryPrice}</p>
                    <p className="text-xs text-slate-500 mt-1">USD: ${position.entryPriceUSD}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">Current Price (THB)</p>
                    <p className="text-2xl font-bold text-white">฿{position.currentPrice}</p>
                    <p className="text-xs text-slate-500 mt-1">USD: ${position.currentPriceUSD}</p>
                  </div>
                </div>

                {/* P&L Section */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-slate-400">P&L</p>
                    <p className={`text-lg font-semibold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-slate-400">P&L %</p>
                    <p className={`text-lg font-semibold ${pnlPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-slate-400">Qty</p>
                    <p className="text-lg font-semibold text-white">{position.quantity}</p>
                  </div>
                </div>

                {/* Technical Levels */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Technical Levels</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-700/50 rounded p-3">
                      <p className="text-xs text-slate-400">Support</p>
                      <p className="text-sm font-semibold text-green-400">฿{position.support}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3">
                      <p className="text-xs text-slate-400">Resistance</p>
                      <p className="text-sm font-semibold text-red-400">฿{position.resistance}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3">
                      <p className="text-xs text-slate-400">Ratio</p>
                      <p className="text-sm font-semibold text-white">{position.ratio}</p>
                    </div>
                  </div>
                </div>

                {/* Entry/Exit Levels */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Entry/Exit Levels</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded p-3">
                      <p className="text-xs text-slate-400">Stop Loss</p>
                      <p className="text-sm font-semibold text-red-400">฿{position.stopLoss}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3">
                      <p className="text-xs text-slate-400">Take Profit</p>
                      <p className="text-sm font-semibold text-green-400">฿{position.takeProfit}</p>
                    </div>
                  </div>
                </div>

                {/* News & Outlook */}
                {position.news && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-xs text-amber-400 font-semibold mb-1">📰 News</p>
                    <p className="text-sm text-slate-300">{position.news}</p>
                  </div>
                )}

                {position.outlook && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-blue-400 font-semibold mb-1">🔮 Outlook</p>
                    <p className="text-sm text-slate-300">{position.outlook}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleRefreshPrice}
                    disabled={isRefreshing}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Refreshing..." : "Refresh Price"}
                  </Button>

                  <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 flex-1 bg-blue-600 hover:bg-blue-700">
                        <Edit2 className="w-4 h-4" />
                        Manual Update
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Update Position</DialogTitle>
                      </DialogHeader>
                      <UpdatePositionForm
                        position={position}
                        onSubmit={async (data) => {
                          await updatePositionMutation.mutateAsync({
                            positionId: position.id,
                            ...data,
                          });
                        }}
                        isLoading={updatePositionMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 flex-1 bg-amber-600 hover:bg-amber-700">
                        <Bell className="w-4 h-4" />
                        Set Alert
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Create Alert</DialogTitle>
                      </DialogHeader>
                      <CreateAlertForm
                        positionId={position.id}
                        onSubmit={async (data) => {
                          await createAlertMutation.mutateAsync(data);
                        }}
                        isLoading={createAlertMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Alerts */}
          <div>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <p className="text-slate-400 text-sm">No alerts set</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="bg-slate-700/50 rounded p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-300 uppercase">{alert.type}</p>
                            <p className="text-sm font-semibold text-white">฿{alert.targetPrice}</p>
                          </div>
                          <Badge className={alert.triggered ? "bg-green-500/20 text-green-400" : "bg-slate-600 text-slate-300"}>
                            {alert.triggered ? "Triggered" : "Active"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function UpdatePositionForm({ position, onSubmit, isLoading }: { position: any; onSubmit: (data: any) => Promise<void>; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    currentPrice: position.currentPrice || "",
    currentPriceUSD: position.currentPriceUSD || "",
    status: position.status || "open",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPrice" className="text-slate-300">Current Price (THB)</Label>
        <Input
          id="currentPrice"
          type="number"
          step="0.01"
          value={formData.currentPrice}
          onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currentPriceUSD" className="text-slate-300">Current Price (USD)</Label>
        <Input
          id="currentPriceUSD"
          type="number"
          step="0.01"
          value={formData.currentPriceUSD}
          onChange={(e) => setFormData({ ...formData, currentPriceUSD: e.target.value })}
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="text-slate-300">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="tp_hit">TP Hit</SelectItem>
            <SelectItem value="sl_hit">SL Hit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
        {isLoading ? "Updating..." : "Update Position"}
      </Button>
    </form>
  );
}

function CreateAlertForm({ positionId, onSubmit, isLoading }: { positionId: number; onSubmit: (data: any) => Promise<void>; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    type: "tp_hit",
    targetPrice: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetPrice.trim()) {
      toast.error("Target price is required");
      return;
    }
    await onSubmit({
      positionId,
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type" className="text-slate-300">Alert Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            <SelectItem value="tp_hit">Take Profit</SelectItem>
            <SelectItem value="sl_hit">Stop Loss</SelectItem>
            <SelectItem value="price_alert">Price Alert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetPrice" className="text-slate-300">Target Price (THB)</Label>
        <Input
          id="targetPrice"
          type="number"
          step="0.01"
          placeholder="e.g., 100.50"
          value={formData.targetPrice}
          onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-amber-600 hover:bg-amber-700">
        {isLoading ? "Creating..." : "Create Alert"}
      </Button>
    </form>
  );
}
