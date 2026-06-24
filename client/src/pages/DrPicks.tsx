import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type DrStatus = "Hit TP1" | "Hit TP2" | "Hit SL" | "Near TP" | "Near SL" | "Waiting" | "Closed" | "Watchlist";

interface DrPick {
  id: number; symbol: string; name: string; market: string;
  entryDate: Date; entryPrice: string; tp1: string; tp2: string; sl: string;
  status: DrStatus; reason?: string | null; note?: string | null; isActive: number;
}

function getStatusClass(status: DrStatus) {
  switch (status) {
    case "Hit TP1": return "bg-green-500/20 text-green-400 border border-green-500/40";
    case "Hit TP2": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
    case "Hit SL": return "bg-red-500/20 text-red-400 border border-red-500/40";
    case "Near TP": return "bg-blue-500/20 text-blue-400 border border-blue-500/40";
    case "Near SL": return "bg-orange-500/20 text-orange-400 border border-orange-500/40";
    case "Waiting": return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40";
    case "Closed": return "bg-gray-500/20 text-gray-400 border border-gray-500/40";
    case "Watchlist": return "bg-purple-500/20 text-purple-400 border border-purple-500/40";
    default: return "bg-gray-500/20 text-gray-400 border border-gray-500/40";
  }
}

export default function DrPicksPage() {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.drPicks.list.useQuery();
  const picks: DrPick[] = (data as DrPick[] | undefined) ?? [];

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => navigate("/")} variant="ghost" className="text-white/60 hover:text-white gap-2">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">DR Picks ทั้งหมด</h1>
            <p className="text-xs text-white/40">รายการ DR ที่กำลังติดตาม</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-white/40 py-20 animate-pulse">กำลังโหลด...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.filter(p => p.isActive === 1).map(pick => {
              const ret = 0;
              return (
                <div
                  key={pick.id}
                  onClick={() => navigate(`/dr/${pick.id}`)}
                  className="bg-[#1a1f2e] border border-white/10 rounded-xl p-4 cursor-pointer hover:border-green-500/30 hover:bg-[#1e2436] transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">{pick.symbol.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-bold text-white">{pick.symbol}</p>
                        <p className="text-xs text-white/40">{pick.name}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusClass(pick.status)}`}>{pick.status}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center"><p className="text-white/40 mb-0.5">Entry</p><p className="text-white font-medium">{pick.entryPrice}</p></div>
                    <div className="text-center"><p className="text-white/40 mb-0.5">TP1</p><p className="text-green-400 font-medium">{pick.tp1}</p></div>
                    <div className="text-center"><p className="text-white/40 mb-0.5">TP2</p><p className="text-emerald-400 font-medium">{pick.tp2}</p></div>
                    <div className="text-center"><p className="text-white/40 mb-0.5">SL</p><p className="text-red-400 font-medium">{pick.sl}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
