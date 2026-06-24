import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Zap, Plus, Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function DailyPicks() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPick, setSelectedPick] = useState<any>(null);

  // Fetch today's picks
  const { data: picks = [], isLoading, refetch } = trpc.dailyPicks.getTodaysPicks.useQuery();

  // Get current time for display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header */}
      <header className="border-b border-blue-500/20 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Daily DR Picks</h1>
                <p className="text-xs text-blue-300">AI-Powered Stock Recommendations</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-200 font-mono">{formatTime(currentTime)}</p>
              <p className="text-xs text-slate-400">{formatDate(currentTime)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Title Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-blue-300 bg-clip-text text-transparent mb-2">
                Today's Picks
              </h2>
              <p className="text-slate-400">2 AI-selected DR stocks with technical analysis</p>
            </div>
            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Zap className="w-4 h-4" />
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Picks Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block">
              <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading today's picks...</p>
            </div>
          </div>
        ) : picks.length === 0 ? (
          <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur">
            <CardContent className="pt-12 text-center">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No picks for today yet</p>
              <p className="text-sm text-slate-500 mb-6">AI will generate recommendations at 09:00 AM</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {picks.map((pick, index) => (
              <PickCard key={pick.id} pick={pick} index={index} onSelect={setSelectedPick} />
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon={<Calendar className="w-5 h-5" />}
            title="Daily Updates"
            description="New picks generated at 09:00 AM"
            color="from-blue-500 to-blue-600"
          />
          <InfoCard
            icon={<Clock className="w-5 h-5" />}
            title="Price Checks"
            description="Prices updated at 10:50 AM & 14:30 PM"
            color="from-purple-500 to-purple-600"
          />
          <InfoCard
            icon={<Zap className="w-5 h-5" />}
            title="Auto Alerts"
            description="Telegram notifications on TP/SL hit"
            color="from-pink-500 to-pink-600"
          />
        </div>
      </main>

      {/* Pick Details Modal */}
      {selectedPick && (
        <PickDetailsModal pick={selectedPick} open={!!selectedPick} onOpenChange={() => setSelectedPick(null)} />
      )}
    </div>
  );
}

function PickCard({ pick, index, onSelect }: { pick: any; index: number; onSelect: (pick: any) => void }) {
  const entry = parseFloat(pick.entryPrice);
  const current = parseFloat(pick.currentPrice || pick.entryPrice);
  const pnl = current - entry;
  const pnlPercent = ((pnl / entry) * 100).toFixed(2);

  const isPositive = pnl >= 0;
  const status = pick.status === "tp_hit" ? "TP Hit 🎯" : pick.status === "sl_hit" ? "SL Hit 🛑" : "Active 📈";

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onSelect(pick)}
      style={{
        animation: `slideIn 0.5s ease-out ${index * 0.1}s both`,
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-blue-500/30 backdrop-blur-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{pick.ticker}</h3>
              <p className="text-sm text-slate-400">{pick.drName}</p>
            </div>
            <Badge
              className={`${
                pick.status === "tp_hit"
                  ? "bg-green-500/20 text-green-300 border-green-500/50"
                  : pick.status === "sl_hit"
                  ? "bg-red-500/20 text-red-300 border-red-500/50"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/50"
              } border`}
            >
              {status}
            </Badge>
          </div>

          {/* Price Section */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
              <p className="text-xs text-slate-400 mb-1">Entry</p>
              <p className="text-lg font-bold text-white">${entry.toFixed(2)}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
              <p className="text-xs text-slate-400 mb-1">Current</p>
              <p className={`text-lg font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                ${current.toFixed(2)}
              </p>
            </div>
            <div className={`rounded-lg p-3 border ${isPositive ? "bg-green-500/10 border-green-500/50" : "bg-red-500/10 border-red-500/50"}`}>
              <p className="text-xs text-slate-400 mb-1">P&L</p>
              <p className={`text-lg font-bold flex items-center gap-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {pnlPercent}%
              </p>
            </div>
          </div>

          {/* TP/SL Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
              <p className="text-xs text-green-300 mb-1">Take Profit</p>
              <p className="text-lg font-bold text-green-400">${parseFloat(pick.takeProfit).toFixed(2)}</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
              <p className="text-xs text-red-300 mb-1">Stop Loss</p>
              <p className="text-lg font-bold text-red-400">${parseFloat(pick.stopLoss).toFixed(2)}</p>
            </div>
          </div>

          {/* News */}
          {pick.news && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-300 font-semibold mb-1">📰 Latest News</p>
              <p className="text-sm text-slate-300 line-clamp-2">{pick.news}</p>
            </div>
          )}

          {/* Outlook */}
          {pick.outlook && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <p className="text-xs text-purple-300 font-semibold mb-1">🔮 Outlook</p>
              <p className="text-sm text-slate-300">{pick.outlook}</p>
            </div>
          )}

          {/* Action Button */}
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2">
            <Plus className="w-4 h-4" />
            Add to Portfolio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur">
      <CardContent className="p-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3 text-white`}>
          {icon}
        </div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </CardContent>
    </Card>
  );
}

function PickDetailsModal({ pick, open, onOpenChange }: { pick: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-blue-500/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {pick.ticker} - {pick.drName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Analysis */}
          {pick.analysis && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h4 className="font-semibold text-white mb-2">AI Analysis</h4>
              <p className="text-sm text-slate-300">{pick.analysis}</p>
            </div>
          )}

          {/* Support/Resistance */}
          <div className="grid grid-cols-2 gap-4">
            {pick.support && (
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                <p className="text-xs text-green-300 mb-1">Support</p>
                <p className="text-lg font-bold text-green-400">${parseFloat(pick.support).toFixed(2)}</p>
              </div>
            )}
            {pick.resistance && (
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                <p className="text-xs text-red-300 mb-1">Resistance</p>
                <p className="text-lg font-bold text-red-400">${parseFloat(pick.resistance).toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Action */}
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2">
            <Plus className="w-4 h-4" />
            Add to Portfolio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
