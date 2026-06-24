import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, ArrowDownRight, Plus, TrendingUp, RefreshCw, Calendar } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { AddPositionDialog } from "@/components/AddPositionDialog";
import { GoogleSheetsSync } from "@/components/GoogleSheetsSync";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Portfolio() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    portfolioName: "",
    portfolioDescription: "",
  });

  // Fetch portfolios
  const { data: portfolios = [], isLoading, refetch } = trpc.portfolio.list.useQuery();
  
  // Create portfolio mutation
  const addPositionMutation = trpc.portfolio.addPosition.useMutation({
    onSuccess: () => {
      toast.success("Position added successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const createPortfoliMutation = trpc.portfolio.create.useMutation({
    onSuccess: () => {
      toast.success("Portfolio created successfully");
      setFormData({ portfolioName: "", portfolioDescription: "" });
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.portfolioName.trim()) {
      toast.error("Please enter a portfolio name");
      return;
    }
    
    await createPortfoliMutation.mutateAsync({
      name: formData.portfolioName,
      description: formData.portfolioDescription || undefined,
    });
  };

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
                <h1 className="text-xl font-bold text-white">My Portfolios</h1>
                <p className="text-xs text-slate-400">Track your DR stock positions</p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/history")}
              variant="outline"
              className="gap-2 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <Calendar className="w-4 h-4" />
              View History
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Your Portfolios</h2>
            <p className="text-slate-400">Manage and track your DR stock investments</p>
          </div>
        </div>

        {/* Create Portfolio Button */}
        <div className="mb-8">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4" />
                New Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Portfolio</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a new portfolio to track your DR stock positions
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreatePortfolio} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Portfolio Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Q2 2026 Strategy"
                    value={formData.portfolioName}
                    onChange={(e) => setFormData({ ...formData, portfolioName: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-300">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g., AI infrastructure plays"
                    value={formData.portfolioDescription}
                    onChange={(e) => setFormData({ ...formData, portfolioDescription: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={createPortfoliMutation.isPending}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                >
                  {createPortfoliMutation.isPending ? "Creating..." : "Create Portfolio"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Portfolios Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading portfolios...</p>
          </div>
        ) : portfolios.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-12 text-center">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No portfolios yet</p>
              <p className="text-sm text-slate-500 mb-6">Create your first portfolio to start tracking DR stocks</p>
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-amber-500 hover:bg-amber-600">
                    <Plus className="w-4 h-4" />
                    Create Portfolio
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Portfolio</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Create a new portfolio to track your DR stock positions
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleCreatePortfolio} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-300">Portfolio Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Q2 2026 Strategy"
                        value={formData.portfolioName}
                        onChange={(e) => setFormData({ ...formData, portfolioName: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-slate-300">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="e.g., AI infrastructure plays"
                        value={formData.portfolioDescription}
                        onChange={(e) => setFormData({ ...formData, portfolioDescription: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={createPortfoliMutation.isPending}
                      className="w-full bg-amber-500 hover:bg-amber-600"
                    >
                      {createPortfoliMutation.isPending ? "Creating..." : "Create Portfolio"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {portfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onAddPosition={addPositionMutation}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PortfolioCard({ portfolio, onAddPosition }: { portfolio: any; onAddPosition: any }) {
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const { data: positions = [], refetch: refetchPositions } = trpc.portfolio.getPositions.useQuery(
    { portfolioId: portfolio.id },
    { enabled: !!portfolio.id }
  );

  const refreshPriceMutation = trpc.algoEq.updatePositionPrice.useMutation();
  const updatePositionMutation = trpc.portfolio.updatePosition.useMutation();

  const handleRefreshAllPrices = async () => {
    if (positions.length === 0) {
      toast.error("No positions to refresh");
      return;
    }

    setIsRefreshingAll(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const position of positions) {
        try {
          const priceData = await refreshPriceMutation.mutateAsync({
            positionId: position.id,
            symbol: position.ticker,
          });

          await updatePositionMutation.mutateAsync({
            positionId: priceData.positionId,
            currentPrice: priceData.currentPrice.toString(),
          });

          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`✅ Updated ${successCount} position(s)`);
      }
      if (errorCount > 0) {
        toast.error(`⚠️ Failed to update ${errorCount} position(s)`);
      }

      refetchPositions();
    } catch (error) {
      toast.error("Error refreshing prices");
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Calculate portfolio stats
  const totalPnL = positions.reduce((sum, pos) => {
    const pnl = parseFloat(pos.pnl || "0");
    return sum + pnl;
  }, 0);

  const totalPnLPercent = positions.length > 0
    ? (positions.reduce((sum, pos) => sum + parseFloat(pos.pnlPercent || "0"), 0) / positions.length)
    : 0;

  const openPositions = positions.filter(p => p.status === "open").length;
  const closedPositions = positions.filter(p => p.status === "closed").length;

  return (
    <Card className="bg-slate-800 border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
      <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-lg">{portfolio.name}</CardTitle>
            <CardDescription className="text-slate-400">{portfolio.description}</CardDescription>
          </div>
          <Badge variant="outline" className="text-amber-400 border-amber-400">
            {positions.length} positions
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">Total P&L</p>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
              {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{totalPnLPercent.toFixed(2)}%</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">Positions</p>
            <p className="text-2xl font-bold text-white">{positions.length}</p>
            <p className="text-xs text-slate-500 mt-1">{openPositions} open, {closedPositions} closed</p>
          </div>
        </div>

        {/* Positions List */}
        {positions.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Recent Positions</h4>
            {positions.slice(0, 3).map((position) => {
              const [, navigate] = useLocation();
              return (
                <div key={position.id} className="bg-slate-700/30 rounded p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => navigate(`/positions/${position.id}`)}>
                  <div>
                    <p className="text-sm font-semibold text-white">{position.ticker}</p>
                    <p className="text-xs text-slate-400">{position.drName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${(parseFloat(position.pnl || "0") >= 0) ? "text-green-400" : "text-red-400"}`}>
                      {(parseFloat(position.pnl || "0") >= 0) ? "+" : ""}{position.pnl}
                    </p>
                    <Badge variant="outline" className={`text-xs ${
                      position.status === "open" ? "border-blue-500 text-blue-400" :
                      position.status === "tp_hit" ? "border-green-500 text-green-400" :
                      position.status === "sl_hit" ? "border-red-500 text-red-400" :
                      "border-slate-500 text-slate-400"
                    }`}>
                      {position.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {positions.length > 3 && (
              <Button variant="outline" className="w-full text-slate-300 border-slate-600 hover:bg-slate-700">
                View all positions →
              </Button>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleRefreshAllPrices}
                disabled={isRefreshingAll}
                className="gap-2 flex-1 bg-green-600 hover:bg-green-700"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? "animate-spin" : ""}`} />
                {isRefreshingAll ? "Refreshing..." : "Refresh All"}
              </Button>
              <AddPositionDialog
                portfolioId={portfolio.id}
                onPositionAdded={refetchPositions}
                onSubmit={async (data) => {
                  await onAddPosition.mutateAsync(data);
                }}
                isLoading={onAddPosition.isPending}
              />
              <GoogleSheetsSync portfolioId={portfolio.id} onSyncComplete={refetchPositions} />
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <p className="text-slate-400 text-sm">No positions yet</p>
            <p className="text-slate-500 text-xs">Add your first DR stock position</p>
            <div className="flex gap-2 justify-center">
              <AddPositionDialog
                portfolioId={portfolio.id}
                onPositionAdded={refetchPositions}
                onSubmit={async (data) => {
                  await onAddPosition.mutateAsync(data);
                }}
                isLoading={onAddPosition.isPending}
              />
              <GoogleSheetsSync portfolioId={portfolio.id} onSyncComplete={refetchPositions} />
            </div>
          </div>
        )}

        {/* Created Date */}
        <div className="pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Created {new Date(portfolio.createdAt).toLocaleDateString("th-TH")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
