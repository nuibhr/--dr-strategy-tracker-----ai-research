import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bell, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Alert { pickId: number; symbol: string; name: string; status: string; currentPrice: number; entryPrice: number; returnPercent: number; message: string; }

export default function AlertsPage() {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.drPicks.getAlerts.useQuery();
  const alerts: Alert[] = (data as Alert[] | undefined) ?? [];

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => navigate("/")} variant="ghost" className="text-white/60 hover:text-white gap-2"><ArrowLeft className="w-4 h-4" /> กลับ</Button>
          <div>
            <h1 className="text-xl font-bold text-white">Alert Center</h1>
            <p className="text-xs text-white/40">การแจ้งเตือนทั้งหมด ({alerts.length})</p>
          </div>
        </div>
        {isLoading ? (
          <div className="text-center py-20 text-white/40 animate-pulse">กำลังโหลด...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-20"><Bell className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/40 text-sm">ไม่มี alerts ตอนนี้</p></div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a, i) => {
              const isPositive = a.status === "Hit TP1" || a.status === "Hit TP2";
              const isWarning = a.status === "Hit SL" || a.status === "Near SL";
              return (
                <div key={i} onClick={() => navigate(`/dr/${a.pickId}`)} className="bg-[#1a1f2e] border border-white/10 rounded-xl p-4 cursor-pointer hover:border-white/20 transition-all flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isPositive ? "bg-green-500/20" : isWarning ? "bg-orange-500/20" : "bg-blue-500/20"}`}>
                    {isPositive ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-orange-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white">{a.symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isPositive ? "bg-green-500/20 text-green-400" : isWarning ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>{a.status}</span>
                    </div>
                    <p className="text-xs text-white/50">{a.message}</p>
                  </div>
                  <span className={`text-sm font-bold ${a.returnPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {a.returnPercent >= 0 ? "+" : ""}{a.returnPercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
