import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DrStatus = "Hit TP1" | "Hit TP2" | "Hit SL" | "Near TP" | "Near SL" | "Waiting" | "Closed" | "Watchlist";

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

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DrDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id ?? "0");

  const { data: pick, isLoading } = trpc.drPicks.getById.useQuery({ id });

  if (isLoading) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="text-white/50 text-sm animate-pulse">กำลังโหลด...</div>
    </div>
  );

  if (!pick) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/50 mb-4">ไม่พบข้อมูล DR Pick</p>
        <Button onClick={() => navigate("/")} variant="outline" className="border-white/20 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้าหลัก
        </Button>
      </div>
    </div>
  );

  const p = pick as {
    id: number; symbol: string; name: string; market: string;
    entryDate: Date; entryPrice: string; tp1: string; tp2: string; sl: string;
    status: DrStatus; reason?: string | null; note?: string | null;
    isActive: number; currentPrice?: number | null; returnPercent?: number | null;
    riskReward?: string; updatedAt?: Date; closedAt?: Date | null;
  };

  const currentPrice = p.currentPrice ?? null;
  const ret = p.returnPercent ?? null;
  const positive = ret !== null && ret >= 0;

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button onClick={() => navigate("/")} variant="ghost" className="text-white/60 hover:text-white mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> กลับ Dashboard
        </Button>

        {/* Header */}
        <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white">
              {p.symbol.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-white">{p.symbol}</h1>
                <span className={`text-sm px-3 py-1 rounded-full font-semibold ${getStatusClass(p.status)}`}>{p.status}</span>
              </div>
              <p className="text-white/50">{p.name} · {p.market}</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${currentPrice === null ? "text-white/40" : "text-white"}`}>{currentPrice === null ? "—" : currentPrice.toFixed(2)}</p>
              <p className={`text-lg font-bold ${ret === null ? "text-white/40" : positive ? "text-green-400" : "text-red-400"}`}>
                {ret === null ? "ไม่มีราคาล่าสุด" : `${positive ? "+" : ""}${ret.toFixed(2)}%`}
              </p>
            </div>
          </div>

          {/* Price grid */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "ราคาเข้า", value: p.entryPrice },
              { label: "TP1", value: p.tp1, color: "text-green-400" },
              { label: "TP2", value: p.tp2, color: "text-emerald-400" },
              { label: "SL", value: p.sl, color: "text-red-400" },
              { label: "Risk/Reward", value: p.riskReward ?? "N/A" },
            ].map(item => (
              <div key={item.label} className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-white/40 mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color ?? "text-white"}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-green-400" /> ข้อมูลการเข้า
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/50">วันที่เข้า</span><span className="text-white">{formatDate(p.entryDate)}</span></div>
              <div className="flex justify-between"><span className="text-white/50">ตลาด</span><span className="text-white">{p.market}</span></div>
              <div className="flex justify-between"><span className="text-white/50">สถานะ</span><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusClass(p.status)}`}>{p.status}</span></div>
            </div>
          </div>

          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" /> เหตุผลที่เลือก
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">{p.reason ?? "ยังไม่มีเหตุผล"}</p>
          </div>

          {p.note && (
            <div className="col-span-2 bg-[#1a1f2e] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Note</h3>
              <p className="text-sm text-white/60 leading-relaxed">{p.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
