import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  LayoutDashboard, ListChecks, Bookmark, Bell, BarChart2, History,
  Settings, PlusCircle, RefreshCw, ChevronDown, Search, Filter,
  MoreHorizontal, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, X, ChevronRight, Scan
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
type DrStatus = "Hit TP1" | "Hit TP2" | "Hit SL" | "Near TP" | "Near SL" | "Waiting" | "Closed" | "Watchlist";

interface DrPick {
  id: number;
  symbol: string;
  name: string;
  market: string;
  entryDate: string | Date;
  entryPrice: string;
  tp1: string;
  tp2: string;
  sl: string;
  status: DrStatus;
  reason?: string | null;
  note?: string | null;
  isActive: number;
  currentPrice?: string | null;
  returnPercent?: number | null;
  riskReward?: string;
  updatedAt?: string | Date;
}

// ─── Market data now comes from tRPC (real Yahoo Finance) ────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function formatTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function calcReturn(entry: string, current: string) {
  const e = parseFloat(entry);
  const c = parseFloat(current);
  if (!e || !c) return 0;
  return ((c - e) / e) * 100;
}

function calcRR(entry: string, tp1: string, sl: string) {
  const e = parseFloat(entry), t = parseFloat(tp1), s = parseFloat(sl);
  if (!e || !t || !s) return "N/A";
  const reward = Math.abs(t - e);
  const risk = Math.abs(e - s);
  if (!risk) return "N/A";
  return `1 : ${(reward / risk).toFixed(2)}`;
}

