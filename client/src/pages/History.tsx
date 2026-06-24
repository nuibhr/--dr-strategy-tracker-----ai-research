import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function History() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: history = [], isLoading } = trpc.dailyPicks.get7DayHistory.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="container mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <TrendingUp className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-slate-400 mt-4">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "tp_hit":
        return <Badge className="bg-green-500">TP Hit ✓</Badge>;
      case "sl_hit":
        return <Badge className="bg-red-500">SL Hit ✗</Badge>;
      case "active":
        return <Badge className="bg-blue-500">Active</Badge>;
      case "archived":
        return <Badge className="bg-slate-500">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "tp_hit":
        return "border-green-500/30";
      case "sl_hit":
        return "border-red-500/30";
      case "active":
        return "border-blue-500/30";
      default:
        return "border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Pick History</h1>
                <p className="text-xs text-slate-400">Last 7 days</p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/portfolio")}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              ← Back to Portfolio
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No picks in the last 7 days</p>
            <Button
              onClick={() => navigate("/portfolio")}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Go to Portfolio
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {history.map((pick: typeof history[0]) => {
              const entry = parseFloat(pick.entryPrice);
              const current = pick.currentPrice ? parseFloat(pick.currentPrice) : entry;
              const pnl = current - entry;
              const pnlPercent = ((pnl / entry) * 100).toFixed(2);
              const direction = current > entry ? "↑" : current < entry ? "↓" : "→";

              return (
                <Card
                  key={pick.id}
                  className={`bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors ${getStatusColor(
                    pick.status
                  )}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">{pick.ticker}</CardTitle>
                        <CardDescription className="text-slate-400">
                          {pick.drName}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(pick.status)}
                        <Badge variant="outline" className="text-slate-300 border-slate-600">
                          {new Date(pick.pickedAt).toLocaleDateString("th-TH")}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Price Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-700/50 rounded p-3">
                        <p className="text-xs text-slate-400 mb-1">Entry</p>
                        <p className="text-lg font-semibold text-white">฿{entry.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded p-3">
                        <p className="text-xs text-slate-400 mb-1">Current</p>
                        <p className="text-lg font-semibold text-white">
                          {direction} ฿{current.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-slate-700/50 rounded p-3">
                        <p className="text-xs text-slate-400 mb-1">P&L</p>
                        <p
                          className={`text-lg font-semibold ${
                            pnl > 0 ? "text-green-400" : pnl < 0 ? "text-red-400" : "text-slate-300"
                          }`}
                        >
                          ฿{pnl.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-slate-700/50 rounded p-3">
                        <p className="text-xs text-slate-400 mb-1">Return</p>
                        <p
                          className={`text-lg font-semibold flex items-center gap-1 ${
                            pnl > 0 ? "text-green-400" : pnl < 0 ? "text-red-400" : "text-slate-300"
                          }`}
                        >
                          {pnl > 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : pnl < 0 ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : null}
                          {pnlPercent}%
                        </p>
                      </div>
                    </div>

                    {/* Targets */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                        <p className="text-xs text-green-400 mb-1">Take Profit</p>
                        <p className="text-sm font-semibold text-white">฿{parseFloat(pick.takeProfit).toFixed(2)}</p>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                        <p className="text-xs text-red-400 mb-1">Stop Loss</p>
                        <p className="text-sm font-semibold text-white">฿{parseFloat(pick.stopLoss).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* News & Outlook */}
                    {(pick.news || pick.outlook) && (
                      <div className="space-y-2 pt-2 border-t border-slate-700">
                        {pick.news && (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                            <p className="text-xs text-amber-400 font-semibold mb-1">📰 News</p>
                            <p className="text-sm text-slate-300">{pick.news}</p>
                          </div>
                        )}
                        {pick.outlook && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                            <p className="text-xs text-blue-400 font-semibold mb-1">🔮 Outlook</p>
                            <p className="text-sm text-slate-300">{pick.outlook}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
