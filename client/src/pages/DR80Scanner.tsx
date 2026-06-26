import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, TrendingUp, TrendingDown, Target, Shield,
  Zap, BarChart2, Activity, ChevronDown, ChevronUp, Clock, Scan,
  PlusCircle, CheckCircle2, Loader2
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CamarillaPivots {
  pivot: number; R1: number; R2: number; R3: number; R4: number;
  S1: number; S2: number; S3: number; S4: number;
}

interface ScanResult {
  symbol: string;
  currentPrice: number;
  changePct: number;
  ema25: number; ema50: number; ema75: number;
  emaAligned: boolean; emaScore: number;
  rsi: number; rsiScore: number;
  macdLine: number; signalLine: number; histogram: number; macdScore: number;
  camarilla: CamarillaPivots; camScore: number;
  entry: number; tp1: number; tp2: number; sl: number; riskReward: number;
  totalScore: number; reason: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRsiLabel(rsi: number) {
  if (rsi < 30) return { label: "Oversold", color: "text-green-400" };
  if (rsi > 70) return { label: "Overbought", color: "text-red-400" };
  if (rsi >= 40 && rsi <= 60) return { label: "Neutral", color: "text-blue-400" };
  return { label: `RSI ${rsi.toFixed(0)}`, color: "text-yellow-400" };
}

function getScoreColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.7) return "text-green-400";
  if (pct >= 0.4) return "text-yellow-400";
  return "text-red-400";
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${getScoreColor(value, max)}`}>{value}/{max}</span>
    </div>
  );
}

// ─── Pick Card ────────────────────────────────────────────────────────────────
function PickCard({
  pick, rank, existingSymbols
}: {
  pick: ScanResult;
  rank: number;
  existingSymbols: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);
  const positive = pick.changePct >= 0;
  const rrGood = pick.riskReward >= 1.5;
  const maxScore = 16; // 3*2 EMA + 4*2 Cam + 3 RSI + 3 MACD

  const utils = trpc.useUtils();
  const alreadyInPicks = existingSymbols.includes(pick.symbol) || added;

  const addToPicks = trpc.drPicks.create.useMutation({
    onSuccess: () => {
      setAdded(true);
      toast.success(`เพิ่ม ${pick.symbol} เข้า DR Picks แล้ว! 🎯`, {
        description: `Entry: ${pick.entry.toFixed(2)} | TP1: ${pick.tp1.toFixed(2)} | SL: ${pick.sl.toFixed(2)}`,
      });
      // Invalidate picks list so Dashboard updates
      utils.drPicks.list.invalidate();
      utils.drPicks.getPerformance.invalidate();
    },
    onError: (err) => {
      toast.error(`เพิ่มไม่สำเร็จ: ${err.message}`);
    },
  });

  const handleAddToPicks = () => {
    addToPicks.mutate({
      symbol: pick.symbol,
      name: `${pick.symbol.replace("80", "")} DR 80%`,
      market: "SET",
      entryDate: new Date(),
      entryPrice: pick.entry.toFixed(2),
      tp1: pick.tp1.toFixed(2),
      tp2: pick.tp2.toFixed(2),
      sl: pick.sl.toFixed(2),
      reason: pick.reason,
      note: `Added from DR80 Scanner | Score: ${pick.totalScore}/16 | EMA: ${pick.emaScore}/3 | RSI: ${pick.rsi.toFixed(1)}`,
    });
  };

  return (
    <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl overflow-hidden hover:border-green-500/30 transition-all">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center text-xl font-black text-white border border-white/10">
                {pick.symbol.replace("80", "")}
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] font-black text-black">
                #{rank}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white">{pick.symbol}</span>
                {pick.emaAligned && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-[10px] px-1.5 py-0">
                    EMA ✓
                  </Badge>
                )}
              </div>
              <p className="text-xs text-white/40">DR 80% | SET</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">{pick.currentPrice.toFixed(2)}</p>
            <p className={`text-sm font-bold ${positive ? "text-green-400" : "text-red-400"}`}>
              {positive ? "+" : ""}{pick.changePct.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">คะแนนรวม</span>
            <span className={`text-sm font-black ${getScoreColor(pick.totalScore, maxScore)}`}>
              {pick.totalScore}/{maxScore}
            </span>
          </div>
          <ScoreBar value={pick.totalScore} max={maxScore} />
        </div>

        {/* Entry Plan */}
        <div className="bg-[#0f1117] rounded-xl p-4 mb-4">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-3">แผนเทรด</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-[10px] text-white/40 mb-1">เข้า</p>
              <p className="text-sm font-black text-white">{pick.entry.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-green-400/70 mb-1">TP1</p>
              <p className="text-sm font-black text-green-400">{pick.tp1.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-400/70 mb-1">TP2</p>
              <p className="text-sm font-black text-emerald-400">{pick.tp2.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-red-400/70 mb-1">SL</p>
              <p className="text-sm font-black text-red-400">{pick.sl.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-white/40">Risk/Reward</span>
            <span className={`text-sm font-black ${rrGood ? "text-green-400" : "text-yellow-400"}`}>
              {pick.riskReward > 0 ? `1 : ${pick.riskReward.toFixed(2)}` : "N/A"}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-blue-300 leading-relaxed">💡 {pick.reason}</p>
        </div>

        {/* Add to Picks Button */}
        <div className="mb-3">
          {alreadyInPicks ? (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              อยู่ใน DR Picks แล้ว
            </div>
          ) : (
            <Button
              onClick={handleAddToPicks}
              disabled={addToPicks.isPending}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold gap-2 py-2.5 h-auto rounded-xl"
            >
              {addToPicks.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเพิ่ม...</>
              ) : (
                <><PlusCircle className="w-4 h-4" /> เพิ่มเข้า DR Picks</>
              )}
            </Button>
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors py-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "ซ่อน" : "ดูรายละเอียด Technical"}
        </button>
      </div>

      {/* Expanded Technical Details */}
      {expanded && (
        <div className="border-t border-white/5 p-5 space-y-4">
          {/* EMA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> EMA 25/50/75
              </span>
              <ScoreBar value={pick.emaScore} max={3} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "EMA 25", val: pick.ema25, active: pick.currentPrice > pick.ema25 },
                { label: "EMA 50", val: pick.ema50, active: pick.ema25 > pick.ema50 },
                { label: "EMA 75", val: pick.ema75, active: pick.ema50 > pick.ema75 },
              ].map(e => (
                <div key={e.label} className={`rounded-lg p-2 ${e.active ? "bg-green-500/10 border border-green-500/20" : "bg-white/5"}`}>
                  <p className="text-[10px] text-white/40">{e.label}</p>
                  <p className={`text-xs font-bold ${e.active ? "text-green-400" : "text-white/60"}`}>{e.val.toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RSI */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                <BarChart2 className="w-3 h-3" /> RSI (14)
              </span>
              <ScoreBar value={pick.rsiScore} max={3} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-white/10 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 opacity-30" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow"
                  style={{ left: `calc(${Math.min(100, pick.rsi)}% - 6px)` }}
                />
              </div>
              <span className={`text-sm font-black w-16 text-right ${getRsiLabel(pick.rsi).color}`}>
                {pick.rsi.toFixed(1)} <span className="text-[10px] font-normal">{getRsiLabel(pick.rsi).label}</span>
              </span>
            </div>
          </div>

          {/* MACD */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> MACD (12/26/9)
              </span>
              <ScoreBar value={pick.macdScore} max={3} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "MACD", val: pick.macdLine },
                { label: "Signal", val: pick.signalLine },
                { label: "Histogram", val: pick.histogram, highlight: pick.histogram > 0 },
              ].map(m => (
                <div key={m.label} className={`rounded-lg p-2 ${m.highlight ? "bg-green-500/10 border border-green-500/20" : "bg-white/5"}`}>
                  <p className="text-[10px] text-white/40">{m.label}</p>
                  <p className={`text-xs font-bold ${m.val > 0 ? "text-green-400" : "text-red-400"}`}>
                    {m.val > 0 ? "+" : ""}{m.val.toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Camarilla */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                <Target className="w-3 h-3" /> Camarilla Pivot
              </span>
              <ScoreBar value={pick.camScore} max={4} />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-[10px]">
              {[
                { label: "R3", val: pick.camarilla.R3, color: "text-red-300" },
                { label: "R2", val: pick.camarilla.R2, color: "text-red-400" },
                { label: "R1", val: pick.camarilla.R1, color: "text-orange-400" },
                { label: "Pivot", val: pick.camarilla.pivot, color: "text-yellow-400" },
                { label: "S1", val: pick.camarilla.S1, color: "text-blue-400" },
                { label: "S2", val: pick.camarilla.S2, color: "text-blue-300" },
                { label: "S3", val: pick.camarilla.S3, color: "text-green-400" },
                { label: "S4", val: pick.camarilla.S4, color: "text-green-300" },
              ].map(c => (
                <div key={c.label} className={`rounded p-1.5 bg-white/5 ${Math.abs(pick.currentPrice - c.val) / pick.currentPrice < 0.01 ? "ring-1 ring-yellow-400" : ""}`}>
                  <p className="text-white/40">{c.label}</p>
                  <p className={`font-bold ${c.color}`}>{c.val.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DR80Scanner() {
  const [forceRefresh, setForceRefresh] = useState(false);

  const { data, isLoading, error, refetch } = trpc.dr80Scanner.getTodaysPicks.useQuery(
    { forceRefresh },
    { staleTime: 5 * 60 * 1000 }
  );

  // Fetch existing picks to detect duplicates (filter active ones client-side)
  const { data: existingPicks } = trpc.drPicks.list.useQuery(
    undefined,
    { staleTime: 30 * 1000 }
  );
  const existingSymbols = (existingPicks ?? [])
    .filter((p: { isActive: number }) => p.isActive === 1)
    .map((p: { symbol: string }) => p.symbol);

  const handleRefresh = async () => {
    setForceRefresh(true);
    toast.loading("กำลัง scan DR80 ทั้งหมด...", { id: "scan" });
    try {
      await refetch();
      toast.success("Scan เสร็จแล้ว!", { id: "scan" });
    } catch {
      toast.error("Scan ล้มเหลว", { id: "scan" });
    } finally {
      setForceRefresh(false);
    }
  };

  const picks = data?.picks ?? [];
  const scannedAt = data?.scannedAt ? new Date(data.scannedAt) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117] min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0d1117]/95 backdrop-blur border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Scan className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">DR80 Daily Scanner</h1>
              <p className="text-xs text-white/40">
                คัดกรองด้วย EMA 25/50/75 + Camarilla + RSI + MACD
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {scannedAt && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40">
                <Clock className="w-3 h-3" />
                <span>Scan เมื่อ {scannedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                {data?.fromCache && <Badge className="bg-white/5 text-white/30 border-white/10 text-[10px]">cache</Badge>}
              </div>
            )}
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              size="sm"
              className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "กำลัง Scan..." : "Scan ใหม่"}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Info Banner */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-300 mb-1">วิธีคัดกรอง DR80 วันนี้</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/50">
                <span>✅ EMA 25 &gt; EMA 50 &gt; EMA 75 (Bullish Alignment)</span>
                <span>✅ Camarilla Pivot — เข้าใกล้ S3 (Buy Zone)</span>
                <span>✅ RSI 40-60 (Neutral Sweet Spot)</span>
                <span>✅ MACD Histogram เป็นบวก (Momentum)</span>
              </div>
              <p className="text-xs text-white/30 mt-2">Universe: 17 DR80 | คัดเลือก Top 2 ตัวที่ดีที่สุด | Auto-run ทุกวัน 09:00 น.</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
            <div className="text-center">
              <p className="text-white font-semibold">กำลัง Scan DR80 ทั้งหมด...</p>
              <p className="text-white/40 text-sm mt-1">ดึงข้อมูล Candlestick จาก Settrade แล้วคำนวณ EMA/RSI/MACD</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Scan ล้มเหลว</p>
              <p className="text-white/40 text-sm mt-1">{error.message}</p>
              <Button onClick={handleRefresh} className="mt-4" size="sm" variant="outline">
                ลองใหม่
              </Button>
            </div>
          </div>
        )}

        {/* Picks Grid */}
        {!isLoading && picks.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">
                🎯 Top {picks.length} Picks วันนี้
              </h2>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-white/40">ราคาจาก Settrade Real-time</span>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {picks.map((pick, i) => (
                <PickCard key={pick.symbol} pick={pick as ScanResult} rank={i + 1} existingSymbols={existingSymbols} />
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && picks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Scan className="w-8 h-8 text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">ยังไม่มีผล Scan</p>
              <p className="text-white/40 text-sm mt-1">กด "Scan ใหม่" เพื่อเริ่มคัดกรอง DR80</p>
              <Button onClick={handleRefresh} className="mt-4 bg-purple-600 hover:bg-purple-500" size="sm">
                <Scan className="w-3.5 h-3.5 mr-2" />
                เริ่ม Scan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