// ─── Progress Bar for DR Card ─────────────────────────────────────────────────
function PriceProgressBar({ sl, entry, current, tp2 }: { sl: string; entry: string; current: string; tp2: string }) {
  const slN = parseFloat(sl), entryN = parseFloat(entry), curN = parseFloat(current), tp2N = parseFloat(tp2);
  if (!slN || !entryN || !curN || !tp2N) return null;
  const range = tp2N - slN;
  const pct = Math.max(0, Math.min(100, ((curN - slN) / range) * 100));
  const entryPct = Math.max(0, Math.min(100, ((entryN - slN) / range) * 100));
  return (
    <div className="relative h-2 rounded-full bg-white/10 my-2">
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 opacity-30" />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white shadow z-10"
        style={{ left: `calc(${pct}% - 6px)` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/60"
        style={{ left: `calc(${entryPct}% - 4px)` }}
      />
    </div>
  );
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
// ─── Alert Item ───────────────────────────────────────────────────────────────
function AlertItem({ symbol, msg, change, time, type }: { symbol: string; msg: string; change: string; time: string; type: "success" | "warning" | "info" }) {
  const icon = type === "success" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
    type === "warning" ? <AlertTriangle className="w-4 h-4 text-orange-400" /> :
      <Clock className="w-4 h-4 text-blue-400" />;
  const positive = change.startsWith("+");
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-white">{symbol}</span>
          <span className={`text-xs font-bold ${positive ? "text-green-400" : "text-red-400"}`}>{change}</span>
        </div>
        <p className="text-xs text-white/50 mt-0.5 leading-tight">{msg}</p>
        <span className="text-xs text-white/30">{time}</span>
      </div>
    </div>
  );
}

// ─── DR Pick Card ─────────────────────────────────────────────────────────────
function DrPickCard({ pick }: { pick: DrPick }) {
  const currentPrice = pick.currentPrice ? parseFloat(pick.currentPrice) : null;
  const ret = pick.returnPercent ?? (currentPrice === null ? null : calcReturn(pick.entryPrice, String(currentPrice)));
  const positive = ret !== null && ret >= 0;
  const [, navigate] = useLocation();

  return (
    <div
      className="bg-[#1a1f2e] border border-white/10 rounded-xl p-4 min-w-[240px] cursor-pointer hover:border-white/20 transition-all"
      onClick={() => navigate(`/dr/${pick.id}`)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-white">
          {pick.symbol.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">{pick.symbol}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusClass(pick.status)}`}>{pick.status}</span>
          </div>
          <p className="text-xs text-white/50 truncate">{pick.name}</p>
        </div>
      </div>

      {/* Price row */}
      <div className="grid grid-cols-4 gap-1 text-xs mb-2">
        <div><p className="text-white/40">เข้าเมื่อ</p><p className="text-white/70">{formatDate(pick.entryDate)}</p></div>
        <div><p className="text-white/40">ราคาเข้า</p><p className="text-white font-medium">{pick.entryPrice}</p></div>
        <div><p className="text-white/40">ราคาปัจจุบัน</p><p className={`font-bold ${currentPrice === null ? "text-white/40" : positive ? "text-green-400" : "text-red-400"}`}>{currentPrice === null ? "—" : currentPrice.toFixed(2)}</p></div>
        <div><p className="text-white/40">ผลตอบแทน</p><p className={`font-bold ${ret === null ? "text-white/40" : positive ? "text-green-400" : "text-red-400"}`}>{ret === null ? "—" : `${positive ? "+" : ""}${ret.toFixed(2)}%`}</p></div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 text-xs text-white/40 mb-1">
        <span>SL</span><span className="flex-1" /><span>Entry</span><span className="flex-1" /><span>Now</span><span className="flex-1" /><span>TP2</span>
      </div>
      {currentPrice !== null && <PriceProgressBar sl={pick.sl} entry={pick.entryPrice} current={currentPrice.toString()} tp2={pick.tp2} />}
      <div className="flex items-center gap-1 text-xs text-white/50 mb-3">
        <span>{pick.sl}</span><span className="flex-1" /><span>{pick.entryPrice}</span><span className="flex-1" /><span>{currentPrice === null ? "—" : currentPrice.toFixed(2)}</span><span className="flex-1" /><span>{pick.tp2}</span>
      </div>

      {/* TP/SL badges */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-medium">TP1 {pick.tp1}</span>
        <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">TP2 {pick.tp2}</span>
        <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-medium">SL {pick.sl}</span>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ alertCount, marketIndices, marketLoading, marketError }: { alertCount: number; marketIndices: { name: string; value: string; change: string; positive: boolean }[]; marketLoading: boolean; marketError?: boolean }) {
  const [location] = useLocation();
  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dr-picks", icon: ListChecks, label: "DR Picks" },
    { href: "/dr80-scanner", icon: Scan, label: "Daily Scanner" },
    { href: "/watchlist", icon: Bookmark, label: "Watchlist" },
    { href: "/alerts", icon: Bell, label: "Alerts", badge: alertCount },
    { href: "/performance", icon: BarChart2, label: "Performance" },
    { href: "/history", icon: History, label: "History" },
  ];
  const adminItems = [
    { href: "/admin", icon: ListChecks, label: "Manage Picks" },
    { href: "/admin/new", icon: PlusCircle, label: "Add New Pick" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="w-[200px] shrink-0 bg-[#0f1117] border-r border-white/10 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">DR STRATEGY</p>
            <p className="text-xs font-bold text-white leading-tight">TRACKER</p>
            <p className="text-[10px] text-white/40">หนุ่มนักออม AI Research</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${active ? "bg-green-500/20 text-green-400 font-semibold" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{item.badge}</span> : null}
              </div>
            </Link>
          );
        })}

        <div className="pt-4 pb-1">
          <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider px-3">ADMIN</p>
        </div>
        {adminItems.map(item => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${active ? "bg-green-500/20 text-green-400 font-semibold" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Market Summary */}
      <div className="p-3 border-t border-white/10">
        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">MARKET SUMMARY</p>
        <p className="text-[10px] text-white/30 mb-2">(cache 15 นาที)</p>
        <div className="space-y-1.5">
          {marketError ? (
            <p className="text-[10px] text-red-400/70">ไม่สามารถโหลดข้อมูลได้</p>
          ) : marketLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between text-xs animate-pulse">
                <span className="bg-white/10 rounded w-16 h-3" />
                <span className="bg-white/10 rounded w-14 h-3" />
                <span className="bg-white/10 rounded w-10 h-3" />
              </div>
            ))
          ) : marketIndices.length === 0 ? (
            <p className="text-[10px] text-white/30">ไม่มีข้อมูล</p>
          ) : marketIndices.map(m => (
            <div key={m.name} className="flex items-center justify-between text-xs">
              <span className="text-white/60 w-20 shrink-0">{m.name}</span>
              <span className="text-white/80 font-medium">{m.value}</span>
              <span className={`font-semibold ${m.positive ? "text-green-400" : "text-red-400"}`}>{m.change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <p className="text-[10px] text-white/30 text-center">DR Strategy Tracker</p>
        <p className="text-[10px] text-white/20 text-center">© 2024 หนุ่มนักออม AI Research</p>
      </div>
    </aside>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string>("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utils = trpc.useUtils();
  const { data: picksData, isLoading: picksLoading } = trpc.drPicks.list.useQuery();
  const { data: alertsData } = trpc.drPicks.getAlerts.useQuery();
  const { data: perfData } = trpc.drPicks.getPerformance.useQuery();
  const { data: marketData, isLoading: marketLoading, isError: marketError } = trpc.marketSummary.getIndices.useQuery(undefined, {
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
  const refreshMutation = trpc.drPicks.refreshPrices.useMutation({
    onSuccess: (results) => {
      // Invalidate all related queries to refresh UI
      utils.drPicks.list.invalidate();
      utils.drPicks.getAlerts.invalidate();
      utils.drPicks.getPerformance.invalidate();

      // Show detailed result toast
      const succeeded = results.filter((r: any) => r.success).length;
      const alerts = results.filter((r: any) => r.success && r.status && r.status !== "Waiting");
      if (alerts.length > 0) {
        const alertSymbols = alerts.map((a: any) => `${a.symbol} → ${a.status}`).join(", ");
        toast.success(`รีเฟรชราคาสำเร็จ ${succeeded}/${results.length} ตัว`, {
          description: `⚠️ Alert: ${alertSymbols}`,
          duration: 5000,
        });
      } else {
        toast.success(`รีเฟรชราคาสำเร็จ ${succeeded}/${results.length} ตัว`, {
          description: "ไม่มี alerts ใหม่",
          duration: 3000,
        });
      }
    },
    onError: () => toast.error("รีเฟรชราคาล้มเหลว กรุณาลองใหม่อีกครั้ง"),
  });

  const picks: DrPick[] = (picksData as DrPick[] | undefined) ?? [];
  const alerts = alertsData ?? [];

  // Stats
  const activePicks = picks.filter(p => p.isActive === 1 && p.status !== "Closed");
  const hitTP = picks.filter(p => p.status === "Hit TP1" || p.status === "Hit TP2");
  const hitSL = picks.filter(p => p.status === "Hit SL");
  const nearTP = picks.filter(p => p.status === "Near TP");
  const nearSL = picks.filter(p => p.status === "Near SL");
  const closed = picks.filter(p => p.status === "Closed");
  const winRate = (perfData as { winRate?: number } | undefined)?.winRate ?? 0;
  const avgReturn = (perfData as { averageReturn?: number; avgReturn?: number } | undefined)?.averageReturn ?? (perfData as { avgReturn?: number } | undefined)?.avgReturn ?? 0;
  const totalReturn = (perfData as { totalReturn?: number } | undefined)?.totalReturn;
  const pricedPicks = (perfData as { pricedPicks?: number } | undefined)?.pricedPicks ?? 0;
  const hasPerformanceData = pricedPicks > 0;

  // Filter picks for table
  const filterMap: Record<string, (p: DrPick) => boolean> = {
    "ทั้งหมด": () => true,
    "Waiting": p => p.status === "Waiting",
    "Hit TP": p => p.status === "Hit TP1" || p.status === "Hit TP2",
    "Hit SL": p => p.status === "Hit SL",
    "Near TP": p => p.status === "Near TP",
    "Near SL": p => p.status === "Near SL",
    "Closed": p => p.status === "Closed",
    "Watchlist": p => p.status === "Watchlist",
  };
  const filteredPicks = picks
    .filter(filterMap[activeFilter] ?? (() => true))
    .filter(p => !searchQuery || p.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeDrCards = picks.filter(p => p.isActive === 1 && p.status !== "Closed" && p.status !== "Watchlist").slice(0, 8);

  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const isMarketOpen = now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() >= 9 && now.getHours() < 17;

  // Dashboard is public - no auth gate needed

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117]">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0d1117] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${isMarketOpen ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? "bg-green-400 animate-pulse" : "bg-gray-400"}`} />
              {isMarketOpen ? "ตลาดเปิด" : "ตลาดปิด"}
            </span>
            <span className="text-white/60 text-sm font-mono">{timeStr}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
              รีเฟรชราคา
            </Button>
            <div className="relative">
              <Bell className="w-5 h-5 text-white/60" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{alerts.length}</span>
              )}
            </div>
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">
                {user?.name?.charAt(0) ?? "A"}
              </div>
              <div className="text-xs">
                <p className="text-white font-medium leading-tight">{user?.name ?? "-"}</p>
                <p className="text-white/40 leading-tight">{user?.role === "admin" ? "Admin" : "Viewer"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex flex-1 min-w-0">
          {/* Main scroll area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "ACTIVE PICKS", value: activePicks.length, sub: "กำลังติดตาม", color: "text-white" },
                { label: "HIT TP", value: hitTP.length, sub: "ถึงเป้ากำไร", color: "text-green-400" },
                { label: "HIT SL", value: hitSL.length, sub: "ตัดขาดทุน", color: "text-red-400" },
                { label: "NEAR TP", value: nearTP.length, sub: "ใกล้เป้ากำไร", color: "text-blue-400" },
                { label: "NEAR SL", value: nearSL.length, sub: "ใกล้ตัดขาดทุน", color: "text-orange-400" },
                { label: "WIN RATE", value: hasPerformanceData ? `${winRate.toFixed(1)}%` : "—", sub: "อัตราชนะ", color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="bg-[#1a1f2e] border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-1">{s.label}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-white/40 mt-1">{s.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Average Return + Total Closed ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">AVERAGE RETURN</p>
                <p className={`text-4xl font-bold ${!hasPerformanceData ? "text-white/40" : avgReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {!hasPerformanceData ? "—" : `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%`}
                </p>
              </div>
              <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">TOTAL CLOSED PICKS</p>
                  <p className="text-4xl font-bold text-white">{closed.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40 mb-1">กำไรสุทธิรวม</p>
                  <p className={`text-2xl font-bold ${!hasPerformanceData || totalReturn === undefined ? "text-white/40" : totalReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {!hasPerformanceData || totalReturn === undefined ? "—" : `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
                  </p>
                </div>
              </div>
            </div>

            {/* ── DR Picks Cards ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">DR PICKS <span className="text-white/40 font-normal">(กำลังติดตาม)</span></h2>
                <Link href="/admin">
                  <span className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 cursor-pointer">ดูทั้งหมด <ChevronRight className="w-3 h-3" /></span>
                </Link>
              </div>
              {picksLoading ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="bg-[#1a1f2e] border border-white/10 rounded-xl p-4 min-w-[240px] h-[200px] animate-pulse" />)}
                </div>
              ) : activeDrCards.length === 0 ? (
                <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-8 text-center">
                  <p className="text-white/40 text-sm">ยังไม่มี DR picks ที่กำลังติดตาม</p>
                  <Link href="/admin/new"><Button size="sm" className="mt-3 bg-green-500 hover:bg-green-600 text-white text-xs">+ เพิ่ม DR Pick</Button></Link>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {activeDrCards.map(pick => <DrPickCard key={pick.id} pick={pick} />)}
                </div>
              )}
            </div>

            {/* ── All Picks Table ── */}
            <div className="bg-[#1a1f2e] border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-sm font-semibold text-white">ALL PICKS</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="ค้นหา..."
                      className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50 w-36"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 border-white/20 text-white/60 hover:text-white hover:bg-white/10 text-xs h-7">
                    <Filter className="w-3 h-3" /> ตัวกรอง
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white/40 hover:text-white h-7 w-7 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 px-4 py-2 border-b border-white/10 overflow-x-auto">
                {["ทั้งหมด", "Waiting", "Hit TP", "Hit SL", "Near TP", "Near SL", "Closed", "Watchlist"].map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeFilter === f ? "bg-green-500/20 text-green-400 border border-green-500/30" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Symbol", "Name", "เข้าเมื่อ", "ราคาเข้า", "ราคาปัจจุบัน", "TP1", "TP2", "SL", "สถานะ", "ผลตอบแทน", "Risk/Reward", "อัปเดตล่าสุด"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-white/40 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPicks.length === 0 ? (
                      <tr><td colSpan={12} className="text-center py-8 text-white/30">ไม่มีข้อมูล</td></tr>
                    ) : filteredPicks.map(pick => {
                      const currentPrice = pick.currentPrice ? parseFloat(pick.currentPrice) : null;
                      const ret = pick.returnPercent ?? (currentPrice === null ? null : calcReturn(pick.entryPrice, String(currentPrice)));
                      const positive = ret !== null && ret >= 0;
                      const rr = calcRR(pick.entryPrice, pick.tp1, pick.sl);
                      return (
                        <tr key={pick.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => window.location.href = `/dr/${pick.id}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">{pick.symbol.charAt(0)}</div>
                              <span className="font-semibold text-white">{pick.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/70">{pick.name}</td>
                          <td className="px-4 py-3 text-white/50">{formatDate(pick.entryDate)}</td>
                          <td className="px-4 py-3 text-white font-medium">{pick.entryPrice}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${currentPrice === null ? "text-white/40" : positive ? "text-green-400" : "text-red-400"}`}>{currentPrice === null ? "—" : currentPrice.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 text-white/70">{pick.tp1}</td>
                          <td className="px-4 py-3 text-white/70">{pick.tp2}</td>
                          <td className="px-4 py-3 text-white/70">{pick.sl}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusClass(pick.status)}`}>{pick.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${ret === null ? "text-white/40" : positive ? "text-green-400" : "text-red-400"}`}>{ret === null ? "—" : `${positive ? "+" : ""}${ret.toFixed(2)}%`}</span>
                          </td>
                          <td className="px-4 py-3 text-white/50">{rr}</td>
                          <td className="px-4 py-3 text-white/40">{pick.updatedAt ? formatTime(pick.updatedAt) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-white/10">
                <p className="text-[10px] text-white/30 text-center">ราคาล่าสุดจาก Market API (อัปเดตอัตโนมัติทุก 1 นาที)</p>
              </div>
            </div>
          </div>

          {/* ── Alert Center sidebar ── */}
          <div className="hidden lg:block w-[220px] shrink-0 border-l border-white/10 bg-[#0f1117] p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white">ALERT CENTER</h3>
            </div>
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-400/40 mx-auto mb-2" />
                <p className="text-xs text-white/30">ไม่มี alerts ตอนนี้</p>
              </div>
            ) : (
              <div>
                {(alerts as unknown as Array<{ symbol: string; message: string; changePercent?: number; returnPercent?: number; status: string; updatedAt?: string | Date }>).slice(0, 8).map((a, i) => (
                  <AlertItem
                    key={i}
                    symbol={a.symbol}
                    msg={a.message}
                    change={a.returnPercent !== undefined && a.returnPercent !== null ? `${a.returnPercent >= 0 ? "+" : ""}${a.returnPercent.toFixed(2)}%` : "—"}
                    time={a.updatedAt ? formatTime(a.updatedAt) : "-"}
                    type={a.status === "Hit TP1" || a.status === "Hit TP2" ? "success" : a.status === "Hit SL" || a.status === "Near SL" ? "warning" : "info"}
                  />
                ))}
                <Link href="/alerts">
                  <span className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 mt-3 cursor-pointer">ดูทั้งหมด <ChevronRight className="w-3 h-3" /></span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
