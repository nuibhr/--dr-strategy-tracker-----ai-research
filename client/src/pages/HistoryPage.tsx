import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CalendarClock,
  History,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DrStatus =
  | "Hit TP1"
  | "Hit TP2"
  | "Hit SL"
  | "Near TP"
  | "Near SL"
  | "Waiting"
  | "Closed"
  | "Watchlist";

interface DrPick {
  id: number;
  symbol: string;
  name: string;
  entryDate: Date | string;
  entryPrice: string;
  tp1: string;
  tp2: string;
  sl: string;
  status: DrStatus;
  closedAt?: Date | string | null;
  currentPrice?: string;
  returnPercent?: number;
  note?: string | null;
  reason?: string | null;
}

function formatCurrency(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getHoldingDays(entryDate: Date | string, closedAt?: Date | string | null) {
  const start = new Date(entryDate).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  return Math.max(0, Math.ceil((end - start) / 86_400_000));
}

function getStatusClass(status: DrStatus) {
  switch (status) {
    case "Hit TP1":
      return "bg-green-500/15 text-green-300 border-green-500/30";
    case "Hit TP2":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "Hit SL":
      return "bg-red-500/15 text-red-300 border-red-500/30";
    case "Closed":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    default:
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  }
}

function getExitPrice(pick: DrPick) {
  if (pick.status === "Hit TP2") return Number(pick.tp2);
  if (pick.status === "Hit TP1") return Number(pick.tp1);
  if (pick.status === "Hit SL") return Number(pick.sl);
  return Number(pick.currentPrice ?? pick.entryPrice);
}

function getExitReason(pick: DrPick) {
  if (pick.status === "Hit TP2") return "ปิดทำกำไรเต็มแผนเมื่อแตะ TP2";
  if (pick.status === "Hit TP1") return "ทยอยปิดหรือเลื่อน SL เมื่อแตะ TP1";
  if (pick.status === "Hit SL") return "ปิดขาดทุนตาม stop loss";
  if (pick.status === "Closed") return "ปิดสถานะด้วยมือหรือจบแผนแล้ว";
  return "ยังไม่เข้าเงื่อนไขปิด";
}

export default function HistoryPage() {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.drPicks.list.useQuery();
  const picks = ((data as DrPick[] | undefined) ?? []).filter((pick) =>
    ["Closed", "Hit TP1", "Hit TP2", "Hit SL"].includes(pick.status)
  );

  const summary = picks.reduce(
    (acc, pick) => {
      const entry = Number(pick.entryPrice);
      const exit = getExitPrice(pick);
      const pnl = exit - entry;
      acc.realizedPnl += pnl;
      acc.returnSum += entry > 0 ? (pnl / entry) * 100 : 0;
      if (pnl > 0) acc.wins += 1;
      if (pnl < 0) acc.losses += 1;
      return acc;
    },
    { realizedPnl: 0, returnSum: 0, wins: 0, losses: 0 }
  );

  const averageReturn = picks.length ? summary.returnSum / picks.length : 0;

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="gap-2 text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> กลับ
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">History</h1>
            <p className="text-xs text-white/40">ประวัติสถานะที่แตะ TP, SL หรือปิดแล้ว</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-white/40 animate-pulse">กำลังโหลด...</div>
        ) : picks.length === 0 ? (
          <div className="py-20 text-center">
            <History className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="text-sm text-white/40">ยังไม่มีประวัติการปิดสถานะ</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Realized P/L",
                  value: `${summary.realizedPnl >= 0 ? "+" : ""}${formatCurrency(summary.realizedPnl)}`,
                  icon: summary.realizedPnl >= 0 ? TrendingUp : TrendingDown,
                  color: summary.realizedPnl >= 0 ? "text-green-300" : "text-red-300",
                },
                {
                  label: "Average Return",
                  value: `${averageReturn >= 0 ? "+" : ""}${averageReturn.toFixed(2)}%`,
                  icon: ReceiptText,
                  color: averageReturn >= 0 ? "text-green-300" : "text-red-300",
                },
                {
                  label: "Wins",
                  value: String(summary.wins),
                  icon: TrendingUp,
                  color: "text-green-300",
                },
                {
                  label: "Losses",
                  value: String(summary.losses),
                  icon: TrendingDown,
                  color: "text-red-300",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-white/10 bg-[#1a1f2e] p-4">
                  <item.icon className={`mb-3 h-5 w-5 ${item.color}`} />
                  <p className="text-xs text-white/40">{item.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1a1f2e]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      {[
                        "Symbol",
                        "Entry",
                        "Exit",
                        "P/L",
                        "Return",
                        "Status",
                        "Close rule",
                        "Holding",
                        "Closed",
                      ].map((header) => (
                        <th key={header} className="px-4 py-3 text-left font-medium text-white/40">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {picks.map((pick) => {
                      const entry = Number(pick.entryPrice);
                      const exit = getExitPrice(pick);
                      const pnl = exit - entry;
                      const returnPercent = entry > 0 ? (pnl / entry) * 100 : 0;
                      const positive = pnl >= 0;

                      return (
                        <tr
                          key={pick.id}
                          onClick={() => navigate(`/dr/${pick.id}`)}
                          className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-4">
                            <p className="font-bold text-white">{pick.symbol}</p>
                            <p className="mt-0.5 text-white/40">{pick.name}</p>
                          </td>
                          <td className="px-4 py-4 text-white">{formatCurrency(entry)}</td>
                          <td className="px-4 py-4 text-white">{formatCurrency(exit)}</td>
                          <td className={`px-4 py-4 font-bold ${positive ? "text-green-300" : "text-red-300"}`}>
                            {positive ? "+" : ""}
                            {formatCurrency(pnl)}
                          </td>
                          <td className={`px-4 py-4 font-bold ${positive ? "text-green-300" : "text-red-300"}`}>
                            {positive ? "+" : ""}
                            {returnPercent.toFixed(2)}%
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full border px-2 py-1 font-semibold ${getStatusClass(pick.status)}`}>
                              {pick.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-white/60">{getExitReason(pick)}</td>
                          <td className="px-4 py-4 text-white/60">
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5" />
                              {getHoldingDays(pick.entryDate, pick.closedAt)} วัน
                            </span>
                          </td>
                          <td className="px-4 py-4 text-white/40">{formatDate(pick.closedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
