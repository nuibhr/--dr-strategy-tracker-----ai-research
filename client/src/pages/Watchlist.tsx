import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

type DrStatus = "Hit TP1" | "Hit TP2" | "Hit SL" | "Near TP" | "Near SL" | "Waiting" | "Closed" | "Watchlist";
interface DrPick { id: number; symbol: string; name: string; market: string; entryPrice: string; tp1: string; tp2: string; sl: string; status: DrStatus; isActive: number; }

export default function WatchlistPage() {
  const [, navigate] = useLocation();
  const { data } = trpc.drPicks.list.useQuery();
  const picks: DrPick[] = ((data as DrPick[] | undefined) ?? []).filter(p => p.status === "Watchlist");

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => navigate("/")} variant="ghost" className="text-white/60 hover:text-white gap-2"><ArrowLeft className="w-4 h-4" /> กลับ</Button>
          <div><h1 className="text-xl font-bold text-white">Watchlist</h1><p className="text-xs text-white/40">DR ที่กำลังจับตาดู</p></div>
        </div>
        {picks.length === 0 ? (
          <div className="text-center py-20"><Bookmark className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/40 text-sm">ยังไม่มี DR ใน Watchlist</p></div>
        ) : (
          <div className="space-y-3">
            {picks.map(p => (
              <div key={p.id} onClick={() => navigate(`/dr/${p.id}`)} className="bg-[#1a1f2e] border border-white/10 rounded-xl p-4 cursor-pointer hover:border-purple-500/30 transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">{p.symbol.charAt(0)}</div>
                  <div><p className="text-sm font-bold text-white">{p.symbol}</p><p className="text-xs text-white/40">{p.name}</p></div>
                </div>
                <div className="flex gap-4 text-xs text-center">
                  <div><p className="text-white/40">Entry</p><p className="text-white">{p.entryPrice}</p></div>
                  <div><p className="text-white/40">TP1</p><p className="text-green-400">{p.tp1}</p></div>
                  <div><p className="text-white/40">SL</p><p className="text-red-400">{p.sl}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
