import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, History } from "lucide-react";
import { Button } from "@/components/ui/button";

type DrStatus = "Hit TP1" | "Hit TP2" | "Hit SL" | "Near TP" | "Near SL" | "Waiting" | "Closed" | "Watchlist";
interface DrPick { id: number; symbol: string; name: string; entryDate: Date; entryPrice: string; tp1: string; sl: string; status: DrStatus; closedAt?: Date | null; }

function getStatusClass(status: DrStatus) {
  switch (status) {
    case "Hit TP1": return "bg-green-500/20 text-green-400";
    case "Hit TP2": return "bg-emerald-500/20 text-emerald-400";
    case "Hit SL": return "bg-red-500/20 text-red-400";
    case "Closed": return "bg-gray-500/20 text-gray-400";
    default: return "bg-yellow-500/20 text-yellow-400";
  }
}

export default function HistoryPage() {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.drPicks.list.useQuery();
  const closed: DrPick[] = ((data as DrPick[] | undefined) ?? []).filter(p => p.status === "Closed" || p.status === "Hit TP1" || p.status === "Hit TP2" || p.status === "Hit SL");

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => navigate("/")} variant="ghost" className="text-white/60 hover:text-white gap-2"><ArrowLeft className="w-4 h-4" /> กลับ</Button>
          <div><h1 className="text-xl font-bold text-white">History</h1><p className="text-xs text-white/40">ประวัติ DR picks ที่ปิดแล้ว</p></div>
        </div>
        {isLoading ? (
          <div className="text-center py-20 text-white/40 animate-pulse">กำลังโหลด...</div>
        ) : closed.length === 0 ? (
          <div className="text-center py-20"><History className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/40 text-sm">ยังไม่มีประวัติ</p></div>
        ) : (
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/10">{["Symbol", "Name", "Entry", "TP1", "SL", "Status", "ปิดเมื่อ"].map(h => <th key={h} className="text-left px-4 py-3 text-white/40">{h}</th>)}</tr></thead>
              <tbody>
                {closed.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/dr/${p.id}`)} className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-bold text-white">{p.symbol}</td>
                    <td className="px-4 py-3 text-white/60">{p.name}</td>
                    <td className="px-4 py-3 text-white">{p.entryPrice}</td>
                    <td className="px-4 py-3 text-green-400">{p.tp1}</td>
                    <td className="px-4 py-3 text-red-400">{p.sl}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusClass(p.status)}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-white/40">{p.closedAt ? new Date(p.closedAt).toLocaleDateString("th-TH") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
