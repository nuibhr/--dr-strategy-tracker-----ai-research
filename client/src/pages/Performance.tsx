import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, Award, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PerfData {
  winRate: number;
  averageReturn: number;
  totalPicks: number;
  activePicks: number;
  closedPicks: number;
  hitTp1: number;
  hitTp2: number;
  hitSl: number;
  totalReturn: number;
  pricedPicks: number;
}

export default function PerformancePage() {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.drPicks.getPerformance.useQuery();
  const perf = data as PerfData | undefined;
  const hasPerformanceData = (perf?.pricedPicks ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => navigate("/")} variant="ghost" className="text-white/60 hover:text-white gap-2"><ArrowLeft className="w-4 h-4" /> กลับ</Button>
          <div><h1 className="text-xl font-bold text-white">Performance</h1><p className="text-xs text-white/40">ผลการดำเนินงานรวม</p></div>
        </div>
        {isLoading ? (
          <div className="text-center py-20 text-white/40 animate-pulse">กำลังโหลด...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Win Rate", value: hasPerformanceData ? `${(perf?.winRate ?? 0).toFixed(1)}%` : "—", icon: Award, color: "text-green-400", bg: "bg-green-500/10" },
              { label: "Average Return", value: hasPerformanceData ? `${(perf?.averageReturn ?? 0) >= 0 ? "+" : ""}${(perf?.averageReturn ?? 0).toFixed(2)}%` : "—", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Total Return", value: hasPerformanceData ? `${(perf?.totalReturn ?? 0) >= 0 ? "+" : ""}${(perf?.totalReturn ?? 0).toFixed(2)}%` : "—", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Total Picks", value: String(perf?.totalPicks ?? 0), icon: Target, color: "text-purple-400", bg: "bg-purple-500/10" },
              { label: "Active Picks", value: String(perf?.activePicks ?? 0), icon: Target, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { label: "Closed Picks", value: String(perf?.closedPicks ?? 0), icon: Target, color: "text-white/60", bg: "bg-white/5" },
              { label: "Hit TP", value: String((perf?.hitTp1 ?? 0) + (perf?.hitTp2 ?? 0)), icon: Award, color: "text-green-400", bg: "bg-green-500/10" },
              { label: "Hit SL", value: String(perf?.hitSl ?? 0), icon: TrendingUp, color: "text-red-400", bg: "bg-red-500/10" },
            ].map(item => (
              <div key={item.label} className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5">
                <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="text-xs text-white/40 mb-1">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
